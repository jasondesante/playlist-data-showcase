# BeatDetectionTab State Persistence Fix - Implementation Plan

## Overview

The BeatDetectionTab is not fully restoring state after page refresh. Investigation revealed **two separate but related issues**:

1. **Merge Function Issue**: The Zustand `merge` function doesn't restore 6 fields that ARE being saved by `partialize`
2. **SubdividedBeatMap Caching Issue**: Key assignments in the Chart Editor aren't persisted because `generateSubdividedBeatMap` and `assignKeyToBeat` don't update the cache

---

## Root Cause Analysis

### Issue 1: Merge Function Missing Fields

In `src/store/beatDetectionStore.ts`, the `partialize` function (line ~3411) correctly persists these fields, but the `merge` function (line ~3576) does NOT restore them:

| Field | Saved by partialize? | Restored by merge? | Impact |
|-------|---------------------|-------------------|--------|
| `cachedInterpolatedBeatMaps` | ✅ Yes | ❌ NO | Interpolation stats lost on refresh |
| `interpolationOptions` | ✅ Yes | ❌ NO | Interpolation settings lost |
| `beatStreamMode` | ✅ Yes | ❌ NO | Beat stream mode lost |
| `downbeatConfig` | ✅ Yes | ❌ NO | Downbeat configuration lost |
| `showMeasureBoundaries` | ✅ Yes | ❌ NO | Measure boundary visibility lost |
| `autoMultiTempo` | ❌ NO | ❌ NO | Auto multi-tempo setting lost |

### Issue 2: SubdividedBeatMap Not Cached

The `generateSubdividedBeatMap` function (line ~2432) generates the beat map but does NOT cache it:
```typescript
set({ subdividedBeatMap: subdividedMap });  // Only sets current state
// MISSING: cachedSubdividedBeatMaps[audioId] = subdividedMap
```

Additionally, when users assign keys in the Chart Editor:
- `assignKeyToBeat` (line ~2798) updates `subdividedBeatMap` but NOT `cachedSubdividedBeatMaps`
- `assignKeysToBeats` (line ~2836) has the same issue
- `clearAllKeyAssignments` likely has the same issue

**Result**: On refresh, the subdivided beat map is loaded from cache (if it exists) but it doesn't have the key assignments because they were never cached.

---

## Phase 1: Fix the Merge Function

**Goal:** Add the missing fields to the `merge` function so persisted state is properly restored.

**Note:** `beatStreamMode` is still needed - it's used by practice mode (buttons were removed from interpolation settings but remain in practice mode).

### Task 1.1: Add Missing Fields to Merge Function Return Object
- [x] Locate the `merge` function return statement (around line 3576-3595)
- [x] Add the following fields to the return object:

```typescript
return {
    ...currentState,
    cachedBeatMaps: persisted?.cachedBeatMaps ?? currentState.cachedBeatMaps,
    cacheOrder: cacheOrder ?? currentState.cacheOrder,
    generatorOptions,
    hopSizeConfig,
    melBandsConfig,
    gaussianSmoothConfig,
    difficultySettings,

    // === ADD THESE MISSING FIELDS ===
    // Interpolation state
    interpolationOptions: persisted?.interpolationOptions ?? currentState.interpolationOptions,
    beatStreamMode: persisted?.beatStreamMode ?? currentState.beatStreamMode,
    cachedInterpolatedBeatMaps: persisted?.cachedInterpolatedBeatMaps ?? currentState.cachedInterpolatedBeatMaps,
    // Downbeat configuration state
    downbeatConfig: persisted?.downbeatConfig ?? currentState.downbeatConfig,
    showMeasureBoundaries: persisted?.showMeasureBoundaries ?? currentState.showMeasureBoundaries,
    // ================================

    // Subdivision state (Phase 3: Task 3.1)
    subdivisionConfig,
    currentSubdivision: persisted?.currentSubdivision ?? currentState.currentSubdivision,
    subdivisionTransitionMode: persisted?.subdivisionTransitionMode ?? currentState.subdivisionTransitionMode,
    cachedUnifiedBeatMaps: persisted?.cachedUnifiedBeatMaps ?? currentState.cachedUnifiedBeatMaps,
    cachedSubdividedBeatMaps: persisted?.cachedSubdividedBeatMaps ?? currentState.cachedSubdividedBeatMaps,
    // Chart Editor state
    chartStyle: persisted?.chartStyle ?? currentState.chartStyle,
    editorMode: persisted?.editorMode ?? currentState.editorMode,
    keyLaneViewMode: persisted?.keyLaneViewMode ?? currentState.keyLaneViewMode,
};
```

---

## Phase 2: Add autoMultiTempo to Persistence

**Goal:** Persist the `autoMultiTempo` setting so users don't have to re-enable it on every refresh.

### Task 2.1: Add autoMultiTempo to PersistedBeatDetectionState Interface
- [x] Locate `PersistedBeatDetectionState` interface (around line 1154)
- [x] Add `autoMultiTempo: boolean;` field

### Task 2.2: Add autoMultiTempo to partialize Function
- [x] Locate the `partialize` function (around line 3411)
- [x] Add `autoMultiTempo: state.autoMultiTempo,` to the returned object

### Task 2.3: Add autoMultiTempo to merge Function
- [x] In the `merge` function return, add:
  ```typescript
  autoMultiTempo: persisted?.autoMultiTempo ?? currentState.autoMultiTempo,
  ```

---

## Phase 3: Fix SubdividedBeatMap Caching

**Goal:** Ensure the subdivided beat map (with key assignments) is properly cached and restored.

**Design Decision:** Use single `set()` calls that update both `subdividedBeatMap` and `cachedSubdividedBeatMaps` together to avoid extra re-renders.

### Task 3.1: Update generateSubdividedBeatMap to Cache Result
- [x] Locate `generateSubdividedBeatMap` function (around line 2432)
- [x] Combine state and cache update into a single `set()` call:
  ```typescript
  const audioId = subdividedMap.audioId;
  set((state) => ({
      subdividedBeatMap: subdividedMap,
      cachedSubdividedBeatMaps: {
          ...state.cachedSubdividedBeatMaps,
          [audioId]: subdividedMap,
      },
  }));
  ```

### Task 3.2: Create Helper Function for Cache Updates
- [x] Create a helper function `updateSubdividedBeatMapWithCache()` to reduce duplication
- [x] This helper will be used by Tasks 3.3-3.5

### Task 3.3: Update assignKeyToBeat to Update Cache
- [x] Locate `assignKeyToBeat` function (around line 2798)
- [x] Use helper function to update both `subdividedBeatMap` and `cachedSubdividedBeatMaps`

### Task 3.4: Update assignKeysToBeats to Update Cache
- [x] Locate `assignKeysToBeats` function (around line 2836)
- [x] Use the helper function to update both state and cache

### Task 3.5: Update clearAllKeyAssignments to Update Cache
- [x] Locate `clearAllKeys` function (actual name in code)
- [x] Use the helper function to update both state and cache

---

## Phase 4: Add Enhanced Logging for Debugging

**Goal:** Add logging to help verify the fix is working correctly.

### Task 4.1: Update onRehydrateStorage Logging
- [x] Locate the `onRehydrateStorage` callback (around line 3597-3607)
- [x] Add logging for the newly restored fields:
  ```typescript
  logger.info('BeatDetection', 'Store rehydrated from storage', {
      cachedBeatMapsCount: Object.keys(state.cachedBeatMaps).length,
      cacheOrderLength: state.cacheOrder.length,
      // Add new fields logging
      cachedInterpolatedBeatMapsCount: Object.keys(state.cachedInterpolatedBeatMaps).length,
      cachedSubdividedBeatMapsCount: Object.keys(state.cachedSubdividedBeatMaps).length,
      hasDownbeatConfig: !!state.downbeatConfig,
      showMeasureBoundaries: state.showMeasureBoundaries,
      autoMultiTempo: state.autoMultiTempo,
  });
  ```

---

## Phase 5: Testing

**Goal:** Verify all fixes work correctly.

### Task 5.1: Test Merge Function Fix
- [ ] Start dev server
- [ ] Select a track and click "Analyze"
- [ ] Verify interpolation stats appear (quarter note detection, confidence, etc.)
- [ ] Refresh the page
- [ ] Verify all interpolation stats are still visible
- [ ] Check browser console for "Store rehydrated" log with correct counts

### Task 5.2: Test autoMultiTempo Persistence
- [ ] Enable "Auto Multi-Tempo" setting
- [ ] Refresh the page
- [ ] Verify the setting is still enabled

### Task 5.3: Test Downbeat Configuration Persistence
- [ ] Configure a custom downbeat position
- [ ] Refresh the page
- [ ] Verify the downbeat configuration is preserved

### Task 5.4: Test Chart Editor Key Assignments
- [ ] Generate subdivisions
- [ ] Assign keys to several beats in the Chart Editor
- [ ] Refresh the page
- [ ] Verify key assignments are still present on the beats

### Task 5.5: Test Full Workflow
- [ ] Select track → Analyze → Generate subdivisions → Assign keys → Refresh
- [ ] Verify everything is restored:
  - [ ] Beat map loaded
  - [ ] Interpolation stats visible
  - [ ] Subdivision stats visible
  - [ ] Key assignments preserved
  - [ ] Settings preserved (downbeat, autoMultiTempo, etc.)

---

## Dependencies

- None - This is a standalone fix

## Estimated Effort

- **Phase 1:** 10 minutes (merge function fix)
- **Phase 2:** 5 minutes (autoMultiTempo persistence)
- **Phase 3:** 20 minutes (subdivided beat map caching)
- **Phase 4:** 5 minutes (logging)
- **Phase 5:** 25 minutes (testing)

**Total:** ~65 minutes

---

## Files to Modify

1. `src/store/beatDetectionStore.ts` - All changes in this file:
   - `PersistedBeatDetectionState` interface
   - `partialize` function
   - `merge` function
   - `generateSubdividedBeatMap` function
   - `updateSubdividedCache` helper function (new)
   - `assignKeyToBeat` function
   - `assignKeysToBeats` function
   - `clearAllKeyAssignments` function
   - `onRehydrateStorage` callback

---

## State That Should NOT Persist

Per user clarification, these should reset on page refresh:
- Practice mode stats (tap history, groove analyzer state)
- Best groove hotness/streak (should reset to 0)
- Current practice mode state

These are NOT in the `partialize` function, so they already reset correctly.

---

## Questions Resolved

1. **autoMultiTempo** → Should persist (adding to partialize and merge)
2. **Selected track** → Playlist store persists it; beat map should auto-restore when track is still selected
3. **Practice stats** → Should reset on refresh (already working correctly)
4. **Collapsible sections** → Don't persist (simpler approach per user request)
5. **Key assignments** → Part of SubdividedBeatMap, but caching wasn't being updated

---

## Acceptance Criteria

- [ ] After clicking "Analyze" and refreshing, all interpolation stats are visible
- [ ] After enabling autoMultiTempo and refreshing, the setting is preserved
- [ ] After configuring downbeat and refreshing, the configuration is preserved
- [ ] After generating subdivisions and refreshing, subdivision stats are visible
- [ ] After assigning keys in Chart Editor and refreshing, key assignments are preserved
- [ ] No TypeScript compilation errors
- [ ] No console errors during page load or state rehydration
- [ ] localStorage correctly stores and retrieves all fields
- [ ] Browser DevTools shows all cached beat maps in localStorage
