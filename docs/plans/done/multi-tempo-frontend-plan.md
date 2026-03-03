# Multi-Tempo Frontend Implementation Plan

## Overview

Update the frontend (playlist-data-showcase) to support the new multi-tempo detection feature from the playlist-data-engine. The engine can now detect multiple distinct tempo sections within a single track using a "crossing paths" boundary strategy.

**Key Engine Features to Surface:**
- `detectedClusterTempos: number[]` - Tempos found during normal analysis (e.g., [128, 140])
- `hasMultipleTempos: boolean` - Quick flag for multi-tempo availability
- `tempoSections: TempoSection[]` - Full section data with boundaries (after multi-tempo analysis)
- `hasMultiTempoApplied: boolean` - True after multi-tempo re-analysis completes
- `canApplyMultiTempo()` - Helper to check if re-analysis is available

## User Requirements

1. **Multi-Tempo Analysis**: Default to automatic, but add advanced settings checkbox to disable
2. **Visualization**: Both timeline markers AND section cards with per-section details
3. **Placement**: Add multi-tempo UI elements to BeatMapSummary component
4. **Practice Mode**: Minimal changes - show multi-tempo info in BPM section if applicable

---

## Phase 1: Type Imports & Store Updates

**Goal**: Ensure TempoSection type is available and store handles multi-tempo state.

### Task 1.1: Export TempoSection Type from Types
- [x] Update `src/types/index.ts` to re-export `TempoSection` and `TempoSectionJSON` from playlist-data-engine
- [x] Verify type is available for use in components

### Task 1.2: Add Multi-Tempo State to beatDetectionStore
- [x] Add `autoMultiTempo: boolean` state (default: `true`)
- [x] Add `setAutoMultiTempo(value: boolean)` action
- [x] Add selector `useAutoMultiTempo()` hook
- [x] Update `InterpolationStatistics` interface to include multi-tempo fields:
  - `hasMultipleTempos: boolean`
  - `detectedClusterTempos: number[]`
  - `tempoSections: TempoSection[] | null`
  - `hasMultiTempoApplied: boolean`

### Task 1.3: Update useInterpolationStatistics Selector
- [x] Extract `hasMultipleTempos` from `interpolationMetadata`
- [x] Extract `detectedClusterTempos` from `interpolationMetadata`
- [x] Extract `tempoSections` from `interpolationMetadata`
- [x] Extract `hasMultiTempoApplied` from `interpolationMetadata`
- [x] Return multi-tempo stats in the selector result

### Task 1.4: Update Beat Interpolation Flow
- [x] Modify `generateBeatMap` flow to pass `enableMultiTempo` option based on `autoMultiTempo` state
- [x] Ensure multi-tempo analysis runs automatically when enabled and multiple tempos detected

---

## Phase 2: BeatDetectionSettings - Auto Multi-Tempo Toggle

**Goal**: Add advanced setting to control automatic multi-tempo analysis.

### Task 2.1: Add Auto Multi-Tempo Toggle to BeatInterpolationSettings
- [x] Add new checkbox setting: "Auto Multi-Tempo Detection"
- [x] Default: checked (enabled)
- [x] Description: "Automatically analyze tracks with multiple tempo sections"
- [x] Wire to `autoMultiTempo` state via `useAutoMultiTempo()` and `setAutoMultiTempo()`

### Task 2.2: Add CSS Styling for Toggle
- [x] Style the new toggle consistently with existing interpolation settings
- [x] Add info tooltip explaining the feature

---

## Phase 3: BeatMapSummary - Multi-Tempo Display

**Goal**: Show multi-tempo detection info and section details in BeatMapSummary.

### Task 3.1: Add Multi-Tempo Detection Banner
- [x] Show banner when `hasMultipleTempos: true` and `hasMultiTempoApplied: false`
- [x] Banner text: "Multiple tempos detected: [128, 140] BPM"
- [x] Include info icon with tooltip explaining the detection

### Task 3.2: Add Tempo Sections Display
- [x] Create new section in BeatMapSummary when `hasMultiTempoApplied: true`
- [x] Display each tempo section as a card/row with:
  - Section number (1, 2, 3...)
  - BPM for that section
  - Duration (start - end timestamps, formatted)
  - Beat count
- [x] Add header: "Tempo Sections (X sections detected)"

### Task 3.3: Add Timeline Section Markers
- [x] Add visual timeline bar showing section boundaries
- [x] Each section shown as a colored segment proportional to its duration
- [x] Display BPM label on each segment
- [x] Show boundary lines between sections

### Task 3.4: Update Interpolation Statistics Display
- [x] Update the existing interpolation stats section to show:
  - Primary BPM (first/largest section)
  - "Multi-Tempo: Yes (X sections)" when applicable
- [x] Keep existing stats (beat counts, confidence, etc.)

### Task 3.5: Add CSS Styling for Multi-Tempo Section
- [x] Style the tempo sections container
- [x] Style individual section cards/rows
- [x] Style the timeline visualization
- [x] Add appropriate colors for different tempo sections
- [x] Ensure responsive design

---

## Phase 4: BeatPracticeView - Multi-Tempo Awareness

**Goal**: Show multi-tempo info in practice mode BPM display.

### Task 4.1: Update BPM Display in Practice View
- [x] When `hasMultipleTempos: true`, show indicator in BPM section
- [x] Display format: "128-140 BPM (2 sections)" or similar
- [x] Keep existing position and duration displays unchanged

### Task 4.2: No Practice Mode Logic Changes
- [x] Verify practice mode works correctly with multi-tempo beat maps
- [x] The beat timestamps already account for tempo changes
- [x] User experience should be seamless as they play through sections

**Verification Summary (2026-03-02):**
- Analyzed the engine's `BeatInterpolator.ts` and confirmed that beat timestamps in `mergedBeats` already reflect actual timing
- The `reinterpolateBoundaryRegions` function explicitly does NOT modify beats - `tempoSections` is metadata for display only
- The `useBeatStream` hook processes beats by timestamp order, independent of tempo sections
- Rolling BPM calculation (`currentBpm`) naturally updates as user plays through different tempo sections
- Tap accuracy checking (`checkTap`) finds nearest beat by timestamp, works correctly across sections
- Build passes with no errors

---

## Phase 5: Testing & Edge Cases

**Goal**: Ensure feature works correctly in all scenarios.

### Task 5.1: Test Single-Tempo Tracks (No Regression)
- [x] Verify `hasMultipleTempos: false` for single-tempo tracks
- [x] Verify no multi-tempo UI appears
- [x] Verify existing functionality unchanged

**Verification Summary (2026-03-02):**
- Analyzed conditional rendering in BeatMapSummary.tsx and BeatPracticeView.tsx
- Multi-Tempo Detection Banner (line 373): Only shows when `hasMultipleTempos && !hasMultiTempoApplied`
- Tempo Sections Display (line 384): Only shows when `hasMultiTempoApplied && tempoSections && tempoSections.length > 0`
- Practice View Multi-Tempo Indicator (line 499): Only shows when `hasMultiTempoApplied && tempoSections && tempoSections.length > 1`
- For single-tempo tracks: `hasMultipleTempos` defaults to `false`, `hasMultiTempoApplied` defaults to `false`, `tempoSections` defaults to `null`
- Fixed test regression: Added missing `useAutoMultiTempo` mock to BeatDetectionSettings.ose.test.tsx
- All 52 BeatDetectionSettings tests pass, build succeeds with no errors

### Task 5.2: Test Multi-Tempo Tracks
- [x] Verify detection banner appears when multiple tempos detected
- [x] Verify sections display correctly after analysis
- [x] Verify timeline markers show correct proportions
- [x] Verify practice mode shows multi-tempo info

**Verification Summary (2026-03-02):**
- Created `BeatMapSummary.multi-tempo.test.tsx` with 22 tests covering:
  - Detection banner visibility conditions (5 tests)
  - Tempo sections display (6 tests)
  - Timeline markers and segment proportions (6 tests)
  - Interpolation stats multi-tempo display (5 tests)
- Created `BeatPracticeView.multi-tempo.test.tsx` with 10 tests covering:
  - Multi-tempo indicator display conditions (7 tests)
  - Single-tempo track handling (2 tests)
  - BPM stat area containment (1 test)
- All 32 multi-tempo tests pass
- Build succeeds with no errors

### Task 5.3: Test Auto Multi-Tempo Toggle
- [x] Verify analysis behaves differently when toggle is off
- [x] When off: `hasMultipleTempos: true` but `hasMultiTempoApplied: false`
- [x] When on: Both flags true if multiple tempos exist

**Verification Summary (2026-03-02):**
- Created `BeatInterpolationSettings.auto-multitempo.test.tsx` with 11 tests covering:
  - Toggle UI rendering and state display (checked/unchecked)
  - Toggle interaction with `setAutoMultiTempo` action
  - Description text changes based on toggle state
  - Tooltip presence and content
  - Disabled state handling
- Created `beatDetectionStore.autoMultitempo.test.ts` with 7 tests covering:
  - Default `autoMultiTempo` value is `true`
  - `setAutoMultiTempo` action correctly updates state
  - `enableMultiTempo` option flow to `BeatInterpolator`
  - Expected behavior when toggle is ON vs OFF
- All 18 new tests pass
- Build succeeds with no errors

### Task 5.4: Test Edge Cases
- [x] Very short tracks with tempo changes
- [x] Tracks with 3+ tempo sections
- [x] Tracks with subtle tempo drift (should NOT trigger multi-tempo)

**Verification Summary (2026-03-02):**
- Created `BeatMapSummary.multi-tempo-edge-cases.test.tsx` with 16 tests covering:
  - **Very short tracks**: Short duration (30s), very short sections (<10s), single-beat sections
  - **3+ tempo sections**: 3, 4, and 5 section tracks with proportion verification
  - **Subtle tempo drift**: Tests verifying 10% threshold behavior:
    - Within 10% (e.g., 120→128 BPM at ~6.7%): Does NOT trigger multi-tempo
    - Exactly 10% (e.g., 120→132 BPM): Does NOT trigger (threshold is > 10%)
    - Above 10% (e.g., 120→134 BPM at ~11.7%): DOES trigger multi-tempo
  - **Octave multiples**: 60 BPM and 120 BPM treated as same tempo (not multi-tempo)
  - **Null/empty handling**: Graceful handling of null or empty tempoSections
- All 48 multi-tempo tests pass (10 + 22 + 16)
- Build succeeds with no errors

---

## Dependencies

### From playlist-data-engine
- `TempoSection` interface
- `TempoSectionJSON` interface
- `InterpolationMetadata.hasMultipleTempos`
- `InterpolationMetadata.detectedClusterTempos`
- `InterpolationMetadata.tempoSections`
- `InterpolationMetadata.hasMultiTempoApplied`
- `BeatInterpolationOptions.enableMultiTempo`
- `BeatInterpolator.canApplyMultiTempo()` method

### Existing Frontend Components
- `BeatMapSummary` - Main display component
- `BeatDetectionSettings` / `BeatInterpolationSettings` - Settings
- `beatDetectionStore` - State management
- `BeatPracticeView` - Practice mode

---

## Questions/Unknowns

### Resolved
- **Auto vs Manual**: Default to automatic, with toggle in advanced settings
- **Visualization**: Both timeline markers AND section cards
- **Placement**: In BeatMapSummary component
- **Practice Mode**: Minimal changes, just show info in BPM section

### Open
- None currently

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add TempoSection, TempoSectionJSON exports |
| `src/store/beatDetectionStore.ts` | Add autoMultiTempo state, update selectors |
| `src/components/ui/BeatInterpolationSettings.tsx` | Add auto multi-tempo toggle |
| `src/components/ui/BeatInterpolationSettings.css` | Style the toggle |
| `src/components/ui/BeatMapSummary.tsx` | Add multi-tempo display sections |
| `src/components/ui/BeatMapSummary.css` | Style tempo sections display |
| `src/components/ui/BeatPracticeView.tsx` | Add multi-tempo info to BPM display |

---

## Success Criteria

1. Single-tempo tracks work exactly as before (no regression)
2. Multi-tempo tracks show detection banner when tempos differ by >10%
3. Tempo sections display with boundaries, BPM, and duration
4. Timeline visualization shows section proportions accurately
5. Practice mode shows multi-tempo info without behavior changes
6. Auto toggle allows users to opt out of automatic multi-tempo analysis
7. All existing tests pass
