# Standalone Pitch Analysis — AudioAnalysisTab Upgrade

## Overview

Add a 4th analysis mode ("Pitch") to the existing `AudioAnalysisTab` that uses the new standalone `PitchAnalyzer` from `playlist-data-engine`. This provides full-track pitch detection with contour analysis — no beat map required — complementing the existing Normal, Timeline, and Genre modes.

**Key decisions:**
- Adapt the existing `PitchContourGraph` to accept `PitchResult[]` (frame-level) alongside `PitchAtBeat[]` (beat-aligned)
- Store `PitchAnalysisProfile` in `playlistStore` for cross-tab access
- Include algorithm dropdown, min/max Hz sliders, and contour toggle in the options panel
- Use existing Essentia-based pitch detection algorithms only (no Spotify Basic Pitch)

---

## Phase 1: Types & Store

### Task 1.1: Add pitch analysis types to `src/types/index.ts`
- [x] Re-export `PitchAnalysisProfile`, `PitchContour`, `PitchContourSegment`, `PitchContourSegmentDirection`, `PitchContourDirection`, `PitchAnalyzerConfig` from `playlist-data-engine`
- [x] Re-export `DirectionStats`, `IntervalStats` from `playlist-data-engine` — Already available: these are locally defined in `levelGeneration.ts` and already in the barrel export
- [x] Add these to the barrel export (currently only `PitchResult` is exported at line 1520) — Also added `PitchAnalyzer` class export for use in Task 2.1 hook

### Task 1.2: Add pitch analysis state to `src/store/playlistStore.ts`
- [x] Add `pitchAnalysisProfile: PitchAnalysisProfile | null` to `PlaylistState` interface
- [x] Add `setPitchAnalysisProfile: (profile: PitchAnalysisProfile | null) => void` action
- [x] Initialize `pitchAnalysisProfile: null` in the store
- [x] Clear `pitchAnalysisProfile` in `setPlaylist()` and `selectTrack()` (alongside existing `audioProfile` and `musicClassification` clears)

---

## Phase 2: `usePitchAnalyzer` Hook

### Task 2.1: Create `src/hooks/usePitchAnalyzer.ts`
Follows the `useMusicClassifier` hook pattern. Returns `{ analyze, isAnalyzing, progress, error, retry, options, setOptions }`.

- [x] Define `UsePitchAnalyzerOptions` interface:
  ```ts
  interface UsePitchAnalyzerOptions {
    algorithm?: PitchAlgorithm;      // default 'pitch_melodia'
    minFrequency?: number;            // default 80
    maxFrequency?: number;            // algorithm-dependent
    includeContour?: boolean;         // default true
  }
  ```
- [x] Define `PitchAnalysisError` type (mirrors `ClassificationError` from `useMusicClassifier`):
  ```ts
  type PitchAnalysisErrorType = 'network' | 'audio_decode' | 'model_load' | 'analysis' | 'unknown';
  interface PitchAnalysisError { type: PitchAnalysisErrorType; message: string; technicalMessage?: string; }
  ```
- [x] Implement error classification function `classifyPitchError()` — handle network, decode, Essentia WASM, and generic errors
- [x] Implement the hook:
  - State: `isAnalyzing`, `progress` (0-100), `error`, `options`
  - `analyze(audioUrl, overrideOptions?)` — creates a `new PitchAnalyzer(config)` with `onProgress` callback, calls `.analyze(url)`, stores result in `playlistStore` via `setPitchAnalysisProfile`
  - `retry()` — re-runs last analysis
  - `setOptions()` — update default options
  - Progress callback maps engine `(phase, 0-1)` to UI `(0-100)` percentage
- [x] Reuse existing `PITCH_ALGORITHM_LABELS` from `PitchDetectionPanel.tsx` — extract to a shared location (e.g. `src/constants/pitchAlgorithms.ts`) or import from `PitchDetectionPanel` if acceptable
  - Note: Kept in PitchDetectionPanel.tsx for now; shared extraction deferred to Task 6.3 (Phase 6). The hook itself does not need algorithm labels — it only passes the algorithm string through to the engine.

---

## Phase 3: Adapt `PitchContourGraph` for `PitchResult[]`

### Task 3.1: Refactor `PitchContourGraph` props to accept both data shapes

The graph currently takes `pitchesByBeat: PitchAtBeat[]` and accesses `beat.beatIndex`, `beat.timestamp`, `beat.pitch.midiNote`, `beat.pitch.isVoiced`, `beat.direction`. The `PitchResult` type has: `timestamp`, `frequency`, `probability`, `isVoiced`, `midiNote`, `noteName`.

- [ ] Define a normalized internal type that both data shapes map to:
  ```ts
  // Internal only — not exported
  interface ContourDataPoint {
    time: number;        // timestamp in seconds
    midiNote: number | null;
    isVoiced: boolean;
    direction: 'up' | 'down' | 'stable' | 'none';
    index: number;       // for selection/keying (beatIndex or frame index)
  }
  ```
- [ ] Add a normalization function that converts `PitchAtBeat[]` → `ContourDataPoint[]` (existing behavior, extracts from `beat.pitch` and `beat.direction`)
- [ ] Add a normalization function that converts `PitchResult[]` → `ContourDataPoint[]` (new: computes direction between consecutive voiced frames using MIDI note comparison)
- [ ] Change props to a discriminated union:
  ```ts
  type PitchContourGraphProps =
    | { mode: 'beat'; data: PitchAtBeat[]; onBeatClick?: ...; selectedBeatIndex?: number; }
    | { mode: 'frame'; data: PitchResult[]; onFrameClick?: ...; selectedFrameIndex?: number; }
    & { height?: number; showNoteLabels?: boolean; showYAxisLabels?: boolean; disabled?: boolean; className?: string; smoothTime?: number; isPlaying?: boolean; }
  ```
- [ ] Update `ContourPoint` interface to use `ContourDataPoint` instead of `PitchAtBeat` for the `beat` field (rename to `dataPoint` for clarity)
- [ ] Update `ContourGraphStatic` to accept normalized `ContourDataPoint[]` instead of `PitchAtBeat[]`
- [ ] Update all internal references: `point.beat.beatIndex` → `point.dataPoint.index`, `beat.timestamp` → `dataPoint.time`, `getMidiNote(beat)` → `dataPoint.midiNote`
- [ ] Update point markers: use `point.dataPoint.index` for keys and selection matching
- [ ] Update playhead and click handling to work with both modes

### Task 3.2: Update existing callers
- [ ] Update `PitchLevelTab.tsx` — pass `mode: 'beat'` explicitly (existing `pitchesByBeat` prop maps to `data: PitchAtBeat[]`)
- [ ] Verify no regressions in the existing beat-aligned pitch contour graph

---

## Phase 4: AudioAnalysisTab UI — Options Panel

### Task 4.1: Extend `analysisMode` type
- [ ] Change from `'normal' | 'timeline' | 'genre'` to `'normal' | 'timeline' | 'genre' | 'pitch'`
- [ ] Initialize to `'normal'` (unchanged)

### Task 4.2: Add pitch mode state
- [ ] Add pitch-specific option state:
  ```ts
  const [pitchAlgorithm, setPitchAlgorithm] = useState<PitchAlgorithm>('pitch_melodia');
  const [pitchMinFreq, setPitchMinFreq] = useState(80);
  const [pitchMaxFreq, setPitchMaxFreq] = useState(20000);
  const [pitchIncludeContour, setPitchIncludeContour] = useState(true);
  ```
- [ ] Import `PitchAlgorithm` from `src/types/rhythmGeneration` (already defined locally)

### Task 4.3: Add 4th mode button
- [ ] Add a "Pitch" button to the mode selector radiogroup (between Timeline and Genre, or at the end)
- [ ] Use `Music` icon from lucide-react (already imported in `PitchDetectionPanel`)
- [ ] Label: "Pitch", Description: "Melody detection"
- [ ] Apply same active styling as other mode buttons

### Task 4.4: Add pitch options sub-panel
Shown when `analysisMode === 'pitch'`, following the same pattern as timeline/genre options.

- [ ] **Algorithm selector** — dropdown (`<select>`) with `PITCH_ALGORITHM_LABELS` entries
  - Exclude `multipitch_klapuri` (multi-pitch) — standalone pitch analysis is monophonic
  - When algorithm changes, reset `pitchMaxFreq` to algorithm-appropriate default (1000 for `pyin_legacy`, 20000 for others)
- [ ] **Min frequency slider** — range 20-500 Hz, step 10, default 80
- [ ] **Max frequency slider** — range 500-20000 Hz, step 100, default depends on algorithm
- [ ] **Include contour toggle** — checkbox/toggle, default true
- [ ] Follow existing CSS pattern for options sub-panels (`.audio-analysis-timeline-options`, `.audio-analysis-genre-model-selector`)

### Task 4.5: Update analyze button logic
- [ ] In `handleAnalyze()`, add `analysisMode === 'pitch'` branch:
  - Build `UsePitchAnalyzerOptions` from current state
  - Call `analyze(audioUrl, options)` from `usePitchAnalyzer`
- [ ] Button label: "Analyze Pitch" / "Re-Analyze Pitch" when pitch mode is active
- [ ] No "play audio first" warning for pitch mode (like genre mode — it fetches/decodes internally)
- [ ] Disable button when pitch analysis is running
- [ ] Show progress percentage during analysis

---

## Phase 5: AudioAnalysisTab UI — Results Display

### Task 5.1: Add pitch results section
Show when `analysisMode === 'pitch'` and `pitchAnalysisProfile || isPitchAnalyzing || pitchError` exists. Follows the genre results pattern (own section, separate from normal/timeline results).

- [ ] **Summary stats card** — grid of key metrics from `PitchAnalysisProfile`:
  - Voicing ratio (percentage bar)
  - Average frequency (Hz)
  - Median frequency (Hz)
  - Pitch range (semitones)
  - Lowest note → Highest note
  - Total frames / Voiced frames
  - Analysis metadata: algorithm used, duration analyzed
- [ ] **Contour overview card** (shown when `includeContour: true` and contour exists):
  - Overall direction badge (ascending/descending/stable/mixed)
  - Short/medium/long-term direction indicators (small badges or colored dots)
  - Range: minNote → maxNote (X semitones)
  - Number of contour segments
- [ ] **Note distribution card** — horizontal bar chart from `noteDistribution[]`:
  - Show top 10 notes sorted by count
  - Bar width proportional to percentage
  - Note name label + count + percentage
  - Use existing card/progress bar CSS patterns
- [ ] **Pitch contour graph** — use the adapted `PitchContourGraph` with `mode: 'frame'`:
  - Pass `pitchAnalysisProfile.pitchResults` as `data`
  - Enable audio sync (playhead) using `smoothTime` / `isPlaying` controlled mode
  - Height ~250px for good visibility
- [ ] **Raw JSON dump** — reuse `RawJsonDump` component with `data={pitchAnalysisProfile}`, title "Raw Pitch Analysis Profile JSON"

### Task 5.2: Add loading/error states
- [ ] Loading state: show progress spinner + percentage in the results area (same pattern as genre mode)
- [ ] Error state: show error message with retry button (same pattern as genre mode's `onRetry`)

### Task 5.3: Add CSS styles
- [ ] Add `.audio-analysis-pitch-*` CSS classes following the existing naming convention
- [ ] Style the pitch options sub-panel (sliders, dropdown, toggle)
- [ ] Style the note distribution bars
- [ ] Style the contour overview direction badges
- [ ] Style the summary stats grid

---

## Phase 6: Integration & Cleanup

### Task 6.1: Wire up the hook in AudioAnalysisTab
- [ ] Import and call `usePitchAnalyzer()` in `AudioAnalysisTab`
- [ ] Destructure: `analyze: analyzePitch, isAnalyzing: isPitchAnalyzing, progress: pitchProgress, error: pitchError, retry: retryPitchAnalysis, options: pitchOptions, setOptions: setPitchOptions`
- [ ] Read `pitchAnalysisProfile` from `usePlaylistStore`

### Task 6.2: Clear pitch profile on track change
- [ ] Already handled by `selectTrack()` clearing `pitchAnalysisProfile` in the store (Task 1.2)

### Task 6.3: Extract shared `PITCH_ALGORITHM_LABELS`
- [ ] Move `PITCH_ALGORITHM_LABELS` from `PitchDetectionPanel.tsx` to a shared constant (e.g. `src/constants/pitchAlgorithms.ts`)
- [ ] Import from the shared location in both `PitchDetectionPanel` and `AudioAnalysisTab`
- [ ] Filter out `multipitch_klapuri` for the standalone pitch UI (keep it in `PitchDetectionPanel` if used there)

---

## Dependencies

- `PitchAnalyzer` already exported from `playlist-data-engine` (confirmed in `dist/index.d.ts`)
- `PitchResult`, `PitchAlgorithm` types already available in the showcase
- `PitchContourGraph` exists and works with `PitchAtBeat[]` — needs adaptation for `PitchResult[]`
- No new npm dependencies required

## File Change Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add re-exports for pitch analysis types |
| `src/store/playlistStore.ts` | Add `pitchAnalysisProfile` state + setter |
| `src/hooks/usePitchAnalyzer.ts` | **New file** — hook for pitch analysis |
| `src/constants/pitchAlgorithms.ts` | **New file** — shared algorithm labels |
| `src/components/ui/PitchContourGraph.tsx` | Adapt to accept `PitchResult[]` via discriminated union props |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Add pitch mode, options panel, results section |
| `src/components/Tabs/AudioAnalysisTab.css` | Add pitch-specific styles |
| `src/components/ui/PitchDetectionPanel.tsx` | Import labels from shared constant |

## Questions/Unknowns

None — all decisions have been made. The existing `PitchContourGraph` adaptation is the highest-risk task (Task 3.1) due to the component's complexity and existing callers that must not regress.
