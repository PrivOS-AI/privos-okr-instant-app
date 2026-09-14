import { describe, expect, it } from 'vitest';

import {
  checkInCustomFields,
  keyResultCustomFields,
  objectiveCustomFields,
  toCheckIn,
  toKeyResult,
  toObjective,
} from '../src/ui/okr/list-mapping';

describe('toObjective', () => {
  it('maps a raw list item into a typed Objective', () => {
    const objective = toObjective({
      _id: 'obj_1',
      name: 'Grow revenue',
      description: 'Company-wide growth objective',
      customFields: [
        { fieldId: 'owner', value: 'Alice' },
        { fieldId: 'period', value: '2026-Q3' },
        { fieldId: 'status', value: 'in_progress' },
      ],
      createdAt: '2026-07-01T00:00:00.000Z',
    });
    expect(objective).toEqual({
      _id: 'obj_1',
      title: 'Grow revenue',
      description: 'Company-wide growth objective',
      owner: 'Alice',
      period: '2026-Q3',
      status: 'in_progress',
      createdAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('falls back safely when fields or an enum value are missing/invalid', () => {
    const objective = toObjective({ _id: 'obj_2', customFields: [{ fieldId: 'status', value: 'not-a-real-status' }] });
    expect(objective.title).toBe('');
    expect(objective.owner).toBe('');
    expect(objective.status).toBe('not_started');
  });
});

describe('toKeyResult', () => {
  it('maps numeric and enum custom fields, coercing numeric strings', () => {
    const kr = toKeyResult({
      _id: 'kr_1',
      name: 'Sign 50 customers',
      customFields: [
        { fieldId: 'objectiveId', value: 'obj_1' },
        { fieldId: 'kind', value: 'metric' },
        { fieldId: 'unit', value: 'customers' },
        { fieldId: 'startValue', value: '0' },
        { fieldId: 'targetValue', value: 50 },
        { fieldId: 'currentValue', value: 12 },
        { fieldId: 'confidence', value: 'at_risk' },
      ],
    });
    expect(kr).toMatchObject({
      _id: 'kr_1',
      objectiveId: 'obj_1',
      title: 'Sign 50 customers',
      kind: 'metric',
      unit: 'customers',
      startValue: 0,
      targetValue: 50,
      currentValue: 12,
      confidence: 'at_risk',
    });
  });

  it('defaults an unparsable number field to the fallback instead of NaN', () => {
    const kr = toKeyResult({ _id: 'kr_2', customFields: [{ fieldId: 'targetValue', value: 'not-a-number' }] });
    expect(kr.targetValue).toBe(1);
    expect(Number.isNaN(kr.startValue)).toBe(false);
  });
});

describe('toCheckIn', () => {
  it('reads the note from item.description, not a custom field', () => {
    const checkIn = toCheckIn({
      _id: 'chk_1',
      description: 'Great progress this week',
      customFields: [
        { fieldId: 'keyResultId', value: 'kr_1' },
        { fieldId: 'value', value: 30 },
        { fieldId: 'confidence', value: 'on_track' },
        { fieldId: 'author', value: 'bob' },
      ],
    });
    expect(checkIn).toEqual({
      _id: 'chk_1',
      keyResultId: 'kr_1',
      note: 'Great progress this week',
      value: 30,
      confidence: 'on_track',
      author: 'bob',
      createdAt: '',
    });
  });
});

describe('custom field builders', () => {
  it('objectiveCustomFields emits one entry per field', () => {
    expect(objectiveCustomFields({ owner: 'Alice', period: '2026-Q3', status: 'done' })).toEqual([
      { fieldId: 'owner', value: 'Alice' },
      { fieldId: 'period', value: '2026-Q3' },
      { fieldId: 'status', value: 'done' },
    ]);
  });

  it('keyResultCustomFields and checkInCustomFields round-trip through toKeyResult/toCheckIn', () => {
    const krFields = keyResultCustomFields({
      objectiveId: 'obj_1',
      kind: 'milestone',
      unit: '',
      startValue: 0,
      targetValue: 1,
      currentValue: 1,
      confidence: 'off_track',
    });
    const kr = toKeyResult({ _id: 'kr_9', name: 'Ship v2', customFields: krFields });
    expect(kr.kind).toBe('milestone');
    expect(kr.currentValue).toBe(1);
    expect(kr.confidence).toBe('off_track');

    const checkInFields = checkInCustomFields({ keyResultId: 'kr_9', value: 1, confidence: 'on_track', author: 'carol' });
    const checkIn = toCheckIn({ _id: 'chk_9', customFields: checkInFields });
    expect(checkIn).toMatchObject({ keyResultId: 'kr_9', value: 1, confidence: 'on_track', author: 'carol' });
  });
});
