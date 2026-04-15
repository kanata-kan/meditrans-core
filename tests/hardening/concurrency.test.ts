/**
 * HARDENING++ — Concurrency Tests (CRITICAL)
 *
 * Simulates parallel operations to verify:
 * - ONLY ONE snapshot has isCurrent = true after parallel writes
 * - version increments correctly (no duplication)
 * - no data corruption under race conditions
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

describe("HARDENING — concurrency: parallel calculatePrice calls", () => {
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

  it("2 parallel persist calls: INVARIANT — exactly 1 isCurrent=true", async () => {
    // Both calls try to create a snapshot for the same service simultaneously
    const results = await Promise.allSettled([
      calculatePrice(baseInput(), ctx.admin.id, "admin", {
        persist: true,
        serviceId,
      }),
      calculatePrice(baseInput(), ctx.admin.id, "admin", {
        persist: true,
        serviceId,
      }),
    ]);

    // At least one should succeed
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // CRITICAL INVARIANT: exactly 1 isCurrent=true per service
    const currentSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId, isCurrent: true },
    });
    expect(currentSnaps).toHaveLength(1);

    // All snapshots should have unique versions
    const allSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId },
      orderBy: { version: "asc" },
    });
    const versions = allSnaps.map((s) => s.version);
    const uniqueCount = new Set(versions).size;
    expect(versions.length).toBe(uniqueCount);
  });

  it("3 parallel persist calls: no version duplication", async () => {
    const results = await Promise.allSettled([
      calculatePrice(baseInput(), ctx.admin.id, "admin", {
        persist: true,
        serviceId,
      }),
      calculatePrice(
        { ...baseInput(), isUrgent: true },
        ctx.admin.id,
        "admin",
        { persist: true, serviceId },
      ),
      calculatePrice(baseInput(), ctx.admin.id, "admin", {
        persist: true,
        serviceId,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // Check no duplicate versions
    const allSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId },
      orderBy: { version: "asc" },
    });
    const versions = allSnaps.map((s) => s.version);
    const uniqueCount = new Set(versions).size;
    expect(versions.length).toBe(uniqueCount);

    // Exactly 1 isCurrent
    const currentCount = allSnaps.filter((s) => s.isCurrent).length;
    expect(currentCount).toBe(1);
  });

  it("parallel override simulation: exactly 1 isCurrent after race", async () => {
    // Create initial snapshot
    await calculatePrice(baseInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    // Simulate 2 parallel overrides via $transaction
    async function doOverride(newTotal: number) {
      return db.$transaction(async (tx: Prisma.TransactionClient) => {
        const current = await tx.pricingSnapshot.findFirst({
          where: { serviceId, isCurrent: true },
        });
        if (!current) throw new Error("No current snapshot");

        await tx.pricingSnapshot.update({
          where: { id: current.id },
          data: { isCurrent: false },
        });

        return tx.pricingSnapshot.create({
          data: {
            serviceId,
            version: current.version + 1,
            isCurrent: true,
            inputParams: current.inputParams as object,
            basePrice: current.basePrice,
            distanceFee: current.distanceFee,
            modifiersApplied: current.modifiersApplied as object[],
            subtotalHt: current.subtotalHt,
            tvaRate: current.tvaRate,
            tvaAmount: current.tvaAmount,
            totalTtc: newTotal,
            matchedRuleIds: current.matchedRuleIds as number[],
            isOverridden: true,
            overrideReason: "Concurrent override test case validated",
            overrideById: ctx.admin.id,
            overrideOriginalTotal: current.totalTtc,
          },
        });
      });
    }

    const results = await Promise.allSettled([
      doOverride(400),
      doOverride(500),
    ]);

    // At least 1 must succeed, possibly both
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // CRITICAL: exactly 1 isCurrent
    const currentSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId, isCurrent: true },
    });
    expect(currentSnaps).toHaveLength(1);
  });

  it("concurrent persist calls produce valid totalTtc values (no NaN/Infinity)", async () => {
    await Promise.allSettled([
      calculatePrice(baseInput(), ctx.admin.id, "admin", {
        persist: true,
        serviceId,
      }),
      calculatePrice(
        { ...baseInput(), distanceKm: 10 },
        ctx.admin.id,
        "admin",
        { persist: true, serviceId },
      ),
    ]);

    const allSnaps = await db.pricingSnapshot.findMany({
      where: { serviceId },
    });

    for (const snap of allSnaps) {
      expect(Number.isFinite(Number(snap.totalTtc))).toBe(true);
      expect(Number.isFinite(Number(snap.basePrice))).toBe(true);
      expect(Number.isNaN(Number(snap.totalTtc))).toBe(false);
    }
  });
});
