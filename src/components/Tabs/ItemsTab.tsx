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
  Loader2,
  Wand2,
  Hammer,
  Save,
  Zap
} from 'lucide-react';
import { useHeroEquipment } from '../../hooks/useHeroEquipment';
import { useLootBox } from '../../hooks/useLootBox';
import { useItemCreator, type CustomItemFormData } from '../../hooks/useItemCreator';
import { useItemEnchantment, type EnchantmentOperationResult } from '../../hooks/useItemEnchantment';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { showToast } from '../ui/Toast';
import { EnchantmentModal, type ItemEquipmentType } from '../modals/EnchantmentModal';
import type { EnhancedInventoryItem, EnhancedEquipment, EquipmentModification } from 'playlist-data-engine';
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

type SpawnMode = 'random' | 'rarity' | 'hoard' | 'magic';
type RarityOption = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
type ItemTypeOption = 'weapon' | 'armor' | 'item';

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
    spawnMagicItems,
    getMagicItemCount,
    clearSpawnedItems
  } = useLootBox();

  // Use the item creator hook
  const {
    isLoading: isCreatorLoading,
    lastCreatedItem,
    validateItemData,
    createCustomItem,
    createAndAddItem,
    clearLastCreated
  } = useItemCreator();

  // Use the item enchantment hook
  const {
    getItemModificationInfo,
    enchantItem,
    curseItem,
    disenchantItem,
    liftCurse,
    removeModification,
    isLoading: isEnchantmentLoading
  } = useItemEnchantment();

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
  const [magicItemCount, setMagicItemCount] = useState(3);
  const [magicItemRarity, setMagicItemRarity] = useState<RarityOption | ''>('');
  const [isAnimating, setIsAnimating] = useState(false);
  // Track which spawn mode was used for the current items
  const [lastSpawnMode, setLastSpawnMode] = useState<SpawnMode | null>(null);

  // Item Creator form state
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<ItemTypeOption>('weapon');
  const [itemRarity, setItemRarity] = useState<RarityOption>('common');
  const [itemWeight, setItemWeight] = useState(1);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [damageDice, setDamageDice] = useState('');
  const [damageType, setDamageType] = useState('slashing');
  const [acBonus, setAcBonus] = useState<number | ''>('');
  const [autoEquip, setAutoEquip] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Expanded item details state (for modification display)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Enchantment modal state
  const [isEnchantmentModalOpen, setIsEnchantmentModalOpen] = useState(false);
  const [selectedEnchantItem, setSelectedEnchantItem] = useState<EnhancedInventoryItem | null>(null);
  const [selectedEnchantItemType, setSelectedEnchantItemType] = useState<ItemEquipmentType>('weapon');

  // Toggle item expansion
  const toggleItemExpansion = (instanceId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instanceId)) {
        newSet.delete(instanceId);
      } else {
        newSet.add(instanceId);
      }
      return newSet;
    });
  };

  // Open enchantment modal for an item
  const handleOpenEnchantmentModal = (item: EnhancedInventoryItem, itemType: ItemEquipmentType) => {
    setSelectedEnchantItem(item);
    setSelectedEnchantItemType(itemType);
    setIsEnchantmentModalOpen(true);
  };

  // Close enchantment modal
  const handleCloseEnchantmentModal = () => {
    setIsEnchantmentModalOpen(false);
    setSelectedEnchantItem(null);
  };

  // Handle enchantment application from modal
  const handleEnchantItem = async (itemName: string, enchantment: EquipmentModification): Promise<void> => {
    const result: EnchantmentOperationResult = await enchantItem(itemName, enchantment);

    if (result.success) {
      showToast(result.message || `Applied ${enchantment.name} to ${itemName}`, 'success');
    } else {
      showToast(result.error || 'Failed to apply enchantment', 'error');
    }
  };

  // Handle curse application from modal
  const handleCurseItem = async (itemName: string, curse: EquipmentModification): Promise<void> => {
    const result: EnchantmentOperationResult = await curseItem(itemName, curse);

    if (result.success) {
      showToast(result.message || `Applied ${curse.name} curse to ${itemName}`, 'success');
    } else {
      showToast(result.error || 'Failed to apply curse', 'error');
    }
  };

  // Handle lifting curse from item
  const handleLiftCurse = async (itemName: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to lift all curses from ${itemName}?\n\nThis will remove all curse effects from the item.`)) {
      return;
    }

    const result: EnchantmentOperationResult = await liftCurse(itemName);

    if (result.success) {
      showToast(result.message || `Lifted curses from ${itemName}`, 'success');
    } else {
      showToast(result.error || 'Failed to lift curse', 'error');
    }
  };

  // Handle disenchanting item (removes enchantments, keeps curses)
  const handleDisenchantItem = async (itemName: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to disenchant ${itemName}?\n\nThis will remove all enchantments but keep any curses.`)) {
      return;
    }

    const result: EnchantmentOperationResult = await disenchantItem(itemName);

    if (result.success) {
      showToast(result.message || `Disenchanted ${itemName}`, 'success');
    } else {
      showToast(result.error || 'Failed to disenchant item', 'error');
    }
  };

  // Handle removing a specific modification
  const handleRemoveModification = async (itemName: string, modificationId: string, modificationName: string): Promise<void> => {
    if (!window.confirm(`Remove "${modificationName}" from ${itemName}?\n\nThis cannot be undone.`)) {
      return;
    }

    const result: EnchantmentOperationResult = await removeModification(itemName, modificationId);

    if (result.success) {
      showToast(result.message || `Removed ${modificationName} from ${itemName}`, 'success');
    } else {
      showToast(result.error || 'Failed to remove modification', 'error');
    }
  };


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
    setLastSpawnMode('random');
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
    setLastSpawnMode('rarity');
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
    setLastSpawnMode('hoard');
    const result = await spawnTreasureHoard(hoardCR);
    setIsAnimating(false);

    if (result.items.length > 0) {
      showToast(`Spawned treasure hoard worth ${result.totalValue} gp!`, 'success');
    } else {
      showToast('Failed to spawn treasure hoard', 'error');
    }
  };

  // Handle spawning magic items
  const handleSpawnMagicItems = async () => {
    setIsAnimating(true);
    setLastSpawnMode('magic');
    const result = await spawnMagicItems(
      magicItemCount,
      magicItemRarity || undefined
    );
    setIsAnimating(false);

    if (result.items.length > 0) {
      const rarityText = magicItemRarity ? ` ${formatRarity(magicItemRarity)}` : '';
      showToast(`Spawned ${result.items.length}${rarityText} magic items!`, 'success');
    } else {
      showToast('No magic items found', 'error');
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

    // Get modification info for badges
    const modificationInfo = item.name ? getItemModificationInfo(item.name) : null;
    const itemIsCursed = modificationInfo?.isCursed ?? false;
    const itemHasAttunementCurse = modificationInfo?.hasAttunementCurse ?? false;
    const modifications = modificationInfo?.modifications ?? [];

    // Build tooltip content for modifications
    const buildModificationTooltip = (): string => {
      if (modifications.length === 0) return '';

      const lines = modifications.map(mod => {
        const properties = mod.properties?.map(p => {
          const value = typeof p.value === 'number' ? (p.value >= 0 ? `+${p.value}` : p.value) : p.value;
          return `${p.type} ${value}`;
        }).join(', ') || '';

        return `${mod.name}: ${properties}${mod.description ? ` (${mod.description})` : ''}`;
      });

      return lines.join('\n');
    };

    // Get badge icon and label for an enchantment
    const getEnchantmentBadgeInfo = (mod: typeof modifications[0]): { icon: string; label: string } => {
      const id = mod.id.toLowerCase();

      // Enhancement bonuses
      if (id.includes('plus_one') || id.includes('+1')) return { icon: '⚔️', label: '+1' };
      if (id.includes('plus_two') || id.includes('+2')) return { icon: '⚔️', label: '+2' };
      if (id.includes('plus_three') || id.includes('+3')) return { icon: '⚔️', label: '+3' };

      // Elemental damage
      if (id.includes('flaming') || id.includes('fire')) return { icon: '🔥', label: 'Flaming' };
      if (id.includes('frost') || id.includes('cold')) return { icon: '❄️', label: 'Frost' };
      if (id.includes('shock') || id.includes('lightning')) return { icon: '⚡', label: 'Shock' };
      if (id.includes('thunder')) return { icon: '🔊', label: 'Thunder' };
      if (id.includes('acid')) return { icon: '🧪', label: 'Acid' };
      if (id.includes('poison')) return { icon: '☠️', label: 'Poison' };
      if (id.includes('holy') || id.includes('radiant')) return { icon: '✨', label: 'Holy' };

      // Special
      if (id.includes('vampiric') || id.includes('lifesteal')) return { icon: '🩸', label: 'Vampiric' };
      if (id.includes('vorpal')) return { icon: '🗡️', label: 'Vorpal' };
      if (id.includes('keen')) return { icon: '🔪', label: 'Keen' };
      if (id.includes('mighty')) return { icon: '💪', label: 'Mighty' };
      if (id.includes('returning')) return { icon: '🔄', label: 'Returning' };

      // Resistance
      if (id.includes('resistance')) return { icon: '🛡️', label: mod.name };

      // Stat boosts
      if (id.includes('strength') || id.includes('str')) return { icon: '💪', label: mod.name };
      if (id.includes('dexterity') || id.includes('dex')) return { icon: '🤸', label: mod.name };
      if (id.includes('constitution') || id.includes('con')) return { icon: '❤️', label: mod.name };
      if (id.includes('intelligence') || id.includes('int')) return { icon: '🧠', label: mod.name };
      if (id.includes('wisdom') || id.includes('wis')) return { icon: '👁️', label: mod.name };
      if (id.includes('charisma') || id.includes('cha')) return { icon: '😊', label: mod.name };

      // Combo enchantments
      if (id.includes('holy_avenger')) return { icon: '⚔️✨', label: 'Holy Avenger' };
      if (id.includes('dragon')) return { icon: '🐉', label: 'Dragonslayer' };
      if (id.includes('demon')) return { icon: '😈', label: 'Demon Hunter' };
      if (id.includes('undead')) return { icon: '👻', label: 'Undead Bane' };

      return { icon: '✨', label: mod.name };
    };

    // Check if item has modifications (for expand button)
    const hasModifications = modifications.length > 0;
    const isExpanded = item.instanceId ? expandedItems.has(item.instanceId) : false;

    // Format property value for display
    const formatPropertyValue = (value: unknown): string => {
      if (typeof value === 'number') {
        return value >= 0 ? `+${value}` : String(value);
      }
      return String(value);
    };

    // Get source badge styling
    const getSourceBadgeClass = (source: string): string => {
      switch (source) {
        case 'enchantment':
          return 'items-modification-source-enchantment';
        case 'curse':
          return 'items-modification-source-curse';
        case 'upgrade':
          return 'items-modification-source-upgrade';
        default:
          return 'items-modification-source-template';
      }
    };

    // Format source for display
    const formatSource = (source: string): string => {
      switch (source) {
        case 'enchantment':
          return '✨ Enchantment';
        case 'curse':
          return '🔮 Curse';
        case 'upgrade':
          return '⬆️ Upgrade';
        default:
          return '📋 Template';
      }
    };

    return (
      <div
        key={item.instanceId}
        className={`items-equipment-item ${item.equipped ? 'items-equipment-item-equipped' : ''} ${isAmmo ? 'items-equipment-item-ammunition' : ''} ${itemIsCursed ? 'items-equipment-item-cursed' : ''} ${isExpanded ? 'items-equipment-item-expanded' : ''}`}
      >
        <div className="items-equipment-item-content">
          {isAmmo && <Target className="items-equipment-ammo-icon" size={16} />}
          {item.equipped && !isAmmo && <Check className="items-equipment-checkmark" size={16} />}
          {itemHasAttunementCurse && <span className="items-equipment-attunement-lock" title="Attunement Lock: Cannot unequip until curse is lifted">🔒</span>}

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

          {/* Modification badges */}
          {modifications.length > 0 && (
            <div className="items-modification-badges" title={buildModificationTooltip()}>
              {modifications.map(mod => {
                const isCurseMod = mod.source === 'curse';
                const badgeInfo = getEnchantmentBadgeInfo(mod);

                if (isCurseMod) {
                  return (
                    <span
                      key={mod.id}
                      className="items-modification-badge items-modification-curse"
                      title={`${mod.name}: ${mod.description || 'Cursed'}`}
                    >
                      🔮 {mod.name}
                    </span>
                  );
                }

                return (
                  <span
                    key={mod.id}
                    className="items-modification-badge items-modification-enchantment"
                    title={`${mod.name}: ${mod.description || badgeInfo.label}`}
                  >
                    {badgeInfo.icon} {badgeInfo.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="items-equipment-actions">
          <Button
            variant={item.equipped ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleEquipToggle(item)}
            isLoading={isLoading}
            leftIcon={item.equipped ? X : Check}
            disabled={itemHasAttunementCurse && item.equipped}
            title={itemHasAttunementCurse && item.equipped ? 'Cannot unequip - Attunement Curse active' : undefined}
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

          {/* Enchant button - opens EnchantmentModal */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEnchantmentModal(item, category === 'weapons' ? 'weapon' : category === 'armor' ? 'armor' : 'item')}
            isLoading={isEnchantmentLoading}
            leftIcon={Sparkles}
            className="items-equipment-enchant-btn"
            title="Apply enchantments or curses to this item"
          >
            Enchant
          </Button>

          {/* Lift Curse button - visible in main actions when item is cursed */}
          {itemIsCursed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLiftCurse(item.name)}
              isLoading={isEnchantmentLoading}
              leftIcon={Sparkles}
              className="items-equipment-lift-curse-btn"
              title="Remove all curses from this item"
            >
              Lift Curse
            </Button>
          )}

          {/* Expand/Collapse button for modifications */}
          {hasModifications && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => item.instanceId && toggleItemExpansion(item.instanceId)}
              leftIcon={isExpanded ? ChevronUp : ChevronDown}
              title={isExpanded ? 'Hide modification details' : 'Show modification details'}
              className="items-equipment-expand-btn"
            >
              {isExpanded ? 'Less' : 'Details'}
            </Button>
          )}
        </div>

        {/* Expanded modification details */}
        {isExpanded && hasModifications && (
          <div className="items-modification-details">
            <div className="items-modification-details-header">
              <Sparkles size={14} />
              <span>Modifications ({modifications.length})</span>
            </div>
            <div className="items-modification-list">
              {modifications.map(mod => (
                <div key={mod.id} className="items-modification-entry">
                  <div className="items-modification-entry-header">
                    <span className={`items-modification-source ${getSourceBadgeClass(mod.source)}`}>
                      {formatSource(mod.source)}
                    </span>
                    <span className="items-modification-name">{mod.name}</span>
                    {mod.appliedAt && (
                      <span className="items-modification-timestamp">
                        {new Date(mod.appliedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Properties */}
                  {mod.properties && mod.properties.length > 0 && (
                    <div className="items-modification-properties">
                      {mod.properties.map((prop, idx) => (
                        <div key={idx} className="items-modification-property">
                          <span className="items-modification-property-type">{prop.type}</span>
                          {prop.target && (
                            <span className="items-modification-property-target">{prop.target}</span>
                          )}
                          <span className="items-modification-property-value">
                            {formatPropertyValue(prop.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {mod.description && (
                    <div className="items-modification-description">
                      {mod.description}
                    </div>
                  )}

                  {/* Features */}
                  {mod.addsFeatures && mod.addsFeatures.length > 0 && (
                    <div className="items-modification-features">
                      <span className="items-modification-features-label">Grants Features:</span>
                      {mod.addsFeatures.map((feature, idx) => (
                        <span key={idx} className="items-modification-feature-tag">
                          {typeof feature === 'string' ? feature : feature.name || feature.id || 'Unknown'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skills */}
                  {mod.addsSkills && mod.addsSkills.length > 0 && (
                    <div className="items-modification-skills">
                      <span className="items-modification-skills-label">Grants Skills:</span>
                      {mod.addsSkills.map((skill, idx) => (
                        <span key={idx} className="items-modification-skill-tag">
                          {skill.skillId} ({skill.level})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Spells */}
                  {mod.addsSpells && mod.addsSpells.length > 0 && (
                    <div className="items-modification-spells">
                      <span className="items-modification-spells-label">Grants Spells:</span>
                      {mod.addsSpells.map((spell, idx) => (
                        <span key={idx} className="items-modification-spell-tag">
                          {spell.spellId}
                          {spell.level && ` (Lvl ${spell.level})`}
                          {spell.uses && ` - ${spell.uses} uses`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Remove modification button */}
                  <div className="items-modification-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveModification(item.name, mod.id, mod.name)}
                      isLoading={isEnchantmentLoading}
                      leftIcon={X}
                      className="items-modification-remove-btn"
                      title={`Remove ${mod.name} from this item`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Combined effects summary */}
            {modificationInfo?.combinedEffects && modificationInfo.combinedEffects.length > 0 && (
              <div className="items-modification-effects-summary">
                <div className="items-modification-effects-summary-header">
                  <Zap size={12} />
                  <span>Combined Effects</span>
                </div>
                <div className="items-modification-effects-list">
                  {modificationInfo.combinedEffects.map((effect, idx) => (
                    <div key={idx} className="items-modification-effect-item">
                      <span className="items-modification-effect-type">{effect.type}</span>
                      {effect.target && (
                        <span className="items-modification-effect-target">{effect.target}</span>
                      )}
                      <span className="items-modification-effect-value">
                        {formatPropertyValue(effect.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modification management actions */}
            <div className="items-modification-management">
              {/* Lift Curse button - only show if item is cursed */}
              {itemIsCursed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLiftCurse(item.name)}
                  isLoading={isEnchantmentLoading}
                  leftIcon={Sparkles}
                  className="items-modification-lift-curse-btn"
                  title="Remove all curses from this item"
                >
                  Lift Curse
                </Button>
              )}

              {/* Disenchant button - only show if item has enchantments */}
              {modificationInfo?.isEnchanted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisenchantItem(item.name)}
                  isLoading={isEnchantmentLoading}
                  leftIcon={X}
                  className="items-modification-disenchant-btn"
                  title="Remove all enchantments (keeps curses)"
                >
                  Disenchant
                </Button>
              )}
            </div>
          </div>
        )}
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

  // Handle item creation
  const handleCreateItem = async () => {
    if (!activeCharacter) {
      showToast('No character selected', 'error');
      return;
    }

    // Build form data
    const formData: CustomItemFormData = {
      name: itemName,
      type: itemType,
      rarity: itemRarity,
      weight: itemWeight,
      quantity: itemQuantity,
      ...(itemType === 'weapon' && damageDice && {
        damageDice,
        damageType
      }),
      ...(itemType === 'armor' && acBonus !== '' && {
        acBonus: Number(acBonus)
      })
    };

    // Validate
    const validation = validateItemData(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      showToast(validation.errors[0], 'error');
      return;
    }

    setFormErrors([]);

    // Create and add item
    const result = await createAndAddItem(formData, autoEquip);

    if (result.success) {
      showToast(result.message || 'Item created and added!', 'success');
      // Clear form
      setItemName('');
      setDamageDice('');
      setAcBonus('');
    } else {
      showToast(result.error || 'Failed to create item', 'error');
    }
  };

  // Generate preview item
  const previewItem: EnhancedEquipment | null = useMemo(() => {
    if (!itemName.trim()) return null;

    const formData: CustomItemFormData = {
      name: itemName,
      type: itemType,
      rarity: itemRarity,
      weight: itemWeight,
      quantity: itemQuantity,
      ...(itemType === 'weapon' && damageDice && {
        damageDice,
        damageType
      }),
      ...(itemType === 'armor' && acBonus !== '' && {
        acBonus: Number(acBonus)
      })
    };

    const result = createCustomItem(formData);
    return result.success ? result.equipment || null : null;
  }, [itemName, itemType, itemRarity, itemWeight, damageDice, damageType, acBonus, itemQuantity, createCustomItem]);

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

  // Render equipment effects section
  const renderEquipmentEffects = () => {
    const equipmentEffects = activeCharacter?.equipment_effects;
    if (!equipmentEffects || equipmentEffects.length === 0) {
      return null;
    }

    // Types for grouped effects
    type EffectProperty = { type: string; value?: unknown; target?: string; description?: string };
    type EffectFeature = { featureId?: string; name?: string; description?: string };
    type EffectSkill = { skillId?: string; name?: string; level?: string; proficiency?: string };
    type EffectSpell = { spellId?: string; name?: string; level?: number; uses?: number; recharge?: string };

    // Group effects by source item
    const effectsBySource: Record<string, {
      source: string;
      instanceId?: string;
      baseEffects: EffectProperty[];
      enchantmentEffects: EffectProperty[];
      curseEffects: EffectProperty[];
      features: EffectFeature[];
      skills: EffectSkill[];
      spells: EffectSpell[];
      isEnchanted: boolean;
      isCursed: boolean;
    }> = {};

    equipmentEffects.forEach(effect => {
      const sourceName = effect.source;
      if (!effectsBySource[sourceName]) {
        effectsBySource[sourceName] = {
          source: sourceName,
          instanceId: effect.instanceId,
          baseEffects: [],
          enchantmentEffects: [],
          curseEffects: [],
          features: [],
          skills: [],
          spells: [],
          isEnchanted: false,
          isCursed: false
        };
      }

      const entry = effectsBySource[sourceName];
      entry.instanceId = effect.instanceId;

      // Get modification info for this source to determine effect types
      const modInfo = getItemModificationInfo(sourceName);
      const modifications = modInfo?.modifications || [];
      entry.isEnchanted = modInfo?.isEnchanted ?? false;
      entry.isCursed = modInfo?.isCursed ?? false;

      // Categorize effects by their source type
      if (effect.effects) {
        effect.effects.forEach(prop => {
          // Check if this effect comes from a modification
          const isModificationEffect = modifications.some(mod =>
            mod.properties?.some(p => p.type === prop.type && p.target === prop.target)
          );

          // Check if it's from a curse
          const isCurseEffect = modifications.some(mod =>
            mod.source === 'curse' && mod.properties?.some(p => p.type === prop.type && p.target === prop.target)
          );

          const effectProp = prop as EffectProperty;
          if (isCurseEffect) {
            entry.curseEffects.push(effectProp);
          } else if (isModificationEffect) {
            entry.enchantmentEffects.push(effectProp);
          } else {
            entry.baseEffects.push(effectProp);
          }
        });
      }

      // Merge features, skills, and spells
      if (effect.features) {
        entry.features = [...entry.features, ...(effect.features as EffectFeature[])];
      }
      if (effect.skills) {
        entry.skills = [...entry.skills, ...(effect.skills as EffectSkill[])];
      }
      if (effect.spells) {
        entry.spells = [...entry.spells, ...(effect.spells as EffectSpell[])];
      }
    });

    // Format property value for display
    const formatEffectValue = (value: unknown): string => {
      if (typeof value === 'number') {
        return value >= 0 ? `+${value}` : String(value);
      }
      return String(value);
    };

    return (
      <div className="items-effects-section">
        <div className="items-effects-header">
          <Zap className="items-effects-icon" size={16} />
          <h4 className="items-effects-title">Active Equipment Effects</h4>
        </div>
        <div className="items-effects-list">
          {Object.values(effectsBySource).map((entry, idx) => (
            <div
              key={idx}
              className={`items-effect-card ${entry.isEnchanted ? 'items-effect-card-enchanted' : ''} ${entry.isCursed ? 'items-effect-card-cursed' : ''}`}
            >
              {/* Source header with modification badges */}
              <div className="items-effect-source">
                <Sparkles size={14} className={`items-effect-source-icon ${entry.isEnchanted ? 'items-effect-source-icon-enchanted' : ''} ${entry.isCursed ? 'items-effect-source-icon-cursed' : ''}`} />
                <span className="items-effect-source-name">{entry.source}</span>
                {entry.isEnchanted && (
                  <span className="items-effect-mod-badge items-effect-mod-badge-enchantment">✨ Enchanted</span>
                )}
                {entry.isCursed && (
                  <span className="items-effect-mod-badge items-effect-mod-badge-curse">🔮 Cursed</span>
                )}
                {entry.instanceId && (
                  <span className="items-effect-instance-id" title={`Instance: ${entry.instanceId}`}>
                    #{entry.instanceId.slice(-6)}
                  </span>
                )}
              </div>

              {/* Base Effects */}
              {entry.baseEffects.length > 0 && (
                <div className="items-effect-group items-effect-group-base">
                  <span className="items-effect-group-label">Base Item</span>
                  <div className="items-effect-properties">
                    {entry.baseEffects.map((prop, propIdx) => (
                      <div key={propIdx} className="items-effect-property">
                        <span className="items-effect-property-type">{prop.type}</span>
                        {prop.target && (
                          <span className="items-effect-property-target">{prop.target}</span>
                        )}
                        <span className="items-effect-property-value">{formatEffectValue(prop.value)}</span>
                        {prop.description && (
                          <span className="items-effect-property-description" title={prop.description}>
                            {prop.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enchantment Effects */}
              {entry.enchantmentEffects.length > 0 && (
                <div className="items-effect-group items-effect-group-enchantment">
                  <span className="items-effect-group-label items-effect-group-label-enchantment">✨ Enchantment Effects</span>
                  <div className="items-effect-properties">
                    {entry.enchantmentEffects.map((prop, propIdx) => (
                      <div key={propIdx} className="items-effect-property items-effect-property-enchantment">
                        <span className="items-effect-property-type">{prop.type}</span>
                        {prop.target && (
                          <span className="items-effect-property-target">{prop.target}</span>
                        )}
                        <span className="items-effect-property-value">{formatEffectValue(prop.value)}</span>
                        {prop.description && (
                          <span className="items-effect-property-description" title={prop.description}>
                            {prop.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curse Effects */}
              {entry.curseEffects.length > 0 && (
                <div className="items-effect-group items-effect-group-curse">
                  <span className="items-effect-group-label items-effect-group-label-curse">🔮 Curse Effects</span>
                  <div className="items-effect-properties">
                    {entry.curseEffects.map((prop, propIdx) => (
                      <div key={propIdx} className="items-effect-property items-effect-property-curse">
                        <span className="items-effect-property-type">{prop.type}</span>
                        {prop.target && (
                          <span className="items-effect-property-target">{prop.target}</span>
                        )}
                        <span className="items-effect-property-value">{formatEffectValue(prop.value)}</span>
                        {prop.description && (
                          <span className="items-effect-property-description" title={prop.description}>
                            {prop.description}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {entry.features && entry.features.length > 0 && (
                <div className="items-effect-features">
                  <span className="items-effect-features-label">Grants Features:</span>
                  {entry.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="items-effect-feature">
                      <span className="items-effect-feature-name">
                        {feature.featureId || feature.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Skills */}
              {entry.skills && entry.skills.length > 0 && (
                <div className="items-effect-skills">
                  <span className="items-effect-skills-label">Grants Skills:</span>
                  {entry.skills.map((skill, skillIdx) => (
                    <div key={skillIdx} className="items-effect-skill">
                      <Target size={12} className="items-effect-skill-icon" />
                      <span className="items-effect-skill-name">{skill.skillId || skill.name || 'Unknown'}</span>
                      <span className={`items-effect-skill-level items-effect-skill-level-${skill.level || skill.proficiency || 'proficient'}`}>
                        {skill.level || skill.proficiency || 'proficient'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Spells */}
              {entry.spells && entry.spells.length > 0 && (
                <div className="items-effect-spells">
                  <span className="items-effect-spells-label">Grants Spells:</span>
                  {entry.spells.map((spell, spellIdx) => (
                    <div key={spellIdx} className="items-effect-spell">
                      <Wand2 size={12} className="items-effect-spell-icon" />
                      <span className="items-effect-spell-name">{spell.spellId || spell.name || 'Unknown'}</span>
                      {spell.level && (
                        <span className="items-effect-spell-level">Level {spell.level}</span>
                      )}
                      {spell.uses && (
                        <span className="items-effect-spell-uses">{spell.uses} uses</span>
                      )}
                      {spell.recharge && (
                        <span className="items-effect-spell-recharge" title={`Recharges: ${spell.recharge}`}>
                          ↻
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

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

                {/* Equipment Effects */}
                {renderEquipmentEffects()}

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
                  {activeCharacter.equipment_effects && activeCharacter.equipment_effects.length > 0 && (
                    <RawJsonDump
                      data={activeCharacter.equipment_effects}
                      title="Equipment Effects (Raw)"
                      defaultOpen={false}
                    />
                  )}
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
                  <button
                    className={`lootbox-mode-btn ${spawnMode === 'magic' ? 'lootbox-mode-btn-active' : ''}`}
                    onClick={() => setSpawnMode('magic')}
                  >
                    <Sparkles size={16} />
                    <span>Magic Items</span>
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

                  {spawnMode === 'magic' && (
                    <>
                      <div className="lootbox-control-group">
                        <label className="lootbox-control-label">Filter by Rarity (Optional)</label>
                        <select
                          value={magicItemRarity}
                          onChange={(e) => setMagicItemRarity(e.target.value as RarityOption | '')}
                          className="lootbox-select"
                        >
                          <option value="">All Rarities</option>
                          <option value="common">Common</option>
                          <option value="uncommon">Uncommon</option>
                          <option value="rare">Rare</option>
                          <option value="very_rare">Very Rare</option>
                          <option value="legendary">Legendary</option>
                        </select>
                      </div>
                      <div className="lootbox-control-group">
                        <label className="lootbox-control-label">Number of Items</label>
                        <div className="lootbox-control-inputs">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={magicItemCount}
                            onChange={(e) => setMagicItemCount(parseInt(e.target.value))}
                            className="lootbox-slider"
                          />
                          <span className="lootbox-control-value">{magicItemCount}</span>
                        </div>
                      </div>
                      <div className="lootbox-magic-items-info">
                        <Sparkles size={14} />
                        <span>{getMagicItemCount()} magic items available</span>
                      </div>
                    </>
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
                        : spawnMode === 'hoard'
                        ? handleSpawnTreasureHoard
                        : handleSpawnMagicItems
                    }
                    isLoading={isLootBoxLoading || isAnimating}
                    leftIcon={isLootBoxLoading || isAnimating ? Loader2 : Sparkles}
                    className="lootbox-spawn-btn"
                  >
                    {isLootBoxLoading || isAnimating
                      ? 'Opening...'
                      : spawnMode === 'hoard'
                      ? 'Open Treasure Hoard'
                      : spawnMode === 'magic'
                      ? 'Open Magic Items'
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
                        const isMagicItem = lastSpawnMode === 'magic';

                        return (
                          <div
                            key={`${item.name}-${index}`}
                            className={`lootbox-item-card ${isMagicItem ? 'lootbox-item-card-magic' : ''}`}
                            style={{
                              backgroundColor: bgColor,
                              borderColor: borderColor,
                              animationDelay: `${index * 0.05}s`
                            }}
                          >
                            <div className="lootbox-item-header">
                              {isMagicItem && (
                                <Sparkles size={14} className="lootbox-magic-sparkle-icon" />
                              )}
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
                <Wand2 className="items-section-icon items-section-icon-creator" size={20} />
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
              <div className="items-section-content">
                {/* Item Creator Form */}
                <div className="item-creator-form">
                  {/* Basic Info */}
                  <div className="item-creator-section">
                    <h4 className="item-creator-section-title">Basic Information</h4>
                    <div className="item-creator-grid">
                      {/* Item Name */}
                      <div className="item-creator-field item-creator-field-full">
                        <label className="item-creator-label" htmlFor="item-name">
                          Item Name <span className="item-creator-required">*</span>
                        </label>
                        <input
                          id="item-name"
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="e.g., Sword of Flames"
                          className="item-creator-input"
                        />
                      </div>

                      {/* Item Type */}
                      <div className="item-creator-field">
                        <label className="item-creator-label">Item Type</label>
                        <div className="item-creator-type-selector">
                          <button
                            type="button"
                            className={`item-creator-type-btn ${itemType === 'weapon' ? 'item-creator-type-btn-active' : ''}`}
                            onClick={() => setItemType('weapon')}
                          >
                            <Sword size={16} />
                            <span>Weapon</span>
                          </button>
                          <button
                            type="button"
                            className={`item-creator-type-btn ${itemType === 'armor' ? 'item-creator-type-btn-active' : ''}`}
                            onClick={() => setItemType('armor')}
                          >
                            <Shield size={16} />
                            <span>Armor</span>
                          </button>
                          <button
                            type="button"
                            className={`item-creator-type-btn ${itemType === 'item' ? 'item-creator-type-btn-active' : ''}`}
                            onClick={() => setItemType('item')}
                          >
                            <Package size={16} />
                            <span>Item</span>
                          </button>
                        </div>
                      </div>

                      {/* Rarity */}
                      <div className="item-creator-field">
                        <label className="item-creator-label" htmlFor="item-rarity">
                          Rarity
                        </label>
                        <select
                          id="item-rarity"
                          value={itemRarity}
                          onChange={(e) => setItemRarity(e.target.value as RarityOption)}
                          className="item-creator-select"
                        >
                          <option value="common">Common</option>
                          <option value="uncommon">Uncommon</option>
                          <option value="rare">Rare</option>
                          <option value="very_rare">Very Rare</option>
                          <option value="legendary">Legendary</option>
                        </select>
                      </div>

                      {/* Weight */}
                      <div className="item-creator-field">
                        <label className="item-creator-label" htmlFor="item-weight">
                          Weight (lb)
                        </label>
                        <input
                          id="item-weight"
                          type="number"
                          min="0"
                          max="1000"
                          step="0.1"
                          value={itemWeight}
                          onChange={(e) => setItemWeight(parseFloat(e.target.value) || 0)}
                          className="item-creator-input"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="item-creator-field">
                        <label className="item-creator-label" htmlFor="item-quantity">
                          Quantity
                        </label>
                        <input
                          id="item-quantity"
                          type="number"
                          min="1"
                          max="9999"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                          className="item-creator-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Weapon-specific fields */}
                  {itemType === 'weapon' && (
                    <div className="item-creator-section">
                      <h4 className="item-creator-section-title">
                        <Sword size={16} />
                        Weapon Properties
                      </h4>
                      <div className="item-creator-grid">
                        <div className="item-creator-field">
                          <label className="item-creator-label" htmlFor="damage-dice">
                            Damage Dice
                          </label>
                          <input
                            id="damage-dice"
                            type="text"
                            value={damageDice}
                            onChange={(e) => setDamageDice(e.target.value)}
                            placeholder="e.g., 1d8, 2d6"
                            className="item-creator-input"
                          />
                          <span className="item-creator-hint">Format: 1d8, 2d6, etc.</span>
                        </div>

                        <div className="item-creator-field">
                          <label className="item-creator-label" htmlFor="damage-type">
                            Damage Type
                          </label>
                          <select
                            id="damage-type"
                            value={damageType}
                            onChange={(e) => setDamageType(e.target.value)}
                            className="item-creator-select"
                          >
                            <option value="slashing">Slashing</option>
                            <option value="piercing">Piercing</option>
                            <option value="bludgeoning">Bludgeoning</option>
                            <option value="fire">Fire</option>
                            <option value="cold">Cold</option>
                            <option value="lightning">Lightning</option>
                            <option value="acid">Acid</option>
                            <option value="poison">Poison</option>
                            <option value="necrotic">Necrotic</option>
                            <option value="radiant">Radiant</option>
                            <option value="force">Force</option>
                            <option value="psychic">Psychic</option>
                            <option value="thunder">Thunder</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Armor-specific fields */}
                  {itemType === 'armor' && (
                    <div className="item-creator-section">
                      <h4 className="item-creator-section-title">
                        <Shield size={16} />
                        Armor Properties
                      </h4>
                      <div className="item-creator-grid">
                        <div className="item-creator-field">
                          <label className="item-creator-label" htmlFor="ac-bonus">
                            AC Bonus
                          </label>
                          <input
                            id="ac-bonus"
                            type="number"
                            min="0"
                            max="20"
                            value={acBonus}
                            onChange={(e) => setAcBonus(e.target.value === '' ? '' : parseInt(e.target.value))}
                            placeholder="e.g., 2"
                            className="item-creator-input"
                          />
                          <span className="item-creator-hint">Base AC provided by armor</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="item-creator-section">
                    <label className="item-creator-checkbox">
                      <input
                        type="checkbox"
                        checked={autoEquip}
                        onChange={(e) => setAutoEquip(e.target.checked)}
                      />
                      <span>Auto-equip when added to character</span>
                    </label>
                  </div>

                  {/* Validation Errors */}
                  {formErrors.length > 0 && (
                    <div className="item-creator-errors">
                      {formErrors.map((error, index) => (
                        <div key={index} className="item-creator-error">
                          <X size={14} />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create Button */}
                  <div className="item-creator-actions">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleCreateItem}
                      isLoading={isCreatorLoading}
                      leftIcon={isCreatorLoading ? Loader2 : Hammer}
                      disabled={!itemName.trim()}
                    >
                      {isCreatorLoading ? 'Creating...' : 'Create & Add to Hero'}
                    </Button>

                    {lastCreatedItem && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={clearLastCreated}
                        leftIcon={Trash}
                      >
                        Clear Last Created
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview Section */}
                {previewItem && (
                  <div className="item-creator-preview">
                    <h4 className="item-creator-preview-title">
                      <Sparkles size={16} />
                      Preview
                    </h4>
                    <div
                      className="item-creator-preview-card"
                      style={{
                        backgroundColor: RARITY_BG_COLORS[previewItem.rarity] || RARITY_BG_COLORS.common,
                        borderColor: RARITY_BORDER_COLORS[previewItem.rarity] || RARITY_BORDER_COLORS.common
                      }}
                    >
                      <div className="item-creator-preview-header">
                        {(() => {
                          const TypeIcon = getEquipmentTypeIcon(previewItem.type);
                          return <TypeIcon size={18} style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }} />;
                        })()}
                        <span
                          className="item-creator-preview-name"
                          style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }}
                        >
                          {previewItem.name}
                        </span>
                      </div>
                      <div className="item-creator-preview-meta">
                        <span style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }}>
                          {formatRarity(previewItem.rarity)}
                        </span>
                        <span>•</span>
                        <span>{previewItem.type.charAt(0).toUpperCase() + previewItem.type.slice(1)}</span>
                        <span>•</span>
                        <span>{previewItem.weight} lb</span>
                      </div>
                      {previewItem.damage && (
                        <div className="item-creator-preview-stat">
                          <span className="item-creator-preview-stat-label">Damage:</span>
                          <span>{previewItem.damage.dice} {previewItem.damage.damageType}</span>
                        </div>
                      )}
                      {previewItem.acBonus !== undefined && (
                        <div className="item-creator-preview-stat">
                          <span className="item-creator-preview-stat-label">AC Bonus:</span>
                          <span>+{previewItem.acBonus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Created Item */}
                {lastCreatedItem && (
                  <div className="item-creator-last-created">
                    <h4 className="item-creator-last-created-title">
                      <Save size={16} />
                      Last Created Item
                    </h4>
                    <div className="item-creator-json-dump">
                      <RawJsonDump
                        data={lastCreatedItem}
                        title="Created Item Data (Raw)"
                        defaultOpen={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Enchantment Modal */}
      <EnchantmentModal
        isOpen={isEnchantmentModalOpen}
        item={selectedEnchantItem}
        itemType={selectedEnchantItemType}
        onEnchant={handleEnchantItem}
        onCurse={handleCurseItem}
        onClose={handleCloseEnchantmentModal}
        appliedModificationIds={selectedEnchantItem?.modifications?.map(m => m.id) || []}
        isLoading={isEnchantmentLoading}
      />
    </div>
  );
}

export default ItemsTab;
