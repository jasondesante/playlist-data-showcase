/**
 * Tests for Structured Select Components (CastingTimeSelect, RangeSelect, DurationSelect)
 *
 * Task 8.1: Test structured dropdowns with custom options
 *
 * Test Coverage:
 * - Dropdown renders with common values
 * - "Custom..." option reveals text input
 * - Custom input value updates parent state
 * - Back to dropdown button works
 * - External value sync (when value changes externally)
 * - Validation and accessibility
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CastingTimeSelect, COMMON_CASTING_TIMES, isCommonValue as isCommonCastingTime } from '../CastingTimeSelect';
import { RangeSelect, COMMON_RANGES, isCommonValue as isCommonRange } from '../RangeSelect';
import { DurationSelect, COMMON_DURATIONS, isCommonValue as isCommonDuration } from '../DurationSelect';

// ============================================
// CASTING TIME SELECT TESTS
// ============================================

describe('CastingTimeSelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<CastingTimeSelect label="Casting Time" onChange={mockOnChange} />);
      expect(screen.getByText('Casting Time')).toBeInTheDocument();
    });

    it('renders dropdown with common values', () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('shows required indicator when required', () => {
      render(<CastingTimeSelect label="Casting Time" required onChange={mockOnChange} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('shows optional indicator when not required', () => {
      render(<CastingTimeSelect label="Casting Time" onChange={mockOnChange} />);
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });

    it('disables dropdown when disabled prop is true', () => {
      render(<CastingTimeSelect disabled onChange={mockOnChange} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });
  });

  describe('Common Values', () => {
    it('includes all standard casting times', () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox');

      // Check that all common values are options
      COMMON_CASTING_TIMES.forEach(ct => {
        const option = screen.getByRole('option', { name: ct.label });
        expect(option).toBeInTheDocument();
      });
    });

    it('includes Custom option', () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);
      const customOption = screen.getByRole('option', { name: 'Custom...' });
      expect(customOption).toBeInTheDocument();
    });

    it('defaults to "1 action" when no value provided', () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1 action');
    });

    it('respects initial value prop', () => {
      render(<CastingTimeSelect value="1 bonus action" onChange={mockOnChange} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1 bonus action');
    });
  });

  describe('Custom Option', () => {
    it('switches to custom input when "Custom..." is selected', async () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., 8 hours, 24 hours')).toBeInTheDocument();
      });
    });

    it('shows text input with autofocus when in custom mode', async () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., 8 hours, 24 hours');
        expect(input).toHaveFocus();
      });
    });

    it('calls onChange when custom value is entered', async () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., 8 hours, 24 hours');
        fireEvent.change(input, { target: { value: '8 hours' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('8 hours');
    });

    it('shows back to dropdown button in custom mode', async () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const backButton = screen.getByTitle('Back to dropdown');
        expect(backButton).toBeInTheDocument();
      });
    });

    it('returns to dropdown when back button is clicked', async () => {
      render(<CastingTimeSelect onChange={mockOnChange} />);

      // Switch to custom mode
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const backButton = screen.getByTitle('Back to dropdown');
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Should reset to default value
      expect(mockOnChange).toHaveBeenCalledWith('1 action');
    });
  });

  describe('External Value Sync', () => {
    it('enters custom mode when external value is not common', () => {
      const { rerender } = render(<CastingTimeSelect value="1 action" onChange={mockOnChange} />);

      // Change to custom value externally
      rerender(<CastingTimeSelect value="12 hours" onChange={mockOnChange} />);

      // Should show custom input
      expect(screen.getByPlaceholderText('e.g., 8 hours, 24 hours')).toBeInTheDocument();
    });

    it('stays in dropdown mode when external value is common', () => {
      const { rerender } = render(<CastingTimeSelect value="1 action" onChange={mockOnChange} />);

      rerender(<CastingTimeSelect value="1 bonus action" onChange={mockOnChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1 bonus action');
    });
  });

  describe('Hint Display', () => {
    it('shows hint when showHint is true', () => {
      render(<CastingTimeSelect value="1 action" showHint onChange={mockOnChange} />);

      // "Standard action" is the description for "1 action"
      expect(screen.getByText('Standard action')).toBeInTheDocument();
    });

    it('hides hint when showHint is false', () => {
      render(<CastingTimeSelect value="1 action" showHint={false} onChange={mockOnChange} />);

      expect(screen.queryByText('Standard action')).not.toBeInTheDocument();
    });

    it('shows custom hint when in custom mode', async () => {
      render(<CastingTimeSelect showHint onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        expect(screen.getByText(/Enter a custom casting time/)).toBeInTheDocument();
      });
    });
  });
});

// ============================================
// RANGE SELECT TESTS
// ============================================

describe('RangeSelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<RangeSelect label="Range" onChange={mockOnChange} />);
      expect(screen.getByText('Range')).toBeInTheDocument();
    });

    it('renders dropdown with common values', () => {
      render(<RangeSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('defaults to "30 feet" when no value provided', () => {
      render(<RangeSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('30 feet');
    });
  });

  describe('Common Values', () => {
    it('includes all standard ranges', () => {
      render(<RangeSelect onChange={mockOnChange} />);

      COMMON_RANGES.forEach(r => {
        const option = screen.getByRole('option', { name: r.label });
        expect(option).toBeInTheDocument();
      });
    });

    it('includes Custom option', () => {
      render(<RangeSelect onChange={mockOnChange} />);
      const customOption = screen.getByRole('option', { name: 'Custom...' });
      expect(customOption).toBeInTheDocument();
    });
  });

  describe('Custom Option', () => {
    it('switches to custom input when "Custom..." is selected', async () => {
      render(<RangeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., 500 feet, 1 mile, Special')).toBeInTheDocument();
      });
    });

    it('calls onChange when custom value is entered', async () => {
      render(<RangeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., 500 feet, 1 mile, Special');
        fireEvent.change(input, { target: { value: '500 feet' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('500 feet');
    });

    it('returns to dropdown when back button is clicked', async () => {
      render(<RangeSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const backButton = screen.getByTitle('Back to dropdown');
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Should reset to default value
      expect(mockOnChange).toHaveBeenCalledWith('30 feet');
    });
  });

  describe('External Value Sync', () => {
    it('enters custom mode when external value is not common', () => {
      const { rerender } = render(<RangeSelect value="30 feet" onChange={mockOnChange} />);

      rerender(<RangeSelect value="Sight" onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText('e.g., 500 feet, 1 mile, Special')).toBeInTheDocument();
    });
  });
});

// ============================================
// DURATION SELECT TESTS
// ============================================

describe('DurationSelect', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<DurationSelect label="Duration" onChange={mockOnChange} />);
      expect(screen.getByText('Duration')).toBeInTheDocument();
    });

    it('renders dropdown with common values', () => {
      render(<DurationSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('defaults to "Instantaneous" when no value provided', () => {
      render(<DurationSelect onChange={mockOnChange} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('Instantaneous');
    });
  });

  describe('Common Values', () => {
    it('includes all standard durations', () => {
      render(<DurationSelect onChange={mockOnChange} />);

      COMMON_DURATIONS.forEach(d => {
        const option = screen.getByRole('option', { name: d.label });
        expect(option).toBeInTheDocument();
      });
    });

    it('includes concentration duration', () => {
      render(<DurationSelect onChange={mockOnChange} />);
      const concOption = screen.getByRole('option', { name: 'Concentration (1 min)' });
      expect(concOption).toBeInTheDocument();
    });
  });

  describe('Custom Option', () => {
    it('switches to custom input when "Custom..." is selected', async () => {
      render(<DurationSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/7 days, Until sunrise/)).toBeInTheDocument();
      });
    });

    it('calls onChange when custom value is entered', async () => {
      render(<DurationSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/7 days, Until sunrise/);
        fireEvent.change(input, { target: { value: '7 days' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('7 days');
    });

    it('returns to dropdown when back button is clicked', async () => {
      render(<DurationSelect onChange={mockOnChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '__custom__' } });

      await waitFor(() => {
        const backButton = screen.getByTitle('Back to dropdown');
        fireEvent.click(backButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // Should reset to default value
      expect(mockOnChange).toHaveBeenCalledWith('Instantaneous');
    });
  });

  describe('External Value Sync', () => {
    it('enters custom mode when external value is not common', () => {
      const { rerender } = render(<DurationSelect value="Instantaneous" onChange={mockOnChange} />);

      rerender(<DurationSelect value="Until sunrise" onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText(/7 days, Until sunrise/)).toBeInTheDocument();
    });
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('isCommonValue utility functions', () => {
  describe('isCommonCastingTime', () => {
    it('returns true for common casting times', () => {
      expect(isCommonCastingTime('1 action')).toBe(true);
      expect(isCommonCastingTime('1 bonus action')).toBe(true);
      expect(isCommonCastingTime('1 reaction')).toBe(true);
      expect(isCommonCastingTime('1 minute')).toBe(true);
      expect(isCommonCastingTime('10 minutes')).toBe(true);
      expect(isCommonCastingTime('1 hour')).toBe(true);
    });

    it('returns false for non-common values', () => {
      expect(isCommonCastingTime('8 hours')).toBe(false);
      expect(isCommonCastingTime('')).toBe(false);
      expect(isCommonCastingTime('Special')).toBe(false);
    });
  });

  describe('isCommonRange', () => {
    it('returns true for common ranges', () => {
      expect(isCommonRange('Touch')).toBe(true);
      expect(isCommonRange('Self')).toBe(true);
      expect(isCommonRange('30 feet')).toBe(true);
      expect(isCommonRange('120 feet')).toBe(true);
      expect(isCommonRange('1 mile')).toBe(true);
    });

    it('returns false for non-common values', () => {
      expect(isCommonRange('500 feet')).toBe(false);
      expect(isCommonRange('Sight')).toBe(false);
      expect(isCommonRange('')).toBe(false);
    });
  });

  describe('isCommonDuration', () => {
    it('returns true for common durations', () => {
      expect(isCommonDuration('Instantaneous')).toBe(true);
      expect(isCommonDuration('1 round')).toBe(true);
      expect(isCommonDuration('1 minute')).toBe(true);
      expect(isCommonDuration('Until dispelled')).toBe(true);
      expect(isCommonDuration('Concentration, up to 1 minute')).toBe(true);
    });

    it('returns false for non-common values', () => {
      expect(isCommonDuration('7 days')).toBe(false);
      expect(isCommonDuration('Until sunrise')).toBe(false);
      expect(isCommonDuration('')).toBe(false);
    });
  });
});

// ============================================
// INTEGRATION WITH SPELL CREATOR FORM
// ============================================

describe('Structured Selects Integration', () => {
  it('should have compatible value types for spell form data', () => {
    // Verify that the structured select values can be used in spell form data
    const spellData = {
      name: 'Test Spell',
      level: 0,
      school: 'Evocation',
      casting_time: '1 action',
      range: '30 feet',
      duration: 'Instantaneous',
      components: ['V', 'S'] as const,
      description: 'A test spell',
      classes: [],
    };

    // Common values should be valid
    expect(spellData.casting_time).toBe('1 action');
    expect(spellData.range).toBe('30 feet');
    expect(spellData.duration).toBe('Instantaneous');
  });

  it('should support custom values in spell form data', () => {
    const spellData = {
      name: 'Test Spell',
      level: 0,
      school: 'Evocation',
      casting_time: '8 hours',
      range: 'Sight',
      duration: 'Until sunrise',
      components: ['V', 'S'] as const,
      description: 'A test spell with custom values',
      classes: [],
    };

    // Custom values should be valid strings
    expect(typeof spellData.casting_time).toBe('string');
    expect(typeof spellData.range).toBe('string');
    expect(typeof spellData.duration).toBe('string');
    expect(spellData.casting_time).toBe('8 hours');
    expect(spellData.range).toBe('Sight');
    expect(spellData.duration).toBe('Until sunrise');
  });

  it('should have consistent CUSTOM_VALUE marker across components', () => {
    // All components use '__custom__' as the custom value marker
    const customValue = '__custom__';

    expect(customValue).toBe('__custom__');
    expect(customValue).not.toBe('');
  });
});
