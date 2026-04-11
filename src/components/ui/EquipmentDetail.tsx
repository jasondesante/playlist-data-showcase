/**
 * EquipmentDetail Component
 *
 * Displays comprehensive item information for EnhancedEquipment.
 * Reusable across ItemsTab, Loot Box section, and Item Creator section.
 *
 * Features:
 * - Name with rarity color coding
 * - Type and rarity badges
 * - Weight display
 * - Damage info (for weapons)
 * - AC info (for armor)
 * - Properties list if present
 * - Granted features if present
 * - Granted skills if present
 * - Granted spells if present
 * - Weapon properties (finesse, versatile, etc.)
 * - Spawn weight indicator
 * - Source indicator (default/custom)
 */

import type { EnhancedEquipment } from 'playlist-data-engine';
import { Sword, Shield, Package, Sparkles, Target, Zap, BookOpen, Crown, Scale } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { formatWeaponDamage } from '@/utils/formatWeaponDamage';

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

const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.1)',
  'uncommon': 'hsl(120 60% 40% / 0.1)',
  'rare': 'hsl(210 80% 50% / 0.1)',
  'very_rare': 'hsl(270 60% 50% / 0.1)',
  'legendary': 'hsl(30 90% 50% / 0.15)'
};

const RARITY_BORDER_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.3)',
  'uncommon': 'hsl(120 60% 40% / 0.4)',
  'rare': 'hsl(210 80% 50% / 0.4)',
  'very_rare': 'hsl(270 60% 50% / 0.4)',
  'legendary': 'hsl(30 90% 50% / 0.5)'
};

export interface EquipmentDetailProps {
  /** The equipment item to display */
  equipment: EnhancedEquipment;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show compact view (default: false) */
  compact?: boolean;
  /** Whether to show granted features (default: true) */
  showFeatures?: boolean;
  /** Whether to show granted skills (default: true) */
  showSkills?: boolean;
  /** Whether to show granted spells (default: true) */
  showSpells?: boolean;
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
 * Format property type for display
 */
function formatPropertyType(type: string): string {
  switch (type) {
    case 'stat_bonus':
      return 'Stat Bonus';
    case 'skill_proficiency':
      return 'Skill Proficiency';
    case 'ability_unlock':
      return 'Ability Unlock';
    case 'passive_modifier':
      return 'Passive Modifier';
    case 'special_property':
      return 'Special Property';
    case 'damage_bonus':
      return 'Damage Bonus';
    case 'stat_requirement':
      return 'Stat Requirement';
    default:
      return type;
  }
}

/**
 * Format condition for display
 */
function formatCondition(condition: any): string | null {
  if (!condition) return null;

  switch (condition.type) {
    case 'vs_creature_type':
      return `vs ${condition.value}`;
    case 'at_time_of_day':
      return `at ${condition.value}`;
    case 'wielder_race':
      return `wielder: ${condition.value}`;
    case 'wielder_class':
      return `wielder: ${condition.value}`;
    case 'while_equipped':
      return 'while equipped';
    case 'on_hit':
      return 'on hit';
    case 'on_damage_taken':
      return 'on damage taken';
    case 'custom':
      return condition.description || condition.value;
    default:
      return null;
  }
}

/**
 * EquipmentDetail Component
 */
export function EquipmentDetail({
  equipment,
  className = '',
  compact = false,
  showFeatures = true,
  showSkills = true,
  showSpells = true
}: EquipmentDetailProps) {
  const { settings } = useAppStore();
  const TypeIcon = getEquipmentTypeIcon(equipment.type);
  const rarityColor = RARITY_COLORS[equipment.rarity] || RARITY_COLORS.common;
  const bgColor = RARITY_BG_COLORS[equipment.rarity] || RARITY_BG_COLORS.common;
  const borderColor = RARITY_BORDER_COLORS[equipment.rarity] || RARITY_BORDER_COLORS.common;

  const hasProperties = equipment.properties && equipment.properties.length > 0;
  const hasGrantedFeatures = equipment.grantsFeatures && equipment.grantsFeatures.length > 0;
  const hasGrantedSkills = equipment.grantsSkills && equipment.grantsSkills.length > 0;
  const hasGrantedSpells = equipment.grantsSpells && equipment.grantsSpells.length > 0;
  const hasWeaponProperties = equipment.weaponProperties && equipment.weaponProperties.length > 0;

  return (
    <div
      className={`equipment-detail ${compact ? 'equipment-detail-compact' : ''} ${className}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor
      }}
    >
      {/* Header with name, type, and rarity */}
      <div className="equipment-detail-header">
        <div className="equipment-detail-title">
          <TypeIcon size={compact ? 16 : 18} style={{ color: rarityColor }} />
          <h3
            className="equipment-detail-name"
            style={{ color: rarityColor }}
            title={equipment.name}
          >
            {equipment.name}
          </h3>
        </div>
        <div className="equipment-detail-badges">
          <span
            className="equipment-detail-rarity"
            style={{ color: rarityColor }}
          >
            {formatRarity(equipment.rarity)}
          </span>
          <span className="equipment-detail-type">
            {equipment.type.charAt(0).toUpperCase() + equipment.type.slice(1)}
          </span>
          {equipment.source === 'custom' && (
            <span className="equipment-detail-source-custom">Custom</span>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="equipment-detail-stats">
        {/* Weight */}
        <div className="equipment-detail-stat">
          <Scale size={14} className="equipment-detail-stat-icon" />
          <span className="equipment-detail-stat-label">Weight:</span>
          <span className="equipment-detail-stat-value">{equipment.weight} lb</span>
        </div>

        {/* Damage (weapons) */}
        {equipment.damage && (
          <div className="equipment-detail-stat">
            <Zap size={14} className="equipment-detail-stat-icon" />
            <span className="equipment-detail-stat-label">Damage:</span>
            <span className="equipment-detail-stat-value">
              {formatWeaponDamage(equipment.damage.dice, equipment.damage.damageType, settings.damageDisplay)}
              {equipment.damage.versatile && ` (${equipment.damage.versatile} versatile)`}
            </span>
          </div>
        )}

        {/* AC Bonus (armor) */}
        {equipment.acBonus !== undefined && (
          <div className="equipment-detail-stat">
            <Shield size={14} className="equipment-detail-stat-icon" />
            <span className="equipment-detail-stat-label">AC:</span>
            <span className="equipment-detail-stat-value">+{equipment.acBonus}</span>
          </div>
        )}

        {/* Spawn Weight */}
        {equipment.spawnWeight !== undefined && (
          <div className="equipment-detail-stat">
            <Target size={14} className="equipment-detail-stat-icon" />
            <span className="equipment-detail-stat-label">Spawn Weight:</span>
            <span className="equipment-detail-stat-value">
              {equipment.spawnWeight === 0 ? 'Never' : equipment.spawnWeight}
            </span>
          </div>
        )}
      </div>

      {/* Weapon Properties */}
      {hasWeaponProperties && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <Sword size={14} />
            <span className="equipment-detail-section-title">Weapon Properties</span>
          </div>
          <div className="equipment-detail-tags">
            {equipment.weaponProperties?.map((prop, index) => (
              <span key={index} className="equipment-detail-tag">
                {prop}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Equipment Properties */}
      {hasProperties && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <Sparkles size={14} />
            <span className="equipment-detail-section-title">Properties</span>
          </div>
          <div className="equipment-detail-properties">
            {equipment.properties?.map((prop, index) => {
              const condition = formatCondition(prop.condition);
              return (
                <div key={index} className="equipment-detail-property">
                  <span className="equipment-detail-property-type">
                    {formatPropertyType(prop.type)}
                  </span>
                  <span className="equipment-detail-property-target">
                    {prop.target}
                  </span>
                  <span className="equipment-detail-property-value">
                    {typeof prop.value === 'boolean' ? (prop.value ? 'Yes' : 'No') : prop.value}
                  </span>
                  {condition && (
                    <span className="equipment-detail-property-condition">
                      ({condition})
                    </span>
                  )}
                  {prop.description && (
                    <span className="equipment-detail-property-description">
                      {prop.description}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Granted Features */}
      {hasGrantedFeatures && showFeatures && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <Crown size={14} />
            <span className="equipment-detail-section-title">Grants Features</span>
          </div>
          <div className="equipment-detail-list">
            {equipment.grantsFeatures?.map((feature, index) => {
              const isInline = typeof feature === 'object' && 'id' in feature;
              const featureName = isInline ? (feature as any).name : feature;
              return (
                <div key={index} className="equipment-detail-list-item">
                  <span>{featureName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Granted Skills */}
      {hasGrantedSkills && showSkills && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <Target size={14} />
            <span className="equipment-detail-section-title">Grants Skills</span>
          </div>
          <div className="equipment-detail-list">
            {equipment.grantsSkills?.map((skill, index) => (
              <div key={index} className="equipment-detail-list-item">
                <span className="equipment-detail-skill-name">{skill.skillId}</span>
                <span className={`equipment-detail-skill-level equipment-detail-skill-level-${skill.level}`}>
                  {skill.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Granted Spells */}
      {hasGrantedSpells && showSpells && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <BookOpen size={14} />
            <span className="equipment-detail-section-title">Grants Spells</span>
          </div>
          <div className="equipment-detail-list">
            {equipment.grantsSpells?.map((spell, index) => (
              <div key={index} className="equipment-detail-list-item">
                <span className="equipment-detail-spell-name">{spell.spellId}</span>
                {spell.level !== undefined && (
                  <span className="equipment-detail-spell-level">Level {spell.level}</span>
                )}
                {spell.uses && (
                  <span className="equipment-detail-spell-uses">{spell.uses} uses</span>
                )}
                {spell.recharge && (
                  <span className="equipment-detail-spell-recharge">Recharge: {spell.recharge}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {equipment.tags && equipment.tags.length > 0 && !compact && (
        <div className="equipment-detail-section">
          <div className="equipment-detail-section-header">
            <Package size={14} />
            <span className="equipment-detail-section-title">Tags</span>
          </div>
          <div className="equipment-detail-tags">
            {equipment.tags.map((tag, index) => (
              <span key={index} className="equipment-detail-tag equipment-detail-tag-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentDetail;
