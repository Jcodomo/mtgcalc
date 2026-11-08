/* Mortgage Suite 55.17 - AI document import (Loan Suite Documents pages).
   One place for document AI: choose the document type, copy the prompt, paste the returned JSON, then review every item
   with a destination dropdown before anything is applied - the way the Income Calculator's document review works.
   Loan Suite and Renovation fields are set in this file; income documents are handed to the Income Calculator through
   the existing OCR bridge (MtgcalcOcrBridge), where they are reviewed again. Nothing is applied without confirmation. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function store() { try { return window.mortgageSuite && window.mortgageSuite.store; } catch (e) { return null; } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function say(t, m, k) { try { window.LOS && LOS.say ? LOS.say(t, m, k || 'good', 5000) : null; } catch (e) {} }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,%\s]/g, '')); return isFinite(n) ? n : null; }

  /* every Loan Suite destination: [path, label, kind] - kind: num (dollars or counts), pct (entered as printed, stored as a
     decimal), text, date */
  var CAT = [
    ['File & property', [
      ['borrowerName', 'Borrower name', 'text'], ['propertyAddress', 'Property street address', 'text'], ['zipCode', 'ZIP code', 'text'],
      ['state', 'State', 'text'], ['nyCounty', 'County', 'text'], ['units', 'Units', 'num'], ['occupancy', 'Occupancy', 'text'],
      ['transactionType', 'Transaction (Purchase / Refinance)', 'text'], ['closingDate', 'Closing date', 'date']]],
    ['Loan & value', [
      ['basePurchasePrice', 'Purchase price', 'num'], ['asIsValue', 'As-is / appraised value', 'num'], ['afterRepairValue', 'After-repair value', 'num'],
      ['loanProgram', 'Loan program (FHA / Conventional)', 'text'], ['interestRate', 'Note rate (%)', 'pct'], ['termYears', 'Term (years)', 'num'],
      ['finalDownPaymentPct', 'Down payment (%)', 'pct'], ['creditScore', 'Credit score', 'num'],
      ['sellerConcessionAmount', 'Seller concession ($)', 'num'], ['closing.earnestMoneyDeposit', 'Earnest money deposit', 'num']]],
    ['Escrow', [
      ['propertyTaxAmount', 'Property tax (annual)', 'num'], ['insuranceAmount', 'Hazard insurance (annual)', 'num'],
      ['hoaMonthly', 'HOA (monthly)', 'num'], ['escrow.annualFlood', 'Flood insurance (annual)', 'num']]],
    ['Closing costs', [
      ['closing.overrides.lenderOrigination', 'Origination fee', 'num'], ['closing.originationPointsPct', 'Origination points (%)', 'pct'],
      ['closing.overrides.lenderProcessing', 'Processing / underwriting fee', 'num'], ['closing.overrides.appraisal', 'Appraisal fee', 'num'],
      ['closing.overrides.creditReport', 'Credit report fee', 'num'], ['closing.overrides.floodTaxService', 'Flood cert / tax service', 'num'],
      ['closing.overrides.titleInsurance', 'Title insurance', 'num'], ['closing.overrides.titleSearchSettlement', 'Title search / settlement', 'num'],
      ['closing.overrides.attorney', 'Attorney fee', 'num'], ['closing.overrides.survey', 'Survey', 'num'],
      ['closing.overrides.recording', 'Recording fees', 'num'], ['closing.overrides.inspections', 'Inspections', 'num'], ['closing.overrides.other', 'Other fees', 'num']]],
    ['Renovation', [
      ['reno.baseCost', 'Contractor / base renovation cost', 'num'], ['reno.architectural', 'Architectural / engineering', 'num'],
      ['reno.consultant', 'Consultant fee', 'num'], ['reno.permits', 'Permits', 'num'], ['reno.feasibilityOther', 'Feasibility / other', 'num'],
      ['reno.otherFinanceable', 'Other financeable costs', 'num'], ['reno.contingencyPct', 'Contingency (%)', 'pct'],
      ['reno.energyImprovements', 'Energy improvements', 'num'], ['reno.inspectionFees', 'Draw inspection fees (total)', 'num'],
      ['reno.titleUpdateFees', 'Title update fees (total)', 'num'], ['reno.paymentReserveMonths', 'Payment reserve (months)', 'num'],
      ['draws.manualDrawCount', 'Number of draws', 'num'], ['draws.inspectionFeePerDraw', 'Inspection fee per draw', 'num'], ['draws.titleFeePerDraw', 'Title fee per draw', 'num']]],
    ['Assets & rent', [
      ['assets.liquidAssets', 'Liquid assets', 'num'], ['assets.retirementOtherAssets', 'Retirement / other assets', 'num'], ['assets.giftFunds', 'Gift funds', 'num'],
      ['rental.mainUnit.gross', 'Main unit gross rent', 'num'], ['rental.unit2.gross', 'Unit 2 gross rent', 'num'],
      ['rental.unit3.gross', 'Unit 3 gross rent', 'num'], ['rental.unit4.gross', 'Unit 4 gross rent', 'num'], ['rental.adu.gross', 'ADU gross rent', 'num']]]
  ];
  var BY = {}; CAT.forEach(function (g) { g[1].forEach(function (f) { BY[f[0]] = {path: f[0], label: f[1], kind: f[2], group: g[0]}; }); });
  /* names a document or an assistant is likely to use, mapped to a destination */
  var SYN = {
    purchaseprice: 'basePurchasePrice', salesprice: 'basePurchasePrice', contractprice: 'basePurchasePrice', price: 'basePurchasePrice',
    appraisedvalue: 'asIsValue', asisvalue: 'asIsValue', marketvalue: 'asIsValue', value: 'asIsValue', afterrepairvalue: 'afterRepairValue', ascompletedvalue: 'afterRepairValue', arv: 'afterRepairValue',
    interestrate: 'interestRate', noterate: 'interestRate', rate: 'interestRate', term: 'termYears', termyears: 'termYears', loanterm: 'termYears',
    downpaymentpct: 'finalDownPaymentPct', downpaymentpercent: 'finalDownPaymentPct', creditscore: 'creditScore', fico: 'creditScore', representativescore: 'creditScore',
    sellercredit: 'sellerConcessionAmount', sellercredits: 'sellerConcessionAmount', sellerconcession: 'sellerConcessionAmount', earnestmoney: 'closing.earnestMoneyDeposit', earnestmoneydeposit: 'closing.earnestMoneyDeposit', deposit: 'closing.earnestMoneyDeposit',
    borrower: 'borrowerName', borrowername: 'borrowerName', buyer: 'borrowerName', propertyaddress: 'propertyAddress', address: 'propertyAddress', subjectaddress: 'propertyAddress',
    zip: 'zipCode', zipcode: 'zipCode', postalcode: 'zipCode', county: 'nyCounty', closingdate: 'closingDate', settlementdate: 'closingDate', occupancy: 'occupancy', units: 'units', numberofunits: 'units',
    loanprogram: 'loanProgram', loantype: 'loanProgram', transactiontype: 'transactionType', purpose: 'transactionType', loanpurpose: 'transactionType',
    annualtaxes: 'propertyTaxAmount', propertytax: 'propertyTaxAmount', propertytaxes: 'propertyTaxAmount', annualpropertytax: 'propertyTaxAmount', realestatetaxes: 'propertyTaxAmount',
    annualinsurance: 'insuranceAmount', hazardinsurance: 'insuranceAmount', homeownersinsurance: 'insuranceAmount', insurancepremium: 'insuranceAmount', annualpremium: 'insuranceAmount',
    hoa: 'hoaMonthly', hoadues: 'hoaMonthly', hoamonthly: 'hoaMonthly', floodinsurance: 'escrow.annualFlood',
    originationfee: 'closing.overrides.lenderOrigination', origination: 'closing.overrides.lenderOrigination', originationpoints: 'closing.originationPointsPct', points: 'closing.originationPointsPct',
    processingfee: 'closing.overrides.lenderProcessing', underwritingfee: 'closing.overrides.lenderProcessing', appraisalfee: 'closing.overrides.appraisal', appraisal: 'closing.overrides.appraisal',
    creditreportfee: 'closing.overrides.creditReport', creditreport: 'closing.overrides.creditReport', floodcertification: 'closing.overrides.floodTaxService', floodcert: 'closing.overrides.floodTaxService', taxservice: 'closing.overrides.floodTaxService',
    titleinsurance: 'closing.overrides.titleInsurance', lenderstitleinsurance: 'closing.overrides.titleInsurance', ownerstitleinsurance: 'closing.overrides.titleInsurance', titlesearch: 'closing.overrides.titleSearchSettlement', settlementfee: 'closing.overrides.titleSearchSettlement', closingfee: 'closing.overrides.titleSearchSettlement',
    attorneyfee: 'closing.overrides.attorney', attorney: 'closing.overrides.attorney', survey: 'closing.overrides.survey', surveyfee: 'closing.overrides.survey', recordingfees: 'closing.overrides.recording', recordingfee: 'closing.overrides.recording', recording: 'closing.overrides.recording',
    inspectionfee: 'closing.overrides.inspections', homeinspection: 'closing.overrides.inspections', otherfees: 'closing.overrides.other',
    contractortotal: 'reno.baseCost', bidtotal: 'reno.baseCost', estimatetotal: 'reno.baseCost', renovationcost: 'reno.baseCost', rehabcost: 'reno.baseCost', total: 'reno.baseCost', totalcost: 'reno.baseCost',
    permits: 'reno.permits', permitfees: 'reno.permits', architect: 'reno.architectural', architectural: 'reno.architectural', engineering: 'reno.architectural', consultant: 'reno.consultant', consultantfee: 'reno.consultant',
    contingency: 'reno.contingencyPct', contingencypct: 'reno.contingencyPct', energy: 'reno.energyImprovements', energyimprovements: 'reno.energyImprovements', draws: 'draws.manualDrawCount', drawcount: 'draws.manualDrawCount', numberofdraws: 'draws.manualDrawCount',
    liquidassets: 'assets.liquidAssets', endingbalance: 'assets.liquidAssets', balance: 'assets.liquidAssets', retirementassets: 'assets.retirementOtherAssets', giftfunds: 'assets.giftFunds', gift: 'assets.giftFunds',
    monthlyrent: 'rental.mainUnit.gross', grossrent: 'rental.mainUnit.gross', marketrent: 'rental.mainUnit.gross', rent: 'rental.mainUnit.gross'
  };
  function guess(key) {
    if (BY[key]) return key;
    var leaf = String(key).split('.').pop(), k = leaf.replace(/[^a-z0-9]/gi, '').toLowerCase(), full = String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
    return SYN[k] || SYN[full] || '';
  }

  /* document types: which destinations the prompt asks for, and where they go */
  var INCOME = 'income';
  var TYPES = [
    ['urla', '1003 / URLA loan application', 'loan', ['borrowerName', 'propertyAddress', 'zipCode', 'state', 'nyCounty', 'units', 'occupancy', 'transactionType', 'loanProgram', 'basePurchasePrice', 'asIsValue', 'interestRate', 'termYears', 'finalDownPaymentPct', 'closing.earnestMoneyDeposit', 'assets.liquidAssets', 'assets.retirementOtherAssets', 'assets.giftFunds', 'propertyTaxAmount', 'insuranceAmount', 'hoaMonthly']],
    ['fees', 'Fee sheet / itemized fees', 'loan', ['closing.overrides.lenderOrigination', 'closing.originationPointsPct', 'closing.overrides.lenderProcessing', 'closing.overrides.appraisal', 'closing.overrides.creditReport', 'closing.overrides.floodTaxService', 'closing.overrides.titleInsurance', 'closing.overrides.titleSearchSettlement', 'closing.overrides.attorney', 'closing.overrides.survey', 'closing.overrides.recording', 'closing.overrides.inspections', 'closing.overrides.other', 'propertyTaxAmount', 'insuranceAmount', 'escrow.annualFlood', 'hoaMonthly']],
    ['lecd', 'Loan Estimate / Closing Disclosure', 'loan', ['basePurchasePrice', 'interestRate', 'termYears', 'loanProgram', 'closingDate', 'sellerConcessionAmount', 'closing.earnestMoneyDeposit', 'closing.overrides.lenderOrigination', 'closing.overrides.lenderProcessing', 'closing.overrides.appraisal', 'closing.overrides.creditReport', 'closing.overrides.floodTaxService', 'closing.overrides.titleInsurance', 'closing.overrides.titleSearchSettlement', 'closing.overrides.attorney', 'closing.overrides.survey', 'closing.overrides.recording', 'closing.overrides.inspections', 'closing.overrides.other', 'propertyTaxAmount', 'insuranceAmount']],
    ['reno', 'Contractor estimate / renovation bid', 'reno', ['reno.baseCost', 'reno.permits', 'reno.architectural', 'reno.consultant', 'reno.feasibilityOther', 'reno.otherFinanceable', 'reno.contingencyPct', 'reno.energyImprovements', 'draws.manualDrawCount', 'propertyAddress']],
    ['contract', 'Purchase contract', 'loan', ['borrowerName', 'propertyAddress', 'zipCode', 'basePurchasePrice', 'closing.earnestMoneyDeposit', 'sellerConcessionAmount', 'closingDate', 'transactionType']],
    ['appraisal', 'Appraisal', 'loan', ['propertyAddress', 'zipCode', 'units', 'asIsValue', 'afterRepairValue', 'propertyTaxAmount', 'hoaMonthly', 'rental.mainUnit.gross', 'rental.unit2.gross', 'rental.unit3.gross', 'rental.unit4.gross']],
    ['credit', 'Credit report', 'loan', ['borrowerName', 'creditScore']],
    ['insurance', 'Insurance declaration / quote', 'loan', ['propertyAddress', 'insuranceAmount', 'escrow.annualFlood']],
    ['tax', 'Tax bill', 'loan', ['propertyAddress', 'propertyTaxAmount']],
    ['bank', 'Bank / asset statement', 'loan', ['assets.liquidAssets', 'assets.retirementOtherAssets', 'assets.giftFunds']],
    ['lease', 'Lease', 'loan', ['propertyAddress', 'rental.mainUnit.gross', 'rental.unit2.gross', 'rental.unit3.gross', 'rental.unit4.gross', 'rental.adu.gross']],
    ['paystub', 'Income - pay stub / W-2 / VOE', INCOME, null],
    ['taxreturn', 'Income - tax return / Schedule C / K-1', INCOME, null],
    ['benefits', 'Income - Social Security / pension / VA / other', INCOME, null],
    ['any', 'Any mortgage document', 'loan', null]
  ];
  var TYPE = {}; TYPES.forEach(function (t) { TYPE[t[0]] = {id: t[0], label: t[1], dest: t[2], keys: t[3]}; });

  function promptFor(typeId, extra) {
    var t = TYPE[typeId] || TYPE.any;
    if (t.dest === INCOME) {
      var p = ''; try { p = (0, eval)('typeof EXTRACT_PROMPT!=="undefined"?EXTRACT_PROMPT:""'); } catch (e) {}
      return (p || 'Extract every income figure printed on this document as the Income Calculator import JSON (w2, schc, corp, sche, other arrays).') +
        '\n\nDocument type: ' + t.label + '.' + (extra ? '\nReviewer notes: ' + extra : '') + '\n\nDocument follows:';
    }
    var keys = t.keys || Object.keys(BY);
    var lines = keys.map(function (k) { var f = BY[k]; return '  "' + k + '": ' + (f.kind === 'text' || f.kind === 'date' ? '""' : '0') + ',   // ' + f.label + (f.kind === 'pct' ? ' - as printed, e.g. 6.875' : f.kind === 'date' ? ' - YYYY-MM-DD' : ''); });
    return 'You are reading a mortgage document (' + t.label + ') for a loan officer.\n' +
      'Return ONLY one JSON object - no prose, no markdown fences - using exactly these keys. Omit any key the document does not print; never guess or calculate a value.\n' +
      'Numbers are plain numbers (no $, commas or %). Percentages exactly as printed (6.875, not 0.06875). Annual amounts for taxes and insurance; monthly for HOA and rent.\n\n{\n' + lines.join('\n') + '\n}' +
      (typeId === 'reno' ? '\n\nFor a contractor estimate, "reno.baseCost" is the contract total for the work itself; put permits, plans and any contingency printed on the bid in their own keys.' : '') +
      (typeId === 'fees' || typeId === 'lecd' ? '\n\nUse each fee once, under the closest key; anything that fits no key goes in "closing.overrides.other" (added together).' : '') +
      (extra ? '\n\nReviewer notes: ' + extra : '') + '\n\nDocument follows:';
  }

  function parse(text) {
    var t = String(text || '').trim().replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    if (!t) throw new Error('Paste the returned JSON first.');
    var v = JSON.parse(t); if (Array.isArray(v)) v = v[0];
    if (!v || typeof v !== 'object') throw new Error('The returned text is not a JSON object.');
    return v;
  }
  function flat(o, pre, out) {
    out = out || [];
    Object.keys(o || {}).forEach(function (k) {
      var v = o[k], path = pre ? pre + '.' + k : k;
      if (BY[path]) { out.push([path, v]); return; }
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, path, out);
      else if (!Array.isArray(v) && v !== '' && v != null) out.push([path, v]);
    });
    return out;
  }

  var rows = [], lastParsed = null, lastType = 'urla';
  function optionHtml(sel) {
    return '<option value="">— skip —</option>' + CAT.map(function (g) {
      return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === sel ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  }
  function paintRows() {
    var box = $('mtAiRows'); if (!box) return;
    if (!rows.length) { box.innerHTML = '<p class="mt-ai-empty">Paste the returned JSON and choose Review, or read figures from a document already on this page.</p>'; return; }
    box.innerHTML = '<table class="mt-ai-table"><thead><tr><th style="width:34px"></th><th>Item on the document</th><th>Value</th><th>Place it in</th></tr></thead><tbody>' +
      rows.map(function (r, i) {
        return '<tr><td><input type="checkbox" data-i="' + i + '" data-k="on"' + (r.on ? ' checked' : '') + ' aria-label="Include"></td><td>' + esc(r.key) + '</td>' +
          '<td><input class="mt-ai-val" data-i="' + i + '" data-k="value" value="' + esc(r.value) + '"></td>' +
          '<td><select data-i="' + i + '" data-k="dest">' + optionHtml(r.dest) + '</select></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function review() {
    var st = $('mtAiStatus');
    try {
      var v = parse($('mtAiJson').value); lastParsed = v;
      var t = TYPE[$('mtAiType').value] || TYPE.any;
      if (t.dest === INCOME) {
        rows = []; paintRows();
        st.className = 'good'; st.innerHTML = '<b>Income document.</b> Choose <b>Send to Income Calculator</b>; it opens there for review against each worksheet.';
        return;
      }
      rows = flat(v).map(function (p) { var d = guess(p[0]); return {key: p[0], value: p[1], dest: d, on: !!d}; });
      paintRows();
      var n = rows.filter(function (r) { return r.on; }).length;
      st.className = n ? 'good' : 'warn';
      st.innerHTML = '<b>' + rows.length + ' item(s) found, ' + n + ' matched to a field.</b> Check each destination, untick anything you do not want, then apply. Nothing has changed yet.';
    } catch (e) { rows = []; paintRows(); st.className = 'bad'; st.textContent = String(e && e.message || e); }
  }
  function apply() {
    var s = store(), st = $('mtAiStatus'); if (!s) return;
    var done = 0, skipped = [];
    rows.forEach(function (r) {
      if (!r.on || !r.dest) return;
      var f = BY[r.dest]; if (!f) return;
      var v = r.value;
      if (f.kind === 'num') { v = num(v); if (v == null) { skipped.push(r.key); return; } }
      else if (f.kind === 'pct') { v = num(v); if (v == null) { skipped.push(r.key); return; } if (Math.abs(v) > 1) v = v / 100; }
      else v = String(v).trim();
      try { s.setField(r.dest, v, 'AI document import'); done++; } catch (e) { skipped.push(r.key); }
    });
    try { window.RECALC && window.RECALC(); } catch (e) {}
    st.className = done ? 'good' : 'warn';
    st.innerHTML = '<b>Applied ' + done + ' field(s)</b>' + (skipped.length ? '; not applied (no number found): ' + esc(skipped.join(', ')) : '') + '. Check them against the document before relying on them.';
    say(done ? 'Applied ' + done + ' field(s)' : 'Nothing applied', 'From the AI document import.', done ? 'good' : 'warn');
  }
  function sendIncome() {
    var st = $('mtAiStatus');
    try {
      var v = lastParsed || parse($('mtAiJson').value);
      if (!window.MtgcalcOcrBridge || !MtgcalcOcrBridge.publish) throw new Error('The Income Calculator bridge is not loaded on this page.');
      MtgcalcOcrBridge.publish({documentName: (TYPE[$('mtAiType').value] || {}).label || 'Loan Suite document', parsed: v, source: 'AI document import'});
      st.className = 'good'; st.innerHTML = '<b>Sent.</b> Opening the Income Calculator, where the values wait for review on its Documents tab.';
      setTimeout(function () { MtgcalcOcrBridge.openIncome ? MtgcalcOcrBridge.openIncome() : (location.href = 'income-calculator.html?tab=docs&ocr=1'); }, 500);
    } catch (e) { st.className = 'bad'; st.textContent = String(e && e.message || e); }
  }
  /* figures straight from a document already read on this page (no AI): the Loan Suite document reader's matches */
  function fromOcr() {
    var st = $('mtAiStatus'), files = (window.V9 && V9.DOCS && V9.DOCS.files || []).filter(function (f) { return f && f.figures && f.figures.length; });
    if (!files.length) { st.className = 'warn'; st.textContent = 'No document with readable figures on this page yet - drop one in the area above first.'; return; }
    var f = files[files.length - 1];
    rows = f.figures.map(function (g) { return {key: g.label + ' (' + f.name + ')', value: g.value, dest: g.target || '', on: !!g.target}; });
    paintRows(); st.className = 'good'; st.innerHTML = '<b>' + rows.length + ' figure(s) read from ' + esc(f.name) + '.</b> Choose where each one goes, then apply.';
  }
  function setPrompt() { var o = $('mtAiPrompt'); if (o) o.value = promptFor($('mtAiType').value, ($('mtAiNotes') || {}).value || ''); var t = TYPE[$('mtAiType').value]; var inc = t && t.dest === INCOME;
    $('mtAiApply').style.display = inc ? 'none' : ''; $('mtAiIncome').style.display = inc ? '' : 'none'; }
  function copy(text) { try { navigator.clipboard.writeText(text).then(function () { say('Prompt copied', 'Paste it into your assistant with the document.'); }); } catch (e) { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) {} t.remove(); } }

  function mount() {
    var host = $('v50UnifiedDocuments'); if (!host || $('mtAiImport')) return !!host;
    var sec = document.createElement('section'); sec.id = 'mtAiImport'; sec.className = 'mt-ai no-print';
    sec.innerHTML = '<header><div><small>Document AI</small><h3>AI document import</h3><p>Choose the document, copy the prompt into your assistant with the document, paste the JSON it returns, then choose where each item goes. Nothing is applied until you confirm.</p></div></header>' +
      '<div class="mt-ai-grid"><label>Document<select id="mtAiType">' + TYPES.map(function (t) { return '<option value="' + t[0] + '">' + esc(t[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>Reviewer notes <em>optional</em><input id="mtAiNotes" placeholder="For example: use the borrower column only"></label></div>' +
      '<label class="mt-ai-full">Prompt <em>editable</em><textarea id="mtAiPrompt" rows="7" spellcheck="false"></textarea></label>' +
      '<div class="mt-ai-actions"><button type="button" class="primary" data-a="copy">Copy prompt</button><button type="button" data-a="ocr">Read figures from a document on this page</button></div>' +
      '<label class="mt-ai-full">Returned JSON<textarea id="mtAiJson" rows="5" spellcheck="false" placeholder="Paste the JSON your assistant returned"></textarea></label>' +
      '<div class="mt-ai-actions"><button type="button" data-a="review">Review</button><button type="button" class="primary" id="mtAiApply" data-a="apply">Apply checked items</button>' +
      '<button type="button" class="primary" id="mtAiIncome" data-a="income" style="display:none">Send to Income Calculator</button></div>' +
      '<output id="mtAiStatus">Choose a document type to start.</output><div id="mtAiRows"></div>';
    var head = host.querySelector(':scope > header');
    head && head.nextSibling ? host.insertBefore(sec, head.nextSibling) : host.insertBefore(sec, host.firstChild);
    /* consolidate: the older prompt library and JSON quick import stay available, folded under the new section */
    var more = document.createElement('details'); more.id = 'mtAiMore'; more.className = 'mt-ai-more';
    more.innerHTML = '<summary>More prompts and JSON tools</summary>';
    ['v50AnyJson', 'v50SharedPromptLibrary'].forEach(function (id) { var el = $(id); if (el) more.appendChild(el); });
    sec.parentNode.insertBefore(more, sec.nextSibling);
    sec.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'mtAiType') { lastType = t.value; setPrompt(); rows = []; paintRows(); return; }
      var i = t.dataset && t.dataset.i; if (i == null) return; var r = rows[+i]; if (!r) return;
      if (t.dataset.k === 'on') r.on = t.checked; else if (t.dataset.k === 'dest') { r.dest = t.value; r.on = !!t.value; paintRows(); } else if (t.dataset.k === 'value') r.value = t.value;
    });
    sec.addEventListener('input', function (e) { if (e.target.id === 'mtAiNotes') setPrompt(); var t = e.target; if (t.dataset && t.dataset.k === 'value' && rows[+t.dataset.i]) rows[+t.dataset.i].value = t.value; });
    sec.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return; var a = b.dataset.a;
      if (a === 'copy') copy($('mtAiPrompt').value); else if (a === 'review') review(); else if (a === 'apply') apply(); else if (a === 'income') sendIncome(); else if (a === 'ocr') fromOcr();
    });
    setPrompt(); paintRows();
    return true;
  }
  window.MtAiDocs = {CAT: CAT, TYPES: TYPES, guess: guess, promptFor: promptFor, review: review, apply: apply, mount: mount, rows: function () { return rows; }};
  var tries = 0; (function loop() { if (mount() && $('mtAiImport')) return; if (tries++ < 120) setTimeout(loop, 250); })();
})();
