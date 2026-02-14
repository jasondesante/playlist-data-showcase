/**
 * Tests for AdvancedOptionsSection Component
 *
 * Task 4.1: Test Advanced Options
 * - Verify name input overrides character name
 * - Verify deterministic name toggle works
 * - Verify race dropdown populates correctly
 * - Verify class dropdown populates correctly
 * - Verify subrace dropdown updates when race changes
 * - Verify subrace selection requires race selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedOptionsSection, type AdvancedOptions } from './AdvancedOptionsSection';
import type { Race } from 'playlist-data-engine';

// Mock playlist-data-engine
vi.mock('playlist-data-engine', () => ({
  FeatureQuery: {
    getInstance: vi.fn(() => ({
      getRegisteredRaces: vi.fn(() => []),
      getRegisteredClasses: vi.fn(() => []),
      getAvailableSubraces: vi.fn((race: string) => {
        // Mock subraces for specific races
        const subraces: Record<string, string[]> = {
          'Elf': ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'],
          'Dwarf': ['Hill Dwarf', 'Mountain Dwarf'],
          'Halfling': ['Lightfoot', 'Stout'],
          'Human': ['Calishite', 'Chondathan', 'Damaran', 'Illuskan', 'Mulan', 'Rashemi', 'Shou', 'Tethyrian', 'Turami'],
          'Dragonborn': ['Chromatic', 'Metallic', 'Gem'],
          'Gnome': ['Forest Gnome', 'Rock Gnome'],
        };
        return subraces[race] || [];
      }),
    })),
  },
  ALL_RACES: ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'] as const,
  ALL_CLASSES: ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'] as const,
}));

describe('AdvancedOptionsSection', () => {
  const defaultOptions: AdvancedOptions = {
    forceName: '',
    deterministicName: true,
    forceRace: undefined,
    forceClass: undefined,
    subrace: undefined,
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Expand/Collapse Behavior', () => {
    it('renders collapsed by default', () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Header should be visible
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();

      // Content should not be visible (collapsed)
      expect(screen.queryByLabelText('Custom Name')).not.toBeInTheDocument();
    });

    it('expands when header is clicked', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Click the expand button
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      // Content should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText('Custom Name')).toBeInTheDocument();
      });
    });
  });

  describe('Name Input Override (Task 4.1.1)', () => {
    it('renders name input field when expanded', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Custom Name')).toBeInTheDocument();
      });
    });

    it('calls onChange with updated forceName when name is typed', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Custom Name')).toBeInTheDocument();
      });

      // Type in the name input
      const nameInput = screen.getByLabelText('Custom Name');
      fireEvent.change(nameInput, { target: { value: 'Gandalf' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        forceName: 'Gandalf',
      });
    });

    it('displays the current forceName value', async () => {
      const optionsWithCustomName: AdvancedOptions = {
        ...defaultOptions,
        forceName: 'Frodo',
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithCustomName}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Custom Name') as HTMLInputElement;
        expect(nameInput.value).toBe('Frodo');
      });
    });
  });

  describe('Deterministic Name Toggle (Task 4.1.2)', () => {
    it('renders deterministic name checkbox when expanded', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Deterministic naming')).toBeInTheDocument();
      });
    });

    it('checkbox is checked by default (deterministicName: true)', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Deterministic naming') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });

    it('calls onChange with deterministicName: false when unchecked', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Deterministic naming')).toBeInTheDocument();
      });

      // Uncheck the checkbox
      const checkbox = screen.getByLabelText('Deterministic naming');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        deterministicName: false,
      });
    });

    it('displays unchecked state when deterministicName is false', async () => {
      const nonDeterministicOptions: AdvancedOptions = {
        ...defaultOptions,
        deterministicName: false,
      };

      render(
        <AdvancedOptionsSection
          value={nonDeterministicOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const checkbox = screen.getByLabelText('Deterministic naming') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });
    });
  });

  describe('Race Dropdown Population (Task 4.1.3)', () => {
    it('renders race dropdown when expanded', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });
    });

    it('populates dropdown with all races', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const raceSelect = screen.getByLabelText('Race');
        expect(raceSelect).toBeInTheDocument();
      });

      // Check that race options exist
      const raceSelect = screen.getByLabelText('Race');
      fireEvent.click(raceSelect);

      // Should have "Auto (from audio)" + all races
      expect(screen.getByText('Auto (from audio)')).toBeInTheDocument();
      expect(screen.getByText('Human')).toBeInTheDocument();
      expect(screen.getByText('Elf')).toBeInTheDocument();
      expect(screen.getByText('Dwarf')).toBeInTheDocument();
      expect(screen.getByText('Halfling')).toBeInTheDocument();
      expect(screen.getByText('Dragonborn')).toBeInTheDocument();
      expect(screen.getByText('Gnome')).toBeInTheDocument();
      expect(screen.getByText('Half-Elf')).toBeInTheDocument();
      expect(screen.getByText('Half-Orc')).toBeInTheDocument();
      expect(screen.getByText('Tiefling')).toBeInTheDocument();
    });

    it('defaults to "Auto (from audio)" option', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const raceSelect = screen.getByLabelText('Race') as HTMLSelectElement;
        expect(raceSelect.value).toBe('Auto (from audio)');
      });
    });

    it('calls onChange with selected race', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });

      // Select a race
      const raceSelect = screen.getByLabelText('Race');
      fireEvent.change(raceSelect, { target: { value: 'Elf' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        forceRace: 'Elf',
        subrace: undefined, // Should clear subrace when race changes
      });
    });
  });

  describe('Class Dropdown Population (Task 4.1.4)', () => {
    it('renders class dropdown when expanded', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Class')).toBeInTheDocument();
      });
    });

    it('populates dropdown with all classes', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Class')).toBeInTheDocument();
      });

      // Check that class options exist
      const classSelect = screen.getByLabelText('Class');
      fireEvent.click(classSelect);

      // Should have "Auto (from audio)" + all classes
      expect(screen.getByText('Auto (from audio)')).toBeInTheDocument();
      expect(screen.getByText('Barbarian')).toBeInTheDocument();
      expect(screen.getByText('Bard')).toBeInTheDocument();
      expect(screen.getByText('Cleric')).toBeInTheDocument();
      expect(screen.getByText('Druid')).toBeInTheDocument();
      expect(screen.getByText('Fighter')).toBeInTheDocument();
      expect(screen.getByText('Monk')).toBeInTheDocument();
      expect(screen.getByText('Paladin')).toBeInTheDocument();
      expect(screen.getByText('Ranger')).toBeInTheDocument();
      expect(screen.getByText('Rogue')).toBeInTheDocument();
      expect(screen.getByText('Sorcerer')).toBeInTheDocument();
      expect(screen.getByText('Warlock')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
    });

    it('defaults to "Auto (from audio)" option', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
        expect(classSelect.value).toBe('Auto (from audio)');
      });
    });

    it('calls onChange with selected class', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Class')).toBeInTheDocument();
      });

      // Select a class
      const classSelect = screen.getByLabelText('Class');
      fireEvent.change(classSelect, { target: { value: 'Wizard' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultOptions,
        forceClass: 'Wizard',
      });
    });
  });

  describe('Subrace Dropdown Updates (Task 4.1.5)', () => {
    it('does not show subrace dropdown when no race is selected', async () => {
      render(
        <AdvancedOptionsSection
          value={defaultOptions}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });

      // Subrace dropdown should NOT be visible
      expect(screen.queryByLabelText('Subrace')).not.toBeInTheDocument();
    });

    it('does not show subrace dropdown for races without subraces (e.g., Half-Elf)', async () => {
      const optionsWithHalfElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Half-Elf' as Race,
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithHalfElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });

      // Subrace dropdown should NOT be visible for Half-Elf (no subraces)
      expect(screen.queryByLabelText('Subrace')).not.toBeInTheDocument();
    });

    it('shows subrace dropdown when a race with subraces is selected (e.g., Elf)', async () => {
      const optionsWithElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Subrace')).toBeInTheDocument();
      });
    });

    it('populates subrace dropdown with correct options for Elf', async () => {
      const optionsWithElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Subrace')).toBeInTheDocument();
      });

      // Open subrace dropdown and check options
      const subraceSelect = screen.getByLabelText('Subrace');
      fireEvent.click(subraceSelect);

      // Should have Auto, Pure, and Elf subraces
      expect(screen.getByText('Auto (from audio)')).toBeInTheDocument();
      expect(screen.getByText('Pure (no subrace)')).toBeInTheDocument();
      expect(screen.getByText('High Elf')).toBeInTheDocument();
      expect(screen.getByText('Wood Elf')).toBeInTheDocument();
      expect(screen.getByText('Dark Elf (Drow)')).toBeInTheDocument();
    });

    it('updates subrace options when race changes', async () => {
      const optionsWithElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
      };

      const { rerender } = render(
        <AdvancedOptionsSection
          value={optionsWithElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Subrace')).toBeInTheDocument();
      });

      // Verify Elf subraces are shown
      const subraceSelect = screen.getByLabelText('Subrace');
      fireEvent.click(subraceSelect);
      expect(screen.getByText('High Elf')).toBeInTheDocument();

      // Now change to Dwarf
      const optionsWithDwarf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Dwarf' as Race,
      };

      rerender(
        <AdvancedOptionsSection
          value={optionsWithDwarf}
          onChange={mockOnChange}
        />
      );

      await waitFor(() => {
        const subraceSelect = screen.getByLabelText('Subrace');
        fireEvent.click(subraceSelect);
        expect(screen.getByText('Hill Dwarf')).toBeInTheDocument();
        expect(screen.getByText('Mountain Dwarf')).toBeInTheDocument();
      });
    });
  });

  describe('Subrace Selection Requires Race (Task 4.1.6)', () => {
    it('clears subrace when race is cleared (set to Auto)', async () => {
      const optionsWithRaceAndSubrace: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
        subrace: 'High Elf',
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithRaceAndSubrace}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });

      // Set race to Auto
      const raceSelect = screen.getByLabelText('Race');
      fireEvent.change(raceSelect, { target: { value: 'Auto (from audio)' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...optionsWithRaceAndSubrace,
        forceRace: undefined,
        subrace: undefined,
      });
    });

    it('clears subrace when race changes to a different race', async () => {
      const optionsWithRaceAndSubrace: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
        subrace: 'High Elf',
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithRaceAndSubrace}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Race')).toBeInTheDocument();
      });

      // Change race to Dwarf
      const raceSelect = screen.getByLabelText('Race');
      fireEvent.change(raceSelect, { target: { value: 'Dwarf' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...optionsWithRaceAndSubrace,
        forceRace: 'Dwarf',
        subrace: undefined,
      });
    });

    it('allows selecting a subrace when race is already selected', async () => {
      const optionsWithElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Subrace')).toBeInTheDocument();
      });

      // Select a subrace
      const subraceSelect = screen.getByLabelText('Subrace');
      fireEvent.change(subraceSelect, { target: { value: 'High Elf' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...optionsWithElf,
        subrace: 'High Elf',
      });
    });

    it('allows selecting "Pure (no subrace)" option', async () => {
      const optionsWithElf: AdvancedOptions = {
        ...defaultOptions,
        forceRace: 'Elf' as Race,
      };

      render(
        <AdvancedOptionsSection
          value={optionsWithElf}
          onChange={mockOnChange}
        />
      );

      // Expand the section
      const headerButton = screen.getByRole('button', { expanded: false });
      fireEvent.click(headerButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Subrace')).toBeInTheDocument();
      });

      // Select "Pure" option
      const subraceSelect = screen.getByLabelText('Subrace');
      fireEvent.change(subraceSelect, { target: { value: 'pure' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...optionsWithElf,
        subrace: 'pure',
      });
    });
  });
});
