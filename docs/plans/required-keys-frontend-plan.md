# Required Keys Frontend Integration - Implementation Plan

## Overview

This plan integrates the Required Keys feature from `playlist-data-engine` into the `playlist-data-showcase` frontend. The feature enables rhythm game chart creation (like Guitar Hero/DDR) where specific keys must be pressed for specific beats.

### Key Features
- **Full Chart Editor** - UI for assigning keys to beats in a timeline (works with subdivided beat mode only)
- **Dual Input Support** - DDR style (arrow keys) + Guitar Hero style (number keys 1-5), both always active
- **Wrong Key Feedback** - Red with "WRONG KEY" text overlay for wrong key presses (counts as miss for scoring)
- **Easy Mode Toggle** - Manual option to ignore key requirements in difficulty settings
- **Chart Import/Export** - Save and load complete "levels" (beat map + chart together) via JSON files
- **KeyLane Views** - Authentic rhythm game visualizations (DDR 4-lane, Guitar Hero 5-lane) as core feature

### Data Engine Dependencies
This plan assumes the data engine has completed `required-keys-implementation-plan.md`:
- `requiredKey?: string` on Beat interface (works on ALL beats including subdivided beats)
- `'wrongKey'` accuracy type in BeatAccuracy
- `keyMatch`, `pressedKey`, `requiredKey` fields on ButtonPressResult
- `ignoreKeyRequirements` option in BeatStreamOptions
- Helper functions: `assignKeyToBeat`, `assignKeysToBeats`, `extractKeyMap`, `clearAllKeys`, `hasRequiredKeys`, `getKeyCount`, `getUsedKeys`

### Important: Subdivided Beat Mode Only
**Required keys only work with subdivided beat maps.** The chart editor is designed for creating "game levels" where the subdivision pattern is pre-determined across all beats. This creates a fixed rhythm phrase that the player must match. The chart editor is NOT available for detected-only or interpolated beat modes.

---

## Design Decisions

The following decisions were made during planning:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pattern tools** | Manual only | Keep initial implementation simple |
| **Input modes** | Both always active | Arrow keys + number keys work simultaneously |
| **Visual style** | TapArea + indicators + KeyLane views | KeyLane is core feature, included in main phases |
| **Undo/redo** | Out of scope | Future consideration |
| **Chart storage** | In-memory + export only | No localStorage persistence, keep in memory on exit |
| **Wrong key scoring** | Counts as miss | Tracked separately for display but scores as miss |
| **Wrong key visual** | Red with 'WRONG KEY' overlay | Use red with text overlay, keep existing color scheme simple |
| **Easy mode** | Manual toggle | In DifficultySettingsPanel, not auto-enabled |
| **Editor location** | AudioAnalysisTab section | Collapsible, like SubdivisionSettings, manual open |
| **Clear tool** | Clear All button | Separate button, not just erase mode |
| **Key display** | Arrows (↑↓←→) + Numbers (1-5) | Visual symbols on timeline beat markers |
| **Unsaved warning** | None | Charts are temporary until exported |
| **Statistics** | Wrong key count only | Per-key accuracy is future scope |
| **Timeline zoom** | No zoom | Fixed view with scroll |
| **Key indicators** | All visible beats | Show required keys for all beats in view |
| **Drag paint** | Real-time paint | Assign key to each beat as cursor passes during drag |
| **Chart import** | Required | Export/import beat map AND chart together as one "level" |
| **Chart style** | DDR or Guitar Hero (strict) | Charts authored for one style, style filters available keys |
| **KeyLane views** | Core feature | DDR (4 lanes) and Guitar Hero (5 lanes) visualizations |
| **Style-guided input** | Both inputs always work | Chart style indicates which keys have notes, but both work |
| **Arrow key scroll** | Always blocked | Arrow keys always captured for input, page scroll blocked |
| **Spacebar** | Tap only | Spacebar triggers tap, not key input |
| **KeyPalette filtering** | Filter by chartStyle | DDR shows arrows only, Guitar Hero shows numbers only |
| **KeyLane scroll speed** | Fixed | No adjustable speed |
| **KeyLane unbeats** | Show in all lanes | Beats without required keys appear in every lane |
| **KeyLane colors** | Classic game colors | DDR: left=blue, down=green, up=red, right=purple. Guitar Hero: green, red, yellow, blue, orange |
| **Default chart style** | DDR | When starting new chart |
| **Beat stream mode** | Subdivided only | Required keys ONLY work with subdivided beat mode (pre-determined rhythm phrases) |
| **Subdivided beats** | Same as any beat | Subdivided beats ARE beats - every beat can have required key |
| **Store design** | Same store | Add chart state to beatDetectionStore, not separate store |
| **Mobile support** | Desktop only | No touch support for chart editing |
| **Testing priority** | Core first | Test core functionality first, add edge cases later |
| **Keyboard listener** | Global | Active on entire page when practice mode active |
| **Chart editor files** | Single file | Keep all chart-related code in one component file |
| **AudioId mismatch** | Require exact match | Block import if audioId doesn't match |
| **Practice without chart** | Allow | Charts are optional, practice works with quarter note stream |
| **Chart import validation** | Fail on mismatch | Beat counts must match, export/import together as one unit |

---

## Phase 1: Type System Updates

### Task 1.1: Update ExtendedBeatAccuracy Type
- [x] Add `'wrongKey'` to `ExtendedBeatAccuracy` type in [src/types/index.ts](src/types/index.ts)
  ```typescript
  export type ExtendedBeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey';
  ```
**Status:** Already complete - type was previously defined with 'wrongKey' included.

### Task 1.2: Update ExtendedButtonPressResult Interface
- [x] Add `keyMatch: boolean` property
- [x] Add `pressedKey?: string` property
- [x] Add `requiredKey?: string` property
- [x] Update JSDoc to explain the new fields
**Status:** Complete - Added key matching fields with comprehensive JSDoc comments.

### Task 1.3: Re-export Engine Types and Helpers
- [x] Re-export `BeatAccuracy` (now includes 'wrongKey') from engine
- [x] Re-export `KeyAssignableBeatMap`, `KeyAssignment` types from engine
- [x] Re-export helper functions from `beatKeyHelpers.ts`:
  - `assignKeyToBeat`
  - `assignKeysToBeats`
  - `extractKeyMap`
  - `clearAllKeys`
  - `hasRequiredKeys`
  - `getKeyCount`
  - `getUsedKeys`
**Status:** Complete - All types and helper functions re-exported from playlist-data-engine.

### Task 1.4: Add Chart-Related Types
- [x] Create `ChartStyle` type: `'ddr' | 'guitar-hero'`
- [x] Create `ChartEditorMode` type: `'view' | 'paint' | 'erase'`
- [x] Create `ChartEditorTool` type: `'paint' | 'erase' | 'clear-all'`
- [x] Create `SupportedKey` type: `'up' | 'down' | 'left' | 'right' | '1' | '2' | '3' | '4' | '5'`
- [x] Create `DdrKey` type: `'up' | 'down' | 'left' | 'right'`
- [x] Create `GuitarKey` type: `'1' | '2' | '3' | '4' | '5'`
- [x] Create `ChartEditorState` interface for managing editor state
- [x] Create `KeyLaneViewMode` type: `'off' | 'ddr' | 'guitar-hero'`
**Status:** Complete - Added all chart-related types in [src/types/index.ts](src/types/index.ts):
- `ChartStyle`, `ChartEditorMode`, `ChartEditorTool`, `SupportedKey`, `DdrKey`, `GuitarKey`, `KeyLaneViewMode` types
- `ChartEditorState` interface with all required fields
- `DEFAULT_CHART_EDITOR_STATE` constant for initialization
- Helper constants: `DDR_KEYS`, `GUITAR_KEYS`
- Helper functions: `isDdrKey()`, `isGuitarKey()`, `getKeysForStyle()`, `getKeySymbol()`

### Task 1.5: Add Level Import/Export Types
- [ ] Create `LevelExportData` interface for complete level export (beat map + chart together):
  ```typescript
  interface LevelExportData {
    version: 1;
    audioId: string;
    audioTitle?: string;
    exportedAt: number;
    // Beat map data
    beatCount: number;
    beats: Array<{
      timestamp: number;
      beatInMeasure: number;
      isDownbeat: boolean;
      measureNumber: number;
      intensity: number;
      confidence: number;
      requiredKey?: string; // Key assignment
    }>;
    // Subdivision config (required keys only work with subdivided mode)
    subdivisionConfig: SubdivisionConfig;
    // Chart metadata
    chartStyle: ChartStyle; // 'ddr' | 'guitar-hero'
    metadata: {
      keyCount: number;
      usedKeys: string[];
    };
  }
  ```

---

## Phase 2: Store Updates (beatDetectionStore)

### Task 2.1: Add Chart Editor State
- [ ] Add `chartEditorActive: boolean` state
- [ ] Add `chartStyle: ChartStyle` state ('ddr' or 'guitar-hero')
- [ ] Add `selectedKey: SupportedKey | null` state (currently selected key for painting)
- [ ] Add `editorMode: ChartEditorMode` state
- [ ] Add `keyLaneViewMode: KeyLaneViewMode` state ('off' | 'ddr' | 'guitar-hero')

### Task 2.2: Add ignoreKeyRequirements to Settings
- [ ] Add `ignoreKeyRequirements: boolean` to difficulty settings state
- [ ] Default to `false` (key requirements enforced)
- [ ] Add `setIgnoreKeyRequirements(boolean)` action

### Task 2.3: Add Chart Editor Actions
- [ ] Add `startChartEditor()` action - only available when subdivided beat map exists
- [ ] Add `stopChartEditor()` action
- [ ] Add `setChartStyle(style: ChartStyle)` action
- [ ] Add `setSelectedKey(key: SupportedKey | null)` action
- [ ] Add `setEditorMode(mode: ChartEditorMode)` action
- [ ] Add `assignKeyToBeat(beatIndex: number, key: string | null)` action
- [ ] Add `assignKeysToBeats(assignments: KeyAssignment[])` action
- [ ] Add `clearAllKeys()` action
- [ ] Add `setKeyLaneViewMode(mode: KeyLaneViewMode)` action

### Task 2.4: Add Chart Statistics Selectors
- [ ] Add `useHasRequiredKeys()` selector (returns boolean)
- [ ] Add `useKeyCount()` selector (returns number of beats with keys)
- [ ] Add `useUsedKeys()` selector (returns array of unique keys used)
- [ ] Add `useKeyMap()` selector (returns Map<number, string>)

### Task 2.5: Add Level Import/Export Actions
- [ ] Add `exportLevel()` action - returns LevelExportData JSON (beat map + chart together)
- [ ] Add `importLevel(data: LevelExportData)` action - validates and applies beat map + key assignments
- [ ] Add validation: audioId must match exactly (block if mismatch)
- [ ] Add validation: beat count must match (fail if mismatch)

---

## Phase 3: Keyboard Input Hook

### Task 3.1: Create useKeyboardInput Hook
Create new file: [src/hooks/useKeyboardInput.ts](src/hooks/useKeyboardInput.ts)
- [ ] Support arrow keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- [ ] Support number keys: `1`, `2`, `3`, `4`, `5`
- [ ] Map arrow keys to: `'up'`, `'down'`, `'left'`, `'right'`
- [ ] Map number keys to: `'1'`, `'2'`, `'3'`, `'4'`, `'5'`
- [ ] Both input modes active simultaneously
- [ ] Return `pressedKey: string | null` state
- [ ] Return `keyDownList: string[]` (currently held keys)
- [ ] Handle key repeat prevention

### Task 3.2: Add Key Event Handling
- [ ] Listen to `keydown` events for key presses (global listener)
- [ ] Listen to `keyup` events for key releases
- [ ] Always prevent default browser behavior for arrow keys (block page scrolling)
- [ ] Track timing of key press for accuracy checking

### Task 3.3: Export from hooks/index.ts
- [ ] Export `useKeyboardInput` hook
- [ ] Export `SupportedKey` type

---

## Phase 4: Chart Editor UI

### Task 4.1: Create KeyPalette Component
Create new file: [src/components/ui/KeyPalette.tsx](src/components/ui/KeyPalette.tsx)
- [ ] Accept `chartStyle` prop to filter available keys (strict separation)
- [ ] DDR mode: display arrows only (↑↓←→)
- [ ] Guitar Hero mode: display numbers only (1-5)
- [ ] Default style: DDR
- [ ] Highlight currently selected key
- [ ] Click to select key for painting
- [ ] Keyboard shortcuts for quick selection (optional)

### Task 4.2: Create ChartEditor Component
Create new file: [src/components/ui/ChartEditor.tsx](src/components/ui/ChartEditor.tsx)
- [ ] Timeline view with beat markers (fixed view, scroll for navigation)
- [ ] Show required key indicators on beats (using ↑↓←→ and 1-5 symbols)
- [ ] Click beat to assign selected key
- [ ] Click assigned beat to remove key (in erase mode)
- [ ] Drag to paint multiple beats with same key
- [ ] Clear All button to remove all key assignments

### Task 4.3: Create ChartEditorToolbar Component
Create new file: [src/components/ui/ChartEditorToolbar.tsx](src/components/ui/ChartEditorToolbar.tsx)
- [ ] Chart style selector: DDR / Guitar Hero toggle
- [ ] Tool selection: Paint, Erase
- [ ] Clear All button
- [ ] Key palette integration (filtered by chart style)
- [ ] Chart statistics display (key count, keys used)
- [ ] Export Chart button
- [ ] Import Chart button with file picker

### Task 4.4: Integrate Chart Editor into AudioAnalysisTab
- [ ] Add "Chart Editor" collapsible section (like subdivision settings)
- [ ] Only show when subdivided beat map exists (required keys only work with subdivided mode)
- [ ] Pass beat map to ChartEditor component
- [ ] Handle chart export/import via store actions

---

## Phase 5: Practice Mode Key Support

### Task 5.1: Update BeatPracticeView for Key Input
- [ ] Integrate `useKeyboardInput` hook
- [ ] Pass `pressedKey` to `checkTap` function
- [ ] Add key indicators showing which keys to press on timeline
- [ ] Practice works without chart (optional) - falls back to quarter note stream

### Task 5.2: Create KeyIndicator Component
Create new file: [src/components/ui/KeyIndicator.tsx](src/components/ui/KeyIndicator.tsx)
- [ ] Display required keys on timeline beat markers (↑↓←→ and 1-5)
- [ ] Visual representation using arrow symbols and numbers
- [ ] Animated key press feedback
- [ ] Show upcoming beat keys in sequence on timeline

### Task 5.3: Update useBeatStream Hook
- [ ] Pass `ignoreKeyRequirements` from store to BeatStream options
- [ ] Update `checkTap` to accept optional `pressedKey` parameter
- [ ] Handle `wrongKey` accuracy result
- [ ] Include key info in ExtendedButtonPressResult

---

## Phase 6: Visual Feedback Updates

### Task 6.1: Update TapArea for wrongKey Feedback
- [ ] Add "WRONG KEY" text overlay message
- [ ] Use red color for wrong key feedback (keep existing color scheme)
- [ ] Show which key was pressed vs required
- [ ] Update `getAccuracyColorVar()` to handle 'wrongKey' (use red)
- [ ] Update `getAccuracyText()` for 'wrongKey' (return "WRONG KEY")

### Task 6.2: Update BeatTimeline for Key Display
- [ ] Show required key indicator on beat markers (↑↓←→ and 1-5)
- [ ] Display key icon/text on beats with required keys
- [ ] Update beat marker styling for chart mode

### Task 6.3: Update TapStats for Key Statistics
- [ ] Add "Wrong Keys" count to statistics
- [ ] Wrong key counts as miss for scoring purposes

### Task 6.4: Add CSS Variables for wrongKey
- [ ] Add `--tap-wrong-key` color variable (red)
- [ ] Add `--key-indicator-up`, `--key-indicator-down`, `--key-indicator-left`, `--key-indicator-right`
- [ ] Add `--key-indicator-1` through `--key-indicator-5`
- [ ] Add animation keyframes for key press feedback
- [ ] Add "WRONG KEY" text overlay styling

---

## Phase 7: Difficulty Settings Integration

### Task 7.1: Add ignoreKeyRequirements Toggle
Update [src/components/ui/DifficultySettingsPanel.tsx](src/components/ui/DifficultySettingsPanel.tsx)
- [ ] Add "Key Requirements" section
- [ ] Add toggle switch for "Ignore Key Requirements" (manual, not auto-enabled)
- [ ] Show description: "Easy mode - timing only, no key matching required"
- [ ] Connect to store via `useBeatDetectionStore`

### Task 7.2: Update Store Selectors
- [ ] Add `useIgnoreKeyRequirements()` selector
- [ ] Pass setting to useBeatStream hook

---

## Phase 8: Chart Import/Export

### Task 8.1: Update Beat Map Export
Update `handleExportBeatMap` in [src/components/Tabs/AudioAnalysisTab.tsx](src/components/Tabs/AudioAnalysisTab.tsx)
- [ ] Include `requiredKey` in beat export data
- [ ] Add chart metadata (key count, keys used, chart style)
- [ ] Export format includes complete "level" data (beat map + chart together)

### Task 8.2: Implement Level Export
- [ ] Create `exportLevel()` function that exports beat map AND chart together
- [ ] Include subdivision config in export (since required keys only work with subdivided mode)
- [ ] Format as JSON with all beat data including requiredKey assignments
- [ ] Trigger file download with descriptive filename (audioId + timestamp)
- [ ] Include metadata: version, audioId, beatCount, subdivisionType, chartStyle, keyCount, usedKeys

### Task 8.3: Implement Level Import
- [ ] Create `importLevel()` function
- [ ] File picker for selecting JSON file
- [ ] Validate JSON structure (beat map + chart data)
- [ ] Require exact audioId match (block import if mismatch)
- [ ] Validate beat count matches (fail if mismatch - they're exported together)
- [ ] Apply beat map and key assignments together
- [ ] Show success/error feedback to user

### Task 8.4: Import/Export UI
- [ ] Add "Export Level" button to ChartEditorToolbar (exports beat map + chart)
- [ ] Add "Import Level" button with file picker
- [ ] Show validation errors in modal/toast
- [ ] Require exact audioId match (no warning, just block if mismatch)

---

## Phase 9: Testing (Core First)

### Task 9.1: Unit Tests for Types
- [ ] Test `ExtendedBeatAccuracy` includes 'wrongKey'
- [ ] Test `ExtendedButtonPressResult` with key fields
- [ ] Test helper function re-exports
- [ ] Test `LevelExportData` type validation

### Task 9.2: Unit Tests for useKeyboardInput
- [ ] Test arrow key mapping
- [ ] Test number key mapping
- [ ] Test key repeat prevention
- [ ] Test multiple key tracking
- [ ] Test scroll blocking

### Task 9.3: Unit Tests for Chart Editor Store
- [ ] Test key assignment actions
- [ ] Test bulk assignment
- [ ] Test clear all keys
- [ ] Test statistics selectors
- [ ] Test level export/import actions

### Task 9.4: Integration Tests
- [ ] Test chart editor workflow (subdivided mode only)
- [ ] Test practice mode with required keys
- [ ] Test wrong key feedback (red with overlay)
- [ ] Test ignore key requirements toggle
- [ ] Test level export/import round-trip
- [ ] Test practice without chart (falls back to quarter note stream)

---

## Dependencies

### Prerequisites
- **playlist-data-engine** must have `required-keys-implementation-plan.md` complete
- All engine types and helpers must be exported from `playlist-data-engine`

### Internal Dependencies
- Phase 1 (Types) → All other phases
- Phase 2 (Store) → Phase 4, 5, 6, 7, 10
- Phase 3 (Keyboard Hook) → Phase 5
- Phase 4 (Chart Editor) → Phase 8 (subdivided beat map required)
- Phase 5 (Practice Mode) → Phase 6, 7, 10
- Phase 6 (Visual Feedback) → Phase 5
- Phase 7 (Difficulty Settings) → Phase 5
- Phase 8 (Import/Export) → Phase 1, 2, 4
- Phase 9 (Testing) → All phases
- Phase 10 (KeyLane Views) → Phase 1, 2, 5

---

## Questions/Unknowns

### Resolved During Planning
- ~~Input methods~~ → Arrow keys + number keys 1-5, both always active
- ~~Wrong key feedback style~~ → Red with "WRONG KEY" text overlay
- ~~Easy mode toggle location~~ → In DifficultySettingsPanel as manual toggle
- ~~Pattern tools~~ → Manual only, no auto-patterns
- ~~Visual style~~ → TapArea + key indicators + KeyLane views (core feature)
- ~~Chart style~~ → DDR (4 arrows) or Guitar Hero (5 numbers), strict separation, filters KeyPalette
- ~~Undo/redo~~ → Out of scope for initial implementation
- ~~Chart storage~~ → In-memory + export only, keep in memory on exit
- ~~Wrong key scoring~~ → Counts as miss for scoring
- ~~Timeline zoom~~ → No zoom, fixed view with scroll
- ~~Key indicators scope~~ → Show all visible beats on timeline
- ~~Statistics~~ → Wrong key count only
- ~~Chart import~~ → Export/import beat map AND chart together as "level", require exact audioId match
- ~~Drag paint~~ → Real-time paint (assign as cursor passes)
- ~~Arrow key scroll~~ → Always blocked during practice mode
- ~~KeyLane views~~ → Core feature, not optional
- ~~KeyLane scroll speed~~ → Fixed speed
- ~~Beats without required key~~ → Show in all lanes (hittable with any key)
- ~~Default chart style~~ → DDR
- ~~Beat stream mode~~ → Subdivided only (required keys only work with subdivided mode)
- ~~Mobile support~~ → Desktop only for chart editing

### To Resolve During Implementation
- [ ] Should we support custom key mappings? (Out of scope for initial implementation)
- [ ] Multi-key beats (simultaneous presses)? (Out of scope - engine doesn't support yet)
- [ ] Hold notes? (Out of scope - engine doesn't support yet)

---

## Success Criteria

### Type System
- [ ] `ExtendedBeatAccuracy` includes `'wrongKey'`
- [ ] `ExtendedButtonPressResult` includes `keyMatch`, `pressedKey`, `requiredKey`
- [ ] All engine helper functions re-exported and usable
- [ ] `LevelExportData` type defined and validated

### Chart Editor
- [ ] Can assign keys to beats via click/drag (real-time paint)
- [ ] Can remove keys from beats via erase mode
- [ ] Clear All button removes all key assignments
- [ ] Only available when subdivided beat map exists
- [ ] KeyPalette filters by chartStyle (DDR shows arrows, Guitar Hero shows numbers)
- [ ] Export creates valid JSON file with complete level data (beat map + chart)
- [ ] Import loads level data and applies to beat map
- [ ] Import requires exact audioId match

### Practice Mode
- [ ] Keyboard input captured and passed to beat stream
- [ ] Both arrow keys and number keys work simultaneously
- [ ] Arrow key page scrolling blocked during practice
- [ ] Required keys displayed on timeline beat markers
- [ ] Wrong key press shows red "WRONG KEY" overlay
- [ ] `ignoreKeyRequirements` toggle works correctly
- [ ] Practice works without chart (falls back to quarter note stream)

### Visual Feedback
- [ ] "WRONG KEY" message displays with red styling
- [ ] Beat timeline shows required key indicators (↑↓←→ and 1-5)
- [ ] Statistics include wrong key count

### KeyLane Views
- [ ] DDR mode shows 4 lanes with classic colors (left=blue, down=green, up=red, right=purple)
- [ ] Guitar Hero mode shows 5 lanes with classic colors (green, red, yellow, blue, orange)
- [ ] Beats without required key show in all lanes
- [ ] Fixed scroll speed
- [ ] Pause/resume pauses lane animations

---

## Phase 10: KeyLane Views (Core Rhythm Game Visualization)

This phase adds authentic rhythm game visualizations as an alternative to the default TapArea view.

### Task 10.1: Create KeyLane Component
Create new file: [src/components/ui/KeyLane.tsx](src/components/ui/KeyLane.tsx)
- [ ] Single lane component (reusable for both styles)
- [ ] Accept `laneKey` prop (which key this lane represents)
- [ ] Accept `beats` prop (beats assigned to this lane, with timestamps)
- [ ] Render beat markers scrolling through the lane
- [ ] Hit zone indicator at the bottom
- [ ] Visual feedback on hit/miss (flash, particle effects)
- [ ] CSS animations for smooth scrolling

### Task 10.2: Create KeyLaneView Container
Create new file: [src/components/ui/KeyLaneView.tsx](src/components/ui/KeyLaneView.tsx)
- [ ] DDR mode: 4 lanes (left, down, up, right)
- [ ] Guitar Hero mode: 5 lanes (1, 2, 3, 4, 5)
- [ ] Filter beats by requiredKey to appropriate lanes
- [ ] Beats without required key: show in ALL lanes (player can hit any key)
- [ ] Sync with audio playback position
- [ ] Show beat markers approaching hit zone
- [ ] Handle beat visibility window (beats too far ahead/behind not rendered)
- [ ] Responsive sizing for different screen widths

### Task 10.3: Create View Mode Toggle
- [ ] Add toggle in BeatPracticeView: TapArea / DDR Lanes / Guitar Hero Lanes
- [ ] Persist preference to store (`keyLaneViewMode`)
- [ ] Auto-select matching view when chart has style
- [ ] Show empty state if viewing "wrong" style (e.g., DDR lanes for Guitar Hero chart)

### Task 10.4: Integrate KeyLaneView with Practice Mode
- [ ] Add KeyLaneView as alternative to TapArea in BeatPracticeView
- [ ] Pass beat stream data (upcoming beats, current time)
- [ ] Handle key press feedback in lanes
- [ ] Show accuracy feedback (perfect/great/good/ok/miss/wrongKey)
- [ ] Sync visual state with audio sync state

### Task 10.5: Add KeyLane CSS and Animations
Create new file: [src/components/ui/KeyLane.css](src/components/ui/KeyLane.css)
- [ ] Lane styling (background, borders, spacing)
- [ ] Beat marker styling (circles/arrows/numbers)
- [ ] Hit zone styling (glowing target area)
- [ ] Scroll animation (beats moving toward hit zone) - fixed scroll speed
- [ ] Hit feedback animations (burst, flash)
- [ ] DDR-specific colors per lane: left=blue, down=green, up=red, right=purple
- [ ] Guitar Hero colors per lane: green, red, yellow, blue, orange (classic 5-color scheme)

### Task 10.6: Handle Edge Cases
- [ ] Empty chart: show "No notes" message in lanes
- [ ] Style mismatch: show hint to switch view mode
- [ ] Beat with no required key: show in ALL lanes (hittable with any key)
- [ ] Pause/resume: pause lane animations

---

## Future Considerations (Out of Scope)

- **Undo/Redo** - Essential for editing, add in follow-up phase
- **Custom Key Bindings** - Allow users to remap keys
- **Pattern Tools** - Auto-assign patterns like "alternate", "random", "cascade"
- **Multi-key Beats** - Beats requiring simultaneous key presses
- **Hold Notes** - Beats requiring held keys
- **Per-Key Statistics** - Accuracy breakdown by key type
- **Combo System** - Track combos, wrongKey breaks combo
- **Gamepad Support** - Controller input beyond keyboard
- **Chart Sharing** - Cloud storage/sharing for levels
- **Adjustable Scroll Speed** - Let users adjust KeyLane scroll speed
- **Note Skins** - Custom visual themes for beat markers
- **Mobile Touch Support** - Touch interactions for chart editing
