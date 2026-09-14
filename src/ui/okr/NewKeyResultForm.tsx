import { useId, useState } from 'react';
import type { FormEvent } from 'react';

import type { KeyResultKind } from './types';

export interface KeyResultFormValues {
  title: string;
  kind: KeyResultKind;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
}

interface NewKeyResultFormProps {
  onSubmit: (values: KeyResultFormValues) => Promise<void>;
  onCancel: () => void;
}

/** Add a key result under an objective, either a measurable metric (start/target/current + unit) or a checkbox milestone (fixed 0..1 range). */
export function NewKeyResultForm({ onSubmit, onCancel }: NewKeyResultFormProps) {
  const formId = useId();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<KeyResultKind>('metric');
  const [unit, setUnit] = useState('');
  const [startValue, setStartValue] = useState('0');
  const [targetValue, setTargetValue] = useState('100');
  const [milestoneDone, setMilestoneDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError('Title is required.');
    const start = kind === 'milestone' ? 0 : Number(startValue);
    const target = kind === 'milestone' ? 1 : Number(targetValue);
    if (kind === 'metric' && (Number.isNaN(start) || Number.isNaN(target))) return setError('Start and target must be numbers.');
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        kind,
        unit: kind === 'milestone' ? '' : unit.trim(),
        startValue: start,
        targetValue: target,
        currentValue: kind === 'milestone' ? (milestoneDone ? 1 : 0) : start,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this key result.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="okr-form" onSubmit={handleSubmit} aria-label="New key result">
      <div className="okr-field">
        <label htmlFor={`${formId}-title`}>Title</label>
        <input id={`${formId}-title`} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </div>
      <fieldset className="okr-field">
        <legend>Kind</legend>
        <label className="okr-radio">
          <input type="radio" name={`${formId}-kind`} checked={kind === 'metric'} onChange={() => setKind('metric')} />
          Metric (numeric)
        </label>
        <label className="okr-radio">
          <input type="radio" name={`${formId}-kind`} checked={kind === 'milestone'} onChange={() => setKind('milestone')} />
          Milestone (checkbox)
        </label>
      </fieldset>
      {kind === 'metric' ? (
        <div className="okr-field-row">
          <div className="okr-field">
            <label htmlFor={`${formId}-start`}>Start value</label>
            <input id={`${formId}-start`} type="number" value={startValue} onChange={(e) => setStartValue(e.target.value)} />
          </div>
          <div className="okr-field">
            <label htmlFor={`${formId}-target`}>Target value</label>
            <input id={`${formId}-target`} type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </div>
          <div className="okr-field">
            <label htmlFor={`${formId}-unit`}>Unit</label>
            <input id={`${formId}-unit`} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, users, $…" maxLength={20} />
          </div>
        </div>
      ) : (
        <label className="okr-checkbox">
          <input type="checkbox" checked={milestoneDone} onChange={(e) => setMilestoneDone(e.target.checked)} />
          Already done
        </label>
      )}
      {error && (
        <p className="okr-error" role="alert">
          {error}
        </p>
      )}
      <div className="okr-form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add key result'}
        </button>
        <button type="button" className="okr-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
