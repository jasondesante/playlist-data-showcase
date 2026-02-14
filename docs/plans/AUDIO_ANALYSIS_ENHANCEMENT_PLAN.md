# AudioAnalysisTab Enhancement Plan

**Goal**: Enhance the AudioAnalysisTab with RMS Energy/Dynamic Range display, timeline analysis mode, and an interactive radar chart visualization with audio sync.

---

## Phase 1: Quick Win - RMS Energy & Dynamic Range Display

**Goal**: Display the existing `rms_energy` and `dynamic_range` data from AudioProfile that are not currently shown in the UI.

### Tasks

- [x] Add new "Energy Metrics" card in AudioAnalysisTab.tsx after the Average Amplitude card
- [x] Create CSS styles for the energy metrics grid layout
- [x] Handle optional fields gracefully with undefined checks

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tabs/AudioAnalysisTab.tsx` | Add Energy Metrics card component |
| `src/components/Tabs/AudioAnalysisTab.css` | Add `.audio-analysis-energy-grid` and related styles |

---

## Phase 2: Hook Enhancement - Expose Timeline Analysis

**Goal**: Add `analyzeTimeline` functionality to the `useAudioAnalyzer` hook to support the new timeline analysis mode.

### Tasks

- [x] Import `AudioTimelineEvent` and `SamplingStrategy` types from playlist-data-engine
- [x] Add `timelineData` state array to store timeline events
- [x] Add `isTimelineAnalyzing` state for loading indicator
- [x] Implement `analyzeTimeline` method that calls `analyzer.analyzeTimeline()`
- [x] Update hook return object to expose new method and state
- [x] Export new types from `src/types/index.ts`

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAudioAnalyzer.ts` | Add `analyzeTimeline`, `timelineData`, `isTimelineAnalyzing` |
| `src/types/index.ts` | Export `AudioTimelineEvent`, `SamplingStrategy` |

---

## Phase 3: Analysis Mode Selector UI

**Goal**: Create UI for selecting between Normal (3 samples) and Timeline (full analysis) modes.

### Tasks

- [x] Add state variables: `analysisMode`, `timelineMode`, `timelineCount`, `timelineInterval`
- [x] Create mode selector buttons (Normal vs Timeline)
- [x] Create timeline options sub-component with count/interval toggle
- [ ] Add slider for count mode (5-100 data points)
- [ ] Add slider for interval mode (1-10 seconds)
- [ ] Update `handleAnalyze` function to use selected mode
- [ ] Style selector to match existing EQ slider patterns

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tabs/AudioAnalysisTab.tsx` | Add mode selector state and UI |
| `src/components/Tabs/AudioAnalysisTab.css` | Add `.audio-analysis-mode-card`, `.audio-analysis-timeline-options` styles |

---

## Phase 4: Radar Chart Component

**Goal**: Create a Canvas-based radar/spider chart component that morphs between data points.

### Tasks

- [ ] Create `src/components/ui/RadarChart.tsx` component
- [ ] Implement Canvas drawing for radar chart with 4 axes (Bass, Mid, Treble, Energy)
- [ ] Add background circles and axis lines
- [ ] Implement data polygon with gradient fill
- [ ] Add colored data points at each axis
- [ ] Implement smooth morphing animation between data points using `requestAnimationFrame`
- [ ] Handle empty state and edge cases
- [ ] Create `src/components/ui/RadarChart.css` for container styles

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/RadarChart.tsx` | Canvas-based radar/spider chart |
| `src/components/ui/RadarChart.css` | Radar chart styles |

### Reference Pattern

- Use `MotionGraph.tsx` as reference for Canvas implementation with `useRef`

---

## Phase 5: Timeline Scrubber Component

**Goal**: Create an interactive timeline scrubber with context window visualization and audio sync toggle.

### Tasks

- [ ] Create `src/components/ui/TimelineScrubber.tsx` component
- [ ] Implement track container with waveform bar visualization
- [ ] Add playhead indicator with drag handle
- [ ] Implement mouse drag interaction for scrubbing
- [ ] Implement touch drag interaction for mobile
- [ ] Add context window highlighting (surrounding points)
- [ ] Display current time and total duration
- [ ] Add point counter (e.g., "Point 15 of 50")
- [ ] Add audio sync toggle button
- [ ] Implement auto-follow when audio sync is enabled
- [ ] Create `src/components/ui/TimelineScrubber.css` for styles

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/TimelineScrubber.tsx` | Interactive timeline scrubber |
| `src/components/ui/TimelineScrubber.css` | Scrubber styles |

---

## Phase 6: Integration into AudioAnalysisTab

**Goal**: Wire all components together in the AudioAnalysisTab.

### Tasks

- [ ] Import RadarChart and TimelineScrubber components
- [ ] Add state: `selectedTimelineIndex`, `audioSyncEnabled`
- [ ] Get audio player state from `useAudioPlayerStore` (currentTime, playbackState)
- [ ] Add conditional rendering for Timeline Visualization card (only when `analysisMode === 'timeline' && timelineData.length > 0`)
- [ ] Create two-column layout: Radar chart on left, Scrubber on right
- [ ] Add live metric values below radar chart
- [ ] Connect scrubber `onSelectionChange` to update `selectedTimelineIndex`
- [ ] Connect radar chart to display data at `selectedTimelineIndex`
- [ ] Add responsive styles (stack on mobile)

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Tabs/AudioAnalysisTab.tsx` | Integrate timeline visualization components |
| `src/components/Tabs/AudioAnalysisTab.css` | Add `.audio-analysis-timeline-viz-layout` styles |

---

## Phase 7: Audio Sync Integration

**Goal**: Enable the timeline scrubber to sync with and control audio playback.

### Tasks

- [ ] Add `onSeek` prop to TimelineScrubber interface
- [ ] Update handleInteraction to call onSeek when audio sync is enabled
- [ ] Pass seek function from audioPlayerStore to TimelineScrubber
- [ ] Update playhead position in real-time during playback
- [ ] Handle edge cases (seeking beyond available data, paused state)

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/TimelineScrubber.tsx` | Add seek functionality |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Pass seek handler to scrubber |

---

## Implementation Order

1. **Phase 1** - Quick win, immediate value
2. **Phase 2** - Required for timeline analysis
3. **Phase 3** - UI foundation
4. **Phase 4** - Can be developed in parallel with Phase 5
5. **Phase 5** - Can be developed in parallel with Phase 4
6. **Phase 6** - Integration
7. **Phase 7** - Polish

---

## Verification

### Manual Testing

1. **RMS Energy/Dynamic Range**:
   - [ ] Analyze a track and verify Energy Metrics card appears
   - [ ] Confirm values display correctly (not undefined)

2. **Analysis Mode Selector**:
   - [ ] Switch between Normal and Timeline modes
   - [ ] Toggle between Count and Interval options
   - [ ] Adjust sliders and verify values update

3. **Timeline Analysis**:
   - [ ] Run timeline analysis with count mode (e.g., 20 points)
   - [ ] Run timeline analysis with interval mode (e.g., 2 seconds)
   - [ ] Verify timeline data is generated

4. **Radar Chart**:
   - [ ] Verify radar chart renders with correct data
   - [ ] Scrub through timeline and watch chart morph
   - [ ] Check colors match (blue=bass, green=mid, orange=treble)

5. **Timeline Scrubber**:
   - [ ] Drag scrubber to different positions
   - [ ] Verify time display updates
   - [ ] Verify point counter updates
   - [ ] Check context window highlighting

6. **Audio Sync**:
   - [ ] Enable audio sync toggle
   - [ ] Play audio and verify scrubber follows
   - [ ] Click on timeline and verify audio seeks
   - [ ] Disable sync and verify independent control

---

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useAudioAnalyzer.ts` | Modify - Add timeline analysis |
| `src/types/index.ts` | Modify - Export new types |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Modify - Major integration |
| `src/components/Tabs/AudioAnalysisTab.css` | Modify - Add new styles |
| `src/components/ui/RadarChart.tsx` | Create - New component |
| `src/components/ui/RadarChart.css` | Create - New styles |
| `src/components/ui/TimelineScrubber.tsx` | Create - New component |
| `src/components/ui/TimelineScrubber.css` | Create - New styles |
