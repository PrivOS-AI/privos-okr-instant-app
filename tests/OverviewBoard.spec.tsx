import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverviewBoard } from '../src/ui/okr/OverviewBoard';
import type { KeyResult, Objective } from '../src/ui/okr/types';

function objective(overrides: Partial<Objective>): Objective {
  return {
    _id: 'obj_1',
    title: 'Grow revenue',
    description: '',
    owner: 'Alice',
    period: '2026-Q3',
    status: 'in_progress',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function keyResult(overrides: Partial<KeyResult>): KeyResult {
  return {
    _id: 'kr_1',
    objectiveId: 'obj_1',
    title: 'Sign 50 customers',
    kind: 'metric',
    unit: 'customers',
    startValue: 0,
    targetValue: 50,
    currentValue: 25,
    confidence: 'on_track',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('OverviewBoard', () => {
  it('groups objectives by period and highlights an at-risk one', () => {
    const objectives = [objective({ _id: 'obj_1', period: '2026-Q3' }), objective({ _id: 'obj_2', title: 'Cut churn', period: '2026-Q2', owner: 'Bob' })];
    const keyResults = [keyResult({ _id: 'kr_1', objectiveId: 'obj_1', confidence: 'off_track' })];

    render(<OverviewBoard objectives={objectives} keyResults={keyResults} canWrite={true} onSelectObjective={vi.fn()} onCreateObjective={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '2026-Q3' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '2026-Q2' })).toBeTruthy();
    expect(screen.getByText('Needs attention', { exact: false })).toBeTruthy();
  });

  it('filters by owner', () => {
    const objectives = [objective({ _id: 'obj_1', owner: 'Alice' }), objective({ _id: 'obj_2', title: 'Cut churn', owner: 'Bob' })];

    render(<OverviewBoard objectives={objectives} keyResults={[]} canWrite={true} onSelectObjective={vi.fn()} onCreateObjective={vi.fn()} />);

    expect(screen.getByText('Grow revenue')).toBeTruthy();
    expect(screen.getByText('Cut churn')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'Bob' } });

    expect(screen.queryByText('Grow revenue')).toBeNull();
    expect(screen.getByText('Cut churn')).toBeTruthy();
  });

  it('hides the "New objective" action when lists:write is unavailable', () => {
    render(<OverviewBoard objectives={[]} keyResults={[]} canWrite={false} onSelectObjective={vi.fn()} onCreateObjective={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'New objective' })).toBeNull();
  });

  it('calls onSelectObjective when a card is activated', () => {
    const onSelect = vi.fn();
    render(<OverviewBoard objectives={[objective({})]} keyResults={[]} canWrite={true} onSelectObjective={onSelect} onCreateObjective={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Grow revenue/ }));
    expect(onSelect).toHaveBeenCalledWith('obj_1');
  });
});
