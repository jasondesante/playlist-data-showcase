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
  User,
  Dices,
  Gem,
  Crown,
  Plus,
  PlusCircle,
  Trash,
  Loader2
} from 'lucide-react';
import { useHeroEquipment } from '../../hooks/useHeroEquipment';
import { useLootBox } from '../../hooks/useLootBox';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { showToast } from '../ui/Toast';
import type { EnhancedInventoryItem, EnhancedEquipment } from 'playlist-data-engine';
import './ItemsTab.css';

/**
 * Ammunition types and their per-item weights (in pounds)
 * Following the Migration Guide format: individual items with quantity
 */
const AMMUNITION_TYPES: Record<string, number> = {
  'Arrow': 0.05,
  'Bolt': 0.075
};

/**
 * Rarity color mapping for equipment display
 */
const RARITY_COLORS: Record<string, string> = {
  'common': 'var(--color-text-secondary)',
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

type SpawnMode = 'random' | 'rarity' | 'hoard';
type RarityOption = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';

/**
 * Format rarity for display (snake_case to Title Case)
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
    getEquipmentByCategory,
    addItemToInventory
  } = useHeroEquipment();

  // Use the loot box hook for spawning items
  const {
    isLoading: isLootBoxLoading,
    spawnedItems,
    lastHoardResult,
    spawnRandomItems,
    spawnByRarity,
    spawnTreasureHoard,
    clearSpawnedItems
  } = useLootBox();

  // Section collapse states
  const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(true);
  const [isLootBoxExpanded, setIsLootBoxExpanded] = useState(false);
  const [isCreatorExpanded, setIsCreatorExpanded] = useState(false);

  // Loot Box state
  const [spawnMode, setSpawnMode] = useState<SpawnMode>('random');
  const [randomCount, setRandomCount] = useState(3);
  const [selectedRarity, setSelectedRarity] = useState<RarityOption>('rare');
  const [rarityCount, setRarityCount] = useState(3);
  const [hoardCR, setHoardCR] = useState(5);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Handle spawning random items
  const handleSpawnRandom = async () => {
    setIsAnimating(true);
    const result = await spawnRandomItems(randomCount);
    setIsAnimating(false);

    if (result.items.length > 0) {
      showToast(`Spawned ${result.items.length} random items!`, 'success');
    } else {
      showToast('Failed to spawn items', 'error');
    }
  };

  // Handle spawning by rarity
  const handleSpawnByRarity = async () => {
    setIsAnimating(true);
    const result = await spawnByRarity(selectedRarity, rarityCount);
    setIsAnimating(false);

    if (result.items.length > 0) {
      showToast(`Spawned ${result.items.length} ${formatRarity(selectedRarity)} items!`, 'success');
    } else {
      showToast('Failed to spawn items', 'error');
    }
  };

  // Handle spawning treasure hoard
  const handleSpawnTreasureHoard = async () => {
    setIsAnimating(true);
    const result = await spawnTreasureHoard(hoardCR);
    setIsAnimating(false);

    if (result.items.length > 0) {
      showToast(`Spawned treasure hoard worth ${result.totalValue} gp!`, 'success');
    } else {
      showToast('Failed to spawn treasure hoard', 'error');
    }
  };

  // Handle adding a spawned item to the hero
  const handleAddToHero = async (item: EnhancedEquipment) => {
    if (!activeCharacter) {
      showToast('No character selected', 'error');
      return;
    }

    const inventoryItem: EnhancedInventoryItem = {
      name: item.name,
      quantity: 1,
      equipped: false,
      instanceId: `${item.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const result = await addItemToInventory(inventoryItem, item, false);

    if (result.success) {
      showToast(`Added ${item.name} to ${activeCharacter.name}`, 'success');
    } else {
      showToast(result.error || 'Failed to add item', 'error');
    }
  };

  // Handle adding all spawned items to the hero
  const handleAddAllToHero = async () => {
    if (!activeCharacter) {
      showToast('No character selected', 'error');
      return;
    }

    if (spawnedItems.length === 0) {
      showToast('No items to add', 'error');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const item of spawnedItems) {
      const inventoryItem: EnhancedInventoryItem = {
        name: item.name,
        quantity: 1,
        equipped: false,
        instanceId: `${item.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 5)}`
      };

      const result = await addItemToInventory(inventoryItem, item, false);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      showToast(`Added ${successCount} items to ${activeCharacter.name}${failCount > 0 ? ` (${failCount} failed)` : ''}`, 'success');
    } else {
      showToast('Failed to add items', 'error');
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
              <div className="items-section-content">
                {/* Spawn Mode Selector */}
                <div className="lootbox-mode-selector">
                  <button
                    className={`lootbox-mode-btn ${spawnMode === 'random' ? 'lootbox-mode-btn-active' : ''}`}
                    onClick={() => setSpawnMode('random')}
                  >
                    <Dices size={16} />
                    <span>Random</span>
                  </button>
                  <button
                    className={`lootbox-mode-btn ${spawnMode === 'rarity' ? 'lootbox-mode-btn-active' : ''}`}
                    onClick={() => setSpawnMode('rarity')}
                  >
                    <Gem size={16} />
                    <span>By Rarity</span>
                  </button>
                  <button
                    className={`lootbox-mode-btn ${spawnMode === 'hoard' ? 'lootbox-mode-btn-active' : ''}`}
                    onClick={() => setSpawnMode('hoard')}
                  >
                    <Crown size={16} />
                    <span>Treasure Hoard</span>
                  </button>
                </div>

                {/* Spawn Controls */}
                <div className="lootbox-controls">
                  {spawnMode === 'random' && (
                    <div className="lootbox-control-group">
                      <label className="lootbox-control-label">Number of Items</label>
                      <div className="lootbox-control-inputs">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={randomCount}
                          onChange={(e) => setRandomCount(parseInt(e.target.value))}
                          className="lootbox-slider"
                        />
                        <span className="lootbox-control-value">{randomCount}</span>
                      </div>
                    </div>
                  )}

                  {spawnMode === 'rarity' && (
                    <>
                      <div className="lootbox-control-group">
                        <label className="lootbox-control-label">Rarity</label>
                        <select
                          value={selectedRarity}
                          onChange={(e) => setSelectedRarity(e.target.value as RarityOption)}
                          className="lootbox-select"
                        >
                          <option value="common">Common</option>
                          <option value="uncommon">Uncommon</option>
                          <option value="rare">Rare</option>
                          <option value="very_rare">Very Rare</option>
                          <option value="legendary">Legendary</option>
                        </select>
                      </div>
                      <div className="lootbox-control-group">
                        <label className="lootbox-control-label">Count</label>
                        <div className="lootbox-control-inputs">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={rarityCount}
                            onChange={(e) => setRarityCount(parseInt(e.target.value))}
                            className="lootbox-slider"
                          />
                          <span className="lootbox-control-value">{rarityCount}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {spawnMode === 'hoard' && (
                    <div className="lootbox-control-group">
                      <label className="lootbox-control-label">Challenge Rating</label>
                      <div className="lootbox-control-inputs">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={hoardCR}
                          onChange={(e) => setHoardCR(parseInt(e.target.value))}
                          className="lootbox-slider"
                        />
                        <span className="lootbox-control-value">CR {hoardCR}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Spawn Button */}
                <div className="lootbox-spawn-actions">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={
                      spawnMode === 'random'
                        ? handleSpawnRandom
                        : spawnMode === 'rarity'
                        ? handleSpawnByRarity
                        : handleSpawnTreasureHoard
                    }
                    isLoading={isLootBoxLoading || isAnimating}
                    leftIcon={isLootBoxLoading || isAnimating ? Loader2 : Sparkles}
                    className="lootbox-spawn-btn"
                  >
                    {isLootBoxLoading || isAnimating
                      ? 'Opening...'
                      : spawnMode === 'hoard'
                      ? 'Open Treasure Hoard'
                      : 'Open Loot Box'}
                  </Button>

                  {spawnedItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={clearSpawnedItems}
                      leftIcon={Trash}
                      className="lootbox-clear-btn"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Treasure Hoard Value Display */}
                {lastHoardResult?.totalValue !== undefined && (
                  <div className="lootbox-hoard-value">
                    <Crown size={20} />
                    <span className="lootbox-hoard-label">Treasure Value:</span>
                    <span className="lootbox-hoard-amount">{lastHoardResult.totalValue} gp</span>
                  </div>
                )}

                {/* Spawned Items Grid */}
                {spawnedItems.length > 0 && (
                  <>
                    <div className={`lootbox-items-grid ${isAnimating ? 'lootbox-items-animating' : ''}`}>
                      {spawnedItems.map((item, index) => {
                        const TypeIcon = getEquipmentTypeIcon(item.type);
                        const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                        const bgColor = RARITY_BG_COLORS[item.rarity] || RARITY_BG_COLORS.common;
                        const borderColor = RARITY_BORDER_COLORS[item.rarity] || RARITY_BORDER_COLORS.common;

                        return (
                          <div
                            key={`${item.name}-${index}`}
                            className="lootbox-item-card"
                            style={{
                              backgroundColor: bgColor,
                              borderColor: borderColor,
                              animationDelay: `${index * 0.05}s`
                            }}
                          >
                            <div className="lootbox-item-header">
                              <TypeIcon size={16} style={{ color: rarityColor }} />
                              <span
                                className="lootbox-item-name"
                                style={{ color: rarityColor }}
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>

                            <div className="lootbox-item-meta">
                              <span
                                className="lootbox-item-rarity"
                                style={{ color: rarityColor }}
                              >
                                {formatRarity(item.rarity)}
                              </span>
                              <span className="lootbox-item-type">
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </span>
                            </div>

                            {item.damage && (
                              <div className="lootbox-item-stat">
                                <span className="lootbox-item-stat-label">Damage:</span>
                                <span className="lootbox-item-stat-value">
                                  {item.damage.dice} {item.damage.damageType}
                                </span>
                              </div>
                            )}

                            {item.acBonus !== undefined && (
                              <div className="lootbox-item-stat">
                                <span className="lootbox-item-stat-label">AC:</span>
                                <span className="lootbox-item-stat-value">+{item.acBonus}</span>
                              </div>
                            )}

                            <div className="lootbox-item-stat">
                              <span className="lootbox-item-stat-label">Weight:</span>
                              <span className="lootbox-item-stat-value">{item.weight} lb</span>
                            </div>

                            {activeCharacter && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddToHero(item)}
                                leftIcon={Plus}
                                className="lootbox-add-item-btn"
                              >
                                Add to Hero
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add All Button */}
                    {activeCharacter && spawnedItems.length > 1 && (
                      <div className="lootbox-add-all">
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleAddAllToHero}
                          leftIcon={PlusCircle}
                          className="lootbox-add-all-btn"
                        >
                          Add All {spawnedItems.length} Items to Hero
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Raw JSON Dump */}
                {spawnedItems.length > 0 && (
                  <div className="lootbox-json-dump">
                    <RawJsonDump
                      data={spawnedItems}
                      title="Spawned Items (Raw)"
                      defaultOpen={false}
                    />
                  </div>
                )}
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
