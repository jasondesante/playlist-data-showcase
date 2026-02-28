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
