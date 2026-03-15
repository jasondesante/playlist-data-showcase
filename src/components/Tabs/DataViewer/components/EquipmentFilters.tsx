/**
 * EquipmentFilters Component
 *
 * Renders filter controls for equipment (type, rarity, and tag filters).
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.9
 */

import { formatRarity } from '../utils';

/** Equipment type filter options */
export type EquipmentTypeFilter = 'weapon' | 'armor' | 'item' | 'all';

/**
 * Props for the EquipmentFilters component
 */
export interface EquipmentFiltersProps {
  /** Current equipment type filter value */
  equipmentTypeFilter: EquipmentTypeFilter;
  /** Handler called when type filter changes */
  onTypeFilterChange: (type: EquipmentTypeFilter) => void;
  /** Current equipment rarity filter value */
  equipmentRarityFilter: string | 'all';
  /** Handler called when rarity filter changes */
  onRarityFilterChange: (rarity: string | 'all') => void;
  /** Current equipment tag filter value */
  equipmentTagFilter: string | 'all';
  /** Handler called when tag filter changes */
  onTagFilterChange: (tag: string | 'all') => void;
  /** Function to get available equipment rarities */
  getEquipmentRarities: () => string[];
  /** Function to get available equipment tags */
  getEquipmentTags: () => string[];
}

/**
 * EquipmentFilters - Renders filter controls for equipment type, rarity, and tags
 */
export function EquipmentFilters({
  equipmentTypeFilter,
  onTypeFilterChange,
  equipmentRarityFilter,
  onRarityFilterChange,
  equipmentTagFilter,
  onTagFilterChange,
  getEquipmentRarities,
  getEquipmentTags
}: EquipmentFiltersProps) {
  const availableTags = getEquipmentTags();

  return (
    <div className="dataviewer-filters">
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">Type</label>
        <select
          value={equipmentTypeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as EquipmentTypeFilter)}
          className="dataviewer-filter-select"
        >
          <option value="all">All Types</option>
          <option value="weapon">Weapon</option>
          <option value="armor">Armor</option>
          <option value="item">Item</option>
        </select>
      </div>
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">Rarity</label>
        <select
          value={equipmentRarityFilter}
          onChange={(e) => onRarityFilterChange(e.target.value)}
          className="dataviewer-filter-select"
        >
          <option value="all">All Rarities</option>
          {getEquipmentRarities().map(rarity => (
            <option key={rarity} value={rarity}>{formatRarity(rarity)}</option>
          ))}
        </select>
      </div>
      {/* Tags Filter Dropdown */}
      {availableTags.length > 0 && (
        <div className="dataviewer-filter-group">
          <label className="dataviewer-filter-label">Tag</label>
          <select
            value={equipmentTagFilter}
            onChange={(e) => onTagFilterChange(e.target.value)}
            className="dataviewer-filter-select"
          >
            <option value="all">All Tags</option>
            {availableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
