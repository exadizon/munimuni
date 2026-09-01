import { describe, expect, it } from 'vitest';
import { countWords, parseDateKey, toDateKey } from './journal';

describe('journal helpers', () => {
  it('round-trips a local calendar date without timezone drift', () => {
    const date = new Date(2026, 8, 1);
    expect(toDateKey(date)).toBe('2026-09-01');
    expect(toDateKey(parseDateKey('2026-09-01'))).toBe('2026-09-01');
  });

  it('counts words while ignoring surrounding whitespace', () => {
    expect(countWords('  The rain   was quiet.  ')).toBe(4);
    expect(countWords('')).toBe(0);
  });
});
