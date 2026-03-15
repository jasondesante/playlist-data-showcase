# DataViewerTab Refactoring Plan

## Overview

**Goal:** Split the monolithic `DataViewerTab.tsx` component (3,189 lines, ~130KB) into smaller, more manageable components without changing any functionality or deleting any code.

**Principle:** This is a **pure refactoring** operation. No code will be deleted, no functionality will be lost, and no behavior will change. The only goal is to move code into new files for better organization and reduced file size.

---

## Current State Analysis

### File Statistics
- **Lines:** 3,189
- **Size:** ~130KB
- **Location:** `src/components/Tabs/DataViewerTab.tsx`

### Major Code Sections (by line count)

| Section | Lines | Description |
|---------|-------|-------------|
| Imports & Constants | 1-220 | Import statements, SCHOOL_COLORS, RARITY_COLORS, etc. |
| Helper Functions | 220-350 | formatLevel, formatRarity, formatAbilityBonus, formatSpawnWeight, formatCondition |
| Main Component State | 350-450 | useState hooks, editing states |
| Event Handlers | 450-750 | handleEditItem, handleDeleteItem, handleCreate*, etc. |
| Category Selector | 750-800 | renderCategorySelector |
| Spell Filters & Cards | 800-1000 | renderSpellFilters, renderSpellCard |
| Skills Section | 1000-1200 | renderSkills (grouped by ability) |
| Class Features | 1200-1450 | renderClassFeatures |
| Racial Traits | 1450-1700 | renderRacialTraits, formatPrerequisites, renderPrerequisites |
| Races Section | 1700-2000 | renderRaces, renderSubraceSection |
| Classes Section | 2000-2250 | renderClasses |
| Equipment Section | 2250-2600 | renderEquipment, renderGranted*, renderTags, formatSpell* |
| Appearance Section | 2600-2850 | renderAppearance, getAppearanceIcon, isColorOption |
| Render Content | 2850-2950 | renderContent switch statement |
| Main JSX Return | 2950-3100 | Header, search, modals |
| Modal Definitions | 3100-3189 | ContentCreatorModal components |

---

## Target Architecture

### New Folder Structure

```
src/components/Tabs/DataViewer/
├── DataViewerTab/              # NEW - all extracted from DataViewerTab.tsx
│   ├── sections/               # category content sections
│   │   ├── SpellsSection.tsx
│   │   ├── SkillsSection.tsx
│   │   ├── ClassFeaturesSection.tsx
│   │   ├── RacialTraitsSection.tsx
│   │   ├── RacesSection.tsx
│   │   ├── ClassesSection.tsx
│   │   ├── EquipmentSection.tsx
│   │   ├── AppearanceSection.tsx
│   │   └── index.ts
│   ├── modals/
│   │   ├── ContentModals.tsx
│   │   └── index.ts
│   ├── CategorySelector.tsx
│   ├── DataViewerHeader.tsx
│   ├── constants.ts
│   ├── types.ts
│   ├── utils.ts
│   └── index.ts                # barrel export for DataViewerTab/
├── __tests__/                  # existing
├── forms/                      # existing - creator forms
├── CustomContentBadge.tsx      # existing
├── SpawnModeControls.tsx       # existing
└── index.ts                    # existing barrel for DataViewer/
```

**Why this structure:**
- All extracted code lives in `DataViewerTab/` folder - clear that it came from DataViewerTab.tsx
- `forms/`, `CustomContentBadge`, and `SpawnModeControls` stay where they are (they weren't in DataViewerTab.tsx originally)
- Flat structure for constants/types/utils (only 3 files, no need for subfolder)

### Expected Results

| File | Expected Lines |
|------|----------------|
| DataViewerTab.tsx | ~400-500 (down from 3,189) |
| SpellsSection.tsx | ~200 |
| SkillsSection.tsx | ~150 |
| ClassFeaturesSection.tsx | ~150 |
| RacialTraitsSection.tsx | ~200 |
| RacesSection.tsx | ~200 |
| ClassesSection.tsx | ~150 |
| EquipmentSection.tsx | ~300 |
| AppearanceSection.tsx | ~200 |
| ContentModals.tsx | ~400 |
| constants.ts | ~100 |
| utils.ts | ~100 |
| hooks.ts | ~50 |

---

## Implementation Phases

### Phase 1: Shared Infrastructure
**Goal:** Extract reusable constants, types, and utility functions

- [ ] **Task 1.1:** Create `src/components/Tabs/DataViewer/shared/constants.ts`
  - Move `SCHOOL_COLORS`, `SCHOOL_BG_COLORS`
  - Move `RARITY_COLORS`, `RARITY_BG_COLORS`
  - Move `ABILITY_COLORS`
  - Move `PROPERTY_TYPE_CONFIG`
  - Move `CATEGORY_CONFIG`
  - Estimated: ~100 lines

- [ ] **Task 1.2:** Create `src/components/Tabs/DataViewer/shared/types.ts`
  - Define `SectionProps` interface (common props for all sections)
  - Define `CategoryHandlers` interface (edit, delete, duplicate callbacks)
  - Define `FilterState` interfaces
  - Export from index

- [ ] **Task 1.3:** Create `src/components/Tabs/DataViewer/shared/utils.ts`
  - Move `formatLevel()`
  - Move `formatRarity()`
  - Move `formatAbilityBonus()`
  - Move `formatSpawnWeight()`
  - Move `formatCondition()`
  - Move `getPropertyTypeConfig()`
  - Estimated: ~80 lines

- [ ] **Task 1.4:** Create `src/components/Tabs/DataViewer/shared/hooks.ts`
  - Extract common section state patterns if applicable
  - Create `useSectionState` hook if beneficial

- [ ] **Task 1.5:** Create `src/components/Tabs/DataViewer/shared/index.ts`
  - Barrel export all shared modules

---

### Phase 2: Header and Category Components
**Goal:** Extract top-level UI components

- [ ] **Task 2.1:** Create `src/components/Tabs/DataViewer/DataViewerHeader.tsx`
  - Extract header JSX (lines ~2950-2980)
  - Props: `onRefresh`, `isLoading`, `showNewItemsIndicator`
  - Estimated: ~50 lines

- [ ] **Task 2.2:** Create `src/components/Tabs/DataViewer/CategorySelector.tsx`
  - Extract `renderCategorySelector()` function (lines ~750-800)
  - Props: `activeCategory`, `onCategoryChange`, `dataCounts`
  - Estimated: ~60 lines

- [ ] **Task 2.3:** Update `DataViewerTab.tsx` imports
  - Import and use new `DataViewerHeader` component
  - Import and use new `CategorySelector` component
  - Import shared constants/utils

---

### Phase 3: Content Section Components
**Goal:** Extract each category's render function into a dedicated component

#### Phase 3.1: Spells Section
- [ ] **Task 3.1.1:** Create `src/components/Tabs/DataViewer/sections/SpellsSection.tsx`
  - Move `renderSpellFilters()` function
  - Move `renderSpellCard()` function
  - Move spell-related JSX from `renderContent()`
  - Props: `spells`, `expandedItems`, `toggleExpanded`, `handlers`, `spawnMode`, etc.
  - Estimated: ~200 lines

#### Phase 3.2: Skills Section
- [ ] **Task 3.2.1:** Create `src/components/Tabs/DataViewer/sections/SkillsSection.tsx`
  - Move `renderSkills()` function
  - Include grouped display logic
  - Props: `skills`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~150 lines

#### Phase 3.3: Class Features Section
- [ ] **Task 3.3.1:** Create `src/components/Tabs/DataViewer/sections/ClassFeaturesSection.tsx`
  - Move `renderClassFeatures()` function
  - Include grouped display by class
  - Props: `classFeatures`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~150 lines

#### Phase 3.4: Racial Traits Section
- [ ] **Task 3.4.1:** Create `src/components/Tabs/DataViewer/sections/RacialTraitsSection.tsx`
  - Move `renderRacialTraits()` function
  - Move `formatPrerequisites()` helper
  - Move `renderPrerequisites()` helper
  - Props: `racialTraits`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~200 lines

#### Phase 3.5: Races Section
- [ ] **Task 3.5.1:** Create `src/components/Tabs/DataViewer/sections/RacesSection.tsx`
  - Move `renderRaces()` function
  - Move `renderSubraceSection()` helper
  - Props: `races`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~200 lines

#### Phase 3.6: Classes Section
- [ ] **Task 3.6.1:** Create `src/components/Tabs/DataViewer/sections/ClassesSection.tsx`
  - Move `renderClasses()` function
  - Props: `classes`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~150 lines

#### Phase 3.7: Equipment Section
- [ ] **Task 3.7.1:** Create `src/components/Tabs/DataViewer/sections/EquipmentSection.tsx`
  - Move `renderEquipmentFilters()` function
  - Move `renderEquipment()` function
  - Move `renderGrantedSkills()` helper
  - Move `renderGrantedSpells()` helper
  - Move `renderGrantedFeatures()` helper
  - Move `renderTags()` helper
  - Move `formatSpellLevelShort()` helper
  - Move `formatSpellUses()` helper
  - Props: `equipment`, `expandedItems`, `toggleExpanded`, `handlers`, filters, etc.
  - Estimated: ~300 lines

#### Phase 3.8: Appearance Section
- [ ] **Task 3.8.1:** Create `src/components/Tabs/DataViewer/sections/AppearanceSection.tsx`
  - Move `renderAppearance()` function
  - Move `getAppearanceIcon()` helper
  - Move `isColorOption()` helper
  - Props: `appearance`, `expandedItems`, `toggleExpanded`, `handlers`, etc.
  - Estimated: ~200 lines

#### Phase 3.9: Section Index
- [ ] **Task 3.9.1:** Create `src/components/Tabs/DataViewer/sections/index.ts`
  - Barrel export all section components

---

### Phase 4: Modal Components
**Goal:** Extract all ContentCreatorModal definitions

- [ ] **Task 4.1:** Create `src/components/Tabs/DataViewer/modals/ContentModals.tsx`
  - Move Spell Creator Modal
  - Move Skill Creator Modal
  - Move Equipment Creator Modal
  - Move Class Feature Creator Modal
  - Move Racial Trait Creator Modal
  - Move Race Creator Modal
  - Move Class Creator Modal
  - Move Class Config Modal
  - Props: All modal visibility states, editing states, handlers
  - Estimated: ~400 lines

- [ ] **Task 4.2:** Create `src/components/Tabs/DataViewer/modals/index.ts`
  - Export ContentModals component

---

### Phase 5: Integration & Cleanup
**Goal:** Update DataViewerTab to use all new components

- [ ] **Task 5.1:** Update `DataViewerTab.tsx` main component
  - Remove moved code
  - Import all new section components
  - Import shared utilities
  - Import header and category selector
  - Import modals component
  - Update `renderContent()` to use section components
  - Estimated final size: ~400-500 lines

- [ ] **Task 5.2:** Update `src/components/Tabs/DataViewer/index.ts`
  - Export new components as needed
  - Update barrel file

- [ ] **Task 5.3:** Verify all imports resolve correctly
  - Run TypeScript compiler
  - Fix any import errors

---

## Detailed Component Specifications

### Shared Types (`shared/types.ts`)

```typescript
import type { DataCategory, DataCounts, RaceDataEntry, ClassDataEntry, AppearanceCategoryData } from '@/hooks/useDataViewer';
import type { RegisteredSpell, CustomSkill, ClassFeature, RacialTrait, Equipment } from 'playlist-data-engine';

/** Common props for all section components */
export interface SectionProps {
  /** Items currently expanded */
  expandedItems: Set<string>;
  /** Toggle expansion state */
  onToggleExpanded: (id: string) => void;
  /** Check if item is custom */
  isCustomItem: (category: DataCategory, itemName: string) => boolean;
  /** Handler for editing items */
  onEdit: (category: DataCategory, itemName: string) => void;
  /** Handler for deleting items */
  onDelete: (category: DataCategory, itemName: string) => void;
  /** Handler for duplicating items */
  onDuplicate: (category: DataCategory, itemName: string) => void;
}

/** Props for category selector */
export interface CategorySelectorProps {
  activeCategory: DataCategory;
  onCategoryChange: (category: DataCategory) => void;
  dataCounts: DataCounts;
}

/** Props for DataViewerHeader */
export interface DataViewerHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  showNewItemsIndicator: boolean;
}

/** Props for ContentModals */
export interface ContentModalsProps {
  // Modal visibility states
  showSpellCreator: boolean;
  showSkillCreator: boolean;
  showEquipmentCreator: boolean;
  showClassFeatureCreator: boolean;
  showRacialTraitCreator: boolean;
  showRaceCreator: boolean;
  showClassCreator: boolean;
  showClassConfig: boolean;

  // Close handlers
  onCloseSpellCreator: () => void;
  onCloseSkillCreator: () => void;
  onCloseEquipmentCreator: () => void;
  onCloseClassFeatureCreator: () => void;
  onCloseRacialTraitCreator: () => void;
  onCloseRaceCreator: () => void;
  onCloseClassCreator: () => void;
  onCloseClassConfig: () => void;

  // Create handlers
  onCreateSpell: (spell: any) => void;
  onCreateSkill: (skill: any) => void;
  onCreateEquipment: (formData: any, equipment: Equipment) => void;
  onCreateClassFeature: (feature: any) => void;
  onCreateRacialTrait: (trait: any) => void;
  onCreateRace: (race: any) => void;
  onCreateClass: (cls: any) => void;
  onSaveClassConfig: (config: any) => void;

  // Editing states
  editingSpell: RegisteredSpell | null;
  editingSkill: CustomSkill | null;
  editingEquipment: Equipment | null;
  editingClassFeature: ClassFeature | null;
  editingRacialTrait: RacialTrait | null;
  editingRace: RaceDataEntry | null;
  editingClass: ClassDataEntry | null;

  // Available data for dropdowns
  availableSkills: string[];
  availableSpells: string[];
  availableEquipment: string[];
  availableTraits: string[];
  classes: ClassDataEntry[];
}
```

---

## Risk Mitigation

### Testing Strategy
1. **Before each phase:** Run existing tests to establish baseline
2. **After each task:** Run tests to verify no regressions
3. **After each phase:** Manual smoke test of all category views
4. **Final verification:** Full test suite + manual testing

### Rollback Plan
- All changes are in new files initially
- Original DataViewerTab.tsx is preserved until Phase 5
- Git commits after each phase for easy rollback

### Dependencies
- No external dependencies added
- All imports remain within the project

---

## Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Shared Infrastructure | 5 tasks | 1-2 hours |
| Phase 2: Header & Category | 3 tasks | 30 min |
| Phase 3: Content Sections | 9 tasks | 3-4 hours |
| Phase 4: Modals | 2 tasks | 1 hour |
| Phase 5: Integration | 3 tasks | 1 hour |
| **Total** | **22 tasks** | **6-8 hours** |

---

## Success Criteria

- [ ] DataViewerTab.tsx reduced to < 600 lines
- [ ] All 8 category sections extracted to dedicated components
- [ ] All modals extracted to dedicated component
- [ ] Shared constants and utilities extracted
- [ ] All existing tests pass
- [ ] No functionality changes or regressions
- [ ] TypeScript compiles without errors
- [ ] Application runs correctly

---

## Notes

- This plan prioritizes **safety over speed** - each task is small and reversible
- The section components will receive all needed data as props (no context introduction)
- CSS files remain in place (DataViewerTab.css) - only TSX is being refactored
- Form components in `forms/` folder remain unchanged
