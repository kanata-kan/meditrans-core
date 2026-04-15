/**
 * HARDENING++ — Security-Oriented Tests
 *
 * Validates:
 * - SQL injection strings are safely handled by Prisma
 * - XSS-like strings don't crash the system
 * - null/undefined in unexpected places
 * - Zod catches type mismatches
 * - applyOverrideSchema validation
 */
import { describe, it, expect } from "vitest";
import { calculatePrice } from "@/modules/pricing/pricing.engine";
import {
  pricingInputSchema,
  applyOverrideSchema,
} from "@/modules/pricing/pricing.schema";
import { PricingCatalogNotFoundError } from "@/modules/pricing/pricing.errors";
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

// ─── SQL Injection ──────────────────────────────────────────────────────────

describe("HARDENING — SQL injection resistance", () => {
  it("SQL injection in catalogCode: Prisma parameterizes, no crash", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "' OR 1=1; --" }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });

  it("SQL injection in modifier codes: ignored safely", async () => {
    const result = await calculatePrice(
      makeInput({
        selectedModifiers: [
          "'; DROP TABLE pricing_modifiers; --",
          "1 OR 1=1",
        ],
      }),
      1,
      "admin",
      NO_PERSIST,
    );

    // No crash, no modifiers applied (they don't exist)
    expect(result.modifiersApplied).toHaveLength(0);
    expect(Number.isFinite(result.totalTtc)).toBe(true);
  });

  it("SQL injection in override reason: engine processes safely", async () => {
    const result = await calculatePrice(
      makeInput({
        manualOverride: {
          total: 200,
          reason: "'; DELETE FROM pricing_snapshots WHERE 1=1; --",
        },
      }),
      1,
      "admin",
      NO_PERSIST,
    );

    // Prisma parameterizes everything — no SQL injection possible
    expect(result.isOverridden).toBe(true);
  });
});

// ─── XSS-like Strings ──────────────────────────────────────────────────────

describe("HARDENING — XSS-like string handling", () => {
  it("XSS in catalogCode: throws PricingCatalogNotFoundError", async () => {
    await expect(
      calculatePrice(
        makeInput({ catalogCode: "<script>alert('xss')</script>" }),
        1,
        "admin",
        NO_PERSIST,
      ),
    ).rejects.toThrow(PricingCatalogNotFoundError);
  });

  it("XSS in modifier codes: safely ignored", async () => {
    const result = await calculatePrice(
      makeInput({
        selectedModifiers: ["<img onerror=alert(1) src=x>"],
      }),
      1,
      "admin",
      NO_PERSIST,
    );
    expect(result.modifiersApplied).toHaveLength(0);
  });
});

// ─── Null / Undefined Edge Cases ────────────────────────────────────────────

describe("HARDENING — null/undefined handling via Zod", () => {
  it("null catalogCode: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: null,
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("undefined isUrgent: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      distanceKm: 0,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("null selectedModifiers: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: null,
    });
    expect(result.success).toBe(false);
  });

  it("object in selectedModifiers array: Zod rejects (must be strings)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: 0,
      selectedModifiers: [{ code: "NIGHT_SURCHARGE" }],
    });
    expect(result.success).toBe(false);
  });

  it("NaN as distanceKm: Zod rejects", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: NaN,
      selectedModifiers: [],
    });
    expect(result.success).toBe(false);
  });

  it("Infinity as distanceKm: Zod rejects (not finite)", () => {
    const result = pricingInputSchema.safeParse({
      catalogCode: "TRANSPORT_SIMPLE",
      scheduledAt: new Date().toISOString(),
      isUrgent: false,
      distanceKm: Infinity,
      selectedModifiers: [],
    });
    // Zod z.number() rejects Infinity by default
    expect(result.success).toBe(false);
  });
});

// ─── applyOverrideSchema ────────────────────────────────────────────────────

describe("HARDENING — applyOverrideSchema validation", () => {
  it("valid override input passes", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: 1,
      newTotal: 500,
      reason: "Client fidèle — tarif spécial",
    });
    expect(result.success).toBe(true);
  });

  it("negative serviceId: Zod rejects", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: -1,
      newTotal: 500,
      reason: "Valid reason for override test",
    });
    expect(result.success).toBe(false);
  });

  it("serviceId = 0: Zod rejects (must be positive)", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: 0,
      newTotal: 500,
      reason: "Valid reason for override test",
    });
    expect(result.success).toBe(false);
  });

  it("newTotal = 0: Zod rejects (must be positive)", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: 1,
      newTotal: 0,
      reason: "Valid reason for override test",
    });
    expect(result.success).toBe(false);
  });

  it("reason too short (5 chars): Zod rejects", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: 1,
      newTotal: 500,
      reason: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("float serviceId: Zod rejects (must be int)", () => {
    const result = applyOverrideSchema.safeParse({
      serviceId: 1.5,
      newTotal: 500,
      reason: "Valid reason for override test",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Type Guards from constants.ts ──────────────────────────────────────────

describe("HARDENING — type guard functions", () => {
  // Import directly
  it("isUserRole validates correctly", async () => {
    const { isUserRole } = await import("@/lib/constants");
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("assistant")).toBe(true);
    expect(isUserRole("superadmin")).toBe(false);
    expect(isUserRole("")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(123)).toBe(false);
  });

  it("isServiceStatus validates correctly", async () => {
    const { isServiceStatus } = await import("@/lib/constants");
    expect(isServiceStatus("pending")).toBe(true);
    expect(isServiceStatus("in_progress")).toBe(true);
    expect(isServiceStatus("completed")).toBe(true);
    expect(isServiceStatus("cancelled")).toBe(true);
    expect(isServiceStatus("draft")).toBe(false);
    expect(isServiceStatus("")).toBe(false);
    expect(isServiceStatus(null)).toBe(false);
  });

  it("isInvoiceStatus validates correctly", async () => {
    const { isInvoiceStatus } = await import("@/lib/constants");
    expect(isInvoiceStatus("unpaid")).toBe(true);
    expect(isInvoiceStatus("partial")).toBe(true);
    expect(isInvoiceStatus("paid")).toBe(true);
    expect(isInvoiceStatus("cancelled")).toBe(true);
    expect(isInvoiceStatus("draft")).toBe(false);
    expect(isInvoiceStatus("sent")).toBe(false);
  });

  it("isPaymentMethod validates correctly", async () => {
    const { isPaymentMethod } = await import("@/lib/constants");
    expect(isPaymentMethod("cash")).toBe(true);
    expect(isPaymentMethod("card")).toBe(true);
    expect(isPaymentMethod("transfer")).toBe(true);
    expect(isPaymentMethod("cheque")).toBe(true);
    expect(isPaymentMethod("bitcoin")).toBe(false);
    expect(isPaymentMethod("")).toBe(false);
  });
});
