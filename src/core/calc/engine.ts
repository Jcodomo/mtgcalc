// Recovered from the 56.5 compiled engine: AMD module "src/core/calc/engine".
// The function body is the original compiled code, unchanged; it receives its dependencies as arguments.
// Replace this file with a readable rewrite only together with a passing tests/engine-equivalence.mjs run.
// @ts-nocheck
import * as dep0 from '../data/stateClosingRules';
import * as dep1 from '../data/transferTaxes';
import * as dep2 from '../data/escrowRules';
import * as dep3 from '../data/marketData';
import * as dep4 from '../utils/num';
import * as dep5 from './trace';
import * as dep6 from './program';
import * as dep7 from './purchase';
import * as dep8 from './renovation';
import * as dep9 from './loan';
import * as dep10 from './payment';
import * as dep11 from './value';
import * as dep12 from './escrow';
import * as dep13 from './closing';
import * as dep14 from './cashToClose';
import * as dep15 from './aus';
import * as dep16 from './mmw';
import * as dep17 from './bps';
import * as dep18 from './warnings';
import * as dep19 from './validate';

const moduleExports: Record<string, any> = {};
const declared: Record<string, unknown> = { 'src/core/data/stateClosingRules': dep0, 'src/core/data/transferTaxes': dep1, 'src/core/data/escrowRules': dep2, 'src/core/data/marketData': dep3, 'src/core/utils/num': dep4, 'src/core/calc/trace': dep5, 'src/core/calc/program': dep6, 'src/core/calc/purchase': dep7, 'src/core/calc/renovation': dep8, 'src/core/calc/loan': dep9, 'src/core/calc/payment': dep10, 'src/core/calc/value': dep11, 'src/core/calc/escrow': dep12, 'src/core/calc/closing': dep13, 'src/core/calc/cashToClose': dep14, 'src/core/calc/aus': dep15, 'src/core/calc/mmw': dep16, 'src/core/calc/bps': dep17, 'src/core/calc/warnings': dep18, 'src/core/calc/validate': dep19 };
const requireDep = (name: string) => { if (name in declared) return declared[name]; throw new Error('src/core/calc/engine: undeclared runtime require of ' + name); };
(function (e, t, n, a, r, i, s, l, c, u, d, m, p, y, v, g, b, w, A, C, T, x) {"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.runScenario=function runScenario(e){const t=(0,x.sanitizeInputs)(e),I=new l.TraceCollector,N=(0,c.calculateProgram)(t.loanProgram,t.renovation),L=(0,u.calculatePurchase)(t,I),F=(0,d.calculateRenovation)(t,N.renovationActive,0),E=(0,m.calculateLoan)({inputs:t,program:N,purchase:L,finalRenovationAmount:F.finalRenovationAmount,energyImprovements:F.energyImprovements}),O=(0,p.calculatePayment)({inputs:t,program:N,loan:E,finalPurchasePrice:L.finalPurchasePrice,renovationAmount:F.finalRenovationAmount}),k=N.renovationActive?t.reno.paymentReserveMonths:0,$=(0,s.round)(O.totalMonthlyPayment*k,2),_=(0,d.calculateRenovation)(t,N.renovationActive,$,I),B=(0,m.calculateLoan)({inputs:t,program:N,purchase:L,finalRenovationAmount:_.finalRenovationAmount,energyImprovements:_.energyImprovements,trace:I}),V=(0,p.calculatePayment)({inputs:t,program:N,loan:B,finalPurchasePrice:L.finalPurchasePrice,renovationAmount:_.finalRenovationAmount,trace:I}),H=(0,y.calculateValue)(t,N,B,_.finalRenovationAmount,L.finalPurchasePrice,I),q=(0,v.calculateEscrow)(t,V,I),Y=(0,g.calculateClosingCosts)({inputs:t,purchase:L,loan:B,payment:V,escrow:q,renovationActive:N.renovationActive,trace:I}),U=(0,b.calculateCashToClose)(t,L,B,Y,I),j=(0,w.calculateAus)({inputs:t,program:N,loan:B,payment:V,cashToCloseHigh:U.cashToCloseHigh,trace:I}),G=(0,A.buildMaximumMortgageWorksheet)(t,N,_,B,Y,U),W=(0,C.calculateBps)(t.bps,B.totalLoan),Q=function buildStateRules(e){var t,s,l,c,u,d,m,p;const y=(0,n.lookupClosingRule)(e.state),v=(0,a.lookupTransferTax)(e.state),g="New York"===e.state?e.isNYC?"New York City":e.nyCounty:e.state,b=(0,r.lookupEscrowRule)(e.state,g,"New York"===e.state&&e.isNYC),w=(0,i.lookupMarket)(e.state);return{state:e.state,closingMethod:null!==(t=null==y?void 0:y.closingMethod)&&void 0!==t?t:"Not stored",earnestHolder:null!==(s=null==y?void 0:y.earnestHolder)&&void 0!==s?s:"Not stored",closingNote:null!==(l=null==y?void 0:y.note)&&void 0!==l?l:"",maritalClassification:null!==(c=null==y?void 0:y.marital)&&void 0!==c?c:"",transferTaxRate:null!==(u=null==v?void 0:v.rate)&&void 0!==u?u:null,transferTaxPayer:null!==(d=null==v?void 0:v.payer)&&void 0!==d?d:"None",escrowCushionMonths:b.cushionMonths,taxSetupNote:null!==(p=null===(m=b.row)||void 0===m?void 0:m.taxStructure)&&void 0!==p?p:"Single annual tax line (default)",nyFieldsActive:"New York"===e.state,appreciationRate:w.appreciation}}(t),X=[...(0,x.validationWarnings)(e),...(0,T.buildWarnings)({inputs:t,program:N,purchase:L,renovationOut:_,loan:B,payment:V,value:H,closing:Y,escrow:q,aus:j,mmw:G})];return{programCode:N.code,programLabel:N.label,isFha:N.isFha,renovationActive:N.renovationActive,purchase:L,renovationOut:_,loan:B,payment:V,value:H,closing:Y,escrowOut:q,cash:U,bpsOut:W,stateRules:Q,mmw:G,aus:j,warnings:X,traces:I.get(),preliminary:{renovationWithoutReserve:F.finalRenovationAmount,baseLoan:E.maximumBaseLoan,totalLoan:E.totalLoan,monthlyPayment:O.totalMonthlyPayment}}}})(requireDep, moduleExports, dep0, dep1, dep2, dep3, dep4, dep5, dep6, dep7, dep8, dep9, dep10, dep11, dep12, dep13, dep14, dep15, dep16, dep17, dep18, dep19);

export const runScenario = moduleExports.runScenario;
export default moduleExports;
