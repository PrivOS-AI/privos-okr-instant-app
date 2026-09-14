import { describe, expect, it } from 'vitest';

import { isObjectiveAtRisk, keyResultProgress, objectiveProgress, toPercent, worstConfidence } from '../src/ui/okr/progress';

describe('keyResultProgress', () => {
  it('computes the fraction between start and target', () => {
    expect(keyResultProgress({ startValue: 0, targetValue: 100, currentValue: 25 })).toBeCloseTo(0.25);
  });

  it('clamps below start to 0', () => {
    expect(keyResultProgress({ startValue: 10, targetValue: 20, currentValue: 5 })).toBe(0);
  });

  it('clamps above target to 1', () => {
    expect(keyResultProgress({ startValue: 0, targetValue: 10, currentValue: 999 })).toBe(1);
  });

  it('treats a milestone (0..1) as done or not done', () => {
    expect(keyResultProgress({ startValue: 0, targetValue: 1, currentValue: 0 })).toBe(0);
    expect(keyResultProgress({ startValue: 0, targetValue: 1, currentValue: 1 })).toBe(1);
  });

  it('does not divide by zero when start equals target', () => {
    expect(keyResultProgress({ startValue: 5, targetValue: 5, currentValue: 5 })).toBe(1);
    expect(keyResultProgress({ startValue: 5, targetValue: 5, currentValue: 3 })).toBe(0);
  });
});

describe('toPercent', () => {
  it('rounds to the nearest integer percent', () => {
    expect(toPercent(0.333)).toBe(33);
    expect(toPercent(0.995)).toBe(100);
    expect(toPercent(-1)).toBe(0);
    expect(toPercent(2)).toBe(100);
  });
});

describe('objectiveProgress', () => {
  it('averages progress across key results', () => {
    const krs = [
      { startValue: 0, targetValue: 100, currentValue: 100 },
      { startValue: 0, targetValue: 100, currentValue: 0 },
    ];
    expect(objectiveProgress(krs)).toBeCloseTo(0.5);
  });

  it('is 0 for an objective with no key results yet', () => {
    expect(objectiveProgress([])).toBe(0);
  });
});

describe('worstConfidence', () => {
  it('returns undefined with no key results', () => {
    expect(worstConfidence([])).toBeUndefined();
  });

  it('picks the most severe confidence', () => {
    expect(worstConfidence([{ confidence: 'on_track' }, { confidence: 'at_risk' }])).toBe('at_risk');
    expect(worstConfidence([{ confidence: 'at_risk' }, { confidence: 'off_track' }, { confidence: 'on_track' }])).toBe('off_track');
    expect(worstConfidence([{ confidence: 'on_track' }])).toBe('on_track');
  });
});

describe('isObjectiveAtRisk', () => {
  it('flags an objective whose own status is at_risk or off_track', () => {
    expect(isObjectiveAtRisk({ status: 'at_risk' }, [])).toBe(true);
    expect(isObjectiveAtRisk({ status: 'off_track' }, [])).toBe(true);
    expect(isObjectiveAtRisk({ status: 'in_progress' }, [])).toBe(false);
  });

  it('flags an objective whose key results are at risk even if its own status is not', () => {
    expect(isObjectiveAtRisk({ status: 'in_progress' }, [{ confidence: 'off_track' }])).toBe(true);
    expect(isObjectiveAtRisk({ status: 'in_progress' }, [{ confidence: 'on_track' }])).toBe(false);
  });
});
