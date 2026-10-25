import { formatDate, formatPct } from './format';

describe('formatPct', () => {
  it('rounds a ratio to a whole percent and marks missing rates as n/a', () => {
    expect(formatPct(0.6667)).toBe('67%');
    expect(formatPct(1)).toBe('100%');
    expect(formatPct(null)).toBe('n/a');
  });
});

describe('formatDate', () => {
  it('formats unix seconds as a UTC date and time', () => {
    expect(formatDate(1792656096)).toBe('22 Oct 2026, 08:01');
  });
});
