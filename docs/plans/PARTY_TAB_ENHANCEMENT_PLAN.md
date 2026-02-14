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
- [ ] Add `PartyAnalyzer` import from `playlist-data-engine`
- [ ] Create TypeScript interface for `PartyAnalysis` result type
- [ ] Verify `PartyAnalyzer.analyzeParty()` returns expected data structure

### Task 1.2: Create Hero Selection State
- [ ] Add `selectedHeroSeeds: Set<string>` state to PartyTab
- [ ] Initialize with all character seeds (all selected by default)
- [ ] Create `toggleHeroSelection(seed: string)` function
- [ ] Create `selectAllHeroes()` function
- [ ] Create `deselectAllHeroes()` function

### Task 1.3: Create Party Analysis Hook
- [ ] Create `usePartyAnalysis.ts` hook in `src/hooks/`
- [ ] Accept `characters` and `selectedHeroSeeds` as parameters
- [ ] Filter characters by selection
- [ ] Call `PartyAnalyzer.analyzeParty()` with selected characters
- [ ] Memoize the result to prevent unnecessary recalculations
- [ ] Return analysis object or null if no characters selected

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
- [ ] Create `src/components/Party/PartyOverviewPanel.tsx`
- [ ] Accept `analysis` prop (PartyAnalysisResult | null)
- [ ] Accept `selectedCount` and `totalCount` props
- [ ] Show empty state when no heroes selected

### Task 2.2: Quick Stats Cards
- [ ] Create stat card grid layout (responsive)
- [ ] Implement individual stat cards:
  - [ ] **Average Level** - with party size subtitle
  - [ ] **Average AC** - armor class
  - [ ] **Average HP** - hit points
  - [ ] **Total Strength** - abstract power score
  - [ ] **Est. Damage** - average damage output

### Task 2.3: XP Budget Display
- [ ] Create XP budget section showing encounter difficulty thresholds
- [ ] Display Easy/Medium/Hard/Deadly XP values
- [ ] Add tooltips explaining what XP budgets mean
- [ ] Use color coding for difficulty levels (green → red)

### Task 2.4: Party Overview CSS
- [ ] Add CSS styles for overview panel in `PartyTab.css`
- [ ] Style stat cards with hover effects
- [ ] Style XP budget section with difficulty colors
- [ ] Ensure responsive layout for mobile/tablet/desktop

---

## Phase 3: Hero Selection UI

### Task 3.1: Selection Checkbox on Character Cards
- [ ] Modify `CharacterCard` component to accept selection props:
  - [ ] `isSelected: boolean`
  - [ ] `onToggleSelection: () => void`
  - [ ] `selectionMode: boolean` (show/hide checkbox)
- [ ] Add checkbox overlay to card (top-left corner)
- [ ] Style selected vs unselected cards differently
- [ ] Ensure selection doesn't interfere with click-to-view-details

### Task 3.2: Selection Controls Bar
- [ ] Add selection controls bar above the character grid
- [ ] Include "Select All" button
- [ ] Include "Deselect All" button
- [ ] Show count: "X of Y heroes selected for analysis"
- [ ] Only show when there are 2+ characters

### Task 3.3: Selection State Persistence
- [ ] Consider if selection should persist across tab changes (optional)
- [ ] Reset selection when characters are cleared
- [ ] Auto-select new characters when added to party (default behavior)

---

## Phase 4: Party Composition Visualization

### Task 4.1: Create PartyCompositionPanel Component
- [ ] Create `src/components/Party/PartyCompositionPanel.tsx`
- [ ] Accept `characters` and `selectedSeeds` props
- [ ] Calculate composition data from selected characters

### Task 4.2: Class Distribution
- [ ] Count characters by class (Fighter, Wizard, Rogue, etc.)
- [ ] Display as horizontal bar chart or donut chart
- [ ] Show class icons/emojis if available
- [ ] Show percentage for each class

### Task 4.3: Role Distribution
- [ ] Determine character roles based on class:
  - [ ] **Tank** - Fighter, Paladin, Barbarian (high AC/HP)
  - [ ] **DPS** - Rogue, Ranger, Monk (high damage)
  - [ ] **Caster** - Wizard, Sorcerer, Warlock (spell-focused)
  - [ ] **Support** - Cleric, Bard, Druid (healing/utility)
- [ ] Display role breakdown with icons
- [ ] Show role balance indicator (balanced vs unbalanced)

### Task 4.4: Quick Stats Row
- [ ] Total HP pool
- [ ] Highest AC in party
- [ ] Lowest AC in party
- [ ] Spellcaster count
- [ ] Average speed

### Task 4.5: Composition CSS
- [ ] Add CSS styles for composition panel
- [ ] Style class/role distribution charts
- [ ] Use consistent color palette with existing design
- [ ] Add smooth animations for data changes

---

## Phase 5: Integration & Polish

### Task 5.1: Integrate Components into PartyTab
- [ ] Add PartyOverviewPanel above the character grid
- [ ] Add PartyCompositionPanel below overview (or in collapsible section)
- [ ] Add selection controls bar
- [ ] Pass appropriate props to all components

### Task 5.2: Update PartyTab Layout
- [ ] Reorganize header to include overview panel
- [ ] Ensure visual hierarchy: Overview → Controls → Grid
- [ ] Consider collapsible sections for cleaner UI
- [ ] Maintain existing functionality (search, sort, detail modal)

### Task 5.3: Empty States
- [ ] Show appropriate message when no characters
- [ ] Show message when no heroes selected for analysis
- [ ] Show message when only 1 hero selected (need 2+ for meaningful analysis)

### Task 5.4: Loading States
- [ ] Add loading state while analysis is calculating
- [ ] Use skeleton components for stat cards
- [ ] Smooth transitions when data updates

### Task 5.5: Responsive Design
- [ ] Test on mobile (375px)
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
