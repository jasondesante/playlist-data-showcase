/**
 * DataViewerTab Component
 *
 * A comprehensive data browser for all game content from playlist-data-engine.
 * Allows users to explore spells, skills, features, races, classes, and equipment.
 *
 * Features:
 * - Category selector for different data types
 * - Search/filter functionality for each category
 * - Spell filtering by level and school
 * - Equipment filtering by type and rarity
 * - Grouped displays for skills, class features, and racial traits
 * - Rarity and school color coding
 * - Raw JSON dump for detailed data inspection
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
  Star
} from 'lucide-react';
import { useDataViewer, type DataCategory, type DataCounts, type RaceDataEntry, type ClassDataEntry, isEnhancedEquipment } from '../../hooks/useDataViewer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { useDataViewerStore } from '../../store/dataViewerStore';
import './DataViewerTab.css';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment, EquipmentCondition } from 'playlist-data-engine';

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
};

/**
 * Format level number to ordinal string
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
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format ability bonus for display
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
    dataCounts,
    filterByName,
    filterSpellsByLevel,
    filterSpellsBySchool,
    filterEquipmentByType,
    filterEquipmentByRarity,
    groupSkillsByAbility,
    groupClassFeaturesByClass,
    groupRacialTraitsByRace,
    refreshData,
    getSpellSchools,
    getEquipmentRarities
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
  // Task 3.1: Tags filter state (will be integrated in Tasks 3.2-3.4)
  const [equipmentTagFilter, setEquipmentTagFilter] = useState<string | 'all'>('all');
  void equipmentTagFilter; // Suppress TS6133 - will be used in Task 3.4
  void setEquipmentTagFilter; // Suppress TS6133 - will be used in Task 3.3

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
        return filterByName(filtered, searchTerm);
      }
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
    searchTerm,
    spellLevelFilter,
    spellSchoolFilter,
    equipmentTypeFilter,
    equipmentRarityFilter,
    filterByName,
    filterSpellsByLevel,
    filterSpellsBySchool,
    filterEquipmentByType,
    filterEquipmentByRarity
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
  const renderEquipmentFilters = () => (
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
    </div>
  );

  // Render a spell card
  const renderSpellCard = (spell: RegisteredSpell) => {
    const isExpanded = expandedItems.has(spell.id);
    const schoolColor = SCHOOL_COLORS[spell.school] || 'var(--color-text-secondary)';
    const schoolBg = SCHOOL_BG_COLORS[spell.school] || 'var(--color-surface-dim)';

    return (
      <div
        key={spell.id}
        className="dataviewer-item-card"
        style={{ backgroundColor: schoolBg }}
      >
        <div
          className="dataviewer-item-header"
          onClick={() => toggleExpanded(spell.id)}
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
              {grouped[ability].map(skill => (
                <div key={skill.id} className="dataviewer-group-item">
                  <span className="dataviewer-group-item-name">{skill.name}</span>
                  {skill.categories && skill.categories.length > 0 && (
                    <div className="dataviewer-group-item-tags">
                      {skill.categories.map(cat => (
                        <span key={cat} className="dataviewer-tag dataviewer-tag-small">{cat}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render class features grouped by class
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
                .map(feature => (
                  <div key={feature.id} className="dataviewer-group-item">
                    <div className="dataviewer-group-item-header">
                      <span className="dataviewer-group-item-name">{feature.name}</span>
                      <span className="dataviewer-badge dataviewer-badge-small">Level {feature.level}</span>
                    </div>
                    {feature.type && (
                      <span className="dataviewer-group-item-type">{feature.type}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render racial traits grouped by race
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
              {grouped[raceName].map(trait => (
                <div key={trait.id} className="dataviewer-group-item">
                  <div className="dataviewer-group-item-header">
                    <span className="dataviewer-group-item-name">{trait.name}</span>
                    {trait.subrace && (
                      <span className="dataviewer-badge dataviewer-badge-small dataviewer-badge-subrace">
                        {trait.subrace}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
            </div>

            {isExpanded && (
              <div className="dataviewer-card-details">
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

                {race.subraces && race.subraces.length > 0 && (
                  <div className="dataviewer-card-section">
                    <span className="dataviewer-card-section-title">Subraces:</span>
                    <div className="dataviewer-card-tags">
                      {race.subraces.map(subrace => (
                        <span key={subrace} className="dataviewer-tag">{subrace}</span>
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
   * Displays skills granted by equipment with proficiency level
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
   * @param level - Spell level (0 for cantrips, 1-9 for spell levels)
   * @returns Formatted level string (e.g., "Cantrip", "1st level", "3rd level")
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
   * @param uses - Number of uses, or null for unlimited
   * @param recharge - Recharge type: 'dawn', 'short_rest', 'long_rest', or undefined
   * @returns Formatted uses string (e.g., "1/dawn", "unlimited", "3/short rest")
   */
  const formatSpellUses = (uses: number | null | undefined, recharge: string | undefined): string => {
    if (uses === null) return 'unlimited';
    if (uses === undefined) return 'once';
    const rechargeStr = recharge ? `/${recharge.replace('_', ' ')}` : '';
    return `${uses}${rechargeStr}`;
  };

  /**
   * Render granted spells section for enhanced equipment
   * Displays spells granted by equipment with level, uses, and recharge info
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
   * Displays features granted by equipment
   *
   * Features can be:
   * 1. String references to registry features (e.g., 'darkvision')
   * 2. Inline EquipmentMiniFeature objects with name/description/effects
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
   * Displays tags at the bottom of expanded equipment cards
   * Tags are displayed as a comma-separated list using existing tag styling
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
