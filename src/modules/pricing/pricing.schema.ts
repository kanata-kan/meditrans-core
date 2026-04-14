import { z } from "zod";

export const pricingInputSchema = z.object({
  catalogCode: z.string().min(1),
  scheduledAt: z.coerce.date(),
  isUrgent: z.boolean(),
  distanceKm: z.number().min(0),
  isRoundTrip: z.boolean(),
  staffType: z.enum(["nurse", "doctor", "reanimator"]).optional(),
  durationHours: z.number().int().positive().optional(),
  selectedModifiers: z.array(z.string()),
  manualOverride: z
    .object({
      total: z.number().positive(),
      reason: z.string().min(10, "La raison doit comporter au moins 10 caractères."),
    })
    .optional(),
});

export const applyOverrideSchema = z.object({
  serviceId: z.number().int().positive(),
  newTotal: z.number().positive(),
  reason: z.string().min(10, "La raison doit comporter au moins 10 caractères."),
});

export type PricingInputSchema = z.infer<typeof pricingInputSchema>;
export type ApplyOverrideSchema = z.infer<typeof applyOverrideSchema>;
