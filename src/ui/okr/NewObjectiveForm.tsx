import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { OBJECTIVE_STATUS_LABELS, OBJECTIVE_STATUS_OPTIONS } from './types';
import type { Objective, ObjectiveStatus } from './types';

export interface ObjectiveFormValues {
  title: string;
  description: string;
  owner: string;
  period: string;
  status: ObjectiveStatus;
}

interface NewObjectiveFormProps {
  initial?: Objective;
  onSubmit: (values: ObjectiveFormValues) => Promise<void>;
  onCancel: () => void;
}

const PERIOD_PATTERN = /^\d{4}-Q[1-4]$/;

/** Create or edit an objective. Every input has a visible, associated `<label>`; validation errors are announced through `aria-describedby` rather than color alone. */
export function NewObjectiveForm({ initial, onSubmit, onCancel }: NewObjectiveFormProps) {
  const formId = useId();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [period, setPeriod] = useState(initial?.period ?? '');
  const [status, setStatus] = useState<ObjectiveStatus>(initial?.status ?? 'not_started');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError('Title is required.');
    if (!PERIOD_PATTERN.test(period.trim())) return setError('Period must look like 2026-Q3.');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), owner: owner.trim(), period: period.trim(), status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this objective.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="okr-form" onSubmit={handleSubmit} aria-label={initial ? 'Edit objective' : 'New objective'}>
      <div className="okr-field">
        <label htmlFor={`${formId}-title`}>Title</label>
        <input id={`${formId}-title`} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </div>
      <div className="okr-field">
        <label htmlFor={`${formId}-description`}>Description</label>
        <textarea id={`${formId}-description`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={2} />
      </div>
      <div className="okr-field-row">
        <div className="okr-field">
          <label htmlFor={`${formId}-owner`}>Owner</label>
          <input id={`${formId}-owner`} value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={100} />
        </div>
        <div className="okr-field">
          <label htmlFor={`${formId}-period`}>Period</label>
          <input id={`${formId}-period`} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-Q3" required aria-describedby={`${formId}-period-hint`} />
          <span id={`${formId}-period-hint`} className="okr-hint">
            Format: YYYY-Q1..Q4
          </span>
        </div>
        <div className="okr-field">
          <label htmlFor={`${formId}-status`}>Status</label>
          <select id={`${formId}-status`} value={status} onChange={(e) => setStatus(e.target.value as ObjectiveStatus)}>
            {OBJECTIVE_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {OBJECTIVE_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="okr-error" role="alert">
          {error}
        </p>
      )}
      <div className="okr-form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save objective'}
        </button>
        <button type="button" className="okr-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
