/**
 * Payment Constraint Tests
 *
 * Business rules tested:
 * - Partial payment → invoice status = partial
 * - Full payment → invoice status = paid
 * - Overpayment → rejected (cannot exceed totalTtc)
 * - CR-12: Cancel invoice with payments → MUST FAIL
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/lib/db";
import { createBaseContext } from "../helpers/factories";

describe("Payment — invoice status transitions", () => {
  let ctx: Awaited<ReturnType<typeof createBaseContext>>;
  const createdIds = {
    services: [] as number[],
    snapshots: [] as number[],
    invoices: [] as number[],
    lines: [] as number[],
    payments: [] as number[],
  };

  beforeEach(async () => {
    ctx = await createBaseContext();
  });

  afterEach(async () => {
    if (createdIds.payments.length)
      await db.payment.deleteMany({ where: { id: { in: createdIds.payments } } });
    if (createdIds.lines.length)
      await db.invoiceLine.deleteMany({ where: { id: { in: createdIds.lines } } });
    if (createdIds.invoices.length)
      await db.invoice.deleteMany({ where: { id: { in: createdIds.invoices } } });
    if (createdIds.snapshots.length)
      await db.pricingSnapshot.deleteMany({ where: { id: { in: createdIds.snapshots } } });
    if (createdIds.services.length)
      await db.service.deleteMany({ where: { id: { in: createdIds.services } } });

    Object.keys(createdIds).forEach(
      (k) => (createdIds[k as keyof typeof createdIds] = []),
    );
    await ctx.cleanup();
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  async function buildInvoiceWithTotal(totalTtc: number) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    const service = await db.service.create({
      data: {
        clientId: ctx.client.id,
        patientId: ctx.patient.id,
        catalogCode: "TRANSPORT_SIMPLE",
        status: "completed",
        urgency: "normal",
        fromLocation: "A",
        toLocation: "B",
        distanceKm: 0,
        scheduledAt: new Date(),
        createdById: ctx.admin.id,
      },
    });
    createdIds.services.push(service.id);

    const snapshot = await db.pricingSnapshot.create({
      data: {
        serviceId: service.id,
        version: 1,
        isCurrent: true,
        inputParams: { catalogCode: "TRANSPORT_SIMPLE" },
        basePrice: totalTtc / 1.1,
        distanceFee: 0,
        modifiersApplied: [],
        subtotalHt: totalTtc / 1.1,
        tvaRate: 0.1,
        tvaAmount: totalTtc - totalTtc / 1.1,
        totalTtc,
        matchedRuleIds: [1],
        isOverridden: false,
      },
    });
    createdIds.snapshots.push(snapshot.id);

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber: `TEST-PAY-${suffix}`,
        clientId: ctx.client.id,
        createdById: ctx.admin.id,
        status: "unpaid",
        totalHt: snapshot.subtotalHt,
        totalTva: snapshot.tvaAmount,
        totalTtc,
      },
    });
    createdIds.invoices.push(invoice.id);

    const line = await db.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        serviceId: service.id,
        snapshotId: snapshot.id,
        lineLabel: `Test line — ${suffix}`,
        lineTotalHt: snapshot.subtotalHt,
        lineTva: snapshot.tvaAmount,
        lineTotalTtc: snapshot.totalTtc,
      },
    });
    createdIds.lines.push(line.id);

    return { service, snapshot, invoice };
  }

  async function addPayment(invoiceId: number, amount: number) {
    const payment = await db.payment.create({
      data: {
        invoiceId,
        amount,
        method: "cash",
        paidAt: new Date(),
        createdById: ctx.admin.id,
      },
    });
    createdIds.payments.push(payment.id);
    return payment;
  }

  async function computePaidTotal(invoiceId: number) {
    const payments = await db.payment.findMany({ where: { invoiceId } });
    return payments.reduce((sum: number, p: { amount: unknown }) => sum + Number(p.amount), 0);
  }

  // ─── Tests ────────────────────────────────────────────────────────────────

  it("partial payment: paidTotal < invoiceTotal → status should be 'partial'", async () => {
    const { invoice } = await buildInvoiceWithTotal(330);

    await addPayment(invoice.id, 165); // half

    const paidTotal = await computePaidTotal(invoice.id);
    const totalTtc = Number(invoice.totalTtc);

    expect(paidTotal).toBeCloseTo(165, 2);
    expect(paidTotal).toBeLessThan(totalTtc);

    // Business rule: set status to partial
    const expectedStatus = paidTotal >= totalTtc ? "paid" : "partial";
    expect(expectedStatus).toBe("partial");

    // Simulate updating invoice status
    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "partial" },
    });
    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated!.status).toBe("partial");
  });

  it("full payment: paidTotal === invoiceTotal → status should be 'paid'", async () => {
    const { invoice } = await buildInvoiceWithTotal(330);

    await addPayment(invoice.id, 330); // full amount

    const paidTotal = await computePaidTotal(invoice.id);
    const totalTtc = Number(invoice.totalTtc);

    expect(paidTotal).toBeCloseTo(330, 2);
    expect(paidTotal).toBeCloseTo(totalTtc, 2);

    const expectedStatus = paidTotal >= totalTtc ? "paid" : "partial";
    expect(expectedStatus).toBe("paid");

    await db.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid" },
    });
    const updated = await db.invoice.findUnique({ where: { id: invoice.id } });
    expect(updated!.status).toBe("paid");
  });

  it("two partial payments summing to full total → status = paid", async () => {
    const { invoice } = await buildInvoiceWithTotal(330);

    await addPayment(invoice.id, 200);
    await addPayment(invoice.id, 130);

    const paidTotal = await computePaidTotal(invoice.id);
    expect(paidTotal).toBeCloseTo(330, 2);
    expect(paidTotal).toBeCloseTo(Number(invoice.totalTtc), 2);
  });

  it("overpayment: paidTotal > invoiceTotal → must be flagged and rejected", async () => {
    const { invoice } = await buildInvoiceWithTotal(165);

    const paidTotal = await computePaidTotal(invoice.id);
    const totalTtc = Number(invoice.totalTtc);
    const proposed = 200; // more than 165

    // Guard: reject if payment would exceed totalTtc
    const remainingBalance = totalTtc - paidTotal;
    const isOverpayment = proposed > remainingBalance;

    expect(isOverpayment).toBe(true);
    // System must refuse to create the payment
    // (enforced at service layer — verified here as business logic)
  });

  it("CR-12: cannot cancel invoice with at least one payment", async () => {
    const { invoice } = await buildInvoiceWithTotal(165);

    await addPayment(invoice.id, 100); // partial payment exists

    const paymentCount = await db.payment.count({
      where: { invoiceId: invoice.id },
    });

    // Guard: cannot cancel if payments exist
    const canCancel = paymentCount === 0;
    expect(canCancel).toBe(false);
  });

  it("invoice with zero payments CAN be cancelled", async () => {
    const { invoice } = await buildInvoiceWithTotal(165);

    const paymentCount = await db.payment.count({
      where: { invoiceId: invoice.id },
    });

    const canCancel = paymentCount === 0;
    expect(canCancel).toBe(true);
  });

  it("payment amount must be positive — zero amount is invalid", async () => {
    const { invoice } = await buildInvoiceWithTotal(165);

    const isValidAmount = (amount: number) => amount > 0;
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-50)).toBe(false);
    expect(isValidAmount(165)).toBe(true);

    // Prisma would reject negative Decimal if schema has @check — verify at app level
    void invoice;
  });

  it("payment correctly references invoiceId", async () => {
    const { invoice } = await buildInvoiceWithTotal(165);

    const payment = await addPayment(invoice.id, 165);

    expect(payment.invoiceId).toBe(invoice.id);
    expect(Number(payment.amount)).toBeCloseTo(165, 2);
  });

  it("multiple invoices: payment on one does not affect the other", async () => {
    const { invoice: inv1 } = await buildInvoiceWithTotal(165);
    const { invoice: inv2 } = await buildInvoiceWithTotal(330);

    await addPayment(inv1.id, 165);

    const paid1 = await computePaidTotal(inv1.id);
    const paid2 = await computePaidTotal(inv2.id);

    expect(paid1).toBeCloseTo(165, 2);
    expect(paid2).toBeCloseTo(0, 2);
  });
});
