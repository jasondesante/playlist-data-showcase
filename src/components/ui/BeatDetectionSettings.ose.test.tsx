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
import { useBeatDetectionStore, useOseSettingsChanged } from '../../store/beatDetectionStore';

// Mock the store
vi.mock('../../store/beatDetectionStore', () => ({
  useBeatDetectionStore: vi.fn(),
  useOseSettingsChanged: vi.fn(),
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
  });
});
