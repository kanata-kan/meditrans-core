"use server";

import { createUserSchema, updateUserSchema } from "./user.schema";
import * as userService from "./user.service";

export async function createUserAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    name: formData.get("name"),
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  try {
    const user = await userService.createUser(parsed.data);
    return { success: true, data: { id: user.id, email: user.email } };
  } catch {
    return { success: false, error: "Erreur lors de la création de l'utilisateur." };
  }
}

export async function updateUserAction(id: number, formData: FormData) {
  const raw = {
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten() };
  }

  try {
    const user = await userService.updateUser(id, parsed.data);
    return { success: true, data: { id: user.id } };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}
