# DataViewerTab Refactoring Plan

## Executive Summary

This plan outlines a **pure code reorganization refactor** of `DataViewerTab.tsx` (~3,176 lines). The goal is to split the monolithic component into smaller, more manageable pieces without changing any functionality or deleting any code - just moving things around.

**Key Principle**: No functionality will be lost. This is strictly about code organization and file size reduction.

---

## Current State Analysis

### File Structure
```
src/components/Tabs/DataViewerTab.tsx  (~3,176 lines)  <-- TOO BIG
src/components/Tabs/DataViewer/
  ├── CustomContentBadge.tsx
  ├── SpawnModeControls.tsx
  └── forms/
      ├── AppearanceOptionCreator.tsx
      ├── SpellCreatorForm.tsx
      ├── SkillCreatorForm.tsx
      ├── ClassFeatureCreatorForm.tsx
      ├── RacialTraitCreatorForm.tsx
      ├── RaceCreatorForm.tsx
      ├── ClassCreatorForm.tsx
      └── ClassConfigForm.tsx
```

### What's Currently in DataViewerTab.tsx

**Constants (~100 lines)**:
- `SCHOOL_COLORS`, `SCHOOL_BG_COLORS`
- `RARITY_COLORS`, `RARITY_BG_COLORS`
- `ABILITY_COLORS`
- `PROPERTY_TYPE_CONFIG`
- `CATEGORY_CONFIG`

**Helper Functions (~150 lines)**:
- `formatLevel()`
- `formatRarity()`
- `formatAbilityBonus()`
- `formatSpawnWeight()`
- `formatCondition()`
- `formatPrerequisites()`
- `getPropertyTypeConfig()`
- `formatSpellLevelShort()`
- `formatSpellUses()`
- `isColorOption()`
- `getAppearanceIcon()`

**Render Functions (~1,500 lines)**:
- `renderCategorySelector()`
- `renderSpellFilters()`
- `renderEquipmentFilters()`
- `renderSpellCard()`
- `renderSkills()`
- `renderClassFeatures()`
- `renderRacialTraits()`
- `renderPrerequisites()`
- `renderSubraceSection()`
- `renderRaces()`
- `renderClasses()`
- `renderGrantedSkills()`
- `renderGrantedSpells()`
- `renderGrantedFeatures()`
- `renderTags()`
- `renderEquipment()`
- `renderAppearance()`
- `renderContent()`
- `renderSpawnModeControls()`

**State & Hooks (~150 lines)**:
- Multiple useState hooks for modals and editing
- useEffect for changes tracking
- useMemo for filtered data
- useCallback for handlers

**Event Handlers (~200 lines)**:
- `handleEditItem()`
- `handleDeleteItem()`
- `handleDuplicateItem()`
- `handleCreateEquipment()`
- `handleCreateAppearanceOption()`
- `handleUpdateAppearanceOption()`
- `handleCreateSkill()`
- `handleCreateSpell()`
- `handleCreateClassFeature()`
- `handleCreateRacialTrait()`
- `handleCreateRace()`
- `handleCreateClass()`
- `getContentType()`
- `checkIsCustomItem()`

**JSX Return (~600 lines)**:
- Main component structure
- 8+ ContentCreatorModal instances

---

## Target Architecture

### New File Structure
```
src/components/Tabs/DataViewer/
  ├── index.ts                    # Re-exports
  ├── constants/
  │   ├── colors.ts              # Color mappings (SCHOOL_COLORS, RARITY_COLORS, ABILITY_COLORS)
  │   ├── categories.ts          # CATEGORY_CONFIG
  │   └── propertyTypes.ts       # PROPERTY_TYPE_CONFIG
  ├── utils/
  │   ├── formatters.ts          # formatLevel, formatRarity, formatAbilityBonus, etc.
  │   └── index.ts               # Re-exports
  ├── hooks/
  │   └── useDataViewerHandlers.ts # Custom hooks for handlers
  ├── components/
  │   ├── CategorySelector.tsx    # Category tabs
  │   ├── SpellFilters.tsx        # Spell level/school filters
  │   ├── EquipmentFilters.tsx    # Equipment type/rarity/tag filters
  │   ├── SpellsPanel.tsx         # Spell list + card rendering
  │   ├── SkillsPanel.tsx         # Skills grouped by ability
  │   ├── ClassFeaturesPanel.tsx  # Class features grouped by class
  │   ├── RacialTraitsPanel.tsx   # Racial traits grouped by race
  │   ├── RacesPanel.tsx          # Race cards
  │   ├── ClassesPanel.tsx        # Class cards
  │   ├── EquipmentPanel.tsx      # Equipment grid
  │   ├── AppearancePanel.tsx     # Appearance categories
  │   └── index.ts                # Re-exports
  ├── CustomContentBadge.tsx      # (existing)
  ├── SpawnModeControls.tsx       # (existing)
  └── forms/                      # (existing forms)

src/components/Tabs/DataViewerTab.tsx  (~300 lines after refactor)
```

---

## Phase 1: Extract Constants and Utilities

### Task 1.1: Create Constants Directory
- [x] Create `src/components/Tabs/DataViewer/constants/` directory
- [x] Create `colors.ts` with:
  - `SCHOOL_COLORS`
  - `SCHOOL_BG_COLORS`
  - `RARITY_COLORS`
  - `RARITY_BG_COLORS`
  - `ABILITY_COLORS`
- [x] Create `categories.ts` with:
  - `CATEGORY_CONFIG`
- [x] Create `propertyTypes.ts` with:
  - `PROPERTY_TYPE_CONFIG`
  - `getPropertyTypeConfig()`
- [x] Create `index.ts` barrel export

**Estimated lines moved**: ~100 lines

### Task 1.2: Create Utils Directory
- [x] Create `src/components/Tabs/DataViewer/utils/` directory
- [x] Create `formatters.ts` with:
  - `formatLevel()`
  - `formatRarity()`
  - `formatAbilityBonus()`
  - `formatSpawnWeight()`
  - `formatCondition()`
  - `formatPrerequisites()`
  - `formatSpellLevelShort()`
  - `formatSpellUses()`
  - `isColorOption()`
  - `getAppearanceIcon()`
- [x] Create `index.ts` barrel export

**Estimated lines moved**: ~150 lines

---

## Phase 2: Extract Panel Components

### Task 2.1: Create SpellsPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/SpellsPanel.tsx`
- [x] Move `renderSpellCard()` function
- [x] Move spell-related JSX from `renderContent()`
- [x] Accept props: `spells`, `expandedItems`, `toggleExpanded`, `onEdit`, `onDelete`, `onDuplicate`, `checkIsCustomItem`
- [x] Import color constants from `../constants`

**Estimated lines moved**: ~120 lines

### Task 2.2: Create SkillsPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/SkillsPanel.tsx`
- [x] Move `renderSkills()` function and skill card rendering
- [x] Accept props for grouped skills and handlers
- [x] Import `ABILITY_COLORS` from constants

**Estimated lines moved**: ~130 lines

### Task 2.3: Create ClassFeaturesPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/ClassFeaturesPanel.tsx`
- [x] Move `renderClassFeatures()` function
- [x] Accept props for grouped features and handlers

**Estimated lines moved**: ~130 lines

### Task 2.4: Create RacialTraitsPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/RacialTraitsPanel.tsx`
- [x] Move `renderRacialTraits()` function
- [x] Move `renderPrerequisites()` helper
- [x] Accept props for grouped traits and handlers

**Estimated lines moved**: ~150 lines

### Task 2.5: Create RacesPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/RacesPanel.tsx`
- [x] Move `renderRaces()` function
- [x] Move `renderSubraceSection()` helper
- [x] Accept props for races data and handlers

**Estimated lines moved**: ~170 lines

### Task 2.6: Create ClassesPanel Component
- [x] Create `src/components/Tabs/DataViewer/components/ClassesPanel.tsx`
- [x] Move `renderClasses()` function
- [x] Accept props for classes data and handlers

**Estimated lines moved**: ~160 lines

### Task 2.7: Create EquipmentPanel Component
- [ ] Create `src/components/Tabs/DataViewer/components/EquipmentPanel.tsx`
- [ ] Move `renderEquipment()` function
- [ ] Move helper functions:
  - `renderGrantedSkills()`
  - `renderGrantedSpells()`
  - `renderGrantedFeatures()`
  - `renderTags()`
- [ ] Accept props for equipment data and handlers

**Estimated lines moved**: ~250 lines

### Task 2.8: Create AppearancePanel Component
- [ ] Create `src/components/Tabs/DataViewer/components/AppearancePanel.tsx`
- [ ] Move `renderAppearance()` function
- [ ] Accept props for appearance data and handlers

**Estimated lines moved**: ~220 lines

### Task 2.9: Create Filter Components
- [ ] Create `src/components/Tabs/DataViewer/components/CategorySelector.tsx`
- [ ] Move `renderCategorySelector()` function
- [ ] Create `src/components/Tabs/DataViewer/components/SpellFilters.tsx`
- [ ] Move `renderSpellFilters()` function
- [ ] Create `src/components/Tabs/DataViewer/components/EquipmentFilters.tsx`
- [ ] Move `renderEquipmentFilters()` function

**Estimated lines moved**: ~100 lines

### Task 2.10: Create Components Index
- [ ] Create `src/components/Tabs/DataViewer/components/index.ts`
- [ ] Export all panel components

---

## Phase 3: Extract Custom Hook

### Task 3.1: Create useDataViewerEditing Hook

> **Design Decision**: This hook uses the "Controller Hook" pattern - it manages both state AND handlers together, keeping related logic co-located.

- [ ] Create `src/components/Tabs/DataViewer/hooks/` directory
- [ ] Create `useDataViewerEditing.ts`
- [ ] Move all editing states (28 useState calls) into the hook:
  - `activeCategory`, `setActiveCategory`
  - `showNewItemsIndicator`, `setShowNewItemsIndicator`
  - `showNewSpellCreator`, `setShowNewSpellCreator`
  - `showNewSkillCreator`, `setShowNewSkillCreator`
  - `showNewClassFeatureCreator`, `setShowNewClassFeatureCreator`
  - `showNewRacialTraitCreator`, `setShowNewRacialTraitCreator`
  - `showNewRaceCreator`, `setShowNewRaceCreator`
  - `showNewClassCreator`, `setShowNewClassCreator`
  - `showNewEquipmentCreator`, `setShowNewEquipmentCreator`
  - `showNewAppearanceCreator`, `setShowNewAppearanceCreator`
  - `showClassCreator`, `setShowClassCreator`
  - `showClassConfig`, `setShowClassConfig`
  - `appearanceCreatorCategory`, `setAppearanceCreatorCategory`
  - `editingSpell`, `setEditingSpell`
  - `editingSkill`, `setEditingSkill`
  - `editingEquipment`, `setEditingEquipment`
  - `editingClassFeature`, `setEditingClassFeature`
  - `editingRacialTrait`, `setEditingRacialTrait`
  - `editingRace`, `setEditingRace`
  - `editingClass`, `setEditingClass`
  - `editingAppearanceCategory`, `setEditingAppearanceCategory`
  - `editingAppearanceValue`, `setEditingAppearanceValue`
  - `expandedItems`, `setExpandedItems`
  - `spellLevelFilter`, `setSpellLevelFilter`
  - `spellSchoolFilter`, `setSpellSchoolFilter`
  - `equipmentTypeFilter`, `setEquipmentTypeFilter`
  - `equipmentRarityFilter`, `setEquipmentRarityFilter`
  - `equipmentTagFilter`, `setEquipmentTagFilter`
  - `searchTerm`, `setSearchTerm`
- [ ] Move all handler functions:
  - `handleEditItem()`
  - `handleDeleteItem()`
  - `handleDuplicateItem()`
  - `handleCreateEquipment()`
  - `handleCreateAppearanceOption()`
  - `handleUpdateAppearanceOption()`
  - `handleCreateSkill()`
  - `handleCreateSpell()`
  - `handleCreateClassFeature()`
  - `handleCreateRacialTrait()`
  - `handleCreateRace()`
  - `handleCreateClass()`
  - `getContentType()`
  - `checkIsCustomItem()`
  - `toggleExpanded()`
- [ ] Accept parameters from useDataViewer and useContentCreator
- [ ] Return both states and handlers in a single object

**Hook Return Interface**:
```typescript
interface UseDataViewerEditingReturn {
  // Category state
  activeCategory: DataCategory;
  setActiveCategory: (category: DataCategory) => void;
  
  // Modal visibility states
  showNewSpellCreator: boolean;
  showNewSkillCreator: boolean;
  // ... (all modal states)
  
  // Edit states
  editingSpell: RegisteredSpell | null;
  editingSkill: CustomSkill | null;
  // ... (all edit states)
  
  // Filter states
  spellLevelFilter: number | 'all';
  spellSchoolFilter: string | 'all';
  equipmentTypeFilter: 'weapon' | 'armor' | 'item' | 'all';
  equipmentRarityFilter: string | 'all';
  equipmentTagFilter: string | 'all';
  searchTerm: string;
  
  // Expanded items
  expandedItems: Set<string>;
  toggleExpanded: (id: string) => void;
  
  // Handlers
  handleEditItem: (category: DataCategory, itemName: string) => void;
  handleDeleteItem: (category: DataCategory, itemName: string) => void;
  handleDuplicateItem: (category: DataCategory, itemName: string) => void;
  // ... (all handlers)
}
```

**Estimated lines moved**: ~350 lines (states + handlers)

---

## Phase 4: Refactor Main Component

### Task 4.1: Update DataViewerTab Imports
- [ ] Update imports to use new components
- [ ] Import constants from `./DataViewer/constants`
- [ ] Import utils from `./DataViewer/utils`
- [ ] Import panel components from `./DataViewer/components`
- [ ] Import hook from `./DataViewer/hooks`

### Task 4.2: Simplify DataViewerTab Component
- [ ] Import `useDataViewerEditing` hook and destructure needed values
- [ ] Remove all useState declarations (now in hook)
- [ ] Remove all handler definitions (now in hook)
- [ ] Replace render functions with panel components
- [ ] Keep only:
  - Hook imports and destructuring
  - Panel component composition
  - Modal JSX (ContentCreatorModal instances)
  - Effects tracking (useEffect for changes)

### Task 4.3: Update DataViewer Index
- [ ] Update `src/components/Tabs/DataViewer/index.ts` to export new components

---

## Phase 5: Testing & Verification

### Task 5.1: Verify Functionality
- [ ] Run existing tests
- [ ] Manual testing of all category tabs
- [ ] Verify all modals still work
- [ ] Verify edit/delete/duplicate functionality
- [ ] Verify spawn mode controls

### Task 5.2: Update Tests
- [ ] Update any import paths in existing tests
- [ ] Add new tests for panel components if needed

---

## Expected Results

### Before Refactor
- **DataViewerTab.tsx**: ~3,176 lines

### After Refactor
- **DataViewerTab.tsx**: ~300-400 lines (main orchestration)
- **constants/**: ~100 lines
- **utils/**: ~150 lines
- **hooks/**: ~350 lines (includes state + handlers)
- **components/**: ~1,400 lines (split across 11 files)
- **Total**: Same ~3,176 lines, but distributed across 20+ smaller files

### Benefits
1. **AI-friendly file sizes**: No file over ~250 lines
2. **Better organization**: Clear separation of concerns
3. **Easier maintenance**: Each component handles one category
4. **Reusability**: Constants and utils can be imported anywhere
5. **Testability**: Smaller components are easier to test in isolation

---

## Dependencies

- No external dependencies required
- All changes are internal code reorganization
- Existing tests may need import path updates

---

## Questions/Unknowns

- None identified - this is a straightforward extraction refactor

---

## Implementation Notes

### Shared Props Pattern
All panel components use generics for type safety:

```typescript
// Base props interface
interface BasePanelProps {
  expandedItems: Set<string>;
  toggleExpanded: (id: string) => void;
  onEdit: (category: DataCategory, itemName: string) => void;
  onDelete: (category: DataCategory, itemName: string) => void;
  onDuplicate: (category: DataCategory, itemName: string) => void;
  checkIsCustomItem: (category: DataCategory, itemName: string) => boolean;
}

// Generic panel props
interface PanelProps extends BasePanelProps {
  data: T[];
}

// Example usage in SpellsPanel:
interface SpellsPanelProps extends BasePanelProps {
  spells: RegisteredSpell[];
  spellLevelFilter: number | 'all';
  spellSchoolFilter: string | 'all';
}

// Example usage in SkillsPanel:
interface SkillsPanelProps extends BasePanelProps {
  skills: CustomSkill[];
  groupSkillsByAbility: (skills: CustomSkill[]) => Record<string, CustomSkill[]>;
}
```

This approach provides full type safety while keeping the shared base consistent.

### Import Examples
After refactor, imports in DataViewerTab.tsx will look like:
```typescript
import { SCHOOL_COLORS, RARITY_COLORS, ABILITY_COLORS, CATEGORY_CONFIG } from './DataViewer/constants';
import { formatLevel, formatRarity, formatAbilityBonus } from './DataViewer/utils';
import { useDataViewerEditing } from './DataViewer/hooks/useDataViewerEditing';
import {
  CategorySelector,
  SpellFilters,
  EquipmentFilters,
  SpellsPanel,
  SkillsPanel,
  ClassFeaturesPanel,
  RacialTraitsPanel,
  RacesPanel,
  ClassesPanel,
  EquipmentPanel,
  AppearancePanel
} from './DataViewer/components';
```

---

## Risk Assessment

**Risk Level**: LOW

This is a pure refactoring with:
- No functionality changes
- No API changes
- No dependency changes
- Just code movement between files

The main risk is introducing import errors, which are easily caught at compile time.
