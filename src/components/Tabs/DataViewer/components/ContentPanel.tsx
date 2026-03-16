/**
 * ContentPanel Component
 *
 * Renders the appropriate panel content based on the active category.
 * Handles loading, error, and empty states, and includes spawn mode controls.
 *
 * Extracted from DataViewerTab as part of Task 4.2 simplification.
 */

import { useMemo } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment } from 'playlist-data-engine';
import type { DataCategory, RaceDataEntry, ClassDataEntry, AppearanceCategoryData } from '@/hooks/useDataViewer';
import { CATEGORY_CONFIG } from '../constants';
import { SpawnModeControls } from '../SpawnModeControls';
import { SpellsPanel } from './SpellsPanel';
import { SkillsPanel } from './SkillsPanel';
import { ClassFeaturesPanel } from './ClassFeaturesPanel';
import { RacialTraitsPanel } from './RacialTraitsPanel';
import { RacesPanel } from './RacesPanel';
import { ClassesPanel } from './ClassesPanel';
import { EquipmentPanel } from './EquipmentPanel';
import { AppearancePanel } from './AppearancePanel';
import { EquipmentFilters } from './EquipmentFilters';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { logger } from '@/utils/logger';

// ==========================================
// Types
// ==========================================

export interface ContentPanelProps {
  // Category state
  activeCategory: DataCategory;

  // Data (only those needed for custom count calculation)
  spells: RegisteredSpell[];
  skills: CustomSkill[];
  classFeatures: ClassFeature[];
  racialTraits: RacialTrait[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Filtered data
  filteredData: unknown[];

  // Filter states
  spellLevelFilter: number | 'all';
  onLevelFilterChange: (level: number | 'all') => void;
  spellSchoolFilter: string | 'all';
  onSchoolFilterChange: (school: string | 'all') => void;
  equipmentTypeFilter: 'weapon' | 'armor' | 'item' | 'all';
  onTypeFilterChange: (type: 'weapon' | 'armor' | 'item' | 'all') => void;
  equipmentRarityFilter: string | 'all';
  onRarityFilterChange: (rarity: string | 'all') => void;
  equipmentTagFilter: string | 'all';
  onTagFilterChange: (tag: string | 'all') => void;

  // UI state
  expandedItems: Set<string>;
  toggleExpanded: (id: string) => void;

  // Handlers
  onEdit: (category: DataCategory, itemName: string) => void;
  onDelete: (category: DataCategory, itemName: string) => Promise<void>;
  onDuplicate: (category: DataCategory, itemName: string) => Promise<void>;
  checkIsCustomItem: (category: DataCategory, itemName: string) => boolean;

  // Creator callbacks
  onCreateSpell: () => void;
  onCreateSkill: () => void;
  onCreateFeature: () => void;
  onCreateTrait: () => void;
  onCreateRace: () => void;
  onCreateClass: () => void;
  onConfigureClass: () => void;
  onCreateEquipment: () => void;

  // Appearance editing state
  appearanceCreatorCategory: string | null;
  setAppearanceCreatorCategory: (category: string | null) => void;
  editingAppearanceCategory: string | null;
  setEditingAppearanceCategory: (category: string | null) => void;
  editingAppearanceValue: string | null;
  setEditingAppearanceValue: (value: string | null) => void;
  selectedAppearanceOption: { category: string; option: string } | null;
  setSelectedAppearanceOption: (option: { category: string; option: string } | null) => void;
  onCreateAppearanceOption: (category: any, value: string) => void;
  onUpdateAppearanceOption: (category: any, originalValue: string, newValue: string) => void;

  // Data helpers
  groupSkillsByAbility: (skills: CustomSkill[]) => Record<string, CustomSkill[]>;
  groupClassFeaturesByClass: (features: ClassFeature[]) => Record<string, ClassFeature[]>;
  groupRacialTraitsByRace: (traits: RacialTrait[]) => Record<string, RacialTrait[]>;
  getSpellSchools: () => string[];
  getEquipmentRarities: () => string[];
  getEquipmentTags: () => string[];
  getSpawnModeForCategory: (category: DataCategory) => string;
  refreshData: () => void;
}

// ==========================================
// Component
// ==========================================

export function ContentPanel({
  activeCategory,
  spells,
  skills,
  classFeatures,
  racialTraits,
  isLoading,
  error,
  filteredData,
  spellLevelFilter,
  onLevelFilterChange,
  spellSchoolFilter,
  onSchoolFilterChange,
  equipmentTypeFilter,
  onTypeFilterChange,
  equipmentRarityFilter,
  onRarityFilterChange,
  equipmentTagFilter,
  onTagFilterChange,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateSpell,
  onCreateSkill,
  onCreateFeature,
  onCreateTrait,
  onCreateRace,
  onCreateClass,
  onConfigureClass,
  onCreateEquipment,
  appearanceCreatorCategory,
  setAppearanceCreatorCategory,
  editingAppearanceCategory,
  setEditingAppearanceCategory,
  editingAppearanceValue,
  setEditingAppearanceValue,
  selectedAppearanceOption,
  setSelectedAppearanceOption,
  onCreateAppearanceOption,
  onUpdateAppearanceOption,
  groupSkillsByAbility,
  groupClassFeaturesByClass,
  groupRacialTraitsByRace,
  getSpellSchools,
  getEquipmentRarities,
  getEquipmentTags,
  getSpawnModeForCategory,
  refreshData,
}: ContentPanelProps) {
  // Calculate custom count for current category
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
      case 'races':
      case 'classes':
      case 'appearance':
        // These use ExtensionManager tracking
        return undefined;
      default:
        return undefined;
    }
  }, [activeCategory, spells, skills, classFeatures, racialTraits]);

  // Get spawn mode for current category
  const currentSpawnMode = getSpawnModeForCategory(activeCategory);

  // Spawn mode controls renderer
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

  // Create button renderer for empty state
  const renderCreateButton = () => {
    const categoryConfig = CATEGORY_CONFIG[activeCategory];
    const createButtonLabel = `Create ${categoryConfig?.label?.slice(0, -1) || 'Item'}`; // Remove trailing 's'

    switch (activeCategory) {
      case 'spells':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateSpell}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'skills':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateSkill}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'classFeatures':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateFeature}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'racialTraits':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateTrait}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'races':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateRace}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'classes':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateClass}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'equipment':
        return (
          <Button
            variant="primary"
            size="sm"
            onClick={onCreateEquipment}
            leftIcon={Plus}
          >
            {createButtonLabel}
          </Button>
        );
      case 'appearance':
        return null; // Appearance has a different flow
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="dataviewer-loading">
        <RefreshCw size={32} className="dataviewer-loading-icon" />
        <span>Loading data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dataviewer-error">
        <span className="dataviewer-error-title">Error loading data</span>
        <span className="dataviewer-error-message">{error}</span>
      </div>
    );
  }

  // Empty state
  if (filteredData.length === 0) {
    return (
      <div className="dataviewer-empty">
        <Database size={48} className="dataviewer-empty-icon" />
        <span className="dataviewer-empty-title">No items found</span>
        <span className="dataviewer-empty-message">
          {currentSpawnMode === 'absolute'
            ? 'No custom items in this category yet. Create your first custom item below!'
            : 'Try adjusting your search or filters'}
        </span>
        {/* Show create button in absolute mode or when there are no items at all */}
        {currentSpawnMode === 'absolute' && renderCreateButton() && (
          <div className="dataviewer-empty-create">
            {renderCreateButton()}
          </div>
        )}
        {renderSpawnModeControls()}
      </div>
    );
  }

  // Category-specific rendering
  switch (activeCategory) {
    case 'spells':
      return (
        <SpellsPanel
          spells={filteredData as RegisteredSpell[]}
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          checkIsCustomItem={checkIsCustomItem}
          onCreateSpell={onCreateSpell}
          renderSpawnModeControls={renderSpawnModeControls}
          spellLevelFilter={spellLevelFilter}
          onLevelFilterChange={onLevelFilterChange}
          spellSchoolFilter={spellSchoolFilter}
          onSchoolFilterChange={onSchoolFilterChange}
          getSpellSchools={getSpellSchools}
        />
      );

    case 'skills':
      return (
        <SkillsPanel
          skills={filteredData as CustomSkill[]}
          groupSkillsByAbility={groupSkillsByAbility}
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          checkIsCustomItem={checkIsCustomItem}
          onCreateSkill={onCreateSkill}
          renderSpawnModeControls={renderSpawnModeControls}
        />
      );

    case 'classFeatures':
      return (
        <ClassFeaturesPanel
          classFeatures={filteredData as ClassFeature[]}
          groupClassFeaturesByClass={groupClassFeaturesByClass}
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          checkIsCustomItem={checkIsCustomItem}
          onCreateFeature={onCreateFeature}
          renderSpawnModeControls={renderSpawnModeControls}
        />
      );

    case 'racialTraits':
      return (
        <RacialTraitsPanel
          racialTraits={filteredData as RacialTrait[]}
          groupRacialTraitsByRace={groupRacialTraitsByRace}
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          checkIsCustomItem={checkIsCustomItem}
          onCreateTrait={onCreateTrait}
          renderSpawnModeControls={renderSpawnModeControls}
        />
      );

    case 'races':
      return (
        <>
          <RacesPanel
            races={filteredData as RaceDataEntry[]}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            checkIsCustomItem={checkIsCustomItem}
            onCreateRace={onCreateRace}
          />
          {renderSpawnModeControls()}
        </>
      );

    case 'classes':
      return (
        <>
          <ClassesPanel
            classes={filteredData as ClassDataEntry[]}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            checkIsCustomItem={checkIsCustomItem}
            onCreateClass={onCreateClass}
            onConfigureClass={onConfigureClass}
          />
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
              onClick={onCreateEquipment}
              leftIcon={Plus}
            >
              Create Equipment
            </Button>
          </div>

          <EquipmentFilters
            equipmentTypeFilter={equipmentTypeFilter}
            onTypeFilterChange={onTypeFilterChange}
            equipmentRarityFilter={equipmentRarityFilter}
            onRarityFilterChange={onRarityFilterChange}
            equipmentTagFilter={equipmentTagFilter}
            onTagFilterChange={onTagFilterChange}
            getEquipmentRarities={getEquipmentRarities}
            getEquipmentTags={getEquipmentTags}
          />
          <div className="dataviewer-items">
            <EquipmentPanel
              equipment={filteredData as Equipment[]}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              checkIsCustomItem={checkIsCustomItem}
            />
          </div>
          {renderSpawnModeControls()}
        </div>
      );

    case 'appearance':
      return (
        <>
          <AppearancePanel
            appearanceCategories={filteredData as AppearanceCategoryData[]}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onDelete={onDelete}
            checkIsCustomItem={checkIsCustomItem}
            getSpawnModeForCategory={getSpawnModeForCategory}
            appearanceCreatorCategory={appearanceCreatorCategory}
            setAppearanceCreatorCategory={setAppearanceCreatorCategory}
            editingAppearanceCategory={editingAppearanceCategory}
            setEditingAppearanceCategory={setEditingAppearanceCategory}
            editingAppearanceValue={editingAppearanceValue}
            setEditingAppearanceValue={setEditingAppearanceValue}
            selectedAppearanceOption={selectedAppearanceOption}
            setSelectedAppearanceOption={setSelectedAppearanceOption}
            onCreateAppearanceOption={onCreateAppearanceOption}
            onUpdateAppearanceOption={onUpdateAppearanceOption}
          />
          {renderSpawnModeControls()}
        </>
      );

    default:
      return null;
  }
}
