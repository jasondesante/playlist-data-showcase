# Frontend: Sensitivity & Filter UI Implementation Plan

> **Project**: playlist-data-showcase
> **Depends on**: Engine sensitivity/filter implementation (see ENGINE_INTENSITY_SENSITIVITY_PLAN.md)
> **Prerequisite**: Engine must be updated and published with new `sensitivity` and `filter` parameters

## Overview

Update the frontend to expose TWO separate controls for beat detection:

### 1. Sensitivity Slider
- **Range**: 0.1 to 10.0
- **Default**: 1.0
- **Label**: "Sensitivity"
- **Description**: How aggressively the algorithm detects beats

### 2. Filter Slider
- **Range**: 0.0 to 1.0
- **Default**: 0.0
- **Label**: "Filter"
- **Description**: Removes weak beats after detection

### Why Two Controls?
- Independent parameters allow more nuanced control
- Users can find the right combination for each track
- Helps dial in optimal engine defaults

---

## Phase 1: Update Dependencies

### 1.1 Upgrade Engine Package
- [x] Wait for engine changes to be published
- [x] Update `package.json` to use new engine version (fixed path to `file:../playlist-data-engine`)
- [x] Run `npm install` to update dependencies
- [x] Verify TypeScript compilation succeeds with new types

### 1.2 Update Type Re-exports
- [x] In `src/types/index.ts`, verify new types are re-exported:
  - [x] `sensitivity` option
  - [x] `filter` option
- [x] Remove any references to old `intensityThreshold` name
- [x] Run build to verify no type errors

---

## Phase 2: Update Store

### 2.1 Update beatDetectionStore Defaults
- [x] In `src/store/beatDetectionStore.ts`, update default options:
  ```typescript
  const DEFAULT_GENERATOR_OPTIONS: BeatMapGeneratorOptions = {
      minBpm: 60,
      maxBpm: 180,
      sensitivity: 1.0,  // New: pre-processing sensitivity
      filter: 0.0,       // New: post-processing filter
      // Remove: intensityThreshold (deprecated)
      // ... other options
  };
  ```

### 2.2 Handle Migration from Old Settings
- [x] Add migration logic for users with old cached options:
  - [x] In `merge` function of persist middleware, check for `intensityThreshold`
  - [x] Map old `intensityThreshold` to new `filter` parameter (same semantics)
  - [x] Remove the deprecated property after migration
  - [x] Log migration for debugging

### 2.3 Update Selector Names
- [ ] Rename any selectors that referenced `intensityThreshold`

---

## Phase 3: Update BeatDetectionSettings Component

### 3.1 Replace Old Slider with Two New Sliders
- [ ] In `src/components/ui/BeatDetectionSettings.tsx`:
  - [ ] Remove old `intensityThreshold` slider
  - [ ] Add new `sensitivity` slider (0.1-10.0)
  - [ ] Add new `filter` slider (0.0-1.0)

### 3.2 Sensitivity Slider
```tsx
<div className="beat-detection-slider-container">
  <div className="beat-detection-slider-header">
    <span className="beat-detection-slider-label">Sensitivity</span>
    <span className="beat-detection-slider-value">{sensitivity.toFixed(1)}</span>
  </div>
  <input
    type="range"
    min="0.1"
    max="10"
    step="0.1"
    value={sensitivity}
    onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
    className="beat-detection-slider"
    disabled={disabled}
    aria-label="Beat detection sensitivity"
  />
  <div className="beat-detection-slider-marks">
    <span>0.1</span>
    <span>1.0</span>
    <span>10</span>
  </div>
  <div className="beat-detection-slider-description">
    Lower = fewer beats, Higher = more beats
  </div>
</div>
```

### 3.3 Filter Slider
```tsx
<div className="beat-detection-slider-container">
  <div className="beat-detection-slider-header">
    <span className="beat-detection-slider-label">Filter</span>
    <span className="beat-detection-slider-value">{filter.toFixed(1)}</span>
  </div>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={filter}
    onChange={(e) => handleFilterChange(parseFloat(e.target.value))}
    className="beat-detection-slider"
    disabled={disabled}
    aria-label="Beat intensity filter"
  />
  <div className="beat-detection-slider-marks">
    <span>0 (all)</span>
    <span>0.5</span>
    <span>1.0</span>
  </div>
  <div className="beat-detection-slider-description">
    Removes weak beats. 0 = keep all, 1 = only strongest
  </div>
</div>
```

### 3.4 Update Event Handlers
- [ ] Add `handleSensitivityChange`:
  ```typescript
  const handleSensitivityChange = (value: number) => {
      setGeneratorOptions({ sensitivity: value });
  };
  ```
- [ ] Add `handleFilterChange`:
  ```typescript
  const handleFilterChange = (value: number) => {
      setGeneratorOptions({ filter: value });
  };
  ```

### 3.5 Add Visual Indicators
- [ ] Show when values differ from defaults:
  ```typescript
  const isSensitivityDefault = sensitivity === 1.0;
  const isFilterDefault = filter === 0.0;
  ```
- [ ] Add reset buttons for each slider when not at default

---

## Phase 4: Create Advanced Settings Section

### 4.1 Add Collapsible Advanced Section
- [ ] Create new collapsible section below the main sliders:
  ```tsx
  <details className="beat-detection-advanced">
      <summary>Advanced Settings</summary>
      <div className="beat-detection-advanced-content">
          {/* BPM Range */}
          {/* Tempo Center */}
      </div>
  </details>
  ```
- [ ] Move existing settings into this section:
  - [ ] BPM Range (min/max sliders)
  - [ ] Tempo Center slider

### 4.2 Style Advanced Section
- [ ] Add CSS for collapsible details/summary
- [ ] Style the advanced content area

---

## Phase 5: Update CSS

### 5.1 Update BeatDetectionSettings.css
- [ ] Style sensitivity slider (potentially different color for >1 vs <1)
- [ ] Style filter slider
- [ ] Add styles for default/non-default indicators
- [ ] Add styles for reset buttons
- [ ] Style advanced section

### 5.2 Consider Logarithmic Scale for Sensitivity
- [ ] The sensitivity range (0.1-10) is large
- [ ] Consider CSS or JS to make slider feel more natural:
  ```typescript
  // Optional: logarithmic mapping for sensitivity
  const sensitivityToSlider = (s: number) => Math.log10(s / 0.1) / Math.log10(10 / 0.1) * 100;
  const sliderToSensitivity = (p: number) => 0.1 * Math.pow(10 / 0.1, p / 100);
  ```

---

## Phase 6: Testing

### 6.1 Manual Testing Checklist
- [ ] Sensitivity slider shows correct range (0.1-10)
- [ ] Filter slider shows correct range (0-1)
- [ ] Default values are correct (sensitivity=1.0, filter=0.0)
- [ ] Sliders update store correctly
- [ ] Reset buttons work
- [ ] Advanced section collapses/expands

### 6.2 Beat Detection Testing
Test different combinations:

| Sensitivity | Filter | Expected Result |
|-------------|--------|-----------------|
| 0.5 | 0.0 | Fewer beats, all kept |
| 1.0 | 0.0 | Default behavior |
| 2.0 | 0.0 | More beats, all kept |
| 1.0 | 0.5 | Default beats, weak filtered |
| 2.0 | 0.5 | More beats, weak filtered |
| 0.5 | 0.5 | Fewer beats, weak filtered |

- [ ] Test re-analyze with different values
- [ ] Verify cached beat maps work correctly

### 6.3 Migration Testing
- [ ] Test with fresh install (no cached data)
- [ ] Test migration from old `intensityThreshold` setting
- [ ] Verify no errors on load

### 6.4 Responsive Testing
- [ ] Test on mobile viewport
- [ ] Test on tablet viewport
- [ ] Verify sliders are usable on touch devices

---

## Phase 7: Documentation Updates

### 7.1 Update Plan Document
- [ ] In `docs/plans/BEAT_DETECTION_DEMO_PLAN.md`:
  - [ ] Update intensity settings section

### 7.2 Update Comments
- [ ] Add inline comments explaining both parameters
- [ ] Update component JSDoc

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Update engine version |
| `src/types/index.ts` | Verify type re-exports |
| `src/store/beatDetectionStore.ts` | New defaults, migration logic |
| `src/components/ui/BeatDetectionSettings.tsx` | Two new sliders, advanced section |
| `src/components/ui/BeatDetectionSettings.css` | New styles |

---

## UI Mockup

```
┌─────────────────────────────────────────────────┐
│  BEAT DETECTION SETTINGS                        │
│                                                 │
│  Sensitivity: 1.0                               │
│  [0.1]───────●─────────────|───────[10]        │
│              1.0            5.0                 │
│  Lower = fewer beats, Higher = more beats       │
│                                                 │
│  Filter: 0.0                                    │
│  [0]─────●──────────────────────────[1]        │
│  0 (all)    0.5                      1.0        │
│  Removes weak beats. 0 = keep all               │
│                                                 │
│  ▶ Advanced Settings                            │
│    (BPM Range, Tempo Center)                    │
└─────────────────────────────────────────────────┘
```

---

## Estimated Scope

- **Phase 1**: Dependencies - ~15 minutes
- **Phase 2**: Store updates - ~30 minutes
- **Phase 3**: Component updates - ~1-2 hours
- **Phase 4**: Advanced section - ~30 minutes
- **Phase 5**: CSS - ~30 minutes
- **Phase 6**: Testing - ~1-2 hours
- **Phase 7**: Documentation - ~30 minutes

**Total**: ~4-6 hours

---

## Completion Checklist

- [ ] Engine package updated
- [ ] Store updated with new parameters
- [ ] Sensitivity slider works (0.1-10 range)
- [ ] Filter slider works (0-1 range)
- [ ] Both parameters affect beat detection correctly
- [ ] Advanced section implemented
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Ready for user testing
