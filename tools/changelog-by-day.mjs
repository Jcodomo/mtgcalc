// Builds CHANGELOG-BY-DAY.md and changelog.html from CHANGELOG.md: every change grouped by the day it was released
// (newest first), then by section of the suite, each tagged with its release number.
// A release's day is the date in its heading, or else the day git first recorded it in CHANGELOG.md.
// Run after adding a release: npm run changelog
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');

/* ---------- releases ---------- */
const releases = []; let cur = null, sub = '';
for (const line of md.split('\n')) {
  let m;
  if ((m = line.match(/^## (.+)/))) {
    const h = m[1].trim();
    cur = /everything released/i.test(h) ? null : { heading: h, items: [] };   // the one-day summary repeats the releases below it
    if (cur) {
      const date = (h.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || null;
      const rel = (h.match(/Release\s+([\d.]+[a-z]?)/i) || [])[1] || '';
      cur.date = date; cur.rel = rel;
      cur.title = h.replace(/^\d{4}-\d{2}-\d{2}\s*[-·]\s*/, '').replace(/^(?:[\d.]+\s*\/\s*)?Release\s+[\d.]+[a-z]?\s*[-—:]?\s*/i, '').trim();
      releases.push(cur);
    }
    sub = ''; continue;
  }
  if (!cur) continue;
  if ((m = line.match(/^### (.+)/))) { sub = m[1].trim(); continue; }
  if ((m = line.match(/^- (.+)/))) { cur.items.push({ text: m[1], sub }); continue; }
  if ((m = line.match(/^\s+- (.+)/)) && cur.items.length) { cur.items[cur.items.length - 1].text += ' ' + m[1]; continue; }
  if (/^\s+\S/.test(line) && cur.items.length) { cur.items[cur.items.length - 1].text += ' ' + line.trim(); continue; }
  if (/^\S/.test(line) && !/^#/.test(line) && !/^The release entries below/.test(line)) cur.items.push({ text: line.trim(), sub });
}
const gitDay = (rel) => {
  if (!rel) return null;
  try {
    const re = '^## .*Release ' + rel.replace(/\./g, '\\.') + '([^0-9.]|$)';
    const out = execFileSync('git', ['log', '--reverse', '--format=%ad', '--date=short', '-G', re, '--', 'CHANGELOG.md'], { cwd: root, encoding: 'utf8' }).trim().split('\n')[0];
    return out || null;
  } catch { return null; }
};
for (const r of releases) if (!r.date) r.date = gitDay(r.rel) || new Date().toISOString().slice(0, 10);

/* ---------- sections ---------- */
const SECTIONS = [
  ['Loan Suite & calculations', ['transfer tax', 'mansion', 'measure ula', 'recording tax', 'loan suite', 'cash to close', 'payment', 'ltv', 'fha', 'mip', 'pmi', 'ufmip', 'escrow', 'closing cost', 'transfer tax', 'mansion', 'engine', 'calculation', 'renovation', 'draw', 'max mortgage', 'scenario', 'interest rate', 'quote', 'concession', 'seller credit', 'amortization', 'mortgage calculator', 'loan amount', 'proration', 'mortgage rates', 'v57']],
  ['Income Calculator', ['income', 'w-2', 'w2', 'schedule c', 'schedule e', 'self-employ', 'k-1', '1065', '1120', '1099', 'overtime', 'bonus', 'salary', 'hourly', 'asset depletion', 'nmb', 'non-qm', 'rental', 'va residual', 'union worker', 'retirement', 'social security', 'dti', 'agency', 'fannie', 'freddie', 'aus']],
  ['Documents & OCR', ['ocr', 'scan', 'screenshot', 'paste', 'documents page', 'doc organizer', 'pdf reader', 'text layer', 'import', 'read ', 'upload', 'documents tab', 'tesseract']],
  ['Document Builder', ['document builder', 'builder', 'download pdf', 'built pdf', 'print', 'pdfs', 'commitment', 'lease', 'addendum', 'gift letter', 'contractor', 'estimate', 'letter of explanation', 'cpa', 'pay statement', 'draft le', 'loan estimate draft', 'conditions', 'approval', 'profit and loss', 'logo', 'letter']],
  ['Property & Quick', ['property', 'zip', 'quick', 'address', 'public records', 'redfin', 'zillow', 'fema', 'flood', 'county']],
  ['Signatures & Ghost', ['signature', 'ghost', 'handwriting', 'pen engine', 'sign it', 'signing']],
  ['Search, layout & pages', ['search', 'date box', 'every box', 'free-form', 'typed', 'input', 'card', 'padding', 'responsive', 'bookmark', 'entry point', 'header', 'navigation', 'nav', 'page bar', 'theme', 'dark', 'look', 'phone', 'layout', 'scroll', 'menu', 'button', 'pages', 'simple', 'advanced', 'cache', 'version', 'loads', 'faster', 'performance']],
  ['Tests & checks', ['test', 'verified', 'checked against', 'regression', 'cases', 'audit', 'proven']],
];
const FIXES = 'Fixes';
function sectionOf(it, title) {
  const t = it.text.toLowerCase(), lead = ((it.text.match(/^\*\*(.+?)\*\*/) || [])[1] || '').toLowerCase(), ttl = String(title || '').toLowerCase();
  if (/^fix/i.test(it.sub) || /^fix(ed)?\b/.test(lead) || /^fixed\b/i.test(it.text)) return FIXES;
  /* a change that names its page in its lead belongs to that page */
  const NAMED = [[/income calculator/, 'Income Calculator'], [/document builder|commitment letter|lease|gift letter|pay statement|contractor estimate/, 'Document Builder'], [/doc organizer|documents page|ocr/, 'Documents & OCR'], [/property page|^quick/, 'Property & Quick'], [/loan suite|full suite/, 'Loan Suite & calculations'], [/signature|ghost/, 'Signatures & Ghost'], [/search/, 'Search, layout & pages']];
  for (const [re, name] of NAMED) if (re.test(lead)) return name;
  let best = 'Other changes', score = 0;
  for (const [name, words] of SECTIONS) {
    let s = 0;
    /* the change's bold lead counts most, then its text, then its release's title */
    for (const w of words) { if (lead.includes(w)) s += 5; if (ttl.includes(w)) s += 1.5; let i = -1, n = 0; while ((i = t.indexOf(w, i + 1)) >= 0 && n < 4) { s += 1; n++; } }
    if (s > score) { score = s; best = name; }
  }
  return best;
}
const ORDER = [...SECTIONS.map((s) => s[0]), FIXES, 'Other changes'];

/* ---------- by day ---------- */
const byDay = new Map();
for (const r of releases) {
  if (!byDay.has(r.date)) byDay.set(r.date, new Map());
  const day = byDay.get(r.date);
  for (const it of r.items) {
    const s = sectionOf(it, r.title);
    if (!day.has(s)) day.set(s, []);
    day.get(s).push({ rel: r.rel, text: it.text });
  }
}
const relNum = (v) => (v || '0').split(/[.]/).map((x) => parseFloat(x) || 0).reduce((a, x, i) => a + x / Math.pow(1000, i), 0);
const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a)).map((date) => ({
  date,
  releases: [...new Set(releases.filter((r) => r.date === date).map((r) => r.rel).filter(Boolean))].sort((a, b) => relNum(b) - relNum(a)),
  sections: [...byDay.get(date).entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
    .map(([name, items]) => ({ name, items: items.sort((a, b) => relNum(b.rel) - relNum(a.rel)) })),
}));
const total = days.reduce((n, d) => n + d.sections.reduce((k, s) => k + s.items.length, 0), 0);
const usedSections = ORDER.filter((n) => days.some((d) => d.sections.some((s) => s.name === n)));

/* ---------- CHANGELOG-BY-DAY.md ---------- */
let out = '# Mortgage Suite changelog by day\n\nEvery change, by the day it was released (newest first), then by section of the suite. Each line starts with its release number;\n' +
  'the full release notes are in [CHANGELOG.md](CHANGELOG.md). The same list is on the site: https://jcodomo.github.io/mtgcalc/changelog.html\n' +
  'This file is built from CHANGELOG.md with `npm run changelog`.\n';
for (const d of days) {
  out += `\n## ${d.date}${d.releases.length ? ' - Release ' + d.releases.slice().reverse().join(', ') : ''}\n`;
  for (const s of d.sections) { out += `\n### ${s.name}\n`; for (const it of s.items) out += `- ${it.rel ? '(' + it.rel + ') ' : ''}${it.text}\n`; }
}
writeFileSync(path.join(root, 'CHANGELOG-BY-DAY.md'), out);

/* ---------- changelog.html ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nice = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>What's new - Mortgage Suite</title>
<meta name="description" content="Every change to the Mortgage Suite, day by day and by section.">
<style>
  :root{--bg:#020617;--card:#0b1730;--text:#e6eefb;--muted:#9db0c8;--line:#1c3a66;--accent:#5aa2ff;--chip:#0f2142;--tint:#10274d;--tag:#9fc4ff}
  :root[data-theme=light]{--bg:#f4f6fa;--card:#fff;--text:#101828;--muted:#5b6678;--line:#dde3ec;--accent:#226ccc;--chip:#eef2f8;--tint:#e8f0fc;--tag:#226ccc}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
  header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line)}
  .bar{max-width:960px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .bar a.home{font-weight:700;color:var(--text);text-decoration:none;font-size:17px;letter-spacing:.02em}
  .bar .sp{flex:1}.bar a.repo{color:var(--muted);font-size:13px}
  .chips{max-width:960px;margin:0 auto;padding:0 16px 12px;display:flex;gap:6px;flex-wrap:wrap}
  .chips button{border:1px solid var(--line);background:var(--chip);color:var(--text);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;cursor:pointer}
  .chips button.on{background:var(--accent);border-color:var(--accent);color:#04122b}
  main{max-width:960px;margin:0 auto;padding:18px 16px 60px}
  h1{font-size:26px;margin:4px 0 2px}.lead{color:var(--muted);margin:0 0 16px}
  .days{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px}
  .days a{font-size:12.5px;color:var(--tag);text-decoration:none;background:var(--tint);border-radius:6px;padding:3px 8px}
  .day{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 20px 14px;margin:0 0 16px}
  .day h2{font-size:19px;margin:12px 0 2px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
  .day h2 a{color:var(--text);text-decoration:none}.day h2 small{font-size:12.5px;color:var(--muted);font-weight:400}
  .rels{font-size:12.5px;color:var(--muted);margin:0 0 4px}
  .sec h3{font-size:12.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--accent);margin:14px 0 4px}
  .sec ul{margin:0;padding-left:20px}.sec li{margin:5px 0}
  .tag{display:inline-block;font-size:11px;font-weight:700;color:var(--tag);background:var(--tint);border-radius:999px;padding:0 7px;margin-right:6px;vertical-align:1px}
  code{background:var(--chip);border-radius:4px;padding:0 4px;font-size:.92em}
  a{color:var(--accent)}.hidden{display:none}
</style>
</head>
<body>
<header>
  <div class="bar"><a class="home" href="index.html">MORTGAGE SUITE</a><a href="pages.html" style="font-size:13px">All pages</a><span class="sp"></span><a class="repo" href="https://github.com/Jcodomo/mtgcalc/blob/main/CHANGELOG-BY-DAY.md">On GitHub: by day</a><a class="repo" href="https://github.com/Jcodomo/mtgcalc/blob/main/CHANGELOG.md">by release</a></div>
  <div class="chips" id="chips"><button class="on" data-f="">All sections</button>${usedSections.map((s) => `<button data-f="${slug(s)}">${esc(s)}</button>`).join('')}</div>
</header>
<main>
  <h1>What's new</h1>
  <p class="lead">${total} changes over ${days.length} days, newest first, grouped by section of the suite. Each change shows its release number. Pick a section to see only its changes.</p>
  <nav class="days">${days.map((d) => `<a href="#d${d.date}">${d.date}</a>`).join('')}</nav>
  ${days.map((d) => `<section class="day" id="d${d.date}">
    <h2><a href="#d${d.date}">${nice(d.date)}</a><small>${d.sections.reduce((k, s) => k + s.items.length, 0)} changes</small></h2>
    ${d.releases.length ? `<div class="rels">Release ${d.releases.slice().reverse().join(', ')}</div>` : ''}
    ${d.sections.map((s) => `<div class="sec" data-sec="${slug(s.name)}"><h3>${esc(s.name)}</h3><ul>${s.items.map((i) => `<li>${i.rel ? `<span class="tag">${esc(i.rel)}</span>` : ''}${inline(i.text)}</li>`).join('')}</ul></div>`).join('')}
  </section>`).join('\n  ')}
</main>
<script>
  (function () {
    try { var t = localStorage.getItem('los55.theme') || localStorage.getItem('mtgcalc.theme'); if (t === 'light') document.documentElement.dataset.theme = 'light'; } catch (e) {}
    var chips = document.getElementById('chips');
    function show(f) {
      chips.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === f); });
      document.querySelectorAll('.sec').forEach(function (s) { s.classList.toggle('hidden', !!f && s.dataset.sec !== f); });
      document.querySelectorAll('.day').forEach(function (d) { d.classList.toggle('hidden', !d.querySelector('.sec:not(.hidden)')); });
      try { history.replaceState(null, '', f ? '#section=' + f : location.pathname); } catch (e) {}
    }
    chips.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.dataset.f); });
    var m = location.hash.match(/section=([\\w-]+)/); if (m) show(m[1]);
  })();
</script>
</body>
</html>
`;
writeFileSync(path.join(root, 'changelog.html'), html);
console.log(`${releases.length} releases, ${total} changes over ${days.length} days -> CHANGELOG-BY-DAY.md, changelog.html`);
for (const d of days) console.log(d.date, (d.releases.join(',') || '-').padEnd(40), d.sections.map((s) => s.name.split(' ')[0] + ':' + s.items.length).join(' '));
