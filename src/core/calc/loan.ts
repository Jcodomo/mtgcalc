// Loan amount: total acquisition cost, the FHA value basis (HUD-92700 C3), minimum statutory investment, required
// investment, base loan before limits, FHA county limit and value caps, upfront MIP and total loan.
import { suggestFhaTier, fhaStandardFloor, lookupFhaLimit } from '../data/fhaLimits';
import { nonNegative, round, safeDivide } from '../utils/num';
import { money, pct, count, text } from './trace';
import { HOMESTYLE_MAX_LTV, FHA_203K_ARV_FACTOR } from '../data/renovationRules';

/** Price + rehabilitation + energy improvements, to the cent. */
export function calculateTotalAcquisition(price: unknown, rehab: unknown, energy: unknown = 0): number {
  return round(nonNegative(price) + nonNegative(rehab) + nonNegative(energy), 2);
}

/** HUD-92700 C3: MIN( MIN(price, as-is value) + rehabilitation , 110% of ARV ); no ARV means no 110% cap. */
export function calculateValueBasis(price: unknown, asIsValue: unknown, rehab: unknown, afterRepairValue: unknown) {
  const p = nonNegative(price), asIs = nonNegative(asIsValue);
  const c1 = asIs > 0 ? Math.min(p, asIs) : p;
  const beforeCap = round(c1 + nonNegative(rehab), 2);
  const arv110 = nonNegative(afterRepairValue) > 0 ? round(1.1 * nonNegative(afterRepairValue), 2) : null;
  const basis = arv110 !== null ? Math.min(beforeCap, arv110) : beforeCap;
  return {valueBasis: round(basis, 2), c1, arv110, cappedByArv: arv110 !== null && arv110 < beforeCap};
}

export function calculateRequiredInvestment(minimumStatutoryInvestment: unknown, selectedDownPayment: unknown): number {
  return Math.max(nonNegative(minimumStatutoryInvestment), nonNegative(selectedDownPayment));
}

/** Largest base loan the after-repair value supports, or null when no ARV is entered. */
export function valueSupportedBaseLoan(afterRepairValue: unknown, downPaymentPct: unknown, isFha: boolean, maxLtv: unknown = 1): number | null {
  const arv = nonNegative(afterRepairValue);
  if (arv <= 0) return null;
  const financedShare = 1 - nonNegative(downPaymentPct);
  return isFha ? round(arv * FHA_203K_ARV_FACTOR * financedShare, 2) : round(arv * Math.min(financedShare, nonNegative(maxLtv)), 2);
}

export function calculateFhaLimit(inputs: any, isFha: boolean) {
  const units = Math.min(4, Math.max(1, Math.round(inputs.units)));
  const ny = inputs.state === 'New York';
  const suggestedTier = suggestFhaTier(inputs.state, ny ? inputs.nyCounty : '', ny && inputs.isNYC);
  const appliedTier = inputs.fhaAreaSelection === 'Auto' ? suggestedTier : inputs.fhaAreaSelection;
  if (!isFha) return {units, suggestedTier, appliedTier: null, limit: 0, standardFloor: fhaStandardFloor(units), usedFallback: false, areaDescription: 'N/A - Conventional financing'};
  const {limit, row, usedFallback} = lookupFhaLimit(inputs.state, appliedTier, units);
  return {units, suggestedTier, appliedTier, limit, standardFloor: fhaStandardFloor(units), usedFallback, areaDescription: row?.area ?? 'National tier fallback'};
}

const percentLabel = (x: number) => `${(100 * x).toFixed(0)}%`;

export function calculateLoan({inputs, program, purchase, finalRenovationAmount, energyImprovements, trace}: any) {
  const rehab = program.renovationActive ? nonNegative(finalRenovationAmount) : 0;
  const energy = program.renovationActive ? nonNegative(energyImprovements) : 0;
  const totalAcquisition = calculateTotalAcquisition(purchase.finalPurchasePrice, rehab, energy);
  const downPct = nonNegative(inputs.finalDownPaymentPct);
  const value = calculateValueBasis(purchase.finalPurchasePrice, inputs.asIsValue, rehab, inputs.afterRepairValue);

  /* FHA measures the statutory investment and the loan against the C3 value basis; conventional against total acquisition */
  let msi: number, baseBeforeLimits: number, msiBasisLabel: string;
  if (program.isFha) {
    msi = round(value.valueBasis * downPct, 2);
    baseBeforeLimits = Math.max(0, round(value.valueBasis * (1 - downPct) + energy, 2));
    msiBasisLabel = 'HUD-92700 line C3 value basis';
  } else {
    msi = round(totalAcquisition * downPct, 2);
    baseBeforeLimits = Math.max(0, round(totalAcquisition - Math.max(msi, purchase.finalDownPayment), 2));
    msiBasisLabel = 'Total acquisition cost';
  }
  const requiredInvestment = calculateRequiredInvestment(msi, purchase.finalDownPayment);
  const fha = calculateFhaLimit(inputs, program.isFha);
  const maxLtv = program.renovationActive ? HOMESTYLE_MAX_LTV : 1;
  const valueSupported = valueSupportedBaseLoan(inputs.afterRepairValue, downPct, program.isFha, maxLtv);

  let maximumBaseLoan = baseBeforeLimits;
  const limitsApplied: string[] = [];
  const fhaLimitBinds = program.fhaLimitsEnabled && fha.limit < baseBeforeLimits;
  if (fhaLimitBinds) { maximumBaseLoan = fha.limit; limitsApplied.push(`FHA limit ${fha.limit.toLocaleString()}`); }
  const valueBinds = !program.isFha && valueSupported !== null && valueSupported < maximumBaseLoan;
  if (valueBinds) { maximumBaseLoan = valueSupported as number; limitsApplied.push(program.renovationActive ? `HomeStyle ${percentLabel(HOMESTYLE_MAX_LTV)} LTV of the as-completed value` : `Value-supported loan ${(valueSupported as number).toLocaleString()}`); }
  if (program.isFha && value.cappedByArv) limitsApplied.push('110% of after-repair value (inside the C3 basis)');
  maximumBaseLoan = Math.max(0, round(maximumBaseLoan, 2));

  const limitBinding = fhaLimitBinds && (valueBinds || value.cappedByArv) ? 'both' : fhaLimitBinds ? 'fha-limit' : valueBinds || (program.isFha && value.cappedByArv) ? 'value' : 'none';
  const amountOverFhaLimit = program.fhaLimitsEnabled ? Math.max(0, round(baseBeforeLimits - fha.limit, 2)) : 0;
  const ufmip = program.ufmipEnabled ? round(maximumBaseLoan * nonNegative(inputs.ufmipRate), 2) : 0;
  const totalLoan = round(maximumBaseLoan + ufmip, 2);
  const fhaLimitStatus = program.fhaLimitsEnabled ? (amountOverFhaLimit > 0 ? `LOAN EXCEEDS FHA LIMIT by ${amountOverFhaLimit.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0})}` : 'Within selected FHA loan limit') : 'N/A - Conventional financing';
  const loanToCost = safeDivide(maximumBaseLoan, totalAcquisition, 0);
  const finalValue = program.renovationActive ? (nonNegative(inputs.afterRepairValue) || totalAcquisition) : (nonNegative(inputs.asIsValue) || purchase.finalPurchasePrice);
  const ltvOnFinalValue = safeDivide(maximumBaseLoan, finalValue, 0);
  const arvLtv = safeDivide(totalLoan, nonNegative(inputs.afterRepairValue), 0);

  /* Additional funds (docs/v57 D1): whatever the acquisition costs beyond the loan and the required investment must come
     from the borrower. Causes: a loan limit or value cap, and (FHA) a price above the as-is value or a 110%-of-ARV cap,
     which keep the C3 value basis below the purchase cost. */
  const additionalFundsRequired = Math.max(0, round(totalAcquisition - maximumBaseLoan - requiredInvestment, 2));
  const additionalFundsReasons: {label: string; amount: number}[] = [];
  if (additionalFundsRequired > 0) {
    const limitShortfall = Math.max(0, round(baseBeforeLimits - maximumBaseLoan, 2));
    if (limitShortfall > 0) additionalFundsReasons.push({label: fhaLimitBinds && !valueBinds ? `FHA county loan limit (${fha.limit.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0})}) - loan reduced` : valueBinds && !fhaLimitBinds ? (program.renovationActive ? `HomeStyle ${percentLabel(HOMESTYLE_MAX_LTV)} of the as-completed value - loan reduced` : 'Value-supported loan - loan reduced') : 'Loan limit and value cap - loan reduced', amount: limitShortfall});
    if (program.isFha) {
      const priceOverValue = Math.max(0, round(nonNegative(purchase.finalPurchasePrice) - value.c1, 2));
      const arvGap = value.cappedByArv && value.arv110 !== null ? Math.max(0, round(round(value.c1 + rehab, 2) - value.arv110, 2)) : 0;
      if (priceOverValue > 0) additionalFundsReasons.push({label: 'Purchase price above the as-is value (not in the FHA value basis)', amount: priceOverValue});
      if (arvGap > 0) additionalFundsReasons.push({label: 'Cost above 110% of the after-repair value (not in the FHA value basis)', amount: arvGap});
    }
    const explained = round(additionalFundsReasons.reduce((t, r) => t + r.amount, 0), 2);
    const rest = round(additionalFundsRequired - explained, 2);
    if (Math.abs(rest) >= 0.01) additionalFundsReasons.push({label: rest > 0 ? 'Other difference between the purchase cost and the loan plus required investment' : 'Less: down payment already above the minimum', amount: rest});
  }

  if (trace) {
    trace.record('totalAcquisitionCost', 'Total acquisition cost', program.renovationActive ? 'Total Acquisition = Final Purchase Price + Total Rehabilitation Cost + Energy Improvements' : 'Total Acquisition = Final Purchase Price (renovation excluded)',
      [money('Final purchase price', purchase.finalPurchasePrice), money('Total rehabilitation cost', rehab), money('Energy improvements', energy)], totalAcquisition, {resultFormat: 'currency'});
    trace.record('valueBasis', 'Value basis (HUD-92700 C3)', 'C3 = MIN( MIN(Sales Price, As-Is Value) + Rehabilitation Cost , 110% of ARV )',
      [money('Contract sales price', purchase.finalPurchasePrice), money('As-is value', inputs.asIsValue), money('C1 lesser of price / as-is', value.c1), money('Total rehabilitation cost', rehab), money('110% of ARV', value.arv110 ?? 0)], value.valueBasis,
      {resultFormat: 'currency', limitsApplied: value.cappedByArv ? ['Capped by 110% of the after-repair value'] : [], notes: value.arv110 === null ? ['No ARV entered, so the 110% cap has not been applied.'] : []});
    trace.record('minimumStatutoryInvestment', 'Minimum statutory investment', program.isFha ? 'MSI = C3 Value Basis x Down Payment %  (HUD-92700 line C5)' : 'MSI = Total Acquisition Cost x Down Payment %',
      [money(program.isFha ? 'C3 value basis' : 'Total acquisition', program.isFha ? value.valueBasis : totalAcquisition), pct('Down payment %', downPct)], msi,
      {resultFormat: 'currency', notes: [program.isFha ? 'FHA takes the statutory investment against the C3 value basis, not against total acquisition cost.' : 'Conventional minimum investment is measured against total acquisition cost.']});
    trace.record('requiredInvestment', 'Required investment', 'Required Investment = MAX(Minimum Statutory Investment, Selected Down Payment)',
      [money('Minimum statutory investment', msi), money('Selected down payment', purchase.finalDownPayment)], requiredInvestment,
      {resultFormat: 'currency', notes: [msi > purchase.finalDownPayment ? 'The statutory minimum is higher than the entered down payment, so the statutory minimum controls.' : 'The entered down payment meets or exceeds the statutory minimum.']});
    trace.record('baseLoanBeforeLimits', 'Base loan before limits', program.isFha ? 'Base Loan = C3 Value Basis x (1 - Down Payment %) + Energy Improvements' : 'Base Loan = Total Acquisition Cost - Required Investment',
      program.isFha ? [money('C3 value basis', value.valueBasis), pct('Down payment %', downPct), money('Energy improvements', energy)] : [money('Total acquisition', totalAcquisition), money('Required investment', requiredInvestment)], baseBeforeLimits, {resultFormat: 'currency'});
    trace.record('maximumBaseLoan', 'Maximum base loan', program.fhaLimitsEnabled ? 'Max Base Loan = MIN(Base Loan, FHA County Limit)' : 'Max Base Loan = MIN(Base Loan, Value-Supported Loan)',
      [money('Base loan before limits', baseBeforeLimits), ...(program.fhaLimitsEnabled ? [money('Applied FHA limit', fha.limit)] : []), ...(valueSupported !== null ? [money('Value-supported loan', valueSupported)] : [])], maximumBaseLoan,
      {resultFormat: 'currency', limitsApplied});
    if (additionalFundsRequired > 0) trace.record('additionalFundsRequired', 'Additional funds required (not financed)', 'Additional Funds = MAX(0, Total Acquisition - Maximum Base Loan - Required Investment)',
      [money('Total acquisition', totalAcquisition), money('Maximum base loan', maximumBaseLoan), money('Required investment', requiredInvestment)], additionalFundsRequired,
      {resultFormat: 'currency', notes: additionalFundsReasons.map(r => `${r.label}: ${r.amount.toFixed(2)}`)});
    trace.record('ufmip', 'FHA upfront MIP', program.ufmipEnabled ? 'UFMIP = Maximum (capped) Base Loan x UFMIP Rate' : 'UFMIP = $0 (Conventional financing)',
      [money('Maximum base loan', maximumBaseLoan), pct('UFMIP rate', program.ufmipEnabled ? inputs.ufmipRate : 0)], ufmip, {resultFormat: 'currency'});
    trace.record('totalLoan', 'Total loan amount', program.ufmipEnabled ? 'Total Loan = Base Loan + UFMIP' : 'Total Loan = Base Loan', [money('Maximum base loan', maximumBaseLoan), money('UFMIP', ufmip)], totalLoan, {resultFormat: 'currency'});
    trace.record('fhaLimit', 'FHA loan limit check', 'Applied Limit = lookup(State, Area Tier, Units)',
      [text('State', inputs.state), text('Area tier', program.fhaLimitsEnabled ? String(fha.appliedTier) : 'N/A'), count('Units', fha.units), money('Standard floor', fha.standardFloor), money('Base loan before limits', baseBeforeLimits)],
      program.fhaLimitsEnabled ? fha.limit : 0,
      {resultFormat: 'currency', notes: [fhaLimitStatus, fha.usedFallback ? 'No exact county row found - national tier fallback used.' : fha.areaDescription],
        overridesApplied: inputs.fhaAreaSelection !== 'Auto' ? [`Area tier manually set to ${inputs.fhaAreaSelection} (auto suggestion: ${fha.suggestedTier})`] : []});
  }

  return {totalAcquisitionCost: totalAcquisition, valueBasis: value.valueBasis, minimumStatutoryInvestment: msi, msiBasisLabel, selectedDownPayment: purchase.finalDownPayment, requiredInvestment,
    baseLoanBeforeLimits: baseBeforeLimits, fhaLimitApplied: program.fhaLimitsEnabled ? fha.limit : 0, fhaStandardFloor: fha.standardFloor, fhaTier: program.fhaLimitsEnabled ? fha.appliedTier : null,
    valueSupportedBaseLoan: valueSupported, maximumBaseLoan, limitBinding, amountOverFhaLimit, fhaLimitStatus, ufmip, totalLoan, loanToCost, ltvOnFinalValue, arvLtv,
    additionalFundsRequired, additionalFundsReasons};
}

export default {calculateTotalAcquisition, calculateValueBasis, calculateRequiredInvestment, valueSupportedBaseLoan, calculateFhaLimit, calculateLoan};
