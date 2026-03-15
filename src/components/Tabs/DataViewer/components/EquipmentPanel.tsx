/**
 * EquipmentPanel Component
 *
 * Displays a grid of equipment items with their properties, granted skills/spells/features, and tags.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.7
 */

import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import type { Equipment, EnhancedEquipment, EquipmentMiniFeature } from 'playlist-data-engine';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { CustomContentBadge } from '../CustomContentBadge';
import { RARITY_COLORS, RARITY_BG_COLORS } from '../constants';
import { formatRarity, formatSpawnWeight, formatCondition, formatSpellLevelShort, formatSpellUses } from '../utils';
import { getPropertyTypeConfig } from '../constants/propertyTypes';

/**
 * Type guard to check if an equipment item has enhanced properties.
 * Re-exported from useDataViewer for use within this component.
 */
function isEnhancedEquipment(item: Equipment | EnhancedEquipment): item is EnhancedEquipment & {
  grantsFeatures?: NonNullable<Equipment['grantsFeatures']>;
  grantsSkills?: NonNullable<Equipment['grantsSkills']>;
  grantsSpells?: NonNullable<Equipment['grantsSpells']>;
  tags?: NonNullable<Equipment['tags']>;
  spawnWeight?: NonNullable<Equipment['spawnWeight']>;
  properties?: NonNullable<Equipment['properties']>;
} {
  return (
    item.grantsFeatures !== undefined ||
    item.grantsSkills !== undefined ||
    item.grantsSpells !== undefined ||
    item.tags !== undefined ||
    item.spawnWeight !== undefined ||
    (item.properties !== undefined && item.properties.length > 0)
  );
}

/**
 * Props for the EquipmentPanel component
 */
export interface EquipmentPanelProps {
  /** Array of equipment items to display (already filtered) */
  equipment: Equipment[];
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'equipment', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'equipment', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'equipment', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'equipment', itemName: string) => boolean;
}

/**
 * Render granted skills section for enhanced equipment
 *
 * Task 1.2: Display grantsSkills on Equipment Cards
 *
 * Displays skills granted by equipment with proficiency level.
 */
function renderGrantedSkills(item: Equipment): JSX.Element | null {
  if (!isEnhancedEquipment(item) || !item.grantsSkills || item.grantsSkills.length === 0) {
    return null;
  }

  return (
    <div className="dataviewer-item-section">
      <span className="dataviewer-item-section-title">Skills:</span>
      <div className="dataviewer-item-tags">
        {item.grantsSkills.map((skill, idx) => (
          <span key={idx} className="dataviewer-tag dataviewer-tag-skill">
            {skill.skillId} ({skill.level})
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Render granted spells section for enhanced equipment
 *
 * Task 1.3: Display grantsSpells on Equipment Cards
 *
 * Displays spells granted by equipment with level, uses, and recharge info.
 * Uses purple tag styling (`.dataviewer-tag-spell`) to distinguish from other grants.
 */
function renderGrantedSpells(item: Equipment): JSX.Element | null {
  if (!isEnhancedEquipment(item) || !item.grantsSpells || item.grantsSpells.length === 0) {
    return null;
  }

  return (
    <div className="dataviewer-item-section">
      <span className="dataviewer-item-section-title">Spells:</span>
      <div className="dataviewer-item-tags">
        {item.grantsSpells.map((spell, idx) => {
          const levelStr = spell.level !== undefined ? ` ${formatSpellLevelShort(spell.level)} level` : '';
          const usesStr = formatSpellUses(spell.uses, spell.recharge);
          return (
            <span key={idx} className="dataviewer-tag dataviewer-tag-spell">
              {spell.spellId}{levelStr}, {usesStr}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Render granted features section for enhanced equipment
 *
 * Task 1.4: Display grantsFeatures on Equipment Cards
 *
 * Displays features granted by equipment. Features can be:
 * 1. String references to registry features (e.g., 'darkvision')
 * 2. Inline EquipmentMiniFeature objects with name/description/effects
 *
 * Uses blue tag styling (`.dataviewer-tag-feature`) to distinguish from other grants.
 */
function renderGrantedFeatures(item: Equipment): JSX.Element | null {
  if (!isEnhancedEquipment(item) || !item.grantsFeatures || item.grantsFeatures.length === 0) {
    return null;
  }

  return (
    <div className="dataviewer-item-section">
      <span className="dataviewer-item-section-title">Features:</span>
      <div className="dataviewer-item-tags">
        {item.grantsFeatures.map((feature, idx) => {
          // Check if feature is a string (registry reference) or inline object
          if (typeof feature === 'string') {
            // Registry feature reference - show the feature ID
            return (
              <span key={idx} className="dataviewer-tag dataviewer-tag-feature">
                {feature}
              </span>
            );
          } else {
            // Inline feature object - show name and optional description
            const inlineFeature = feature as EquipmentMiniFeature;
            return (
              <span
                key={idx}
                className="dataviewer-tag dataviewer-tag-feature"
                title={inlineFeature.description || inlineFeature.name}
              >
                {inlineFeature.name}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
}

/**
 * Render tags section for enhanced equipment
 *
 * Task 1.5: Display Equipment Tags
 *
 * Displays tags at the bottom of expanded equipment cards.
 */
function renderTags(item: Equipment): JSX.Element | null {
  if (!isEnhancedEquipment(item) || !item.tags || item.tags.length === 0) {
    return null;
  }

  return (
    <div className="dataviewer-item-section">
      <span className="dataviewer-item-section-title">Tags:</span>
      <div className="dataviewer-item-tags">
        {item.tags.map((tag, idx) => (
          <span key={idx} className="dataviewer-tag dataviewer-tag-label">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a single equipment card
 */
function EquipmentCard({
  item,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  item: Equipment;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const rarityColor = RARITY_COLORS[item.rarity || 'common'] || RARITY_COLORS.common;
  const rarityBg = RARITY_BG_COLORS[item.rarity || 'common'] || RARITY_BG_COLORS.common;
  const spawnWeightBadge = formatSpawnWeight(item.spawnWeight);
  const isCustom = checkIsCustomItem(item.name);
  const hasImage = item.image || item.icon;

  return (
    <div
      className="dataviewer-item-card"
      style={{ backgroundColor: rarityBg }}
    >
      <div
        className="dataviewer-item-header"
        onClick={onToggle}
      >
        {/* Equipment image/icon thumbnail */}
        {hasImage && (
          <div className="dataviewer-item-thumbnail">
            <ArweaveImage
              src={item.image || item.icon || ''}
              alt={item.name}
              width={40}
              height={40}
              showShimmer={true}
              fallback={
                <div className="dataviewer-item-thumbnail-fallback">
                  <Package size={20} />
                </div>
              }
            />
          </div>
        )}
        <div className="dataviewer-item-header-content">
          <span className="dataviewer-item-name" style={{ color: rarityColor }}>
            {item.name}
          </span>
          <div className="dataviewer-item-badges">
            <span className="dataviewer-badge dataviewer-badge-secondary">
              {item.type}
            </span>
            {/* Custom Content Badge */}
            {isCustom && (
              <CustomContentBadge
                category="equipment"
                itemName={item.name}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                showActions={isExpanded}
                size="sm"
              />
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {isExpanded && (
        <div className="dataviewer-item-details">
          {/* Full-size equipment image when expanded */}
          {item.image && (
            <div className="dataviewer-item-image">
              <ArweaveImage
                src={item.image}
                alt={item.name}
                width={200}
                height={200}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-item-image-fallback">
                    <Package size={48} />
                  </div>
                }
              />
            </div>
          )}
          <div className="dataviewer-item-stats">
            {item.rarity && (
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Rarity:</span>
                <span className="dataviewer-item-stat-value" style={{ color: rarityColor }}>
                  {formatRarity(item.rarity)}
                </span>
              </div>
            )}
            <div className="dataviewer-item-stat">
              <span className="dataviewer-item-stat-label">Weight:</span>
              <span className="dataviewer-item-stat-value">{item.weight} lb</span>
            </div>
            {item.damage && (
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Damage:</span>
                <span className="dataviewer-item-stat-value">
                  {item.damage.dice} {item.damage.damageType}
                </span>
              </div>
            )}
            {item.acBonus !== undefined && (
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">AC:</span>
                <span className="dataviewer-item-stat-value">+{item.acBonus}</span>
              </div>
            )}
            {item.spawnWeight !== undefined && (
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Spawn:</span>
                <span className="dataviewer-item-stat-value">
                  {spawnWeightBadge ? spawnWeightBadge.label : `Normal (${item.spawnWeight})`}
                </span>
              </div>
            )}
          </div>
          {/* Equipment description */}
          {item.description && (
            <div className="dataviewer-item-description">
              {item.description}
            </div>
          )}
          {item.properties && item.properties.length > 0 && (
            <div className="dataviewer-item-section">
              <span className="dataviewer-item-section-title">Properties:</span>
              <div className="dataviewer-item-tags">
                {item.properties.map((prop, idx) => {
                  const conditionStr = formatCondition(prop.condition);
                  const displayText = prop.description || `${prop.type}: ${prop.target}`;
                  const propConfig = getPropertyTypeConfig(prop.type);
                  const PropIcon = propConfig.icon;
                  return (
                    <span key={idx} className="dataviewer-tag dataviewer-tag-property dataviewer-tag-with-icon">
                      <PropIcon size={12} className="dataviewer-tag-icon" />
                      {displayText}{conditionStr ? ` (${conditionStr})` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {/* Granted Skills Section */}
          {renderGrantedSkills(item)}
          {/* Granted Spells Section */}
          {renderGrantedSpells(item)}
          {/* Granted Features Section */}
          {renderGrantedFeatures(item)}
          {/* Tags Section */}
          {renderTags(item)}
        </div>
      )}
    </div>
  );
}

/**
 * EquipmentPanel - Displays a grid of equipment items with their details
 */
export function EquipmentPanel({
  equipment,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: EquipmentPanelProps) {
  return (
    <div className="dataviewer-grid">
      {equipment.map(item => {
        const isExpanded = expandedItems.has(item.name);

        return (
          <EquipmentCard
            key={item.name}
            item={item}
            isExpanded={isExpanded}
            onToggle={() => toggleExpanded(item.name)}
            onEdit={() => onEdit('equipment', item.name)}
            onDelete={() => onDelete('equipment', item.name)}
            onDuplicate={() => onDuplicate('equipment', item.name)}
            checkIsCustomItem={(itemName) => checkIsCustomItem('equipment', itemName)}
          />
        );
      })}
    </div>
  );
}
