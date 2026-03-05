# Groove Meter Frontend Integration Plan

## Overview

Integrate the GrooveAnalyzer from playlist-data-engine into the front end to provide a "style meter" experience during beat practice mode. The groove meter rewards **consistency in timing feel** rather than proximity to perfect center, inspired by Devil May Cry's style meter.

### Core Philosophy
- Hitting consistently 30ms behind the beat = GOOD (you're in a pocket)
- Hitting perfectly on beat after establishing a behind-beat pocket = BAD (you broke the feel)
- The meter charges when you maintain consistency to YOUR established pocket, not to absolute perfection

### User Requirements (from interview)
- **UI Location**: BeatPracticeView for real-time groove meter + summary stats showing highest groove achieved in session
- **Visual Style**: Devil May Cry style HORIZONTAL bar that fills based on actual hotness from the engine (no visual decay)
- **Direction Display**: Icon + label (e.g., 'Pushing', 'Laid Back', 'On Point')
- **Extra Stats**: Current streak + best streak achieved in session

### Key Design Decisions
- **Hotness Display**: Bar shows actual hotness value from engine - no visual decay animation. Hotness only changes via `recordHit()` and `recordMiss()` calls.
- **Miss Detection**: Post-hit lookback approach - after each hit, look back at the beat map between the current hit and previous hit to find any missed beats. This keeps hit latency low.
- **Placement**: GrooveMeter appears in KeyLane area for DDR/Guitar modes, next to BeatTimeline for TapArea mode.
- **Reset Scope**: Groove resets on seek, but tap statistics are preserved.

---

## Phase 1: Type Exports & Store Setup

### 1.1 Export Groove Types from Engine
- [x] Update [src/types/index.ts](src/types/index.ts) to export groove types from playlist-data-engine
  - [x] Export `GrooveDirection` type
  - [x] Export `GrooveResult` type
  - [x] Export `GrooveState` type
  - [x] Export `GrooveAnalyzerOptions` type
  - [x] Export `GrooveAnalyzer` class
  - [x] Export `DEFAULT_GROOVE_OPTIONS` constant

**Files to modify:**
- `src/types/index.ts`

---

## Phase 2: BeatDetectionStore Integration

### 2.1 Add Groove State to Store
- [x] Add groove state properties to [beatDetectionStore.ts](src/store/beatDetectionStore.ts)
  - [x] `grooveAnalyzer: GrooveAnalyzer | null` - The analyzer instance
  - [x] `grooveState: GrooveState | null` - Current groove state snapshot
  - [x] `bestGrooveHotness: number` - Highest hotness achieved in session (0-100)
  - [x] `bestGrooveStreak: number` - Highest streak achieved in session

### 2.2 Add Groove Actions to Store
- [x] Add groove actions to beatDetectionStore
  - [x] `initGrooveAnalyzer()` - Create new GrooveAnalyzer instance
  - [x] `recordGrooveHit(offset: number, bpm: number)` - Call analyzer.recordHit()
  - [x] `recordGrooveMiss()` - Call analyzer.recordMiss()
  - [x] `resetGrooveAnalyzer()` - Reset analyzer state
  - [x] `updateGrooveState(state: GrooveState)` - Update current state snapshot
  - [x] `updateBestGroove(hotness: number, streak: number)` - Track best achievements

### 2.3 Add Groove Selectors
- [x] Add selector hooks for components
  - [x] `useGrooveAnalyzer()` - Get analyzer instance
  - [x] `useGrooveState()` - Get current state
  - [x] `useGrooveHotness()` - Get current hotness (convenience selector for re-render optimization)
  - [x] `useBestGrooveHotness()` - Get best hotness
  - [x] `useBestGrooveStreak()` - Get best streak

**Files to modify:**
- `src/store/beatDetectionStore.ts`

---

## Phase 3: GrooveMeter UI Component

### 3.1 Create GrooveMeter Component
- [x] Create [src/components/ui/GrooveMeter.tsx](src/components/ui/GrooveMeter.tsx)
  - [x] Props interface with `hotness`, `direction`, `streak`
  - [x] Horizontal bar that fills based on hotness (0-100%)
  - [x] Direction icon + label display
  - [x] Streak counter display
  - [x] Compact variant for inline display next to timeline

### 3.2 Create GrooveMeter Styles
- [x] Create [src/components/ui/GrooveMeter.css](src/components/ui/GrooveMeter.css)
  - [x] Horizontal bar container
  - [x] Fill bar with gradient (colors based on hotness level)
  - [x] Direction icon styles (↑ for push, ↓ for pull, ● for neutral)
  - [x] Label styles ('Pushing', 'Laid Back', 'On Point')
  - [x] Streak badge styles
  - [x] Compact variant styles for TapArea mode

### 3.3 Design Visual Details
- [x] **Bar Fill Colors** (gradient based on hotness):
  - 0-25%: Cool blue (building up)
  - 26-50%: Green (decent groove)
  - 51-75%: Orange (hot groove)
  - 76-100%: Red/orange pulse (on fire!)
- [x] **Direction Labels**:
  - `push` → "Pushing" (↑ icon, blue tint)
  - `pull` → "Laid Back" (↓ icon, orange tint)
  - `neutral` → "On Point" (● icon, white/gold)
- [x] **Placement Variants**:
  - Full-width for KeyLane mode (above the lanes)
  - Compact/inline for TapArea mode (next to BeatTimeline)

**Files to create:**
- `src/components/ui/GrooveMeter.tsx`
- `src/components/ui/GrooveMeter.css`

---

## Phase 4: GrooveStats Summary Component

### 4.1 Create GrooveStats Component
- [x] Create [src/components/ui/GrooveStats.tsx](src/components/ui/GrooveStats.tsx)
  - [x] Props interface with `bestHotness`, `bestStreak`, `currentHotness`, `currentStreak`
  - [x] Display best hotness achieved in session
  - [x] Display best streak achieved in session
  - [x] Optional: Show current vs best comparison

### 4.2 Create GrooveStats Styles
- [x] Create [src/components/ui/GrooveStats.css](src/components/ui/GrooveStats.css)
  - [x] Card-style container with elevation
  - [x] Stat items with icons
  - [x] Trophy/badge icon for best achievements
  - [x] Color coding for achievement levels

**Files to create:**
- `src/components/ui/GrooveStats.tsx`
- `src/components/ui/GrooveStats.css`

---

## Phase 5: BeatPracticeView Integration

### 5.1 Initialize GrooveAnalyzer
- [x] Update [BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx)
  - [x] Initialize groove analyzer when practice mode starts
  - [x] Reset groove analyzer when track changes or practice restarts
  - [x] Reset groove analyzer when user seeks to different position (combo ends)
  - [x] Import groove store selectors (will be imported when needed in Task 5.2)

### 5.2 Wire Up Groove Recording
- [x] Update `handleTap` function in BeatPracticeView
  - [x] After `checkTap()` call, also call `recordGrooveHit(offset, currentBpm)`
  - [x] Pass the offset from the tap result
  - [x] Pass the current BPM from beat stream
  - [x] Update groove state after recording

### 5.3 Handle Missed Beats (Post-Hit Lookback)
- [x] Implement post-hit lookback for missed beat detection
  - [x] After `recordGrooveHit()` returns, perform lookback to find missed beats
  - [x] Store timestamp of previous hit for comparison
  - [x] Query beat map for beats between `previousHitTime` and `currentHitTime`
  - [x] Call `recordGrooveMiss()` for each beat found in that range
  - [x] Update groove state after processing misses
  - [x] **Important**: This runs AFTER the hit is recorded to keep latency low

```typescript
// Example integration in BeatPracticeView handleTap
const handleTap = useCallback((key: string) => {
  // 1. Record the hit FIRST (low latency path)
  const result = checkTap(key);
  const grooveResult = recordGrooveHit(result.offset, currentBpm);
  
  // 2. THEN do lookback for missed beats (post-processing)
  const currentHitTime = audioTime;
  const previousHitTime = lastHitTimeRef.current;
  
  if (previousHitTime !== null) {
    // Find beats in the map between previous hit and current hit
    const missedBeats = beatMap.beats.filter(beat => 
      beat.timestamp > previousHitTime && 
      beat.timestamp < currentHitTime
    );
    
    // Record a miss for each missed beat
    missedBeats.forEach(() => recordGrooveMiss());
  }
  
  // Update last hit time for next comparison
  lastHitTimeRef.current = currentHitTime;
}, [checkTap, recordGrooveHit, recordGrooveMiss, currentBpm, beatMap]);
```

### 5.4 Add Last Hit Time Tracking
- [x] Add state/ref to track the timestamp of the last recorded hit
  - [x] `lastHitTimeRef: Ref<number | null>` - stores timestamp of previous hit
  - [x] Reset to `null` when groove analyzer resets (on seek, track change)
  - [x] Updated after each successful `recordGrooveHit()` call

### 5.5 Add GrooveMeter to UI
- [x] Add GrooveMeter component to BeatPracticeView layout with conditional placement
  - [x] **KeyLane mode** (`keyLaneViewMode !== 'off'`): Place above KeyLaneView
  - [x] **TapArea mode** (`keyLaneViewMode === 'off'`): Place inline next to BeatTimeline
  - [x] Pass `hotness`, `direction`, `streak` from groove state
  - [x] Show real-time updates as user plays
  - [x] Use compact variant for TapArea mode placement

```tsx
// Conditional placement example
{keyLaneViewMode === 'off' ? (
  // TapArea mode - inline with timeline
  <div className="beat-practice-timeline-row">
    <GrooveMeter variant="compact" {...grooveState} />
    <BeatTimeline ... />
  </div>
) : (
  // KeyLane mode - above lanes
  <div className="beat-practice-keylane-container">
    <GrooveMeter variant="full" {...grooveState} />
    <KeyLaneView ... />
  </div>
)}
```

### 5.6 Add GrooveStats to UI
- [x] Add GrooveStats component to BeatPracticeView
  - [x] Place below practice area or in stats panel
  - [x] Show best hotness and streak achieved in session
  - [x] Update when new best is achieved

**Files to modify:**
- `src/components/ui/BeatPracticeView.tsx`
- `src/components/ui/BeatPracticeView.css`

---

## Phase 6: AudioAnalysisTab Integration

### 6.1 Add GrooveStats to Beat Map Summary
- [x] Update [BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx) (optional)
  - [x] Show groove stats after practice session ends
  - [x] Display "Best Groove: X%" and "Best Streak: X"
  - [x] Only show if groove was active during session

**Files to modify:**
- `src/components/ui/BeatMapSummary.tsx` (optional)

---

## Phase 7: CSS Animations & Polish

### 7.1 Add Hotness Level Transitions
- [x] Add color transition animations
  - [x] Smooth color changes as hotness crosses thresholds
  - [x] Pulse effect when reaching 75%+ hotness
  - [x] Glow effect at 90%+ hotness

### 7.2 Add Direction Change Animations
- [x] Animate direction label changes
  - [x] Fade out old label, fade in new label
  - [x] Icon rotation/morph effect
  - [x] Subtle background color shift

**Files to modify:**
- `src/components/ui/GrooveMeter.css`

---

## Phase 8: Testing & Edge Cases

### 8.1 Unit Tests for Store
- [x] Create/update tests for beatDetectionStore groove functionality
  - [x] Test groove analyzer initialization
  - [x] Test `recordGrooveHit` updates state correctly
  - [x] Test `recordGrooveMiss` reduces hotness
  - [x] Test best groove tracking
  - [x] Test reset clears all groove state

### 8.2 Component Tests
- [ ] Create tests for GrooveMeter component
  - [ ] Test bar fills correctly based on hotness
  - [ ] Test direction labels display correctly
  - [ ] Test streak counter displays
  - [ ] Test color changes at threshold boundaries

### 8.3 Integration Tests
- [ ] Test groove meter integration with BeatPracticeView
  - [ ] Test groove updates on tap
  - [ ] Test decay behavior over time
  - [ ] Test best groove tracking across session

**Files to create/modify:**
- `src/store/beatDetectionStore.groove.test.ts`
- `src/components/ui/GrooveMeter.test.tsx`

---

## Implementation Order

**Recommended sequence:**

1. **Phase 1** (Type exports) - Foundation for all other work
2. **Phase 2** (Store integration) - Core state management
3. **Phase 3** (GrooveMeter UI) - Visual component
4. **Phase 5.1-5.4** (BeatPracticeView integration) - Wire up the analyzer
5. **Phase 4** (GrooveStats) - Summary display
6. **Phase 5.5** (Add GrooveMeter to UI) - Place components in layout
7. **Phase 6** (AudioAnalysisTab) - Optional summary display
8. **Phase 7** (CSS polish) - Animations and transitions
9. **Phase 8** (Testing) - Verify everything works

---

## Technical Notes

### GrooveAnalyzer API (from engine)

```typescript
// Create analyzer
const grooveAnalyzer = new GrooveAnalyzer(options?: Partial<GrooveAnalyzerOptions>);

// Record a hit (call after each button press)
const result: GrooveResult = grooveAnalyzer.recordHit(offset: number, bpm: number);

// Record a miss (call when user doesn't press on a beat)
const result: GrooveResult = grooveAnalyzer.recordMiss();

// Get current state
const state: GrooveState = grooveAnalyzer.getState();

// Reset analyzer
grooveAnalyzer.reset();
```

### GrooveResult Interface

```typescript
interface GrooveResult {
  pocketDirection: GrooveDirection;  // 'push' | 'pull' | 'neutral'
  establishedOffset: number;         // Running average offset (pocket center)
  consistency: number;                // 0-1, how close to pocket
  hotness: number;                    // 0-100, meter value
  streakLength: number;               // Consecutive hits in pocket
  inPocket: boolean;                  // Whether this hit was in pocket
  pocketWindow: number;               // Current window size in seconds
}
```

### Default Options

```typescript
const DEFAULT_GROOVE_OPTIONS = {
  minHitsForPocket: 3,              // Hits needed to establish pocket
  basePocketWindowFraction: 0.03125, // 1/32 note
  minPocketWindowSeconds: 0.015,    // 15ms floor
  hotnessGainPerHit: 8,             // +8 on consistent hit
  hotnessLossOnBreak: 20,           // -20 on pocket break
  hotnessLossOnMiss: 10,            // -10 on missed beat
  averagingWindowSize: 4,           // Recent hits to average
  neutralDeadZone: 0.010,           // ±10ms for neutral
};
```

### Hotness Display

The bar displays the actual `hotness` value from the engine - no visual decay animation. Hotness only changes when:
- `recordHit()` is called (may increase or decrease based on consistency)
- `recordMiss()` is called (always decreases)

This keeps the visual display in sync with the actual game state and simplifies the implementation.

---

## Dependencies

- [x] `playlist-data-engine` GrooveAnalyzer implementation (complete)
- [x] `playlist-data-engine` type exports (complete)
- [ ] Frontend type imports (Phase 1)
- [ ] Zustand store setup (Phase 2)

---

## Questions/Unknowns

### Resolved Questions

- [x] ~~Where should the Groove Meter UI be displayed?~~
  - **Answer:** BeatPracticeView for real-time display, summary stats in session results

- [x] ~~What visual style for the hotness meter?~~
  - **Answer:** Devil May Cry style horizontal bar with decay animation

- [x] ~~How to display groove direction?~~
  - **Answer:** Icon + label ('Pushing', 'Laid Back', 'On Point')

- [x] ~~What additional stats to display?~~
  - **Answer:** Current streak + best streak achieved in session

- [x] ~~Should decay be implemented in engine or frontend?~~
  - **Answer:** Neither - no visual decay. Bar shows actual engine hotness value which only changes via recordHit/recordMiss.

- [x] **How should missed beats be detected?**
  - **Answer:** Post-hit lookback approach. After each hit is recorded, look back at the beat map between the current hit time and previous hit time to find any missed beats. This keeps hit latency low by processing misses after the hit result is returned.

### Resolved Questions

- [x] **When should missed beats be detected?**
  - **Answer:** Track ALL beats in BeatStream and detect when one passes without a tap. Count misses on all missed notes, regardless of difficulty settings.

- [x] **Should groove analyzer reset on track seek/restart?**
  - **Answer:** Yes - reset groove analyzer completely on seek. Groove is like a combo meter - it stops as soon as the combo/streak ends.

- [x] **What happens to groove state when exiting practice mode?**
  - **Answer:** Clear groove state completely (current hotness, streak, pocket). Preserve best stats (bestHotness, bestStreak) for summary display, but current groove combo resets.

---

## Success Criteria

- [ ] Groove meter displays in BeatPracticeView during practice mode
- [ ] Hotness bar fills on consistent hits based on engine hotness value
- [ ] Direction label changes correctly based on established pocket
- [ ] Streak counter updates in real-time
- [ ] Best hotness and streak are tracked and displayed
- [ ] Groove analyzer resets appropriately on track change/seek
- [ ] All types are properly exported and imported
- [ ] Store actions and selectors work correctly
- [ ] UI is responsive and accessible
- [ ] Animations are smooth and performant

---

## Estimated Effort

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 1: Type Exports | 5 subtasks | 15 min |
| Phase 2: Store Setup | 9 subtasks | 45 min |
| Phase 3: GrooveMeter UI | 7 subtasks | 1 hour |
| Phase 4: GrooveStats UI | 4 subtasks | 45 min |
| Phase 5: BeatPracticeView | 8 subtasks | 1 hour |
| Phase 6: AudioAnalysisTab | 2 subtasks | 30 min |
| Phase 7: CSS Polish | 4 subtasks | 30 min |
| Phase 8: Testing | 6 subtasks | 1 hour |
| **Total** | **42 subtasks** | **~6 hours** |

---

## Next Steps

1. Start with Phase 1 (Type Exports) - quick win, enables all other work
2. Move to Phase 2 (Store Setup) - foundation for state management
3. Build Phase 3 (GrooveMeter UI) - core visual component
4. Integrate in Phase 5 (BeatPracticeView) - make it functional
5. Add Phase 4 (GrooveStats) - summary display
6. Polish in Phase 7 (CSS) - make it look great
7. Test in Phase 8 - verify everything works
