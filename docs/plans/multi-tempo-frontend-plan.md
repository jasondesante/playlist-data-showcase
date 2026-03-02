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
- [ ] Add new checkbox setting: "Auto Multi-Tempo Detection"
- [ ] Default: checked (enabled)
- [ ] Description: "Automatically analyze tracks with multiple tempo sections"
- [ ] Wire to `autoMultiTempo` state via `useAutoMultiTempo()` and `setAutoMultiTempo()`

### Task 2.2: Add CSS Styling for Toggle
- [ ] Style the new toggle consistently with existing interpolation settings
- [ ] Add info tooltip explaining the feature

---

## Phase 3: BeatMapSummary - Multi-Tempo Display

**Goal**: Show multi-tempo detection info and section details in BeatMapSummary.

### Task 3.1: Add Multi-Tempo Detection Banner
- [ ] Show banner when `hasMultipleTempos: true` and `hasMultiTempoApplied: false`
- [ ] Banner text: "Multiple tempos detected: [128, 140] BPM"
- [ ] Include info icon with tooltip explaining the detection

### Task 3.2: Add Tempo Sections Display
- [ ] Create new section in BeatMapSummary when `hasMultiTempoApplied: true`
- [ ] Display each tempo section as a card/row with:
  - Section number (1, 2, 3...)
  - BPM for that section
  - Duration (start - end timestamps, formatted)
  - Beat count
- [ ] Add header: "Tempo Sections (X sections detected)"

### Task 3.3: Add Timeline Section Markers
- [ ] Add visual timeline bar showing section boundaries
- [ ] Each section shown as a colored segment proportional to its duration
- [ ] Display BPM label on each segment
- [ ] Show boundary lines between sections

### Task 3.4: Update Interpolation Statistics Display
- [ ] Update the existing interpolation stats section to show:
  - Primary BPM (first/largest section)
  - "Multi-Tempo: Yes (X sections)" when applicable
- [ ] Keep existing stats (beat counts, confidence, etc.)

### Task 3.5: Add CSS Styling for Multi-Tempo Section
- [ ] Style the tempo sections container
- [ ] Style individual section cards/rows
- [ ] Style the timeline visualization
- [ ] Add appropriate colors for different tempo sections
- [ ] Ensure responsive design

---

## Phase 4: BeatPracticeView - Multi-Tempo Awareness

**Goal**: Show multi-tempo info in practice mode BPM display.

### Task 4.1: Update BPM Display in Practice View
- [ ] When `hasMultipleTempos: true`, show indicator in BPM section
- [ ] Display format: "128-140 BPM (2 sections)" or similar
- [ ] Keep existing position and duration displays unchanged

### Task 4.2: No Practice Mode Logic Changes
- [ ] Verify practice mode works correctly with multi-tempo beat maps
- [ ] The beat timestamps already account for tempo changes
- [ ] User experience should be seamless as they play through sections

---

## Phase 5: Testing & Edge Cases

**Goal**: Ensure feature works correctly in all scenarios.

### Task 5.1: Test Single-Tempo Tracks (No Regression)
- [ ] Verify `hasMultipleTempos: false` for single-tempo tracks
- [ ] Verify no multi-tempo UI appears
- [ ] Verify existing functionality unchanged

### Task 5.2: Test Multi-Tempo Tracks
- [ ] Verify detection banner appears when multiple tempos detected
- [ ] Verify sections display correctly after analysis
- [ ] Verify timeline markers show correct proportions
- [ ] Verify practice mode shows multi-tempo info

### Task 5.3: Test Auto Multi-Tempo Toggle
- [ ] Verify analysis behaves differently when toggle is off
- [ ] When off: `hasMultipleTempos: true` but `hasMultiTempoApplied: false`
- [ ] When on: Both flags true if multiple tempos exist

### Task 5.4: Test Edge Cases
- [ ] Very short tracks with tempo changes
- [ ] Tracks with 3+ tempo sections
- [ ] Tracks with subtle tempo drift (should NOT trigger multi-tempo)

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
