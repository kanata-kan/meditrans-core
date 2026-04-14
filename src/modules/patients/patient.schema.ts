import { z } from "zod";

export const createPatientSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  fullName: z.string().min(2).max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD requis"),
  phone: z.string().min(8).max(20),
  address: z.string().min(5).max(500),
  medicalNotes: z.string().max(2000).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientSchema = z.infer<typeof createPatientSchema>;
export type UpdatePatientSchema = z.infer<typeof updatePatientSchema>;
