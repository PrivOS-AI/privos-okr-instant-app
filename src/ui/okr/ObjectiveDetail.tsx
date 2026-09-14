import { useState } from 'react';

import { CheckInForm } from './CheckInForm';
import type { CheckInFormValues } from './CheckInForm';
import { NewKeyResultForm } from './NewKeyResultForm';
import type { KeyResultFormValues } from './NewKeyResultForm';
import { NewObjectiveForm } from './NewObjectiveForm';
import type { ObjectiveFormValues } from './NewObjectiveForm';
import { ProgressBar } from './ProgressBar';
import { keyResultProgress } from './progress';
import { ConfidenceBadge, StatusBadge } from './StatusBadge';
import type { CheckIn, KeyResult, Objective } from './types';

interface ObjectiveDetailProps {
  objective: Objective;
  keyResults: KeyResult[];
  checkIns: CheckIn[];
  canWrite: boolean;
  onBack: () => void;
  onUpdateObjective: (values: ObjectiveFormValues) => Promise<void>;
  onCreateKeyResult: (values: KeyResultFormValues) => Promise<void>;
  onRecordCheckIn: (keyResultId: string, values: CheckInFormValues) => Promise<void>;
}

export function ObjectiveDetail({
  objective,
  keyResults,
  checkIns,
  canWrite,
  onBack,
  onUpdateObjective,
  onCreateKeyResult,
  onRecordCheckIn,
}: ObjectiveDetailProps) {
  const [editing, setEditing] = useState(false);
  const [addingKeyResult, setAddingKeyResult] = useState(false);
  const [checkingInFor, setCheckingInFor] = useState<string | null>(null);
  const [expandedHistoryFor, setExpandedHistoryFor] = useState<string | null>(null);

  return (
    <div className="okr-detail">
      <button type="button" className="okr-back" onClick={onBack}>
        ← Back to board
      </button>

      {editing ? (
        <NewObjectiveForm
          initial={objective}
          onSubmit={async (values) => {
            await onUpdateObjective(values);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <header className="okr-detail-header">
          <h2>{objective.title}</h2>
          <p className="okr-detail-meta">
            {objective.owner ? <span>Owner: {objective.owner}</span> : null}
            <span>Period: {objective.period}</span>
            <StatusBadge status={objective.status} />
          </p>
          {objective.description && <p>{objective.description}</p>}
          {canWrite && (
            <button type="button" className="okr-secondary" onClick={() => setEditing(true)}>
              Edit objective
            </button>
          )}
        </header>
      )}

      <section aria-labelledby="okr-kr-heading">
        <h3 id="okr-kr-heading">Key results</h3>
        {keyResults.length === 0 && <p className="okr-empty">No key results yet.</p>}
        <ul className="okr-kr-list">
          {keyResults.map((kr) => {
            const history = checkIns.filter((c) => c.keyResultId === kr._id).slice().reverse();
            return (
              <li key={kr._id} className="okr-kr-item">
                <div className="okr-kr-row">
                  <div className="okr-kr-title">
                    <strong>{kr.title}</strong>
                    <ConfidenceBadge confidence={kr.confidence} />
                  </div>
                  <ProgressBar fraction={keyResultProgress(kr)} label={`${kr.title} progress`} />
                  <p className="okr-kr-values">
                    {kr.kind === 'milestone'
                      ? kr.currentValue >= kr.targetValue
                        ? 'Done'
                        : 'Not done'
                      : `${kr.currentValue}${kr.unit ? ` ${kr.unit}` : ''} of ${kr.targetValue}${kr.unit ? ` ${kr.unit}` : ''}`}
                  </p>
                  <div className="okr-kr-actions">
                    {canWrite && (
                      <button type="button" onClick={() => setCheckingInFor(checkingInFor === kr._id ? null : kr._id)}>
                        Check in
                      </button>
                    )}
                    {history.length > 0 && (
                      <button
                        type="button"
                        className="okr-secondary"
                        onClick={() => setExpandedHistoryFor(expandedHistoryFor === kr._id ? null : kr._id)}
                        aria-expanded={expandedHistoryFor === kr._id}
                      >
                        History ({history.length})
                      </button>
                    )}
                  </div>
                </div>
                {checkingInFor === kr._id && (
                  <CheckInForm
                    keyResult={kr}
                    onSubmit={async (values) => {
                      await onRecordCheckIn(kr._id, values);
                      setCheckingInFor(null);
                    }}
                    onCancel={() => setCheckingInFor(null)}
                  />
                )}
                {expandedHistoryFor === kr._id && (
                  <ol className="okr-history">
                    {history.map((entry) => (
                      <li key={entry._id}>
                        <ConfidenceBadge confidence={entry.confidence} />
                        <span>{entry.value}</span>
                        {entry.note && <span className="okr-history-note">{entry.note}</span>}
                        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>

        {canWrite &&
          (addingKeyResult ? (
            <NewKeyResultForm
              onSubmit={async (values) => {
                await onCreateKeyResult(values);
                setAddingKeyResult(false);
              }}
              onCancel={() => setAddingKeyResult(false)}
            />
          ) : (
            <button type="button" onClick={() => setAddingKeyResult(true)}>
              Add key result
            </button>
          ))}
      </section>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}
