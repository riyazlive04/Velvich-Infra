/**
 * Dates are stored UTC and displayed in IST (Asia/Kolkata, UTC+5:30).
 * These helpers are framework-agnostic and safe on both client and server.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/** Format a date for display in IST, e.g. "21 Jun 2026". */
export function formatISTDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST_TIMEZONE,
  }).format(d);
}

/** Format a date + time for display in IST, e.g. "21 Jun 2026, 4:30 pm". */
export function formatISTDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE,
  }).format(d);
}

/** "YYYY-MM" month key in IST for a given date — used by the monthly ledger. */
export function istMonthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: IST_TIMEZONE,
  }).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

/** Inclusive [start, end) UTC instants covering an IST month "YYYY-MM". */
export function istMonthRange(monthKey: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  // IST is UTC+5:30; month boundary 00:00 IST = previous day 18:30 UTC.
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0) - 5.5 * 60 * 60 * 1000);
  const end = new Date(Date.UTC(year, month, 1, 0, 0) - 5.5 * 60 * 60 * 1000);
  return { start, end };
}

/** Whole days a due date is overdue relative to `now` (negative = not yet due). */
export function daysOverdue(dueDate: Date | string, now: Date): number {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const ms = now.getTime() - due.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/** Receivable aging bucket from days overdue. */
export type AgingBucket = 'current' | '0-30' | '31-60' | '61-90' | '90+';

export function agingBucket(days: number): AgingBucket {
  if (days <= 0) return 'current';
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
