const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/** Unix seconds to "22 Oct 2026, 11:01" in UTC, so the same run reads the same everywhere. */
export function formatDate(unixSeconds: number): string {
  return dateFormat.format(new Date(unixSeconds * 1000));
}

/** A 0..1 ratio as a whole percent; null (no calls to divide by) as "n/a". */
export function formatPct(ratio: number | null | undefined): string {
  return ratio == null ? 'n/a' : `${Math.round(ratio * 100)}%`;
}
