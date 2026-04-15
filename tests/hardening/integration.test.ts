/**
 * HARDENING++ — Service-Level Integration Tests
 *
 * Tests the full flow through the REAL service layer:
 * - createService() → pricing engine → snapshot creation
 * - createInvoice() → validates cancelled/already-invoiced services
 * - cancelInvoice() → blocked if payments exist
 * - recordPayment() → auto-updates invoice status
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createService } from "@/modules/services/service.service";
import { createInvoice, cancelInvoice } from "@/modules/invoices/invoice.service";
import { recordPayment } from "@/modules/payments/payment.service";
import { createBaseContext } from "../helpers/factories";

describe("HARDENING — createService integration", () => {
  let ctx: Awaited<ReturnType<typeof createBaseContext>>;
  const cleanupIds = {
    snapshots: [] as number[],
    services: [] as number[],
  };

  beforeEach(async () => {
    ctx = await createBaseContext();
  });

  afterEach(async () => {
    if (cleanupIds.snapshots.length)
      await db.pricingSnapshot.deleteMany({ where: { id: { in: cleanupIds.snapshots } } });
    if (cleanupIds.services.length)
      await db.service.deleteMany({ where: { id: { in: cleanupIds.services } } });
    cleanupIds.snapshots = [];
    cleanupIds.services = [];
    await ctx.cleanup();
  });

  it("createService: creates service + snapshot in one call", async () => {
    const service = await createService(
      {
        patientId: ctx.patient.id,
        clientId: ctx.client.id,
        catalogCode: "TRANSPORT_SIMPLE",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 10,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        selectedModifiers: [],
      },
      ctx.admin.id,
      "admin",
    );
    cleanupIds.services.push(service.id);

    expect(service.id).toBeGreaterThan(0);
    expect(service.status).toBe("pending");
    expect(service.catalogCode).toBe("TRANSPORT_SIMPLE");

    // Snapshot must have been created automatically
    const snapshots = await db.pricingSnapshot.findMany({
      where: { serviceId: service.id },
    });
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    cleanupIds.snapshots.push(...snapshots.map((s) => s.id));

    const current = snapshots.find((s) => s.isCurrent);
    expect(current).toBeDefined();
    expect(current!.version).toBe(1);
    // base=150, distance=75, subtotalHt=225, tva=22.5, total=247.50
    expect(Number(current!.totalTtc)).toBeCloseTo(247.5, 2);
  });

  it("createService with night surcharge: snapshot includes modifier", async () => {
    const service = await createService(
      {
        patientId: ctx.patient.id,
        clientId: ctx.client.id,
        catalogCode: "TRANSPORT_SIMPLE",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 0,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        selectedModifiers: ["NIGHT_SURCHARGE"],
      },
      ctx.admin.id,
      "admin",
    );
    cleanupIds.services.push(service.id);

    const snap = await db.pricingSnapshot.findFirst({
      where: { serviceId: service.id, isCurrent: true },
    });
    cleanupIds.snapshots.push(snap!.id);

    expect(snap).not.toBeNull();
    // base=150 + NIGHT=100 = 250, tva=25, total=275
    expect(Number(snap!.totalTtc)).toBeCloseTo(275, 2);
    const mods = snap!.modifiersApplied as Array<{ code: string }>;
    expect(mods).toHaveLength(1);
    expect(mods[0].code).toBe("NIGHT_SURCHARGE");
  });

  it("createService with urgent scheduling too far: throws error", async () => {
    await expect(
      createService(
        {
          patientId: ctx.patient.id,
          clientId: ctx.client.id,
          catalogCode: "TRANSPORT_SIMPLE",
          urgency: "urgent",
          fromLocation: "A",
          toLocation: "B",
          distanceKm: 0,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(), // 24h later
          selectedModifiers: [],
        },
        ctx.admin.id,
        "admin",
      ),
    ).rejects.toThrow("Un service urgent doit être planifié dans les 2 prochaines heures");
  });

  it("createService with invalid catalog: throws PricingCatalogNotFoundError", async () => {
    await expect(
      createService(
        {
          patientId: ctx.patient.id,
          clientId: ctx.client.id,
          catalogCode: "NONEXISTENT_CATALOG_CODE_XYZ",
          urgency: "normal",
          fromLocation: "A",
          toLocation: "B",
          distanceKm: 0,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          selectedModifiers: [],
        },
        ctx.admin.id,
        "admin",
      ),
    ).rejects.toThrow();
  });
});

describe("HARDENING — createInvoice integration", () => {
  let ctx: Awaited<ReturnType<typeof createBaseContext>>;
  const cleanupIds = {
    payments: [] as number[],
    lines: [] as number[],
    invoices: [] as number[],
    snapshots: [] as number[],
    services: [] as number[],
  };

  beforeEach(async () => {
    ctx = await createBaseContext();
  });

  afterEach(async () => {
    if (cleanupIds.payments.length)
      await db.payment.deleteMany({ where: { id: { in: cleanupIds.payments } } });
    if (cleanupIds.lines.length)
      await db.invoiceLine.deleteMany({ where: { id: { in: cleanupIds.lines } } });
    if (cleanupIds.invoices.length)
      await db.invoice.deleteMany({ where: { id: { in: cleanupIds.invoices } } });
    if (cleanupIds.snapshots.length)
      await db.pricingSnapshot.deleteMany({ where: { id: { in: cleanupIds.snapshots } } });
    if (cleanupIds.services.length)
      await db.service.deleteMany({ where: { id: { in: cleanupIds.services } } });
    Object.keys(cleanupIds).forEach(
      (k) => (cleanupIds[k as keyof typeof cleanupIds] = []),
    );
    await ctx.cleanup();
  });

  async function makeCompletedService(distanceKm = 0) {
    const service = await createService(
      {
        patientId: ctx.patient.id,
        clientId: ctx.client.id,
        catalogCode: "TRANSPORT_SIMPLE",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        selectedModifiers: [],
      },
      ctx.admin.id,
      "admin",
    );
    // Mark as completed
    await db.service.update({
      where: { id: service.id },
      data: { status: "completed", completedAt: new Date() },
    });
    cleanupIds.services.push(service.id);

    const snaps = await db.pricingSnapshot.findMany({
      where: { serviceId: service.id },
    });
    cleanupIds.snapshots.push(...snaps.map((s) => s.id));

    return service;
  }

  it("createInvoice: full flow with 2 completed services", async () => {
    const s1 = await makeCompletedService(0);
    const s2 = await makeCompletedService(10);

    const invoice = await createInvoice(
      {
        clientId: ctx.client.id,
        serviceIds: [s1.id, s2.id],
      },
      ctx.admin.id,
    );
    cleanupIds.invoices.push(invoice.id);

    // Fetch lines
    const lines = await db.invoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });
    cleanupIds.lines.push(...lines.map((l) => l.id));

    expect(invoice.status).toBe("unpaid");
    expect(lines).toHaveLength(2);

    // totalTtc = 165 (0km) + 247.50 (10km) = 412.50
    expect(Number(invoice.totalTtc)).toBeCloseTo(412.5, 2);
  });

  it("createInvoice: rejects cancelled service", async () => {
    const service = await createService(
      {
        patientId: ctx.patient.id,
        clientId: ctx.client.id,
        catalogCode: "TRANSPORT_SIMPLE",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 0,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        selectedModifiers: [],
      },
      ctx.admin.id,
      "admin",
    );
    cleanupIds.services.push(service.id);
    const snaps = await db.pricingSnapshot.findMany({
      where: { serviceId: service.id },
    });
    cleanupIds.snapshots.push(...snaps.map((s) => s.id));

    // Cancel the service
    await db.service.update({
      where: { id: service.id },
      data: { status: "cancelled" },
    });

    await expect(
      createInvoice(
        { clientId: ctx.client.id, serviceIds: [service.id] },
        ctx.admin.id,
      ),
    ).rejects.toThrow("annulé");
  });

  it("createInvoice: rejects already-invoiced service", async () => {
    const service = await makeCompletedService(0);

    const invoice1 = await createInvoice(
      { clientId: ctx.client.id, serviceIds: [service.id] },
      ctx.admin.id,
    );
    cleanupIds.invoices.push(invoice1.id);
    const lines1 = await db.invoiceLine.findMany({
      where: { invoiceId: invoice1.id },
    });
    cleanupIds.lines.push(...lines1.map((l) => l.id));

    // Try to invoice same service again
    await expect(
      createInvoice(
        { clientId: ctx.client.id, serviceIds: [service.id] },
        ctx.admin.id,
      ),
    ).rejects.toThrow("déjà été ajouté");
  });

  it("cancelInvoice: blocked when payment exists", async () => {
    const service = await makeCompletedService(0);

    const invoice = await createInvoice(
      { clientId: ctx.client.id, serviceIds: [service.id] },
      ctx.admin.id,
    );
    cleanupIds.invoices.push(invoice.id);
    const lines = await db.invoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });
    cleanupIds.lines.push(...lines.map((l) => l.id));

    // Add payment
    const payment = await recordPayment(
      {
        invoiceId: invoice.id,
        amount: 50,
        method: "cash",
        paidAt: new Date().toISOString(),
      },
      ctx.admin.id,
    );
    cleanupIds.payments.push(payment.id);

    // Try to cancel → must fail
    await expect(cancelInvoice(invoice.id)).rejects.toThrow("paiements");
  });

  it("cancelInvoice: succeeds when no payments", async () => {
    const service = await makeCompletedService(0);

    const invoice = await createInvoice(
      { clientId: ctx.client.id, serviceIds: [service.id] },
      ctx.admin.id,
    );
    cleanupIds.invoices.push(invoice.id);
    const lines = await db.invoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });
    cleanupIds.lines.push(...lines.map((l) => l.id));

    const cancelled = await cancelInvoice(invoice.id);
    expect(cancelled.status).toBe("cancelled");
  });
});

describe("HARDENING — recordPayment integration", () => {
  let ctx: Awaited<ReturnType<typeof createBaseContext>>;
  const cleanupIds = {
    payments: [] as number[],
    lines: [] as number[],
    invoices: [] as number[],
    snapshots: [] as number[],
    services: [] as number[],
  };

  beforeEach(async () => {
    ctx = await createBaseContext();
  });

  afterEach(async () => {
    if (cleanupIds.payments.length)
      await db.payment.deleteMany({ where: { id: { in: cleanupIds.payments } } });
    if (cleanupIds.lines.length)
      await db.invoiceLine.deleteMany({ where: { id: { in: cleanupIds.lines } } });
    if (cleanupIds.invoices.length)
      await db.invoice.deleteMany({ where: { id: { in: cleanupIds.invoices } } });
    if (cleanupIds.snapshots.length)
      await db.pricingSnapshot.deleteMany({ where: { id: { in: cleanupIds.snapshots } } });
    if (cleanupIds.services.length)
      await db.service.deleteMany({ where: { id: { in: cleanupIds.services } } });
    Object.keys(cleanupIds).forEach(
      (k) => (cleanupIds[k as keyof typeof cleanupIds] = []),
    );
    await ctx.cleanup();
  });

  async function setupInvoice() {
    const service = await createService(
      {
        patientId: ctx.patient.id,
        clientId: ctx.client.id,
        catalogCode: "TRANSPORT_SIMPLE",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 0,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        selectedModifiers: [],
      },
      ctx.admin.id,
      "admin",
    );
    cleanupIds.services.push(service.id);
    const snaps = await db.pricingSnapshot.findMany({
      where: { serviceId: service.id },
    });
    cleanupIds.snapshots.push(...snaps.map((s) => s.id));

    await db.service.update({
      where: { id: service.id },
      data: { status: "completed", completedAt: new Date() },
    });

    const invoice = await createInvoice(
      { clientId: ctx.client.id, serviceIds: [service.id] },
      ctx.admin.id,
    );
    cleanupIds.invoices.push(invoice.id);
    const lines = await db.invoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });
    cleanupIds.lines.push(...lines.map((l) => l.id));

    return invoice; // totalTtc = 165
  }

  it("recordPayment: partial → invoice status becomes 'partial'", async () => {
    const invoice = await setupInvoice();

    const payment = await recordPayment(
      {
        invoiceId: invoice.id,
        amount: 50,
        method: "cash",
        paidAt: new Date().toISOString(),
      },
      ctx.admin.id,
    );
    cleanupIds.payments.push(payment.id);

    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated!.status).toBe("partial");
  });

  it("recordPayment: full amount → invoice status becomes 'paid'", async () => {
    const invoice = await setupInvoice();

    const payment = await recordPayment(
      {
        invoiceId: invoice.id,
        amount: 165,
        method: "card",
        paidAt: new Date().toISOString(),
      },
      ctx.admin.id,
    );
    cleanupIds.payments.push(payment.id);

    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated!.status).toBe("paid");
  });

  it("recordPayment: on already-paid invoice → throws error", async () => {
    const invoice = await setupInvoice();

    const p1 = await recordPayment(
      {
        invoiceId: invoice.id,
        amount: 165,
        method: "cash",
        paidAt: new Date().toISOString(),
      },
      ctx.admin.id,
    );
    cleanupIds.payments.push(p1.id);

    // Second payment on paid invoice → must throw
    await expect(
      recordPayment(
        {
          invoiceId: invoice.id,
          amount: 10,
          method: "cash",
          paidAt: new Date().toISOString(),
        },
        ctx.admin.id,
      ),
    ).rejects.toThrow("déjà entièrement payée");
  });

  it("recordPayment: on cancelled invoice → throws error", async () => {
    const invoice = await setupInvoice();

    // Force cancel (no payments, so this works)
    await cancelInvoice(invoice.id);

    await expect(
      recordPayment(
        {
          invoiceId: invoice.id,
          amount: 50,
          method: "cash",
          paidAt: new Date().toISOString(),
        },
        ctx.admin.id,
      ),
    ).rejects.toThrow("annulée");
  });
});
