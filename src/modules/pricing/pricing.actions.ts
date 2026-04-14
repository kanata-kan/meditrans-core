"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { pricingInputSchema, applyOverrideSchema } from "./pricing.schema";
import { calculatePrice } from "./pricing.engine";
import { PricingValidationError } from "./pricing.errors";

export async function previewPriceAction(
  rawInput: unknown,
  callerId: number,
  callerRole: string,
) {
  const parsed = pricingInputSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  try {
    const result = await calculatePrice(parsed.data, callerId, callerRole, {
      persist: false,
    });
    return { success: true, data: result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur de calcul du tarif.";
    return { success: false, error: message };
  }
}

export async function applyOverrideAction(
  rawInput: unknown,
  callerId: number,
  callerRole: string,
) {
  if (callerRole !== "admin") {
    return { success: false, error: "Rôle administrateur requis." };
  }

  const parsed = applyOverrideSchema.safeParse(rawInput);
  if (!parsed.success) return { success: false, error: parsed.error.flatten() };

  const { serviceId, newTotal, reason } = parsed.data;

  try {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.pricingSnapshot.findFirst({
        where: { serviceId, isCurrent: true },
      });

      if (!current)
        throw new PricingValidationError(
          "Aucun tarif actif trouvé pour ce service.",
        );

      await tx.pricingSnapshot.update({
        where: { id: current.id },
        data: { isCurrent: false },
      });

      const newSnapshot = await tx.pricingSnapshot.create({
        data: {
          serviceId,
          version: current.version + 1,
          isCurrent: true,
          inputParams: current.inputParams,
          basePrice: current.basePrice,
          distanceFee: current.distanceFee,
          modifiersApplied: current.modifiersApplied,
          subtotalHt: current.subtotalHt,
          tvaRate: current.tvaRate,
          tvaAmount: current.tvaAmount,
          totalTtc: newTotal,
          matchedRuleIds: current.matchedRuleIds,
          isOverridden: true,
          overrideReason: reason,
          overrideById: callerId,
          overrideOriginalTotal: current.totalTtc,
        },
      });

      const invoiceLine = await tx.invoiceLine.findUnique({
        where: { serviceId },
      });

      if (invoiceLine) {
        await tx.invoiceLine.update({
          where: { serviceId },
          data: {
            snapshotId: newSnapshot.id,
            lineTotalTtc: newTotal,
            lineTotalHt: current.subtotalHt,
            lineTva: current.tvaAmount,
          },
        });

        const allLines = await tx.invoiceLine.findMany({
          where: { invoiceId: invoiceLine.invoiceId },
        });
        const totals = allLines.reduce(
          (
            acc: { ht: number; tva: number; ttc: number },
            l: {
              lineTotalHt: unknown;
              lineTva: unknown;
              lineTotalTtc: unknown;
            },
          ) => ({
            ht: acc.ht + Number(l.lineTotalHt),
            tva: acc.tva + Number(l.lineTva),
            ttc: acc.ttc + Number(l.lineTotalTtc),
          }),
          { ht: 0, tva: 0, ttc: 0 },
        );

        await tx.invoice.update({
          where: { id: invoiceLine.invoiceId },
          data: {
            totalHt: totals.ht,
            totalTva: totals.tva,
            totalTtc: totals.ttc,
          },
        });
      }
    });

    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erreur lors de l'application du tarif manuel.";
    return { success: false, error: message };
  }
}
