import bcrypt from "bcryptjs";
import * as userRepo from "./user.repository";
import type { CreateUserInput, UpdateUserInput } from "./user.types";

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return userRepo.createUser({
    email: input.email,
    passwordHash,
    role: input.role,
    name: input.name,
  });
}

export async function validateCredentials(email: string, password: string) {
  const user = await userRepo.findUserByEmail(email);
  if (!user || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function updateUser(id: number, input: UpdateUserInput) {
  return userRepo.updateUser(id, input);
}

export async function listUsers() {
  return userRepo.findAllUsers();
}
