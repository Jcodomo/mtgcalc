/* Mortgage Suite 57.20 - AI Income module (structure only, NOT connected).
   Plan: src/ai-income/README.md. Drop income documents, use your own Claude API credentials (later), get a qualifying
   income calculation with a detailed breakdown as an income report PNG and a JSON file.
   Here: intake, the request that WOULD be sent (built, never sent), a provider interface whose Claude provider is a stub
   that refuses to run, schema validation, and the PNG / JSON outputs - shown with a sample report. No network calls to
   any AI service, no credentials. */
(function () {
  'use strict';
  if (window.MTAiIncome) return;
  var BASE = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/assets\/mt-ai-income\.js[^]*$/, '') : '');
  var SCHEMA_URL = BASE + 'src/ai-income/income-report.schema.json', PROMPT_URL = BASE + 'src/ai-income/prompt.md', SAMPLE_URL = BASE + 'src/ai-income/sample-report.json';
  var MODEL = 'claude-opus-5-5';   /* the planned default (see the README) */

  /* ---------------------------------------------------------------- intake */
  function b64(buf) { var s = '', u = new Uint8Array(buf); for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  var KINDS = {'application/pdf': 'document', 'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'image/gif': 'image'};
  async function intake(files) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i], type = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : /\.png$/i.test(f.name) ? 'image/png' : /\.jpe?g$/i.test(f.name) ? 'image/jpeg' : '');
      var d = {fileName: f.name, mediaType: type, size: f.size, block: KINDS[type] || null, detected: '', text: '', error: ''};
      if (!d.block) { d.error = 'Not a PDF or picture - convert it first (Ghost Calligrapher can turn most files into a PDF).'; out.push(d); continue; }
      try { d.data = b64(await f.arrayBuffer()); } catch (e) { d.error = 'Could not read the file.'; }
      /* the suite's own reader names the document for the checklist (local only) */
      try { if (window.MTDocs && MTDocs.readText) { d.text = await MTDocs.readText(f); d.detected = MTDocs.detect ? MTDocs.detect(d.text, f.name) : ''; } } catch (e) {}
      out.push(d);
    }
    return out;
  }

  /* ---------------------------------------------------------------- request (built, never sent here) */
  async function buildRequest(docs, settings) {
    var schema = await (await fetch(SCHEMA_URL)).json(), system = await (await fetch(PROMPT_URL)).text();
    var content = docs.filter(function (d) { return d.block && d.data; }).map(function (d) {
      return {type: d.block, source: {type: 'base64', media_type: d.mediaType, data: d.data}};
    });
    content.push({type: 'text', text: 'Agency: ' + (settings.agency || 'Fannie Mae') + '\nBorrowers: ' + (settings.borrowers || '') + '\nApplication date: ' + (settings.date || '') +
      '\nNotes: ' + (settings.notes || '') + '\nCalculate the monthly qualifying income from the attached documents.'});
    return {
      model: MODEL, max_tokens: 64000, stream: true,
      system: system,
      output_config: {effort: 'high', format: {type: 'json_schema', schema: schema}},
      messages: [{role: 'user', content: content}],
    };
  }
  /* a copy that is safe to show on screen: file data shortened */
  function preview(req) { return JSON.parse(JSON.stringify(req, function (k, v) { return k === 'data' && typeof v === 'string' ? '<' + Math.round(v.length * 0.75 / 1024) + ' KB base64>' : k === 'system' && typeof v === 'string' ? v.slice(0, 160) + '…' : v; })); }

  /* ---------------------------------------------------------------- providers */
  var providers = {
    claude: {
      label: 'Claude (your API key)',
      connected: false,
      generate: async function () { throw new Error('The AI Income module is not connected yet - no request is sent and no key is used. See src/ai-income/README.md.'); },
    },
  };

  /* ---------------------------------------------------------------- validation (the schema's rules that matter) */
  function validate(r, schema) {
    var errs = [], req = function (o, keys, at) { keys.forEach(function (k) { if (o == null || o[k] === undefined) errs.push(at + k + ' is missing'); }); };
    req(r, schema.required, '');
    (r.borrowers || []).forEach(function (b, i) {
      req(b, ['name', 'sources', 'monthlyQualifying'], 'borrowers[' + i + '].');
      var sum = 0; (b.sources || []).forEach(function (s, j) { req(s, ['type', 'employerOrPayer', 'method', 'monthly', 'documents', 'steps'], 'borrowers[' + i + '].sources[' + j + '].'); sum += +s.monthly || 0; });
      if (Math.abs(sum - b.monthlyQualifying) > 0.02) errs.push('borrowers[' + i + ']: sources add to ' + sum.toFixed(2) + ', not ' + b.monthlyQualifying);
    });
    var tot = (r.borrowers || []).reduce(function (a, b) { return a + (+b.monthlyQualifying || 0); }, 0);
    if (Math.abs(tot - r.totalMonthlyQualifying) > 0.02) errs.push('borrowers add to ' + tot.toFixed(2) + ', not ' + r.totalMonthlyQualifying);
    return errs;
  }

  /* ---------------------------------------------------------------- outputs */
  function usd(v) { return '$' + (+v || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function reportPNG(r) {
    var W = 1240, pad = 56, lines = [];
    var add = function (t, o) { lines.push(Object.assign({t: t}, o || {})); };
    add('Income report', {size: 34, bold: true}); add(r.agency + ' · ' + (r.applicationDate || ''), {size: 18, color: '#555'}); add('', {gap: 10});
    (r.borrowers || []).forEach(function (b) {
      add(b.name, {size: 24, bold: true});
      (b.sources || []).forEach(function (s) {
        add(s.type + ' - ' + s.employerOrPayer, {size: 19, bold: true, right: usd(s.monthly) + ' / mo'});
        add(s.method + (s.trend && s.trend !== 'Not applicable' ? ' · trend: ' + s.trend : ''), {size: 15, color: '#444'});
        (s.steps || []).forEach(function (st) { add('   ' + st.label + (st.formula ? '  (' + st.formula + ')' : ''), {size: 15, right: (+st.amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2}), color: '#222'}); });
        add('   Documents: ' + (s.documents || []).map(function (d) { return d.kind + (d.period ? ' ' + d.period : ''); }).join('; '), {size: 13, color: '#666'});
        add('', {gap: 6});
      });
      add('Monthly qualifying - ' + b.name, {size: 18, bold: true, right: usd(b.monthlyQualifying), rule: true});
      add('', {gap: 10});
    });
    add('Total monthly qualifying income', {size: 22, bold: true, right: usd(r.totalMonthlyQualifying), rule: true});
    if ((r.warnings || []).length) { add('', {gap: 8}); add('Warnings', {size: 17, bold: true, color: '#9a5b00'}); r.warnings.forEach(function (w) { add('• ' + w, {size: 15}); }); }
    if ((r.conditions || []).length) { add('', {gap: 8}); add('Conditions', {size: 17, bold: true}); r.conditions.forEach(function (w) { add('• ' + w, {size: 15}); }); }
    var H = pad * 2 + lines.reduce(function (a, l) { return a + (l.gap || (l.size || 15) * 1.6); }, 0);
    var c = document.createElement('canvas'); c.width = W; c.height = Math.ceil(H); var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, c.height); var y = pad;
    lines.forEach(function (l) {
      if (l.gap) { y += l.gap; return; }
      var sz = l.size || 15; y += sz * 1.6;
      if (l.rule) { g.fillStyle = '#ccc'; g.fillRect(pad, y - sz * 1.45, W - pad * 2, 1); }
      g.font = (l.bold ? '700 ' : '400 ') + sz + 'px Arial, Helvetica, sans-serif'; g.fillStyle = l.color || '#111'; g.textBaseline = 'alphabetic';
      g.fillText(l.t, pad, y);
      if (l.right) { var w = g.measureText(l.right).width; g.fillText(l.right, W - pad - w, y); }
    });
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }
  function save(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  async function exportReport(r) {
    var stamp = (r.applicationDate || new Date().toISOString().slice(0, 10)), who = ((r.borrowers || [])[0] || {}).name || 'borrower';
    save('Income report ' + who + ' ' + stamp + '.png', await reportPNG(r));
    save('Income report ' + who + ' ' + stamp + '.json', new Blob([JSON.stringify(r, null, 2)], {type: 'application/json'}));
  }

  /* ---------------------------------------------------------------- preview UI */
  function mount(host) {
    if (!host) return;
    host.innerHTML = '<div class="aii-drop" id="aiiDrop"><b>Drop income documents here</b><span>Pay stubs, W-2s, tax returns, K-1s, VOEs, award letters - PDFs or pictures. Or <a href="#" id="aiiPick">choose files</a>.</span></div>' +
      '<div class="aii-row"><label>Agency<select id="aiiAgency"><option>Fannie Mae</option><option>Freddie Mac</option><option>FHA</option><option>VA</option><option>Non-QM</option></select></label>' +
      '<label>Borrowers<input id="aiiBorrowers" placeholder="Names"></label><label>Notes<input id="aiiNotes" placeholder="Anything the documents don\'t say"></label></div>' +
      '<div class="aii-row"><label>Claude API key<input id="aiiKey" type="password" disabled placeholder="Not connected yet - nothing is stored or sent"></label></div>' +
      '<div class="aii-row"><button id="aiiGo" disabled title="Not connected yet">Generate income report</button><button id="aiiReq" class="ghost">Show the request that would be sent</button><button id="aiiSample" class="ghost">Preview with the sample report</button></div>' +
      '<ul id="aiiFiles"></ul><pre id="aiiOut" hidden></pre><div id="aiiReport"></div>';
    var docs = [];
    var paint = function () { document.getElementById('aiiFiles').innerHTML = docs.map(function (d) { return '<li><b>' + d.fileName.replace(/</g, '&lt;') + '</b> <span>' + (d.error ? '⚠ ' + d.error : (d.block === 'document' ? 'PDF' : 'Picture') + ' · ' + Math.round(d.size / 1024) + ' KB' + (d.detected ? ' · reads as: ' + d.detected : '')) + '</span></li>'; }).join(''); };
    var add = async function (files) { docs = docs.concat(await intake([].slice.call(files))); paint(); };
    var drop = document.getElementById('aiiDrop');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer.files); });
    document.getElementById('aiiPick').onclick = function (e) { e.preventDefault(); var i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'application/pdf,image/*'; i.onchange = function () { add(i.files); }; i.click(); };
    document.getElementById('aiiReq').onclick = async function () {
      var req = await buildRequest(docs, {agency: document.getElementById('aiiAgency').value, borrowers: document.getElementById('aiiBorrowers').value, notes: document.getElementById('aiiNotes').value, date: new Date().toISOString().slice(0, 10)});
      var o = document.getElementById('aiiOut'); o.hidden = false; o.textContent = '/* Built locally, NOT sent */\n' + JSON.stringify(preview(req), null, 2);
    };
    document.getElementById('aiiSample').onclick = async function () {
      var r = await (await fetch(SAMPLE_URL)).json(), schema = await (await fetch(SCHEMA_URL)).json(), errs = validate(r, schema);
      var box = document.getElementById('aiiReport'), png = await reportPNG(r), url = URL.createObjectURL(png);
      box.innerHTML = '<p>' + (errs.length ? '⚠ ' + errs.join('; ') : '✓ Sample report passes the schema checks.') + ' <button id="aiiSave">Save PNG + JSON</button></p><img alt="Income report preview" src="' + url + '">';
      document.getElementById('aiiSave').onclick = function () { exportReport(r); };
    };
  }

  window.MTAiIncome = {intake: intake, buildRequest: buildRequest, preview: preview, providers: providers, validate: validate, reportPNG: reportPNG, exportReport: exportReport, mount: mount, MODEL: MODEL};
})();
