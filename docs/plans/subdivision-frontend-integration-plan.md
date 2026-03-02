# Beat Subdivision Frontend Integration Plan

## Progress Summary

**Completed Phases:**
- Phase 1: Type System Updates
- Phase 2: Store Updates
- Phase 3: SubdivisionSettings Component
- Phase 4: Tasks 4.1, 4.2, 4.3, 4.4, 4.5, 4.6 (SubdivisionTimelineEditor component complete, including integration with SubdivisionSettings)
- Phase 5: Tasks 5.1, 5.2, 5.3, 5.4 (Generate SubdividedBeatMap button + BeatMapSummary subdivision display + Beat Map Export + BeatTimeline visualization)
- Phase 6: Tasks 6.1, 6.2, 6.3, 6.4, 6.5 (useSubdivisionPlayback Hook + SubdivisionButtons Component + Styles + Integration in BeatPracticeView + Subdivision stats display)

**Pending Phases:**
- Phase 6: Tasks 6.6-6.7
- Phase 7-10

**Ready to Start:** Phase 6, Task 6.6 (Real-Time Subdivision Switching)

---

## Design Decisions (Pre-Implementation Review)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hook Architecture | Parallel hook `useSubdivisionPlayback()` | Cleaner separation, easier to test |
| Scoring | Score all subdivided beats | Simple, consistent - no `isScoringBeat` flag needed |
| Timeline Editor | Include in MVP | Essential UX for segment configuration |
| Transition Mode | `immediate` default | More playful, immediate feedback |
| Persistence | Persist SubdivisionConfig to localStorage | Consistent with other settings |
| Export Format | Embedded in main export JSON | One file contains everything |
| Mode Toggle | **Removed** - no toggle needed | Pre-calculated in AudioAnalysisTab, real-time in BeatPracticeView |
| BeatMapSummary | Show subdivision types used | e.g., "quarter → eighth → half" |

---

## Overview

Integrate the beat subdivision system from `playlist-data-engine` into the `playlist-data-showcase` frontend. This enables users to:
1. **Pre-calculated SubdividedBeatMap**: Generate beat maps with custom subdivision patterns for level creation and export
2. **Real-Time Subdivision Playground**: Switch subdivision types on-the-fly during practice mode using `SubdivisionPlaybackController`

### Key Insight: Two Different Use Cases

| Feature | Pre-calculated SubdividedBeatMap | Real-Time Playground |
|---------|----------------------------------|---------------------|
| Purpose | Level creation, export | Practice mode |
| Input | UnifiedBeatMap | UnifiedBeatMap |
| Output | SubdividedBeatMap (saved) | Beats generated on-the-fly |
| When to use | Planning rhythm patterns | Experimenting during practice |
| Controller | BeatSubdivider | SubdivisionPlaybackController |

**Important**: The real-time playground uses `UnifiedBeatMap` (quarter notes) as its foundation and generates subdivisions dynamically. It does NOT use the pre-calculated `SubdividedBeatMap`.

---

## Goals

1. Add subdivision types and utilities to frontend type exports
2. Create `SubdivisionSettings` component for configuring subdivision patterns
3. Create `SubdivisionTimelineEditor` component for visual segment editing
4. Update `beatDetectionStore` to manage `UnifiedBeatMap` and `SubdividedBeatMap` state
5. Add subdivision buttons to `BeatPracticeView` for real-time switching
6. Integrate `SubdivisionPlaybackController` for practice mode
7. Update `BeatMapSummary` to display subdivision metadata
8. Update beat map export to include subdivision data

---

## Processing Pipeline

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  BeatMap    │ ──▶ │  InterpolatedBeatMap │ ──▶ │  UnifiedBeatMap  │ ──▶ │  SubdividedBeatMap  │
│ (detected)  │     │ (detected + interp.) │     │ (flattened QN)   │     │ (rhythm patterns)   │
└─────────────┘     └──────────────────────┘     └──────────────────┘     └─────────────────────┘
                                                      │
                                                      │ (also used by)
                                                      ▼
                                            ┌────────────────────────┐
                                            │ SubdivisionPlayback    │
                                            │ Controller (real-time) │
                                            └────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/SubdivisionSettings.tsx` | Subdivision type selector and segment configuration |
| `src/components/ui/SubdivisionSettings.css` | Styles for subdivision settings |
| `src/components/ui/SubdivisionTimelineEditor.tsx` | Visual timeline editor for subdivision segments |
| `src/components/ui/SubdivisionTimelineEditor.css` | Styles for timeline editor |
| `src/components/ui/SubdivisionButtons.tsx` | Quick subdivision buttons for practice mode |
| `src/components/ui/SubdivisionButtons.css` | Styles for subdivision buttons |
| `src/hooks/useSubdivisionPlayback.ts` | React hook wrapping SubdivisionPlaybackController for real-time mode |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add subdivision type exports from engine |
| `src/store/beatDetectionStore.ts` | Add UnifiedBeatMap, SubdividedBeatMap, SubdivisionConfig state; add localStorage persistence |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Add SubdivisionSettings section in beat mode |
| `src/components/ui/BeatPracticeView.tsx` | Add subdivision buttons and integrate useSubdivisionPlayback hook |
| `src/components/ui/BeatMapSummary.tsx` | Display subdivision types used when available |
| `src/hooks/useBeatStream.ts` | Support SubdividedBeatMap input for pre-calculated mode |

---

## Phase 1: Type System Updates

### 1.1 Add Subdivision Type Exports

- [x] Update `src/types/index.ts` to export subdivision types from engine
  - [x] `SubdivisionType` - enum for subdivision types
  - [x] `SubdivisionSegment` - segment configuration
  - [x] `SubdivisionConfig` - full configuration with segments
  - [x] `UnifiedBeatMap` - unified quarter-note grid
  - [x] `SubdividedBeat` - beat with subdivision info
  - [x] `SubdividedBeatMap` - result of subdivision
  - [x] `SubdivisionMetadata` - metadata about subdivision
  - [x] `SubdivisionTransitionMode` - real-time transition modes
  - [x] `SubdivisionPlaybackOptions` - options for playback controller
  - [x] `SubdivisionBeatEvent` - beat event from playback controller
  - [x] `SubdivisionCallback` - callback type for beat events

### 1.2 Add Subdivision Constants

- [x] Export subdivision constants
  - [x] `DEFAULT_SUBDIVISION_CONFIG` - default quarter notes throughout
  - [x] `DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS` - default playback options
  - [x] `MAX_SUBDIVISION_DENSITY` - maximum density (4x = sixteenth)
  - [x] `VALID_SUBDIVISION_TYPES` - array of valid types

### 1.3 Add Subdivision Validation Functions

- [x] Export validation functions
  - [x] `validateSubdivisionConfig` - structural validation
  - [x] `validateSubdivisionConfigAgainstBeats` - beat count validation
  - [x] `validateSubdivisionDensity` - density limit validation
  - [x] `isValidSubdivisionType` - type guard
  - [x] `getSubdivisionDensity` - get density multiplier for type

### 1.4 Add Engine Class Exports

- [x] Export engine classes needed for subdivision
  - [x] `BeatSubdivider` - pre-calculated subdivision
  - [x] `unifyBeatMap` - utility to create UnifiedBeatMap
  - [x] `subdivideBeatMap` - convenience function
  - [x] `SubdivisionPlaybackController` - real-time controller

---

## Phase 2: Store Updates

### 2.1 Add Subdivision State

- [x] Add subdivision state to `beatDetectionStore.ts`
  - [x] `unifiedBeatMap: UnifiedBeatMap | null` - unified quarter-note grid
  - [x] `subdividedBeatMap: SubdividedBeatMap | null` - pre-calculated subdivided map
  - [x] `subdivisionConfig: SubdivisionConfig` - current configuration (persisted)
  - [x] `currentSubdivision: SubdivisionType` - for real-time mode (persisted)
  - [x] `cachedUnifiedBeatMaps: Record<string, UnifiedBeatMap>` - localStorage cache
  - [x] `cachedSubdividedBeatMaps: Record<string, SubdividedBeatMap>` - localStorage cache
  - [x] Module-level `_activeSubdivisionPlaybackController` with getter/setter (non-serializable)
  - [x] ~~`subdivisionMode`~~ - **REMOVED** per design decision (mode is implicit by component)
  - [x] ~~`subdivisionPlaybackController` in state~~ - **MOVED** to module-level variable (not serializable)

### 2.2 Add Subdivision Actions

- [x] Add actions for subdivision management
  - [x] `generateUnifiedBeatMap()` - create UnifiedBeatMap from InterpolatedBeatMap
  - [x] `generateSubdividedBeatMap()` - create SubdividedBeatMap using BeatSubdivider
  - [x] `setSubdivisionConfig()` - update subdivision configuration
  - [x] `addSubdivisionSegment()` - add a new segment
  - [x] `removeSubdivisionSegment()` - remove a segment
  - [x] `updateSubdivisionSegment()` - update existing segment
  - [x] ~~`setSubdivisionMode()`~~ - **REMOVED** per design decision (mode is implicit by component)
  - [x] `setCurrentSubdivision()` - for real-time mode
  - [x] `initializeSubdivisionPlayback()` - create SubdivisionPlaybackController
  - [x] `cleanupSubdivisionPlayback()` - destroy controller

### 2.3 Add Subdivision Selectors

- [x] Add selectors for subdivision state
  - [x] `useUnifiedBeatMap()` - get UnifiedBeatMap
  - [x] `useSubdividedBeatMap()` - get SubdividedBeatMap
  - [x] `useSubdivisionConfig()` - get SubdivisionConfig
  - [x] `useCurrentSubdivision()` - get current subdivision type
  - [x] ~~`useSubdivisionMode()`~~ - **REMOVED** (mode is implicit by component)
  - [x] `useSubdivisionMetadata()` - get subdivision metadata

### 2.4 Integrate with Existing Pipeline

- [x] Update `generateBeatMap` success handler to auto-generate `UnifiedBeatMap`
- [x] Update interpolation success handler to regenerate `UnifiedBeatMap`
- [x] Clear `SubdividedBeatMap` when `UnifiedBeatMap` changes

### 2.5 Persist SubdivisionConfig to localStorage

- [x] Add localStorage persistence for SubdivisionConfig
  - [x] Save config on change (via partialize)
  - [x] Load config on store initialization (via merge)
  - [x] Use existing persistence pattern from beatDetectionStore
  - [x] Persist `currentSubdivision`, `cachedUnifiedBeatMaps`, `cachedSubdividedBeatMaps`

---

## Phase 3: SubdivisionSettings Component

### 3.1 Create SubdivisionSettings Component

- [x] Create `src/components/ui/SubdivisionSettings.tsx`
  - [x] Display current subdivision configuration
  - [x] Show list of segments with subdivision types
  - [x] Add/remove segment buttons
  - [x] Subdivision type selector per segment
  - [x] Start beat input for each segment

### 3.2 Subdivision Type Selector

- [x] Create subdivision type selector UI
  - [x] Quarter (1x) - default
  - [x] Half (0.5x) - beats on 1 and 3
  - [x] Eighth (2x) - double density
  - [x] Sixteenth (4x) - maximum density
  - [x] Triplet8 (3 per quarter)
  - [x] Triplet4 (3 per half)
  - [x] Dotted4 (1.5x interval)
  - [x] Dotted8 (swing pattern)

### 3.3 Segment List UI

- [x] Create segment list with:
  - [x] Visual list of segments ordered by startBeat
  - [x] Each segment shows: startBeat, subdivision type
  - [x] Edit button to modify segment
  - [x] Delete button (except first segment)
  - [x] "Add Segment" button at bottom

### 3.4 Subdivision Settings Styles

- [x] Create `src/components/ui/SubdivisionSettings.css`
  - [x] Match existing settings panel styles
  - [x] Responsive layout
  - [x] Toggle button styles for subdivision types

### 3.5 Integrate with AudioAnalysisTab

- [x] Add SubdivisionSettings section in AudioAnalysisTab
  - [x] Place below BeatDetectionSettings in beat mode
  - [x] Show only when beat map exists
  - [x] Disabled during beat generation

---

## Phase 4: SubdivisionTimelineEditor Component

### 4.1 Create Timeline Editor Component

- [x] Create `src/components/ui/SubdivisionTimelineEditor.tsx`
  - [x] Visual timeline showing beat positions
  - [x] Colored regions for each subdivision segment
  - [x] Drag handles to adjust segment boundaries
  - [x] Click to add new segment at position
  - [x] Zoom and scroll for long tracks

### 4.2 Timeline Visualization

- [x] Render timeline with:
  - [x] Beat markers (from UnifiedBeatMap)
  - [x] Downbeat indicators
  - [x] Current subdivision regions (colored blocks)
  - [x] Segment boundary markers
  - [x] Time ruler (seconds/minutes)
  - [x] Beat ruler (beat numbers)

### 4.3 Drag and Drop Segment Boundaries

- [x] Implement drag interaction:
  - [x] Drag segment boundary to resize
  - [x] Snap to beat positions
  - [x] Update startBeat on drag end
  - [x] Visual feedback during drag
  - [x] Keyboard accessibility (arrow keys)

### 4.4 Click to Add Segment

- [x] Implement click interaction:
  - [x] Click on timeline to add segment at position
  - [x] Show subdivision type picker on click
  - [x] Validate: can't overlap existing segments
  - [x] Auto-sort segments by startBeat

### 4.5 Timeline Editor Styles

- [x] Create `src/components/ui/SubdivisionTimelineEditor.css`
  - [x] Timeline track styles
  - [x] Segment region colors per subdivision type
  - [x] Drag handle styles
  - [x] Hover and active states

### 4.6 Integrate with SubdivisionSettings

- [x] Show timeline editor when segments > 1 or expanded
- [x] Sync timeline selection with segment list
- [x] Update preview on configuration change

---

## Phase 5: Pre-Calculated Subdivision Mode

### 5.1 Generate SubdividedBeatMap

- [x] Add "Generate Subdivision" button to SubdivisionSettings
  - [x] Calls `BeatSubdivider.subdivide()` with current config
  - [x] Shows progress indicator during generation
  - [x] Stores result in `subdividedBeatMap`

### 5.2 Update BeatMapSummary for Subdivision

- [x] Update `BeatMapSummary.tsx` to show subdivision info
  - [x] Display subdivision types used (e.g., "quarter → eighth → half")
  - [x] Show when SubdividedBeatMap exists

### 5.3 Update Beat Map Export

- [x] Update `handleExportBeatMap` in AudioAnalysisTab
  - [x] Embed subdivision data in main export JSON (not separate file)
  - [x] Include subdivision config
  - [x] Include SubdividedBeatMap if generated
  - [x] Add subdivision metadata to export JSON

### 5.4 SubdividedBeatMap Visualization

- [x] Update BeatTimeline to render SubdividedBeatMap
  - [x] Color-code beats by subdivision type
  - [x] Show segment boundaries
  - [x] Handle decimal beatInMeasure values

---

## Phase 6: Real-Time Subdivision Playground

### 6.1 Create useSubdivisionPlayback Hook

- [x] Create `src/hooks/useSubdivisionPlayback.ts`
  - [x] Wrap `SubdivisionPlaybackController` from engine
  - [x] Accept `UnifiedBeatMap` and `AudioContext`
  - [x] Expose `setSubdivision(type)` for UI buttons
  - [x] Emit beat events for timeline visualization
  - [x] Handle play/pause/seek from audio player
  - [x] Clean up controller on unmount

### 6.2 Create SubdivisionButtons Component

- [x] Create `src/components/ui/SubdivisionButtons.tsx`
  - [x] Row of quick subdivision buttons
  - [x] Buttons: Quarter, Half, Eighth, Sixteenth, Triplet, Swing
  - [x] Active state for current subdivision
  - [x] Disabled states for unavailable types

### 6.3 SubdivisionButtons Styles

- [x] Create `src/components/ui/SubdivisionButtons.css`
  - [x] Horizontal button group
  - [x] Active button highlighting
  - [x] Icons for each subdivision type (density dots)
  - [x] Touch-friendly sizing

### 6.4 Integrate SubdivisionPlaybackController via Hook

- [x] Use `useSubdivisionPlayback` hook in BeatPracticeView
  - [x] Initialize when entering practice mode
  - [x] Pass UnifiedBeatMap as foundation
  - [x] Configure with `immediate` transition mode (default)

### 6.5 Update BeatPracticeView

- [x] Add subdivision UI to BeatPracticeView
  - [x] Add SubdivisionButtons below controls
  - [x] Show current subdivision in stats area
  - [x] Handle subdivision button clicks via hook

### 6.6 Real-Time Subdivision Switching

- [ ] Implement subdivision switching in practice mode
  - [ ] Call `setSubdivision(type)` from hook on button click
  - [ ] Update current subdivision display
  - [ ] Maintain beat continuity across switches
  - [ ] Log subdivision changes for debugging

### 6.7 Transition Mode Configuration

- [ ] Default to `'immediate'` transition mode
  - [ ] Switch subdivision instantly when button pressed
  - [ ] More playful, immediate feedback
- [ ] Optional: Add UI toggle for transition mode in settings (future enhancement)

---

## Phase 7: BeatStream Integration

### 7.1 Support SubdividedBeatMap Input

- [ ] Update `useBeatStream.ts` to accept SubdividedBeatMap
  - [ ] Add type guard for SubdividedBeatMap detection
  - [ ] Use `beats` array from SubdividedBeatMap
  - [ ] Handle `SubdividedBeat` type with decimal beatInMeasure

### 7.2 Update Beat Stream Mode

- [ ] Add 'subdivided' to BeatStreamMode type
  ```typescript
  type BeatStreamMode = 'detected' | 'merged' | 'subdivided';
  ```

### 7.3 BeatStream Mode Toggle Update

- [ ] Update BeatPracticeView stream toggle
  - [ ] Add "Subdivided" option when SubdividedBeatMap exists
  - [ ] Show subdivision type in toggle label

---

## Phase 8: CSS and Styling

### 8.1 Subdivision Color Scheme

- [ ] Define colors for each subdivision type
  - [ ] Quarter: Primary blue
  - [ ] Half: Green
  - [ ] Eighth: Orange
  - [ ] Sixteenth: Red
  - [ ] Triplet8: Purple
  - [ ] Triplet4: Pink
  - [ ] Dotted4: Teal
  - [ ] Dotted8: Yellow/Gold

### 8.2 AudioAnalysisTab Layout Updates

- [ ] Update AudioAnalysisTab.css for subdivision section
  - [ ] Space for SubdivisionSettings below BeatDetectionSettings
  - [ ] Collapsible to save space
  - [ ] Responsive layout

### 8.3 BeatPracticeView Layout Updates

- [ ] Update BeatPracticeView.css for subdivision buttons
  - [ ] Space for SubdivisionButtons
  - [ ] Subdivision indicator in stats area
  - [ ] Active subdivision highlighting

---

## Phase 9: Testing

### 9.1 Unit Tests for Store

- [ ] Test subdivision state management
  - [ ] Test generateUnifiedBeatMap
  - [ ] Test generateSubdividedBeatMap
  - [ ] Test subdivision config updates
  - [ ] Test segment CRUD operations

### 9.2 Component Tests

- [ ] Test SubdivisionSettings component
  - [ ] Renders subdivision types
  - [ ] Handles segment add/remove
  - [ ] Calls store actions correctly

### 9.3 Integration Tests

- [ ] Test subdivision pipeline
  - [ ] BeatMap → InterpolatedBeatMap → UnifiedBeatMap → SubdividedBeatMap
  - [ ] Real-time subdivision switching
  - [ ] BeatStream with SubdividedBeatMap

### 9.4 Edge Case Tests

- [ ] Test edge cases
  - [ ] Empty beat map
  - [ ] Single segment (default)
  - [ ] Many segments
  - [ ] Invalid subdivision config
  - [ ] Density limit exceeded

---

## Phase 10: Documentation

### 10.1 Update Component Documentation

- [ ] Add JSDoc comments to new components
  - [ ] SubdivisionSettings
  - [ ] SubdivisionTimelineEditor
  - [ ] SubdivisionButtons
  - [ ] useSubdivisionPlayback hook

### 10.2 Update README/Docs

- [ ] Document subdivision feature
  - [ ] How to use pre-calculated subdivision
  - [ ] How to use real-time playground
  - [ ] Subdivision type explanations
  - [ ] Segment configuration guide

---

## Dependencies

```
Phase 1 (Types) ────────────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           │
Phase 2 (Store) ────────────────────────────────────────────────────┤
        │                                                           │
        ├──────────────┬────────────────────────────────┐            │
        ▼              ▼                                ▼            │
Phase 3          Phase 4                          Phase 6            │
(Settings)       (Timeline Editor)                (Real-Time)        │
        │              │                          (useSubdivision    │
        │              │                           Playback hook)    │
        └──────┬───────┘                                │            │
               ▼                                        │            │
        Phase 5 (Pre-calculated)                        │            │
               │                                        │            │
               └────────────────┬───────────────────────┘            │
                              ▼                                    │
                        Phase 7 (BeatStream)                       │
                              │                                    │
                              ▼                                    │
                        Phase 8 (CSS)                              │
                              │                                    │
                              ▼                                    │
                        Phase 9 (Testing)                          │
                              │                                    │
                              ▼                                    │
                        Phase 10 (Docs) ────────────────────────────┘
```

**Note:** No SubdivisionModeToggle needed - pre-calculated mode lives in AudioAnalysisTab, real-time mode lives in BeatPracticeView.

---

## Questions/Unknowns

| Question | Status | Resolution |
|----------|--------|------------|
| Should subdivision affect practice mode scoring? | **Resolved** | Yes - score all subdivided beats, keep it simple |
| How to handle subdivision with multi-tempo tracks? | Resolved | Engine handles tempo-aware subdivision |
| Default transition mode for real-time switching? | **Resolved** | `'immediate'` - instant switch for playground feel |
| Persist subdivision config to localStorage? | **Resolved** | Yes, persist with other beat detection settings |

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Type Exports | All subdivision types exported | Import check |
| Store Updates | State and actions working | Unit tests |
| SubdivisionSettings | Renders correctly, updates store | Component test |
| Timeline Editor | Drag/drop working, visual feedback | Manual test |
| Pre-calculated Mode | Generate SubdividedBeatMap | Integration test |
| Real-time Mode | Switch subdivisions during playback | Manual test |
| BeatStream Integration | Supports SubdividedBeatMap | Unit test |
| Export | Includes subdivision data | Export file check |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Types | 1 | Re-export from engine |
| Phase 2: Store | 3 | State, actions, selectors, localStorage |
| Phase 3: SubdivisionSettings | 3 | Basic UI component |
| Phase 4: Timeline Editor | 5 | Complex drag/drop UI (MVP essential) |
| Phase 5: Pre-calculated Mode | 2 | Integration |
| Phase 6: Real-Time Playground | 4 | useSubdivisionPlayback hook + SubdivisionButtons |
| Phase 7: BeatStream Integration | 2 | Support new map type |
| Phase 8: CSS | 2 | Styling polish |
| Phase 9: Testing | 4 | Unit and integration tests |
| Phase 10: Documentation | 1 | JSDoc and docs |
| **Total** | **27** | |

---

## Implementation Priority

1. **Phase 1-2**: Foundation (types and store) - Required for everything else
2. **Phase 3-4**: Settings UI + Timeline Editor - Essential UX for segment configuration
3. **Phase 6**: Real-Time Playground - High user value, demonstrates feature
4. **Phase 5**: Pre-calculated Mode - Complete the feature
5. **Phase 7-10**: Integration, styling, testing, docs - Finalization

---

## Example Usage (Post-Implementation)

### Pre-calculated Subdivision

```tsx
// In AudioAnalysisTab after beat map generation
const config: SubdivisionConfig = {
  segments: [
    { startBeat: 0, subdivision: 'quarter' },
    { startBeat: 32, subdivision: 'eighth' },
    { startBeat: 96, subdivision: 'half' },
  ],
};

// Generate subdivided beat map
const subdividedMap = await generateSubdividedBeatMap(config);

// Export with subdivision data
handleExportBeatMap(subdividedMap);
```

### Real-Time Subdivision Playground

```tsx
// In BeatPracticeView
const handleSubdivisionChange = (type: SubdivisionType) => {
  playbackController.setSubdivision(type);
};

// Render subdivision buttons
<SubdivisionButtons
  currentSubdivision={currentSubdivision}
  onSubdivisionChange={handleSubdivisionChange}
  disabled={!isPlaying}
/>
```

---

## Next Steps

1. **Review and approve** this plan
2. **Start Phase 1**: Add type exports to `src/types/index.ts`
3. **Work through phases** in priority order
4. **Test each phase** before moving to next
5. **Update documentation** as features are completed
