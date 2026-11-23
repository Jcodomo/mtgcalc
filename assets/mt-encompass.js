/* Encompass view (57.20): the loan file laid out the way an LOS 1003 screen is - a forms list on the left, blue
   section bars, borrower / co-borrower columns, labels beside the boxes - in the suite's own colours, with the live
   summary kept on the right. Every box that the calculator uses writes to the same loan file as the Simple and Advanced
   views, so a file can be started here and finished anywhere (or done entirely here). Boxes the calculator doesn't use
   (employment, declarations, addresses...) are kept with the scenario in this browser only.
   The FHA 203(k) worksheet shows only for an FHA renovation loan; the HomeStyle form only for a Conventional renovation loan. */
(function () {
  'use strict';
  if (window.__mtEncompass) return; window.__mtEncompass = true;
  var $ = function (id) { return document.getElementById(id); };
  function suite() { try { return window.mortgageSuite.store; } catch (e) { return null; } }
  function outs() { var s = suite(); if (!s) return {}; try { return (typeof s.outputs === 'function' ? s.outputs() : s.outputs) || {}; } catch (e) { return {}; } }
  function N(v) { if (typeof v === 'number') return isFinite(v) ? v : 0; var t = String(v == null ? '' : v).trim(), neg = /^\(.*\)$|^-/.test(t), n = parseFloat(t.replace(/[^0-9.]/g, '')); return isFinite(n) ? (neg ? -n : n) : 0; }
  function money(v) { if (v === '' || v == null || !isFinite(+v)) return ''; var n = +v; return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function get(o, path) { return String(path).split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  var IS_PAGE = !!window.MT_ENCOMPASS_PAGE;
  /* 57.21: Encompass is the third view of the Full Suite page, beside Simple and Advanced - one header, one live summary,
     and switching between the three is instant. loan-suite-encompass.html is the same page opened on this view. */
  var VKEY = 'mt.v57.view', PKEY = 'mt.v57.view.prev';
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  var HOST = IS_PAGE || /full-suite|loan-suite-quote/.test(location.pathname);
  var BASE_PATH = IS_PAGE ? 'full-suite.html' : location.pathname.split('/').pop() || 'full-suite.html';
  var BASE_TITLE = IS_PAGE ? 'Full Suite · Mortgage Suite' : document.title, ENC_TITLE = 'Encompass view · Loan Suite';
  if (IS_PAGE) { var was = ss(VKEY); if (was && was !== 'encompass') ss(PKEY, was); ss(VKEY, 'encompass'); }
  else if (HOST && ss(VKEY) === 'encompass') ss(VKEY, ss(PKEY) || 'simple');
  function isEnc() { return HOST && ss(VKEY) === 'encompass'; }

  /* ---------- this-browser-only boxes (not used by the calculator), kept per scenario ---------- */
  function lkey() { var s = suite(), id = (s && s.activeInputs && s.activeInputs.id) || 'file'; return 'mt.encompass.v1:' + id; }
  function lload() { try { return JSON.parse(localStorage.getItem(lkey()) || '{}'); } catch (e) { return {}; } }
  var L = {};
  function lsave() { try { localStorage.setItem(lkey(), JSON.stringify(L)); } catch (e) {} }

  /* ---------- program checks ---------- */
  function prog() { var s = suite(), i = (s && s.activeInputs) || {}, o = outs(); var reno = o.renovationActive != null ? !!o.renovationActive : !!i.renovation; return {fha: i.loanProgram === 'FHA', conv: i.loanProgram === 'Conventional', reno: reno, purchase: i.transactionType !== 'Refinance'}; }
  function show203k() { var p = prog(); return p.fha && p.reno; }
  function showHomeStyle() { var p = prog(); return p.conv && p.reno; }

  /* ---------- field builders ----------
     kind: money | pct (stored as a fraction) | num | int | date | text | select | yesno | check | out (read-only, from outputs) */
  function inp(path, kind, opts) {
    opts = opts || {};
    var cls = 'mte-in' + (kind === 'money' || kind === 'pct' || kind === 'num' || kind === 'int' ? ' n' : '') + (opts.wide ? ' w' : '') + (opts.cls ? ' ' + opts.cls : '');
    var attrs = ' data-k="' + kind + '"' + (opts.local ? ' data-l="' + esc(path) + '"' : ' data-p="' + esc(path) + '"') + (opts.title ? ' title="' + esc(opts.title) + '"' : '');
    if (kind === 'out') return '<span class="mte-out' + (opts.cls ? ' ' + opts.cls : '') + '" data-o="' + esc(path) + '" data-f="' + (opts.f || 'money') + '"></span>';
    if (kind === 'select' || kind === 'yesno') { var o = kind === 'yesno' ? ['', 'No', 'Yes'] : opts.options || []; return '<select class="' + cls + '"' + attrs + '>' + o.map(function (x) { var v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '">' + esc(t) + '</option>'; }).join('') + '</select>'; }
    if (kind === 'check') return '<input type="checkbox" class="mte-ck"' + attrs + '>';
    return '<input class="' + cls + '"' + attrs + ' autocomplete="off" inputmode="' + (kind === 'text' || kind === 'date' ? 'text' : 'decimal') + '"' + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : kind === 'date' ? ' placeholder="mm/dd/yyyy"' : '') + '>' + (kind === 'pct' ? '<i>%</i>' : '');
  }
  function row(label, html, opts) { opts = opts || {}; return '<div class="mte-row' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.when ? ' data-when="' + opts.when + '"' : '') + '><label>' + label + '</label><div class="mte-v">' + html + '</div></div>'; }
  function bar(title, extra) { return '<div class="mte-bar"><span>' + title + '</span>' + (extra || '') + '</div>'; }
  function sec(id, title, body, extra) { return '<section class="mte-sec" id="mte-' + id + '">' + bar(title, extra) + '<div class="mte-secb">' + body + '</div></section>'; }
  function two(a, b) { return '<div class="mte-two"><div>' + a + '</div><div>' + b + '</div></div>'; }
  function sub(t) { return '<div class="mte-sub">' + t + '</div>'; }

  /* ---------- the forms ---------- */
  var FORMS = [
    ['urla', '1003 URLA', null],
    ['b-info', 'Borrower Information', 'urla'], ['b-tx', 'Transaction Details', 'urla'], ['b-prop', 'Subject Property', 'urla'],
    ['b-emp', 'Employment & Income', 'urla'], ['b-credit', 'Credit & Liabilities', 'urla'], ['b-assets', 'Assets & Gifts', 'urla'],
    ['b-dot', 'Details of Transaction', 'urla'], ['b-decl', 'Declarations', 'urla'],
    ['k203', 'FHA 203(k) Worksheet', null, show203k], ['homestyle', 'HomeStyle Renovation', null, showHomeStyle],
    ['fees', 'Closing Costs', null], ['escrow', 'Escrow / Impounds', null], ['qualify', 'Qualification', null]
  ];
  var current = 'urla';
  try { current = sessionStorage.getItem('mt.encompass.form') || 'urla'; } catch (e) {}

  function bothCols(fn) { return two(sub('Borrower') + fn(0), sub('Co-Borrower <button type="button" class="mte-mini" data-copy="1">Copy from Borrower</button>') + fn(1)); }
  function formURLA() {
    var yn = function (k, label, ex) { return '<div class="mte-decl"><div class="q">' + label + (ex || '') + '</div><div>' + inp('decl.b.' + k, 'yesno', {local: 1}) + '</div><div>' + inp('decl.c.' + k, 'yesno', {local: 1}) + '</div></div>'; };
    return '' +
      sec('b-head', 'Loan File', '<div class="mte-grid3">' +
        row('Scenario', inp('name', 'text', {wide: 1})) + row('Agency case #', inp('agencyCase', 'text', {local: 1})) + row('Loan #', inp('loanNumber', 'text', {local: 1})) +
        row('Application date', inp('asOfDate', 'date')) + row('Est. closing date', inp('closingDate', 'date')) + row('Lock expires', inp('lockExpires', 'date', {local: 1})) + '</div>') +
      sec('b-info', 'Borrower Information', bothCols(function (b) {
        return (b === 0 ? row('Name', inp('borrowerName', 'text', {wide: 1})) : row('Name', inp('borrowers.1.name', 'text', {wide: 1}))) +
          row('Marital status', inp('b' + b + '.marital', 'select', {local: 1, options: ['', 'Married', 'Separated', 'Unmarried']})) +
          row('Dependents #', inp('b' + b + '.deps', 'int', {local: 1})) +
          row('Citizenship', inp('b' + b + '.citizen', 'select', {local: 1, options: ['', 'U.S. Citizen', 'Permanent Resident Alien', 'Non-Permanent Resident Alien']})) +
          row('First-time buyer', inp('b' + b + '.ftb', 'yesno', {local: 1})) +
          row('Military service', inp('b' + b + '.military', 'yesno', {local: 1})) +
          row('Phone', inp('b' + b + '.phone', 'text', {local: 1})) + row('E-mail', inp('b' + b + '.email', 'text', {local: 1, wide: 1})) +
          sub('Present address') + row('Street', inp('b' + b + '.addr', 'text', {local: 1, wide: 1})) + row('City / State / Zip', inp('b' + b + '.city', 'text', {local: 1, wide: 1})) +
          row('Years / Months', inp('b' + b + '.yrs', 'int', {local: 1}) + inp('b' + b + '.mos', 'int', {local: 1})) +
          row('Housing', inp('b' + b + '.housing', 'select', {local: 1, options: ['', 'Rent', 'Own', 'No primary housing expense']}) + inp('b' + b + '.rent', 'money', {local: 1, ph: 'per month'}));
      })) +
      sec('b-tx', 'Transaction Details', two(
        row('Loan purpose', inp('transactionType', 'select', {options: ['Purchase', 'Refinance']})) +
        row('Loan type', inp('loanProgram', 'select', {options: ['FHA', 'Conventional']})) +
        row('Occupancy', inp('occupancy', 'select', {options: ['Primary Residence', 'Second Home', 'Investment']})) +
        row('Renovation', inp('renovation', 'select', {options: [['yes', 'Yes - renovation loan'], ['no', 'No']]})) +
        row('Renovation type', inp('renovationScope', 'select', {options: ['Auto']}), {when: 'reno'}) +
        row('Amort type', inp('amort', 'select', {local: 1, options: ['Fixed Rate', 'ARM']})) +
        row('Lien position', '<span class="mte-out">First</span>') +
        row('Impounds', '<span class="mte-out">Taxes and Insurance (T &amp; I)</span>'),
        sub('Loan Amount') +
        row('Purchase price', inp('basePurchasePrice', 'money')) +
        row('Down payment', inp('baseDownPaymentPct', 'pct', {cls: 's'}) + inp('purchase.downPaymentAmount', 'out')) +
        row('Base loan amount', inp('loan.maximumBaseLoan', 'out', {cls: 'em'})) +
        row('UFMIP / FF', inp('loan.ufmip', 'out'), {when: 'fha'}) +
        row('Total loan amount', inp('loan.totalLoan', 'out', {cls: 'em'})) +
        sub('Note Rate') +
        row('Note rate', inp('interestRate', 'pct', {cls: 's'})) +
        row('Term (months)', inp('termMonths', 'int', {title: 'Months; the calculator uses years'})) +
        row('Credit score', inp('creditScore', 'int'))
      ) + sub('Monthly Housing Expenses - Proposed') + '<div class="mte-grid3">' +
        row('First mtg (P&amp;I)', inp('payment.principalAndInterest', 'out')) +
        row('Hazard ins.', inp('payment.monthlyInsurance', 'out')) +
        row('RE taxes', inp('payment.monthlyTaxes', 'out')) +
        row('Mortgage ins.', inp('payment.mi', 'out')) +
        row('HOA dues', inp('hoaMonthly', 'money')) +
        row('Total', inp('payment.totalMonthlyPayment', 'out', {cls: 'em'})) + '</div>' +
        '<div class="mte-grid3">' + row('Annual taxes', inp('propertyTaxAmount', 'money')) + row('Annual hazard ins.', inp('insuranceAmount', 'money')) + row('Annual flood', inp('escrow.annualFlood', 'money')) + '</div>') +
      sec('b-prop', 'Subject Property Information', two(
        row('Street address', inp('propertyAddress', 'text', {wide: 1})) + row('Zip', inp('zipCode', 'text')) +
        row('State', inp('state', 'select', {options: STATES})) + row('County (NY)', inp('nyCounty', 'select', {options: NY_COUNTIES}), {when: 'ny'}) +
        row('No. of units', inp('units', 'select', {options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4']]})) + row('Year built', inp('yearBuilt', 'int', {local: 1})),
        row('Estimated (as-is) value', inp('asIsValue', 'money')) +
        row('After-repair value', inp('afterRepairValue', 'money'), {when: 'reno'}) +
        row('Property type', inp('propType', 'select', {local: 1, options: ['', 'Detached', 'Attached', 'Semi-detached', 'Condominium', 'Cooperative', 'PUD', 'Manufactured']})) +
        row('Title will be held as', inp('vesting', 'text', {local: 1, wide: 1})) +
        row('Manner held', inp('manner', 'select', {local: 1, options: ['', 'Sole Ownership', 'Joint Tenancy with Right of Survivorship', 'Tenancy by the Entirety', 'Tenancy in Common', 'Life Estate', 'Other']})) +
        row('Estate held in', inp('estate', 'select', {local: 1, options: ['Fee Simple', 'Leasehold']}))
      )) +
      sec('b-emp', 'Employment & Gross Monthly Income', bothCols(function (b) {
        var k = 'b' + b + '.';
        return row('Employer', inp(k + 'employer', 'text', {local: 1, wide: 1})) + row('Position / title', inp(k + 'position', 'text', {local: 1, wide: 1})) +
          row('Start date', inp(k + 'start', 'date', {local: 1})) + row('Years in line of work', inp(k + 'lineYrs', 'int', {local: 1})) +
          row('Self-employed', inp(k + 'self', 'select', {local: 1, options: ['', 'No', 'Yes - less than 25%', 'Yes - 25% or more']})) +
          sub('Gross Monthly Income') +
          ['base', 'overtime', 'bonus', 'commission', 'military', 'other'].map(function (t) { return row(t[0].toUpperCase() + t.slice(1) + (t === 'military' ? ' entitlements' : ''), inp(k + 'inc.' + t, 'money', {local: 1, cls: 'inc', ph: '/ month'})); }).join('') +
          row('Total', '<span class="mte-out em" data-inctotal="' + b + '"></span>') +
          '<div class="mte-note" data-incfile="' + b + '"></div>';
      })) +
      sec('b-credit', 'Credit Information', bothCols(function (b) {
        var k = 'b' + b + '.';
        return row('Experian / FICO', inp(k + 'ex', 'int', {local: 1, cls: 'fico'})) + row('TransUnion', inp(k + 'tu', 'int', {local: 1, cls: 'fico'})) + row('Equifax', inp(k + 'eq', 'int', {local: 1, cls: 'fico'})) + row('Middle score', '<span class="mte-out" data-mid="' + b + '"></span>');
      }) + row('Credit score for decision making', inp('creditScore', 'int') + '<span class="mte-note" style="margin-left:8px">The lower middle score of the borrowers is used once scores are entered.</span>') +
        sub('Liabilities - Credit Cards, Other Debts and Leases') + table('liab', [['own', 'Bor/Cob', 'select', ['Borrower', 'Co-Borrower', 'Both']], ['type', 'Account type', 'select', ['Revolving', 'Installment', 'Open 30-day', 'Lease', 'Mortgage', 'Other']], ['co', 'Company name', 'text'], ['bal', 'Unpaid balance', 'money'], ['pay', 'Monthly payment', 'money'], ['off', 'Paid off', 'check'], ['excl', 'Exclude', 'check']], 5) +
        '<div class="mte-tot">Total liabilities <b data-ltot="bal"></b> Monthly payments counted <b data-ltot="pay"></b></div>') +
      sec('b-assets', 'Assets', table('assets', [['own', 'Bor/Cob', 'select', ['Borrower', 'Co-Borrower', 'Both']], ['type', 'Account type', 'select', ['Checking Account', 'Savings Account', 'Money Market', 'Certificate of Deposit', 'Stocks', 'Bonds', 'Retirement Funds', 'Bridge Loan Proceeds', 'Other']], ['inst', 'Financial institution', 'text'], ['acct', 'Account #', 'text'], ['val', 'Cash or market value', 'money']], 5) +
        '<div class="mte-tot">Liquid <b data-atot="liq"></b> Retirement / other <b data-atot="ret"></b> Months of reserves <b data-atot="months"></b></div>' +
        sub('Gifts or Grants') + table('gifts', [['own', 'Bor/Cob', 'select', ['Borrower', 'Co-Borrower']], ['type', 'Asset type', 'select', ['Gift of Cash', 'Gift of Equity', 'Grant']], ['dep', 'Deposited', 'select', ['No', 'Yes']], ['src', 'Source', 'select', ['Relative', 'Employer', 'Religious Nonprofit', 'Community Nonprofit', 'Federal Agency', 'State Agency', 'Other']], ['val', 'Cash or market value', 'money']], 2) +
        '<div class="mte-tot">Total gifts and grants <b data-atot="gift"></b></div>' +
        two(row('Earnest money deposit', inp('closing.earnestMoneyDeposit', 'money')), row('Explanation of down payment', inp('dpExplain', 'text', {local: 1, wide: 1})))) +
      sec('b-dot', 'Details of Transaction', '<div class="mte-dot">' +
        dot('A.', 'Sales contract price', 'purchase.finalPurchasePrice') + dot('B.', 'Improvements, renovations and repairs', 'renovationOut.finalRenovationAmount', 'reno') +
        dot('E.', 'Credit cards and other debts paid off', '@paidoff') + dot('F.', 'Borrower closing costs (incl. prepaids and initial escrow)', 'cash.buyerClosingCosts') +
        dot('H.', 'Total due from borrower(s)', '@dueH', null, 'em') +
        dot('I.', 'Loan amount (excluding financed MI)', 'loan.maximumBaseLoan') + dot('', 'Financed mortgage insurance', 'loan.ufmip', 'fha') + dot('K.', 'Total mortgage loans', 'loan.totalLoan', null, 'em') +
        dot('L.', 'Seller credits', 'cash.sellerConcessionApplied') + dot('M6.', 'Cash deposit on sales contract', 'cash.emdCreditApplied') +
        dot('', 'Cash from / to the borrower', 'cash.cashToClose', null, 'big') + '</div>' +
        '<div class="mte-note">Every line comes from the live calculation; change the boxes above (or in the other views) and these follow.</div>') +
      sec('b-decl', 'Declarations', '<div class="mte-decl hd"><div></div><div>Borrower</div><div>Co-Borrower</div></div>' +
        yn('A', 'A. Will you occupy the property as your primary residence?') + yn('A1', '&nbsp;&nbsp;&nbsp;If YES, have you had an ownership interest in another property in the last three years?') +
        yn('B', 'B. If this is a purchase: do you have a family relationship or business affiliation with the seller?') + yn('C', 'C. Are you borrowing any money for this transaction not disclosed on this application?') +
        yn('D1', 'D. 1. Applying for a mortgage on another property on or before closing?') + yn('D2', '&nbsp;&nbsp;&nbsp;2. Applying for any new credit on or before closing?') +
        yn('E', 'E. Will this property be subject to a lien that could take priority (e.g. PACE)?') + yn('F', 'F. Are you a co-signer or guarantor on any debt not disclosed?') +
        yn('G', 'G. Are there any outstanding judgments against you?') + yn('H', 'H. Are you delinquent or in default on a federal debt?') +
        yn('I', 'I. Are you a party to a lawsuit with potential personal liability?') + yn('J', 'J. Have you conveyed title in lieu of foreclosure in the past 7 years?') +
        yn('K', 'K. Pre-foreclosure or short sale in the past 7 years?') + yn('L', 'L. Property foreclosed upon in the past 7 years?') + yn('M', 'M. Declared bankruptcy in the past 7 years?') +
        two(sub('Homeownership education (last 12 months)') + row('Borrower', inp('edu.b', 'yesno', {local: 1})) + row('Co-Borrower', inp('edu.c', 'yesno', {local: 1})),
          sub('Housing counseling (last 12 months)') + row('Borrower', inp('couns.b', 'yesno', {local: 1})) + row('Co-Borrower', inp('couns.c', 'yesno', {local: 1}))));
  }
  function dot(ref, label, path, when, cls) { return '<div class="mte-dotr' + (cls ? ' ' + cls : '') + '"' + (when ? ' data-when="' + when + '"' : '') + '><span class="r">' + ref + '</span><span class="l">' + label + '</span><span class="mte-out" data-o="' + path + '" data-f="money"></span></div>'; }
  function table(name, cols, min) {
    var rows = Math.max(min, ((L.tables || {})[name] || []).length + 1);
    var h = '<div class="mte-tw"><table class="mte-t" data-t="' + name + '"><thead><tr>' + cols.map(function (c) { return '<th' + (c[2] === 'money' ? ' class="n"' : '') + '>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var r = 0; r < rows; r++) h += '<tr>' + cols.map(function (c) { var p = 'tables.' + name + '.' + r + '.' + c[0]; return '<td>' + (c[2] === 'check' ? inp(p, 'check', {local: 1}) : c[2] === 'select' ? inp(p, 'select', {local: 1, options: [''].concat(c[3])}) : inp(p, c[2], {local: 1})) + '</td>'; }).join('') + '</tr>';
    return h + '</tbody></table></div>';
  }
  function formReno(kind) {
    var o = outs(), mmw = o.mmw || {}, title = kind === 'k' ? 'FHA 203(k) Maximum Mortgage Worksheet' : 'Fannie Mae HomeStyle Renovation';
    var inputs = two(
      row('Total cost of repairs', inp('reno.baseCost', 'money')) + row('Contingency reserve', inp('reno.contingencyPct', 'pct', {cls: 's'})) +
      row('Architect / engineer', inp('reno.architectural', 'money')) + (kind === 'k' ? row('203(k) consultant fee', inp('reno.consultant', 'money')) : '') +
      row('Permits', inp('reno.permits', 'money')) + row('Inspection fees', inp('reno.inspectionFees', 'money')) + row('Title update fees', inp('reno.titleUpdateFees', 'money')),
      row('Feasibility / other', inp('reno.feasibilityOther', 'money')) + row('Other financeable', inp('reno.otherFinanceable', 'money')) +
      row('Mortgage payments reserve (months)', inp('reno.paymentReserveMonths', 'int')) + (kind === 'k' ? row('Energy improvements', inp('reno.energyImprovements', 'money')) : '') +
      row('As-is value', inp('asIsValue', 'money')) + row('After-repair value', inp('afterRepairValue', 'money')) +
      row('Renovation type', inp('renovationScope', 'select', {options: ['Auto']})));
    /* 57.21: the rest of the Renovation page - draws, fees and options - on the same loan file, so either screen can be used */
    var more = two(
      row('Set the number of draws myself', inp('draws.manualOverride', 'check')) + row('Number of draws', inp('draws.manualDrawCount', 'int', {cls: 's'})) +
      row('Inspection fee per draw', inp('draws.inspectionFeePerDraw', 'money')) + row('Title update fee per draw', inp('draws.titleFeePerDraw', 'money')) +
      row('Initial material release', inp('draws.initialMaterialRelease', 'money')) + row('Draw fees follow the draw count', inp('reno.syncDrawFees', 'check')),
      row('Supplemental origination fee', inp('reno.supplementalOriginationOverride', 'money', {ph: 'calculated'})) + row('Discount points on rehab', inp('reno.discountPointsRehabPct', 'pct', {cls: 's'})) +
      row('Utilities off at the property', inp('reno.utilitiesOff', 'check')) +
      row('Supplemental origination', inp('renovationOut.supplementalOrigination', 'out')) + row('Soft costs', inp('renovationOut.softCosts', 'out')) +
      row('Suggested draws', inp('renovationOut.suggestedDrawCount', 'out', {f: 'int'})));
    var ds = (o.renovationOut && o.renovationOut.drawSchedule) || [];
    var sched = ds.length ? '<div class="mte-tw"><table class="mte-t"><thead><tr><th>Draw</th><th>Stage</th><th class="n">Release</th><th class="n">Inspection</th><th class="n">Title</th><th class="n">Released so far</th><th class="n">Holdback left</th></tr></thead><tbody>' +
      ds.map(function (r) { return '<tr><td>' + esc(r.draw) + '</td><td>' + esc(r.stage) + '</td><td class="n">' + money(r.releaseAmount) + '</td><td class="n">' + money(r.inspectionFee) + '</td><td class="n">' + money(r.titleFee) + '</td><td class="n">' + money(r.cumulativeRelease) + '</td><td class="n">' + money(r.remainingHoldback) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '';
    inputs += sub('Draws, fees and options') + more + (sched ? sub('Draw schedule') + sched : '');
    var sums = '<div class="mte-grid3">' + row('Contingency', inp('renovationOut.contingencyReserve', 'out')) + row('Rehab escrow holdback', inp('renovationOut.escrowHoldback', 'out')) +
      row('Released at closing', inp('renovationOut.releasedAtClosing', 'out')) + row('Payment reserve', inp('renovationOut.paymentReserve', 'out')) +
      row('Total renovation', inp('renovationOut.finalRenovationAmount', 'out', {cls: 'em'})) + row('Draws', inp('renovationOut.drawCount', 'out', {f: 'int'})) +
      row('Base loan', inp('loan.maximumBaseLoan', 'out', {cls: 'em'})) + (kind === 'k' ? row('UFMIP', inp('loan.ufmip', 'out')) : row('LTV on after-repair value', inp('loan.arvLtv', 'out', {f: 'pct'}))) +
      row('Total loan', inp('loan.totalLoan', 'out', {cls: 'em'})) + '</div>';
    var ws = '';
    if (kind === 'k') Object.keys(mmw).filter(function (k) { return /^section/.test(k) && Array.isArray(mmw[k]); }).forEach(function (k) {
      ws += sub('Section ' + k.slice(7)) + '<div class="mte-dot">' + mmw[k].map(function (r) { return '<div class="mte-dotr"><span class="r">' + esc(r.ref || '') + '</span><span class="l">' + esc(r.label || '') + '</span><span class="mte-out">' + (typeof r.amount === 'number' ? (Math.abs(r.amount) < 2 && r.amount % 1 ? (r.amount * 100).toFixed(3) + '%' : money(r.amount)) : esc(r.amount == null ? '' : r.amount)) + '</span></div>'; }).join('') + '</div>';
    });
    return sec(kind === 'k' ? 'k203' : 'homestyle', title, inputs + sub('Results') + sums + ws + '<div class="mte-note">' + (kind === 'k' ? 'Shown because the loan is FHA with renovation.' : 'Shown because the loan is Conventional with renovation (HomeStyle).') +
      ' The same figures as the Renovation page - a change on either one shows on the other, in this tab and in any other open tab.</div>',
      '<button type="button" class="mte-mini" data-reno-page="1" title="The Renovation page of the Advanced view, same loan file">Open the Renovation page</button>');
  }
  function formFees() {
    var o = outs(), lines = (o.closing && o.closing.lines) || [];
    var ov = [['lenderOrigination', 'Lender origination / underwriting'], ['lenderProcessing', 'Processing'], ['appraisal', 'Appraisal'], ['creditReport', 'Credit report'], ['floodTaxService', 'Flood / tax service'], ['titleInsurance', 'Title insurance'], ['titleSearchSettlement', 'Title search / settlement'], ['attorney', 'Attorney'], ['survey', 'Survey'], ['recording', 'Recording'], ['inspections', 'Inspections'], ['other', 'Other']];
    return sec('fees', 'Closing Costs (Fees Worksheet)', two(ov.slice(0, 6).map(function (x) { return row(x[1], inp('closing.overrides.' + x[0], 'money')); }).join(''), ov.slice(6).map(function (x) { return row(x[1], inp('closing.overrides.' + x[0], 'money')); }).join('') + row('Origination points', inp('closing.originationPointsPct', 'pct', {cls: 's'}))) +
      sub('All lines') + '<div class="mte-dot">' + lines.map(function (l) { return '<div class="mte-dotr"><span class="r"></span><span class="l">' + esc(l.label) + (l.payer && l.payer !== 'buyer' ? ' <i>(' + esc(l.payer) + ')</i>' : '') + '</span><span class="mte-out">' + money(l.amount) + '</span></div>'; }).join('') + '</div>' +
      '<div class="mte-dot">' + dot('', 'Borrower closing costs', 'closing.buyerClosingCosts', null, 'em') + '</div>');
  }
  function formEscrow() {
    var o = outs(), eo = o.escrowOut || {}, rows = eo.rows || [], start = N(eo.initialEscrowDeposit);
    return sec('escrow', 'Escrow / Impounds', two(row('Annual taxes', inp('propertyTaxAmount', 'money')) + row('Annual hazard insurance', inp('insuranceAmount', 'money')) + row('Annual flood', inp('escrow.annualFlood', 'money')),
      row('First payment date', inp('escrow.firstPaymentDate', 'date')) + row('Cushion (months)', inp('escrow.cushionMonthsOverride', 'int')) + row('Initial escrow deposit', inp('escrowOut.initialEscrowDeposit', 'out', {cls: 'em'})))) +
      sub('Aggregate escrow analysis') + '<div class="mte-tw"><table class="mte-t ro"><thead><tr><th>Month</th><th class="n">Deposit</th><th>Paid out</th><th class="n">Amount</th><th class="n">Balance</th></tr></thead><tbody>' +
      '<tr><td><i>At closing</i></td><td></td><td>Initial escrow deposit</td><td></td><td class="n">' + money(start) + '</td></tr>' +
      rows.map(function (r) { return '<tr><td>' + esc(r.monthLabel) + '</td><td class="n">' + money(r.deposit) + '</td><td>' + esc((r.disbursementLabels || []).join(', ')) + '</td><td class="n">' + (N(r.disbursements) ? '-' + money(r.disbursements) : '') + '</td><td class="n">' + money(N(r.balance) + start) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function formQualify() {
    return sec('qualify', 'Qualification', two(bothIncome(0) + row('Monthly debts', inp('borrowers.0.monthlyDebts', 'money')), bothIncome(1) + row('Monthly debts', inp('borrowers.1.monthlyDebts', 'money'))) +
      '<div class="mte-grid3">' + row('Total income', '<span class="mte-out em" data-q="inc"></span>') + row('Housing (PITIA)', inp('payment.totalMonthlyPayment', 'out')) + row('Front-end ratio', '<span class="mte-out" data-q="fe"></span>') +
      row('All debts', '<span class="mte-out" data-q="debts"></span>') + row('Back-end ratio', '<span class="mte-out em" data-q="be"></span>') + row('Cash to close', inp('cash.cashToClose', 'out')) + '</div>');
    function bothIncome(b) { return sub(b ? 'Co-Borrower' : 'Borrower') + row('Gross monthly income', inp('borrowers.' + b + '.grossMonthlyIncome', 'money')) + row('Other monthly income', inp('borrowers.' + b + '.otherMonthlyIncome', 'money')); }
  }

  var STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
  var NY_COUNTIES = ['Albany', 'Allegany', 'Bronx', 'Broome', 'Cattaraugus', 'Cayuga', 'Chautauqua', 'Chemung', 'Chenango', 'Clinton', 'Columbia', 'Cortland', 'Delaware', 'Dutchess', 'Erie', 'Essex', 'Franklin', 'Fulton', 'Genesee', 'Greene', 'Hamilton', 'Herkimer', 'Jefferson', 'Kings', 'Lewis', 'Livingston', 'Madison', 'Monroe', 'Montgomery', 'Nassau', 'New York', 'Niagara', 'Oneida', 'Onondaga', 'Ontario', 'Orange', 'Orleans', 'Oswego', 'Otsego', 'Putnam', 'Queens', 'Rensselaer', 'Richmond', 'Rockland', 'Saratoga', 'Schenectady', 'Schoharie', 'Schuyler', 'Seneca', 'St. Lawrence', 'Steuben', 'Suffolk', 'Sullivan', 'Tioga', 'Tompkins', 'Ulster', 'Warren', 'Washington', 'Wayne', 'Westchester', 'Westchester - Yonkers', 'Wyoming', 'Yates'];

  /* ---------- values in and out ---------- */
  function readInput(el) {
    var k = el.getAttribute('data-k');
    if (k === 'check') return el.checked;
    var v = el.value;
    if (k === 'money' || k === 'num') return v.trim() === '' ? null : N(v);
    if (k === 'int') return v.trim() === '' ? null : Math.round(N(v));
    if (k === 'pct') return v.trim() === '' ? null : N(v) / 100;
    if (k === 'date') { var d = window.MTDates ? window.MTDates.iso(v) : v; return d || null; }
    return v;
  }
  function showVal(el, v) {
    var k = el.getAttribute('data-k');
    if (k === 'check') { el.checked = !!v; return; }
    if (v == null || v === '') { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; return; }
    if (k === 'money') el.value = money(v);
    else if (k === 'pct') el.value = String(+(v * 100).toFixed(4));
    else if (k === 'date') { var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); el.value = m ? m[2] + '/' + m[3] + '/' + m[1] : v; }
    else el.value = v;
  }
  function storeVal(path) {
    var s = suite(), i = (s && s.activeInputs) || {};
    if (path === 'termMonths') return N(i.termYears) * 12;
    if (path === 'renovation') return i.renovation ? 'yes' : 'no';
    if (path === 'units') return String(i.units || 1);
    if (path === 'borrowers.1.name') { var b = (i.borrowers || [])[1]; return b && b.name !== 'Borrower 2' ? b.name : ''; }
    return get(i, path);
  }
  function writeStore(path, v) {
    var s = suite(); if (!s) return;
    if (path === 'termMonths') { path = 'termYears'; v = v ? Math.round(v / 12) : 30; }
    if (path === 'renovation') v = v === 'yes';
    if (path === 'units') v = +v || 1;
    try { s.setField(path, v, 'Encompass view'); } catch (e) {}
  }
  function outVal(path) {
    var o = outs(), p = o.payment || {}, c = o.cash || {};
    if (path === 'payment.mi') return N(p.monthlyFhaMip) + N(p.monthlyPmi);
    if (path === 'purchase.downPaymentAmount') { var s = suite(), i = (s && s.activeInputs) || {}; return N(i.basePurchasePrice) * N(i.baseDownPaymentPct); }
    if (path === '@paidoff') return liabTotals().paidOff;
    if (path === '@dueH') { var oo = o.purchase || {}, r = o.renovationOut || {}; return N(oo.finalPurchasePrice) + (prog().reno ? N(r.finalRenovationAmount) : 0) + liabTotals().paidOff + N(c.buyerClosingCosts); }
    return get(o, path);
  }
  function fmt(v, f) { if (v == null || v === '') return ''; if (f === 'pct') return (N(v) * 100).toFixed(3) + '%'; if (f === 'int') return String(Math.round(N(v))); return money(N(v)); }

  /* local tables -> loan file totals (only written after the table is edited here) */
  function rowsOf(name) { return ((L.tables || {})[name] || []).filter(function (r) { return r && Object.keys(r).some(function (k) { return r[k] !== '' && r[k] != null && r[k] !== false; }); }); }
  function liabTotals() {
    var t = {bal: 0, pay: [0, 0], paidOff: 0};
    rowsOf('liab').forEach(function (r) { var bal = N(r.bal), pay = N(r.pay); t.bal += bal; if (r.off) { t.paidOff += bal; return; } if (r.excl) return; if (r.own === 'Co-Borrower') t.pay[1] += pay; else t.pay[0] += pay; });
    return t;
  }
  function assetTotals() {
    var t = {liq: 0, ret: 0, gift: 0};
    rowsOf('assets').forEach(function (r) { var v = N(r.val); if (/Retirement|Stocks|Bonds|Other/.test(r.type || '')) t.ret += v; else t.liq += v; });
    rowsOf('gifts').forEach(function (r) { t.gift += N(r.val); });
    return t;
  }
  function incomeTotal(b) { var inc = ((L['b' + b] || {}).inc) || {}; return ['base', 'overtime', 'bonus', 'commission', 'military'].reduce(function (a, k) { return a + N(inc[k]); }, 0); }
  function hasIncome(b) { var inc = ((L['b' + b] || {}).inc) || {}; return Object.keys(inc).some(function (k) { return inc[k] !== '' && inc[k] != null; }); }
  function middle(b) { var x = L['b' + b] || {}, a = [x.ex, x.tu, x.eq].map(N).filter(function (n) { return n >= 300; }).sort(function (p, q) { return p - q; }); return a.length === 3 ? a[1] : a.length === 2 ? a[0] : a[0] || 0; }

  function syncFromLocal(what) {
    var s = suite(); if (!s) return;
    if (what === 'inc0' || what === 'inc1') { var b = +what.slice(3); if (hasIncome(b)) { writeStore('borrowers.' + b + '.grossMonthlyIncome', incomeTotal(b)); writeStore('borrowers.' + b + '.otherMonthlyIncome', N((((L['b' + b] || {}).inc) || {}).other)); } }
    if (what === 'liab') { var t = liabTotals(); writeStore('borrowers.0.monthlyDebts', t.pay[0]); writeStore('borrowers.1.monthlyDebts', t.pay[1]); }
    if (what === 'assets' || what === 'gifts') { var a = assetTotals(); writeStore('assets.liquidAssets', a.liq || null); writeStore('assets.retirementOtherAssets', a.ret || null); writeStore('assets.giftFunds', a.gift || null); }
    if (what === 'fico') { var m = [middle(0), middle(1)].filter(Boolean); if (m.length) writeStore('creditScore', Math.min.apply(null, m)); }
  }

  /* ---------- render ---------- */
  var root = null, lastForm = '', lastSig = '';
  function css() {
    if ($('mtEncCss')) return; var st = document.createElement('style'); st.id = 'mtEncCss';
    st.textContent =
      'body.mt-enc #screen-body>*:not(#mtEnc){display:none!important}html:not(.mt-enc-view) #mtEnc{display:none!important}' +
      'html.mt-enc-view #suite-root #root>.topbar,html.mt-enc-view #suite-root #root>.chrome,html.mt-enc-view #v34Bar,html.mt-enc-view #suite-root .v44-metric-strip,html.mt-enc-view #suite-root .v20-kpis,html.mt-enc-view #suite-root #v44PunchIn,html.mt-enc-view #suite-root #mtTop,html.mt-enc-view #v36SuiteFooter,html.mt-enc-view #q57dock,html.mt-enc-view #lseNav{display:none!important}' +
      'html.mt-enc-view #suite-root .cols-main{padding-top:14px}' +
      '#mtEnc{--e-line:#23406b;--e-bar:linear-gradient(180deg,rgba(127,178,255,.18),rgba(127,178,255,.08));--e-in:rgba(9,22,44,.65);color:#e6eefb;font-size:12.5px}' +
      '#mtEnc .mte-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 10px}#mtEnc .mte-top h2{margin:0;font-size:15px;letter-spacing:.02em}#mtEnc .mte-top small{color:#9db0c8;font-weight:400;margin-left:8px}' +
      '#mtEnc .mte-views{display:flex;border:1px solid var(--e-line);border-radius:8px;overflow:hidden}#mtEnc .mte-views a,#mtEnc .mte-views b{padding:6px 12px;color:#9db0c8;text-decoration:none;font-weight:600;font-size:12px}#mtEnc .mte-views b{background:#123a75;color:#fff}#mtEnc .mte-views a:hover{background:rgba(127,178,255,.1);color:#e6eefb}' +
      '#mtEnc .mte-wrap{display:grid;grid-template-columns:178px minmax(0,1fr);gap:12px;align-items:start}' +
      '#mtEnc .mte-forms{position:sticky;top:8px;border:1px solid var(--e-line);border-radius:8px;overflow:hidden;background:rgba(9,22,44,.5)}#mtEnc .mte-forms .h{padding:7px 10px;background:var(--e-bar);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#bcd3f5;border-bottom:1px solid var(--e-line)}' +
      '#mtEnc .mte-forms button{display:block;width:100%;text-align:left;border:0;background:none;color:#cfdcef;padding:6px 10px;font:inherit;font-size:12.5px;cursor:pointer;border-bottom:1px solid rgba(35,64,107,.45)}#mtEnc .mte-forms button.sub{padding-left:22px;font-size:12px;color:#9db0c8}#mtEnc .mte-forms button.on{background:#123a75;color:#fff}#mtEnc .mte-forms button:hover{background:rgba(127,178,255,.1)}' +
      '#mtEnc .mte-sec{border:1px solid var(--e-line);border-radius:8px;margin:0 0 12px;overflow:hidden;background:rgba(9,22,44,.35);scroll-margin-top:10px}' +
      '#mtEnc .mte-bar{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--e-bar);border-bottom:1px solid var(--e-line);font-weight:700;font-size:12.5px;color:#d7e6fb}' +
      '#mtEnc .mte-secb{padding:8px 10px}#mtEnc .mte-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 16px}#mtEnc .mte-two>div+div{border-left:1px solid rgba(35,64,107,.6);padding-left:14px}' +
      '#mtEnc .mte-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 14px}' +
      '#mtEnc .mte-sub{font-weight:700;color:#bcd3f5;margin:8px 0 4px;font-size:12px;display:flex;justify-content:space-between;align-items:center}' +
      '#mtEnc .mte-row{display:grid;grid-template-columns:minmax(92px,42%) minmax(0,1fr);align-items:center;gap:6px;min-height:27px;margin:0!important}#mtEnc label{margin:0!important;text-transform:none!important;letter-spacing:0!important}#mtEnc .mte-row>label{color:#9db0c8;font-size:12px;line-height:1.2}' +
      '#mtEnc .mte-v{display:flex;align-items:center;gap:5px;min-width:0}#mtEnc .mte-v i{color:#9db0c8;font-style:normal}' +
      '#mtEnc .mte-in{height:24px;min-width:0;width:100%;max-width:150px;box-sizing:border-box;background:var(--e-in);border:1px solid #2b5590;border-radius:3px;color:#e6eefb;font:inherit;font-size:12.5px;padding:1px 5px}#mtEnc .mte-in.w{max-width:none}#mtEnc .mte-in.s{max-width:72px}#mtEnc .mte-in.n{text-align:right;font-variant-numeric:tabular-nums}' +
      '#suite-root #screen-body #mtEnc .mte-ck{height:15px!important;width:15px!important;min-height:0!important;padding:0!important;margin:0!important}#suite-root #screen-body #mtEnc .mte-in,#suite-root #screen-body #mtEnc select.mte-in{height:24px!important;min-height:0!important;padding:1px 5px!important;font-size:12.5px!important;line-height:20px!important;border-radius:3px!important;box-shadow:none!important;margin:0!important}#suite-root #screen-body #mtEnc select.mte-in{padding:0 2px!important}#mtEnc .mte-in:focus{outline:2px solid #7fb2ff;outline-offset:0}#mtEnc .mte-ck{width:15px;height:15px;accent-color:#7fb2ff}' +
      '#mtEnc .mte-out{display:inline-block;min-width:96px;padding:2px 6px;border:1px solid rgba(43,85,144,.5);border-radius:3px;background:rgba(127,178,255,.06);text-align:right;font-variant-numeric:tabular-nums;color:#dce8fa}#mtEnc .mte-out.em{font-weight:700;color:#fff}#mtEnc .mte-out:empty::after{content:"\\00a0"}' +
      '#mtEnc .mte-mini{border:1px solid #2b5590;background:#123a75;color:#e6eefb;border-radius:4px;font:inherit;font-size:11px;padding:2px 7px;cursor:pointer}' +
      '#mtEnc .mte-note{color:#9db0c8;font-size:11.5px;margin-top:4px}#mtEnc .mte-tot{display:flex;gap:14px;flex-wrap:wrap;justify-content:flex-end;color:#9db0c8;margin:6px 0}#mtEnc .mte-tot b{color:#fff;font-variant-numeric:tabular-nums}' +
      '#mtEnc .mte-tw{overflow-x:auto}#mtEnc .mte-t{width:100%;border-collapse:collapse}#mtEnc .mte-t th{font-weight:600;color:#9db0c8;text-align:left;padding:3px 4px;font-size:11.5px;border-bottom:1px solid var(--e-line);white-space:nowrap}#mtEnc .mte-t th.n,#mtEnc .mte-t td.n{text-align:right}#mtEnc .mte-t td{padding:2px 4px;border-bottom:1px solid rgba(35,64,107,.35)}#mtEnc .mte-t .mte-in{max-width:none}' +
      '#mtEnc .mte-dot{display:grid;gap:2px}#mtEnc .mte-dotr{display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:8px;padding:2px 0;border-bottom:1px dotted rgba(35,64,107,.5)}#mtEnc .mte-dotr .r{font-weight:700;color:#bcd3f5}#mtEnc .mte-dotr .l{color:#cfdcef}#mtEnc .mte-dotr.em .l{font-weight:700}#mtEnc .mte-dotr.big .l{font-weight:800;color:#fff}#mtEnc .mte-dotr.big .mte-out{font-weight:800;color:#7ff0b1;font-size:13.5px}' +
      '#mtEnc .mte-decl{display:grid;grid-template-columns:1fr 92px 92px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(35,64,107,.4)}#mtEnc .mte-decl.hd{font-weight:700;color:#bcd3f5;border-bottom:1px solid var(--e-line)}#mtEnc .mte-decl .q{color:#cfdcef}' +
      '#mtEnc [data-when].mte-hide{display:none}' +
      '@media(max-width:900px){#mtEnc .mte-wrap{grid-template-columns:minmax(0,1fr)}#mtEnc .mte-forms{position:static;display:flex;flex-wrap:wrap}#mtEnc .mte-forms .h{width:100%}#mtEnc .mte-forms button{width:auto;border:0;border-right:1px solid rgba(35,64,107,.45)}#mtEnc .mte-forms button.sub{display:none}}' +
      '@media(max-width:640px){#mtEnc .mte-two,#mtEnc .mte-grid3{grid-template-columns:minmax(0,1fr)}#mtEnc .mte-two>div+div{border-left:0;padding-left:0}#mtEnc .mte-decl{grid-template-columns:1fr 70px 70px}}';
    document.head.appendChild(st);
  }
  function visibleForms() { return FORMS.filter(function (f) { return !f[3] || f[3](); }); }
  function navHtml() {
    return '<div class="h">Forms</div>' + visibleForms().map(function (f) { var on = f[0] === current || (f[2] && current === f[2] && false); return '<button type="button" class="' + (f[2] ? 'sub' : '') + (on ? ' on' : '') + '" data-form="' + f[0] + '" data-parent="' + (f[2] || '') + '">' + f[1] + '</button>'; }).join('');
  }
  function formHtml() {
    if (current === 'k203' && show203k()) return formReno('k');
    if (current === 'homestyle' && showHomeStyle()) return formReno('h');
    if (current === 'fees') return formFees();
    if (current === 'escrow') return formEscrow();
    if (current === 'qualify') return formQualify();
    current = 'urla'; return formURLA();
  }
  function build() {
    var host = $('screen-body'); if (!host) return false;
    css(); L = lload();
    if (!root) { root = document.createElement('div'); root.id = 'mtEnc'; }
    if (root.parentNode !== host || host.firstElementChild !== root) host.insertBefore(root, host.firstChild);
    document.body.classList.add('mt-enc');
    var a = document.activeElement, keep = a && root.contains(a) ? {p: a.getAttribute('data-p'), l: a.getAttribute('data-l'), s: a.selectionStart, e: a.selectionEnd} : null;
    var y = window.scrollY;
    root.innerHTML = '<div class="mte-top"><h2>Loan file · Encompass view<small>same loan file as Simple and Advanced (switch at the top) - live summary on the right</small></h2></div>' +
      '<div class="mte-wrap"><nav class="mte-forms">' + navHtml() + '</nav><div class="mte-form">' + formHtml() + '</div></div>';
    lastForm = current; lastSig = sigNow();
    fillAll(true); wire();
    if (keep && (keep.p || keep.l)) { var f = root.querySelector(keep.p ? '[data-p="' + keep.p + '"]' : '[data-l="' + keep.l + '"]'); if (f) { f.focus({preventScroll: true}); try { if (keep.s != null) f.setSelectionRange(keep.s, keep.e); } catch (x) {} window.scrollTo(0, y); } }
    return true;
  }
  function sigNow() { var p = prog(), o = outs(); return [p.fha, p.conv, p.reno, current, JSON.stringify((o.renovationOut || {}).drawSchedule || []).length, JSON.stringify(o.mmw || {}).length, ((o.closing && o.closing.lines) || []).length, ((o.escrowOut && o.escrowOut.rows) || []).length, JSON.stringify((o.escrowOut || {}).rows || []).length].join('|'); }
  function scopeOptions() {
    var p = prog(), sel = root && root.querySelectorAll('select[data-p="renovationScope"]'); if (!sel) return;
    var opts = p.fha ? ['Auto', '203(k) Limited', '203(k) Standard'] : p.conv ? ['Auto', 'HomeStyle'] : ['Auto'];
    sel.forEach(function (s) { var v = storeVal('renovationScope'); s.innerHTML = opts.map(function (o) { return '<option>' + o + '</option>'; }).join(''); s.value = opts.indexOf(v) >= 0 ? v : 'Auto'; });
  }
  function fillAll(force) {
    if (!root) return;
    var s = suite(), i = (s && s.activeInputs) || {}, p = prog(), active = document.activeElement;
    scopeOptions();
    root.querySelectorAll('[data-p]').forEach(function (el) { if (el === active && !force) return; showVal(el, storeVal(el.getAttribute('data-p'))); });
    root.querySelectorAll('[data-l]').forEach(function (el) { if (el === active && !force) return; showVal(el, get(L, el.getAttribute('data-l'))); });
    root.querySelectorAll('[data-o]').forEach(function (el) { el.textContent = fmt(outVal(el.getAttribute('data-o')), el.getAttribute('data-f')); });
    root.querySelectorAll('[data-when]').forEach(function (el) { var w = el.getAttribute('data-when'), ok = w === 'reno' ? p.reno : w === 'fha' ? p.fha : w === 'ny' ? i.state === 'New York' : true; el.classList.toggle('mte-hide', !ok); });
    root.querySelectorAll('[data-inctotal]').forEach(function (el) { var b = +el.getAttribute('data-inctotal'); el.textContent = money(incomeTotal(b)); });
    root.querySelectorAll('[data-incfile]').forEach(function (el) { var b = +el.getAttribute('data-incfile'), bo = (i.borrowers || [])[b] || {}; el.textContent = hasIncome(b) ? '' : (N(bo.grossMonthlyIncome) ? 'Loan file shows ' + money(bo.grossMonthlyIncome) + ' / month (from the Income Calculator or another view). Entering the breakdown here replaces it.' : ''); });
    root.querySelectorAll('[data-mid]').forEach(function (el) { var m = middle(+el.getAttribute('data-mid')); el.textContent = m ? String(m) : ''; });
    var lt = liabTotals(); root.querySelectorAll('[data-ltot]').forEach(function (el) { var k = el.getAttribute('data-ltot'); el.textContent = money(k === 'bal' ? lt.bal : lt.pay[0] + lt.pay[1]); });
    var at = assetTotals(), pay = N((outs().payment || {}).totalMonthlyPayment);
    root.querySelectorAll('[data-atot]').forEach(function (el) { var k = el.getAttribute('data-atot'); el.textContent = k === 'months' ? (pay ? ((at.liq + at.ret) / pay).toFixed(1) : '') : money(at[k]); });
    var bs = i.borrowers || [], inc = bs.reduce(function (a, b) { return a + N(b.grossMonthlyIncome) + N(b.otherMonthlyIncome); }, 0), debts = bs.reduce(function (a, b) { return a + N(b.monthlyDebts); }, 0);
    root.querySelectorAll('[data-q]').forEach(function (el) { var k = el.getAttribute('data-q'); el.textContent = k === 'inc' ? money(inc) : k === 'debts' ? money(debts) : !inc ? '' : ((k === 'fe' ? pay : pay + debts) / inc * 100).toFixed(2) + '%'; });
    root.querySelectorAll('.mte-forms [data-form]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-form') === current); });
  }
  function wire() {
    root.onchange = function (e) {
      var el = e.target, p = el.getAttribute('data-p'), l = el.getAttribute('data-l');
      if (p) { writeStore(p, readInput(el)); return; }
      if (l) {
        var v = readInput(el), parts = l.split('.'), o = L;
        for (var k = 0; k < parts.length - 1; k++) { var nk = parts[k + 1]; if (o[parts[k]] == null) o[parts[k]] = /^\d+$/.test(nk) ? [] : {}; o = o[parts[k]]; }
        o[parts[parts.length - 1]] = v; lsave();
        if (/^b[01]\.inc\./.test(l)) syncFromLocal('inc' + l[1]);
        else if (/^b[01]\.(ex|tu|eq)$/.test(l)) syncFromLocal('fico');
        else if (/^tables\.(liab|assets|gifts)\./.test(l)) { var t = l.split('.')[1]; syncFromLocal(t); var rows = (L.tables[t] || []).length, shown = root.querySelectorAll('table[data-t="' + t + '"] tbody tr').length; if (rows >= shown) { render(true); return; } }
        fillAll(false);
      }
    };
    root.onclick = function (e) {
      var f = e.target.closest('[data-form]');
      if (f) {
        var id = f.getAttribute('data-form'), parent = f.getAttribute('data-parent');
        if (parent) { if (current !== parent) { current = parent; render(true); } var t = $('mte-' + id); if (t) t.scrollIntoView({behavior: 'smooth', block: 'start'}); return; }
        current = id; try { sessionStorage.setItem('mt.encompass.form', id); } catch (x) {} render(true); root.scrollIntoView({block: 'start'}); return;
      }
      if (e.target.closest('[data-reno-page]')) { openRenovationPage(); return; }
      if (e.target.closest('[data-copy]')) {   /* co-borrower address and housing from the borrower */
        L.b1 = L.b1 || {}; var b0 = L.b0 || {}; ['addr', 'city', 'yrs', 'mos', 'housing', 'rent', 'phone'].forEach(function (k) { if (b0[k] != null) L.b1[k] = b0[k]; }); lsave(); fillAll(true);
      }
    };
  }
  function render(force) { if (force || !root || !root.isConnected) build(); else if (sigNow() !== lastSig) build(); else fillAll(false); }

  /* ---------- the view: built when Encompass is chosen, hidden (not removed) for Simple and Advanced ---------- */
  var started = false;
  function startView() {
    if (started) return; started = true;
    var n = 0;
    (function wait() {
      var s = suite();
      if (s && $('screen-body')) {
        if (isEnc()) build();
        try { s.subscribe(function () { if (!isEnc()) return; clearTimeout(wait.t); wait.t = setTimeout(function () { render(false); }, 120); }); } catch (e) {}
        /* the suite can redraw its screen: put the view back if it disappears */
        setInterval(function () { if (isEnc() && !document.hidden && (!root || !root.isConnected || $('screen-body').firstElementChild !== root)) build(); }, 1500);
        return;
      }
      if (++n < 160) setTimeout(wait, 120);
    })();
  }
  function apply() {
    var enc = isEnc();
    document.documentElement.classList.toggle('mt-enc-view', enc);
    if (document.body) document.body.classList.toggle('mt-enc', enc);
    if (enc) { css(); startView(); if (started && suite() && $('screen-body')) render(true); }
    else { var v = ss(VKEY); if (v) ss(PKEY, v); }
    var want = enc ? 'loan-suite-encompass.html' : BASE_PATH;
    if (location.pathname.split('/').pop() !== want) { try { history.replaceState(history.state, '', want + location.search + location.hash); } catch (e) {} }
    document.title = enc ? ENC_TITLE : BASE_TITLE;
    try { window.MTDock && window.MTDock.setActive(enc ? 'enc' : 'full'); } catch (e) {}
    var b = document.querySelector('#q57view [data-v="encompass"]'); if (b) b.setAttribute('aria-pressed', String(enc));
  }
  /* switch views; a quick cross-fade where the browser has view transitions */
  function setView(v) {
    var run = function () { window.dispatchEvent(new CustomEvent('mt57:view', {detail: v})); apply(); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { try { const vt = document.startViewTransition(run); [vt.ready, vt.finished, vt.updateCallbackDone].forEach((pr) => pr && pr.catch(() => {})); return; } catch (e) {} }   /* 57.37: a switch made while the last one is still animating (or in a hidden tab) is skipped quietly */
    run();
  }
  function openRenovationPage() {
    setView('advanced');
    setTimeout(function () {
      var s = suite();
      try { if (window.LOS55 && LOS55.Nav && LOS55.Nav.go) LOS55.Nav.go('s:renovation'); else if (s && s.setMode) s.setMode('renovation'); } catch (e) { try { s.setMode('renovation'); } catch (x) {} }
      window.scrollTo(0, 0);
    }, 60);
  }
  function hostStart() {
    if (!HOST) return;
    var tg = document.createElement('style'); tg.id = 'mtEncToggleCss';
    tg.textContent = '#q57view{flex:none}@media(max-width:520px){#q57view{margin-left:6px!important}#q57view button{padding:5px 8px!important;font-size:12px!important}}';
    (document.head || document.documentElement).appendChild(tg);
    /* the Encompass button beside Simple and Advanced at the top of the page */
    var tries = 0;
    (function addButton() {
      var f = $('q57view');
      if (!f) { if (tries++ < 150) setTimeout(addButton, 100); else apply(); return; }
      if (!f.querySelector('[data-v="encompass"]')) {
        var b = document.createElement('button'); b.type = 'button'; b.dataset.v = 'encompass'; b.textContent = 'Encompass';
        b.title = 'Encompass-style 1003 forms - same loan file, live summary on the right';
        f.appendChild(b);
      }
      apply();
    })();
    /* Simple / Advanced / Encompass: switch in place with the cross-fade */
    window.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#q57view [data-v]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.v !== ss(VKEY)) setView(b.dataset.v);
    }, true);
    window.addEventListener('mt57:view', function () { setTimeout(apply, 0); });
    /* the dock's Full Suite and Encompass links are this same page: switch without reloading it */
    window.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('#mtgcalcPageNav a'); if (!a || !$('q57view')) return;
      var h = a.getAttribute('href') || '';
      if (/loan-suite-encompass\.html/.test(h)) { e.preventDefault(); e.stopImmediatePropagation(); if (!isEnc()) setView('encompass'); window.scrollTo(0, 0); }
      else if (/full-suite\.html/.test(h) && isEnc()) { e.preventDefault(); e.stopImmediatePropagation(); setView(ss(PKEY) && ss(PKEY) !== 'encompass' ? ss(PKEY) : 'simple'); }
    }, true);
  }
  function start() { hostStart(); }
  window.MTEncompass = {render: function () { render(true); }, show203k: show203k, showHomeStyle: showHomeStyle, setView: setView, isOpen: isEnc};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
