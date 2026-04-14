import type { StaffType } from "@/lib/constants";

export interface PricingInput {
  catalogCode: string;
  scheduledAt: Date;
  isUrgent: boolean;
  distanceKm: number;
  staffType?: StaffType;
  durationHours?: number;
  selectedModifiers: string[];
  manualOverride?: {
    total: number;
    reason: string;
  };
}

export interface AppliedModifier {
  code: string;
  nameFr: string;
  type: "flat_add" | "multiplier";
  value: number;
  amountImpact: number;
}

export interface BreakdownLine {
  label: string;
  amount: number;
}

export interface PricingResult {
  basePrice: number;
  distanceFee: number;
  modifiersApplied: AppliedModifier[];
  subtotalHt: number;
  tvaRate: number;
  tvaAmount: number;
  totalTtc: number;
  breakdown: BreakdownLine[];
  matchedRuleIds: number[];
  isOverridden: boolean;
  overrideOriginalTotal?: number;
  snapshotId: number;
}

export interface PricingSnapshotRow {
  id: number;
  serviceId: number;
  version: number;
  isCurrent: boolean;
  calculatedAt: Date;
  inputParams: PricingInput;
  basePrice: number;
  distanceFee: number;
  modifiersApplied: AppliedModifier[];
  subtotalHt: number;
  tvaRate: number;
  tvaAmount: number;
  totalTtc: number;
  matchedRuleIds: number[];
  isOverridden: boolean;
  overrideReason: string | null;
  overrideById: number | null;
  overrideOriginalTotal: number | null;
  currency: string;
}
