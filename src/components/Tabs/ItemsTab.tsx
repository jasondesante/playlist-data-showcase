/**
 * ItemsTab Component
 *
 * Displays and manages the current hero's equipment.
 * Features three main sections:
 * 1. Current Hero's Equipment - View and manage equipped items
 * 2. Loot Box Demo - Spawn random items via different methods
 * 3. Custom Item Creator - Create and add custom items to the hero
 */

import { useState, useMemo } from 'react';
import {
  Backpack,
  Package,
  Sword,
  Shield,
  Sparkles,
  Trash2,
  Check,
  X,
  Target,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react';
import { useHeroEquipment } from '../../hooks/useHeroEquipment';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { showToast } from '../ui/Toast';
import type { EnhancedInventoryItem } from 'playlist-data-engine';
import './ItemsTab.css';

/**
 * Ammunition types and their per-item weights (in pounds)
 * Following the Migration Guide format: individual items with quantity
 */
const AMMUNITION_TYPES: Record<string, number> = {
  'Arrow': 0.05,
  'Bolt': 0.075
};

// RARITY_COLORS will be used in future enhancements for rarity-based coloring
// const RARITY_COLORS: Record<string, string> = {
//   'common': 'var(--color-text-secondary)',
//   'uncommon': 'hsl(120 60% 40%)',
//   'rare': 'hsl(210 80% 50%)',
//   'very_rare': 'hsl(270 60% 50%)',
//   'legendary': 'hsl(30 90% 50%)'
// };

/**
 * Check if an item is ammunition
 */
function isAmmunition(itemName: string): boolean {
  return itemName in AMMUNITION_TYPES;
}

/**
 * Get the per-item weight for ammunition
 */
function getAmmunitionWeight(itemName: string): number | null {
  return AMMUNITION_TYPES[itemName] ?? null;
}

/**
 * Format item name with quantity for display
 */
function formatItemDisplay(item: EnhancedInventoryItem): string {
  if (item.quantity && item.quantity > 1) {
    return `${item.name} ×${item.quantity}`;
  }
  return item.name;
}

/**
 * Get ammunition weight display string
 */
function getAmmunitionWeightDisplay(item: EnhancedInventoryItem): string {
  const perItemWeight = getAmmunitionWeight(item.name);
  if (perItemWeight && item.quantity) {
    const totalWeight = perItemWeight * item.quantity;
    return `${totalWeight.toFixed(2)} lb`;
  }
  return '';
}

export function ItemsTab() {
  // Use the hero equipment hook for all equipment operations
  const {
    activeCharacter,
    isLoading,
    equipItem,
    unequipItem,
    removeItem,
    getTotalWeight,
    getEquippedWeight,
    getEquipmentByCategory
  } = useHeroEquipment();

  // Section collapse states
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(true);
  const [isLootBoxExpanded, setIsLootBoxExpanded] = useState(false);
  const [isCreatorExpanded, setIsCreatorExpanded] = useState(false);

  // Get equipment grouped by category
  const equipment = useMemo(() => {
    return getEquipmentByCategory();
  }, [getEquipmentByCategory, activeCharacter?.equipment]);

  // Handle equip/unequip toggle
  const handleEquipToggle = async (item: EnhancedInventoryItem) => {
    if (!activeCharacter) {
      showToast('No character selected', 'error');
      return;
    }

    if (!item.instanceId) {
      showToast('Item has no instance ID', 'error');
      return;
    }

    const result = item.equipped
      ? await unequipItem(item.instanceId)
      : await equipItem(item.instanceId);

    if (result.success) {
      showToast(result.message || 'Success', 'success');
    } else {
      showToast(result.error || 'Operation failed', 'error');
    }
  };

  // Handle item removal
  const handleRemoveItem = async (item: EnhancedInventoryItem, category: 'weapons' | 'armor' | 'items') => {
    if (!activeCharacter || !item.instanceId) return;

    const result = await removeItem(item.instanceId, category);

    if (result.success) {
      showToast(result.message || 'Item removed', 'success');
    } else {
      showToast(result.error || 'Failed to remove item', 'error');
    }
  };

  // Render an individual equipment item
  const renderEquipmentItem = (
    item: EnhancedInventoryItem,
    category: 'weapons' | 'armor' | 'items'
  ) => {
    const isAmmo = isAmmunition(item.name);
    const weightDisplay = isAmmo
      ? getAmmunitionWeightDisplay(item)
      : null;

    return (
      <div
        key={item.instanceId}
        className={`items-equipment-item ${item.equipped ? 'items-equipment-item-equipped' : ''} ${isAmmo ? 'items-equipment-item-ammunition' : ''}`}
      >
        <div className="items-equipment-item-content">
          {isAmmo && <Target className="items-equipment-ammo-icon" size={16} />}
          {item.equipped && !isAmmo && <Check className="items-equipment-checkmark" size={16} />}

          <span className="items-equipment-name">
            {formatItemDisplay(item)}
          </span>

          {weightDisplay && (
            <span
              className="items-equipment-ammo-weight"
              title={`${getAmmunitionWeight(item.name)} lb each × ${item.quantity} = ${weightDisplay} total`}
            >
              ({weightDisplay})
            </span>
          )}

          {item.equipped && (
            <span className="items-equipment-badge">Equipped</span>
          )}
        </div>

        <div className="items-equipment-actions">
          <Button
            variant={item.equipped ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleEquipToggle(item)}
            isLoading={isLoading}
            leftIcon={item.equipped ? X : Check}
          >
            {item.equipped ? 'Unequip' : 'Equip'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveItem(item, category)}
            isLoading={isLoading}
            leftIcon={Trash2}
            className="items-equipment-remove-btn"
          >
            Drop
          </Button>
        </div>
      </div>
    );
  };

  // Render equipment category section
  const renderEquipmentCategory = (
    title: string,
    icon: React.ReactNode,
    items: EnhancedInventoryItem[],
    category: 'weapons' | 'armor' | 'items'
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="items-equipment-category">
        <div className="items-equipment-category-header">
          {icon}
          <span className="items-equipment-category-label">{title}</span>
          <span className="items-equipment-category-count">({items.length})</span>
        </div>
        <div className="items-equipment-items">
          {items.map(item => renderEquipmentItem(item, category))}
        </div>
      </div>
    );
  };

  // Render empty state when no character is selected
  const renderNoCharacterState = () => (
    <div className="items-empty-state">
      <div className="items-empty-icon-wrapper">
        <User className="items-empty-icon" size={48} />
      </div>
      <h3 className="items-empty-title">No Character Selected</h3>
      <p className="items-empty-description">
        Select a character from the Party tab or generate a new character to manage their equipment.
      </p>
    </div>
  );

  // Render empty equipment state
  const renderEmptyEquipmentState = () => (
    <div className="items-empty-equipment">
      <Package className="items-empty-equipment-icon" size={32} />
      <p className="items-empty-equipment-text">No equipment</p>
    </div>
  );

  return (
    <div className="items-tab">
      {/* Header */}
      <div className="items-header">
        <div className="items-header-icon">
          <Backpack size={24} />
        </div>
        <div className="items-header-text">
          <h2 className="items-header-title">Items</h2>
          <p className="items-header-subtitle">
            {activeCharacter
              ? `Managing equipment for ${activeCharacter.name}`
              : 'Manage your hero\'s equipment, spawn loot, and create custom items'}
          </p>
        </div>
      </div>

      {!activeCharacter ? (
        renderNoCharacterState()
      ) : (
        <>
          {/* Current Hero's Equipment Section */}
          <Card className="items-section">
            <CardHeader
              className="items-section-header"
              onClick={() => setIsEquipmentExpanded(!isEquipmentExpanded)}
            >
              <div className="items-section-header-content">
                <Package className="items-section-icon" size={20} />
                <div className="items-section-header-text">
                  <CardTitle className="items-section-title">Current Hero's Equipment</CardTitle>
                  <CardDescription className="items-section-description">
                    {activeCharacter.name} • Level {activeCharacter.level} {activeCharacter.class}
                  </CardDescription>
                </div>
              </div>
              <div className="items-section-header-right">
                <div className="items-weight-summary">
                  <span className="items-weight-label">
                    {getEquippedWeight().toFixed(1)} / {getTotalWeight().toFixed(1)} lb
                  </span>
                </div>
                {isEquipmentExpanded ? (
                  <ChevronUp className="items-section-chevron" size={20} />
                ) : (
                  <ChevronDown className="items-section-chevron" size={20} />
                )}
              </div>
            </CardHeader>

            {isEquipmentExpanded && (
              <div className="items-section-content">
                {/* Weapons */}
                {renderEquipmentCategory(
                  'Weapons',
                  <Sword className="items-category-icon" size={16} />,
                  equipment.weapons,
                  'weapons'
                )}

                {/* Armor */}
                {renderEquipmentCategory(
                  'Armor',
                  <Shield className="items-category-icon" size={16} />,
                  equipment.armor,
                  'armor'
                )}

                {/* Items */}
                {renderEquipmentCategory(
                  'Items',
                  <Package className="items-category-icon" size={16} />,
                  equipment.items,
                  'items'
                )}

                {/* Empty state */}
                {equipment.weapons.length === 0 &&
                  equipment.armor.length === 0 &&
                  equipment.items.length === 0 &&
                  renderEmptyEquipmentState()}

                {/* Weight summary footer */}
                {(equipment.weapons.length > 0 ||
                  equipment.armor.length > 0 ||
                  equipment.items.length > 0) && (
                  <div className="items-weight-footer">
                    <div className="items-weight-stat">
                      <span className="items-weight-stat-label">Total Weight:</span>
                      <span className="items-weight-stat-value">{getTotalWeight().toFixed(1)} lb</span>
                    </div>
                    <div className="items-weight-stat">
                      <span className="items-weight-stat-label">Equipped Weight:</span>
                      <span className="items-weight-stat-value">{getEquippedWeight().toFixed(1)} lb</span>
                    </div>
                    <div className="items-weight-stat">
                      <span className="items-weight-stat-label">Carried Weight:</span>
                      <span className="items-weight-stat-value">
                        {(getTotalWeight() - getEquippedWeight()).toFixed(1)} lb
                      </span>
                    </div>
                  </div>
                )}

                {/* Raw JSON Dump */}
                <div className="items-json-dump">
                  <RawJsonDump
                    data={activeCharacter.equipment}
                    title="Equipment Data (Raw)"
                    defaultOpen={false}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Loot Box Demo Section */}
          <Card className="items-section items-section-lootbox">
            <CardHeader
              className="items-section-header"
              onClick={() => setIsLootBoxExpanded(!isLootBoxExpanded)}
            >
              <div className="items-section-header-content">
                <Sparkles className="items-section-icon items-section-icon-lootbox" size={20} />
                <div className="items-section-header-text">
                  <CardTitle className="items-section-title">Loot Box Demo</CardTitle>
                  <CardDescription className="items-section-description">
                    Spawn random items and treasure hoards
                  </CardDescription>
                </div>
              </div>
              {isLootBoxExpanded ? (
                <ChevronUp className="items-section-chevron" size={20} />
              ) : (
                <ChevronDown className="items-section-chevron" size={20} />
              )}
            </CardHeader>

            {isLootBoxExpanded && (
              <div className="items-section-content items-lootbox-placeholder">
                <div className="items-placeholder-content">
                  <Sparkles className="items-placeholder-icon" size={32} />
                  <p className="items-placeholder-text">Loot Box Demo coming in Task 3.x</p>
                  <p className="items-placeholder-subtext">
                    This section will allow you to spawn random items, treasure hoards, and rarity-based loot.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Custom Item Creator Section */}
          <Card className="items-section items-section-creator">
            <CardHeader
              className="items-section-header"
              onClick={() => setIsCreatorExpanded(!isCreatorExpanded)}
            >
              <div className="items-section-header-content">
                <Package className="items-section-icon items-section-icon-creator" size={20} />
                <div className="items-section-header-text">
                  <CardTitle className="items-section-title">Custom Item Creator</CardTitle>
                  <CardDescription className="items-section-description">
                    Create and add custom items to your hero
                  </CardDescription>
                </div>
              </div>
              {isCreatorExpanded ? (
                <ChevronUp className="items-section-chevron" size={20} />
              ) : (
                <ChevronDown className="items-section-chevron" size={20} />
              )}
            </CardHeader>

            {isCreatorExpanded && (
              <div className="items-section-content items-creator-placeholder">
                <div className="items-placeholder-content">
                  <Package className="items-placeholder-icon" size={32} />
                  <p className="items-placeholder-text">Item Creator coming in Task 4.x</p>
                  <p className="items-placeholder-subtext">
                    This section will allow you to create custom items with custom properties and add them to your character.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default ItemsTab;
