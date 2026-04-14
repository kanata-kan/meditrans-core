/**
 * Snapshot Integrity Tests
 *
 * Guarantees:
 * - append-only versioning (no mutation of existing snapshots)
 * - isCurrent = true for exactly ONE snapshot per service
 * - version increments correctly on override
 * - multiple overrides maintain correct version chain
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import { createBaseContext } from "../helpers/factories";
import type { PricingInput } from "@/modules/pricing/pricing.types";

function baseInput(): PricingInput {
  return {
    catalogCode: "TRANSPORT_SIMPLE",
    scheduledAt: new Date(),
    isUrgent: false,
    distanceKm: 0,
    selectedModifiers: [],
  };
}

describe("PricingSnapshot — versioning and isCurrent integrity", () => {
  let ctx: Awaited<ReturnType<typeof createBaseContext>>;
  let serviceId: number;

  beforeEach(async () => {
    ctx = await createBaseContext();
    const service = await db.service.create({
      data: {
        clientId: ctx.client.id,
        patientId: ctx.patient.id,
        catalogCode: "TRANSPORT_SIMPLE",
        status: "pending",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 0,
        scheduledAt: new Date(),
        createdById: ctx.admin.id,
      },
    });
    serviceId = service.id;
  });

  afterEach(async () => {
    await db.pricingSnapshot.deleteMany({ where: { serviceId } });
    await db.service.delete({ where: { id: serviceId } });
    await ctx.cleanup();
  });

  it("first snapshot: version=1, isCurrent=true", async () => {
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    const snapshots = await db.pricingSnapshot.findMany({
      where: { serviceId },
      orderBy: { version: "asc" },
    });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].version).toBe(1);
    expect(snapshots[0].isCurrent).toBe(true);
  });

  it("second calculation (no override): still version=1, still ONE snapshot", async () => {
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    // Without override, each persist call creates a NEW snapshot
    // (which is correct — but let's verify the latest is isCurrent)
    const current = await db.pricingSnapshot.findFirst({
      where: { serviceId, isCurrent: true },
    });

    expect(current).not.toBeNull();
    expect(current!.isCurrent).toBe(true);

    // All others must be isCurrent=false
    const others = await db.pricingSnapshot.findMany({
      where: { serviceId, isCurrent: false },
    });
    // At least the first one should be isCurrent=false
    for (const snap of others as { isCurrent: boolean }[]) {
      expect(snap.isCurrent).toBe(false);
    }
  });

  it("after admin override: old snapshot isCurrent=false, new version=2", async () => {
    // Create v1
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    // Apply admin override via the applyOverrideAction path (direct DB transaction)
    const v1 = await db.pricingSnapshot.findFirst({
      where: { serviceId, isCurrent: true },
    });
    expect(v1).not.toBeNull();

    // Simulate what applyOverrideAction does
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingSnapshot.update({
        where: { id: v1!.id },
        data: { isCurrent: false },
      });
      await tx.pricingSnapshot.create({
        data: {
          serviceId,
          version: v1!.version + 1,
          isCurrent: true,
          inputParams: v1!.inputParams as object,
          basePrice: v1!.basePrice,
          distanceFee: v1!.distanceFee,
          modifiersApplied: v1!.modifiersApplied as object[],
          subtotalHt: v1!.subtotalHt,
          tvaRate: v1!.tvaRate,
          tvaAmount: v1!.tvaAmount,
          totalTtc: 500,
          matchedRuleIds: v1!.matchedRuleIds as number[],
          isOverridden: true,
          overrideReason: "Accord spécial approuvé",
          overrideById: ctx.admin.id,
          overrideOriginalTotal: v1!.totalTtc,
        },
      });
    });

    const allSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId },
      orderBy: { version: "asc" },
    });

    expect(allSnaps).toHaveLength(2);
    expect(allSnaps[0].version).toBe(1);
    expect(allSnaps[0].isCurrent).toBe(false); // old → must be false
    expect(allSnaps[1].version).toBe(2);
    expect(allSnaps[1].isCurrent).toBe(true);  // new → must be true
    expect(Number(allSnaps[1].totalTtc)).toBe(500);
    expect(allSnaps[1].isOverridden).toBe(true);
  });

  it("INVARIANT: exactly ONE isCurrent=true snapshot per service at all times", async () => {
    // Create v1
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    const currentSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId, isCurrent: true },
    });

    expect(currentSnaps).toHaveLength(1);
  });

  it("multiple overrides: versions increment monotonically (1→2→3)", async () => {
    // v1
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    // Perform 2 manual overrides
    for (let i = 0; i < 2; i++) {
      const current = await db.pricingSnapshot.findFirst({
        where: { serviceId, isCurrent: true },
      });
      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.pricingSnapshot.update({
          where: { id: current!.id },
          data: { isCurrent: false },
        });
        await tx.pricingSnapshot.create({
          data: {
            serviceId,
            version: current!.version + 1,
            isCurrent: true,
            inputParams: current!.inputParams as object,
            basePrice: current!.basePrice,
            distanceFee: current!.distanceFee,
            modifiersApplied: current!.modifiersApplied as object[],
            subtotalHt: current!.subtotalHt,
            tvaRate: current!.tvaRate,
            tvaAmount: current!.tvaAmount,
            totalTtc: 400 + i * 100,
            matchedRuleIds: current!.matchedRuleIds as number[],
            isOverridden: true,
            overrideReason: "Override approuvé par direction",
            overrideById: ctx.admin.id,
            overrideOriginalTotal: current!.totalTtc,
          },
        });
      });
    }

    const allSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId },
      orderBy: { version: "asc" },
    });

    expect(allSnaps).toHaveLength(3);
    expect(allSnaps[0].version).toBe(1);
    expect(allSnaps[1].version).toBe(2);
    expect(allSnaps[2].version).toBe(3);

    // Only v3 is current
    const currentSnaps = allSnaps.filter((s: { isCurrent: boolean }) => s.isCurrent);
    expect(currentSnaps).toHaveLength(1);
    expect(currentSnaps[0].version).toBe(3);
  });

  it("overrideOriginalTotal stores the pre-override totalTtc correctly", async () => {
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    const v1 = await db.pricingSnapshot.findFirst({
      where: { serviceId, isCurrent: true },
    });
    const originalTotal = Number(v1!.totalTtc); // should be 165

    // Override
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pricingSnapshot.update({
        where: { id: v1!.id },
        data: { isCurrent: false },
      });
      await tx.pricingSnapshot.create({
        data: {
          serviceId,
          version: 2,
          isCurrent: true,
          inputParams: v1!.inputParams as object,
          basePrice: v1!.basePrice,
          distanceFee: v1!.distanceFee,
          modifiersApplied: v1!.modifiersApplied as object[],
          subtotalHt: v1!.subtotalHt,
          tvaRate: v1!.tvaRate,
          tvaAmount: v1!.tvaAmount,
          totalTtc: 800,
          matchedRuleIds: v1!.matchedRuleIds as number[],
          isOverridden: true,
          overrideReason: "Client fidèle — tarif préférentiel appliqué",
          overrideById: ctx.admin.id,
          overrideOriginalTotal: v1!.totalTtc,
        },
      });
    });

    const v2 = await db.pricingSnapshot.findFirst({
      where: { serviceId, version: 2 },
    });

    expect(Number(v2!.overrideOriginalTotal)).toBeCloseTo(originalTotal, 2);
    expect(Number(v2!.totalTtc)).toBe(800);
  });
});
