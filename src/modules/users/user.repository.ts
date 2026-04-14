import { db } from "@/lib/db";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export async function findUserById(id: number) {
  return db.user.findUnique({ where: { id } });
}

export async function findAllUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  role: "admin" | "assistant";
  name: string;
}) {
  return db.user.create({ data });
}

export async function updateUser(
  id: number,
  data: Partial<{ name: string; role: "admin" | "assistant"; isActive: boolean }>,
) {
  return db.user.update({ where: { id }, data });
}
