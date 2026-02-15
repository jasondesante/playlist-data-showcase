# CharacterGenTab UI Improvements Implementation Plan

## Overview

Enhance the CharacterGenTab with interactive detail panels for all list items (effects, traits, features, equipment, spells), replacing hover tooltips with click-to-select descriptions and adding proper styling to spells.

## Design Decisions (User Confirmed)
- **Description location:** Below the section (not below individual items)
- **Selection behavior:** Stay selected when clicking same item (no toggle off)
- **Close behavior:** Auto-clear when clicking an item in a different section
- **Spell styling:** Cantrips and leveled spells have different colors (cantrips=teal, leveled=purple by level)
- **Active Effects:** Section-level expand button to show all effect descriptions at once
- **Import button:** Should match Export button styling - both use same `variant="outline"` already

---

## Phase 1: DetailRow Component (Foundation)

- [x] **Task 1.1: Create DetailRow Component**
  - [x] Create `src/components/ui/DetailRow.tsx`
  - [x] Define `DetailRowProps` interface with: `isVisible`, `title`, `icon`, `iconColor`, `description`, `properties`, `effects`, `children`, `className`
  - [x] Implement smooth expand/collapse animation (follow `equipment-injection-content` CSS pattern using CSS grid-template-rows)
  - [x] Add title, icon, and content areas
  - [x] Support rich content (lists, properties, descriptions)

- [x] **Task 1.2: Create DetailRow CSS**
  - [x] Create `src/components/ui/DetailRow.css`
  - [x] Add animated height transition using CSS grid
  - [x] Style with subtle background and border
  - [x] Add property list styling (key-value pairs)
  - [x] Ensure responsive layout

---

## Phase 2: Active Effects Enhancement

- [x] **Task 2.1: Add "from [source]" Attribution**
  - [x] Modify `EffectBadge` in `src/components/ui/EffectDisplay.tsx`
  - [x] Add `effect-badge-source` span showing "from [source]" after value
  - [x] Update CSS in `src/components/ui/EffectDisplay.css`

- [x] ~~**Task 2.2: Add Section Expand Button**~~ **REMOVED - Redundant**
  - ~~Add expand/collapse toggle to `ActiveEffectsSummary` component~~
  - ~~Add chevron icon that rotates when expanded~~
  - ~~Implement internal state for expanded/collapsed~~
  - **Reason:** The "from [source]" attribution (Task 2.1) now displays directly in the badges, making the expand/collapse functionality redundant.

- [x] ~~**Task 2.3: Expandable Effect Details**~~ **REMOVED - Redundant**
  - ~~Show expanded content for each effect when section is expanded~~
  - **Reason:** Same as above - badges now show source info directly.

---

## Phase 3: Racial Traits Click-to-Select

- [x] **Task 3.1: Add Selection State**
  - [x] Add `const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null)` in CharacterGenTab.tsx

- [x] **Task 3.2: Update Trait Badges**
  - [x] Remove `title` attribute (hover tooltip) from trait badges
  - [x] Add `onClick` handler to call `setSelectedTraitId`
  - [x] Add cursor pointer style
  - [x] Add `.character-trait-badge-selected` class when selected
  - [x] Add CSS for selected state (highlight/glow effect)

- [x] **Task 3.3: Add Trait Detail Row**
  - [x] Use `FeatureQuery.getRacialTraitById(traitId)` to get full trait data
  - [x] Add `DetailRow` component after traits grid (inside same Card)
  - [x] Display: name, description, source (race), effects

- [x] **Task 3.4: Implement Auto-Clear on Section Switch**
  - [x] When clicking a feature, clear `selectedTraitId` (implemented in Phase 4)
  - [x] When clicking equipment, clear `selectedTraitId` (implemented in Phase 5)
  - [x] When clicking a spell, clear `selectedTraitId` (implemented in Phase 6)

---

## Phase 4: Class Features Click-to-Select

- [x] **Task 4.1: Add Selection State**
  - [x] Add `const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)` in CharacterGenTab.tsx

- [x] **Task 4.2: Update Feature Badges**
  - [x] Remove `title` attribute from feature badges
  - [x] Add `onClick` handler
  - [x] Add selected state styling (reuse trait badge pattern)

- [x] **Task 4.3: Add Feature Detail Row**
  - [x] Use `FeatureQuery.getClassFeatureById(featureId)` to get full feature data (via useFeatureNames hook)
  - [x] Display: name, description, source (class), effects

- [x] **Task 4.4: Implement Auto-Clear on Section Switch**
  - [x] When clicking a trait, clear `selectedFeatureId`
  - [x] When clicking a feature, clear `selectedTraitId`

---

## Phase 5: Equipment Click-to-Select

- [x] **Task 5.1: Add Selection State**
  - [x] Add state for selected equipment:
    ```tsx
    const [selectedEquipment, setSelectedEquipment] = useState<{
      name: string;
      type: 'weapon' | 'armor' | 'item';
    } | null>(null);
    ```

- [x] **Task 5.2: Update Equipment Items**
  - [x] Remove `title` attribute from equipment items
  - [x] Add `onClick` handler
  - [x] Add selected state styling
  - [x] Add cursor pointer and keyboard accessibility

- [x] **Task 5.3: Add Equipment Detail Row**
  - [x] Use `getEquipmentData(itemName)` to get full item info
  - [x] Display: name, description, rarity, type, damage/AC, weight, properties (effects)
  - [x] Handle weapons, armor, and items with appropriate property labels and icons

- [x] **Task 5.4: Implement Auto-Clear on Section Switch**
  - [x] When clicking a trait/feature, clear `selectedEquipment`
  - [x] When clicking a spell, clear `selectedEquipment` (implemented in Phase 6)

---

## Phase 6: Spells Styling and Click-to-Select

- [x] **Task 6.1: Add Selection State**
  - [x] Add `const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null)` in CharacterGenTab.tsx

- [x] **Task 6.2: Create Spell Color Mapping**
  - [x] Define `SPELL_LEVEL_COLORS` constant with colors for levels 0-9
  - [x] Cantrips (level 0): teal
  - [x] Leveled spells (1-9): progressively deeper purple

- [x] **Task 6.3: Style Spell Items**
  - [x] Replace comma-separated text with styled badges in a grid
  - [x] Create spell badges with level-based colors
  - [x] Add selection state styling
  - [x] Add cursor pointer and hover effects

- [x] **Task 6.4: Add Spell CSS**
  - [x] Add `.character-spells-grid` styles
  - [x] Add `.character-spell-badge` styles with level-based colors
  - [x] Add `.character-spell-badge-selected` styles

- [x] **Task 6.5: Add Spell Detail Row**
  - [x] Use `SpellQuery.getSpell(spellId)` to get full spell data
  - [x] Display: name, description, school of magic, level, casting time, range, duration, components (V, S, M), prerequisites

- [x] **Task 6.6: Implement Auto-Clear on Section Switch**
  - [x] When clicking a trait/feature/equipment, clear `selectedSpellId`

---

## Phase 7: Import Button Verification

- [ ] **Task 7.1: Verify Button Consistency**
  - [ ] Check that Export and Import buttons render identically
  - [ ] Both use `variant="outline"` and `size="sm"`
  - [ ] Investigate if user sees difference (potential CSS conflicts)

---

## Dependencies

- `playlist-data-engine` exports:
  - `FeatureQuery` for class features and racial traits
  - `SpellQuery` for spell data
  - Types: `ClassFeature`, `RacialTrait`, `Spell`, `EnhancedEquipment`
- `src/hooks/useHeroEquipment.ts` - `getEquipmentData()` function
- Existing animation pattern from `equipment-injection-content` CSS

---

## Files Summary

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/Tabs/CharacterGenTab.tsx` | Add selection states, update rendering for all sections |
| `src/components/Tabs/CharacterGenTab.css` | Add styles for selected states, spell badges |
| `src/components/ui/EffectDisplay.tsx` | Add source attribution, section expand button |
| `src/components/ui/EffectDisplay.css` | Styles for source text, expandable effects |

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/ui/DetailRow.tsx` | Reusable detail panel component ✅ CREATED |
| `src/components/ui/DetailRow.css` | Detail panel styles ✅ CREATED |

---

## Verification Steps

1. **Run the app:** `npm run dev`
2. **Navigate to Character Gen tab**
3. **Generate a character**
4. **Test each section:**
   - Click on racial traits → description row appears below
   - Click on class features → description row appears below
   - Click on equipment → description row appears below
   - Click on spells → description row appears below
   - Verify selected state styling on clicked items
   - Verify auto-clear when switching sections
5. **Test Active Effects:** Verify "from [source]" text and expand button work
6. **Test responsive layout** on mobile
7. **Verify Import button** matches Export button visually

---

## Questions/Unknowns

- None - all design decisions confirmed by user
