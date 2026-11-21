/* 57.21: who a document is about - the business, partnership, corporation or employer, its EIN and the tax year.
   Two years of returns for one business (or a W-2 and a pay stub from one employer) are recognised as the same,
   so the income reader puts them on one worksheet, each year in its own column. Runs in the browser only. */
(function () {
  'use strict';
  if (window.MTBizId) return;
  var SUFFIX = /\b(llc|pllc|llp|lp|inc|incorporated|corp|corporation|co|company|ltd|limited|pc|pa|the|dba)\b/g;
  function norm(s) {
    return String(s || '').toLowerCase().replace(/\./g, '').replace(/&/g, ' and ').replace(/[^a-z0-9 ]+/g, ' ')
      .replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
  }
  var INSTR = /\b(instructions?|see |enter |if no |leave blank|check if|form |line |attach|omb|department of the treasury|internal revenue|go to|www\.|for paperwork|cat\. ?no|identification number|address(?:,|\s+and\b|\s*$)|city or town|zip code|ssn|social security|(?:number,?\s*)?street(?:,|\s+and\b|\s+address\b|\s*$))\b/i;
  /* 57.23: "Elm Street Bakery" is a name; "Number, street, and room or suite no." is an instruction */
  function good(s) {
    s = String(s || '').trim();
    if (s.length < 3 || s.length > 70) return false;
    if ((s.match(/[A-Za-z]/g) || []).length < 3) return false;
    if (/^\W*[A-Z]?\W*$/.test(s)) return false;
    return !INSTR.test(s);
  }
  function clean(s) { return String(s || '').replace(/^[\s:.\-|]+|[\s:\-|,]+$/g, '').replace(/\s{2,}.*$/, '').trim(); }
  /* text after a label on the same line, else the next usable line */
  function after(L, re) {
    for (var i = 0; i < L.length; i++) {
      var m = L[i].match(re); if (!m) continue;
      var rest = clean(L[i].slice(m.index + m[0].length).replace(/^.*?leave blank\.?/i, '').replace(/^[^A-Za-z0-9]*\(?see instructions\)?/i, ''));
      if (good(rest)) return rest;
      for (var j = i + 1; j < Math.min(L.length, i + 4); j++) { var n = clean(L[j]); if (good(n)) return n; }
    }
    return '';
  }
  function taxYear(text) {
    var t = String(text || ''), now = new Date().getFullYear(), m;
    var pats = [
      /(?:schedule\s*c|schedule\s*k-?1|form\s*(?:1065|1120-?s?|1040|w-?2))\s*(?:\(form\s*[0-9a-z-]+\)\s*)?(20\d{2})\b/i,
      /\b(20\d{2})\s*(?:wage and tax statement|schedule\s*k-?1)/i,
      /(?:calendar|tax)\s*year\s*(?:beginning[^0-9]{0,12})?[^0-9]{0,8}(20\d{2})\b/i,
      /for\s*(?:the\s*)?(?:calendar\s*)?year\s*(20\d{2})\b/i
    ];
    for (var i = 0; i < pats.length; i++) { m = t.match(pats[i]); if (m && +m[1] <= now && +m[1] >= now - 8) return +m[1]; }
    var head = t.split('\n').slice(0, 40).join('\n'), count = {}, best = 0, re = /(rev\.?\s*(?:[a-z]+\s*)?|cat\.?\s*no\.?\s*|omb[^\n]{0,12})?\b(20\d{2})\b/gi;
    while ((m = re.exec(head))) { if (m[1]) continue; var y = +m[2]; if (y > now || y < now - 8) continue; count[y] = (count[y] || 0) + 1; }
    Object.keys(count).forEach(function (y) { y = +y; if (!best || count[y] > count[best] || (count[y] === count[best] && y > best)) best = y; });
    return best || 0;
  }
  function stubYear(text) {
    var ds = String(text || '').match(/\b\d{1,2}[\/-]\d{1,2}[\/-](20\d{2})\b/g) || [], now = new Date().getFullYear(), best = 0;
    ds.forEach(function (d) { var y = +d.slice(-4); if (y <= now && y > best) best = y; });
    return best;
  }
  /* type: the income reader's type (schedc, k1_1065, k1_1120s, f1120, w2, paystub, wvoe) or the library's (taxreturn, w2, paystub, voe) */
  function ident(text, type, hint) {
    hint = hint || {};
    var t = String(text || ''), L = t.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean), name = '', role = 'business';
    var lower = t.toLowerCase();
    if (!type || type === 'taxreturn') type = /profit or loss from business|schedule\s*c\b/.test(lower) ? 'schedc' : /1120-?s|shareholder/.test(lower) ? 'k1_1120s' : /1065|partnership/.test(lower) ? 'k1_1065' : /form\s*1120\b/.test(lower) ? 'f1120' : 'other';
    if (type === 'voe') type = 'wvoe';
    if (type === 'schedc') name = after(L, /business name\b/i) || after(L, /principal business or profession[^A-Za-z]*(?:including product or service)?/i) || after(L, /name of proprietor/i);
    else if (type === 'k1_1065') name = after(L, /partnership'?s?\s*name/i) || after(L, /name of partnership/i) || after(L, /^name\b/i);
    else if (type === 'k1_1120s') name = after(L, /corporation'?s?\s*name/i) || after(L, /^name\b/i);
    else if (type === 'f1120') name = after(L, /^name\b/i);
    else if (type === 'w2') { name = after(L, /employer'?s?\s*name/i); role = 'employer'; }
    else if (type === 'wvoe') { name = after(L, /employer(?:\s*name)?\s*:/i); role = 'employer'; }
    else if (type === 'paystub') { role = 'employer'; name = (L.slice(0, 4).filter(function (l) { return /^[A-Za-z][A-Za-z0-9&.,'\- ]{4,58}$/.test(l) && !/statement|earnings|payroll|advice|employee|period/i.test(l); })[0]) || ''; }
    if (hint.name && good(hint.name)) name = hint.name;
    name = clean(name).replace(/\s+(?:\d{3,}.*|[A-Z]{2}\s+\d{5}.*)$/, '');
    var ein = (t.match(/\b(\d{2})\s?-\s?(\d{7})\b/) || [])[0] || '';
    ein = ein.replace(/\s/g, '');
    var year = +hint.year || (type === 'paystub' || type === 'wvoe' ? stubYear(t) : taxYear(t));
    return {name: name, key: norm(name), ein: ein, year: year || 0, role: role, type: type};
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 9;
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var prev = p[0]; p[0] = i; for (j = 1; j <= b.length; j++) { var tmp = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; } }
    return p[b.length];
  }
  /* the same business: the same EIN, or names that match once spacing, punctuation and LLC / Inc are set aside */
  function same(a, b) {
    if (!a || !b) return false;
    if (a.ein && b.ein) return a.ein === b.ein;
    var x = a.key || norm(a.name), y = b.key || norm(b.name);
    if (!x || !y) return false;
    if (x === y) return true;
    var short = x.length < y.length ? x : y, long = short === x ? y : x;
    if (short.length >= 6 && (long.indexOf(short + ' ') === 0 || long.slice(-short.length - 1) === ' ' + short)) return true;
    var tx = x.split(' '), ty = y.split(' '), inter = tx.filter(function (w) { return ty.indexOf(w) >= 0; }).length;
    if (inter / Math.max(tx.length, ty.length) >= 0.8 && inter >= 2) return true;
    return x.length >= 8 && lev(x, y) <= 2;
  }
  /* group a list of documents: returns [{ident, items:[...]}] */
  function group(list, get) {
    var out = [];
    list.forEach(function (d) {
      var id = get(d); if (!id || (!id.key && !id.ein)) return;
      var g = out.filter(function (x) { return same(x.ident, id); })[0];
      if (g) { g.items.push(d); if (!g.ident.ein && id.ein) g.ident.ein = id.ein; if (id.name.length > g.ident.name.length) { g.ident.name = id.name; } }
      else out.push({ident: {name: id.name, key: id.key, ein: id.ein, role: id.role}, items: [d]});
    });
    return out;
  }
  window.MTBizId = {ident: ident, same: same, norm: norm, group: group, taxYear: taxYear};
})();
