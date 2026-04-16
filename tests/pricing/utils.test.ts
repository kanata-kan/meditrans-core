/**
 * Pricing Utility Tests — isNightTime, getTvaRate, computeSpecificity, buildBreakdown
 *
 * Pure function tests — no DB needed.
 */
import { describe, it, expect } from "vitest";
import {
  isNightTime,
  getTvaRate,
  computeSpecificity,
  buildBreakdown,
} from "@/modules/pricing/pricing.utils";

// ─── isNightTime ──────────────────────────────────────────────────────────────

describe("isNightTime — night window 21:00–07:00", () => {
  const config = { NIGHT_START_HOUR: 21, NIGHT_END_HOUR: 7 };

  it("20:59 → false (just before night)", () => {
    const d = new Date("2025-06-15T20:59:00");
    expect(isNightTime(d, config)).toBe(false);
  });

  it("21:00 → true (start of night)", () => {
    const d = new Date("2025-06-15T21:00:00");
    expect(isNightTime(d, config)).toBe(true);
  });

  it("23:30 → true (deep night)", () => {
    const d = new Date("2025-06-15T23:30:00");
    expect(isNightTime(d, config)).toBe(true);
  });

  it("00:00 → true (midnight)", () => {
    const d = new Date("2025-06-16T00:00:00");
    expect(isNightTime(d, config)).toBe(true);
  });

  it("03:00 → true (early morning)", () => {
    const d = new Date("2025-06-16T03:00:00");
    expect(isNightTime(d, config)).toBe(true);
  });

  it("06:59 → true (last minute of night)", () => {
    const d = new Date("2025-06-16T06:59:00");
    expect(isNightTime(d, config)).toBe(true);
  });

  it("07:00 → false (end of night)", () => {
    const d = new Date("2025-06-16T07:00:00");
    expect(isNightTime(d, config)).toBe(false);
  });

  it("12:00 → false (midday)", () => {
    const d = new Date("2025-06-16T12:00:00");
    expect(isNightTime(d, config)).toBe(false);
  });

  it("custom config 22:00–06:00: 21:59 → false", () => {
    const custom = { NIGHT_START_HOUR: 22, NIGHT_END_HOUR: 6 };
    const d = new Date("2025-06-15T21:59:00");
    expect(isNightTime(d, custom)).toBe(false);
  });

  it("custom config 22:00–06:00: 22:00 → true", () => {
    const custom = { NIGHT_START_HOUR: 22, NIGHT_END_HOUR: 6 };
    const d = new Date("2025-06-15T22:00:00");
    expect(isNightTime(d, custom)).toBe(true);
  });
});

// ─── getTvaRate ───────────────────────────────────────────────────────────────

describe("getTvaRate", () => {
  it("non-exempt catalog → returns default rate", () => {
    expect(getTvaRate(false, 0.1)).toBe(0.1);
  });

  it("exempt catalog → returns 0", () => {
    expect(getTvaRate(true, 0.1)).toBe(0);
  });

  it("non-exempt with 20% rate → returns 0.20", () => {
    expect(getTvaRate(false, 0.2)).toBe(0.2);
  });

  it("exempt with 20% rate → still returns 0", () => {
    expect(getTvaRate(true, 0.2)).toBe(0);
  });
});

// ─── computeSpecificity ──────────────────────────────────────────────────────

describe("computeSpecificity", () => {
  it("all null → specificity 0 (wildcard rule)", () => {
    expect(
      computeSpecificity({ isUrgent: null, staffType: null, durationHours: null }),
    ).toBe(0);
  });

  it("only isUrgent set → specificity 1", () => {
    expect(
      computeSpecificity({ isUrgent: true, staffType: null, durationHours: null }),
    ).toBe(1);
  });

  it("isUrgent + staffType → specificity 2", () => {
    expect(
      computeSpecificity({ isUrgent: false, staffType: "nurse", durationHours: null }),
    ).toBe(2);
  });

  it("all three set → specificity 3 (most specific)", () => {
    expect(
      computeSpecificity({ isUrgent: true, staffType: "doctor", durationHours: 12 }),
    ).toBe(3);
  });

  it("only durationHours set → specificity 1", () => {
    expect(
      computeSpecificity({ isUrgent: null, staffType: null, durationHours: 24 }),
    ).toBe(1);
  });

  it("staffType + durationHours → specificity 2", () => {
    expect(
      computeSpecificity({ isUrgent: null, staffType: "reanimator", durationHours: 12 }),
    ).toBe(2);
  });
});

// ─── buildBreakdown ──────────────────────────────────────────────────────────

describe("buildBreakdown", () => {
  it("base only: 1 line (base) + 1 TVA = 2 lines", () => {
    const lines = buildBreakdown(150, 0, [], 15, 165, false);
    expect(lines).toHaveLength(2);
    expect(lines[0].label).toBe("Prix de base");
    expect(lines[0].amount).toBe(150);
    expect(lines[1].label).toContain("TVA");
    expect(lines[1].amount).toBe(15);
  });

  it("base + distance: 3 lines", () => {
    const lines = buildBreakdown(150, 75, [], 22.5, 247.5, false);
    expect(lines).toHaveLength(3);
    expect(lines[1].label).toBe("Frais de déplacement");
    expect(lines[1].amount).toBe(75);
  });

  it("base + modifier: 3 lines", () => {
    const mod = {
      code: "NIGHT_SURCHARGE",
      nameFr: "Supplément nuit",
      type: "flat_add" as const,
      value: 100,
      amountImpact: 100,
    };
    const lines = buildBreakdown(150, 0, [mod], 25, 275, false);
    expect(lines).toHaveLength(3);
    expect(lines[1].label).toBe("Supplément nuit");
    expect(lines[1].amount).toBe(100);
  });

  it("override: adds adjustment line", () => {
    const lines = buildBreakdown(150, 0, [], 15, 500, true, 165);
    const adjustmentLine = lines.find((l) => l.label.includes("Ajustement manuel"));
    expect(adjustmentLine).toBeDefined();
    expect(adjustmentLine!.amount).toBe(500 - 165);
  });

  it("no override: no adjustment line", () => {
    const lines = buildBreakdown(150, 0, [], 15, 165, false);
    const adjustmentLine = lines.find((l) => l.label.includes("Ajustement"));
    expect(adjustmentLine).toBeUndefined();
  });

  it("base + distance + 2 modifiers + TVA: 5 lines", () => {
    const mods = [
      { code: "NIGHT", nameFr: "Supplément nuit", type: "flat_add" as const, value: 100, amountImpact: 100 },
      { code: "VIP", nameFr: "VIP", type: "multiplier" as const, value: 1.5, amountImpact: 162.5 },
    ];
    const lines = buildBreakdown(150, 75, mods, 48.75, 536.25, false);
    expect(lines).toHaveLength(5);
  });
});
