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

- [x] **1.2 Create Frontend-Specific Types**
  - [x] Add `BeatStreamMode` type:
    ```typescript
    type BeatStreamMode = 'detected' | 'merged';
    ```
  - [x] Add `InterpolationVisualizationData` for timeline:
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

- [x] **2.1 Extend State Interface**
  - [x] Add to [src/store/beatDetectionStore.ts](src/store/beatDetectionStore.ts):
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

- [x] **2.2 Add Interpolation Actions**
  - [x] `setInterpolationOptions(options: Partial<BeatInterpolationOptions>)`
  - [x] `setSelectedAlgorithm(algorithm: InterpolationAlgorithm)`
  - [x] `setBeatStreamMode(mode: BeatStreamMode)`
  - [x] `toggleInterpolationVisualization()`
  - [x] `generateInterpolatedBeatMap()` - calls engine's BeatInterpolator
  - [x] `clearInterpolation()` - resets interpolation state
  - [x] Also updated `clearBeatMap` to reset interpolation state

- [x] **2.3 Add Interpolation Selectors**
  - [x] `useInterpolatedBeatMap()` - returns InterpolatedBeatMap
  - [x] `useInterpolationOptions()` - returns current options
  - [x] `useSelectedAlgorithm()` - returns selected algorithm
  - [x] `useBeatStreamMode()` - returns 'detected' or 'merged'
  - [x] `useInterpolationVisualizationData()` - returns formatted data for timeline
  - [x] `useInterpolationStatistics()` - returns stats for summary display:
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
  - [x] Also added `useShowInterpolationVisualization()` and `useInterpolationState()` convenience selectors

- [x] **2.4 Update generateBeatMap Action**
  - [x] After BeatMap generation, automatically call `generateInterpolatedBeatMap()`
  - [x] Cache InterpolatedBeatMap alongside BeatMap
  - [x] Fire only if `interpolationOptions` differ from last generation
  - [x] Added `InterpolationConfigSnapshot` type and helper functions
  - [x] Added `lastGeneratedInterpolationConfig` and `cachedInterpolatedBeatMaps` to state
  - [x] Updated `clearBeatMap` to reset interpolation config
  - [x] Updated `partialize` to persist interpolation state

- [x] **2.5 Add Re-Analyze Detection**
  - [x] Track `lastGeneratedInterpolationConfig` snapshot
  - [x] Add `useInterpolationSettingsChanged()` selector
  - [x] Add `useNeedsReanalysis()` combined selector for overall re-analyze indicator

---

## Phase 3: UI Components - Interpolation Settings

**Goal**: Create settings panel for interpolation options.

### Tasks

- [x] **3.1 Create BeatInterpolationSettings Component**
  - [x] Create [src/components/ui/BeatInterpolationSettings.tsx](src/components/ui/BeatInterpolationSettings.tsx)
  - [x] Include controls:
    - **Algorithm Selector**: `histogram-grid` | `adaptive-phase-locked` | `dual-pass`
    - **Beat Stream Mode**: `detected` | `merged`
    - **Advanced Options** (collapsible):
      - `minAnchorConfidence` slider (0.0 - 1.0)
      - `gridSnapTolerance` slider (10ms - 100ms)
      - `tempoAdaptationRate` slider (0.0 - 1.0)
      - `anomalyThreshold` slider (0.2 - 0.6)
      - `extrapolateStart` / `extrapolateEnd` toggles

- [x] **3.2 Add Algorithm Descriptions**
  - [x] Add tooltips/info for each algorithm:
    - **Histogram-Based Fixed Grid**: Uses the most common interval as a rigid grid. Best for tracks with very stable tempo.
    - **Adaptive Phase-Locked**: Adjusts tempo slightly at each detected beat anchor. Handles minor tempo drift.
    - **Dual-Pass with Confidence**: Advanced algorithm with KDE peak finding and distributed error correction. Most robust.
  - [x] Show "Recommended" badge on `dual-pass`

- [x] **3.3 Add Mode Descriptions**
  - [x] Tooltip for beat stream mode:
    - **Detected**: Use only originally detected beats (original behavior)
    - **Merged**: Use interpolated beats with detected beats as anchors (fills gaps)

- [x] **3.4 Integrate into BeatDetectionSettings**
  - [x] Add collapsible "Beat Interpolation" section
  - [x] Show after OSE settings
  - [x] Add "Re-analyze needed" indicator when settings change

---

## Phase 4: UI Components - Statistics Display

**Goal**: Show interpolation statistics in BeatMapSummary.

### Tasks

- [x] **4.1 Extend BeatMapSummary Component**
  - [x] Update [src/components/ui/BeatMapSummary.tsx](src/components/ui/BeatMapSummary.tsx)
  - [x] Add interpolation statistics section:
    - Detected beats: X
    - Interpolated beats: X
    - Total beats: X (interpolation ratio: X%)
    - Quarter note BPM: X (confidence: X%)
    - Grid alignment score: X%
    - Tempo drift ratio: X

- [x] **4.2 Add Confidence Indicator**
  - [x] Show visual indicator for interpolation confidence:
    - Green: High confidence (>0.8)
    - Yellow: Medium confidence (0.5-0.8)
    - Red: Low confidence (<0.5)
  - [x] Show breakdown: grid alignment / anchor confidence / pace confidence

- [x] **4.3 Add Quarter Note Detection Info**
  - [x] Show detection method (histogram / kde / tempo-detector-fallback)
  - [x] Show dense section count and beats
  - [x] Show secondary peaks detected (half-note, etc.)

---

## Phase 5: UI Components - Visualization

**Goal**: Visualize detected vs interpolated beats in BeatTimeline.

### Tasks

- [x] **5.1 Update BeatTimeline for Dual-Source Rendering**
  - [x] Modify [src/components/ui/BeatTimeline.tsx](src/components/ui/BeatTimeline.tsx)
  - [x] Accept new prop: `interpolationData: InterpolationVisualizationData | null`
  - [x] Render detected beats with **solid markers**
  - [x] Render interpolated beats with **hollow/dashed markers**
  - [x] Use confidence to vary **opacity** of interpolated beats:
    ```typescript
    const opacity = beat.source === 'detected' ? 1.0 : beat.confidence;
    ```
  - [x] Added `UnifiedBeat` type for dual-source rendering
  - [x] Added CSS styles for interpolated markers (hollow/dashed)
  - [x] Added responsive styles for interpolated markers
  - [x] Integrated interpolation data into BeatPracticeView

- [x] **5.2 Add Visual Legend**
  - [x] Show legend explaining beat types:
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

- [x] **6.1 Add Stream Mode Toggle**
  - [x] Add toggle to [src/components/ui/BeatPracticeView.tsx](src/components/ui/BeatPracticeView.tsx)
  - [x] Label: "Beat Stream" with options:
    - **Detected Only** - Original detected beats
    - **Merged (with interpolation)** - Full grid with detected anchors
  - [x] Toggle updates `beatStreamMode` in store
  - [x] Added CSS styles for stream mode toggle in BeatPracticeView.css
    - [x] Toggle is disabled when interpolated beat map is not available

- [x] **6.2 Update useBeatStream Hook**
  - [x] Modify [src/hooks/useBeatStream.ts](src/hooks/useBeatStream.ts)
  - [x] Accept `InterpolatedBeatMap` as alternative to `BeatMap`
  - [x] Use `detectedBeats` or `mergedBeats` based on `beatStreamMode`
  - [x] Pass `source` field through to beat events (via BeatWithSource type from engine)
  - [x] Updated BeatPracticeView to pass activeBeatMap and beatStreamMode to the hook

- [x] **6.3 Update Beat Event Metadata**
  - [x] Extend `BeatEvent` to include `source: 'detected' | 'interpolated'`
  - [x] Created `ExtendedBeatEvent` type in frontend types
  - [x] Updated `useBeatStream` to extract source from BeatWithSource when available
  - [x] Updated `BeatTimeline` to use `ExtendedBeatEvent` and display source indicator
  - [x] Show source in practice feedback (optional - added indicator in timeline info bar)

- [x] **6.4 Update Tap Statistics**
  - [x] Track separate stats for detected vs interpolated beats
  - [x] Add breakdown to TapStats display:
    - Detected beats hit: X / Y
    - Interpolated beats hit: X / Y
  - [x] Extended `ExtendedButtonPressResult` type with optional `source` field
  - [x] Updated `checkTap` in useBeatStream to extract source from matched beat
  - [x] Extended `useTapStatistics` selector with source breakdown counts
  - [x] Updated TapStats component to display source breakdown when available
  - [x] Added CSS styles for detected (purple) and interpolated (cyan) beat indicators

---

## Phase 7: Algorithm Comparison View

**Goal**: Create tools to compare interpolation algorithms.

### Tasks

- [x] **7.1 Create InterpolationComparisonView Component**
  - [x] Create [src/components/ui/InterpolationComparisonView.tsx](src/components/ui/InterpolationComparisonView.tsx)
  - [x] Side-by-side timeline view of all 3 algorithms
  - [x] Show same time window for each
  - [x] Highlight differences in beat placement
  - [x] Added time navigation slider for scrubbing through the track
  - [x] Added comparison statistics table (total beats, interpolated count, confidence, BPM, drift, alignment)
  - [x] Added algorithm descriptions with color-coded indicators
  - [x] Pure CSS styling (no Tailwind) - created InterpolationComparisonView.css

- [x] **7.2 Add Comparison Statistics Table**
  - [x] Show table comparing algorithms:
    | Algorithm | Total Beats | Interpolated | Avg Confidence | Tempo Drift |
    |-----------|-------------|--------------|----------------|-------------|
    | Histogram | X           | X            | X%             | X           |
    | Adaptive  | X           | X            | X%             | X           |
    | Dual-Pass | X           | X            | X%             | X           |
  - [x] Added in InterpolationComparisonView.tsx lines 386-480
  - [x] Includes: Total Beats, Interpolated (with %), Avg Confidence, Quarter BPM, Tempo Drift, Grid Alignment

- [x] **7.3 Add Debug Export**
  - [x] Button to export `InterpolatedBeatMap` as JSON
  - [x] Include all metadata for offline analysis
  - [x] Useful for research and debugging
  - [x] Added export section with individual algorithm export buttons
  - [x] Added "Export All" button to download all algorithms in one file
  - [x] Export includes: algorithm, timestamps, beats, metadata, gap analysis, quarter note detection

---

## Phase 8: Advanced Options Panel

**Goal**: Expose all interpolation options for power users.

### Tasks

- [x] **8.1 Create AdvancedInterpolationOptions Component**
  - [x] Create [src/components/ui/AdvancedInterpolationOptions.tsx](src/components/ui/AdvancedInterpolationOptions.tsx)
  - [x] Collapsible "Advanced" section in interpolation settings
  - [x] Include all options from `BeatInterpolationOptions`:
    - `minAnchorConfidence` - Minimum confidence to use as anchor
    - `gridSnapTolerance` - Tolerance for snapping detected beats to grid
    - `tempoAdaptationRate` - How much tempo can drift between anchors
    - `anomalyThreshold` - Multiplier for detecting anomalies
    - `denseSectionMinBeats` - Minimum beats to count as dense section
    - `gridAlignmentWeight` / `anchorConfidenceWeight` / `paceConfidenceWeight` - Confidence model weights
    - `extrapolateStart` / `extrapolateEnd` - Whether to extrapolate beyond detected beats
  - [x] Individual reset buttons for each option
  - [x] CSS styling in [src/components/ui/AdvancedInterpolationOptions.css](src/components/ui/AdvancedInterpolationOptions.css)
  - [x] Integrated into BeatInterpolationSettings component

- [x] **8.2 Add Option Presets**
  - [x] Create presets for common use cases:
    - **Default**: Balanced settings for most tracks
    - **Stable Tempo**: Fixed grid, low adaptation (tempoAdaptationRate: 0.1, tighter grid snapping)
    - **Variable Tempo**: High adaptation rate (tempoAdaptationRate: 0.7, more tolerance)
    - **Sparse Detection**: Lower anchor confidence threshold (minAnchorConfidence: 0.15)
    - **Research**: Default settings for experimentation
  - [x] Added `InterpolationPresetId` and `InterpolationPreset` types in [src/types/index.ts](src/types/index.ts)
  - [x] Added `INTERPOLATION_PRESETS` constant with preset definitions
  - [x] Added `getInterpolationPreset()` and `detectInterpolationPreset()` helper functions
  - [x] Added preset selector UI with grid of buttons in AdvancedInterpolationOptions
  - [x] Added preset description display
  - [x] Added CSS styles for preset selector with responsive adjustments

- [x] **8.3 Add Reset to Defaults**
  - [x] Button to reset all interpolation options to defaults
  - [x] "Reset All" button appears when any option differs from defaults
  - [x] Button styled with amber accent color to indicate caution

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
