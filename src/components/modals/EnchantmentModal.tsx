/**
 * EnchantmentModal Component
 *
 * Modal component for applying enchantments and curses to equipment items.
 * Part of Phase 3: Enchantment Modal UI - Task 3.1
 *
 * Features:
 * - Tabbed interface: Enchant tab and Curse tab
 * - Grouped enchantment cards by category
 * - Apply buttons for each enchantment
 * - Close on backdrop click and escape key
 * - Pure CSS (no Tailwind utility classes)
 */

import React, { useState, useMemo } from 'react';
import { X, Sparkles, Skull, Sword, Shield, Package, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  WEAPON_ENCHANTMENTS,
  ARMOR_ENCHANTMENTS,
  RESISTANCE_ENCHANTMENTS,
  CURSES,
  ALL_ENCHANTMENTS,
  createStrengthEnchantment,
  createDexterityEnchantment,
  createConstitutionEnchantment,
  createIntelligenceEnchantment,
  createWisdomEnchantment,
  createCharismaEnchantment,
  type EquipmentModification,
  type EnhancedInventoryItem
} from 'playlist-data-engine';
import {
  type EnchantmentCategory,
  type EnchantmentInfo,
  type CurseInfo,
  WEAPON_ENCHANTMENT_DEFINITIONS,
  ARMOR_ENCHANTMENT_DEFINITIONS,
  RESISTANCE_ENCHANTMENT_DEFINITIONS,
  COMBO_ENCHANTMENT_DEFINITIONS,
  CURSE_DEFINITIONS,
  STAT_BOOST_INFO
} from '@/types/enchantment';
import './EnchantmentModal.css';

/**
 * Type of equipment item being enchanted
 */
export type ItemEquipmentType = 'weapon' | 'armor' | 'item';

/**
 * Props for the EnchantmentModal component
 */
export interface EnchantmentModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The item to enchant/curse */
  item: EnhancedInventoryItem | null;
  /** The type of equipment (weapon, armor, or item) */
  itemType: ItemEquipmentType;
  /** Callback when an enchantment is applied */
  onEnchant: (itemName: string, enchantment: EquipmentModification) => Promise<void>;
  /** Callback when a curse is applied */
  onCurse: (itemName: string, curse: EquipmentModification) => Promise<void>;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Array of modification IDs already applied to the item */
  appliedModificationIds?: string[];
  /** Whether an operation is currently loading */
  isLoading?: boolean;
}

type TabType = 'enchant' | 'curse';

/**
 * Get icon for equipment type
 */
function getEquipmentTypeIcon(type: ItemEquipmentType) {
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
 * Get available enchantments based on item type
 */
function getAvailableEnchantments(itemType: ItemEquipmentType): Record<string, EquipmentModification> {
  switch (itemType) {
    case 'weapon':
      return WEAPON_ENCHANTMENTS;
    case 'armor':
      return { ...ARMOR_ENCHANTMENTS, ...RESISTANCE_ENCHANTMENTS };
    case 'item':
      return RESISTANCE_ENCHANTMENTS;
    default:
      return {};
  }
}

/**
 * EnchantmentModal Component
 *
 * Displays a modal for applying enchantments and curses to equipment items.
 */
export function EnchantmentModal({
  isOpen,
  item,
  itemType,
  onEnchant,
  onCurse,
  onClose,
  appliedModificationIds = [],
  isLoading = false
}: EnchantmentModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('enchant');
  const [loadingEnchantmentId, setLoadingEnchantmentId] = useState<string | null>(null);

  // Get available enchantments for this item type
  const availableEnchantments = useMemo(() => {
    return getAvailableEnchantments(itemType);
  }, [itemType]);

  // Get available curses
  const availableCurses = useMemo(() => {
    return CURSES;
  }, []);

  // Check if item is already cursed
  const isItemCursed = useMemo(() => {
    return appliedModificationIds.some(id =>
      Object.keys(CURSES).some(curseKey =>
        id.toLowerCase().includes(curseKey.toLowerCase()) || id.toLowerCase().includes('curse')
      )
    );
  }, [appliedModificationIds]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle enchantment application
  const handleApplyEnchantment = async (enchantmentId: string, enchantment: EquipmentModification) => {
    if (!item) return;

    setLoadingEnchantmentId(enchantmentId);
    try {
      await onEnchant(item.name, enchantment);
    } finally {
      setLoadingEnchantmentId(null);
    }
  };

  // Handle curse application
  const handleApplyCurse = async (curseId: string, curse: EquipmentModification) => {
    if (!item) return;

    setLoadingEnchantmentId(curseId);
    try {
      await onCurse(item.name, curse);
    } finally {
      setLoadingEnchantmentId(null);
    }
  };

  // Check if a modification is already applied
  const isModificationApplied = (modId: string): boolean => {
    return appliedModificationIds.some(applied =>
      applied.toLowerCase().includes(modId.toLowerCase()) ||
      modId.toLowerCase().includes(applied.toLowerCase())
    );
  };

  // Get display info for an enchantment
  const getEnchantmentDisplayInfo = (id: string, mod: EquipmentModification): Omit<EnchantmentInfo, 'modification'> => {
    // Check predefined definitions first
    const definitions = [
      WEAPON_ENCHANTMENT_DEFINITIONS,
      ARMOR_ENCHANTMENT_DEFINITIONS,
      RESISTANCE_ENCHANTMENT_DEFINITIONS,
      COMBO_ENCHANTMENT_DEFINITIONS
    ];

    for (const def of definitions) {
      if (def[id]) {
        return def[id];
      }
    }

    // Fall back to generated info from modification
    return {
      id: mod.id || id,
      name: mod.name || id,
      description: mod.description || 'A magical enhancement',
      category: 'weapon' as EnchantmentCategory,
      rarity: 'uncommon' as const,
      icon: '✨',
      isCurse: false
    };
  };

  // Get display info for a curse
  const getCurseDisplayInfo = (id: string, curse: EquipmentModification): Omit<CurseInfo, 'modification'> => {
    if (CURSE_DEFINITIONS[id]) {
      return CURSE_DEFINITIONS[id];
    }

    return {
      id: curse.id || id,
      name: curse.name || id,
      description: curse.description || 'A dark curse',
      category: 'weapon' as EnchantmentCategory,
      rarity: 'rare' as const,
      icon: '🔮',
      isCurse: true,
      locksItem: false,
      warningMessage: 'This will apply a curse to the item.'
    };
  };

  // Get rarity styling class
  const getRarityClass = (rarity: string): string => {
    return `enchantment-rarity-${rarity.replace('_', '-')}`;
  };

  if (!isOpen || !item) return null;

  const EquipmentIcon = getEquipmentTypeIcon(itemType);

  return (
    <div
      className="enchantment-modal-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="enchantment-modal-title"
    >
      <div className="enchantment-modal-container">
        {/* Modal Header */}
        <div className="enchantment-modal-header">
          <div className="enchantment-modal-header-left">
            <div className="enchantment-modal-item-icon">
              <EquipmentIcon size={20} />
            </div>
            <div className="enchantment-modal-header-text">
              <h1 id="enchantment-modal-title" className="enchantment-modal-title">
                Enchant Item
              </h1>
              <span className="enchantment-modal-item-name">{item.name}</span>
            </div>
          </div>
          <button
            type="button"
            className="enchantment-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="enchantment-modal-tabs">
          <button
            type="button"
            className={`enchantment-modal-tab ${activeTab === 'enchant' ? 'enchantment-modal-tab-active' : ''}`}
            onClick={() => setActiveTab('enchant')}
          >
            <Sparkles size={16} />
            <span>Enchant</span>
          </button>
          <button
            type="button"
            className={`enchantment-modal-tab ${activeTab === 'curse' ? 'enchantment-modal-tab-active' : ''}`}
            onClick={() => setActiveTab('curse')}
            disabled={isItemCursed}
            title={isItemCursed ? 'Item is already cursed' : undefined}
          >
            <Skull size={16} />
            <span>Curse</span>
            {isItemCursed && <span className="enchantment-modal-tab-badge">Applied</span>}
          </button>
        </div>

        {/* Modal Content */}
        <div className="enchantment-modal-content">
          {activeTab === 'enchant' && (
            <div className="enchantment-list">
              {/* Info text */}
              <div className="enchantment-info-text">
                <Zap size={14} />
                <span>Select an enchantment to apply to this item. Multiple enchantments can stack.</span>
              </div>

              {/* Enchantment Grid */}
              <div className="enchantment-grid">
                {Object.entries(availableEnchantments).map(([id, mod]) => {
                  const info = getEnchantmentDisplayInfo(id, mod);
                  const isApplied = isModificationApplied(id);
                  const isThisLoading = loadingEnchantmentId === id;

                  return (
                    <div
                      key={id}
                      className={`enchantment-card ${getRarityClass(info.rarity)} ${isApplied ? 'enchantment-card-applied' : ''}`}
                    >
                      <div className="enchantment-card-header">
                        <span className="enchantment-card-icon">{info.icon}</span>
                        <span className="enchantment-card-name">{info.name}</span>
                        {isApplied && (
                          <span className="enchantment-card-applied-badge">Applied</span>
                        )}
                      </div>
                      <p className="enchantment-card-description">{info.description}</p>
                      <div className="enchantment-card-footer">
                        <span className={`enchantment-card-rarity ${getRarityClass(info.rarity)}`}>
                          {info.rarity.replace('_', ' ')}
                        </span>
                        <Button
                          variant={isApplied ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleApplyEnchantment(id, mod)}
                          isLoading={isThisLoading}
                          disabled={isLoading || isThisLoading}
                        >
                          {isApplied ? 'Apply Again' : 'Apply'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combo enchantments for weapons */}
              {itemType === 'weapon' && Object.keys(ALL_ENCHANTMENTS).length > 0 && (
                <div className="enchantment-section">
                  <h3 className="enchantment-section-title">
                    <Sparkles size={14} />
                    <span>Legendary Enchantments</span>
                  </h3>
                  <div className="enchantment-grid">
                    {Object.entries(ALL_ENCHANTMENTS).map(([id, mod]) => {
                      const info = getEnchantmentDisplayInfo(id, mod);
                      const isApplied = isModificationApplied(id);
                      const isThisLoading = loadingEnchantmentId === id;

                      return (
                        <div
                          key={id}
                          className={`enchantment-card ${getRarityClass(info.rarity)} ${isApplied ? 'enchantment-card-applied' : ''}`}
                        >
                          <div className="enchantment-card-header">
                            <span className="enchantment-card-icon">{info.icon}</span>
                            <span className="enchantment-card-name">{info.name}</span>
                            {isApplied && (
                              <span className="enchantment-card-applied-badge">Applied</span>
                            )}
                          </div>
                          <p className="enchantment-card-description">{info.description}</p>
                          <div className="enchantment-card-footer">
                            <span className={`enchantment-card-rarity ${getRarityClass(info.rarity)}`}>
                              {info.rarity.replace('_', ' ')}
                            </span>
                            <Button
                              variant={isApplied ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleApplyEnchantment(id, mod)}
                              isLoading={isThisLoading}
                              disabled={isLoading || isThisLoading}
                            >
                              {isApplied ? 'Apply Again' : 'Apply'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stat Boosts Section */}
              <div className="enchantment-section">
                <h3 className="enchantment-section-title">
                  <span>Stat Boosts</span>
                </h3>
                <div className="enchantment-stat-boosts">
                  {Object.entries(STAT_BOOST_INFO).map(([stat, statInfo]) => (
                    <div key={stat} className="enchantment-stat-group">
                      <div className="enchantment-stat-header">
                        <span className="enchantment-stat-icon">{statInfo.icon}</span>
                        <span className="enchantment-stat-name">{statInfo.fullName}</span>
                      </div>
                      <div className="enchantment-stat-buttons">
                        {[1, 2, 3, 4].map((bonus) => {
                          const statId = `${stat.toLowerCase()}_boost_${bonus}`;
                          const isApplied = isModificationApplied(statId);
                          const isThisLoading = loadingEnchantmentId === statId;

                          const createEnchantment = () => {
                            switch (stat) {
                              case 'STR': return createStrengthEnchantment(bonus as 1|2|3|4);
                              case 'DEX': return createDexterityEnchantment(bonus as 1|2|3|4);
                              case 'CON': return createConstitutionEnchantment(bonus as 1|2|3|4);
                              case 'INT': return createIntelligenceEnchantment(bonus as 1|2|3|4);
                              case 'WIS': return createWisdomEnchantment(bonus as 1|2|3|4);
                              case 'CHA': return createCharismaEnchantment(bonus as 1|2|3|4);
                              default: return null;
                            }
                          };

                          return (
                            <Button
                              key={bonus}
                              variant={isApplied ? 'secondary' : 'outline'}
                              size="sm"
                              onClick={async () => {
                                const enchantment = createEnchantment();
                                if (enchantment && item) {
                                  setLoadingEnchantmentId(statId);
                                  try {
                                    await onEnchant(item.name, enchantment);
                                  } finally {
                                    setLoadingEnchantmentId(null);
                                  }
                                }
                              }}
                              isLoading={isThisLoading}
                              disabled={isLoading || isThisLoading}
                              className="enchantment-stat-btn"
                            >
                              +{bonus}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'curse' && (
            <div className="enchantment-list">
              {/* Warning text */}
              <div className="enchantment-warning-text">
                <AlertTriangle size={14} />
                <span>Warning: Curses have negative effects. Some curses may prevent unequipping the item.</span>
              </div>

              {/* Curse Grid */}
              <div className="enchantment-grid">
                {Object.entries(availableCurses).map(([id, curse]) => {
                  const info = getCurseDisplayInfo(id, curse);
                  const isApplied = isModificationApplied(id);
                  const isThisLoading = loadingEnchantmentId === id;

                  return (
                    <div
                      key={id}
                      className={`enchantment-card enchantment-card-curse ${isApplied ? 'enchantment-card-applied' : ''}`}
                    >
                      <div className="enchantment-card-header">
                        <span className="enchantment-card-icon">{info.icon}</span>
                        <span className="enchantment-card-name">{info.name}</span>
                        {info.locksItem && (
                          <span className="enchantment-card-locks-badge" title="This curse locks the item">
                            🔒
                          </span>
                        )}
                        {isApplied && (
                          <span className="enchantment-card-applied-badge">Applied</span>
                        )}
                      </div>
                      <p className="enchantment-card-description">{info.description}</p>
                      {info.warningMessage && !isApplied && (
                        <p className="enchantment-card-warning">{info.warningMessage}</p>
                      )}
                      <div className="enchantment-card-footer">
                        <span className="enchantment-card-rarity enchantment-rarity-curse">
                          Curse
                        </span>
                        <Button
                          variant={isApplied ? 'secondary' : 'destructive'}
                          size="sm"
                          onClick={() => handleApplyCurse(id, curse)}
                          isLoading={isThisLoading}
                          disabled={isLoading || isThisLoading || isApplied}
                        >
                          {isApplied ? 'Applied' : 'Curse'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="enchantment-modal-footer">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EnchantmentModal;
