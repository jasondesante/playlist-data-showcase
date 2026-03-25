# Pitch Detection & Level Generation UI Plan

> **Status**: Ready for Implementation
> **Created**: 2026-03-20
> **Updated**: 2026-03-21
> **Related**: [AUTO_LEVEL_GENERATION_UI_PLAN.md](./AUTO_LEVEL_GENERATION_UI_PLAN.md)

## Overview

This plan extends the automatic level generation feature to include **pitch detection and button mapping**. The complete pipeline becomes:

1. **Beat Detection** (Step 1) - Existing
2. **Rhythm Generation** (Step 2) - Existing
3. **Pitch & Level Generation** (Step 3) - **NEW**
4. **Ready/Practice** (Step 4) - Enhanced with BeatStream

The user still only clicks "Analyze" once - all phases happen automatically in sequence.

---

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Tab structure | Combined flow - user goes straight to Final Level Output after clicking "Analyze" |
| Progress display | Combined progress showing all phases (rhythm + pitch + level) together |
| Controller mode | Configurable toggle in Step 1 settings (DDR or Guitar Hero) |
| Ready/Practice step | Full BeatStream practice mode integration using engine component |
| Settings location | Extend existing AutoLevelSettings panel in Step 1 |
| Multi-band pitch view | 3-band stacked timelines (Low/Mid/High) - all bands visible |
| Button sequence view | Simple horizontal timeline only (no circular/fretboard secondary views) |
| Difficulty output | Pre-generate all 4 difficulties (Natural/Easy/Medium/Hard); switcher just changes view |
| Melody visualization | Both direction timeline (arrows) AND pitch contour line graph (SVG) |
| Pitch inspector | Fixed side panel always visible on the right |
| Final summary | Compact stats card with key numbers |
| Panel order | Pipeline order: Pitch Detection → Multi-Band → Melody Contour → Button Mapping → Final Level |
| ChartedBeatMapPreview | Timeline view only with button colors (no circular/fretboard views) |
| Error handling | Partial success: if pitch fails, proceed with pattern-only mapping |
| PitchContourGraph | SVG rendering for performance |
| BeatStream integration | Use existing BeatStream component from playlist-data-engine |

### Step Flow in Auto Mode

```
Manual Mode:  [Analyze] → [Subdivide] → [Chart] → [Ready]
Auto Mode:    [Analyze] → [Rhythm Generation] → [Pitch & Level] → [Ready]
```

### Pipeline Flow

```
"Analyze" Click
      │
      ▼
┌─────────────────────┐
│ BEAT DETECTION      │
│ (Step 1 - existing) │
└─────────────────────┘
      │
      ▼ (auto)
┌─────────────────────┐
│ RHYTHM GENERATION   │
│ (Step 2 - existing) │
│ • Multi-Band        │
│ • Transients        │
│ • Quantize          │
│ • Phrases           │
│ • Composite         │
│ • Variants          │
└─────────────────────┘
      │
      ▼ (auto - NEW STAGE 1)
┌─────────────────────┐
│ PITCH DETECTION     │
│ (Step 3 - new)      │
│ • Per-band pitch    │
│ • Dominant band     │
└─────────────────────┘
      │
      ▼ (auto)
┌─────────────────────┐
│ MELODY ANALYSIS     │
│ • Directions        │
│ • Intervals         │
│ • Segments          │
└─────────────────────┘
      │
      ▼ (auto)
┌─────────────────────┐
│ BUTTON MAPPING      │
│ • DDR/Guitar Hero   │
│ • Pitch + Patterns  │
│ • Difficulty adjust │
└─────────────────────┘
      │
      ▼ (auto)
┌─────────────────────┐
│ LEVEL ASSEMBLY      │
│ • ChartedBeatMap    │
│ • Metadata          │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ READY / PRACTICE    │
│ (Step 4)            │
│ • BeatStream mode   │
└─────────────────────┘
```

---

## Feature Summary

### What's New

The playlist-data-engine now supports:
- **PitchDetector**: pYIN algorithm for fundamental frequency detection
- **PitchBeatLinker**: Links pitch detection to rhythm beat timestamps
- **MelodyContourAnalyzer**: Analyzes pitch direction and intervals
- **ButtonMapper**: Maps pitch analysis to DDR/Guitar Hero buttons
- **LevelGenerator**: Orchestrates complete level generation

### Key Data Structures

```
PitchResult → PitchAtBeat → MelodyContourAnalysisResult → ButtonMappingMetadata → GeneratedLevel
```

---

## Phase 0: Data Pipeline Handshake (Checkpoint)

> **Goal**: Verify the data flows correctly from rhythm generation to level generation BEFORE building any UI.
> **Stopping Point**: After Phase 0, you can test in the browser and confirm the handshake works.

### What This Phase Accomplishes

This phase creates the **minimum viable data pipeline** to verify:
1. Rhythm generation output → Level generation input (data contract)
2. LevelGenerator can use cached rhythm (no re-generation)
3. All 4 difficulties generate successfully (Natural/Easy/Medium/Hard)
4. Results are stored in the beatDetectionStore
5. The auto-continue pipeline triggers correctly

### Task 0.1: Add Level Generation State to Store
- [x] Add `generatedLevel: GeneratedLevel | null` to beatDetectionStore
- [x] Add `allDifficultyLevels: AllDifficultiesResult | null` for all 4 difficulties (Natural/Easy/Medium/Hard)
- [x] Add `levelGenerationProgress: LevelGenerationProgress | null`
- [x] Add `pitchAnalysis: MelodyContourAnalysisResult | null`
- [x] Add `selectedDifficulty: 'natural' | 'easy' | 'medium' | 'hard'` (from Step 1)
- [x] Add actions: `setGeneratedLevel()`, `clearGeneratedLevel()`, `setLevelGenerationProgress()`, `setSelectedDifficulty()`
- [x] Reset all level state when track changes
- [x] Clear level state when switching from auto to manual mode

### Task 0.2: Create useLevelGeneration Hook
- [x] Create `src/hooks/useLevelGeneration.ts`
- [x] Import `LevelGenerator` from playlist-data-engine
- [x] Accept cached `GeneratedRhythm` from store (avoid re-generation)
- [x] Call `generateAllDifficulties()` to generate all 4 at once
- [x] Map engine progress phases to UI progress phases
- [x] Return: `{ generate, isGenerating, progress, error, level, allDifficulties }`
- [x] Support retry on error

### Task 0.3: Wire Auto-Continue Pipeline
- [x] In BeatDetectionTab, when rhythm generation completes in auto mode:
  1. Auto-start level generation using cached rhythm
  2. Store results in beatDetectionStore
  3. Auto-advance to Step 3 (Ready)
- [x] Ensure pitch detection runs on the same band-filtered audio as rhythm

### Task 0.4: Add Debug Display for Testing
- [x] Add temporary debug panel in RhythmGenerationTab (or create PitchLevelTab skeleton)
- [x] Display:
  - "Level Generation Complete!" message
  - `generatedLevel.metadata` (difficulty, controller mode, total beats)
  - `pitchAnalysis.directionStats` (up/down/stable/none counts)
  - `pitchAnalysis.intervalStats` (unison/small/medium/large/very_large counts)
  - `allDifficultyLevels.easy.chart.beats.length`
  - `allDifficultyLevels.medium.chart.beats.length`
  - `allDifficultyLevels.hard.chart.beats.length`
  - `allDifficultyLevels.natural.chart.beats.length`
- [x] This panel is temporary - will be replaced by proper visualizations in later phases

### Task 0.5: Create Level Generation Types
- [x] Create `src/types/levelGeneration.ts`
- [x] Re-export from playlist-data-engine:
  - `PitchResult`, `PitchDetectorConfig`
  - `PitchAtBeat`, `BandPitchAtBeat`, `LinkedPitchAnalysis`
  - `MelodyContourAnalysisResult`, `MelodyContour`, `MelodySegment`
  - `DirectionStats`, `IntervalStats`, `IntervalCategory`
  - `ButtonMappingConfig`, `ControllerMode`
  - `DDRButton`, `GuitarHeroButton`, `Button`
  - `MappedLevelResult`, `ButtonMappingMetadata`
  - `LevelGenerationOptions`, `LevelMetadata`, `GeneratedLevel`
  - `LevelGenerationProgress`, `ChartedBeat`, `ChartedBeatMap`
  - `AllDifficultiesResult`
- [x] Add to `src/types/index.ts`

### Task 0.6: Create Data Contract Validation UI
- [x] Create `src/components/ui/DataContractValidator.tsx` - validation panel
- [x] Validate rhythm generation output has all required fields for level generation:
  ```
  Required from GeneratedRhythm:
  - bandStreams.low.beats[] ✓/✗
  - bandStreams.mid.beats[] ✓/✗
  - bandStreams.high.beats[] ✓/✗
  - composite.stream[] ✓/✗
  - difficultyVariants.easy.stream[] ✓/✗
  - difficultyVariants.medium.stream[] ✓/✗
  - difficultyVariants.hard.stream[] ✓/✗
  - difficultyVariants.natural.stream[] ✓/✗
  - phrases[] ✓/✗
  - metadata.transientsDetected ✓/✗
  ```
- [x] Validate each beat has required fields:
  ```
  Required from GeneratedBeat:
  - timestamp ✓/✗
  - beatIndex ✓/✗
  - intensity ✓/✗
  - band ✓/✗
  - quantizationError ✓/✗
  ```
- [x] Color coding: Green ✓ for pass, Red ✗ for fail with explanation
- [x] Show actual counts/values where helpful (e.g., "low.beats: 234 found")
- [x] "Ready for Level Generation" message only when all checks pass
- [x] If validation fails, show specific error: "Missing field X on beats[42]"
- [x] Export `validateGeneratedRhythm()` function for reuse in testing

### Task 0.7: Integrate Validator into Pipeline
- [x] Add validator panel to RhythmGenerationTab (shown after rhythm completes)
- [x] Auto-validate when rhythm generation completes
- [x] Show validation status in the auto-continue flow:
  - If validation passes → proceed to level generation
  - If validation fails → show error, don't proceed, offer "Retry" or "Debug"
- [x] Log validation results to console for debugging

### Testing Phase 0

After completing Phase 0, you should be able to:

1. **Start the dev server** and navigate to Beat Detection tab
2. **Toggle Auto mode on** and click "Analyze"
3. **Watch rhythm generation complete** (existing progress UI)
4. **See the Data Contract Validator panel** appear showing:
   - ✅/✗ checks for each required data field
   - Actual counts (e.g., "low.beats: 234 found")
   - Red error messages if anything is missing/wrong
   - Green "Ready for Level Generation" if all checks pass
5. **If validation passes**: Watch level generation start automatically
6. **See the debug panel** showing:
   - "Level Generation Complete!" message
   - Total beats in generated level
   - Direction stats (up/down/stable/none counts)
   - Interval stats (unison/small/medium/large/very_large)
   - Beat counts for each difficulty (Natural/Easy/Medium/Hard)
7. **Inspect Redux/store** to see full data structure

**If Phase 0 works**: The data pipeline is verified. All green checkmarks. Continue to Phase 1+ to build visualizations.

**If Phase 0 shows red ✗**: The validator tells you exactly what's missing. Debug the data contract before building UI.
5. **See the debug panel** showing:
   - Total beats in generated level
   - Direction stats (up/down/stable/none)
   - Interval stats (how many small/medium/large intervals)
   - Beat counts for each difficulty
6. **Inspect Redux/store** to see full data structure

**If Phase 0 works**: The data pipeline is verified. Continue to Phase 1+ to build visualizations.

**If Phase 0 fails**: Debug the data contract between rhythm and level generation before building UI.

---

## Phase 1: Infrastructure & State Management

### Task 1.1: Add Level Generation State to Store
- [x] Add `generatedLevel: GeneratedLevel | null` to beatDetectionStore
- [x] Add `allDifficultyLevels: AllDifficultiesResult | null` for all 4 difficulties (Natural/Easy/Medium/Hard)
- [x] Add `levelGenerationProgress: LevelGenerationProgress | null`
- [x] Add `pitchAnalysis: MelodyContourAnalysisResult | null`
- [x] Add `selectedDifficulty: 'natural' | 'easy' | 'medium' | 'hard'` (from Step 1)
- [x] Add actions: `setGeneratedLevel()`, `clearGeneratedLevel()`, `setLevelGenerationProgress()`, `setSelectedDifficulty()`
- [x] Reset all level state when track changes
- [x] Clear level state when switching from auto to manual mode

### Task 1.2: Update Step Availability Logic for 4-Step Auto Mode
- [x] Update `useStepsForMode()` hook:
  - Manual: 4 steps (Analyze, Subdivide, Chart, Ready)
  - Automatic: 4 steps (Analyze, Rhythm Generation, Pitch & Level, Ready)
- [x] Step 3 (Pitch & Level) available when step 2 (Rhythm Generation) complete
- [x] Step 4 (Ready) available when step 3 complete

### Task 1.3: Create Level Generation Types
- [x] Create `src/types/levelGeneration.ts`
- [x] Re-export from playlist-data-engine:
  - `PitchResult`, `PitchDetectorConfig`
  - `PitchAtBeat`, `BandPitchAtBeat`, `LinkedPitchAnalysis`
  - `MelodyContourAnalysisResult`, `MelodyContour`, `MelodySegment`
  - `DirectionStats`, `IntervalStats`, `IntervalCategory`
  - `ButtonMappingConfig`, `ControllerMode`
  - `DDRButton`, `GuitarHeroButton`, `Button`
  - `MappedLevelResult`, `ButtonMappingMetadata`
  - `LevelGenerationOptions`, `LevelMetadata`, `GeneratedLevel`
  - `LevelGenerationProgress`, `ChartedBeat`, `ChartedBeatMap`
  - `AllDifficultiesResult`

### Task 1.4: Create useLevelGeneration Hook
- [x] Integrate with `LevelGenerator` from playlist-data-engine
- [x] Handle progress callbacks for pipeline stages
- [x] Pipeline phases: `pitchDetection` → `melodyAnalysis` → `buttonMapping` → `levelAssembly`
- [x] Return: `{ generate, isGenerating, progress, error, level, allDifficulties }`
- [x] Use cached rhythm from store to avoid re-generation
- [x] Support retry on error
- [x] Call `generateAllDifficulties()` to generate all 4 difficulties at once

### Task 1.5: Extend AutoLevelSettings in Step 1
- [x] Add controller mode selector (DDR / Guitar Hero) with toggle
- [x] Add pitch influence weight slider (0.0-1.0, default 0.8)
- [x] Add voicing threshold slider (0.0-1.0, default 0.5)
- [x] Add difficulty selector (Natural/Easy/Medium/Hard) - determines default level shown
- [x] Group new settings in collapsible "Level Settings" subsection

---

## Phase 2: Pitch & Level Tab Container

> This is a new separate tab (Step 3 in auto mode) that contains all pitch detection and level generation visualizations.

### Task 2.1: Create PitchLevelTab Container Component
- [x] Create `src/components/Tabs/PitchLevelTab.tsx` and `PitchLevelTab.css`
- [x] Handle loading states during level generation (show LevelGenerationProgress)
- [x] Handle error states with retry button
- [x] Collapsible sections for each visualization panel
- [x] No settings panel - all settings are in Step 1
- [x] Share audio sync state with RhythmGenerationTab
- [x] Default expanded: Final Level Output panel

### Task 2.2: Create LevelGenerationProgress Component
- [x] Create `src/components/ui/LevelGenerationProgress.tsx` and `.css`
- [x] **Two-stage progress display**:
  - Stage 1: "Rhythm Generation ✓" (7 phases, already complete)
  - Stage 2: "Level Generation" (4 phases - current)
- [x] Phases: `pitchDetection` → `melodyAnalysis` → `buttonMapping` → `levelAssembly`
- [x] Match RhythmGenerationProgress visual style
- [x] Show phase timing for completed stages
- [x] Overall progress bar

### Task 2.3: Update BeatDetectionTab for 4-Step Auto Mode
- [x] Import PitchLevelTab
- [x] Conditionally render PitchLevelTab as Step 3 when auto mode is on
- [x] Update step navigation for 4 steps in auto mode
- [x] Auto-advance from Step 2 (Rhythm) to Step 3 (Pitch & Level) after rhythm completes

### Task 2.4: Implement Auto-Continue Pipeline
- [x] When rhythm generation completes, auto-start level generation
- [x] No additional user clicks needed
- [x] Progress transitions from rhythm stages to level stages
- [x] Auto-advance to Step 3 when level generation starts
- [x] Show two-stage progress in LevelGenerationProgress

---

## Phase 3: Pitch Detection Visualization

> Pitch detection uses the pYIN algorithm (probabilistic YIN with HMM tracking). Each beat timestamp gets analyzed for pitch content.

### Task 3.1: PitchDetectionPanel Component
Container component with:
- [x] Header showing dominant band selection
- [x] Summary stats (voiced/unvoiced ratio, avg probability, pitch range)
- [x] Band breakdown cards (inline subcomponent)
- [x] **Side panel** for selected pitch details (always visible on right)

```
┌─ Pitch Detection ──────────────────────────────────────────┐
│ Summary: 847 beats | Dominant: Mid | 73% voiced            │
│                                                            │
│ ┌─ Band Breakdown ─────────────────────────────────────┐  │
│ │ Low (20-500Hz)  Mid (500-2kHz) ⭐  High (2k-20kHz)  │  │
│ │ 234 voiced       618 voiced        156 voiced        │  │
│ │ Avg: 0.62        Avg: 0.78          Avg: 0.45        │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [PitchTimeline showing pitches at beat timestamps]         │
└────────────────────────────────────────────────────────────┘
```

### Task 3.2: PitchTimeline Component
- [x] Horizontal timeline with pitches at beat timestamps
- [x] Y-axis = pitch (frequency or MIDI note number)
- [x] Color by band (low=blue, mid=green, high=orange)
- [x] Size/opacity based on probability
- [x] Unvoiced beats shown as gray gaps
- [x] Sync with audio playback (playhead)
- [x] Click to select pitch for inspector

### Task 3.3: BandPitchBreakdown Component (Inline in Panel)
- [x] Three cards for Low/Mid/High bands
- [x] Each card displays:
  - Band name and frequency range
  - Voiced beat count
  - Average probability
  - Pitch range (min/max frequency or notes)
  - Most common notes detected
- [x] Highlight dominant band with ⭐ badge

### Task 3.4: PitchInspector Component (Side Panel)
- [x] **Fixed side panel** (not tooltip) for selected pitch details
- [x] Position: Right side of PitchDetectionPanel, always visible
- [x] Display:
  - Timestamp and beat index
  - Frequency (Hz) and note name (e.g., "C4")
  - Probability/confidence score
  - Is voiced boolean
  - MIDI note number
  - Interval from previous beat (semitones and category)
- [x] Updates when user clicks different pitches on timeline

### Task 3.5: PitchProbabilityHistogram Component
- [x] Distribution of pitch probabilities
- [x] X-axis: probability ranges (0.0-1.0)
- [x] Y-axis: count of beats
- [x] Color-code: high (>0.8), medium (0.5-0.8), low (<0.5)
- [x] Show voicing threshold line

---

## Phase 4: Multi-Band Pitch Analysis

> Pitch detection runs on each frequency band independently. The engine selects the dominant band based on probability scores. Show all 3 bands in stacked view.

### Task 4.1: MultiBandPitchVisualization Component
- [x] Three stacked timelines (Low/Mid/High) - similar to rhythm multi-band
- [x] Each shows pitches for that band only
- [x] Probability shown as opacity
- [x] Voiced/unvoiced status visible
- [x] Vertical time alignment
- [x] Highlight dominant band with border/glow effect
- [x] Sync with audio playback

### Task 4.2: BandPitchTimeline Component (Inline Reusable)
- [x] Single band's pitch timeline (reused 3 times)
- [x] Props: band, pitches, currentTime, isPlaying, isDominant
- [x] Band color coding
- [x] Note names on hover
- [x] Unvoiced markers as gray dots
- [x] Enhanced styling for dominant band

### Task 4.3: DominantBandSelector Visualization
- [x] Visual comparison of all bands with scores
- [x] Show scoring metrics:
  - Average probability (70% weight)
  - Voiced/total ratio (30% weight)
- [x] Highlight winner with explanation
- [x] Display as horizontal bar comparison

---

## Phase 5: Melody Contour Visualization

> Melody contour tracks pitch direction (up/down/stable) and intervals between beats for button mapping. Shows BOTH direction timeline and pitch contour line graph.

### Task 5.1: MelodyContourPanel Component
- [x] Container for contour visualizations
- [x] Summary stats:
  - Direction distribution (up/down/stable/none %)
  - Interval distribution by category
  - Total segments detected
- [x] Two visualization views:
  - MelodyDirectionTimeline (arrows at beats)
  - PitchContourGraph (line graph of pitch over time)

```
┌─ Melody Contour ──────────────────────────────────────────┐
│ Direction Stats: ↑ 34%  ↓ 28%  ─ 22%  ○ 16%               │
│                                                            │
│ [MelodyDirectionTimeline - arrows at each beat]           │
│                                                            │
│ [PitchContourGraph - line showing pitch contour]          │
│                                                            │
│ ┌─ Interval Distribution ──────────────────────────────┐  │
│ │ Unison: 22%  Small: 45%  Medium: 23%  Large: 8%     │  │
│ │ [bar chart showing distribution]                      │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Task 5.2: MelodyDirectionTimeline Component
- [x] Timeline showing direction at each beat
- [x] Color-coded arrows:
  - Up (ascending) → green ↑
  - Down (descending) → red ↓
  - Stable → blue ─
  - None (no pitch) → gray ●
- [x] Size based on interval magnitude
- [x] Hover shows semitones
- [x] Sync with audio playback

### Task 5.3: PitchContourGraph Component (NEW)
- [x] Line graph showing pitch contour over time
- [x] X-axis = time (seconds)
- [x] Y-axis = MIDI note number or frequency
- [x] Line connects consecutive voiced pitches
- [x] Gaps for unvoiced sections
- [x] Color gradient by direction (green=up, red=down, blue=stable)
- [x] Sync with audio playback
- [x] Show note labels at key points

### Task 5.4: IntervalDistributionChart Component
- [x] Bar/pie chart for interval categories
- [x] Categories:
  - Unison (0 semitones)
  - Small (1-2 semitones)
  - Medium (3-4 semitones)
  - Large (5-7 semitones)
  - Very large (8+ semitones)
- [x] Show musical interval names (e.g., "Minor 3rd")

### Task 5.5: MelodySegmentTimeline Component
- [x] Show detected melody segments
- [x] Consecutive same-direction beats grouped
- [x] Color by direction
- [x] Label with note span
- [x] Sync with audio

### Task 5.6: DirectionStatsSummary Component
- [x] Card with direction statistics
- [x] Visual percentage bars
- [x] Average interval size
- [x] Largest leap detected

---

## Phase 6: Button Mapping Visualization

> Button mapping converts pitch analysis into DDR/Guitar Hero button assignments. Primary view is a horizontal timeline synced with audio.

### Task 6.1: ButtonMappingPanel Component
- [x] Container for mapping visualizations
- [x] Controller mode display (DDR vs Guitar Hero) - determined by Step 1 setting
- [x] Summary stats:
  - Total beats mapped
  - Pitch-influenced vs pattern-influenced counts
  - Unique keys used
- [x] Primary visualization: ButtonTimeline (horizontal, synced with audio)

```
┌─ Button Mapping ──────────────────────────────────────────┐
│ Mode: DDR | Pitch Influence: 80% | Keys: ↑↓←→             │
│ Pitch: 612 beats | Pattern: 235 beats                      │
│                                                            │
│ [ButtonTimeline - horizontal timeline with colored buttons]│
│                                                            │
│ ┌─ Button Distribution ────────────────────────────────┐  │
│ │ ↑ 28%   ↓ 26%   ← 24%   → 22%                        │  │
│ └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Task 6.2: ButtonTimeline Component (Primary View)
- [x] **Horizontal timeline** showing button at each beat position
- [x] Color-coded by button (configurable for DDR or Guitar Hero mode)
- [x] DDR: 4 colors (up=yellow, down=blue, left=purple, right=green)
- [x] Guitar Hero: 5 colors (1-5 gradient red→blue)
- [x] Sync with audio playback (playhead)
- [x] Hover shows mapping decision (pitch vs pattern influenced)
- [x] Click to see beat details

### Task 6.3: DDRModeVisualization Component (Secondary View)
- [x] Circular motion representation (optional/expandable)
- [x] Button sequence as path
- [x] Clockwise = ascending pitch
- [x] Counter-clockwise = descending pitch
- [x] Highlight current beat synced with audio

`

### Task 6.5: ButtonDistributionChart Component
- [x] Bar chart of button usage
- [x] Count and percentage
- [x] Color-coded to buttons
- [x] Adapts to DDR (4 bars) or Guitar Hero (5 bars)

### Task 6.6: MappingInfluenceBreakdown Component
- [x] Pitch vs Pattern influence pie chart
- [x] Display `pitchInfluenceWeight` setting from Step 1
- [x] Explain probability threshold effects

### Task 6.7: PatternLibraryUsage Component
- [ ] Show patterns used from library
- [ ] Pattern IDs and usage counts
- [ ] Visual pattern representations

---

## Phase 7: Final Level Output

> Combines everything into a playable ChartedBeatMap. Shows selected difficulty by default with switcher for Natural/Easy/Medium/Hard.

### Task 7.1: LevelGenerationPanel Component
- [ ] Container for final output
- [ ] **Compact stats card** with key numbers:
  - Difficulty level
  - Controller mode
  - Total beats
  - Processing time
- [ ] **Difficulty switcher** (Natural | Easy | Medium | Hard) - shows selected by default
- [ ] Default expanded panel in PitchLevelTab

```
┌─ Final Level ─────────────────────────────────────────────┐
│ [Natural] [Easy] [Medium ✓] [Hard]    ← Difficulty Switcher  │
│                                                            │
│ ┌─ Compact Stats ──────────────────────────────────────┐  │
│ │ Difficulty: Medium | Controller: DDR | Beats: 847    │  │
│ │ Processing Time: 2.3s                                │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ [ChartedBeatMapPreview - full chart timeline]              │
│                                                            │
│                                [Go to Practice ▶]          │
└────────────────────────────────────────────────────────────┘
```

### Task 7.2: ChartedBeatMapPreview Component
- [ ] Full timeline with all beats
- [ ] Show beat types (detected/interpolated/generated)
- [ ] Downbeat indicators
- [ ] Audio sync with playhead
- [ ] Button colors based on controller mode

### Task 7.3: LevelMetadataSummary Component (Compact)
- [ ] **Compact stats card** - not full breakdown
- [ ] Key numbers only:
  - Difficulty
  - Controller mode
  - Total beats
  - BPM
  - Processing time
- [ ] Detailed metadata is in the other panels (Pitch, Melody, Button)

### Task 7.4: DifficultySwitcher Component
- [ ] Four buttons/tabs: Natural | Easy | Medium | Hard
- [ ] Shows selected difficulty from Step 1 by default
- [ ] Clicking switches the displayed ChartedBeatMapPreview
- [ ] Updates the compact stats to show selected difficulty's numbers
- [ ] Visual indicator for currently selected

### Task 7.5: DifficultyComparisonForLevel Component (Optional Expandable)
- [ ] Side-by-side Natural/Easy/Medium/Hard comparison
- [ ] Button assignment differences
- [ ] Beat count and density per difficulty
- [ ] Collapsible/expandable section

---

## Phase 8: Ready/Practice Step (BeatStream Integration)

> The Ready step now shows the full BeatStream practice mode for the generated level.

### Task 8.1: Update ReadyTab for Auto Mode
- [ ] When in auto mode, show BeatStream practice component
- [ ] Load generated ChartedBeatMap from store
- [ ] Pass selected difficulty level to BeatStream
- [ ] Include difficulty switcher in Ready step too

### Task 8.2: BeatStream Practice Mode Integration
- [ ] Import and render BeatStream component
- [ ] Connect to audio player store for playback sync
- [ ] Pass ChartedBeatMap data
- [ ] Show game controls (start, pause, restart)
- [ ] Display score/accuracy during play

### Task 8.3: Practice Mode Difficulty Switcher
- [ ] Allow switching difficulty during practice
- [ ] Reload BeatStream with new difficulty variant
- [ ] Maintain audio position when switching

---

## Phase 9: Styling

### Task 9.1: Pitch & Level Tab CSS
- [ ] `PitchLevelTab.css` - main tab styles
- [ ] `LevelGenerationProgress.css` - two-stage progress styles

### Task 9.2: Pitch Detection CSS
- [ ] `PitchDetectionPanel.css`
- [ ] `PitchTimeline.css`
- [ ] `PitchInspector.css` - side panel styles
- [ ] `MultiBandPitchVisualization.css`

### Task 9.3: Melody Contour CSS
- [ ] `MelodyContourPanel.css`
- [ ] `MelodyDirectionTimeline.css`
- [ ] `PitchContourGraph.css`
- [ ] `IntervalDistributionChart.css`

### Task 9.4: Button Mapping CSS
- [ ] `ButtonMappingPanel.css`
- [ ] `ButtonTimeline.css`
- [ ] `DDRModeVisualization.css`
- [ ] `GuitarHeroModeVisualization.css`

### Task 9.5: Level Generation CSS
- [ ] `LevelGenerationPanel.css`
- [ ] `ChartedBeatMapPreview.css`
- [ ] `DifficultySwitcher.css`

---

## Color Schemes

### Band Colors (Existing)
| Band | Color | Hex |
|------|-------|-----|
| Low | Blue | `#3b82f6` |
| Mid | Green | `#22c55e` |
| High | Orange | `#f97316` |

### Difficulty Colors
| Difficulty | Color | Hex | Description |
|-----------|-------|-----|-------------|
| Natural | Purple | `#8b5cf6` | Unedited composite stream |
| Easy | Green | `#22c55e` | Simplified for beginners |
| Medium | Amber | `#f59e0b` | Default difficulty |
| Hard | Red | `#ef4444` | Maximum density |

### Pitch Probability Colors
| Probability | Color | Hex |
|-------------|-------|-----|
| High (>0.8) | Green | `#22c55e` |
| Medium (0.5-0.8) | Yellow | `#eab308` |
| Low (<0.5) | Orange | `#f97316` |
| Unvoiced | Gray | `#6b7280` |

### Melody Direction Colors
| Direction | Color | Hex |
|-----------|-------|-----|
| Up | Green | `#22c55e` |
| Down | Red | `#ef4444` |
| Stable | Blue | `#3b82f6` |
| None | Gray | `#6b7280` |

### DDR Button Colors
| Button | Color | Hex |
|--------|-------|-----|
| Up | Yellow | `#eab308` |
| Down | Blue | `#3b82f6` |
| Left | Purple | `#a855f7` |
| Right | Green | `#22c55e` |

### Guitar Hero Button Colors
| Button | Color | Hex |
|--------|-------|-----|
| 1 (lowest) | Red | `#ef4444` |
| 2 | Orange | `#f97316` |
| 3 | Yellow | `#eab308` |
| 4 | Green | `#22c55e` |
| 5 (highest) | Blue | `#3b82f6` |

---

## Files to Create

| File | Description |
|------|-------------|
| `src/types/levelGeneration.ts` | TypeScript interfaces |
| `src/hooks/useLevelGeneration.ts` | Level generation hook |
| `src/components/Tabs/PitchLevelTab.tsx` | Main tab container (Step 3) |
| `src/components/Tabs/PitchLevelTab.css` | Tab styles |
| `src/components/ui/LevelGenerationProgress.tsx` | Two-stage progress indicator |
| `src/components/ui/LevelGenerationProgress.css` | Progress styles |
| `src/components/ui/PitchDetectionPanel.tsx` | Pitch detection container |
| `src/components/ui/PitchDetectionPanel.css` | Styles |
| `src/components/ui/PitchTimeline.tsx` | Pitch timeline |
| `src/components/ui/PitchTimeline.css` | Styles |
| `src/components/ui/PitchInspector.tsx` | Side panel for pitch details |
| `src/components/ui/PitchInspector.css` | Side panel styles |
| `src/components/ui/PitchProbabilityHistogram.tsx` | Probability distribution |
| `src/components/ui/MultiBandPitchVisualization.tsx` | 3-band view |
| `src/components/ui/MultiBandPitchVisualization.css` | Styles |
| `src/components/ui/DominantBandSelector.tsx` | Band selection display |
| `src/components/ui/MelodyContourPanel.tsx` | Melody container |
| `src/components/ui/MelodyContourPanel.css` | Styles |
| `src/components/ui/MelodyDirectionTimeline.tsx` | Direction timeline |
| `src/components/ui/PitchContourGraph.tsx` | Pitch contour line graph |
| `src/components/ui/IntervalDistributionChart.tsx` | Interval chart |
| `src/components/ui/MelodySegmentTimeline.tsx` | Segment regions |
| `src/components/ui/DirectionStatsSummary.tsx` | Direction stats |
| `src/components/ui/ButtonMappingPanel.tsx` | Button mapping container |
| `src/components/ui/ButtonMappingPanel.css` | Styles |
| `src/components/ui/ButtonTimeline.tsx` | Button timeline (primary view) |
| `src/components/ui/ButtonTimeline.css` | Styles |
| `src/components/ui/DDRModeVisualization.tsx` | DDR circular view (secondary) |
| `src/components/ui/GuitarHeroModeVisualization.tsx` | Fretboard view (secondary) |
| `src/components/ui/ButtonDistributionChart.tsx` | Button usage chart |
| `src/components/ui/MappingInfluenceBreakdown.tsx` | Pitch vs pattern |
| `src/components/ui/LevelGenerationPanel.tsx` | Final level container |
| `src/components/ui/LevelGenerationPanel.css` | Styles |
| `src/components/ui/ChartedBeatMapPreview.tsx` | Final chart preview |
| `src/components/ui/DifficultySwitcher.tsx` | Natural/Easy/Medium/Hard switcher |
| `src/components/ui/DifficultySwitcher.css` | Switcher styles |

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/beatDetectionStore.ts` | Add level generation state, selected difficulty, all difficulties |
| `src/components/Tabs/BeatDetectionTab.tsx` | Add PitchLevelTab as Step 3, update step logic |
| `src/components/ui/AutoLevelSettings.tsx` | Add controller mode, pitch influence, voicing threshold, difficulty selector |
| `src/hooks/useStepsForMode.ts` | Update for 4-step auto mode |
| `src/types/index.ts` | Export new types |

---

## Data Types Reference

### PitchResult
```typescript
interface PitchResult {
  timestamp: number;          // When detected (seconds)
  frequency: number;          // Hz (0 if no pitch)
  probability: number;        // Confidence 0-1
  isVoiced: boolean;          // Has detectable pitch
  midiNote: number | null;    // MIDI note (e.g., 69 = A4)
  noteName: string | null;    // Note name (e.g., "C4")
}
```

### PitchAtBeat
```typescript
interface PitchAtBeat {
  beatIndex: number;
  timestamp: number;
  band: 'low' | 'mid' | 'high';
  pitch: PitchResult | null;
  direction: 'up' | 'down' | 'stable' | 'none';
  intervalFromPrevious: number;  // Semitones
  intervalCategory: 'unison' | 'small' | 'medium' | 'large' | 'very_large';
}
```

### MelodyContourAnalysisResult
```typescript
interface MelodyContourAnalysisResult {
  pitchByBeat: PitchAtBeat[];
  bandPitches: Map<string, PitchAtBeat[]>;
  melodyContour: MelodyContour;
  dominantBand: string;
  directionStats: { up: number; down: number; stable: number; none: number };
  intervalStats: { unison: number; small: number; medium: number; large: number; very_large: number };
}
```

### ButtonMappingMetadata
```typescript
interface ButtonMappingMetadata {
  controllerMode: 'ddr' | 'guitar_hero';
  keysUsed: string[];
  pitchInfluencedBeats: number;
  patternInfluencedBeats: number;
  patternsUsed: string[];
}
```

### GeneratedLevel
```typescript
interface GeneratedLevel {
  chart: ChartedBeatMap;
  variant: DifficultyVariant;
  rhythm: GeneratedRhythm;
  pitchAnalysis: MelodyContourAnalysisResult | null;
  metadata: LevelMetadata;
}
```

### AllDifficultiesResult
```typescript
interface AllDifficultiesResult {
  easy: GeneratedLevel;
  medium: GeneratedLevel;
  hard: GeneratedLevel;
  natural?: GeneratedLevel;  // Optional: unedited composite stream
}
```

---

## Out of Scope

- Export/download generated levels (future)
- Manual edit of generated rhythms
- Custom pattern library UI
- Real-time generation during playback
- Custom pitch detection algorithm configuration
