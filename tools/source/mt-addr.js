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
  function search(q, own) {
    q = String(q || '').replace(/\s+/g, ' ').trim(); var key = q.toLowerCase();
    if (cache[key]) return Promise.resolve(cache[key]);
    if (!own && ctl) try { ctl.abort(); } catch (e) {}
    var my = own ? null : (ctl = window.AbortController ? new AbortController() : null);
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
  function geocode(line) { return search(line, true).then(function (l) { return (l || []).filter(function (a) { return isFinite(a.lat); })[0] || nominatim(line).then(function (n) { return n[0] || null; }); }); }
  function tfetch(u, ms) { var c = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, ms || 12000); return fetch(u, c ? {signal: c.signal} : {}).finally(function () { clearTimeout(t); }); }
  /* 57.10: one lookup shared by the property panel and the Property page (property.html). Official public sources only,
     each called the way it is published for: FEMA's flood layer, the FCC's census areas, OpenStreetMap buildings, and the
     public property record - NYC's PLUTO file (Dept. of City Planning) in the five boroughs, the New York State assessment
     rolls (Office of Real Property Tax Services, data.ny.gov) in every other New York county. cb(F) runs as each part arrives. */
  var NYC = {'36005': 'BX', '36047': 'BK', '36061': 'MN', '36081': 'QN', '36085': 'SI'}, NYCN = {bronx: '36005', kings: '36047', brooklyn: '36047', 'new york': '36061', manhattan: '36061', queens: '36081', richmond: '36085', 'staten island': '36085'};
  var BCLASS = {A: 'One family', B: 'Two family', C: 'Walk-up apartments', D: 'Elevator apartments', R: 'Condominium', S: 'Residence with store or office', K: 'Store', O: 'Office', V: 'Vacant land', G: 'Garage', M: 'Religious', E: 'Warehouse', F: 'Factory', H: 'Hotel', I: 'Health', W: 'Education', Z: 'Miscellaneous', L: 'Loft', Q: 'Recreation', P: 'Public assembly', N: 'Home / asylum', U: 'Utility', T: 'Transportation', Y: 'Government', J: 'Theatre'};
  var BSUB = {A0: 'Cape Cod', A1: 'two stories, detached', A2: 'one story', A3: 'large suburban', A4: 'city residence', A5: 'attached or semi-detached', A6: 'summer cottage', A7: 'mansion type', A9: 'other', B1: 'brick', B2: 'frame', B3: 'converted from one family', B9: 'other', C0: 'three families', R1: 'condo unit, 2-10 unit building', R2: 'condo unit, walk-up', R3: 'condo unit, 1-3 story building', R4: 'condo unit, elevator building', R6: 'condo unit, 1-3 story building'};
  var BSMT = {'0': 'none', '1': 'full, above grade', '2': 'full, below grade', '3': 'partial, above grade', '4': 'partial, below grade', '5': 'not known'};
  function money(v) { var n = Math.round(+v || 0); return n ? '$' + n.toLocaleString('en-US') : ''; }
  function count(v) { var n = +v || 0; return n ? Math.round(n).toLocaleString('en-US') : ''; }
  function splitStreet(street) {
    var m = String(street || '').trim().match(/^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+(.+)$/); if (!m) return null;
    var w = m[2].toUpperCase().replace(/[.,#']/g, ' ').split(/\s+/).filter(Boolean).map(function (x) { return x.replace(/^(\d+)(ST|ND|RD|TH)$/, '$1'); });
    var skip = /^(N|S|E|W|NORTH|SOUTH|EAST|WEST|ST|STREET|AVE|AVENUE|AV|RD|ROAD|DR|DRIVE|LN|LANE|LA|BLVD|BOULEVARD|CT|COURT|PL|PLACE|TER|TERRACE|PKWY|PARKWAY|HWY|HIGHWAY|CIR|CIRCLE|WAY|TPKE|TURNPIKE|THE|OF)$/;
    var core = w.filter(function (x) { return !skip.test(x); }); if (!core.length) core = w;
    var SUF = {ST: 'STREET', AVE: 'AVENUE', AV: 'AVENUE', RD: 'ROAD', DR: 'DRIVE', LN: 'LANE', LA: 'LANE', BLVD: 'BOULEVARD', CT: 'COURT', PL: 'PLACE', TER: 'TERRACE', PKWY: 'PARKWAY', HWY: 'HIGHWAY', CIR: 'CIRCLE', TPKE: 'TURNPIKE'};
    var last = w[w.length - 1], suf = SUF[last] || (/^(STREET|AVENUE|ROAD|DRIVE|LANE|BOULEVARD|COURT|PLACE|TERRACE|PARKWAY|HIGHWAY|CIRCLE|WAY|TURNPIKE)$/.test(last) ? last : '');
    return {num: m[1].toUpperCase(), words: core, suffix: suf, key: core.slice().sort(function (x, y) { return y.length - x.length; })[0]};
  }
  function sq(v) { return String(v).replace(/'/g, "''"); }
  function pluto(a, fips, s) {
    var byText = function () { var where = "borough='" + NYC[fips] + "' AND address like '" + sq(s.num) + " %" + sq(s.key) + "%'"; return tfetch('https://data.cityofnewyork.us/resource/64uk-42ks.json?$limit=60&$where=' + encodeURIComponent(where), 15000).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
    var lot = agsPoint('https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0', a, 10000).then(function (l) {
      var b = l[0] && l[0].BBL; if (!b) return null;
      return tfetch('https://data.cityofnewyork.us/resource/64uk-42ks.json?$limit=1&$where=' + encodeURIComponent('bbl=' + Math.round(b)), 12000).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) { return rows && rows[0] ? [rows[0]] : null; });
    }).catch(function () { return null; });
    return lot.then(function (hit) { if (hit) { hit.point = true; return hit; } return byText(); }).then(function (rows) {
      if (rows && rows.point) { var r0 = rows[0]; s = Object.assign({}, s, {num: String(r0.address || '').split(' ')[0].toUpperCase(), words: String(r0.address || '').toUpperCase().split(/\s+/).slice(1).filter(function (w) { return !/^(STREET|AVENUE|ROAD|DRIVE|LANE|BOULEVARD|COURT|PLACE|TERRACE|PARKWAY|EAST|WEST|NORTH|SOUTH)$/.test(w); }), suffix: ''}); }
      var SUFW = {STREET: 'ST', AVENUE: 'AVE', ROAD: 'RD', DRIVE: 'DR', LANE: 'LN', BOULEVARD: 'BLVD', COURT: 'CT', PLACE: 'PL', TERRACE: 'TER', PARKWAY: 'PKWY'};
      var scored = (rows || []).map(function (x) { var t = String(x.address || '').toUpperCase().split(/\s+/); if (t[0] !== s.num) return null; var rest = t.slice(1).map(function (w) { return w.replace(/^(\d+)(ST|ND|RD|TH)$/, '$1'); });
        if (!s.words.every(function (w) { return rest.indexOf(w) >= 0; })) return null; var sc = 10 - Math.abs(rest.length - s.words.length - (s.suffix ? 1 : 0)); if (s.suffix && (rest.indexOf(s.suffix) >= 0 || rest.indexOf(SUFW[s.suffix]) >= 0)) sc += 5; return [sc, x]; }).filter(Boolean).sort(function (a2, b2) { return b2[0] - a2[0]; });
      var r = scored.length ? scored[0][1] : null;
      if (!r) return {title: 'NYC property record (PLUTO)', rows: [], note: 'No tax lot with this house number and street was found in PLUTO - condo units and new buildings can be listed under another address.'};
      var bc = String(r.bldgclass || ''), desc = (BCLASS[bc[0]] || bc) + (BSUB[bc] ? ' - ' + BSUB[bc] : '');
      var yb = +r.yearbuilt || 0, alt = [r.yearalter1, r.yearalter2].filter(function (x) { return +x > 0; });
      var rowsOut = [['Building class', esc(bc + ' - ' + desc)], ['Year built', yb ? yb + (alt.length ? ' (altered ' + alt.join(', ') + ')' : '') : 'not recorded'],
        ['Building area', count(r.bldgarea) ? count(r.bldgarea) + ' sq ft gross' + (count(r.resarea) && r.resarea !== r.bldgarea ? ' (' + count(r.resarea) + ' residential)' : '') : ''],
        ['Lot', (count(r.lotarea) ? count(r.lotarea) + ' sq ft' : '') + (+r.lotfront && +r.lotdepth ? ' (' + Math.round(+r.lotfront) + ' x ' + Math.round(+r.lotdepth) + ' ft)' : '')],
        ['Floors', +r.numfloors ? String(+(+r.numfloors).toFixed(1)) : ''], ['Units', count(r.unitsres) ? count(r.unitsres) + ' residential' + (r.unitstotal && r.unitstotal !== r.unitsres ? ', ' + count(r.unitstotal) + ' in all' : '') : ''],
        ['Basement', BSMT[r.bsmtcode] || ''], ['Zoning', esc([r.zonedist1, r.zonedist2].filter(Boolean).join(' / '))], ['Assessed value (DOF)', money(r.assesstot)], ['Owner of record', esc(r.ownername || '')],
        ['Borough-block-lot', esc(String(r.bbl || '').replace(/\.0+$/, ''))]].filter(function (x) { return x[1]; });
      var fill = {}; if (yb) fill.year = String(yb); if (+r.resarea || +r.bldgarea) fill.sqft = String(Math.round(+r.resarea || +r.bldgarea)); if (+r.lotarea) fill.lot = count(r.lotarea) + ' sq ft'; fill.style = desc + (+r.numfloors ? ', ' + (+(+r.numfloors).toFixed(1)) + ' floors' : '') + (+r.unitsres > 1 ? ', ' + r.unitsres + ' units' : '');
      return {title: 'NYC property record - PLUTO ' + esc(r.version || '') + ' (Dept. of City Planning)', rows: rowsOut, fill: fill, link: ['Open the lot on ZoLa', 'https://zola.planning.nyc.gov/l/lot/' + (+r.borocode || 0) + '/' + (+r.block || 0) + '/' + (+r.lot || 0)],
        note: 'PLUTO building area is gross (walls included) and has no bedroom or bath counts.'};
    });
  }
  function nysRoll(a, county, s) {
    var where = "county_name='" + sq(county) + "' AND parcel_address_number='" + sq(s.num) + "' AND upper(parcel_address_street) like '%" + sq(s.key) + "%'";
    /* 57.10: the town (Census county subdivision) the point lies in picks the right parcel when several towns share the number and street */
    var town = tfetch('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/22/query?geometry=' + a.lon + ',' + a.lat + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=BASENAME&returnGeometry=false&f=json', 9000)
      .then(function (r) { return r.json(); }).then(function (j) { return String((((j.features || [])[0] || {}).attributes || {}).BASENAME || '').toUpperCase(); }).catch(function () { return ''; });
    var roll = tfetch('https://data.ny.gov/resource/7vem-aaz7.json?$order=roll_year%20DESC&$limit=250&$where=' + encodeURIComponent(where), 25000).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return Promise.all([roll, town]).then(function (both) {
      var rows = both[0] || [], tw = both[1]; var yr = rows.reduce(function (m, x) { return Math.max(m, +x.roll_year || 0); }, 0); rows = rows.filter(function (x) { return +x.roll_year === yr; });
      if (!rows.length) return {title: 'NYS assessment roll', rows: [], note: 'No parcel with this house number and street was found in the ' + esc(county) + ' County roll.'};
      /* rank: the street words and suffix match exactly, the town, a school district named like the city, the owner's mailing ZIP */
      var SUF = {ST: 'STREET', AVE: 'AVENUE', AV: 'AVENUE', RD: 'ROAD', DR: 'DRIVE', LN: 'LANE', LA: 'LANE', BLVD: 'BOULEVARD', CT: 'COURT', PL: 'PLACE', TER: 'TERRACE', PKWY: 'PARKWAY', HWY: 'HIGHWAY', TPKE: 'TURNPIKE', CIR: 'CIRCLE'};
      var city = String(a.city || '').toUpperCase(), want = s.words.concat(s.suffix ? [s.suffix] : []);
      var score = function (x) { var t = (String(x.parcel_address_street || '') + ' ' + String(x.parcel_address_suff || '')).toUpperCase().replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean).map(function (w) { return SUF[w] || w.replace(/^(\d+)(ST|ND|RD|TH)$/, '$1'); });
        var hit = want.filter(function (w) { return t.indexOf(w) >= 0; }).length, sc = hit * 4 - Math.max(0, t.length - want.length) * 2;
        if (tw && String(x.municipality_name || '').toUpperCase() === tw) sc += 3; if (city && String(x.school_district_name || '').toUpperCase().indexOf(city) === 0) sc += 3; if (String(x.mailing_address_zip || '').slice(0, 5) === a.zip) sc += 2; return sc; };
      var ranked = rows.map(function (x) { return [score(x), x]; }).sort(function (p1, p2) { return p2[0] - p1[0]; });
      /* parcels as good as the best one: offered to choose from (town / school district), best first */
      var seen = {}, choices = ranked.filter(function (p2) { var k = p2[1].swis_code + '|' + p2[1].print_key_code; if (seen[k] || p2[0] < ranked[0][0] - 1) return false; seen[k] = 1; return true; }).map(function (p2) { return p2[1]; });
      var make = function (r) {
        var nm = function (f, l) { return [r[f], r[l]].filter(Boolean).join(' ').trim(); };
        var owners = [nm('primary_owner_first_name', 'primary_owner_last_name'), nm('additional_owner_1_first', 'additional_owner_1_last_name'), nm('additional_owner_2_first', 'additional_owner_2_last_name')].filter(Boolean);
        var mail = [r.mailing_address_prefix, r.mailing_address_number, r.mailing_address_street, r.mailing_address_suff].filter(Boolean).join(' ') + (r.mailing_address_city ? ', ' + r.mailing_address_city + ' ' + (r.mailing_address_state || '') + ' ' + (r.mailing_address_zip || '') : '');
        var same = String(r.mailing_address_number || '') === String(r.parcel_address_number || '') && String(r.mailing_address_street || '').toUpperCase().indexOf(String(r.parcel_address_street || '').toUpperCase().split(' ')[0]) === 0;
        var rowsOut = [['Property class', esc(r.property_class + ' - ' + (r.property_class_description || ''))], ['Address on the roll', esc([r.parcel_address_number, r.parcel_address_street, r.parcel_address_suff].filter(Boolean).join(' '))], ['Town / school district', esc([r.municipality_name, r.school_district_name].filter(Boolean).join(' / '))],
          ['Parcel (section-block-lot)', esc(r.print_key_code || '')], ['Lot', +r.front && +r.depth ? Math.round(+r.front) + ' x ' + Math.round(+r.depth) + ' ft' : ''], ['Full market value', money(r.full_market_value)], ['Total assessment', money(r.assessment_total)],
          ['Owner of record', esc(owners.join('; '))], ['Owner mails to', same || !mail.trim() ? '' : esc(mail) + ' <b style="color:#ffb35c">(not the property)</b>']].filter(function (x) { return x[1]; });
        var fill = {style: String(r.property_class_description || '')}; if (+r.front && +r.depth) fill.lot = Math.round(+r.front) + ' x ' + Math.round(+r.depth) + ' ft';
        return {title: 'NYS assessment roll ' + esc(yr) + ' - ' + esc(county) + ' County (data.ny.gov)', rows: rowsOut, fill: fill, choices: choices.length > 1 ? choices.map(function (x) { return [x.swis_code + '|' + x.print_key_code, [x.parcel_address_number, x.parcel_address_street, x.parcel_address_suff].filter(Boolean).join(' ') + ' - ' + [x.municipality_name, x.school_district_name].filter(Boolean).join(' / ') + ' (' + x.print_key_code + ')']; }) : null,
          chosen: r.swis_code + '|' + r.print_key_code, pick: function (key) { var x = choices.filter(function (c) { return c.swis_code + '|' + c.print_key_code === key; })[0]; return x ? make(x) : null; },
          note: (choices.length > 1 ? choices.length + ' parcels in this county match this number and street equally well - check the town and school district, and choose the right one. ' : '') + 'The roll has no bedroom, bath, living area or year-built figures.'};
      };
      return make(choices[0] || ranked[0][1]);
    });
  }
  function agsPoint(url, a, ms) {
    var q = function (extra) { return tfetch(url + '/query?geometry=' + a.lon + ',' + a.lat + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false' + (extra || '') + '&f=json', ms || 15000).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw new Error(j.error.message || 'error'); return (j.features || []).map(function (f) { return f.attributes || {}; }); }); };
    return q().then(function (l) { return l.length ? l : q('&distance=25&units=esriSRUnit_Meter'); });
  }
  function pickNum(list, s, field) { if (!s || list.length < 2) return list[0]; return list.filter(function (x) { return String(x[field] || '').trim().toUpperCase().split(/\s+/)[0] === s.num; })[0] || list[0]; }
  function yr(v) { v = +v || 0; return v > 1700 ? String(v) : ''; }
  function ownerMail(addr, city, prop) { var m = [addr, city].filter(function (x) { return x && String(x).trim(); }).join(', '); if (!m.trim()) return ''; return String(addr || '').toUpperCase().replace(/\s+/g, ' ').trim() === String(prop || '').toUpperCase().replace(/\s+/g, ' ').trim() ? '' : esc(m) + ' <b style="color:#ffb35c">(not the property)</b>'; }
  var FLUSE = {'000': 'Vacant residential', '001': 'Single family', '002': 'Mobile home', '003': 'Multi-family, 10 units or more', '004': 'Condominium', '005': 'Cooperative', '006': 'Retirement home', '007': 'Miscellaneous residential', '008': 'Multi-family, fewer than 10 units', '009': 'Residential common area', '010': 'Vacant commercial', '011': 'Store', '017': 'Office', '086': 'County', '087': 'State', '088': 'Federal', '089': 'Municipal'};
  function florida(a, s) {
    return agsPoint('https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0', a).then(function (l) {
      var r = pickNum(l, s, 'PHY_ADDR1'); if (!r) return {title: 'Florida statewide parcels', rows: [], note: 'No parcel was found at this point on the map.'};
      var uc = String(r.DOR_UC || '').padStart(3, '0'), use = (FLUSE[uc] || 'Use code') + ' (' + uc + ')', sale = function (p, m, y) { return +p > 100 ? money(p) + (y ? ' (' + (String(m || '').trim() ? String(m).trim() + '/' : '') + y + ')' : '') : ''; };
      var rows = [['Use', esc(use)], ['Year built', yr(r.ACT_YR_BLT) + (yr(r.EFF_YR_BLT) && r.EFF_YR_BLT !== r.ACT_YR_BLT ? ' (effective ' + r.EFF_YR_BLT + ')' : '')], ['Living area', count(r.TOT_LVG_AR) ? count(r.TOT_LVG_AR) + ' sq ft' : ''],
        ['Land', count(r.LND_SQFOOT) ? count(r.LND_SQFOOT) + ' sq ft (' + (r.LND_SQFOOT / 43560).toFixed(2) + ' acres)' : ''], ['Buildings / units', [+r.NO_BULDNG ? r.NO_BULDNG + ' building' + (r.NO_BULDNG > 1 ? 's' : '') : '', +r.NO_RES_UNT ? r.NO_RES_UNT + ' residential unit' + (r.NO_RES_UNT > 1 ? 's' : '') : ''].filter(Boolean).join(', ')],
        ['Just (market) value', money(r.JV)], ['Homestead', +r.JV_HMSTD > 0 ? 'Yes - homestead exemption' : ''], ['Last sale', sale(r.SALE_PRC1, r.SALE_MO1, r.SALE_YR1)], ['Sale before', sale(r.SALE_PRC2, r.SALE_MO2, r.SALE_YR2)],
        ['Owner of record', esc(String(r.OWN_NAME || '').trim())], ['Owner mails to', ownerMail(r.OWN_ADDR1, [r.OWN_CITY, r.OWN_STATE, r.OWN_ZIPCD].filter(Boolean).join(' '), r.PHY_ADDR1)], ['Parcel ID', esc(r.PARCEL_ID || '')], ['Site address', esc([r.PHY_ADDR1, r.PHY_CITY].filter(function (x) { return x && String(x).trim(); }).join(', '))]].filter(function (x) { return x[1]; });
      var fill = {style: FLUSE[uc] || ''}; if (yr(r.ACT_YR_BLT)) fill.year = yr(r.ACT_YR_BLT); if (+r.TOT_LVG_AR) fill.sqft = String(r.TOT_LVG_AR); if (+r.LND_SQFOOT) fill.lot = count(r.LND_SQFOOT) + ' sq ft';
      return {title: 'Florida statewide parcels - ' + esc(r.ASMNT_YR || '') + ' tax roll (Dept. of Revenue, via Florida GIO)', rows: rows, fill: fill, note: 'The state roll has no bedroom or bath counts - the county property appraiser\'s page does.', link: assessorLink(a, '')};
    });
  }
  var NJCLASS = {'1': 'Vacant land', '2': 'Residential (4 families or fewer)', '3A': 'Farm (with house)', '3B': 'Farm (qualified)', '4A': 'Commercial', '4B': 'Industrial', '4C': 'Apartments (5 or more)', '5A': 'Railroad', '15A': 'Public school', '15B': 'Other school', '15C': 'Public property', '15D': 'Church / charity', '15E': 'Cemetery', '15F': 'Other exempt'};
  function newJersey(a, s) {
    return agsPoint('https://maps.nj.gov/arcgis/rest/services/Framework/Cadastral/MapServer/0', a).then(function (l) {
      var r = pickNum(l, s, 'PROP_LOC'); if (!r) return {title: 'New Jersey parcels (MOD-IV)', rows: [], note: 'No parcel was found at this point on the map.'};
      var dd = r.DEED_DATE ? new Date(+r.DEED_DATE || r.DEED_DATE) : null, deed = dd && !isNaN(dd) ? (dd.getUTCMonth() + 1) + '/' + dd.getUTCDate() + '/' + dd.getUTCFullYear() : '';
      var rows = [['Property class', esc((r.PROP_CLASS || '') + ' - ' + (NJCLASS[r.PROP_CLASS] || ''))], ['Building', esc(r.BLDG_DESC || '')], ['Year built', yr(r.YR_CONSTR)], ['Dwellings', +r.DWELL ? String(r.DWELL) : ''], ['Land', esc(r.LAND_DESC || '') + (+r.CALC_ACRE ? ' (' + (+r.CALC_ACRE).toFixed(2) + ' acres mapped)' : '')],
        ['Assessed value', money(r.NET_VALUE) ? money(r.NET_VALUE) + ' (land ' + money(r.LAND_VAL) + ', building ' + (money(r.IMPRVT_VAL) || '$0') + ')' : ''], ['Last year\'s taxes', money(r.LAST_YR_TX)], ['Last sale', +r.SALE_PRICE > 100 ? money(r.SALE_PRICE) + (deed ? ' (deed ' + deed + ')' : '') : ''],
        ['Owner of record', esc(r.OWNER_NAME || '')], ['Owner mails to', ownerMail(r.ST_ADDRESS, r.CITY_STATE, r.PROP_LOC)], ['Town / block / lot', esc([r.MUN_NAME, 'block ' + r.PCLBLOCK, 'lot ' + r.PCLLOT].join(', '))]].filter(function (x) { return x[1] && !/^\s*-?\s*$/.test(x[1]); });
      var fill = {style: [NJCLASS[r.PROP_CLASS], r.BLDG_DESC].filter(Boolean).join(', ')}; if (yr(r.YR_CONSTR)) fill.year = yr(r.YR_CONSTR); if (+r.LAST_YR_TX) fill.taxes = money(r.LAST_YR_TX); if (r.LAND_DESC) fill.lot = String(r.LAND_DESC);
      return {title: 'New Jersey parcels and MOD-IV tax list (NJ Office of GIS)', rows: rows, fill: fill, note: 'Building descriptions are the town assessor\'s codes (for example 2SF2G = two story, frame, two-car garage). No bedroom or bath counts.'};
    });
  }
  function laCounty(a, s) {
    return agsPoint('https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0', a).then(function (l) {
      var r = pickNum(l, s, 'SitusAddress'); if (!r) return {title: 'Los Angeles County Assessor parcels', rows: [], note: 'No parcel was found at this point on the map.'};
      var rows = [['Use', esc([r.UseType, r.UseDescription].filter(Boolean).join(' - '))], ['Year built', yr(r.YearBuilt1) + (yr(r.EffectiveYear1) && r.EffectiveYear1 !== r.YearBuilt1 ? ' (effective ' + r.EffectiveYear1 + ')' : '')], ['Bedrooms / baths', +r.Bedrooms1 || +r.Bathrooms1 ? (+r.Bedrooms1 || 0) + ' bed / ' + (+r.Bathrooms1 || 0) + ' bath' : ''],
        ['Living area', count(r.SQFTmain1) ? count(r.SQFTmain1) + ' sq ft' : ''], ['Units', +r.Units1 ? String(r.Units1) : ''], ['Design', esc(r.DesignType1 || '')], ['Assessed value', money(+r.Roll_LandValue + +r.Roll_ImpValue) ? money(+r.Roll_LandValue + +r.Roll_ImpValue) + ' (' + esc(r.Roll_Year || '') + ' roll; land ' + money(r.Roll_LandValue) + ')' : ''],
        ['Homeowners\' exemption', +r.Roll_HomeOwnersExemp ? 'Yes' : ''], ['APN', esc(r.APN || '')], ['Site address', esc(r.SitusFullAddress || '')]].filter(function (x) { return x[1]; });
      var fill = {style: String(r.UseDescription || '')}; if (yr(r.YearBuilt1)) fill.year = yr(r.YearBuilt1); if (+r.SQFTmain1) fill.sqft = String(r.SQFTmain1); if (+r.Bedrooms1) fill.beds = String(r.Bedrooms1); if (+r.Bathrooms1) fill.baths = String(r.Bathrooms1);
      return {title: 'Los Angeles County Assessor parcels (LA County GIS)', rows: rows, fill: fill, note: 'Owner names are not published in this file.', link: ['Open the parcel on the Assessor\'s portal', 'https://portal.assessor.lacounty.gov/parceldetail/' + encodeURIComponent(r.AIN || '')]};
    });
  }
  function sanDiego(a, s) {
    return agsPoint('https://geo.sandag.org/server/rest/services/Hosted/Parcels/FeatureServer/0', a).then(function (l) {
      var r = l[0]; if (!r) return {title: 'San Diego County parcels (SANDAG)', rows: [], note: 'No parcel was found at this point on the map.'};
      var bd = parseInt(r.bedrooms, 10) || 0, ba = parseInt(r.baths, 10) || 0; if (ba >= 10) ba = ba / 10; var ye = String(r.year_effective || '').trim(), yy = /^\d{2}$/.test(ye) ? (+ye > (new Date().getFullYear() % 100) ? '19' : '20') + ye : '';
      var rows = [['Bedrooms / baths', bd || ba ? bd + ' bed / ' + ba + ' bath' : ''], ['Living area', count(r.total_lvg_area) ? count(r.total_lvg_area) + ' sq ft' : ''], ['Effective year', yy], ['Units', +r.unitqty ? String(r.unitqty) : ''], ['Pool', String(r.pool || '').trim() === 'Y' ? 'Yes' : ''], ['Garage', parseInt(r.garage_stalls, 10) ? parseInt(r.garage_stalls, 10) + ' stall(s)' : ''],
        ['Assessed value', money(r.asr_total) ? money(r.asr_total) + ' (land ' + money(r.asr_land) + ')' : ''], ['Owner occupied', String(r.ownerocc || '').trim() === 'Y' ? 'Yes' : ''], ['APN', esc(r.apn || '')], ['Site address', esc([r.situs_address, r.situs_pre_dir, r.situs_street, r.situs_suffix].filter(function (x) { return x && String(x).trim(); }).join(' '))]].filter(function (x) { return x[1]; });
      var fill = {}; if (bd) fill.beds = String(bd); if (ba) fill.baths = String(ba); if (+r.total_lvg_area) fill.sqft = String(r.total_lvg_area); if (yy) fill.year = yy;
      return {title: 'San Diego County parcels (SANDAG, from the County Assessor)', rows: rows, fill: fill, note: 'The year shown is the assessor\'s effective year, which can be later than the year built.'};
    });
  }
  function sanBernardino(a, s) {
    return agsPoint('https://services.arcgis.com/aA3snZwJfFkVyDuP/arcgis/rest/services/Parcels_for_San_Bernardino_County/FeatureServer/0', a).then(function (l) {
      var r = l[0]; if (!r) return {title: 'San Bernardino County parcels', rows: [], note: 'No parcel was found at this point on the map.'};
      var num = function (v) { return +String(v || '').replace(/[^\d.]/g, '') || 0; };
      var rows = [['Use', esc([r.AssessClass, r.AssessDescription].filter(Boolean).join(' - '))], ['Assessed value', money(num(r.LandValue) + num(r.ImprovementValue)) ? money(num(r.LandValue) + num(r.ImprovementValue)) + ' (land ' + money(num(r.LandValue)) + ')' : ''], ['Base year', esc(r.BaseYear || '')],
        ['Lot', +r.Acreage ? (+r.Acreage).toFixed(2) + ' acres' : ''], ['Zoning', esc(r.ZoningDescription || r.Zoning || '')], ['Homeowners\' exemption', num(r.HomeOwnerExemption) ? 'Yes' : ''], ['Parcel number', esc(r.ParcelNumber || '')]].filter(function (x) { return x[1]; });
      return {title: 'San Bernardino County parcels (County of San Bernardino)', rows: rows, fill: {style: String(r.AssessDescription || ''), lot: +r.Acreage ? (+r.Acreage).toFixed(2) + ' acres' : ''}, note: 'Owner names are withheld by California law in this file; no bedroom or bath counts.', link: assessorLink(a, 'San Bernardino')};
    });
  }
  var CA = {'06037': laCounty, '06073': sanDiego, '06071': sanBernardino};
  function assessorLink(a, countyName) { return ['Search the county assessor', 'https://www.google.com/search?q=' + encodeURIComponent((countyName || a.county || '') + ' County ' + (a.state || '') + ' property assessor ' + a.street)]; }
  function facts(line, cb) {
    line = String(line || '').trim(); var F = {line: line, geo: null, rows: [], rec: null, fill: {}, done: false};
    var emit = function () { try { if (cb) cb(F); } catch (e) {} };
    return geocode(line).then(function (a) {
      if (!a) { F.error = 'This address was not found on the map - check the spelling.'; F.done = true; emit(); return F; }
      /* the map search can land on a nearby street ("1 West St" -> "1 West Jericho Turnpike"): then the typed street is used for the record and the match is flagged */
      var typed = splitStreet(line.split(',')[0]), got = splitStreet(a.street), same = !typed || !got || (typed.num === got.num && typed.words.some(function (w) { return got.words.indexOf(w) >= 0; }));
      F.mismatch = !same; F.geo = a; F.rows.push(['Matched', esc(a.line || line) + (same ? '' : ' <b style="color:#ffb35c">(not the street typed - the map point may be off; the record uses the street you typed)</b>')]); emit();
      var lat = a.lat, lon = a.lon, jobs = [];
      jobs.push(tfetch('https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=' + lon + ',' + lat + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF&returnGeometry=false&f=json').then(function (r) { return r.json(); }).then(function (j) {
        var f = (j.features || [])[0], at = f && f.attributes; F.flood = at || null; F.rows.push(['Flood zone', at ? '<b>' + esc(at.FLD_ZONE) + '</b>' + (at.ZONE_SUBTY ? ' - ' + esc(at.ZONE_SUBTY.toLowerCase()) : '') + (at.SFHA_TF === 'T' ? ' <b style="color:#ffb35c">(special flood hazard area - flood insurance required)</b>' : ' (not a special flood hazard area)') : 'Not mapped by FEMA here']); emit(); }).catch(function () { F.rows.push(['Flood zone', 'FEMA did not answer - use the flood map']); emit(); }));
      var recDone = function (rec) { F.rec = rec; if (rec && rec.fill) Object.keys(rec.fill).forEach(function (k) { if (rec.fill[k] && !F.fill[k]) F.fill[k] = rec.fill[k]; }); emit(); };
      var records = function (fips, countyName) {
        var s = F.mismatch && typed ? typed : splitStreet(a.street);
        if (!s) return recDone({title: 'Public property record', rows: [], note: 'The address has no house number, so the property record cannot be matched.'});
        if (NYC[fips]) return pluto(a, fips, s).then(recDone, function () { recDone({title: 'NYC property record (PLUTO)', rows: [], note: 'NYC Open Data did not answer - try again in a minute.'}); });
        if (/^36/.test(fips) || a.state === 'New York') return nysRoll(a, String(countyName || a.county || '').replace(/\s+County$/i, '').replace(/\./g, ''), s).then(recDone, function () { recDone({title: 'NYS assessment roll', rows: [], note: 'data.ny.gov did not answer - try again in a minute.', link: assessorLink(a, countyName)}); });
        var down = function (t) { return function () { recDone({title: t, rows: [], note: 'The public record service did not answer - try again in a minute.', link: assessorLink(a, countyName)}); }; };
        if (/^34/.test(fips) || a.state === 'New Jersey') return newJersey(a, s).then(recDone, down('New Jersey parcels (MOD-IV)'));
        if (/^12/.test(fips) || a.state === 'Florida') return florida(a, s).then(recDone, down('Florida statewide parcels'));
        if (CA[fips]) return CA[fips](a, s).then(recDone, down('California county parcels'));
        recDone({title: 'Public property record', rows: [], note: 'Property records are connected for New York (NYC and every county), New Jersey, Florida, and Los Angeles, San Diego and San Bernardino counties in California. For ' + esc((countyName ? countyName + ', ' : '') + (a.state || 'this state')) + ', open the county assessor.', link: assessorLink(a, countyName)});
      };
      jobs.push(tfetch('https://geo.fcc.gov/api/census/area?lat=' + lat + '&lon=' + lon + '&format=json').then(function (r) { return r.json(); }).then(function (j) {
        var r0 = (j.results || [])[0]; if (!r0) throw new Error('no area'); var tr = String(r0.block_fips || '').slice(5, 11);
        F.rows.push(['County / FIPS', esc(r0.county_name || '') + ' (' + esc(r0.county_fips || '') + ')']); F.rows.push(['Census tract', tr ? esc(tr.slice(0, 4) + '.' + tr.slice(4)) : '']); F.rows.push(['Census block', esc(r0.block_fips || '')]); emit();
        return records(String(r0.county_fips || ''), r0.county_name);
      }).catch(function () { var c = String(a.county || '').toLowerCase(); return records(a.state === 'New York' ? NYCN[c] || '36' : '', a.county); }));
      jobs.push(tfetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:15];(way(around:25,' + lat + ',' + lon + ')[building];);out tags 3;')).then(function (r) { return r.json(); }).then(function (j) {
        var t = ((j.elements || [])[0] || {}).tags || {}; if (!Object.keys(t).length) { F.rows.push(['Building (OSM)', 'Not mapped in OpenStreetMap']); emit(); return; }
        var b = []; if (t.building && t.building !== 'yes') b.push(t.building.replace(/_/g, ' ')); if (t['building:levels']) b.push(t['building:levels'] + ' floor' + (t['building:levels'] === '1' ? '' : 's')); if (t['building:units']) b.push(t['building:units'] + ' unit(s)'); if (t.start_date) b.push('built ' + t.start_date); if (t['roof:shape']) b.push(t['roof:shape'] + ' roof');
        F.rows.push(['Building (OSM)', esc(b.join(', ') || 'building mapped, no details')]); if (/^\d{4}/.test(t.start_date || '') && !F.fill.year) F.fill.year = t.start_date.slice(0, 4); emit(); }).catch(function () {}));
      return Promise.all(jobs).then(function () { F.done = true; emit(); return F; });
    }, function () { F.error = 'The address lookup is not answering - try again in a minute.'; F.done = true; emit(); return F; });
  }
  /* the listing sites for an address, and the window docked to the right half of the screen they open in */
  function siteLinks(line) {
    return [['Zillow', 'https://www.zillow.com/homes/' + encodeURIComponent(line.replace(/,/g, '').replace(/\s+/g, '-')) + '_rb/'], ['Redfin', 'https://duckduckgo.com/?q=' + encodeURIComponent('\\site:redfin.com ' + line)],
      ['Realtor.com', 'https://www.realtor.com/realestateandhomes-search/' + encodeURIComponent(line)], ['Google', 'https://www.google.com/search?q=' + encodeURIComponent(line + ' beds baths sqft')]];
  }
  function openSide(url) { var W = screen.availWidth || innerWidth, H = screen.availHeight || innerHeight; return window.open(url, 'mtPropView', 'popup=yes,width=' + Math.round(W / 2) + ',height=' + H + ',left=' + ((screen.availLeft || 0) + Math.round(W / 2)) + ',top=' + (screen.availTop || 0)); }
  function propKey(line) { return String(line || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function lookup(line) {
    line = String(line || '').trim(); if (!line) return;
    css(); if (!pbox) { pbox = document.createElement('div'); pbox.id = 'mtPropBox'; pbox.className = 'no-print'; pbox.setAttribute('role', 'dialog'); pbox.setAttribute('aria-label', 'Property details'); document.body.appendChild(pbox);
      pbox.addEventListener('click', function (e) {
        /* 57.8: listing sites refuse to be shown inside another page, so they open in a window docked to the right half of the screen and
           this panel moves to the left - side by side, type what you read straight into the fields */
        var sv = e.target.closest('[data-v]'); if (sv) {
          var win = openSide(sv.getAttribute('data-v')); pbox.classList.add('mtP-left');
          /* 57.9: FEMA's flood map viewer takes no address in its link - the address is copied to paste into its "Find address" box */
          var cp = sv.hasAttribute('data-copy'); if (cp) { try { navigator.clipboard.writeText(pbox.getAttribute('data-line') || ''); } catch (er) {} }
          var nt = pbox.querySelector('.mtP-n'); if (nt) nt.textContent = !win ? 'The browser blocked the window - allow pop-ups for this site, then press the button again.' : cp ? 'The FEMA flood map opened beside this page and the address is copied - paste it (Ctrl+V) into "Find address or place" there.' : 'The listing opened beside this page - type the beds, baths and the rest into the fields here.'; return; }
        var b = e.target.closest('[data-p]'); if (!b) return; var a = b.getAttribute('data-p');
        if (a === 'map') { var mp = pbox.querySelector('.mtP-map'); mp.hidden = !mp.hidden; if (!mp.hidden && !mp.firstChild) mp.innerHTML = '<iframe title="Map of the property" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(pbox.getAttribute('data-line') || '') + '&t=k&z=19&output=embed"></iframe>'; pbox.classList.toggle('mtP-wide', !mp.hidden); return; }
        if (a === 'x') pbox.hidden = true;
        if (a === 'copy') { var t = pbox.querySelector('.mtP-body').innerText + '\n' + [].map.call(pbox.querySelectorAll('[data-pf]'), function (i) { return i.getAttribute('data-pl') + ': ' + i.value; }).filter(function (x) { return !/:\s*$/.test(x); }).join('\n'); try { navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch (er) {} } });
      pbox.addEventListener('input', function (e) { var i = e.target.closest('[data-pf]'); if (!i) return; var k = pbox.getAttribute('data-key'), d = pstore()[k] || {}; d[i.getAttribute('data-pf')] = i.value; psave(k, d); });
      var st = document.createElement('style'); st.textContent = '#mtPropBox{position:fixed;z-index:' + (Z + 1) + ';right:16px;top:70px;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:#0a1b38;color:#e6eefb;border:1px solid #2b5590;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.5);font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;animation:mtPin .25s ease}' +
        '@keyframes mtPin{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}#mtPropBox h3{margin:0;font-size:14px}#mtPropBox .mtP-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid #142d52}#mtPropBox .mtP-body{padding:10px 14px}#mtPropBox dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}#mtPropBox dt{color:#9db0c8}#mtPropBox dd{margin:0}' +
        '#mtPropBox .mtP-f{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 14px 10px}#mtPropBox label{font-size:11.5px;color:#9db0c8;display:grid;gap:2px}#mtPropBox input{background:#071630;border:1px solid #2b5590;border-radius:6px;color:#fff;padding:5px 7px}#mtPropBox .mtP-l{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 12px}#mtPropBox .mtP-l a,#mtPropBox button{border:1px solid #2b5590;border-radius:999px;padding:4px 10px;color:#9fc4ff;background:transparent;text-decoration:none;font:600 12px system-ui;cursor:pointer}#mtPropBox .mtP-l a:hover,#mtPropBox button:hover{background:#123a75}#mtPropBox .mtP-n{font-size:11px;color:#8ea3c0;padding:0 14px 12px}#mtPropBox.mtP-left{right:auto;left:16px}#mtPropBox.mtP-wide{width:min(620px,calc(100vw - 32px))}#mtPropBox .mtP-map{padding:0 14px 12px}#mtPropBox .mtP-map iframe{width:100%;height:320px;border:0;border-radius:8px}#mtPropBox .mtP-rec{margin-top:10px;padding-top:8px;border-top:1px solid #142d52}#mtPropBox .mtP-rec>b{display:block;margin-bottom:4px;color:#9fc4ff;font-size:12px}';
      document.head.appendChild(st);
    }
    var key = propKey(line), saved = pstore()[key] || {};
    pbox.setAttribute('data-key', key); pbox.setAttribute('data-line', line); pbox.hidden = false; pbox.classList.remove('mtP-wide');
    var fields = [['beds', 'Bedrooms'], ['baths', 'Bathrooms'], ['sqft', 'Living area (sq ft)'], ['year', 'Year built'], ['lot', 'Lot size'], ['taxes', 'Annual taxes'], ['hoa', 'HOA dues'], ['style', 'Style / type']];
    pbox.innerHTML = '<div class="mtP-h"><div><h3>Property details</h3><div style="color:#9db0c8;font-size:12px">' + esc(line) + '</div></div><button type="button" data-p="x" aria-label="Close">Close</button></div><div class="mtP-body">Looking up flood zone, census area and building data…</div>' +
      '<div class="mtP-f">' + fields.map(function (f) { return '<label>' + f[1] + '<input data-pf="' + f[0] + '" data-pl="' + f[1] + '" value="' + esc(saved[f[0]] || '') + '"></label>'; }).join('') + '</div>' +
      '<div class="mtP-l"><a href="property.html?a=' + encodeURIComponent(line) + '" style="background:#226ccc;color:#fff;border-color:#226ccc">Side-by-side view</a><button type="button" data-p="map">Map (here)</button>' + siteLinks(line).map(function (x) { return '<button type="button" data-v="' + esc(x[1]) + '">' + x[0] + '</button>'; }).join('') + '<button type="button" data-copy="1" data-v="https://experience.arcgis.com/experience/9d22cdae8b7542b88e0d555a3eb92949">FEMA map</button><button type="button" data-p="copy">Copy details</button></div><div class="mtP-map" hidden></div>' +
      '<div class="mtP-n">Fields are filled from the public record where it has them. Beds and baths are not in public records - check a listing or the appraisal. What you enter is kept for this address in this browser.</div>';
    var body = pbox.querySelector('.mtP-body');
    facts(line, function (F) {
      if (pbox.getAttribute('data-line') !== line) return;
      if (F.error) { body.textContent = F.error + ' Use the links below.'; return; }
      var html = '<dl>' + F.rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
      if (F.rec) html += '<div class="mtP-rec"><b>' + F.rec.title + '</b>' + (F.rec.rows.length ? '<dl>' + F.rec.rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' : '') + (F.rec.note ? '<div class="mtP-n" style="padding:4px 0 0">' + F.rec.note + '</div>' : '') + '</div>';
      else if (F.geo && !F.done) html += '<div class="mtP-n" style="padding:6px 0 0">Looking up the public property record…</div>';
      body.innerHTML = html;
      Object.keys(F.fill).forEach(function (k) { var i = pbox.querySelector('[data-pf=' + k + ']'); if (i && !i.value) { i.value = F.fill[k]; i.title = 'From the public record'; i.dispatchEvent(new Event('input', {bubbles: true})); } });
    });
  }

  /* ------------------------------------------------ 57.6: the last 10 borrower names, offered on borrower name boxes */
  var NKEY = 'mt.recent.names';
  function names10() { try { return JSON.parse(localStorage.getItem(NKEY) || '[]') || []; } catch (e) { return []; } }
  function nameDl() { var dl = document.getElementById('mtRecentNames'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'mtRecentNames'; document.body.appendChild(dl); } dl.innerHTML = names10().map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); return dl; }
  function isName(el) { if (el.list || el.__mtaName) return false; var l = (labelOf(el) + ' ' + (el.getAttribute('data-list') || '') + ' ' + (el.getAttribute('data-path') || '')).toLowerCase(); return /borrower|co-?borrower|client|buyer|applicant/.test(l) && /name|borrowers|clients|buyers/.test(l) && !/e-?mail|phone|address|employer|business|company|lender|processor|officer|ssn/.test(l); }
  document.addEventListener('focusin', function (e) { var t = e.target; if (!t || !t.matches || !t.matches('input[type=text], input:not([type])') || !isName(t)) return; t.__mtaName = true; nameDl(); t.setAttribute('list', 'mtRecentNames'); });
  document.addEventListener('change', function (e) { var t = e.target; if (!t || !t.__mtaName) return; var v = String(t.value || '').replace(/\s+/g, ' ').trim(); if (v.length < 3 || /\d/.test(v)) return; var l = names10().filter(function (x) { return x.toLowerCase() !== v.toLowerCase(); }); l.unshift(v); try { localStorage.setItem(NKEY, JSON.stringify(l.slice(0, 10))); } catch (er) {} nameDl(); }, true);

  window.MTAddr = {attach: attach, search: search, isOff: off, setOff: setOff, fill: fill, scan: scan, lookup: lookup, recentNames: names10,
    facts: facts, siteLinks: siteLinks, openSide: openSide, details: function (line) { return pstore()[propKey(line)] || {}; }, saveDetails: function (line, d) { psave(propKey(line), d); }, recent: function () { return known(); }, remember: remember};
})();
