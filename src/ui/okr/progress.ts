import type { Confidence, KeyResult, Objective } from './types';

/** Clamp `n` into `[0, 1]`. */
function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * A key result's progress as a 0..1 fraction. Uniform formula for both kinds:
 * a milestone is simply a metric with start 0 / target 1 / current 0 or 1.
 * When start and target are equal (a malformed or not-yet-configured key
 * result), progress is 1 if the current value already meets the target and 0
 * otherwise — division by zero never produces NaN/Infinity here.
 */
export function keyResultProgress(kr: Pick<KeyResult, 'startValue' | 'targetValue' | 'currentValue'>): number {
  const { startValue, targetValue, currentValue } = kr;
  if (targetValue === startValue) {
    return currentValue >= targetValue ? 1 : 0;
  }
  return clamp01((currentValue - startValue) / (targetValue - startValue));
}

/** Percent (0..100), rounded to the nearest integer, for display. */
export function toPercent(fraction: number): number {
  return Math.round(clamp01(fraction) * 100);
}

/**
 * An objective's progress is the average of its key results' progress.
 * An objective with no key results yet has 0 progress — nothing has been
 * measured, which is different from "fully done".
 */
export function objectiveProgress(keyResults: readonly Pick<KeyResult, 'startValue' | 'targetValue' | 'currentValue'>[]): number {
  if (keyResults.length === 0) return 0;
  const sum = keyResults.reduce((total, kr) => total + keyResultProgress(kr), 0);
  return sum / keyResults.length;
}

const CONFIDENCE_SEVERITY: Record<Confidence, number> = {
  on_track: 0,
  at_risk: 1,
  off_track: 2,
};

/**
 * The worst (most severe) confidence among an objective's key results —
 * used to visually flag an objective as at-risk even when its own `status`
 * field has not been updated to match. `undefined` when there are no key
 * results to derive a confidence from.
 */
export function worstConfidence(keyResults: readonly Pick<KeyResult, 'confidence'>[]): Confidence | undefined {
  if (keyResults.length === 0) return undefined;
  return keyResults.reduce<Confidence>((worst, kr) => (CONFIDENCE_SEVERITY[kr.confidence] > CONFIDENCE_SEVERITY[worst] ? kr.confidence : worst), 'on_track');
}

/**
 * True when an objective deserves the at-risk highlight on the board: any of
 * its key results is at risk or off track, or its own `status` field was
 * manually set to `at_risk` / `off_track`.
 */
export function isObjectiveAtRisk(objective: Pick<Objective, 'status'>, keyResults: readonly Pick<KeyResult, 'confidence'>[]): boolean {
  if (objective.status === 'at_risk' || objective.status === 'off_track') return true;
  const worst = worstConfidence(keyResults);
  return worst === 'at_risk' || worst === 'off_track';
}
