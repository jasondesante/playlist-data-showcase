/**
 * DataViewerTab Component
 *
 * A comprehensive data browser for all game content from playlist-data-engine.
 * Allows users to explore spells, skills, features, races, classes, and equipment.
 *
 * ## Core Features
 * - Category selector for different data types (spells, skills, features, races, classes, equipment)
 * - Search/filter functionality for each category
 * - Spell filtering by level and school
 * - Equipment filtering by type, rarity, and tags
 * - Grouped displays for skills, class features, and racial traits
 * - Rarity and school color coding
 * - Raw JSON dump for detailed data inspection
 *
 * ## Enhanced Equipment Display (Phase 1)
 * - Granted skills display with proficiency level (grantsSkills)
 * - Granted spells with level, uses, and recharge info (grantsSpells)
 * - Granted features (both registry references and inline) (grantsFeatures)
 * - Equipment tags display and filtering
 * - Spawn weight badges: Game-Only, Rare Spawn, Uncommon
 *
 * ## Conditional Properties (Phase 2)
 * - Inline condition formatting on equipment properties
 * - Property type icons: stat_bonus, skill_proficiency, ability_unlock, etc.
 * - Condition types: vs_creature_type, at_time_of_day, wielder_race/class, on_hit, etc.
 *
 * ## Subrace Display (Phase 4)
 * - Full subrace expansion with ability bonuses
 * - Subrace-specific traits list
 * - Subrace requirements display (e.g., ability minimums)
 *
 * ## Effects Viewer (Phase 5)
 * - Feature effects display with type, target, value, and condition
 * - Racial trait effects with prerequisites
 * - Reusable EffectsList component with stacking indicators
 *
 * @see docs/plans/DATAVIEWER_ENHANCEMENT_PLAN.md for implementation details
 * @see src/hooks/useDataViewer.ts for data fetching and filtering logic
 * @see src/components/ui/EffectDisplay.tsx for the reusable effects list component
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  Scroll,
  Sword,
  Shield,
  Users,
  Sparkles,
  Package,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  RefreshCw,
  TrendingUp,
  Award,
  Flame,
  Star,
  Eye,
  Palette,
  User,
  Smile
} from 'lucide-react';
import { useDataViewer, type DataCategory, type DataCounts, type RaceDataEntry, type ClassDataEntry, type AppearanceCategoryData, isEnhancedEquipment } from '../../hooks/useDataViewer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { EffectList, type FeatureEffect } from '../ui/EffectDisplay';
import { useDataViewerStore } from '../../store/dataViewerStore';
import './DataViewerTab.css';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment, EquipmentCondition, FeaturePrerequisite } from 'playlist-data-engine';

/**
 * Spell school color mapping
 */
const SCHOOL_COLORS: Record<string, string> = {
  'Abjuration': 'hsl(210 80% 50%)',      // Blue
  'Conjuration': 'hsl(120 60% 40%)',     // Green
  'Divination': 'hsl(270 60% 50%)',      // Purple
  'Enchantment': 'hsl(300 60% 50%)',     // Magenta
  'Evocation': 'hsl(0 70% 50%)',         // Red
  'Illusion': 'hsl(180 60% 45%)',        // Cyan
  'Necromancy': 'hsl(150 60% 30%)',      // Dark Green
  'Transmutation': 'hsl(30 90% 50%)',    // Orange
};

/**
 * Spell school background colors
 */
const SCHOOL_BG_COLORS: Record<string, string> = {
  'Abjuration': 'hsl(210 80% 50% / 0.1)',
  'Conjuration': 'hsl(120 60% 40% / 0.1)',
  'Divination': 'hsl(270 60% 50% / 0.1)',
  'Enchantment': 'hsl(300 60% 50% / 0.1)',
  'Evocation': 'hsl(0 70% 50% / 0.1)',
  'Illusion': 'hsl(180 60% 45% / 0.1)',
  'Necromancy': 'hsl(150 60% 30% / 0.1)',
  'Transmutation': 'hsl(30 90% 50% / 0.1)',
};

/**
 * Rarity color mapping
 */
const RARITY_COLORS: Record<string, string> = {
  'common': 'var(--color-text-secondary)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};

/**
 * Rarity background colors
 */
const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.1)',
  'uncommon': 'hsl(120 60% 40% / 0.1)',
  'rare': 'hsl(210 80% 50% / 0.1)',
  'very_rare': 'hsl(270 60% 50% / 0.1)',
  'legendary': 'hsl(30 90% 50% / 0.15)'
};

/**
 * Ability score color mapping
 */
const ABILITY_COLORS: Record<string, string> = {
  'STR': 'hsl(0 70% 50%)',      // Red
  'DEX': 'hsl(120 60% 40%)',    // Green
  'CON': 'hsl(30 90% 50%)',     // Orange
  'INT': 'hsl(210 80% 50%)',    // Blue
  'WIS': 'hsl(270 60% 50%)',    // Purple
  'CHA': 'hsl(300 60% 50%)',    // Magenta
};

/**
 * Equipment property type configuration with icons
 * Maps property types to appropriate icons for visual identification
 *
 * Task 2.3: Property Icon System
 */
const PROPERTY_TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; label: string }> = {
  'stat_bonus': { icon: TrendingUp, label: 'Stat Bonus' },
  'skill_proficiency': { icon: Award, label: 'Skill' },
  'ability_unlock': { icon: Sparkles, label: 'Ability' },
  'passive_modifier': { icon: Shield, label: 'Passive' },
  'damage_bonus': { icon: Flame, label: 'Damage' },
  'special_property': { icon: Star, label: 'Special' },
  // Fallback for unknown types
  'default': { icon: Zap, label: 'Property' }
};

/**
 * Get property type configuration, with fallback to default
 *
 * Task 2.3: Property Icon System
 *
 * Returns the icon and label for a given property type, used to visually
 * identify different equipment property types in the UI.
 *
 * @param type - The property type string (e.g., 'stat_bonus', 'skill_proficiency')
 * @returns Configuration object with icon component and label string
 *
 * @example
 * const config = getPropertyTypeConfig('stat_bonus');
 * // Returns: { icon: TrendingUp, label: 'Stat Bonus' }
 *
 * const config = getPropertyTypeConfig('unknown_type');
 * // Returns: { icon: Zap, label: 'Property' } (default fallback)
 */
function getPropertyTypeConfig(type: string) {
  return PROPERTY_TYPE_CONFIG[type] || PROPERTY_TYPE_CONFIG['default'];
}

/**
 * Category configuration with icons and labels
 */
const CATEGORY_CONFIG: Record<DataCategory, { label: string; icon: typeof Database; countKey: keyof DataCounts }> = {
  spells: { label: 'Spells', icon: Scroll, countKey: 'spells' },
  skills: { label: 'Skills', icon: Target, countKey: 'skills' },
  classFeatures: { label: 'Class Features', icon: Sword, countKey: 'classFeatures' },
  racialTraits: { label: 'Racial Traits', icon: Users, countKey: 'racialTraits' },
  races: { label: 'Races', icon: Shield, countKey: 'races' },
  classes: { label: 'Classes', icon: Zap, countKey: 'classes' },
  equipment: { label: 'Equipment', icon: Package, countKey: 'equipment' },
  appearance: { label: 'Appearance', icon: Eye, countKey: 'appearance' },
};

/**
 * Format level number to ordinal string
 *
 * Converts numeric spell levels to display-friendly ordinal strings.
 *
 * @param level - The spell level (0-9)
 * @returns Ordinal string (e.g., "Cantrip", "1st", "2nd", "3rd", "4th")
 *
 * @example
 * formatLevel(0)  // "Cantrip"
 * formatLevel(1)  // "1st"
 * formatLevel(2)  // "2nd"
 * formatLevel(3)  // "3rd"
 * formatLevel(4)  // "4th"
 */
function formatLevel(level: number): string {
  if (level === 0) return 'Cantrip';
  if (level === 1) return '1st';
  if (level === 2) return '2nd';
  if (level === 3) return '3rd';
  return `${level}th`;
}

/**
 * Format rarity for display
 *
 * Converts snake_case rarity strings to Title Case display strings.
 *
 * @param rarity - The rarity string in snake_case (e.g., 'very_rare')
 * @returns Title Case string (e.g., "Very Rare")
 *
 * @example
 * formatRarity('common')     // "Common"
 * formatRarity('very_rare')  // "Very Rare"
 * formatRarity('legendary')  // "Legendary"
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format ability bonus for display
 *
 * Converts numeric bonus to display string with appropriate sign prefix.
 *
 * @param bonus - The numeric bonus value (positive, zero, or negative)
 * @returns Formatted string with sign prefix (e.g., "+2", "-1", "+0")
 *
 * @example
 * formatAbilityBonus(2)   // "+2"
 * formatAbilityBonus(0)   // "+0"
 * formatAbilityBonus(-1)  // "-1"
 */
function formatAbilityBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * Format spawn weight for display with category labels
 *
 * Spawn weight categories:
 * - spawnWeight === 0: "Game-Only" - never spawns randomly, used by game logic only
 * - spawnWeight < 0.1: "Rare Spawn" - very low probability
 * - spawnWeight < 0.5: "Uncommon" - lower than average probability
 * - spawnWeight >= 0.5: no badge (normal/common spawn)
 *
 * @param weight - The spawn weight value (0-1 typically)
 * @returns Object with label and CSS class, or null for normal items
 */
function formatSpawnWeight(weight: number | undefined): { label: string; className: string } | null {
  if (weight === undefined) return null;
  if (weight === 0) return { label: 'Game-Only', className: 'dataviewer-badge-gameonly' };
  if (weight < 0.1) return { label: 'Rare Spawn', className: 'dataviewer-badge-rare-spawn' };
  if (weight < 0.5) return { label: 'Uncommon', className: 'dataviewer-badge-uncommon-spawn' };
  return null;
}

/**
 * Format equipment condition for display
 *
 * Converts EquipmentCondition objects into human-readable strings.
 *
 * Condition formats:
 * - vs_creature_type: "vs Dragons", "vs Undead"
 * - at_time_of_day: "at Night", "at Dawn"
 * - wielder_race: "Elf only", "Dwarf only"
 * - wielder_class: "Paladin only", "Rogue only"
 * - while_equipped: "(implicit - always active when equipped)"
 * - on_hit: "on hit"
 * - on_damage_taken: "when hit"
 * - custom: uses the custom description
 *
 * @param condition - The EquipmentCondition object to format
 * @returns Human-readable condition string, or empty string if no condition
 *
 * @example
 * ```tsx
 * formatCondition({ type: 'vs_creature_type', value: 'dragon' }) // "vs Dragon"
 * formatCondition({ type: 'at_time_of_day', value: 'night' }) // "at Night"
 * formatCondition({ type: 'wielder_race', value: 'Elf' }) // "Elf only"
 * ```
 */
function formatCondition(condition: EquipmentCondition | undefined): string {
  if (!condition) return '';

  switch (condition.type) {
    case 'vs_creature_type':
      // Capitalize the creature type (e.g., "dragon" → "Dragon")
      return `vs ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'at_time_of_day':
      // Format time of day (e.g., "night" → "at Night")
      return `at ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'wielder_race':
      // Format race restriction (e.g., "elf" → "Elf only")
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'wielder_class':
      // Format class restriction (e.g., "paladin" → "Paladin only")
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'while_equipped':
      // Implicit condition - property is always active when equipped
      // Return empty string since this is the default behavior
      return '';

    case 'on_hit':
      // Trigger condition for weapon hits
      return 'on hit';

    case 'on_damage_taken':
      // Trigger condition when wearer takes damage
      return 'when hit';

    case 'custom':
      // Use the custom description if provided, otherwise the value
      return condition.description || condition.value;

    default:
      // Exhaustiveness check - this should never happen
      return '';
  }
}

export function DataViewerTab() {
  const {
    isLoading,
    error,
    spells,
    skills,
    classFeatures,
    racialTraits,
    races,
    classes,
    equipment,
    appearance,
    dataCounts,
    filterByName,
    filterSpellsByLevel,
    filterSpellsBySchool,
    filterEquipmentByType,
    filterEquipmentByRarity,
    filterEquipmentByTag,
    groupSkillsByAbility,
    groupClassFeaturesByClass,
    groupRacialTraitsByRace,
    refreshData,
    getSpellSchools,
    getEquipmentRarities,
    getEquipmentTags
  } = useDataViewer();

  // Get Data Viewer store actions
  const { markChangesViewed, updateEquipmentCount, hasEquipmentCountIncreased } = useDataViewerStore();

  // State
  const [activeCategory, setActiveCategory] = useState<DataCategory>('spells');
  const [showNewItemsIndicator, setShowNewItemsIndicator] = useState(false);

  // Mark changes as viewed when tab is mounted and check for new items
  useEffect(() => {
    markChangesViewed();
    // Check if equipment count has increased
    if (hasEquipmentCountIncreased(dataCounts.equipment)) {
      setShowNewItemsIndicator(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowNewItemsIndicator(false), 5000);
      return () => clearTimeout(timer);
    }
    // Update the stored equipment count to current count
    updateEquipmentCount(dataCounts.equipment);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Spell filters
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<string | 'all'>('all');

  // Equipment filters
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<'weapon' | 'armor' | 'item' | 'all'>('all');
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState<string | 'all'>('all');
  // Task 3.1: Tags filter state
  const [equipmentTagFilter, setEquipmentTagFilter] = useState<string | 'all'>('all');

  // Toggle expanded state for an item
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Get filtered data based on active category and filters
  const getFilteredData = useMemo(() => {
    switch (activeCategory) {
      case 'spells': {
        let filtered = spells;
        if (spellLevelFilter !== 'all') {
          filtered = filterSpellsByLevel(filtered, spellLevelFilter);
        }
        if (spellSchoolFilter !== 'all') {
          filtered = filterSpellsBySchool(filtered, spellSchoolFilter);
        }
        return filterByName(filtered, searchTerm);
      }
      case 'skills':
        return filterByName(skills, searchTerm);
      case 'classFeatures':
        return filterByName(classFeatures, searchTerm);
      case 'racialTraits':
        return filterByName(racialTraits, searchTerm);
      case 'races':
        return filterByName(races, searchTerm);
      case 'classes':
        return filterByName(classes, searchTerm);
      case 'equipment': {
        let filtered = equipment;
        if (equipmentTypeFilter !== 'all') {
          filtered = filterEquipmentByType(filtered, equipmentTypeFilter);
        }
        if (equipmentRarityFilter !== 'all') {
          filtered = filterEquipmentByRarity(filtered, equipmentRarityFilter);
        }
        // Task 3.4: Tag filtering logic
        if (equipmentTagFilter !== 'all') {
          filtered = filterEquipmentByTag(filtered, equipmentTagFilter);
        }
        return filterByName(filtered, searchTerm);
      }
      case 'appearance':
        return filterByName(appearance, searchTerm);
      default:
        return [];
    }
  }, [
    activeCategory,
    spells,
    skills,
    classFeatures,
    racialTraits,
    races,
    classes,
    equipment,
    appearance,
    searchTerm,
    spellLevelFilter,
    spellSchoolFilter,
    equipmentTypeFilter,
    equipmentRarityFilter,
    equipmentTagFilter,
    filterByName,
    filterSpellsByLevel,
    filterSpellsBySchool,
    filterEquipmentByType,
    filterEquipmentByRarity,
    filterEquipmentByTag
  ]);

  // Render category selector
  const renderCategorySelector = () => (
    <div className="dataviewer-category-selector">
      {(Object.keys(CATEGORY_CONFIG) as DataCategory[]).map((category) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const isActive = activeCategory === category;
        const count = dataCounts[config.countKey];

        return (
          <button
            key={category}
            className={`dataviewer-category-btn ${isActive ? 'dataviewer-category-btn-active' : ''}`}
            onClick={() => {
              setActiveCategory(category);
              setSearchTerm('');
              setExpandedItems(new Set());
            }}
          >
            <Icon size={18} />
            <span className="dataviewer-category-label">{config.label}</span>
            <span className="dataviewer-category-count">{count}</span>
          </button>
        );
      })}
    </div>
  );

  // Render spell filters
  const renderSpellFilters = () => (
    <div className="dataviewer-filters">
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">Level</label>
        <select
          value={spellLevelFilter}
          onChange={(e) => setSpellLevelFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="dataviewer-filter-select"
        >
          <option value="all">All Levels</option>
          <option value={0}>Cantrip</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
            <option key={level} value={level}>{formatLevel(level)} Level</option>
          ))}
        </select>
      </div>
      <div className="dataviewer-filter-group">
        <label className="dataviewer-filter-label">School</label>
        <select
          value={spellSchoolFilter}
          onChange={(e) => setSpellSchoolFilter(e.target.value)}
          className="dataviewer-filter-select"
        >
          <option value="all">All Schools</option>
          {getSpellSchools().map(school => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // Render equipment filters
  const renderEquipmentFilters = () => {
    const availableTags = getEquipmentTags();

    return (
      <div className="dataviewer-filters">
        <div className="dataviewer-filter-group">
          <label className="dataviewer-filter-label">Type</label>
          <select
            value={equipmentTypeFilter}
            onChange={(e) => setEquipmentTypeFilter(e.target.value as 'weapon' | 'armor' | 'item' | 'all')}
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
            onChange={(e) => setEquipmentRarityFilter(e.target.value)}
            className="dataviewer-filter-select"
          >
            <option value="all">All Rarities</option>
            {getEquipmentRarities().map(rarity => (
              <option key={rarity} value={rarity}>{formatRarity(rarity)}</option>
            ))}
          </select>
        </div>
        {/* Task 3.3: Tags Filter Dropdown */}
        {availableTags.length > 0 && (
          <div className="dataviewer-filter-group">
            <label className="dataviewer-filter-label">Tag</label>
            <select
              value={equipmentTagFilter}
              onChange={(e) => setEquipmentTagFilter(e.target.value)}
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
  };

  // Render a spell card
  const renderSpellCard = (spell: RegisteredSpell) => {
    // Use name as unique key since spell.id may be undefined for default spells
    const spellKey = spell.id || spell.name;
    const isExpanded = expandedItems.has(spellKey);
    const schoolColor = SCHOOL_COLORS[spell.school] || 'var(--color-text-secondary)';
    const schoolBg = SCHOOL_BG_COLORS[spell.school] || 'var(--color-surface-dim)';

    return (
      <div
        key={spellKey}
        className="dataviewer-item-card"
        style={{ backgroundColor: schoolBg }}
      >
        <div
          className="dataviewer-item-header"
          onClick={() => toggleExpanded(spellKey)}
        >
          <div className="dataviewer-item-header-content">
            <span className="dataviewer-item-name" style={{ color: schoolColor }}>
              {spell.name}
            </span>
            <div className="dataviewer-item-badges">
              <span className="dataviewer-badge" style={{ backgroundColor: schoolColor }}>
                {spell.school}
              </span>
              <span className="dataviewer-badge dataviewer-badge-secondary">
                {formatLevel(spell.level)}
              </span>
            </div>
          </div>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {isExpanded && (
          <div className="dataviewer-item-details">
            <div className="dataviewer-item-stats">
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Casting Time:</span>
                <span className="dataviewer-item-stat-value">{spell.casting_time}</span>
              </div>
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Range:</span>
                <span className="dataviewer-item-stat-value">{spell.range}</span>
              </div>
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Components:</span>
                <span className="dataviewer-item-stat-value">{spell.components}</span>
              </div>
              <div className="dataviewer-item-stat">
                <span className="dataviewer-item-stat-label">Duration:</span>
                <span className="dataviewer-item-stat-value">{spell.duration}</span>
              </div>
            </div>
            {spell.description && (
              <div className="dataviewer-item-description">
                {spell.description}
              </div>
            )}
            {spell.classes && spell.classes.length > 0 && (
              <div className="dataviewer-item-tags">
                <span className="dataviewer-item-tags-label">Classes:</span>
                {spell.classes.map(cls => (
                  <span key={cls} className="dataviewer-tag">{cls}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render skills grouped by ability
  const renderSkills = () => {
    const grouped = groupSkillsByAbility(getFilteredData as CustomSkill[]);
    const abilities = Object.keys(grouped).sort();

    return (
      <div className="dataviewer-grouped-list">
        {abilities.map(ability => (
          <div key={ability} className="dataviewer-group">
            <div className="dataviewer-group-header">
              <span
                className="dataviewer-group-title"
                style={{ color: ABILITY_COLORS[ability] || 'var(--color-text-primary)' }}
              >
                {ability}
              </span>
              <span className="dataviewer-group-count">({grouped[ability].length})</span>
            </div>
            <div className="dataviewer-group-items">
              {grouped[ability].map(skill => {
                const isExpanded = expandedItems.has(skill.id);
                const hasDescription = skill.description && skill.description.length > 0;

                return (
                  <div
                    key={skill.id}
                    className={`dataviewer-group-item ${hasDescription ? 'dataviewer-group-item-expandable' : ''}`}
                    onClick={() => hasDescription && toggleExpanded(skill.id)}
                  >
                    <div className="dataviewer-group-item-header">
                      <span className="dataviewer-group-item-name">{skill.name}</span>
                      <div className="dataviewer-item-badges">
                        {skill.categories && skill.categories.length > 0 && (
                          <div className="dataviewer-group-item-tags">
                            {skill.categories.map(cat => (
                              <span key={cat} className="dataviewer-tag dataviewer-tag-small">{cat}</span>
                            ))}
                          </div>
                        )}
                        {hasDescription && (
                          isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </div>
                    {isExpanded && hasDescription && (
                      <div className="dataviewer-group-item-details">
                        <div className="dataviewer-item-description">
                          {skill.description}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render class features grouped by class
  // Task 5.1: Updated to show feature effects when expanded
  const renderClassFeatures = () => {
    const grouped = groupClassFeaturesByClass(getFilteredData as ClassFeature[]);
    const classNames = Object.keys(grouped).sort();

    return (
      <div className="dataviewer-grouped-list">
        {classNames.map(className => (
          <div key={className} className="dataviewer-group">
            <div className="dataviewer-group-header">
              <span className="dataviewer-group-title">{className}</span>
              <span className="dataviewer-group-count">({grouped[className].length})</span>
            </div>
            <div className="dataviewer-group-items">
              {grouped[className]
                .sort((a, b) => a.level - b.level)
                .map(feature => {
                  const isExpanded = expandedItems.has(feature.id);
                  const hasEffects = feature.effects && feature.effects.length > 0;
                  const hasDescription = feature.description && feature.description.length > 0;

                  return (
                    <div
                      key={feature.id}
                      className={`dataviewer-group-item ${hasEffects || hasDescription ? 'dataviewer-group-item-expandable' : ''}`}
                      onClick={() => (hasEffects || hasDescription) && toggleExpanded(feature.id)}
                    >
                      <div className="dataviewer-group-item-header">
                        <span className="dataviewer-group-item-name">{feature.name}</span>
                        <div className="dataviewer-item-badges">
                          <span className="dataviewer-badge dataviewer-badge-small">Level {feature.level}</span>
                          {(hasEffects || hasDescription) && (
                            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                      {feature.type && (
                        <span className="dataviewer-group-item-type">{feature.type}</span>
                      )}
                      {isExpanded && (
                        <div className="dataviewer-group-item-details">
                          {feature.description && (
                            <div className="dataviewer-item-description">
                              {feature.description}
                            </div>
                          )}
                          {/* Task 5.3: Using reusable EffectsList component */}
                          <div className="dataviewer-item-section">
                            <EffectList
                              effects={(feature.effects || []) as FeatureEffect[]}
                              compact
                              showStacking
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Format prerequisite info for display
   *
   * Task 5.2: Racial Trait Effects Display - Prerequisite formatter
   *
   * Converts FeaturePrerequisite objects into human-readable strings.
   * Handles all prerequisite types:
   * - level: Minimum character level
   * - features: Required features (by ID)
   * - abilities: Minimum ability scores
   * - class/race/subrace: Required class, race, or subrace
   * - skills: Required proficient skills
   * - spells: Required known spells
   * - custom: Custom condition description
   *
   * @param prerequisites - The FeaturePrerequisite object to format
   * @returns Array of formatted prerequisite strings
   */
  const formatPrerequisites = (prerequisites: FeaturePrerequisite | undefined): string[] => {
    if (!prerequisites) return [];

    const result: string[] = [];

    if (prerequisites.level) {
      result.push(`Level ${prerequisites.level}+`);
    }

    if (prerequisites.features && prerequisites.features.length > 0) {
      result.push(`Requires: ${prerequisites.features.join(', ')}`);
    }

    if (prerequisites.abilities) {
      Object.entries(prerequisites.abilities).forEach(([ability, min]) => {
        result.push(`${ability} ${min}+`);
      });
    }

    if (prerequisites.class) {
      result.push(`${prerequisites.class} only`);
    }

    if (prerequisites.race) {
      result.push(`${prerequisites.race} only`);
    }

    if (prerequisites.subrace) {
      result.push(`${prerequisites.subrace} only`);
    }

    if (prerequisites.skills && prerequisites.skills.length > 0) {
      result.push(`Skills: ${prerequisites.skills.join(', ')}`);
    }

    if (prerequisites.spells && prerequisites.spells.length > 0) {
      result.push(`Spells: ${prerequisites.spells.join(', ')}`);
    }

    if (prerequisites.custom) {
      result.push(prerequisites.custom);
    }

    return result;
  };

  /**
   * Render prerequisites section for racial traits
   *
   * Task 5.2: Racial Trait Effects Display
   *
   * @param prerequisites - The prerequisites to render
   */
  const renderPrerequisites = (prerequisites: FeaturePrerequisite | undefined) => {
    const prereqStrings = formatPrerequisites(prerequisites);
    if (prereqStrings.length === 0) return null;

    return (
      <div className="dataviewer-item-section">
        <span className="dataviewer-item-section-title">Prerequisites:</span>
        <div className="dataviewer-item-tags">
          {prereqStrings.map((prereq, idx) => (
            <span key={idx} className="dataviewer-tag dataviewer-tag-condition">
              {prereq}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Render racial traits grouped by race
  // Task 5.2: Updated to show trait effects, description, and prerequisites when expanded
  const renderRacialTraits = () => {
    const grouped = groupRacialTraitsByRace(getFilteredData as RacialTrait[]);
    const raceNames = Object.keys(grouped).sort();

    return (
      <div className="dataviewer-grouped-list">
        {raceNames.map(raceName => (
          <div key={raceName} className="dataviewer-group">
            <div className="dataviewer-group-header">
              <span className="dataviewer-group-title">{raceName}</span>
              <span className="dataviewer-group-count">({grouped[raceName].length})</span>
            </div>
            <div className="dataviewer-group-items">
              {grouped[raceName].map(trait => {
                const isExpanded = expandedItems.has(trait.id);
                const hasEffects = trait.effects && trait.effects.length > 0;
                const hasDescription = trait.description && trait.description.length > 0;
                const hasPrerequisites = trait.prerequisites && formatPrerequisites(trait.prerequisites).length > 0;
                const isExpandable = hasEffects || hasDescription || hasPrerequisites;

                return (
                  <div
                    key={trait.id}
                    className={`dataviewer-group-item ${isExpandable ? 'dataviewer-group-item-expandable' : ''}`}
                    onClick={() => isExpandable && toggleExpanded(trait.id)}
                  >
                    <div className="dataviewer-group-item-header">
                      <span className="dataviewer-group-item-name">{trait.name}</span>
                      <div className="dataviewer-item-badges">
                        {trait.subrace && (
                          <span className="dataviewer-badge dataviewer-badge-small dataviewer-badge-subrace">
                            {trait.subrace}
                          </span>
                        )}
                        {isExpandable && (
                          isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="dataviewer-group-item-details">
                        {trait.description && (
                          <div className="dataviewer-item-description">
                            {trait.description}
                          </div>
                        )}
                        {renderPrerequisites(trait.prerequisites)}
                        {/* Task 5.3: Using reusable EffectsList component */}
                        <div className="dataviewer-item-section">
                          <EffectList
                            effects={(trait.effects || []) as FeatureEffect[]}
                            compact
                            showStacking
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render subrace expansion section
   *
   * Task 4.3: Enhanced Subrace Display
   *
   * Displays full subrace details including:
   * - Subrace name as section header with accent color
   * - Subrace-specific ability bonuses (color-coded by ability)
   * - Subrace-specific traits list
   * - Requirements if applicable (e.g., ability minimums)
   *
   * @param subraceName - The name of the subrace (e.g., "High Elf", "Wood Elf")
   * @param subraceData - The subrace data entry containing:
   *   - ability_bonuses: Map of ability to bonus (e.g., { INT: 1 })
   *   - traits: Array of trait names specific to this subrace
   *   - requirements: Optional requirements object with ability minimums
   * @returns JSX element rendering the subrace section
   *
   * @example
   * // High Elf subrace data
   * renderSubraceSection("High Elf", {
   *   ability_bonuses: { INT: 1 },
   *   traits: ["Elf Weapon Training", "Cantrip"],
   *   requirements: undefined
   * })
   * // Renders: High Elf header with "INT +1" bonus and traits list
   *
   * @example
   * // Dark Elf subrace with requirements
   * renderSubraceSection("Dark Elf (Drow)", {
   *   ability_bonuses: { CHA: 1 },
   *   traits: ["Superior Darkvision", "Drow Magic"],
   *   requirements: undefined
   * })
   */
  const renderSubraceSection = (
    subraceName: string,
    subraceData: {
      ability_bonuses?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
      traits?: string[];
      requirements?: {
        abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
      };
    } | undefined
  ) => {
    if (!subraceData) {
      // Subrace exists but has no specific data - just show the name
      return (
        <div className="dataviewer-subrace-section">
          <div className="dataviewer-subrace-header">
            <span className="dataviewer-subrace-name">{subraceName}</span>
          </div>
          <div className="dataviewer-subrace-content">
            <span className="dataviewer-subrace-no-data">No additional data available</span>
          </div>
        </div>
      );
    }

    return (
      <div className="dataviewer-subrace-section">
        <div className="dataviewer-subrace-header">
          <span className="dataviewer-subrace-name">{subraceName}</span>
        </div>
        <div className="dataviewer-subrace-content">
          {/* Subrace-specific ability bonuses */}
          {subraceData.ability_bonuses && Object.keys(subraceData.ability_bonuses).length > 0 && (
            <div className="dataviewer-subrace-bonuses">
              {Object.entries(subraceData.ability_bonuses).map(([ability, bonus]) => (
                <span
                  key={ability}
                  className="dataviewer-subrace-bonus"
                  style={{ color: ABILITY_COLORS[ability] }}
                >
                  {ability} {formatAbilityBonus(bonus as number)}
                </span>
              ))}
            </div>
          )}

          {/* Subrace-specific traits */}
          {subraceData.traits && subraceData.traits.length > 0 && (
            <div className="dataviewer-subrace-traits">
              <span className="dataviewer-subrace-traits-label">Traits:</span>
              <div className="dataviewer-subrace-traits-list">
                {subraceData.traits.map((trait, idx) => (
                  <span key={idx} className="dataviewer-tag dataviewer-tag-subrace-trait">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Requirements (if any) */}
          {subraceData.requirements?.abilities && Object.keys(subraceData.requirements.abilities).length > 0 && (
            <div className="dataviewer-subrace-requirements">
              <span className="dataviewer-subrace-requirements-label">Requirements:</span>
              <div className="dataviewer-subrace-requirements-list">
                {Object.entries(subraceData.requirements.abilities).map(([ability, minimum]) => (
                  <span key={ability} className="dataviewer-tag dataviewer-tag-requirement">
                    {ability} {minimum}+
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render races
  const renderRaces = () => (
    <div className="dataviewer-grid">
      {(getFilteredData as RaceDataEntry[]).map((race, index) => {
        const raceName = race.name || `Race-${index}`;
        const isExpanded = expandedItems.has(raceName);

        return (
          <div key={raceName} className="dataviewer-card">
            <div
              className="dataviewer-card-header"
              onClick={() => toggleExpanded(raceName)}
            >
              <div className="dataviewer-card-header-content">
                <Shield size={18} className="dataviewer-card-icon" />
                <span className="dataviewer-card-title">{raceName}</span>
              </div>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            <div className="dataviewer-card-meta">
              <span className="dataviewer-card-stat">
                <Zap size={14} />
                Speed: {race.speed} ft
              </span>
              <span className="dataviewer-card-stat">
                <Sparkles size={14} />
                {race.traits.length} Traits
              </span>
              {race.subraces && race.subraces.length > 0 && (
                <span className="dataviewer-card-stat">
                  <Users size={14} />
                  {race.subraces.length} Subraces
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="dataviewer-card-details">
                {/* Race description */}
                {race.description && (
                  <div className="dataviewer-card-section">
                    <div className="dataviewer-item-description">
                      {race.description}
                    </div>
                  </div>
                )}

                {/* Base race ability bonuses */}
                {race.ability_bonuses && Object.keys(race.ability_bonuses).length > 0 && (
                  <div className="dataviewer-card-section">
                    <span className="dataviewer-card-section-title">Ability Bonuses:</span>
                    <div className="dataviewer-card-bonuses">
                      {Object.entries(race.ability_bonuses).map(([ability, bonus]) => (
                        <span
                          key={ability}
                          className="dataviewer-card-bonus"
                          style={{ color: ABILITY_COLORS[ability] }}
                        >
                          {ability} {formatAbilityBonus(bonus as number)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Base race traits */}
                {race.traits && race.traits.length > 0 && (
                  <div className="dataviewer-card-section">
                    <span className="dataviewer-card-section-title">Traits:</span>
                    <div className="dataviewer-card-tags">
                      {race.traits.map(trait => (
                        <span key={trait} className="dataviewer-tag">{trait}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task 4.3: Full subrace expansion with details */}
                {race.subraceData && Object.keys(race.subraceData).length > 0 && (
                  <div className="dataviewer-card-section">
                    <span className="dataviewer-card-section-title">Subrace Details:</span>
                    <div className="dataviewer-subraces-container">
                      {Object.entries(race.subraceData).map(([subraceName, subraceEntry]) => (
                        renderSubraceSection(subraceName, subraceEntry)
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render classes
  const renderClasses = () => (
    <div className="dataviewer-grid">
      {(getFilteredData as ClassDataEntry[]).map((cls, index) => {
        const className = cls.name || `Class-${index}`;
        const isExpanded = expandedItems.has(className);

        return (
          <div key={className} className="dataviewer-card">
            <div
              className="dataviewer-card-header"
              onClick={() => toggleExpanded(className)}
            >
              <div className="dataviewer-card-header-content">
                <Zap size={18} className="dataviewer-card-icon" />
                <span className="dataviewer-card-title">{className}</span>
              </div>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            <div className="dataviewer-card-meta">
              <span className="dataviewer-card-stat">
                <Target size={14} />
                Hit Die: d{cls.hit_die}
              </span>
              {cls.is_spellcaster && (
                <span className="dataviewer-card-stat dataviewer-card-stat-spellcaster">
                  <Sparkles size={14} />
                  Spellcaster
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="dataviewer-card-details">
                {/* Class description */}
                {cls.description && (
                  <div className="dataviewer-card-section">
                    <div className="dataviewer-item-description">
                      {cls.description}
                    </div>
                  </div>
                )}

                <div className="dataviewer-card-section">
                  <span className="dataviewer-card-section-title">Primary Ability:</span>
                  <span
                    className="dataviewer-card-ability"
                    style={{ color: ABILITY_COLORS[cls.primary_ability] }}
                  >
                    {cls.primary_ability}
                  </span>
                </div>

                <div className="dataviewer-card-section">
                  <span className="dataviewer-card-section-title">Saving Throws:</span>
                  <div className="dataviewer-card-bonuses">
                    {cls.saving_throws.map(save => (
                      <span
                        key={save}
                        className="dataviewer-card-bonus"
                        style={{ color: ABILITY_COLORS[save] }}
                      >
                        {save}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="dataviewer-card-section">
                  <span className="dataviewer-card-section-title">Skill Choices:</span>
                  <span className="dataviewer-card-text">
                    Choose {cls.skill_count} from {cls.available_skills.length} skills
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /**
   * Render granted skills section for enhanced equipment
   *
   * Task 1.2: Display grantsSkills on Equipment Cards
   *
   * Displays skills granted by equipment with proficiency level.
 * Uses green tag styling (`.dataviewer-tag-skill`) to distinguish from other grants.
   *
   * @param item - The equipment item to render skills for
   * @returns JSX element with skills section, or null if no granted skills
   *
   * @example
   * // Equipment with granted skills
   * // Input: item.grantsSkills = [{ skillId: 'Arcana', level: 'expertise' }, { skillId: 'History', level: 'proficient' }]
   * // Output:
   * // Skills: Arcana (expertise), History (proficient)
   */
  const renderGrantedSkills = (item: Equipment) => {
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
  };

  /**
   * Format spell level for display in grantsSpells section
   *
   * Converts numeric spell levels to ordinal strings with appropriate suffixes.
   *
   * @param level - Spell level (0 for cantrips, 1-9 for spell levels)
   * @returns Formatted level string (e.g., "Cantrip", "1st", "3rd")
   *
   * @example
   * formatSpellLevelShort(0)  // "Cantrip"
   * formatSpellLevelShort(1)  // "1st"
   * formatSpellLevelShort(3)  // "3rd"
   * formatSpellLevelShort(5)  // "5th"
   */
  const formatSpellLevelShort = (level: number | undefined): string => {
    if (level === undefined || level === null) return '';
    if (level === 0) return 'Cantrip';
    if (level === 1) return '1st';
    if (level === 2) return '2nd';
    if (level === 3) return '3rd';
    return `${level}th`;
  };

  /**
   * Format uses and recharge info for display
   *
   * Converts uses count and recharge type into a human-readable string.
   *
   * @param uses - Number of uses, or null for unlimited
   * @param recharge - Recharge type: 'dawn', 'short_rest', 'long_rest', or undefined
   * @returns Formatted uses string (e.g., "1/dawn", "unlimited", "3/short rest")
   *
   * @example
   * formatSpellUses(1, 'dawn')      // "1/dawn"
   * formatSpellUses(3, 'short_rest') // "3/short rest"
   * formatSpellUses(null, undefined) // "unlimited"
   * formatSpellUses(undefined, undefined) // "once"
   */
  const formatSpellUses = (uses: number | null | undefined, recharge: string | undefined): string => {
    if (uses === null) return 'unlimited';
    if (uses === undefined) return 'once';
    const rechargeStr = recharge ? `/${recharge.replace('_', ' ')}` : '';
    return `${uses}${rechargeStr}`;
  };

  /**
   * Render granted spells section for enhanced equipment
   *
   * Task 1.3: Display grantsSpells on Equipment Cards
   *
   * Displays spells granted by equipment with level, uses, and recharge info.
   * Uses purple tag styling (`.dataviewer-tag-spell`) to distinguish from other grants.
   *
   * @param item - The equipment item to render spells for
   * @returns JSX element with spells section, or null if no granted spells
   *
   * @example
   * // Equipment with granted spells
   * // Input: item.grantsSpells = [
   * //   { spellId: 'Fireball', level: 3, uses: 1, recharge: 'dawn' },
   * //   { spellId: 'Shield', level: 1, uses: null } // unlimited
   * // ]
   * // Output:
   * // Spells: Fireball 3rd level, 1/dawn | Shield 1st level, unlimited
   */
  const renderGrantedSpells = (item: Equipment) => {
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
  };

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
   *
   * @param item - The equipment item to render features for
   * @returns JSX element with features section, or null if no granted features
   *
   * @example
   * // Equipment with mixed feature types
   * // Input: item.grantsFeatures = [
   * //   'darkvision',  // string reference to registry
   * //   { name: 'Blessed Strike', description: '+1d8 radiant damage' }  // inline
   * // ]
   * // Output:
   * // Features: darkvision | Blessed Strike
   */
  const renderGrantedFeatures = (item: Equipment) => {
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
              const inlineFeature = feature;
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
  };

  /**
   * Render tags section for enhanced equipment
   *
   * Task 1.5: Display Equipment Tags
   *
   * Displays tags at the bottom of expanded equipment cards.
   * Tags are displayed using existing `.dataviewer-tag` styling.
   *
   * @param item - The equipment item to render tags for
   * @returns JSX element with tags section, or null if no tags
   *
   * @example
   * // Equipment with tags
   * // Input: item.tags = ['magic', 'fire', 'weapon', 'legendary']
   * // Output:
   * // Tags: magic, fire, weapon, legendary
   */
  const renderTags = (item: Equipment) => {
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
  };

  // Render equipment
  const renderEquipment = () => (
    <div className="dataviewer-grid">
      {(getFilteredData as Equipment[]).map(item => {
        const isExpanded = expandedItems.has(item.name);
        const rarityColor = RARITY_COLORS[item.rarity || 'common'] || RARITY_COLORS.common;
        const rarityBg = RARITY_BG_COLORS[item.rarity || 'common'] || RARITY_BG_COLORS.common;
        const spawnWeightBadge = formatSpawnWeight(item.spawnWeight);

        return (
          <div
            key={item.name}
            className="dataviewer-item-card"
            style={{ backgroundColor: rarityBg }}
          >
            <div
              className="dataviewer-item-header"
              onClick={() => toggleExpanded(item.name)}
            >
              <div className="dataviewer-item-header-content">
                <span className="dataviewer-item-name" style={{ color: rarityColor }}>
                  {item.name}
                </span>
                <div className="dataviewer-item-badges">
                  {spawnWeightBadge && (
                    <span className={`dataviewer-badge ${spawnWeightBadge.className}`}>
                      {spawnWeightBadge.label}
                    </span>
                  )}
                  {item.rarity && (
                    <span className="dataviewer-badge" style={{ backgroundColor: rarityColor }}>
                      {formatRarity(item.rarity)}
                    </span>
                  )}
                  <span className="dataviewer-badge dataviewer-badge-secondary">
                    {item.type}
                  </span>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {isExpanded && (
              <div className="dataviewer-item-details">
                <div className="dataviewer-item-stats">
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
      })}
    </div>
  );

  /**
   * Get icon for appearance category
   */
  const getAppearanceIcon = (iconType: 'body' | 'color' | 'style' | 'feature') => {
    switch (iconType) {
      case 'body': return User;
      case 'color': return Palette;
      case 'style': return Sparkles;
      case 'feature': return Smile;
      default: return Eye;
    }
  };

  /**
   * Check if an option is a color value (hex color)
   */
  const isColorOption = (option: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(option);
  };

  /**
   * Render appearance data categories
   *
   * Displays appearance options for character generation:
   * - Body types (slender, athletic, muscular, stocky)
   * - Skin tones (hex color swatches)
   * - Hair colors (hex color swatches)
   * - Hair styles (short, long, braided, etc.)
   * - Eye colors (hex color swatches)
   * - Facial features (scars, tattoos, piercings, etc.)
   */
  const renderAppearance = () => (
    <div className="dataviewer-grid">
      {(getFilteredData as AppearanceCategoryData[]).map(category => {
        const isExpanded = expandedItems.has(category.key);
        const CategoryIcon = getAppearanceIcon(category.icon);

        return (
          <div key={category.key} className="dataviewer-card">
            <div
              className="dataviewer-card-header"
              onClick={() => toggleExpanded(category.key)}
            >
              <div className="dataviewer-card-header-content">
                <CategoryIcon size={18} className="dataviewer-card-icon" />
                <span className="dataviewer-card-title">{category.name}</span>
              </div>
              <div className="dataviewer-item-badges">
                <span className="dataviewer-badge dataviewer-badge-secondary">
                  {category.options.length} options
                </span>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            <div className="dataviewer-card-meta">
              <span className="dataviewer-card-stat">
                {category.description}
              </span>
            </div>

            {isExpanded && (
              <div className="dataviewer-card-details">
                <div className="dataviewer-appearance-options">
                  {category.options.map((option, idx) => {
                    // Check if this is a color value
                    if (isColorOption(option)) {
                      return (
                        <div key={idx} className="dataviewer-appearance-color">
                          <div
                            className="dataviewer-color-swatch"
                            style={{ backgroundColor: option }}
                            title={option}
                          />
                          <span className="dataviewer-color-value">{option}</span>
                        </div>
                      );
                    }
                    // Regular option (text)
                    return (
                      <span key={idx} className="dataviewer-tag dataviewer-tag-appearance">
                        {option}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render content based on active category
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="dataviewer-loading">
          <RefreshCw size={32} className="dataviewer-loading-icon" />
          <span>Loading data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dataviewer-error">
          <span className="dataviewer-error-title">Error loading data</span>
          <span className="dataviewer-error-message">{error}</span>
        </div>
      );
    }

    if (getFilteredData.length === 0) {
      return (
        <div className="dataviewer-empty">
          <Database size={48} className="dataviewer-empty-icon" />
          <span className="dataviewer-empty-title">No items found</span>
          <span className="dataviewer-empty-message">
            Try adjusting your search or filters
          </span>
        </div>
      );
    }

    switch (activeCategory) {
      case 'spells':
        return (
          <div className="dataviewer-list">
            {renderSpellFilters()}
            <div className="dataviewer-items">
              {(getFilteredData as RegisteredSpell[]).map(renderSpellCard)}
            </div>
          </div>
        );
      case 'skills':
        return renderSkills();
      case 'classFeatures':
        return renderClassFeatures();
      case 'racialTraits':
        return renderRacialTraits();
      case 'races':
        return renderRaces();
      case 'classes':
        return renderClasses();
      case 'equipment':
        return (
          <div className="dataviewer-list">
            {renderEquipmentFilters()}
            <div className="dataviewer-items">
              {renderEquipment()}
            </div>
          </div>
        );
      case 'appearance':
        return renderAppearance();
      default:
        return null;
    }
  };

  // Get raw data for the current category
  const getRawData = () => {
    switch (activeCategory) {
      case 'spells': return spells;
      case 'skills': return skills;
      case 'classFeatures': return classFeatures;
      case 'racialTraits': return racialTraits;
      case 'races': return races;
      case 'classes': return classes;
      case 'equipment': return equipment;
      case 'appearance': return appearance;
      default: return [];
    }
  };

  return (
    <div className="dataviewer-tab">
      {/* New Items Notification Banner */}
      {showNewItemsIndicator && (
        <div className="dataviewer-new-items-banner">
          <Sparkles size={18} />
          <span>New custom items added! Equipment count updated.</span>
        </div>
      )}

      {/* Header */}
      <div className="dataviewer-header">
        <div className="dataviewer-header-icon">
          <Database size={24} />
        </div>
        <div className="dataviewer-header-text">
          <h2 className="dataviewer-header-title">Data Viewer</h2>
          <p className="dataviewer-header-subtitle">
            Browse all game content from the playlist-data-engine
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          isLoading={isLoading}
          leftIcon={RefreshCw}
        >
          Refresh
        </Button>
      </div>

      {/* Category Selector */}
      <Card className="dataviewer-category-card">
        {renderCategorySelector()}
      </Card>

      {/* Search Bar */}
      <div className="dataviewer-search">
        <Search size={18} className="dataviewer-search-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${CATEGORY_CONFIG[activeCategory].label.toLowerCase()}...`}
          className="dataviewer-search-input"
        />
        {searchTerm && (
          <span className="dataviewer-search-count">
            {getFilteredData.length} results
          </span>
        )}
      </div>

      {/* Content */}
      <Card className="dataviewer-content-card">
        <CardHeader className="dataviewer-content-header">
          <div className="dataviewer-content-title">
            {(() => {
              const Icon = CATEGORY_CONFIG[activeCategory].icon;
              return <Icon size={20} />;
            })()}
            <span>{CATEGORY_CONFIG[activeCategory].label}</span>
            <span className="dataviewer-content-count">
              ({getFilteredData.length} / {dataCounts[CATEGORY_CONFIG[activeCategory].countKey]})
            </span>
          </div>
        </CardHeader>

        <div className="dataviewer-content-body">
          {renderContent()}
        </div>
      </Card>

      {/* Raw JSON Dump */}
      <div className="dataviewer-json-dump">
        <RawJsonDump
          data={getRawData()}
          title={`${CATEGORY_CONFIG[activeCategory].label} Data (Raw)`}
          defaultOpen={false}
        />
      </div>
    </div>
  );
}

export default DataViewerTab;
