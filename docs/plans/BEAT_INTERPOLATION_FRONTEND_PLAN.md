# Beat Interpolation - Frontend Integration Plan

## Overview

This plan covers the frontend integration for the Beat Interpolation system defined in [beat-interpolation-implementation-plan.md](playlist-data-engine/docs/plans/beat-interpolation-implementation-plan.md). The frontend will expose the interpolation algorithms, allow users to switch between detected and merged beat streams, and visualize the interpolation results.

### Key Concepts from Engine Plan

| Concept | Description |
|---------|-------------|
| **Two Output Streams** | `detectedBeats[]` (original) and `mergedBeats[]` (interpolated + detected override) |
| **Three Algorithms** | Histogram-Based Fixed Grid, Adaptive Phase-Locked, Dual-Pass with Confidence |
| **Dense Section Priority** | Quarter note detection prioritizes intervals from sections with consistent detection |
| **Pace + Anchors** | Pace sets grid spacing, anchors validate and override |
| **Confidence Model** | 50% grid alignment + 30% anchor confidence + 20% pace confidence |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AudioAnalysisTab                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │BeatDetectionSettings│  │BeatMapSummary   │  │ BeatPracticeView │  │
│  │ + Interpolation   │  │+ Interpolation   │  │+ Stream Toggle   │  │
│  │   Settings Panel  │  │  Statistics      │  │+ Confident Viz   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       beatDetectionStore                            │
│  + interpolationOptions    + interpolatedBeatMap                    │
│  + selectedAlgorithm       + beatStreamMode ('detected' | 'merged') │
│  + setInterpolationOptions()                                        │
│  + generateInterpolatedBeatMap()                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    playlist-data-engine                             │
│  BeatMap → BeatInterpolator → InterpolatedBeatMap                   │
│                ↓                                                    │
│     ┌─────────┼─────────┐                                          │
│     ↓         ↓         ↓                                          │
│  Histogram  Adaptive  Dual-Pass                                    │
│     └─────────┼─────────┘                                          │
│               ↓                                                    │
│     detectedBeats[] | mergedBeats[] → BeatStream                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Type Extensions

**Goal**: Import and extend engine types for frontend use.

### Tasks

- [x] **1.1 Import Engine Types**
  - [x] Update [src/types/index.ts](src/types/index.ts):
    ```typescript
    // Re-export from engine
    export type {
      BeatSource,
      BeatWithSource,
      InterpolationAlgorithm,
      BeatInterpolationOptions,
      InterpolatedBeatMap,
      QuarterNoteDetection,
      GapAnalysis,
      InterpolationMetadata,
    } from 'playlist-data-engine';

    // Re-export defaults
    export { DEFAULT_BEAT_INTERPOLATION_OPTIONS } from 'playlist-data-engine';
    ```
  - [x] Also exported BeatInterpolator class and JSON serialization types (BeatWithSourceJSON, InterpolatedBeatMapJSON, etc.)
  - [x] Updated engine's index.ts to export the interpolation types first

- [ ] **1.2 Create Frontend-Specific Types**
  - [ ] Add `BeatStreamMode` type:
    ```typescript
    type BeatStreamMode = 'detected' | 'merged';
    ```
  - [ ] Add `InterpolationVisualizationData` for timeline:
    ```typescript
    interface InterpolationVisualizationData {
      beats: Array<{
        timestamp: number;
        source: 'detected' | 'interpolated';
        confidence: number;
        isDownbeat: boolean;
      }>;
      quarterNoteInterval: number;
      tempoDrift?: Array<{ time: number; bpm: number }>;
    }
    ```

---

## Phase 2: Store Updates

**Goal**: Add interpolation state management to beatDetectionStore.

### Tasks

- [ ] **2.1 Extend State Interface**
  - [ ] Add to [src/store/beatDetectionStore.ts](src/store/beatDetectionStore.ts):
    ```typescript
    interface BeatDetectionState {
      // ... existing state ...

      // Interpolation state
      interpolationOptions: BeatInterpolationOptions;
      interpolatedBeatMap: InterpolatedBeatMap | null;
      selectedAlgorithm: InterpolationAlgorithm;
      beatStreamMode: BeatStreamMode;
      showInterpolationVisualization: boolean;
    }
    ```

- [ ] **2.2 Add Interpolation Actions**
  - [ ] `setInterpolationOptions(options: Partial<BeatInterpolationOptions>)`
  - [ ] `setSelectedAlgorithm(algorithm: InterpolationAlgorithm)`
  - [ ] `setBeatStreamMode(mode: BeatStreamMode)`
  - [ ] `toggleInterpolationVisualization()`
  - [ ] `generateInterpolatedBeatMap()` - calls engine's BeatInterpolator
  - [ ] `clearInterpolation()` - resets interpolation state

- [ ] **2.3 Add Interpolation Selectors**
  - [ ] `useInterpolatedBeatMap()` - returns InterpolatedBeatMap
  - [ ] `useInterpolationOptions()` - returns current options
  - [ ] `useSelectedAlgorithm()` - returns selected algorithm
  - [ ] `useBeatStreamMode()` - returns 'detected' or 'merged'
  - [ ] `useInterpolationVisualizationData()` - returns formatted data for timeline
  - [ ] `useInterpolationStatistics()` - returns stats for summary display:
    ```typescript
    interface InterpolationStatistics {
      detectedBeatCount: number;
      interpolatedBeatCount: number;
      totalBeatCount: number;
      interpolationRatio: number;
      avgInterpolatedConfidence: number;
      quarterNoteBpm: number;
      quarterNoteConfidence: number;
      tempoDriftRatio: number;
      gridAlignmentScore: number;
    }
    ```

- [ ] **2.4 Update generateBeatMap Action**
  - [ ] After BeatMap generation, automatically call `generateInterpolatedBeatMap()`
  - [ ] Cache InterpolatedBeatMap alongside BeatMap
  - [ ] Fire only if `interpolationOptions` differ from last generation

- [ ] **2.5 Add Re-Analyze Detection**
  - [ ] Track `lastGeneratedInterpolationOptions` snapshot
  - [ ] Add `useInterpolationSettingsChanged()` selector
  - [ ] Combine with existing OSE settings changed check

---

## Phase 3: UI Components - Interpolation Settings

**Goal**: Create settings panel for interpolation options.

### Tasks

- [ ] **3.1 Create BeatInterpolationSettings Component**
  - [ ] Create [src/components/ui/BeatInterpolationSettings.tsx](src/components/ui/BeatInterpolationSettings.tsx)
  - [ ] Include controls:
    - **Algorithm Selector**: `histogram-grid` | `adaptive-phase-locked` | `dual-pass`
    - **Beat Stream Mode**: `detected` | `merged`
    - **Advanced Options** (collapsible):
      - `minAnchorConfidence` slider (0.0 - 1.0)
      - `gridSnapTolerance` slider (10ms - 100ms)
      - `tempoAdaptationRate` slider (0.0 - 1.0)
      - `anomalyThreshold` slider (0.2 - 0.6)
      - `extrapolateStart` / `extrapolateEnd` toggles

- [ ] **3.2 Add Algorithm Descriptions**
  - [ ] Add tooltips/info for each algorithm:
    - **Histogram-Based Fixed Grid**: Uses the most common interval as a rigid grid. Best for tracks with very stable tempo.
    - **Adaptive Phase-Locked**: Adjusts tempo slightly at each detected beat anchor. Handles minor tempo drift.
    - **Dual-Pass with Confidence**: Advanced algorithm with KDE peak finding and distributed error correction. Most robust.
  - [ ] Show "Recommended" badge on `dual-pass`

- [ ] **3.3 Add Mode Descriptions**
  - [ ] Tooltip for beat stream mode:
    - **Detected**: Use only originally detected beats (original behavior)
    - **Merged**: Use interpolated beats with detected beats as anchors (fills gaps)

- [ ] **3.4 Integrate into BeatDetectionSettings**
  - [ ] Add collapsible "Beat Interpolation" section
  - [ ] Show after OSE settings
  - [ ] Add "Re-analyze needed" indicator when settings change

---

## Phase 4: UI Components - Statistics Display

**Goal**: Show interpolation statistics in BeatMapSummary.

### Tasks

- [ ] **4.1 Extend BeatMapSummary Component**
  - [ ] Update [src/components/ui/BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx)
  - [ ] Add interpolation statistics section:
    - Detected beats: X
    - Interpolated beats: X
    - Total beats: X (interpolation ratio: X%)
    - Quarter note BPM: X (confidence: X%)
    - Grid alignment score: X%
    - Tempo drift ratio: X

- [ ] **4.2 Add Confidence Indicator**
  - [ ] Show visual indicator for interpolation confidence:
    - Green: High confidence (>0.8)
    - Yellow: Medium confidence (0.5-0.8)
    - Red: Low confidence (<0.5)
  - [ ] Show breakdown: grid alignment / anchor confidence / pace confidence

- [ ] **4.3 Add Quarter Note Detection Info**
  - [ ] Show detection method (histogram / kde / tempo-detector-fallback)
  - [ ] Show dense section count and beats
  - [ ] Show secondary peaks detected (half-note, etc.)

---

## Phase 5: UI Components - Visualization

**Goal**: Visualize detected vs interpolated beats in BeatTimeline.

### Tasks

- [ ] **5.1 Update BeatTimeline for Dual-Source Rendering**
  - [ ] Modify [src/components/ui/BeatTimeline.tsx](src/components/ui/BeatTimeline.tsx)
  - [ ] Accept new prop: `interpolationData: InterpolationVisualizationData | null`
  - [ ] Render detected beats with **solid markers**
  - [ ] Render interpolated beats with **hollow/dashed markers**
  - [ ] Use confidence to vary **opacity** of interpolated beats:
    ```typescript
    const opacity = beat.source === 'detected' ? 1.0 : beat.confidence;
    ```

- [ ] **5.2 Add Visual Legend**
  - [ ] Show legend explaining beat types:
    - ● Solid = Detected beat (from BeatTracker)
    - ○ Hollow = Interpolated beat (from grid)
    - Opacity = Confidence level

- [ ] **5.3 Add Quarter Note Grid Overlay (Optional)**
  - [ ] Draw subtle vertical lines at quarter note intervals
  - [ ] Show grid alignment visually

- [ ] **5.4 Add Tempo Drift Visualization (Optional)**
  - [ ] Draw tempo curve as background line
  - [ ] Highlight sections where tempo drifts

---

## Phase 6: Practice Mode Integration

**Goal**: Allow practice mode to use merged beat stream.

### Tasks

- [ ] **6.1 Add Stream Mode Toggle**
  - [ ] Add toggle to [src/components/ui/BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx)
  - [ ] Label: "Beat Stream" with options:
    - **Detected Only** - Original detected beats
    - **Merged (with interpolation)** - Full grid with detected anchors
  - [ ] Toggle updates `beatStreamMode` in store

- [ ] **6.2 Update useBeatStream Hook**
  - [ ] Modify [src/hooks/useBeatStream.ts](src/hooks/useBeatStream.ts)
  - [ ] Accept `InterpolatedBeatMap` as alternative to `BeatMap`
  - [ ] Use `detectedBeats` or `mergedBeats` based on `beatStreamMode`
  - [ ] Pass `source` field through to beat events

- [ ] **6.3 Update Beat Event Metadata**
  - [ ] Extend `BeatEvent` to include `source: 'detected' | 'interpolated'`
  - [ ] Show source in practice feedback (optional)

- [ ] **6.4 Update Tap Statistics**
  - [ ] Track separate stats for detected vs interpolated beats
  - [ ] Add breakdown to TapStats display:
    - Detected beats hit: X / Y
    - Interpolated beats hit: X / Y

---

## Phase 7: Algorithm Comparison View

**Goal**: Create tools to compare interpolation algorithms.

### Tasks

- [ ] **7.1 Create InterpolationComparisonView Component**
  - [ ] Create [src/components/ui/InterpolationComparisonView.tsx](src/components/ui/InterpolationComparisonView.tsx)
  - [ ] Side-by-side timeline view of all 3 algorithms
  - [ ] Show same time window for each
  - [ ] Highlight differences in beat placement

- [ ] **7.2 Add Comparison Statistics Table**
  - [ ] Show table comparing algorithms:
    | Algorithm | Total Beats | Interpolated | Avg Confidence | Tempo Drift |
    |-----------|-------------|--------------|----------------|-------------|
    | Histogram | X           | X            | X%             | X           |
    | Adaptive  | X           | X            | X%             | X           |
    | Dual-Pass | X           | X            | X%             | X           |

- [ ] **7.3 Add Debug Export**
  - [ ] Button to export `InterpolatedBeatMap` as JSON
  - [ ] Include all metadata for offline analysis
  - [ ] Useful for research and debugging

---

## Phase 8: Advanced Options Panel

**Goal**: Expose all interpolation options for power users.

### Tasks

- [ ] **8.1 Create AdvancedInterpolationOptions Component**
  - [ ] Create [src/components/ui/AdvancedInterpolationOptions.tsx](src/components/ui/AdvancedInterpolationOptions.tsx)
  - [ ] Collapsible "Advanced" section in interpolation settings
  - [ ] Include all options from `BeatInterpolationOptions`:
    - `minAnchorConfidence` - Minimum confidence to use as anchor
    - `gridSnapTolerance` - Tolerance for snapping detected beats to grid
    - `tempoAdaptationRate` - How much tempo can drift between anchors
    - `anomalyThreshold` - Multiplier for detecting anomalies
    - `denseSectionMinBeats` - Minimum beats to count as dense section
    - `gridAlignmentWeight` / `anchorConfidenceWeight` / `paceConfidenceWeight` - Confidence model weights
    - `extrapolateStart` / `extrapolateEnd` - Whether to extrapolate beyond detected beats

- [ ] **8.2 Add Option Presets**
  - [ ] Create presets for common use cases:
    - **Stable Tempo**: Fixed grid, low adaptation
    - **Variable Tempo**: High adaptation rate
    - **Sparse Detection**: Lower anchor confidence threshold
    - **Research**: All options visible for experimentation

- [ ] **8.3 Add Reset to Defaults**
  - [ ] Button to reset all interpolation options to defaults

---

## Component Checklist

| Component | File | Changes |
|-----------|------|---------|
| BeatDetectionSettings | [src/components/ui/BeatDetectionSettings.tsx](src/components/ui/BeatDetectionSettings.tsx) | Add interpolation section |
| BeatInterpolationSettings | [src/components/ui/BeatInterpolationSettings.tsx](src/components/ui/BeatInterpolationSettings.tsx) | **NEW** - Algorithm/mode controls |
| AdvancedInterpolationOptions | [src/components/ui/AdvancedInterpolationOptions.tsx](src/components/ui/AdvancedInterpolationOptions.tsx) | **NEW** - Power user options |
| BeatMapSummary | [src/components/ui/BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx) | Add interpolation statistics |
| BeatTimeline | [src/components/ui/BeatTimeline.tsx](src/components/ui/BeatTimeline.tsx) | Render detected vs interpolated |
| BeatPracticeView | [src/components/ui/BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx) | Stream mode toggle |
| InterpolationComparisonView | [src/components/ui/InterpolationComparisonView.tsx](src/components/ui/InterpolationComparisonView.tsx) | **NEW** - Algorithm comparison |
| beatDetectionStore | [src/store/beatDetectionStore.ts](src/store/beatDetectionStore.ts) | Interpolation state/selectors |
| useBeatStream | [src/hooks/useBeatStream.ts](src/hooks/useBeatStream.ts) | Support merged stream |
| types | [src/types/index.ts](src/types/index.ts) | Import engine types |

---

## UI Mockup: Interpolation Settings Panel

```
┌─────────────────────────────────────────────────────────┐
│  ▼ Beat Interpolation                             [?]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Algorithm:                                            │
│  ○ Histogram-Based Fixed Grid                          │
│  ○ Adaptive Phase-Locked                               │
│  ● Dual-Pass with Confidence  ⭐ Recommended           │
│                                                         │
│  Beat Stream:                                          │
│  ○ Detected Only (original)                            │
│  ● Merged (with interpolation)                         │
│                                                         │
│  ☑ Show interpolation visualization                    │
│                                                         │
│  ┌─ Advanced Options ─────────────────────────────┐    │
│  │                                                 │    │
│  │  Min Anchor Confidence:  ═══●═════════  0.3    │    │
│  │  Grid Snap Tolerance:    ═════●═══════  50ms   │    │
│  │  Tempo Adaptation Rate:  ═══════●═════  0.3    │    │
│  │  Anomaly Threshold:      ═══●═════════  0.4    │    │
│  │                                                 │    │
│  │  ☑ Extrapolate before first beat               │    │
│  │  ☑ Extrapolate after last beat                 │    │
│  │                                                 │    │
│  │  Confidence Weights:                           │    │
│  │  Grid Alignment: 50%  Anchor: 30%  Pace: 20%   │    │
│  │                                                 │    │
│  │  [Reset to Defaults]                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## UI Mockup: Updated BeatMapSummary

```
┌─────────────────────────────────────────────────────────┐
│  Beat Map Summary                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Original Detection:                                    │
│  • Detected BPM: 120                                    │
│  • Detected Beats: 487                                  │
│  • Duration: 4:03                                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Interpolation (Dual-Pass):                             │
│  • Quarter Note BPM: 120 (confidence: 94%)             │
│  • Total Beats: 972                                     │
│    - Detected: 487 (50%)                               │
│    - Interpolated: 485 (50%)                           │
│  • Avg Interpolated Confidence: 87%                     │
│  • Grid Alignment Score: 96%                            │
│  • Tempo Drift Ratio: 1.02                              │
│                                                         │
│  Confidence Breakdown:                                  │
│  ████████████████████░░░░░ Grid Alignment (50%)        │
│  ████████████████░░░░░░░░░ Anchor Confidence (30%)     │
│  ████████████░░░░░░░░░░░░░░ Pace Confidence (20%)      │
│                                                         │
│  [Start Practice]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## UI Mockup: BeatTimeline with Interpolation

```
Beat Timeline (Interpolation ON, Merged Stream):
────────────────────────────────────────────────────────────
     Detected Beats: ●──●──●──●──●──●──●──●──●──●
     
     Merged Stream:  ●──○──●──○──●──○──●──○──●──○
                     ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲  ▲
                   1.0 1.5 2.0 2.5 3.0 3.5 4.0 4.5 5.0

Legend:
  ● Solid = Detected beat (from BeatTracker)
  ○ Hollow = Interpolated beat (from grid)
  Opacity = Confidence level
────────────────────────────────────────────────────────────
```

---

## UI Mockup: Practice Mode Stream Toggle

```
┌─────────────────────────────────────────────────────────┐
│  Practice Mode                                    [Exit]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Beat Stream: [Detected Only ▼]                        │
│               ┌─────────────────────┐                  │
│               │ ● Detected Only     │                  │
│               │ ○ Merged (w/ interp)│                  │
│               └─────────────────────┘                  │
│                                                         │
│  Current: Detected beats only                          │
│  Interpolated beats will not appear                    │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [Beat Timeline Visualization]                         │
│                                                         │
│  [TAP AREA]                                            │
│                                                         │
│  Tap Stats: Perfect: 12  Great: 5  Good: 2  Miss: 1   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Dependencies

- Beat Interpolation engine implementation (see engine plan)
- Existing beatDetectionStore architecture
- Existing BeatTimeline canvas rendering
- Existing useBeatStream hook

---

## Questions/Unknowns

1. **Auto-Generate Interpolation**: Should interpolation run automatically after BeatMap generation, or require explicit button press?

2. **Default Algorithm**: Should `dual-pass` be the default (most robust) or `histogram-grid` (simplest)?

3. **Default Stream Mode**: Should practice mode default to `detected` (backward compatible) or `merged`?

4. **Performance**: For very long tracks with 1000+ interpolated beats, should we virtualize timeline rendering?

5. **Confidence Threshold**: Should we allow filtering out low-confidence interpolated beats?

---

## Success Criteria

- [ ] Interpolation settings panel integrated into BeatDetectionSettings
- [ ] All 3 algorithms selectable with clear descriptions
- [ ] BeatTimeline visually distinguishes detected vs interpolated beats
- [ ] Practice mode can switch between detected and merged streams
- [ ] Interpolation statistics shown in BeatMapSummary
- [ ] Confidence breakdown displayed (grid/anchor/pace)
- [ ] "Re-analyze needed" indicator works for interpolation settings
- [ ] Advanced options accessible for power users
- [ ] Algorithm comparison view available for research
