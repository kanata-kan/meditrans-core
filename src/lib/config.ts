import { db } from "@/lib/db";

export interface SystemConfigValues {
  DEFAULT_TVA_RATE: number;
  NIGHT_START_HOUR: number;
  NIGHT_END_HOUR: number;
}

export async function getSystemConfig(): Promise<SystemConfigValues> {
  const rows = await db.systemConfig.findMany();
  const map = Object.fromEntries(
    rows.map((r: { key: string; value: string }) => [r.key, r.value]),
  );

  return {
    DEFAULT_TVA_RATE: parseFloat(map["DEFAULT_TVA_RATE"] ?? "0.10"),
    NIGHT_START_HOUR: parseInt(map["NIGHT_START_HOUR"] ?? "21", 10),
    NIGHT_END_HOUR: parseInt(map["NIGHT_END_HOUR"] ?? "7", 10),
  };
}
