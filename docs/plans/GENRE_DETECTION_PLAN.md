# Genre Detection UI Implementation Plan

## Overview

Add a Genre Detection feature to the AudioAnalysisTab that uses the playlist-data-engine's `GenreAnalyzer` to classify music into genres using machine learning (essentia.js + TensorFlow.js with MTG Jamendo model). The feature will be presented as a third analysis mode alongside Normal and Timeline modes, with results visualized as a horizontal bar chart showing confidence percentages.

---

## Design Decisions

The following decisions were made during planning:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Mode behavior** | Mutually exclusive | Genre is a third mode option - user picks Normal OR Timeline OR Genre |
| **EQ visibility** | Hide in Genre mode | EQ controls don't affect ML classification, so hide them to reduce clutter |
| **Low confidence display** | Show all returned genres | Display all genres the model returns - user sees complete data |
| **Model loading** | Lazy load on demand | Load model only when user clicks "Analyze Genre" - saves resources |
| **Model URL** | Hardcoded default with override | Use MTG Jamendo CDN by default, allow override via options |

---

## Phase 1: Foundation - Types and Store

### Task 1.1: Add Genre Types to Store
- [x] Import `GenreProfile` and `GenreTag` types from `playlist-data-engine` in `playlistStore.ts`
- [x] Add `genreProfile: GenreProfile | null` to `PlaylistState` interface
- [x] Add `setGenreProfile(profile: GenreProfile | null)` action
- [x] Clear `genreProfile` in `selectTrack()` action (alongside `audioProfile`)
- [x] Clear `genreProfile` in `setPlaylist()` action

### Task 1.2: Create useGenreAnalyzer Hook
- [x] Create new file `src/hooks/useGenreAnalyzer.ts`
- [x] Import `GenreAnalyzer` and types from `playlist-data-engine`
- [x] Implement hook with:
  ```typescript
  {
    analyzeGenre: (audioUrl: string) => Promise<GenreProfile | null>,
    isAnalyzing: boolean,
    isModelLoading: boolean,
    progress: number,
    genreProfile: GenreProfile | null,
    options: GenreAnalyzerOptions,
    setOptions: (options: GenreAnalyzerOptions) => void,
    clearProfile: () => void,
    error: string | null
  }
  ```
- [x] Store results in `playlistStore` via `setGenreProfile()`
- [x] Handle loading states and errors
- [x] Lazy initialize `GenreAnalyzer` instance (only when `analyzeGenre()` is called)
- [x] Cache analyzer instance after first creation for subsequent calls

---

## Phase 2: UI Components

### Task 2.1: Create GenreBarChart Component
- [x] Create `src/components/ui/GenreBarChart.tsx`
- [x] Props interface:
  ```typescript
  {
    genres: GenreTag[],
    primaryGenre?: string,
    maxBars?: number  // default 10
  }
  ```
- [x] Horizontal bar chart implementation:
  - Sort genres by confidence (descending)
  - Limit to `maxBars` entries
  - Each bar shows: genre name, confidence %, visual bar
  - Highlight primary genre with distinct styling
  - Animate bars on load (CSS transitions)
  - **Show all returned genres** (no "Other" bucket for low confidence)
- [x] Use CSS custom properties for theming
- [x] Responsive layout (scrollable if many genres)

### Task 2.2: Create GenreResultsCard Component
- [ ] Create `src/components/AudioAnalysis/GenreResultsCard.tsx`
- [ ] Display when `genreProfile` exists
- [ ] Include:
  - Primary genre highlight (large, prominent)
  - GenreBarChart for all detected genres
  - Analysis metadata (duration, timestamp)
  - Confidence threshold indicator
- [ ] Loading skeleton state while analyzing
- [ ] Error state with retry option

---

## Phase 3: Integration with AudioAnalysisTab

### Task 3.1: Update Mode Selector
- [ ] Modify analysis mode radio group in `AudioAnalysisTab.tsx`
- [ ] Change from boolean (`isTimelineMode`) to enum:
  ```typescript
  type AnalysisMode = 'normal' | 'timeline' | 'genre';
  ```
- [ ] Add 'Genre' option to radio buttons (mutually exclusive with Normal/Timeline)
- [ ] Update mode description text for each option:
  - Normal: "3 samples"
  - Timeline: "Full analysis"
  - Genre: "ML classification"

### Task 3.2: Integrate useGenreAnalyzer Hook
- [ ] Import and use `useGenreAnalyzer` hook in `AudioAnalysisTab.tsx`
- [ ] Add genre-specific options UI:
  - [ ] `topN` input (number, 1-20, default 10)
  - [ ] `threshold` input (range slider, 0.01-0.50, default 0.05)
- [ ] Update "Analyze" button logic:
  - Call `analyzeGenre()` when mode is 'genre'
  - Disable button during analysis
  - Show loading state

### Task 3.3: Add Genre Results Display
- [ ] Add `GenreResultsCard` to results grid
- [ ] Position alongside existing results cards
- [ ] Only show when `analysisMode === 'genre'` and `genreProfile` exists
- [ ] Handle empty state when no analysis has been run

### Task 3.4: Update Primary Control Card
- [ ] Show genre-specific options when 'Genre' mode selected:
  - Top N genres selector
  - Confidence threshold slider
- [ ] **Hide EQ controls entirely when Genre mode is selected** (not applicable to ML classification)
- [ ] Update analysis button text: "Analyze Genre" vs "Analyze Audio"
- [ ] **Hide playback requirement warning** in Genre mode (ML doesn't require real-time playback)

---

## Phase 4: Polish and UX

### Task 4.1: Loading States and Progress
- [ ] Add progress indicator during genre analysis
- [ ] **Show "Loading ML model..." message** on first-time load (can take 5-10 seconds)
- [ ] Disable controls during analysis
- [ ] Add cancel button option (if feasible)

### Task 4.2: Error Handling
- [ ] Handle network errors (audio fetch failed)
- [ ] Handle model load errors
- [ ] Show user-friendly error messages
- [ ] Add retry button in error state

### Task 4.3: Styling and Animations
- [ ] Add entrance animations for genre bars
- [ ] Hover states on bars (show exact percentage)
- [ ] Primary genre highlight effect (glow/border)
- [ ] Consistent spacing with existing cards
- [ ] Dark/light theme support via CSS variables

### Task 4.4: Export Functionality
- [ ] Add "Export Genre Profile" button
- [ ] Export as JSON file
- [ ] Include metadata (track info, timestamp, model used)

---

## Dependencies

- `playlist-data-engine` with `GenreAnalyzer` export (already available)
- `essentia.js` and `@tensorflow/tfjs` (bundled in engine)
- Existing UI components: Card, Button, StatusIndicator
- lucide-react icons

---

## Technical Notes

### GenreAnalyzer Configuration
```typescript
const analyzer = new GenreAnalyzer({
  modelUrl: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json',
  topN: 10,        // Number of genres to return
  threshold: 0.05  // Minimum confidence (5%)
});
```

**Default Model URL**: The MTG Jamendo CDN URL is hardcoded as the default. Users can override via the `modelUrl` option if needed for testing or alternative models.

### 87 Available Genres
The MTG Jamendo model supports 87 genre categories including:
- Era-based: 60s, 70s, 80s, 90s
- Rock variants: rock, alternativerock, classicrock, indierock, punkrock
- Electronic: electronic, edm, house, techno, trance, dubstep
- Urban: hiphop, rap, rnb
- Jazz/Blues: jazz, blues, jazzfusion
- And many more...

### Model Loading Strategy
- **Lazy load**: Model is only loaded when user clicks "Analyze Genre" for the first time
- **First load**: Can take 5-10 seconds - show "Loading ML model..." message
- **Subsequent calls**: Analyzer instance is cached in the hook for fast re-use
- **No pre-loading**: Don't load on component mount to save bandwidth

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/store/playlistStore.ts` | Modify | Add genreProfile state |
| `src/hooks/useGenreAnalyzer.ts` | Create | New hook for genre analysis |
| `src/components/ui/GenreBarChart.tsx` | Create | Bar chart visualization |
| `src/components/AudioAnalysis/GenreResultsCard.tsx` | Create | Results display card |
| `src/components/Tabs/AudioAnalysisTab.tsx` | Modify | Integrate genre mode |
| `src/components/Tabs/AudioAnalysisTab.css` | Modify | Styles for genre mode |

---

## Future Enhancements (Out of Scope)

These items are noted for potential future iterations but are not part of the current implementation:

- [ ] Show all 87 possible genres in a legend/tooltip
- [ ] Add genre history to compare across tracks
- [ ] Cache model in localStorage/IndexedDB for faster subsequent visits
- [ ] Combine genre analysis with normal analysis (parallel execution)

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Foundation | 2 tasks | Low |
| Phase 2: UI Components | 2 tasks | Medium |
| Phase 3: Integration | 4 tasks | Medium |
| Phase 4: Polish | 4 tasks | Low-Medium |

**Total: 12 tasks across 4 phases**
