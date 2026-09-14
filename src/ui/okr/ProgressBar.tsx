import { toPercent } from './progress';

interface ProgressBarProps {
  /** 0..1 */
  fraction: number;
  label: string;
}

/** An accessible progress bar: native `role="progressbar"` semantics plus a visible percent label — the color is never the only signal. */
export function ProgressBar({ fraction, label }: ProgressBarProps) {
  const percent = toPercent(fraction);
  return (
    <div className="okr-progress" aria-label={label} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="okr-progress-track">
        <div className="okr-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="okr-progress-label">{percent}%</span>
    </div>
  );
}
