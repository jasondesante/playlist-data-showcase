/**
 * Tests for SpellFilters Component
 *
 * Test Coverage:
 * - Renders level and school filter dropdowns
 * - Shows all level options (Cantrip through 9th)
 * - Shows school options from getSpellSchools
 * - Calls onLevelFilterChange when level changes
 * - Calls onSchoolFilterChange when school changes
 * - Displays current filter values correctly
 *
 * Run: npm test -- SpellFilters.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SpellFilters } from '../SpellFilters';

// ============================================
// HELPERS
// ============================================

/**
 * Get the level select element by finding it within the Level filter group
 */
function getLevelSelect(): HTMLElement {
  const levelLabel = screen.getByText('Level');
  const filterGroup = levelLabel.closest('.dataviewer-filter-group');
  if (!filterGroup) throw new Error('Level filter group not found');
  return within(filterGroup).getByRole('combobox');
}

/**
 * Get the school select element by finding it within the School filter group
 */
function getSchoolSelect(): HTMLElement {
  const schoolLabel = screen.getByText('School');
  const filterGroup = schoolLabel.closest('.dataviewer-filter-group');
  if (!filterGroup) throw new Error('School filter group not found');
  return within(filterGroup).getByRole('combobox');
}

// ============================================
// TEST DATA
// ============================================

const mockSchools = ['Evocation', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Illusion', 'Necromancy', 'Transmutation'];

// ============================================
// TESTS
// ============================================

describe('SpellFilters', () => {
  let onLevelFilterChange: ReturnType<typeof vi.fn>;
  let onSchoolFilterChange: ReturnType<typeof vi.fn>;
  let getSpellSchools: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLevelFilterChange = vi.fn();
    onSchoolFilterChange = vi.fn();
    getSpellSchools = vi.fn(() => mockSchools);
  });

  describe('Rendering', () => {
    it('renders level filter dropdown', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      expect(screen.getByText('Level')).toBeInTheDocument();
      expect(getLevelSelect()).toBeInTheDocument();
    });

    it('renders school filter dropdown', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      expect(screen.getByText('School')).toBeInTheDocument();
      expect(getSchoolSelect()).toBeInTheDocument();
    });

    it('renders all level options', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      // Check for all level options
      expect(screen.getByText('All Levels')).toBeInTheDocument();
      expect(screen.getByText('Cantrip')).toBeInTheDocument();
      expect(screen.getByText('1st Level')).toBeInTheDocument();
      expect(screen.getByText('2nd Level')).toBeInTheDocument();
      expect(screen.getByText('3rd Level')).toBeInTheDocument();
      expect(screen.getByText('4th Level')).toBeInTheDocument();
      expect(screen.getByText('5th Level')).toBeInTheDocument();
      expect(screen.getByText('6th Level')).toBeInTheDocument();
      expect(screen.getByText('7th Level')).toBeInTheDocument();
      expect(screen.getByText('8th Level')).toBeInTheDocument();
      expect(screen.getByText('9th Level')).toBeInTheDocument();
    });

    it('renders school options from getSpellSchools', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      // Check for school options
      expect(screen.getByText('All Schools')).toBeInTheDocument();
      expect(screen.getByText('Evocation')).toBeInTheDocument();
      expect(screen.getByText('Abjuration')).toBeInTheDocument();
      expect(screen.getByText('Conjuration')).toBeInTheDocument();
      expect(screen.getByText('Divination')).toBeInTheDocument();
      expect(screen.getByText('Enchantment')).toBeInTheDocument();
      expect(screen.getByText('Illusion')).toBeInTheDocument();
      expect(screen.getByText('Necromancy')).toBeInTheDocument();
      expect(screen.getByText('Transmutation')).toBeInTheDocument();
    });

    it('handles empty school list', () => {
      getSpellSchools.mockReturnValue([]);

      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      // Should still show "All Schools" option
      expect(screen.getByText('All Schools')).toBeInTheDocument();
    });
  });

  describe('Current Values', () => {
    it('displays current level filter value', () => {
      render(
        <SpellFilters
          spellLevelFilter={3}
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      expect(levelSelect).toHaveValue('3');
    });

    it('displays "all" level filter value', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      expect(levelSelect).toHaveValue('all');
    });

    it('displays current school filter value', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="Evocation"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const schoolSelect = getSchoolSelect();
      expect(schoolSelect).toHaveValue('Evocation');
    });

    it('displays "all" school filter value', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const schoolSelect = getSchoolSelect();
      expect(schoolSelect).toHaveValue('all');
    });
  });

  describe('Interactions', () => {
    it('calls onLevelFilterChange with number when level option is selected', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      fireEvent.change(levelSelect, { target: { value: '3' } });

      expect(onLevelFilterChange).toHaveBeenCalledTimes(1);
      expect(onLevelFilterChange).toHaveBeenCalledWith(3);
    });

    it('calls onLevelFilterChange with "all" when All Levels is selected', () => {
      render(
        <SpellFilters
          spellLevelFilter={5}
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      fireEvent.change(levelSelect, { target: { value: 'all' } });

      expect(onLevelFilterChange).toHaveBeenCalledTimes(1);
      expect(onLevelFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onLevelFilterChange correctly for cantrip (0)', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      fireEvent.change(levelSelect, { target: { value: '0' } });

      expect(onLevelFilterChange).toHaveBeenCalledWith(0);
    });

    it('calls onSchoolFilterChange when school option is selected', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const schoolSelect = getSchoolSelect();
      fireEvent.change(schoolSelect, { target: { value: 'Necromancy' } });

      expect(onSchoolFilterChange).toHaveBeenCalledTimes(1);
      expect(onSchoolFilterChange).toHaveBeenCalledWith('Necromancy');
    });

    it('calls onSchoolFilterChange with "all" when All Schools is selected', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="Evocation"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const schoolSelect = getSchoolSelect();
      fireEvent.change(schoolSelect, { target: { value: 'all' } });

      expect(onSchoolFilterChange).toHaveBeenCalledTimes(1);
      expect(onSchoolFilterChange).toHaveBeenCalledWith('all');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for dropdowns', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      expect(screen.getByText('Level')).toBeInTheDocument();
      expect(screen.getByText('School')).toBeInTheDocument();
    });

    it('uses select elements for filters', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      const levelSelect = getLevelSelect();
      const schoolSelect = getSchoolSelect();

      expect(levelSelect.tagName).toBe('SELECT');
      expect(schoolSelect.tagName).toBe('SELECT');
    });
  });

  describe('Edge Cases', () => {
    it('handles school with special characters', () => {
      getSpellSchools.mockReturnValue(['School of Magic', 'Another-School']);

      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      expect(screen.getByText('School of Magic')).toBeInTheDocument();
      expect(screen.getByText('Another-School')).toBeInTheDocument();
    });

    it('calls getSpellSchools on render', () => {
      render(
        <SpellFilters
          spellLevelFilter="all"
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter="all"
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

      expect(getSpellSchools).toHaveBeenCalled();
    });
  });
});
