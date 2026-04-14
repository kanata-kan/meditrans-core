import { z } from "zod";

export const createInvoiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  serviceIds: z.array(z.coerce.number().int().positive()).min(1),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateInvoiceSchema = z.infer<typeof createInvoiceSchema>;
