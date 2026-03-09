# Refactor: Split AudioAnalysisTab into AudioAnalysisTab + BeatDetectionTab

## Overview

Split the `AudioAnalysisTab` component into two separate tabs:
- **AudioAnalysisTab** - Contains only "normal" and "timeline" audio analysis modes
- **BeatDetectionTab** - Contains only beat detection functionality (dedicated tab)

This refactor improves code organization by separating the complex beat detection feature into its own dedicated tab, making both components easier to maintain and understand.

## Current State

| File | Lines | Description |
|------|-------|-------------|
| `AudioAnalysisTab.tsx` | 1395 | Contains all three modes: normal, timeline, beat |
| `BeatDetectionTab.tsx` | 1395 | Exact copy of AudioAnalysisTab (not imported/used) |
| `BeatDetectionTab.css` | 2027 | Copy of AudioAnalysisTab.css |

**Known Bug**: BeatDetectionTab.tsx imports `./AudioAnalysisTab.css` instead of `./BeatDetectionTab.css`

---

## Phase 1: Fix BeatDetectionTab Foundation

- [x] **1.1 Fix CSS Import Bug**
  - [x] Change line 3 in `BeatDetectionTab.tsx` from `import './AudioAnalysisTab.css'` to `import './BeatDetectionTab.css'`

- [x] **1.2 Update Component Identity**
  - [x] Update JSDoc comment (lines 27-39) to describe BeatDetectionTab functionality only
  - [x] Rename function from `AudioAnalysisTab` to `BeatDetectionTab` (line 40)
  - [x] Update export name (line 1393)
  - [x] Update header title to "Beat Detection" (line 579)
  - [x] Update header subtitle to "Analyze rhythm and generate beat maps" (line 580)
  - [x] Update header icon from Waves to Drum

- [x] **1.3 Add BeatDetectionTab to App Navigation**
  - [x] In `App.tsx`, add `Drum` to lucide-react imports (line 2)
  - [x] Add `'beat'` to Tab type definition (line 27)
  - [x] Add `import { BeatDetectionTab } from './components/Tabs/BeatDetectionTab';` after AudioAnalysisTab import
  - [x] Add `{ id: 'beat', label: 'Beat Detection', icon: Drum }` to tabs array after audio tab
  - [x] Add `case 'beat': return <BeatDetectionTab />;` to renderActiveTab switch
  - [x] Verify Beat Detection tab appears in sidebar navigation

---

## Phase 2: Remove Beat Code from AudioAnalysisTab

- [x] **2.1 Remove Beat-Specific Imports**
  - [x] Remove `Drum` from lucide-react imports (line 2)
  - [x] Remove `import { useBeatDetection }` (line 7)
  - [x] Remove `BeatDetectionSettings` import (line 17)
  - [x] Remove `SubdivisionSettings` import (line 18)
  - [x] Remove `ChartEditor` import (line 19)
  - [x] Remove `ChartEditorToolbar` import (line 20)
  - [x] Remove `BeatMapSummary` import (line 21)
  - [x] Remove `BeatPracticeView` import (line 22)
  - [x] Remove `useBeatDetectionStore` and all selectors import (line 24)

- [x] **2.2 Remove Beat State Variables**
  - [x] Change analysisMode type from `'normal' | 'timeline' | 'beat'` to `'normal' | 'timeline'` (line 63)
  - [x] Remove `useBeatDetection` hook destructuring (lines 71-77)
  - [x] Remove all `useBeatDetectionStore` selectors (lines 80-92)
  - [x] Remove `interpolatedBeatMap`, `subdividedBeatMap`, `subdivisionConfig`, `chartStyle`, `chartStatistics` (lines 88-92)

- [x] **2.3 Remove Beat Handler Functions**
  - [x] Remove `handleExportBeatMap` callback (lines 99-204)
  - [x] Remove beat caching `useEffect` (lines 211-229)
  - [x] Remove `getPhaseLabel` function (lines 234-257)
  - [x] Remove `handleBeatAnalysis` callback (lines 406-416)
  - [x] Remove `handleStartPracticeMode` callback (lines 418-423)
  - [x] Remove `handleExitPracticeMode` callback (lines 425-430)

- [x] **2.4 Simplify Status Functions**
  - [x] Simplify `getAnalysisStatus` to remove beat mode checks (lines 535-550)
  - [x] Simplify `getStatusLabel` to remove beat mode checks (lines 552-567)

- [x] **2.5 Remove Beat Mode Button from Mode Selector**
  - [x] Remove the Beat mode button (lines 732-742)
  - [x] Keep only Normal and Timeline buttons

- [x] **2.6 Remove Beat Render Sections**
  - [x] Remove BeatDetectionSettings conditional render (lines 823-826)
  - [x] Remove short track warning (lines 828-836)
  - [x] Remove beat action section from Action Section (lines 841-886)
  - [x] Remove Beat Subdivision Card (lines 916-932)
  - [x] Remove Chart Editor Card (lines 934-952)
  - [x] Remove Chart Editor Placeholder (lines 954-977)
  - [x] Remove Beat Detection Results Card (lines 979-1014)
  - [x] Remove Beat Practice View (lines 1016-1019)

- [x] **2.7 Clean Up Conditionals**
  - [x] Remove `audio-analysis-primary-layout--beat` class from layout (line 601)
  - [x] Remove `analysisMode !== 'beat'` check from EQ section (line 632) - EQ always visible now
  - [x] Remove beat mode check from Audio Analysis Results (line 1022)

- [ ] **2.8 Clean Up AudioAnalysisTab.css**
  - [ ] Remove `.audio-analysis-beat-results-card` styles (~line 186-203)
  - [ ] Remove `.audio-analysis-primary-layout--beat` styles (~line 205-210)
  - [ ] Remove short-track warning styles (beat-specific, ~line 572+)
  - [ ] Remove chart editor placeholder styles (~line 1943+)
  - [ ] Remove beat subdivision card styles
  - [ ] Remove any other beat-only CSS sections

---

## Phase 3: Clean Up BeatDetectionTab

- [ ] **3.1 Remove Normal/Timeline Imports**
  - [ ] Remove `Waves` and `Zap` from lucide-react imports (line 2)
  - [ ] Remove `import { useAudioAnalyzer }` (line 6)
  - [ ] Remove `import { RawJsonDump }` (line 8)
  - [ ] Remove `import { RadarChart }` (line 15)
  - [ ] Remove `import { TimelineScrubber }` (line 16)
  - [ ] Remove `import { ColorExtractor }` from playlist-data-engine (line 23)

- [ ] **3.2 Remove Normal/Timeline State Variables**
  - [ ] Remove `useAudioAnalyzer` destructuring (line 43)
  - [ ] Remove timeline visualization state: `selectedTimelineIndex`, `audioSyncEnabled` (lines 49-50)
  - [ ] Remove EQ multiplier states: `trebleBoost`, `bassBoost`, `midBoost` (lines 53-55)
  - [ ] Remove slider position states: `trebleSliderPos`, `bassSliderPos`, `midSliderPos` (lines 58-60)
  - [ ] Remove analysisMode state entirely (line 63) - always beat mode now
  - [ ] Remove timeline mode states: `timelineMode`, `timelineCount`, `timelineInterval` (lines 65-68)

- [ ] **3.3 Remove Normal/Timeline Handler Functions**
  - [ ] Remove `sliderPosToValue` function (lines 265-276)
  - [ ] Remove `valueToSliderPos` function (lines 281-292)
  - [ ] Remove slider position init `useEffect` (lines 295-299)
  - [ ] Remove `handleSliderChange` function (lines 305-320)
  - [ ] Remove slider wrapper functions: `handleTrebleChange`, `handleBassChange`, `handleMidChange` (lines 323-325)
  - [ ] Remove `handleAnalyze` function (lines 327-400)
  - [ ] Remove `handleApplyMultipliers` function (lines 432-510)

- [ ] **3.4 Simplify Status Functions**
  - [ ] Keep only beat-specific status logic in `getAnalysisStatus` (lines 535-550)
  - [ ] Keep only beat-specific status logic in `getStatusLabel` (lines 552-567)

- [ ] **3.5 Remove EQ Section**
  - [ ] Remove entire EQ integration section (lines 631-701)

- [ ] **3.6 Remove Mode Selector**
  - [ ] Remove entire Mode Selector section including timeline options (lines 703-837)
  - [ ] Keep only BeatDetectionSettings visible (move outside conditional)

- [ ] **3.7 Remove Normal/Timeline Render Sections**
  - [ ] Remove entire Audio Analysis Results section (lines 1022-1389):
    - Frequency Band Visualization
    - Average Amplitude
    - Energy Metrics
    - Timeline Visualization (RadarChart + TimelineScrubber)
    - Advanced Metrics
    - Color Palette
    - Sampling Timeline
    - Analysis Metadata
    - Raw JSON Dump

- [ ] **3.8 Rename Beat-Specific CSS Classes**
  - [ ] In BeatDetectionTab.css, rename `.audio-analysis-beat-results-card` → `.beat-detection-results-card`
  - [ ] Remove `.audio-analysis-primary-layout--beat` (not needed - no mode switching)
  - [ ] Rename other beat-specific classes to `beat-detection-*` prefix where appropriate
  - [ ] Update corresponding className references in BeatDetectionTab.tsx
  - [ ] Keep shared classes (container, header, card, button) as `audio-analysis-*`

---

## Phase 4: Verification

- [ ] **4.1 Build Check**
  - [ ] Run `npm run build` - should compile without errors
  - [ ] Run `npm run lint` (if available) - check for unused imports/variables
  - [ ] Run TypeScript check if available

- [ ] **4.2 AudioAnalysisTab Test**
  - [ ] Navigate to Audio Analysis tab
  - [ ] Verify Normal and Timeline modes work
  - [ ] Verify EQ sliders are always visible
  - [ ] Verify Beat mode button is gone
  - [ ] Verify frequency analysis works
  - [ ] Verify timeline visualization works

- [ ] **4.3 BeatDetectionTab Test**
  - [ ] Navigate to new Beat Detection tab
  - [ ] Verify tab appears in navigation
  - [ ] Verify beat detection settings are visible
  - [ ] Verify "Analyze Beats" button works
  - [ ] Verify Beat Map Summary displays correctly
  - [ ] Verify Subdivision Settings work
  - [ ] Verify Chart Editor works
  - [ ] Verify Practice Mode works
  - [ ] Verify Export Beat Map works

- [ ] **4.4 Shared State Test**
  - [ ] Generate beat map in BeatDetectionTab
  - [ ] Switch to another tab
  - [ ] Return to BeatDetectionTab
  - [ ] Verify beat map is still there (persisted in store)

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/components/Tabs/AudioAnalysisTab.tsx` | Remove all beat code |
| `src/components/Tabs/AudioAnalysisTab.css` | Remove beat-specific CSS classes |
| `src/components/Tabs/BeatDetectionTab.tsx` | Fix CSS import, remove normal/timeline code, update class names |
| `src/components/Tabs/BeatDetectionTab.css` | Rename beat-specific classes to `beat-detection-*` prefix |
| `src/App.tsx` | Add BeatDetectionTab to routing and navigation |

---

## Dependencies

- None - this is a pure code organization refactor
- Both tabs share `beatDetectionStore` for beat map state

---

## Notes

- **Shared CSS classes**: Common classes (container, header, card, button) use `audio-analysis-*` prefix in both tabs for consistency
- **Beat-specific CSS classes**: Unique beat classes renamed to `beat-detection-*` prefix in BeatDetectionTab.css
- Both tabs share the same `beatDetectionStore`, so beat maps persist across tab switches
- The refactor is purely code organization - no functional changes to user experience
- After refactor, AudioAnalysisTab will be ~900 lines and BeatDetectionTab will be ~500 lines

---

## Estimated Effort

| Phase | Complexity |
|-------|------------|
| Phase 1: Foundation + Navigation | Low - simple fixes, add tab to UI |
| Phase 2: AudioAnalysisTab cleanup | Medium - many removals + CSS cleanup |
| Phase 3: BeatDetectionTab cleanup | Medium - many removals + CSS renaming |
| Phase 4: Verification | Medium - comprehensive testing |
