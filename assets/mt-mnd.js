/* ===================================================================================
   Mortgage News Daily rates - shared by the Income Calculator and the Loan Suite (56.0).
   Opening Mortgage Rates pulls MND's daily index (at most once every 4 hours; the button always pulls). Browsers cannot
   read mortgagenewsdaily.com directly, so the page is read through public relays, first one that answers wins. The date
   shown is MND's own "Updated" date. If no relay answers, the last rates stay and the paste box still works.
   =================================================================================== */
(function () {
  'use strict';
  if (window.MtMnd) return;
  var URL_MND = 'https://www.mortgagenewsdaily.com/mortgage-rates/mnd', LAST = 'mt.mnd.lastPull';
  var RELAYS = [
    ['r.jina.ai', function (u) { return 'https://r.jina.ai/' + u; }],
    ['corsfix', function (u) { return 'https://proxy.corsfix.com/?' + u; }],
    ['allorigins', function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); }],
    ['codetabs', function (u) { return 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u); }]
  ];
  function get(url, ms) {
    return new Promise(function (res, rej) {
      var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); rej(new Error('timeout')); }, ms || 12000);
      fetch(url, ctl ? {signal: ctl.signal} : {}).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (t) { clearTimeout(tm); res(t); }, function (e) { clearTimeout(tm); rej(e); });
    });
  }
  function textOf(html) {
    return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(tr|p|div|h\d|li)>/gi, '\n').replace(/<\/t[hd]>/gi, ' | ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x2B;/gi, '+').replace(/&#(\d+);/g, function (m, c) { return String.fromCharCode(+c); })
      .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
  }
  var ROWS = [['fixed30', /30\s*yr\.?\s*fixed/i], ['fixed15', /15\s*yr\.?\s*fixed/i], ['fha30', /30\s*yr\.?\s*fha/i], ['va30', /30\s*yr\.?\s*va\b/i], ['jumbo30', /30\s*yr\.?\s*jumbo/i], ['arm76', /7\s*\/\s*6\s*sofr\s*arm/i]];
  function parse(raw) {
    var t = /<\w+[^>]*>/.test(raw) ? textOf(raw) : String(raw), rows = {}, n = 0;
    t.split(/\r?\n/).forEach(function (line) {
      ROWS.forEach(function (r) {
        if (rows[r[0]] || !r[1].test(line)) return;
        var after = line.slice(line.search(r[1])), nums = after.match(/[+\-−]?\d+\.\d+(?=\s*%)/g);
        if (!nums || !nums.length) return;
        var rate = parseFloat(nums[0]), ch = nums.length > 1 ? parseFloat(nums[1].replace('−', '-')) : 0;
        if (rate > 0 && rate < 25) { rows[r[0]] = {rate: rate, change: isFinite(ch) ? ch : 0}; n++; }
      });
    });
    if (n < 2) return null;
    var m = t.match(/Updated:?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/i), asOf;
    if (m) asOf = (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
    else { var u = String(raw).match(/"(?:dateModified|updated)"\s*content="(\d{4}-\d{2}-\d{2})/i) || String(raw).match(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/); asOf = u ? u[1] : new Date().toISOString().slice(0, 10); }
    return {rows: rows, asOf: asOf, count: n};
  }
  var busy = null;
  function pull(opts) {
    opts = opts || {};
    if (busy) return busy;
    var btn = document.getElementById('mndFetch'); if (btn) { btn.disabled = true; btn.textContent = 'Pulling from MND…'; }
    var i = 0;
    busy = new Promise(function (resolve) {
      (function next() {
        if (i >= RELAYS.length) return resolve(null);
        var r = RELAYS[i++];
        get(r[1](URL_MND)).then(function (txt) { var p = parse(txt); if (!p) throw new Error('no table'); p.via = r[0]; resolve(p); }).catch(next);
      })();
    }).then(function (p) {
      busy = null;
      if (btn) { btn.disabled = false; btn.textContent = 'Pull rates from MND'; }
      if (!p) { note('Mortgage News Daily did not answer through any relay just now. The last rates are kept; try again, or paste the table below.', 'warn'); return null; }
      try { localStorage.setItem(LAST, String(Date.now())); } catch (e) {}
      if (window.RATES && RATES.apply) { try { RATES.apply({rows: p.rows, asOf: p.asOf}, 'Mortgage News Daily (via ' + p.via + ')'); } catch (e) {} }
      note('', '');
      say('Rates from Mortgage News Daily', p.count + ' rates, updated ' + p.asOf + (p.rows.fixed30 ? '. 30-year fixed ' + p.rows.fixed30.rate.toFixed(2) + '%' : '') + '.');
      try { document.dispatchEvent(new CustomEvent('mt:mnd', {detail: p})); } catch (e) {}
      return p;
    });
    return busy;
  }
  function note(text, kind) { var n = document.getElementById('mndNote'); if (!n) return; n.style.display = text ? '' : 'none'; n.className = 'note ' + (kind || ''); n.textContent = text; }
  function say(t, m) { try { if (window.LOS && LOS.say) LOS.say(t, m, 'good', 5000); else if (typeof window.toast === 'function') window.toast(t + ' - ' + m); } catch (e) {} }
  function stale() { var t = 0; try { t = +localStorage.getItem(LAST) || 0; } catch (e) {} return Date.now() - t > 4 * 3600 * 1000; }
  /* the existing "Pull rates online" button now reads MND only */
  function hook() {
    window.PULL = window.PULL || {};
    if (!PULL.__mnd) { PULL.pullRates = function () { return pull({force: true}); }; PULL.__mnd = true; }
    var b = document.getElementById('mndFetch'); if (b && b.textContent !== 'Pull rates from MND' && !busy) b.textContent = 'Pull rates from MND';
  }
  function visible(el) { return !!(el && el.offsetParent !== null && el.getBoundingClientRect().height > 0); }
  var wasOpen = false;
  setInterval(function () {
    hook();
    var open = visible(document.getElementById('panel-rates')) || visible(document.getElementById('mndFetch'));
    if (open && !wasOpen && stale()) pull();
    wasOpen = open;
  }, 700);
  window.MtMnd = {pull: pull, parse: parse, url: URL_MND, relays: RELAYS};
})();
