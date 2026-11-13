/* Mortgage Suite 56.5 - address autocomplete on every property and address box.
   Suggestions come from Photon (photon.komoot.io), an OpenStreetMap search built for type-ahead, limited to the United States.
   What you type in an address box is sent to Photon after you pause; nothing else is sent. Suggestions can be turned off
   (the choice is kept in this browser). A pick fills the street and, where the page has them, the city, state, ZIP and county:
   the Loan Suite property fields, the document builders' Property blocks, and City / State / ZIP boxes next to other address boxes. */
(function () {
  'use strict';
  if (window.MTAddr) return;
  var API = 'https://photon.komoot.io/api/', OFF = 'mt.addr.off', BIAS = 'mt.addr.bias', Z = 2147483300;
  var STATES = {Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR'};
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function off() { try { return localStorage.getItem(OFF) === '1'; } catch (e) { return false; } }
  function setOff(v) { try { if (v) localStorage.setItem(OFF, '1'); else localStorage.removeItem(OFF); } catch (e) {} document.dispatchEvent(new CustomEvent('mtaddr:toggle', {detail: {off: !!v}})); }

  /* ------------------------------------------------------------- the search */
  var cache = {}, ctl = null;
  function toAddr(f, typed) {
    var p = f.properties || {}, num = p.housenumber || '', st = p.street || (p.type === 'street' ? p.name : '') || '';
    var lead = String(typed || '').match(/^\s*(\d+[A-Za-z]?(?:-\d+)?)\s/);
    if (!num && st && lead) num = lead[1];                       /* a street match keeps the house number you typed */
    var street = [num, st].filter(Boolean).join(' ') || p.name || '';
    var city = p.city || p.town || p.village || p.locality || p.district || p.hamlet || '';
    var state = p.state || '', abbr = STATES[state] || state, zip = String(p.postcode || '').slice(0, 5);
    var c = f.geometry && f.geometry.coordinates;
    return {street: street, city: city, state: state, stateAbbr: abbr, zip: zip, county: String(p.county || '').replace(/\s+County$/i, ''),
      line: [street, city, [abbr, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), cityLine: [city, [abbr, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), lon: c ? c[0] : null, lat: c ? c[1] : null, exact: !!p.housenumber};
  }
  /* results lean toward the loan file's area: its ZIP is located once (and kept), else the last address picked */
  var ABBR = {st: 'street', ave: 'avenue', av: 'avenue', rd: 'road', dr: 'drive', ln: 'lane', blvd: 'boulevard', ct: 'court', pl: 'place', ter: 'terrace', pkwy: 'parkway', hwy: 'highway', cir: 'circle', sq: 'square', tpke: 'turnpike', n: 'north', s: 'south', e: 'east', w: 'west'};
  function fileZip() {
    try { var st = window.mortgageSuite && mortgageSuite.store, a = st && st.activeInputs; if (a && /^\d{5}/.test(a.zipCode || '')) return String(a.zipCode).slice(0, 5); } catch (e) {}
    try { var wf = JSON.parse(localStorage.getItem('mtgcalc-shared-workflow-v1') || 'null'), z = wf && wf.suiteInputs && wf.suiteInputs.zipCode; if (/^\d{5}/.test(z || '')) return String(z).slice(0, 5); } catch (e) {}
    return '';
  }
  var zipPending = {};
  function bias() {
    var z = fileZip(), m = null; try { m = JSON.parse(localStorage.getItem('mt.addr.zips') || '{}') || {}; } catch (e) { m = {}; }
    if (z && m[z]) return Promise.resolve(m[z]);
    var last = null; try { last = JSON.parse(localStorage.getItem(BIAS) || 'null'); } catch (e) {}
    if (!z || zipPending[z]) return Promise.resolve(last);
    zipPending[z] = 1;
    return fetch(API + '?q=' + z + '&limit=5&bbox=-179.9,17.5,-64.5,71.6&osm_tag=place:postcode').then(function (r) { return r.json(); }).then(function (j) {
      var f = (j.features || []).filter(function (x) { return (x.properties || {}).countrycode === 'US'; })[0]; if (!f) return last;
      var c = {lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0]}; m[z] = c; try { localStorage.setItem('mt.addr.zips', JSON.stringify(m)); } catch (e) {} return c;
    }).catch(function () { return last; });
  }
  function words(s) { return String(s || '').toLowerCase().replace(/[.,#]/g, ' ').split(/\s+/).filter(Boolean).map(function (w) { return ABBR[w] || w; }); }
  function score(a, q) {
    var t = words(q), hay = words(a.line + ' ' + a.county), num = (String(q).match(/^\s*(\d+[a-z]?)/i) || [])[1], sc = 0;
    t.forEach(function (w, i) { if (/^\d/.test(w)) return; var last = i === t.length - 1; if (hay.some(function (h) { return h === w || (last || w.length >= 4) && h.indexOf(w) === 0; })) sc += 1; });
    if (num && a.exact && String(a.street).toLowerCase().indexOf(num.toLowerCase() + ' ') === 0) sc += 2;
    return sc;
  }
  function search(q) {
    q = String(q || '').replace(/\s+/g, ' ').trim(); var key = q.toLowerCase();
    if (cache[key]) return Promise.resolve(cache[key]);
    if (ctl) try { ctl.abort(); } catch (e) {}
    var my = ctl = window.AbortController ? new AbortController() : null;
    return bias().then(function (b) {
      var url = API + '?q=' + encodeURIComponent(q) + '&limit=10&lang=en&bbox=-179.9,17.5,-64.5,71.6&layer=house&layer=street' + (b && isFinite(b.lat) ? '&lat=' + (+b.lat).toFixed(3) + '&lon=' + (+b.lon).toFixed(3) : '');
      return fetch(url, my ? {signal: my.signal} : {});
    }).then(function (r) { if (!r.ok) throw new Error('Address search answered ' + r.status); return r.json(); }).then(function (j) {
      var seen = {}, list = (j.features || []).filter(function (f) { return (f.properties || {}).countrycode === 'US'; }).map(function (f, i) { var a = toAddr(f, q); a.rank = i; a.score = score(a, q); return a; })
        .filter(function (a) { var k = a.line.toLowerCase(); if (!a.street || seen[k]) return false; seen[k] = 1; return true; });
      var best = list.reduce(function (m, a) { return Math.max(m, a.score); }, 0);
      var out = list.filter(function (a) { return a.score >= Math.max(1, best - 2) || best === 0; })
        .sort(function (x, y) { return y.score - x.score || (y.exact ? 1 : 0) - (x.exact ? 1 : 0) || x.rank - y.rank; }).slice(0, 6);
      cache[key] = out; return out.length >= 2 ? out : nominatim(q).then(function (more) { var all = merge(out, more); cache[key] = all; return all; }, function () { return out; });
    }, function (e) { if (e && e.name === 'AbortError') throw e; return nominatim(q); });
  }
  /* 57.6: the second search - OpenStreetMap Nominatim, used when the type-ahead search has fewer than two answers */
  var lastNom = 0;
  function nominatim(q) {
    var wait = Math.max(0, 1100 - (Date.now() - lastNom)); lastNom = Date.now() + wait;   /* their limit: one search a second */
    return new Promise(function (res) { setTimeout(res, wait); }).then(function () {
      return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=us&limit=5&q=' + encodeURIComponent(q));
    }).then(function (r) { return r.ok ? r.json() : []; }).then(function (j) {
      return (j || []).map(function (x) { var d = x.address || {}, num = d.house_number || '', st = d.road || ''; var lead = String(q).match(/^\s*(\d+[A-Za-z]?)\s/); if (!num && st && lead) num = lead[1];
        var a = mk([num, st].filter(Boolean).join(' ') || x.name, d.city || d.town || d.village || d.hamlet || d.suburb || '', d.state || '', d.postcode || '', d.county || '', 'Nominatim'); if (a) { a.lat = +x.lat; a.lon = +x.lon; a.exact = !!num; } return a; }).filter(Boolean);
    }).catch(function () { return []; });
  }

  /* ------------------------------------------------------------ the list UI */
  var box = null, cur = null, items = [], hi = -1, timer = 0, seq = 0;
  function css() {
    if (document.getElementById('mtAddrCss')) return; var s = document.createElement('style'); s.id = 'mtAddrCss';
    s.textContent = '.mtA-list{position:fixed;z-index:' + Z + ';min-width:300px;max-width:min(560px,calc(100vw - 16px));background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;border-radius:10px;box-shadow:0 14px 34px rgba(0,0,0,.45);overflow:hidden;font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;text-align:left}' +
      '.mtA-list [role=option]{padding:7px 11px;cursor:pointer;border-top:1px solid #142d52}.mtA-list [role=option]:first-child{border-top:0}.mtA-list [role=option] b{display:block;font-weight:600;color:#fff}.mtA-list [role=option] small{color:#9db0c8;font-size:11.5px}.mtA-list [role=option] em{font-style:normal;font-weight:600;font-size:10.5px;color:#0b1c3a;background:#9fc4ff;border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px}' +
      '.mtA-list [role=option][aria-selected=true],.mtA-list [role=option]:hover{background:#123a75}.mtA-list .mtA-ft{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:5px 11px;font-size:11px;color:#8ea3c0;background:#071630;border-top:1px solid #142d52}' +
      '.mtA-list .mtA-ft button{all:unset;cursor:pointer;color:#9fc4ff;font-size:11px}.mtA-list .mtA-ft button:hover{text-decoration:underline}.mtA-list .mtA-ft button:focus-visible{outline:2px solid #5aa2ff}.mtA-list .mtA-msg{padding:8px 11px;color:#9db0c8}' +
      '@media print{.mtA-list{display:none!important}}';
    document.head.appendChild(s);
  }
  function ensureBox() {
    if (box) return box; css(); box = document.createElement('div'); box.className = 'mtA-list no-print'; box.id = 'mtAddrList'; box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Address suggestions'); box.hidden = true;
    box.addEventListener('mousedown', function (e) { e.preventDefault(); });   /* keep focus in the address box */
    box.addEventListener('click', function (e) {
      var o = e.target.closest('[role=option]'); if (o) return choose(+o.getAttribute('data-i'));
      var b = e.target.closest('[data-mta]'); if (!b) return; var a = b.getAttribute('data-mta');
      if (a === 'off') { setOff(true); hide(); }
      if (a === 'google' && cur) window.open('https://www.google.com/search?q=' + encodeURIComponent(cur.value), '_blank', 'noopener');
      if (a === 'usps') window.open('https://tools.usps.com/zip-code-lookup.htm?byaddress', '_blank', 'noopener');
      if (a === 'prop' && cur) { var v = cur.value, p2 = partners(cur), line = [v, p2.city && p2.city.value, p2.state && (p2.state.value || ''), p2.zip && p2.zip.value].filter(Boolean).join(', '); hide(); lookup(line || v); }
    });
    document.body.appendChild(box); return box;
  }
  function place() { if (!box || !cur || box.hidden) return; var r = cur.getBoundingClientRect(); if (!r.width) return hide(); var below = innerHeight - r.bottom, h = box.offsetHeight || 220;
    box.style.left = Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 340) - 8)) + 'px'; box.style.width = Math.max(r.width, 340) + 'px';
    box.style.top = (below < h + 8 && r.top > h + 8 ? r.top - h - 4 : r.bottom + 4) + 'px'; }
  function foot() { return '<div class="mtA-ft"><span>Address data &copy; OpenStreetMap contributors</span><span><button type="button" data-mta="prop">Property details</button> &middot; <button type="button" data-mta="usps">USPS ZIP lookup</button> &middot; <button type="button" data-mta="google">Google</button> &middot; <button type="button" data-mta="off">Turn off</button></span></div>'; }
  function render(list, msg) {
    ensureBox(); items = list || []; hi = -1;
    box.innerHTML = (items.length ? items.map(function (a, i) { return '<div role="option" id="mtA-o' + i + '" data-i="' + i + '" aria-selected="false"><b>' + esc(a.street) + (a.src ? ' <em>' + esc(a.src) + '</em>' : '') + '</b><small>' + esc(a.cityLine) + (a.county ? ' &middot; ' + esc(a.county) + ' County' : '') + '</small></div>'; }).join('') : '<div class="mtA-msg">' + esc(msg || 'No US address matches yet - keep typing.') + '</div>') + foot();
    box.hidden = false; if (cur) { cur.setAttribute('aria-expanded', 'true'); cur.removeAttribute('aria-activedescendant'); } place();
  }
  function hide() { if (box) box.hidden = true; if (cur) { cur.setAttribute('aria-expanded', 'false'); cur.removeAttribute('aria-activedescendant'); } items = []; hi = -1; }
  function move(d) { if (!items.length) return; hi = (hi + d + items.length) % items.length; [].forEach.call(box.querySelectorAll('[role=option]'), function (o, i) { o.setAttribute('aria-selected', String(i === hi)); if (i === hi) o.scrollIntoView({block: 'nearest'}); }); if (cur) cur.setAttribute('aria-activedescendant', 'mtA-o' + hi); }
  function choose(i) {
    var a = items[i], el = cur; if (!a || !el) return; hide();
    try { if (isFinite(a.lat)) localStorage.setItem(BIAS, JSON.stringify({lat: a.lat, lon: a.lon})); } catch (e) {}
    el.__mtaPicked = a.street; remember(a, 'Used'); var o = el.__mta || {};
    if (o.onPick) o.onPick(a, el); else fill(el, a);
  }
  /* Some pages rebuild their inputs on every keystroke (the Income Calculator's panels). The list then follows the rebuilt
     box: the same field is found again by its attributes, and if the rebuild dropped the cursor it is put back at the end. */
  function sig(el) { return ['oninput', 'onchange', 'data-path', 'data-k', 'data-list', 'data-i', 'data-f', 'placeholder', 'name', 'id'].map(function (a) { return el.getAttribute(a) || ''; }).join('|') + '|' + el.className; }
  function same(s) { return [].filter.call(document.querySelectorAll('input'), function (x) { return x.offsetParent && sig(x) === s; }); }
  function revive(el) {
    if (el.isConnected) return el; var s = el.__sig || sig(el), list = same(s);
    return list.length === 1 ? list[0] : list[el.__sigIdx] || null;
  }
  function live(el) {
    var x = revive(el); if (!x) return null;
    if (x !== el) { attach(x, el.__mta); x.__sig = el.__sig; x.__sigIdx = el.__sigIdx; }
    var ae = document.activeElement;
    if (ae !== x) { if (ae && ae !== document.body && ae !== document.documentElement) return null; try { x.focus({preventScroll: true}); var n = x.value.length; x.setSelectionRange(n, n); } catch (e) {} }
    cur = x; return x;
  }
  /* Known addresses - the loan file's, the document builders' drafts, ones picked before and full addresses typed into an
     address box - are matched on every keystroke without the network; Photon's results join them a moment later. */
  var RECENT = 'mt.addr.recent', ABBR2 = {}; Object.keys(STATES).forEach(function (k) { ABBR2[STATES[k]] = k; });
  function mk(street, city, state, zip, county, src) {
    street = String(street || '').trim(); if (!street) return null; state = String(state || '').trim(); city = String(city || '').trim();
    var full = ABBR2[state.toUpperCase()] || state, abbr = STATES[full] || state; zip = String(zip || '').slice(0, 5);
    return {street: street, city: city, state: full, stateAbbr: abbr, zip: zip, county: String(county || '').replace(/\s+County$/i, ''), src: src,
      line: [street, city, [abbr, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), cityLine: [city, [abbr, zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), exact: true};
  }
  function fromLine(line, src) { line = String(line || '').replace(/\s+/g, ' ').trim(); var m = line.match(/^(.*?),\s*([^,]+?),?\s+([A-Za-z]{2}|[A-Za-z .]{4,}?)\.?,?\s+(\d{5})(?:-\d{4})?$/); return m ? mk(m[1], m[2], m[3], m[4], '', src) : null; }
  var knownAt = 0, knownList = [];
  function known() {
    if (Date.now() - knownAt < 1500) return knownList; var out = [], add = function (a) { if (a) out.push(a); };
    try { (JSON.parse(localStorage.getItem(RECENT) || '[]') || []).forEach(function (a) { add(mk(a.street, a.city, a.state, a.zip, a.county, a.src === 'Typed' ? 'Typed before' : 'Used before')); }); } catch (e) {}
    try { var st = window.mortgageSuite && mortgageSuite.store, ai = st && st.activeInputs; if (ai) add(mk(ai.propertyAddress, ai.city, ai.state, ai.zipCode, ai.nyCounty, 'Loan file')); } catch (e) {}
    try { var wf = JSON.parse(localStorage.getItem('mtgcalc-shared-workflow-v1') || 'null'), si = wf && wf.suiteInputs; if (si) add(mk(si.propertyAddress, si.city, si.state, si.zipCode, si.nyCounty, 'Loan file')); } catch (e) {}
    try { var S = (0, eval)('typeof S !== "undefined" ? S : null'); if (S && S.loan && S.loan.address) add(fromLine(S.loan.address, 'Loan file') || mk(S.loan.address, '', '', '', '', 'Loan file')); } catch (e) {}
    try { var dr = JSON.parse(localStorage.getItem('mt.builder.v1') || '{}') || {}; Object.keys(dr).forEach(function (k) { var d = dr[k]; if (d && d.address) add(fromLine(d.address, 'Document builder') || mk(d.address, d.city, d.state, d.zip, d.county, 'Document builder')); }); } catch (e) {}
    var seen = {}; knownList = out.filter(function (a) { var k = (a.street + '|' + a.zip).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); knownAt = Date.now(); return knownList;
  }
  function localMatch(q) {
    var t = words(q); if (!t.length) return [];
    return known().filter(function (a) { var hay = words(a.line + ' ' + a.county); return t.every(function (w, i) { var last = i === t.length - 1; return hay.some(function (h) { return h === w || ((last || /^\d/.test(w) || w.length >= 3) && h.indexOf(w) === 0); }); }); }).slice(0, 4);
  }
  function remember(a, src) {
    if (!a || !a.street) return; var list = []; try { list = JSON.parse(localStorage.getItem(RECENT) || '[]') || []; } catch (e) {}
    var k = (a.street + '|' + a.zip).toLowerCase(); list = list.filter(function (x) { return (x.street + '|' + x.zip).toLowerCase() !== k; });
    list.unshift({street: a.street, city: a.city, state: a.state, zip: a.zip, county: a.county, src: src || 'Used'}); try { localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 40))); } catch (e) {} knownAt = 0;
  }
  function merge(loc, remote) { var seen = {}; return loc.concat(remote).filter(function (a) { var k = (a.street + '|' + (a.zip || a.city)).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }).slice(0, 7); }
  function query(el) {
    var q = String(el.value || '').trim(); clearTimeout(timer);
    if (off() || q.length < 2 || !/[a-z0-9]/i.test(q) || el.__mtaPicked === el.value) return hide();
    var loc = localMatch(q), my = ++seq;
    if (loc.length) { if (live(el)) render(loc); } else if (box && !box.hidden) hide();
    if (q.length < 3 || !/[a-z]/i.test(q)) return;
    timer = setTimeout(function () {
      search(q).then(function (list) { if (my !== seq || (cur !== el && revive(el) !== cur)) return; if (!live(el)) return; render(merge(localMatch(q), list)); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; if (my === seq && live(el)) { var l2 = localMatch(q); render(l2, l2.length ? '' : 'Address suggestions are not answering right now - type the address, or use Check on Google.'); } });
    }, 200);
  }

  /* ------------------------------------------------------ filling the page */
  function setInput(el, v) { if (!el || el.value === v) return; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
  function setSelect(el, a) { var want = [a.state, a.stateAbbr].map(function (x) { return String(x).toLowerCase(); }); var o = [].filter.call(el.options, function (x) { return want.indexOf(String(x.value).toLowerCase()) >= 0 || want.indexOf(String(x.text).trim().toLowerCase()) >= 0; })[0]; if (o && el.value !== o.value) { el.value = o.value; el.dispatchEvent(new Event('change', {bubbles: true})); } }
  function labelOf(el) { var t = [el.getAttribute('aria-label'), el.placeholder, el.name, el.id, el.getAttribute('data-path'), el.getAttribute('data-k')]; if (el.labels && el.labels[0]) t.push(el.labels[0].textContent);
    var p = el.parentElement; for (var k = 0; p && k < 2; k++, p = p.parentElement) { var own = [].filter.call(p.childNodes, function (n) { return n.nodeType === 3 || (n.nodeType === 1 && /^(LABEL|SPAN|B|STRONG|SMALL|DIV)$/.test(n.tagName) && !n.querySelector('input,select,textarea') && n.textContent.length < 70); }).map(function (n) { return n.textContent; }).join(' '); if (own.trim()) { t.push(own); break; } }
    return t.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }
  /* other fields in the same form row: City, State, ZIP, County */
  function partners(el) {
    var scope = el.closest('fieldset, form, .card, .modal, .panel, section, table, .grid, .row, .field-grid') || el.parentElement && el.parentElement.parentElement; if (!scope) return {};
    var out = {}; [].forEach.call(scope.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select'), function (x) {
      if (x === el || !x.offsetParent && x.type !== 'hidden' && el.offsetParent) return; var l = labelOf(x).toLowerCase();
      if (/e-?mail|phone|employer|company|business/.test(l)) return;
      if (!out.city && /\b(city|town|municipality)\b/.test(l) && !/state|zip/.test(l)) out.city = x;
      else if (!out.zip && /\b(zip|postal)\b/.test(l) && !/city/.test(l)) out.zip = x;
      else if (!out.state && /\bstate\b/.test(l) && !/city|zip|real estate|statement/.test(l)) out.state = x;
      else if (!out.county && /\bcounty\b/.test(l)) out.county = x;
      else if (!out.cityLine && /city.*state|state.*zip/.test(l)) out.cityLine = x;
    }); return out;
  }
  function fill(el, a) {
    /* the Loan Suite: the property's street, city, state, ZIP and NY county are store fields */
    var st = window.mortgageSuite && mortgageSuite.store;
    if (el.getAttribute('data-path') === 'propertyAddress' && st && st.setField) {
      setInput(el, a.street); var set = function (k, v) { try { if (v) st.setField(k, v, 'Address search'); } catch (e) {} };
      set('propertyAddress', a.street); set('city', a.city); set('state', a.state); set('zipCode', a.zip); if (a.state === 'New York') set('nyCounty', a.county);
      return;
    }
    var p = partners(el);
    if (p.city || p.zip || p.cityLine) { setInput(el, a.street); if (p.city) setInput(p.city, a.city); if (p.zip) setInput(p.zip, a.zip); if (p.cityLine) setInput(p.cityLine, a.cityLine); if (p.county) setInput(p.county, a.county);
      if (p.state) { if (p.state.tagName === 'SELECT') setSelect(p.state, a); else setInput(p.state, /^[A-Z]{2}$/.test(p.state.value || '') || (p.state.maxLength > 0 && p.state.maxLength <= 3) ? a.stateAbbr : a.state); } }
    else setInput(el, a.line);
  }

  /* ---------------------------------------------------------- attaching */
  function attach(el, opt) {
    if (!el || el.__mta) { if (el && opt) el.__mta = opt; return; }
    el.__mta = opt || {}; el.setAttribute('autocomplete', 'off'); el.setAttribute('role', 'combobox'); el.setAttribute('aria-autocomplete', 'list'); el.setAttribute('aria-expanded', 'false'); el.setAttribute('aria-controls', 'mtAddrList'); el.setAttribute('data-mtaddr', '1');
    if (el.isConnected) { el.__sig = sig(el); el.__sigIdx = Math.max(0, same(el.__sig).indexOf(el)); }
    el.addEventListener('input', function (e) { if (!e.isTrusted && el.__mtaPicked !== undefined) return; cur = el; el.__mtaPicked = undefined; query(el); });
    el.addEventListener('focus', function () { cur = el; });
    el.addEventListener('change', function () { if (el.__mtaPicked === undefined) { var a = fromLine(el.value, 'Typed'); if (a) remember(a, 'Typed'); } });
    el.addEventListener('blur', function () { setTimeout(function () { if (cur === el && document.activeElement !== el) hide(); }, 120); });
    el.addEventListener('keydown', function (e) {
      if (!box || box.hidden) { if (e.key === 'ArrowDown' && !off()) { el.__mtaPicked = undefined; cur = el; query(el); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); e.stopPropagation(); choose(hi); } else if (e.key === 'Escape') { e.stopPropagation(); hide(); } else if (e.key === 'Tab') hide();
    });
  }
  var ADDR = /\b(address|street|premises|job site|property location|subject property)\b/i, NOT = /e-?mail|web|url|\bip\b|city|town|\bzip|postal|\bstate\b|county|unit\s*#|apt|suite\b|line 2|ssn|nmls|phone/i;
  function candidate(el) {
    if (el.__mta || el.readOnly || el.disabled || el.closest('#mtB, .mtA-list, [data-mtaddr-skip]')) return false;
    if (el.getAttribute('data-path') === 'propertyAddress') return true;
    var l = labelOf(el); return ADDR.test(l) && !NOT.test(l.replace(ADDR, ''));
  }
  function scan(root) { [].forEach.call((root || document).querySelectorAll('input[type=text], input:not([type])'), function (el) { if (candidate(el)) attach(el); }); }
  var mo = new MutationObserver(function (m) { if (m.some(function (r) { return r.addedNodes.length; })) { clearTimeout(mo.t); mo.t = setTimeout(scan, 150); } });
  function start() { scan(); mo.observe(document.body, {childList: true, subtree: true}); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
  document.addEventListener('focusin', function (e) { var t = e.target; if (t && t.matches && t.matches('input[type=text], input:not([type])') && candidate(t)) attach(t); });

  /* ------------------------------------------------ 57.6: property details
     Free public sources only, looked up when asked: FEMA's flood map (flood zone), the FCC's census area service (county,
     census tract and block) and OpenStreetMap (building type, floors, units, year built where mapped). Beds, baths, living
     area and year built are not in free public records - the panel opens the listing sites for the address and keeps what
     you enter for it in this browser. */
  var PKEY = 'mt.prop.details', pbox = null;
  function pstore() { try { return JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { return {}; } }
  function psave(k, d) { try { var all = pstore(); all[k] = d; var keys = Object.keys(all); if (keys.length > 30) delete all[keys[0]]; localStorage.setItem(PKEY, JSON.stringify(all)); } catch (e) {} }
  function geocode(line) { return search(line).then(function (l) { return (l || []).filter(function (a) { return isFinite(a.lat); })[0] || nominatim(line).then(function (n) { return n[0] || null; }); }); }
  function tfetch(u, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, ms || 12000); return fetch(u, c ? {signal: c.signal} : {}).finally(function () { clearTimeout(t); }); }
  function lookup(line) {
    line = String(line || '').trim(); if (!line) return;
    css(); if (!pbox) { pbox = document.createElement('div'); pbox.id = 'mtPropBox'; pbox.className = 'no-print'; pbox.setAttribute('role', 'dialog'); pbox.setAttribute('aria-label', 'Property details'); document.body.appendChild(pbox);
      pbox.addEventListener('click', function (e) {
        /* 57.8: listing sites refuse to be shown inside another page, so they open in a window docked to the right half of the screen and
           this panel moves to the left - side by side, type what you read straight into the fields */
        var sv = e.target.closest('[data-v]'); if (sv) { var W = screen.availWidth || innerWidth, H = screen.availHeight || innerHeight, x = (screen.availLeft || 0) + Math.round(W / 2);
          var win = window.open(sv.getAttribute('data-v'), 'mtPropView', 'popup=yes,width=' + Math.round(W / 2) + ',height=' + H + ',left=' + x + ',top=' + (screen.availTop || 0)); pbox.classList.add('mtP-left');
          var nt = pbox.querySelector('.mtP-n'); if (nt) nt.textContent = win ? 'The listing opened beside this page - type the beds, baths and the rest into the fields here.' : 'The browser blocked the window - allow pop-ups for this site, then press the button again.'; return; }
        var b = e.target.closest('[data-p]'); if (!b) return; var a = b.getAttribute('data-p');
        if (a === 'map') { var mp = pbox.querySelector('.mtP-map'); mp.hidden = !mp.hidden; if (!mp.hidden && !mp.firstChild) mp.innerHTML = '<iframe title="Map of the property" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(pbox.getAttribute('data-line') || '') + '&t=k&z=19&output=embed"></iframe>'; pbox.classList.toggle('mtP-wide', !mp.hidden); return; }
        if (a === 'x') pbox.hidden = true;
        if (a === 'copy') { var t = pbox.querySelector('.mtP-body').innerText + '\n' + [].map.call(pbox.querySelectorAll('[data-pf]'), function (i) { return i.getAttribute('data-pl') + ': ' + i.value; }).filter(function (x) { return !/:\s*$/.test(x); }).join('\n'); try { navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch (er) {} } });
      pbox.addEventListener('input', function (e) { var i = e.target.closest('[data-pf]'); if (!i) return; var k = pbox.getAttribute('data-key'), d = pstore()[k] || {}; d[i.getAttribute('data-pf')] = i.value; psave(k, d); });
      var st = document.createElement('style'); st.textContent = '#mtPropBox{position:fixed;z-index:' + (Z + 1) + ';right:16px;top:70px;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.5);font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;animation:mtPin .25s ease}' +
        '@keyframes mtPin{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}#mtPropBox h3{margin:0;font-size:14px}#mtPropBox .mtP-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid #142d52}#mtPropBox .mtP-body{padding:10px 14px}#mtPropBox dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}#mtPropBox dt{color:#9db0c8}#mtPropBox dd{margin:0}' +
        '#mtPropBox .mtP-f{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 10px}#mtPropBox label{font-size:11.5px;color:#9db0c8;display:grid;gap:2px}#mtPropBox input{background:#071630;border:1px solid #2b5590;border-radius:6px;color:#fff;padding:5px 7px}#mtPropBox .mtP-l{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 12px}#mtPropBox .mtP-l a,#mtPropBox button{border:1px solid #2b5590;border-radius:999px;padding:4px 10px;color:#9fc4ff;background:transparent;text-decoration:none;font:600 12px system-ui;cursor:pointer}#mtPropBox .mtP-l a:hover,#mtPropBox button:hover{background:#123a75}#mtPropBox .mtP-n{font-size:11px;color:#8ea3c0;padding:0 14px 12px}#mtPropBox.mtP-left{right:auto;left:16px}#mtPropBox.mtP-wide{width:min(620px,calc(100vw - 32px))}#mtPropBox .mtP-map{padding:0 14px 12px}#mtPropBox .mtP-map iframe{width:100%;height:320px;border:0;border-radius:8px}';
      document.head.appendChild(st);
    }
    var key = line.toLowerCase().replace(/\s+/g, ' '), saved = pstore()[key] || {}, q = encodeURIComponent(line);
    pbox.setAttribute('data-key', key); pbox.setAttribute('data-line', line); pbox.hidden = false; pbox.classList.remove('mtP-wide');
    var fields = [['beds', 'Bedrooms'], ['baths', 'Bathrooms'], ['sqft', 'Living area (sq ft)'], ['year', 'Year built'], ['lot', 'Lot size'], ['taxes', 'Annual taxes'], ['hoa', 'HOA dues'], ['style', 'Style / type']];
    pbox.innerHTML = '<div class="mtP-h"><div><h3>Property details</h3><div style="color:#9db0c8;font-size:12px">' + esc(line) + '</div></div><button type="button" data-p="x" aria-label="Close">Close</button></div><div class="mtP-body">Looking up flood zone, census area and building data…</div>' +
      '<div class="mtP-f">' + fields.map(function (f) { return '<label>' + f[1] + '<input data-pf="' + f[0] + '" data-pl="' + f[1] + '" value="' + esc(saved[f[0]] || '') + '"></label>'; }).join('') + '</div>' +
      '<div class="mtP-l"><button type="button" data-p="map">Map (here)</button><button type="button" data-v="https://www.zillow.com/homes/' + encodeURIComponent(line.replace(/,/g, '').replace(/\s+/g, '-')) + '_rb/">Zillow</button><button type="button" data-v="https://www.redfin.com/search?q=' + q + '">Redfin</button><button type="button" data-v="https://www.realtor.com/realestateandhomes-search/' + encodeURIComponent(line) + '">Realtor.com</button><button type="button" data-v="https://www.google.com/search?q=' + encodeURIComponent(line + ' beds baths sqft') + '">Google</button><button type="button" data-v="https://msc.fema.gov/portal/search?AddressQuery=' + q + '">FEMA map</button><button type="button" data-p="copy">Copy details</button></div><div class="mtP-map" hidden></div>' +
      '<div class="mtP-n">Beds, baths, living area and year built are not in free public records - check a listing or the appraisal and enter them above; they are kept for this address in this browser.</div>';
    var body = pbox.querySelector('.mtP-body'), rows = [];
    var show = function () { body.innerHTML = '<dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>'; };
    geocode(line).then(function (a) {
      if (!a) { body.textContent = 'This address was not found on the map - check the spelling, or use the links below.'; return; }
      rows.push(['Matched', esc(a.line || line)]); if (a.county) rows.push(['County', esc(a.county) + ' County']); show();
      var lat = a.lat, lon = a.lon, jobs = [];
      jobs.push(tfetch('https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=' + lon + ',' + lat + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF&returnGeometry=false&f=json').then(function (r) { return r.json(); }).then(function (j) {
        var f = (j.features || [])[0], at = f && f.attributes; rows.push(['Flood zone', at ? '<b>' + esc(at.FLD_ZONE) + '</b>' + (at.ZONE_SUBTY ? ' - ' + esc(at.ZONE_SUBTY.toLowerCase()) : '') + (at.SFHA_TF === 'T' ? ' <b style="color:#ffb35c">(special flood hazard area - flood insurance required)</b>' : ' (not a special flood hazard area)') : 'Not mapped by FEMA here']); show(); }).catch(function () { rows.push(['Flood zone', 'FEMA did not answer - use the FEMA map link']); show(); }));
      jobs.push(tfetch('https://geo.fcc.gov/api/census/area?lat=' + lat + '&lon=' + lon + '&format=json').then(function (r) { return r.json(); }).then(function (j) {
        var r0 = (j.results || [])[0]; if (!r0) return; var tr = String(r0.block_fips || '').slice(5, 11);
        rows.push(['County / FIPS', esc(r0.county_name || '') + ' (' + esc(r0.county_fips || '') + ')']); rows.push(['Census tract', tr ? esc(tr.slice(0, 4) + '.' + tr.slice(4)) : '']); rows.push(['Census block', esc(r0.block_fips || '')]); show(); }).catch(function () {}));
      jobs.push(tfetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:15];(way(around:25,' + lat + ',' + lon + ')[building];);out tags 3;')).then(function (r) { return r.json(); }).then(function (j) {
        var t = ((j.elements || [])[0] || {}).tags || {}; if (!Object.keys(t).length) { rows.push(['Building', 'Not mapped in OpenStreetMap']); show(); return; }
        var b = []; if (t.building && t.building !== 'yes') b.push(t.building.replace(/_/g, ' ')); if (t['building:levels']) b.push(t['building:levels'] + ' floor' + (t['building:levels'] === '1' ? '' : 's')); if (t['building:units']) b.push(t['building:units'] + ' unit(s)'); if (t.start_date) b.push('built ' + t.start_date); if (t['roof:shape']) b.push(t['roof:shape'] + ' roof');
        rows.push(['Building (OSM)', esc(b.join(', ') || 'building mapped, no details')]); show();
        var y = pbox.querySelector('[data-pf=year]'); if (y && !y.value && /^\d{4}/.test(t.start_date || '')) { y.value = t.start_date.slice(0, 4); y.dispatchEvent(new Event('input', {bubbles: true})); } }).catch(function () {}));
    }).catch(function () { body.textContent = 'The address lookup is not answering - use the links below.'; });
  }

  /* ------------------------------------------------ 57.6: the last 10 borrower names, offered on borrower name boxes */
  var NKEY = 'mt.recent.names';
  function names10() { try { return JSON.parse(localStorage.getItem(NKEY) || '[]') || []; } catch (e) { return []; } }
  function nameDl() { var dl = document.getElementById('mtRecentNames'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'mtRecentNames'; document.body.appendChild(dl); } dl.innerHTML = names10().map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); return dl; }
  function isName(el) { if (el.list || el.__mtaName) return false; var l = (labelOf(el) + ' ' + (el.getAttribute('data-list') || '') + ' ' + (el.getAttribute('data-path') || '')).toLowerCase(); return /borrower|co-?borrower|client|buyer|applicant/.test(l) && /name|borrowers|clients|buyers/.test(l) && !/e-?mail|phone|address|employer|business|company|lender|processor|officer|ssn/.test(l); }
  document.addEventListener('focusin', function (e) { var t = e.target; if (!t || !t.matches || !t.matches('input[type=text], input:not([type])') || !isName(t)) return; t.__mtaName = true; nameDl(); t.setAttribute('list', 'mtRecentNames'); });
  document.addEventListener('change', function (e) { var t = e.target; if (!t || !t.__mtaName) return; var v = String(t.value || '').replace(/\s+/g, ' ').trim(); if (v.length < 3 || /\d/.test(v)) return; var l = names10().filter(function (x) { return x.toLowerCase() !== v.toLowerCase(); }); l.unshift(v); try { localStorage.setItem(NKEY, JSON.stringify(l.slice(0, 10))); } catch (er) {} nameDl(); }, true);

  window.MTAddr = {attach: attach, search: search, isOff: off, setOff: setOff, fill: fill, scan: scan, lookup: lookup, recentNames: names10};
})();
