# Engine: Sensitivity & Filter Controls Implementation Plan

> **Project**: playlist-data-engine
> **Depends on**: Nothing (this is the foundation)
> **Blocks**: Frontend sensitivity/filter UI updates

## Overview

Implement TWO separate parameters for beat detection control:

### 1. Sensitivity (Pre-processing)
- **Range**: 0.1 to 10.0
- **Default**: 1.0
- **Behavior**: Adjusts how aggressively the algorithm detects beats (via `dpAlpha`)
  - `< 1.0`: Less sensitive, stricter tempo adherence (fewer beats detected)
  - `= 1.0`: Default algorithm behavior
  - `> 1.0`: More sensitive, more flexible (more beats detected)

### 2. Filter (Post-processing)
- **Range**: 0.0 to 1.0
- **Default**: 0.0
- **Behavior**: Filters detected beats by their intensity value
  - `= 0.0`: No filtering, keep all detected beats
  - `= 0.5`: Keep only beats with intensity >= 0.5
  - `= 1.0`: Keep only beats with intensity = 1.0 (probably none)

### Why Two Parameters?
These controls are independent and can create interesting combinations:
- **High sensitivity + High filter**: Detect many beats, then keep only strongest
- **Low sensitivity + No filter**: Detect fewer beats, keep them all
- **High sensitivity + No filter**: Maximum beat detection
- **Low sensitivity + High filter**: Very conservative, only strongest beats

---

## Phase 1: Post-Processing Filter

### 1.1 Implement Filter in BeatMapGenerator
- [ ] Add new method in `BeatMapGenerator.ts`:
  ```typescript
  private filterBeatsByIntensity(beats: Beat[], filterThreshold: number): Beat[] {
      if (filterThreshold <= 0) return beats; // No filtering

      const filtered = beats.filter(b => b.intensity >= filterThreshold);

      logger.debug('BeatDetection', 'Filtered beats by intensity', {
          originalCount: beats.length,
          filteredCount: filtered.length,
          threshold: filterThreshold,
      });

      return filtered;
  }
  ```
- [ ] Call this method after beat tracking when `filter > 0`

### 1.2 Add Filter Parameter to Options
- [ ] In `BeatMap.ts`, add to `BeatMapGeneratorOptions`:
  ```typescript
  /** Post-processing filter threshold (0.0-1.0, default: 0.0) */
  filter?: number;
  ```
- [ ] Add to defaults:
  ```typescript
  filter: 0.0,
  ```

### 1.3 Add Unit Tests for Filter
- [ ] Test filter = 0.0 (no filtering)
- [ ] Test filter = 0.5 (moderate filtering)
- [ ] Test filter = 0.9 (aggressive filtering)
- [ ] Test edge case: filter = 1.0 (extreme filtering)
- [ ] Test edge case: empty beats array

---

## Phase 2: Pre-Processing Sensitivity

### 2.1 Add Sensitivity to BeatTracker Config
- [ ] In `BeatTracker.ts`, add to `BeatTrackerConfig`:
  ```typescript
  export interface BeatTrackerConfig {
      dpAlpha?: number;
      /** Sensitivity multiplier (0.1-10, default: 1.0) */
      sensitivity?: number;
      minPredecessorRatio?: number;
      maxPredecessorRatio?: number;
  }
  ```
- [ ] In `trackBeats()`, calculate effective dpAlpha:
  ```typescript
  const sensitivity = this.config.sensitivity ?? 1.0;
  const effectiveDpAlpha = Math.round(this.config.dpAlpha / sensitivity);

  // Clamp to reasonable bounds
  const clampedDpAlpha = Math.max(10, Math.min(10000, effectiveDpAlpha));
  ```
- [ ] Use `clampedDpAlpha` in transition cost calculation

### 2.2 Sensitivity Mapping Logic
- [ ] Implement mapping:
  ```typescript
  // sensitivity 0.1 → dpAlpha * 10 = 6800 (very strict, fewer beats)
  // sensitivity 1.0 → dpAlpha * 1 = 680 (default)
  // sensitivity 2.0 → dpAlpha / 2 = 340 (more beats)
  // sensitivity 10.0 → dpAlpha / 10 = 68 (very flexible, many beats)
  ```
- [ ] Add validation/clamping to prevent extreme values

### 2.3 Pass Sensitivity from BeatMapGenerator
- [ ] In `BeatMapGenerator.ts`, create BeatTracker with sensitivity:
  ```typescript
  const beatTracker = new BeatTracker({
      dpAlpha: this.options.dpAlpha,
      sensitivity: this.options.sensitivity,
  });
  ```

### 2.4 Add Sensitivity Parameter to Options
- [ ] In `BeatMap.ts`, add to `BeatMapGeneratorOptions`:
  ```typescript
  /** Pre-processing sensitivity (0.1-10.0, default: 1.0) */
  sensitivity?: number;
  ```
- [ ] Add to defaults:
  ```typescript
  sensitivity: 1.0,
  ```

### 2.5 Add Unit Tests for Sensitivity
- [ ] Test sensitivity = 0.5 produces fewer beats than 1.0
- [ ] Test sensitivity = 1.0 produces default beat count
- [ ] Test sensitivity = 2.0 produces more beats than 1.0
- [ ] Test sensitivity = 5.0 produces even more beats
- [ ] Test sensitivity = 10.0 doesn't produce garbage/noise

---

## Phase 3: Remove/Deprecate Old intensityThreshold

### 3.1 Handle Backwards Compatibility
- [ ] Keep `intensityThreshold` in options for backwards compatibility
- [ ] Map old `intensityThreshold` to new `filter` if present:
  ```typescript
  // Migration: if old intensityThreshold is set, map to filter
  if (options.intensityThreshold !== undefined && options.filter === undefined) {
      options.filter = 1 - options.intensityThreshold; // Invert mapping
  }
  ```
- [ ] Add deprecation warning in logs

### 3.2 Update Metadata
- [ ] Store both `sensitivity` and `filter` in `BeatMapMetadata`
- [ ] Keep `intensityThreshold` for old cached maps
- [ ] Add new fields:
  ```typescript
  interface BeatMapMetadata {
      // ... existing fields
      sensitivity: number;  // Pre-processing sensitivity used
      filter: number;       // Post-processing filter used
  }
  ```

---

## Phase 4: Integration & Documentation

### 4.1 Update BeatMapGenerator.generateBeatMapFromBuffer
- [ ] Apply both parameters:
  ```typescript
  const sensitivity = this.options.sensitivity ?? 1.0;
  const filter = this.options.filter ?? 0.0;

  // Pre-processing: sensitivity is passed to BeatTracker
  const beatTracker = new BeatTracker({
      dpAlpha: this.options.dpAlpha,
      sensitivity: sensitivity,
  });

  // ... run beat detection ...

  // Post-processing: filter beats by intensity
  if (filter > 0) {
      beats = this.filterBeatsByIntensity(beats, filter);
  }
  ```

### 4.2 Integration Tests
- [ ] Test combinations:
  - [ ] Low sensitivity + No filter
  - [ ] High sensitivity + No filter
  - [ ] Default sensitivity + High filter
  - [ ] High sensitivity + High filter
- [ ] Test with various audio types
- [ ] Verify metadata is correctly stored

### 4.3 Update Documentation
- [ ] Update `docs/AUDIO_ANALYSIS.md`:
  - [ ] Document `sensitivity` parameter
  - [ ] Document `filter` parameter
  - [ ] Add usage examples with different combinations
- [ ] Update `DATA_ENGINE_REFERENCE.md`
- [ ] Add inline code comments

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Add `sensitivity` and `filter` to options, update metadata |
| `src/core/analysis/beat/BeatMapGenerator.ts` | Implement filtering, pass sensitivity to tracker |
| `src/core/analysis/beat/BeatTracker.ts` | Add sensitivity to config, adjust dpAlpha |
| `docs/AUDIO_ANALYSIS.md` | Document new parameters |
| `tests/unit/beat/beatMapGenerator.test.ts` | Add tests for both parameters |

---

## API Changes

### Before
```typescript
interface BeatMapGeneratorOptions {
    intensityThreshold?: number; // 0-1, unused
    // ...
}
```

### After
```typescript
interface BeatMapGeneratorOptions {
    /** Pre-processing sensitivity (0.1-10.0, default: 1.0) */
    sensitivity?: number;

    /** Post-processing filter threshold (0.0-1.0, default: 0.0) */
    filter?: number;

    /** @deprecated Use `filter` instead */
    intensityThreshold?: number;
    // ...
}
```

---

## Parameter Behavior Summary

| Sensitivity | Filter | Result |
|-------------|--------|--------|
| 0.5 | 0.0 | Fewer beats detected, all kept |
| 1.0 | 0.0 | Default detection, all kept |
| 2.0 | 0.0 | More beats detected, all kept |
| 1.0 | 0.5 | Default detection, only strong beats kept |
| 2.0 | 0.5 | More beats detected, only strong kept |
| 0.5 | 0.5 | Fewer beats detected, only strong kept |

---

## Estimated Scope

- **Phase 1**: Filter implementation - ~1-2 hours
- **Phase 2**: Sensitivity implementation - ~2-3 hours
- **Phase 3**: Backwards compatibility - ~30 minutes
- **Phase 4**: Integration & docs - ~1-2 hours

**Total**: ~5-7 hours

---

## Completion Checklist

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Backwards compatibility verified
- [ ] Ready to publish new engine version
