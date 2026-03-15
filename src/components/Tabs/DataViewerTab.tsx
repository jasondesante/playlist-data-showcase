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
 * @see docs/plans/DATAVIEWER_ENHANCEMENT_PLAN.md for implementation details
 * @see src/hooks/useDataViewer.ts for data fetching and filtering logic
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  Shield,
  Sparkles,
  Package,
  Zap,
  RefreshCw,
  Award,
  User,
  Settings
} from 'lucide-react';
import { useDataViewer, type RaceDataEntry, type ClassDataEntry, type AppearanceCategoryData } from '../../hooks/useDataViewer';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { useDataViewerStore } from '../../store/dataViewerStore';
import { logger } from '../../utils/logger';
import { useContentCreator } from '../../hooks/useContentCreator';
import { EquipmentCreatorForm } from '../shared/EquipmentCreatorForm';
import { SkillCreatorForm } from './DataViewer/forms/SkillCreatorForm';
import { SpellCreatorForm } from './DataViewer/forms/SpellCreatorForm';
import { ClassFeatureCreatorForm } from './DataViewer/forms/ClassFeatureCreatorForm';
import { RacialTraitCreatorForm } from './DataViewer/forms/RacialTraitCreatorForm';
import { RaceCreatorForm } from './DataViewer/forms/RaceCreatorForm';
import { ClassCreatorForm } from './DataViewer/forms/ClassCreatorForm';
import { ClassConfigForm } from './DataViewer/forms/ClassConfigForm';
import { Swords } from 'lucide-react';
import { ContentCreatorModal } from '../modals/ContentCreatorModal';
import './DataViewerTab.css';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment } from 'playlist-data-engine';
import { CATEGORY_CONFIG } from './DataViewer/constants';
import { CategorySelector, ContentPanel } from './DataViewer/components';
import { useDataViewerEditing } from './DataViewer/hooks/useDataViewerEditing';

export function DataViewerTab() {
  // Data viewer hook
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
  const contentCreator = useContentCreator();

  // Editing state and handlers - managed by the useDataViewerEditing hook
  const editingState = useDataViewerEditing({
    spells,
    skills,
    classFeatures,
    racialTraits,
    equipment,
    races,
    classes,
    isCustomItem,
    refreshData,
    deleteContent: contentCreator.deleteContent,
    duplicateContent: contentCreator.duplicateContent,
    createContent: contentCreator.createContent,
    updateContent: contentCreator.updateContent,
  });

  // Destructure editing state for use in the component
  const {
    activeCategory,
    setActiveCategory,
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
    searchTerm,
    setSearchTerm,
    expandedItems,
    setExpandedItems,
    toggleExpanded,
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
    checkIsCustomItem,
  } = editingState;

  // New items indicator state (kept separate as it's local to this component)
  const [showNewItemsIndicator, setShowNewItemsIndicator] = useState(false);

  // Mark changes as viewed when tab is mounted and check for new items
  useEffect(() => {
    markChangesViewed();

    if (lastEquipmentCount > 0 && hasEquipmentCountIncreased(dataCounts.equipment)) {
      setShowNewItemsIndicator(true);
      const timer = setTimeout(() => setShowNewItemsIndicator(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update equipment count when it changes
  useEffect(() => {
    updateEquipmentCount(dataCounts.equipment);
  }, [dataCounts.equipment, updateEquipmentCount]);

  // Get filtered data based on active category and filters
  const filteredData = useMemo(() => {
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
        <CategorySelector
          activeCategory={activeCategory}
          dataCounts={dataCounts}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setSearchTerm('');
            setExpandedItems(new Set());
          }}
        />
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
            {filteredData.length} results
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
              ({filteredData.length} / {dataCounts[CATEGORY_CONFIG[activeCategory].countKey]})
            </span>
          </div>
        </CardHeader>

        <div className="dataviewer-content-body">
          <ContentPanel
            activeCategory={activeCategory}
            spells={spells}
            skills={skills}
            classFeatures={classFeatures}
            racialTraits={racialTraits}
            isLoading={isLoading}
            error={error}
            filteredData={filteredData}
            spellLevelFilter={spellLevelFilter}
            onLevelFilterChange={setSpellLevelFilter}
            spellSchoolFilter={spellSchoolFilter}
            onSchoolFilterChange={setSpellSchoolFilter}
            equipmentTypeFilter={equipmentTypeFilter}
            onTypeFilterChange={setEquipmentTypeFilter}
            equipmentRarityFilter={equipmentRarityFilter}
            onRarityFilterChange={setEquipmentRarityFilter}
            equipmentTagFilter={equipmentTagFilter}
            onTagFilterChange={setEquipmentTagFilter}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onDuplicate={handleDuplicateItem}
            checkIsCustomItem={checkIsCustomItem}
            onCreateSpell={() => setShowSpellCreator(true)}
            onCreateSkill={() => setShowSkillCreator(true)}
            onCreateFeature={() => setShowClassFeatureCreator(true)}
            onCreateTrait={() => setShowRacialTraitCreator(true)}
            onCreateRace={() => setShowRaceCreator(true)}
            onCreateClass={() => setShowClassCreator(true)}
            onConfigureClass={() => setShowClassConfig(true)}
            onCreateEquipment={() => setShowEquipmentCreator(true)}
            appearanceCreatorCategory={appearanceCreatorCategory}
            setAppearanceCreatorCategory={setAppearanceCreatorCategory}
            editingAppearanceCategory={editingAppearanceCategory}
            setEditingAppearanceCategory={setEditingAppearanceCategory}
            editingAppearanceValue={editingAppearanceValue}
            setEditingAppearanceValue={setEditingAppearanceValue}
            selectedAppearanceOption={selectedAppearanceOption}
            setSelectedAppearanceOption={setSelectedAppearanceOption}
            onCreateAppearanceOption={handleCreateAppearanceOption}
            onUpdateAppearanceOption={handleUpdateAppearanceOption}
            groupSkillsByAbility={groupSkillsByAbility}
            groupClassFeaturesByClass={groupClassFeaturesByClass}
            groupRacialTraitsByRace={groupRacialTraitsByRace}
            getSpellSchools={getSpellSchools}
            getEquipmentRarities={getEquipmentRarities}
            getEquipmentTags={getEquipmentTags}
            getSpawnModeForCategory={getSpawnModeForCategory}
            refreshData={refreshData}
          />
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

      {/* Content Creator Modals */}
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
            baseClass: editingClass.name,
            hit_die: editingClass.hit_die,
            primary_ability: editingClass.primary_ability as any,
            saving_throws: editingClass.saving_throws as any,
            skill_count: editingClass.skill_count,
            available_skills: editingClass.available_skills,
            has_expertise: false,
            expertise_count: 0,
            is_spellcaster: false,
            icon: editingClass.icon,
            image: editingClass.image
          } as any : undefined}
          isEditMode={!!editingClass}
          originalName={editingClass?.name}
          submitButtonText={editingClass ? "Save Changes" : "Create Class"}
          availableSkills={skills.map(s => s.id)}
        />
      </ContentCreatorModal>

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
