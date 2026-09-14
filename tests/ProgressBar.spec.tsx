import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from '../src/ui/okr/ProgressBar';

describe('ProgressBar', () => {
  it('exposes progressbar semantics and a visible percent label', () => {
    render(<ProgressBar fraction={0.42} label="Revenue objective progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Revenue objective progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('clamps an out-of-range fraction for display', () => {
    render(<ProgressBar fraction={1.5} label="Overshot" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});
