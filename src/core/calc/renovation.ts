// Renovation budget (HUD-92700 section B): rehabilitation escrow, fees released at closing, financed payments and the
// draw schedule. Line references (B1-B14) follow the 203(k) Maximum Mortgage Worksheet; HomeStyle uses the same pieces.
import { suggestDrawCount } from '../data/renovationRules';
import { nonNegative, clamp, round, sum } from '../utils/num';
import { money, pct, count } from './trace';

export interface DrawRow { draw: number; stage: string; scopeShare: number; releaseAmount: number; inspectionFee: number; titleFee: number; cumulativeRelease: number; remainingHoldback: number; }

/** Planned share of the construction cost released at each draw, by number of draws (1-7); 8-12 draws split evenly. */
const DRAW_STAGES: Record<number, {stage: string; share: number}[]> = {
  1: [{stage: 'Completion / final release', share: 1}],
  2: [{stage: 'Initial / material release', share: 0.5}, {stage: 'Completion / final release', share: 0.5}],
  3: [{stage: 'Demolition & structural', share: 0.4}, {stage: 'Rough mechanicals & drywall', share: 0.35}, {stage: 'Finish work & final', share: 0.25}],
  4: [{stage: 'Initial / material release', share: 0.25}, {stage: 'Demolition, foundation & framing', share: 0.3}, {stage: 'Rough mechanicals & drywall', share: 0.25}, {stage: 'Finish work & final', share: 0.2}],
  5: [{stage: 'Initial / material release', share: 0.2}, {stage: 'Demolition & framing', share: 0.2}, {stage: 'Rough mechanicals (plumbing, electrical, HVAC)', share: 0.2}, {stage: 'Drywall & interior', share: 0.2}, {stage: 'Finish work & final', share: 0.2}],
  6: [{stage: 'Initial / material release', share: 0.15}, {stage: 'Demolition', share: 0.15}, {stage: 'Foundation & framing', share: 0.2}, {stage: 'Rough mechanicals', share: 0.2}, {stage: 'Drywall & interior', share: 0.15}, {stage: 'Finish work & final', share: 0.15}],
  7: [{stage: 'Initial / material release', share: 0.14}, {stage: 'Demolition', share: 0.13}, {stage: 'Foundation & framing', share: 0.16}, {stage: 'Rough mechanicals', share: 0.17}, {stage: 'Drywall', share: 0.14}, {stage: 'Finish work', share: 0.14}, {stage: 'Final / completion', share: 0.12}],
};
function stagesFor(draws: number) {
  if (draws <= 0) return [];
  if (DRAW_STAGES[draws]) return DRAW_STAGES[draws];
  const share = 1 / draws;
  return Array.from({length: draws}, (_, i) => ({stage: i === 0 ? 'Initial / material release' : i === draws - 1 ? 'Final / completion' : `Construction stage ${i + 1}`, share}));
}

/**
 * @param paymentReserve financed mortgage payments (B4) in dollars - the engine passes 0 on its first pass and
 *        months x the first-pass monthly payment on the second (see docs/v57 S1).
 */
export function calculateRenovation(inputs: any, active: boolean, paymentReserve: unknown, trace?: any) {
  const reno = inputs.reno, draws = inputs.draws;
  const baseCost = nonNegative(reno.baseCost);
  const contingencyPct = nonNegative(reno.contingencyPct);
  const suggestedContingencyPct = reno.utilitiesOff ? 0.2 : 0.1;
  const {suggested: suggestedDrawCount} = suggestDrawCount(baseCost);
  const drawCount = draws.manualOverride ? Math.round(clamp(draws.manualDrawCount, 0, 12)) : suggestedDrawCount;
  const expectedInspectionFees = round(drawCount * nonNegative(draws.inspectionFeePerDraw), 2);
  const expectedTitleFees = round(drawCount * nonNegative(draws.titleFeePerDraw), 2);
  const inspectionFees = reno.syncDrawFees ? expectedInspectionFees : nonNegative(reno.inspectionFees);
  const titleUpdateFees = reno.syncDrawFees ? expectedTitleFees : nonNegative(reno.titleUpdateFees);

  if (!active) return {active: false, baseCost: 0, contingencyReserve: 0, suggestedContingencyPct, inspectionFees: 0, titleUpdateFees: 0, rehabEscrowSubtotal: 0, subtotalB10: 0,
    supplementalOrigination: 0, discountPointsRehab: 0, releasedAtClosing: 0, paymentReserve: 0, energyImprovements: 0, finalRenovationAmount: 0, escrowHoldback: 0, softCosts: 0,
    suggestedDrawCount, drawCount: 0, expectedInspectionFees: 0, expectedTitleFees: 0, drawSchedule: [] as DrawRow[], initialMaterialRelease: 0};

  const contingency = round(baseCost * contingencyPct, 2);                                   // B2
  const reserve = nonNegative(paymentReserve);                                                // B4
  const rehabEscrow = round(sum(baseCost, contingency, inspectionFees, titleUpdateFees, reserve), 2);   // B5 = B1 + B2 + B3 + B4
  const architectural = nonNegative(reno.architectural);                                      // B6
  const consultant = nonNegative(reno.consultant);                                            // B7
  const permits = nonNegative(reno.permits);                                                  // B8
  const otherFees = round(nonNegative(reno.feasibilityOther) + nonNegative(reno.otherFinanceable), 2);   // B9
  const subtotalB10 = round(rehabEscrow + architectural + consultant + permits + otherFees, 2);           // B10
  const suppOverride = nonNegative(reno.supplementalOriginationOverride) > 0;
  const supplementalOrigination = suppOverride ? nonNegative(reno.supplementalOriginationOverride)       // B11 (56.5: an entered 0 means "calculate")
    : subtotalB10 <= 0 ? 0 : round(Math.max(350, 0.015 * subtotalB10), 2);
  const discountPointsRehab = round(subtotalB10 * nonNegative(reno.discountPointsRehabPct), 2);           // B12
  const releasedAtClosing = round(architectural + consultant + permits + otherFees + supplementalOrigination + discountPointsRehab, 2);  // B13
  const energyImprovements = nonNegative(reno.energyImprovements);                            // A6
  const finalRenovationAmount = Math.max(0, round(rehabEscrow + releasedAtClosing - energyImprovements, 2));   // B14

  /* draw schedule: each release is the stage's share of the construction cost, rounded to the cent (56.5: no final-cent adjustment - docs/v57 D4) */
  let cumulative = 0;
  const drawSchedule: DrawRow[] = stagesFor(drawCount).map((s, i) => {
    const releaseAmount = round(baseCost * s.share, 2);
    cumulative = round(cumulative + releaseAmount, 2);
    return {draw: i + 1, stage: s.stage, scopeShare: s.share, releaseAmount, inspectionFee: nonNegative(draws.inspectionFeePerDraw), titleFee: nonNegative(draws.titleFeePerDraw),
      cumulativeRelease: cumulative, remainingHoldback: Math.max(0, round(rehabEscrow - cumulative, 2))};
  });

  if (trace) {
    trace.record('contingencyReserve', 'Contingency reserve (B2)', 'Contingency = Base Renovation x Contingency %', [money('Base renovation', baseCost), pct('Contingency %', contingencyPct)], contingency,
      {resultFormat: 'currency', notes: [`Suggested contingency with utilities ${reno.utilitiesOff ? 'off' : 'on'}: ${(100 * suggestedContingencyPct).toFixed(0)}%`]});
    trace.record('drawInspectionFees', 'Draw inspection fees (B3)', 'Inspection Fees = Number of Draws x Inspection Fee per Draw', [count('Draws', drawCount), money('Fee per draw', draws.inspectionFeePerDraw)], inspectionFees,
      {resultFormat: 'currency', overridesApplied: reno.syncDrawFees ? [] : ['Manually entered total (not synced to the draw planner)']});
    trace.record('drawTitleFees', 'Title update fees (B3)', 'Title Update Fees = Number of Draws x Title Update Fee per Draw', [count('Draws', drawCount), money('Fee per draw', draws.titleFeePerDraw)], titleUpdateFees,
      {resultFormat: 'currency', overridesApplied: reno.syncDrawFees ? [] : ['Manually entered total (not synced to the draw planner)']});
    trace.record('supplementalOrigination', 'Supplemental origination fee (B11)', 'B11 = MAX($350, 1.5% x B10 sub-total)', [money('B10 sub-total', subtotalB10)], supplementalOrigination,
      {resultFormat: 'currency', overridesApplied: suppOverride ? ['Manual override in use'] : [], notes: ['Recalculates automatically whenever any renovation cost changes.']});
    trace.record('finalRenovationAmount', 'Total rehabilitation cost (B14)', 'B14 = B5 (rehab escrow) + B13 (released at closing) - A6 (energy improvements)', [
      money('B1 base construction', baseCost), money('B2 contingency reserve', contingency), money('B3 inspections + title updates', round(inspectionFees + titleUpdateFees, 2)),
      money('B4 mortgage payments escrowed', reserve), money('B5 rehabilitation escrow', rehabEscrow), money('B6 architectural / engineering', architectural), money('B7 consultant', consultant),
      money('B8 permits', permits), money('B9 other fees', otherFees), money('B11 supplemental origination', supplementalOrigination), money('B12 discount points on rehab', discountPointsRehab),
      money('A6 energy improvements', energyImprovements)], finalRenovationAmount,
      {resultFormat: 'currency', notes: [`B10 sub-total ${subtotalB10.toFixed(2)}; B13 released at closing ${releasedAtClosing.toFixed(2)}.`, 'Energy improvements are financed separately and added to the acquisition basis.']});
  }

  return {active: true, baseCost, contingencyReserve: contingency, suggestedContingencyPct, inspectionFees, titleUpdateFees, rehabEscrowSubtotal: rehabEscrow, subtotalB10, supplementalOrigination,
    discountPointsRehab, releasedAtClosing, paymentReserve: reserve, energyImprovements, finalRenovationAmount, escrowHoldback: rehabEscrow,
    softCosts: round(architectural + consultant + permits + otherFees, 2), suggestedDrawCount, drawCount, expectedInspectionFees, expectedTitleFees, drawSchedule,
    initialMaterialRelease: inputs.loanProgram === 'Conventional' ? nonNegative(draws.initialMaterialRelease) : 0};
}

export default {calculateRenovation};
