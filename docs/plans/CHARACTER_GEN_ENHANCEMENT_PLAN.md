# CharacterGenTab Enhancement Implementation Plan

## Overview

Enhance the CharacterGenTab component with advanced generation options, effects display, and equipment injection capabilities using the playlist-data-engine API.

## Design Decisions
- **Equipment Injection:** Items are ADDED to starting equipment (not replaced)
- **Effects Display:** Show ALL effect types (stat_bonus, passive_modifier, ability_unlock, skill_proficiency, damage_bonus, resource_grant, spell_slot_bonus)
- **Effects Summary Grouping:** Group by effect type (with source shown in each badge)
- **Reset Button:** Not needed - users can manually clear fields
- **Default Selection:** Race/Class dropdowns default to "Auto (from audio)" option
- **Injection Selection Panel:** Separate panel below browser showing selected items (not inline checkmarks)

---

## Phase 1: Advanced Options Toggle Section

**Goal:** Add expandable "Advanced Options" section with name customization, race/class/subrace selection.

### Task 1.1: Update useCharacterGenerator Hook

**File:** [src/hooks/useCharacterGenerator.ts](src/hooks/useCharacterGenerator.ts)

- [x] Add `CharacterGeneratorOptions` parameter to `generateCharacter` function signature
- [x] Merge incoming options with defaults (preserve gameMode fallback)
- [x] Pass all options to `CharacterGenerator.generate()`:
  ```typescript
  const options: CharacterGeneratorOptions = {
    gameMode: gameMode || 'uncapped',
    forceName: advancedOptions?.forceName || undefined,
    deterministicName: advancedOptions?.deterministicName ?? true,
    forceRace: advancedOptions?.forceRace,
    forceClass: advancedOptions?.forceClass,
    subrace: advancedOptions?.subrace,
    extensions: advancedOptions?.extensions
  };
  ```

**Completed:** Added `AdvancedGenerationOptions` interface and updated `generateCharacter` to accept advanced options for name, race, class, subrace, and equipment injection.

### Task 1.2: Create AdvancedOptionsSection Component

**File:** [src/components/ui/AdvancedOptionsSection.tsx](src/components/ui/AdvancedOptionsSection.tsx) (NEW)

- [x] Create component with expandable header (chevron icon, "Advanced Options" title)
- [x] Follow pattern from [GameModeToggle.tsx](src/components/ui/GameModeToggle.tsx) for styling
- [x] Include collapsible content area with all controls

**Completed:** Created `AdvancedOptionsSection` component with expandable header, name controls (custom name input + deterministic toggle), and race/class/subrace dropdowns populated from FeatureQuery. CSS styling follows existing patterns.

### Task 1.3: Implement Name Controls

- [x] Add `forceName` text input using [Input.tsx](src/components/ui/Input.tsx) component
- [x] Add `deterministicName` toggle (checkbox or switch)
- [x] Show helper text explaining deterministic behavior

**Completed:** Implemented as part of Task 1.2. The component includes name controls with custom name input and deterministic naming checkbox with helper text.

### Task 1.4: Implement Race/Class/Subrace Dropdowns

- [x] Import `FeatureQuery` and types from `playlist-data-engine`:
  ```typescript
  import { FeatureQuery, type Race, type Class } from 'playlist-data-engine';
  ```
- [x] Create race dropdown using `FeatureQuery.getRegisteredRaces()`
- [x] Create class dropdown using `FeatureQuery.getRegisteredClasses()`
- [x] Create subrace dropdown using `FeatureQuery.getAvailableSubraces(race)`
- [x] Add "Pure" option when subraces available
- [x] Add `useEffect` to auto-populate subrace options when race changes

**Completed:** Implemented as part of Task 1.2. The component includes dropdowns with "Auto (from audio)" default option, "Pure" option for subraces, and automatic subrace population when race changes. Uses ALL_RACES and ALL_CLASSES as fallback when FeatureQuery returns empty arrays.

### Task 1.5: Integrate Advanced Options into CharacterGenTab

**File:** [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)

- [x] Add state for advanced options:
  ```typescript
  const [advancedOptions, setAdvancedOptions] = useState({
    forceName: '',
    deterministicName: true,
    forceRace: undefined as Race | undefined,
    forceClass: undefined as Class | undefined,
    subrace: undefined as string | undefined
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  ```
- [x] Render `AdvancedOptionsSection` after game mode toggles
- [x] Update `handleGenerate` to pass advanced options to hook

**Completed:** Integrated `AdvancedOptionsSection` into CharacterGenTab with state management and generation options passed to the `useCharacterGenerator` hook. The component appears when "New" is clicked, alongside the game mode and generation mode toggles.

### Task 1.6: Add CSS Styles

**File:** [src/styles/components/AdvancedOptionsSection.css](src/styles/components/AdvancedOptionsSection.css)

- [x] Style advanced options container
- [x] Style dropdown selects to match existing form controls
- [x] Style expand/collapse animation

**Completed:** CSS styles implemented in dedicated component file. Container has background, border, and rounded corners. Dropdown selects match form controls with focus ring and hover states. Expand/collapse uses CSS grid-template-rows transition for smooth animation.

---

## Phase 2: Effects Display

**Goal:** Display feature_effects and equipment_effects both inline and in a summary card.

### Task 2.1: Create EffectDisplay Components

**File:** [src/components/ui/EffectDisplay.tsx](src/components/ui/EffectDisplay.tsx) (NEW)

- [x] Create `EffectBadge` component for individual effect display
- [x] Create `EffectList` component for grouped effects
- [x] Create `ActiveEffectsSummary` component for summary card
- [x] Create helper to format effect types:
  ```typescript
  const EFFECT_TYPE_LABELS: Record<string, string> = {
    'stat_bonus': 'Stat Bonus',
    'passive_modifier': 'Passive',
    'ability_unlock': 'Ability',
    'skill_proficiency': 'Skill',
    'damage_bonus': 'Damage'
  };
  ```

**Completed:** Created EffectDisplay.tsx with EffectBadge, EffectList, ActiveEffectsSummary, and InlineEffectIndicators components. Includes comprehensive type definitions for FeatureEffect, EquipmentProperty, and EquipmentEffect. Created matching EffectDisplay.css with color-coded badges, grouped lists, and summary card styles.

### Task 2.2: Add Active Effects Summary Card

**File:** [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)

- [x] Add new Card after character header (before Audio Trait Mapping)
- [x] Combine `character.feature_effects` and `character.equipment_effects`
- [x] Group by effect type
- [x] Show totals where applicable (e.g., "+3 STR total")

**Completed:** Added `ActiveEffectsSummary` component to CharacterGenTab. The component is conditionally rendered when the character has `feature_effects` or `equipment_effects`. It uses the already-created `ActiveEffectsSummary` component from Task 2.1 which handles grouping by effect type and showing stat totals. Also fixed a type mismatch in `EffectDisplay.tsx` where `EquipmentProperty.value` needed to accept `boolean` in addition to `number | string`.

### Task 2.3: Add Inline Feature Effects

- [x] Locate Class Features section (~line 814)
- [x] After each feature badge, display associated effects from `feature_effects`
- [x] Locate Racial Traits section (~line 789)
- [x] Display trait effects inline

**Completed:** Added `getFeatureEffects` and `getTraitEffects` methods to `useFeatureNames` hook. Updated CharacterGenTab to display inline effect indicators using `InlineEffectIndicators` component after each class feature and racial trait badge. Effects are looked up from the FeatureQuery registry and displayed as compact colored badges.

### Task 2.4: Add Inline Equipment Effects

- [x] Locate Equipment section (~line 954)
- [x] Reference [ItemsTab.tsx](src/components/Tabs/ItemsTab.tsx) for equipment effects pattern (lines 533-631)
- [x] Show effects per item from `equipment_effects` array

**Completed:** Added `InlineEquipmentEffectIndicators` component to EffectDisplay.tsx for displaying equipment properties inline. Added `getEquipmentEffectsByName` helper function to CharacterGenTab.tsx to find effects for a specific equipment item by name. Modified weapons, armor, and items sections to wrap each equipment item in a `.character-equipment-item-wrapper` div that includes both the item badge and inline effect indicators. Added CSS styles for the wrapper class.

### Task 2.5: Add Effect Display Styles

**File:** [src/components/ui/EffectDisplay.css](src/components/ui/EffectDisplay.css) (co-located with components)

- [x] Style effect badges (color-coded by type)
- [x] Style effects summary card
- [x] Style inline effect indicators

**Completed:** Effect display styles are implemented in EffectDisplay.css (co-located with the EffectDisplay components for better maintainability). Includes:
- `.effect-badge` - Color-coded badges with gradient backgrounds, borders matching effect type colors (stat_bonus=pink, passive_modifier=teal, ability_unlock=purple, skill_proficiency=yellow, damage_bonus=orange, etc.)
- `.active-effects-summary` - Summary card with header, stat totals aggregation display, and grouped effects by type
- `.inline-effect-indicator` - Compact inline indicators for displaying effects next to features/traits/equipment
- Responsive adjustments for mobile screens
- Equipment item wrapper styles in CharacterGenTab.css for inline equipment effects

---

## Phase 3: Equipment Injection Browser

**Goal:** Create searchable category browsers for adding custom equipment via `extensions.equipment`.

### Task 3.1: Create EquipmentBrowser Component

**File:** [src/components/ui/EquipmentBrowser.tsx](src/components/ui/EquipmentBrowser.tsx) (NEW)

- [x] Props: `category: 'weapon' | 'armor' | 'item'`, `onSelect`, `selectedItems`
- [x] Include search input with debounced filtering
- [x] Include scrollable item list
- [x] Include item cards with Add/Remove buttons

**Completed:** Created `EquipmentBrowser` component with:
- Category prop (weapon/armor/item) with appropriate icons
- Search input with 300ms debounce using `useDebounce` hook
- Scrollable item list with custom scrollbar
- Item cards with rarity-colored backgrounds, borders, and text
- Add/Remove toggle buttons for selection
- Empty state display when no items match search
- Item count display with selected count indicator
- CSS styles in dedicated EquipmentBrowser.css file

### Task 3.2: Get Available Equipment

- [x] Import from playlist-data-engine:
  ```typescript
  import { ExtensionManager, DEFAULT_EQUIPMENT, type EnhancedEquipment } from 'playlist-data-engine';
  ```
- [x] Get all equipment: `ExtensionManager.getInstance().get('equipment')`
- [x] Filter by type (weapon/armor/item)
- [x] Follow rarity color patterns from CharacterGenTab (RARITY_COLORS)

**Completed:** Implemented within EquipmentBrowser component using `useMemo` hooks to:
- Get equipment from ExtensionManager with fallback to DEFAULT_EQUIPMENT
- Filter by category type
- Filter by search query (name, rarity, damage type)
- Sort alphabetically by name
- RARITY_COLORS, RARITY_BG_COLORS, RARITY_BORDER_COLORS copied from ItemsTab pattern

### Task 3.3: Track Selected Equipment State

**File:** [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)

- [x] Add state:
  ```typescript
  const [injectionEquipment, setInjectionEquipment] = useState<EnhancedEquipment[]>([]);
  ```
- [x] Create `addEquipment` and `removeEquipment` handlers
- [x] Create `clearInjectionEquipment` handler

**Completed:** Added `injectionEquipment` state with `handleAddEquipment`, `handleRemoveEquipment`, and `handleClearInjectionEquipment` handlers. Handlers use `void` statements to suppress unused warnings until Task 3.4 renders the EquipmentBrowser components.

### Task 3.4: Render Category Browsers

- [x] Add expandable "Equipment Injection" section after Advanced Options
- [x] Render three EquipmentBrowser instances (Weapons, Armor, Items)
- [x] Show count of selected items per category
- [x] Add "Clear All" button

**Completed:** Added expandable Equipment Injection section to CharacterGenTab with:
- Expandable header with sword/shield icons and selection count badge
- Controls row showing counts per category (weapons, armor, items)
- Clear All button to remove all selected equipment
- Helper text explaining that items are added to starting equipment
- Responsive grid layout with three EquipmentBrowser components (one per category)
- CSS styling following existing patterns from AdvancedOptionsSection

### Task 3.5: Pass Equipment to Generation

- [x] Build extensions object:
  ```typescript
  extensions: injectionEquipment.length > 0
    ? { equipment: injectionEquipment.map(e => ({ equipment: e })) }
    : undefined
  ```
- [x] Include in `generateCharacter` call

**Completed:** Added `extensions` property to `generationOptions` object in `handleGenerate` function. Equipment injection is now passed to the character generator when selected items exist.

### Task 3.6: Add Equipment Browser Styles

**File:** [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

- [x] Style browser container
- [x] Style search input
- [x] Style item cards (rarity colors)
- [x] Style Add/Remove buttons

**Completed:** The EquipmentBrowser component has its own dedicated CSS file (EquipmentBrowser.css) with complete styling for:
- Container with background, border, and padding
- Search input with icon, focus states, and clear button
- Scrollable item list with custom scrollbar
- Item cards with rarity-colored backgrounds, borders, and hover effects
- Add/Remove buttons with primary/destructive color variants

The Equipment Injection section in CharacterGenTab.css includes:
- Expandable header with icons and selection count badge
- Controls row with category counts and Clear All button
- Responsive grid layout for the three browser instances
- Smooth expand/collapse animation

---

## Phase 4: Testing & Polish

### Task 4.1: Test Advanced Options

- [ ] Verify name input overrides character name
- [ ] Verify deterministic name toggle works
- [ ] Verify race dropdown populates correctly
- [ ] Verify class dropdown populates correctly
- [ ] Verify subrace dropdown updates when race changes
- [ ] Verify subrace selection requires race selection

### Task 4.2: Test Effects Display

- [ ] Verify feature effects display under class features
- [ ] Verify trait effects display under racial traits
- [ ] Verify equipment effects display under equipment items
- [ ] Verify summary card shows combined effects
- [ ] Verify effect types are properly formatted

### Task 4.3: Test Equipment Injection

- [ ] Verify weapons browser shows all weapon-type equipment
- [ ] Verify armor browser shows all armor-type equipment
- [ ] Verify items browser shows all item-type equipment
- [ ] Verify search filters items correctly
- [ ] Verify selected items are injected into generated character
- [ ] Verify Clear All button works

### Task 4.4: Final Polish

- [ ] Check responsive layout on mobile
- [ ] Verify all tooltips and helper text are clear
- [ ] Verify accessibility (labels, ARIA attributes)
- [ ] Review animation performance

---

## Files Summary

### Files to Modify
| File | Changes |
|------|---------|
| [src/hooks/useCharacterGenerator.ts](src/hooks/useCharacterGenerator.ts) | Accept CharacterGeneratorOptions parameter |
| [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx) | Add advanced options, effects display, equipment browser |
| [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css) | Add styles for new components |

### Files to Create
| File | Purpose |
|------|---------|
| [src/components/ui/AdvancedOptionsSection.tsx](src/components/ui/AdvancedOptionsSection.tsx) | Name, race, class, subrace controls |
| [src/components/ui/EffectDisplay.tsx](src/components/ui/EffectDisplay.tsx) | Effect badges, lists, summary card |
| [src/components/ui/EquipmentBrowser.tsx](src/components/ui/EquipmentBrowser.tsx) | Searchable equipment category browser |

---

## Key Dependencies

```typescript
// From playlist-data-engine
import {
  CharacterGenerator,
  CharacterGeneratorOptions,
  FeatureQuery,
  ExtensionManager,
  DEFAULT_EQUIPMENT,
  MAGIC_ITEMS,
  type Race,
  type Class,
  type EnhancedEquipment,
  type FeatureEffect,
  type EquipmentProperty
} from 'playlist-data-engine';
```

---

## API Reference

### CharacterGeneratorOptions
```typescript
interface CharacterGeneratorOptions {
  level?: number;
  forceClass?: Class;
  forceRace?: Race;
  subrace?: string | 'pure';
  gameMode?: 'standard' | 'uncapped';
  forceName?: string;
  deterministicName?: boolean;
  extensions?: {
    equipment?: EquipmentExtension[];
  };
}
```

### FeatureQuery Methods
- `getRegisteredRaces(): Race[]`
- `getRegisteredClasses(): Class[]`
- `getAvailableSubraces(race: string): string[]`

### ExtensionManager Methods
- `getInstance().get('equipment')` - Get all registered equipment

---

## Verification

1. **Run the app:** `npm run dev`
2. **Navigate to Character Gen tab**
3. **Test Phase 1:** Click "New" → Expand "Advanced Options" → Set name, race, class, subrace → Generate → Verify character reflects selections
4. **Test Phase 2:** Generate character → Scroll to effects summary card → Verify all effects displayed
5. **Test Phase 3:** Expand "Equipment Injection" → Browse categories → Add items → Generate → Verify equipment in character sheet
