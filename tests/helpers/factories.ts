/**
 * Test data factories.
 * Each factory function creates a DB record and returns a cleanup function.
 * Pattern: const [record, cleanup] = await createXxx(...);
 *          afterEach(cleanup);
 */
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// ─── User ────────────────────────────────────────────────────────────────────

export async function createTestUser(
  role: "admin" | "assistant" = "admin",
  suffix = Date.now().toString(),
) {
  const user = await db.user.create({
    data: {
      email: `test-${suffix}@meditrans.test`,
      passwordHash: await bcrypt.hash("Test@1234", 10),
      role,
      name: `Test ${role}`,
      isActive: true,
    },
  });
  return [user, () => db.user.delete({ where: { id: user.id } })] as const;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export async function createTestClient(suffix = Date.now().toString()) {
  const client = await db.client.create({
    data: {
      name: `Test Client ${suffix}`,
      type: "individual",
      phone: "0600000000",
      email: `client-${suffix}@meditrans.test`,
      address: "123 Rue Test",
    },
  });
  return [
    client,
    () => db.client.delete({ where: { id: client.id } }),
  ] as const;
}

// ─── Patient ─────────────────────────────────────────────────────────────────

export async function createTestPatient(
  clientId: number,
  suffix = Date.now().toString(),
) {
  const patient = await db.patient.create({
    data: {
      fullName: `Test Patient ${suffix}`,
      clientId,
      dateOfBirth: new Date("1985-01-01"),
      phone: "0611111111",
      address: "123 Rue Test, Casablanca",
    },
  });
  return [
    patient,
    () => db.patient.delete({ where: { id: patient.id } }),
  ] as const;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function createTestService(
  clientId: number,
  patientId: number,
  createdById: number,
  overrides: Partial<{
    catalogCode: string;
    status: "pending" | "in_progress" | "completed" | "cancelled";
    urgency: "normal" | "urgent";
    distanceKm: number;
    scheduledAt: Date;
  }> = {},
) {
  const service = await db.service.create({
    data: {
      clientId,
      patientId,
      catalogCode: overrides.catalogCode ?? "TRANSPORT_SIMPLE",
      status: overrides.status ?? "pending",
      urgency: overrides.urgency ?? "normal",
      fromLocation: "Casablanca Centre",
      toLocation: "Clinique Test",
      distanceKm: overrides.distanceKm ?? 0,
      scheduledAt: overrides.scheduledAt ?? new Date(),
      createdById,
    },
  });
  return [
    service,
    () => db.service.delete({ where: { id: service.id } }),
  ] as const;
}

// ─── Snapshot ────────────────────────────────────────────────────────────────

export async function createTestSnapshot(
  serviceId: number,
  version: number,
  isCurrent: boolean,
  totalTtc: number,
) {
  const snapshot = await db.pricingSnapshot.create({
    data: {
      serviceId,
      version,
      isCurrent,
      inputParams: {
        catalogCode: "TRANSPORT_SIMPLE",
        scheduledAt: new Date().toISOString(),
        isUrgent: false,
        distanceKm: 0,
        selectedModifiers: [],
      },
      basePrice: totalTtc / 1.1,
      distanceFee: 0,
      modifiersApplied: [],
      subtotalHt: totalTtc / 1.1,
      tvaRate: 0.1,
      tvaAmount: totalTtc - totalTtc / 1.1,
      totalTtc,
      matchedRuleIds: [],
      isOverridden: false,
    },
  });
  return [
    snapshot,
    () => db.pricingSnapshot.delete({ where: { id: snapshot.id } }),
  ] as const;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export async function createTestInvoice(
  clientId: number,
  createdById: number,
  suffix = Date.now().toString(),
) {
  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: `TEST-${suffix}`,
      clientId,
      createdById,
      status: "unpaid",
      totalHt: 0,
      totalTva: 0,
      totalTtc: 0,
    },
  });
  return [
    invoice,
    () => db.invoice.delete({ where: { id: invoice.id } }),
  ] as const;
}

// ─── Complete test context (user + client + patient) ─────────────────────────

export async function createBaseContext() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const [admin] = await createTestUser("admin", suffix);
  const [client] = await createTestClient(suffix);
  const [patient] = await createTestPatient(client.id, suffix);
  return {
    admin,
    client,
    patient,
    async cleanup() {
      await db.patient.deleteMany({ where: { clientId: client.id } });
      await db.client.delete({ where: { id: client.id } });
      await db.user.delete({ where: { id: admin.id } });
    },
  };
}
