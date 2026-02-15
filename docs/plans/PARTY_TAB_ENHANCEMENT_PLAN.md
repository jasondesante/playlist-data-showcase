# PartyTab Enhancement Plan

Add PartyAnalyzer integration, hero selection for calculations, party composition visualization, and quick stats cards.

---

## Overview

This plan enhances the PartyTab with:
1. **Party Overview Panel** - Aggregated party statistics using `PartyAnalyzer` from the engine
2. **Hero Selection** - Ability to select/deselect heroes for calculations (default: all selected)
3. **Party Composition** - Visual breakdown of class distribution and roles
4. **Quick Stats Cards** - At-a-glance party statistics

**NOT included:** Encounter generator button (goes in CombatSimulatorTab separately)

---

## Phase 1: Core Infrastructure

### Task 1.1: Import PartyAnalyzer from Engine
- [x] Add `PartyAnalyzer` import from `playlist-data-engine`
- [x] Create TypeScript interface for `PartyAnalysis` result type
- [x] Verify `PartyAnalyzer.analyzeParty()` returns expected data structure

### Task 1.2: Create Hero Selection State
- [x] Add `selectedHeroSeeds: Set<string>` state to PartyTab
- [x] Initialize with all character seeds (all selected by default)
- [x] Create `toggleHeroSelection(seed: string)` function
- [x] Create `selectAllHeroes()` function
- [x] Create `deselectAllHeroes()` function

### Task 1.3: Create Party Analysis Hook
- [x] Create `usePartyAnalysis.ts` hook in `src/hooks/`
- [x] Accept `characters` and `selectedHeroSeeds` as parameters
- [x] Filter characters by selection
- [x] Call `PartyAnalyzer.analyzeParty()` with selected characters
- [x] Memoize the result to prevent unnecessary recalculations
- [x] Return analysis object or null if no characters selected

```typescript
// usePartyAnalysis.ts
interface PartyAnalysisResult {
  averageLevel: number;
  partySize: number;
  averageAC: number;
  averageHP: number;
  averageDamage: number;
  totalStrength: number;
  easyXP: number;
  mediumXP: number;
  hardXP: number;
  deadlyXP: number;
}

function usePartyAnalysis(
  characters: CharacterSheet[],
  selectedSeeds: Set<string>
): PartyAnalysisResult | null;
```

---

## Phase 2: Party Overview Panel Component

### Task 2.1: Create PartyOverviewPanel Component
- [x] Create `src/components/Party/PartyOverviewPanel.tsx`
- [x] Accept `analysis` prop (PartyAnalysisResult | null)
- [x] Accept `selectedCount` and `totalCount` props
- [x] Show empty state when no heroes selected

### Task 2.2: Quick Stats Cards
- [x] Create stat card grid layout (responsive)
- [x] Implement individual stat cards:
  - [x] **Average Level** - with party size subtitle
  - [x] **Average AC** - armor class
  - [x] **Average HP** - hit points
  - [x] **Total Strength** - abstract power score
  - [x] **Est. Damage** - average damage output

### Task 2.3: XP Budget Display
- [x] Create XP budget section showing encounter difficulty thresholds
- [x] Display Easy/Medium/Hard/Deadly XP values
- [x] Add tooltips explaining what XP budgets mean
- [x] Use color coding for difficulty levels (green → red)

### Task 2.4: Party Overview CSS
- [x] Add CSS styles for overview panel in `PartyOverviewPanel.css` (component-based CSS)
- [x] Style stat cards with hover effects
- [x] Style XP budget section with difficulty colors
- [x] Ensure responsive layout for mobile/tablet/desktop

---

## Phase 3: Hero Selection UI

### Task 3.1: Selection Checkbox on Character Cards
- [x] Modify `CharacterCard` component to accept selection props:
  - [x] `isSelected: boolean`
  - [x] `onToggleSelection: () => void`
  - [x] `selectionMode: boolean` (show/hide checkbox)
- [x] Add checkbox overlay to card (top-left corner)
- [x] Style selected vs unselected cards differently
- [x] Ensure selection doesn't interfere with click-to-view-details

### Task 3.2: Selection Controls Bar
- [x] Add selection controls bar above the character grid
- [x] Include "Select All" button
- [x] Include "Deselect All" button
- [x] Show count: "X of Y heroes selected for analysis"
- [x] Only show when there are 2+ characters

### Task 3.3: Selection State Persistence
- [x] Consider if selection should persist across tab changes (optional)
- [x] Reset selection when characters are cleared
- [x] Auto-select new characters when added to party (default behavior)

---

## Phase 4: Party Composition Visualization

### Task 4.1: Create PartyCompositionPanel Component
- [x] Create `src/components/Party/PartyCompositionPanel.tsx`
- [x] Accept `characters` and `selectedSeeds` props
- [x] Calculate composition data from selected characters

### Task 4.2: Class Distribution
- [x] Count characters by class (Fighter, Wizard, Rogue, etc.)
- [x] Display as horizontal bar chart or donut chart
- [x] Show class icons/emojis if available
- [x] Show percentage for each class

### Task 4.3: Role Distribution
- [x] Determine character roles based on class:
  - [x] **Tank** - Fighter, Paladin, Barbarian (high AC/HP)
  - [x] **DPS** - Rogue, Ranger, Monk (high damage)
  - [x] **Caster** - Wizard, Sorcerer, Warlock (spell-focused)
  - [x] **Support** - Cleric, Bard, Druid (healing/utility)
- [x] Display role breakdown with icons
- [x] Show role balance indicator (balanced vs unbalanced)

### Task 4.4: Quick Stats Row
- [x] Total HP pool
- [x] Highest AC in party
- [x] Lowest AC in party
- [x] Spellcaster count
- [x] Average speed

### Task 4.5: Composition CSS
- [x] Add CSS styles for composition panel
- [x] Style class/role distribution charts
- [x] Use consistent color palette with existing design
- [x] Add smooth animations for data changes

---

## Phase 5: Integration & Polish

### Task 5.1: Integrate Components into PartyTab
- [x] Add PartyOverviewPanel above the character grid
- [x] Add PartyCompositionPanel below overview (or in collapsible section)
- [x] Add selection controls bar
- [x] Pass appropriate props to all components

### Task 5.2: Update PartyTab Layout
- [x] Reorganize header to include overview panel
- [x] Ensure visual hierarchy: Overview → Controls → Grid
- [x] Consider collapsible sections for cleaner UI
- [x] Maintain existing functionality (search, sort, detail modal)

### Task 5.3: Empty States
- [x] Show appropriate message when no characters
- [x] Show message when no heroes selected for analysis
- [x] Show message when only 1 hero selected (need 2+ for meaningful analysis)

### Task 5.4: Loading States
- [x] Add loading state while analysis is calculating
- [x] Use skeleton components for stat cards
- [x] Smooth transitions when data updates

### Task 5.5: Responsive Design
- [x] Test on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1024px+)
- [ ] Adjust grid layouts for each breakpoint
- [ ] Consider hiding composition panel on mobile

---

## Phase 6: Testing & Documentation

### Task 6.1: Manual Testing
- [ ] Test with 0 characters
- [ ] Test with 1 character
- [ ] Test with 2-4 characters (typical party)
- [ ] Test with 10+ characters (large party)
- [ ] Test selection/deselection
- [ ] Test XP budget accuracy against engine docs

### Task 6.2: Edge Cases
- [ ] Handle characters with missing data
- [ ] Handle mixed game modes (standard + uncapped)
- [ ] Handle very high level parties (level 15+)
- [ ] Handle all same-class parties

### Task 6.3: Performance
- [ ] Verify memoization works correctly
- [ ] Ensure no unnecessary re-renders
- [ ] Test with 50+ characters

---

## File Structure

```
src/
├── components/
│   ├── Party/
│   │   ├── PartyOverviewPanel.tsx    # NEW
│   │   ├── PartyCompositionPanel.tsx # NEW
│   │   ├── PartyStatCard.tsx         # NEW (optional, if reusable)
│   │   └── index.ts                  # NEW exports
│   ├── Tabs/
│   │   └── PartyTab.tsx              # MODIFY
│   └── ui/
│       └── CharacterCard.tsx         # MODIFY (add selection props)
├── hooks/
│   └── usePartyAnalysis.ts           # NEW
└── components/Tabs/
    └── PartyTab.css                  # MODIFY (add new styles)
```

---

## Engine API Reference

### PartyAnalyzer Methods Used

```typescript
// Main analysis function
PartyAnalyzer.analyzeParty(characters: CharacterSheet[]): PartyAnalysis

// Individual methods (if needed)
PartyAnalyzer.calculatePartyLevel(characters: CharacterSheet[]): number
PartyAnalyzer.calculatePartyStrength(characters: CharacterSheet[]): number
PartyAnalyzer.getAverageAC(characters: CharacterSheet[]): number
PartyAnalyzer.getAverageHP(characters: CharacterSheet[]): number
PartyAnalyzer.getAverageDamage(characters: CharacterSheet[]): number
PartyAnalyzer.getXPBudget(characters: CharacterSheet[], difficulty: EncounterDifficulty): number
```

### PartyAnalysis Interface

```typescript
interface PartyAnalysis {
  averageLevel: number;      // Average party level
  partySize: number;         // Number of party members
  averageAC: number;         // Average armor class
  averageHP: number;         // Average hit points
  averageDamage: number;     // Estimated damage output
  totalStrength: number;     // Abstract strength score
  easyXP: number;            // XP budget for easy difficulty
  mediumXP: number;          // XP budget for medium difficulty
  hardXP: number;            // XP budget for hard difficulty
  deadlyXP: number;          // XP budget for deadly difficulty
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  👥 Party                              [Clear All]          │
│      12 characters                                          │
├─────────────────────────────────────────────────────────────┤
│  ═══════════════════ PARTY OVERVIEW ══════════════════════  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │ Avg Lvl │ │ Avg AC  │ │ Avg HP  │ │ Strength│ │ Damage ││
│  │   5     │ │   14    │ │   42    │ │  127    │ │  18    ││
│  │ 12/heroes│ │         │ │         │ │         │ │        ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                             │
│  ENCOUNTER THRESHOLDS (based on 8 selected heroes)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Easy    │ │ Medium   │ │  Hard    │ │  Deadly  │       │
│  │  400 XP  │ │  800 XP  │ │ 1,200 XP │ │ 1,600 XP │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  ══════════════════ PARTY COMPOSITION ════════════════════  │
│  Classes: ████████ Fighter (4)  ██████ Wizard (3)  ████... │
│  Roles:   ████████ Tank (4)     ██████ DPS (3)     ████... │
│  Quick Stats: Total HP: 336 | Highest AC: 18 | Casters: 5  │
├─────────────────────────────────────────────────────────────┤
│  [Select All] [Deselect All]    8 of 12 heroes selected    │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search...]                               [Sort by ▼]   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ ☑ Aragorn│ │ ☑ Legolas│ │ ☐ Gimli │ │ ☑ Gandalf│          │
│  │ Fighter  │ │ Ranger  │ │ Fighter │ │ Wizard  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ... more character cards ...                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Priority Order

1. **Phase 1** - Core infrastructure (foundation for everything)
2. **Phase 2** - Party Overview Panel (high impact, uses engine directly)
3. **Phase 3** - Hero Selection (enables focused analysis)
4. **Phase 4** - Party Composition (visual polish)
5. **Phase 5** - Integration & Polish (bring it all together)
6. **Phase 6** - Testing & Documentation (quality assurance)

---

## Notes

- The encounter generator button is **NOT** included in this plan per user request - it will be added to CombatSimulatorTab separately
- All XP budget calculations use D&D 5e official encounter building rules via the engine
- Selection state could be persisted to localStorage in the future if desired
- Consider adding a "compare" feature in the future to compare two party compositions
