import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import { CONFIDENCE_LABELS, CONFIDENCE_OPTIONS } from './types';
import type { Confidence, KeyResult } from './types';

export interface CheckInFormValues {
  note: string;
  value: number;
  confidence: Confidence;
}

interface CheckInFormProps {
  keyResult: KeyResult;
  onSubmit: (values: CheckInFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Records a check-in: a note, an updated current value (or done/not-done for a milestone), and a confidence level. */
export function CheckInForm({ keyResult, onSubmit, onCancel }: CheckInFormProps) {
  const formId = useId();
  const [note, setNote] = useState('');
  const [value, setValue] = useState(String(keyResult.currentValue));
  const [milestoneDone, setMilestoneDone] = useState(keyResult.currentValue >= keyResult.targetValue);
  const [confidence, setConfidence] = useState<Confidence>(keyResult.confidence);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const numericValue = keyResult.kind === 'milestone' ? (milestoneDone ? 1 : 0) : Number(value);
    if (Number.isNaN(numericValue)) return setError('Value must be a number.');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ note: note.trim(), value: numericValue, confidence });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this check-in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="okr-form" onSubmit={handleSubmit} aria-label={`Check in on ${keyResult.title}`}>
      {keyResult.kind === 'milestone' ? (
        <label className="okr-checkbox">
          <input type="checkbox" checked={milestoneDone} onChange={(e) => setMilestoneDone(e.target.checked)} />
          Done
        </label>
      ) : (
        <div className="okr-field">
          <label htmlFor={`${formId}-value`}>
            New current value{keyResult.unit ? ` (${keyResult.unit})` : ''}
          </label>
          <input id={`${formId}-value`} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      )}
      <div className="okr-field">
        <label htmlFor={`${formId}-confidence`}>Confidence</label>
        <select id={`${formId}-confidence`} value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)}>
          {CONFIDENCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CONFIDENCE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      <div className="okr-field">
        <label htmlFor={`${formId}-note`}>Note</label>
        <textarea id={`${formId}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} />
      </div>
      {error && (
        <p className="okr-error" role="alert">
          {error}
        </p>
      )}
      <div className="okr-form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save check-in'}
        </button>
        <button type="button" className="okr-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
