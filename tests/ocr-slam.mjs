// OCR slam test: thousands of generated documents with known figures, read by the suite's real document readers
// (the Income Calculator's classify / extractFields from income-calculator.html, and Document Center's detect / EX from
// assets/doc-center.js), clean and with the damage OCR does: extra spaces, case, dropped $ and commas, junk lines, letters
// read for digits (O/0, l/1, S/5, B/8), "1, 234.56", "1,234,56", values pushed to the next line.
// Every document is checked for its type and for each figure the reader should find (number to the cent, dates exact).
// Run: node tests/ocr-slam.mjs [documents-per-type-and-level] [--fails] [--type=paystub]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PER = +(process.argv.find((a) => /^\d+$/.test(a)) || 60);
const ONLY = (process.argv.find((a) => a.startsWith('--type=')) || '').slice(7);
const SHOW = process.argv.includes('--fails');

/* ---------------------------------------------------------------- the readers, loaded from the pages themselves */
function incomeReader(file) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const a = html.indexOf('/* ---------- number / line helpers ---------- */'), b = html.indexOf('/* ---------- reading the file ---------- */');
  const c = html.indexOf('const AUS_LABEL'), d = html.indexOf('</script>', c);
  if (a < 0 || b < 0 || c < 0) throw new Error('reader not found in ' + file);
  const ctx = { console, window: {} }; vm.createContext(ctx);
  vm.runInContext(html.slice(a, b) + '\n' + html.slice(c, d) + '\nthis.__R={classify,extractFields,lines};', ctx);
  return ctx.__R;
}
function docCenter() {
  const store = {}, el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
  const doc = { readyState: 'loading', addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: el, head: el(), body: el(), documentElement: el() };
  const ctx = { console, document: doc, location: { pathname: '/doc-organizer.html', search: '' }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, navigator: {}, setTimeout, clearTimeout, Promise };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, 'assets/doc-center.js'), 'utf8'), ctx);
  globalThis.__dcFix = ctx.MTOcrFix;
  return ctx.MTDocs;
}
const IC = incomeReader('income-calculator.html');
const DC = docCenter();
// the Loan Suite's Documents pages read income documents with their own (minified) copy of the reader
function suiteReader() {
  const ctx = { console, window: {}, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} } };
  ctx.window.MTOcrFix = globalThis.__dcFix; ctx.MTOcrFix = globalThis.__dcFix; vm.createContext(ctx);
  const src = readFileSync(path.join(root, 'assets/js/06-docs-let-auto-apply-0-window-pdfjsli.js'), 'utf8');
  vm.runInContext(src + '\n;this.__R={classify,extractFields};', ctx);
  return ctx.__R;
}
const SU = suiteReader();

/* ---------------------------------------------------------------- random numbers, fixed seed */
let seed = 57290001;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => Math.floor(lo + rnd() * (hi - lo + 1));
const cents = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const r2 = (v) => Math.round(v * 100) / 100;
const money = (v, o = {}) => { const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: o.whole ? 0 : 2, maximumFractionDigits: o.whole ? 0 : 2 }); return (v < 0 ? '-' : '') + (o.$ === false ? '' : '$') + s; };
const tax = (v) => Math.round(v).toLocaleString('en-US') + (rnd() < 0.5 ? '.' : '');   // tax software prints whole dollars, often with a trailing period
const pad = (n) => String(n).padStart(2, '0');
const date = (y, m, d) => `${pad(m)}/${pad(d)}/${y}`, iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const NAMES = ['Maria Gonzalez', 'James Carter', 'Aisha Patel', 'Robert Chen', 'Linda Okafor', 'David Kowalski', 'Sarah Nguyen', 'Michael Rossi'];
const EMPLOYERS = ['Hudson Valley Health System', 'Brightline Logistics Inc', 'Summit Ridge School District', 'Atlas Manufacturing Co', 'Northwind Software LLC', 'Coastal Grocers Inc'];

/* ---------------------------------------------------------------- documents: text plus the figures a reader must find */
// each returns {text, type, want: [[key, value, kind]]}; key is the reader's slot (income) or destination (Document Center)
const INCOME = {
  paystub() {
    const hourly = rnd() < 0.65, rate = hourly ? cents(16, 68) : 0, hrs = 80, y = 2026, m = int(3, 11), d = int(1, 28);
    const periods = int(5, 24), per = hourly ? r2(rate * hrs) : cents(1800, 9500), ytd = r2(per * periods);
    const ot = rnd() < 0.5 ? r2(rate * 1.5 * int(2, 12) * periods * 0.6) : 0, bonus = rnd() < 0.3 ? cents(500, 8000) : 0;
    const hoursFirst = rnd() < 0.4, emp = pick(EMPLOYERS), who = pick(NAMES);
    const head = hoursFirst ? 'Earnings Hours Rate Current Year to Date' : 'Earnings Rate Hours This Period YTD';
    const row = (lbl, r, h, cur, y2) => hourly ? `${lbl} ${hoursFirst ? h.toFixed(2) + ' ' + r.toFixed(2) : r.toFixed(2) + ' ' + h.toFixed(2)} ${money(cur)} ${money(y2)}` : `${lbl} ${money(cur)} ${money(y2)}`;
    const L = [emp, 'Earnings Statement', `Employee Name: ${who}`, `Pay Period: ${date(y, m, d)} - ${date(y, m, Math.min(28, d + 13))}`, `Pay Date: ${date(y, m, Math.min(28, d + 15))}`, head,
      row(hourly ? 'Regular' : 'Salary', rate, hrs, per, ytd)];
    if (ot) L.push(`Overtime ${(rate * 1.5).toFixed(2)} ${(6).toFixed(2)} ${money(r2(rate * 9))} ${money(ot)}`);
    if (bonus) L.push(`Bonus ${money(bonus)} ${money(bonus)}`);
    const gross = r2(ytd + ot + bonus); L.push(`Gross Pay ${money(r2(per + (ot ? rate * 9 : 0)))} ${money(gross)}`, 'Federal Income Tax 312.40 4,998.40', `Net Pay ${money(r2(per * 0.74))}`);
    const want = [['base', ytd, 'n'], ['ytdThru', iso(y, m, Math.min(28, d + 13)), 'd']];
    if (hourly) want.push(['rate', rate, 'n']);
    if (ot) want.push(['ot', ot, 'n']); if (bonus) want.push(['bonus', bonus, 'n']);
    return { text: L.join('\n'), type: 'paystub', want };
  },
  w2() {
    const y = pick([2024, 2025]), w = cents(28000, 240000), ss = Math.min(w + cents(0, 9000), 176100), med = r2(w + cents(0, 9000)), emp = pick(EMPLOYERS);
    const lay = pick(['same', 'rows', 'next']);
    let L;
    if (lay === 'same') L = [`Form W-2 Wage and Tax Statement ${y}`, `c Employer's name, address, and ZIP code`, emp, '123 Main Street, Albany NY 12207',
      `1 Wages, tips, other compensation ${money(w, { $: false })} 2 Federal income tax withheld ${money(r2(w * 0.12), { $: false })}`,
      `3 Social security wages ${money(ss, { $: false })} 4 Social security tax withheld ${money(r2(ss * 0.062), { $: false })}`,
      `5 Medicare wages and tips ${money(med, { $: false })} 6 Medicare tax withheld ${money(r2(med * 0.0145), { $: false })}`];
    else if (lay === 'rows') L = [`W-2 Wage and Tax Statement ${y}`, `c Employer's name, address, and ZIP code`, emp,
      '1 Wages, tips, other compensation 2 Federal income tax withheld', `${money(w, { $: false })} ${money(r2(w * 0.12), { $: false })}`,
      '3 Social security wages 4 Social security tax withheld', `${money(ss, { $: false })} ${money(r2(ss * 0.062), { $: false })}`,
      '5 Medicare wages and tips 6 Medicare tax withheld', `${money(med, { $: false })} ${money(r2(med * 0.0145), { $: false })}`];
    else L = [`Wage and Tax Statement ${y}`, `Employer's name`, emp, 'Wages, tips, other compensation', money(w), 'Social security wages', money(ss), 'Medicare wages and tips', money(med)];
    return { text: L.join('\n'), type: 'w2', want: [['base', w, 'n'], ['_ss', ss, 'n'], ['_med', med, 'n']] };
  },
  wvoe() {
    const rate = cents(18, 60), hire = [int(2010, 2022), int(1, 12), int(1, 28)], asof = [2026, int(6, 11), int(1, 28)];
    const yrs = [2026, 2025, 2024].map((yr, i) => { const base = cents(30000, 90000) * (i ? 1 : 0.8), ot = rnd() < 0.6 ? cents(500, 12000) : 0, bonus = rnd() < 0.4 ? cents(300, 6000) : 0; return { yr, base: r2(base), ot, bonus }; });
    const L = ['The Work Number', 'Employment Data Report', `Employer: ${pick(EMPLOYERS).toUpperCase()} (${int(10000, 99999)})`, `${pick(NAMES)} xxx-xx-${int(1000, 9999)}`,
      'Employment Status: Active', `Original Hire Date: ${date(...hire)}`, `Income current as of: ${date(...asof)}`, `Rate of Pay: ${money(rate)} Hourly`, 'Pay Frequency: Bi-Weekly',
      'Average Hours Worked/Pay Period: 80.00', 'Annual Income Summary', 'Year Base Overtime Commission Bonus Other Total'];
    yrs.forEach((r) => L.push(`${r.yr} ${money(r.base)} ${r.ot ? money(r.ot) : 'Data not provided'} Data not provided ${r.bonus ? money(r.bonus) : '$0.00'} $0.00 ${money(r2(r.base + r.ot + r.bonus))}`));
    return { text: L.join('\n'), type: 'wvoe', want: [['rate', rate, 'n'], ['hireDate', iso(...hire), 'd'], ['ytdThru', iso(...asof), 'd'], ['hours', 40, 'n'], ['base', yrs[0].base, 'n']] };
  },
  schedc() {
    const net = cents(-5000, 160000), dep = rnd() < 0.7 ? int(500, 25000) : 0, meals = rnd() < 0.5 ? int(100, 4000) : 0, home = rnd() < 0.4 ? int(800, 6000) : 0, gross = int(Math.max(net, 0) + 20000, Math.max(net, 0) + 200000);
    const L = ['SCHEDULE C (Form 1040)', 'Profit or Loss From Business', '(Sole Proprietorship)', `Name of proprietor ${pick(NAMES)}`, 'Part I Income',
      `7 Gross income. Add lines 5 and 6 . . . . . . 7 ${tax(gross)}`, 'Part II Expenses', `12 Depletion . . . . 12 ${dep ? '0' : '0'}`, `13 Depreciation and section 179 expense deduction 13 ${dep ? tax(dep) : '0'}`,
      `24b Deductible meals . . . 24b ${meals ? tax(meals) : '0'}`, `30 Expenses for business use of your home. Do not report these expenses elsewhere . . 30 ${home ? tax(home) : '0'}`,
      `31 Net profit or (loss). Subtract line 30 from line 29. 31 ${net < 0 ? '(' + Math.round(-net).toLocaleString('en-US') + ')' : tax(net)}`];
    const want = [['net31', Math.round(net), 'n']];
    if (dep) want.push(['depr13', dep, 'n']); if (meals) want.push(['meals', meals, 'n']); if (home) want.push(['home30', home, 'n']);
    return { text: L.join('\n'), type: 'schedc', want };
  },
  schede() {
    const rents = int(9000, 60000), ins = int(600, 3000), mi = int(2000, 18000), tx = int(1500, 12000), dep = int(2000, 15000), rep = int(0, 5000), days = int(200, 365);
    const tot = ins + mi + tx + dep + rep;
    const L = ['SCHEDULE E (Form 1040)', 'Supplemental Income and Loss', 'Part I Income or Loss From Rental Real Estate and Royalties', `2 Fair Rental Days ${days} Personal Use Days 0`,
      `3 Rents received . . . . 3 ${tax(rents)}`, `9 Insurance . . . . 9 ${tax(ins)}`, `12 Mortgage interest paid to banks, etc. 12 ${tax(mi)}`, `14 Repairs . . . . 14 ${tax(rep)}`,
      `16 Taxes . . . . 16 ${tax(tx)}`, `18 Depreciation expense or depletion 18 ${tax(dep)}`, `20 Total expenses. Add lines 5 through 19 20 ${tax(tot)}`];
    return { text: L.join('\n'), type: 'schede', want: [['rents', rents, 'n'], ['ins', ins, 'n'], ['mortInt', mi, 'n'], ['taxes', tx, 'n'], ['depr', dep, 'n'], ['totalExp', tot, 'n'], ['fairDays', days, 'n']] };
  },
  k1() {
    const s = rnd() < 0.5, ord = int(-20000, 250000), dist = int(0, 150000), own = pick([10, 25, 33.33, 50, 100]), guar = s ? 0 : (rnd() < 0.5 ? int(5000, 90000) : 0);
    const L = s ? ['Schedule K-1 (Form 1120-S)', `Shareholder's Share of Income, Deductions, Credits, etc.`, `Shareholder's percentage of stock ownership for tax year ${own}%`,
      `1 Ordinary business income (loss)`, `${ord < 0 ? '(' + Math.abs(ord).toLocaleString('en-US') + ')' : tax(ord)}`, '16 Items affecting shareholder basis', `D Distributions ${tax(dist)}`]
      : ['Schedule K-1 (Form 1065)', `Partner's Share of Current Year Income, Deductions, Credits, and Other Items`, `Profit ${own}%`, `1 Ordinary business income (loss)`, `${ord < 0 ? '(' + Math.abs(ord).toLocaleString('en-US') + ')' : tax(ord)}`,
        `4c Total guaranteed payments ${tax(guar)}`, `19 Distributions A ${tax(dist)}`];
    const want = [['ordinary', ord, 'n'], ['_own', own, 'n']]; if (dist) want.push(['dist', dist, 'n']); if (guar) want.push(['guar', guar, 'n']);
    return { text: L.join('\n'), type: s ? 'k1_1120s' : 'k1_1065', want };
  },
};
const ESTATE = ['14 Elm Street, Kingston, NY 12401', '220 Lakeview Drive, Unit 3B, Stamford, CT 06902', '9 Orchard Lane, Morristown, NJ 07960', '5512 Pine Hollow Road, Albany, NY 12203'];
const CENTER = {
  bank() {
    const end = cents(800, 250000), dep = cents(2000, 40000), big = rnd() < 0.5 ? cents(5000, 60000) : 0, y = 2026, m = int(2, 11);
    const L = [pick(['Chase', 'Wells Fargo', 'Bank of America', 'TD Bank', 'Citizens Bank']), 'Checking Account Statement', `Statement Period ${date(y, m, 1)} through ${date(y, m, 28)}`, 'Account Summary',
      `Beginning Balance ${money(cents(500, 200000))}`, `Deposits and Additions ${money(dep)}`, `Withdrawals and Subtractions ${money(cents(500, 30000))}`, `Ending Balance ${money(end)}`,
      'Transaction Detail', `${pad(m)}/03 Payroll Direct Deposit ${pick(EMPLOYERS)} ${money(cents(1200, 4000))}`];
    if (big) L.push(`${pad(m)}/14 Zelle Transfer from R Smith ${money(big)}`);
    L.push(`${pad(m)}/20 Card Purchase Shoprite ${money(cents(20, 300))}`);
    const want = [['loan:assets.liquidAssets', end, 'n'], ['calc:asset:checking', end, 'n']];
    return { text: L.join('\n'), type: 'bank', want, big };
  },
  retirement() {
    const v = cents(5000, 900000);
    const L = ['Fidelity Investments', '401(k) Retirement Savings Plan Quarterly Statement', `Beginning Balance ${money(r2(v * 0.95))}`, `Employee Contributions ${money(cents(1000, 6000))}`, `Ending Balance ${money(v)}`, `Vested Balance ${money(v)}`, `Outstanding loan balance ${money(cents(0, 9000))}`];
    return { text: L.join('\n'), type: 'retirement', want: [['loan:assets.retirementOtherAssets', v, 'n'], ['calc:asset:ret', v, 'n']] };
  },
  gift() {
    const g = int(2, 120) * 500, who = pick(NAMES);
    const L = ['GIFT LETTER', `I, ${who}, the donor, intend to give a gift in the amount of ${money(g)} to my daughter for the purchase of ${pick(ESTATE)}.`, 'No repayment of this gift is expected or implied.', `Donor's relationship to borrower: Parent`, 'Donor signature ______ Date ______'];
    return { text: L.join('\n'), type: 'gift', want: [['loan:assets.giftFunds', g, 'n']] };
  },
  contract() {
    const p = int(120, 1500) * 1000, e = int(1, 30) * 1000, s = rnd() < 0.5 ? int(1, 15) * 1000 : 0, y = 2027, m = int(1, 6), d = int(1, 28);
    const L = ['RESIDENTIAL CONTRACT OF SALE', `Property Address: ${pick(ESTATE)}`, `Purchaser: ${pick(NAMES)} Seller: ${pick(NAMES)}`, `1. Purchase Price: ${money(p)}`, `2. Earnest money deposit of ${money(e)} to be held in escrow by the listing broker.`];
    if (s) L.push(`3. Seller concession: Seller shall credit purchaser ${money(s)} toward closing costs.`);
    L.push(`4. Closing Date: on or before ${date(y, m, d)}`);
    const want = [['loan:basePurchasePrice', p, 'n'], ['loan:closing.earnestMoneyDeposit', e, 'n'], ['loan:closingDate', iso(y, m, d), 'd']]; if (s) want.push(['loan:sellerConcessionAmount', s, 'n']);
    return { text: L.join('\n'), type: 'contract', want };
  },
  lecd() {
    const rate = pick([5.875, 6.125, 6.25, 6.5, 6.625, 6.99, 7.125]), term = pick([15, 20, 30]), orig = cents(500, 6000), appr = int(450, 900), cr = int(30, 120);
    const L = ['Loan Estimate', `LOAN TERM ${term} years`, 'PURPOSE Purchase', `Interest Rate ${rate.toFixed(3)} %`, 'Loan Costs', `A. Origination Charges ${money(orig)}`, `Appraisal Fee ${money(appr)}`, `Credit Report Fee ${money(cr)}`, 'Projected Payments'];
    return { text: L.join('\n'), type: 'lecd', want: [['loan:interestRate', rate, 'n'], ['loan:termYears', term, 'n'], ['loan:closing.overrides.appraisal', appr, 'n'], ['loan:closing.overrides.creditReport', cr, 'n']] };
  },
  mortgage() {
    const pmt = cents(900, 6500), bal = cents(60000, 900000);
    const L = ['Mortgage Statement', `Statement Date ${date(2026, int(1, 11), int(1, 28))}`, `Principal Balance ${money(bal)}`, `Regular Monthly Payment ${money(pmt)}`, `Escrow Balance ${money(cents(300, 6000))}`, `Amount Due ${money(pmt)}`];
    return { text: L.join('\n'), type: 'mortgage', want: [['calc:debt', pmt, 'n']] };
  },
  appraisal() {
    const v = int(150, 1800) * 1000, units = int(1, 4), rent = rnd() < 0.5 ? int(12, 60) * 100 : 0;
    const L = ['Uniform Residential Appraisal Report', `Property Address ${pick(ESTATE)}`, `Number of Units ${units}`, 'Sales Comparison Approach', `Indicated Value by Sales Comparison Approach ${money(v, { whole: true })}`, `Opinion of Market Value ${money(v, { whole: true })} as of ${date(2026, int(1, 11), int(1, 28))}`];
    if (rent) L.push(`Opinion of Market Rent ${money(rent, { whole: true })} per month`);
    const want = [['loan:asIsValue', v, 'n'], ['loan:units', units, 'n']]; if (rent) want.push(['loan:rental.mainUnit.gross', rent, 'n']);
    return { text: L.join('\n'), type: 'appraisal', want };
  },
  tax() {
    const a = cents(1200, 32000), q = rnd() < 0.3;
    const L = ['TOWN OF NEW PALTZ', 'Property Tax Bill', `Tax Year 2026`, `Assessed Value ${money(int(100, 900) * 1000, { whole: true })}`, q ? `Quarterly installment amount due ${money(r2(a / 4))}` : `Total Annual Tax ${money(a)}`];
    return { text: L.join('\n'), type: 'tax', want: [['loan:propertyTaxAmount', q ? r2(r2(a / 4) * 4) : a, 'n']] };
  },
  insurance() {
    const p = cents(600, 9000), flood = rnd() < 0.25;
    const L = flood ? ['National Flood Insurance Program', 'Flood Insurance Declarations Page', `Policy Period ${date(2026, 6, 1)} to ${date(2027, 6, 1)}`, `Total Annual Premium ${money(p)}`]
      : ['Homeowners Policy Declarations', `Policy Period ${date(2026, 6, 1)} to ${date(2027, 6, 1)}`, `Dwelling Coverage ${money(int(200, 900) * 1000, { whole: true })}`, `Total Annual Premium ${money(p)}`];
    return { text: L.join('\n'), type: 'insurance', want: [[flood ? 'loan:escrow.annualFlood' : 'loan:insuranceAmount', p, 'n']] };
  },
  hoa() {
    const mo = cents(90, 1400), k = pick(['m', 'q']);
    const L = ['Lakeview Homeowners Association', 'Statement of Account', k === 'm' ? `Monthly Assessment ${money(mo)}` : `Quarterly Assessment ${money(r2(mo * 3))}`];
    return { text: L.join('\n'), type: 'hoa', want: [['loan:hoaMonthly', k === 'm' ? mo : r2(r2(mo * 3) / 3), 'n']] };
  },
  lease() {
    const r = int(9, 60) * 100;
    const L = ['RESIDENTIAL LEASE AGREEMENT', `Landlord: ${pick(NAMES)} Tenant: ${pick(NAMES)}`, `Premises: ${pick(ESTATE)}`, `Term: 12 months beginning ${date(2026, int(1, 11), 1)}`, `Monthly Rent: ${money(r)} due on the first of each month`, `Security deposit ${money(r * 1.5)}`];
    return { text: L.join('\n'), type: 'lease', want: [['loan:rental.mainUnit.gross', r, 'n']] };
  },
  reno() {
    const items = [['Kitchen cabinets and counters', cents(8000, 40000)], ['Bathroom remodel', cents(6000, 25000)], ['Roof replacement', cents(9000, 30000)], ['Electrical upgrade', cents(2000, 9000)]].slice(0, int(2, 4));
    const tot = r2(items.reduce((s, x) => s + x[1], 0));
    const L = [`${pick(['Ace', 'Precision', 'Hometown'])} Contractors LLC`, 'Renovation Proposal / Scope of Work', ...items.map(([l, v]) => `${l} ${money(v)}`), `Grand Total ${money(tot)}`];
    return { text: L.join('\n'), type: 'reno', want: [['loan:reno.baseCost', tot, 'n']] };
  },
  credit() {
    const s = [int(560, 820), int(560, 820), int(560, 820)], mid = [...s].sort((a, b) => a - b)[1];
    const L = ['Merged Credit Report', `Applicant ${pick(NAMES)}`, `Equifax Beacon 5.0 Score ${s[0]}`, `Experian FICO II Score ${s[1]}`, `TransUnion FICO Classic Score ${s[2]}`, 'Tradelines'];
    return { text: L.join('\n'), type: 'credit', want: [['loan:creditScore', mid, 'n']] };
  },
};

/* ---------------------------------------------------------------- OCR damage */
const JUNK = ['Page 1 of 2', 'CONFIDENTIAL', '----------', '| |', 'www.example-bank.com', '* * *'];
function damage(text, level) {
  if (level === 'clean') return text;
  let L = text.split('\n').map((l) => {
    let s = l;
    if (rnd() < 0.3) s = s.replace(/ /g, () => (rnd() < 0.2 ? '  ' : ' '));
    if (rnd() < 0.15) s = s.toUpperCase();
    if (rnd() < 0.25) s = s.replace(/\$(?=\d)/g, '');
    if (rnd() < 0.15) s = s.replace(/\d{1,3}(?:,\d{3})+/g, (m) => m.replace(/,/g, ''));   // OCR drops the thousands commas of a number
    return s;
  });
  if (rnd() < 0.5) L.splice(int(0, L.length), 0, pick(JUNK));
  if (level === 'heavy') {
    // a value pushed to its own line (before the number damage: OCR splits rows, not numbers)
    if (rnd() < 0.3) { const i = L.findIndex((l) => /[A-Za-z]{4}.*\d[\d,]*\.\d{2}\s*$/.test(l)); if (i >= 0) { const m = L[i].match(/^(.*?)\s+(\$?[\d,]+\.\d{2})\s*$/); if (m) L.splice(i, 1, m[1], m[2]); } }
    L = L.map((l) => {
      let s = l;
      // letters read for digits inside amounts
      if (rnd() < 0.25) s = s.replace(/(\d[\d,]*\.\d{2})/g, (m) => (rnd() < 0.5 ? m.replace(/0/, 'O') : rnd() < 0.5 ? m.replace(/1/, 'l') : m.replace(/5/, 'S')));
      if (rnd() < 0.15) s = s.replace(/(\d),(\d{3})/g, '$1, $2');                      // "1, 234.56"
      if (rnd() < 0.12) s = s.replace(/(\d{1,3}(?:,\d{3})*)\.(\d{2})\b/g, '$1,$2');    // "1,234,56"
      if (rnd() < 0.08) s = s.replace(/\d{1,3}(?:,\d{3})+(?=\.\d{2}\b|\.?\s*$)/g, (m) => m.replace(/,/g, '.'));   // "192.251.37", "3.160." (periods for commas)
      if (rnd() < 0.10) s = s.replace(/^(\d{1,2})([a-z]?\s+[A-Za-z].*\s)\1\s+(\(?\d)/, '$1$2$1$3');   // "16 Taxes ... 167,762." (the line number joined to the amount)
      return s;
    });
    if (rnd() < 0.3) L = L.map((l) => l.replace(/\s+/g, ' ').replace(/ ([:.])/g, '$1'));
  }
  return (rnd() < 0.3 ? L.join('\r\n') : L.join('\n'));
}

/* ---------------------------------------------------------------- --emit=N: documents for the in-page handoff test */
const EMIT = process.argv.find((a) => a.startsWith('--emit='));
if (EMIT) {
  const n = +EMIT.slice(7) || 6, out = { income: [], center: [] };
  for (const level of ['clean', 'light', 'heavy']) {
    for (const [gen, g] of Object.entries(INCOME)) for (let i = 0; i < n; i++) { const d = g(); out.income.push({ gen, level, type: d.type, text: damage(d.text, level), want: d.want }); }
    for (const [gen, g] of Object.entries(CENTER)) for (let i = 0; i < n; i++) { const d = g(); out.center.push({ gen, level, type: d.type, text: damage(d.text, level), want: d.want }); }
  }
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(path.join(root, 'tests/_out'), { recursive: true });
  writeFileSync(path.join(root, 'tests/_out/handoff-docs.json'), JSON.stringify(out));
  console.log(`wrote tests/_out/handoff-docs.json: ${out.income.length} income and ${out.center.length} Document Center documents`);
  process.exit(0);
}

/* ---------------------------------------------------------------- run */
const same = (got, want, kind) => kind === 'd' ? got === want : (typeof got === 'number' || /^-?[\d.]+$/.test(String(got))) && Math.abs(+got - want) < 0.006;
const stats = {}, fails = [], wrongList = []; let wrong = 0;
function check(group, gen, name) {
  for (const level of ['clean', 'light', 'heavy']) {
    const S = stats[name + ' / ' + level] || (stats[name + ' / ' + level] = { docs: 0, typeOk: 0, fields: 0, fieldOk: 0 });
    for (let k = 0; k < PER; k++) {
      const doc = gen(), text = damage(doc.text, level);
      S.docs++;
      let got, type;
      if (group === 'income' || group === 'suite') { const R = group === 'suite' ? SU : IC; type = R.classify(text); const F = R.extractFields(doc.type, text); got = (key) => { const f = F.find((x) => x.slot === key && !x.generic); return f && !/— check:/.test(f.label) ? f.value : undefined; }; }   // a figure the reader flags for checking is not applied: it counts as blank
      else { type = DC.detect(text, ''); const d = DC.extract({ docType: doc.type, text }); got = (key) => { const r = (d.rows || []).find((x) => x.dest === key); return r ? r.value : undefined; }; }
      if (type === doc.type) S.typeOk++; else if (fails.length < 4000) fails.push({ name, level, what: 'type', want: doc.type, got: type, text });
      for (const [key, want, kind] of doc.want) {
        S.fields++; const g = got(key);
        if (g !== undefined && !same(g, want, kind)) { wrong++; wrongList.push(`${name} [${level}] ${key}: want ${want} got ${g}`); }   // a wrong figure is worse than a blank one
        if (g !== undefined && same(g, want, kind)) S.fieldOk++;
        else if (fails.length < 4000) fails.push({ name, level, what: key, want, got: g, text });
      }
    }
  }
}
const t0 = performance.now();
for (const [n, g] of Object.entries(INCOME)) if (!ONLY || ONLY === n) check('income', g, n);
for (const [n, g] of Object.entries(CENTER)) if (!ONLY || ONLY === n) check('center', g, n);
for (const [n, g] of Object.entries(INCOME)) if (!ONLY || ONLY === n) check('suite', g, 'Loan Suite ' + n);
const ms = performance.now() - t0;

let docs = 0, typeOk = 0, fields = 0, fieldOk = 0; const byLevel = {};
console.log('document / damage            type right    figures right');
for (const [k, s] of Object.entries(stats)) {
  docs += s.docs; typeOk += s.typeOk; fields += s.fields; fieldOk += s.fieldOk;
  const lv = k.split(' / ')[1], B = byLevel[lv] || (byLevel[lv] = { f: 0, ok: 0 }); B.f += s.fields; B.ok += s.fieldOk;
  console.log(`  ${k.padEnd(26)} ${String(s.typeOk).padStart(4)}/${String(s.docs).padEnd(5)} ${String(s.fieldOk).padStart(5)}/${String(s.fields).padEnd(5)} ${(100 * s.fieldOk / s.fields).toFixed(1)}%`);
}
for (const [lv, b] of Object.entries(byLevel)) console.log(`  ${lv.padEnd(8)} figures right ${b.ok}/${b.f} (${(100 * b.ok / b.f).toFixed(1)}%)`);
console.log(`OCR slam: ${docs} documents, type right ${typeOk}/${docs} (${(100 * typeOk / docs).toFixed(1)}%), figures right ${fieldOk}/${fields} (${(100 * fieldOk / fields).toFixed(1)}%), wrong figures ${wrong} (the rest left blank for you to fill), ${(ms / docs).toFixed(2)} ms per document`);
wrongList.slice(0, process.env.WRONGALL ? 1e6 : 12).forEach((w) => console.log('  WRONG ' + w));
// pass: the type right on 99.5% of documents, 98.5% of figures read (a blank or a figure flagged "check" is safe: you fill it in), and wrong figures - the dangerous kind - under 1 in 2,000
process.exitCode = typeOk / docs >= 0.995 && fieldOk / fields >= 0.985 && wrong <= fields * 0.0005 ? 0 : 1;
if (SHOW) {
  const seen = {};
  for (const f of fails) { const k = f.name + '|' + f.level + '|' + f.what; seen[k] = (seen[k] || 0) + 1; if (seen[k] > 2) continue;
    console.log(`\nMISS ${f.name} [${f.level}] ${f.what}: want ${f.want} got ${f.got}\n  ${f.text.replace(/\r/g, '').split('\n').join('\n  ')}`); }
}
export { stats };
