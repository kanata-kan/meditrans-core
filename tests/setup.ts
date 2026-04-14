/**
 * Global Vitest setup — runs once before all test files.
 * Verifies DB connection, then disconnects cleanly after all tests.
 */
import { afterAll, beforeAll } from "vitest";
import { db } from "@/lib/db";

beforeAll(async () => {
  await db.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await db.$disconnect();
});
