# Manual Downbeat Configuration UI - Implementation Plan

## Overview

Add UI for manual downbeat configuration to the frontend. The backend already supports `reapplyDownbeatConfig()` which recalculates `beatInMeasure`, `isDownbeat`, and `measureNumber` without re-analyzing audio.

**Workflow**: Generate first → Examine beat map → Click to set downbeat → Config applies automatically

**Core Features**:
- Full multi-segment support (time signature changes mid-track) - backend supports unlimited segments
- Click on beat marker to set downbeat position
- Optional measure visualization (measure boundary lines + measure numbers as single toggle)

---

## UI Flow

### Where the UI Lives

The **DownbeatConfigPanel** appears inside **BeatMapSummary** (the card shown after beat analysis completes). It's a collapsible panel below the interpolation statistics.

### Basic Flow (Single Time Signature)

```
┌─────────────────────────────────────────────────────────────┐
│  BeatMapSummary                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ BPM: 120 | Beats: 234 | Duration: 3:45                 │ │
│  │ [Start Practice Mode]                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚙️ Downbeat Configuration                    [Modified] │ │
│  │                                                          │ │
│  │ Time Signature: 4/4  │  Downbeat at Beat: 0             │ │
│  │                                                          │ │
│  │ [3/4] [4/4] [5/4] [6/4] [7/4] [8/4]  ← Toggle buttons  │ │
│  │                                                          │ │
│  │ Beat Index: [___0___]  ← Number input (0 to max-1)      │ │
│  │                                                          │ │
│  │ ℹ️ Click "Edit Downbeat" then click any beat in the     │ │
│  │    timeline to set it as the downbeat (beat 1)          │ │
│  │                                                          │ │
│  │ [Edit Downbeat]  [Reset to Default]                     │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Selection Mode Flow

1. **User clicks "Edit Downbeat"** button
   - Button changes to "Done" (primary color)
   - BeatTimeline enters selection mode
   - Beat markers become clickable (cursor pointer, hover effect)
   - Beat numbers appear below each beat marker (1, 2, 3, 4...)

2. **User clicks a beat in the timeline**
   - That beat becomes the new downbeat (beat 1)
   - `reapplyDownbeatConfig()` is called immediately
   - All beats get new `beatInMeasure`, `isDownbeat`, `measureNumber`
   - Timeline re-renders with new downbeat styling
   - Measure boundaries update (if visualization toggle is on)

3. **User clicks "Done"**
   - Exits selection mode
   - Beat markers return to normal behavior
   - Beat numbers hide

### Multi-Segment Flow (Time Signature Changes)

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Downbeat Configuration                        [Modified] │
│                                                              │
│ Time Signature: 4/4  │  Downbeat at Beat: 0                 │
│                                                              │
│ ▶ Advanced: Time Signature Changes                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Segment 1 (First)                        [Delete]    │   │
│   │   Start: Beat 0 | Time: 4/4 | Downbeat: 0           │   │
│   │                                                      │   │
│   │ Segment 2                                 [Delete]    │   │
│   │   Start: Beat 32 | Time: 3/4 | Downbeat: 32         │   │
│   │                                                      │   │
│   │ [+ Add Segment at Beat...]                          │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│ [Edit Downbeat]  [Reset to Default]                         │
└─────────────────────────────────────────────────────────────┘
```

**Adding a segment:**
1. Click "Add Segment at Beat..."
2. Enter beat number where time signature changes
3. Select new time signature
4. Click the downbeat position for that segment
5. Segment is added, beats are recalculated

**Important:** Each segment has its own `downbeatBeatIndex` (absolute, not relative). When you click a beat while a segment is selected, it sets that segment's downbeat.

### Measure Visualization Toggle

A separate toggle (probably in BeatPracticeView header or DownbeatConfigPanel):
- **OFF** (default): Just beat markers with downbeat styling (current behavior)
- **ON**: Vertical lines at measure starts + measure numbers above timeline

```
Timeline with measure visualization ON:

     M1         M2         M3         M4
      │          │          │          │
  ●──○──○──○──●──○──○──○──●──○──○──○──●──○──○
  1  2  3  4  1  2  3  4  1  2  3  4  1  2  3

  ● = downbeat  ○ = regular beat  │ = measure line
```

---

## Phase 1: Type Re-exports and Store Foundation

- [x] **1.1 Re-export downbeat types from engine**
  - [x] Add `TimeSignatureConfig`, `DownbeatSegment`, `DownbeatConfig` to `src/types/index.ts`
  - [x] Add `DEFAULT_DOWNBEAT_CONFIG`, `reapplyDownbeatConfig` exports
  - [x] Verify types are accessible throughout codebase (vite build succeeds)

- [x] **1.2 Add downbeat config state to store**
  - [x] Add `downbeatConfig: DownbeatConfig | null` to state interface in `src/store/beatDetectionStore.ts`
  - [x] Initialize as `null` in initial state (null = using default)
  - [x] Add to `partialize` for localStorage persistence

- [x] **1.3 Add store actions for downbeat config**
  - [x] `applyDownbeatConfig(config: DownbeatConfig)` - Apply new config, update beatMap and interpolatedBeatMap
  - [x] `resetDownbeatConfig()` - Reset to default (beat 0 = downbeat, 4/4)
  - [x] `setDownbeatPosition(beatIndex: number, beatsPerMeasure?: number)` - Convenience for single-segment
  - [x] `addDownbeatSegment(segment: DownbeatSegment)` - Add new segment for time signature changes
  - [x] `removeDownbeatSegment(segmentIndex: number)` - Remove a segment
  - [x] `updateDownbeatSegment(segmentIndex: number, updates: Partial<DownbeatSegment>)` - Update segment

- [x] **1.4 Add store selectors**
  - [x] `useDownbeatConfig()` - Get current config
  - [x] `useTimeSignature()` - Get current beats per measure (first segment)
  - [x] `useDownbeatSegmentCount()` - Get number of segments
  - [x] `useHasCustomDownbeatConfig()` - Check if non-default config is applied

---

## Phase 2: DownbeatConfigPanel Component

- [x] **2.1 Create DownbeatConfigPanel component**
  - [x] Create `src/components/ui/DownbeatConfigPanel.tsx`
  - [x] Create `src/components/ui/DownbeatConfigPanel.css`
  - [x] Export from component index if applicable (N/A - no component index file exists)

- [x] **2.2 Implement header section**
  - [x] Settings icon with "Downbeat Configuration" title
  - [x] "Modified" badge when config differs from default
  - [x] Collapse/expand toggle

- [x] **2.3 Implement current config display**
  - [x] Show current time signature (e.g., "4/4")
  - [x] Show current downbeat position (beat index)
  - [x] Show segment count if > 1

- [x] **2.4 Implement time signature selector**
  - [x] Toggle buttons for common time signatures: 3/4, 4/4, 5/4, 6/4, 7/4, 8/4
  - [x] Use existing toggle button pattern from BeatDetectionSettings
  - [x] Update config immediately on selection

- [x] **2.5 Implement downbeat position input**
  - [x] Number input (0 to max beats - 1)
  - [x] Validation and clamping
  - [x] Update config on change

- [x] **2.6 Implement hint box**
  - [x] Info icon with text: "Click on any beat in the timeline to set it as the downbeat"
  - [x] Styled consistently with existing hint boxes

- [x] **2.7 Implement multi-segment support (Advanced)**
  - [x] Collapsible "Advanced: Time Signature Changes" section
  - [x] List of current segments with start beat, time signature, downbeat index
  - [x] "Add Segment" button to add new segment at specific beat
  - [x] Delete button for each segment (except first)
  - [x] Edit controls for each segment

- [x] **2.8 Implement actions**
  - [x] "Reset to Default" button (shown when modified)
  - [x] Disabled state when no beat map exists

---

## Phase 3: BeatTimeline Click Integration

- [x] **3.1 Add selection props to BeatTimeline**
  - [x] `onBeatClick?: (beatIndex: number) => void`
  - [x] `enableBeatSelection?: boolean`
  - [x] `selectedBeatIndex?: number` (for visual highlight)

- [x] **3.2 Implement beat click handler**
  - [x] Add click handler to beat markers
  - [x] Only active when `enableBeatSelection=true`
  - [x] Stop propagation to prevent timeline seek
  - [x] Call `onBeatClick` with beat index

- [x] **3.3 Add beat selection visual styling**
  - [x] Cursor pointer when selection enabled
  - [x] Hover scale effect on beat markers
  - [x] Selected beat highlight (ring or glow)
  - [x] Add CSS class `.beat-timeline-marker--selectable`

- [x] **3.4 Add beat number labels (optional visibility)**
  - [x] Show beat numbers (1, 2, 3, 4...) below beats when selection enabled
  - [x] Position below marker with small font
  - [x] Add CSS class `.beat-timeline-marker-number`

---

## Phase 4: Measure Visualization (Optional Toggle)

- [x] **4.1 Add measure visualization toggle**
  - [x] New prop `showMeasureBoundaries?: boolean` on BeatTimeline
  - [x] Add toggle control in DownbeatConfigPanel or BeatPracticeView
  - [x] Persist preference in store state

- [x] **4.2 Calculate measure boundaries**
  - [x] Add helper function to find beats where `isDownbeat=true`
  - [x] Calculate positions based on beat timestamps

- [x] **4.3 Render measure boundary lines (when toggle enabled)**
  - [x] Vertical lines at measure starts
  - [x] Semi-transparent primary color
  - [x] Position based on timestamp ratio

- [x] **4.4 Add measure number labels (when toggle enabled)**
  - [x] Small labels above timeline showing measure numbers (1, 2, 3...)
  - [x] Only show for visible measures (performance optimization)
  - [x] Add CSS class `.beat-timeline-measure-number`

- [x] **4.5 Add CSS for measure visualization**
  - [x] `.beat-timeline-measure-boundary` - line container
  - [x] `.beat-timeline-measure-line` - the actual line
  - [x] `.beat-timeline-measure-number` - label styling

---

## Phase 5: BeatMapSummary Integration

- [x] **5.1 Import DownbeatConfigPanel**
  - [x] Add import to `src/components/ui/BeatMapSummary.tsx`

- [x] **5.2 Add panel to BeatMapSummary**
  - [x] Add DownbeatConfigPanel after interpolation statistics section
  - [x] Pass `disabled={!beatMap}` prop
  - [x] Wire up selection mode state (component handles internally via store selectors)

- [ ] **5.3 Add selection mode toggle**
  - [ ] "Edit Downbeat" button to enter selection mode
  - [ ] Show "Click a beat to set as downbeat" instruction
  - [ ] "Done" button to exit selection mode

- [ ] **5.4 Connect BeatTimeline click to store**
  - [ ] Pass `onBeatClick` callback that calls `setDownbeatPosition`
  - [ ] Enable selection mode when "Edit Downbeat" is clicked

---

## Phase 6: Practice Mode Integration

- [ ] **6.1 Verify practice mode uses updated config**
  - [ ] BeatPracticeView should use updated beatMap
  - [ ] Downbeat styling should reflect new positions

- [ ] **6.2 Update interpolated beat map on config change**
  - [ ] Store action should regenerate interpolated beat map
  - [ ] Practice mode should see updated merged beats

- [ ] **6.3 Update cache on config change**
  - [ ] Update cachedBeatMaps with new beatMap
  - [ ] Update cachedInterpolatedBeatMaps with new interpolated map

---

## Dependencies

- Backend `reapplyDownbeatConfig()` function (already implemented)
- `DownbeatConfig`, `DownbeatSegment`, `TimeSignatureConfig` types (already in engine)
- Existing `beatDetectionStore` patterns
- Existing `BeatTimeline` component structure

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/DownbeatConfigPanel.tsx` | Main configuration panel |
| `src/components/ui/DownbeatConfigPanel.css` | Panel styling |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/index.ts` | Re-export downbeat types |
| `src/store/beatDetectionStore.ts` | Add state, actions, selectors |
| `src/components/ui/BeatTimeline.tsx` | Add click handler, measure visualization |
| `src/components/ui/BeatTimeline.css` | Selection and measure styles |
| `src/components/ui/BeatMapSummary.tsx` | Integrate DownbeatConfigPanel |

---

## Questions/Unknowns

- [ ] How to handle time signature changes UI - inline edit or modal? (Recommend: Inline with validation)
- [ ] Default state for measure visualization toggle - on or off? (Recommend: Off by default, user opt-in)

---

## Verification Checklist

- [ ] Build passes: `npm run build`
- [ ] TypeScript compiles without errors
- [ ] Generate beat map works with default config
- [ ] Click on beat in timeline updates downbeat position
- [ ] Time signature toggle updates measure structure
- [ ] Measure boundary lines display correctly
- [ ] Multi-segment support works for time signature changes
- [ ] Config persists after page reload (localStorage)
- [ ] Practice mode uses updated downbeat positions
- [ ] Reset button restores default config
- [ ] Cached beat maps update with new config
