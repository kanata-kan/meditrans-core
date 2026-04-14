/**
 * Pricing Engine Tests — calculatePrice()
 *
 * Tests ALL scenarios: base pricing, distance, TVA, modifiers,
 * override logic, and error cases.
 *
 * Seeded data used:
 *   TRANSPORT_SIMPLE  normal → 150 MAD
 *   TRANSPORT_SIMPLE  urgent → 250 MAD
 *   TRANSPORT_URGENT  any    → 300 MAD
 *   ECG               any    → 200 MAD
 *   Distance rate            → 7.50 MAD/km
 *   NIGHT_SURCHARGE          → +100 MAD flat (active)
 *   VIP_SURCHARGE            → ×1.0 (inactive)
 *   DEFAULT_TVA_RATE         → 10%
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import {
  PricingCatalogNotFoundError,
  PricingRuleNotFoundError,
  PricingValidationError,
} from "@/modules/pricing/pricing.errors";
import type { PricingInput } from "@/modules/pricing/pricing.types";
import { createBaseContext } from "../helpers/factories";

// ─── Test input builders ──────────────────────────────────────────────────────

function makeInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    catalogCode: "TRANSPORT_SIMPLE",
    scheduledAt: new Date(),
    isUrgent: false,
    distanceKm: 0,
    selectedModifiers: [],
    ...overrides,
  };
}

const NO_PERSIST = { persist: false } as const;

// ─── Helpers for float comparison ────────────────────────────────────────────

function expectPrice(actual: number, expected: number) {
  expect(actual).toBeCloseTo(expected, 2);
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe("calculatePrice — core pricing", () => {
  it("normal transport simple: base=150, TVA=10%, total=165", async () => {
    const result = await calculatePrice(makeInput(), 1, "admin", NO_PERSIST);

    expectPrice(result.basePrice, 150);
    expectPrice(result.distanceFee, 0);
    expectPrice(result.subtotalHt, 150);
    expectPrice(result.tvaRate, 0.1);
    expectPrice(result.tvaAmount, 15);
    expectPrice(result.totalTtc, 165);
    expect(result.isOverridden).toBe(false);
    expect(result.modifiersApplied).toHaveLength(0);
  });

  it("urgent transport simple: base=250, TVA=10%, total=275", async () => {
    const result = await calculatePrice(
      makeInput({ isUrgent: true }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.basePrice, 250);
    expectPrice(result.totalTtc, 275);
  });

  it("transport urgent catalog (any urgency): base=300, total=330", async () => {
    const result = await calculatePrice(
      makeInput({ catalogCode: "TRANSPORT_URGENT", isUrgent: false }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.basePrice, 300);
    expectPrice(result.totalTtc, 330);
  });

  it("ECG: base=200, TVA=10%, total=220", async () => {
    const result = await calculatePrice(
      makeInput({ catalogCode: "ECG" }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.basePrice, 200);
    expectPrice(result.totalTtc, 220);
  });

  it("SUTURE: base=350, total=385", async () => {
    const result = await calculatePrice(
      makeInput({ catalogCode: "SUTURE" }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.basePrice, 350);
    expectPrice(result.totalTtc, 385);
  });
});

describe("calculatePrice — distance fee", () => {
  it("10km transport simple: distanceFee=75 (10×7.50), subtotalHt=225, total=247.50", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 10 }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.distanceFee, 75);
    expectPrice(result.subtotalHt, 225);
    expectPrice(result.tvaAmount, 22.5);
    expectPrice(result.totalTtc, 247.5);
  });

  it("zero distance: distanceFee=0 regardless of catalog", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 0 }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.distanceFee, 0);
  });

  it("20km: distanceFee=150, subtotalHt=300, total=330", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 20 }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.distanceFee, 150);
    expectPrice(result.subtotalHt, 300);
    expectPrice(result.totalTtc, 330);
  });

  it("catalog without requiresDistance: distanceFee=0 even if km provided", async () => {
    // ECG does not requiresDistance → fee must be 0
    const result = await calculatePrice(
      makeInput({ catalogCode: "ECG", distanceKm: 50 }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.distanceFee, 0);
    expectPrice(result.basePrice, 200);
    expectPrice(result.totalTtc, 220);
  });
});

describe("calculatePrice — modifiers", () => {
  it("NIGHT_SURCHARGE active: +100 MAD on top of base", async () => {
    const result = await calculatePrice(
      makeInput({ selectedModifiers: ["NIGHT_SURCHARGE"] }),
      1,
      "admin",
      NO_PERSIST,
    );

    // base=150, NIGHT=+100, subtotalHt=250, tva=25, total=275
    expectPrice(result.subtotalHt, 250);
    expectPrice(result.tvaAmount, 25);
    expectPrice(result.totalTtc, 275);
    expect(result.modifiersApplied).toHaveLength(1);
    expect(result.modifiersApplied[0].code).toBe("NIGHT_SURCHARGE");
    expectPrice(result.modifiersApplied[0].amountImpact, 100);
  });

  it("NIGHT_SURCHARGE + distance: correct stacking order", async () => {
    // base=150, distance=75 (10km), subtotal=225, NIGHT+100=325, tva=32.5, total=357.5
    const result = await calculatePrice(
      makeInput({ distanceKm: 10, selectedModifiers: ["NIGHT_SURCHARGE"] }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(result.subtotalHt, 325);
    expectPrice(result.tvaAmount, 32.5);
    expectPrice(result.totalTtc, 357.5);
  });

  it("inactive modifier (VIP_SURCHARGE) is NOT applied even if requested", async () => {
    const resultWithVip = await calculatePrice(
      makeInput({ selectedModifiers: ["VIP_SURCHARGE"] }),
      1,
      "admin",
      NO_PERSIST,
    );
    const resultNoMod = await calculatePrice(makeInput(), 1, "admin", NO_PERSIST);

    // VIP is inactive → same result as no modifiers
    expectPrice(resultWithVip.totalTtc, resultNoMod.totalTtc);
    expect(resultWithVip.modifiersApplied).toHaveLength(0);
  });

  it("inactive modifier HOLIDAY_SURCHARGE is NOT applied", async () => {
    const result = await calculatePrice(
      makeInput({ selectedModifiers: ["HOLIDAY_SURCHARGE"] }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.modifiersApplied).toHaveLength(0);
    expectPrice(result.totalTtc, 165); // same as no modifier
  });

  it("unknown modifier code is silently ignored (no active match)", async () => {
    const result = await calculatePrice(
      makeInput({ selectedModifiers: ["NONEXISTENT_MOD"] }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.modifiersApplied).toHaveLength(0);
    expectPrice(result.totalTtc, 165);
  });
});

describe("calculatePrice — TVA", () => {
  it("TVA is 10% of subtotalHt for non-exempt catalog", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 5 }),
      1,
      "admin",
      NO_PERSIST,
    );

    // base=150, distance=37.50, subtotalHt=187.50
    expectPrice(result.tvaRate, 0.1);
    expectPrice(result.tvaAmount, result.subtotalHt * 0.1);
    expectPrice(result.totalTtc, result.subtotalHt + result.tvaAmount);
  });

  it("breakdown list contains correct number of lines", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 10, selectedModifiers: ["NIGHT_SURCHARGE"] }),
      1,
      "admin",
      NO_PERSIST,
    );

    // Breakdown should have: base, distance, modifier, TVA, total
    expect(result.breakdown.length).toBeGreaterThanOrEqual(4);
  });

  it("matchedRuleIds is non-empty", async () => {
    const result = await calculatePrice(makeInput(), 1, "admin", NO_PERSIST);
    expect(result.matchedRuleIds.length).toBeGreaterThan(0);
  });
});

describe("calculatePrice — error cases", () => {
  it("unknown catalog code → throws PricingCatalogNotFoundError", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "DOES_NOT_EXIST" }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });

  it("catalog with no matching pricing rule → throws PricingRuleNotFoundError", async () => {
    // Create a catalog entry with no rules
    const testCode = `TEST_NO_RULE_${Date.now()}`;
    await db.serviceCatalog.create({
      data: {
        code: testCode,
        nameFr: "Test No Rule",
        category: "soins",
        requiresDistance: false,
        requiresStaffType: false,
        tvaExempt: false,
        isActive: true,
      },
    });

    try {
      await expect(
        calculatePrice(makeInput({ catalogCode: testCode }), 1, "admin", NO_PERSIST),
      ).rejects.toThrow(PricingRuleNotFoundError);
    } finally {
      await db.serviceCatalog.delete({ where: { code: testCode } });
    }
  });

  it("urgent=true for catalog with only normal rule → throws PricingRuleNotFoundError", async () => {
    // TRANSPORT_REANIMATION only has null isUrgent rule — should match
    // but INJECTION has no urgent-specific rule — null isUrgent matches everything
    // Let's create a catalog with ONLY normal rule:
    const testCode = `TEST_NORMAL_ONLY_${Date.now()}`;
    await db.serviceCatalog.create({
      data: {
        code: testCode,
        nameFr: "Test Normal Only",
        category: "soins",
        requiresDistance: false,
        requiresStaffType: false,
        tvaExempt: false,
        isActive: true,
      },
    });
    // Rule only for isUrgent=false
    await db.pricingRule.create({
      data: {
        catalogCode: testCode,
        isUrgent: false,
        basePrice: 100,
        currency: "MAD",
      },
    });

    try {
      await expect(
        calculatePrice(
          makeInput({ catalogCode: testCode, isUrgent: true }),
          1,
          "admin",
          NO_PERSIST,
        ),
      ).rejects.toThrow(PricingRuleNotFoundError);
    } finally {
      await db.pricingRule.deleteMany({ where: { catalogCode: testCode } });
      await db.serviceCatalog.delete({ where: { code: testCode } });
    }
  });
});

describe("calculatePrice — manual override", () => {
  it("admin override with valid reason: isOverridden=true, total=override value", async () => {
    const result = await calculatePrice(
      makeInput({ manualOverride: { total: 500, reason: "Accord commercial spécial client VIP" } }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.isOverridden).toBe(true);
    expectPrice(result.totalTtc, 500);
    expectPrice(result.overrideOriginalTotal!, 165); // original was 165
  });

  it("override stores the original total in overrideOriginalTotal", async () => {
    const baseResult = await calculatePrice(makeInput(), 1, "admin", NO_PERSIST);
    const overrideResult = await calculatePrice(
      makeInput({ manualOverride: { total: 999, reason: "Tarif spécial approuvé par direction" } }),
      1,
      "admin",
      NO_PERSIST,
    );

    expectPrice(overrideResult.overrideOriginalTotal!, baseResult.totalTtc);
  });

  it("non-admin override → throws PricingValidationError", async () => {
    await expect(
      calculatePrice(
        makeInput({ manualOverride: { total: 500, reason: "Raison valide suffisamment longue" } }),
        99,
        "assistant",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingValidationError);
  });

  it("override without reason → throws PricingValidationError", async () => {
    await expect(
      calculatePrice(
        makeInput({ manualOverride: { total: 500, reason: "" } }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingValidationError);
  });

  it("override with reason shorter than 10 chars → throws PricingValidationError", async () => {
    await expect(
      calculatePrice(
        makeInput({ manualOverride: { total: 500, reason: "Short" } }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingValidationError);
  });

  it("override with exactly 10-char reason → succeeds", async () => {
    const result = await calculatePrice(
      makeInput({ manualOverride: { total: 200, reason: "1234567890" } }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.isOverridden).toBe(true);
    expectPrice(result.totalTtc, 200);
  });
});

describe("calculatePrice — snapshot persistence", () => {
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

  it("persist=true creates a snapshot in the DB with version=1", async () => {
    const result = await calculatePrice(makeInput(), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    expect(result.snapshotId).toBeGreaterThan(0);

    const snap = await db.pricingSnapshot.findUnique({
      where: { id: result.snapshotId },
    });
    expect(snap).not.toBeNull();
    expect(snap!.version).toBe(1);
    expect(snap!.isCurrent).toBe(true);
    expectPrice(Number(snap!.totalTtc), 165);
  });

  it("persist=true: returned snapshotId matches the DB record", async () => {
    const result = await calculatePrice(makeInput({ isUrgent: true }), ctx.admin.id, "admin", {
      persist: true,
      serviceId,
    });

    const snap = await db.pricingSnapshot.findUnique({ where: { id: result.snapshotId } });
    expect(snap).not.toBeNull();
    expectPrice(Number(snap!.totalTtc), 275); // urgent = 275
  });
});

describe("calculatePrice — persist=false does not write", () => {
  it("snapshotId=0, no new snapshot created in DB", async () => {
    const countBefore = await db.pricingSnapshot.count();
    const result = await calculatePrice(makeInput(), 1, "admin", NO_PERSIST);

    expect(result.snapshotId).toBe(0);
    const countAfter = await db.pricingSnapshot.count();
    expect(countAfter).toBe(countBefore);
  });
});
