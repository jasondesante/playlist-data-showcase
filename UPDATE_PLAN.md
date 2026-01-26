# Update Plan: Demo Project for New Playlist Data Engine Features

**Created:** 2026-01-26
**Status:** Ready for Implementation
**Engine Version:** Latest (with game modes, stat management, addXP features)

---

## Executive Summary

The playlist data engine has been significantly updated with new features around game modes, stat management, and XP handling. This demo project needs updates to showcase these new capabilities.

**User Requirements:**
- Add game mode selector UI (standard vs uncapped)
- Add quest/boss completion simulation buttons for XP
- Combat tab should reward XP to characters
- Pending stat increases with "Apply" button (modal dialog for stat selection)
- Add README.md and consolidate/optimize documentation
- **NEW:** StatManager strategy selector (per-character, in Leveling Tab)
- **NEW:** Pending badge always visible (not dismissible)

---

## Phase 1: Data Engine Integration Updates

**Goal:** Update hooks and stores to use new data engine APIs properly.

### Task 1.1: Update `useCharacterGenerator` Hook
**File:** `src/hooks/useCharacterGenerator.ts`
**Lines:** 35-39

- [x] 1.1.1 - Add `gameMode?: 'standard' | 'uncapped'` parameter to the `generateCharacter` function
- [x] 1.1.2 - Import `GameMode` and `CharacterGeneratorOptions` types from `'playlist-data-engine'`
- [x] 1.1.3 - Update the `CharacterGenerator.generate()` call to include options object:
  ```typescript
  const character = CharacterGenerator.generate(
      seed || `seed-${Date.now()}`,
      audioProfile,
      `Hero-${Date.now().toString().slice(-4)}`,
      { gameMode: gameMode || 'uncapped' }
  );
  ```
- [x] 1.1.4 - Update hook return type to include `GameMode` if needed
- [x] 1.1.5 - Add JSDoc comment explaining the `gameMode` parameter
- [x] 1.1.6 - Test: Generate a character with `gameMode: 'standard'` and verify stats cap at 20
- [x] 1.1.7 - Test: Generate a character with `gameMode: 'uncapped'` and verify stats can exceed 20

---

### Task 1.2: Add `addXP()` Method to `useCharacterUpdater` Hook
**File:** `src/hooks/useCharacterUpdater.ts`

- [x] 1.2.1 - Import `Omit` and `CharacterUpdateResult` types from engine
- [x] 1.2.2 - Add new method `addXPFromSource` with signature:
  ```typescript
  addXPFromSource: (
      character: CharacterSheet,
      amount: number,
      source?: string
  ) => Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'>
  ```
- [x] 1.2.3 - Implement the method using `updater.addXP(character, amount, source)`
- [x] 1.2.4 - Update the returned character in the store
- [x] 1.2.5 - Return the full result including `levelUpDetails`
- [x] 1.2.6 - Add the method to the hook's return object
- [x] 1.2.7 - Add JSDoc comment explaining valid source strings: `'combat'`, `'quest'`, `'boss_defeat'`, `'exploration'`, `'crafting'`, `'social'`, etc.
- [x] 1.2.8 - Test: Call `addXPFromSource` with `'quest'` source and verify XP is added
- [x] 1.2.9 - Test: Verify `levelUpDetails` are returned when character levels up

---

### Task 1.3: Add `applyPendingStatIncrease` Method to Hook
**File:** `src/hooks/useCharacterUpdater.ts`

- [x] 1.3.1 - Import `Ability` type from `'playlist-data-engine'`
- [x] 1.3.2 - Add new method `applyPendingStatIncrease` with signature:
  ```typescript
  applyPendingStatIncrease: (
      character: CharacterSheet,
      primaryStat: Ability,
      secondaryStats?: Ability[]
  ) => { character: CharacterSheet; statIncreases: Array<{...}>; remainingPending: number }
  ```
- [x] 1.3.3 - Implement using `updater.applyPendingStatIncrease(character, primaryStat, secondaryStats)`
- [x] 1.3.4 - Update the returned character in the store
- [x] 1.3.5 - Return the full result with stat changes
- [x] 1.3.6 - Add the method to the hook's return object
- [x] 1.3.7 - Add JSDoc comment explaining D&D 5e stat increase rules (+2 to one OR +1 to two)
- [x] 1.3.8 - Test: Apply pending stat increase with single stat
- [x] 1.3.9 - Test: Apply pending stat increase with two stats

---

### Task 1.4: Update `characterStore` for New Properties
**File:** `src/store/characterStore.ts`

- [x] 1.4.1 - Verify `CharacterSheet` type includes `pendingStatIncreases?: number`
- [x] 1.4.2 - Verify `CharacterSheet` type includes `gameMode?: GameMode`
- [x] 1.4.3 - Verify `CharacterSheet` type includes `statStrategy?: StatIncreaseStrategyType` (for per-character strategy)
- [x] 1.4.4 - Add `getPendingStatIncreaseCount(id: string): number` selector method
- [x] 1.4.5 - Add `hasPendingStatIncreases(id: string): boolean` selector method
- [x] 1.4.6 - Verify `persist` middleware configuration saves new properties
- [x] 1.4.7 - Test: Create a character and verify `gameMode` is persisted
- [x] 1.4.8 - Test: Level up a standard mode character and verify `pendingStatIncreases` is saved
- [x] 1.4.9 - Test: Change stat strategy and verify it's persisted to character sheet

---

## Phase 2: Game Mode Selection

**Goal:** Add UI for users to choose between standard and uncapped game modes.

### Task 2.1: Create Game Mode Toggle Component
**New File:** `src/components/ui/GameModeToggle.tsx`

- [x] 2.1.1 - Create new component file with TypeScript
- [x] 2.1.2 - Define props interface:
  ```typescript
  interface GameModeToggleProps {
      value: 'standard' | 'uncapped';
      onChange: (mode: 'standard' | 'uncapped') => void;
  }
  ```
- [x] 2.1.3 - Import Lucide icons: `Shield`, `TrendingUp`, `Info`
- [x] 2.1.4 - Create radio button group with two options
- [x] 2.1.5 - Add labels:
  - **Standard Mode**: "Stats cap at 20, manual selection"
  - **Uncapped Mode**: "Unlimited stats, automatic increases"
- [x] 2.1.6 - Add info icon with tooltip explaining differences
- [x] 2.1.7 - Style with CSS (follow existing component patterns)
- [x] 2.1.8 - Add component to UI exports
- [x] 2.1.9 - Create `GameModeToggle.css` for component-specific styles
- [x] 2.1.10 - Test: Verify toggle switches between modes
- [x] 2.1.11 - Test: Verify `onChange` callback is called with correct value

---

### Task 2.2: Integrate Game Mode Toggle into Character Gen Tab
**File:** `src/components/Tabs/CharacterGenTab.tsx`
**Location:** Above the "Generate Character" button (around line 44)

- [x] 2.2.1 - Import `GameModeToggle` component
- [x] 2.2.2 - Add state for `gameMode` with default `'uncapped'`
- [x] 2.2.3 - Add handler for game mode changes
- [x] 2.2.4 - Pass `gameMode` to `useCharacterGenerator` hook
- [x] 2.2.5 - Render `GameModeToggle` component above generate button
- [x] 2.2.6 - Update `handleGenerate` to use current `gameMode` state
- [x] 2.2.7 - Test: Generate character with standard mode selected
- [x] 2.2.8 - Test: Generate character with uncapped mode selected
- [x] 2.2.9 - Test: Verify generated character has correct `gameMode` property

---

### Task 2.3: Add Game Mode Badge to Character Display
**File:** `src/components/Tabs/CharacterGenTab.tsx`
**Location:** In the character sheet header section

- [x] 2.3.1 - Find character display section (after line ~150)
- [x] 2.3.2 - Add conditional rendering for game mode badge
- [x] 2.3.3 - Create badge styles:
  - **STANDARD**: Gray background, "STATS CAPPED @ 20"
  - **UNCAPPED**: Purple background, "UNLIMITED PROGRESSION"
- [x] 2.3.4 - Add tooltip on hover with full description
- [x] 2.3.5 - Test: Verify badge shows correct mode for standard characters
- [x] 2.3.6 - Test: Verify badge shows correct mode for uncapped characters
- [x] 2.3.7 - Test: Verify tooltip displays on hover

---

### Task 2.4: Update Party Tab with Game Mode Badges
**File:** `src/components/Tabs/PartyTab.tsx`

- [x] 2.4.1 - Find character card rendering logic
- [x] 2.4.2 - Add game mode badge to each character card
- [x] 2.4.3 - Position badge in corner of card (top-right)
- [x] 2.4.4 - Use same badge styles from CharacterGenTab
- [x] 2.4.5 - Add visual indicator for stat cap warning (standard mode near cap)
- [x] 2.4.6 - Test: Verify badges appear on all character cards
- [x] 2.4.7 - Test: Verify badges use correct colors for each mode

---

## Phase 3: XP Sources & Level-Up Improvements

**Goal:** Showcase the new `addXP()` method with different XP sources and display detailed level-up information.

### Task 3.1: Add XP Source Buttons to Leveling Tab
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`
**Location:** Below existing manual XP buttons (around line 235)

- [x] 3.1.1 - Locate the manual XP input section
- [x] 3.1.2 - Create new section header: "XP Sources (Simulate Activities)"
- [x] 3.1.3 - Add "Complete Quest" button (+500 XP, source: `'quest'`)
- [x] 3.1.4 - Add "Defeat Boss" button (+5,000 XP, source: `'boss_defeat'`)
- [x] 3.1.5 - Add "Exploration" button (+250 XP, source: `'exploration'`)
- [x] 3.1.6 - Style buttons differently from manual XP buttons (maybe blue/green theme)
- [x] 3.1.7 - Add click handlers for each button using `addXPFromSource`
- [x] 3.1.8 - Add loading state while processing XP
- [x] 3.1.9 - Add success toast notification when XP is added
- [x] 3.1.10 - Test: Click each button and verify XP is added
- [x] 3.1.11 - Test: Verify correct source is used for each button
- [x] 3.1.12 - Test: Verify toast notifications appear

---

### Task 3.2: Create Level-Up Detail Modal Component
**New File:** `src/components/LevelUpDetailModal.tsx`

- [x] 3.2.1 - Create new component file with TypeScript
- [x] 3.2.2 - Define props interface:
  ```typescript
  interface LevelUpDetailModalProps {
      levelUpDetails: LevelUpDetail[];
      isOpen: boolean;
      onClose: () => void;
  }
  ```
- [x] 3.2.3 - Import types: `LevelUpDetail` from `'playlist-data-engine'`
- [x] 3.2.4 - Import icons: `Heart`, `Shield`, `TrendingUp`, `Wand2`, `Star`
- [x] 3.2.5 - Create modal overlay with backdrop blur
- [x] 3.2.6 - Add celebration animation on open (confetti or similar, use existing patterns if available)
- [x] 3.2.7 - Display "LEVEL UP!" header with emoji
- [x] 3.2.8 - Loop through `levelUpDetails` array and display each:
  - [x] 3.2.8.1 - Level range: "Level 3 → Level 4"
  - [x] 3.2.8.2 - HP increase with Heart icon: "HP: +7 (new max: 32)"
  - [x] 3.2.8.3 - Proficiency bonus with Shield icon (if increased)
  - [x] 3.2.8.4 - Stat increases with TrendingUp icon (if any)
  - [x] 3.2.8.5 - New features with Star icon (if any)
- [x] 3.2.9 - Add "Continue" button to close modal
- [x] 3.2.10 - Style with CSS (purple/gold theme for celebration)
- [x] 3.2.11 - Test: Show modal for single level-up
- [x] 3.2.12 - Test: Show modal for multi-level-up (boss defeat)
- [x] 3.2.13 - Test: Verify all details display correctly

---

### Task 3.3: Integrate Level-Up Detail Modal into Leveling Tab
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`

- [x] 3.3.1 - Import `LevelUpDetailModal` component
- [x] 3.3.2 - Add state for `showLevelUpModal: boolean`
- [x] 3.3.3 - Add state for `levelUpDetails: LevelUpDetail[]`
- [x] 3.3.4 - Update `addXP` function to capture `levelUpDetails` from result
- [x] 3.3.5 - When `leveledUp` is true, set modal state and details
- [x] 3.3.6 - Render `LevelUpDetailModal` component
- [x] 3.3.7 - Pass `isOpen`, `levelUpDetails`, and `onClose` props
- [x] 3.3.8 - Test: Trigger level-up and verify modal appears
- [x] 3.3.9 - Test: Verify details are accurate (HP, stats, features)
- [x] 3.3.10 - Test: Close modal and verify state resets

---

### Task 3.4: Award XP in Combat Simulator
**File:** `src/components/Tabs/CombatSimulatorTab.tsx`
**Location:** After victory overlay (around line 774)

- [x] 3.4.1 - Import `useCharacterUpdater` hook
- [x] 3.4.2 - Import `useCharacterStore` to get active character
- [x] 3.4.3 - Add `useEffect` that triggers when `combatResult` changes
- [x] 3.4.4 - Check if `combatResult` exists and active character exists
- [x] 3.4.5 - Call `addXPFromSource(activeChar, combatResult.xpAwarded, 'combat')`
- [x] 3.4.6 - Add success toast: "Character received {XP} XP from combat!"
- [x] 3.4.7 - If `leveledUp`, show notification or trigger level-up modal
- [x] 3.4.8 - Add loading state during XP award
- [x] 3.4.9 - Update victory overlay to show "XP Awarded to: {Character Name}"
- [x] 3.4.10 - Test: Complete combat and verify XP is awarded
- [x] 3.4.11 - Test: Verify combat XP source is tracked correctly
- [x] 3.4.12 - Test: Verify level-up modal appears if threshold reached

---

## Phase 4: Stat Management UI

**Goal:** Add UI for managing pending stat increases in standard mode.

### Task 4.1: Add Pending Stat Increases Badge
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`
**Location:** In character stats header section

- [x] 4.1.1 - Import helper functions from characterStore or create local:
  - `getPendingStatIncreaseCount(character)`
  - `hasPendingStatIncreases(character)`
- [x] 4.1.2 - Add conditional rendering: only show if `pendingStatIncreases > 0`
- [x] 4.1.3 - Create warning badge with yellow/orange background and pulse animation
- [x] 4.1.4 - Display text: "⚠️ Pending Stat Increases: {count}"
- [x] 4.1.5 - Add "Apply Stat Increases" button below badge
- [x] 4.1.6 - Style button to stand out (primary color, pulse animation)
- [x] 4.1.7 - Only show badge/button for `gameMode === 'standard'`
- [x] 4.1.8 - Add tooltip explaining pending stat increases
- [x] 4.1.9 - **Badge is always visible when pending (not dismissible)**
- [x] 4.1.10 - Test: Level up standard mode character to level 4 and verify badge appears
- [x] 4.1.11 - Test: Verify badge count is correct
- [x] 4.1.12 - Test: Verify uncapped mode doesn't show badge

---

### Task 4.2: Create Stat Selection Modal Component
**New File:** `src/components/StatSelectionModal.tsx`

**Note:** User chose modal dialog pattern for stat selection interface.

- [x] 4.2.1 - Create new component file with TypeScript
- [x] 4.2.2 - Define props interface:
  ```typescript
  interface StatSelectionModalProps {
      isOpen: boolean;
      pendingCount: number;
      onApply: (primaryStat: Ability, secondaryStats?: Ability[]) => void;
      onCancel: () => void;
  }
  ```
- [x] 4.2.3 - Import `Ability` type from `'playlist-data-engine'`
- [x] 4.2.4 - Create modal with backdrop
- [x] 4.2.5 - Display header: "Apply Stat Increases"
- [x] 4.2.6 - Display info text: "You have {pendingCount} pending stat increases"
- [x] 4.2.7 - Create two option sections:
  - [x] 4.2.7.1 - **Option 1**: "+2 to one ability"
    - [x] Add 6 buttons: [STR] [DEX] [CON] [INT] [WIS] [CHA]
    - [x] Single selection mode
  - [x] 4.2.7.2 - **Option 2**: "+1 to two abilities"
    - [x] Add 6 buttons: [STR] [DEX] [CON] [INT] [WIS] [CHA]
    - [x] Multi-selection mode (max 2)
- [x] 4.2.8 - Add state for selected stats
- [x] 4.2.9 - Add state for selection mode (single vs double)
- [x] 4.2.10 - Add validation: Show error if invalid selection
- [x] 4.2.11 - Add "Cancel" button (closes modal without applying)
- [x] 4.2.12 - Add "Apply Increases" button (disabled if invalid selection)
- [x] 4.2.13 - Style buttons with hover effects and selection states
- [x] 4.2.14 - Add current stat values next to each button for reference
- [x] 4.2.15 - Test: Open modal and verify UI displays correctly
- [x] 4.2.16 - Test: Select single stat and verify validation passes
- [x] 4.2.17 - Test: Select two stats and verify validation passes
- [x] 4.2.18 - Test: Select 3 stats and verify validation fails
- [x] 4.2.19 - Test: Cancel and verify no changes applied
- [x] 4.2.20 - Test: Apply and verify stats are increased

---

### Task 4.3: Integrate Stat Selection Modal into Leveling Tab
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`

- [x] 4.3.1 - Import `StatSelectionModal` component
- [x] 4.3.2 - Import `Ability` type from `'playlist-data-engine'`
- [x] 4.3.3 - Add state for `showStatModal: boolean`
- [x] 4.3.4 - Add handler for opening stat modal (from "Apply Stat Increases" button)
- [x] 4.3.5 - Add handler for applying stat increases:
  ```typescript
  const handleApplyStats = (primary: Ability, secondary?: Ability[]) => {
      const result = applyPendingStatIncrease(activeChar, primary, secondary);
      // Show success notification
      // Update character in store
  }
  ```
- [x] 4.3.6 - Add handler for canceling stat modal
- [x] 4.3.7 - Render `StatSelectionModal` component with proper props
- [x] 4.3.8 - Pass `pendingCount` from `character.pendingStatIncreases`
- [x] 4.3.9 - Test: Click "Apply Stat Increases" and verify modal opens
- [x] 4.3.10 - Test: Apply stats and verify character is updated
- [x] 4.3.11 - Test: Verify pending count decreases after applying
- [x] 4.3.12 - Test: Verify success notification shows stat changes

---

### Task 4.4: Add StatManager Strategy Selector
**New File:** `src/components/ui/StatStrategySelector.tsx`

**Note:** StatManager strategy determines how stats are automatically increased on level-up. Different strategies suit different playstyles.

- [x] 4.4.1 - Create new component file with TypeScript
- [x] 4.4.2 - Import `StatIncreaseStrategyType` from `'playlist-data-engine'`
- [x] 4.4.3 - Define props interface:
  ```typescript
  interface StatStrategySelectorProps {
      value: StatIncreaseStrategyType;
      onChange: (strategy: StatIncreaseStrategyType) => void;
      disabled?: boolean;
  }
  ```
- [x] 4.4.4 - Import Lucide icons: `Settings`, `Zap`, `Shield`, `TrendingUp`, `Dice1`
- [x] 4.4.5 - Create dropdown/select component with options:
  - [x] **Manual D&D 5e** (`'dnD5e'`) - 2-step level-up, you choose stats manually
  - [x] **Smart Auto** (`'dnD5e_smart'`) - Intelligently picks best stats based on class
  - [x] **Balanced** (`'balanced'`) - +1 to two lowest stats each time
  - [x] **Primary Only** (`'primary_only'`) - Always boosts class's primary stat
  - [x] **Random** (`'random'`) - Random stat selection each level-up
- [x] 4.4.6 - Add descriptions/tooltip for each strategy:
  - [x] Manual: "Standard D&D 5e - choose +2 to one stat or +1 to two"
  - [x] Smart: "AI picks optimal stats for your class automatically"
  - [x] Balanced: "Distributes evenly across your lowest stats"
  - [x] Primary: "Always maximizes your class's main ability"
  - [x] Random: "Rolls the dice for unpredictable builds"
- [x] 4.4.7 - Add visual indicator showing currently active strategy
- [x] 4.4.8 - Style with CSS
- [x] 4.4.9 - Add to UI exports
- [x] 4.4.10 - Test: Verify dropdown shows all 5 strategies
- [x] 4.4.11 - Test: Verify changing strategy updates `CharacterUpdater` configuration

---

### Task 4.5: Update `useCharacterUpdater` Hook for StatManager Strategy
**File:** `src/hooks/useCharacterUpdater.ts`

**Note:** The `StatManager` class supports runtime strategy changes via `updateConfig()`. The hook should expose a method to change strategy without recreating the `CharacterUpdater` instance.

- [x] 4.5.1 - Import `StatIncreaseStrategyType` and `StatManager` from `'playlist-data-engine'`
- [x] 4.5.2 - Create `StatManager` instance in hook (outside useMemo, single instance):
  ```typescript
  const statManager = new StatManager({ strategy: 'dnD5e_smart' });
  ```
- [x] 4.5.3 - Pass `statManager` to `CharacterUpdater` constructor (existing code, verify it's there)
- [x] 4.5.4 - Add method to hook return: `updateStatStrategy: (strategy: StatIncreaseStrategyType) => void`
- [x] 4.5.5 - Implement method to call `statManager.updateConfig({ strategy })`
- [x] 4.5.6 - Add JSDoc explaining that strategy changes affect future level-ups only
- [x] 4.5.7 - Test: Verify hook works with default strategy
- [x] 4.5.8 - Test: Call `updateStatStrategy()` and verify subsequent level-ups use new strategy
- [x] 4.5.9 - Test: Verify strategy change doesn't break existing methods or pending stat increases

---

### Task 4.6: Integrate StatStrategySelector UI into Leveling Tab
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`
**Location:** In settings section near top of tab

**Note:** Strategy is per-character and stored on the character sheet. The `useCharacterUpdater` hook from Task 4.5 exposes an `updateStatStrategy()` method for runtime changes.

- [x] 4.6.1 - Import `StatStrategySelector` component
- [x] 4.6.2 - Import `StatIncreaseStrategyType` from `'playlist-data-engine'`
- [x] 4.6.3 - Add state for `statStrategy: StatIncreaseStrategyType` with default `'dnD5e_smart'`
- [x] 4.6.4 - Load strategy from active character (if set, otherwise use default) using `useEffect`
- [x] 4.6.5 - Add handler for strategy changes:
  ```typescript
  const handleStrategyChange = (strategy: StatIncreaseStrategyType) => {
      setStatStrategy(strategy);
      updateStatStrategy(strategy); // Call hook method to update StatManager
      // Update the active character's statStrategy property
      if (activeChar) {
          updateCharacter({ ...activeChar, statStrategy: strategy });
      }
  };
  ```
- [x] 4.6.6 - Render `StatStrategySelector` in settings area (Leveling Tab only)
- [x] 4.6.7 - Add info text: "Strategy is saved per-character and affects future level-ups"
- [x] 4.6.8 - Add note: "Changing strategy won't affect existing pending stat increases"
- [x] 4.6.9 - Test: Change strategy and verify it saves to character sheet
- [x] 4.6.10 - Test: Verify strategy persists after page refresh
- [x] 4.6.11 - Test: Verify `'dnD5e'` strategy creates pending stat increases
- [x] 4.6.12 - Test: Verify `'dnD5e_smart'` strategy applies stats automatically
- [x] 4.6.13 - Test: Verify other strategies apply correct stat patterns

---

### Task 4.7: Add Auto-Apply Notification for Uncapped Mode
**File:** `src/components/Tabs/CharacterLevelingTab.tsx`

- [x] 4.7.1 - Add check for `character.gameMode === 'uncapped'` in level-up handler
- [x] 4.7.2 - When uncapped mode levels up with stat increases, show notification
- [x] 4.7.3 - Format notification: "📊 Stats auto-increased: {STAT} +{delta} ({old} → {new})"
- [x] 4.7.4 - For multiple stats, show all in list format
- [x] 4.7.5 - Use different toast style (blue instead of yellow)
- [x] 4.7.6 - Test: Level up uncapped character and verify notification appears
- [x] 4.7.7 - Test: Verify notification shows correct stat values
- [x] 4.7.8 - Test: Verify no pending stat badge appears for uncapped mode

---

## Phase 5: Create New Documentation

**Goal:** Create new documentation files and structure.

### Task 5.1: Create Root README.md
**New File:** `/README.md`

- [x] 5.1.1 - Create new README.md file at root
- [x] 5.1.2 - Add project title and description
- [x] 5.1.3 - Add "Quick Start" section with 3 steps:
  - [x] Clone and install: `npm install`
  - [x] Start dev server: `npm run dev`
  - [x] Open browser to localhost:5173
- [x] 5.1.4 - Add "What This Demo Showcases" section with feature list:
  - [x] Playlist parsing from Arweave
  - [x] Audio analysis and character generation
  - [x] D&D 5e combat simulation
  - [x] Environmental sensor integration
  - [x] XP system with multipliers
  - [x] **NEW:** Game mode selection (standard/uncapped)
  - [x] **NEW:** Multiple XP sources (combat, quests, exploration)
  - [x] **NEW:** Detailed level-up breakdowns
  - [x] **NEW:** Stat management system
- [x] 5.1.5 - Add "Documentation" section with links:
  - [x] [ARCHITECTURE.md](./ARCHITECTURE.md)
  - [x] [CONTRIBUTING.md](./CONTRIBUTING.md)
  - [x] [docs/](./docs/) (after consolidation)
- [x] 5.1.6 - Add "Data Engine Docs" section:
  - [x] [Data Engine Reference](./DESIGN_DOCS/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md)
  - [x] [Usage Examples](./DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md)
- [x] 5.1.7 - Add "Quick Tour" section listing all tabs
- [x] 5.1.8 - Add "License" section (MIT)
- [x] 5.1.9 - Add badges: TypeScript, React, Vite
- [x] 5.1.10 - Test: Verify README renders correctly on GitHub
- [x] 5.1.11 - Test: Verify all links work
- [x] 5.1.12 - Test: Verify formatting is clean

---

### Task 5.2: Create Documentation Directory Structure
**Directory:** `/docs/`

- [x] 5.2.1 - Create `/docs/` directory at root
- [x] 5.2.2 - Create `/docs/architecture/` directory
- [x] 5.2.3 - Create `/docs/development/` directory
- [x] 5.2.4 - Create `/docs/development/testing/` directory
- [x] 5.2.5 - Create `/docs/design/` directory
- [x] 5.2.6 - Create `/docs/engine/` directory
- [x] 5.2.7 - Verify all directories are created

---

### Task 5.3: Create Documentation Index
**New File:** `/docs/index.md`

- [x] 5.3.1 - Create `/docs/index.md` file
- [x] 5.3.2 - Add "# Documentation" header
- [x] 5.3.3 - Add "## Getting Started" section:
  - [x] [Quick Start](./getting-started.md) - 5-minute walkthrough
  - [x] [Architecture Overview](./architecture/overview.md) - System design
- [x] 5.3.4 - Add "## Development" section:
  - [x] [Contributing Guide](./development/contributing.md) - PR workflow, coding standards
  - [x] [Debugging Guide](./development/debugging.md) - Troubleshooting
- [x] 5.3.5 - Add "## Testing" section:
  - [x] [Smoke Tests](./development/testing/smoke-tests.md)
  - [x] [Determinism Testing](./development/testing/determinism.md)
  - [x] [Performance Testing](./development/testing/performance.md)
  - [x] [Mobile Sensors](./development/testing/mobile-sensors.md)
- [x] 5.3.6 - Add "## Design" section:
  - [x] [CSS Optimization](./design/css-optimization.md) - CSS architecture plan
  - [x] [Bug Tracker](./design/bugs-to-fix.md) - Known issues
- [x] 5.3.7 - Add "## Data Engine" section:
  - [x] [API Reference](./engine/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md)
  - [x] [Usage Examples](./engine/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md)
- [x] 5.3.8 - Test: Verify all links resolve correctly

---

### Task 5.4: Create Quick Start Guide
**New File:** `/docs/getting-started.md`

- [x] 5.4.1 - Create `/docs/getting-started.md` file
- [x] 5.4.2 - Add "# Quick Start Guide" header
- [x] 5.4.3 - Add "## Prerequisites" section (Node.js 18+, npm)
- [x] 5.4.4 - Add "## Installation" section with commands
- [x] 5.4.5 - Add "## Running the Demo" section
- [x] 5.4.6 - Add "## 5-Minute Walkthrough" section:
  - [x] Step 1: Load a playlist
  - [x] Step 2: Analyze audio
  - [x] Step 3: Generate a character
  - [x] Step 4: Run a combat
  - [x] Step 5: Check level-up details
- [x] 5.4.7 - Add "## Next Steps" section linking to full docs
- [x] 5.4.8 - Test: Follow the guide from scratch

---

## Phase 6: Testing & Verification

**Goal:** Ensure all new features work correctly.

### Task 6.1: Test Game Mode Selection
**Location:** CharacterGenTab and PartyTab

- [x] 6.1.1 - Test: Generate character in standard mode
  - [x] Verify `gameMode` property is `'standard'`
  - [x] Verify stats initialize with cap of 20
  - [x] Verify character sheet displays correctly
- [x] 6.1.2 - Test: Generate character in uncapped mode
  - [x] Verify `gameMode` property is `'uncapped'`
  - [x] Verify stats can exceed 20
  - [x] Verify character sheet displays correctly
- [x] 6.1.3 - Test: Toggle between modes and regenerate
  - [x] Verify different modes produce different characters
- [x] 6.1.4 - Test: Verify game mode badges display correctly
  - [x] Standard badge shows on standard characters
  - [x] Uncapped badge shows on uncapped characters
- [x] 6.1.5 - Test: Verify party tab shows badges on all cards
- [x] 6.1.6 - Test: Verify tooltips explain mode differences

---

### Task 6.2: Test XP Sources
**Location:** CharacterLevelingTab and CombatSimulatorTab

- [x] 6.2.1 - Test: Quest completion button
  - [x] Click "Complete Quest" (+500 XP)
  - [x] Verify XP is added to character
  - [x] Verify source is tracked as `'quest'`
  - [x] Verify success notification appears
- [x] 6.2.2 - Test: Boss defeat button
  - [x] Click "Defeat Boss" (+5,000 XP)
  - [x] Verify XP is added to character
  - [x] Verify source is tracked as `'boss_defeat'`
  - [x] Verify multi-level-up is handled correctly
  - [x] Verify level-up detail modal shows all levels
- [x] 6.2.3 - Test: Exploration button
  - [x] Click "Exploration" (+250 XP)
  - [x] Verify XP is added to character
  - [x] Verify source is tracked as `'exploration'`
- [x] 6.2.4 - Test: Combat XP award
  - [x] Complete a combat in Combat Simulator
  - [x] Verify XP is awarded to active character
  - [x] Verify source is tracked as `'combat'`
  - [x] Verify notification shows XP amount
- [x] 6.2.5 - Test: XP threshold tracking
  - [x] Add XP incrementally and verify thresholds work
  - [x] Verify `xp.next_level` updates correctly

---

### Task 6.3: Test Level-Up Details
**Location:** LevelUpDetailModal

- [x] 6.3.1 - Test: Single level-up
  - [x] Trigger level-up (e.g., level 3 → 4)
  - [x] Verify modal appears
  - [x] Verify HP increase is displayed correctly
  - [x] Verify proficiency bonus is displayed (if increased)
  - [x] Verify stat increases are displayed (if any)
  - [x] Verify new features are listed (if any)
- [x] 6.3.2 - Test: Multi-level-up
  - [x] Add large XP amount (e.g., boss defeat)
  - [x] Verify modal shows all level-ups
  - [x] Verify each level-up has correct details
- [x] 6.3.3 - Test: HP increases every level
  - [x] Level up multiple times
  - [x] Verify HP increases each time (not just at stat increase levels)
- [x] 6.3.4 - Test: Stat increases only at correct levels (standard mode)
  - [x] Level to 4, 8, 12, 16, 19
  - [x] Verify pending stat increases appear
  - [x] Level to other levels (5, 6, 7, etc.)
  - [x] Verify no stat increases at those levels
  - **Note:** Requires user to select "Manual D&D 5e" strategy in StatStrategySelector before testing

---

### Task 6.4: Test Stat Management
**Location:** StatSelectionModal

- [x] 6.4.1 - Test: Pending stat badge appears
  - [x] Level standard mode character to 4
  - [x] Verify "Pending Stat Increases: 1" badge appears
  - [x] Verify "Apply Stat Increases" button is shown
- [x] 6.4.2 - Test: Stat selection modal opens
  - [x] Click "Apply Stat Increases" button
  - [x] Verify modal appears with correct pending count
  - [x] Verify all 6 stat buttons are shown
  - [x] Verify current stat values are displayed
- [x] 6.4.3 - Test: Single stat selection
  - [x] Click one stat button (e.g., STR)
  - [x] Verify "Apply Increases" button is enabled
  - [x] Click apply
  - [x] Verify stat increases by +2
  - [x] Verify pending count decreases
  - [x] Verify success notification appears
- [x] 6.4.4 - Test: Two stat selection
  - [x] Select "Option 2" mode
  - [x] Click two stat buttons (e.g., STR and DEX)
  - [x] Verify "Apply Increases" button is enabled
  - [x] Click apply
  - [x] Verify both stats increase by +1
  - [x] Verify pending count decreases
- [x] 6.4.5 - Test: Invalid selection handling
  - [x] Try to apply with 0 stats selected
  - [x] Verify error message appears
  - [x] Try to select 3 stats in double mode
  - [x] Verify third selection is rejected or shows error
- [x] 6.4.6 - Test: Cancel functionality
  - [x] Open modal
  - [x] Select stats
  - [x] Click cancel
  - [x] Verify modal closes
  - [x] Verify no changes applied
  - [x] Verify pending count is unchanged
- [x] 6.4.7 - Test: Uncapped mode auto-applies
  - [x] Level uncapped character
  - [x] Verify no pending stat badge appears
  - [x] Verify auto-apply notification appears
  - [x] Verify stats are increased automatically

---

### Task 6.5: Test Persistence
**Location:** All tabs with character data

- [x] 6.5.1 - Test: Character persists game mode
  - [x] Generate character in standard mode
  - [x] Refresh page
  - [x] Verify character still has `gameMode: 'standard'`
- [x] 6.5.2 - Test: Pending stats persist
  - [x] Level up and gain pending stat increases
  - [x] Refresh page
  - [x] Verify `pendingStatIncreases` count is preserved
- [x] 6.5.3 - Test: XP persists
  - [x] Add XP from various sources
  - [x] Refresh page
  - [x] Verify XP total is preserved
  - [x] Verify XP source history (if tracked)

---

### Task 6.6: Test Documentation
**Location:** All documentation files

- [x] 6.6.1 - Test: README.md
  - [x] Verify file exists at root
  - [x] Verify all links work
  - [x] Verify formatting is clean
  - [x] Verify badges display correctly
- [x] 6.6.2 - Test: Documentation index
  - [x] Open `/docs/index.md`
  - [x] Verify all sections are present
  - [x] Verify all links resolve correctly
  - **Note:** Found broken links - these are expected as they depend on incomplete Phase 7 tasks (7.3.3, 7.3.4, 7.3.5, 7.4). Missing files: performance.md, mobile-sensors.md, css-optimization.md, bugs-to-fix.md, engine/ docs.
- [ ] 6.6.3 - Test: Moved documents
  - [ ] Open each moved document
  - [ ] Verify content is intact
  - [ ] Verify internal links work
  - [ ] Verify navigation footer works
- [ ] 6.6.4 - Test: Cross-references
  - [ ] Search for broken links
  - [ ] Verify all relative paths are correct
  - [ ] Verify anchor links work

---

### Task 6.7: Edge Cases and Error Handling

- [ ] 6.7.1 - Test: Generate character without audio profile
  - [ ] Verify appropriate error/warning
- [ ] 6.7.2 - Test: Add XP with no active character
  - [ ] Verify buttons are disabled or show error
- [ ] 6.7.3 - Test: Level up beyond level 20 (uncapped)
  - [ ] Verify no errors
  - [ ] Verify XP thresholds continue
- [ ] 6.7.4 - Test: Apply stat increases with no pending
  - [ ] Verify button is disabled
- [ ] 6.7.5 - Test: Rapid clicking of XP buttons
  - [ ] Verify no race conditions
  - [ ] Verify all XP is applied correctly

---

## Phase 7: Documentation Consolidation

**Goal:** Consolidate and reorganize documentation for better structure and navigation.

### Task 7.1: Move Architecture Documents
**Move:** `ARCHITECTURE.md` → `/docs/architecture/overview.md`

- [x] 7.1.1 - Copy content of `ARCHITECTURE.md`
- [x] 7.1.2 - Create `/docs/architecture/overview.md` with copied content
- [x] 7.1.3 - Update internal links in new file to point to new paths
- [x] 7.1.4 - Add navigation footer: "Back to [Documentation Index](../index.md)"
- [x] 7.1.5 - Keep original `ARCHITECTURE.md` as redirect (add: "This has moved to...")
- [x] 7.1.6 - Test: Verify new file renders correctly
- [x] 7.1.7 - Test: Verify all internal links work

---

### Task 7.2: Move Development Documents
**Move:** `CONTRIBUTING.md` and `DEBUGGING.md`

- [x] 7.2.1 - Move `CONTRIBUTING.md` to `/docs/development/contributing.md`
  - [x] Copy content
  - [x] Update internal links
  - [x] Add navigation footer
  - [x] Test: Verify file renders correctly
- [x] 7.2.2 - Move `DEBUGGING.md` to `/docs/development/debugging.md`
  - [x] Copy content
  - [x] Update internal links
  - [x] Add navigation footer
  - [x] Test: Verify file renders correctly
- [x] 7.2.3 - Keep original files as redirects

---

### Task 7.3: Move Test Documents
**Move:** `DESIGN_DOCS/*.md` → `/docs/development/testing/`

- [x] 7.3.1 - Move `DESIGN_DOCS/SMOKE_TEST_CHECKLIST.md` → `/docs/development/testing/smoke-tests.md`
  - [x] Copy content
  - [x] Update internal links
  - [x] Add navigation footer
- [x] 7.3.2 - Move `DESIGN_DOCS/DETERMINISM_TESTING.md` → `/docs/development/testing/determinism.md`
  - [x] Copy content
  - [x] Update internal links
  - [x] Add navigation footer
- [ ] 7.3.3 - Move `DESIGN_DOCS/PERFORMANCE_TESTING.md` → `/docs/development/testing/performance.md`
  - [ ] Copy content
  - [ ] Update internal links
  - [ ] Add navigation footer
- [ ] 7.3.4 - Move `DESIGN_DOCS/IOS_ANDROID_SENSOR_TESTING.md` → `/docs/development/testing/mobile-sensors.md`
  - [ ] Copy content
  - [ ] Update internal links
  - [ ] Add navigation footer
- [ ] 7.3.5 - Move `DESIGN_DOCS/BUGS_TO_FIX.md` → `/docs/design/bugs-to-fix.md`
  - [ ] Copy content
  - [ ] Update internal links
  - [ ] Add navigation footer
- [ ] 7.3.6 - Test: Verify all moved files render correctly

---

### Task 7.4: Update All Cross-References
**Files:** All markdown files

- [ ] 7.4.1 - Search for all references to `../ARCHITECTURE.md` and update to `../../docs/architecture/overview.md`
- [ ] 7.4.2 - Search for all references to `../CONTRIBUTING.md` and update to `../../docs/development/contributing.md`
- [ ] 7.4.3 - Search for all references to `../DEBUGGING.md` and update to `../../docs/development/debugging.md`
- [ ] 7.4.4 - Update relative paths in all moved files
- [ ] 7.4.5 - Add navigation footer to all docs:
  ```markdown
  ---
  **Back to [Documentation Index](../index.md)**
  ```
- [ ] 7.4.6 - Test: Verify all cross-references work
- [ ] 7.4.7 - Test: Verify navigation footers work

---

### Task 7.5: Consolidate IMPLEMENTATION_STATUS.md
**File:** `IMPLEMENTATION_STATUS.md`

**Goal:** Review and consolidate - keep valuable high-level tracking, remove redundant details.

- [ ] 7.5.1 - Read current `IMPLEMENTATION_STATUS.md` to understand what information it contains
- [ ] 7.5.2 - Identify **valuable information to keep**:
  - [ ] High-level feature completion status (completed vs pending features)
  - [ ] Major project milestones
  - [ ] Known issues/bugs that need tracking
  - [ ] Links to detailed plans (like this UPDATE_PLAN.md)
- [ ] 7.5.3 - Identify **redundant information to remove**:
  - [ ] Detailed checkbox lists that duplicate UPDATE_PLAN.md
  - [ ] Over-detailed task breakdowns
  - [ ] Information that exists in other documentation files
- [ ] 7.5.4 - Add new section: "## Data Engine Update (2026-01)"
  - [ ] Brief summary: "Adding game mode selection, XP sources, stat management UI, and documentation overhaul"
  - [ ] Link to: [UPDATE_PLAN.md](./UPDATE_PLAN.md) for full task breakdown
  - [ ] Status: "In Planning" (single status, not 200 checkboxes)
- [ ] 7.5.5 - Clean up existing sections: Remove excessive detail, keep high-level status
- [ ] 7.5.6 - Test: Verify file is concise but still useful for tracking project status
- [ ] 7.5.7 - Alternative: If file is mostly redundant, move key info to README.md and delete file

---

### Task 7.6: Identify and Delete Other Obsolete Documentation
**Goal:** Remove truly obsolete or redundant documentation files.

- [ ] 7.6.1 - Review all markdown files at root level (excluding IMPLEMENTATION_STATUS.md - handled in 7.5)
- [ ] 7.6.2 - Identify files that are:
  - [ ] Outdated (content no longer relevant)
  - [ ] Superseded (replaced by newer docs)
  - [ ] Redundant (duplicate information)
  - [ ] **Contain wrong info (e.g., Tailwind mentions, incorrect tech stack references)**
- [ ] 7.6.3 - List candidate files for deletion
- [ ] 7.6.4 - Confirm which files can be safely deleted
- [ ] 7.6.5 - Delete confirmed obsolete files
- [ ] 7.6.6 - Update any remaining references to deleted files
- [ ] 7.6.7 - Test: Verify no broken links remain

---

### Task 7.7: Final Documentation Review
**Goal:** Ensure documentation is clean, organized, and navigable.

- [ ] 7.7.1 - Verify root level has only README.md and redirect stubs
- [ ] 7.7.2 - Verify `/docs/` structure is clean and organized
- [ ] 7.7.3 - Verify all docs have navigation footers
- [ ] 7.7.4 - Verify `docs/index.md` is comprehensive
- [ ] 7.7.5 - Test: Navigate through all docs from index
- [ ] 7.7.6 - Test: Verify no broken links exist
- [ ] 7.7.7 - Count final documentation files and report result

---

## Quick Reference Files

### Files to Modify

| File | Changes | Reference Lines |
|------|---------|-----------------|
| `src/hooks/useCharacterGenerator.ts` | Add gameMode parameter | 35-39 |
| `src/hooks/useCharacterUpdater.ts` | Add addXP() and applyPendingStatIncrease() | Full file |
| `src/components/Tabs/CharacterGenTab.tsx` | Add game mode toggle and badge | 44+, 150+ |
| `src/components/Tabs/CharacterLevelingTab.tsx` | Add XP sources, level-up modal, pending badge | 235+ |
| `src/components/Tabs/CombatSimulatorTab.tsx` | Award XP on victory | 774+ |
| `src/components/Tabs/PartyTab.tsx` | Show game mode badges | Full file |
| `src/store/characterStore.ts` | Persist new properties, add selectors | 100+ |

### Files to Create

| File | Purpose |
|------|---------|
| `README.md` | Root documentation |
| `src/components/ui/GameModeToggle.tsx` | Game mode selection UI |
| `src/components/ui/StatStrategySelector.tsx` | StatManager strategy selector |
| `src/components/LevelUpDetailModal.tsx` | Level-up breakdown modal |
| `src/components/StatSelectionModal.tsx` | Stat selection UI |
| `docs/index.md` | Documentation hub |
| `docs/getting-started.md` | Quick start guide |

### Files to Move

| From | To |
|------|-----|
| `ARCHITECTURE.md` | `docs/architecture/overview.md` |
| `CONTRIBUTING.md` | `docs/development/contributing.md` |
| `DEBUGGING.md` | `docs/development/debugging.md` |
| `DESIGN_DOCS/SMOKE_TEST_CHECKLIST.md` | `docs/development/testing/smoke-tests.md` |
| `DESIGN_DOCS/DETERMINISM_TESTING.md` | `docs/development/testing/determinism.md` |
| `DESIGN_DOCS/PERFORMANCE_TESTING.md` | `docs/development/testing/performance.md` |
| `DESIGN_DOCS/IOS_ANDROID_SENSOR_TESTING.md` | `docs/development/testing/mobile-sensors.md` |
| `DESIGN_DOCS/BUGS_TO_FIX.md` | `docs/design/bugs-to-fix.md` |

---

## Implementation Order

**Recommended Sequence:**

1. **Phase 1** (Days 1-2) - Update hooks and stores
2. **Phase 2** (Days 2-3) - Game mode selection UI
3. **Phase 3** (Days 3-4) - XP sources and level-up details
4. **Phase 4** (Days 4-5) - Stat management UI
5. **Phase 5** (Days 5-6) - Create new documentation
6. **Phase 6** (Day 7) - Testing and verification
7. **Phase 7** (Day 8) - Documentation consolidation and cleanup

---

## Notes for Implementation Agent

1. **Type Safety:** Always import types from `'playlist-data-engine'` rather than defining them locally
2. **Game Mode Defaults:** Engine defaults to `'standard'`, hook defaults to `'uncapped'` - match this in the UI
3. **Stat Cap:** Standard mode caps at 20, uncapped has no limit
4. **Pending Stats:** Only standard mode gets pending stat increases at levels 4, 8, 12, 16, 19
5. **XP Sources:** Use meaningful source strings for tracking: `'combat'`, `'quest'`, `'boss_defeat'`, `'exploration'`, `'crafting'`, `'social'`
6. **Documentation:** Keep docs in sync with code changes - update as you go
7. **Testing:** Test each phase before moving to the next
8. **Git Commits:** Commit after each major task completion

## Implementation Notes

### 2026-01-26: Engine Build Required
The playlist-data-engine had to be rebuilt to expose new types (`GameMode`, updated `CharacterGeneratorOptions`). The engine's `index.ts` was updated to export `PlaylistParser` which was missing. After rebuilding the engine (`npm run build` in `/playlist-data-engine`), the demo project needed to reinstall the engine to pick up the updated types.

---

## Related Documentation

- **Data Engine Reference:** [DESIGN_DOCS/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md](DESIGN_DOCS/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md)
- **Usage Examples:** [DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md](DESIGN_DOCS/FROM_DATA_ENGINE/USAGE_IN_OTHER_PROJECTS.md)
- **Current Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation Status:** [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
