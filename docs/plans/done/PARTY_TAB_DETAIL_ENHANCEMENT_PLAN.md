# Party Tab Enhancement Plan: Feature Parity + UI Improvements

## Overview
Enhance the PartyTab component to achieve feature parity with CharacterGenTab for hero detail display, and redesign the Party Overview/Composition sections to be more space-efficient.

## Goals
1. **Feature Parity**: Add click-to-select detail panels for racial traits, class features, equipment, and spells in the hero detail modal
2. **UI Improvement**: Convert Party Overview and Composition from large collapsible sections to compact icon buttons in the header

---

## Phase 1: Setup & State Management ✅

### Task 1.1: Add Selection State Variables ✅
- [x] Add `selectedTraitId` state (string | null)
- [x] Add `selectedFeatureId` state (string | null)
- [x] Add `selectedEquipment` state ({ name: string; type: 'weapon' | 'armor' | 'item' } | null)
- [x] Add `selectedSpellId` state (string | null)

### Task 1.2: Add Selection Handler Functions ✅
- [x] Create `handleSelectTrait(trait: string)` - clears feature, equipment, spell selections
- [x] Create `handleSelectFeature(feature: string)` - clears trait, equipment, spell selections
- [x] Create `handleSelectEquipment(name: string, type: 'weapon' | 'armor' | 'item')` - clears trait, feature, spell selections
- [x] Create `handleSelectSpell(spellName: string)` - clears trait, feature, equipment selections

### Task 1.3: Import Required Components & Utilities ✅
- [x] Import `DetailRow` from `../ui/DetailRow`
- [x] Import `Sword`, `Shield`, `Package`, `Wand2` icons from lucide-react
- [x] Add `RARITY_COLORS`, `RARITY_BG_COLORS`, `RARITY_BORDER_COLORS` constants (copy from CharacterGenTab)
- [x] Add `SPELL_LEVEL_COLORS` constant (copy from CharacterGenTab)
- [x] Add `getEquipmentData` helper function (copy from CharacterGenTab)
- [x] Add `getSpellData` helper function (copy from CharacterGenTab)
- [x] Add `formatRarity` helper function
- [x] Import `cn` utility from `../../utils/cn`

---

## Phase 2: Racial Traits Enhancement ✅

### Task 2.1: Make Traits Clickable with Selection Styling ✅
- [x] Add `onClick={() => handleSelectTrait(trait)}` to trait badges
- [x] Add `role="button"` and `tabIndex={0}` for accessibility
- [x] Add `onKeyDown` handler for Enter/Space keys
- [x] Apply `party-detail-trait-badge-selected` class when selected
- [x] Update CSS for selected trait styling (glow effect)

### Task 2.2: Add Trait DetailRow ✅
- [x] Add DetailRow component below traits grid
- [x] Pass `isVisible={selectedTraitId !== null}`
- [x] Display resolved trait name as title
- [x] Display trait description
- [x] Add "Source" property with character race name
- [x] Display trait effects if available

**Reference**: [CharacterGenTab.tsx:1055-1063](src/components/Tabs/CharacterGenTab.tsx#L1055-L1063)

---

## Phase 3: Class Features Enhancement ✅

### Task 3.1: Make Features Clickable with Selection Styling ✅
- [x] Add `onClick={() => handleSelectFeature(feature)}` to feature badges
- [x] Add `role="button"` and `tabIndex={0}` for accessibility
- [x] Add `onKeyDown` handler for Enter/Space keys
- [x] Apply `party-detail-trait-badge-selected` class when selected

### Task 3.2: Add Feature DetailRow ✅
- [x] Add DetailRow component below features grid
- [x] Pass `isVisible={selectedFeatureId !== null}`
- [x] Display resolved feature name as title
- [x] Display feature description
- [x] Add "Source" property with character class name
- [x] Display feature effects if available

**Reference**: [CharacterGenTab.tsx:1101-1110](src/components/Tabs/CharacterGenTab.tsx#L1101-L1110)

---

## Phase 4: Equipment Enhancement ✅

### Task 4.1: Add Rarity-Based Styling to Equipment ✅
- [x] Get equipment data via `getEquipmentData(item.name)`
- [x] Apply rarity-based background color
- [x] Apply rarity-based border color
- [x] Apply rarity-based text color

### Task 4.2: Make Equipment Items Clickable ✅
- [x] Add `onClick={() => handleSelectEquipment(name, type)}` to weapons, armor, items
- [x] Add `role="button"` and `tabIndex={0}` for accessibility
- [x] Add `onKeyDown` handler for Enter/Space keys
- [x] Apply selection styling with `party-detail-equipment-item-selected` class

### Task 4.3: Add Equipment DetailRow ✅
- [x] Add DetailRow component below equipment section
- [x] Pass `isVisible={selectedEquipment !== null}`
- [x] Display equipment name with type icon (Sword/Shield/Package)
- [x] Display equipment description from database
- [x] Display properties: Rarity, Type, Weight, Damage (weapons), AC Bonus (armor)
- [x] Display equipment effects/properties if available

**Reference**: [CharacterGenTab.tsx:1419-1471](src/components/Tabs/CharacterGenTab.tsx#L1419-L1471)

---

## Phase 5: Spells Enhancement ✅

### Task 5.1: Add Spell Level-Based Styling ✅
- [x] Get spell data via `getSpellData(spellName)`
- [x] Apply level-based background color from `SPELL_LEVEL_COLORS`
- [x] Apply level-based border color
- [x] Apply level-based text color

### Task 5.2: Make Spells Clickable ✅
- [x] Add `onClick={() => handleSelectSpell(spellName)}` to spell badges
- [x] Add `role="button"` and `tabIndex={0}` for accessibility
- [x] Add `onKeyDown` handler for Enter/Space keys
- [x] Apply selection styling with `party-detail-spell-tag-selected` class

### Task 5.3: Add Spell DetailRow ✅
- [x] Add DetailRow component below spells section
- [x] Pass `isVisible={selectedSpellId !== null}`
- [x] Display spell name with Wand2 icon
- [x] Display spell description
- [x] Display properties: School, Level, Casting Time, Range, Duration, Components, Classes

**Reference**: [CharacterGenTab.tsx:1559-1615](src/components/Tabs/CharacterGenTab.tsx#L1559-L1615)

---

## Phase 6: UI Layout Improvement - Analysis Panels ✅

**Design Decision**: Dropdown Popover style + Purely Opt-In (hero grid first)

### Task 6.1: Redesign Header Layout ✅
- [x] Create new header layout with icon buttons on the right side
- [x] Add "Overview" icon button (BarChart3) - shows Party Overview in dropdown
- [x] Add "Composition" icon button (PieChart) - shows Party Composition in dropdown
- [x] Position buttons next to "Clear All" button (right side of header)
- [x] Add tooltip to each button explaining its function
- [x] Style buttons as subtle icon buttons (compact, non-prominent)
- [x] Disable Composition button when < 2 heroes

### Task 6.2: Create Analysis Panel Dropdown Popover ✅
- [x] Create `activeAnalysisPanel` state ('overview' | 'composition' | null)
- [x] Create dropdown popover component positioned below the clicked button
- [x] When clicking Overview button, show PartyOverviewPanel in dropdown
- [x] When clicking Composition button, show PartyCompositionPanel in dropdown
- [x] Close dropdown when clicking outside or pressing Escape
- [x] Close dropdown when clicking the same button again (toggle behavior)
- [x] Only one panel open at a time

### Task 6.3: Update PartyTab CSS ✅
- [x] Add `.party-header-actions` container for right-aligned buttons
- [x] Add `.party-analysis-btn` styles (subtle icon button)
- [x] Add `.party-analysis-btn-active` for active state
- [x] Add `.party-analysis-popover` styles (positioned dropdown)
- [x] Ensure responsive behavior on mobile (popover may need full-width on small screens)
- [x] Add fade-in/scale-in animation for popover open

### Task 6.4: Remove Old CollapsibleSection Layout ✅
- [x] Remove the large `party-analysis-section` div structure entirely
- [x] Hero grid is now the FIRST thing visible below controls
- [x] Remove single-hero special case - just use disabled Composition button instead
- [x] Remove imports for CollapsibleSection if no longer used elsewhere

---

## Phase 7: CSS Styling Updates ✅

### Task 7.1: Add Selection State Styles ✅
- [x] Add `.party-detail-trait-badge-selected` with glow effect (done in Phase 2)
- [x] Add `.party-detail-equipment-item-selected` with glow effect (done in Phase 4)
- [x] Add `.party-detail-spell-badge-selected` with glow effect (done in Phase 5 as `.party-detail-spell-tag-selected`)
- [x] Match styling from CharacterGenTab (purple glow, stronger borders)

### Task 7.2: Add Rarity Color Styles ✅
- [x] Add rarity background color variables (--rarity-*-bg)
- [x] Add rarity border color variables (--rarity-*-border)
- [x] Add rarity text color variables (--rarity-*)

### Task 7.3: Add Spell Level Color Styles ✅
- [x] Add spell level background color variables (--spell-level-*-bg)
- [x] Add spell level border color variables (--spell-level-*-border)
- [x] Add spell level text color variables (--spell-level-*-text)

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| [PartyTab.tsx](src/components/Tabs/PartyTab.tsx) | Add state, handlers, DetailRow integration, UI restructure |
| [PartyTab.css](src/components/Tabs/PartyTab.css) | Add selection styles, rarity colors, spell colors, popover styles |

---

## Dependencies

- `DetailRow` component already exists in `src/components/ui/DetailRow.tsx` ✅ (imported in Phase 1)
- `useFeatureNames` hook already imported (provides `resolveTraitName`, `resolveFeatureName`, `getTraitDescription`, `getTraitDescription`)
- Tooltip component already imported
- ~~Equipment/Spell data helpers need to be copied from CharacterGenTab~~ ✅ (completed in Phase 1)

---

## Verification

1. **Racial Traits**: Click a trait → see DetailRow with description, source, effects
2. **Class Features**: Click a feature → see DetailRow with description, source, effects
3. **Equipment**: Click equipment → see DetailRow with rarity, type, weight, damage/AC, description
4. **Spells**: Click a spell → see DetailRow with school, level, casting time, range, duration, components
5. **Selection Exclusivity**: Selecting one item clears other selections
6. **Analysis Buttons**: Click Overview/Composition buttons → popover appears with panel content
7. **Keyboard Navigation**: All clickable items work with Enter/Space keys

---

## Design Decisions (Confirmed)

1. **Analysis Panel Style**: Dropdown Popover - appears below the clicked button, clean and non-blocking
2. **Default View**: Purely Opt-In - hero grid is the first thing visible, analysis panels only appear when clicking the buttons
