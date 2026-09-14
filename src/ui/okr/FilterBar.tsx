import { OBJECTIVE_STATUS_LABELS, OBJECTIVE_STATUS_OPTIONS } from './types';
import type { ObjectiveStatus } from './types';

export interface FilterState {
  owner: string;
  status: ObjectiveStatus | 'all';
}

interface FilterBarProps {
  owners: string[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/** Owner + status filter controls for the overview board. Native `<select>`s: full keyboard support and a visible label for every control, no custom widget to re-implement accessibility for. */
export function FilterBar({ owners, value, onChange }: FilterBarProps) {
  return (
    <div className="okr-filter-bar" role="group" aria-label="Filter objectives">
      <div className="okr-field">
        <label htmlFor="okr-filter-owner">Owner</label>
        <select id="okr-filter-owner" value={value.owner} onChange={(e) => onChange({ ...value, owner: e.target.value })}>
          <option value="all">All owners</option>
          {owners.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </div>
      <div className="okr-field">
        <label htmlFor="okr-filter-status">Status</label>
        <select
          id="okr-filter-status"
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as FilterState['status'] })}
        >
          <option value="all">All statuses</option>
          {OBJECTIVE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {OBJECTIVE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
