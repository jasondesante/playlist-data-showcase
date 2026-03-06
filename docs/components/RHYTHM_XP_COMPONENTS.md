# Rhythm XP Components Documentation

**Last Updated:** 2026-03-06
**Related Plan:** [RHYTHM_XP_FRONTEND_PLAN.md](../plans/RHYTHM_XP_FRONTEND_PLAN.md)

This document describes the Rhythm XP frontend components that integrate the `playlist-data-engine` Rhythm XP system for real-time score/XP tracking during beat practice mode.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
   - [RhythmXPStats](#rhythmxpstats)
   - [RhythmXPSessionStats](#rhythmxpsessionstats)
   - [ComboFeedbackDisplay](#combofeedbackdisplay)
4. [Stores](#stores)
   - [rhythmXPConfigStore](#rhythmxpconfigstore)
   - [beatDetectionStore (Rhythm XP State)](#beatdetectionstore-rhythm-xp-state)
5. [Data Flow](#data-flow)
6. [Configuration](#configuration)
7. [Key Concepts](#key-concepts)
8. [Usage Examples](#usage-examples)
   - [Complete BeatPracticeView Integration](#complete-beatpracticeview-integration)
   - [KeyLaneView Integration with Combo Feedback](#keylaneview-integration-with-combo-feedback)
   - [Custom Configuration Example](#custom-configuration-example)
   - [Exit Prompt with Unclaimed XP](#exit-prompt-with-unclaimed-xp)
   - [Configuration Store Selectors Usage](#configuration-store-selectors-usage)
   - [Handling Bonus Notifications](#handling-bonus-notifications)

---

## Overview

The Rhythm XP system provides real-time feedback during beat practice mode, displaying:

- **Score**: Raw points for gameplay achievement (10 for perfect, 7 for great, etc.)
- **XP**: Character progression points (Score × xpRatio, default 0.1)
- **Combo**: Consecutive hits without miss/wrongKey
- **Multiplier**: XP multiplier based on combo and groove

### Score vs XP Relationship

The system uses an `xpRatio` (default: 0.1) to separate score from XP:
- **Score Points**: Raw points for gameplay display and leaderboards
- **Character XP**: Score points × xpRatio (10 score = 1 XP with default ratio)

This allows high score feedback during gameplay while keeping character progression balanced.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BeatPracticeView                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Header Stats Row                                        │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ RhythmXPStats (Score, XP, Combo, Multiplier)        │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Lane Feedback Panel (KeyLaneView)                       │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ ComboFeedbackDisplay (Score, Hits, Multiplier)      │ │ │
│  │ │ + Accuracy Feedback                                 │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Bottom Section                                          │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ RhythmXPSessionStats (Summary, Accuracy, Claim XP)  │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Sources

```
rhythmXPConfigStore          beatDetectionStore
     │                             │
     │ config                      │ runtime state
     │                             │ - rhythmXPCalculator
     │                             │ - rhythmSessionTotals
     │                             │ - currentCombo
     │                             │ - lastRhythmXPResult
     │                             │
     └─────────────┬───────────────┘
                   │
                   ▼
            BeatPracticeView
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
   RhythmXPStats  ComboFeedback  RhythmXPSessionStats
```

---

## Components

### RhythmXPStats

**Location:** `src/components/ui/RhythmXPStats.tsx`
**CSS:** `src/components/ui/RhythmXPStats.css`

Displays real-time XP and score statistics in the practice mode header bar. Shows Score, XP, Combo, and Multiplier - always visible during practice.

#### Props

```typescript
interface RhythmXPStatsProps {
    /** Current session totals */
    sessionTotals: RhythmSessionTotals | null;
    /** Last XP result for hit feedback animations */
    lastResult: RhythmXPResult | null;
    /** Current combo count */
    currentCombo: number;
}
```

#### Usage

```tsx
import { RhythmXPStats } from '@/components/ui/RhythmXPStats';

function BeatPracticeView() {
    const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
    const lastRhythmXPResult = useBeatDetectionStore((state) => state.lastRhythmXPResult);
    const currentCombo = useBeatDetectionStore((state) => state.currentCombo);

    return (
        <RhythmXPStats
            sessionTotals={rhythmSessionTotals}
            lastResult={lastRhythmXPResult}
            currentCombo={currentCombo}
        />
    );
}
```

#### Features

- **Score Display**: Formatted with commas (e.g., "1,250")
- **XP Display**: One decimal place (e.g., "12.5")
- **Combo Counter**: Highlights when ≥10 hits
- **Multiplier**: Highlights when >1.0x
- **Hit Feedback Animations**:
  - Pulse effect on XP value change
  - Color flash based on accuracy (green for perfect, etc.)

#### CSS Classes

| Class | Purpose |
|-------|---------|
| `.rhythm-xp-stats` | Container |
| `.rhythm-xp-stat` | Individual stat container |
| `.rhythm-xp-stat-value--score` | Score value styling |
| `.rhythm-xp-stat-value--xp` | XP value styling |
| `.rhythm-xp-stat-value--combo-active` | Active combo (≥10) |
| `.rhythm-xp-stat-value--multiplier-active` | Active multiplier (>1.0x) |
| `.rhythm-xp-pulse` | Pulse animation on value change |
| `.rhythm-xp-flash--perfect` | Green flash for perfect |
| `.rhythm-xp-flash--great` | Light green flash for great |
| `.rhythm-xp-flash--miss` | Red flash for miss |

---

### RhythmXPSessionStats

**Location:** `src/components/ui/RhythmXPSessionStats.tsx`
**CSS:** `src/components/ui/RhythmXPSessionStats.css`

Displays session statistics including total Score/XP summary, accuracy distribution, max combo, bonus notifications, and the Claim XP button.

#### Props

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
    /** Optional className for styling */
    className?: string;
}
```

#### Usage

```tsx
import { RhythmXPSessionStats } from '@/components/ui/RhythmXPSessionStats';

function BeatPracticeView() {
    const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
    const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
    const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);
    const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);

    const handleClaimXP = (xp: number) => {
        // Add XP to character
        addRhythmXP(trackCharacter.seed, xp);
        resetRhythmXP();
    };

    return (
        <RhythmXPSessionStats
            sessionTotals={rhythmSessionTotals}
            pendingComboBonus={pendingComboEndBonus}
            pendingGrooveBonus={pendingGrooveEndBonus}
            onClearBonuses={clearPendingBonuses}
            onClaimXP={handleClaimXP}
            hasCharacter={!!trackCharacter}
        />
    );
}
```

#### Features

- **Summary Row**: Score and XP displayed side-by-side
- **Accuracy Distribution**: Perfect/Great/Good/OK/Miss/Wrong counts with percentage
- **Max Combo Display**: Trophy icon with combo count
- **Bonus Notifications**:
  - Combo End Bonus: "+X XP (Combo: N hits)" with fire emoji
  - Groove End Bonus: "+X XP (Groove Bonus)" with music emoji
  - Auto-dismiss after 2 seconds
- **Claim XP Button**: Shows XP amount, disabled if no character or no XP
- **Empty State**: "Start tapping to earn XP!" message

#### CSS Classes

| Class | Purpose |
|-------|---------|
| `.rhythm-xp-session` | Container |
| `.rhythm-xp-session__summary` | Score/XP summary row |
| `.rhythm-xp-session__accuracy` | Accuracy distribution grid |
| `.rhythm-xp-session__accuracy--perfect` | Perfect color (green) |
| `.rhythm-xp-session__accuracy--great` | Great color (light green) |
| `.rhythm-xp-session__bonus--combo` | Combo bonus notification |
| `.rhythm-xp-session__bonus--groove` | Groove bonus notification |
| `.rhythm-xp-session__claim` | Claim button container |

---

### ComboFeedbackDisplay

**Location:** `src/components/ui/ComboFeedbackDisplay.tsx`
**CSS:** `src/components/ui/ComboFeedbackDisplay.css`

Displays real-time combo and multiplier feedback in the DDR/Guitar lane feedback panel. Shows Score, Combo count, and XP Multiplier - always visible during practice.

#### Props

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

#### Usage

```tsx
import { ComboFeedbackDisplay } from '@/components/ui/ComboFeedbackDisplay';

function KeyLaneView({ score, combo, multiplier }) {
    return (
        <div className="key-lane-view-feedback">
            <ComboFeedbackDisplay
                score={score}
                combo={combo}
                multiplier={multiplier}
            />
            {/* Accuracy feedback below */}
            <div className="accuracy-feedback">PERFECT +15ms</div>
        </div>
    );
}
```

#### Features

- **Score Display**: Formatted with commas (e.g., "1,250")
- **Combo Counter**: Number of consecutive hits with "hits" label
- **Multiplier Display**: Color-coded based on value
- **Combo Reset Animation**: Fade out/in effect when combo breaks
- **Accessibility**:
  - Screen reader summary: "Score: X, Combo: Y hits, Multiplier: Zx"
  - Milestone announcements: "2x multiplier reached!" at 2x, 3x, 4x, 5x

#### Multiplier Color Gradient

| Multiplier | Color | CSS Class |
|------------|-------|-----------|
| 1.0x | Default (white/gray) | (none) |
| 2.0x+ | Yellow | `.combo-feedback-multiplier--yellow` |
| 3.0x+ | Orange | `.combo-feedback-multiplier--orange` |
| 4.0x+ | Red | `.combo-feedback-multiplier--red` |
| 5.0x | Gold | `.combo-feedback-multiplier--gold` |

#### Combo Size Styling

| Combo | Style | CSS Class |
|-------|-------|-----------|
| 10+ | Good | `.combo-feedback-combo--good` |
| 25+ | Great | `.combo-feedback-combo--great` |
| 50+ | Epic | `.combo-feedback-combo--epic` |

---

## Stores

### rhythmXPConfigStore

**Location:** `src/store/rhythmXPConfigStore.ts`

Manages Rhythm XP configuration that persists across sessions. This store is separate from `beatDetectionStore` because:
1. All XP multiplier configs should be in one place (XPCalculatorTab)
2. Config is user-editable and persisted
3. Runtime state is ephemeral and session-scoped

#### State

```typescript
interface RhythmXPConfigState {
    config: RhythmXPConfig;
    metadata: {
        version: number;
        lastModified: number;
    };
}
```

#### Actions

| Action | Purpose |
|--------|---------|
| `updateConfig(config)` | Merge partial config with existing |
| `updateBaseXP(key, value)` | Update a specific base XP value |
| `updateXPRatio(value)` | Update the XP ratio |
| `updateComboConfig(config)` | Update combo configuration |
| `updateGrooveConfig(config)` | Update groove configuration |
| `updateMaxMultiplier(value)` | Update the max multiplier |
| `resetConfig()` | Reset all config to defaults |
| `getConfig()` | Get current config |
| `hasCustomConfig()` | Check if any config differs from defaults |
| `isBaseXPModified(key)` | Check if a base XP value differs from default |

#### Selectors

```typescript
// Get config directly (read-only)
const config = useRhythmXPConfig();

// Get actions directly (write-only)
const actions = useRhythmXPConfigActions();

// Get metadata
const metadata = useRhythmXPConfigMetadata();
```

#### Persistence

- **Storage Key**: `rhythm-xp-config-storage`
- **Persistence**: LocalForage via Zustand persist middleware
- **Migration**: Version-based migration for schema changes

---

### beatDetectionStore (Rhythm XP State)

**Location:** `src/store/beatDetectionStore.ts`

The beat detection store manages Rhythm XP runtime state during practice sessions.

#### Rhythm XP State Properties

```typescript
interface BeatDetectionState {
    // ... other state ...

    // Rhythm XP Runtime State
    rhythmXPCalculator: RhythmXPCalculator | null;
    rhythmSessionTotals: RhythmSessionTotals | null;
    lastRhythmXPResult: RhythmXPResult | null;
    currentCombo: number;
    maxCombo: number;
    previousComboLength: number;
    pendingComboEndBonus: ComboEndBonusResult | null;
    pendingGrooveEndBonus: GrooveEndBonusResult | null;
}
```

#### Rhythm XP Actions

| Action | Purpose |
|--------|---------|
| `initRhythmXP()` | Initialize calculator with config, start session |
| `recordRhythmHit(accuracy, hotness)` | Record hit, update combo, return XP result |
| `processComboEndBonus()` | Calculate combo end bonus when combo breaks |
| `processGrooveEndBonus(grooveStats)` | Calculate groove end bonus when groove ends |
| `getRhythmSessionTotals()` | Get current session totals snapshot |
| `hasUnclaimedXP()` | Check if totalXP > 0 |
| `endRhythmXPSession()` | End session, return final totals |
| `clearPendingBonuses()` | Clear pending bonus notifications |
| `resetRhythmXP()` | Clear all XP state |

#### Usage Example

```typescript
function BeatPracticeView() {
    const initRhythmXP = useBeatDetectionStore((state) => state.actions.initRhythmXP);
    const recordRhythmHit = useBeatDetectionStore((state) => state.actions.recordRhythmHit);
    const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);

    // Initialize on practice start
    useEffect(() => {
        initRhythmXP();
        return () => resetRhythmXP();
    }, []);

    // Record hit on button press
    const handleTap = (result, grooveResult) => {
        const xpResult = recordRhythmHit(result.accuracy, grooveResult.hotness);
        // Use xpResult for UI feedback
    };
}
```

---

## Data Flow

### Hit Processing Flow

```
1. User presses button
       │
       ▼
2. BeatPracticeView.handleTap()
       │
       ├──▶ BeatDetector.detectBeat() → accuracy result
       │
       ├──▶ GrooveAnalyzer.recordHit() → grooveResult
       │
       └──▶ beatDetectionStore.recordRhythmHit(accuracy, hotness)
              │
              ├── Store previousComboLength = currentCombo
              │
              ├── If miss/wrongKey:
              │     ├── processComboEndBonus()
              │     └── Reset currentCombo = 0
              │
              ├── Else:
              │     ├── Increment currentCombo++
              │     └── Update maxCombo if needed
              │
              ├── rhythmXPCalculator.recordHit(accuracy, combo, hotness)
              │
              ├── Update lastRhythmXPResult
              │
              └── Update rhythmSessionTotals
       │
       ▼
3. UI Components re-render with new state
       │
       ├── RhythmXPStats: Shows updated Score/XP/Combo/Multiplier
       │
       ├── ComboFeedbackDisplay: Shows updated combo/multiplier
       │
       └── RhythmXPSessionStats: Shows bonus notifications
```

### Groove End Bonus Flow

```
1. grooveResult.endedGrooveStats is present
       │
       ▼
2. beatDetectionStore.processGrooveEndBonus(grooveStats)
       │
       ├── rhythmXPCalculator.calculateGrooveEndBonus(grooveStats)
       │
       └── Store in pendingGrooveEndBonus
       │
       ▼
3. RhythmXPSessionStats displays notification
       │
       ▼
4. Auto-dismiss after 2 seconds
       │
       ▼
5. clearPendingBonuses() called
```

### Claim XP Flow

```
1. User clicks "Claim XP" button
       │
       ▼
2. RhythmXPSessionStats.onClaimXP(totalXP)
       │
       ▼
3. BeatPracticeView.handleClaimXP(xp)
       │
       ├── Get track character (character.seed === track.id)
       │
       ├── characterStore.addRhythmXP(characterSeed, xp)
       │     │
       │     └── updater.addXP(character, xp, 'rhythm_game')
       │
       ├── If level-up:
       │     └── Show LevelUpDetailModal
       │
       └── resetRhythmXP()
       │
       ▼
4. Session cleared, ready for new session
```

---

## Configuration

This section provides a comprehensive reference for all Rhythm XP configuration options. These settings control how score points and character XP are calculated during rhythm gameplay.

### Default Configuration

```typescript
const DEFAULT_RHYTHM_XP_CONFIG: RhythmXPConfig = {
    baseXP: {
        perfect: 10,
        great: 7,
        good: 5,
        ok: 2,
        miss: 0,
        wrongKey: 0,
    },
    xpRatio: 0.1,
    combo: {
        enabled: true,
        cap: 5.0,
        endBonus: {
            enabled: true,
            multiplier: 2,
        },
    },
    groove: {
        perHitMultiplier: true,
        perHitScale: 1.0,
        endBonus: {
            enabled: true,
            maxStreakWeight: 0.4,
            avgHotnessWeight: 0.4,
            durationWeight: 0.2,
        },
    },
    maxMultiplier: 5.0,
};
```

### Configuration Options Reference

#### Base XP (`baseXP`)

Defines the raw score points awarded for each accuracy level. These values are the foundation of the scoring system before any multipliers are applied.

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `perfect` | number | 10 | 1-50 | Excellent timing (within ±25ms) |
| `great` | number | 7 | 1-30 | Good timing (within ±50ms) |
| `good` | number | 5 | 1-20 | Acceptable timing (within ±100ms) |
| `ok` | number | 2 | 0-10 | Marginal timing (within ±150ms) |
| `miss` | number | 0 | -10 to 0 | No button press or way off timing |
| `wrongKey` | number | 0 | -10 to 0 | Wrong button pressed |

**Impact on Gameplay:**
- Higher values increase the score ceiling, making high combos more rewarding
- Negative values for `miss`/`wrongKey` add a penalty system
- The ratio between values affects the skill gap (e.g., 10/7/5/2 vs 10/9/8/7)

**Example - Hardcore Mode:**
```typescript
baseXP: {
    perfect: 10,
    great: 5,     // Less forgiving
    good: 2,      // Much lower for off-beats
    ok: 0,        // No points for marginal hits
    miss: -5,     // Penalty for misses
    wrongKey: -5, // Penalty for wrong keys
}
```

**Example - Casual Mode:**
```typescript
baseXP: {
    perfect: 15,  // More rewarding for perfect timing
    great: 12,    // Still good points
    good: 10,     // Nearly as good
    ok: 8,        // Forgiving
    miss: 0,      // No penalty
    wrongKey: 0,  // No penalty
}
```

---

#### XP Ratio (`xpRatio`)

Controls the conversion from score points to character XP. This separates gameplay score from character progression.

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `xpRatio` | number | 0.1 | 0.01-1.0 | Multiplier to convert score to XP |

**How It Works:**
- `xpRatio: 0.1` → 10 score points = 1 character XP
- `xpRatio: 0.5` → 10 score points = 5 character XP
- `xpRatio: 1.0` → 10 score points = 10 character XP

**Impact on Progression:**
- Lower values (0.05-0.1) are tuned for D&D 5e-style level progression
- Higher values (0.5-1.0) create faster character advancement
- Adjust based on your game's progression curve and session length

**Example Calculation:**
```typescript
// With default config:
// Player hits a perfect note = 10 score points
// With xpRatio: 0.1 → 10 × 0.1 = 1.0 XP earned

// At 2.5x combo multiplier:
// 10 × 2.5 = 25 score points
// 25 × 0.1 = 2.5 XP earned
```

---

#### Combo Configuration (`combo`)

Controls how consecutive hits affect the XP multiplier. Combo is SEPARATE from groove streak (see Key Concepts).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Whether combo affects multiplier |
| `cap` | number | 5.0 | Maximum combo multiplier (1.5-10.0) |
| `endBonus.enabled` | boolean | true | Whether combo breaks award bonus XP |
| `endBonus.multiplier` | number | 2 | XP multiplier for end bonus calculation |

**Combo Multiplier Formula:**
```typescript
// Default formula: 1 + (combo / 50), capped at `cap`
// At 0 combo: 1.0x
// At 25 combo: 1.5x
// At 50 combo: 2.0x
// At 100 combo: 3.0x
// At 200+ combo: 5.0x (capped)
```

**Combo End Bonus:**
When a combo breaks (miss or wrongKey), a bonus is awarded:
```typescript
// End bonus = comboLength × endBonus.multiplier × xpRatio
// Example: 50 combo × 2 × 0.1 = 10 bonus XP
```

**Impact on Gameplay:**
- Higher `cap` values reward longer combo streaks
- Enabling `endBonus` softens the blow of breaking a combo
- Disable `enabled` for a flat scoring system without combo bonuses

**Example - High Skill Ceiling:**
```typescript
combo: {
    enabled: true,
    cap: 10.0,  // Very high ceiling
    endBonus: {
        enabled: true,
        multiplier: 3,  // Bigger end bonuses
    },
}
```

**Example - Relaxed Mode:**
```typescript
combo: {
    enabled: true,
    cap: 2.0,   // Lower ceiling
    endBonus: {
        enabled: false,  // No end bonus
    },
}
```

---

#### Groove Configuration (`groove`)

Controls how the groove meter (timing consistency) affects XP. Groove is tracked by the `GrooveAnalyzer` and reflects how well the player maintains their timing pocket.

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `perHitMultiplier` | boolean | true | - | Add groove to each hit's multiplier |
| `perHitScale` | number | 1.0 | 0.1-2.0 | Scale factor for per-hit groove bonus |
| `endBonus.enabled` | boolean | true | - | Award bonus when groove ends |
| `endBonus.maxStreakWeight` | number | 0.4 | 0-1 | Weight for max streak in end bonus |
| `endBonus.avgHotnessWeight` | number | 0.4 | 0-1 | Weight for average hotness in end bonus |
| `endBonus.durationWeight` | number | 0.2 | 0-1 | Weight for groove duration in end bonus |

**Per-Hit Groove Multiplier:**
When `perHitMultiplier` is enabled, groove hotness adds to each hit's multiplier:
```typescript
// Groove bonus = (hotness / 100) × perHitScale
// At 80% hotness with perHitScale 1.0: +0.8x multiplier
// At 100% hotness with perHitScale 1.0: +1.0x multiplier

// Total multiplier = combo multiplier + groove bonus (capped at maxMultiplier)
// Example: 2.0x combo + 0.8x groove = 2.8x total
```

**Groove End Bonus:**
When a groove ends (hotness drops to 0 or direction changes), a bonus is awarded based on the groove's statistics:
```typescript
// End bonus = base calculation × weighted stats × xpRatio
// Weights should sum to 1.0 for balanced scaling

// Higher maxStreakWeight: Reward peak performance
// Higher avgHotnessWeight: Reward consistency
// Higher durationWeight: Reward sustained groove
```

**Impact on Gameplay:**
- `perHitMultiplier: true` creates dynamic scoring based on real-time performance
- Higher `perHitScale` makes groove more impactful
- Weight adjustments change what the game rewards (peaks vs consistency vs endurance)

**Example - Consistency Focus:**
```typescript
groove: {
    perHitMultiplier: true,
    perHitScale: 1.0,
    endBonus: {
        enabled: true,
        maxStreakWeight: 0.2,    // Less emphasis on peaks
        avgHotnessWeight: 0.6,   // More emphasis on consistency
        durationWeight: 0.2,
    },
}
```

**Example - Peak Performance:**
```typescript
groove: {
    perHitMultiplier: false,  // No per-hit bonus
    perHitScale: 1.0,
    endBonus: {
        enabled: true,
        maxStreakWeight: 0.6,   // Reward peak streaks
        avgHotnessWeight: 0.2,
        durationWeight: 0.2,
    },
}
```

---

#### Max Multiplier (`maxMultiplier`)

The absolute ceiling for the total XP multiplier, regardless of combo or groove.

| Option | Type | Default | Range | Description |
|--------|------|---------|-------|-------------|
| `maxMultiplier` | number | 5.0 | 1.5-10.0 | Maximum total multiplier |

**How It Works:**
```typescript
// Total multiplier = min(combo multiplier + groove bonus, maxMultiplier)
// Even with 500 combo and 100% hotness:
// - Without cap: could be 10x+10x = 20x
// - With maxMultiplier 5.0: capped at 5.0x
```

**Impact on Gameplay:**
- Lower values (1.5-3.0) create a flatter difficulty curve
- Higher values (5.0-10.0) reward exceptional play
- This is the final safety cap to prevent exploits or runaway scoring

**Example - Competitive Play:**
```typescript
maxMultiplier: 5.0  // Standard competitive cap
```

**Example - Casual/Social:**
```typescript
maxMultiplier: 2.0  // Keeps scores closer together
```

---

### Configuration UI

Configuration is exposed in the **Rhythm XP** tab of `XPCalculatorTab`:

- **Base XP Configuration**: Sliders for each accuracy level (Perfect, Great, Good, OK, Miss, Wrong Key)
- **XP Ratio**: Slider (0.01-1.0)
- **Combo Configuration**:
  - Enable/Disable toggle
  - Cap slider (1.0-10.0)
  - Formula preset selector (Default, Aggressive, Exponential, Step-based)
  - End Bonus Enable/Disable toggle
  - End Bonus multiplier
- **Groove Configuration**:
  - Per-Hit Multiplier Enable/Disable toggle
  - Per-Hit Scale slider (0.1-2.0)
  - End Bonus Enable/Disable toggle
  - Weight sliders for max streak, avg hotness, duration
- **Global Settings**: Max multiplier slider (1.5-10.0)
- **Reset Button**: Reset all to defaults

### Configuration Presets

#### Default (Balanced)
```typescript
// Tuned for D&D 5e-style progression
{
    xpRatio: 0.1,
    combo: { enabled: true, cap: 5.0, endBonus: { enabled: true, multiplier: 2 } },
    groove: { perHitMultiplier: true, perHitScale: 1.0, endBonus: { enabled: true } },
    maxMultiplier: 5.0,
}
```

#### Casual (Forgiving)
```typescript
// Higher XP gain, lower skill ceiling
{
    xpRatio: 0.15,
    combo: { enabled: true, cap: 3.0, endBonus: { enabled: false } },
    groove: { perHitMultiplier: true, perHitScale: 0.5, endBonus: { enabled: false } },
    maxMultiplier: 3.0,
}
```

#### Hardcore (High Skill Ceiling)
```typescript
// Lower XP gain, high rewards for skill
{
    xpRatio: 0.05,
    combo: { enabled: true, cap: 10.0, endBonus: { enabled: true, multiplier: 3 } },
    groove: { perHitMultiplier: true, perHitScale: 1.5, endBonus: { enabled: true } },
    maxMultiplier: 10.0,
}
```

#### Speed Run (Fast Progression)
```typescript
// Quick leveling for testing or short sessions
{
    xpRatio: 0.5,
    combo: { enabled: true, cap: 5.0, endBonus: { enabled: true, multiplier: 2 } },
    groove: { perHitMultiplier: true, perHitScale: 1.0, endBonus: { enabled: true } },
    maxMultiplier: 5.0,
}
```

---

## Key Concepts

### Combo vs Groove Streak (CRITICAL)

**Combo** and **Groove Streak** are **completely different** tracking systems:

| Aspect | Combo | Groove Streak |
|--------|-------|---------------|
| **Definition** | Consecutive hits without miss/wrongKey | Consecutive hits maintaining timing pocket |
| **Reset Condition** | Any `miss` or `wrongKey` accuracy | Hotness drops to 0 OR direction changes |
| **Tracked By** | `beatDetectionStore.currentCombo` | `GrooveAnalyzer` via `grooveState.streakLength` |
| **Used For** | XP multiplier calculation | Groove end bonus, hotness display |
| **UI Display** | ComboFeedbackDisplay component | GrooveMeter component |

### XP Source Tracking

All Rhythm XP uses a single source `'rhythm_game'`:

```typescript
updater.addXP(character, totalXP, 'rhythm_game');
```

Detailed breakdown is preserved internally in `RhythmSessionTotals`:
- Per-hit XP breakdown
- Combo end bonuses
- Groove end bonuses
- Accuracy distribution

### Track-Character Relationship

Characters are associated with tracks via their seed:
- Character seed is derived from track ID
- `character.seed === selectedTrack.id` defines the relationship
- XP earned during practice is added to the track's character

---

## Usage Examples

### Complete BeatPracticeView Integration

This example shows how to fully integrate Rhythm XP into a practice view component:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useBeatDetectionStore } from '@/store/beatDetectionStore';
import { useCharacterStore } from '@/store/characterStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { RhythmXPStats } from '@/components/ui/RhythmXPStats';
import { RhythmXPSessionStats } from '@/components/ui/RhythmXPSessionStats';
import { ComboFeedbackDisplay } from '@/components/ui/ComboFeedbackDisplay';
import { LevelUpDetailModal } from '@/components/LevelUpDetailModal';
import { showToast } from '@/components/ui/Toast';
import type { LevelUpDetail } from '@/types';

function BeatPracticeView() {
    // Selectors for Rhythm XP state
    const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
    const lastRhythmXPResult = useBeatDetectionStore((state) => state.lastRhythmXPResult);
    const currentCombo = useBeatDetectionStore((state) => state.currentCombo);
    const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
    const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);

    // Actions
    const initRhythmXP = useBeatDetectionStore((state) => state.actions.initRhythmXP);
    const recordRhythmHit = useBeatDetectionStore((state) => state.actions.recordRhythmHit);
    const processGrooveEndBonus = useBeatDetectionStore((state) => state.actions.processGrooveEndBonus);
    const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);
    const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);
    const hasUnclaimedXP = useBeatDetectionStore((state) => state.actions.hasUnclaimedXP);

    // Character store for XP claiming
    const addRhythmXP = useCharacterStore((state) => state.addRhythmXP);
    const characters = useCharacterStore((state) => state.characters);

    // Track selection
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);

    // Level-up modal state
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);
    const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

    // Find the character associated with this track
    const trackCharacter = characters.find(c => c.seed === selectedTrack?.id);

    // Initialize Rhythm XP when practice starts
    useEffect(() => {
        initRhythmXP();
        return () => resetRhythmXP();
    }, [initRhythmXP, resetRhythmXP]);

    // Handle button tap - record XP
    const handleTap = useCallback((accuracy: ExtendedBeatAccuracy, grooveResult: GrooveResult) => {
        // Record the hit and get XP result
        const xpResult = recordRhythmHit(accuracy, grooveResult.hotness);

        // Check for groove end bonus
        if (grooveResult.endedGrooveStats) {
            processGrooveEndBonus(grooveResult.endedGrooveStats);
        }

        return xpResult;
    }, [recordRhythmHit, processGrooveEndBonus]);

    // Handle claiming XP with level-up detection
    const handleClaimXP = useCallback((xp: number) => {
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

        resetRhythmXP();
    }, [trackCharacter, addRhythmXP, resetRhythmXP]);

    return (
        <div className="beat-practice-view">
            {/* Header Stats Row */}
            <div className="beat-practice-header">
                <RhythmXPStats
                    sessionTotals={rhythmSessionTotals}
                    lastResult={lastRhythmXPResult}
                    currentCombo={currentCombo}
                />
            </div>

            {/* Practice Area with Combo Feedback */}
            <div className="beat-practice-area">
                <ComboFeedbackDisplay
                    score={rhythmSessionTotals?.totalScore ?? 0}
                    combo={currentCombo}
                    multiplier={lastRhythmXPResult?.totalMultiplier ?? 1.0}
                />
                {/* ... practice content ... */}
            </div>

            {/* Session Stats with Claim Button */}
            <RhythmXPSessionStats
                sessionTotals={rhythmSessionTotals}
                pendingComboBonus={pendingComboEndBonus}
                pendingGrooveBonus={pendingGrooveEndBonus}
                onClearBonuses={clearPendingBonuses}
                onClaimXP={handleClaimXP}
                hasCharacter={!!trackCharacter}
            />

            {/* Level-Up Modal */}
            {showLevelUpModal && (
                <LevelUpDetailModal
                    isOpen={showLevelUpModal}
                    onClose={() => setShowLevelUpModal(false)}
                    levelUpDetails={levelUpDetails}
                    characterName={trackCharacter?.name ?? 'Character'}
                />
            )}
        </div>
    );
}
```

### KeyLaneView Integration with Combo Feedback

This example shows how to integrate `ComboFeedbackDisplay` into the DDR-style lane view:

```tsx
import { ComboFeedbackDisplay } from '@/components/ui/ComboFeedbackDisplay';

interface KeyLaneViewProps {
    // Props passed from parent (BeatPracticeView)
    score: number;
    combo: number;
    multiplier: number;
    // ... other props
}

function KeyLaneView({ score, combo, multiplier, ...otherProps }: KeyLaneViewProps) {
    const [lastAccuracy, setLastAccuracy] = useState<string | null>(null);

    return (
        <div className="key-lane-view">
            {/* Lane lanes */}
            <div className="key-lane-view-lanes">
                {/* ... lane content ... */}
            </div>

            {/* Feedback panel with combo display */}
            <div className="key-lane-view-feedback">
                {/* ComboFeedbackDisplay at the top */}
                <ComboFeedbackDisplay
                    score={score}
                    combo={combo}
                    multiplier={multiplier}
                    className="key-lane-view-combo-feedback"
                />

                {/* Accuracy feedback below */}
                {lastAccuracy && (
                    <div className={`accuracy-feedback accuracy-feedback--${lastAccuracy}`}>
                        {lastAccuracy.toUpperCase()}
                    </div>
                )}
            </div>
        </div>
    );
}
```

### Custom Configuration Example

This example shows how to customize the Rhythm XP configuration:

```tsx
import { useEffect } from 'react';
import { useRhythmXPConfigActions, useRhythmXPConfig } from '@/store/rhythmXPConfigStore';

function RhythmXPConfigPanel() {
    const config = useRhythmXPConfig();
    const {
        updateBaseXP,
        updateXPRatio,
        updateComboConfig,
        updateGrooveConfig,
        updateMaxMultiplier,
        resetConfig,
        hasCustomConfig,
        isBaseXPModified
    } = useRhythmXPConfigActions();

    // Example: Increase perfect points and decrease miss penalty
    const handleCustomizeForCasual = () => {
        updateBaseXP('perfect', 15);  // More points for perfect
        updateBaseXP('miss', -2);      // Small penalty for miss
        updateXPRatio(0.15);           // Higher XP ratio
        updateMaxMultiplier(3.0);      // Lower max multiplier
    };

    // Example: Hardcore mode configuration
    const handleCustomizeForHardcore = () => {
        updateBaseXP('perfect', 10);   // Standard points
        updateBaseXP('great', 5);      // Less for great
        updateBaseXP('miss', -10);     // Heavy penalty
        updateXPRatio(0.05);           // Lower XP ratio
        updateMaxMultiplier(10.0);     // High skill ceiling
        updateComboConfig({ cap: 10.0 }); // Higher combo cap
    };

    return (
        <div className="config-panel">
            <h3>Current Configuration</h3>
            <pre>{JSON.stringify(config, null, 2)}</pre>

            {hasCustomConfig() && (
                <p className="config-modified">Configuration has been customized</p>
            )}

            <div className="config-presets">
                <button onClick={handleCustomizeForCasual}>
                    Casual Mode Preset
                </button>
                <button onClick={handleCustomizeForHardcore}>
                    Hardcore Mode Preset
                </button>
                <button onClick={resetConfig}>
                    Reset to Defaults
                </button>
            </div>
        </div>
    );
}
```

### Exit Prompt with Unclaimed XP

This example shows how to prompt the user when they try to exit with unclaimed XP:

```tsx
import { useState, useCallback } from 'react';
import { useBeatDetectionStore } from '@/store/beatDetectionStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

function BeatPracticeView() {
    const hasUnclaimedXP = useBeatDetectionStore((state) => state.actions.hasUnclaimedXP);
    const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);
    const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);

    const [showExitPrompt, setShowExitPrompt] = useState(false);
    const [onExitCallback, setOnExitCallback] = useState<(() => void) | null>(null);

    // Wrap exit handler to check for unclaimed XP
    const handleExit = useCallback((onExit: () => void) => {
        if (hasUnclaimedXP()) {
            setOnExitCallback(() => onExit);
            setShowExitPrompt(true);
        } else {
            onExit();
        }
    }, [hasUnclaimedXP]);

    // Discard XP and exit
    const handleDiscardAndExit = useCallback(() => {
        resetRhythmXP();
        setShowExitPrompt(false);
        onExitCallback?.();
    }, [resetRhythmXP, onExitCallback]);

    // Claim XP and exit
    const handleClaimAndExit = useCallback(() => {
        // Claim XP logic here...
        handleClaimXP(rhythmSessionTotals?.totalXP ?? 0);
        setShowExitPrompt(false);
        onExitCallback?.();
    }, [rhythmSessionTotals, onExitCallback]);

    return (
        <>
            {/* ... main content ... */}

            {/* Exit Prompt Modal */}
            <Modal
                isOpen={showExitPrompt}
                onClose={() => setShowExitPrompt(false)}
                title="Unclaimed XP"
            >
                <div className="exit-prompt">
                    <p>You have unclaimed XP!</p>
                    <p className="exit-prompt-xp">
                        Score: {rhythmSessionTotals?.totalScore ?? 0} |
                        XP: {(rhythmSessionTotals?.totalXP ?? 0).toFixed(1)}
                    </p>

                    <div className="exit-prompt-actions">
                        <Button variant="primary" onClick={handleClaimAndExit}>
                            Claim & Exit
                        </Button>
                        <Button variant="danger" onClick={handleDiscardAndExit}>
                            Discard & Exit
                        </Button>
                        <Button variant="secondary" onClick={() => setShowExitPrompt(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
```

### Configuration Store Selectors Usage

This example demonstrates the different ways to access the configuration store:

```tsx
import {
    useRhythmXPConfigStore,
    useRhythmXPConfig,
    useRhythmXPConfigActions,
    useRhythmXPConfigMetadata
} from '@/store/rhythmXPConfigStore';

function ConfigExample() {
    // Method 1: Get entire store (not recommended for most cases)
    const entireStore = useRhythmXPConfigStore();

    // Method 2: Get config only (for read-only components)
    const config = useRhythmXPConfig();
    console.log('Base XP for perfect:', config.baseXP.perfect);

    // Method 3: Get actions only (for components that only update config)
    const actions = useRhythmXPConfigActions();
    // Use actions.updateConfig(), actions.resetConfig(), etc.

    // Method 4: Get metadata (for showing last modified, version info)
    const metadata = useRhythmXPConfigMetadata();
    console.log('Config version:', metadata.version);
    console.log('Last modified:', new Date(metadata.lastModified));

    // Method 5: Direct selector for specific config value (optimized)
    const xpRatio = useRhythmXPConfigStore((state) => state.config.xpRatio);
    const comboEnabled = useRhythmXPConfigStore((state) => state.config.combo.enabled);

    return (
        <div>
            <p>XP Ratio: {xpRatio}</p>
            <p>Combo Enabled: {comboEnabled ? 'Yes' : 'No'}</p>
        </div>
    );
}
```

### Handling Bonus Notifications

This example shows how to properly handle combo and groove end bonus notifications:

```tsx
import { useBeatDetectionStore } from '@/store/beatDetectionStore';
import { RhythmXPSessionStats } from '@/components/ui/RhythmXPSessionStats';

function PracticeViewWithBonuses() {
    const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
    const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);
    const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);

    // The RhythmXPSessionStats component handles bonus display automatically:
    // - Shows combo bonus with "🔥 +X XP (Combo: N hits)"
    // - Shows groove bonus with "🎵 +X XP (Groove Bonus)"
    // - Auto-dismisses after 2 seconds
    // - Calls onClearBonuses when dismissed

    return (
        <RhythmXPSessionStats
            sessionTotals={/* ... */}
            pendingComboBonus={pendingComboEndBonus}
            pendingGrooveBonus={pendingGrooveEndBonus}
            onClearBonuses={clearPendingBonuses}
            onClaimXP={/* ... */}
            hasCharacter={true}
        />
    );
}

// Manual bonus handling (if not using RhythmXPSessionStats):
function ManualBonusHandling() {
    const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
    const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);

    useEffect(() => {
        if (pendingComboEndBonus) {
            // Show notification
            showToast(
                `🔥 Combo Bonus: +${pendingComboEndBonus.bonusXP.toFixed(1)} XP (${pendingComboEndBonus.comboLength} hits)`,
                'success'
            );

            // Clear the pending bonus
            clearPendingBonuses();
        }
    }, [pendingComboEndBonus, clearPendingBonuses]);

    return null;
}
```

---

## Related Documentation

- [Rhythm XP Frontend Plan](../plans/RHYTHM_XP_FRONTEND_PLAN.md)
- [Architecture Overview](../architecture/overview.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
