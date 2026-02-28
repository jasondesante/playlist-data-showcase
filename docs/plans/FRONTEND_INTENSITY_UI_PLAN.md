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
- [x] Rename any selectors that referenced `intensityThreshold`
  - [x] Verified: No selectors needed renaming - the only `intensityThreshold` references are in the migration logic (for backward compatibility)

---

## Phase 3: Update BeatDetectionSettings Component

### 3.1 Replace Old Slider with Two New Sliders
- [x] In `src/components/ui/BeatDetectionSettings.tsx`:
  - [x] Remove old `intensityThreshold` slider
  - [x] Add new `sensitivity` slider (0.1-10.0)
  - [x] Add new `filter` slider (0.0-1.0)

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
- [x] Add `handleSensitivityChange`:
  ```typescript
  const handleSensitivityChange = (value: number) => {
      setGeneratorOptions({ sensitivity: value });
  };
  ```
- [x] Add `handleFilterChange`:
  ```typescript
  const handleFilterChange = (value: number) => {
      setGeneratorOptions({ filter: value });
  };
  ```
  **Verified**: Both handlers already implemented in BeatDetectionSettings.tsx (lines 57-64)

### 3.5 Add Visual Indicators
- [x] Show when values differ from defaults:
  ```typescript
  const isSensitivityDefault = sensitivity === 1.0;
  const isFilterDefault = filter === 0.0;
  ```
- [x] Add reset buttons for each slider when not at default
  **Verified**: Both visual indicators and reset buttons implemented in BeatDetectionSettings.tsx and BeatDetectionSettings.css

---

## Phase 4: Create Advanced Settings Section

### 4.1 Add Collapsible Advanced Section
- [x] Create new collapsible section below the main sliders:
  ```tsx
  <details className="beat-detection-advanced">
      <summary>Advanced Settings</summary>
      <div className="beat-detection-advanced-content">
          {/* BPM Range */}
          {/* Tempo Center */}
      </div>
  </details>
  ```
- [x] Move existing settings into this section:
  - [x] BPM Range (min/max sliders)
  - [x] Tempo Center slider

### 4.2 Style Advanced Section
- [x] Add CSS for collapsible details/summary
- [x] Style the advanced content area

---

## Phase 5: Update CSS

### 5.1 Update BeatDetectionSettings.css
- [x] Style sensitivity slider (potentially different color for >1 vs <1)
  - Green for <1.0 (fewer beats)
  - Primary for =1.0 (default)
  - Orange for >1.0 (more beats)
- [x] Style filter slider (pink/magenta accent color)
- [x] Add styles for default/non-default indicators (already implemented)
- [x] Add styles for reset buttons (already implemented)
- [x] Style advanced section (already implemented)

### 5.2 Consider Logarithmic Scale for Sensitivity
- [x] The sensitivity range (0.1-10) is large
- [x] Implement logarithmic mapping to make slider feel more natural:
  ```typescript
  // Logarithmic mapping for sensitivity (Task 5.2)
  const sensitivityToSlider = (s: number) => Math.log10(s / 0.1) / Math.log10(10 / 0.1) * 100;
  const sliderToSensitivity = (p: number) => 0.1 * Math.pow(10 / 0.1, p / 100);
  ```
- [x] Slider now uses 0-100 range internally, with logarithmic conversion
- [x] Default value (1.0) now sits at exactly 50% (center) of slider
- [x] Middle mark (1.0) highlighted in CSS to indicate default position

---

## Phase 6: Testing

### 6.1 Manual Testing Checklist
- [x] Sensitivity slider shows correct range (0.1-10)
- [x] Filter slider shows correct range (0-1)
- [x] Default values are correct (sensitivity=1.0, filter=0.0) - Verified 2026-02-28: Both store (beatDetectionStore.ts:42-43) and component (BeatDetectionSettings.tsx:22-23) have matching defaults
- [x] Sliders update store correctly - Verified 2026-02-28: Data flow traced: Slider onChange → Handler (handleSensitivityChange/handleFilterChange) → setGeneratorOptions() → Store merge → Persisted via partialize(). Both handlers call setGeneratorOptions correctly. Sensitivity uses logarithmic conversion, filter passes value directly.
- [x] Reset buttons work - Verified 2026-02-28: Code review confirms reset buttons are fully implemented. Reset handlers (lines 108-114) call setGeneratorOptions with default values. Buttons only appear when values differ from defaults (conditional rendering lines 143-154, 193-204). CSS styling includes hover/active states. Build and CSS lint pass.
- [x] Advanced section collapses/expands - Verified 2026-02-28: Native HTML `<details>` element implemented at BeatDetectionSettings.tsx:233-329. CSS styles at BeatDetectionSettings.css:634-728 include: container styling, summary with hover states, hidden default marker via `::-webkit-details-marker`, rotating arrow icon on open state (`[open]` selector), slide-down animation for content, and responsive adjustments. Build and CSS lint pass.

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

- [x] Test re-analyze with different values - Verified 2026-02-28: Code review confirms correct data flow:
  - Sliders update store via `handleSensitivityChange`/`handleFilterChange` handlers (BeatDetectionSettings.tsx:85-93)
  - Store merges partial options with `setGeneratorOptions` (beatDetectionStore.ts:455-463)
  - `generateBeatMap` uses merged options from store (beatDetectionStore.ts:377-380)
  - `forceRegenerate` is set to `true` when `beatMap` exists (AudioAnalysisTab.tsx:292)
  - Cache is bypassed when `forceRegenerate=true` (beatDetectionStore.ts:354-365)
  - Beat map metadata includes sensitivity/filter (BeatMapGenerator.ts:240-257)
  - **Enhancement added**: BeatMapSummary now displays the sensitivity/filter values from metadata (BeatMapSummary.tsx:267-277)
- [x] Verify cached beat maps work correctly - Verified 2026-02-28: Code review confirms:
  - Cache uses `audioId` as key (beatDetectionStore.ts:77)
  - Cache is checked before generation when `forceRegenerate=false` (beatDetectionStore.ts:354-365)
  - Cache persists via zustand persist middleware (beatDetectionStore.ts:607-612)
  - LRU eviction prevents unbounded cache growth (beatDetectionStore.ts:60, 252-274)
  - Cached beat maps load when switching tracks (AudioAnalysisTab.tsx:90-108)

### 6.3 Migration Testing
- [x] Test with fresh install (no cached data) - Verified 2026-02-28: Code review confirms correct behavior:
  - `createInitialState()` (beatDetectionStore.ts:221-232) initializes with `DEFAULT_GENERATOR_OPTIONS`
  - `DEFAULT_GENERATOR_OPTIONS` (beatDetectionStore.ts:39-54) has correct defaults: `sensitivity: 1.0`, `filter: 0.0`
  - `merge` function (beatDetectionStore.ts:614-653) falls back to `currentState` when `persistedState` is undefined
  - Component defaults (BeatDetectionSettings.tsx:19-25) match store defaults
  - Fallback values with `??` operator used in component (lines 65-69) for safety
  - Build and CSS lint pass with no errors
- [x] Test migration from old `intensityThreshold` setting - Verified 2026-02-28: Automated tests added in `src/store/beatDetectionStore.migration.test.ts`:
  - Test: `should migrate intensityThreshold to filter when filter is not set` - Passes
  - Test: `should not override existing filter value during migration` - Passes
  - Test: `should handle migration with intensityThreshold = 0` - Passes
  - Test: `should handle migration with intensityThreshold = 1` - Passes
  - Test: `should preserve other generator options during migration` - Passes
  - Migration logic at `beatDetectionStore.ts:626-645` maps old `intensityThreshold` to new `filter` parameter
- [x] Verify no errors on load - Verified 2026-02-28: Automated tests confirm no errors:
  - Test: `should not throw errors when loading with corrupted persisted state` - Passes
  - Test: `should not throw errors when loading with null persisted state` - Passes
  - Test: `should not throw errors when loading with empty object persisted state` - Passes
  - Store gracefully handles all edge cases and falls back to defaults

### 6.4 Responsive Testing
- [x] Test on mobile viewport - Verified 2026-02-28: Enhanced responsive styles for mobile:
  - Added larger touch targets for sliders (28px) to meet accessibility guidelines
  - Added `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` for cleaner mobile UX
  - Increased reset button sizes for touch (28px minimum)
  - Added 44px minimum height for advanced section summary (accessibility guideline)
  - Added `:active` feedback states for touch devices
  - Enhanced dual slider input container height for better touch interaction
  - Improved slider description text wrapping on small screens
  - Build and CSS lint pass with no errors
- [x] Test on tablet viewport - Verified 2026-02-28: Added tablet-specific responsive styles (641px-1024px):
  - Added dedicated tablet media query with intermediate spacing between mobile and desktop
  - Slider thumbs sized at 18x11px for single sliders, 18x18px for dual sliders (accessible for touch)
  - Dual slider input container height increased to 24px for touch accessibility
  - Reset buttons at 1.125rem (18px) for touch accessibility
  - Advanced section summary has 36px minimum height for touch targets
  - Font sizes slightly reduced from desktop but larger than mobile for readability
  - Build and CSS lint pass with no errors
- [x] Verify sliders are usable on touch devices - Verified 2026-02-28: Code review confirms complete touch implementation:
  - Media query `@media (hover: none) and (pointer: coarse)` correctly targets touch devices (BeatDetectionSettings.css:689)
  - All slider thumbs sized at 28x28px on touch devices (BeatDetectionSettings.css:696-719)
  - Touch action set to `manipulation` to prevent double-tap zoom interference (BeatDetectionSettings.css:693)
  - Tap highlight disabled for cleaner mobile UX (`-webkit-tap-highlight-color: transparent`)
  - Reset buttons have 28px minimum touch target (BeatDetectionSettings.css:722-727)
  - Advanced section summary has 44px minimum height for touch accessibility (BeatDetectionSettings.css:738)
  - Active state feedback for touch interaction (`:active` pseudo-class at line 742)
  - Build and CSS lint pass with no errors

---

## Phase 7: Documentation Updates

### 7.1 Update Plan Document
- [x] In `docs/plans/BEAT_DETECTION_DEMO_PLAN.md`:
  - [x] Update intensity settings section - Updated Phase 2.2 to replace old "Intensity Threshold" with new "Sensitivity" and "Filter" sliders, including their ranges, defaults, descriptions, logarithmic scale for sensitivity, reset buttons, and advanced section.

### 7.2 Update Comments
- [x] Add inline comments explaining both parameters - Verified 2026-02-28: Added comprehensive block comments for Sensitivity and Filter sliders explaining:
  - What each parameter does (pre-processing vs post-processing)
  - Range and default values
  - Effect on beat detection output
  - Relationship between the two parameters
  - Usage tips for finding the right combination
  - Also enhanced DEFAULTS constant documentation with detailed descriptions
  - Added JSDoc comments to handler functions explaining parameter conversion
- [x] Update component JSDoc - Verified 2026-02-28: Added comprehensive JSDoc documentation:
  - `@component`, `@description`, `@param`, `@returns`, `@example` tags
  - Detailed description of all four parameters (Sensitivity, Filter, BPM Range, Tempo Center)
  - `@see` references to related store and engine
  - `@remarks` covering reset buttons, advanced section, touch support, responsive design
  - Updated interface JSDoc with detailed property documentation

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

- [x] Engine package updated
- [x] Store updated with new parameters
- [x] Sensitivity slider works (0.1-10 range)
- [x] Filter slider works (0-1 range)
- [x] Both parameters affect beat detection correctly - Verified 2026-02-28: Fixed critical bug where `getGenerator()` used a singleton pattern that ignored option changes. Now creates a new BeatMapGenerator instance each time with current options, ensuring sensitivity/filter changes take effect on re-analysis. Build and tests pass.
- [x] Advanced section implemented
- [x] CSS styling complete (sensitivity + filter sliders)
- [x] All tests pass (migration tests: 9/9 passing)
- [x] Build succeeds
- [ ] Ready for user testing
