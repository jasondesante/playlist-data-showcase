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

### Configuration UI

Configuration is exposed in the **Rhythm XP** tab of `XPCalculatorTab`:

- **Base XP Configuration**: Sliders for each accuracy level
- **XP Ratio**: Slider (0.01-1.0)
- **Combo Configuration**: Enable/disable, cap slider, formula preset, end bonus toggle
- **Groove Configuration**: Per-hit multiplier toggle, scale slider, end bonus weights
- **Global Settings**: Max multiplier slider
- **Reset Button**: Reset all to defaults

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

## Related Documentation

- [Rhythm XP Frontend Plan](../plans/RHYTHM_XP_FRONTEND_PLAN.md)
- [Architecture Overview](../architecture/overview.md)
- [Implementation Status](../IMPLEMENTATION_STATUS.md)
