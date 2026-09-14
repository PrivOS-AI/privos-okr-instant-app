/** Domain types for the OKR Goals Book, independent of the raw PrivOS List wire shape. */

export type ObjectiveStatus = 'not_started' | 'in_progress' | 'at_risk' | 'off_track' | 'done';

export type Confidence = 'on_track' | 'at_risk' | 'off_track';

export type KeyResultKind = 'metric' | 'milestone';

export interface Objective {
  _id: string;
  title: string;
  description: string;
  owner: string;
  /** Free-form quarter label, e.g. "2026-Q3". */
  period: string;
  status: ObjectiveStatus;
  createdAt: string;
}

export interface KeyResult {
  _id: string;
  objectiveId: string;
  title: string;
  kind: KeyResultKind;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
  confidence: Confidence;
  createdAt: string;
}

export interface CheckIn {
  _id: string;
  keyResultId: string;
  note: string;
  value: number;
  confidence: Confidence;
  author: string;
  createdAt: string;
}

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  at_risk: 'At risk',
  off_track: 'Off track',
  done: 'Done',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
};

export const OBJECTIVE_STATUS_OPTIONS = Object.keys(OBJECTIVE_STATUS_LABELS) as ObjectiveStatus[];
export const CONFIDENCE_OPTIONS = Object.keys(CONFIDENCE_LABELS) as Confidence[];
