import { db } from "@/lib/db";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.types";

export async function findAllPatients(search?: string) {
  return db.patient.findMany({
    where: search
      ? { fullName: { contains: search, mode: "insensitive" } }
      : undefined,
    include: { client: true },
    orderBy: { fullName: "asc" },
  });
}

export async function findPatientsByClient(clientId: number) {
  return db.patient.findMany({
    where: { clientId },
    orderBy: { fullName: "asc" },
  });
}

export async function findPatientById(id: number) {
  return db.patient.findUnique({
    where: { id },
    include: { client: true },
  });
}

export async function createPatient(data: CreatePatientInput) {
  return db.patient.create({
    data: {
      ...data,
      dateOfBirth: new Date(data.dateOfBirth),
    },
  });
}

export async function updatePatient(id: number, data: UpdatePatientInput) {
  return db.patient.update({
    where: { id },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  });
}
