/**
 * RacialTraitCreatorForm Dynamic Subrace Dropdown Tests
 *
 * Phase 8.1 Integration Testing
 * Task: Test dynamic subrace dropdown
 *
 * These tests verify that the dynamic subrace dropdown in RacialTraitCreatorForm:
 * - Populates subraces from ExtensionManager when a race is selected
 * - Updates subrace list when switching between races
 * - Shows dropdown when subraces are available
 * - Shows text input when no subraces are defined
 * - Allows custom subrace entry via "Custom..." option
 * - Allows returning to dropdown via "Back to list" button
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExtensionManager } from 'playlist-data-engine';
import { RacialTraitCreatorForm } from '../RacialTraitCreatorForm';

// Mock ExtensionManager
vi.mock('playlist-data-engine', () => ({
  ExtensionManager: {
    getInstance: vi.fn(),
  },
}));

// Mock useContentCreator hook
vi.mock('@/hooks/useContentCreator', () => ({
  useContentCreator: () => ({
    createContent: vi.fn(() => ({ success: true })),
    isLoading: false,
    lastError: null,
    clearError: vi.fn(),
  }),
}));

describe('RacialTraitCreatorForm - Dynamic Subrace Dropdown', () => {
  let mockManager: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create fresh mock for each test
    mockManager = {
      get: vi.fn(),
    };

    (ExtensionManager.getInstance as ReturnType<typeof vi.fn>).mockReturnValue(mockManager);

    // Default mock returns empty array
    mockManager.get.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Subrace Dropdown Population', () => {
    it('should show text input when no subraces are defined for a race', async () => {
      mockManager.get.mockReturnValue([]);

      render(<RacialTraitCreatorForm />);

      // Select a race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Human' } });

      // Should show text input (no dropdown)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i)).toBeInTheDocument();
      });
    });

    it('should populate dropdown with subraces when race has subraces', async () => {
      // Mock races.data with subraces for Elf
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf', 'Drow'],
        },
        {
          race: 'Dwarf',
          subraces: ['Hill Dwarf', 'Mountain Dwarf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Wait for dropdown to appear
      await waitFor(() => {
        // Should show dropdown with subraces
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /wood elf/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /drow/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /none \(base race trait\)/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /custom\.\.\./i })).toBeInTheDocument();
      });
    });

    it('should update subrace list when switching between races', async () => {
      // Mock races.data with subraces for multiple races
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
        {
          race: 'Dwarf',
          subraces: ['Hill Dwarf', 'Mountain Dwarf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race first
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Wait for Elf subraces to appear
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /wood elf/i })).toBeInTheDocument();
      });

      // Verify no Dwarf subraces visible
      expect(screen.queryByRole('option', { name: /hill dwarf/i })).not.toBeInTheDocument();

      // Switch to Dwarf race
      fireEvent.change(raceSelect, { target: { value: 'Dwarf' } });

      // Wait for Dwarf subraces to appear and Elf subraces to disappear
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /hill dwarf/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /mountain dwarf/i })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: /high elf/i })).not.toBeInTheDocument();
      });
    });

    it('should clear subrace value when switching races', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
        {
          race: 'Dwarf',
          subraces: ['Hill Dwarf', 'Mountain Dwarf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Wait for and select a subrace
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: 'High Elf' } });

      // Verify subrace is selected
      expect(subraceSelect).toHaveValue('High Elf');

      // Switch to Dwarf race
      fireEvent.change(raceSelect, { target: { value: 'Dwarf' } });

      // Subrace should be cleared or reset
      await waitFor(() => {
        const newSubraceSelect = screen.getByLabelText(/subrace/i);
        expect(newSubraceSelect).toHaveValue('');
      });
    });
  });

  describe('Custom Subrace Mode', () => {
    it('should switch to text input when "Custom..." is selected', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /custom\.\.\./i })).toBeInTheDocument();
      });

      // Select "Custom..." option
      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: '__custom__' } });

      // Should now show text input
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i)).toBeInTheDocument();
      });
    });

    it('should show "Back to list" button when in custom mode', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race and switch to custom mode
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /custom\.\.\./i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: '__custom__' } });

      // Should show "Back to list" button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument();
      });
    });

    it('should return to dropdown when "Back to list" is clicked', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race and switch to custom mode
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /custom\.\.\./i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: '__custom__' } });

      // Wait for custom mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument();
      });

      // Click "Back to list"
      const backButton = screen.getByRole('button', { name: /back to list/i });
      fireEvent.click(backButton);

      // Should return to dropdown
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i)).not.toBeInTheDocument();
      });
    });

    it('should clear custom subrace value when returning to dropdown', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race and switch to custom mode
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /custom\.\.\./i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: '__custom__' } });

      // Enter custom subrace value
      await waitFor(() => {
        const customInput = screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i);
        expect(customInput).toBeInTheDocument();
      });

      const customInput = screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i);
      fireEvent.change(customInput, { target: { value: 'Dark Elf' } });

      // Click "Back to list"
      const backButton = screen.getByRole('button', { name: /back to list/i });
      fireEvent.click(backButton);

      // Subrace should be cleared
      await waitFor(() => {
        const newSubraceSelect = screen.getByLabelText(/subrace/i);
        expect(newSubraceSelect).toHaveValue('');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle race data without subraces property', async () => {
      // Mock race data without subraces
      mockManager.get.mockReturnValue([
        {
          race: 'Human',
          // No subraces property
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Human race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Human' } });

      // Should show text input since no subraces are defined
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i)).toBeInTheDocument();
      });
    });

    it('should handle empty subraces array', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Human',
          subraces: [],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Human race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Human' } });

      // Should show text input since subraces array is empty
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., High Elf, Hill Dwarf/i)).toBeInTheDocument();
      });
    });

    it('should handle ExtensionManager errors gracefully', async () => {
      // Mock console.warn to suppress error output
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockManager.get.mockImplementation(() => {
        throw new Error('ExtensionManager error');
      });

      // Should not crash
      const { container } = render(<RacialTraitCreatorForm />);
      expect(container).toBeInTheDocument();

      // Should show warning
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should show helpful hint when no subraces defined', async () => {
      mockManager.get.mockReturnValue([]);

      render(<RacialTraitCreatorForm />);

      // Select a race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Human' } });

      // Should show helpful hint
      await waitFor(() => {
        expect(screen.getByText(/no subraces defined for this race/i)).toBeInTheDocument();
      });
    });

    it('should show hint about subraces loaded from race data', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Should show hint about loaded subraces
      await waitFor(() => {
        expect(screen.getByText(/subraces loaded from elf data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Preview Integration', () => {
    it('should show selected subrace in preview', async () => {
      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/^name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Trait' } });

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Select High Elf subrace
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: 'High Elf' } });

      // Fill description
      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      // Check preview shows subrace
      await waitFor(() => {
        expect(screen.getByText('High Elf')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should include subrace in form data when submitting', async () => {
      const mockOnCreate = vi.fn();

      mockManager.get.mockReturnValue([
        {
          race: 'Elf',
          subraces: ['High Elf', 'Wood Elf'],
        },
      ]);

      render(<RacialTraitCreatorForm onCreate={mockOnCreate} />);

      // Fill required fields
      const nameInput = screen.getByLabelText(/^name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Trait' } });

      // Select Elf race
      const raceSelect = screen.getByLabelText(/race/i);
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      // Select High Elf subrace
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /high elf/i })).toBeInTheDocument();
      });

      const subraceSelect = screen.getByLabelText(/subrace/i);
      fireEvent.change(subraceSelect, { target: { value: 'High Elf' } });

      // Fill description
      const descInput = screen.getByLabelText(/description/i);
      fireEvent.change(descInput, { target: { value: 'Test description text here' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create racial trait/i });
      fireEvent.click(submitButton);

      // Check onCreate was called with subrace
      await waitFor(() => {
        expect(mockOnCreate).toHaveBeenCalled();
        const calledData = mockOnCreate.mock.calls[0][0];
        expect(calledData.subrace).toBe('High Elf');
      });
    });
  });
});
