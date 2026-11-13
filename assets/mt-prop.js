/* 57.10: the Property page (property.html) - public records on the left, the property itself on the right.
   The listing sites (Zillow, Redfin, Realtor.com) do not allow being shown inside another page, so they open in a window
   docked to the right half of the screen; Street View, the satellite and street maps and FEMA's flood viewer are shown here. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var FEMA = 'https://experience.arcgis.com/experience/9d22cdae8b7542b88e0d555a3eb92949';
  var FIELDS = [['beds', 'Bedrooms'], ['baths', 'Bathrooms'], ['sqft', 'Living area (sq ft)'], ['year', 'Year built'], ['lot', 'Lot size'], ['taxes', 'Annual taxes'], ['hoa', 'HOA dues'], ['style', 'Style / type']];
  var cur = {line: '', F: null, tab: 'sv', seq: 0};
  try { cur.tab = sessionStorage.getItem('mt.prop.tab') || 'sv'; } catch (e) {}

  function view(tab) {
    var F = cur.F, g = F && F.geo, box = $('pvFrame');
    [].forEach.call(document.querySelectorAll('#pvTabs [data-t]'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-t') === tab)); });
    if (!cur.line) return;
    var src = '', note = '';
    if (tab === 'sat') src = 'https://maps.google.com/maps?q=' + encodeURIComponent(g ? g.lat + ',' + g.lon : cur.line) + '&t=k&z=19&output=embed';
    else if (tab === 'sv') { if (g) src = 'https://maps.google.com/maps?layer=c&cbll=' + g.lat + ',' + g.lon + '&cbp=11,0,0,0,0&output=svembed'; else note = F && F.done ? 'Street View needs the address on the map.' : 'Finding the address…'; }
    else if (tab === 'map') { if (g) { var d = 0.0016; src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + (g.lon - d * 1.4) + ',' + (g.lat - d) + ',' + (g.lon + d * 1.4) + ',' + (g.lat + d) + '&layer=mapnik&marker=' + g.lat + ',' + g.lon; } else note = 'Finding the address…'; }
    else if (tab === 'flood') { src = FEMA; try { navigator.clipboard.writeText(cur.line); } catch (e) {} }
    var want = src || 'about:blank';
    if (box.getAttribute('data-src') === want && box.querySelector('iframe')) return;
    box.setAttribute('data-src', want);
    box.innerHTML = src ? '<iframe title="' + esc(tab) + ' view of the property" referrerpolicy="no-referrer-when-downgrade" allowfullscreen src="' + esc(src) + '"></iframe>' : '<div class="empty">' + esc(note) + '</div>';
    if (tab === 'flood') say('The address is copied - paste it (Ctrl+V) into "Find address or place" on the flood map.');
  }
  function say(t) { var n = $('pvSay'); if (n) n.textContent = t; }

  function left() {
    var F = cur.F, line = cur.line, saved = MTAddr.details(line);
    var rows = F ? F.rows : [], rec = F && F.rec;
    var html = '<div class="card"><h2>Location and flood</h2>' + (F && F.error ? '<div class="warn">' + esc(F.error) + '</div>' : rows.length ? '<dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '<div class="skel">Finding the address…</div>') + '</div>';
    html += '<div class="card"><h2>Public property record</h2>' + (rec ? (rec.rows.length ? '<div class="note" style="margin:0 0 6px">' + rec.title + '</div><dl>' + rec.rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '<div>' + rec.title + '</div>') + (rec.choices ? '<label class="note" style="display:grid;gap:4px">Parcel<select data-act="parcel" style="padding:6px;border-radius:8px;background:var(--panel2);color:var(--ink);border:1px solid var(--line)">' + rec.choices.map(function (c) { return '<option value="' + esc(c[0]) + '"' + (c[0] === rec.chosen ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select></label>' : '') + (rec.note ? '<div class="note">' + rec.note + '</div>' : '') + (rec.link ? '<div class="note"><a href="' + esc(rec.link[1]) + '" target="_blank" rel="noopener">' + esc(rec.link[0]) + ' ↗</a></div>' : '')
      : F && F.done ? '<div class="skel">No record was looked up.</div>' : '<div class="skel">Looking up the record…</div>') + '</div>';
    html += '<div class="card"><h2>Property details</h2><div class="fields">' + FIELDS.map(function (f) { var v = saved[f[0]] || '', auto = !v && F && F.fill[f[0]]; return '<label>' + f[1] + '<input data-pf="' + f[0] + '"' + (auto ? ' class="auto" title="From the public record"' : '') + ' value="' + esc(v || (auto ? F.fill[f[0]] : '')) + '"></label>'; }).join('') + '</div>' +
      '<div class="note">Green boxes came from the public record. Beds and baths are not in public records - read them from a listing (opens on the right) or the appraisal. What you enter is kept for this address in this browser and shows in every Property details panel.</div></div>';
    html += '<div class="card"><h2>Listings and tools</h2><div class="links">' + MTAddr.siteLinks(line).map(function (x) { return '<button type="button" data-side="' + esc(x[1]) + '">' + esc(x[0]) + '</button>'; }).join('') +
      '<button type="button" data-act="copy">Copy details</button><button type="button" data-act="print">Print</button></div><div class="note" id="pvSay">Listing sites open in a window on the right half of the screen; type what you read into the boxes above.</div></div>';
    $('pvLeft').innerHTML = html;
    if (F) FIELDS.forEach(function (f) { var i = document.querySelector('#pvLeft [data-pf=' + f[0] + ']'); if (i && i.classList.contains('auto') && i.value) save(); });
  }
  function save() { var d = {}; [].forEach.call(document.querySelectorAll('#pvLeft [data-pf]'), function (i) { if (i.value) d[i.getAttribute('data-pf')] = i.value; }); MTAddr.saveDetails(cur.line, d); }

  function run(line) {
    line = String(line || '').replace(/\s+/g, ' ').trim(); if (!line) return;
    cur.line = line; cur.F = null; var my = ++cur.seq; $('pvAddr').value = line;
    try { history.replaceState(null, '', location.pathname + '?a=' + encodeURIComponent(line)); } catch (e) {}
    document.title = line + ' · Property · Mortgage Suite';
    left(); view(cur.tab);
    var t = 0;
    MTAddr.facts(line, function (F) {
      if (my !== cur.seq) return; var hadGeo = !!(cur.F && cur.F.geo); cur.F = F;
      clearTimeout(t); t = setTimeout(function () { if (my !== cur.seq) return; var foc = document.activeElement && document.activeElement.closest && document.activeElement.closest('#pvLeft [data-pf]'); if (!foc) left(); }, 60);
      if (!hadGeo && F.geo) { view(cur.tab); var g = F.geo; try { MTAddr.remember({street: g.street, city: g.city, state: g.state, zip: g.zip, county: g.county}, 'Used'); } catch (e) {} recent(); }
    });
  }
  function recent() {
    var list = []; try { list = (MTAddr.recent() || []).slice(0, 8); } catch (e) {}
    $('pvRecent').innerHTML = list.length ? '<span class="note" style="margin:0;align-self:center">Recent:</span>' + list.map(function (a) { return '<button type="button" data-line="' + esc(a.line) + '" title="' + esc(a.src || '') + '">' + esc(a.street) + (a.city ? ', ' + esc(a.city) : '') + '</button>'; }).join('') : '';
  }

  function start() {
    if (!window.MTAddr || !MTAddr.facts) { $('pvLeft').innerHTML = '<div class="card warn">The address tools did not load - reload the page.</div>'; return; }
    var inp = $('pvAddr'); inp.removeAttribute('data-mtaddr-skip');
    MTAddr.attach(inp, {onPick: function (a) { inp.value = a.line; run(a.line); }});
    $('pvForm').addEventListener('submit', function (e) { e.preventDefault(); run(inp.value); });
    $('pvRecent').addEventListener('click', function (e) { var b = e.target.closest('[data-line]'); if (b) run(b.getAttribute('data-line')); });
    $('pvTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; cur.tab = b.getAttribute('data-t'); try { sessionStorage.setItem('mt.prop.tab', cur.tab); } catch (er) {} view(cur.tab); });
    $('pvCopyLink').addEventListener('click', function () { var u = location.href.split('#')[0]; try { navigator.clipboard.writeText(u); this.textContent = 'Link copied'; } catch (er) {} });
    $('pvLeft').addEventListener('change', function (e) { if (e.target.getAttribute('data-act') !== 'parcel' || !cur.F || !cur.F.rec || !cur.F.rec.pick) return; var r = cur.F.rec.pick(e.target.value); if (!r) return; cur.F.rec = r;
      var d = MTAddr.details(cur.line), old = cur.F.fill || {}; Object.keys(old).forEach(function (k) { if (d[k] === old[k]) delete d[k]; }); MTAddr.saveDetails(cur.line, d);
      cur.F.fill = Object.assign({}, old, r.fill || {}); left(); });
    $('pvLeft').addEventListener('input', function (e) { if (e.target.closest('[data-pf]')) { e.target.classList.remove('auto'); save(); } });
    $('pvLeft').addEventListener('click', function (e) {
      var s = e.target.closest('[data-side]'); if (s) { var w = MTAddr.openSide(s.getAttribute('data-side')); say(w ? s.textContent + ' opened on the right half of the screen - type what you read into the boxes above.' : 'The browser blocked the window - allow pop-ups for this site, then press the button again.'); return; }
      var a = e.target.closest('[data-act]'); if (!a) return;
      if (a.getAttribute('data-act') === 'print') { window.print(); return; }
      var t = cur.line + '\n' + [].map.call(document.querySelectorAll('#pvLeft dl'), function (dl) { return dl.innerText; }).join('\n') + '\n' + [].map.call(document.querySelectorAll('#pvLeft [data-pf]'), function (i) { return i.parentNode.firstChild.textContent + ': ' + i.value; }).filter(function (x) { return !/:\s*$/.test(x); }).join('\n');
      try { navigator.clipboard.writeText(t); a.textContent = 'Copied'; } catch (er) {}
    });
    recent();
    var q = new URLSearchParams(location.search).get('a') || new URLSearchParams(location.search).get('address');
    if (q) run(q); else view(cur.tab);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
