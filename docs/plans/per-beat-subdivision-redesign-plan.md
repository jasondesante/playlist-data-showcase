# Per-Beat Subdivision Redesign Plan

## Overview

The subdivision system assigns a subdivision type to each beat. This is how it was always meant to work - each beat can have its own subdivision type, enabling rhythmic phrases for rhythm game levels.

The old segment-based approach was a wrong turn. This plan completes the transition to per-beat.

### Current vs Target

| Aspect | Current (Segment-Based) | Target (Per-Beat) |
|--------|------------------------|-------------------|
| Data Model | `SubdivisionConfig.segments[]` with `startBeat` | `SubdivisionConfig.beatSubdivisions[]` per beat index |
| Max Items | 8 segments | Unlimited (one per beat) |
| UI | Click to add segments, drag boundaries | Piano-roll grid, select beats, apply subdivision |
| Use Case | "This whole section is eighth notes" | "Beat 1=quarter, beat 2=eighth, beat 3=eighth..." |

### Scope

This plan covers:
1. **Engine changes** (playlist-data-engine): New data model + BeatSubdivider rewrite
2. **Showcase changes** (playlist-data-showcase): New UI components + store updates

---

## Phase 1: Engine Data Model Changes

### 1.1 Update SubdivisionConfig Type

- [x] Add new `PerBeatSubdivisionConfig` interface to `BeatMap.ts`
  ```typescript
  interface PerBeatSubdivisionConfig {
    /** Subdivision type for each beat index (sparse = use default) */
    beatSubdivisions: Map<number, SubdivisionType>;
    /** Default subdivision for beats not in map */
    defaultSubdivision: SubdivisionType;
  }
  ```
- [x] Keep old `SubdivisionConfig` as `SegmentSubdivisionConfig` for reference
- [x] Create union type: `type SubdivisionConfig = SegmentSubdivisionConfig | PerBeatSubdivisionConfig`

### 1.2 Update Validation Functions

- [x] Add `validatePerBeatSubdivisionConfig()` function
- [x] Add type guard `isPerBeatSubdivisionConfig()`
- [x] Update `validateSubdivisionConfig()` to handle both formats

### 1.3 Update BeatSubdivider Processing

- [x] Add `subdividePerBeat()` method to BeatSubdivider (renamed from `processPerBeatBeats`)
  - Iterate beats instead of segments
  - For each beat, look up subdivision from config
  - Apply subdivision logic per beat
- [x] Update `subdivide()` to detect config type and route appropriately
- [x] Handle edge cases:
  - Adjacent beats with different subdivisions
  - Beats without explicit subdivision (use default)

### 1.4 Update SubdividedBeatMap Type

- [x] Update `SubdividedBeatMap.subdivisionConfig` type to support both formats

### 1.5 Export New Types

- [x] Export `PerBeatSubdivisionConfig` from engine index
- [x] Export `isPerBeatSubdivisionConfig` type guard
- [x] Export `validatePerBeatSubdivisionConfig` function

### 1.6 Update Engine Documentation

- [x] Update `DATA_ENGINE_REFERENCE.md` in playlist-data-engine project
  - Document new `PerBeatSubdivisionConfig` interface
  - Document `isPerBeatSubdivisionConfig` type guard
  - Document `validatePerBeatSubdivisionConfig` function
  - Update `BeatSubdivider` usage examples to show per-beat approach
- [x] Update `AUDIO_ANALYSIS.md` in playlist-data-engine project
  - Check all examples for segment-based `SubdivisionConfig` usage
  - Add examples showing new per-beat approach
  - Update any outdated code snippets
- [x] Update or remove references to segment-based `SubdivisionConfig`
  - Mark `SegmentSubdivisionConfig` as legacy/deprecated if kept for reference
  - Update any examples that used the old segment approach

---

## Phase 2: Showcase Type Updates

### 2.1 Update Type Exports

- [x] Import new types from engine in `src/types/index.ts`
  - `PerBeatSubdivisionConfig`
  - `isPerBeatSubdivisionConfig`
  - `validatePerBeatSubdivisionConfig`

### 2.2 Add Helper Types

- [x] Add `BeatSubdivisionSelection` type for UI state
  ```typescript
  interface BeatSubdivisionSelection {
    selectedBeats: Set<number>;  // Beat indices
    rangeStart: number | null;
    rangeEnd: number | null;
  }
  ```

---

## Phase 3: Store Updates

### 3.1 Update Subdivision State

- [x] Change `subdivisionConfig` type to per-beat format

### 3.2 Remove Segment-Based Actions

- [x] Remove `addSubdivisionSegment()` action
- [x] Remove `removeSubdivisionSegment()` action
- [x] Remove `updateSubdivisionSegment()` action

### 3.3 Add Per-Beat Actions

- [x] Add `setBeatSubdivision(beatIndex: number, subdivision: SubdivisionType)`
- [x] Add `setBeatSubdivisionRange(startBeat: number, endBeat: number, subdivision: SubdivisionType)`
- [x] Add `clearBeatSubdivision(beatIndex: number)` - reset to default
- [x] Add `clearAllBeatSubdivisions()` - reset all to default
- [x] Add `setAllBeatSubdivisions(subdivision: SubdivisionType)` - fill all

### 3.4 Update Selectors

- [x] Update `useSubdivisionConfig()` return type
- [x] Add `useBeatSubdivision(beatIndex: number)` selector
- [x] Add `useBeatSubdivisionsInRange(start: number, end: number)` selector

### 3.5 Update Persistence

- [x] Update localStorage serialization for new format (Map to array for JSON)

---

## Phase 4: UI Component - BeatSubdivisionGrid

### 4.1 Create BeatSubdivisionGrid Component

- [x] Create `src/components/ui/BeatSubdivisionGrid.tsx`
  - Piano-roll style grid with beat cells
  - Scrollable horizontally (reuse timeline infrastructure)
  - Zoomable (0.5x - 8x)
  - Group beats by measure

### 4.2 Beat Cell Rendering

- [x] Render beat cells with:
  - Color-coded by subdivision type
  - Beat number label
  - Selection state (highlighted border)
  - Hover state
- [x] Virtualize rendering for performance (500+ beats)
  - Only render visible cells
  - Use intersection observer or scroll position calculation

### 4.3 Selection Interaction

- [x] Click single beat → select it
- [x] Shift+click → select range from last selection
- [x] Ctrl/Cmd+click → toggle selection
- [x] Drag across beats → select range
- [x] Double-click → cycle subdivision type

### 4.4 Measure Grouping Visualization

- [x] Draw measure boundaries (thicker lines)
- [x] Show measure numbers (M1, M2, etc.)
- [x] Use `beatsPerMeasure` from downbeat config
- [x] Handle different time signatures

### 4.5 Styles

- [x] Create `src/components/ui/BeatSubdivisionGrid.css`
  - Grid cell styles
  - Selection highlighting
  - Measure boundaries
  - Zoom level adjustments

---

## Phase 5: UI Component - SubdivisionToolbar

### 5.1 Create SubdivisionToolbar Component

- [x] Create `src/components/ui/SubdivisionToolbar.tsx`
  - Horizontal bar with subdivision type buttons
  - Shows current "brush" subdivision
  - Apply to selection button

### 5.2 Subdivision Type Buttons

- [x] Render buttons for all 8 subdivision types
- [x] Show active state for current brush
- [x] Show subdivision info on hover (density, description)
- [x] Keyboard shortcuts (1-8 for types)

### 5.3 Selection Actions

- [x] "Apply to Selection" button
- [x] "Clear Selection" button
- [x] "Select All" button
- [x] "Reset All to Default" button

### 5.4 Styles

- [x] Create `src/components/ui/SubdivisionToolbar.css`
  - Horizontal button group
  - Active state highlighting
  - Touch-friendly sizing

---

## Phase 6: Update SubdivisionSettings

### 6.1 Replace Segment List with Grid

- [x] Remove segment list UI from SubdivisionSettings
- [x] Integrate BeatSubdivisionGrid component
- [x] Integrate SubdivisionToolbar component

### 6.2 Update Summary Display

- [x] Show total beat count
- [x] Show subdivision distribution (e.g., "45 quarter, 32 eighth, 16 half")
- [x] Show unique subdivisions used

### 6.3 Keep Generate Button

- [x] Keep "Generate Subdivided Beat Map" button
- [x] Update to work with new config format

---

## Phase 7: Remove SubdivisionTimelineEditor

### 7.1 Deprecate Component

- [x] Mark `SubdivisionTimelineEditor.tsx` as deprecated
- [x] Remove imports from SubdivisionSettings
- [x] Delete component and CSS file

---

## Phase 8: Testing

### 8.1 Engine Tests

- [x] Test `PerBeatSubdivisionConfig` validation
- [x] Test BeatSubdivider with per-beat config
- [x] Test edge cases:
  - Empty beat map
  - All beats same subdivision
  - Every beat different subdivision
  - Sparse subdivision assignments

### 8.2 Store Tests

- [ ] Test per-beat actions
- [ ] Test selection state management

### 8.3 Component Tests

- [ ] Test BeatSubdivisionGrid rendering
- [ ] Test selection interactions
- [ ] Test toolbar apply action
- [ ] Test with large beat counts (performance)

---

## Phase 9: Documentation

### 9.1 Update User Guide

- [ ] Update beat subdivision user guide
- [ ] Document new piano-roll editing paradigm
- [ ] Add screenshots of new UI

### 9.2 Update Component JSDoc

- [ ] Add JSDoc to BeatSubdivisionGrid
- [ ] Add JSDoc to SubdivisionToolbar
- [ ] Update SubdivisionSettings JSDoc

---

## Dependencies

```
Phase 1 (Engine Types)
    │
    ▼
Phase 2 (Showcase Types)
    │
    ▼
Phase 3 (Store Updates) ─────────────────┐
    │                                     │
    ├──────────────┬──────────────────────┤
    ▼              ▼                      │
Phase 4        Phase 5                    │
(Grid)         (Toolbar)                  │
    │              │                      │
    └──────┬───────┘                      │
           ▼                              │
    Phase 6 (SubdivisionSettings)         │
           │                              │
           ├──────────────────────────────┤
           ▼                              ▼
    Phase 7 (Remove Timeline)      Phase 8 (Testing)
                                              │
                                              ▼
                                       Phase 9 (Docs)
```

---

## Questions/Unknowns

| Question | Status | Resolution |
|----------|--------|------------|
| Sparse vs full array for beatSubdivisions? | Resolved | Use Map<number, SubdivisionType> (sparse) |
| Performance with 500+ beats in grid? | TBD | Implement virtualization in Phase 4 |
| Keep real-time SubdivisionButtons separate? | Resolved | Yes - independent feature for practice mode |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Engine Types | 2 | New interfaces + validation |
| Phase 2: Showcase Types | 1 | Re-exports + helper types |
| Phase 3: Store Updates | 2 | Actions, selectors |
| Phase 4: BeatSubdivisionGrid | 5 | Complex virtualized grid |
| Phase 5: SubdivisionToolbar | 2 | Button group + apply logic |
| Phase 6: SubdivisionSettings | 2 | Integration |
| Phase 7: Remove Timeline | 0.5 | Cleanup |
| Phase 8: Testing | 4 | Unit + integration tests |
| Phase 9: Documentation | 1 | JSDoc + user guide |
| **Total** | **19.5** | |

---

## Implementation Priority

1. **Phase 1-3**: Foundation (engine + store) - Required for UI
2. **Phase 4-5**: New UI components - Core user value
3. **Phase 6-7**: Integration + cleanup
4. **Phase 8-9**: Testing + documentation

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Per-beat config works | Engine processes per-beat configs | Unit tests |
| Grid renders 500+ beats | Smooth scrolling, no lag | Manual test |
| Selection works | Click, shift-click, drag select | Manual test |
| Apply subdivision works | Selected beats update | Manual test |
| Generate works | SubdividedBeatMap created | Manual test |
| Export works | JSON includes per-beat config | Export file check |
