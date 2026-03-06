# Rhythm XP Frontend Integration Plan

## Overview

Integrate the Rhythm XP System from `playlist-data-engine` into the frontend. This plan connects the existing beat detection and groove tracking features to the XP progression system, displaying both **Score** (for gameplay feedback) and **XP** (for character progression) separately.

### Key Architecture Decisions

Based on user requirements:
- **XP Settings**: Full configuration exposed (baseXP per accuracy, combo formula, groove weights, per-hit multiplier toggle, end bonus toggles)
- **UI Location**: New dedicated "Rhythm XP" tab in XPCalculatorTab
- **Real-Time Display**: Score AND XP displayed in BeatPracticeView header bar during practice (always visible)
- **Session End**: Bottom section shows total Score AND XP with "Claim XP" button
- **XP Application**: Batch at end - XP accumulates during session, applied when user clicks "Claim XP"
- **Groove Bonus UI**: Display next to GrooveMeter component
- **Character Association**: Character is related to the song being listened to (track-character relationship)
- **Debug Panel**: Extend existing Tap Timing Debug Panel with XP columns
- **Score vs XP**: Display both separately (Score for display/leaderboards, XP for character progression)

### Score vs XP Relationship

The data engine uses a `xpRatio` (default: 0.1) to separate score from XP:
- **Score Points**: Raw points for gameplay display (10 for perfect, 7 for great, etc.)
- **Character XP**: Score points × xpRatio (10 score = 1 XP with default 0.1 ratio)

This allows high score feedback during gameplay while keeping character progression balanced.

### Important Clarifications

#### Combo vs Groove Streak (CRITICAL)

**Combo** and **Groove Streak** are **completely different** tracking systems:

| Aspect | Combo | Groove Streak |
|--------|-------|---------------|
| **Definition** | Consecutive hits without miss/wrongKey | Consecutive hits maintaining timing pocket |
| **Reset Condition** | Any `miss` or `wrongKey` accuracy | Hotness drops to 0 OR direction changes (push ↔ pull) |
| **Tracked By** | `beatDetectionStore.currentCombo` | `GrooveAnalyzer` (via `grooveState.streakLength`) |
| **Used For** | XP multiplier calculation | Groove end bonus, hotness display |
| **UI Display** | ComboFeedbackDisplay component | GrooveMeter component |

**Implementation Note**: Combo must be tracked separately in `beatDetectionStore` because:
1. It resets on different conditions than groove streak
2. It's passed to `RhythmXPCalculator.recordHit()` as `comboLength` parameter
3. It needs to be accessible via selectors for UI components

#### XP Source Tracking

All Rhythm XP uses a single source `'rhythm_game'` at the surface level:
```typescript
updater.addXP(character, totalXP, 'rhythm_game');
```

However, detailed breakdown is preserved internally in `RhythmSessionTotals` for future session history recall:
- Per-hit XP breakdown
- Combo end bonuses
- Groove end bonuses
- Accuracy distribution

---

## Phase 1: Core Types & State Setup

### 1.1 Add Rhythm XP Types to Frontend
- [x] Add type exports to `src/types/index.ts`
  ```typescript
  // Type exports (for interfaces)
  export type {
      RhythmXPConfig,
      RhythmXPResult,
      RhythmSessionTotals,
      ComboEndBonusResult,
      GrooveEndBonusResult,
      GrooveStats,  // For groove end bonus parameter
  } from 'playlist-data-engine';

  // Value exports (for classes, constants, functions)
  export {
      RhythmXPCalculator,
      DEFAULT_RHYTHM_XP_CONFIG,
      mergeRhythmXPConfig,
  } from 'playlist-data-engine';
  ```

### 1.2 Extend BeatDetectionStore State (Runtime State Only)
- [x] Add Rhythm XP runtime state to `beatDetectionStore.ts`
  ```typescript
  // Add to BeatDetectionState interface:

  // ============================================================
  // Rhythm XP Runtime State (Phase 1: Task 1.2)
  // NOTE: Config is stored separately in rhythmXPConfigStore
  // ============================================================

  /**
   * The RhythmXPCalculator instance for tracking XP during practice.
   * Created when practice mode starts with config from rhythmXPConfigStore.
   */
  rhythmXPCalculator: RhythmXPCalculator | null;

  /**
   * Current session totals from the RhythmXPCalculator.
   * Updated after each hit for real-time UI display.
   */
  rhythmSessionTotals: RhythmSessionTotals | null;

  /**
   * Last XP result from a button press.
   * Used for real-time XP feedback display.
   */
  lastRhythmXPResult: RhythmXPResult | null;

  /**
   * Current combo count (consecutive hits without miss/wrongKey).
   * IMPORTANT: This is DIFFERENT from groove streak!
   * - Combo resets on: miss, wrongKey
   * - Groove streak resets on: hotness=0, direction change
   * Passed to RhythmXPCalculator.recordHit() as comboLength.
   */
  currentCombo: number;

  /**
   * Maximum combo achieved in current session.
   * Updated when currentCombo exceeds previous max.
   */
  maxCombo: number;

  /**
   * Previous combo length (before current hit).
   * Used to detect combo breaks for end bonus calculation.
   */
  previousComboLength: number;

  /**
   * Pending combo end bonus (displayed when combo breaks).
   * Cleared after being shown in UI.
   */
  pendingComboEndBonus: ComboEndBonusResult | null;

  /**
   * Pending groove end bonus (displayed when groove ends).
   * Cleared after being shown in UI.
   */
  pendingGrooveEndBonus: GrooveEndBonusResult | null;
  ```

### 1.3 Add Rhythm XP Actions to Store
- [x] Add actions to `BeatDetectionActions` interface
  ```typescript
  // ============================================================
  // Rhythm XP Actions (Phase 1: Task 1.3)
  // NOTE: Config actions are in rhythmXPConfigStore, not here
  // ============================================================

  /**
   * Initialize the RhythmXPCalculator for a practice session.
   * Creates a new calculator with config from rhythmXPConfigStore
   * and calls startSession().
   */
  initRhythmXP: () => void;

  /**
   * Record a hit in the XP calculator.
   * Called after each button press during practice mode.
   * Updates currentCombo and lastRhythmXPResult.
   * @param accuracy - The accuracy rating from the button press
   * @param grooveHotness - Current groove hotness (0-100)
   * @returns RhythmXPResult with score/XP breakdown
   */
  recordRhythmHit: (
    accuracy: ExtendedBeatAccuracy,
    grooveHotness: number
  ) => RhythmXPResult | null;

  /**
   * Process combo end bonus.
   * Called when combo breaks (miss or wrongKey).
   * Uses previousComboLength to calculate bonus.
   * @returns ComboEndBonusResult for display
   */
  processComboEndBonus: () => ComboEndBonusResult | null;

  /**
   * Process groove end bonus.
   * Called when grooveResult.endedGrooveStats is present.
   * @param grooveStats - The ended groove stats from GrooveResult
   * @returns GrooveEndBonusResult for display
   */
  processGrooveEndBonus: (grooveStats: GrooveStats) => GrooveEndBonusResult | null;

  /**
   * Get current session totals for UI display.
   * @returns Current RhythmSessionTotals snapshot
   */
  getRhythmSessionTotals: () => RhythmSessionTotals | null;

  /**
   * Check if there is unclaimed XP in the current session.
   * Used to prompt user on exit.
   * @returns true if totalXP > 0
   */
  hasUnclaimedXP: () => boolean;

  /**
   * End the rhythm XP session and get final totals.
   * Called when user confirms they want to claim XP.
   * @returns Final RhythmSessionTotals
   */
  endRhythmXPSession: () => RhythmSessionTotals | null;

  /**
   * Clear pending bonus notifications.
   * Called after UI displays the bonus.
   */
  clearPendingBonuses: () => void;

  /**
   * Reset rhythm XP state (session only, not config).
   * Called on track change, practice mode restart, or after claiming XP.
   */
  resetRhythmXP: () => void;
  ```

### 1.4 Implement Store Actions
- [x] Implement `initRhythmXP` action
  - Import config from `rhythmXPConfigStore`
  - Create new `RhythmXPCalculator` with that config
  - Call `startSession()` to initialize session tracking
  - Reset combo counters to 0
- [x] Implement `recordRhythmHit` action
  - Store `previousComboLength = currentCombo`
  - If accuracy is `miss` or `wrongKey`:
    - Call `processComboEndBonus()` first (uses previousComboLength)
    - Reset `currentCombo = 0`
  - Else:
    - Increment `currentCombo++`
    - Update `maxCombo` if currentCombo > maxCombo
  - Call `rhythmXPCalculator.recordHit(accuracy, currentCombo, grooveHotness)`
  - Update `lastRhythmXPResult` state
  - Update `rhythmSessionTotals` from calculator
- [x] Implement `processComboEndBonus` action
  - If `previousComboLength > 0`:
    - Call `rhythmXPCalculator.calculateComboEndBonus(previousComboLength)`
    - Store in `pendingComboEndBonus`
  - Else return null (no bonus for 0 combo)
- [x] Implement `processGrooveEndBonus` action
  - Call `rhythmXPCalculator.calculateGrooveEndBonus(grooveStats)`
  - Store in `pendingGrooveEndBonus`
- [x] Implement session management actions
  - `getRhythmSessionTotals()` - return snapshot
  - `hasUnclaimedXP()` - return `rhythmSessionTotals?.totalXP > 0`
  - `endRhythmXPSession()` - call endSession() and return final totals
  - `clearPendingBonuses()` - clear pending bonus state
  - `resetRhythmXP()` - clear all XP state (calculator, totals, combo, bonuses)

---

## Phase 2: BeatPracticeView Integration

### 2.1 Initialize Rhythm XP on Practice Start
- [x] Import XP actions from store in `BeatPracticeView.tsx`
  ```typescript
  const initRhythmXP = useBeatDetectionStore((state) => state.actions.initRhythmXP);
  const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);
  ```
- [x] Call `initRhythmXP()` in the groove analyzer initialization effect
  - Initialize alongside `initGrooveAnalyzer()`
  - Log initialization for debugging

### 2.2 Record XP on Each Hit
- [x] Import `recordRhythmHit` action
  ```typescript
  const recordRhythmHit = useBeatDetectionStore((state) => state.actions.recordRhythmHit);
  const processGrooveEndBonus = useBeatDetectionStore((state) => state.actions.processGrooveEndBonus);
  ```
- [x] Update `handleTap` callback to record XP after each hit
  ```typescript
  // After grooveResult = recordGrooveHit(...)

  // Record XP (this also handles combo tracking internally)
  const xpResult = recordRhythmHit(result.accuracy, grooveResult.hotness);

  // Check for groove end bonus (in same callback)
  if (grooveResult.endedGrooveStats) {
    processGrooveEndBonus(grooveResult.endedGrooveStats);
  }
  ```

### 2.3 Combo Tracking (Automatic in recordRhythmHit)
- [x] Combo is tracked automatically in `recordRhythmHit` action:
  - On miss/wrongKey: `processComboEndBonus()` is called, combo resets to 0
  - On other accuracy: combo increments
  - `previousComboLength` stored for bonus calculation
- [x] No separate combo tracking needed in BeatPracticeView

### 2.4 Handle Groove End Bonus (Same Callback)
- [x] Groove end bonus is processed in the same button press callback
  - Check `grooveResult.endedGrooveStats` after `recordGrooveHit()`
  - If present, groove just ended (hotness=0 or direction changed)
  - Call `processGrooveEndBonus(grooveResult.endedGrooveStats)`
  - Bonus is stored in `pendingGrooveEndBonus` for UI display

### 2.5 Reset XP on Seek/Track Change
- [x] Call `resetRhythmXP()` in `handleSeek()` callback
  - Reset alongside groove analyzer
  - Ensures clean state when user jumps to different part of song

### 2.6 End Session on Practice Exit (With Prompt)
- [x] Add `hasUnclaimedXP` selector
  ```typescript
  const hasUnclaimedXP = useBeatDetectionStore((state) => state.actions.hasUnclaimedXP);
  ```
- [x] Update `handleExit()` callback to prompt user
  ```typescript
  const handleExit = useCallback(() => {
    if (hasUnclaimedXP()) {
      // Show modal with session summary and Claim/Discard options
      setShowExitPrompt(true);
    } else {
      // No XP to claim, exit directly
      resetRhythmXP();
      onExit();
    }
  }, [hasUnclaimedXP, resetRhythmXP, onExit]);
  ```
- [x] Create exit prompt modal with:
  - Session summary (Score, XP, Max Combo)
  - "Claim XP" button → calls `handleClaimXP()`, then exits
  - "Discard & Exit" button → calls `resetRhythmXP()`, then exits
  - "Cancel" button → closes modal, returns to practice

---

## Phase 3: Real-Time XP Display (Header Bar)

### 3.1 Create RhythmXPStats Component
- [x] Create `src/components/ui/RhythmXPStats.tsx`
  ```typescript
  interface RhythmXPStatsProps {
    /** Current session totals */
    sessionTotals: RhythmSessionTotals | null;
    /** Last XP result for hit feedback */
    lastResult: RhythmXPResult | null;
    /** Current combo count */
    currentCombo: number;
  }
  ```
- [x] Display in header bar (next to BPM/Position stats)
  - **Score**: Current session score (for display) - **always visible during practice**
  - **XP**: Current session XP (for character progression) - **always visible during practice**
  - **Combo**: Current combo count (e.g., "12")
  - **Multiplier**: Current combo multiplier (e.g., "2.5x")
  - Compact layout matching existing header stats
  - These stats update in real-time as you play

### 3.2 Create RhythmXPStats Styles
- [x] Create `src/components/ui/RhythmXPStats.css`
  - Match existing `beat-practice-stats` styling
  - Color-coded XP value (highlight for progression)
  - Animate multiplier changes

### 3.3 Integrate RhythmXPStats into BeatPracticeView Header
- [x] Add `RhythmXPStats` to the stats row in header
  ```typescript
  <div className="beat-practice-stat">
    <span className="beat-practice-stat-value">{sessionTotals?.totalScore ?? 0}</span>
    <span className="beat-practice-stat-label">Score</span>
  </div>
  <div className="beat-practice-stat">
    <span className="beat-practice-stat-value beat-practice-stat-value--xp">
      {sessionTotals?.totalXP.toFixed(1) ?? '0.0'}
    </span>
    <span className="beat-practice-stat-label">XP</span>
  </div>
  ```
- [x] Wire up selectors
  ```typescript
  const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
  const lastRhythmXPResult = useBeatDetectionStore((state) => state.lastRhythmXPResult);
  const currentCombo = useBeatDetectionStore((state) => state.currentCombo);
  ```

---

## Phase 3.5: Combo UI in Lane Feedback Panel

This phase adds real-time combo and multiplier display in the DDR/Guitar lane feedback panel
and TapArea mode, showing players their current streak and XP multiplier as they play.

### 3.5.1 Create ComboFeedbackDisplay Component
- [x] Create `src/components/ui/ComboFeedbackDisplay.tsx`
  ```typescript
  interface ComboFeedbackDisplayProps {
    /** Current session score (for gameplay achievement) */
    score: number;
    /** Current combo count (consecutive hits) */
    combo: number;
    /** Current XP multiplier from RhythmXPResult */
    multiplier: number;
    /** Optional className for styling */
    className?: string;
  }
  ```
- [x] Display format:
  - Show **score** (e.g., "1,250")
  - Show combo count (e.g., "12 hits")
  - Show multiplier (e.g., "1.2x")
  - Always visible during practice (persists between hits)
  - Compact design matching existing feedback panel

### 3.5.2 Create ComboFeedbackDisplay Styles
- [x] Create `src/components/ui/ComboFeedbackDisplay.css`
  - Multiplier color gradient:
    - 1.0x = default (white/gray)
    - 2.0x+ = yellow
    - 3.0x+ = orange
    - 4.0x+ = red
    - 5.0x = gold
  - Combo count emphasis (larger font for big combos)
  - Smooth transitions for value changes
  - Match existing `key-lane-view-feedback` styling

### 3.5.3 Integrate into KeyLaneView Feedback Panel
- [x] Update `src/components/ui/KeyLaneView.tsx`
  - Add `ComboFeedbackDisplay` ABOVE the existing accuracy feedback
  - Current layout:
    ```
    PERFECT +15ms
    ```
  - New layout:
    ```
    Score: 1,250
    12 hits | 1.2x
    PERFECT +15ms
    ```
- [x] Wire to store (combo from store, NOT from lastRhythmXPResult.breakdown):
  - Props passed from BeatPracticeView: score, combo, multiplier
  - BeatPracticeView accesses: rhythmSessionTotals, currentCombo, lastRhythmXPResult from store

### 3.5.4 Add to TapArea Mode
- [x] Update `src/components/ui/BeatPracticeView.tsx`
  - Add `ComboFeedbackDisplay` in TapArea mode (when `keyLaneViewMode === 'off'`)
  - Position near GrooveMeter or in similar feedback area
  - Same wire-up as lane mode (score, combo, multiplier)

### 3.5.5 Handle Combo Reset
- [x] Combo resets to 0 when accuracy is `miss` or `wrongKey`
- [x] Score persists (doesn't reset on combo break)
- [x] Display briefly shows "0 hits | 1.0x" after reset
- [x] Smooth animation for reset (fade out/in)

### 3.5.6 Accessibility
- [x] Add ARIA live region for combo/multiplier changes
- [x] Announce multiplier milestones (2x, 3x, 4x, 5x)
- [x] Screen reader summary includes score
  ```typescript
  <div role="status" aria-live="polite" className="sr-only">
    Score: {score}, Combo: {combo} hits, Multiplier: {multiplier}x
  </div>
  ```

---

## Phase 4: XP Session Stats (Bottom Section)

### 4.1 Create RhythmXPSessionStats Component
- [x] Create `src/components/ui/RhythmXPSessionStats.tsx`
  ```typescript
  interface RhythmXPSessionStatsProps {
    /** Current session totals */
    sessionTotals: RhythmSessionTotals | null;
    /** Pending combo end bonus to display */
    pendingComboBonus: ComboEndBonusResult | null;
    /** Pending groove end bonus to display */
    pendingGrooveBonus: GrooveEndBonusResult | null;
    /** Callback to clear pending bonuses after display */
    onClearBonuses: () => void;
    /** Callback to claim XP and add to character */
    onClaimXP: (xp: number) => void;
    /** Whether a character is associated with this track */
    hasCharacter: boolean;
  }
  ```
- [x] Display section similar to TapStats component
  - **Total Score / Total XP** summary row (both values always visible)
  - **Accuracy Distribution** (perfect/great/good/ok/miss counts)
  - **Max Combo** achieved
  - **Recent Bonuses** (combo end / groove end) - animated entries
  - **Claim XP Button** - shows XP amount to claim, adds to track's character

### 4.2 Create RhythmXPSessionStats Styles
- [x] Create `src/components/ui/RhythmXPSessionStats.css`
  - Match existing `TapStats` and `GrooveStats` styling
  - Bonus notification animations (slide in, fade out)
  - Claim button styling (primary action)
  - Responsive grid layout

### 4.3 Bonus Notification Display
- [x] Show combo end bonus notification
  - Display when `pendingComboBonus` is set
  - Show: "+X XP (Combo: N hits)"
  - Auto-dismiss after 2 seconds, then call `clearPendingBonuses()`
- [x] Show groove end bonus notification
  - Display when `pendingGrooveBonus` is set
  - Show: "+X XP (Groove: Y% avg hotness)"
  - Auto-dismiss after 2 seconds, then call `clearPendingBonuses()`

### 4.4 Claim XP Button
- [x] Add "Claim XP" button to session stats
  - Only enabled if `hasCharacter` is true
  - **Shows both Score AND XP**:
    ```
    +--------------------------------+
    |  Session Summary               |
    |  Score: 1,250 | XP: 12.5       |
    |                                |
    |       [Claim 12.5 XP]          |
    +--------------------------------+
    ```
  - Score = total raw points earned (for gameplay achievement)
  - XP = score × xpRatio (for character progression)
  - On click: calls `onClaimXP(totalXP)`, shows success feedback
  - Resets session totals after claiming

### 4.5 Integrate into BeatPracticeView Bottom Section
- [ ] Add `RhythmXPSessionStats` below TapStats component
- [ ] Wire up selectors
  ```typescript
  const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
  const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
  const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);
  const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);
  ```

---

## Phase 5: GrooveMeter Bonus Display

### 5.1 Add Bonus Display Next to GrooveMeter
- [ ] Create `GrooveBonusDisplay` sub-component or inline display
  - Position immediately adjacent to GrooveMeter
  - Show pending groove end bonus when available
  - Small animated indicator: "+X XP" with sparkle effect
- [ ] Style integration
  - Match GrooveMeter visual language
  - Use same color scheme (hotness-based coloring)
  - Compact non-intrusive design

### 5.2 Update GrooveMeter Component
- [ ] Add optional `pendingBonus` prop to GrooveMeter
  ```typescript
  interface GrooveMeterProps {
    // ... existing props ...
    pendingBonus?: GrooveEndBonusResult | null;
    onBonusDisplayed?: () => void;
  }
  ```
- [ ] Display bonus animation when `pendingBonus` is set
  - Show XP gained from groove
  - Animate in sync with groove visual feedback

---

## Phase 6: Tap Timing Debug Panel Enhancement

### 6.1 Extend TapDebugInfo and TapRow with XP Columns
- [ ] Update `TapDebugInfo` interface in `BeatPracticeView.tsx`
  ```typescript
  interface TapDebugInfo {
    // ... existing fields ...
    scorePoints?: number;     // Raw score from hit (10 for perfect, etc.)
    characterXP?: number;     // XP earned (after ratio applied)
    multiplier?: number;      // Total multiplier applied
  }
  ```
- [ ] Add column headers to debug panel
  - Existing: Accuracy, Offset, Audio Time, Beat Time
  - New: Score, XP, Multiplier
- [ ] Update `TapRow` component to display new columns
  - Add width for new columns in the virtualized list
  - Show score points (color-coded by accuracy)
  - Show XP earned (smaller text, progression-focused)
  - Show multiplier when > 1.0x (otherwise show "-")

### 6.2 Update Debug Panel Display
- [ ] Extend the virtualized tap list to include XP data
  - Add width for new columns
  - Show score points (color-coded by accuracy)
  - Show XP earned (smaller text, progression-focused)
  - Show multiplier when > 1.0x

### 6.3 Update Session Stats Summary in Debug Panel
- [ ] Add XP row to session stats summary
  ```typescript
  <div className="beat-practice-debug-session-stat">
    <span className="beat-practice-debug-session-value">{totalXP.toFixed(1)}</span>
    <span className="beat-practice-debug-session-label">Total XP</span>
  </div>
  ```

---

## Phase 7: XPCalculatorTab - Rhythm XP Config Tab

### 7.1 Add New "Rhythm XP" Tab
- [ ] Add fourth tab to XPCalculatorTab
  ```typescript
  type XPCalculatorTabType = 'calculator' | 'results' | 'config' | 'rhythm';
  ```
- [ ] Add tab button
  ```tsx
  <button className={`xp-calculator-tab ${activeTab === 'rhythm' ? 'xp-calculator-tab-active' : ''}`}
    onClick={() => setActiveTab('rhythm')}>
    <span className="xp-calculator-tab-label">Rhythm XP</span>
  </button>
  ```

### 7.2 Create Rhythm XP Config Section Components
- [ ] Create Base XP Configuration Card
  - Sliders for each accuracy level:
    - Perfect (default: 10, range: 1-50)
    - Great (default: 7, range: 1-30)
    - Good (default: 5, range: 1-20)
    - OK (default: 2, range: 0-10)
    - Miss (default: 0, range: -10 to 0)
    - Wrong Key (default: 0, range: -10 to 0)
  - XP Ratio slider (default: 0.1, range: 0.01-1.0)

- [ ] Create Combo Configuration Card
  - Enable/Disable toggle
  - Combo Cap slider (default: 5.0, range: 1.0-10.0)
  - Combo Formula preset selector:
    - Default: `1 + (combo / 50)` capped
    - Aggressive: `1 + (combo / 25)`
    - Exponential: `1 + Math.log10(combo + 1)`
    - Step-based: `1 + Math.floor(combo / 10) * 0.1`
  - End Bonus Enable/Disable toggle
  - End Bonus Formula (combo × multiplier, default 2)

- [ ] Create Groove Configuration Card
  - Per-Hit Multiplier Enable/Disable toggle
  - Per-Hit Scale slider (default: 1.0, range: 0.1-2.0)
  - End Bonus Enable/Disable toggle
  - Weight sliders:
    - Max Streak Weight (default: 0.4, range: 0-1)
    - Avg Hotness Weight (default: 0.4, range: 0-1)
    - Duration Weight (default: 0.2, range: 0-1)

- [ ] Create Global Settings Card
  - Max Multiplier slider (default: 5.0, range: 1.5-10.0)

### 7.3 Create Separate Config Store
- [ ] Create `src/store/rhythmXPConfigStore.ts` (separate from beatDetectionStore)
  ```typescript
  interface RhythmXPConfigState {
    config: RhythmXPConfig;
    updateConfig: (config: Partial<RhythmXPConfig>) => void;
    resetConfig: () => void;
  }
  ```
  **Rationale**: Config is kept separate from runtime state because:
  - All XP multiplier configs should be in one place (XPCalculatorTab)
  - Config is user-editable and persisted
  - Runtime state is ephemeral and session-scoped
  - Separation of concerns: "How should XP be calculated?" vs "What's happening now?"

- [ ] Persist to localStorage
  - Key: `rhythm-xp-config`
  - Load on mount, save on change
- [ ] beatDetectionStore reads config from this store when initializing RhythmXPCalculator

### 7.4 Add Reset to Defaults Button
- [ ] Add button at bottom of Rhythm XP tab
  ```tsx
  <button className="xp-config-reset-button" onClick={handleResetRhythmConfig}>
    Reset Rhythm XP to Defaults
  </button>
  ```
- [ ] Show confirmation toast on reset

### 7.5 Style Rhythm XP Config Tab
- [ ] Create `XPCalculatorTab.css` additions
  - Match existing config tab styling
  - Organize into collapsible sections (Base XP, Combo, Groove, Global)
  - Use ConfigSlider component from existing implementation
  - Add section icons (Target for accuracy, Zap for combo, Gauge for groove)

---

## Phase 8: Character System Integration

### 8.1 Track-Character Relationship
- [ ] Understand existing track-character relationship
  - Character is generated from track audio profile
  - Character seed is derived from track ID
  - Active character during practice = character for current track

### 8.2 Add Rhythm XP to Character Store
- [ ] Import `CharacterUpdater` from engine in `characterStore.ts`
- [ ] Add `addRhythmXP` action to character store
  ```typescript
  addRhythmXP: (characterSeed: string, totalXP: number) => {
    const character = getCharacterBySeed(characterSeed);
    if (!character) return null;

    const updater = new CharacterUpdater();
    // Single source 'rhythm_game' at surface level
    // Detailed breakdown preserved in RhythmSessionTotals
    const result = updater.addXP(character, totalXP, 'rhythm_game');

    // Update character in store
    // Handle level-up events
    return result;
  }
  ```

### 8.3 Claim XP Handler
- [ ] Implement `handleClaimXP` in BeatPracticeView or RhythmXPSessionStats
  ```typescript
  const handleClaimXP = useCallback((xp: number) => {
    const trackCharacter = getCharacterForTrack(selectedTrack?.id);
    if (!trackCharacter) {
      showToast('No character associated with this track', 'warning');
      return;
    }

    const result = addRhythmXP(trackCharacter.seed, xp);

    if (result?.leveledUp) {
      setShowLevelUpModal(true);
      setLevelUpDetails(result.levelUpDetails ?? []);
    } else {
      showToast(`+${xp.toFixed(1)} XP added to ${trackCharacter.name}`, 'success');
    }

    // Reset session after claiming
    resetRhythmXP();
  }, [selectedTrack, addRhythmXP, resetRhythmXP]);
  ```

### 8.4 Level-Up Notification
- [ ] Reuse existing `LevelUpDetailModal` component
- [ ] Show on level-up after claiming XP
- [ ] Display new level, HP increase, stat increases

---

## Phase 9: UI Polish & Animations

### 9.1 Add Hit Feedback Animations
- [ ] Animate XP gain on each hit in header stats
  - Pulse effect on XP value change
  - Color flash based on accuracy (green for perfect, etc.)

### 9.2 Add Bonus Celebration Animations
- [ ] Combo end bonus animation
  - Slide-in notification from GrooveMeter area
  - XP amount with combo count
  - Auto-dismiss with fade out

### 9.3 Add Level-Up Celebration
- [ ] Level-up notification when character levels up after claiming XP
  - Full-screen celebration overlay
  - New level display
  - Stats increase summary
  - Confetti effect (optional)

---

## Phase 10: Testing & Documentation

### 10.1 Unit Tests
- [ ] Test XP calculation accuracy with various configs
- [ ] Test combo multiplier behavior (separate from groove streak)
- [ ] Test groove end bonus calculation
- [ ] Test session totals tracking
- [ ] Test config persistence

### 10.2 Integration Tests
- [ ] Test full practice session flow
- [ ] Test XP claiming and character update
- [ ] Test level-up triggering
- [ ] Test groove end bonus display
- [ ] Test exit prompt when unclaimed XP

### 10.3 Documentation
- [ ] Update component docs
- [ ] Add usage examples
- [ ] Document configuration options
- [ ] Document track-character relationship
- [ ] Document combo vs groove streak distinction

---

## Dependencies

### External Dependencies
- `playlist-data-engine` must export:
  - `RhythmXPCalculator`
  - `RhythmXPConfig` and related types
  - `DEFAULT_RHYTHM_XP_CONFIG`
  - `mergeRhythmXPConfig`

### Internal Dependencies
- Phase 2 depends on Phase 1 (store setup)
- Phase 3 depends on Phase 2 (integration)
- Phase 3.5 depends on Phase 2 (combo UI needs XP result from store)
- Phase 4 depends on Phase 2 (stats display)
- Phase 5 depends on Phase 2 (groove bonus)
- Phase 6 depends on Phase 2 (debug panel)
- Phase 7 depends on Phase 1 (config store)
- Phase 8 depends on Phases 2-4 (character integration)
- Phase 9 depends on Phases 3-5 (polish)
- Phase 10 can run in parallel with Phase 9

---

## Questions Resolved

1. **XP Ratio Configuration**: ✅ Full config exposed in Rhythm XP tab
2. **Character Selection**: ✅ Character is associated with the track being played
3. **Session Persistence**: ✅ Ephemeral - XP accumulates during session, claimed at end
4. **Groove End Bonus Timing**: ✅ Displayed immediately in same callback when `endedGrooveStats` is present
5. **XP Display Location**: ✅ Header bar for real-time, bottom section for details/claim
6. **Config UI Location**: ✅ New dedicated "Rhythm XP" tab in XPCalculatorTab
7. **Debug Panel**: ✅ Extended with Score, XP, Multiplier columns
8. **Score Display**: ✅ Shown in real-time during practice (header bar) AND at session end (with Claim XP button)
9. **Combo vs Groove Streak**: ✅ Combo is SEPARATE from groove streak (different reset conditions, tracked in store)
10. **Groove End Bonus Handling**: ✅ Processed in same button press callback when `endedGrooveStats` present
11. **XP Source**: ✅ Single source `'rhythm_game'` at surface level, detailed breakdown in `RhythmSessionTotals`
12. **Unclaimed XP on Exit**: ✅ Prompt user with Claim/Discard options
13. **Config Store Location**: ✅ Separate `rhythmXPConfigStore.ts` (not in beatDetectionStore) for consolidated XP config management

---

## File Changes Summary

### New Files
- `src/store/rhythmXPConfigStore.ts` - Config persistence (separate from beatDetectionStore)
- `src/components/ui/RhythmXPStats.tsx` - Header bar stats display
- `src/components/ui/RhythmXPStats.css`
- `src/components/ui/RhythmXPSessionStats.tsx` - Bottom section with claim button
- `src/components/ui/RhythmXPSessionStats.css`
- `src/components/ui/ComboFeedbackDisplay.tsx` - Combo/multiplier in lane feedback
- `src/components/ui/ComboFeedbackDisplay.css`

### Modified Files
- `src/types/index.ts` - Export engine types
- `src/store/beatDetectionStore.ts` - Add XP runtime state and actions (combo, calculator, totals)
- `src/store/characterStore.ts` - Add addRhythmXP action
- `src/components/ui/BeatPracticeView.tsx` - Integrate XP tracking, add stats displays, add combo feedback, add exit prompt
- `src/components/ui/KeyLaneView.tsx` - Add ComboFeedbackDisplay to feedback panel
- `src/components/ui/GrooveMeter.tsx` - Add bonus display prop
- `src/components/Tabs/XPCalculatorTab.tsx` - Add Rhythm XP config tab
- `src/components/Tabs/XPCalculatorTab.css` - Style new tab

---

## Implementation Order

1. **Phase 1**: Store setup (foundation)
2. **Phase 2**: BeatPracticeView integration (core functionality)
3. **Phase 3**: Header bar stats display (real-time feedback)
4. **Phase 3.5**: Combo UI in lane feedback panel (combo streak + multiplier display)
5. **Phase 4**: Bottom section stats (session details + claim)
6. **Phase 5**: GrooveMeter bonus display (groove rewards)
7. **Phase 6**: Debug panel enhancement (XP debugging)
8. **Phase 7**: XPCalculatorTab config (user customization)
9. **Phase 8**: Character integration (progression)
10. **Phase 9**: Polish (animations)
11. **Phase 10**: Testing & docs (quality assurance)
