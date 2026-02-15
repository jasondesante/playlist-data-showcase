# DataViewerTab Enhancement Plan

## Overview

This plan outlines enhancements to the DataViewerTab component to showcase new features from the playlist-data-engine, including:
- Enhanced equipment properties display (grantsFeatures, grantsSkills, grantsSpells, tags, spawnWeight)
- Equipment conditional properties
- Tags filtering
- Subrace details in races view
- Feature and equipment effects viewer

**Reference Documents:**
- [TAB_ENHANCEMENT_RESEARCH.md](TAB_ENHANCEMENT_RESEARCH.md)
- [docs/engine/docs/EQUIPMENT_SYSTEM.md](docs/engine/docs/EQUIPMENT_SYSTEM.md)
- [docs/engine/docs/EXTENSIBILITY_GUIDE.md](docs/engine/docs/EXTENSIBILITY_GUIDE.md)

**Design Decisions:**
- Conditional properties: Inline with property value
- Spawn weight indicator: Badge/text label
- Tags filter: Dropdown select (consistent with existing filters)
- Subrace display: Full expansion with ability bonuses, traits, requirements

---

## Phase 1: Equipment Enhanced Properties Display

### Task 1.1: Update Equipment Type Handling
- [x] Import `EnhancedEquipment` type from playlist-data-engine in [useDataViewer.ts](src/hooks/useDataViewer.ts)
- [x] Update equipment type references to support both `Equipment` and `EnhancedEquipment`
- [x] Add type guard function `isEnhancedEquipment(item)` to check for enhanced properties

### Task 1.2: Display grantsSkills on Equipment Cards
- [x] Add new section in `renderEquipment()` for skills granted by equipment
- [x] Create `renderGrantedSkills()` helper function
- [x] Display skill name and proficiency level (proficient/expertise)
- [x] Style using existing `.dataviewer-tag` with skill-specific color
- [x] Add CSS for `.dataviewer-tag-skill` (green variant)

```tsx
// Example output:
// Skills: Arcana (expertise), History (proficient)
```

### Task 1.3: Display grantsSpells on Equipment Cards
- [x] Add new section in `renderEquipment()` for spells granted by equipment
- [x] Create `renderGrantedSpells()` helper function
- [x] Display spell name, level, uses, and recharge info
- [x] Handle unlimited uses (uses: null) display
- [x] Add CSS for `.dataviewer-tag-spell` (purple variant)

```tsx
// Example output:
// Spells: Fireball (3rd level, 1/dawn), Shield (1st level, unlimited)
```

### Task 1.4: Display grantsFeatures on Equipment Cards
- [x] Add new section in `renderEquipment()` for features granted by equipment
- [x] Handle both string references (registry features) and inline features
- [x] Create `renderGrantedFeatures()` helper function
- [x] For inline features, show name and description
- [x] For registry references, show feature ID
- [x] Add CSS for `.dataviewer-tag-feature` (blue variant)

### Task 1.5: Display Equipment Tags
- [x] Add tags section at bottom of expanded equipment card
- [x] Create `renderTags()` helper function
- [x] Use existing `.dataviewer-tag` styling
- [x] Show tags as comma-separated list with tag icons

```tsx
// Example output:
// Tags: magic, fire, weapon, legendary
```

### Task 1.6: Display Spawn Weight Indicator
- [x] Add spawn weight badge/indicator to equipment card header
- [x] Create `formatSpawnWeight(weight)` helper function
- [x] Display "Game-Only" badge for `spawnWeight: 0`
- [x] Display "Rare Spawn" for weights < 0.1
- [x] Display "Uncommon" for weights < 0.5
- [x] Add CSS for `.dataviewer-badge-gameonly` (warning style)

---

## Phase 2: Equipment Conditional Properties

### Task 2.1: Create Condition Formatter
- [x] Create `formatCondition(condition: EquipmentCondition)` helper function
- [x] Handle all condition types:
  - `vs_creature_type` → "vs Dragons"
  - `at_time_of_day` → "at Night"
  - `wielder_race` → "Elf only"
  - `wielder_class` → "Paladin only"
  - `on_hit` → "on hit"
  - `on_damage_taken` → "when hit"
  - `custom` → custom description

### Task 2.2: Update Properties Display
- [x] Modify existing property rendering to include conditions inline
- [x] Format: `{property description} ({condition})`
- [x] Example: "+3d6 fire damage (vs Dragons)"

### Task 2.3: Create Property Icon System
- [ ] Add icons for different property types:
  - `stat_bonus` → TrendingUp icon
  - `skill_proficiency` → Award icon
  - `ability_unlock` → Unlock icon
  - `passive_modifier` → Shield icon
  - `damage_bonus` → Flame icon
  - `special_property` → Star icon
- [ ] Import icons from lucide-react
- [ ] Update property display to include icon

---

## Phase 3: Equipment Tags Filter

### Task 3.1: Add Tags Filter State
- [ ] Add `equipmentTagFilter` state in DataViewerTab.tsx
- [ ] Type: `string | 'all'` with default `'all'`

### Task 3.2: Create getEquipmentTags Helper
- [ ] Add `getEquipmentTags()` function to useDataViewer hook
- [ ] Collect all unique tags from equipment items
- [ ] Return sorted array of tag strings

### Task 3.3: Add Tags Filter Dropdown
- [ ] Create `renderEquipmentTagFilter()` function
- [ ] Add dropdown with "All Tags" option
- [ ] Populate with tags from `getEquipmentTags()`
- [ ] Match existing filter styling

### Task 3.4: Implement Tag Filtering Logic
- [ ] Add `filterEquipmentByTag()` function to useDataViewer
- [ ] Filter equipment where `item.tags?.includes(selectedTag)`
- [ ] Integrate into existing `getFilteredData` useMemo

---

## Phase 4: Enhanced Subrace Display

### Task 4.1: Extend RaceDataEntry Interface
- [ ] Add `subraceData` field to `RaceDataEntry` interface in useDataViewer.ts
- [ ] Type: `Record<string, { ability_bonuses, traits, requirements? }>`

### Task 4.2: Load Subrace Data
- [ ] Update `races` useMemo to include subrace-specific data
- [ ] Extract subrace ability bonuses from RACE_DATA
- [ ] Collect subrace-specific traits from FeatureQuery

### Task 4.3: Update Race Card Rendering
- [ ] Modify `renderRaces()` to show full subrace expansion
- [ ] When race has subraces, show:
  - Subrace name as section header
  - Subrace-specific ability bonuses
  - Subrace-specific traits list
  - Any requirements (if applicable)
- [ ] Use color-coded ability bonus display

### Task 4.4: Add Subrace CSS Styles
- [ ] Add `.dataviewer-subrace-section` class
- [ ] Style subrace name with accent color
- [ ] Add visual separator between subraces
- [ ] Ensure responsive layout

---

## Phase 5: Feature & Equipment Effects Viewer

### Task 5.1: Add Feature Effects Display
- [ ] Create `renderFeatureEffects()` helper function
- [ ] Display effects for class features when expanded
- [ ] Show effect type, target, value, and condition
- [ ] Support all effect types from EQUIPMENT_SYSTEM.md:
  - `stat_bonus`
  - `skill_proficiency`
  - `ability_unlock`
  - `passive_modifier`
  - `resource_grant`
  - `spell_slot_bonus`

### Task 5.2: Add Racial Trait Effects Display
- [ ] Update `renderRacialTraits()` to show trait effects
- [ ] Include prerequisite info if present
- [ ] Display effect conditions inline

### Task 5.3: Create Effects Summary Component
- [ ] Create reusable `EffectsList` component
- [ ] Accept effects array as prop
- [ ] Render each effect with icon, description
- [ ] Handle stacking indicators

---

## Phase 6: CSS Enhancements

### Task 6.1: Add New Badge Styles
- [ ] `.dataviewer-badge-gameonly` - Warning style for spawnWeight: 0
- [ ] `.dataviewer-badge-rare-spawn` - Muted style for low spawn weights

### Task 6.2: Add New Tag Styles
- [ ] `.dataviewer-tag-skill` - Green variant
- [ ] `.dataviewer-tag-spell` - Purple variant
- [ ] `.dataviewer-tag-feature` - Blue variant
- [ ] `.dataviewer-tag-condition` - Orange variant

### Task 6.3: Add Section Styles
- [ ] `.dataviewer-item-section` - Container for new sections
- [ ] `.dataviewer-item-section-title` - Section headers
- [ ] `.dataviewer-subrace-section` - Subrace container
- [ ] `.dataviewer-effects-list` - Effects container

### Task 6.4: Update Responsive Styles
- [ ] Ensure new sections collapse properly on mobile
- [ ] Adjust tag wrapping for smaller screens
- [ ] Test all new elements at 480px breakpoint

---

## Phase 7: Testing & Documentation

### Task 7.1: Test Equipment Enhancements
- [ ] Verify grantsSkills displays correctly
- [ ] Verify grantsSpells shows uses/recharge properly
- [ ] Verify grantsFeatures handles both string and inline
- [ ] Verify tags display and filter correctly
- [ ] Verify spawnWeight badges appear appropriately

### Task 7.2: Test Conditional Properties
- [ ] Test all condition types display correctly
- [ ] Verify inline formatting is readable
- [ ] Check condition icons render properly

### Task 7.3: Test Subrace Display
- [ ] Verify subrace ability bonuses show correctly
- [ ] Verify subrace-specific traits display
- [ ] Test races without subraces still work

### Task 7.4: Update Component Documentation
- [ ] Update DataViewerTab.tsx header comment
- [ ] Document new helper functions
- [ ] Add examples to comments

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Equipment Properties | High | Medium | None |
| 2. Conditional Properties | High | Low | Phase 1 |
| 3. Tags Filter | Medium | Low | Phase 1 |
| 4. Subrace Display | Medium | Medium | None |
| 5. Effects Viewer | Low | Medium | Phase 1 |
| 6. CSS Enhancements | High | Low | Phases 1-5 |
| 7. Testing | High | Low | Phases 1-6 |

---

## File Changes Summary

### Modified Files
- [src/components/Tabs/DataViewerTab.tsx](src/components/Tabs/DataViewerTab.tsx) - Main component changes
- [src/components/Tabs/DataViewerTab.css](src/components/Tabs/DataViewerTab.css) - Styling changes
- [src/hooks/useDataViewer.ts](src/hooks/useDataViewer.ts) - Hook enhancements

### No New Files Required
All enhancements will be made within existing files.

---

## Quick Reference: EquipmentPropertyType Values

| Type | Description | Target Examples |
|------|-------------|-----------------|
| `stat_bonus` | Ability score increase | STR, DEX, CON, INT, WIS, CHA |
| `skill_proficiency` | Grant skill proficiency | stealth, perception, arcana |
| `ability_unlock` | Unlock special abilities | darkvision, flight, resistance |
| `passive_modifier` | Modify passive values | ac, speed, hp, saving_throws |
| `special_property` | Game-specific properties | finesse, versatile, reach |
| `damage_bonus` | Extra damage | fire, cold, lightning, radiant |
| `stat_requirement` | Minimum stat to use | STR: 15, DEX: 13 |

---

## Quick Reference: EquipmentCondition Types

| Type | Value Format | Display |
|------|--------------|---------|
| `vs_creature_type` | string | "vs Dragons" |
| `at_time_of_day` | day/night/dawn/dusk | "at Night" |
| `wielder_race` | string | "Elf only" |
| `wielder_class` | string | "Paladin only" |
| `while_equipped` | boolean | (implicit) |
| `on_hit` | boolean | "on hit" |
| `on_damage_taken` | boolean | "when hit" |
| `custom` | value + description | custom description |

---

*Plan created: 2026-02-13*
