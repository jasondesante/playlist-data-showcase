# Beat Detection Demo Implementation Plan

> **Reference Documentation:** [AUDIO_ANALYSIS.md](../engine/docs/AUDIO_ANALYSIS.md) - Complete API docs for `BeatMapGenerator`, `BeatStream`, and all beat detection types.

## Overview

Add a **Beat Detection** mode to the AudioAnalysisTab that provides a rhythm game-style practice experience:

### The Core Experience
1. **Step 1 - Analyze**: Generate beat map from audio (one-time, with progress UI)
2. **Step 2 - Practice Mode**: Play the track with:
   - **Audio playback** - the actual song
   - **Beat visualization** - animated timeline showing beats scrolling past a "now" line, synced to the audio
   - **Tap accuracy** - hit spacebar/button to the beat and see real-time accuracy feedback (ms offset, rating)

All three elements (audio, visual beats, tap detection) work **together continuously** during practice mode, driven by the engine's `BeatStream` which keeps everything synchronized.

---

## Phase 1: Foundation & State Management

### 1.1 Type Definitions
- [x] Add beat detection types to `src/types/index.ts`
  - [x] Export `Beat`, `BeatMap`, `BeatMapMetadata`, `BeatEvent`, `BeatEventType` from engine
  - [x] Export `BeatMapGeneratorOptions`, `BeatStreamOptions` from engine
  - [x] Export `ButtonPressResult`, `BeatAccuracy`, `AudioSyncState` from engine
  - [x] Export `BeatMapGenerationProgress` from engine

### 1.2 Beat Detection Store
- [x] Create `src/store/beatDetectionStore.ts`
  - [x] State: `beatMap: BeatMap | null`
  - [x] State: `isGenerating: boolean`
  - [x] State: `generationProgress: BeatMapGenerationProgress | null`
  - [x] State: `generatorOptions: BeatMapGeneratorOptions` (with defaults)
  - [x] State: `cachedBeatMaps: Record<string, BeatMap>` (localStorage cache)
  - [x] State: `practiceModeActive: boolean` - whether we're in the interactive practice mode
  - [x] State: `tapHistory: TapResult[]` - running history of tap accuracy results
  - [x] Actions: `generateBeatMap(audioUrl, audioId, options?)`
  - [x] Actions: `cancelGeneration()`
  - [x] Actions: `setGeneratorOptions(options)`
  - [x] Actions: `clearBeatMap()`
  - [x] Actions: `startPracticeMode()` / `stopPracticeMode()`
  - [x] Actions: `recordTap(result)` - add tap result to history
  - [x] Actions: `clearTapHistory()`
  - [x] Actions: `loadCachedBeatMap(audioId)` / `cacheBeatMap(audioId, beatMap)`
  - [x] Implement localStorage persistence with track ID as key

### 1.3 Beat Detection Hook
- [x] Create `src/hooks/useBeatDetection.ts`
  - [x] Wrap `BeatMapGenerator` from engine
  - [x] Handle progress callbacks during generation
  - [x] Manage cancellation
  - [x] Return: `{ generateBeatMap, cancelGeneration, isGenerating, progress, beatMap, error }`

---

## Phase 2: Beat Map Generation UI

### 2.1 Update AudioAnalysisTab Mode Selector
- [x] Add "Beat Detection" as third mode option alongside "Normal" and "Timeline"
  - [x] New icon: `Drum` or `Metronome` from lucide-react
  - [x] Label: "Beat"
  - [x] Description: "Rhythm detection"

### 2.2 Beat Detection Settings Panel
- [x] Create settings sub-component shown when Beat Detection mode is selected (before analysis)
  - [x] **BPM Range**: Dual slider for min/max BPM (default: 60-180)
  - [x] **Intensity Threshold**: Slider 0.1-1.0 (default: 0.3)
  - [x] **Tempo Center**: Slider 0.3-0.7 seconds (default: 0.5 = 120 BPM)
  - [x] Use existing EQ-style slider design patterns

### 2.3 Analysis Progress UI
- [ ] Update primary action button for beat detection mode
  - [ ] Show "Analyze Beats" when no beat map exists
  - [ ] Show "Re-Analyze" when beat map exists
  - [ ] Show progress percentage during generation
- [ ] Progress phases display (from engine's `BeatMapGenerationProgress`):
  - [ ] Phase: "Loading audio..."
  - [ ] Phase: "Computing onset envelope..."
  - [ ] Phase: "Detecting tempo..."
  - [ ] Phase: "Tracking beats..."
  - [ ] Phase: "Complete!"

### 2.4 Beat Map Summary (After Analysis)
- [ ] Display after successful analysis
  - [ ] Detected BPM (initial estimate)
  - [ ] Total beats found
  - [ ] Track duration
  - [ ] "Start Practice Mode" button to begin

---

## Phase 3: Practice Mode - Core Experience

This is the main feature where **audio playback + beat visualization + tap accuracy** all work together.

### 3.1 Beat Stream Hook (The Sync Engine)
- [ ] Create `src/hooks/useBeatStream.ts`
  - [ ] Initialize `BeatStream` from engine with the generated `BeatMap`
  - [ ] Create/manage AudioContext for precise timing
  - [ ] Subscribe to beat events: `upcoming`, `exact`, `passed`
  - [ ] Sync with audio player's current time
  - [ ] Track current BPM in real-time (rolling calculation)
  - [ ] Handle `checkButtonPress()` for tap accuracy
  - [ ] Handle seek events (when user jumps to different position)
  - [ ] Return: `{
      currentBpm,
      upcomingBeats,
      lastBeatEvent,
      checkTap,
      startStream,
      stopStream,
      seekStream
    }`

### 3.2 BeatPracticeView Component (The Main Container)
- [ ] Create `src/components/ui/BeatPracticeView.tsx`
  - [ ] Full-width container for the practice experience
  - [ ] Layout: Timeline visualization at top, tap area below
  - [ ] Integrate with `useAudioPlayerStore` for playback state
  - [ ] Integrate with `useBeatStream` for beat sync
  - [ ] Handle keyboard events (spacebar for tap)
  - [ ] Show current BPM and song position

### 3.3 BeatPracticeView CSS
- [ ] Create `src/components/ui/BeatPracticeView.css`
  - [ ] Practice mode container styling
  - [ ] BPM display
  - [ ] Responsive layout

---

## Phase 4: Beat Timeline Visualization

### 4.1 BeatTimeline Component
- [ ] Create `src/components/ui/BeatTimeline.tsx`
  - [ ] Props: `beatMap`, `currentTime`, `upcomingBeats`, `onSeek?`
  - [ ] **Horizontal scrolling track** - beats scroll from right to left
  - [ ] **Fixed "Now" line** in the center - this is where beats "hit"
  - [ ] Beat markers:
    - [ ] Regular beats (small dots/markers)
    - [ ] Downbeats (larger, different color - measure starts)
    - [ ] Intensity visualization (opacity based on confidence)
  - [ ] Visual pulse/flash when a beat crosses the "now" line
  - [ ] Anticipation window (show beats coming up)

### 4.2 BeatTimeline CSS
- [ ] Create `src/components/ui/BeatTimeline.css`
  - [ ] Timeline track with gradient background
  - [ ] Beat markers (regular vs downbeat styling)
  - [ ] "Now" line - prominent vertical indicator in center
  - [ ] Beat pulse animation (when beat hits now line)
  - [ ] Past beats (faded) vs upcoming beats (bright)
  - [ ] Smooth scrolling animation

### 4.3 Timeline Synchronization
- [ ] Sync scroll position with audio playback time
  - [ ] Calculate position: `(currentTime - beat.timestamp) / anticipationWindow`
  - [ ] Use `requestAnimationFrame` for smooth updates
  - [ ] Handle pause/play (pause animation, resume smoothly)
  - [ ] Handle seek (jump to new position)

---

## Phase 5: Tap Accuracy Feature

### 5.1 TapArea Component
- [ ] Create `src/components/ui/TapArea.tsx`
  - [ ] Large, prominent tap button (click/touch)
  - [ ] Spacebar hotkey (always active during practice mode)
  - [ ] Visual feedback on tap:
    - [ ] Button press animation
    - [ ] Accuracy rating display: **PERFECT** / **GREAT** / **GOOD** / **MISS**
    - [ ] MS offset display: "+15ms" (late) or "-23ms" (early)
    - [ ] Color-coded flash overlay (green/yellow/orange/red)

### 5.2 TapArea CSS
- [ ] Create `src/components/ui/TapArea.css`
  - [ ] Large tap button styling (fill available space)
  - [ ] Press animation (scale down briefly)
  - [ ] Accuracy rating overlay (animated appearance)
  - [ ] MS offset display (monospace font)
  - [ ] Color coding:
    - [ ] PERFECT: Green (#22c55e)
    - [ ] GREAT: Yellow (#eab308)
    - [ ] GOOD: Orange (#f97316)
    - [ ] MISS: Red (#ef4444)

### 5.3 TapStats Component
- [ ] Create `src/components/ui/TapStats.tsx`
  - [ ] Running statistics display:
    - [ ] Total taps
    - [ ] Hit distribution (Perfect X, Great Y, Good Z, Miss N)
    - [ ] Average offset (ms)
    - [ ] Standard deviation (timing consistency)
    - [ ] Current streak
  - [ ] "Reset Stats" button

### 5.4 Keyboard Event Handling
- [ ] Add global keyboard listener during practice mode
  - [ ] Spacebar triggers tap
  - [ ] Prevent default spacebar behavior (page scroll)
  - [ ] Call `checkButtonPress()` with current AudioContext time
  - [ ] Display result in TapArea

---

## Phase 6: Integration & Polish

### 6.1 AudioAnalysisTab Integration
- [ ] Wire up beat detection mode in AudioAnalysisTab
  - [ ] Mode selector with "Beat" option
  - [ ] Settings panel (before analysis)
  - [ ] Progress UI during analysis
  - [ ] Summary + "Start Practice" button after analysis
  - [ ] BeatPracticeView when practice mode is active

### 6.2 Practice Mode Flow
- [ ] Implement the full user flow:
  1. User selects "Beat" mode
  2. User adjusts settings (optional)
  3. User clicks "Analyze Beats" (must be playing audio first)
  4. Progress UI shows during analysis
  5. Summary appears when complete
  6. User clicks "Start Practice"
  7. Practice mode begins:
     - Audio continues playing
     - Beat timeline animates, synced to audio
     - User can tap spacebar to check accuracy
     - Stats accumulate
  8. User can exit practice mode (returns to summary)

### 6.3 Audio-Beat Sync Critical Path
- [ ] Ensure tight synchronization:
  - [ ] Create AudioContext when practice mode starts
  - [ ] BeatStream uses AudioContext.currentTime for timing
  - [ ] Audio element time syncs to BeatStream via seek()
  - [ ] Timeline visual position driven by BeatStream events
  - [ ] Tap accuracy uses BeatStream.checkButtonPress(audioContextTime)

### 6.4 Error Handling
- [ ] Handle audio URL fetch failures
- [ ] Handle analysis cancellation
- [ ] Handle localStorage quota exceeded
- [ ] Display user-friendly error messages

### 6.5 Loading States
- [ ] Skeleton UI during initial load
- [ ] Progress indicator during beat map generation
- [ ] Disable controls appropriately during analysis

---

## Phase 7: Testing & Edge Cases

### 7.1 Manual Testing Checklist
- [ ] Beat map generation works with various audio files
- [ ] Timeline scrolls smoothly during playback
- [ ] Beat markers align with actual beats in the music (the key test!)
- [ ] Tap accuracy correctly measures timing
- [ ] Spacebar hotkey works reliably
- [ ] localStorage caching persists across sessions
- [ ] UI is responsive on different screen sizes
- [ ] Practice mode start/stop works cleanly

### 7.2 Edge Cases
- [ ] Very short tracks (< 10 seconds)
- [ ] Very long tracks (> 10 minutes)
- [ ] Tracks with irregular tempo (does the rolling BPM update?)
- [ ] Tracks with no clear beat (ambient, classical)
- [ ] Seeking to different positions mid-song
- [ ] Pausing/resuming during practice
- [ ] Rapid tapping (debouncing?)

---

## Technical Architecture

### Data Flow During Practice Mode

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRACTICE MODE                               │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Audio Player │────▶│  BeatStream  │────▶│ BeatTimeline │    │
│  │  (HTML5)     │     │  (Engine)    │     │  (Visual)    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    │             │
│         │                    │                    │             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ currentTime  │     │ checkTap()   │     │  Beat markers│    │
│  │   (sync)     │     │  accuracy    │     │   scrolling  │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                                   │
│                              ▼                                   │
│                       ┌──────────────┐                          │
│                       │   TapArea    │                          │
│                       │  + TapStats  │                          │
│                       └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Sync Points
1. **AudioContext.currentTime** - The source of truth for timing
2. **BeatStream** - Bridges audio time to beat events
3. **Timeline position** - Calculated from `currentTime` vs `beat.timestamp`
4. **Tap accuracy** - Measured by `BeatStream.checkButtonPress(timestamp)`

---

## Dependencies

### From playlist-data-engine
- `BeatMapGenerator` - Generate beat maps from audio
- `BeatStream` - Real-time beat event streaming (THE KEY COMPONENT)
- Types: `Beat`, `BeatMap`, `BeatMapGeneratorOptions`, `BeatStreamOptions`, `BeatEvent`, `ButtonPressResult`, `BeatAccuracy`, `BeatMapGenerationProgress`

### Existing Components to Leverage
- `Card`, `Button`, `StatusIndicator` - UI primitives
- `useAudioPlayerStore` - Audio playback state (currentTime, isPlaying, etc.)
- `usePlaylistStore` - Track selection state

---

## File Structure Summary

```
src/
├── components/
│   ├── Tabs/
│   │   └── AudioAnalysisTab.tsx (modified)
│   └── ui/
│       ├── BeatPracticeView.tsx (new) - Main practice container
│       ├── BeatPracticeView.css (new)
│       ├── BeatTimeline.tsx (new) - Scrolling beat visualization
│       ├── BeatTimeline.css (new)
│       ├── TapArea.tsx (new) - Tap button + accuracy feedback
│       ├── TapArea.css (new)
│       ├── TapStats.tsx (new) - Running statistics
│       └── TapStats.css (new)
├── hooks/
│   ├── useBeatDetection.ts (new) - Beat map generation
│   └── useBeatStream.ts (new) - Real-time beat sync
├── store/
│   └── beatDetectionStore.ts (new)
└── types/
    └── index.ts (modified - add beat types)
```

---

## Estimated Scope

- **Phase 1**: Foundation (types, store, hook) - ~1-2 hours
- **Phase 2**: Analysis UI - ~1-2 hours
- **Phase 3**: Practice mode core + BeatStream sync - ~2-3 hours
- **Phase 4**: Timeline visualization - ~2-3 hours
- **Phase 5**: Tap accuracy feature - ~1-2 hours
- **Phase 6**: Integration & polish - ~1-2 hours
- **Phase 7**: Testing - ~1 hour

**Total**: ~9-15 hours of focused development
