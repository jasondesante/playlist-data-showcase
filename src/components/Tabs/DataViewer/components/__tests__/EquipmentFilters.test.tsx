/**
 * Tests for EquipmentFilters Component
 *
 * Test Coverage:
 * - Renders type, rarity, and tag filter dropdowns
 * - Shows all type options (All, Weapon, Armor, Item)
 * - Shows rarity options from getEquipmentRarities
 * - Shows tag options from getEquipmentTags (only if tags exist)
 * - Calls onTypeFilterChange when type changes
 * - Calls onRarityFilterChange when rarity changes
 * - Calls onTagFilterChange when tag changes
 * - Hides tag filter when no tags available
 * - Displays current filter values correctly
 *
 * Run: npm test -- EquipmentFilters.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EquipmentFilters, type EquipmentTypeFilter } from '../EquipmentFilters';

// ============================================
// HELPERS
// ============================================

/**
 * Get the type select element by finding it within the Type filter group
 */
function getTypeSelect(): HTMLElement {
  const typeLabel = screen.getByText('Type');
  const filterGroup = typeLabel.closest('.dataviewer-filter-group');
  if (!filterGroup) throw new Error('Type filter group not found');
  return within(filterGroup).getByRole('combobox');
}

/**
 * Get the rarity select element by finding it within the Rarity filter group
 */
function getRaritySelect(): HTMLElement {
  const rarityLabel = screen.getByText('Rarity');
  const filterGroup = rarityLabel.closest('.dataviewer-filter-group');
  if (!filterGroup) throw new Error('Rarity filter group not found');
  return within(filterGroup).getByRole('combobox');
}

/**
 * Get the tag select element by finding it within the Tag filter group
 */
function getTagSelect(): HTMLElement | null {
  const tagLabel = screen.queryByText('Tag');
  if (!tagLabel) return null;
  const filterGroup = tagLabel.closest('.dataviewer-filter-group');
  if (!filterGroup) return null;
  return within(filterGroup).queryByRole('combobox');
}

// ============================================
// TEST DATA
// ============================================

const mockRarities = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
const mockTags = ['metal', 'wooden', 'magical', 'cursed'];

// ============================================
// TESTS
// ============================================

describe('EquipmentFilters', () => {
  let onTypeFilterChange: ReturnType<typeof vi.fn>;
  let onRarityFilterChange: ReturnType<typeof vi.fn>;
  let onTagFilterChange: ReturnType<typeof vi.fn>;
  let getEquipmentRarities: ReturnType<typeof vi.fn>;
  let getEquipmentTags: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTypeFilterChange = vi.fn();
    onRarityFilterChange = vi.fn();
    onTagFilterChange = vi.fn();
    getEquipmentRarities = vi.fn(() => mockRarities);
    getEquipmentTags = vi.fn(() => mockTags);
  });

  describe('Rendering', () => {
    it('renders type filter dropdown', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(getTypeSelect()).toBeInTheDocument();
    });

    it('renders rarity filter dropdown', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('Rarity')).toBeInTheDocument();
      expect(getRaritySelect()).toBeInTheDocument();
    });

    it('renders tag filter dropdown when tags exist', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('Tag')).toBeInTheDocument();
      expect(getTagSelect()).toBeInTheDocument();
    });

    it('hides tag filter when no tags available', () => {
      getEquipmentTags.mockReturnValue([]);

      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.queryByText('Tag')).not.toBeInTheDocument();
    });

    it('renders all type options', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('Weapon')).toBeInTheDocument();
      expect(screen.getByText('Armor')).toBeInTheDocument();
      expect(screen.getByText('Item')).toBeInTheDocument();
    });

    it('renders rarity options from getEquipmentRarities (formatted)', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      // Check for formatted rarity names
      expect(screen.getByText('All Rarities')).toBeInTheDocument();
      expect(screen.getByText('Common')).toBeInTheDocument();
      expect(screen.getByText('Uncommon')).toBeInTheDocument();
      expect(screen.getByText('Rare')).toBeInTheDocument();
      expect(screen.getByText('Very Rare')).toBeInTheDocument(); // snake_case formatted
      expect(screen.getByText('Legendary')).toBeInTheDocument();
    });

    it('renders tag options from getEquipmentTags', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('All Tags')).toBeInTheDocument();
      expect(screen.getByText('metal')).toBeInTheDocument();
      expect(screen.getByText('wooden')).toBeInTheDocument();
      expect(screen.getByText('magical')).toBeInTheDocument();
      expect(screen.getByText('cursed')).toBeInTheDocument();
    });
  });

  describe('Current Values', () => {
    it('displays current type filter value', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="weapon"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const typeSelect = getTypeSelect();
      expect(typeSelect).toHaveValue('weapon');
    });

    it('displays current rarity filter value', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="rare"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const raritySelect = getRaritySelect();
      expect(raritySelect).toHaveValue('rare');
    });

    it('displays current tag filter value', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="magical"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const tagSelect = getTagSelect();
      expect(tagSelect).toHaveValue('magical');
    });
  });

  describe('Interactions', () => {
    it('calls onTypeFilterChange when type option is selected', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const typeSelect = getTypeSelect();
      fireEvent.change(typeSelect, { target: { value: 'armor' } });

      expect(onTypeFilterChange).toHaveBeenCalledTimes(1);
      expect(onTypeFilterChange).toHaveBeenCalledWith('armor');
    });

    it('calls onTypeFilterChange with all types correctly', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const typeSelect = getTypeSelect();
      const types: EquipmentTypeFilter[] = ['all', 'weapon', 'armor', 'item'];

      types.forEach(type => {
        fireEvent.change(typeSelect, { target: { value: type } });
      });

      expect(onTypeFilterChange).toHaveBeenCalledTimes(4);
      types.forEach(type => {
        expect(onTypeFilterChange).toHaveBeenCalledWith(type);
      });
    });

    it('calls onRarityFilterChange when rarity option is selected', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const raritySelect = getRaritySelect();
      fireEvent.change(raritySelect, { target: { value: 'legendary' } });

      expect(onRarityFilterChange).toHaveBeenCalledTimes(1);
      expect(onRarityFilterChange).toHaveBeenCalledWith('legendary');
    });

    it('calls onTagFilterChange when tag option is selected', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const tagSelect = getTagSelect();
      if (tagSelect) {
        fireEvent.change(tagSelect, { target: { value: 'cursed' } });
      }

      expect(onTagFilterChange).toHaveBeenCalledTimes(1);
      expect(onTagFilterChange).toHaveBeenCalledWith('cursed');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all dropdowns', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Rarity')).toBeInTheDocument();
      expect(screen.getByText('Tag')).toBeInTheDocument();
    });

    it('uses select elements for filters', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      const typeSelect = getTypeSelect();
      const raritySelect = getRaritySelect();
      const tagSelect = getTagSelect();

      expect(typeSelect.tagName).toBe('SELECT');
      expect(raritySelect.tagName).toBe('SELECT');
      expect(tagSelect?.tagName).toBe('SELECT');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty rarities list', () => {
      getEquipmentRarities.mockReturnValue([]);

      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      // Should still show "All Rarities" option
      expect(screen.getByText('All Rarities')).toBeInTheDocument();
    });

    it('handles empty tags list', () => {
      getEquipmentTags.mockReturnValue([]);

      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      // Tag filter should be hidden
      expect(screen.queryByText('Tag')).not.toBeInTheDocument();
    });

    it('calls getEquipmentRarities and getEquipmentTags on render', () => {
      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      expect(getEquipmentRarities).toHaveBeenCalled();
      expect(getEquipmentTags).toHaveBeenCalled();
    });

    it('handles snake_case rarity formatting correctly', () => {
      getEquipmentRarities.mockReturnValue(['very_rare', 'super_rare']);

      render(
        <EquipmentFilters
          equipmentTypeFilter="all"
          onTypeFilterChange={onTypeFilterChange}
          equipmentRarityFilter="all"
          onRarityFilterChange={onRarityFilterChange}
          equipmentTagFilter="all"
          onTagFilterChange={onTagFilterChange}
          getEquipmentRarities={getEquipmentRarities}
          getEquipmentTags={getEquipmentTags}
        />
      );

      // snake_case should be formatted to Title Case with spaces
      expect(screen.getByText('Very Rare')).toBeInTheDocument();
      expect(screen.getByText('Super Rare')).toBeInTheDocument();
    });
  });
});
