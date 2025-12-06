export function getMinutesLeft(scheduledAt: string | Date): number {
  try {
    const target = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.floor(diffMs / 60000);
  } catch {
    return NaN;
  }
}

export function isToday(dateInput: string | Date): boolean {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  } catch {
    return false;
  }
}

export function isWithinMinutes(dateInput: string | Date, minutes: number): boolean {
  const left = getMinutesLeft(dateInput);
  if (isNaN(left)) return false;
  return left >= 0 && left <= minutes;
}

export function formatTimeHM(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
