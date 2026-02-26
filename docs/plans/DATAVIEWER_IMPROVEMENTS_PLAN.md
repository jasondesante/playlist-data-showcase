# DataViewerTab & Custom Content Improvements Plan

## Overview

This plan addresses multiple improvements to the DataViewerTab and custom content creation features, including new engine features (images, box type), UI consistency (modals), structured input improvements, bug fixes, and UI/UX polish.

**Recommended Implementation Order:**
1. Phase 1: Research & Verification (required first)
2. Phase 2: Image Support (HIGH PRIORITY - do before modals)
3. Phase 3: Box Type (can parallel with Phase 2)
4. Phase 4: Modal Conversion (after images)
5. Phase 5: Structured Inputs (after modals for consistency)
6. Phase 6: Bug Fixes (can start anytime)
7. Phase 7: UI/UX Polish (after core features done)
8. Phase 8: Testing & Documentation

---

## Phase 1: Research & Verification

### 1.1 Verify Image Support Implementation ✅ DONE
- [x] Read `docs/engine/DATA_ENGINE_REFERENCE.md` (lines 3813-3899)
  - [x] Confirm `icon` and `image` fields work for all content types: **YES** - spells, skills, classFeatures, racialTraits, equipment, races.data, classes.data
  - [x] Verify URL validation (http://, https://, /, assets/): **CONFIRMED** - only these 4 prefixes are valid
  - [x] Test batch functions: `batchAddIcons()`, `batchAddImages()`, `batchUpdateImages()`, `batchByCategory()`: **ALL EXIST** - all return count of updated items
- [x] Read `docs/engine/docs/EXTENSIBILITY_GUIDE.md` (lines 733-806)
  - [x] Review batch image examples: **CONFIRMED** - examples show all 4 batch methods
  - [x] Confirm error handling for invalid URLs: **CONFIRMED** - throws error with message about valid prefixes
- [x] **Research embedded image support (NICE TO HAVE):**
  - [x] Check if data engine accepts base64 encoded images natively: **NO** - only URL prefixes validated
  - [x] Check if there are size limits or validation rules: **URL prefix validation only**
  - [x] Test by manually adding base64 image to a data file: **SKIPPED** - not supported
  - [x] Document max recommended size for embedded images: **N/A** - not supported
  - [x] NOTE: Only implement if engine supports natively - otherwise URL-only is acceptable: **URL-ONLY IS ACCEPTABLE**

### 1.2 Verify Box Type Implementation ✅ DONE
- [x] Read `docs/engine/docs/EQUIPMENT_SYSTEM.md` (lines 427-1012)
  - [x] Confirm `type: 'box'` works correctly: **YES** - containers that hold other items, stored in inventory unopened
  - [x] Verify `BoxContents`, `BoxDrop`, `BoxDropPool` interfaces: **CONFIRMED**
    - `BoxDropPool`: weight (number), itemName (optional), quantity (optional), gold (optional - mutually exclusive with itemName)
    - `BoxDrop`: pool: BoxDropPool[]
    - `BoxContents`: drops: BoxDrop[], consumeOnOpen (boolean, default true), openRequirements (optional)
  - [x] Test BoxOpener API: `openBox()`, `isBox()`, `checkRequirements()`, `canOpen()`, `previewContents()`: **ALL EXIST**
    - `openBox(box, rng, inventory?)`: Opens box, returns BoxOpenResult with items, gold, consumeBox, error, consumedItems
    - `isBox(equipment)`: Returns true if type === 'box' && boxContents !== undefined
    - `checkRequirements(box, inventory)`: Returns null if satisfied, or BoxOpenError with code/message
    - `canOpen(box, inventory)`: Simple boolean check for UI
    - `previewContents(box)`: Returns possibleItems, possibleGold {min,max}, totalDrops, openRequirements
    - `getRequirementsDescription(box)`: Human-readable string like "Requires: Iron Key"
- [x] Read `docs/engine/DATA_ENGINE_REFERENCE.md` (lines 3269-3308)
  - [x] Verify box type in equipment documentation: **CONFIRMED** - all methods and interfaces documented with examples

### 1.3 Research Effects & Prerequisites Options ✅ DONE
- [x] Read `docs/engine/docs/PREREQUISITES.md`
  - [x] Document all valid prerequisite types (level, abilities, class, race, subrace, features, skills, spells, custom): **CONFIRMED** - All 9 types documented
  - [x] Document all valid prerequisite values per type: **CONFIRMED** - See reference table below
  - [x] **List all data sources for dynamic dropdowns** (which registry keys to use): **CONFIRMED** - See reference table below
- [x] Read `docs/engine/DATA_ENGINE_REFERENCE.md` (lines 3920-3927)
  - [x] Document all 6 effect types: stat_bonus, skill_proficiency, ability_unlock, passive_modifier, resource_grant, spell_slot_bonus: **CONFIRMED**
  - [x] Document valid targets per effect type: **CONFIRMED** - See reference table below
  - [x] Document value formats per effect type: **CONFIRMED** - See reference table below
  - [x] **Create reference table for UI dropdown options per effect type**: **CONFIRMED** - See reference table below
- [x] Read through existing data files to catalog all possible values
  - [x] List all resources used by classes (rage, ki, sorcery points, etc.): **FOUND** - Resources defined in class features via `resource_grant` effects
  - [x] List all passive modifier targets (ac, speed, damage, etc.): **CONFIRMED** - See reference table below
  - [x] List all ability unlock options (darkvision, flight, etc.): **CONFIRMED** - See reference table below

#### Prerequisite Types Reference Table

| Prerequisite Type | Valid Values | Data Source for Dropdown | Notes |
|------------------|--------------|--------------------------|-------|
| `level` | number (1-20) | Static | Character level requirement |
| `abilities` | `Partial<Record<Ability, number>>` | Static: STR, DEX, CON, INT, WIS, CHA | Minimum ability scores |
| `class` | Class type | `manager.get('classes')` + `manager.get('classes.data')` | Specific class required |
| `race` | Race type | `manager.get('races')` + `manager.get('races.data')` | Specific race required |
| `subrace` | string | `manager.get('races.data')` → item.subraces[] | Dynamic based on selected race |
| `features` | string[] (feature IDs) | `manager.get('classFeatures')` + `manager.get('racialTraits')` | Features that must be learned |
| `skills` | string[] (skill IDs) | `manager.get('skills')` | Skills that must be proficient |
| `spells` | string[] (spell names) | `manager.get('spells')` | Spells that must be known |
| `custom` | string | N/A (free text) | Display only, not validated |

#### Effect Types Reference Table

| Effect Type | Target Options | Value Format | Data Source for Target Dropdown |
|-------------|---------------|--------------|--------------------------------|
| `stat_bonus` | STR, DEX, CON, INT, WIS, CHA | number (bonus amount) | Static - 6 abilities |
| `skill_proficiency` | skill IDs | string (skill ID) or 'expertise' | `manager.get('skills')` - LIVE from registry |
| `ability_unlock` | ability identifiers | boolean, string, or number | See ability unlock options below |
| `passive_modifier` | modifier targets | number (bonus amount) | See passive modifier targets below |
| `resource_grant` | resource identifiers | number (resource count/amount) | Derived from `manager.get('classFeatures')` where features have `type: 'resource'` |
| `spell_slot_bonus` | slot level (1-9) | number (extra slots) | Static - spell levels 1-9 |

#### Ability Unlock Options (for `ability_unlock` effect)

| Target | Value Type | Description |
|--------|------------|-------------|
| `darkvision` | boolean | See in darkness |
| `flight` | boolean | Ability to fly |
| `fire_resistance` | boolean | Resistance to fire damage |
| `damage_resistance` | string (element type) | Resistance to specified element |
| `telepathy` | boolean | Mental communication |
| `immunity` (poison, psychic, etc.) | boolean | Immunity to condition/damage |
| `mage_armor` | boolean | Magical armor bonus |
| `snow_movement` | boolean | No penalty in snow/ice |
| `elemental_magic` | boolean | Attuned to element |
| `long_jump` | boolean | Enhanced jumping |
| `sleep_immunity` | boolean | Immunity to sleep |
| Custom | any | Any custom ability identifier |

#### Passive Modifier Targets (for `passive_modifier` effect)

| Target | Value Type | Description |
|--------|------------|-------------|
| `ac` | number | Armor Class bonus |
| `speed` | number | Movement speed bonus (feet) |
| `initiative` | number | Initiative bonus |
| `attack_roll` | number | Attack roll bonus |
| `damage_roll` | number | Damage roll bonus |
| `saving_throws` | number | Saving throw bonus |
| `spell_save_dc` | number | Spell save DC bonus |
| `spell_strike_damage` | number | Spell strike damage bonus |
| `fire_resistance` | boolean | Fire resistance flag |
| `cold_resistance` | boolean | Cold resistance flag |
| `survival_cold_bonus` | number | Bonus to cold survival |
| Custom | number/string | Any custom modifier target |

#### Class Resources (examples from documentation)

Resources are defined in class features via `type: 'resource'` and granted via `resource_grant` effects:
- **Barbarian**: Rage (counts/rounds)
- **Monk**: Ki points
- **Sorcerer**: Sorcery points
- **Bard**: Bardic Inspiration
- **Paladin**: Lay on Hands, Channel Divinity
- **Cleric**: Channel Divinity
- **Druid**: Wild Shape

**Note**: Resources are not stored in a central registry but defined per-class via features. UI should extract unique resource identifiers from all class features in `manager.get('classFeatures')` where `type === 'resource'`.

#### ExtensionManager Registry Keys for Dynamic Dropdowns

| Dropdown Purpose | Registry Key | Example Usage |
|-----------------|--------------|---------------|
| Classes | `manager.get('classes')` | Returns Class[] array |
| Class Data | `manager.get('classes.data')` | Returns ClassDataEntry[] |
| Races | `manager.get('races')` | Returns Race[] array |
| Race Data | `manager.get('races.data')` | Returns RaceDataEntry[] with subraces |
| Skills | `manager.get('skills')` | Returns CustomSkill[] array |
| Spells | `manager.get('spells')` | Returns Spell[] array |
| Class Features | `manager.get('classFeatures')` | Returns ClassFeature[] array |
| Racial Traits | `manager.get('racialTraits')` | Returns RacialTrait[] array |
| Equipment | `manager.get('equipment')` | Returns EnhancedEquipment[] array |

---

## Phase 2: New Features - Image Support

**Priority: HIGH - Implement before modals (Phase 4)**

### 2.1 Add Image Fields to All Creator Forms
- [x] Create shared `ImageFieldInput` component ✅ DONE
  - [x] URL input field with validation
  - [x] Preview thumbnail
  - [x] **URL/path mode ONLY** (base64/embedded mode NOT supported by engine - confirmed in Task 1.1)
  - [x] Note: "Images are not uploaded to internet - provide URL or relative path"
  - [x] Valid URL prefixes hint: `http://`, `https://`, `/`, `assets/`
- [x] ~~Research: Check if data engine supports embedded images (base64) natively~~ **DONE - NOT SUPPORTED**
- [x] Add `icon` and `image` fields to EquipmentCreatorForm ✅ DONE
- [x] Add `icon` and `image` fields to SpellCreatorForm ✅ DONE
- [x] Add `icon` and `image` fields to SkillCreatorForm ✅ DONE
- [x] Add `icon` and `image` fields to ClassFeatureCreatorForm ✅ DONE
- [x] Add `icon` and `image` fields to RacialTraitCreatorForm ✅ DONE
- [x] Add `icon` and `image` fields to RaceCreatorForm (race data) ✅ DONE
- [x] Add `icon` and `image` fields to ClassCreatorForm (class data) ✅ DONE

### 2.2 Add Batch Image Tools to SpawnModeControls ✅ DONE
- [x] Add "Batch Add Images" expandable section
  - [x] Category selector (spells, equipment, races, classes, etc.)
  - [x] Property selector (for batchByCategory: school, rarity, etc.)
  - [x] Icon URL input (apply to all matching)
  - [x] Image URL input (apply to all matching)
  - [x] Preview affected items count
  - [x] Apply button with confirmation

---

## Phase 3: New Features - Box Equipment Type

### 3.1 Update EquipmentCreatorForm for Box Type
- [ ] Add 'box' to equipment type selector
- [ ] Create BoxContentsBuilder component
  - [ ] Drops array editor (add/remove drops)
  - [ ] Per-drop pool editor:
    - [ ] Add/remove pool entries
    - [ ] Each entry: weight (number), itemName OR gold (mutually exclusive), quantity (optional)
    - [ ] Item name autocomplete from equipment registry
    - [ ] Gold option toggle
  - [ ] Weights should sum to 100 indicator
  - [ ] Probability preview (show % for each pool entry)
- [ ] Add Opening Requirements section (optional)
  - [ ] Required item selector (from equipment registry)
  - [ ] Quantity input
- [ ] Add `consumeOnOpen` toggle (default: true)
- [ ] Show preview of possible contents using `BoxOpener.previewContents()`

### 3.2 Update Validation for Box Type
- [ ] Update `contentValidation.ts` to validate box contents
  - [ ] At least one drop required
  - [ ] Each pool entry must have weight > 0
  - [ ] Each pool entry must have itemName OR gold (not both, not neither)
  - [ ] Referenced items must exist in registry (warning only)
- [ ] Update useItemCreator hook to handle box type

---

## Phase 4: UI Consistency - Modal Conversion

### 4.1 Convert SkillCreatorForm to Modal
- [ ] Update DataViewerTab.tsx
  - [ ] Add `showSkillCreatorModal` state
  - [ ] Change "Create Skill" button to open modal
  - [ ] Wrap SkillCreatorForm in ContentCreatorModal
- [ ] Ensure modal has same styling as other creator modals
- [ ] Test creation flow end-to-end

### 4.2 Convert EquipmentCreatorForm to Modal
- [ ] Update DataViewerTab.tsx
  - [ ] Add `showEquipmentCreatorModal` state
  - [ ] Change "Create Equipment" button to open modal
  - [ ] Create EquipmentCreatorModal wrapper or use ContentCreatorModal
- [ ] Ensure modal has same styling as other creator modals
- [ ] Handle advanced options section within modal
- [ ] Test creation flow end-to-end

### 4.3 Update ItemsTab to Use Modal
- [ ] Verify ItemsTab equipment creator still works
- [ ] Ensure consistent modal behavior across both tabs
- [ ] May need to pass modal control props to shared form

---

## Phase 5: Structured Input Improvements

### 5.1 Spell Fields - Structured Choices
- [ ] Create `CastingTimeSelect` component
  - [ ] Dropdown with common values: "1 action", "1 bonus action", "1 reaction", "1 minute", "10 minutes", "1 hour"
  - [ ] "Custom..." option that reveals text input
- [ ] Create `RangeSelect` component
  - [ ] Dropdown with common values: "Touch", "Self", "5 feet", "10 feet", "30 feet", "60 feet", "90 feet", "120 feet", "150 feet", "300 feet", "1 mile"
  - [ ] "Custom..." option that reveals text input
- [ ] Create `DurationSelect` component
  - [ ] Dropdown with common values: "Instantaneous", "1 round", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "Until dispelled", "Concentration, up to 1 minute"
  - [ ] "Custom..." option that reveals text input
- [ ] Update SpellCreatorForm to use new components

### 5.2 Create Shared EffectsBuilder Component
- [ ] Create `src/components/shared/EffectsBuilder.tsx`
  - [ ] Type dropdown with 6 options:
    - `stat_bonus` - Ability score bonus
    - `skill_proficiency` - Grant proficiency/expertise
    - `ability_unlock` - Unlock special ability
    - `passive_modifier` - Constant bonus
    - `resource_grant` - Grant resource pool
    - `spell_slot_bonus` - Extra spell slots
  - [ ] Target field - **FULL DYNAMIC DROPDOWNS from live registry** based on type:
    - `stat_bonus`: STR/DEX/CON/INT/WIS/CHA dropdown (static - 6 abilities)
    - `skill_proficiency`: **LIVE from `manager.get('skills')`** - autocomplete
    - `ability_unlock`: Ability dropdown (darkvision, flight, etc.) - **fetch from available abilities in registry**
    - `passive_modifier`: Target dropdown (ac, speed, damage, etc.) - research all valid targets
    - `resource_grant`: Resource dropdown (rage, ki, etc.) - **LIVE from `manager.get('classes')` class resources**
    - `spell_slot_bonus`: Slot level dropdown (1-9) - static
  - [ ] Value field - dynamic based on type:
    - Number input for bonuses
    - Text input for special values
    - Checkbox for boolean values
  - [ ] Condition field (optional text input)
  - [ ] Add/remove effect buttons
  - [ ] "Custom..." option to enter raw JSON for advanced users
  - [ ] **Real-time validation** - warn if selected target no longer exists in registry
  - [ ] **Refresh button** to reload all dropdown options from live registry
- [ ] Create `EffectsBuilder.css` with clean styling

### 5.3 Create Shared PrerequisitesBuilder Component
- [ ] Create `src/components/shared/PrerequisitesBuilder.tsx`
  - [ ] **ALL dropdowns populated from LIVE registry data (updates as content is created):**
  - [ ] Level prerequisite - number input
  - [ ] Abilities prerequisite - 6 inputs for STR/DEX/CON/INT/WIS/CHA (static)
  - [ ] Class prerequisite - **LIVE from `manager.get('classes')`**
  - [ ] Race prerequisite - **LIVE from `manager.get('races')`**
  - [ ] Subrace prerequisite - **DYNAMIC from selected race's subraces (live data)**
  - [ ] Features prerequisite - **LIVE multi-select from `manager.get('classFeatures')` + `manager.get('racialTraits')`**
  - [ ] Skills prerequisite - **LIVE multi-select from `manager.get('skills')`**
  - [ ] Spells prerequisite - **LIVE multi-select from `manager.get('spells')`**
  - [ ] Custom prerequisite - text input for description
  - [ ] Add/remove prerequisite buttons
  - [ ] "Custom..." option for advanced users
  - [ ] **Refresh button** to reload all dropdown options from registry
- [ ] Create `PrerequisitesBuilder.css` with clean styling

### 5.4 Update Forms to Use Shared Components
- [ ] Update RacialTraitCreatorForm to use EffectsBuilder and PrerequisitesBuilder
- [ ] Update ClassFeatureCreatorForm to use EffectsBuilder and PrerequisitesBuilder
- [ ] Update RaceCreatorForm if it has effects/prerequisites
- [ ] Remove duplicated inline code from all forms

### 5.5 Racial Trait Subrace Dynamic Dropdown
- [ ] Update RacialTraitCreatorForm
  - [ ] When race is selected, fetch subraces from race data
  - [ ] Populate subrace dropdown dynamically
  - [ ] Add "None" option for non-subrace traits
  - [ ] Still allow custom text entry for new subraces
- [ ] Update useDataViewer or create helper to get subraces for race

---

## Phase 6: Bug Fixes - Data Refresh

### 6.1 Fix RaceCreatorForm Traits List
- [ ] Update RaceCreatorForm to fetch traits from ExtensionManager
  - [ ] Remove hardcoded fallback trait list
  - [ ] Use `manager.get('racialTraits')` to get all available traits
  - [ ] Add useEffect to refresh traits when data changes
- [ ] Update DataViewerTab to pass fresh traits data
  - [ ] Pass `availableTraits` prop from live data
  - [ ] Trigger re-render after trait creation

### 6.2 Fix Racial Traits List Refresh
- [ ] Investigate why refresh button doesn't update racial traits list
- [ ] Update useDataViewer hook
  - [ ] Add dependency on custom data changes
  - [ ] Invalidate FeatureQuery cache on refresh
- [ ] Update DataViewerTab refresh handler
  - [ ] Force re-fetch of all category data
  - [ ] Clear memoization caches if needed

### 6.3 General Data Refresh Audit
- [ ] Test refresh button for all categories
- [ ] Verify lists update immediately after creating custom content
- [ ] Ensure no tab switch required to see new data
- [ ] Check ExtensionManager state vs local cache sync

---

## Phase 7: UI/UX Polish

### 7.1 Weight Editor Redesign
- [ ] Redesign SpawnModeControls weight editor
  - [ ] Show item **display name with ID fallback**
    - [ ] Fetch actual items to get names from registry
    - [ ] Map weight keys to item objects
    - [ ] Show name as primary, ID as secondary text/tooltip
    - [ ] Fall back to ID if no name exists
  - [ ] **Group items by category/type** (same grouping as normal lists)
    - [ ] Class features grouped by class
    - [ ] Equipment grouped by type (weapon, armor, etc.)
    - [ ] Spells grouped by school
    - [ ] Races/traits in their natural groupings
  - [ ] Compact row layout:
    - [ ] Item name (left, takes most space)
    - [ ] Weight input (right, narrow ~60px)
    - [ ] Remove one layer of borders (row OR input border, not both)
  - [ ] Use table-like layout for alignment
  - [ ] Add header row: "Item" | "Weight"
  - [ ] Collapsible group headers
- [ ] Update SpawnModeControls.css
  - [ ] Reduce nested border styling
  - [ ] Cleaner input styling within rows
  - [ ] Better spacing and typography
  - [ ] Styling for grouped sections

### 7.2 Class Creator Audio Preferences Clarity
- [ ] Update ClassCreatorForm audio preferences section
  - [ ] Add explanation text at top:
    - "Audio preferences determine when this class is suggested based on music characteristics. Classes with matching audio preferences are more likely to be generated for songs with those traits."
  - [ ] Add tooltips for each field:
    - `primary`: "The main audio trait this class responds to"
    - `secondary`: "Secondary trait (less weight than primary)"
    - `tertiary`: "Tertiary trait (least weight)"
    - Individual weights: "Override weight for specific frequency range"
  - [ ] Add example: "Barbarian prefers bass-heavy music, Bard prefers treble"
  - [ ] Consider renaming section to "Music-Based Class Suggestions"

### 7.3 Equipment Creator Advanced Options Restructure
- [ ] Redesign EquipmentCreatorForm advanced options
  - [ ] Keep educational text but make it collapsible
  - [ ] Add actual UI inputs for each advanced property:
    - [ ] **Properties** - Multi-select with common options:
      - stat_bonus (with ability + value)
      - skill_proficiency (with skill name)
      - damage_bonus (with value)
      - ac_bonus (with value)
      - etc.
    - [ ] **Grants Features** - Multi-select from available features + custom ID input
    - [ ] **Grants Skills** - Multi-select from available skills + proficiency level
    - [ ] **Grants Spells** - Multi-select from available spells + uses/recharge
    - [ ] **Tags** - Tag input with suggestions (magic, rare, cursed, consumable, etc.)
    - [ ] **Spawn Weight** - Number input with explanation
  - [ ] Use accordions or tabs within advanced section
  - [ ] Add validation and previews

---

## Phase 8: Testing & Documentation

### 8.1 Integration Testing
- [ ] Test image fields in all creator forms
- [ ] Test box type creation and opening
- [ ] Test modal flows for skills and equipment
- [ ] Test structured dropdowns with custom options
- [ ] Test effects/prerequisites builders
- [ ] Test dynamic subrace dropdown
- [ ] Test data refresh for all categories
- [ ] Test weight editor with real item names

### 8.2 Update Documentation
- [ ] Update DATAVIEWER_CUSTOM_CONTENT_PLAN.md with completion status
- [ ] Document new shared components in code comments
- [ ] Update EXTENSIBILITY_GUIDE.md UI section with new features
- [ ] Add JSDoc to new components

---

## File Structure

```
src/
├── components/
│   ├── shared/
│   │   ├── ImageFieldInput.tsx           # New: Image URL input with preview
│   │   ├── ImageFieldInput.css
│   │   ├── EffectsBuilder.tsx            # New: Shared effects component
│   │   ├── EffectsBuilder.css
│   │   ├── PrerequisitesBuilder.tsx      # New: Shared prerequisites component
│   │   ├── PrerequisitesBuilder.css
│   │   ├── BoxContentsBuilder.tsx        # New: Box drops editor
│   │   ├── BoxContentsBuilder.css
│   │   ├── CastingTimeSelect.tsx         # New: Structured casting time
│   │   ├── RangeSelect.tsx               # New: Structured range
│   │   ├── DurationSelect.tsx            # New: Structured duration
│   │   ├── EquipmentCreatorForm.tsx      # Modified: Box type, images, advanced UI
│   │   └── EquipmentCreatorForm.css
│   ├── Tabs/
│   │   └── DataViewer/
│   │       ├── SpawnModeControls.tsx     # Modified: Weight editor, batch images
│   │       ├── SpawnModeControls.css
│   │       └── forms/
│   │           ├── SkillCreatorForm.tsx  # Modified: Modal, images
│   │           ├── SpellCreatorForm.tsx  # Modified: Structured fields, images
│   │           ├── RaceCreatorForm.tsx   # Modified: Dynamic traits, images
│   │           ├── RacialTraitCreatorForm.tsx  # Modified: Dynamic subrace, shared components
│   │           ├── ClassFeatureCreatorForm.tsx # Modified: Shared components, images
│   │           └── ClassCreatorForm.tsx  # Modified: Audio clarity, images
│   └── modals/
│       └── ContentCreatorModal.tsx       # May need updates for new forms
└── hooks/
    └── useDataViewer.ts                  # Modified: Better refresh, subrace helper
```

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `docs/engine/DATA_ENGINE_REFERENCE.md` | Engine API docs (images, batch, effects, box) |
| `docs/engine/docs/EQUIPMENT_SYSTEM.md` | Box type documentation |
| `docs/engine/docs/EXTENSIBILITY_GUIDE.md` | Batch image functions |
| `docs/engine/docs/PREREQUISITES.md` | Prerequisite types reference |
| `src/components/shared/EquipmentCreatorForm.tsx` | Equipment creator (needs box, images, advanced UI) |
| `src/components/Tabs/DataViewer/forms/SkillCreatorForm.tsx` | Skill creator (needs modal) |
| `src/components/Tabs/DataViewer/SpawnModeControls.tsx` | Weight editor (needs redesign) |
| `src/components/Tabs/DataViewer/forms/RacialTraitCreatorForm.tsx` | Needs dynamic subrace |
| `src/components/Tabs/DataViewer/forms/RaceCreatorForm.tsx` | Needs dynamic traits |
| `src/hooks/useDataViewer.ts` | Data refresh fixes |

---

## Design Decisions

1. **Image Storage**: URL/path ONLY (base64/embedded images NOT supported by data engine - confirmed in Task 1.1 research)
   - URL mode: external links or relative paths (PRIMARY, only supported mode)
   - Valid URL prefixes: `http://`, `https://`, `/`, `assets/`
   - ~~Embedded mode: NOT SUPPORTED by engine~~
2. **Structured + Custom**: All dropdowns have "Custom..." option for flexibility
3. **Full Dynamic Dropdowns from Live Registry**: ALL selection dropdowns pull from live registry data (classes, races, skills, spells, features) - updates as content is created
4. **Shared Components**: EffectsBuilder and PrerequisitesBuilder shared across all forms
5. **Modal Consistency**: All creators use modals (skills, equipment now join spells, features, etc.)
6. **Weight Editor**: Show display names with ID fallback, compact layout, reduce nested borders, **group by category/type**
7. **Dynamic Dropdowns**: Subraces update based on selected race, traits list refreshes properly
8. **Implementation Priority**: Images first, then modals, then structured inputs

---

## Dependencies

- ExtensionManager batch image functions (verified in docs)
- BoxOpener API for box type (verified in docs)
- Existing ContentCreatorModal pattern
- useSpawnMode hook for weights
- useDataViewer hook for data refresh

---

## Estimated Complexity

| Phase | Complexity | Key Challenge |
|-------|------------|---------------|
| Phase 1: Research | Low | Documentation reading |
| Phase 2: Images | Medium | Many forms to update |
| Phase 3: Box Type | High | Complex BoxContentsBuilder UI |
| Phase 4: Modals | Medium | Refactoring existing inline forms |
| Phase 5: Structured Inputs | High | EffectsBuilder is complex |
| Phase 6: Bug Fixes | Medium | Cache/state management |
| Phase 7: Polish | Medium | Weight editor redesign |
| Phase 8: Testing | Low | Verify all features |
