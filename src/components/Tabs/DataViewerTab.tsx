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

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  Shield,
  Users,
  Sparkles,
  Package,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  RefreshCw,
  Award,
  User,
  Settings
} from 'lucide-react';
import { useDataViewer, type DataCategory, type RaceDataEntry, type ClassDataEntry, type AppearanceCategoryData, isEnhancedEquipment } from '../../hooks/useDataViewer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { useDataViewerStore } from '../../store/dataViewerStore';
import { logger } from '../../utils/logger';
import { showToast } from '../ui/Toast';
import { CustomContentBadge } from './DataViewer/CustomContentBadge';
import { SpawnModeControls } from './DataViewer/SpawnModeControls';
import { useContentCreator, type ContentType } from '../../hooks/useContentCreator';
import { EquipmentCreatorForm, type EquipmentCreatorFormData } from '../shared/EquipmentCreatorForm';
import { AppearanceOptionCreator } from './DataViewer/forms/AppearanceOptionCreator';
import { ArweaveImage } from '../shared/ArweaveImage';
import { SkillCreatorForm, type SkillFormData } from './DataViewer/forms/SkillCreatorForm';
import { SpellCreatorForm, type SpellFormData } from './DataViewer/forms/SpellCreatorForm';
import { ClassFeatureCreatorForm, type ClassFeatureFormData } from './DataViewer/forms/ClassFeatureCreatorForm';
import { RacialTraitCreatorForm, type RacialTraitFormData } from './DataViewer/forms/RacialTraitCreatorForm';
import { RaceCreatorForm, type RaceFormData } from './DataViewer/forms/RaceCreatorForm';
import { ClassCreatorForm, type ClassFormData } from './DataViewer/forms/ClassCreatorForm';
import { ClassConfigForm } from './DataViewer/forms/ClassConfigForm';
import { Plus, X, Swords, Edit2, Trash2 } from 'lucide-react';
import { ContentCreatorModal } from '../modals/ContentCreatorModal';
import './DataViewerTab.css';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment } from 'playlist-data-engine';
import {
  RARITY_COLORS,
  RARITY_BG_COLORS,
  ABILITY_COLORS,
  CATEGORY_CONFIG,
  getPropertyTypeConfig
} from './DataViewer/constants';
import {
  formatLevel,
  formatRarity,
  formatAbilityBonus,
  formatSpawnWeight,
  formatCondition,
  formatSpellLevelShort,
  formatSpellUses,
  isColorOption,
  getAppearanceIcon
} from './DataViewer/utils';
import { SpellsPanel } from './DataViewer/components/SpellsPanel';
import { SkillsPanel } from './DataViewer/components/SkillsPanel';
import { ClassFeaturesPanel } from './DataViewer/components/ClassFeaturesPanel';
import { RacialTraitsPanel } from './DataViewer/components/RacialTraitsPanel';

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
    getEquipmentTags,
    getFilteredItems,
    isCustomItem,
    getSpawnModeForCategory
  } = useDataViewer();

  // Get Data Viewer store actions
  const { markChangesViewed, updateEquipmentCount, hasEquipmentCountIncreased, lastEquipmentCount } = useDataViewerStore();

  // Content creator hook for edit/delete/duplicate operations
  const { deleteContent, duplicateContent, createContent, updateContent } = useContentCreator();

  // State
  const [activeCategory, setActiveCategory] = useState<DataCategory>('spells');
  const [showNewItemsIndicator, setShowNewItemsIndicator] = useState(false);
  const [showEquipmentCreator, setShowEquipmentCreator] = useState(false);
  const [showSkillCreator, setShowSkillCreator] = useState(false);
  const [showSpellCreator, setShowSpellCreator] = useState(false);
  const [showClassFeatureCreator, setShowClassFeatureCreator] = useState(false);
  const [showRacialTraitCreator, setShowRacialTraitCreator] = useState(false);
  const [showRaceCreator, setShowRaceCreator] = useState(false);
  const [showClassCreator, setShowClassCreator] = useState(false);
  const [showClassConfig, setShowClassConfig] = useState(false);
  const [appearanceCreatorCategory, setAppearanceCreatorCategory] = useState<string | null>(null);

  // Edit state - track item being edited
  const [editingSpell, setEditingSpell] = useState<RegisteredSpell | null>(null);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingClassFeature, setEditingClassFeature] = useState<ClassFeature | null>(null);
  const [editingRacialTrait, setEditingRacialTrait] = useState<RacialTrait | null>(null);
  const [editingRace, setEditingRace] = useState<RaceDataEntry | null>(null);
  const [editingClass, setEditingClass] = useState<ClassDataEntry | null>(null);
  // Appearance editing state
  const [editingAppearanceCategory, setEditingAppearanceCategory] = useState<string | null>(null);
  const [editingAppearanceValue, setEditingAppearanceValue] = useState<string | null>(null);
  // Appearance selection state - track which custom option is selected (clicked)
  const [selectedAppearanceOption, setSelectedAppearanceOption] = useState<{ category: string; option: string } | null>(null);

  // Mark changes as viewed when tab is mounted and check for new items
  useEffect(() => {
    markChangesViewed();

    // Only show "new items" banner if:
    // 1. lastEquipmentCount > 0 (meaning we've visited before and have a baseline)
    // 2. The current count is greater than the last known count (actual increase)
    if (lastEquipmentCount > 0 && hasEquipmentCountIncreased(dataCounts.equipment)) {
      setShowNewItemsIndicator(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowNewItemsIndicator(false), 5000);
      // Don't return early - we need to update the count below
      return () => clearTimeout(timer);
    }

    // Always update the stored equipment count to current count
    // Note: This also needs to happen when the toast shows, but the cleanup above
    // returns early. We handle this by updating the count in a separate effect.
  }, []);

  // Update equipment count when it changes (separate from the toast logic)
  useEffect(() => {
    updateEquipmentCount(dataCounts.equipment);
  }, [dataCounts.equipment, updateEquipmentCount]);
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
  // Phase 2.2: Apply spawn mode filtering first, then apply search/category filters
  const getFilteredData = useMemo(() => {
    // First, apply spawn mode filtering (e.g., absolute mode shows only custom items)
    const spawnFilteredData = getFilteredItems(activeCategory);

    switch (activeCategory) {
      case 'spells': {
        let filtered = spawnFilteredData as RegisteredSpell[];
        if (spellLevelFilter !== 'all') {
          filtered = filterSpellsByLevel(filtered, spellLevelFilter);
        }
        if (spellSchoolFilter !== 'all') {
          filtered = filterSpellsBySchool(filtered, spellSchoolFilter);
        }
        return filterByName(filtered, searchTerm);
      }
      case 'skills':
        return filterByName(spawnFilteredData as CustomSkill[], searchTerm);
      case 'classFeatures':
        return filterByName(spawnFilteredData as ClassFeature[], searchTerm);
      case 'racialTraits':
        return filterByName(spawnFilteredData as RacialTrait[], searchTerm);
      case 'races':
        return filterByName(spawnFilteredData as RaceDataEntry[], searchTerm);
      case 'classes':
        return filterByName(spawnFilteredData as ClassDataEntry[], searchTerm);
      case 'equipment': {
        let filtered = spawnFilteredData as Equipment[];
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
        return filterByName(spawnFilteredData as AppearanceCategoryData[], searchTerm);
      default:
        return [];
    }
  }, [
    activeCategory,
    getFilteredItems,
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

  // ==========================================
  // Custom Content Handlers (Phase 2.2)
  // ==========================================

  /**
   * Map DataCategory to ContentType for use with content creator
   */
  const getContentType = (category: DataCategory): ContentType => {
    switch (category) {
      case 'spells': return 'spells';
      case 'skills': return 'skills';
      case 'classFeatures': return 'classFeatures';
      case 'racialTraits': return 'racialTraits';
      case 'races': return 'races';
      case 'classes': return 'classes';
      case 'equipment': return 'equipment';
      case 'appearance': return 'appearance.bodyTypes';
      default: return 'equipment';
    }
  };

  /**
   * Handle edit of a custom item
   *
   * Opens the appropriate creator modal with the item data pre-filled for editing.
   */
  const handleEditItem = useCallback((category: DataCategory, itemName: string) => {
    logger.info('DataViewer', `Edit requested for ${category}/${itemName}`);

    // Find the item data and open the appropriate editor
    switch (category) {
      case 'spells': {
        const spell = spells.find(s => s.name === itemName);
        if (spell) {
          setEditingSpell(spell);
          setShowSpellCreator(true);
        }
        break;
      }
      case 'skills': {
        const skill = skills.find(s => s.name === itemName || s.id === itemName);
        if (skill) {
          setEditingSkill(skill);
          setShowSkillCreator(true);
        }
        break;
      }
      case 'classFeatures': {
        const feature = classFeatures.find(f => f.name === itemName || f.id === itemName);
        if (feature) {
          setEditingClassFeature(feature);
          setShowClassFeatureCreator(true);
        }
        break;
      }
      case 'racialTraits': {
        const trait = racialTraits.find(t => t.name === itemName || t.id === itemName);
        if (trait) {
          setEditingRacialTrait(trait);
          setShowRacialTraitCreator(true);
        }
        break;
      }
      case 'equipment': {
        const item = equipment.find(e => e.name === itemName);
        if (item) {
          setEditingEquipment(item);
          setShowEquipmentCreator(true);
        }
        break;
      }
      case 'races': {
        const race = races.find(r => r.name === itemName);
        if (race) {
          setEditingRace(race);
          setShowRaceCreator(true);
        }
        break;
      }
      case 'classes': {
        const cls = classes.find(c => c.name === itemName);
        if (cls) {
          setEditingClass(cls);
          setShowClassCreator(true);
        }
        break;
      }
      default:
        logger.warn('DataViewer', `Edit not supported for category: ${category}`);
    }
  }, [spells, skills, classFeatures, racialTraits, equipment, races, classes]);

  /**
   * Handle delete of a custom item
   */
  const handleDeleteItem = useCallback(async (category: DataCategory, itemName: string) => {
    const contentType = getContentType(category);
    const result = deleteContent(contentType, itemName);
    if (result.success) {
      logger.info('DataViewer', `Deleted ${category}/${itemName}`);
      showToast(`Deleted "${itemName}" successfully`, 'success');
      refreshData();
    } else {
      logger.error('DataViewer', `Failed to delete ${category}/${itemName}: ${result.error}`);
      showToast(`Failed to delete "${itemName}"`, 'error');
    }
  }, [deleteContent, refreshData]);

  /**
   * Handle duplicate of an item (creates a custom copy)
   */
  const handleDuplicateItem = useCallback(async (category: DataCategory, itemName: string) => {
    const contentType = getContentType(category);
    const newName = `${itemName} (Copy)`;
    const result = duplicateContent(contentType, itemName, newName);
    if (result.success) {
      logger.info('DataViewer', `Duplicated ${category}/${itemName} as ${newName}`);
      showToast(`Duplicated "${itemName}" as "${newName}"`, 'success');
      refreshData();
    } else {
      logger.error('DataViewer', `Failed to duplicate ${category}/${itemName}: ${result.error}`);
      showToast(`Failed to duplicate "${itemName}"`, 'error');
    }
  }, [duplicateContent, refreshData]);

  /**
   * Check if an item is custom (for showing the badge)
   */
  const checkIsCustomItem = useCallback((category: DataCategory, itemName: string): boolean => {
    return isCustomItem(category, itemName);
  }, [isCustomItem]);

  /**
   * Handle creation of new equipment via EquipmentCreatorForm
   */
  const handleCreateEquipment = useCallback(async (_formData: EquipmentCreatorFormData, equipment: Equipment) => {
    if (editingEquipment) {
      // Update existing equipment
      const result = updateContent('equipment', editingEquipment.name, equipment);
      if (result.success) {
        logger.info('DataViewer', `Updated equipment: ${equipment.name}`);
        showToast(`Updated equipment "${equipment.name}"`, 'success');
        setShowEquipmentCreator(false);
        setEditingEquipment(null);
        refreshData();
      } else {
        logger.error('DataViewer', `Failed to update equipment: ${result.error}`);
        showToast(`Failed to update equipment: ${result.error}`, 'error');
      }
    } else {
      // Create new equipment
      const result = createContent('equipment', equipment, { mode: 'relative' });
      if (result.success) {
        logger.info('DataViewer', `Created equipment: ${equipment.name}`);
        showToast(`Created equipment "${equipment.name}"`, 'success');
        setShowEquipmentCreator(false);
        setEditingEquipment(null);
        refreshData();
      } else {
        logger.error('DataViewer', `Failed to create equipment: ${result.error}`);
        showToast(`Failed to create equipment: ${result.error}`, 'error');
      }
    }
  }, [createContent, updateContent, refreshData, editingEquipment]);

  /**
   * Handle creation of new appearance option via AppearanceOptionCreator
   */
  const handleCreateAppearanceOption = useCallback((category: ContentType, value: string) => {
    logger.info('DataViewer', `Created appearance option: ${value} in ${category}`);
    showToast(`Added "${value}" to ${category.replace('appearance.', '')}`, 'success');
    setAppearanceCreatorCategory(null);
    refreshData();
  }, [refreshData]);

  /**
   * Handle update of appearance option
   * Deletes the old value and creates the new one
   */
  const handleUpdateAppearanceOption = useCallback((category: ContentType, originalValue: string, newValue: string) => {
    logger.info('DataViewer', `Updating appearance option: ${originalValue} -> ${newValue} in ${category}`);

    // Delete the old value
    const deleteResult = deleteContent(category, originalValue);
    if (!deleteResult.success) {
      showToast(`Failed to delete old value: ${deleteResult.error}`, 'error');
      return;
    }

    // Create the new value
    const createResult = createContent(category, newValue, { validate: true, markAsCustom: false });
    if (createResult.success) {
      showToast(`Updated "${originalValue}" to "${newValue}"`, 'success');
      setEditingAppearanceCategory(null);
      setEditingAppearanceValue(null);
      refreshData();
    } else {
      showToast(`Failed to create new value: ${createResult.error}`, 'error');
      // Try to restore the old value
      createContent(category, originalValue, { validate: true, markAsCustom: false });
    }
  }, [deleteContent, createContent, refreshData]);

  /**
   * Handle creation of new skill via SkillCreatorForm
   *
   * Note: The SkillCreatorForm handles content creation/update internally via useContentCreator.
   * This handler just manages UI state (closing modal, refreshing data, showing toast).
   */
  const handleCreateSkill = useCallback((skill: SkillFormData) => {
    const isEdit = !!editingSkill;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} skill: ${skill.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} skill "${skill.name}"`, 'success');
    setShowSkillCreator(false);
    setEditingSkill(null);
    refreshData();
  }, [refreshData, editingSkill]);

  /**
   * Handle creation of new spell via SpellCreatorForm
   *
   * Note: The SpellCreatorForm handles content creation/update internally via useContentCreator.
   * This handler just manages UI state (closing modal, refreshing data, showing toast).
   */
  const handleCreateSpell = useCallback((spell: SpellFormData) => {
    const isEdit = !!editingSpell;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} spell: ${spell.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} spell "${spell.name}"`, 'success');
    setShowSpellCreator(false);
    setEditingSpell(null);
    refreshData();
  }, [refreshData, editingSpell]);

  /**
   * Handle creation of new class feature via ClassFeatureCreatorForm
   * (Phase 5.4: Class Features Creation in DataViewerTab)
   *
   * Note: The ClassFeatureCreatorForm handles content creation/update internally via useContentCreator.
   * This handler just manages UI state (closing modal, refreshing data, showing toast).
   */
  const handleCreateClassFeature = useCallback((feature: ClassFeatureFormData) => {
    const isEdit = !!editingClassFeature;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} class feature: ${feature.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} class feature "${feature.name}"`, 'success');
    setShowClassFeatureCreator(false);
    setEditingClassFeature(null);
    refreshData();
  }, [refreshData, editingClassFeature]);

  /**
   * Handle creation of new racial trait via RacialTraitCreatorForm
   * (Phase 5.4: Racial Traits Creation in DataViewerTab)
   *
   * Note: The RacialTraitCreatorForm handles content creation/update internally via useContentCreator.
   * This handler just manages UI state (closing modal, refreshing data, showing toast).
   */
  const handleCreateRacialTrait = useCallback((trait: RacialTraitFormData) => {
    const isEdit = !!editingRacialTrait;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} racial trait: ${trait.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} racial trait "${trait.name}"`, 'success');
    setShowRacialTraitCreator(false);
    setEditingRacialTrait(null);
    refreshData();
  }, [refreshData, editingRacialTrait]);

  /**
   * Handle creation of new race via RaceCreatorForm
   * (Phase 6.1: Race Creation in DataViewerTab)
   *
   * Note: The RaceCreatorForm handles registration to both 'races' and 'races.data'
   * internally. This handler just manages UI state and data refresh.
   */
  const handleCreateRace = useCallback((race: RaceFormData) => {
    const isEdit = !!editingRace;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} race: ${race.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} race "${race.name}"`, 'success');
    setShowRaceCreator(false);
    setEditingRace(null);
    refreshData();
  }, [refreshData, editingRace]);

  /**
   * Handle creation of new class via ClassCreatorForm
   * (Phase 6.2: Class Creation in DataViewerTab)
   *
   * Note: The ClassCreatorForm handles registration to both 'classes' and 'classes.data'
   * internally. This handler just manages UI state and data refresh.
   */
  const handleCreateClass = useCallback((cls: ClassFormData) => {
    const isEdit = !!editingClass;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} class: ${cls.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} class "${cls.name}"`, 'success');
    setShowClassCreator(false);
    setEditingClass(null);
    refreshData();
  }, [refreshData, editingClass]);

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
  // Phase 6.1: Added Create Race button
  const renderRaces = () => (
    <div className="dataviewer-list">
      {/* Race Creation Header (Phase 6.1) */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowRaceCreator(true)}
          leftIcon={Plus}
        >
          Create Race
        </Button>
      </div>

      <div className="dataviewer-grid">
      {(getFilteredData as RaceDataEntry[]).map((race, index) => {
        const raceName = race.name || `Race-${index}`;
        const isExpanded = expandedItems.has(raceName);
        const hasImage = race.image || race.icon;
        const isCustom = checkIsCustomItem('races', raceName);

        return (
          <div key={raceName} className="dataviewer-card">
            <div
              className="dataviewer-card-header"
              onClick={() => toggleExpanded(raceName)}
            >
              <div className="dataviewer-card-header-content">
                {/* Race image/icon thumbnail */}
                {hasImage ? (
                  <div className="dataviewer-card-thumbnail">
                    <ArweaveImage
                      src={race.image || race.icon || ''}
                      alt={raceName}
                      width={32}
                      height={32}
                      showShimmer={true}
                      fallback={
                        <div className="dataviewer-card-thumbnail-fallback">
                          <Shield size={16} />
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <Shield size={18} className="dataviewer-card-icon" />
                )}
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
                {/* Full-size race image when expanded */}
                {race.image && (
                  <div className="dataviewer-card-image">
                    <ArweaveImage
                      src={race.image}
                      alt={raceName}
                      width={180}
                      height={180}
                      showShimmer={true}
                      fallback={
                        <div className="dataviewer-card-image-fallback">
                          <Shield size={48} />
                        </div>
                      }
                    />
                  </div>
                )}
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
                {isCustom && (
                  <div className="dataviewer-item-actions">
                    <CustomContentBadge
                      category="races"
                      itemName={raceName}
                      onEdit={() => handleEditItem('races', raceName)}
                      onDelete={() => handleDeleteItem('races', raceName)}
                      onDuplicate={() => handleDuplicateItem('races', raceName)}
                      showActions={true}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );

  // Render classes
  // Phase 6.2: Added Create Class button
  // Phase 6.3: Added Configure Class button
  const renderClasses = () => (
    <div className="dataviewer-list">
      {/* Class Creation Header (Phase 6.2) */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowClassCreator(true)}
          leftIcon={Plus}
        >
          Create Class
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowClassConfig(true)}
          leftIcon={Settings}
        >
          Configure Class
        </Button>
      </div>

      <div className="dataviewer-grid">
        {(getFilteredData as ClassDataEntry[]).map((cls, index) => {
          const className = cls.name || `Class-${index}`;
          const isExpanded = expandedItems.has(className);
          const hasImage = cls.image || cls.icon;
          const isCustom = checkIsCustomItem('classes', className);

          return (
            <div key={className} className="dataviewer-card">
              <div
                className="dataviewer-card-header"
                onClick={() => toggleExpanded(className)}
              >
                <div className="dataviewer-card-header-content">
                  {/* Class image/icon thumbnail */}
                  {hasImage ? (
                    <div className="dataviewer-card-thumbnail">
                      <ArweaveImage
                        src={cls.image || cls.icon || ''}
                        alt={className}
                        width={32}
                        height={32}
                        showShimmer={true}
                        fallback={
                          <div className="dataviewer-card-thumbnail-fallback">
                            <Zap size={16} />
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <Zap size={18} className="dataviewer-card-icon" />
                  )}
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
                  {/* Full-size class image when expanded */}
                  {cls.image && (
                    <div className="dataviewer-card-image">
                      <ArweaveImage
                        src={cls.image}
                        alt={className}
                        width={180}
                        height={180}
                        showShimmer={true}
                        fallback={
                          <div className="dataviewer-card-image-fallback">
                            <Zap size={48} />
                          </div>
                        }
                      />
                    </div>
                  )}
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
                  {isCustom && (
                    <div className="dataviewer-item-actions">
                      <CustomContentBadge
                        category="classes"
                        itemName={className}
                        onEdit={() => handleEditItem('classes', className)}
                        onDelete={() => handleDeleteItem('classes', className)}
                        onDuplicate={() => handleDuplicateItem('classes', className)}
                        showActions={true}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        const isCustom = checkIsCustomItem('equipment', item.name);
        const hasImage = item.image || item.icon;

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
                  {/* Custom Content Badge (Phase 2.2) */}
                  {isCustom && (
                    <CustomContentBadge
                      category="equipment"
                      itemName={item.name}
                      onEdit={() => handleEditItem('equipment', item.name)}
                      onDelete={() => handleDeleteItem('equipment', item.name)}
                      onDuplicate={() => handleDuplicateItem('equipment', item.name)}
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
      })}
    </div>
  );

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
   *
   * Phase 4.1: Added inline AppearanceOptionCreator per category
   */
  const renderAppearance = () => {
    // Get spawn mode for appearance to filter options
    const appearanceSpawnMode = getSpawnModeForCategory('appearance');
    const isAbsoluteMode = appearanceSpawnMode === 'absolute' || appearanceSpawnMode === 'replace';

    return (
    <div className="dataviewer-grid">
      {(getFilteredData as AppearanceCategoryData[]).map(category => {
        const isExpanded = expandedItems.has(category.key);
        const CategoryIcon = getAppearanceIcon(category.icon);
        const isCreatingOption = appearanceCreatorCategory === category.key;

        // Filter options based on spawn mode - only show custom items in absolute/replace mode
        const filteredOptions = isAbsoluteMode
          ? category.options.filter(option => isCustomItem('appearance', option))
          : category.options;

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
                  {filteredOptions.length} options
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
                {/* Add Option Button */}
                <div className="dataviewer-appearance-actions">
                  <Button
                    variant={isCreatingOption ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppearanceCreatorCategory(isCreatingOption ? null : category.key);
                      // Clear any editing state when toggling create mode
                      setEditingAppearanceCategory(null);
                      setEditingAppearanceValue(null);
                    }}
                    leftIcon={isCreatingOption ? X : Plus}
                  >
                    {isCreatingOption ? 'Cancel' : 'Add Option'}
                  </Button>
                </div>

                {/* Inline Creator Form */}
                {isCreatingOption && (
                  <div className="dataviewer-appearance-creator">
                    <AppearanceOptionCreator
                      initialCategory={category.key as ContentType}
                      onCreate={handleCreateAppearanceOption}
                      onCancel={() => setAppearanceCreatorCategory(null)}
                      submitButtonText="Add to Category"
                      showPreview={true}
                    />
                  </div>
                )}

                {/* Inline Editor Form for editing existing options */}
                {editingAppearanceCategory === category.key && editingAppearanceValue && (
                  <div className="dataviewer-appearance-creator dataviewer-appearance-editor">
                    <AppearanceOptionCreator
                      initialCategory={category.key as ContentType}
                      initialValue={editingAppearanceValue}
                      originalValue={editingAppearanceValue}
                      isEditMode={true}
                      onUpdate={handleUpdateAppearanceOption}
                      onCancel={() => {
                        setEditingAppearanceCategory(null);
                        setEditingAppearanceValue(null);
                      }}
                      showPreview={true}
                    />
                  </div>
                )}

                {/* Options List - filtered by spawn mode */}
                <div className="dataviewer-appearance-options">
                  {filteredOptions.map((option, idx) => {
                    const isCustom = isCustomItem('appearance', option);
                    const isEditing = editingAppearanceCategory === category.key && editingAppearanceValue === option;

                    // Check if this is a color value
                    if (isColorOption(option)) {
                      return (
                        <div 
                          key={idx} 
                          className={`dataviewer-appearance-color ${isCustom ? 'dataviewer-appearance-option-custom' : ''} ${isEditing ? 'dataviewer-appearance-color-editing' : ''} ${selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option ? 'dataviewer-appearance-selected' : ''}`}
                          onClick={() => {
                            if (isCustom) {
                              // Toggle selection - if already selected, deselect; otherwise select
                              if (selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option) {
                                setSelectedAppearanceOption(null);
                              } else {
                                setSelectedAppearanceOption({ category: category.key, option });
                              }
                            }
                          }}
                        >
                          <div
                            className="dataviewer-color-swatch"
                            style={{ backgroundColor: option }}
                            title={option}
                          />
                          <span className="dataviewer-color-value">{option}</span>
                          {isCustom && !isEditing && selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option && (
                            <div className="dataviewer-appearance-option-actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAppearanceCategory(category.key);
                                  setEditingAppearanceValue(option);
                                  // Close create form if open
                                  setAppearanceCreatorCategory(null);
                                  setSelectedAppearanceOption(null);
                                }}
                                leftIcon={Edit2}
                                title="Edit option"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem('appearance', option);
                                  setSelectedAppearanceOption(null);
                                }}
                                leftIcon={Trash2}
                                title="Delete option"
                                className="dataviewer-delete-btn"
                              />
                            </div>
                          )}
                        </div>
                      );
                    }
                    // Regular option (text)
                    return (
                      <div 
                        key={idx} 
                        className={`dataviewer-appearance-option ${isCustom ? 'dataviewer-appearance-option-custom' : ''} ${isEditing ? 'dataviewer-appearance-option-editing' : ''} ${selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option ? 'dataviewer-appearance-selected' : ''}`}
                        onClick={() => {
                          if (isCustom) {
                            // Toggle selection - if already selected, deselect; otherwise select
                            if (selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option) {
                              setSelectedAppearanceOption(null);
                            } else {
                              setSelectedAppearanceOption({ category: category.key, option });
                            }
                          }
                        }}
                      >
                        <span className="dataviewer-tag dataviewer-tag-appearance">
                          {option}
                        </span>
                        {isCustom && !isEditing && selectedAppearanceOption?.category === category.key && selectedAppearanceOption?.option === option && (
                          <div className="dataviewer-appearance-option-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAppearanceCategory(category.key);
                                setEditingAppearanceValue(option);
                                // Close create form if open
                                setAppearanceCreatorCategory(null);
                                setSelectedAppearanceOption(null);
                              }}
                              leftIcon={Edit2}
                              title="Edit option"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem('appearance', option);
                                setSelectedAppearanceOption(null);
                              }}
                              leftIcon={Trash2}
                              title="Delete option"
                              className="dataviewer-delete-btn"
                            />
                          </div>
                        )}
                      </div>
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
  };

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

    // Get spawn mode for current category for SpawnModeControls
    const currentSpawnMode = getSpawnModeForCategory(activeCategory);

    // Calculate actual custom count for current category
    // This is needed because manager.getInfo() doesn't track spells/skills/features correctly
    const customCountForCategory = useMemo(() => {
      switch (activeCategory) {
        case 'spells':
          return spells.filter(s => s.source === 'custom').length;
        case 'skills':
          return skills.filter(s => s.source === 'custom').length;
        case 'classFeatures':
          return classFeatures.filter(f => f.source === 'custom').length;
        case 'racialTraits':
          return racialTraits.filter(t => t.source === 'custom').length;
        case 'equipment':
          // Equipment uses ExtensionManager tracking
          return undefined;
        case 'races':
        case 'classes':
        case 'appearance':
          // These use ExtensionManager tracking
          return undefined;
        default:
          return undefined;
      }
    }, [activeCategory, spells, skills, classFeatures, racialTraits]);

    // Render spawn mode controls for the current category
    const renderSpawnModeControls = () => (
      <div className="dataviewer-spawn-controls">
        <SpawnModeControls
          category={activeCategory as any}
          categoryLabel={CATEGORY_CONFIG[activeCategory]?.label}
          showWeightEditor={true}
          showImportExport={true}
          customCount={customCountForCategory}
          onModeChange={(category, mode) => {
            logger.info('DataViewer', `Spawn mode changed for ${category}: ${mode}`);
            refreshData();
          }}
          onResetCategory={(category) => {
            logger.info('DataViewer', `Category reset: ${category}`);
            refreshData();
          }}
          onResetAll={() => {
            logger.info('DataViewer', 'All categories reset');
            refreshData();
          }}
        />
      </div>
    );

    if (getFilteredData.length === 0) {
      return (
        <div className="dataviewer-empty">
          <Database size={48} className="dataviewer-empty-icon" />
          <span className="dataviewer-empty-title">No items found</span>
          <span className="dataviewer-empty-message">
            {currentSpawnMode === 'absolute'
              ? 'No custom items in this category. Switch to "Relative" mode to see all items.'
              : 'Try adjusting your search or filters'}
          </span>
          {renderSpawnModeControls()}
        </div>
      );
    }

    switch (activeCategory) {
      case 'spells':
        return (
          <SpellsPanel
            spells={getFilteredData as RegisteredSpell[]}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onDuplicate={handleDuplicateItem}
            checkIsCustomItem={checkIsCustomItem}
            onCreateSpell={() => setShowSpellCreator(true)}
            renderSpellFilters={renderSpellFilters}
            renderSpawnModeControls={renderSpawnModeControls}
          />
        );
      case 'skills':
        return (
          <SkillsPanel
            skills={getFilteredData as CustomSkill[]}
            groupSkillsByAbility={groupSkillsByAbility}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onDuplicate={handleDuplicateItem}
            checkIsCustomItem={checkIsCustomItem}
            onCreateSkill={() => setShowSkillCreator(true)}
            renderSpawnModeControls={renderSpawnModeControls}
          />
        );
      case 'classFeatures':
        return (
          <ClassFeaturesPanel
            classFeatures={getFilteredData as ClassFeature[]}
            groupClassFeaturesByClass={groupClassFeaturesByClass}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onDuplicate={handleDuplicateItem}
            checkIsCustomItem={checkIsCustomItem}
            onCreateFeature={() => setShowClassFeatureCreator(true)}
            renderSpawnModeControls={renderSpawnModeControls}
          />
        );
      case 'racialTraits':
        return (
          <RacialTraitsPanel
            racialTraits={getFilteredData as RacialTrait[]}
            groupRacialTraitsByRace={groupRacialTraitsByRace}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onDuplicate={handleDuplicateItem}
            checkIsCustomItem={checkIsCustomItem}
            onCreateTrait={() => setShowRacialTraitCreator(true)}
            renderSpawnModeControls={renderSpawnModeControls}
          />
        );
      case 'races':
        return (
          <>
            {renderRaces()}
            {renderSpawnModeControls()}
          </>
        );
      case 'classes':
        return (
          <>
            {renderClasses()}
            {renderSpawnModeControls()}
          </>
        );
      case 'equipment':
        return (
          <div className="dataviewer-list">
            {/* Equipment Creation Header */}
            <div className="dataviewer-section-header">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowEquipmentCreator(true)}
                leftIcon={Plus}
              >
                Create Equipment
              </Button>
            </div>

            {renderEquipmentFilters()}
            <div className="dataviewer-items">
              {renderEquipment()}
            </div>
            {renderSpawnModeControls()}
          </div>
        );
      case 'appearance':
        return (
          <>
            {renderAppearance()}
            {renderSpawnModeControls()}
          </>
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

      {/* Content Creator Modals (Phase 5.4 - Modal Pattern) */}
      <ContentCreatorModal
        isOpen={showSpellCreator}
        onClose={() => {
          setShowSpellCreator(false);
          setEditingSpell(null);
        }}
        title={editingSpell ? `Edit Spell: ${editingSpell.name}` : "Create Custom Spell"}
        subtitle={editingSpell ? "Modify the spell properties" : "Add a new spell to the game"}
        icon={Sparkles}
        showFooter={false}
      >
        <SpellCreatorForm
          onCreate={handleCreateSpell}
          onCancel={() => {
            setShowSpellCreator(false);
            setEditingSpell(null);
          }}
          submitButtonText={editingSpell ? "Save Changes" : "Create Spell"}
          isEditMode={!!editingSpell}
          originalName={editingSpell?.name}
          initialData={editingSpell ? {
            name: editingSpell.name,
            level: editingSpell.level,
            school: editingSpell.school,
            casting_time: editingSpell.casting_time,
            range: editingSpell.range,
            components: (editingSpell.components || []).map(c => c as 'S' | 'V' | 'M'),
            duration: editingSpell.duration,
            description: editingSpell.description || '',
            classes: editingSpell.classes || [],
            icon: editingSpell.icon,
            image: editingSpell.image
          } : undefined}
        />
      </ContentCreatorModal>

      {/* Skill Creator Modal (Phase 4.1) */}
      <ContentCreatorModal
        isOpen={showSkillCreator}
        onClose={() => {
          setShowSkillCreator(false);
          setEditingSkill(null);
        }}
        title={editingSkill ? `Edit Skill: ${editingSkill.name}` : "Create Custom Skill"}
        subtitle={editingSkill ? "Modify the skill properties" : "Add a new skill for character proficiency"}
        icon={Swords}
        showFooter={false}
      >
        <SkillCreatorForm
          onCreate={handleCreateSkill}
          onCancel={() => {
            setShowSkillCreator(false);
            setEditingSkill(null);
          }}
          submitButtonText={editingSkill ? "Save Changes" : "Create Skill"}
          isEditMode={!!editingSkill}
          originalId={editingSkill?.id || editingSkill?.name}
          initialData={editingSkill ? {
            id: editingSkill.id,
            name: editingSkill.name,
            ability: editingSkill.ability,
            description: editingSkill.description || '',
            categories: editingSkill.categories || [],
            armorPenalty: editingSkill.armorPenalty,
            icon: editingSkill.icon,
            image: editingSkill.image
          } : undefined}
        />
      </ContentCreatorModal>

      {/* Equipment Creator Modal (Phase 4.2) */}
      <ContentCreatorModal
        isOpen={showEquipmentCreator}
        onClose={() => {
          setShowEquipmentCreator(false);
          setEditingEquipment(null);
        }}
        title={editingEquipment ? `Edit Equipment: ${editingEquipment.name}` : "Create Custom Equipment"}
        subtitle={editingEquipment ? "Modify the equipment properties" : "Add a new weapon, armor, item, or box"}
        icon={Package}
        showFooter={false}
        width="lg"
      >
        <EquipmentCreatorForm
          onSubmit={handleCreateEquipment}
          onCancel={() => {
            setShowEquipmentCreator(false);
            setEditingEquipment(null);
          }}
          initialData={editingEquipment ? {
            name: editingEquipment.name,
            type: editingEquipment.type,
            rarity: editingEquipment.rarity,
            weight: editingEquipment.weight,
            description: editingEquipment.description,
            properties: editingEquipment.properties,
            grantsFeatures: editingEquipment.grantsFeatures?.map(f => typeof f === 'string' ? f : f.name),
            grantsSkills: editingEquipment.grantsSkills?.map(s => ({
              skillId: s.skillId,
              level: s.level
            })),
            tags: editingEquipment.tags,
            icon: editingEquipment.icon,
            image: editingEquipment.image,
            boxContents: editingEquipment.boxContents
          } as any : undefined}
          isEditMode={!!editingEquipment}
          showPreview={true}
          showAdvancedOptions={true}
          showAutoEquip={false}
          submitButtonText={editingEquipment ? "Save Changes" : "Create Equipment"}
        />
      </ContentCreatorModal>

      <ContentCreatorModal
        isOpen={showClassFeatureCreator}
        onClose={() => {
          setShowClassFeatureCreator(false);
          setEditingClassFeature(null);
        }}
        title={editingClassFeature ? `Edit Class Feature: ${editingClassFeature.name}` : "Create Custom Class Feature"}
        subtitle={editingClassFeature ? "Modify the feature properties" : "Add a new feature for a class"}
        icon={Award}
        showFooter={false}
      >
        <ClassFeatureCreatorForm
          onCreate={handleCreateClassFeature}
          onCancel={() => {
            setShowClassFeatureCreator(false);
            setEditingClassFeature(null);
          }}
          isEditMode={!!editingClassFeature}
          originalId={editingClassFeature?.id || editingClassFeature?.name}
          initialData={editingClassFeature ? {
            id: editingClassFeature.id,
            name: editingClassFeature.name,
            class: editingClassFeature.class,
            level: editingClassFeature.level,
            type: editingClassFeature.type as 'active' | 'passive' | 'reaction',
            description: editingClassFeature.description,
            effects: editingClassFeature.effects || [],
            prerequisites: editingClassFeature.prerequisites || {},
            icon: editingClassFeature.icon,
            image: editingClassFeature.image
          } : undefined}
          submitButtonText={editingClassFeature ? "Save Changes" : "Create Feature"}
        />
      </ContentCreatorModal>

      <ContentCreatorModal
        isOpen={showRacialTraitCreator}
        onClose={() => {
          setShowRacialTraitCreator(false);
          setEditingRacialTrait(null);
        }}
        title={editingRacialTrait ? `Edit Racial Trait: ${editingRacialTrait.name}` : "Create Custom Racial Trait"}
        subtitle={editingRacialTrait ? "Modify the trait properties" : "Add a new trait for a race"}
        icon={User}
        showFooter={false}
      >
        <RacialTraitCreatorForm
          onCreate={handleCreateRacialTrait}
          onCancel={() => {
            setShowRacialTraitCreator(false);
            setEditingRacialTrait(null);
          }}
          isEditMode={!!editingRacialTrait}
          originalId={editingRacialTrait?.id || editingRacialTrait?.name}
          initialData={editingRacialTrait ? {
            id: editingRacialTrait.id,
            name: editingRacialTrait.name,
            race: editingRacialTrait.race,
            subrace: editingRacialTrait.subrace || '',
            description: editingRacialTrait.description,
            effects: editingRacialTrait.effects || [],
            prerequisites: editingRacialTrait.prerequisites || {},
            icon: editingRacialTrait.icon,
            image: editingRacialTrait.image
          } : undefined}
          submitButtonText={editingRacialTrait ? "Save Changes" : "Create Trait"}
        />
      </ContentCreatorModal>

      {/* Race Creator Modal (Phase 6.1) */}
      <ContentCreatorModal
        isOpen={showRaceCreator}
        onClose={() => {
          setShowRaceCreator(false);
          setEditingRace(null);
        }}
        title={editingRace ? `Edit Race: ${editingRace.name}` : "Create Custom Race"}
        subtitle={editingRace ? "Modify the race properties" : "Add a new playable race"}
        icon={Shield}
        showFooter={false}
        width="lg"
      >
        <RaceCreatorForm
          onCreate={handleCreateRace}
          onCancel={() => {
            setShowRaceCreator(false);
            setEditingRace(null);
          }}
          initialData={editingRace ? {
            name: editingRace.name,
            description: editingRace.description,
            speed: editingRace.speed,
            ability_bonuses: editingRace.ability_bonuses,
            traits: editingRace.traits,
            // Convert string[] to SubraceEntry[] if needed
            subraces: editingRace.subraces?.map(s => ({ name: s, traits: [] })),
            icon: editingRace.icon,
            image: editingRace.image
          } as any : undefined}
          isEditMode={!!editingRace}
          originalName={editingRace?.name}
          submitButtonText={editingRace ? "Save Changes" : "Create Race"}
          availableTraits={racialTraits.map(t => t.name)}
        />
      </ContentCreatorModal>

      {/* Class Creator Modal (Phase 6.2) */}
      <ContentCreatorModal
        isOpen={showClassCreator}
        onClose={() => {
          setShowClassCreator(false);
          setEditingClass(null);
        }}
        title={editingClass ? `Edit Class: ${editingClass.name}` : "Create Custom Class"}
        subtitle={editingClass ? "Modify the class properties" : "Add a new playable class"}
        icon={Zap}
        showFooter={false}
        width="lg"
      >
        <ClassCreatorForm
          onCreate={handleCreateClass}
          onCancel={() => {
            setShowClassCreator(false);
            setEditingClass(null);
          }}
          initialData={editingClass ? {
            name: editingClass.name,
            description: editingClass.description,
            baseClass: editingClass.name, // Use the class name as baseClass
            hit_die: editingClass.hit_die,
            primary_ability: editingClass.primary_ability as any,
            saving_throws: editingClass.saving_throws as any,
            skill_count: editingClass.skill_count,
            available_skills: editingClass.available_skills,
            has_expertise: false, // Default value
            expertise_count: 0, // Default value
            is_spellcaster: false, // Default value
            icon: editingClass.icon,
            image: editingClass.image
          } as any : undefined}
          isEditMode={!!editingClass}
          originalName={editingClass?.name}
          submitButtonText={editingClass ? "Save Changes" : "Create Class"}
          availableSkills={skills.map(s => s.id)}
        />
      </ContentCreatorModal>

      {/* Class Config Modal (Phase 6.3) */}
      <ContentCreatorModal
        isOpen={showClassConfig}
        onClose={() => setShowClassConfig(false)}
        title="Configure Class Data"
        subtitle="Manage skill lists, spell lists, spell slots, and starting equipment"
        icon={Settings}
        showFooter={false}
        width="lg"
      >
        <ClassConfigForm
          classData={classes}
          onSave={(config) => {
            logger.info('DataViewer', `Saved class config: ${config.type} for ${config.data.class}`);
            setShowClassConfig(false);
            refreshData();
          }}
          onCancel={() => setShowClassConfig(false)}
          availableSkills={skills.map(s => s.id)}
          availableSpells={spells.map(s => s.name)}
          availableEquipment={equipment.map(e => e.name)}
        />
      </ContentCreatorModal>
    </div>
  );
}

export default DataViewerTab;
