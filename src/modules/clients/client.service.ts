import * as clientRepo from "./client.repository";
import type { CreateClientInput, UpdateClientInput } from "./client.types";

export async function listClients(search?: string) {
  return clientRepo.findAllClients(search);
}

export async function getClient(id: number) {
  const client = await clientRepo.findClientById(id);
  if (!client) throw new Error("Client introuvable.");
  return client;
}

export async function createClient(input: CreateClientInput) {
  return clientRepo.createClient(input);
}

export async function updateClient(id: number, input: UpdateClientInput) {
  return clientRepo.updateClient(id, input);
}
