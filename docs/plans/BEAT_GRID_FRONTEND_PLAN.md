# Beat Grid Interpolation - Frontend Integration Plan

## Overview

This plan covers the frontend integration for the Beat Grid Interpolation System in the playlist-data-showcase demo application. The frontend will expose the new interpolation modes, allow users to configure the approach, and visualize both detected and estimated beats.

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AudioAnalysisTab                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │BeatDetectionSettings│  │  BeatMapSummary  │  │ BeatPracticeView │  │
│  │   (OSE params)    │  │   (stats only)   │  │ (realtime sync)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       beatDetectionStore                            │
│  - BeatMap caching    - OSE config state    - Practice mode state   │
│  - generateBeatMap()  - setOseConfig()      - tap history           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    playlist-data-engine                             │
│  BeatMapGenerator → BeatMap → BeatStream (realtime playback)        │
└─────────────────────────────────────────────────────────────────────┘
```

### New Architecture (with Beat Grid Interpolation)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AudioAnalysisTab                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │BeatDetectionSettings│  │  BeatMapSummary  │  │ BeatPracticeView │  │
│  │   (OSE params)    │  │  + Grid Settings │  │ + Grid Toggle    │  │
│  │ + Grid Settings   │  │  + Mode Selector │  │ + Grid Viz       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       beatDetectionStore                            │
│  + gridMode state     + gridApproach state    + gridConfig          │
│  + generateBeatGrid() + setGridConfig()       + gridResult caching  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    playlist-data-engine                             │
│  BeatMapGenerator → BeatGridGenerator → BeatGridResult              │
│       ↓                    ↓                    ↓                   │
│     BeatMap          InterpolatedBeats     Multi-stream output      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Type Extensions

**Goal**: Extend frontend types to support beat grid data.

### Tasks

- [ ] **1.1 Add Grid Types to Frontend**
  - [ ] Update [src/types/index.ts](src/types/index.ts) to re-export from engine:
    ```typescript
    export type {
      BeatGridMode,
      BeatGridApproach,
      BeatSource,
      InterpolatedBeat,
      BeatGridResult,
      BeatGridConfig,
      TempoCurvePoint,
      BeatGridMetadata,
    } from 'playlist-data-engine';
    ```

- [ ] **1.2 Create Frontend-Specific Grid Types**
  - [ ] Create `BeatGridVisualizationData` for timeline rendering:
    ```typescript
    interface BeatGridVisualizationData {
      beats: Array<{
        timestamp: number;
        source: 'detected' | 'estimated';
        confidence: number;
        isDownbeat: boolean;
      }>;
      tempoCurve?: Array<{ time: number; bpm: number }>;
    }
    ```

---

## Phase 2: Store Updates

**Goal**: Add grid state management to beatDetectionStore.

### Tasks

- [ ] **2.1 Extend BeatDetectionState Interface**
  - [ ] Add to [src/store/beatDetectionStore.ts](src/store/beatDetectionStore.ts):
    ```typescript
    interface BeatDetectionState {
      // ... existing state ...
      
      // New grid state
      gridConfig: BeatGridConfig;
      gridResult: BeatGridResult | null;
      gridMode: BeatGridMode;
      gridApproach: BeatGridApproach;
      showGridVisualization: boolean;
    }
    ```

- [ ] **2.2 Add Grid Actions**
  - [ ] `setGridMode(mode: BeatGridMode)`
  - [ ] `setGridApproach(approach: BeatGridApproach)`
  - [ ] `setGridConfig(config: Partial<BeatGridConfig>)`
  - [ ] `toggleGridVisualization()`
  - [ ] `generateBeatGrid(audioId: string)` - calls engine's BeatGridGenerator

- [ ] **2.3 Add Grid Selectors**
  - [ ] `useGridResult()` - returns current BeatGridResult
  - [ ] `useGridMode()` - returns current mode
  - [ ] `useGridApproach()` - returns current approach
  - [ ] `useGridVisualizationData()` - returns formatted data for visualization
  - [ ] `useShowGridVisualization()` - returns toggle state

- [ ] **2.4 Update generateBeatMap Action**
  - [ ] After generating BeatMap, optionally generate BeatGridResult
  - [ ] Cache grid result alongside beat map
  - [ ] Fire grid generation based on `gridMode !== 'detected-only'`

---

## Phase 3: UI Components - Settings Panel

**Goal**: Add grid configuration UI to BeatDetectionSettings.

### Tasks

- [ ] **3.1 Create BeatGridSettings Sub-Component**
  - [ ] Create [src/components/ui/BeatGridSettings.tsx](src/components/ui/BeatGridSettings.tsx)
  - [ ] Include controls:
    - Mode selector: `detected-only` | `detected-interpolated` | `estimated-grid`
    - Approach selector: `linear` | `global-tempo` | `windowed` | `auto`
    - Blend ratio slider (for `detected-interpolated` mode)
    - Subdivision selector (quarter, eighth, triplet - optional)

- [ ] **3.2 Add Grid Settings to BeatDetectionSettings**
  - [ ] Import and render `BeatGridSettings` in existing panel
  - [ ] Add collapsible section with "Grid Interpolation" header
  - [ ] Show "Re-analyze needed" indicator when grid settings change

- [ ] **3.3 Add Grid Mode Tooltips**
  - [ ] Tooltip for each mode explaining behavior:
    - **Detected Only**: Original detected beats, no interpolation
    - **Detected + Interpolated**: Fill gaps with estimated beats
    - **Estimated Grid**: Full grid corrected by detected beats
  - [ ] Tooltip for each approach:
    - **Linear**: Simple interval-based interpolation
    - **Global Tempo**: Grid from global BPM with corrections
    - **Windowed**: Local tempo detection in windows
    - **Auto**: Automatically select best approach

---

## Phase 4: UI Components - Visualization

**Goal**: Update BeatTimeline to show detected vs estimated beats.

### Tasks

- [ ] **4.1 Update BeatTimeline Canvas Rendering**
  - [ ] Modify [src/components/ui/BeatTimeline.tsx](src/components/ui/BeatTimeline.tsx)
  - [ ] Accept new prop: `gridVisualizationData: BeatGridVisualizationData | null`
  - [ ] Render detected beats with solid markers
  - [ ] Render estimated beats with hollow/dashed markers
  - [ ] Use confidence to vary opacity of estimated beats

- [ ] **4.2 Add Tempo Curve Overlay (Optional)**
  - [ ] Draw tempo curve as a subtle background line
  - [ ] Show BPM value at cursor position
  - [ ] Highlight tempo changes

- [ ] **4.3 Add Legend**
  - [ ] Show legend explaining:
    - Solid circle = Detected beat
    - Hollow circle = Estimated beat
    - Opacity = Confidence level

- [ ] **4.4 Update BeatMapSummary**
  - [ ] Add grid statistics to [src/components/ui/BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx):
    - Total beats (detected + estimated)
    - Detected beat count
    - Estimated beat count
    - Average interpolation confidence
    - Tempo stability score

---

## Phase 5: Practice Mode Integration

**Goal**: Allow practice mode to use interpolated beats.

### Tasks

- [ ] **5.1 Add Grid Toggle to Practice View**
  - [ ] Add toggle switch in [src/components/ui/BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx)
  - [ ] Label: "Include estimated beats" or "Use full grid"
  - [ ] Toggle state stored in `showGridVisualization`

- [ ] **5.2 Update BeatStream Usage**
  - [ ] When grid mode is active, pass interpolated beats to BeatStream
  - [ ] Ensure `checkTap()` works with both detected and estimated beats
  - [ ] Show different feedback for hitting detected vs estimated beats

- [ ] **5.3 Update Tap Statistics**
  - [ ] Track separate stats for detected vs estimated beat hits
  - [ ] Show breakdown in TapStats component

---

## Phase 6: Comparison/Debug Mode

**Goal**: Create tools to compare different interpolation approaches.

### Tasks

- [ ] **6.1 Create BeatGridComparisonView Component**
  - [ ] Create [src/components/ui/BeatGridComparisonView.tsx](src/components/ui/BeatGridComparisonView.tsx)
  - [ ] Side-by-side comparison of 3 approaches
  - [ ] Show same section of timeline with different interpolation
  - [ ] Highlight differences

- [ ] **6.2 Add Debug Export**
  - [ ] Add button to export BeatGridResult as JSON
  - [ ] Include all metadata for analysis
  - [ ] Useful for testing and debugging

- [ ] **6.3 Add Approach Recommendation Display**
  - [ ] When using "auto" approach, show which approach was selected
  - [ ] Show why (regularity score, coverage, etc.)

---

## Component Checklist

| Component | File | Changes |
|-----------|------|---------|
| BeatDetectionSettings | [src/components/ui/BeatDetectionSettings.tsx](src/components/ui/BeatDetectionSettings.tsx) | Add BeatGridSettings section |
| BeatGridSettings | [src/components/ui/BeatGridSettings.tsx](src/components/ui/BeatGridSettings.tsx) | **NEW** - Grid mode/approach controls |
| BeatMapSummary | [src/components/ui/BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx) | Add grid statistics |
| BeatTimeline | [src/components/ui/BeatTimeline.tsx](src/components/ui/BeatTimeline.tsx) | Render detected vs estimated |
| BeatPracticeView | [src/components/ui/BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx) | Grid toggle, updated stream |
| BeatGridComparisonView | [src/components/ui/BeatGridComparisonView.tsx](src/components/ui/BeatGridComparisonView.tsx) | **NEW** - Approach comparison |
| beatDetectionStore | [src/store/beatDetectionStore.ts](src/store/beatDetectionStore.ts) | Grid state, actions, selectors |
| types | [src/types/index.ts](src/types/index.ts) | Re-export grid types |

---

## UI Mockup: BeatGridSettings Panel

```
┌─────────────────────────────────────────────────────────┐
│  Grid Interpolation                               [?]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Mode:  ○ Detected Only  ● Detected + Interpolated     │
│         ○ Estimated Grid                                │
│                                                         │
│  Approach:  ○ Linear   ○ Global Tempo                   │
│             ○ Windowed  ● Auto                          │
│                                                         │
│  ┌─ Detected + Interpolated Settings ─────────────────┐ │
│  │                                                     │ │
│  │  Blend Ratio:  ════════════●═════════  0.5         │ │
│  │  (0 = pure detected, 1 = pure estimated)           │ │
│  │                                                     │ │
│  │  Subdivision:  [Quarter ▼]                         │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ☑ Show grid visualization                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## UI Mockup: Updated BeatTimeline

```
Beat Timeline (with grid visualization ON):
────────────────────────────────────────────────────────────
                    │
    ○──○──●──○──○──●──○──○──○──●──○──○──●──○──○
    ▲     ▲        ▲           ▲        ▲
    │     │        │           │        │
  1.2s  1.6s     2.0s        2.4s     2.8s

Legend:
  ● = Detected beat (solid)
  ○ = Estimated beat (hollow, opacity = confidence)
────────────────────────────────────────────────────────────
```

---

## Dependencies

- Beat Grid Interpolation engine implementation (see engine plan)
- Existing beatDetectionStore architecture
- Existing BeatTimeline canvas rendering

---

## Questions/Unknowns

1. **Default Mode**: Should `detected-only` be the default to maintain backward compatibility?

2. **Grid Generation Timing**: Should grid generation happen:
   - Automatically after BeatMap generation?
   - Only when user enables grid mode?
   - Lazy (only when needed for visualization/practice)?

3. **Practice Mode Behavior**: When practicing with interpolated beats:
   - Should tap accuracy be calculated differently for estimated beats?
   - Should we show different visual feedback?

4. **Performance**: For very long tracks with many interpolated beats, should we:
   - Virtualize the timeline rendering?
   - Only render beats in the visible window?

---

## Success Criteria

- [ ] Grid settings panel integrated into BeatDetectionSettings
- [ ] BeatTimeline visually distinguishes detected vs estimated beats
- [ ] Practice mode can optionally include estimated beats
- [ ] All three approaches (linear, global-tempo, windowed) are selectable
- [ ] Grid statistics shown in BeatMapSummary
- [ ] "Re-analyze needed" indicator works for grid settings
- [ ] Smooth UX with no jank when toggling grid visualization
