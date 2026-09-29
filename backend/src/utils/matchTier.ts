/**
 * Single source of truth for match-quality thresholds, so tier logic is
 * never duplicated/hardcoded across controllers.
 */
export const MATCH_THRESHOLDS = {
  strong: 85,
  good: 80,
  moderate: 70,
};

export type MatchTier = 'Strong Match' | 'Good Match' | 'Moderate Match' | 'Needs Improvement';

export function getMatchTier(overallMatch: number): MatchTier {
  if (overallMatch >= MATCH_THRESHOLDS.strong) return 'Strong Match';
  if (overallMatch >= MATCH_THRESHOLDS.good) return 'Good Match';
  if (overallMatch >= MATCH_THRESHOLDS.moderate) return 'Moderate Match';
  return 'Needs Improvement';
}
