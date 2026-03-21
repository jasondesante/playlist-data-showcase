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
| Difficulty output | Pre-generate all 3 difficulties; switcher just changes view |
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
3. All 3 difficulties generate successfully
4. Results are stored in the beatDetectionStore
5. The auto-continue pipeline triggers correctly

### Task 0.1: Add Level Generation State to Store
- [ ] Add `generatedLevel: GeneratedLevel | null` to beatDetectionStore
- [ ] Add `allDifficultyLevels: AllDifficultiesResult | null` for all 3 difficulties
- [ ] Add `levelGenerationProgress: LevelGenerationProgress | null`
- [ ] Add `pitchAnalysis: MelodyContourAnalysisResult | null`
- [ ] Add `selectedDifficulty: 'easy' | 'medium' | 'hard'` (from Step 1)
- [ ] Add actions: `setGeneratedLevel()`, `clearGeneratedLevel()`, `setLevelGenerationProgress()`, `setSelectedDifficulty()`
- [ ] Reset all level state when track changes
- [ ] Clear level state when switching from auto to manual mode

### Task 0.2: Create useLevelGeneration Hook
- [ ] Create `src/hooks/useLevelGeneration.ts`
- [ ] Import `LevelGenerator` from playlist-data-engine
- [ ] Accept cached `GeneratedRhythm` from store (avoid re-generation)
- [ ] Call `generateAllDifficulties()` to generate all 3 at once
- [ ] Map engine progress phases to UI progress phases
- [ ] Return: `{ generate, isGenerating, progress, error, level, allDifficulties }`
- [ ] Support retry on error

### Task 0.3: Wire Auto-Continue Pipeline
- [ ] In BeatDetectionTab, when rhythm generation completes in auto mode:
  1. Auto-start level generation using cached rhythm
  2. Store results in beatDetectionStore
  3. Auto-advance to Step 3 (Pitch & Level)
- [ ] Ensure pitch detection runs on the same band-filtered audio as rhythm

### Task 0.4: Add Debug Display for Testing
- [ ] Add temporary debug panel in RhythmGenerationTab (or create PitchLevelTab skeleton)
- [ ] Display:
  - "Level Generation Complete!" message
  - `generatedLevel.metadata` (difficulty, controller mode, total beats)
  - `pitchAnalysis.directionStats` (up/down/stable/none counts)
  - `pitchAnalysis.intervalStats` (unison/small/medium/large/very_large counts)
  - `allDifficultyLevels.easy.chart.beats.length`
  - `allDifficultyLevels.medium.chart.beats.length`
  - `allDifficultyLevels.hard.chart.beats.length`
- [ ] This panel is temporary - will be replaced by proper visualizations in later phases

### Task 0.5: Create Level Generation Types
- [ ] Create `src/types/levelGeneration.ts`
- [ ] Re-export from playlist-data-engine:
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
- [ ] Add to `src/types/index.ts`

### Task 0.6: Create Data Contract Validation UI
- [ ] Create `src/components/ui/DataContractValidator.tsx` - validation panel
- [ ] Validate rhythm generation output has all required fields for level generation:
  ```
  Required from GeneratedRhythm:
  - bandStreams.low.beats[] ✓/✗
  - bandStreams.mid.beats[] ✓/✗  
  - bandStreams.high.beats[] ✓/✗
  - composite.stream[] ✓/✗
  - difficultyVariants.easy.stream[] ✓/✗
  - difficultyVariants.medium.stream[] ✓/✗
  - difficultyVariants.hard.stream[] ✓/✗
  - phrases[] ✓/✗
  - metadata.transientsDetected ✓/✗
  ```
- [ ] Validate each beat has required fields:
  ```
  Required from GeneratedBeat:
  - timestamp ✓/✗
  - beatIndex ✓/✗
  - intensity ✓/✗
  - band ✓/✗
  - quantizationError ✓/✗
  ```
- [ ] Color coding: Green ✓ for pass, Red ✗ for fail with explanation
- [ ] Show actual counts/values where helpful (e.g., "low.beats: 234 found")
- [ ] "Ready for Level Generation" message only when all checks pass
- [ ] If validation fails, show specific error: "Missing field X on beats[42]"
- [ ] Export `validateGeneratedRhythm()` function for reuse in testing

### Task 0.7: Integrate Validator into Pipeline
- [ ] Add validator panel to RhythmGenerationTab (shown after rhythm completes)
- [ ] Auto-validate when rhythm generation completes
- [ ] Show validation status in the auto-continue flow:
  - If validation passes → proceed to level generation
  - If validation fails → show error, don't proceed, offer "Retry" or "Debug"
- [ ] Log validation results to console for debugging

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
   - Beat counts for each difficulty (Easy/Medium/Hard)
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
- [ ] Add `generatedLevel: GeneratedLevel | null` to beatDetectionStore
- [ ] Add `allDifficultyLevels: AllDifficultiesResult | null` for all 3 difficulties
- [ ] Add `levelGenerationProgress: LevelGenerationProgress | null`
- [ ] Add `pitchAnalysis: MelodyContourAnalysisResult | null`
- [ ] Add `selectedDifficulty: 'easy' | 'medium' | 'hard'` (from Step 1)
- [ ] Add actions: `setGeneratedLevel()`, `clearGeneratedLevel()`, `setLevelGenerationProgress()`, `setSelectedDifficulty()`
- [ ] Reset all level state when track changes
- [ ] Clear level state when switching from auto to manual mode

### Task 1.2: Update Step Availability Logic for 4-Step Auto Mode
- [ ] Update `useStepsForMode()` hook:
  - Manual: 4 steps (Analyze, Subdivide, Chart, Ready)
  - Automatic: 4 steps (Analyze, Rhythm Generation, Pitch & Level, Ready)
- [ ] Step 3 (Pitch & Level) available when step 2 (Rhythm Generation) complete
- [ ] Step 4 (Ready) available when step 3 complete

### Task 1.3: Create Level Generation Types
- [ ] Create `src/types/levelGeneration.ts`
- [ ] Re-export from playlist-data-engine:
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
- [ ] Integrate with `LevelGenerator` from playlist-data-engine
- [ ] Handle progress callbacks for pipeline stages
- [ ] Pipeline phases: `pitchDetection` → `melodyAnalysis` → `buttonMapping` → `levelAssembly`
- [ ] Return: `{ generate, isGenerating, progress, error, level, allDifficulties }`
- [ ] Use cached rhythm from store to avoid re-generation
- [ ] Support retry on error
- [ ] Call `generateAllDifficulties()` to generate all 3 difficulties at once

### Task 1.5: Extend AutoLevelSettings in Step 1
- [ ] Add controller mode selector (DDR / Guitar Hero) with toggle
- [ ] Add pitch influence weight slider (0.0-1.0, default 0.8)
- [ ] Add voicing threshold slider (0.0-1.0, default 0.5)
- [ ] Add difficulty selector (Easy/Medium/Hard) - determines default level shown
- [ ] Group new settings in collapsible "Level Settings" subsection

---

## Phase 2: Pitch & Level Tab Container

> This is a new separate tab (Step 3 in auto mode) that contains all pitch detection and level generation visualizations.

### Task 2.1: Create PitchLevelTab Container Component
- [ ] Create `src/components/Tabs/PitchLevelTab.tsx` and `PitchLevelTab.css`
- [ ] Handle loading states during level generation (show LevelGenerationProgress)
- [ ] Handle error states with retry button
- [ ] Collapsible sections for each visualization panel
- [ ] No settings panel - all settings are in Step 1
- [ ] Share audio sync state with RhythmGenerationTab
- [ ] Default expanded: Final Level Output panel

### Task 2.2: Create LevelGenerationProgress Component
- [ ] Create `src/components/ui/LevelGenerationProgress.tsx` and `.css`
- [ ] **Two-stage progress display**:
  - Stage 1: "Rhythm Generation ✓" (7 phases, already complete)
  - Stage 2: "Level Generation" (4 phases - current)
- [ ] Phases: `pitchDetection` → `melodyAnalysis` → `buttonMapping` → `levelAssembly`
- [ ] Match RhythmGenerationProgress visual style
- [ ] Show phase timing for completed stages
- [ ] Overall progress bar

### Task 2.3: Update BeatDetectionTab for 4-Step Auto Mode
- [ ] Import PitchLevelTab
- [ ] Conditionally render PitchLevelTab as Step 3 when auto mode is on
- [ ] Update step navigation for 4 steps in auto mode
- [ ] Auto-advance from Step 2 (Rhythm) to Step 3 (Pitch & Level) after rhythm completes

### Task 2.4: Implement Auto-Continue Pipeline
- [ ] When rhythm generation completes, auto-start level generation
- [ ] No additional user clicks needed
- [ ] Progress transitions from rhythm stages to level stages
- [ ] Auto-advance to Step 3 when level generation starts
- [ ] Show two-stage progress in LevelGenerationProgress

---

## Phase 3: Pitch Detection Visualization

> Pitch detection uses the pYIN algorithm (probabilistic YIN with HMM tracking). Each beat timestamp gets analyzed for pitch content.

### Task 3.1: PitchDetectionPanel Component
Container component with:
- [ ] Header showing dominant band selection
- [ ] Summary stats (voiced/unvoiced ratio, avg probability, pitch range)
- [ ] Band breakdown cards (inline subcomponent)
- [ ] **Side panel** for selected pitch details (always visible on right)

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
- [ ] Horizontal timeline with pitches at beat timestamps
- [ ] Y-axis = pitch (frequency or MIDI note number)
- [ ] Color by band (low=blue, mid=green, high=orange)
- [ ] Size/opacity based on probability
- [ ] Unvoiced beats shown as gray gaps
- [ ] Sync with audio playback (playhead)
- [ ] Click to select pitch for inspector

### Task 3.3: BandPitchBreakdown Component (Inline in Panel)
- [ ] Three cards for Low/Mid/High bands
- [ ] Each card displays:
  - Band name and frequency range
  - Voiced beat count
  - Average probability
  - Pitch range (min/max frequency or notes)
  - Most common notes detected
- [ ] Highlight dominant band with ⭐ badge

### Task 3.4: PitchInspector Component (Side Panel)
- [ ] **Fixed side panel** (not tooltip) for selected pitch details
- [ ] Position: Right side of PitchDetectionPanel, always visible
- [ ] Display:
  - Timestamp and beat index
  - Frequency (Hz) and note name (e.g., "C4")
  - Probability/confidence score
  - Is voiced boolean
  - MIDI note number
  - Interval from previous beat (semitones and category)
- [ ] Updates when user clicks different pitches on timeline

### Task 3.5: PitchProbabilityHistogram Component
- [ ] Distribution of pitch probabilities
- [ ] X-axis: probability ranges (0.0-1.0)
- [ ] Y-axis: count of beats
- [ ] Color-code: high (>0.8), medium (0.5-0.8), low (<0.5)
- [ ] Show voicing threshold line

---

## Phase 4: Multi-Band Pitch Analysis

> Pitch detection runs on each frequency band independently. The engine selects the dominant band based on probability scores. Show all 3 bands in stacked view.

### Task 4.1: MultiBandPitchVisualization Component
- [ ] Three stacked timelines (Low/Mid/High) - similar to rhythm multi-band
- [ ] Each shows pitches for that band only
- [ ] Probability shown as opacity
- [ ] Voiced/unvoiced status visible
- [ ] Vertical time alignment
- [ ] Highlight dominant band with border/glow effect
- [ ] Sync with audio playback

### Task 4.2: BandPitchTimeline Component (Inline Reusable)
- [ ] Single band's pitch timeline (reused 3 times)
- [ ] Props: band, pitches, currentTime, isPlaying, isDominant
- [ ] Band color coding
- [ ] Note names on hover
- [ ] Unvoiced markers as gray dots
- [ ] Enhanced styling for dominant band

### Task 4.3: DominantBandSelector Visualization
- [ ] Visual comparison of all bands with scores
- [ ] Show scoring metrics:
  - Average probability (70% weight)
  - Voiced/total ratio (30% weight)
- [ ] Highlight winner with explanation
- [ ] Display as horizontal bar comparison

---

## Phase 5: Melody Contour Visualization

> Melody contour tracks pitch direction (up/down/stable) and intervals between beats for button mapping. Shows BOTH direction timeline and pitch contour line graph.

### Task 5.1: MelodyContourPanel Component
- [ ] Container for contour visualizations
- [ ] Summary stats:
  - Direction distribution (up/down/stable/none %)
  - Interval distribution by category
  - Total segments detected
- [ ] Two visualization views:
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
- [ ] Timeline showing direction at each beat
- [ ] Color-coded arrows:
  - Up (ascending) → green ↑
  - Down (descending) → red ↓
  - Stable → blue ─
  - None (no pitch) → gray ●
- [ ] Size based on interval magnitude
- [ ] Hover shows semitones
- [ ] Sync with audio playback

### Task 5.3: PitchContourGraph Component (NEW)
- [ ] Line graph showing pitch contour over time
- [ ] X-axis = time (seconds)
- [ ] Y-axis = MIDI note number or frequency
- [ ] Line connects consecutive voiced pitches
- [ ] Gaps for unvoiced sections
- [ ] Color gradient by direction (green=up, red=down, blue=stable)
- [ ] Sync with audio playback
- [ ] Show note labels at key points

### Task 5.4: IntervalDistributionChart Component
- [ ] Bar/pie chart for interval categories
- [ ] Categories:
  - Unison (0 semitones)
  - Small (1-2 semitones)
  - Medium (3-4 semitones)
  - Large (5-7 semitones)
  - Very Large (8+ semitones)
- [ ] Show musical interval names (e.g., "Minor 3rd")

### Task 5.5: MelodySegmentTimeline Component
- [ ] Show detected melody segments
- [ ] Consecutive same-direction beats grouped
- [ ] Color by direction
- [ ] Label with note span
- [ ] Sync with audio

### Task 5.6: DirectionStatsSummary Component
- [ ] Card with direction statistics
- [ ] Visual percentage bars
- [ ] Average interval size
- [ ] Largest leap detected

---

## Phase 6: Button Mapping Visualization

> Button mapping converts pitch analysis into DDR/Guitar Hero button assignments. Primary view is a horizontal timeline synced with audio.

### Task 6.1: ButtonMappingPanel Component
- [ ] Container for mapping visualizations
- [ ] Controller mode display (DDR vs Guitar Hero) - determined by Step 1 setting
- [ ] Summary stats:
  - Total beats mapped
  - Pitch-influenced vs pattern-influenced counts
  - Unique keys used
- [ ] Primary visualization: ButtonTimeline (horizontal, synced with audio)

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
- [ ] **Horizontal timeline** showing button at each beat position
- [ ] Color-coded by button (configurable for DDR or Guitar Hero mode)
- [ ] DDR: 4 colors (up=yellow, down=blue, left=purple, right=green)
- [ ] Guitar Hero: 5 colors (1-5 gradient red→blue)
- [ ] Sync with audio playback (playhead)
- [ ] Hover shows mapping decision (pitch vs pattern influenced)
- [ ] Click to see beat details

### Task 6.3: DDRModeVisualization Component (Secondary View)
- [ ] Circular motion representation (optional/expandable)
- [ ] Button sequence as path
- [ ] Clockwise = ascending pitch
- [ ] Counter-clockwise = descending pitch
- [ ] Highlight current beat synced with audio

### Task 6.4: GuitarHeroModeVisualization Component (Secondary View)
- [ ] Fretboard-style visualization (optional/expandable)
- [ ] 5 horizontal lanes (buttons 1-5)
- [ ] Beats appear on timeline
- [ ] Pitch range per fret shown
- [ ] Sync with audio

### Task 6.5: ButtonDistributionChart Component
- [ ] Bar chart of button usage
- [ ] Count and percentage
- [ ] Color-coded to buttons
- [ ] Adapts to DDR (4 bars) or Guitar Hero (5 bars)

### Task 6.6: MappingInfluenceBreakdown Component
- [ ] Pitch vs Pattern influence pie chart
- [ ] Display `pitchInfluenceWeight` setting from Step 1
- [ ] Explain probability threshold effects

### Task 6.7: PatternLibraryUsage Component
- [ ] Show patterns used from library
- [ ] Pattern IDs and usage counts
- [ ] Visual pattern representations

---

## Phase 7: Final Level Output

> Combines everything into a playable ChartedBeatMap. Shows selected difficulty by default with switcher for Easy/Medium/Hard.

### Task 7.1: LevelGenerationPanel Component
- [ ] Container for final output
- [ ] **Compact stats card** with key numbers:
  - Difficulty level
  - Controller mode
  - Total beats
  - Processing time
- [ ] **Difficulty switcher** (Easy | Medium | Hard) - shows selected by default
- [ ] Default expanded panel in PitchLevelTab

```
┌─ Final Level ─────────────────────────────────────────────┐
│ [Easy] [Medium ✓] [Hard]    ← Difficulty Switcher         │
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
- [ ] Three buttons/tabs: Easy | Medium | Hard
- [ ] Shows selected difficulty from Step 1 by default
- [ ] Clicking switches the displayed ChartedBeatMapPreview
- [ ] Updates the compact stats to show selected difficulty's numbers
- [ ] Visual indicator for currently selected

### Task 7.5: DifficultyComparisonForLevel Component (Optional Expandable)
- [ ] Side-by-side Easy/Medium/Hard comparison
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
| `src/components/ui/DifficultySwitcher.tsx` | Easy/Medium/Hard switcher |
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
}
```

---

## Out of Scope

- Export/download generated levels (future)
- Manual edit of generated rhythms
- Custom pattern library UI
- Real-time generation during playback
- Custom pitch detection algorithm configuration
