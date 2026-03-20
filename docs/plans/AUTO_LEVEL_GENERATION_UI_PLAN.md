# Automatic Level Generation UI

## Overview

Implement a debug/learning UI for the automatic rhythm generation feature in the playlist-data-engine. This experimental feature allows users to visualize and understand how the procedural rhythm generation system works by displaying transient detection, multi-band analysis, quantized rhythms, and difficulty variants.

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Default mode | Manual mode (user must toggle to enable automatic) |
| Toggle style | Simple toggle switch with "Auto" label and beta badge |
| Toggle location | In Step 1 (Analyze) header area |
| Settings location | In Step 1 (Analyze) as expandable section when auto mode is on |
| Auto-start behavior | Clicking "Analyze" in auto mode runs beat detection AND rhythm generation automatically |
| Step 2 purpose | Pure visualization - no settings, just show cool UI for results |
| Audio sync | Yes - visualizations sync with audio playback like existing timelines |
| Timeline style | Match existing BeatTimeline/SubdivisionTimeline patterns |
| Rendering approach | DOM elements (matches existing patterns, may need virtualization for 500+ transients) |
| Persistence | Session-only (no localStorage for generated rhythms) |
| Mode persistence | Always start in manual mode (don't persist toggle state) |
| Ready step | Same as manual mode - generated rhythm populates chart data |
| Mode switch behavior | When switching from auto to manual: keep beat map, go to Subdivide step |
| Export | Not in first pass - add after core functionality is stable |
| Band colors | Default: Low (blue), Mid (green), High (orange) |
| Progress UI | Pipeline stages with status indicators (Multi-Band → Transients → Quantize → Phrases → Composite → Variants) |
| Difficulty view | Side-by-side comparison of all 3 difficulties (Easy/Medium/Hard) |
| Error handling | Show error message with retry button |
| Phrase UI | List of detected phrases with click-to-highlight on timeline |
| Step count in auto mode | 3 steps (Analyze → Rhythm Generation → Ready) |

---

## Current State

The `BeatDetectionTab` uses a 4-step wizard UI:
1. **Analyze** - Beat detection with settings
2. **Subdivide** - Manual subdivision patterns
3. **Chart** - Key assignment for rhythm game
4. **Ready** - Practice mode and export

## Target State

When "Automatic Level Generation" is toggled on:
- Reduce step count from 4 to 3
- Replace "Subdivide" and "Chart" tabs with "Rhythm Generation"
- New tab contains debug/learning visualizations:
  - Transient detection results
  - Multi-band analysis (3 frequency bands)
  - Quantized rhythms with grid decisions
  - Difficulty variants (Easy/Medium/Hard)
  - Phrase detection patterns

```
Manual Mode:  [Analyze] → [Subdivide] → [Chart] → [Ready]
Auto Mode:    [Analyze] → [Rhythm Generation] → [Ready]
```

### User Flow in Auto Mode

1. User toggles "Auto" on in Step 1 (Analyze)
2. AutoLevelSettings panel appears with rhythm generation options
3. User adjusts settings if desired (preset, difficulty, etc.)
4. User clicks "Analyze Beats" button
5. Beat detection runs (quarter notes)
6. **Automatic transition**: UI advances to Step 2 (Rhythm Generation)
7. **Automatic start**: Rhythm generation begins immediately
8. Pipeline progress shown: Multi-Band → Transients → Quantize → Phrases → Composite → Variants
9. On completion: Visualizations appear (transients, bands, quantization, difficulties, phrases)
10. User can proceed to Step 3 (Ready) for practice mode

### Mode Switch Behavior

| From | To | Behavior |
|------|-----|----------|
| Manual | Auto | Clear generated rhythm (if any), show auto settings |
| Auto | Manual | Keep beat map, clear generated rhythm, navigate to Step 2 (Subdivide) |

---

## Data Structures (Reference)

### TransientResult
```typescript
interface TransientResult {
  timestamp: number;          // When the transient occurred (seconds)
  intensity: number;          // Strength (0.0 - 1.0)
  band: 'low' | 'mid' | 'high';
  detectionMethod: 'energy' | 'spectral_flux' | 'hfc';
  nearestBeat?: { index: number; distance: number; };
}
```

### GeneratedBeat
```typescript
interface GeneratedBeat {
  timestamp: number;           // Quantized time (seconds)
  beatIndex: number;           // Which quarter note this belongs to
  gridPosition: number;        // Position within beat (0-3 for 16th, 0-2 for triplet)
  gridType: 'straight_16th' | 'triplet_8th';
  intensity: number;           // Transient strength (0.0 - 1.0)
  band: 'low' | 'mid' | 'high';
  quantizationError?: number;  // How far it was moved (ms)
}
```

### GeneratedRhythm
```typescript
interface GeneratedRhythm {
  bandStreams: { low: BandStream; mid: BandStream; high: BandStream; };
  composite: CompositeStream;
  difficultyVariants: { easy: DifficultyVariant; medium: DifficultyVariant; hard: DifficultyVariant; };
  phrases: RhythmicPhrase[];
  metadata: {
    transientsDetected: number;
    transientsFilteredByIntensity: number;
    phrasesDetected: number;
    naturalDifficulty: 'easy' | 'medium' | 'hard';
    processingTimeMs: number;
  };
}
```

---

## Phase 1: Core Infrastructure

- [x] **Task 1.1: Add generation mode state to beatDetectionStore**
  - [x] Add `generationMode: 'manual' | 'automatic'` to store state (default: 'manual')
  - [x] Add `setGenerationMode(mode)` action
  - [x] Add `generatedRhythm: GeneratedRhythm | null` state (session-only, not persisted)
  - [x] Add `rhythmGenerationProgress: RhythmGenerationProgress | null` state
  - [x] Add actions: `setGeneratedRhythm()`, `clearGeneratedRhythm()`, `setRhythmGenerationProgress()`
  - [x] Reset generatedRhythm when track changes
  - [x] When switching from auto to manual mode: keep beatMap, clear generatedRhythm
  - [x] Do NOT persist generationMode to localStorage (always start in manual)

- [x] **Task 1.2: Update step availability logic for auto mode**
  - [x] Create `useStepsForMode()` hook - returns different step configs based on mode
    - Manual: 4 steps (Analyze, Subdivide, Chart, Ready)
    - Automatic: 3 steps (Analyze, Rhythm Generation, Ready)
  - [x] Update `useStepAvailability()` to respect mode
  - [x] Step 2 (Rhythm Generation) available when step 1 complete
  - [x] Step 3 (Ready) available when step 1 complete
  - [x] When switching from auto to manual: navigate to Step 2 (Subdivide)

- [x] **Task 1.3: Create useRhythmGeneration hook**
  - [x] Integrate with `AudioAnalyzer.generateRhythm()` from playlist-data-engine
  - [x] Handle progress callbacks for pipeline stages
  - [x] Return: `{ generate, isGenerating, progress, error, rhythm }`
  - [x] Progress phases: multiBand → transients → quantize → phrases → composite → variants
  - [x] Support retry on error

- [x] **Task 1.4: Create rhythm generation types**
  - [x] Create `src/types/rhythmGeneration.ts`
  - [x] Export all rhythm generation interfaces
  - [x] Add to `src/types/index.ts`

---

## Phase 2: Mode Toggle UI

- [x] **Task 2.1: Create AutoLevelToggle component**
  - [x] Simple toggle switch with "Auto" label
  - [x] "Beta" badge next to label
  - [x] Tooltip explaining the feature
  - [x] Position in Step 1 (Analyze) header area, near the Analyze button
  - [x] Does NOT persist preference (always start in manual mode)

- [x] **Task 2.2: Create AutoLevelSettings component**
  - [x] Collapsible/expandable section that appears when auto mode is toggled ON
  - [x] Position: Below the toggle, within Step 1 (Analyze)
  - [x] Preset dropdown (casual, standard, challenge, bass)
  - [x] Difficulty selector (Easy/Medium/Hard)
  - [x] Output mode selector (Composite/Low/Mid/High)
  - [x] Intensity threshold slider (0.0-1.0, default 0.2)
  - [x] Collapsible "Advanced Options" within this panel

- [x] **Task 2.3: Update BeatDetectionTab for dual mode**
  - [x] Import AutoLevelToggle and AutoLevelSettings
  - [x] Get generationMode from store
  - [x] When auto mode is on, show AutoLevelSettings in Step 1
  - [x] Pass mode-aware steps to StepNav
  - [x] Conditionally render step content based on mode

- [x] **Task 2.4: Update StepNav for dynamic step count**
  - [x] Accept steps array as prop (already does)
  - [x] Handle 3-step vs 4-step configurations gracefully
  - [x] Animate step changes when mode toggles

- [x] **Task 2.5: Implement auto-start behavior**
  - [x] When auto mode is on and user clicks "Analyze":
    1. Run beat detection (quarter notes)
    2. Auto-advance to Step 2 (Rhythm Generation)
    3. Automatically start rhythm generation using settings from Step 1
  - [x] No additional button clicks needed in auto mode
  - [x] Show progress UI during rhythm generation
  - [x] Show error state with retry option if rhythm generation fails
  - [x] Show completion state with generated rhythm metadata

---

## Phase 3: Rhythm Generation Tab (Visualization Only)

> **Note:** This step is purely for visualization. All settings are in Step 1 (Analyze).
> When auto mode is on, rhythm generation starts automatically after beat detection.

- [x] **Task 3.1: Create RhythmGenerationTab container**
  - [x] Main tab component that orchestrates all visualization panels
  - [x] Handle loading states during generation (show pipeline progress)
  - [x] Handle error states with retry button
  - [x] Collapsible sections for each visualization panel
  - [x] No settings panel - settings are in Step 1

- [x] **Task 3.2: Create RhythmGenerationProgress component**
  - [x] Create `src/components/ui/RhythmGenerationProgress.tsx` standalone component file
  - [x] Create `src/components/ui/RhythmGenerationProgress.css` for styles
  - [x] Add phase timing tracking to show duration for completed stages
  - [x] Overall progress bar
  - [x] Match style of existing beat detection progress
  - [x] Integrate component into RhythmGenerationTab to replacing inline progress UI

- [x] **Task 3.3: Create error handling UI**
  - [x] Show error message if rhythm generation fails
  - [x] "Retry" button to re-attempt generation
  - [x] "Switch to Manual" button as fallback option

---

## Phase 4: Transient Detection Visualization

- [ ] **Task 4.1: Create TransientDetectionPanel component**
  - [ ] Container for transient visualizations
  - [ ] Header with total transient count
  - [ ] Intensity filter slider (filters displayed transients)
  - [ ] "Show all bands" toggle

- [ ] **Task 4.2: Create TransientTimeline component**
  - [ ] Horizontal timeline similar to existing BeatTimeline
  - [ ] Sync with audio playback (currentTime prop)
  - [ ] Transients rendered as colored dots (by band)
  - [ ] Size based on intensity
  - [ ] Zoomable/scrollable (match existing timeline behavior)
  - [ ] Click to inspect individual transient details
  - [ ] Show playhead position synced with audio

- [ ] **Task 4.3: Create TransientBandBreakdown component**
  - [ ] Three cards in a row for Low/Mid/High bands
  - [ ] Each card shows:
    - Band name and frequency range
    - Transient count
    - Average intensity
    - Detection method badge (Energy/Flux/HFC)
    - Color indicator matching timeline

- [ ] **Task 4.4: Create TransientInspector component**
  - [ ] Tooltip or side panel showing selected transient details
  - [ ] Display: timestamp, intensity, band, detection method, nearest beat info

---

## Phase 5: Multi-Band Visualization

- [ ] **Task 5.1: Create MultiBandVisualization component**
  - [ ] Three stacked timelines (Low/Mid/High)
  - [ ] Each timeline shows:
    - Band label with frequency range
    - Detection method indicator
    - Transients for that band only
    - Optional: waveform/envelope background
  - [ ] Vertical alignment so transients line up by time
  - [ ] Sync with audio playback

- [ ] **Task 5.2: Create BandTimeline component**
  - [ ] Reusable timeline for a single band
  - [ ] Props: band, transients, currentTime, isPlaying
  - [ ] Color-coded by band type
  - [ ] Support intensity-based sizing

---

## Phase 6: Quantization Visualization

- [ ] **Task 6.1: Create QuantizationPanel component**
  - [ ] Container for quantization visualizations
  - [ ] Summary stats (total quantized beats, avg error, grid type distribution)

- [ ] **Task 6.2: Create GridDecisionTimeline component**
  - [ ] Shows per-beat grid choice (16th vs triplet)
  - [ ] Color coding: Blue for straight_16th, Purple for triplet_8th
  - [ ] Opacity based on confidence
  - [ ] Hover shows confidence score and offset values
  - [ ] Sync with audio playback

- [ ] **Task 6.3: Create QuantizedBeatTimeline component**
  - [ ] Shows final quantized output
  - [ ] Beat grid lines (subtle)
  - [ ] Quantized beats as markers
  - [ ] Color by band, size by intensity
  - [ ] Hover shows quantization error
  - [ ] Sync with audio playback

- [ ] **Task 6.4: Add quantization error histogram (optional)**
  - [ ] Show distribution of quantization errors
  - [ ] X-axis: error in ms
  - [ ] Y-axis: count of beats

---

## Phase 7: Difficulty Variants Visualization (Side-by-Side Comparison)

- [ ] **Task 7.1: Create DifficultyVariantsPanel component**
  - [ ] Container for side-by-side comparison view
  - [ ] Three columns: Easy | Medium | Hard
  - [ ] Highlight "natural" difficulty (unedited variant) with badge
  - [ ] Stats for each variant (beat count, density)

- [ ] **Task 7.2: Create VariantTimeline component**
  - [ ] Timeline showing beats for a single difficulty
  - [ ] Color-code inserted patterns differently from base transients
  - [ ] Show edit type indicator (simplified/interpolated/pattern_inserted)
  - [ ] Sync with audio playback
  - [ ] Reusable for each difficulty column

- [ ] **Task 7.3: Create VariantComparisonView component**
  - [ ] Stacked view of all three difficulties (3 rows)
  - [ ] Visual density comparison at a glance
  - [ ] Beat count labels for each difficulty
  - [ ] Vertical alignment so beats line up by time across all three
  - [ ] Shared zoom/scroll across all three timelines

---

## Phase 8: Phrase Detection Visualization (List with Timeline Highlight)

- [ ] **Task 8.1: Create PhraseDetectionPanel component**
  - [ ] List of detected rhythmic phrases
  - [ ] Total phrase count
  - [ ] Sort by significance
  - [ ] Compact card for each phrase

- [ ] **Task 8.2: Create PhrasePatternCard component**
  - [ ] Shows a single detected pattern
  - [ ] Visual representation of the rhythm (mini timeline or grid)
  - [ ] Size (1/2/4/8 beats)
  - [ ] Occurrence count
  - [ ] Significance score
  - [ ] Click to highlight all occurrences on main timeline

- [ ] **Task 8.3: Add phrase occurrence highlighting**
  - [ ] When phrase is selected, highlight all its occurrences on the main timeline
  - [ ] Show occurrence markers as colored regions on timeline
  - [ ] Different color for each phrase pattern
  - [ ] Clear highlighting when phrase is deselected

---

## Phase 9: Audio Sync & Timeline Integration

- [ ] **Task 9.1: Integrate with audioPlayerStore**
  - [ ] All timeline components receive currentTime and isPlaying
  - [ ] Playhead position updates in real-time
  - [ ] Seek functionality works across all timelines

- [ ] **Task 9.2: Create shared timeline utilities**
  - [ ] Extract common timeline logic from BeatTimeline
  - [ ] Reusable hooks: `useTimelineZoom`, `useTimelineSeek`
  - [ ] Consistent styling across all timeline components

- [ ] **Task 9.3: Add timeline controls**
  - [ ] Play/pause button
  - [ ] Zoom controls
  - [ ] Timeline scrubber
  - [ ] Match existing timeline control patterns

---

## Phase 10: CSS & Styling

- [ ] **Task 10.1: Create RhythmGenerationTab.css**
  - [ ] Panel container styles
  - [ ] Collapsible section styles
  - [ ] Loading skeleton styles
  - [ ] Error state styles

- [ ] **Task 10.2: Create toggle and settings CSS**
  - [ ] AutoLevelToggle.css - simple toggle with beta badge
  - [ ] AutoLevelSettings.css - collapsible settings panel

- [ ] **Task 10.3: Create visualization component CSS files**
  - [ ] TransientDetectionPanel.css
  - [ ] MultiBandVisualization.css
  - [ ] QuantizationPanel.css
  - [ ] DifficultyVariantsPanel.css (side-by-side layout)
  - [ ] PhraseDetectionPanel.css

- [ ] **Task 10.4: Ensure responsive design**
  - [ ] Mobile-friendly layouts
  - [ ] Touch-friendly timeline interactions
  - [ ] Collapsible panels on small screens
  - [ ] Side-by-side difficulty view stacks on mobile

- [ ] **Task 10.5: Performance optimization for DOM rendering**
  - [ ] Consider virtualization for 500+ transients (optional enhancement)
  - [ ] Use CSS transforms for timeline scrolling
  - [ ] Debounce resize handlers

---

## Phase 11: Integration & Testing

- [ ] **Task 11.1: Integrate all components into RhythmGenerationTab**
  - [ ] Wire up all sub-components
  - [ ] Connect to store and hooks
  - [ ] Handle edge cases (no data, errors)

- [ ] **Task 11.2: Update BeatDetectionTab integration**
  - [ ] Conditionally show RhythmGenerationTab based on mode
  - [ ] Handle step navigation for auto mode
  - [ ] Integrate AutoLevelToggle and AutoLevelSettings in Step 1

- [ ] **Task 11.3: Implement auto-start behavior**
  - [ ] When auto mode is on and "Analyze" is clicked:
    - Run beat detection
    - Auto-advance to Step 2 (Rhythm Generation)
    - Automatically start rhythm generation
  - [ ] Progress UI shows during generation
  - [ ] Visualizations appear on completion

- [ ] **Task 11.4: Test manual ↔ automatic mode switching**
  - [ ] Manual → Auto: Clear generated rhythm, show settings
  - [ ] Auto → Manual: Keep beat map, clear rhythm, go to Subdivide
  - [ ] Steps update correctly
  - [ ] No stale data

- [ ] **Task 11.5: Test auto-start flow**
  - [ ] Analyze button triggers both beat detection and rhythm generation
  - [ ] Auto-advance to Step 2 happens correctly
  - [ ] Rhythm generation starts automatically
  - [ ] Progress UI shows pipeline stages

- [ ] **Task 11.6: Test error handling**
  - [ ] Show error message on generation failure
  - [ ] Retry button works
  - [ ] Switch to manual option available

- [ ] **Task 11.7: Test audio sync across all timelines**
  - [ ] Playhead position accurate
  - [ ] Seek works correctly
  - [ ] Performance with many transients (500+)

- [ ] **Task 11.8: Accessibility audit**
  - [ ] ARIA labels on all visualizations
  - [ ] Keyboard navigation
  - [ ] Screen reader announcements
  - [ ] Color contrast verification

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/Tabs/RhythmGenerationTab.tsx` | Main tab container (visualization only) |
| `src/components/Tabs/RhythmGenerationTab.css` | Tab styles |
| `src/components/ui/AutoLevelToggle.tsx` | Manual/Auto toggle switch with beta badge |
| `src/components/ui/AutoLevelToggle.css` | Toggle styles |
| `src/components/ui/AutoLevelSettings.tsx` | Settings panel for Step 1 when auto mode is on |
| `src/components/ui/AutoLevelSettings.css` | Settings styles |
| `src/components/ui/RhythmGenerationProgress.tsx` | Pipeline stages progress |
| `src/components/ui/TransientDetectionPanel.tsx` | Transient visualization container |
| `src/components/ui/TransientDetectionPanel.css` | Transient panel styles |
| `src/components/ui/TransientTimeline.tsx` | Timeline with transients (DOM-based) |
| `src/components/ui/TransientTimeline.css` | Timeline styles |
| `src/components/ui/TransientBandBreakdown.tsx` | Per-band stats cards |
| `src/components/ui/TransientBandBreakdown.css` | Breakdown styles |
| `src/components/ui/MultiBandVisualization.tsx` | 3-band stacked view |
| `src/components/ui/MultiBandVisualization.css` | Multi-band styles |
| `src/components/ui/QuantizationPanel.tsx` | Quantization container |
| `src/components/ui/QuantizationPanel.css` | Quantization styles |
| `src/components/ui/GridDecisionTimeline.tsx` | Grid choice timeline |
| `src/components/ui/QuantizedBeatTimeline.tsx` | Quantized output timeline |
| `src/components/ui/DifficultyVariantsPanel.tsx` | Side-by-side Easy/Med/Hard comparison |
| `src/components/ui/DifficultyVariantsPanel.css` | Variants styles |
| `src/components/ui/PhraseDetectionPanel.tsx` | Phrase patterns list with highlight |
| `src/components/ui/PhraseDetectionPanel.css` | Phrase styles |
| `src/hooks/useRhythmGeneration.ts` | Rhythm generation hook |
| `src/types/rhythmGeneration.ts` | TypeScript interfaces |

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/beatDetectionStore.ts` | Add generationMode, generatedRhythm state; update step logic |
| `src/components/Tabs/BeatDetectionTab.tsx` | Add mode toggle, conditionally render steps |
| `src/components/Tabs/BeatDetectionTab.css` | Mode toggle positioning |
| `src/components/ui/StepNav.tsx` | Handle dynamic step count |
| `src/types/index.ts` | Export rhythm generation types |

---

## Dependencies

### No New Dependencies Required
All visualizations can be built with existing React patterns and CSS. May consider canvas-based rendering for large transient datasets if performance becomes an issue.

### Components to Reuse
- `StepNav` - Already supports dynamic step configs
- `Button`, `Card` - UI primitives
- `Tooltip` - For hover information
- `LoadingSpinner` / `Skeleton` - Loading states
- Audio sync patterns from `BeatTimeline`

### Rendering Approach
All timeline visualizations use **DOM elements** (not canvas) to match existing patterns:
- Easier to implement and maintain
- Better accessibility (native focus, ARIA)
- Easier to add interactivity (click, hover)
- May need virtualization for 500+ transients (optional enhancement)

### Band Color Scheme
| Band | Color | Hex |
|------|-------|-----|
| Low | Blue | `#3b82f6` |
| Mid | Green | `#22c55e` |
| High | Orange | `#f97316` |

---

## Out of Scope (Future Enhancements)

- Export generated rhythm data
- Edit/modify generated rhythms
- Pitch detection visualization
- Custom rhythm pattern library
- Real-time rhythm generation during playback
