import type { Confidence, ObjectiveStatus } from './types';
import { CONFIDENCE_LABELS, OBJECTIVE_STATUS_LABELS } from './types';

const STATUS_TONE: Record<ObjectiveStatus, string> = {
  not_started: 'neutral',
  in_progress: 'info',
  at_risk: 'warning',
  off_track: 'danger',
  done: 'success',
};

const CONFIDENCE_TONE: Record<Confidence, string> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'danger',
};

export function StatusBadge({ status }: { status: ObjectiveStatus }) {
  return <span className={`okr-badge okr-badge-${STATUS_TONE[status]}`}>{OBJECTIVE_STATUS_LABELS[status]}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={`okr-badge okr-badge-${CONFIDENCE_TONE[confidence]}`}>{CONFIDENCE_LABELS[confidence]}</span>;
}
