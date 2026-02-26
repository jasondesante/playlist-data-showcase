# DataViewerTab Custom Content Creation Upgrade

## Overview

Upgrade the DataViewerTab to support creating, editing, and managing ALL custom content types managed by the ExtensionManager, with spawn mode controls that filter what appears in the lists based on the current spawn mode setting.

**Key Goals:**
- Add creation UI for all ExtensionManager categories
- Equipment section must have SAME features as ItemsTab (shared component)
- Lists must filter based on spawn mode (absolute = only custom items)
- Full control of spawn weights and ability to reset lists to defaults
- Clean, professional UI consistent with existing patterns

---

## Phase 1: Foundation & Infrastructure

### 1.1 Core Hooks
- [x] Create `src/hooks/useSpawnMode.ts`
  - [x] `getMode(category)` - Get current spawn mode
  - [x] `setMode(category, mode)` - Set spawn mode (relative/absolute/default/replace)
  - [x] `getWeights(category)` - Get spawn weights
  - [x] `setWeight(category, itemName, weight)` - Set individual weight
  - [x] `resetCategory(category)` - Reset to defaults
  - [x] `resetAll()` - Reset all categories
  - [x] `hasCustomData(category)` - Check for custom content

- [x] Create `src/hooks/useContentCreator.ts`
  - [x] Generic content creation with validation
  - [x] Integration with ExtensionManager.register()
  - [x] Error handling and success callbacks
  - [x] Support for all category types

### 1.2 State Management
- [x] Update `src/store/dataViewerStore.ts`
  - [x] Add spawn mode state per category
  - [x] Track which categories have custom content
  - [x] Add custom content counts

### 1.3 Validation Utilities
- [x] Create `src/utils/contentValidation.ts`
  - [x] Structure validation (required fields, correct types)
  - [x] Reference validation (trait IDs, spell names, class names exist)
  - [x] Business rule validation (e.g., exactly 2 saving throws, valid hit die)
  - [x] Per-category validation functions
  - [x] Clear error messages for validation failures

### 1.4 Spawn Mode Controls Component
- [x] Create `src/components/Tabs/DataViewer/SpawnModeControls.tsx`
  - [x] Mode selector buttons (Relative/Absolute/Default/Replace)
  - [x] Current mode indicator badge
  - [x] Reset button for current category
  - [x] Reset All button
  - [x] Weight editor (expandable advanced section)
  - [x] Import/Export buttons:
    - [x] Export All button (master JSON with all custom content)
    - [x] Export Category button (per-category JSON)
    - [x] Import button with file picker
    - [x] Import validation and error handling
- [x] Create `src/components/Tabs/DataViewer/SpawnModeControls.css`

### 1.5 Custom Content Badge & Actions
- [x] Create `src/components/Tabs/DataViewer/CustomContentBadge.tsx`
  - [x] Visual indicator for custom items
  - [x] Show "Custom" label
  - [x] Edit button (opens form modal with pre-populated data)
  - [x] Delete button (with confirmation dialog)
  - [x] Duplicate button (creates copy of custom item)

### 1.6 Confirmation Dialog Component
- [x] Create `src/components/ui/ConfirmDialog.tsx`
  - [x] Reusable confirmation modal
  - [x] Title, message, and action button text customization
  - [x] Destructive action styling (red button for delete/reset)
  - [x] Used for: delete item, reset category, reset all, import overwrite

---

## Phase 2: Spawn Mode Filtering

### 2.1 Extend useDataViewer Hook
- [x] Update `src/hooks/useDataViewer.ts`
  - [x] Add `getCustomItems(category)` - Get only custom items
  - [x] Add `getDefaultItems(category)` - Get only default items
  - [x] Add `getFilteredItems(category)` - Filter based on spawn mode
  - [x] Integrate with useSpawnMode hook

### 2.2 Update DataViewerTab Lists
- [x] Update `src/components/Tabs/DataViewerTab.tsx`
  - [x] Each category list respects spawn mode
  - [x] When mode is "absolute", only show custom items
  - [x] Add CustomContentBadge to custom items
  - [x] Add edit/delete buttons for custom items
  - [x] Add SpawnModeControls component to each category section

---

## Phase 3: Equipment Creation (Shared Component)

### 3.1 Extract EquipmentCreatorForm from ItemsTab
- [x] Create `src/components/shared/EquipmentCreatorForm.tsx`
  - [x] Extract form logic from ItemsTab.tsx (~lines 2105-2400)
  - [x] Include all existing fields:
    - name, type, rarity, weight, quantity
    - damageDice, damageType (weapons)
    - acBonus (armor)
    - autoEquip option
  - [x] Include advanced options:
    - properties array
    - grantsFeatures
    - grantsSkills
    - grantsSpells
    - tags
    - spawnWeight
- [x] Create `src/components/shared/EquipmentCreatorForm.css`

### 3.2 Update ItemsTab to Use Shared Form
- [x] Update `src/components/Tabs/ItemsTab.tsx`
  - [x] Import shared EquipmentCreatorForm
  - [x] Replace inline creator with shared component
  - [x] Maintain all existing functionality

### 3.3 Add Equipment Creation to DataViewerTab
- [x] Update `src/components/Tabs/DataViewerTab.tsx`
  - [x] Add "Create Equipment" button in equipment section header
  - [x] Wire up shared EquipmentCreatorForm
  - [x] Add SpawnModeControls below equipment list
  - [x] Connect to useContentCreator hook

---

## Phase 4: Simple Content Types

### 4.1 Appearance Options Creator
- [x] Create `src/components/Tabs/DataViewer/forms/AppearanceOptionCreator.tsx`
  - [x] Support all appearance categories:
    - `appearance.bodyTypes` - text input
    - `appearance.skinTones` - color picker (#RRGGBB)
    - `appearance.hairColors` - color picker
    - `appearance.hairStyles` - text input
    - `appearance.eyeColors` - color picker
    - `appearance.facialFeatures` - text input
  - [x] Category selector dropdown
  - [x] Dynamic form based on category type
  - [x] Validation for color format

### 4.2 Skill Creator
- [x] Create `src/components/Tabs/DataViewer/forms/SkillCreatorForm.tsx`
  - [x] Fields:
    - id (text, lowercase_with_underscores)
    - name (text, required)
    - ability (select: STR/DEX/CON/INT/WIS/CHA)
    - description (textarea, optional)
    - categories (multi-select, optional)
    - armorPenalty (checkbox, optional)
  - [x] Support for ability-specific skills (`skills.{ability}`)

### 4.3 Add to DataViewerTab
- [x] Update DataViewerTab for appearance section
  - [x] Add "Add" button per appearance category
  - [x] Inline form or modal for adding options
- [x] Update DataViewerTab for skills section
  - [x] Add "Create Skill" button
  - [x] Modal with SkillCreatorForm

---

## Phase 5: Medium Complexity Content Types

### 5.1 Spell Creator
- [x] Create `src/components/Tabs/DataViewer/forms/SpellCreatorForm.tsx`
  - [x] Fields:
    - name (text, required)
    - level (select 0-9, required) - 0 = cantrip
    - school (select: 8 schools, required)
    - casting_time (text, required, default "1 action")
    - range (text, required)
    - components (multi-select: V/S/M)
    - duration (text, required)
    - description (textarea, required)
  - [x] Class assignment:
    - All classes (`spells`)
    - Specific class (`spells.{className}`)
  - [x] Multi-select for class availability

### 5.2 Class Feature Creator
- [x] Create `src/components/Tabs/DataViewer/forms/ClassFeatureCreatorForm.tsx`
  - [x] Fields:
    - id (text, auto-generated from name)
    - name (text, required)
    - class (select from existing + custom classes)
    - level (number, default 1)
    - type (select: passive/active/reaction)
    - description (textarea, required)
    - effects (complex array - use effects builder pattern)
    - prerequisites (optional)
  - [x] Support for class-specific features (`classFeatures.{className}`)

### 5.3 Racial Trait Creator
- [x] Create `src/components/Tabs/DataViewer/forms/RacialTraitCreatorForm.tsx`
  - [x] Fields:
    - id (text)
    - name (text, required)
    - race (select from existing + custom races)
    - subrace (optional select/text - for subrace-specific traits)
    - description (textarea, required)
    - effects (complex array)
    - prerequisites (optional, can include subrace requirement)
  - [x] Support for race-specific traits (`racialTraits.{raceName}`)

### 5.4 Add to DataViewerTab
- [x] Add "Create Spell" button to spells section
- [x] Add "Create Feature" button to class features section
- [x] Add "Create Trait" button to racial traits section
- [ ] All use modal pattern with ContentCreatorModal

---

## Phase 6: Complex Content Types

### 6.1 Race Creator Modal
- [ ] Create `src/components/Tabs/DataViewer/forms/RaceCreatorForm.tsx`
  - [ ] Basic info section:
    - name (text, required)
    - description (textarea, optional)
    - speed (number, default 30)
  - [ ] Ability bonuses section:
    - STR/DEX/CON/INT/WIS/CHA inputs (numbers 0-4)
    - Visual display of total bonus points
  - [ ] Traits section:
    - Multi-select from existing traits
    - Option to create new trait inline
  - [ ] Subraces section (expandable):
    - Subrace names (text array)
    - Per-subrace ability bonuses
    - Per-subrace traits
  - [ ] Registers to both `races` and `races.data`

### 6.2 Class Creator Modal
- [ ] Create `src/components/Tabs/DataViewer/forms/ClassCreatorForm.tsx`
  - [ ] Basic info section:
    - name (text, required)
    - description (textarea, optional)
    - baseClass (select - for template inheritance, optional)
  - [ ] Core stats section:
    - hit_die (select: 6/8/10/12)
    - primary_ability (select: STR/DEX/CON/INT/WIS/CHA)
    - saving_throws (multi-select, 2 required)
  - [ ] Skills section:
    - skill_count (number, default 2)
    - available_skills (multi-select from all skills)
    - has_expertise (checkbox)
    - expertise_count (number, if expertise enabled)
  - [ ] Spellcasting section:
    - is_spellcaster (checkbox)
    - Spell list configuration (if spellcaster)
  - [ ] Audio Preferences section (expandable):
    - primary (select: bass/treble/mid/amplitude/chaos)
    - secondary (optional select)
    - tertiary (optional select)
    - Individual weight sliders (bass, treble, mid, amplitude)
  - [ ] Registers to both `classes` and `classes.data`

### 6.3 Class Configuration Forms
- [ ] Create `src/components/Tabs/DataViewer/forms/ClassConfigForm.tsx`
  - [ ] Tabbed interface for class configuration:
    - **Skill Lists** (`skillLists.{className}`):
      - Class selector
      - Multi-select of available skills
      - Weight per skill (for spawn control)
    - **Spell Lists** (`classSpellLists.{className}`):
      - Class selector
      - Cantrips multi-select
      - Spells by level (1-9) multi-selects
    - **Spell Slots** (`classSpellSlots`):
      - Class selector
      - Table editor for slot progression (levels 1-20)
    - **Starting Equipment** (`classStartingEquipment.{className}`):
      - Class selector
      - Weapons array
      - Armor array
      - Items array

### 6.4 Add to DataViewerTab
- [ ] Add "Create Race" button to races section
- [ ] Add "Create Class" button to classes section
- [ ] Add "Configure Class" button for existing classes
- [ ] All use modal pattern

---

## Phase 7: Content Creator Modal

### 7.1 Generic Modal Wrapper
- [ ] Create `src/components/modals/ContentCreatorModal.tsx`
  - [ ] Pattern from EnchantmentModal.tsx:
    - Full-screen overlay with backdrop blur
    - Slide-in animation
    - Close on backdrop click and Escape key
  - [ ] Generic props:
    - title
    - category type
    - Form component to render
    - onSubmit handler
    - initialData (for editing)
  - [ ] Form validation display
  - [ ] Create/Cancel buttons with loading states
  - [ ] Success feedback (toast or inline message)

---

## Phase 8: Polish & Testing

### 8.1 UI Polish
- [ ] Consistent styling across all forms
- [ ] Loading states for all async operations
- [ ] Error handling with user-friendly messages
- [ ] Success feedback (toast notifications)
- [ ] Responsive design for all new components
- [ ] Keyboard navigation support
- [ ] Accessibility (ARIA labels, focus management)

### 8.2 Integration Testing
- [ ] Equipment creation in DataViewerTab appears in ItemsTab
- [ ] Spawn mode "absolute" filters to custom only
- [ ] Spawn mode reset returns all default items
- [ ] Custom class with audio_preferences works with ClassSuggester
- [ ] Custom race with subraces generates characters correctly
- [ ] Class-specific spells appear only for that class

### 8.3 Documentation
- [ ] Update EXTENSIBILITY_GUIDE.md with UI instructions
- [ ] Add JSDoc comments to all new components
- [ ] Add JSDoc comments to all new hooks

---

## File Structure

```
src/
├── components/
│   ├── shared/
│   │   ├── EquipmentCreatorForm.tsx    # Extracted from ItemsTab
│   │   └── EquipmentCreatorForm.css
│   ├── Tabs/
│   │   └── DataViewer/
│   │       ├── SpawnModeControls.tsx
│   │       ├── SpawnModeControls.css
│   │       ├── CustomContentBadge.tsx
│   │       └── forms/
│   │           ├── AppearanceOptionCreator.tsx
│   │           ├── SkillCreatorForm.tsx
│   │           ├── SpellCreatorForm.tsx
│   │           ├── ClassFeatureCreatorForm.tsx
│   │           ├── RacialTraitCreatorForm.tsx
│   │           ├── RaceCreatorForm.tsx
│   │           ├── ClassCreatorForm.tsx
│   │           └── ClassConfigForm.tsx
│   ├── modals/
│   │   └── ContentCreatorModal.tsx
│   └── ui/
│       └── ConfirmDialog.tsx           # New: Reusable confirmation dialog
├── hooks/
│   ├── useSpawnMode.ts                 # New
│   ├── useContentCreator.ts            # New
│   ├── useDataViewer.ts                # Extended
│   └── useItemCreator.ts               # Reference pattern
├── utils/
│   └── contentValidation.ts            # New: Validation utilities
├── store/
│   └── dataViewerStore.ts              # Extended
└── components/Tabs/
    ├── DataViewerTab.tsx               # Modified
    ├── DataViewerTab.css               # Modified
    └── ItemsTab.tsx                    # Use shared form
```

---

## ExtensionManager Categories Reference

| Category | Description | Form Type | Complexity |
|----------|-------------|-----------|------------|
| `equipment` | Weapons, armor, items | Shared form | Full (ItemsTab parity) |
| `equipment.templates` | Pre-built item templates | Shared form | Full |
| `appearance.bodyTypes` | Body shapes | Inline | Simple (1 field) |
| `appearance.skinTones` | Skin colors | Inline | Simple (color) |
| `appearance.hairColors` | Hair colors | Inline | Simple (color) |
| `appearance.hairStyles` | Hair styles | Inline | Simple (1 field) |
| `appearance.eyeColors` | Eye colors | Inline | Simple (color) |
| `appearance.facialFeatures` | Facial features | Inline | Simple (1 field) |
| `spells` | All-class spells | Modal | Medium (8 fields) |
| `spells.{className}` | Class-specific spells | Modal | Medium |
| `skills` | All skills | Inline | Simple (4 fields) |
| `skills.{ability}` | Ability-specific skills | Inline | Simple |
| `classFeatures` | All class features | Modal | Medium (6+ fields) |
| `classFeatures.{className}` | Class-specific features | Modal | Medium |
| `racialTraits` | All racial traits | Modal | Medium (6+ fields) |
| `racialTraits.{raceName}` | Race-specific traits | Modal | Medium |
| `races` | Race names | Modal | Complex |
| `races.data` | Race data (bonuses, etc.) | Modal | Complex |
| `classes` | Class names | Modal | Complex |
| `classes.data` | Class data (all stats) | Modal | Complex (audio prefs) |
| `skillLists` | All skill lists | Inline | Medium |
| `skillLists.{className}` | Class skill lists | Inline | Medium |
| `classSpellLists` | All spell lists | Modal | Medium |
| `classSpellLists.{className}` | Class spell lists | Modal | Medium |
| `classSpellSlots` | Slot progressions | Modal | Medium (table) |
| `classStartingEquipment` | All starting equipment | Modal | Medium |
| `classStartingEquipment.{className}` | Class equipment | Modal | Medium |

---

## Spawn Mode Behavior

| Mode | Behavior | List Display |
|------|----------|--------------|
| `relative` | Custom items added to default pool with weights | All items (default + custom) |
| `absolute` | Only custom items can spawn | **Custom items only** |
| `default` | All items have equal weight (1.0) | All items |
| `replace` | Clear previous custom data before registering | Custom items only (after clear) |

---

## Design Decisions (Confirmed)

1. **Priority**: Foundation First - Start with Phase 1-2 (hooks, spawn mode controls, filtering) before content creation forms
2. **Weight Editor UI**: Advanced settings - Weights hidden behind 'Advanced' expandable section in SpawnModeControls
3. **Edit Support**: Full edit support - All custom content can be fully edited after creation
4. **Import/Export**: Essential - Support both options: master "Export All" button plus per-category import/export
5. **UI Layout**: Current layout + additions - Keep existing category tabs (Spells, Skills, Classes...) but add "Create" button and SpawnModeControls to each section
6. **Validation Level**: Full validation - Validate structure, references (trait IDs, spell names), AND business rules (e.g., exactly 2 saving throws per class)

---

## Dependencies

- Existing `useItemCreator.ts` pattern for validation/creation logic
- Existing `EnchantmentModal.tsx` pattern for modal UI
- ExtensionManager API from `playlist-data-engine`
- Zustand store pattern from `dataViewerStore.ts`

---

## Critical Files to Reference

- `src/components/Tabs/DataViewerTab.tsx` - Main component to extend
- `src/components/Tabs/ItemsTab.tsx` - Item creator pattern to extract
- `src/hooks/useDataViewer.ts` - Data fetching hook to extend
- `src/hooks/useItemCreator.ts` - Creation pattern to follow
- `src/components/modals/EnchantmentModal.tsx` - Modal pattern to follow
- `src/store/dataViewerStore.ts` - State management to extend
- `docs/engine/docs/EXTENSIBILITY_GUIDE.md` - ExtensionManager API reference
- `docs/engine/docs/CUSTOM_CONTENT.md` - Custom content structures
