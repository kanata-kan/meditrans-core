/**
 * HARDENING++ — Stress & Invalid Input Tests
 *
 * Validates system behavior under:
 * - Negative distanceKm
 * - Extremely large distance (1,000,000 km)
 * - Negative/zero override totals
 * - Extremely large override values
 * - Very long strings in override reason
 * - Empty catalog codes
 * - Boundary conditions (distanceKm = 0.001, override.total = 0.01)
 */
import { describe, it, expect } from "vitest";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import { pricingInputSchema } from "@/modules/pricing/pricing.schema";
import {
  PricingCatalogNotFoundError,
  PricingValidationError,
} from "@/modules/pricing/pricing.errors";
import type { PricingInput } from "@/modules/pricing/pricing.types";

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

function expectPrice(actual: number, expected: number) {
  expect(actual).toBeCloseTo(expected, 2);
}

// ─── A. Distance Stress ─────────────────────────────────────────────────────

describe("HARDENING — distance stress", () => {
  it("negative distanceKm (-10): Zod rejects at schema level", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: -10,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("distanceKm");
    }
  });

  it("negative distanceKm passed directly: engine treats as 0 or calculates negative (defense check)", async () => {
    // Engine doesn't validate — it trusts upstream Zod.
    // With requiresDistance=true catalog and -10km, engine would compute negative fee.
    // This test documents that behavior and proves Zod MUST be called first.
    const result = await calculatePrice(
      makeInput({ distanceKm: -10 }),
      1,
      "admin",
      NO_PERSIST,
    );
    // TRANSPORT_SIMPLE requiresDistance=true → distanceFee = -10 * 7.50 = -75
    // This is WRONG but proves the engine doesn't guard against it.
    // The defense is at the Zod layer.
    expect(result.distanceFee).toBeLessThanOrEqual(0);
  });

  it("extremely large distance (1,000,000 km): engine computes without crash", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 1_000_000 }),
      1,
      "admin",
      NO_PERSIST,
    );

    // base=150, distance = 1M × 7.50 = 7,500,000
    expectPrice(result.distanceFee, 7_500_000);
    expectPrice(result.subtotalHt, 7_500_150);
    // TVA = 750,015 → total = 8,250,165
    expectPrice(result.totalTtc, 8_250_165);
    // No crash, no overflow, no NaN
    expect(Number.isFinite(result.totalTtc)).toBe(true);
  });

  it("fractional distance (0.001 km): computes correctly without rounding errors", async () => {
    const result = await calculatePrice(
      makeInput({ distanceKm: 0.001 }),
      1,
      "admin",
      NO_PERSIST,
    );

    // 0.001 × 7.50 = 0.0075
    expectPrice(result.distanceFee, 0.0075);
    expect(Number.isFinite(result.totalTtc)).toBe(true);
  });
});

// ─── B. Override Stress ─────────────────────────────────────────────────────

describe("HARDENING — override stress", () => {
  it("override.total = 0: Zod rejects (must be positive)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      manualOverride: { total: 0, reason: "Free service for charity event" },
    });
    expect(result.success).toBe(false);
  });

  it("override.total negative (-100): Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      manualOverride: { total: -100, reason: "Credit refund scenario" },
    });
    expect(result.success).toBe(false);
  });

  it("override with extremely large total (999,999,999): engine accepts without crash", async () => {
    const result = await calculatePrice(
      makeInput({
        manualOverride: {
          total: 999_999_999,
          reason: "Exceptional contract for mega fleet operation",
        },
      }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.isOverridden).toBe(true);
    expectPrice(result.totalTtc, 999_999_999);
    expect(Number.isFinite(result.totalTtc)).toBe(true);
  });

  it("override.total = 0.01 (smallest valid amount): engine accepts", async () => {
    const result = await calculatePrice(
      makeInput({
        manualOverride: {
          total: 0.01,
          reason: "Symbolic amount for testing purposes",
        },
      }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.isOverridden).toBe(true);
    expectPrice(result.totalTtc, 0.01);
  });

  it("override with very long reason (1000 chars): engine accepts", async () => {
    const longReason = "A".repeat(1000);
    const result = await calculatePrice(
      makeInput({ manualOverride: { total: 200, reason: longReason } }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.isOverridden).toBe(true);
    expectPrice(result.totalTtc, 200);
  });
});

// ─── C. Catalog Code Stress ─────────────────────────────────────────────────

describe("HARDENING — catalog code stress", () => {
  it("empty catalog code: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("catalog code with spaces: engine throws PricingCatalogNotFoundError", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "   " }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });

  it("catalog code with SQL injection: engine throws PricingCatalogNotFoundError", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "'; DROP TABLE services; --" }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });

  it("catalog code with very long string (500 chars): engine throws PricingCatalogNotFoundError", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "X".repeat(500) }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });
});

// ─── D. Modifier Stress ─────────────────────────────────────────────────────

describe("HARDENING — modifier stress", () => {
  it("100 non-existent modifier codes: engine ignores all without crash", async () => {
    const fakeMods = Array.from({ length: 100 }, (_, i) => `FAKE_MOD_${i}`);
    const result = await calculatePrice(
      makeInput({ selectedModifiers: fakeMods }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.modifiersApplied).toHaveLength(0);
    expectPrice(result.totalTtc, 165); // unchanged
  });

  it("empty string modifier code: ignored", async () => {
    const result = await calculatePrice(
      makeInput({ selectedModifiers: [""] }),
      1,
      "admin",
      NO_PERSIST,
    );

    expect(result.modifiersApplied).toHaveLength(0);
    expectPrice(result.totalTtc, 165);
  });

  it("duplicate modifier codes: each applied only once", async () => {
    const result = await calculatePrice(
      makeInput({
        selectedModifiers: [
          "NIGHT_SURCHARGE",
          "NIGHT_SURCHARGE",
          "NIGHT_SURCHARGE",
        ],
      }),
      1,
      "admin",
      NO_PERSIST,
    );

    // DB query is `findMany where code IN [...]` — Prisma deduplicates by code
    // NIGHT_SURCHARGE appears once in DB → findActiveModifiers returns 1 record
    expect(result.modifiersApplied).toHaveLength(1);
    expectPrice(result.subtotalHt, 250); // 150 + 100, not 150 + 300
  });
});

// ─── E. Zod Schema Validation Edge Cases ────────────────────────────────────

describe("HARDENING — Zod schema edge cases", () => {
  it("missing required fields: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("isUrgent as string 'true': Zod rejects (must be boolean)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: "true",
      distanceKm: 0,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("distanceKm as string: Zod rejects (must be number)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: "10",
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("scheduledAt as invalid date string: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: "not-a-date",
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("staffType with invalid enum value: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      staffType: "wizard",
    });
    expect(result.success).toBe(false);
  });

  it("durationHours as float: Zod rejects (must be int)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      durationHours: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("durationHours as 0: Zod rejects (must be positive)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      durationHours: 0,
    });
    expect(result.success).toBe(false);
  });

  it("valid input passes schema", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 10,
      selectedModifiers: ["NIGHT_SURCHARGE"],
      staffType: "nurse",
      durationHours: 2,
    });
    expect(result.success).toBe(true);
  });

  it("override reason exactly 10 chars passes schema", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      manualOverride: { total: 100, reason: "1234567890" },
    });
    expect(result.success).toBe(true);
  });

  it("override reason 9 chars: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
      manualOverride: { total: 100, reason: "123456789" },
    });
    expect(result.success).toBe(false);
  });
});
