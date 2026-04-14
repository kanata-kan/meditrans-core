import type { UserRole } from "@/lib/constants";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}
