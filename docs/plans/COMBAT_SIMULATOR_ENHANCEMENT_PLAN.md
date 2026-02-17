# CombatSimulatorTab Enhancement Implementation Plan

## Overview

Transform the CombatSimulatorTab from a basic combat demo into a full-featured combat encounter generator and battle simulator. This enhancement integrates the EnemyGenerator system, adds tactical actions, treasure configuration, party management, and comprehensive encounter customization.

**Estimated Scope:** 8 Phases, ~40 tasks

---

## Phase 1: Enemy Generator System Integration

**Goal:** Replace the mock "Goblin" enemy with the full EnemyGenerator system.

### 1.1 Core Enemy Generator Hook
- [x] Create `useEnemyGenerator.ts` hook
  - [x] Import and wrap `EnemyGenerator.generate()`
  - [x] Import and wrap `EnemyGenerator.generateEncounter()`
  - [x] Import and wrap `EnemyGenerator.generateEncounterByCR()`
  - [x] Add `getTemplateById()` helper
  - [x] Handle seeding for determinism

### 1.2 Enemy Generation State Management
- [x] Add enemy generation state to component
  - [x] `generatedEnemies: CharacterSheet[]` state
  - [x] `generationConfig: EnemyGenerationConfig` state
  - [x] `isGenerating: boolean` loading state
  - [x] Reset enemies when config changes

### 1.3 Replace Mock Enemy with Generated Enemies
- [x] Update `handleStartCombat()` to use `generatedEnemies`
- [x] Fall back to single generated enemy if none configured
- [x] Pass generated enemies to `startCombat()`

---

## Phase 2: Enemy Configuration UI

**Goal:** Provide UI controls for all enemy generation parameters.

### 2.1 Generation Mode Selector
- [x] Add generation mode dropdown
  - [x] Options: "Single Enemy", "Party-Balanced Encounter", "CR-Based Encounter"
  - [x] Show/hide relevant config sections based on mode

### 2.2 Single Enemy Configuration
- [x] Add enemy template selector dropdown
  - [x] Group by category: Humanoid, Beast, Undead, Fiend, Elemental, Construct, Dragon, Monstrosity
  - [x] Show archetype badge (Brute/Archer/Support)
  - [x] Display signature ability tooltip
- [x] Add rarity tier selector
  - [x] Options: Common, Uncommon, Elite, Boss
  - [x] Show stat multiplier and extra abilities info

### 2.3 Party-Balanced Encounter Configuration
- [ ] Add difficulty selector
  - [ ] Options: Easy, Medium, Hard, Deadly
  - [ ] Show XP budget preview
- [ ] Add enemy count input (1-10)
- [ ] Add category filter dropdown (optional)
- [ ] Add archetype filter dropdown (optional)
- [ ] Add enemy mix mode selector
  - [ ] Uniform (all same type)
  - [ ] Category (mix from selected category)
  - [ ] Custom (specify templates)

### 2.4 CR-Based Encounter Configuration
- [ ] Add target CR input (0.25, 0.5, 1-20)
- [ ] Add enemy count input
- [ ] Add base rarity selector
- [ ] Show calculated total encounter XP

### 2.5 Custom Template Mix
- [ ] Add template selection for custom mix mode
  - [ ] Multi-select or tag-style input
  - [ ] Visual preview of enemy composition
  - [ ] Cycle templates if count > templates.length

---

## Phase 3: Audio-Influenced Generation

**Goal:** Enable enemy generation influenced by playlist audio analysis.

### 3.1 Audio Generation UI
- [ ] Add "Audio-Influenced" toggle
- [ ] Add song selector when audio mode enabled
  - [ ] Show playlist tracks as multi-select
  - [ ] Limit selection to enemy count
  - [ ] Display "X of Y songs selected" counter
- [ ] Add "Random Selection" button to pick N songs automatically

### 3.2 Audio Analysis Integration
- [ ] Create `useAudioEnemyGeneration.ts` hook
  - [ ] Accept selected tracks array
  - [ ] Analyze audio for each selected track
  - [ ] Map audio profile to enemy template weights
  - [ ] Return generated enemies with audio influence

### 3.3 Audio Preview Display
- [ ] Show which song influenced which enemy
- [ ] Display audio profile summary (bass/mid/treble)
- [ ] Show template selection reasoning tooltip

---

## Phase 4: Tactical Actions UI

**Goal:** Add Dodge, Dash, Disengage, and Flee action buttons to combat.

### 4.1 Action Button Components
- [ ] Add Dodge button
  - [ ] Call `combat.executeDodge(instance, current)`
  - [ ] Show "+2 AC until next turn" tooltip
  - [ ] Disable if action already used
- [ ] Add Dash button
  - [ ] Call `combat.executeDash(instance, current)`
  - [ ] Show "Double movement" tooltip
- [ ] Add Disengage button
  - [ ] Call `combat.executeDisengage(instance, current)`
  - [ ] Show "No opportunity attacks" tooltip
- [ ] Add Flee button
  - [ ] Call `combat.executeFlee(instance, current)`
  - [ ] Require `allowFleeing` config to be enabled
  - [ ] Show confirmation dialog

### 4.2 Action Economy Display
- [ ] Show action/bonus action/reaction status
- [ ] Visual indicator when action is consumed
- [ ] Reset indicators on new turn

### 4.3 Combat Log Updates
- [ ] Handle new action types in log renderer
- [ ] Show dodge/dash/disengage/flee descriptions
- [ ] Color-code tactical actions differently

---

## Phase 5: Treasure System

**Goal:** Configure and display treasure rewards.

### 5.1 Treasure Configuration UI
- [ ] Add treasure config section (collapsible)
- [ ] Add gold configuration options
  - [ ] Fixed amount input
  - [ ] Range inputs (min/max)
  - [ ] Seed input for deterministic generation
- [ ] Add custom items configuration
  - [ ] Item name input
  - [ ] Item type selector
  - [ ] Add/remove item buttons

### 5.2 Treasure Display in Victory Screen
- [ ] Show gold awarded
- [ ] Show items awarded (if any)
- [ ] Add treasure summary section
- [ ] Animate treasure reveal

### 5.3 Treasure State Management
- [ ] Add `treasureConfig` to combat initialization
- [ ] Pass treasure config to `CombatEngine` constructor
- [ ] Display treasure in combat result

---

## Phase 6: Advanced Encounter Configuration

**Goal:** Provide advanced options for encounter customization.

### 6.1 Advanced Options Panel
- [ ] Create collapsible "Advanced Options" section
- [ ] Add toggle switches:
  - [ ] `useEnvironment` - Apply environmental bonuses
  - [ ] `useMusic` - Apply music-based bonuses
  - [ ] `tacticalMode` - Enable advanced tactical rules
  - [ ] `allowFleeing` - Enable flee action
- [ ] Add numeric inputs:
  - [ ] `maxTurnsBeforeDraw` - Combat timeout (default 100)
  - [ ] `seed` - Deterministic generation seed

### 6.2 Configuration Preview
- [ ] Show summary of active options
- [ ] Display estimated encounter difficulty
- [ ] Show any warnings (e.g., "Fleeing disabled")

### 6.3 Config State Integration
- [ ] Create `CombatConfig` type/interface
- [ ] Pass config to `CombatEngine` on initialization
- [ ] Persist config to localStorage for UX

---

## Phase 7: Party System Integration

**Goal:** Enable multi-character parties with analyzer display.

### 7.1 Party Selection UI
- [ ] Add party mode toggle: "Solo Hero" vs "Party"
- [ ] Create party member selector
  - [ ] Show all generated characters from store
  - [ ] Multi-select with checkboxes
  - [ ] Display character thumbnails
  - [ ] Limit to 4-6 party members

### 7.2 Party Analyzer Display
- [ ] Create `PartyAnalyzerCard` component
- [ ] Show party statistics:
  - [ ] Average party level
  - [ ] Combined party strength score
  - [ ] Average AC
  - [ ] Average HP
  - [ ] Average damage output estimate
- [ ] Show XP budget by difficulty:
  - [ ] Easy/Medium/Hard/Deadly thresholds
- [ ] Show class composition breakdown

### 7.3 Party Combat Integration
- [ ] Pass party array to `startCombat()`
- [ ] Update combat result to handle party victory
- [ ] Distribute XP among party members

### 7.4 Party in Combat UI
- [ ] Group party members visually in initiative order
- [ ] Show party vs enemies in combatant grid
- [ ] Highlight current party member's turn

---

## Phase 8: Enemy Type Display & Visual Polish

**Goal:** Show enemy metadata and polish the overall UI.

### 8.1 Enemy Card Enhancements
- [ ] Add category badge (Humanoid, Beast, etc.)
- [ ] Add archetype badge (Brute, Archer, Support)
- [ ] Add rarity tier indicator
  - [ ] Common: Gray/bronze border
  - [ ] Uncommon: Green border
  - [ ] Elite: Purple border with glow
  - [ ] Boss: Gold border with animated glow
- [ ] Show signature ability name
- [ ] Display resistances/immunities

### 8.2 Boss/Elite Visual Treatment
- [ ] Special card styling for elite enemies
- [ ] Enhanced boss card with larger size
- [ ] Show legendary action count for bosses
- [ ] Display legendary resistances remaining

### 8.3 Enemy Template Browser
- [ ] Create expandable template reference panel
- [ ] Show all available templates with stats
- [ ] Filter by category/archetype
- [ ] Click to select for generation

### 8.4 Encounter Summary Panel
- [ ] Show before combat starts:
  - [ ] Total enemies by type
  - [ ] Total encounter XP
  - [ ] Difficulty rating vs party
  - [ ] Estimated challenge

### 8.5 CSS Enhancements
- [ ] Add animations for enemy generation
- [ ] Polish rarity tier color schemes
- [ ] Add transition effects for config panels
- [ ] Responsive layout adjustments

---

## Dependencies

### Prerequisites
- [ ] `playlist-data-engine` must export `EnemyGenerator`
- [ ] `playlist-data-engine` must export `PartyAnalyzer`
- [ ] `playlist-data-engine` must export tactical action methods
- [ ] `useCombatEngine` hook must support new config options

### External Requirements
- [ ] Character store must support multiple active characters
- [ ] Audio analysis must be available for audio-influenced generation

---

## File Structure

```
src/
├── hooks/
│   ├── useEnemyGenerator.ts        # Phase 1
│   ├── useAudioEnemyGeneration.ts  # Phase 3
│   └── usePartyAnalyzer.ts         # Phase 7
├── components/
│   ├── tabs/
│   │   └── CombatSimulatorTab.tsx  # Main component (enhanced)
│   ├── combat/
│   │   ├── EnemyConfigPanel.tsx    # Phase 2
│   │   ├── AudioGenerationPanel.tsx # Phase 3
│   │   ├── TacticalActions.tsx     # Phase 4
│   │   ├── TreasureConfig.tsx      # Phase 5
│   │   ├── AdvancedOptions.tsx     # Phase 6
│   │   ├── PartySelector.tsx       # Phase 7
│   │   ├── PartyAnalyzerCard.tsx   # Phase 7
│   │   ├── EnemyCard.tsx           # Phase 8
│   │   └── TemplateBrowser.tsx     # Phase 8
│   └── ui/
│       └── RarityBadge.tsx         # Phase 8
└── types/
    └── combatTypes.ts              # New types/interfaces
```

---

## Implementation Order (Recommended)

1. **Phase 1** - Enemy Generator Integration (foundation)
2. **Phase 2** - Enemy Configuration UI (enables basic generation)
3. **Phase 8.1-8.2** - Enemy Display (visual feedback for phases 1-2)
4. **Phase 4** - Tactical Actions (quick wins, enhances combat)
5. **Phase 7** - Party System (significant feature addition)
6. **Phase 5** - Treasure System (completes victory experience)
7. **Phase 6** - Advanced Options (polish)
8. **Phase 3** - Audio-Influenced Generation (requires playlist integration)
9. **Phase 8.3-8.5** - Visual Polish (final touches)

---

## Design Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| Config Panel Layout | **Top Section** - Collapses into summary bar when combat starts |
| Template Selection UI | **Tag Chips** - Click to add/remove, visual tags |
| Rarity Visual Style | **Subtle Borders** - Colored borders only (gray/green/purple/gold) |
| Auto-Play AI Behavior | **Smart Tactics** - Dodge when low HP, flee when outnumbered |
| Default Enemy Count | **Match Party** - Auto-set enemies = party size |
| Audio Song Selection | **Random Shuffle** - Randomly pick N songs from playlist |
| Config Persistence | **Yes** - Persist last-used config to localStorage |
| Max Party Size | **4 Characters** - Classic D&D party size |

## Remaining Questions (Can Decide Later)

1. **Treasure Distribution**: Should gold be split among party or awarded in full to each?
2. **Enemy Equipment V2**: Should we display enemy equipment in their cards?
3. **Spellcasting Enemies**: How to handle enemy spell selection in UI?
4. **Legendary Actions**: Auto-execute legendary actions or manual trigger?

---

## Success Criteria

- [ ] Users can generate enemies by template, CR, or party-balanced difficulty
- [ ] Audio-influenced generation works with playlist track selection
- [ ] All tactical actions (Dodge, Dash, Disengage, Flee) are functional
- [ ] Treasure rewards are configurable and displayed on victory
- [ ] Party mode supports multiple characters with analyzer preview
- [ ] Enemy cards clearly show type, archetype, and rarity tier
- [ ] Advanced options are accessible but don't clutter main UI
- [ ] Combat log correctly displays all new action types

---

*Plan created: 2026-02-14*
*Last updated: 2026-02-17*
