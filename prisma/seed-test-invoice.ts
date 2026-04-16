/**
 * Quick test seed — creates a client, patient, services, and an invoice
 * so we can test the PDF engine.
 *
 * Usage: npx ts-node --project tsconfig.seed.json prisma/seed-test-invoice.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🧪 Seeding test invoice data...");

  // 1. Client
  const client = await db.client.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Clinique Al Hayat",
      type: "company",
      phone: "+212 5 22 11 22 33",
      email: "contact@alhayat.ma",
      address: "123 Bd Zerktouni, Casablanca",
    },
  });
  console.log("  ✓ client:", client.id);

  // 2. Patient
  const patient = await db.patient.upsert({
    where: { id: 1 },
    update: {},
    create: {
      fullName: "Ahmed Benali",
      phone: "+212 6 61 00 00 01",
      dateOfBirth: new Date("1985-03-15"),
      address: "45 Rue des Orangers, Casablanca",
      clientId: client.id,
    },
  });
  console.log("  ✓ patient:", patient.id);

  // 3. Services (2 for the invoice)
  const svc1 = await db.service.create({
    data: {
      patientId: patient.id,
      clientId: client.id,
      catalogCode: "TRANSPORT_SIMPLE",
      status: "completed",
      urgency: "normal",
      fromLocation: "CHU Ibn Rochd",
      toLocation: "Clinique Al Hayat",
      distanceKm: 12,
      scheduledAt: new Date(),
      createdById: 1,
    },
  });

  const svc2 = await db.service.create({
    data: {
      patientId: patient.id,
      clientId: client.id,
      catalogCode: "ECG",
      status: "completed",
      urgency: "normal",
      fromLocation: "Domicile patient",
      toLocation: "Domicile patient",
      distanceKm: 0,
      scheduledAt: new Date(),
      createdById: 1,
    },
  });
  console.log("  ✓ services:", svc1.id, svc2.id);

  // 4. Pricing snapshots
  const snap1 = await db.pricingSnapshot.create({
    data: {
      serviceId: svc1.id,
      version: 1,
      isCurrent: true,
      inputParams: {},
      basePrice: 150,
      distanceFee: 90,
      modifiersApplied: [],
      subtotalHt: 240,
      tvaRate: 0.1,
      tvaAmount: 24,
      totalTtc: 264,
      matchedRuleIds: [1],
      isOverridden: false,
      calculatedAt: new Date(),
    },
  });

  const snap2 = await db.pricingSnapshot.create({
    data: {
      serviceId: svc2.id,
      version: 1,
      isCurrent: true,
      inputParams: {},
      basePrice: 200,
      distanceFee: 0,
      modifiersApplied: [],
      subtotalHt: 200,
      tvaRate: 0.1,
      tvaAmount: 20,
      totalTtc: 220,
      matchedRuleIds: [1],
      isOverridden: false,
      calculatedAt: new Date(),
    },
  });
  console.log("  ✓ snapshots:", snap1.id, snap2.id);

  // 5. Invoice + lines
  const invoice = await db.invoice.create({
    data: {
      clientId: client.id,
      invoiceNumber: "INV-2025-0001",
      status: "unpaid",
      totalHt: 440,
      totalTva: 44,
      totalTtc: 484,
      dueDate: new Date(Date.now() + 30 * 86400000),
      notes: "Facture de test pour le moteur PDF.",
      createdById: 1,
    },
  });

  await db.invoiceLine.create({
    data: {
      invoiceId: invoice.id,
      serviceId: svc1.id,
      snapshotId: snap1.id,
      lineLabel: "Transport simple — CHU → Clinique (12 km)",
      lineTotalHt: 240,
      lineTva: 24,
      lineTotalTtc: 264,
      sortOrder: 0,
    },
  });

  await db.invoiceLine.create({
    data: {
      invoiceId: invoice.id,
      serviceId: svc2.id,
      snapshotId: snap2.id,
      lineLabel: "ECG à domicile",
      lineTotalHt: 200,
      lineTva: 20,
      lineTotalTtc: 220,
      sortOrder: 1,
    },
  });

  console.log("  ✓ invoice:", invoice.id, invoice.invoiceNumber);
  console.log("✅ Test invoice seed complete. Try: GET /api/invoices/" + invoice.id + "/pdf");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
