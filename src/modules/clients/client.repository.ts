import { db } from "@/lib/db";
import type { ClientType } from "@/lib/constants";
import type { CreateClientInput, UpdateClientInput } from "./client.types";

export interface FindAllClientsParams {
  search?: string;
  type?: ClientType;
}

export async function findAllClients(params?: FindAllClientsParams) {
  const where: Record<string, unknown> = {};

  if (params?.search) {
    where.name = { contains: params.search, mode: "insensitive" };
  }
  if (params?.type) {
    where.type = params.type;
  }

  return db.client.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      _count: { select: { patients: true, services: true, invoices: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findClientById(id: number) {
  return db.client.findUnique({
    where: { id },
    include: {
      patients: { orderBy: { fullName: "asc" } },
      _count: { select: { patients: true, services: true, invoices: true } },
    },
  });
}

export async function createClient(data: CreateClientInput) {
  return db.client.create({ data });
}

export async function updateClient(id: number, data: UpdateClientInput) {
  return db.client.update({ where: { id }, data });
}

export async function deleteClient(id: number) {
  return db.client.delete({ where: { id } });
}

export async function countClients() {
  return db.client.count();
}
