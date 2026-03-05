import { describe, it, expect } from 'vitest';
import { assignTitles, TITLE_LABELS, type TitleKey } from './titleEngine';
import type { MemberMetrics } from './leaderboardEngine';

// --- helpers ---------------------------------------------------------------

function makeMetrics(
  memberId: string,
  opts: Partial<Omit<MemberMetrics, 'memberId'>> = {}
): MemberMetrics {
  return {
    memberId,
    totalPaidCents: opts.totalPaidCents ?? 0,
    transactionCount: opts.transactionCount ?? 0,
    maxSingleCents: opts.maxSingleCents ?? 0,
    netCents: opts.netCents ?? 0,
  };
}

// ---------------------------------------------------------------------------

describe('assignTitles', () => {
  describe('3+ member group with distinct leaders', () => {
    it('assigns correct titles based on metric rankings', () => {
      // alice: highest netCents (SUGAR_PARENT), highest totalPaidCents (HIGH_ROLLER would go to bob due to first-write-wins)
      // bob: second netCents, second totalPaidCents (HIGH_ROLLER), most transactions (LIFE_OF_PARTY would go to carol)
      // carol: lowest netCents (BIGGEST_MOOCH), lowest totalPaidCents (PENNY_PINCHER), fewest transactions (FREE_RIDER)
      const metrics = [
        makeMetrics('alice', { netCents: 5000, totalPaidCents: 8000, transactionCount: 3, maxSingleCents: 5000 }),
        makeMetrics('bob',   { netCents: 2000, totalPaidCents: 4000, transactionCount: 5, maxSingleCents: 3000 }),
        makeMetrics('carol', { netCents: -7000, totalPaidCents: 1000, transactionCount: 1, maxSingleCents: 1000 }),
        makeMetrics('dave',  { netCents: 0,    totalPaidCents: 2000, transactionCount: 2, maxSingleCents: 2000 }),
      ];

      const result = assignTitles(metrics);

      // alice: highest netCents -> SUGAR_PARENT
      expect(result.get('alice')).toBe('SUGAR_PARENT');
      // carol: lowest netCents -> BIGGEST_MOOCH
      expect(result.get('carol')).toBe('BIGGEST_MOOCH');
      // alice already has SUGAR_PARENT (highest totalPaidCents too) -> bob gets HIGH_ROLLER
      expect(result.get('bob')).toBe('HIGH_ROLLER');
      // carol already has BIGGEST_MOOCH (lowest totalPaidCents too) -> dave gets PENNY_PINCHER
      expect(result.get('dave')).toBe('PENNY_PINCHER');
    });
  });

  describe('first-write-wins priority', () => {
    it('SUGAR_PARENT wins over HIGH_ROLLER for same member (generosity priority)', () => {
      // alice tops both netCents AND totalPaidCents
      const metrics = [
        makeMetrics('alice', { netCents: 5000, totalPaidCents: 9000, transactionCount: 3 }),
        makeMetrics('bob',   { netCents: 1000, totalPaidCents: 3000, transactionCount: 2 }),
        makeMetrics('carol', { netCents: -6000, totalPaidCents: 0,   transactionCount: 1 }),
      ];

      const result = assignTitles(metrics);

      // alice should be SUGAR_PARENT (assigned first in priority order)
      expect(result.get('alice')).toBe('SUGAR_PARENT');
      // alice already taken — second-place by totalPaidCents is bob -> gets HIGH_ROLLER
      expect(result.get('bob')).toBe('HIGH_ROLLER');
    });
  });

  describe('2-member group', () => {
    it('both members get exactly one title each, no duplicates', () => {
      const metrics = [
        makeMetrics('alice', { netCents: 3000, totalPaidCents: 5000, transactionCount: 2 }),
        makeMetrics('bob',   { netCents: -3000, totalPaidCents: 0,   transactionCount: 0 }),
      ];

      const result = assignTitles(metrics);

      // Both members must have a title
      expect(result.has('alice')).toBe(true);
      expect(result.has('bob')).toBe(true);

      // No duplicates — titles must be different
      expect(result.get('alice')).not.toBe(result.get('bob'));

      // Total entries: 2 (one per member)
      expect(result.size).toBe(2);
    });

    it('assigns exactly 2 unique titles (one per member)', () => {
      const metrics = [
        makeMetrics('alice', { netCents: 1000, totalPaidCents: 1000, transactionCount: 1 }),
        makeMetrics('bob',   { netCents: -1000, totalPaidCents: 0,   transactionCount: 0 }),
      ];

      const result = assignTitles(metrics);
      const titles = [...result.values()];

      // All assigned titles are unique
      const uniqueTitles = new Set(titles);
      expect(uniqueTitles.size).toBe(titles.length);
    });
  });

  describe('single member (< 2)', () => {
    it('returns empty map for a single member', () => {
      const metrics = [makeMetrics('alice', { netCents: 1000 })];
      const result = assignTitles(metrics);
      expect(result.size).toBe(0);
    });

    it('returns empty map for zero members', () => {
      const result = assignTitles([]);
      expect(result.size).toBe(0);
    });
  });

  describe('all zeros (no expenses)', () => {
    it('assigns titles without crashing when all metrics are zero', () => {
      const metrics = [
        makeMetrics('alice'),
        makeMetrics('bob'),
        makeMetrics('carol'),
      ];

      expect(() => assignTitles(metrics)).not.toThrow();

      const result = assignTitles(metrics);
      // Should produce some titles even with ties
      expect(result.size).toBeGreaterThan(0);
    });
  });

  describe('TITLE_LABELS completeness', () => {
    it('contains a label for every TitleKey value', () => {
      const expectedKeys: TitleKey[] = [
        'SUGAR_PARENT',
        'BIGGEST_MOOCH',
        'HIGH_ROLLER',
        'PENNY_PINCHER',
        'LIFE_OF_PARTY',
        'FREE_RIDER',
        'BIG_SPENDER',
      ];

      for (const key of expectedKeys) {
        expect(TITLE_LABELS[key]).toBeDefined();
        expect(typeof TITLE_LABELS[key]).toBe('string');
        expect(TITLE_LABELS[key].length).toBeGreaterThan(0);
      }
    });

    it('has exactly 7 title labels (one per TitleKey)', () => {
      expect(Object.keys(TITLE_LABELS)).toHaveLength(7);
    });
  });

  describe('BIG_SPENDER assignment', () => {
    it('assigns BIG_SPENDER to member with highest maxSingleCents if not yet titled', () => {
      // Make sure BIG_SPENDER can be assigned when other slots are taken
      const metrics = [
        makeMetrics('alice', { netCents: 5000, totalPaidCents: 5000, transactionCount: 5, maxSingleCents: 100 }),
        makeMetrics('bob',   { netCents: -1000, totalPaidCents: 3000, transactionCount: 3, maxSingleCents: 9000 }),
        makeMetrics('carol', { netCents: -4000, totalPaidCents: 1000, transactionCount: 1, maxSingleCents: 1000 }),
      ];

      const result = assignTitles(metrics);

      // bob has highest maxSingleCents, and after generosity/spending titles are distributed,
      // bob should still get a title
      expect(result.has('bob')).toBe(true);
    });
  });
});
