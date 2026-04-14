import { z } from "zod";

export const createServiceSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  clientId: z.coerce.number().int().positive(),
  catalogCode: z.string().min(1),
  urgency: z.enum(["normal", "urgent"]),
  fromLocation: z.string().min(2).max(500),
  toLocation: z.string().min(2).max(500),
  distanceKm: z.coerce.number().min(0),
  isRoundTrip: z.coerce.boolean(),
  staffType: z.enum(["nurse", "doctor", "reanimator"]).optional(),
  durationHours: z.coerce.number().int().positive().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  selectedModifiers: z.array(z.string()),
  manualOverride: z
    .object({
      total: z.number().positive(),
      reason: z.string().min(10),
    })
    .optional(),
});

export const updateServiceStatusSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

export type CreateServiceSchema = z.infer<typeof createServiceSchema>;
export type UpdateServiceStatusSchema = z.infer<typeof updateServiceStatusSchema>;
