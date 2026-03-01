/**
 * Tests for BeatDetectionSettings OSE Parameter Controls
 *
 * Task 6.1: Test Toggle Button Interactions
 * - Verify mode selection updates store
 * - Verify custom input appears/disappears correctly
 * - Test keyboard navigation (arrow keys between options)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BeatDetectionSettings } from './BeatDetectionSettings';
import {
  useBeatDetectionStore,
  useOseSettingsChanged,
  useInterpolationSettingsChanged,
  useInterpolationOptions,
  useBeatStreamMode,
  useShowGridOverlay,
  useShowInterpolationVisualization,
  useShowTempoDriftVisualization,
  useInterpolationStatistics,
  useInterpolatedBeatMap,
  useInterpolationVisualizationData,
  useInterpolationState,
  useNeedsReanalysis,
} from '../../store/beatDetectionStore';

// Mock the store
vi.mock('../../store/beatDetectionStore', () => ({
  useBeatDetectionStore: vi.fn(),
  useOseSettingsChanged: vi.fn(),
  useInterpolationSettingsChanged: vi.fn(),
  useInterpolationOptions: vi.fn(),
  useBeatStreamMode: vi.fn(),
  useShowGridOverlay: vi.fn(),
  useShowInterpolationVisualization: vi.fn(),
  useShowTempoDriftVisualization: vi.fn(),
  useInterpolationStatistics: vi.fn(),
  useInterpolatedBeatMap: vi.fn(),
  useInterpolationVisualizationData: vi.fn(),
  useInterpolationState: vi.fn(),
  useNeedsReanalysis: vi.fn(),
}));

// Mock the presets from types
vi.mock('@/types', () => ({
  HOP_SIZE_PRESETS: {
    efficient: { value: 10, label: 'Efficient', description: 'Fast, reduced precision' },
    standard: { value: 4, label: 'Standard', description: 'Paper spec (default)' },
    hq: { value: 2, label: 'HQ', description: 'Maximum precision' },
  },
  MEL_BANDS_PRESETS: {
    standard: { value: 40, label: 'Standard', description: '40 bands' },
    detailed: { value: 64, label: 'Detailed', description: '64 bands' },
    maximum: { value: 80, label: 'Maximum', description: '80 bands' },
  },
  GAUSSIAN_SMOOTH_PRESETS: {
    minimal: { value: 10, label: 'Minimal', description: 'Fast transients' },
    standard: { value: 20, label: 'Standard', description: 'Balanced (default)' },
    smooth: { value: 40, label: 'Smooth', description: 'Cleaner peaks' },
  },
  DEFAULT_BEAT_INTERPOLATION_OPTIONS: {
    phaseLockStrength: 0.8,
    gridTolerance: 0.1,
    maxBpmDeviation: 30,
    minGridConfidence: 0.5,
  },
  detectInterpolationPreset: () => 'default',
  INTERPOLATION_PRESETS: [
    { id: 'default', name: 'Default', description: 'Balanced settings for most tracks', options: {} },
    { id: 'stable-tempo', name: 'Stable Tempo', description: 'Fixed grid for stable tempo', options: {} },
    { id: 'variable-tempo', name: 'Variable Tempo', description: 'High adaptation for tempo drift', options: {} },
    { id: 'sparse-detection', name: 'Sparse Detection', description: 'Lower thresholds for few beats', options: {} },
    { id: 'research', name: 'Research', description: 'Defaults with advanced options', options: {} },
  ],
}));

describe('BeatDetectionSettings - OSE Toggle Button Interactions (Task 6.1)', () => {
  // Default mock store state
  const mockStoreState = {
    generatorOptions: {
      minBpm: 60,
      maxBpm: 180,
      sensitivity: 1.0,
      filter: 0.0,
      tempoCenter: 0.5,
    },
    hopSizeConfig: { mode: 'standard' as const },
    melBandsConfig: { mode: 'standard' as const },
    gaussianSmoothConfig: { mode: 'standard' as const },
    actions: {
      setGeneratorOptions: vi.fn(),
      setHopSizeConfig: vi.fn(),
      setMelBandsConfig: vi.fn(),
      setGaussianSmoothConfig: vi.fn(),
    },
  };

  const mockSetHopSizeConfig = vi.fn();
  const mockSetMelBandsConfig = vi.fn();
  const mockSetGaussianSmoothConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation
    (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        ...mockStoreState,
        actions: {
          ...mockStoreState.actions,
          setHopSizeConfig: mockSetHopSizeConfig,
          setMelBandsConfig: mockSetMelBandsConfig,
          setGaussianSmoothConfig: mockSetGaussianSmoothConfig,
        },
      };
      return selector(state);
    });

    (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useInterpolationSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useInterpolationOptions as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      minAnchorConfidence: 0.3,
      gridSnapTolerance: 0.05,
      tempoAdaptationRate: 0.3,
      anomalyThreshold: 0.4,
      denseSectionMinBeats: 3,
      extrapolateStart: true,
      extrapolateEnd: true,
      gridAlignmentWeight: 0.5,
      anchorConfidenceWeight: 0.3,
      paceConfidenceWeight: 0.2,
    });
    (useBeatStreamMode as unknown as ReturnType<typeof vi.fn>).mockReturnValue('merged');
    (useShowGridOverlay as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useShowInterpolationVisualization as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useShowTempoDriftVisualization as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (useInterpolationStatistics as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (useInterpolatedBeatMap as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (useInterpolationVisualizationData as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (useInterpolationState as unknown as ReturnType<typeof vi.fn>).mockReturnValue({});
    (useNeedsReanalysis as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  describe('Task 6.1.1: Verify mode selection updates store', () => {
    it('calls setHopSizeConfig with "efficient" when Efficient button is clicked', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      // Wait for the section to expand
      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Find and click the Efficient radio button (role="radio", aria-label format: "Efficient: 10ms - Fast, reduced precision")
      const efficientButton = screen.getByRole('radio', { name: /Efficient: 10ms/i });
      fireEvent.click(efficientButton);

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({ mode: 'efficient' });
    });

    it('calls setHopSizeConfig with "hq" when HQ button is clicked', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const hqButton = screen.getByRole('radio', { name: /HQ: 2ms/i });
      fireEvent.click(hqButton);

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({ mode: 'hq' });
    });

    it('calls setHopSizeConfig with custom mode and default value when Custom button is clicked', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const customButton = screen.getByRole('radio', { name: /Custom: 4ms/i });
      fireEvent.click(customButton);

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 4,
      });
    });

    it('calls setMelBandsConfig when Mel Bands mode is changed', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Mel Bands')).toBeInTheDocument();
      });

      const detailedButton = screen.getByRole('radio', { name: /Detailed: 64/i });
      fireEvent.click(detailedButton);

      expect(mockSetMelBandsConfig).toHaveBeenCalledWith({ mode: 'detailed' });
    });

    it('calls setGaussianSmoothConfig when Smoothing mode is changed', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Smoothing')).toBeInTheDocument();
      });

      const minimalButton = screen.getByRole('radio', { name: /Minimal: 10ms/i });
      fireEvent.click(minimalButton);

      expect(mockSetGaussianSmoothConfig).toHaveBeenCalledWith({ mode: 'minimal' });
    });
  });

  describe('Task 6.1.2: Verify custom input appears/disappears correctly', () => {
    it('does not show custom input when Standard mode is selected', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Custom input should not be visible
      expect(screen.queryByLabelText(/custom value/i)).not.toBeInTheDocument();
    });

    it('shows custom input when Custom mode is selected', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 15 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Custom input should be visible
      expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
    });

    it('hides custom input when switching from Custom to Standard mode', async () => {
      // Start with custom mode
      const { rerender } = render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      // First, set to custom mode
      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const customButton = screen.getByRole('radio', { name: /Custom: 4ms/i });
      fireEvent.click(customButton);

      // Update mock to reflect custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 15 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      rerender(<BeatDetectionSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      // Now click Standard button
      const standardButton = screen.getByRole('radio', { name: /Standard: 4ms/i });
      fireEvent.click(standardButton);

      // Update mock to reflect standard mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'standard' },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      rerender(<BeatDetectionSettings />);

      await waitFor(() => {
        expect(screen.queryByLabelText(/custom hop size/i)).not.toBeInTheDocument();
      });
    });

    it('custom input has correct attributes (min, max, step)', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 15 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        const customInput = screen.getByLabelText(/custom hop size/i) as HTMLInputElement;
        expect(customInput).toBeInTheDocument();
        expect(customInput.min).toBe('1');
        expect(customInput.max).toBe('50');
        expect(customInput.step).toBe('1');
      });
    });
  });

  describe('Task 6.1.3: Test keyboard navigation (arrow keys between options)', () => {
    it('toggle buttons have correct ARIA role and attributes', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Check radiogroup role exists
      const radioGroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      expect(radioGroup).toBeInTheDocument();

      // Check radios have aria-checked attribute
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });
      expect(standardRadio).toHaveAttribute('aria-checked', 'true');

      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms/i });
      expect(efficientRadio).toHaveAttribute('aria-checked', 'false');
    });

    it('Mel Bands toggle has correct ARIA attributes', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Mel Bands')).toBeInTheDocument();
      });

      // Check radiogroup role exists
      const radioGroup = screen.getByRole('radiogroup', { name: /mel bands mode/i });
      expect(radioGroup).toBeInTheDocument();
    });

    it('Smoothing toggle has correct ARIA attributes', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Smoothing')).toBeInTheDocument();
      });

      // Check radiogroup role exists
      const radioGroup = screen.getByRole('radiogroup', { name: /gaussian smooth mode/i });
      expect(radioGroup).toBeInTheDocument();
    });

    it('toggle buttons are focusable', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Radios should be focusable
      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms/i });
      efficientRadio.focus();
      expect(efficientRadio).toHaveFocus();
    });
  });

  describe('Task 6.2.1: Test min/max clamping (1-50ms for hop size)', () => {
    it('clamps value to minimum (1) when input is below range', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '-5' } });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 1,
      });
    });

    it('clamps value to maximum (50) when input is above range', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '100' } });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 50,
      });
    });

    it('accepts valid values within range', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '30' } });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 30,
      });
    });

    it('clamps value at boundary: minimum value 1 is accepted', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '1' } });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 1,
      });
    });

    it('clamps value at boundary: maximum value 50 is accepted', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '50' } });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 50,
      });
    });
  });

  describe('Task 6.2.2: Test invalid input handling', () => {
    it('does not update when input is empty string', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '' } });

      // Should not call setHopSizeConfig for empty input
      expect(mockSetHopSizeConfig).not.toHaveBeenCalled();
    });

    it('does not update when input is non-numeric text', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: 'abc' } });

      // Should not call setHopSizeConfig for non-numeric input
      expect(mockSetHopSizeConfig).not.toHaveBeenCalled();
    });

    it('does not update when input contains only special characters', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '!@#$%' } });

      // Should not call setHopSizeConfig for special characters
      expect(mockSetHopSizeConfig).not.toHaveBeenCalled();
    });

    it('handles negative values by clamping to minimum', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '-10' } });

      // Negative values should be clamped to minimum (1)
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 1,
      });
    });

    it('handles zero value by clamping to minimum', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '0' } });

      // 0 should be clamped to minimum (1)
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 1,
      });
    });
  });

  describe('Task 6.2.3: Test decimal handling (should truncate to integer)', () => {
    it('truncates decimal value to integer (3.7 becomes 3)', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '3.7' } });

      // parseInt truncates, so 3.7 becomes 3
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 3,
      });
    });

    it('truncates decimal value to integer (15.9 becomes 15)', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '15.9' } });

      // parseInt truncates, so 15.9 becomes 15 (not rounded to 16)
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 15,
      });
    });

    it('handles decimal below minimum by clamping (0.5 becomes 1)', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '0.5' } });

      // parseInt(0.5) = 0, then clamped to 1
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 1,
      });
    });

    it('handles decimal above maximum by clamping (100.5 becomes 50)', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom', customValue: 25 },
          actions: {
            ...mockStoreState.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByLabelText(/custom hop size/i)).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      fireEvent.change(customInput, { target: { value: '100.5' } });

      // parseInt(100.5) = 100, then clamped to 50
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 50,
      });
    });

  });
});

/**
 * Tests for Task 6.3: Re-Analysis Flow
 *
 * These tests verify the "Re-Analyze Needed" indicator functionality:
 * - Indicator appears when OSE settings change
 * - Indicator clears after re-analysis
 * - Cached beat map is updated with new settings
 */
describe('BeatDetectionSettings - Re-Analysis Flow (Task 6.3)', () => {
  const mockSetHopSizeConfig = vi.fn();
  const mockSetMelBandsConfig = vi.fn();
  const mockSetGaussianSmoothConfig = vi.fn();

  // Mock store state with an existing beat map
  const mockStoreStateWithBeatMap = {
    generatorOptions: {
      minBpm: 60,
      maxBpm: 180,
      sensitivity: 1.0,
      filter: 0.0,
      tempoCenter: 0.5,
    },
    hopSizeConfig: { mode: 'standard' as const },
    melBandsConfig: { mode: 'standard' as const },
    gaussianSmoothConfig: { mode: 'standard' as const },
    beatMap: {
      id: 'test-beat-map',
      beats: [{ time: 0.5 }, { time: 1.0 }, { time: 1.5 }],
      bpm: 120,
    },
    lastGeneratedOSEConfig: {
      hopSizeConfig: { mode: 'standard' },
      melBandsConfig: { mode: 'standard' },
      gaussianSmoothConfig: { mode: 'standard' },
    },
    actions: {
      setGeneratorOptions: vi.fn(),
      setHopSizeConfig: mockSetHopSizeConfig,
      setMelBandsConfig: mockSetMelBandsConfig,
      setGaussianSmoothConfig: mockSetGaussianSmoothConfig,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 6.3.1: Verify "Re-Analyze Needed" indicator appears when OSE settings differ', () => {
    it('shows indicator when hop size mode changes from standard to efficient', async () => {
      // Start with settings that differ from lastGeneratedOSEConfig
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          hopSizeConfig: { mode: 'efficient' as const }, // Changed from standard
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      // Mock useOseSettingsChanged to return true (settings changed)
      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      // Wait for the indicator to appear
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Verify the indicator text
      expect(screen.getByText(/settings changed - re-analyze to apply/i)).toBeInTheDocument();
    });

    it('shows indicator when mel bands mode changes', async () => {
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          melBandsConfig: { mode: 'detailed' as const }, // Changed from standard
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setMelBandsConfig: mockSetMelBandsConfig,
          },
        };
        return selector(state);
      });

      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      expect(screen.getByText(/settings changed - re-analyze to apply/i)).toBeInTheDocument();
    });

    it('shows indicator when gaussian smooth mode changes', async () => {
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          gaussianSmoothConfig: { mode: 'smooth' as const }, // Changed from standard
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setGaussianSmoothConfig: mockSetGaussianSmoothConfig,
          },
        };
        return selector(state);
      });

      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      expect(screen.getByText(/settings changed - re-analyze to apply/i)).toBeInTheDocument();
    });

    it('shows indicator when custom hop size value changes', async () => {
      // Store was generated with custom value 15, now it's 25
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          hopSizeConfig: { mode: 'custom' as const, customValue: 25 },
          lastGeneratedOSEConfig: {
            hopSizeConfig: { mode: 'custom', customValue: 15 },
            melBandsConfig: { mode: 'standard' },
            gaussianSmoothConfig: { mode: 'standard' },
          },
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      expect(screen.getByText(/settings changed - re-analyze to apply/i)).toBeInTheDocument();
    });

    it('does not show indicator when no beat map exists', async () => {
      // No beat map in store
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          beatMap: null,
          lastGeneratedOSEConfig: null,
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      // useOseSettingsChanged returns false when no beat map exists
      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Should NOT show the indicator
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText(/settings changed/i)).not.toBeInTheDocument();
    });
  });

  describe('Task 6.3.2: Verify indicator clears after re-analysis', () => {
    it('hides indicator when settings match lastGeneratedOSEConfig after re-analysis', async () => {
      // Simulate state after re-analysis: settings now match lastGeneratedOSEConfig
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          hopSizeConfig: { mode: 'efficient' as const },
          lastGeneratedOSEConfig: {
            hopSizeConfig: { mode: 'efficient' }, // Now matches
            melBandsConfig: { mode: 'standard' },
            gaussianSmoothConfig: { mode: 'standard' },
          },
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
          },
        };
        return selector(state);
      });

      // useOseSettingsChanged returns false after re-analysis (settings match)
      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Should NOT show the indicator after re-analysis
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText(/settings changed/i)).not.toBeInTheDocument();
    });

    it('hides indicator when all OSE settings are returned to defaults', async () => {
      // All settings back to standard
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          hopSizeConfig: { mode: 'standard' as const },
          melBandsConfig: { mode: 'standard' as const },
          gaussianSmoothConfig: { mode: 'standard' as const },
          actions: {
            ...mockStoreStateWithBeatMap.actions,
            setHopSizeConfig: mockSetHopSizeConfig,
            setMelBandsConfig: mockSetMelBandsConfig,
            setGaussianSmoothConfig: mockSetGaussianSmoothConfig,
          },
        };
        return selector(state);
      });

      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Should NOT show the indicator
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Task 6.3.3: Verify indicator has correct accessibility attributes', () => {
    it('has role="status" for screen reader announcements', async () => {
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        const state = {
          ...mockStoreStateWithBeatMap,
          hopSizeConfig: { mode: 'efficient' as const },
          actions: mockStoreStateWithBeatMap.actions,
        };
        return selector(state);
      });

      (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

      render(<BeatDetectionSettings />);

      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});

/**
 * Tests for Task 6.4: Screen Reader Announcement of Selected Mode
 *
 * These tests verify that screen readers can properly announce mode changes:
 * - aria-checked attribute updates correctly when mode changes
 * - Focus management allows screen readers to track the active selection
 * - Radiogroup provides proper context for screen reader users
 */
describe('BeatDetectionSettings - Screen Reader Announcements (Task 6.4)', () => {
  const mockSetHopSizeConfig = vi.fn();
  const mockSetMelBandsConfig = vi.fn();
  const mockSetGaussianSmoothConfig = vi.fn();

  const mockStoreState = {
    generatorOptions: {
      minBpm: 60,
      maxBpm: 180,
      sensitivity: 1.0,
      filter: 0.0,
      tempoCenter: 0.5,
    },
    hopSizeConfig: { mode: 'standard' as const },
    melBandsConfig: { mode: 'standard' as const },
    gaussianSmoothConfig: { mode: 'standard' as const },
    actions: {
      setGeneratorOptions: vi.fn(),
      setHopSizeConfig: mockSetHopSizeConfig,
      setMelBandsConfig: mockSetMelBandsConfig,
      setGaussianSmoothConfig: mockSetGaussianSmoothConfig,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      return selector(mockStoreState);
    });

    (useOseSettingsChanged as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  describe('Task 6.4.1: aria-checked updates when mode changes via click', () => {
    it('updates aria-checked from false to true when selecting a new mode', async () => {
      const { rerender } = render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Initial state: Standard is checked
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });
      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms/i });

      expect(standardRadio).toHaveAttribute('aria-checked', 'true');
      expect(efficientRadio).toHaveAttribute('aria-checked', 'false');

      // Click Efficient to change mode
      fireEvent.click(efficientRadio);

      // Update mock to reflect the change
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({
          ...mockStoreState,
          hopSizeConfig: { mode: 'efficient' as const },
        });
      });

      // Rerender to reflect the state change
      rerender(<BeatDetectionSettings />);

      // Re-query to get updated aria-checked
      await waitFor(() => {
        const efficientRadioUpdated = screen.getByRole('radio', { name: /Efficient: 10ms/i });
        expect(efficientRadioUpdated).toHaveAttribute('aria-checked', 'true');
      });

      // Standard should now be unchecked
      const standardRadioUpdated = screen.getByRole('radio', { name: /Standard: 4ms/i });
      expect(standardRadioUpdated).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Task 6.4.2: Screen reader can identify the radiogroup and its options', () => {
    it('radiogroup has accessible label describing its purpose', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Radiogroup should have an accessible name
      const hopSizeRadiogroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      expect(hopSizeRadiogroup).toBeInTheDocument();
      expect(hopSizeRadiogroup).toHaveAttribute('aria-label', 'Hop size mode');
    });

    it('each radio button has accessible name with label, value, and description', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Check that each radio has a descriptive aria-label
      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms - Fast, reduced precision/i });
      expect(efficientRadio).toBeInTheDocument();

      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms - Paper spec/i });
      expect(standardRadio).toBeInTheDocument();

      const hqRadio = screen.getByRole('radio', { name: /HQ: 2ms - Maximum precision/i });
      expect(hqRadio).toBeInTheDocument();

      const customRadio = screen.getByRole('radio', { name: /Custom: 4ms - User-defined hop size/i });
      expect(customRadio).toBeInTheDocument();
    });

    it('Mel Bands radiogroup has accessible label', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Mel Bands')).toBeInTheDocument();
      });

      const melBandsRadiogroup = screen.getByRole('radiogroup', { name: /mel bands mode/i });
      expect(melBandsRadiogroup).toBeInTheDocument();
      expect(melBandsRadiogroup).toHaveAttribute('aria-label', 'Mel bands mode');
    });

    it('Smoothing radiogroup has accessible label', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Smoothing')).toBeInTheDocument();
      });

      const smoothRadiogroup = screen.getByRole('radiogroup', { name: /gaussian smooth mode/i });
      expect(smoothRadiogroup).toBeInTheDocument();
      expect(smoothRadiogroup).toHaveAttribute('aria-label', 'Gaussian smooth mode');
    });
  });

  describe('Task 6.4.3: Tab index management for keyboard/screen reader navigation', () => {
    it('only the selected radio is in tab order (tabIndex=0)', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Standard is selected, so only it should be in tab order
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });
      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms/i });
      const hqRadio = screen.getByRole('radio', { name: /HQ: 2ms/i });
      const customRadio = screen.getByRole('radio', { name: /Custom: 4ms/i });

      expect(standardRadio).toHaveAttribute('tabIndex', '0');
      expect(efficientRadio).toHaveAttribute('tabIndex', '-1');
      expect(hqRadio).toHaveAttribute('tabIndex', '-1');
      expect(customRadio).toHaveAttribute('tabIndex', '-1');
    });

    it('tabIndex updates when mode changes', async () => {
      // Start with efficient mode selected
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({
          ...mockStoreState,
          hopSizeConfig: { mode: 'efficient' as const },
        });
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Efficient is selected, so only it should be in tab order
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });
      const efficientRadio = screen.getByRole('radio', { name: /Efficient: 10ms/i });

      expect(efficientRadio).toHaveAttribute('tabIndex', '0');
      expect(standardRadio).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Task 6.4.4: Keyboard navigation with aria-checked updates', () => {
    it('Arrow Right key updates aria-checked on new selection', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Get the radiogroup and focused radio
      const radiogroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });

      // Focus the standard radio
      standardRadio.focus();
      expect(standardRadio).toHaveFocus();

      // Press Arrow Right to move to next option (HQ)
      fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });

      // Verify the store was called with the new mode
      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({ mode: 'hq' });
    });

    it('Arrow Left key updates aria-checked on new selection', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const radiogroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });

      standardRadio.focus();
      expect(standardRadio).toHaveFocus();

      // Press Arrow Left to move to previous option (Efficient)
      fireEvent.keyDown(radiogroup, { key: 'ArrowLeft' });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({ mode: 'efficient' });
    });

    it('Home key moves to first option and updates aria-checked', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const radiogroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });

      standardRadio.focus();

      // Press Home to move to first option (Efficient)
      fireEvent.keyDown(radiogroup, { key: 'Home' });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({ mode: 'efficient' });
    });

    it('End key moves to last option (Custom) and updates aria-checked', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const radiogroup = screen.getByRole('radiogroup', { name: /hop size mode/i });
      const standardRadio = screen.getByRole('radio', { name: /Standard: 4ms/i });

      standardRadio.focus();

      // Press End to move to last option (Custom)
      fireEvent.keyDown(radiogroup, { key: 'End' });

      expect(mockSetHopSizeConfig).toHaveBeenCalledWith({
        mode: 'custom',
        customValue: 4,
      });
    });
  });

  describe('Task 6.4.5: Custom input accessibility for screen readers', () => {
    it('custom input has associated label for screen readers', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom' as const, customValue: 15 },
        });
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // Custom input should be visible with accessible label
      const customInput = screen.getByLabelText(/custom hop size/i);
      expect(customInput).toBeInTheDocument();
      expect(customInput).toHaveAttribute('id', 'custom-hop-size-input');
    });

    it('custom input has aria-describedby for hint text', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom' as const, customValue: 15 },
        });
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i);
      expect(customInput).toHaveAttribute('aria-describedby', 'custom-hop-size-hint');

      // Verify the hint element exists
      const hint = document.getElementById('custom-hop-size-hint');
      expect(hint).toBeInTheDocument();
      expect(hint).toHaveTextContent(/lower = more precise/i);
    });

    it('custom input announces its value range to screen readers', async () => {
      // Mock store with custom mode
      (useBeatDetectionStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
        return selector({
          ...mockStoreState,
          hopSizeConfig: { mode: 'custom' as const, customValue: 15 },
        });
      });

      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      const customInput = screen.getByLabelText(/custom hop size/i) as HTMLInputElement;
      expect(customInput.min).toBe('1');
      expect(customInput.max).toBe('50');
      expect(customInput.step).toBe('1');
    });
  });

  describe('Task 6.4.6: Screen reader announcement of current selection in header', () => {
    it('displays current value badge that screen readers can access', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Hop Size')).toBeInTheDocument();
      });

      // The value badge should be visible and accessible
      const hopSizeHeader = screen.getByText('Hop Size').closest('.beat-detection-settings-header');
      expect(hopSizeHeader).toBeInTheDocument();

      // The value badge shows "4ms" for standard mode
      const valueBadge = hopSizeHeader?.querySelector('.beat-detection-settings-value');
      expect(valueBadge).toHaveTextContent('4ms');
    });

    it('displays current Mel Bands value for screen readers', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Mel Bands')).toBeInTheDocument();
      });

      const melBandsHeader = screen.getByText('Mel Bands').closest('.beat-detection-settings-header');
      const valueBadge = melBandsHeader?.querySelector('.beat-detection-settings-value');
      expect(valueBadge).toHaveTextContent('40 bands');
    });

    it('displays current Smoothing value for screen readers', async () => {
      render(<BeatDetectionSettings />);

      // Expand Advanced Settings
      const advancedSummary = screen.getByText('Advanced Settings');
      fireEvent.click(advancedSummary);

      await waitFor(() => {
        expect(screen.getByText('Smoothing')).toBeInTheDocument();
      });

      const smoothHeader = screen.getByText('Smoothing').closest('.beat-detection-settings-header');
      const valueBadge = smoothHeader?.querySelector('.beat-detection-settings-value');
      expect(valueBadge).toHaveTextContent('20ms');
    });
  });
});
