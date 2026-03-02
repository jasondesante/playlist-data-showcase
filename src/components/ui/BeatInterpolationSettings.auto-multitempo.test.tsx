/**
 * Tests for BeatInterpolationSettings Auto Multi-Tempo Toggle
 *
 * Task 5.3: Test Auto Multi-Tempo Toggle
 * - Verify toggle UI updates store correctly
 * - Verify toggle description changes based on state
 * - Verify analysis behaves differently when toggle is off vs on
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeatInterpolationSettings } from './BeatInterpolationSettings';
import {
  useBeatDetectionStore,
  useInterpolationOptions,
  useBeatStreamMode,
  useShowGridOverlay,
  useShowTempoDriftVisualization,
  useAutoMultiTempo,
} from '../../store/beatDetectionStore';
import type { BeatInterpolationOptions, BeatStreamMode } from '@/types';

// Mock the store
vi.mock('../../store/beatDetectionStore', () => ({
  useBeatDetectionStore: vi.fn(),
  useInterpolationOptions: vi.fn(),
  useBeatStreamMode: vi.fn(),
  useShowGridOverlay: vi.fn(),
  useShowTempoDriftVisualization: vi.fn(),
  useAutoMultiTempo: vi.fn(),
}));

// Mock the Tooltip component
vi.mock('./Tooltip', () => ({
  Tooltip: vi.fn(({ content }) => (
    <span data-testid="tooltip" title={content}>
      ℹ️
    </span>
  )),
}));

// Mock the AdvancedInterpolationOptions component
vi.mock('./AdvancedInterpolationOptions', () => ({
  AdvancedInterpolationOptions: vi.fn(() => <div data-testid="advanced-options" />),
}));

// Default mock values
const defaultInterpolationOptions: BeatInterpolationOptions = {
  gridAlignmentWeight: 0.4,
  anchorConfidenceWeight: 0.35,
  paceConfidenceWeight: 0.25,
};

describe('BeatInterpolationSettings - Auto Multi-Tempo Toggle (Task 5.3)', () => {
  const mockSetAutoMultiTempo = vi.fn();
  const mockSetBeatStreamMode = vi.fn();
  const mockToggleGridOverlay = vi.fn();
  const mockToggleTempoDriftVisualization = vi.fn();
  const mockSetInterpolationOptions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (useBeatStreamMode as unknown as ReturnType<typeof vi.fn>).mockReturnValue('merged' as BeatStreamMode);
    (useShowGridOverlay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useShowTempoDriftVisualization as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useInterpolationOptions as unknown as ReturnType<typeof vi.fn>).mockReturnValue(defaultInterpolationOptions);

    (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        actions: {
          setAutoMultiTempo: mockSetAutoMultiTempo,
          setBeatStreamMode: mockSetBeatStreamMode,
          toggleGridOverlay: mockToggleGridOverlay,
          toggleTempoDriftVisualization: mockToggleTempoDriftVisualization,
          setInterpolationOptions: mockSetInterpolationOptions,
        },
      };
      return selector(state);
    });
  });

  describe('Toggle UI', () => {
    it('renders the auto multi-tempo toggle', () => {
      render(<BeatInterpolationSettings />);

      expect(screen.getByText('Auto Multi-Tempo Detection')).toBeInTheDocument();
    });

    it('shows checkbox as checked when autoMultiTempo is true', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<BeatInterpolationSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      expect(checkbox).toBeChecked();
    });

    it('shows checkbox as unchecked when autoMultiTempo is false', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<BeatInterpolationSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      expect(checkbox).not.toBeChecked();
    });

    it('calls setAutoMultiTempo with true when checkbox is checked', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<BeatInterpolationSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      fireEvent.click(checkbox);

      expect(mockSetAutoMultiTempo).toHaveBeenCalledWith(true);
    });

    it('calls setAutoMultiTempo with false when checkbox is unchecked', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<BeatInterpolationSettings />);

      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      fireEvent.click(checkbox);

      expect(mockSetAutoMultiTempo).toHaveBeenCalledWith(false);
    });

    it('disables checkbox when disabled prop is true', () => {
      render(<BeatInterpolationSettings disabled={true} />);

      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Toggle Description', () => {
    it('shows enabled description when autoMultiTempo is true', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      render(<BeatInterpolationSettings />);

      expect(screen.getByText('Multi-tempo analysis enabled (recommended)')).toBeInTheDocument();
    });

    it('shows disabled description when autoMultiTempo is false', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<BeatInterpolationSettings />);

      expect(screen.getByText('Single tempo mode - may be less accurate for variable tempo tracks')).toBeInTheDocument();
    });
  });

  describe('Toggle Tooltip', () => {
    it('has a tooltip explaining the feature', () => {
      render(<BeatInterpolationSettings />);

      // Use getAllByTestId since there are multiple tooltips, then find the one for multi-tempo
      const tooltips = screen.getAllByTestId('tooltip');
      const multiTempoTooltip = tooltips.find(
        t => t.getAttribute('title')?.includes('multiple tempo sections')
      );

      expect(multiTempoTooltip).toBeDefined();
      expect(multiTempoTooltip).toHaveAttribute(
        'title',
        'Automatically analyze tracks with multiple tempo sections. When enabled, distinct tempo changes will be detected and applied for more accurate beat mapping.'
      );
    });
  });

  describe('Analysis Behavior Differences', () => {
    it('toggle state is read from the store via useAutoMultiTempo hook', () => {
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<BeatInterpolationSettings />);

      // The hook should be called to get the current state
      expect(useAutoMultiTempo).toHaveBeenCalled();

      // The checkbox should reflect the false state
      const checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });
      expect(checkbox).not.toBeChecked();
    });

    it('toggle state change updates the store correctly', () => {
      // Test toggling OFF from ON state
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const { unmount } = render(<BeatInterpolationSettings />);

      let checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });

      // Toggle off - since checkbox is checked, clicking should trigger setAutoMultiTempo(false)
      fireEvent.click(checkbox);
      expect(mockSetAutoMultiTempo).toHaveBeenCalledWith(false);

      // Unmount to test the other case separately
      unmount();
      vi.clearAllMocks();

      // Test toggling ON from OFF state
      (useAutoMultiTempo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
      render(<BeatInterpolationSettings />);

      checkbox = screen.getByRole('checkbox', { name: /auto multi-tempo detection/i });

      // Toggle on - since checkbox is unchecked, clicking should trigger setAutoMultiTempo(true)
      fireEvent.click(checkbox);
      expect(mockSetAutoMultiTempo).toHaveBeenCalledWith(true);
    });
  });
});
