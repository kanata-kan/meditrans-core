import { type Prisma } from "@prisma/client";
import { getSystemConfig } from "@/lib/config";
import { db } from "@/lib/db";
import {
  PricingCatalogNotFoundError,
  PricingRuleNotFoundError,
  PricingValidationError,
} from "./pricing.errors";
import * as pricingRepo from "./pricing.repository";
import type {
  AppliedModifier,
  PricingInput,
  PricingResult,
} from "./pricing.types";
import { buildBreakdown, computeSpecificity } from "./pricing.utils";

export async function calculatePrice(
  input: PricingInput,
  callerId: number,
  callerRole: string,
  opts: { persist: boolean; serviceId?: number },
): Promise<PricingResult> {
  const config = await getSystemConfig();

  // STEP 1 — Resolve catalog entry
  const catalog = await pricingRepo.findCatalogEntry(input.catalogCode);
  if (!catalog) throw new PricingCatalogNotFoundError(input.catalogCode);

  // STEP 2 — Resolve best matching pricing rule
  const rules = await pricingRepo.findPricingRules(input.catalogCode);

  const matchingRules = rules.filter((rule: (typeof rules)[number]) => {
    if (rule.isUrgent !== null && rule.isUrgent !== input.isUrgent)
      return false;
    if (rule.staffType !== null && rule.staffType !== (input.staffType ?? null))
      return false;
    if (
      rule.durationHours !== null &&
      rule.durationHours !== (input.durationHours ?? null)
    )
      return false;
    return true;
  });

  if (matchingRules.length === 0) {
    throw new PricingRuleNotFoundError(input.catalogCode);
  }

  type RuleRow = (typeof matchingRules)[number];
  const bestRule = matchingRules.sort(
    (a: RuleRow, b: RuleRow) =>
      computeSpecificity(b) - computeSpecificity(a) ||
      b.validFrom.getTime() - a.validFrom.getTime(),
  )[0];

  const basePrice = Number(bestRule.basePrice);
  const matchedRuleIds = [bestRule.id];

  // STEP 3 — Distance fee
  let distanceFee = 0;
  if (catalog.requiresDistance && input.distanceKm > 0) {
    const rate = await pricingRepo.findActiveDistanceRate();
    if (rate) {
      distanceFee = input.distanceKm * Number(rate.pricePerKm);
    }
  }

  // STEP 4 — Apply selected modifiers
  let subtotal = basePrice + distanceFee;
  const modifiersApplied: AppliedModifier[] = [];

  const allModifiers =
    input.selectedModifiers.length > 0
      ? await pricingRepo.findActiveModifiers(input.selectedModifiers)
      : [];

  for (const mod of allModifiers) {
    const prevSubtotal = subtotal;
    if (mod.type === "multiplier") {
      subtotal = subtotal * Number(mod.value);
    } else if (mod.type === "flat_add") {
      subtotal = subtotal + Number(mod.value);
    }
    modifiersApplied.push({
      code: mod.code,
      nameFr: mod.nameFr,
      type: mod.type as "flat_add" | "multiplier",
      value: Number(mod.value),
      amountImpact: subtotal - prevSubtotal,
    });
  }

  const subtotalHt = subtotal;

  // STEP 5 — TVA
  const tvaRate = catalog.tvaExempt ? 0 : config.DEFAULT_TVA_RATE;
  const tvaAmount = subtotalHt * tvaRate;
  let totalTtc = subtotalHt + tvaAmount;

  // STEP 6 — Manual override (admin only)
  let isOverridden = false;
  let overrideOriginalTotal: number | undefined;

  if (input.manualOverride) {
    if (callerRole !== "admin") {
      throw new PricingValidationError(
        "Rôle administrateur requis pour appliquer un tarif manuel.",
      );
    }
    if (
      !input.manualOverride.reason ||
      input.manualOverride.reason.trim().length < 10
    ) {
      throw new PricingValidationError(
        "La raison du tarif manuel est obligatoire (minimum 10 caractères).",
      );
    }
    overrideOriginalTotal = totalTtc;
    totalTtc = input.manualOverride.total;
    isOverridden = true;
  }

  // STEP 7 — Persist snapshot
  let snapshotId = 0;

  if (opts.persist && opts.serviceId !== undefined) {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.pricingSnapshot.findFirst({
        where: { serviceId: opts.serviceId!, isCurrent: true },
        orderBy: { version: "desc" },
      });

      const nextVersion = existing ? existing.version + 1 : 1;

      if (existing) {
        await tx.pricingSnapshot.update({
          where: { id: existing.id },
          data: { isCurrent: false },
        });
      }

      const snapshot = await tx.pricingSnapshot.create({
        data: {
          serviceId: opts.serviceId!,
          version: nextVersion,
          isCurrent: true,
          inputParams: input as object,
          basePrice,
          distanceFee,
          modifiersApplied: modifiersApplied as object[],
          subtotalHt,
          tvaRate,
          tvaAmount,
          totalTtc,
          matchedRuleIds,
          isOverridden,
          overrideReason: input.manualOverride?.reason ?? null,
          overrideById: isOverridden ? callerId : null,
          overrideOriginalTotal: overrideOriginalTotal ?? null,
        },
      });

      snapshotId = snapshot.id;
    });
  }

  return {
    basePrice,
    distanceFee,
    modifiersApplied,
    subtotalHt,
    tvaRate,
    tvaAmount,
    totalTtc,
    breakdown: buildBreakdown(
      basePrice,
      distanceFee,
      modifiersApplied,
      tvaAmount,
      totalTtc,
      isOverridden,
      overrideOriginalTotal,
    ),
    matchedRuleIds,
    isOverridden,
    overrideOriginalTotal,
    snapshotId,
  };
}
