# Simplify Beat Interpolation: Frontend Implementation Plan

## Overview

This plan aligns the frontend with the engine changes from [simplify-beat-interpolation-plan.md](../../playlist-data-engine/docs/plans/simplify-beat-interpolation-plan.md). The engine now uses only the **Adaptive Phase-Locked Grid** algorithm, removing the algorithm selection feature entirely.

**What Changed in Engine**:
- Removed `InterpolationAlgorithm` type
- Removed `histogram-grid` and `dual-pass` algorithm implementations
- `BeatInterpolationOptions` no longer has `algorithm` field
- `InterpolationMetadata` no longer has `algorithm` field
- `BeatInterpolator` constructor no longer accepts `algorithm` option

---

## Already Completed ✅

These changes were made during earlier UI simplification:

- [x] Removed algorithm selector UI from `BeatInterpolationSettings.tsx`
- [x] Removed `InterpolationComparisonView` from `AudioAnalysisTab.tsx`
- [x] Removed `GitCompare` icon import
- [x] Changed default `beatStreamMode` to `'merged'`
- [x] Added export button for beat map data
- [x] Added superseded notice to `BEAT_INTERPOLATION_FRONTEND_PLAN.md`

---

## Files to Modify

> **Note**: Play it by ear! Some items below may already be partially or fully completed. Check each file before making changes.

| File | Changes |
|------|--------|
| `src/types/index.ts` | Remove `InterpolationAlgorithm` type import |
| `src/store/beatDetectionStore.ts` | Remove `selectedAlgorithm` state, actions, selectors |
| `src/components/ui/BeatMapSummary.tsx` | Remove algorithm display name mapping |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Remove `algorithm` from export data |
| `docs/plans/BEAT_INTERPOLATION_FRONTEND_PLAN.md` | Mark as superseded, add note |

---

## Phase 1: Update Types (src/types/index.ts)

- [x] **1.1 Remove InterpolationAlgorithm Type Import**

**Current code** (lines ~467-477):
```typescript
export type {
    BeatSource,
    BeatWithSource,
    InterpolationAlgorithm,  // REMOVE THIS
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
} from 'playlist-data-engine';
```

**New code**:
```typescript
export type {
    BeatSource,
    BeatWithSource,
    // InterpolationAlgorithm - REMOVED: Engine now uses only adaptive-phase-locked
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
} from 'playlist-data-engine';
```

---

## Phase 2: Update Store (src/store/beatDetectionStore.ts)

- [x] **2.1 Remove InterpolationAlgorithm Import**

Remove `InterpolationAlgorithm` from imports if present.

- [x] **2.2 Update InterpolationConfigSnapshot Interface**

**Current** (lines ~171-174):
```typescript
export interface InterpolationConfigSnapshot {
    interpolationOptions: BeatInterpolationOptions;
    selectedAlgorithm: InterpolationAlgorithm;
}
```

**New**:
```typescript
export interface InterpolationConfigSnapshot {
    interpolationOptions: BeatInterpolationOptions;
    // selectedAlgorithm removed - engine uses only adaptive-phase-locked
}
```

- [x] **2.3 Update interpolationConfigsDiffer Function**

**Current** (lines ~192-194):
```typescript
// Compare selected algorithm
if (a.selectedAlgorithm !== b.selectedAlgorithm) return true;
```

**New**: Remove this comparison.

- [x] **2.4 Update createInterpolationConfigSnapshot Function**

**Current** (lines ~220-226):
```typescript
export const createInterpolationConfigSnapshot = (
    interpolationOptions: BeatInterpolationOptions,
    selectedAlgorithm: InterpolationAlgorithm
): InterpolationConfigSnapshot => ({
    interpolationOptions: { ...interpolationOptions },
    selectedAlgorithm,
});
```

**New**:
```typescript
export const createInterpolationConfigSnapshot = (
    interpolationOptions: BeatInterpolationOptions
): InterpolationConfigSnapshot => ({
    interpolationOptions: { ...interpolationOptions },
});
```

- [x] **2.5 Remove selectedAlgorithm from State Interface**

**Current** (lines ~284-286):
```typescript
/** Selected interpolation algorithm */
selectedAlgorithm: InterpolationAlgorithm;
```

**New**: Remove this property.

- [x] **2.6 Remove setSelectedAlgorithm Action**

**Current** (lines ~470-472):
```typescript
/**
 * Set the selected interpolation algorithm.
 * @param algorithm - The algorithm to use ('histogram-grid' | 'adaptive-phase-locked' | 'dual-pass')
 */
setSelectedAlgorithm: (algorithm: InterpolationAlgorithm) => void;
```

**New**: Remove this action.

- [x] **2.7 Remove selectedAlgorithm from Initial State**

**Current** (line ~558):
```typescript
selectedAlgorithm: 'adaptive-phase-locked', // Best algorithm after testing
```

**New**: Remove this line.

- [x] **2.8 Update BeatInterpolator Instantiation (Multiple Locations)**

**Current** (appears at lines ~726-729, ~834-837, ~1215-1218):
```typescript
const interpolator = new BeatInterpolator({
    ...freshState.interpolationOptions,
    algorithm: freshState.selectedAlgorithm,
});
```

**New**:
```typescript
const interpolator = new BeatInterpolator(freshState.interpolationOptions);
```

- [x] **2.9 Remove setSelectedAlgorithm Action Implementation**

**Current** (lines ~1145-1157):
```typescript
setSelectedAlgorithm: (algorithm) => {
    logger.info('BeatDetection', 'Setting interpolation algorithm', { algorithm });
    set((state) => ({
        selectedAlgorithm: algorithm,
        interpolationOptions: {
            ...state.interpolationOptions,
        },
    }));
},
```

**New**: Remove this entire action implementation.

- [x] **2.10 Update generateInterpolatedBeatMap Action**

Remove `selectedAlgorithm` destructuring and logging.

- [x] **2.11 Remove selectedAlgorithm from Partialize**

**Current** (line ~1272):
```typescript
selectedAlgorithm: state.selectedAlgorithm,
```

**New**: Remove this line.

- [x] **2.12 Remove useSelectedAlgorithm Selector**

**Current** (lines ~1679-1682):
```typescript
/**
 * Selector to get the selected interpolation algorithm.
 */
export const useSelectedAlgorithm = () =>
    useBeatDetectionStore((state) => state.selectedAlgorithm);
```

**New**: Remove this selector entirely.

- [x] **2.13 Update useInterpolationState Selector**

Remove `selectedAlgorithm` from the return object.

- [x] **2.14 Update useInterpolationSettingsChanged Selector**

Update to not compare `selectedAlgorithm`.

---

## Phase 3: Update BeatMapSummary Component

- [x] **3.1 Remove useSelectedAlgorithm Import**

**Current** (lines ~22-25):
```typescript
import {
    useInterpolationStatistics,
    useSelectedAlgorithm,
} from '../../store/beatDetectionStore';
```

**New**:
```typescript
import {
    useInterpolationStatistics,
} from '../../store/beatDetectionStore';
```

- [x] **3.2 Remove ALGORITHM_DISPLAY_NAMES Constant**

**Current** (lines ~156-161):
```typescript
const ALGORITHM_DISPLAY_NAMES: Record<string, string> = {
  'histogram-grid': 'Histogram Grid',
  'adaptive-phase-locked': 'Adaptive Phase-Locked',
  'dual-pass': 'Dual-Pass',
};
```

**New**: Remove this constant entirely.

- [x] **3.3 Remove selectedAlgorithm Hook Call**

**Current** (line ~169):
```typescript
const selectedAlgorithm = useSelectedAlgorithm();
```

**New**: Remove this line.

- [x] **3.4 Update Interpolation Stats Header**

**Current** (line ~323):
```typescript
Interpolation ({ALGORITHM_DISPLAY_NAMES[selectedAlgorithm] || selectedAlgorithm})
```

**New**:
```typescript
Interpolation
```

---

## Phase 4: Update AudioAnalysisTab Component

- [x] **4.1 Remove algorithm from Export Data**

**Current** (line ~95):
```typescript
algorithm: 'adaptive-phase-locked',
```

**New**: Remove this line from the export data object.

---

## Phase 5: Update Plan Document

- [x] **5.1 Add Superseded Notice to BEAT_INTERPOLATION_FRONTEND_PLAN.md**

Already completed.

---

## Phase 6: Clean Up InterpolationComparisonView (Optional)

The `InterpolationComparisonView` component is no longer used after earlier changes. Consider:

- [x] **6.1 Decide fate of InterpolationComparisonView.tsx**

Options:
1. **Keep the file** - It may be useful for future research/debugging
2. **Delete the file** - It's dead code now
3. **Archive the file** - Move to a `__archive__` folder

**Decision**: Deleted the file (and its CSS) since the engine no longer supports multiple algorithms.

---

## Summary of Removals

| Item | Location | Action |
|------|----------|--------|
| `InterpolationAlgorithm` type | `src/types/index.ts` | Remove from exports |
| `selectedAlgorithm` state | `beatDetectionStore.ts` | Remove from state interface |
| `setSelectedAlgorithm` action | `beatDetectionStore.ts` | Remove action |
| `useSelectedAlgorithm` selector | `beatDetectionStore.ts` | Remove selector |
| `ALGORITHM_DISPLAY_NAMES` | `BeatMapSummary.tsx` | Remove constant |
| `selectedAlgorithm` usage | `BeatMapSummary.tsx` | Remove hook call and display |
| `algorithm` in export | `AudioAnalysisTab.tsx` | Remove from export data |
| Algorithm from config snapshot | `beatDetectionStore.ts` | Remove from interface/function |

---

## Testing Checklist

- [x] TypeScript compiles without errors
- [x] Beat map generation still works (verified: build passes, BeatInterpolator instantiated correctly, migration tests pass)
- [x] Interpolation still generates correctly (verified: all beat detection tests pass after fixing mocks)
- [x] Practice mode works with merged beats (verified: code review confirms correct flow from UI toggle → useBeatStream → engine's BeatStream with useInterpolatedBeats option)
- [ ] Export button works
- [ ] No console errors about missing properties
- [ ] BeatMapSummary displays correctly without algorithm name

> **Note**: The OSE tests (`BeatDetectionSettings.ose.test.tsx`) have been fixed by adding missing mocks: `detectInterpolationPreset`, `INTERPOLATION_PRESETS`, and proper `useInterpolationOptions` return values.

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| No `InterpolationAlgorithm` references | `grep -r "InterpolationAlgorithm" src/` returns empty |
| No `selectedAlgorithm` references | `grep -r "selectedAlgorithm" src/` returns empty |
| No algorithm-related imports | Check types/index.ts imports |
| Build succeeds | `npm run build` |
| Tests pass | `npm test` |

---

## Estimated Effort

| Phase | Time |
|-------|------|
| Phase 1: Types | 5 min |
| Phase 2: Store | 20 min |
| Phase 3: BeatMapSummary | 10 min |
| Phase 4: AudioAnalysisTab | 5 min |
| Phase 5: Plan Doc | 5 min |
| Phase 6: Cleanup (optional) | 10 min |
| **Total** | **~1 hour** |
