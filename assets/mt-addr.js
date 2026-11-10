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
      cache[key] = out; return out;
    });
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
    });
    document.body.appendChild(box); return box;
  }
  function place() { if (!box || !cur || box.hidden) return; var r = cur.getBoundingClientRect(); if (!r.width) return hide(); var below = innerHeight - r.bottom, h = box.offsetHeight || 220;
    box.style.left = Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 340) - 8)) + 'px'; box.style.width = Math.max(r.width, 340) + 'px';
    box.style.top = (below < h + 8 && r.top > h + 8 ? r.top - h - 4 : r.bottom + 4) + 'px'; }
  function foot() { return '<div class="mtA-ft"><span>Address data &copy; OpenStreetMap contributors</span><span><button type="button" data-mta="google">Check on Google</button> &middot; <button type="button" data-mta="off">Turn off suggestions</button></span></div>'; }
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

  window.MTAddr = {attach: attach, search: search, isOff: off, setOff: setOff, fill: fill, scan: scan};
})();
