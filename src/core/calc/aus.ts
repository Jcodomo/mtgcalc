// Qualification: qualifying income (borrowers + subject rental + vacating rental), DTI, FHA self-sufficiency, assets,
// reserves, and a planning risk score. A planning model, not an AUS decision.
import { SELF_SUFFICIENCY, dtiLimits, requiredReserveMonths, creditTierFromScore } from '../data/qualificationRules';
import { nonNegative, round, sum, safeDivide, currency } from '../utils/num';
import { money, pct, count, text } from './trace';

type PropertyType = '1 Family' | 'Single Family with ADU' | '2 Family' | '3 Family' | '4 Family' | string;

/** The subject property type from the rental entries (unit 4 rent means a 4-family, and so on) unless overridden. */
export function resolvePropertyType(inputs: any): {type: PropertyType; source: 'Override' | 'Auto'} {
  const r = inputs.rental;
  if (r.propertyTypeOverride !== 'Auto') return {type: r.propertyTypeOverride, source: 'Override'};
  if (nonNegative(r.unit4.gross) > 0) return {type: '4 Family', source: 'Auto'};
  if (nonNegative(r.unit3.gross) > 0) return {type: '3 Family', source: 'Auto'};
  if (nonNegative(r.unit2.gross) > 0) return {type: '2 Family', source: 'Auto'};
  if (nonNegative(r.adu.gross) > 0) return {type: 'Single Family with ADU', source: 'Auto'};
  return {type: '1 Family', source: 'Auto'};
}

export function unitsForPropertyType(type: PropertyType): number {
  switch (type) { case '4 Family': return 4; case '3 Family': return 3; case '2 Family': return 2; default: return 1; }
}

export function calculateAus({inputs, program, loan, payment, cashToCloseHigh, trace}: any) {
  /* income and debts */
  const grossIncome = round(sum(...inputs.borrowers.map((b: any) => nonNegative(b.grossMonthlyIncome))), 2);
  const otherIncome = round(sum(...inputs.borrowers.map((b: any) => nonNegative(b.otherMonthlyIncome))), 2);
  const borrowerIncome = round(grossIncome + otherIncome, 2);
  const borrowerDebts = round(sum(...inputs.borrowers.map((b: any) => nonNegative(b.monthlyDebts))), 2);

  /* subject rental income: the owner's unit never counts; other units count at their qualifying percentage */
  const {type: propertyType, source: propertyTypeSource} = resolvePropertyType(inputs);
  const rent = inputs.rental;
  const net = (unit: any, counts: boolean) => counts ? round(nonNegative(unit.gross) * nonNegative(unit.qualifyingPct), 2) : 0;
  const multi = propertyType === '2 Family' || propertyType === '3 Family' || propertyType === '4 Family';
  const netQualifyingRent = {main: 0, adu: net(rent.adu, propertyType === 'Single Family with ADU'), unit2: net(rent.unit2, multi),
    unit3: net(rent.unit3, propertyType === '3 Family' || propertyType === '4 Family'), unit4: net(rent.unit4, propertyType === '4 Family')};
  const subjectRent = round(netQualifyingRent.adu + netQualifyingRent.unit2 + netQualifyingRent.unit3 + netQualifyingRent.unit4, 2);

  /* departing residence kept as a rental (conventional only): positive net is income, negative is a debt */
  const vacating = !program.isFha && rent.includeVacatingRental;
  const vacatingNet = vacating ? round(nonNegative(rent.vacatingGrossRent) * nonNegative(rent.vacatingQualifyingPct) - nonNegative(rent.vacatingHousingExpense), 2) : 0;
  const vacatingStatus = vacating ? (vacatingNet > 0 ? `Income +${currency(vacatingNet)}` : vacatingNet < 0 ? `Debt +${currency(Math.abs(vacatingNet))}` : 'No adjustment') : 'N/A';
  const rentalIncomeUsed = round(subjectRent + Math.max(0, vacatingNet), 2);

  /* FHA self-sufficiency (planning model applies it from SELF_SUFFICIENCY.minUnits) */
  const units = unitsForPropertyType(propertyType);
  const selfSufficiencyApplies = program.isFha && units >= SELF_SUFFICIENCY.minUnits;
  const unitRents = [nonNegative(rent.mainUnit.gross), nonNegative(rent.unit2.gross), nonNegative(rent.unit3.gross), nonNegative(rent.unit4.gross)].slice(0, Math.max(1, units));
  const selfSufficiencyRent = selfSufficiencyApplies ? round(SELF_SUFFICIENCY.rentFactor * sum(...unitRents), 2) : 0;
  const housing = payment.totalMonthlyPayment;
  const selfSufficiencyCushion = round(selfSufficiencyRent - housing, 2);
  const selfSufficiencyStatus = selfSufficiencyApplies ? (selfSufficiencyCushion >= 0 ? `PASS by ${currency(selfSufficiencyCushion)}` : `FAIL by ${currency(Math.abs(selfSufficiencyCushion))}`) : 'N/A';

  /* DTI */
  const qualifyingIncome = round(borrowerIncome + rentalIncomeUsed, 2);
  const liabilities = round(borrowerDebts + Math.max(0, -vacatingNet), 2);
  const limits = dtiLimits(program.isFha ? 'FHA' : 'Conventional');
  const frontEndDti = safeDivide(housing, qualifyingIncome, 0);
  const backEndDti = safeDivide(housing + liabilities, qualifyingIncome, 0);
  const frontEndResult = qualifyingIncome === 0 ? 'ENTER INCOME' : frontEndDti < limits.front ? 'PASS' : 'FAIL';
  const backEndResult = qualifyingIncome === 0 ? 'ENTER INCOME' : backEndDti < limits.back ? 'PASS' : 'FAIL';
  const overallDti = frontEndResult === 'ENTER INCOME' || backEndResult === 'ENTER INCOME' ? 'ENTER INCOME' : frontEndResult === 'PASS' && backEndResult === 'PASS' ? 'PASS' : 'FAIL';
  const maxSupportedHousing = Math.max(0, round(Math.min(qualifyingIncome * limits.front, qualifyingIncome * limits.back - liabilities), 2));
  const paymentCushion = round(maxSupportedHousing - housing, 2);

  /* assets and reserves (gift funds never count as the borrower's own reserves) */
  const liquid = nonNegative(inputs.assets.liquidAssets), retirement = nonNegative(inputs.assets.retirementOtherAssets), gift = nonNegative(inputs.assets.giftFunds);
  const totalAssets = round(liquid + retirement + gift, 2);
  const giftShare = safeDivide(gift, totalAssets, 0);
  const giftUtilization = gift <= 0 ? 'None' : giftShare >= 0.5 ? '100%' : 'Partial';
  const assetsRemaining = Math.max(0, round(totalAssets - cashToCloseHigh, 2));
  const ownReserves = Math.max(0, round(liquid + retirement - cashToCloseHigh, 2));
  const reserveMonthsAvailable = safeDivide(ownReserves, housing, 0);
  const reserveRule = requiredReserveMonths(program.isFha ? 'FHA' : 'Conventional', propertyType, loan.loanToCost);
  const requiredReserveDollars = round(housing * reserveRule.months, 2);
  const reserveCushion = round(ownReserves - requiredReserveDollars, 2);
  /* no asset entered (every asset field blank) is "NOT ENTERED", never a pass (docs/v57 D5); an entered $0 is a real answer */
  const assetsEntered = ['liquidAssets', 'retirementOtherAssets', 'giftFunds'].some(k => inputs.assets[k] !== null && inputs.assets[k] !== undefined);
  const reserveStatus = !assetsEntered ? 'NOT ENTERED' : reserveCushion >= 0 ? `PASS by ${currency(reserveCushion)}` : `FAIL by ${currency(Math.abs(reserveCushion))}`;
  const reservesOk = assetsEntered && reserveCushion >= 0;
  const overallRentalReserve = selfSufficiencyApplies && selfSufficiencyCushion < 0 ? 'AT RISK' : !assetsEntered ? 'NOT ENTERED' : reservesOk ? 'PASS' : 'AT RISK';

  /* risk factors and planning score */
  const creditScore = nonNegative(inputs.creditScore), creditTier = creditTierFromScore(creditScore);
  const creditRisk = creditScore > 640 ? 'PASS' : 'AT RISK';
  const dtiRisk = overallDti === 'PASS' ? 'PASS' : 'AT RISK';
  const assetRisk = !assetsEntered ? 'NOT ENTERED' : assetsRemaining >= 3 * housing ? 'PASS' : assetsRemaining >= housing ? 'HIGH RISK' : 'AT RISK';
  const reserveRisk = !assetsEntered ? 'NOT ENTERED' : reserveMonthsAvailable >= reserveRule.months ? 'PASS' : reserveMonthsAvailable >= Math.max(1, reserveRule.months - 1) ? 'HIGH RISK' : 'AT RISK';
  const rentalRisk = overallRentalReserve === 'PASS' ? 'PASS' : overallRentalReserve === 'NOT ENTERED' ? 'NOT ENTERED' : 'AT RISK';
  const giftRisk = giftUtilization === 'None' ? 'PASS' : 'HIGH RISK';
  let score = 100;
  if (qualifyingIncome === 0) score -= 35;
  score -= creditScore < 640 ? 30 : creditScore < 680 ? 18 : creditScore < 700 ? 10 : 0;
  score -= backEndDti > limits.back ? 25 : backEndDti > 0.45 ? 10 : 0;
  score -= frontEndDti > limits.front ? 15 : 0;
  score -= reserveMonthsAvailable === 0 ? 20 : reserveMonthsAvailable < 2 ? 12 : reserveMonthsAvailable < reserveRule.months ? 5 : 0;
  score -= assetsRemaining < housing ? 15 : assetsRemaining < 3 * housing ? 7 : 0;
  score -= reserveCushion < 0 ? 20 : 0;
  score -= giftUtilization === '100%' ? 10 : giftUtilization === 'Partial' ? 4 : 0;
  score -= overallRentalReserve === 'AT RISK' ? 25 : 0;
  const ausPlanningScore = Math.max(0, Math.round(score));
  const overallRiskLevel = qualifyingIncome === 0 || (creditScore > 0 && creditScore <= 640 && reserveMonthsAvailable === 0) || reserveCushion < 0 || overallRentalReserve === 'AT RISK' ? 'AT RISK'
    : ausPlanningScore >= 80 ? 'PASS' : ausPlanningScore >= 60 ? 'HIGH RISK' : 'AT RISK';

  if (trace) {
    trace.record('totalQualifyingIncome', 'Total qualifying income', 'Qualifying Income = Borrower Income + Subject Rental Income + MAX(0, Vacating Net Adjustment)',
      [money('Borrower gross income', grossIncome), money('Borrower other income', otherIncome), money('Subject qualifying rent', subjectRent), money('Vacating net adjustment', Math.max(0, vacatingNet))], qualifyingIncome,
      {resultFormat: 'currency', notes: ['The subject main/owner unit rent is excluded from qualifying income.']});
    trace.record('frontEndDti', 'Front-end DTI', 'Front-End DTI = Housing Payment / Total Qualifying Income', [money('Housing payment', housing), money('Qualifying income', qualifyingIncome), pct('Limit', limits.front)], frontEndDti,
      {resultFormat: 'percent', notes: [`Result: ${frontEndResult}`]});
    trace.record('backEndDti', 'Back-end DTI', 'Back-End DTI = (Housing Payment + Monthly Liabilities) / Total Qualifying Income',
      [money('Housing payment', housing), money('Monthly liabilities', liabilities), money('Qualifying income', qualifyingIncome), pct('Limit', limits.back)], backEndDti, {resultFormat: 'percent', notes: [`Result: ${backEndResult}`]});
    trace.record('selfSufficiency', 'FHA self-sufficiency test', 'Test Rent = 75% x gross rents of all legal units; Cushion = Test Rent - Housing Payment',
      [text('Property type', propertyType), money('75% test rent', selfSufficiencyRent), money('Housing payment', housing)], selfSufficiencyCushion,
      {resultFormat: 'currency', notes: [selfSufficiencyStatus, `This planning model runs the test from ${SELF_SUFFICIENCY.minUnits} units; FHA policy applies it to 3-4 unit properties.`]});
    trace.record('reserveCushion', 'Reserve cushion', 'Own-Fund Reserves After Closing - (Housing Payment x Required Months)',
      [money('Liquid + retirement assets', round(liquid + retirement, 2)), money('Cash to close (high)', cashToCloseHigh), money('Own-fund reserves after closing', ownReserves), count('Required reserve months', reserveRule.months), money('Required reserve dollars', requiredReserveDollars)],
      reserveCushion, {resultFormat: 'currency', notes: [reserveStatus, reserveRule.note, 'Gift funds do not count toward own-fund reserves.']});
    trace.record('ausPlanningScore', 'AUS planning score', 'Starts at 100 and deducts for credit, DTI, reserves, assets, gift reliance and rental/self-sufficiency risk',
      [count('Credit score', creditScore), pct('Front-end DTI', frontEndDti), pct('Back-end DTI', backEndDti), count('Reserve months available', round(reserveMonthsAvailable, 2)), money('Assets remaining after closing', assetsRemaining),
        text('Gift utilisation', giftUtilization), text('Rental / reserve', overallRentalReserve)], ausPlanningScore, {resultFormat: 'number', notes: [`Overall risk level: ${overallRiskLevel}`]});
  }

  return {totalGrossIncome: grossIncome, totalOtherIncome: otherIncome, totalBorrowerIncome: borrowerIncome, totalBorrowerDebts: borrowerDebts, propertyType, propertyTypeSource, netQualifyingRent,
    totalSubjectQualifyingRent: subjectRent, vacatingNetAdjustment: vacatingNet, vacatingStatus, rentalIncomeUsedForDti: rentalIncomeUsed, fhaSelfSufficiencyRent: selfSufficiencyRent,
    selfSufficiencyCushion, selfSufficiencyStatus, selfSufficiencyApplies, totalQualifyingIncome: qualifyingIncome, totalMonthlyLiabilities: liabilities, housingPayment: housing, frontEndDti, backEndDti,
    frontEndLimit: limits.front, backEndLimit: limits.back, frontEndResult, backEndResult, overallDti, maxSupportedHousingPayment: maxSupportedHousing, paymentCushion,
    totalAssetsIncludingGift: totalAssets, giftPctOfAssets: giftShare, giftUtilization, assetsRemainingAfterClosing: assetsRemaining, ownFundReservesAfterClosing: ownReserves,
    reserveMonthsAvailable, requiredReserveMonths: reserveRule.months, requiredReserveDollars, reserveCushion, reserveStatus, overallRentalReserve, creditTier,
    riskFactors: [{factor: 'Credit', result: creditRisk}, {factor: 'DTI', result: dtiRisk}, {factor: 'Assets', result: assetRisk}, {factor: 'Reserves', result: reserveRisk},
      {factor: 'Rental / self-sufficiency', result: rentalRisk}, {factor: 'Gift funds', result: giftRisk}, {factor: 'Overall profile', result: overallRiskLevel}],
    ausPlanningScore, overallRiskLevel, notes: reserveRule.note};
}

export default {resolvePropertyType, unitsForPropertyType, calculateAus};
