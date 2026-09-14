import { useMemo, useState } from 'react';

import { FilterBar } from './FilterBar';
import type { FilterState } from './FilterBar';
import { NewObjectiveForm } from './NewObjectiveForm';
import type { ObjectiveFormValues } from './NewObjectiveForm';
import { ProgressBar } from './ProgressBar';
import { isObjectiveAtRisk, objectiveProgress } from './progress';
import { StatusBadge } from './StatusBadge';
import type { KeyResult, Objective } from './types';

interface OverviewBoardProps {
  objectives: Objective[];
  keyResults: KeyResult[];
  canWrite: boolean;
  onSelectObjective: (id: string) => void;
  onCreateObjective: (values: ObjectiveFormValues) => Promise<void>;
}

/** Groups objectives by period, shows a progress bar and at-risk highlight per card, and exposes owner/status filters — the app's landing view. */
export function OverviewBoard({ objectives, keyResults, canWrite, onSelectObjective, onCreateObjective }: OverviewBoardProps) {
  const [filter, setFilter] = useState<FilterState>({ owner: 'all', status: 'all' });
  const [creating, setCreating] = useState(false);

  const owners = useMemo(() => Array.from(new Set(objectives.map((o) => o.owner).filter(Boolean))).sort(), [objectives]);

  const keyResultsByObjective = useMemo(() => {
    const map = new Map<string, KeyResult[]>();
    for (const kr of keyResults) {
      const list = map.get(kr.objectiveId) ?? [];
      list.push(kr);
      map.set(kr.objectiveId, list);
    }
    return map;
  }, [keyResults]);

  const filtered = objectives.filter((o) => (filter.owner === 'all' || o.owner === filter.owner) && (filter.status === 'all' || o.status === filter.status));

  const periods = useMemo(() => Array.from(new Set(filtered.map((o) => o.period))).sort().reverse(), [filtered]);

  return (
    <div className="okr-board">
      <div className="okr-board-toolbar">
        <FilterBar owners={owners} value={filter} onChange={setFilter} />
        {canWrite && (
          <button type="button" onClick={() => setCreating((v) => !v)} aria-expanded={creating}>
            {creating ? 'Close' : 'New objective'}
          </button>
        )}
      </div>

      {creating && (
        <NewObjectiveForm
          onSubmit={async (values) => {
            await onCreateObjective(values);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {filtered.length === 0 && <p className="okr-empty">No objectives match this filter yet.</p>}

      {periods.map((period) => (
        <section key={period} aria-labelledby={`okr-period-${period}`}>
          <h2 id={`okr-period-${period}`}>{period}</h2>
          <ul className="okr-objective-grid">
            {filtered
              .filter((o) => o.period === period)
              .map((objective) => {
                const krs = keyResultsByObjective.get(objective._id) ?? [];
                const atRisk = isObjectiveAtRisk(objective, krs);
                return (
                  <li key={objective._id} className={`okr-objective-card${atRisk ? ' okr-objective-card-at-risk' : ''}`}>
                    <button type="button" className="okr-objective-card-button" onClick={() => onSelectObjective(objective._id)}>
                      <div className="okr-objective-card-head">
                        <h3>{objective.title}</h3>
                        <StatusBadge status={objective.status} />
                      </div>
                      {objective.owner && <p className="okr-objective-owner">Owner: {objective.owner}</p>}
                      <ProgressBar fraction={objectiveProgress(krs)} label={`${objective.title} progress`} />
                      {atRisk && (
                        <p className="okr-at-risk-note" role="status">
                          ⚠ Needs attention
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
