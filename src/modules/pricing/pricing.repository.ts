import { db } from "@/lib/db";
import type { PricingInput, AppliedModifier } from "./pricing.types";

export async function findCatalogEntry(code: string) {
  return db.serviceCatalog.findFirst({
    where: { code, isActive: true },
  });
}

export async function findPricingRules(catalogCode: string) {
  const now = new Date();
  return db.pricingRule.findMany({
    where: {
      catalogCode,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
    orderBy: { validFrom: "desc" },
  });
}

export async function findActiveModifiers(codes: string[]) {
  return db.pricingModifier.findMany({
    where: { code: { in: codes }, isActive: true },
  });
}

export async function findActiveDistanceRate() {
  return db.pricingDistanceRate.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSnapshot(data: {
  serviceId: number;
  version: number;
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
  overrideReason?: string;
  overrideById?: number;
  overrideOriginalTotal?: number;
}) {
  return db.pricingSnapshot.create({ data });
}

export async function findCurrentSnapshot(serviceId: number) {
  return db.pricingSnapshot.findFirst({
    where: { serviceId, isCurrent: true },
  });
}

export async function findSnapshotsByService(serviceId: number) {
  return db.pricingSnapshot.findMany({
    where: { serviceId },
    orderBy: { version: "asc" },
  });
}

export async function setSnapshotInactive(id: number) {
  return db.pricingSnapshot.update({
    where: { id },
    data: { isCurrent: false },
  });
}
