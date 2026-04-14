import { db } from "@/lib/db";
import type { ServiceStatus as PrismaServiceStatus } from "@/lib/constants";

export async function findAllServices(filters?: {
  status?: string;
  clientId?: number;
  patientId?: number;
}) {
  return db.service.findMany({
    where: {
      status: (filters?.status as PrismaServiceStatus) ?? undefined,
      clientId: filters?.clientId,
      patientId: filters?.patientId,
    },
    include: {
      patient: true,
      client: true,
      catalog: true,
      snapshots: { where: { isCurrent: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function findServiceById(id: number) {
  return db.service.findUnique({
    where: { id },
    include: {
      patient: true,
      client: true,
      catalog: true,
      snapshots: { orderBy: { version: "asc" } },
      invoiceLine: { include: { invoice: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function findUninvoicedServicesByClient(clientId: number) {
  return db.service.findMany({
    where: {
      clientId,
      status: "completed",
      invoiceLine: null,
    },
    include: {
      patient: true,
      catalog: true,
      snapshots: { where: { isCurrent: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });
}

export async function createService(data: {
  patientId: number;
  clientId: number;
  catalogCode: string;
  status: "pending";
  urgency: "normal" | "urgent";
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  isRoundTrip: boolean;
  staffType?: "nurse" | "doctor" | "reanimator";
  durationHours?: number;
  scheduledAt: Date;
  notes?: string;
  createdById: number;
}) {
  return db.service.create({ data });
}

export async function updateServiceStatus(
  id: number,
  status: "pending" | "in_progress" | "completed" | "cancelled",
) {
  return db.service.update({
    where: { id },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : undefined,
    },
  });
}
