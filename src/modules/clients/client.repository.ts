import { db } from "@/lib/db";
import type { CreateClientInput, UpdateClientInput } from "./client.types";

export async function findAllClients(search?: string) {
  return db.client.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
  });
}

export async function findClientById(id: number) {
  return db.client.findUnique({
    where: { id },
    include: { patients: true },
  });
}

export async function createClient(data: CreateClientInput) {
  return db.client.create({ data });
}

export async function updateClient(id: number, data: UpdateClientInput) {
  return db.client.update({ where: { id }, data });
}
