/**
 * EquipmentBrowser Component
 *
 * Searchable category browser for selecting equipment items to inject
 * into generated characters. Created as part of Task 3.1 of
 * CHARACTER_GEN_ENHANCEMENT_PLAN.md.
 *
 * Features:
 * - Search input with debounced filtering
 * - Scrollable item list with rarity-colored cards
 * - Add/Remove buttons for selection
 * - Type-based category filtering (weapon/armor/item)
 * - Pure CSS styling (no Tailwind)
 */

import '../../styles/components/EquipmentBrowser.css';
import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, X, Sword, Shield, Package, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDebounce } from '../../hooks/useDebounce';
import {
  ExtensionManager,
  DEFAULT_EQUIPMENT,
  type EnhancedEquipment
} from 'playlist-data-engine';

/**
 * Equipment category type
 */
export type EquipmentCategory = 'weapon' | 'armor' | 'item';

/**
 * Rarity color mapping for equipment display
 */
const RARITY_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50%)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};

/**
 * Rarity background colors for item cards
 */
const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.1)',
  'uncommon': 'hsl(120 60% 40% / 0.1)',
  'rare': 'hsl(210 80% 50% / 0.1)',
  'very_rare': 'hsl(270 60% 50% / 0.1)',
  'legendary': 'hsl(30 90% 50% / 0.15)'
};

/**
 * Rarity border colors for item cards
 */
const RARITY_BORDER_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.3)',
  'uncommon': 'hsl(120 60% 40% / 0.4)',
  'rare': 'hsl(210 80% 50% / 0.4)',
  'very_rare': 'hsl(270 60% 50% / 0.4)',
  'legendary': 'hsl(30 90% 50% / 0.5)'
};

/**
 * Get icon for equipment type
 */
function getEquipmentTypeIcon(type: string) {
  switch (type) {
    case 'weapon':
      return Sword;
    case 'armor':
      return Shield;
    default:
      return Package;
  }
}

/**
 * Format rarity for display (snake_case to Title Case)
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface EquipmentBrowserProps {
  /** Category of equipment to display */
  category: EquipmentCategory;
  /** Callback when an item is selected (added) */
  onSelect: (item: EnhancedEquipment) => void;
  /** Callback when an item is deselected (removed) */
  onDeselect: (item: EnhancedEquipment) => void;
  /** Array of currently selected items */
  selectedItems: EnhancedEquipment[];
  /** Optional additional CSS classes */
  className?: string;
  /** Optional max height for the scrollable list */
  maxHeight?: string;
}

export function EquipmentBrowser({
  category,
  onSelect,
  onDeselect,
  selectedItems,
  className,
  maxHeight = '300px'
}: EquipmentBrowserProps) {
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get all available equipment for this category
  const allEquipment = useMemo(() => {
    try {
      const extensionManager = ExtensionManager.getInstance();
      const registeredEquipment = extensionManager.get('equipment') as EnhancedEquipment[];

      if (registeredEquipment && registeredEquipment.length > 0) {
        return registeredEquipment;
      }

      // Fallback to DEFAULT_EQUIPMENT
      return Object.values(DEFAULT_EQUIPMENT);
    } catch {
      // Fallback to DEFAULT_EQUIPMENT on error
      return Object.values(DEFAULT_EQUIPMENT);
    }
  }, []);

  // Filter equipment by category
  const categoryEquipment = useMemo(() => {
    return allEquipment.filter(item => item.type === category);
  }, [allEquipment, category]);

  // Filter equipment by search query
  const filteredEquipment = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return categoryEquipment;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return categoryEquipment.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.rarity.toLowerCase().includes(query) ||
      (item.damage?.damageType?.toLowerCase().includes(query))
    );
  }, [categoryEquipment, debouncedSearchQuery]);

  // Sort by name
  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEquipment]);

  // Check if an item is selected
  const isSelected = useCallback((item: EnhancedEquipment) => {
    return selectedItems.some(selected => selected.name === item.name);
  }, [selectedItems]);

  // Handle toggle selection
  const handleToggle = (item: EnhancedEquipment) => {
    if (isSelected(item)) {
      onDeselect(item);
    } else {
      onSelect(item);
    }
  };

  // Get category icon
  const CategoryIcon = getEquipmentTypeIcon(category);

  // Get category label
  const categoryLabel = category === 'weapon' ? 'Weapons' : category === 'armor' ? 'Armor' : 'Items';

  return (
    <div className={cn('equipment-browser', className)} role="region" aria-label={`${categoryLabel} browser`}>
      {/* Header with category icon and count */}
      <div className="equipment-browser-header">
        <div className="equipment-browser-header-left">
          <CategoryIcon className="equipment-browser-category-icon" size={16} aria-hidden="true" />
          <span className="equipment-browser-category-label">{categoryLabel}</span>
        </div>
        <span className="equipment-browser-count" aria-live="polite">
          {filteredEquipment.length} items
          {selectedItems.filter(s => s.type === category).length > 0 && (
            <span className="equipment-browser-selected-count">
              {' '}({selectedItems.filter(s => s.type === category).length} selected)
            </span>
          )}
        </span>
      </div>

      {/* Search input */}
      <div className="equipment-browser-search">
        <Search className="equipment-browser-search-icon" size={14} aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${categoryLabel.toLowerCase()}...`}
          className="equipment-browser-search-input"
          aria-label={`Search ${categoryLabel.toLowerCase()}`}
        />
        {searchQuery && (
          <button
            type="button"
            className="equipment-browser-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Scrollable item list */}
      <div
        className="equipment-browser-list"
        style={{ maxHeight }}
      >
        {sortedEquipment.length === 0 ? (
          <div className="equipment-browser-empty">
            <AlertCircle size={20} className="equipment-browser-empty-icon" />
            <span className="equipment-browser-empty-text">
              {debouncedSearchQuery
                ? `No ${categoryLabel.toLowerCase()} match "${debouncedSearchQuery}"`
                : `No ${categoryLabel.toLowerCase()} available`}
            </span>
          </div>
        ) : (
          sortedEquipment.map((item) => {
            const selected = isSelected(item);
            const rarity = item.rarity || 'common';
            const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
            const rarityBg = RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common;
            const rarityBorder = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;

            return (
              <div
                key={item.name}
                className={cn(
                  'equipment-browser-item',
                  selected && 'equipment-browser-item-selected'
                )}
                style={{
                  backgroundColor: rarityBg,
                  borderColor: rarityBorder,
                  '--rarity-color': rarityColor
                } as React.CSSProperties}
              >
                {/* Item info */}
                <div className="equipment-browser-item-info">
                  <span
                    className="equipment-browser-item-name"
                    style={{ color: rarityColor }}
                  >
                    {item.name}
                  </span>
                  <div className="equipment-browser-item-details">
                    <span className="equipment-browser-item-rarity">
                      {formatRarity(rarity)}
                    </span>
                    {item.damage && (
                      <span className="equipment-browser-item-damage">
                        {item.damage.dice} {item.damage.damageType}
                      </span>
                    )}
                    {item.acBonus !== undefined && (
                      <span className="equipment-browser-item-ac">
                        AC +{item.acBonus}
                      </span>
                    )}
                    {item.weight !== undefined && (
                      <span className="equipment-browser-item-weight">
                        {item.weight} lb
                      </span>
                    )}
                  </div>
                </div>

                {/* Add/Remove button */}
                <button
                  type="button"
                  className={cn(
                    'equipment-browser-item-button',
                    selected ? 'equipment-browser-item-button-remove' : 'equipment-browser-item-button-add'
                  )}
                  onClick={() => handleToggle(item)}
                  aria-label={selected ? `Remove ${item.name}` : `Add ${item.name}`}
                  aria-pressed={selected}
                >
                  {selected ? (
                    <X size={14} aria-hidden="true" />
                  ) : (
                    <Plus size={14} aria-hidden="true" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EquipmentBrowser;
