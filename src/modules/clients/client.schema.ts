import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["individual", "company", "insurer"]),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5).max(500),
  notes: z.string().max(1000).optional(),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientSchema = z.infer<typeof createClientSchema>;
export type UpdateClientSchema = z.infer<typeof updateClientSchema>;
