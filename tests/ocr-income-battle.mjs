// Income document battle test. The income documents a loan file really holds, each in the layouts payroll services, the
// IRS and verifiers print (ADP, Paychex, Gusto, Workday, Dayforce stubs; the IRS W-2 grid; The Work Number and Fannie Mae
// Form 1005; the IRS Schedule C, Schedule E, K-1 1065 / 1120-S and Form 1120 pages with their two-column rows, dotted
// leaders, blank lines and line numbers), read by every reader that takes income documents:
//   - the Income Calculator's reader (income-calculator.html),
//   - the Loan Suite's Documents reader (assets/js/06-...),
//   - the Document Center, which sorts the document and hands it to the Income Calculator.
// Each document goes through four levels of OCR damage: clean, light, heavy, brutal (heavy plus "$" read as "S", table
// rules read as "|", letters misread inside the labels, a value pushed to the next line).
// Every figure is checked to the cent; dates exactly; and some figures must NOT be read (a rate where the stub has no
// rate column, a depletion line left blank). A wrong figure is the dangerous kind and is counted on its own.
// Run: node tests/ocr-income-battle.mjs [documents-per-layout-and-level] [--seed=N] [--fails] [--type=paystub] [--emit]
//   --emit writes tests/_out/income-battle.json for the real-OCR run in the page: (await import('/tests/ocr-real.mjs')).run({src: 'income-battle'})
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PER = +(process.argv.find((a) => /^\d+$/.test(a)) || 40);
const ONLY = (process.argv.find((a) => a.startsWith('--type=')) || '').slice(7);
const SHOW = process.argv.includes('--fails');
const EMIT = process.argv.includes('--emit');
let seed = +((process.argv.find((a) => a.startsWith('--seed=')) || '').slice(7) || 57340001);

/* ---------------------------------------------------------------- the readers */
function incomeReader(file) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const a = html.indexOf('/* ---------- number / line helpers ---------- */'), b = html.indexOf('/* ---------- reading the file ---------- */');
  const c = html.indexOf('const AUS_LABEL'), d = html.indexOf('</script>', c);
  const ctx = { console, window: {} }; vm.createContext(ctx);
  vm.runInContext(html.slice(a, b) + '\n' + html.slice(c, d) + '\nthis.__R={classify,extractFields};', ctx);
  return ctx.__R;
}
function docCenter() {
  const store = {}, el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
  const doc = { readyState: 'loading', addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: el, head: el(), body: el(), documentElement: el() };
  const ctx = { console, document: doc, location: { pathname: '/doc-organizer.html', search: '' }, localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, navigator: {}, setTimeout, clearTimeout, Promise };
  ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, 'assets/doc-center.js'), 'utf8'), ctx);
  return ctx;
}
function suiteReader(fix) {
  const ctx = { console, window: {}, document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} } };
  ctx.window.MTOcrFix = fix; ctx.MTOcrFix = fix; vm.createContext(ctx);
  let pre = ''; try { pre = readFileSync(path.join(root, 'assets/income-reader.js'), 'utf8') + '\n;var MTIncomeReader = window.MTIncomeReader;\n'; } catch (e) {}
  vm.runInContext(pre + readFileSync(path.join(root, 'assets/js/06-docs-let-auto-apply-0-window-pdfjsli.js'), 'utf8') + '\n;this.__R={classify,extractFields};', ctx);
  return ctx.__R;
}
const IC = incomeReader('income-calculator.html');
const DCX = docCenter(), DC = DCX.MTDocs;
const SU = suiteReader(DCX.MTOcrFix);

/* ---------------------------------------------------------------- random, fixed seed */
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => Math.floor(lo + rnd() * (hi - lo + 1));
const cents = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;
const r2 = (v) => Math.round(v * 100) / 100;
const money = (v, o = {}) => { const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: o.whole ? 0 : 2, maximumFractionDigits: o.whole ? 0 : 2 }); return (v < 0 ? '-' : '') + (o.$ === false ? '' : '$') + s; };
const tax = (v) => (v < 0 ? '(' + Math.round(-v).toLocaleString('en-US') + ')' : Math.round(v).toLocaleString('en-US') + (rnd() < 0.5 ? '.' : ''));
const pad = (n) => String(n).padStart(2, '0');
const date = (y, m, d) => `${pad(m)}/${pad(d)}/${y}`, iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NAMES = ['Maria Gonzalez', 'James Carter', 'Aisha Patel', 'Robert Chen', 'Linda Okafor', 'David Kowalski', 'Sarah Nguyen', 'Michael Rossi'];
const EMPLOYERS = ['Hudson Valley Health System', 'Brightline Logistics Inc', 'Summit Ridge School District', 'Atlas Manufacturing Co', 'Northwind Software LLC', 'Coastal Grocers Inc'];
const ADDR = ['14 Elm Street, Kingston, NY 12401', '220 Lakeview Drive, Stamford, CT 06902', '9 Orchard Lane, Morristown, NJ 07960', '5512 Pine Hollow Road, Albany, NY 12203'];
const rate4 = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 10000) / 10000;   // payroll prints rates to 4 places: 23.0769
const r4s = (v) => v.toFixed(4);

/* ---------------------------------------------------------------- the documents
   Each layout returns {text, type, center, want}; want rows are [slot, value, kind, col]: kind 'n' a number, 'd' an ISO
   date, 'none' a figure the reader must not produce; col the year column of a verification table (y1 / y2 / y3). */
function payDates() {
  const y = 2026, m = int(2, 11), d = int(1, 14), e = d + 13;
  return { y, m, d, e, pay: Math.min(28, e + 5), periods: (m - 1) * 2 + (d > 7 ? 2 : 1) };
}
const DEDUCT = () => [['Federal Income Tax', cents(90, 900)], ['Social Security Tax', cents(60, 500)], ['Medicare Tax', cents(15, 120)], [pick(['NY State Income Tax', 'State Income Tax', 'CT Income Tax']), cents(30, 300)], [pick(['401(k)', 'Dental', 'Medical Pre-Tax', 'Vision']), cents(10, 300)]];
const LAYOUTS = {
  paystub: {
    adp() {   // ADP: "rate hours this period year to date", rates to four places, holiday and PTO rows, statutory deductions below
      const D = payDates(), rate = rate4(16, 62), hrs = 80, cur = r2(rate * hrs), ytd = r2(cur * D.periods), ot = rnd() < 0.5 ? r2(rate * 1.5 * int(20, 160) / 4) : 0, bonus = rnd() < 0.3 ? cents(300, 6000) : 0;
      const L = [pick(EMPLOYERS), 'Earnings Statement', `Company Code RW/${pick(['ABC', 'HVX', 'NWS'])} ${int(10000000, 99999999)}`, `Period Beginning: ${date(D.y, D.m, D.d)}`, `Period Ending: ${date(D.y, D.m, D.e)}`, `Pay Date: ${date(D.y, D.m, D.pay)}`, `${pick(NAMES)}`,
        'Earnings rate hours this period year to date', `Regular ${r4s(rate)} ${hrs.toFixed(2)} ${money(cur, { $: false })} ${money(ytd, { $: false })}`];
      if (ot) L.push(`Overtime ${r4s(r2(rate * 1.5))} 4.00 ${money(r2(rate * 6), { $: false })} ${money(ot, { $: false })}`);
      if (rnd() < 0.5) L.push(`Holiday ${r4s(rate)} 8.00 ${money(r2(rate * 8), { $: false })} ${money(r2(rate * 8 * int(1, 6)), { $: false })}`);
      if (bonus) L.push(`Bonus ${money(bonus, { $: false })} ${money(bonus, { $: false })}`);
      L.push(`Gross Pay $${money(cur, { $: false })} ${money(r2(ytd + ot + bonus), { $: false })}`, 'Statutory Deductions');
      DEDUCT().forEach(([l, v]) => L.push(`${l} -${v.toFixed(2)} ${money(r2(v * D.periods), { $: false })}`));
      L.push(`Net Pay $${money(r2(cur * 0.72), { $: false })}`);
      const want = [['base', ytd, 'n'], ['rate', rate, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd']]; if (ot) want.push(['ot', ot, 'n']); if (bonus) want.push(['bonus', bonus, 'n']);
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want };
    },
    paychex() {   // Paychex: "Description Hours Rate Current YTD", the three dates on one line in either order
      const D = payDates(), rate = cents(15, 55), hrs = 80, cur = r2(rate * hrs), ytd = r2(cur * D.periods), ot = rnd() < 0.5 ? r2(rate * 1.5 * int(8, 90)) : 0;
      const dl = rnd() < 0.5 ? `Check Date: ${date(D.y, D.m, D.pay)} Period Start: ${date(D.y, D.m, D.d)} Period End: ${date(D.y, D.m, D.e)}` : `Period Start: ${date(D.y, D.m, D.d)} Period End: ${date(D.y, D.m, D.e)} Check Date: ${date(D.y, D.m, D.pay)}`;
      const L = [pick(EMPLOYERS), 'PAYCHEX', dl, `Employee: ${pick(NAMES)} ID: ${int(1000, 9999)}`, 'EARNINGS', 'Description Hours Rate Current YTD', `Regular ${hrs.toFixed(2)} ${rate.toFixed(2)} ${money(cur, { $: false })} ${money(ytd, { $: false })}`];
      if (ot) L.push(`Overtime 6.00 ${r2(rate * 1.5).toFixed(2)} ${money(r2(rate * 9), { $: false })} ${money(ot, { $: false })}`);
      L.push(`Total Gross ${money(cur, { $: false })} ${money(r2(ytd + ot), { $: false })}`, 'WITHHOLDINGS');
      DEDUCT().forEach(([l, v]) => L.push(`${l} ${v.toFixed(2)} ${money(r2(v * D.periods), { $: false })}`));
      L.push(`NET PAY ${money(r2(cur * 0.73), { $: false })}`);
      const want = [['base', ytd, 'n'], ['rate', rate, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd']]; if (ot) want.push(['ot', ot, 'n']);
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want };
    },
    gusto() {   // Gusto, salaried, semi-monthly: dates written "Oct 1, 2026 - Oct 15, 2026"
      const y = 2026, m = int(2, 11), half = rnd() < 0.5, d1 = half ? 16 : 1, d2 = half ? 28 : 15, per = cents(1800, 9000), n = (m - 1) * 2 + (half ? 2 : 1), ytd = r2(per * n), bonus = rnd() < 0.3 ? cents(500, 5000) : 0;
      const dash = pick([' - ', ' – ', ' to ']), longM = rnd() < 0.3, M = longM ? MONTH[m - 1] : MON[m - 1];
      const L = [pick(EMPLOYERS), `Pay stub for ${pick(NAMES)}`, `Pay period: ${M} ${d1}, ${y}${dash}${M} ${d2}, ${y}`, `Pay day: ${MON[Math.min(11, m)]} ${int(1, 5)}, ${y}`, 'Earnings', 'Description Rate Hours Current YTD', `Salary ${money(per)} ${money(ytd)}`];
      if (bonus) L.push(`Bonus ${money(bonus)} ${money(bonus)}`);
      L.push(`Gross Earnings ${money(r2(per + bonus))} ${money(r2(ytd + bonus))}`, 'Employee Taxes');
      DEDUCT().slice(0, 3).forEach(([l, v]) => L.push(`${l} ${money(v)} ${money(r2(v * n))}`));
      L.push(`Net Pay ${money(r2(per * 0.71))}`);
      const want = [['base', ytd, 'n'], ['ytdThru', iso(y, m, d2), 'd'], ['rate', null, 'none']]; if (bonus) want.push(['bonus', bonus, 'n']);
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want };
    },
    workday() {   // Workday: the pay period in a header row with its values on the row below; each earnings row carries its dates
      const D = payDates(), rate = pick([cents(18, 70), rate4(18, 70)]), hrs = 80, cur = r2(rate * hrs), ytd = r2(cur * D.periods), ot = rnd() < 0.5 ? r2(rate * 1.5 * int(8, 90)) : 0;
      const rng = `${date(D.y, D.m, D.d)} - ${date(D.y, D.m, D.e)}`;
      const L = [pick(EMPLOYERS), 'Pay Slip', 'Name Employee ID Pay Period Begin Pay Period End Check Date Check Number', `${pick(NAMES)} ${int(100000, 999999)} ${date(D.y, D.m, D.d)} ${date(D.y, D.m, D.e)} ${date(D.y, D.m, D.pay)} ${int(1000, 9999)}`,
        'Earnings', 'Description Dates Hours Rate Amount YTD', `Regular ${rng} ${hrs} ${String(rate)} ${money(cur, { $: false })} ${money(ytd, { $: false })}`];
      if (ot) L.push(`Overtime ${rng} 6 ${String(r2(rate * 1.5))} ${money(r2(rate * 9), { $: false })} ${money(ot, { $: false })}`);
      L.push('Employee Taxes'); DEDUCT().slice(0, 3).forEach(([l, v]) => L.push(`${l} ${v.toFixed(2)} ${money(r2(v * D.periods), { $: false })}`));
      L.push(`Gross Pay ${money(cur, { $: false })} Net Pay ${money(r2(cur * 0.74), { $: false })}`);
      const want = [['base', ytd, 'n'], ['rate', rate, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd']]; if (ot) want.push(['ot', ot, 'n']);
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want };
    },
    twocol() {   // earnings on the left and deductions on the right: OCR reads both columns into one line
      const D = payDates(), rate = cents(15, 60), hrs = 80, cur = r2(rate * hrs), ytd = r2(cur * D.periods), ot = r2(rate * 1.5 * int(8, 90)), dd = DEDUCT();
      const L = [pick(EMPLOYERS), 'Earnings Statement', `Pay Period: ${date(D.y, D.m, D.d)} - ${date(D.y, D.m, D.e)} Pay Date: ${date(D.y, D.m, D.pay)}`, `Employee Name: ${pick(NAMES)}`,
        'Earnings Rate Hours Current YTD Deductions Current YTD',
        `Regular ${rate.toFixed(2)} ${hrs.toFixed(2)} ${money(cur, { $: false })} ${money(ytd, { $: false })} ${dd[0][0]} ${dd[0][1].toFixed(2)} ${money(r2(dd[0][1] * D.periods), { $: false })}`,
        `Overtime ${r2(rate * 1.5).toFixed(2)} 6.00 ${money(r2(rate * 9), { $: false })} ${money(ot, { $: false })} ${dd[1][0]} ${dd[1][1].toFixed(2)} ${money(r2(dd[1][1] * D.periods), { $: false })}`,
        `Gross Pay ${money(r2(cur + rate * 9), { $: false })} ${money(r2(ytd + ot), { $: false })} ${dd[2][0]} ${dd[2][1].toFixed(2)} ${money(r2(dd[2][1] * D.periods), { $: false })}`,
        `Net Pay ${money(r2(cur * 0.72), { $: false })}`];
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want: [['base', ytd, 'n'], ['rate', rate, 'n'], ['ot', ot, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd']] };
    },
    dayforce() {   // Dayforce: current hours / amount and YTD hours / amount, no rate column
      const D = payDates(), rate = cents(15, 60), hrs = 80, cur = r2(rate * hrs), ytd = r2(cur * D.periods);
      const L = [pick(EMPLOYERS), 'Statement of Earnings', `Pay Period End Date: ${date(D.y, D.m, D.e)}`, `Pay Date: ${date(D.y, D.m, D.pay)}`, 'Earnings Current Hours Current Amount YTD Hours YTD Amount',
        `Regular ${hrs.toFixed(2)} ${money(cur, { $: false })} ${(hrs * D.periods).toFixed(2)} ${money(ytd, { $: false })}`, `Total Earnings ${hrs.toFixed(2)} ${money(cur, { $: false })} ${(hrs * D.periods).toFixed(2)} ${money(ytd, { $: false })}`, `Net Pay ${money(r2(cur * 0.7), { $: false })}`];
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want: [['base', ytd, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd'], ['rate', null, 'none']] };
    },
    commission() {   // a draw against commission
      const D = payDates(), per = cents(1500, 4000), ytd = r2(per * D.periods), comm = cents(2000, 90000);
      const L = [pick(EMPLOYERS), 'Earnings Statement', `Pay Period: ${date(D.y, D.m, D.d)} - ${date(D.y, D.m, D.e)}`, `Pay Date: ${date(D.y, D.m, D.pay)}`, 'Earnings Current Year to Date',
        `Base Salary ${money(per)} ${money(ytd)}`, `Commission ${money(r2(comm / D.periods))} ${money(comm)}`, `Gross Pay ${money(r2(per + comm / D.periods))} ${money(r2(ytd + comm))}`, `Net Pay ${money(r2(per * 0.7))}`];
      return { text: L.join('\n'), type: 'paystub', center: 'paystub', want: [['base', ytd, 'n'], ['comm', comm, 'n'], ['ytdThru', iso(D.y, D.m, D.e), 'd']] };
    },
  },
  w2: {
    grid() {   // the IRS grid as OCR reads it: box labels beside the SSN / EIN / employer, amounts on the row below
      const y = pick([2024, 2025]), w = cents(28000, 240000), k = rnd() < 0.6 ? cents(1000, 23000) : 0, ss = Math.min(r2(w + k), 176100), med = r2(w + k), emp = pick(EMPLOYERS);
      const L = [`a Employee's social security number XXX-XX-${int(1000, 9999)} OMB No. 1545-0008`, `b Employer identification number (EIN) ${int(10, 99)}-${int(1000000, 9999999)} 1 Wages, tips, other compensation 2 Federal income tax withheld`,
        `${money(w, { $: false })} ${money(r2(w * 0.12), { $: false })}`, `c Employer's name, address, and ZIP code 3 Social security wages 4 Social security tax withheld`, `${emp} ${money(ss, { $: false })} ${money(r2(ss * 0.062), { $: false })}`,
        `${pick(ADDR)} 5 Medicare wages and tips 6 Medicare tax withheld`, `${money(med, { $: false })} ${money(r2(med * 0.0145), { $: false })}`, '7 Social security tips 8 Allocated tips', 'd Control number 9 10 Dependent care benefits',
        `e Employee's first name and initial Last name Suff. 11 Nonqualified plans 12a See instructions for box 12`, `${pick(NAMES)} ${k ? 'D ' + money(k, { $: false }) : ''}`.trim(), `Form W-2 Wage and Tax Statement ${y}`, 'Copy B—To Be Filed With Employee\'s FEDERAL Tax Return.'];
      return { text: L.join('\n'), type: 'w2', center: 'w2', want: [['base', w, 'n'], ['_ss', ss, 'n'], ['_med', med, 'n']] };
    },
    column() {   // read down the boxes: each label, then its amount
      const y = pick([2024, 2025]), w = cents(28000, 240000), ss = Math.min(r2(w + cents(0, 9000)), 176100), med = r2(w + cents(0, 9000));
      const L = [`${y} W-2 and EARNINGS SUMMARY`, 'Wage and Tax Statement', '1 Wages, tips, other compensation', money(w, { $: false }), '2 Federal income tax withheld', money(r2(w * 0.12), { $: false }), '3 Social security wages', money(ss, { $: false }),
        '4 Social security tax withheld', money(r2(ss * 0.062), { $: false }), '5 Medicare wages and tips', money(med, { $: false }), '6 Medicare tax withheld', money(r2(med * 0.0145), { $: false })];
      return { text: L.join('\n'), type: 'w2', center: 'w2', want: [['base', w, 'n'], ['_ss', ss, 'n'], ['_med', med, 'n']] };
    },
    sameline() {   // a filled-in PDF: both boxes of a row and their amounts on one line
      const y = pick([2024, 2025]), w = cents(28000, 240000), ss = Math.min(r2(w + cents(0, 9000)), 176100), med = r2(w + cents(0, 9000));
      const L = [`Form W-2 Wage and Tax Statement ${y}`, `c Employer's name, address, and ZIP code`, pick(EMPLOYERS), `1 Wages, tips, other compensation ${money(w, { $: false })} 2 Federal income tax withheld ${money(r2(w * 0.12), { $: false })}`,
        `3 Social security wages ${money(ss, { $: false })} 4 Social security tax withheld ${money(r2(ss * 0.062), { $: false })}`, `5 Medicare wages and tips ${money(med, { $: false })} 6 Medicare tax withheld ${money(r2(med * 0.0145), { $: false })}`];
      return { text: L.join('\n'), type: 'w2', center: 'w2', want: [['base', w, 'n'], ['_ss', ss, 'n'], ['_med', med, 'n']] };
    },
  },
  wvoe: {
    twn() {   // The Work Number: a year table with "Data not provided" cells
      const rate = cents(18, 60), hire = [int(2008, 2022), int(1, 12), int(1, 28)], asof = [2026, int(6, 11), int(1, 28)];
      const yrs = [2026, 2025, 2024].map((yr, i) => ({ yr, base: r2(cents(30000, 90000) * (i ? 1 : 0.8)), ot: rnd() < 0.6 ? cents(500, 12000) : 0, bonus: rnd() < 0.4 ? cents(300, 6000) : 0 }));
      const L = ['The Work Number', 'Employment Data Report', `Employer: ${pick(EMPLOYERS).toUpperCase()} (${int(10000, 99999)})`, `${pick(NAMES)} xxx-xx-${int(1000, 9999)}`, 'Employment Status: Active', `Original Hire Date: ${date(...hire)}`,
        `Income current as of: ${date(...asof)}`, `Rate of Pay: ${money(rate)} Hourly`, 'Pay Frequency: Bi-Weekly', 'Average Hours Worked/Pay Period: 80.00', 'Annual Income Summary', 'Year Base Overtime Commission Bonus Other Total'];
      yrs.forEach((r) => L.push(`${r.yr} ${money(r.base)} ${r.ot ? money(r.ot) : 'Data not provided'} Data not provided ${r.bonus ? money(r.bonus) : '$0.00'} $0.00 ${money(r2(r.base + r.ot + r.bonus))}`));
      const want = [['rate', rate, 'n'], ['hireDate', iso(...hire), 'd'], ['ytdThru', iso(...asof), 'd'], ['hours', 40, 'n']];
      yrs.forEach((r, i) => { want.push(['base', r.base, 'n', 'y' + (i + 1)]); if (r.ot) want.push(['ot', r.ot, 'n', 'y' + (i + 1)]); if (r.bonus) want.push(['bonus', r.bonus, 'n', 'y' + (i + 1)]); });
      return { text: L.join('\n'), type: 'wvoe', center: 'voe', want };
    },
    f1005() {   // Fannie Mae Form 1005: rows by pay type, columns year to date / past year / past year
      const hourly = rnd() < 0.4, rate = hourly ? cents(18, 60) : int(35, 160) * 1000, hire = [int(2008, 2023), int(1, 12), int(1, 28)], thru = [2026, int(6, 11), int(1, 28)];
      const cols = [0.8, 1, 0.97].map((f) => ({ base: r2(cents(40000, 150000) * f), ot: rnd() < 0.5 ? cents(500, 9000) : 0, comm: 0, bonus: rnd() < 0.5 ? cents(500, 8000) : 0 }));
      const box = (on) => (on ? pick(['[X]', 'X', '☒', '[x]']) : pick(['[ ]', '☐', '']));
      const cell = (v) => `$ ${money(v, { $: false })}`;
      const L = ['Request for Verification of Employment', 'Fannie Mae Form 1005 July 96', 'Part II - Verification of Present Employment',
        `9. Applicant's Date of Employment ${date(...hire)} 10. Present Position ${pick(['Registered Nurse', 'Warehouse Supervisor', 'Teacher', 'Engineer'])} 11. Probability of Continued Employment Good`,
        '12A. Current Gross Base Pay (Enter Amount and Check Period) 13. For Military Personnel Only', `${box(!hourly)} Annual ${box(hourly)} Hourly ${box(false)} Monthly ${box(false)} Weekly ${box(false)} Other (Specify)`.replace(/\s+/g, ' ').trim(), cell(rate),
        hourly ? '12C. For Hourly Workers: Average Hours Per Week 40' : '', '12B. Gross Earnings', 'Type Year To Date Past Year 2025 Past Year 2024', `Thru ${date(...thru)}`,
        `Base Pay ${cols.map((c) => cell(c.base)).join(' ')}`, `Overtime ${cols.map((c) => cell(c.ot)).join(' ')}`, `Commissions ${cols.map((c) => cell(c.comm)).join(' ')}`, `Bonus ${cols.map((c) => cell(c.bonus)).join(' ')}`,
        `Total ${cols.map((c) => cell(r2(c.base + c.ot + c.comm + c.bonus))).join(' ')}`, '14. If Overtime or Bonus is Applicable, Is Its Continuance Likely? Overtime Yes Bonus Yes',
        `16. Date of applicant's last pay increase ${date(2026, 1, 1)} 17. Amount of last pay increase $ ${money(cents(500, 4000), { $: false })}`].filter(Boolean);
      const want = [['rate', rate, 'n'], ['freq', hourly ? 'Hourly' : 'Annually', 'd'], ['hireDate', iso(...hire), 'd'], ['ytdThru', iso(...thru), 'd']];
      cols.forEach((c, i) => { want.push(['base', c.base, 'n', 'y' + (i + 1)]); if (c.ot) want.push(['ot', c.ot, 'n', 'y' + (i + 1)]); if (c.bonus) want.push(['bonus', c.bonus, 'n', 'y' + (i + 1)]); });
      return { text: L.join('\n'), type: 'wvoe', center: 'voe', want };
    },
  },
  schedc: {
    irs() {   // Part II as OCR reads it: two expense columns per row, dotted leaders, blank or zero lines
      const y = pick([2024, 2025]), gross = int(40000, 400000), depl = pick([0, 0, 0, int(200, 3000)]), dep = rnd() < 0.7 ? int(500, 25000) : 0, meals = rnd() < 0.6 ? int(100, 4000) : 0, home = rnd() < 0.5 ? int(300, 1500) : 0, miles = rnd() < 0.5 ? int(1200, 30000) : 0;
      const exp = int(5000, Math.max(6000, gross - 5000)), tent = gross - exp, net = tent - home;
      const blank = (v) => (v ? tax(v) : pick(['', '0', '-0-']));
      const L = [`SCHEDULE C (Form 1040) ${y}`, 'Profit or Loss From Business', '(Sole Proprietorship)', `Name of proprietor ${pick(NAMES)}`, 'Part I Income', `1 Gross receipts or sales. See instructions for line 1 and check the box if this income was reported to you on Form W-2 . . 1 ${tax(gross)}`,
        `7 Gross income. Add lines 5 and 6 . . . . . . . . 7 ${tax(gross)}`, 'Part II Expenses. Enter expenses for business use of your home only on line 30.',
        `8 Advertising . . . . . 8 ${tax(int(100, 3000))} 18 Office expense (see instructions) . . 18 ${tax(int(100, 2000))}`, `9 Car and truck expenses (see instructions) . . 9 ${tax(int(500, 9000))} 19 Pension and profit-sharing plans . 19`,
        `10 Commissions and fees . 10 20 Rent or lease (see instructions):`, `11 Contract labor (see instructions) 11 ${tax(int(200, 9000))} a Vehicles, machinery, and equipment 20a`,
        `12 Depletion . . . . . 12 ${blank(depl)} b Other business property . . . 20b ${tax(int(1000, 24000))}`, `13 Depreciation and section 179 expense deduction (not included in Part III) (see instructions) . . . 13 ${blank(dep)} 21 Repairs and maintenance . . . 21 ${tax(int(100, 4000))}`,
        `14 Employee benefit programs (other than on line 19) . . 14 22 Supplies (not included in Part III) . . 22 ${tax(int(100, 5000))}`, `15 Insurance (other than health) 15 ${tax(int(300, 4000))} 23 Taxes and licenses . . . 23 ${tax(int(50, 3000))}`,
        `24 Travel and meals: a Travel . . . 24a ${tax(int(0, 5000))}`, `b Deductible meals (see instructions) . . . 24b ${blank(meals)}`, `28 Total expenses before expenses for business use of home. Add lines 8 through 27b . . 28 ${tax(exp)}`,
        `29 Tentative profit or (loss). Subtract line 28 from line 7 . . . 29 ${tax(tent)}`, '30 Expenses for business use of your home. Do not report these expenses elsewhere. Attach Form 8829 unless using the simplified method. See instructions.',
        `Simplified method filers only: Enter the total square footage of (a) your home: ${int(900, 3500).toLocaleString('en-US')} and (b) the part of your home used for business: ${int(100, 400)} . Use the Simplified Method Worksheet in the instructions to figure the amount to enter on line 30 . . . 30 ${blank(home)}`,
        '31 Net profit or (loss). Subtract line 30 from line 29.', '• If a profit, enter on both Schedule 1 (Form 1040), line 3, and on Schedule SE, line 2. (If you checked the box on line 1, see instructions.) Estates and trusts, enter on Form 1041, line 3.',
        `• If a loss, you must go to line 32. } 31 ${tax(net)}`, 'Part IV Information on Your Vehicle.', `44 Of the total number of miles you drove your vehicle during ${y}, enter the number of miles you used your vehicle for:`,
        `a Business ${miles ? miles.toLocaleString('en-US') : ''} b Commuting (see instructions) ${int(0, 4000).toLocaleString('en-US')} c Other ${int(0, 6000).toLocaleString('en-US')}`];
      const want = [['net31', net, 'n'], ['depl12', depl || null, depl ? 'n' : 'none'], ['depr13', dep || null, dep ? 'n' : 'none'], ['meals', meals || null, meals ? 'n' : 'none'], ['home30', home || null, home ? 'n' : 'none']];
      if (miles) want.push(['miles', miles, 'n']);
      return { text: L.join('\n'), type: 'schedc', center: 'taxreturn', want };
    },
    simple() {   // a tax-software summary: one line each, a loss in parentheses
      const net = cents(-30000, 160000), dep = rnd() < 0.7 ? int(500, 25000) : 0, meals = rnd() < 0.5 ? int(100, 4000) : 0;
      const L = ['SCHEDULE C (Form 1040)', 'Profit or Loss From Business', `Principal business or profession ${pick(['Consulting', 'Landscaping', 'Trucking', 'Real estate sales'])}`, `7 Gross income 7 ${tax(int(Math.max(net, 0) + 20000, Math.max(net, 0) + 200000))}`,
        `13 Depreciation and section 179 expense deduction 13 ${dep ? tax(dep) : '0'}`, `24b Deductible meals 24b ${meals ? tax(meals) : '0'}`, `31 Net profit or (loss) 31 ${tax(Math.round(net))}`];
      const want = [['net31', Math.round(net), 'n']]; if (dep) want.push(['depr13', dep, 'n']); if (meals) want.push(['meals', meals, 'n']);
      return { text: L.join('\n'), type: 'schedc', center: 'taxreturn', want };
    },
  },
  schede: {
    irs() {   // Part I with two properties in columns A and B; the days table with its rows below
      const P = [0, 1].map(() => { const rents = int(9000, 60000), ins = int(600, 3000), mi = int(1000, 18000), tx = int(1500, 12000), dep = int(2000, 15000), rep = int(0, 5000); return { rents, ins, mi, tx, dep, rep, tot: ins + mi + tx + dep + rep, days: int(200, 365) }; });
      const two = rnd() < 0.6, row = (n, lbl, k) => `${n} ${lbl} . . . ${n} ${tax(P[0][k])}${two ? ' ' + tax(P[1][k]) : ''}`;
      const L = ['SCHEDULE E (Form 1040) 2025', 'Supplemental Income and Loss', 'Part I Income or Loss From Rental Real Estate and Royalties', `1a Physical address of each property (street, city, state, ZIP code)`, `A ${ADDR[0]}`, two ? `B ${ADDR[2]}` : '',
        '2 For each property listed above, report the number of fair rental and personal use days. Check the QJV box only if you meet the requirements to file as a qualified joint venture. See instructions. Fair Rental Days Personal Use Days QJV',
        `A ${P[0].days} 0`, two ? `B ${P[1].days} 0` : '', 'Income: Properties: A B C', row(3, 'Rents received', 'rents'), '4 Royalties received . . . 4', 'Expenses:', row(9, 'Insurance', 'ins'),
        row(12, 'Mortgage interest paid to banks, etc. (see instructions)', 'mi'), row(14, 'Repairs', 'rep'), row(16, 'Taxes', 'tx'), row(18, 'Depreciation expense or depletion', 'dep'), row(20, 'Total expenses. Add lines 5 through 19', 'tot'),
        `21 Subtract line 20 from line 3 (rents) and/or 4 (royalties). If result is a (loss), see instructions to find out if you must file Form 6198 . . 21 ${tax(P[0].rents - P[0].tot)}${two ? ' ' + tax(P[1].rents - P[1].tot) : ''}`].filter(Boolean);
      const a = P[0];
      return { text: L.join('\n'), type: 'schede', center: 'taxreturn', want: [['rents', a.rents, 'n'], ['ins', a.ins, 'n'], ['mortInt', a.mi, 'n'], ['taxes', a.tx, 'n'], ['depr', a.dep, 'n'], ['totalExp', a.tot, 'n'], ['fairDays', a.days, 'n']] };
    },
    simple() {
      const rents = int(9000, 60000), ins = int(600, 3000), mi = int(2000, 18000), tx = int(1500, 12000), dep = int(2000, 15000), rep = int(0, 5000), days = int(200, 365), tot = ins + mi + tx + dep + rep;
      const L = ['SCHEDULE E (Form 1040)', 'Supplemental Income and Loss', `2 Fair Rental Days ${days} Personal Use Days 0`, `3 Rents received . . . . 3 ${tax(rents)}`, `9 Insurance . . . . 9 ${tax(ins)}`, `12 Mortgage interest paid to banks, etc. 12 ${tax(mi)}`,
        `14 Repairs . . . . 14 ${tax(rep)}`, `16 Taxes . . . . 16 ${tax(tx)}`, `18 Depreciation expense or depletion 18 ${tax(dep)}`, `20 Total expenses. Add lines 5 through 19 20 ${tax(tot)}`];
      return { text: L.join('\n'), type: 'schede', center: 'taxreturn', want: [['rents', rents, 'n'], ['ins', ins, 'n'], ['mortInt', mi, 'n'], ['taxes', tx, 'n'], ['depr', dep, 'n'], ['totalExp', tot, 'n'], ['fairDays', days, 'n']] };
    },
  },
  k1_1065: {
    irs() {   // the IRS K-1 (1065): two box columns, each amount on the row below; profit share at beginning and end of year
      const ord = int(-20000, 260000), gs = rnd() < 0.6 ? int(5000, 90000) : 0, gc = gs && rnd() < 0.3 ? int(1000, 20000) : 0, dist = rnd() < 0.8 ? int(1000, 150000) : 0;
      const end = pick([10, 25, 33.333333, 50, 75, 100]), beg = rnd() < 0.3 ? pick([0, 20, 40, 60]) : end, pct = (v) => `${v.toFixed(6)} %`;
      const L = ['Schedule K-1 (Form 1065) 2025', 'Department of the Treasury Internal Revenue Service', "Partner's Share of Income, Deductions, Credits, and Other Items", 'Part I Information About the Partnership',
        `A Partnership's employer identification number ${int(10, 99)}-${int(1000000, 9999999)}`, "B Partnership's name, address, city, state, and ZIP code", `${pick(['Northwind', 'Hudson', 'Atlas'])} Partners LLC`, 'Part II Information About the Partner',
        "J Partner's share of profit, loss, and capital (see instructions): Beginning Ending", `Profit ${pct(beg)} ${pct(end)}`, `Loss ${pct(beg)} ${pct(end)}`, `Capital ${pct(beg)} ${pct(end)}`,
        "Part III Partner's Share of Current Year Income, Deductions, Credits, and Other Items", '1 Ordinary business income (loss) 14 Self-employment earnings (loss)', `${tax(ord)} A ${tax(ord + gs + gc)}`,
        '2 Net rental real estate income (loss)', '3 Other net rental income (loss) 15 Credits', '4a Guaranteed payments for services', gs ? tax(gs) : '', '4b Guaranteed payments for capital 16 Schedule K-3 is attached', gc ? tax(gc) : '',
        '4c Total guaranteed payments 17 Alternative minimum tax (AMT) items', gs + gc ? tax(gs + gc) : '', '5 Interest income 18 Tax-exempt income and nondeductible expenses', `${int(10, 900)} C ${int(50, 900)}`,
        '19 Distributions', dist ? `A ${tax(dist)}` : '', '20 Other information', `Z ${tax(ord)}`].filter(Boolean);
      const want = [['ordinary', ord, 'n'], ['_own', end, 'n']]; if (gs + gc) want.push(['guar', gs + gc, 'n']); if (dist) want.push(['dist', dist, 'n']);
      return { text: L.join('\n'), type: 'k1_1065', center: 'taxreturn', want };
    },
  },
  k1_1120s: {
    irs() {   // the IRS K-1 (1120-S): box 16 shows its codes only (D = distributions)
      const ord = int(-20000, 260000), dist = rnd() < 0.8 ? int(1000, 150000) : 0, own = pick([10, 25, 50, 51, 100]), newer = rnd() < 0.5;
      const L = ['Schedule K-1 (Form 1120-S) 2025', "Shareholder's Share of Income, Deductions, Credits, etc.", 'Part I Information About the Corporation', `A Corporation's employer identification number ${int(10, 99)}-${int(1000000, 9999999)}`,
        `B Corporation's name, address, city, state, and ZIP code`, `${pick(EMPLOYERS)}`, 'Part II Information About the Shareholder', newer ? `G Current year allocation percentage ${own.toFixed(6)} %` : `F Shareholder's percentage of stock ownership for tax year . . . ${own.toFixed(6)} %`,
        "Part III Shareholder's Share of Current Year Income, Deductions, Credits, and Other Items", '1 Ordinary business income (loss) 13 Credits', tax(ord), '2 Net rental real estate income (loss)', '3 Other net rental income (loss)', '4 Interest income', `${int(5, 900)}`,
        '16 Items affecting shareholder basis', `C ${tax(int(100, 3000))}`, dist ? `D ${tax(dist)}` : '', '17 Other information', `AC ${tax(int(100000, 2000000))}`].filter(Boolean);
      const want = [['ordinary', ord, 'n'], ['_own', own, 'n']]; if (dist) want.push(['dist', dist, 'n']);
      return { text: L.join('\n'), type: 'k1_1120s', center: 'taxreturn', want };
    },
  },
  f1120: {
    irs() {   // Form 1120: line 28 is also "taxable income", line 29a/29b/29c, a blank depletion line
      const ti28 = int(20000, 900000), nol = rnd() < 0.4 ? int(1000, 50000) : 0, sp = rnd() < 0.3 ? int(500, 20000) : 0, ti = ti28 - nol - sp, tx = Math.round(ti * 0.21), dep = int(1000, 90000), depl = pick([0, 0, int(500, 5000)]);
      const L = ['Form 1120 U.S. Corporation Income Tax Return 2025', `1a Gross receipts or sales . . . 1a ${tax(int(200000, 5000000))}`, `12 Compensation of officers (see instructions—attach Form 1125-E) . . 12 ${tax(int(40000, 300000))}`,
        `20 Depreciation from Form 4562 not claimed on Form 1125-A or elsewhere on return (attach Form 4562) . . 20 ${tax(dep)}`, `21 Depletion . . . . . . 21 ${depl ? tax(depl) : ''}`.trim(),
        `28 Taxable income before net operating loss deduction and special deductions. Subtract line 27 from line 11 . . 28 ${tax(ti28)}`, `29a Net operating loss deduction (see instructions) . . 29a ${nol ? tax(nol) : ''}`.trim(),
        `b Special deductions (Schedule C, line 24) . . 29b ${sp ? tax(sp) : ''}`.trim(), `c Add lines 29a and 29b . . . 29c ${nol + sp ? tax(nol + sp) : ''}`.trim(), `30 Taxable income. Subtract line 29c from line 28. See instructions . . 30 ${tax(ti)}`,
        `31 Total tax (Schedule J, Part I, line 11) . . 31 ${tax(tx)}`];
      const want = [['taxable', ti, 'n'], ['tax', tx, 'n'], ['depr', dep, 'n'], ['depl', depl || null, depl ? 'n' : 'none'], ['nol', nol + sp || null, nol + sp ? 'n' : 'none']];
      return { text: L.join('\n'), type: 'f1120', center: 'taxreturn', want };
    },
  },
  benefits: {   // the Income Calculator has no reader for these; the Document Center files them as income for the borrower's other income
    ssa() { const a = cents(900, 4200); return { text: ['Social Security Administration', 'Retirement, Survivors, and Disability Insurance', 'Notice of Award', `Beginning ${MONTH[int(0, 11)]} 2026, your monthly benefit amount is ${money(a)}.`, 'The amount we will pay you after we deduct your Medicare premium is shown below.'].join('\n'), type: 'other', center: 'benefits', want: [] }; },
    r1099() { const a = cents(6000, 90000); return { text: ['FORM 1099-R', 'Distributions From Pensions, Annuities, Retirement or Profit-Sharing Plans, IRAs, Insurance Contracts, etc.', `1 Gross distribution $ ${money(a, { $: false })}`, `2a Taxable amount $ ${money(a, { $: false })}`, '7 Distribution code(s) 7'].join('\n'), type: 'other', center: 'benefits', want: [] }; },
    pension() { const a = cents(500, 6000); return { text: ['New York State and Local Retirement System', 'Pension Benefit Statement', `Your monthly pension benefit: ${money(a)}`, 'Option: Single Life Allowance'].join('\n'), type: 'other', center: 'benefits', want: [] }; },
  },
};

/* ---------------------------------------------------------------- OCR damage */
const JUNK = ['Page 1 of 2', 'CONFIDENTIAL', '----------', '| |', 'www.example-payroll.com', '* * *', '#'];
const LETTERS = [[/l/g, 'I'], [/i/g, 'l'], [/rn/g, 'm'], [/m/g, 'rn'], [/e/g, 'c'], [/o/g, '0'], [/a/g, 'o']];
function damage(text, level) {
  if (level === 'clean') return text;
  const hard = level === 'heavy' || level === 'brutal', brutal = level === 'brutal';
  let L = text.split('\n').map((l) => {
    let s = l;
    if (rnd() < 0.3) s = s.replace(/ /g, () => (rnd() < 0.2 ? '  ' : ' '));
    if (rnd() < 0.15) s = s.toUpperCase();
    if (rnd() < 0.25) s = s.replace(/\$(?=\s?\d)/g, '');
    if (rnd() < 0.15) s = s.replace(/\d{1,3}(?:,\d{3})+/g, (m) => m.replace(/,/g, ''));
    return s;
  });
  if (rnd() < 0.5) L.splice(int(0, L.length), 0, pick(JUNK));
  if (hard) {
    if (rnd() < 0.3) { const i = L.findIndex((l) => /[A-Za-z]{4}.*\d[\d,]*\.\d{2}\s*$/.test(l)); if (i >= 0) { const m = L[i].match(/^(.*?)\s+(\$?[\d,]+\.\d{2})\s*$/); if (m) L.splice(i, 1, m[1], m[2]); } }
    L = L.map((l) => {
      let s = l;
      if (rnd() < (brutal ? 0.4 : 0.25)) s = s.replace(/(\d[\d,]*\.\d{2})/g, (m) => (rnd() < 0.5 ? m.replace(/0/, 'O') : rnd() < 0.5 ? m.replace(/1/, 'l') : m.replace(/5/, 'S')));
      if (rnd() < 0.15) s = s.replace(/(\d),(\d{3})/g, '$1, $2');
      if (rnd() < 0.12) s = s.replace(/(\d{1,3}(?:,\d{3})*)\.(\d{2})\b/g, '$1,$2');
      if (rnd() < 0.08) s = s.replace(/\d{1,3}(?:,\d{3})+(?=\.\d{2}\b|\.?\s*$)/g, (m) => m.replace(/,/g, '.'));
      if (brutal) {
        if (rnd() < 0.3) s = s.replace(/\$(?=\s?\d)/g, 'S');                                   // "$" read as "S"
        if (rnd() < 0.25) s = s.replace(/(?<![\d,]) (?=\$?\(?\d[\d,]*\.\d{2})/g, () => (rnd() < 0.5 ? ' | ' : ' '));   // table rules read as "|" (between amounts, never inside one OCR split)
        if (rnd() < 0.15) { const [re, to] = pick(LETTERS); const w = s.match(/[A-Za-z]{6,}/); if (w) s = s.replace(w[0], w[0].replace(re, to)); }   // a letter misread inside a long label word
        if (rnd() < 0.1) s = s.replace(/(\d{1,3}),(\d{3})\.(\d{2})\b/, '$1,$2 $3');            // the decimal point lost: "2,040 00"
      }
      return s;
    });
    if (rnd() < 0.3) L = L.map((l) => l.replace(/\s+/g, ' ').replace(/ ([:.])/g, '$1'));
  }
  return rnd() < 0.3 ? L.join('\r\n') : L.join('\n');
}

/* ---------------------------------------------------------------- run */
const LEVELS = ['clean', 'light', 'heavy', 'brutal'];
const near = (a, b) => (typeof b === 'string' ? String(a) === b : Math.abs(+a - b) < 0.006);
const stats = {}, misses = [], wrongs = [], emitted = [];
let tot = { docs: 0, typeOk: 0, centerOk: 0, fields: 0, ok: 0, wrong: 0 };
function score(R, name, doc, text, level, key) {
  const S = stats[key] || (stats[key] = { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0 });
  S.docs++; const type = R.classify(text); if (type === doc.type) S.typeOk++; else if (doc.type !== 'other' || type !== 'other') misses.push(`${key} type: want ${doc.type} got ${type}`);
  if (doc.type === 'other') return;
  const F = R.extractFields(doc.type, text);
  for (const [slot, want, kind, col] of doc.want) {
    const cand = F.filter((f) => f.slot === slot && !f.generic && (!col || f.col === col));
    const f = cand.find((x) => !/— check:/.test(x.label) && x.apply !== false) || cand.find((x) => !/— check:/.test(x.label));
    const got = f ? f.value : undefined;
    S.fields++; tot.fields++;
    if (kind === 'none') { if (got === undefined || got === 0) { S.ok++; tot.ok++; } else { S.wrong++; tot.wrong++; wrongs.push(`${key} ${slot}: must be blank, got ${got}`); misses.push({ key, slot, want: 'blank', got, text }); } continue; }
    if (got !== undefined && near(got, want)) { S.ok++; tot.ok++; }
    else { if (got !== undefined) { S.wrong++; tot.wrong++; wrongs.push(`${key} ${slot}${col ? ' ' + col : ''}: want ${want} got ${got}`); } misses.push({ key, slot: slot + (col ? ' ' + col : ''), want, got, text }); }
  }
}
const t0 = performance.now();
for (const [type, lays] of Object.entries(LAYOUTS)) {
  if (ONLY && ONLY !== type) continue;
  for (const [lay, gen] of Object.entries(lays)) for (const level of LEVELS) for (let k = 0; k < PER; k++) {
    const doc = gen(), text = damage(doc.text, level);
    tot.docs++;
    if (DC.detect(text, '') === doc.center) tot.centerOk++; else misses.push(`Document Center ${type}/${lay} [${level}] type: want ${doc.center} got ${DC.detect(text, '')}`);
    score(IC, 'Income Calculator', doc, text, level, `IC ${type}/${lay} [${level}]`);
    score(SU, 'Loan Suite', doc, text, level, `LS ${type}/${lay} [${level}]`);
    if (EMIT && k < 2 && (level === 'clean' || level === 'light')) emitted.push({ gen: `${type}/${lay}`, level, type: doc.type, text, want: doc.want });
  }
}
const ms = performance.now() - t0;

const agg = {};
for (const [k, s] of Object.entries(stats)) {
  const m = /^(IC|LS) (\S+) \[(\w+)\]$/.exec(k), g = `${m[1]} ${m[2]}`, A = agg[g] || (agg[g] = {}), B = A[m[3]] || (A[m[3]] = { docs: 0, typeOk: 0, fields: 0, ok: 0, wrong: 0 });
  for (const f of Object.keys(B)) B[f] += s[f];
}
console.log('reader document/layout              ' + LEVELS.map((l) => l.padEnd(15)).join(''));
for (const [g, A] of Object.entries(agg)) console.log('  ' + g.padEnd(34) + LEVELS.map((l) => { const b = A[l]; if (!b) return ''.padEnd(15); const pct = b.fields ? (100 * b.ok / b.fields).toFixed(1) + '%' : 'n/a'; return (pct + (b.wrong ? ` w${b.wrong}` : '') + (b.typeOk < b.docs ? ` t${b.docs - b.typeOk}` : '')).padEnd(15); }).join(''));
const byLv = {}; for (const [k, s] of Object.entries(stats)) { const lv = /\[(\w+)\]$/.exec(k)[1], r = k.slice(0, 2), K = r + ' ' + lv, B = byLv[K] || (byLv[K] = { f: 0, ok: 0, w: 0 }); B.f += s.fields; B.ok += s.ok; B.w += s.wrong; }
for (const r of ['IC', 'LS']) console.log(`  ${r === 'IC' ? 'Income Calculator' : 'Loan Suite       '} ` + LEVELS.map((l) => { const b = byLv[r + ' ' + l]; return b ? `${l} ${(100 * b.ok / b.f).toFixed(1)}% (${b.w} wrong)` : ''; }).join('  '));
console.log(`Income battle: ${tot.docs} documents x 2 readers, Document Center type right ${tot.centerOk}/${tot.docs}, figures right ${tot.ok}/${tot.fields} (${(100 * tot.ok / tot.fields).toFixed(1)}%), wrong figures ${tot.wrong}, ${(ms / tot.docs).toFixed(2)} ms per document`);
const wl = {}; wrongs.forEach((w) => { const k = w.replace(/: .*/, '').replace(/ \[\w+\]/, ''); wl[k] = (wl[k] || 0) + 1; });
Object.entries(wl).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(`  WRONG x${n} ${k}  e.g. ${wrongs.find((w) => w.replace(/: .*/, '').replace(/ \[\w+\]/, '') === k).replace(/^.*?: /, '')}`));
if (SHOW) {
  const seen = {};
  for (const f of misses) {
    if (typeof f === 'string') { const k = f.replace(/ \[\w+\]/, '').replace(/got .*/, ''); seen[k] = (seen[k] || 0) + 1; if (seen[k] <= 2) console.log('MISS ' + f); continue; }
    const k = f.key.replace(/ \[\w+\]/, '') + '|' + f.slot; seen[k] = (seen[k] || 0) + 1; if (seen[k] > 2) continue;
    console.log(`\nMISS ${f.key} ${f.slot}: want ${f.want} got ${f.got}\n  ${f.text.replace(/\r/g, '').split('\n').join('\n  ')}`);
  }
}
if (EMIT) { mkdirSync(path.join(root, 'tests/_out'), { recursive: true }); writeFileSync(path.join(root, 'tests/_out/income-battle.json'), JSON.stringify({ income: emitted, center: [] })); console.log(`wrote tests/_out/income-battle.json: ${emitted.length} documents`); }
// pass: on clean, light and heavy documents 99% of figures read by the Income Calculator, no wrong figure at all on clean
// or light documents, and wrong figures under 1 in 1,000 overall (a blank is safe: you fill it in)
const ic = (l) => byLv['IC ' + l] || { f: 1, ok: 1, w: 0 };
const good = ['clean', 'light', 'heavy'].every((l) => ic(l).ok / ic(l).f >= 0.99) && ic('clean').w + ic('light').w === 0 && tot.wrong <= tot.fields * 0.001 && tot.centerOk / tot.docs >= 0.99;
process.exitCode = good ? 0 : 1;
