# Transition Mode Runtime Update Fix - Implementation Plan

## Overview

Fix the Subdivision Playground transition mode (immediate/downbeat/measure) not updating during playback. Currently, when users change the transition mode in the UI, it doesn't take effect because:

1. **Engine Issue #1**: `SubdivisionPlaybackController` has no `setTransitionMode()` method - the `transitionMode` is captured in constructor and never updated
2. **Engine Issue #2**: `'next-downbeat'` and `'next-measure'` modes check the same condition (`isDownbeat` === `beatInMeasure === 0`), so they behave identically
3. **Frontend Issue**: `beatDetectionStore.setSubdivisionTransitionMode()` only updates store state, doesn't propagate to the active controller

## Research Findings

### Bug in Existing Logic

The current implementation in `SubdivisionPlaybackController.checkPendingSubdivisionChange()`:

```typescript
const shouldChange = this.options.transitionMode === 'next-downbeat'
    ? currentBeat.isDownbeat
    : this.options.transitionMode === 'next-measure'
        ? currentBeat.beatInMeasure === 0
        : false;
```

**Problem**: `isDownbeat` is `true` when `beatInMeasure === 0`. Both modes check the same condition!

### Available Beat Properties

From the `Beat` interface:
- `beatInMeasure`: Position within measure (0 = downbeat, 1, 2, 3...)
- `isDownbeat`: Whether this is the first beat of a measure (same as `beatInMeasure === 0`)
- `measureNumber`: Measure number (0-indexed from first detected downbeat)

### Proposed Fix for Mode Difference

To make `'next-downbeat'` and `'next-measure'` behave differently:

| Mode | Current Behavior | Fixed Behavior |
|------|------------------|----------------|
| `'immediate'` | Apply instantly | Apply instantly (no change) |
| `'next-downbeat'` | Apply at `isDownbeat` | Apply at next beat where `isDownbeat === true` |
| `'next-measure'` | Apply at `beatInMeasure === 0` (same as downbeat!) | Apply when `measureNumber` changes from when change was requested |

**Implementation**: Store the `pendingMeasureNumber` when a deferred change is requested. Apply the change when `currentBeat.measureNumber > pendingMeasureNumber`.

### Expected User Experience (4/4 Time Example)

Scenario: User is on **measure 2, beat 3** and clicks to change subdivision:

| Mode | What Happens | When Change Applies |
|------|---------------|---------------------|
| `'immediate'` | Change happens right away | Instantly at beat 3 |
| `'next-downbeat'` | Waits for next beat 1 | At measure 2, beat 4 → **measure 3, beat 1** (the next downbeat) |
| `'next-measure'` | Waits for NEW measure | At **measure 3, beat 1** (start of next measure) |

**Wait, aren't 'next-downbeat' and 'next-measure' the same?**

In the FIXED implementation, they CAN differ in edge cases:

**Edge Case**: User is on **measure 2, beat 1** (already at a downbeat) and requests a change:

| Mode | What Happens |
|------|---------------|
| `'next-downbeat'` | Applies immediately (we're already AT a downbeat) |
| `'next-measure'` | Waits for measure 3, beat 1 (must be a DIFFERENT measure) |

This gives musicians a meaningful choice:
- **Downbeat**: "Apply at the next beat 1, even if we're already at one"
- **Measure**: "Wait until we're in a new measure before changing"

## Phase 1: Engine Fix (playlist-data-engine)

### Task 1.1: Fix the transition mode logic bug

- [x] Modify `PlaybackState` interface to track pending measure number
  - [x] Add `pendingMeasureNumber: number | null` field
- [x] Update `setSubdivision()` to capture current measure number when deferring
  - [x] Store `state.currentBeat?.measureNumber` in `pendingMeasureNumber`
- [x] Fix `checkPendingSubdivisionChange()` logic:
  ```typescript
  const shouldChange = this.options.transitionMode === 'next-downbeat'
      ? currentBeat.isDownbeat
      : this.options.transitionMode === 'next-measure'
          ? this.state.pendingMeasureNumber !== null &&
            currentBeat.measureNumber > this.state.pendingMeasureNumber &&
            currentBeat.beatInMeasure === 0  // Must be at start of NEW measure
          : false;
  ```

**Location**: `playlist-data-engine/src/core/playback/SubdivisionPlaybackController.ts`

### Task 1.2: Add `setTransitionMode` method to SubdivisionPlaybackController

- [x] Add new public method `setTransitionMode(mode: SubdivisionTransitionMode): void`
  - [x] Validate the mode is a valid `SubdivisionTransitionMode` value
  - [x] Update `this.options.transitionMode` with the new mode
  - [x] If there's a pending subdivision change and mode is changed to `'immediate'`, apply immediately
  - [x] Add debug logging for the mode change

**Location**: `playlist-data-engine/src/core/playback/SubdivisionPlaybackController.ts`

**Implementation approach**:
```typescript
/**
 * Set the transition mode for subdivision changes.
 * Updates how pending subdivision changes are applied.
 * 
 * @param mode - The transition mode ('immediate', 'next-downbeat', 'next-measure')
 * 
 * @example
 * ```typescript
 * // Change to immediate mode during playback
 * controller.setTransitionMode('immediate');
 * 
 * // Any pending subdivision change will apply immediately
 * controller.setSubdivision('eighth');
 * ```
 */
setTransitionMode(mode: SubdivisionTransitionMode): void {
    if (!['immediate', 'next-downbeat', 'next-measure'].includes(mode)) {
        throw new Error(`Invalid transition mode: ${mode}`);
    }

    const oldMode = this.options.transitionMode;
    
    logger.debug('Transition mode change requested', {
        from: oldMode,
        to: mode,
    });

    this.options = {
        ...this.options,
        transitionMode: mode,
    };

    // If switching to immediate mode and there's a pending change, apply it now
    if (mode === 'immediate' && this.state.pendingSubdivision) {
        this.applySubdivisionChange(
            this.state.pendingSubdivision,
            this.state.currentSubdivision
        );
    }

    logger.debug('Transition mode changed', { from: oldMode, to: mode });
}
```

### Task 1.3: Add unit tests for `setTransitionMode` and fixed mode logic

- [x] Add test: should change transition mode successfully
- [x] Add test: should throw on invalid transition mode
- [x] Add test: should apply pending subdivision immediately when switching to 'immediate' mode
- [x] Add test: should preserve pending subdivision when switching between 'next-downbeat' and 'next-measure'
- [x] Add test: `'next-downbeat'` should apply at next beat where `isDownbeat === true`
- [x] Add test: `'next-measure'` should apply when entering a NEW measure (not just any downbeat)
- [x] Add test: `'next-measure'` should NOT apply at current measure's downbeat if change was requested before it

**Location**: `playlist-data-engine/tests/unit/playback/subdivisionPlaybackController.test.ts`

### Task 1.4: Export new functionality from index.ts

- [x] Verify `SubdivisionTransitionMode` type is already exported (it should be)
- [x] No new exports needed since the method is on an existing class

**Location**: `playlist-data-engine/src/index.ts`

---

## Phase 2: Engine Documentation Update (playlist-data-engine)

### Task 2.1: Update DATA_ENGINE_REFERENCE.md

- [x] Add `setTransitionMode` to the SubdivisionPlaybackController methods table
- [x] Update the method description to include the new method

**Location**: `playlist-data-engine/DATA_ENGINE_REFERENCE.md` (around line 2109)

**Changes**:
Add new row to methods table:
```markdown
| `setTransitionMode(mode: SubdivisionTransitionMode): void` | Change transition mode during playback |
```

### Task 2.2: Update BEAT_DETECTION.md

- [x] Add `setTransitionMode` to the SubdivisionPlaybackController methods table
- [x] Add usage example showing runtime transition mode changes

**Location**: `playlist-data-engine/docs/BEAT_DETECTION.md` (around line 2480)

**Changes**:
1. Add new row to methods table:
```markdown
| `setTransitionMode` | `mode: SubdivisionTransitionMode` | `void` | Change transition mode during playback |
```

2. Add usage example section after the method table:
```typescript
// Runtime transition mode changes
controller.setTransitionMode('next-measure');
controller.setSubdivision('eighth'); // Will apply at next measure boundary

// Switch to immediate mode (applies any pending change right away)
controller.setTransitionMode('immediate');
```


---

## Phase 3: Frontend Fix (playlist-data-showcase)

### Task 3.1: Update `setSubdivisionTransitionMode` in beatDetectionStore

- [x] Modify `setSubdivisionTransitionMode` to propagate changes to active controller
- [x] Follow the same pattern used in `setCurrentSubdivision` (lines 2800-2814)

**Location**: `playlist-data-showcase/src/store/beatDetectionStore.ts` (around line 2819)

**Changes**:
```typescript
/**
 * Set the transition mode for subdivision changes.
 * Updates both store state and active playback controller.
 */
setSubdivisionTransitionMode: (mode: 'immediate' | 'next-downbeat' | 'next-measure') => {
    logger.info('BeatDetection', 'Setting subdivision transition mode', {
        mode,
        previousMode: get().subdivisionTransitionMode,
    });

    set({ subdivisionTransitionMode: mode });

    // Also update the playback controller if it exists
    const controller = getActiveSubdivisionPlaybackController();
    if (controller) {
        controller.setTransitionMode(mode);
        logger.info('BeatDetection', 'Updated playback controller transition mode');
    }
},
```

### Task 3.2: Update the store's TypeScript interface

- [x] Verify the interface comment is updated (remove "needs to be re-initialized" note)

**Location**: `playlist-data-showcase/src/store/beatDetectionStore.ts` (around line 905)

### Task 3.3: Clarify UI labels for transition modes

The current UI labels are confusing because they describe the same thing:
- Downbeat: "Wait for beat 1 of next measure"
- Measure: "Wait for start of next measure"

**Proposed new labels** (in `BeatPracticeView.tsx` around line 1210):

| Mode | Current Label | Proposed Label |
|------|---------------|----------------|
| `'immediate'` | "Instant" - "Subdivision changes apply instantly" | Same (no change) |
| `'next-downbeat'` | "Downbeat" - "Wait for beat 1 of next measure" | "Downbeat" - "Apply at next beat 1" |
| `'next-measure'` | "Measure" - "Wait for start of next measure" | "Next Measure" - "Apply when entering new measure" |

- [ ] Update button labels and descriptions in `BeatPracticeView.tsx`
- [ ] Update aria-labels and title attributes for accessibility

**Location**: `playlist-data-showcase/src/components/ui/BeatPracticeView.tsx` (around line 1210)

### Task 3.3: Add/update frontend tests

- [ ] Verify existing tests still pass
- [ ] Add test for `setSubdivisionTransitionMode` propagating to controller

**Location**: `playlist-data-showcase/src/store/beatDetectionStore.subdivision.test.ts`

---

## Phase 4: Verification

### Task 4.1: Manual testing in Subdivision Playground

- [ ] Start playback with a beat map
- [ ] Change transition mode from "Instant" to "Downbeat"
- [ ] Click a subdivision button - verify it waits for next downbeat
- [ ] Change transition mode to "Measure"
- [ ] Click a subdivision button - verify it waits for next measure
- [ ] Change transition mode back to "Instant"
- [ ] Click a subdivision button - verify it applies immediately

### Task 4.2: Run all tests

- [ ] Run engine tests: `cd playlist-data-engine && npm test`
- [ ] Run frontend tests: `cd playlist-data-showcase && npm test`

---

## Dependencies

- Phase 2 (Documentation) depends on Phase 1 (Engine Fix) being complete
- Phase 3 (Frontend) depends on Phase 1 (Engine Fix) being complete
- Phase 4 (Verification) depends on all previous phases

## Questions/Unknowns

- None identified - the implementation approach is straightforward

## Files Changed Summary

| Project | File | Change Type |
|---------|------|-------------|
| playlist-data-engine | `src/core/playback/SubdivisionPlaybackController.ts` | Modify - add `setTransitionMode` method, fix mode logic |
| playlist-data-engine | `tests/unit/playback/subdivisionPlaybackController.test.ts` | Modify - add tests |
| playlist-data-engine | `DATA_ENGINE_REFERENCE.md` | Modify - add method documentation |
| playlist-data-engine | `docs/BEAT_DETECTION.md` | Modify - add method documentation |
| playlist-data-showcase | `src/store/beatDetectionStore.ts` | Modify - propagate mode to controller |
| playlist-data-showcase | `src/store/beatDetectionStore.subdivision.test.ts` | Modify - add/update tests |
| playlist-data-showcase | `src/components/ui/BeatPracticeView.tsx` | Modify - clarify UI labels for transition modes |
