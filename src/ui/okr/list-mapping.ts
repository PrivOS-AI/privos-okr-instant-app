/**
 * Maps between the raw PrivOS List item wire shape (`{ _id, name,
 * description, customFields, createdAt }`) and this app's typed domain
 * records (`Objective`, `KeyResult`, `CheckIn`).
 */
import type { CheckIn, Confidence, KeyResult, KeyResultKind, Objective, ObjectiveStatus } from './types';

/** A single custom field entry as returned by `privos.lists.queryItems`. */
export interface RawCustomField {
  fieldId: string;
  value: unknown;
}

/** A single list item as returned by `privos.lists.queryItems`. */
export interface RawListItem {
  _id: string;
  name?: string;
  description?: string;
  customFields?: RawCustomField[];
  createdAt?: string;
}

function fieldMap(item: RawListItem): Map<string, unknown> {
  return new Map((item.customFields ?? []).map((field) => [field.fieldId, field.value]));
}

function stringField(fields: Map<string, unknown>, key: string, fallback = ''): string {
  const value = fields.get(key);
  return typeof value === 'string' ? value : fallback;
}

function numberField(fields: Map<string, unknown>, key: string, fallback = 0): number {
  const value = fields.get(key);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function enumField<T extends string>(fields: Map<string, unknown>, key: string, allowed: readonly T[], fallback: T): T {
  const value = fields.get(key);
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const OBJECTIVE_STATUSES: ObjectiveStatus[] = ['not_started', 'in_progress', 'at_risk', 'off_track', 'done'];
const CONFIDENCES: Confidence[] = ['on_track', 'at_risk', 'off_track'];
const KEY_RESULT_KINDS: KeyResultKind[] = ['metric', 'milestone'];

export function toObjective(item: RawListItem): Objective {
  const fields = fieldMap(item);
  return {
    _id: item._id,
    title: item.name ?? '',
    description: item.description ?? '',
    owner: stringField(fields, 'owner'),
    period: stringField(fields, 'period'),
    status: enumField(fields, 'status', OBJECTIVE_STATUSES, 'not_started'),
    createdAt: item.createdAt ?? '',
  };
}

export function toKeyResult(item: RawListItem): KeyResult {
  const fields = fieldMap(item);
  return {
    _id: item._id,
    objectiveId: stringField(fields, 'objectiveId'),
    title: item.name ?? '',
    kind: enumField(fields, 'kind', KEY_RESULT_KINDS, 'metric'),
    unit: stringField(fields, 'unit'),
    startValue: numberField(fields, 'startValue', 0),
    targetValue: numberField(fields, 'targetValue', 1),
    currentValue: numberField(fields, 'currentValue', 0),
    confidence: enumField(fields, 'confidence', CONFIDENCES, 'on_track'),
    createdAt: item.createdAt ?? '',
  };
}

export function toCheckIn(item: RawListItem): CheckIn {
  const fields = fieldMap(item);
  return {
    _id: item._id,
    keyResultId: stringField(fields, 'keyResultId'),
    note: item.description ?? '',
    value: numberField(fields, 'value', 0),
    confidence: enumField(fields, 'confidence', CONFIDENCES, 'on_track'),
    author: stringField(fields, 'author'),
    createdAt: item.createdAt ?? '',
  };
}

/**
 * A key result's current value and confidence come from its latest check-in.
 * Check-ins are the history of record, so recording one is a single list write
 * and there is no second write to the key result that could fail halfway.
 * Key results with no check-in keep the values they were created with.
 */
export function applyLatestCheckIns(keyResults: readonly KeyResult[], checkIns: readonly CheckIn[]): KeyResult[] {
  const latest = new Map<string, CheckIn>();
  for (const checkIn of checkIns) {
    const previous = latest.get(checkIn.keyResultId);
    if (!previous || checkIn.createdAt >= previous.createdAt) latest.set(checkIn.keyResultId, checkIn);
  }
  return keyResults.map((keyResult) => {
    const checkIn = latest.get(keyResult._id);
    return checkIn ? { ...keyResult, currentValue: checkIn.value, confidence: checkIn.confidence } : keyResult;
  });
}

/** `customFields` array for `privos.lists.createItem` / `updateItem`. */
export function objectiveCustomFields(input: { owner: string; period: string; status: ObjectiveStatus }): RawCustomField[] {
  return [
    { fieldId: 'owner', value: input.owner },
    { fieldId: 'period', value: input.period },
    { fieldId: 'status', value: input.status },
  ];
}

export function keyResultCustomFields(input: {
  objectiveId: string;
  kind: KeyResultKind;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  confidence: Confidence;
}): RawCustomField[] {
  return [
    { fieldId: 'objectiveId', value: input.objectiveId },
    { fieldId: 'kind', value: input.kind },
    { fieldId: 'unit', value: input.unit },
    { fieldId: 'startValue', value: input.startValue },
    { fieldId: 'targetValue', value: input.targetValue },
    { fieldId: 'currentValue', value: input.currentValue },
    { fieldId: 'confidence', value: input.confidence },
  ];
}

export function checkInCustomFields(input: { keyResultId: string; value: number; confidence: Confidence; author: string }): RawCustomField[] {
  return [
    { fieldId: 'keyResultId', value: input.keyResultId },
    { fieldId: 'value', value: input.value },
    { fieldId: 'confidence', value: input.confidence },
    { fieldId: 'author', value: input.author },
  ];
}
