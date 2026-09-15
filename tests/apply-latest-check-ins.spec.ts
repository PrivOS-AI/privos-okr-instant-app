import { describe, expect, it } from 'vitest';

import { applyLatestCheckIns } from '../src/ui/okr/list-mapping';
import type { CheckIn, KeyResult } from '../src/ui/okr/types';

const keyResult = (id: string, currentValue: number): KeyResult => ({
  _id: id,
  objectiveId: 'obj_1',
  title: id,
  kind: 'metric',
  unit: '',
  startValue: 0,
  targetValue: 10,
  currentValue,
  confidence: 'on_track',
  createdAt: '2026-07-01T00:00:00.000Z',
});

const checkIn = (keyResultId: string, value: number, createdAt: string, confidence: CheckIn['confidence'] = 'on_track'): CheckIn => ({
  _id: `${keyResultId}-${createdAt}`,
  keyResultId,
  note: '',
  value,
  confidence,
  author: 'Alice',
  createdAt,
});

describe('applyLatestCheckIns', () => {
  it('takes the current value and confidence from the newest check-in, whatever the load order', () => {
    const [result] = applyLatestCheckIns(
      [keyResult('kr_1', 1)],
      [
        checkIn('kr_1', 7, '2026-07-03T00:00:00.000Z', 'at_risk'),
        checkIn('kr_1', 4, '2026-07-02T00:00:00.000Z'),
      ],
    );
    expect(result!.currentValue).toBe(7);
    expect(result!.confidence).toBe('at_risk');
  });

  it('keeps the created values of a key result that has no check-in yet', () => {
    const [result] = applyLatestCheckIns([keyResult('kr_2', 3)], [checkIn('kr_1', 9, '2026-07-02T00:00:00.000Z')]);
    expect(result!.currentValue).toBe(3);
    expect(result!.confidence).toBe('on_track');
  });
});
