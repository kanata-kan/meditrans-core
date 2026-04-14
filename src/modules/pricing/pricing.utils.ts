import type { SystemConfigValues } from "@/lib/config";
import type { AppliedModifier, BreakdownLine } from "./pricing.types";

export function isNightTime(date: Date, config: SystemConfigValues): boolean {
  const hour = date.getHours();
  const { NIGHT_START_HOUR, NIGHT_END_HOUR } = config;
  if (NIGHT_START_HOUR > NIGHT_END_HOUR) {
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  }
  return hour >= NIGHT_START_HOUR && hour < NIGHT_END_HOUR;
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
