import type { ClientType } from "@/lib/constants";

export interface Client {
  id: number;
  name: string;
  type: ClientType;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  createdAt: Date;
}

export interface CreateClientInput {
  name: string;
  type: ClientType;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
}

export type UpdateClientInput = Partial<CreateClientInput>;
