export function validateUrgentScheduling(
  urgency: string,
  scheduledAt: Date,
): boolean {
  if (urgency !== "urgent") return true;
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return scheduledAt <= twoHoursFromNow;
}
