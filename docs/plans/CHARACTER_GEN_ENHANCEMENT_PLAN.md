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

- [ ] Locate Class Features section (~line 814)
- [ ] After each feature badge, display associated effects from `feature_effects`
- [ ] Locate Racial Traits section (~line 789)
- [ ] Display trait effects inline

### Task 2.4: Add Inline Equipment Effects

- [ ] Locate Equipment section (~line 954)
- [ ] Reference [ItemsTab.tsx](src/components/Tabs/ItemsTab.tsx) for equipment effects pattern (lines 533-631)
- [ ] Show effects per item from `equipment_effects` array

### Task 2.5: Add Effect Display Styles

**File:** [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

- [ ] Style effect badges (color-coded by type)
- [ ] Style effects summary card
- [ ] Style inline effect indicators

---

## Phase 3: Equipment Injection Browser

**Goal:** Create searchable category browsers for adding custom equipment via `extensions.equipment`.

### Task 3.1: Create EquipmentBrowser Component

**File:** [src/components/ui/EquipmentBrowser.tsx](src/components/ui/EquipmentBrowser.tsx) (NEW)

- [ ] Props: `category: 'weapon' | 'armor' | 'item'`, `onSelect`, `selectedItems`
- [ ] Include search input with debounced filtering
- [ ] Include scrollable item list
- [ ] Include item cards with Add/Remove buttons

### Task 3.2: Get Available Equipment

- [ ] Import from playlist-data-engine:
  ```typescript
  import { ExtensionManager, DEFAULT_EQUIPMENT, type EnhancedEquipment } from 'playlist-data-engine';
  ```
- [ ] Get all equipment: `ExtensionManager.getInstance().get('equipment')`
- [ ] Filter by type (weapon/armor/item)
- [ ] Follow rarity color patterns from CharacterGenTab (RARITY_COLORS)

### Task 3.3: Track Selected Equipment State

**File:** [src/components/Tabs/CharacterGenTab.tsx](src/components/Tabs/CharacterGenTab.tsx)

- [ ] Add state:
  ```typescript
  const [injectionEquipment, setInjectionEquipment] = useState<EnhancedEquipment[]>([]);
  ```
- [ ] Create `addEquipment` and `removeEquipment` handlers
- [ ] Create `clearInjectionEquipment` handler

### Task 3.4: Render Category Browsers

- [ ] Add expandable "Equipment Injection" section after Advanced Options
- [ ] Render three EquipmentBrowser instances (Weapons, Armor, Items)
- [ ] Show count of selected items per category
- [ ] Add "Clear All" button

### Task 3.5: Pass Equipment to Generation

- [ ] Build extensions object:
  ```typescript
  extensions: injectionEquipment.length > 0
    ? { equipment: injectionEquipment.map(e => ({ equipment: e })) }
    : undefined
  ```
- [ ] Include in `generateCharacter` call

### Task 3.6: Add Equipment Browser Styles

**File:** [src/components/Tabs/CharacterGenTab.css](src/components/Tabs/CharacterGenTab.css)

- [ ] Style browser container
- [ ] Style search input
- [ ] Style item cards (rarity colors)
- [ ] Style Add/Remove buttons

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
