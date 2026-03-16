/**
 * useDataViewerEditing Hook
 *
 * A "Controller Hook" that manages editing state and handlers for the DataViewerTab.
 * This hook encapsulates all the state management and event handling logic,
 * keeping related concerns co-located.
 *
 * ## State Categories
 * - Category state: activeCategory
 * - Modal visibility states: showXxxCreator flags
 * - Edit states: editingXxx items
 * - Filter states: level/school/type/rarity/tag filters
 * - UI state: expandedItems, searchTerm
 *
 * ## Handlers
 * - CRUD operations: handleEditItem, handleDeleteItem, handleDuplicateItem
 * - Create handlers: handleCreateXxx for each content type
 * - Utility functions: toggleExpanded, getContentType, checkIsCustomItem
 */

import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { showToast } from '@/components/ui/Toast';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment } from 'playlist-data-engine';
import type { DataCategory, RaceDataEntry, ClassDataEntry } from '@/hooks/useDataViewer';
import type { ContentType } from '@/hooks/useContentCreator';
import { useSpawnMode } from '@/hooks/useSpawnMode';

// ==========================================
// Types
// ==========================================

/**
 * Props passed to the hook from useDataViewer
 */
export interface UseDataViewerEditingDataProps {
  /** All spells from the registry */
  spells: RegisteredSpell[];
  /** All skills from the registry */
  skills: CustomSkill[];
  /** All class features from the registry */
  classFeatures: ClassFeature[];
  /** All racial traits from the registry */
  racialTraits: RacialTrait[];
  /** All equipment from the registry */
  equipment: Equipment[];
  /** All races from the registry */
  races: RaceDataEntry[];
  /** All classes from the registry */
  classes: ClassDataEntry[];
  /** Function to check if an item is custom */
  isCustomItem: (category: DataCategory, itemName: string) => boolean;
  /** Function to refresh data after changes */
  refreshData: () => void;
}

/**
 * Props passed to the hook from useContentCreator
 */
export interface UseDataViewerEditingCreatorProps {
  /** Delete content function */
  deleteContent: (contentType: ContentType, itemName: string) => { success: boolean; error?: string };
  /** Duplicate content function */
  duplicateContent: (contentType: ContentType, itemName: string, newName: string) => { success: boolean; error?: string };
  /** Create content function */
  createContent: (contentType: ContentType, content: any, options?: any) => { success: boolean; error?: string };
  /** Update content function */
  updateContent: (contentType: ContentType, originalName: string, content: any) => { success: boolean; error?: string };
}

/**
 * Combined props for the hook
 */
export interface UseDataViewerEditingProps extends UseDataViewerEditingDataProps, UseDataViewerEditingCreatorProps {}

/**
 * Return type for the hook
 */
export interface UseDataViewerEditingReturn {
  // ==========================================
  // Category State
  // ==========================================
  activeCategory: DataCategory;
  setActiveCategory: (category: DataCategory) => void;

  // ==========================================
  // Modal Visibility States
  // ==========================================
  showEquipmentCreator: boolean;
  setShowEquipmentCreator: (show: boolean) => void;
  showSkillCreator: boolean;
  setShowSkillCreator: (show: boolean) => void;
  showSpellCreator: boolean;
  setShowSpellCreator: (show: boolean) => void;
  showClassFeatureCreator: boolean;
  setShowClassFeatureCreator: (show: boolean) => void;
  showRacialTraitCreator: boolean;
  setShowRacialTraitCreator: (show: boolean) => void;
  showRaceCreator: boolean;
  setShowRaceCreator: (show: boolean) => void;
  showClassCreator: boolean;
  setShowClassCreator: (show: boolean) => void;
  showClassConfig: boolean;
  setShowClassConfig: (show: boolean) => void;
  appearanceCreatorCategory: string | null;
  setAppearanceCreatorCategory: (category: string | null) => void;

  // ==========================================
  // Edit States
  // ==========================================
  editingSpell: RegisteredSpell | null;
  setEditingSpell: (spell: RegisteredSpell | null) => void;
  editingSkill: CustomSkill | null;
  setEditingSkill: (skill: CustomSkill | null) => void;
  editingEquipment: Equipment | null;
  setEditingEquipment: (equipment: Equipment | null) => void;
  editingClassFeature: ClassFeature | null;
  setEditingClassFeature: (feature: ClassFeature | null) => void;
  editingRacialTrait: RacialTrait | null;
  setEditingRacialTrait: (trait: RacialTrait | null) => void;
  editingRace: RaceDataEntry | null;
  setEditingRace: (race: RaceDataEntry | null) => void;
  editingClass: ClassDataEntry | null;
  setEditingClass: (cls: ClassDataEntry | null) => void;
  editingAppearanceCategory: string | null;
  setEditingAppearanceCategory: (category: string | null) => void;
  editingAppearanceValue: string | null;
  setEditingAppearanceValue: (value: string | null) => void;
  selectedAppearanceOption: { category: string; option: string } | null;
  setSelectedAppearanceOption: (option: { category: string; option: string } | null) => void;

  // ==========================================
  // Filter States
  // ==========================================
  spellLevelFilter: number | 'all';
  setSpellLevelFilter: (level: number | 'all') => void;
  spellSchoolFilter: string | 'all';
  setSpellSchoolFilter: (school: string | 'all') => void;
  equipmentTypeFilter: 'weapon' | 'armor' | 'item' | 'all';
  setEquipmentTypeFilter: (type: 'weapon' | 'armor' | 'item' | 'all') => void;
  equipmentRarityFilter: string | 'all';
  setEquipmentRarityFilter: (rarity: string | 'all') => void;
  equipmentTagFilter: string | 'all';
  setEquipmentTagFilter: (tag: string | 'all') => void;

  // ==========================================
  // UI State
  // ==========================================
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  expandedItems: Set<string>;
  setExpandedItems: (items: Set<string>) => void;
  toggleExpanded: (id: string) => void;

  // ==========================================
  // Handlers
  // ==========================================
  handleEditItem: (category: DataCategory, itemName: string) => void;
  handleDeleteItem: (category: DataCategory, itemName: string) => Promise<void>;
  handleDuplicateItem: (category: DataCategory, itemName: string) => Promise<void>;
  handleCreateEquipment: (formData: any, equipment: Equipment) => Promise<void>;
  handleCreateAppearanceOption: (category: ContentType, value: string) => void;
  handleUpdateAppearanceOption: (category: ContentType, originalValue: string, newValue: string) => void;
  handleCreateSkill: (skill: any) => void;
  handleCreateSpell: (spell: any) => void;
  handleCreateClassFeature: (feature: any) => void;
  handleCreateRacialTrait: (trait: any) => void;
  handleCreateRace: (race: any) => void;
  handleCreateClass: (cls: any) => void;

  // ==========================================
  // Utility Functions
  // ==========================================
  getContentType: (category: DataCategory) => ContentType;
  checkIsCustomItem: (category: DataCategory, itemName: string) => boolean;
}

// ==========================================
// Hook Implementation
// ==========================================

/**
 * Custom hook for managing DataViewer editing state and handlers
 */
export function useDataViewerEditing(props: UseDataViewerEditingProps): UseDataViewerEditingReturn {
  const {
    spells,
    skills,
    classFeatures,
    racialTraits,
    equipment,
    races,
    classes,
    isCustomItem,
    refreshData,
    deleteContent,
    duplicateContent,
    createContent,
    updateContent
  } = props;

  // Get spawn mode functions to preserve current mode when creating content
  const { getMode } = useSpawnMode();

  // ==========================================
  // Category State
  // ==========================================
  const [activeCategory, setActiveCategory] = useState<DataCategory>('spells');

  // ==========================================
  // Modal Visibility States
  // ==========================================
  const [showEquipmentCreator, setShowEquipmentCreator] = useState(false);
  const [showSkillCreator, setShowSkillCreator] = useState(false);
  const [showSpellCreator, setShowSpellCreator] = useState(false);
  const [showClassFeatureCreator, setShowClassFeatureCreator] = useState(false);
  const [showRacialTraitCreator, setShowRacialTraitCreator] = useState(false);
  const [showRaceCreator, setShowRaceCreator] = useState(false);
  const [showClassCreator, setShowClassCreator] = useState(false);
  const [showClassConfig, setShowClassConfig] = useState(false);
  const [appearanceCreatorCategory, setAppearanceCreatorCategory] = useState<string | null>(null);

  // ==========================================
  // Edit States
  // ==========================================
  const [editingSpell, setEditingSpell] = useState<RegisteredSpell | null>(null);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingClassFeature, setEditingClassFeature] = useState<ClassFeature | null>(null);
  const [editingRacialTrait, setEditingRacialTrait] = useState<RacialTrait | null>(null);
  const [editingRace, setEditingRace] = useState<RaceDataEntry | null>(null);
  const [editingClass, setEditingClass] = useState<ClassDataEntry | null>(null);
  const [editingAppearanceCategory, setEditingAppearanceCategory] = useState<string | null>(null);
  const [editingAppearanceValue, setEditingAppearanceValue] = useState<string | null>(null);
  const [selectedAppearanceOption, setSelectedAppearanceOption] = useState<{ category: string; option: string } | null>(null);

  // ==========================================
  // Filter States
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState<string | 'all'>('all');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<'weapon' | 'armor' | 'item' | 'all'>('all');
  const [equipmentRarityFilter, setEquipmentRarityFilter] = useState<string | 'all'>('all');
  const [equipmentTagFilter, setEquipmentTagFilter] = useState<string | 'all'>('all');

  // ==========================================
  // Utility Functions
  // ==========================================

  /**
   * Map DataCategory to ContentType for use with content creator
   */
  const getContentType = useCallback((category: DataCategory): ContentType => {
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
  }, []);

  /**
   * Check if an item is custom (for showing the badge)
   */
  const checkIsCustomItem = useCallback((category: DataCategory, itemName: string): boolean => {
    return isCustomItem(category, itemName);
  }, [isCustomItem]);

  /**
   * Toggle expanded state for an item
   */
  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  // ==========================================
  // CRUD Handlers
  // ==========================================

  /**
   * Handle edit of a custom item
   *
   * Opens the appropriate creator modal with the item data pre-filled for editing.
   */
  const handleEditItem = useCallback((category: DataCategory, itemName: string) => {
    logger.info('DataViewer', `Edit requested for ${category}/${itemName}`);

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
  }, [getContentType, deleteContent, refreshData]);

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
  }, [getContentType, duplicateContent, refreshData]);

  // ==========================================
  // Create Handlers
  // ==========================================

  /**
   * Handle creation of new equipment via EquipmentCreatorForm
   */
  const handleCreateEquipment = useCallback(async (_formData: any, equip: Equipment) => {
    // Get the current spawn mode for equipment to preserve it when creating content
    const currentMode = getMode('equipment') || 'relative';

    if (editingEquipment) {
      // Update existing equipment
      const result = updateContent('equipment', editingEquipment.name, equip);
      if (result.success) {
        logger.info('DataViewer', `Updated equipment: ${equip.name}`);
        showToast(`Updated equipment "${equip.name}"`, 'success');
        setShowEquipmentCreator(false);
        setEditingEquipment(null);
        refreshData();
      } else {
        logger.error('DataViewer', `Failed to update equipment: ${result.error}`);
        showToast(`Failed to update equipment: ${result.error}`, 'error');
      }
    } else {
      // Create new equipment - preserve current spawn mode
      const result = createContent('equipment', equip, { mode: currentMode });
      if (result.success) {
        logger.info('DataViewer', `Created equipment: ${equip.name}`);
        showToast(`Created equipment "${equip.name}"`, 'success');
        setShowEquipmentCreator(false);
        setEditingEquipment(null);
        refreshData();
      } else {
        logger.error('DataViewer', `Failed to create equipment: ${result.error}`);
        showToast(`Failed to create equipment: ${result.error}`, 'error');
      }
    }
  }, [createContent, updateContent, refreshData, editingEquipment, getMode]);

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
  const handleCreateSkill = useCallback((skill: any) => {
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
  const handleCreateSpell = useCallback((spell: any) => {
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
  const handleCreateClassFeature = useCallback((feature: any) => {
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
  const handleCreateRacialTrait = useCallback((trait: any) => {
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
  const handleCreateRace = useCallback((race: any) => {
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
  const handleCreateClass = useCallback((cls: any) => {
    const isEdit = !!editingClass;
    logger.info('DataViewer', `${isEdit ? 'Updated' : 'Created'} class: ${cls.name}`);
    showToast(`${isEdit ? 'Updated' : 'Created'} class "${cls.name}"`, 'success');
    setShowClassCreator(false);
    setEditingClass(null);
    refreshData();
  }, [refreshData, editingClass]);

  // ==========================================
  // Return Hook Values
  // ==========================================

  return {
    // Category State
    activeCategory,
    setActiveCategory,

    // Modal Visibility States
    showEquipmentCreator,
    setShowEquipmentCreator,
    showSkillCreator,
    setShowSkillCreator,
    showSpellCreator,
    setShowSpellCreator,
    showClassFeatureCreator,
    setShowClassFeatureCreator,
    showRacialTraitCreator,
    setShowRacialTraitCreator,
    showRaceCreator,
    setShowRaceCreator,
    showClassCreator,
    setShowClassCreator,
    showClassConfig,
    setShowClassConfig,
    appearanceCreatorCategory,
    setAppearanceCreatorCategory,

    // Edit States
    editingSpell,
    setEditingSpell,
    editingSkill,
    setEditingSkill,
    editingEquipment,
    setEditingEquipment,
    editingClassFeature,
    setEditingClassFeature,
    editingRacialTrait,
    setEditingRacialTrait,
    editingRace,
    setEditingRace,
    editingClass,
    setEditingClass,
    editingAppearanceCategory,
    setEditingAppearanceCategory,
    editingAppearanceValue,
    setEditingAppearanceValue,
    selectedAppearanceOption,
    setSelectedAppearanceOption,

    // Filter States
    spellLevelFilter,
    setSpellLevelFilter,
    spellSchoolFilter,
    setSpellSchoolFilter,
    equipmentTypeFilter,
    setEquipmentTypeFilter,
    equipmentRarityFilter,
    setEquipmentRarityFilter,
    equipmentTagFilter,
    setEquipmentTagFilter,

    // UI State
    searchTerm,
    setSearchTerm,
    expandedItems,
    setExpandedItems,
    toggleExpanded,

    // Handlers
    handleEditItem,
    handleDeleteItem,
    handleDuplicateItem,
    handleCreateEquipment,
    handleCreateAppearanceOption,
    handleUpdateAppearanceOption,
    handleCreateSkill,
    handleCreateSpell,
    handleCreateClassFeature,
    handleCreateRacialTrait,
    handleCreateRace,
    handleCreateClass,

    // Utility Functions
    getContentType,
    checkIsCustomItem,
  };
}
