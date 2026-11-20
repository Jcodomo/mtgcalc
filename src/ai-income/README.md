# AI Income module (planned - not connected)

A future Income Calculator module: drop income documents, use **your own** Claude API credentials, and get a qualifying
income calculation with a detailed breakdown, saved as an income report **PNG** and a **JSON** file.

**Status (57.20): structure only.** Nothing here calls an API, no credentials are stored or attached, and the
Generate button is disabled. The preview page (`ai-income.html`) shows the intake, the request that *would* be sent,
and the PNG / JSON outputs rendered from a sample report.

## Files

| File | What it is |
|---|---|
| `src/ai-income/README.md` | This plan |
| `src/ai-income/income-report.schema.json` | The JSON the model must return (and the app validates) |
| `src/ai-income/prompt.md` | Draft system prompt: the rules the calculation follows and how it shows its work |
| `src/ai-income/sample-report.json` | A sample report, used by the preview |
| `assets/mt-ai-income.js` | Browser module: intake, request builder, provider interface (Claude stub), validation, PNG + JSON output, preview UI |
| `ai-income.html` | Preview page (linked from All pages, marked "not connected") |

## Flow

1. **Intake** - the user drops PDFs (pay stubs, W-2s, 1040s with schedules, K-1s, 1120-S / 1065, VOEs, award
   letters, bank statements) or pictures. Each file becomes a `document` record: name, type, size, page count,
   the file bytes as base64 (sent as-is), and - where the suite can read it locally (`MTDocs.readText`) - its text and
   detected type, used only for the checklist shown to the user.
2. **Settings** - agency (Fannie Mae, Freddie Mac, FHA, VA, Non-QM), borrower names, the application date, and any
   notes ("bonus is new this year").
3. **Request** (not sent yet) - one Messages API request: the system prompt (`prompt.md`), each PDF as a
   `document` content block and each picture as an `image` content block, then a short instruction listing the
   settings. Structured output (`output_config.format` with the JSON schema) makes the reply match
   `income-report.schema.json`.
4. **Validate** - the reply is checked against the schema before anything is shown; a failure is reported, never
   silently patched.
5. **Report** - the app draws the report (borrowers, each income source with its documents, the method, the figures
   and the arithmetic, the monthly qualifying total, warnings and conditions) to a PNG, and offers the JSON as a file.
   Nothing is written into the loan file automatically; a later step can offer "Use these figures" per source.

## Planned Claude request (for when it is connected)

- **Model:** `claude-opus-5-5` (the current default). Thinking is adaptive (always on for this model); set
  `output_config.effort` explicitly (its default is `medium`; income calculation is intelligence-sensitive, so
  `high`). Include the server-side `fallbacks` parameter (`fallbacks: "default"` with its beta header) and always
  check `stop_reason` (`refusal`, `max_tokens`) before reading the content.
- **Streaming** for the request (many pages in, a long structured reply out), reading the final message at the end.
- **Content blocks:**
  - PDF: `{type: "document", source: {type: "base64", media_type: "application/pdf", data: <base64, no newlines>}}`,
    placed before the text instruction. Limits: 32 MB per request, 600 pages - larger sets need the Files API
    (upload once, then `{type: "file", file_id}`) or several requests.
  - Picture: `{type: "image", source: {type: "base64", media_type: "image/png" | "image/jpeg" | ..., data}}`.
- **Structured output:** `output_config: {format: {type: "json_schema", schema: <income-report.schema.json>}}`
  (citations can't be combined with structured output, so each figure carries its own `source` field instead).
- **SDK:** the official TypeScript SDK (`@anthropic-ai/sdk`). Calling the API straight from a web page needs the
  SDK's explicit browser opt-in, and exposes the key to that page - check the SDK documentation when connecting.

## Credentials (planned)

- The user's **own** API key, typed by the user. Never committed, never put in a URL, never sent anywhere but the API.
- Default: kept **in memory for the session only**; an explicit "remember on this device" choice may store it in this
  browser. Always a visible "forget the key" button.
- Safer option for teams: a small proxy the user runs (it holds the key; the page talks to the proxy).
- The page never logs the key and never includes it in the JSON or PNG output.

## Out of scope for 57.20

No network calls, no key field that works, no automatic posting of results into the Income Calculator.
