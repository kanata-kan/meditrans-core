import type { AppliedModifier, BreakdownLine } from "./pricing.types";

/**
 * Determines if a given date/time falls within the night window.
 * Night window is defined by config: NIGHT_START_HOUR (e.g. 21) to NIGHT_END_HOUR (e.g. 7).
 * Used by the UI to auto-suggest the NIGHT_SURCHARGE modifier.
 */
export function isNightTime(
  scheduledAt: Date,
  config: { NIGHT_START_HOUR: number; NIGHT_END_HOUR: number },
): boolean {
  const hour = scheduledAt.getHours();
  if (config.NIGHT_START_HOUR > config.NIGHT_END_HOUR) {
    // Overnight window: e.g. 21:00 → 07:00
    return hour >= config.NIGHT_START_HOUR || hour < config.NIGHT_END_HOUR;
  }
  // Same-day window (unusual but handled)
  return hour >= config.NIGHT_START_HOUR && hour < config.NIGHT_END_HOUR;
}

/**
 * Returns the applicable TVA rate based on catalog exemption.
 */
export function getTvaRate(tvaExempt: boolean, defaultRate: number): number {
  return tvaExempt ? 0 : defaultRate;
}

export function computeSpecificity(rule: {
  isUrgent: boolean | null;
  staffType: string | null;
  durationHours: number | null;
}): number {
  let score = 0;
  if (rule.isUrgent !== null) score++;
  if (rule.staffType !== null) score++;
  if (rule.durationHours !== null) score++;
  return score;
}

export function buildBreakdown(
  basePrice: number,
  distanceFee: number,
  modifiers: AppliedModifier[],
  tvaAmount: number,
  totalTtc: number,
  isOverridden: boolean,
  overrideOriginalTotal?: number,
): BreakdownLine[] {
  const lines: BreakdownLine[] = [
    { label: "Prix de base", amount: basePrice },
  ];

  if (distanceFee > 0) {
    lines.push({ label: "Frais de déplacement", amount: distanceFee });
  }

  for (const mod of modifiers) {
    lines.push({ label: mod.nameFr, amount: mod.amountImpact });
  }

  lines.push({ label: "TVA (10%)", amount: tvaAmount });

  if (isOverridden && overrideOriginalTotal !== undefined) {
    lines.push({
      label: `Ajustement manuel (montant calculé : ${overrideOriginalTotal.toFixed(2)} MAD)`,
      amount: totalTtc - overrideOriginalTotal,
    });
  }

  return lines;
}
