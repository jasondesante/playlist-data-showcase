# Required Keys Frontend Integration - Implementation Plan

## Overview

This plan integrates the Required Keys feature from `playlist-data-engine` into the `playlist-data-showcase` frontend. The feature enables rhythm game chart creation (like Guitar Hero/DDR) where specific keys must be pressed for specific beats.

### Key Features
- **Full Chart Editor** - UI for assigning keys to beats in a timeline
- **Dual Input Support** - DDR style (arrow keys) + Guitar Hero style (number keys 1-5), both always active
- **Wrong Key Feedback** - Distinct visual feedback for wrong key presses (counts as miss for scoring)
- **Easy Mode Toggle** - Manual option to ignore key requirements in difficulty settings
- **Chart Import/Export** - Save and load charts via JSON files

### Data Engine Dependencies
This plan assumes the data engine has completed `required-keys-implementation-plan.md`:
- `requiredKey?: string` on Beat interface
- `'wrongKey'` accuracy type in BeatAccuracy
- `keyMatch`, `pressedKey`, `requiredKey` fields on ButtonPressResult
- `ignoreKeyRequirements` option in BeatStreamOptions
- Helper functions: `assignKeyToBeat`, `assignKeysToBeats`, `extractKeyMap`, `clearAllKeys`, `hasRequiredKeys`, `getKeyCount`, `getUsedKeys`

---

## Design Decisions

The following decisions were made during planning:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Pattern tools** | Manual only | Keep initial implementation simple |
| **Input modes** | Both always active | Arrow keys + number keys work simultaneously |
| **Visual style** | TapArea + indicators + KeyLane views | KeyLane is optional, TapArea is default |
| **Undo/redo** | Out of scope | Future consideration |
| **Chart storage** | In-memory + export only | No localStorage persistence |
| **Wrong key scoring** | Counts as miss | Tracked separately for display but scores as miss |
| **Easy mode** | Manual toggle | In DifficultySettingsPanel, not auto-enabled |
| **Editor location** | AudioAnalysisTab section | Collapsible, like SubdivisionSettings |
| **Clear tool** | Clear All button | Separate button, not just erase mode |
| **Key display** | Arrows (↑↓←→) + Numbers (1-5) | Visual symbols, not words |
| **Unsaved warning** | None | Charts are temporary until exported |
| **Statistics** | Wrong key count only | Per-key accuracy is future scope |
| **Timeline zoom** | No zoom | Fixed view with scroll |
| **Key indicators** | All visible beats | Show required keys for all beats in view |
| **Drag paint** | Included | Drag to assign same key to multiple beats |
| **Chart import** | Required | Essential since export is only persistence |
| **Chart style** | DDR or Guitar Hero | Charts are authored for one style, guides editing/viewing |
| **KeyLane views** | Optional Phase 10 | DDR (4 lanes) and Guitar Hero (5 lanes) visualizations |
| **Style-guided input** | Both inputs always work | Chart style indicates which keys have notes, but both work |

---

## Phase 1: Type System Updates

### Task 1.1: Update ExtendedBeatAccuracy Type
- [ ] Add `'wrongKey'` to `ExtendedBeatAccuracy` type in [src/types/index.ts](src/types/index.ts)
  ```typescript
  export type ExtendedBeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey';
  ```

### Task 1.2: Update ExtendedButtonPressResult Interface
- [ ] Add `keyMatch: boolean` property
- [ ] Add `pressedKey?: string` property
- [ ] Add `requiredKey?: string` property
- [ ] Update JSDoc to explain the new fields

### Task 1.3: Re-export Engine Types and Helpers
- [ ] Re-export `BeatAccuracy` (now includes 'wrongKey') from engine
- [ ] Re-export `KeyAssignableBeatMap`, `KeyAssignment` types from engine
- [ ] Re-export helper functions from `beatKeyHelpers.ts`:
  - `assignKeyToBeat`
  - `assignKeysToBeats`
  - `extractKeyMap`
  - `clearAllKeys`
  - `hasRequiredKeys`
  - `getKeyCount`
  - `getUsedKeys`

### Task 1.4: Add Chart-Related Types
- [ ] Create `ChartStyle` type: `'ddr' | 'guitar-hero'`
- [ ] Create `ChartEditorMode` type: `'view' | 'paint' | 'erase'`
- [ ] Create `ChartEditorTool` type: `'paint' | 'erase' | 'clear-all'`
- [ ] Create `SupportedKey` type: `'up' | 'down' | 'left' | 'right' | '1' | '2' | '3' | '4' | '5'`
- [ ] Create `DdrKey` type: `'up' | 'down' | 'left' | 'right'`
- [ ] Create `GuitarKey` type: `'1' | '2' | '3' | '4' | '5'`
- [ ] Create `ChartEditorState` interface for managing editor state
- [ ] Create `KeyLaneViewMode` type: `'off' | 'ddr' | 'guitar-hero'`

### Task 1.5: Add Chart Import/Export Types
- [ ] Create `ChartExportData` interface for chart-only export format:
  ```typescript
  interface ChartExportData {
    version: 1;
    audioId: string;
    audioTitle?: string;
    exportedAt: number;
    beatCount: number;
    chartStyle: ChartStyle; // 'ddr' | 'guitar-hero'
    keyMap: Record<number, string>; // beatIndex -> requiredKey
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
- [ ] Add `startChartEditor()` action
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

### Task 2.5: Add Chart Import/Export Actions
- [ ] Add `exportChart()` action - returns ChartExportData JSON
- [ ] Add `importChart(data: ChartExportData)` action - validates and applies key assignments
- [ ] Add validation: beat count must match, audioId should match (warning if not)

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
- [ ] Listen to `keydown` events for key presses
- [ ] Listen to `keyup` events for key releases
- [ ] Prevent default browser behavior for arrow keys (scrolling)
- [ ] Track timing of key press for accuracy checking

### Task 3.3: Export from hooks/index.ts
- [ ] Export `useKeyboardInput` hook
- [ ] Export `SupportedKey` type

---

## Phase 4: Chart Editor UI

### Task 4.1: Create KeyPalette Component
Create new file: [src/components/ui/KeyPalette.tsx](src/components/ui/KeyPalette.tsx)
- [ ] Accept `chartStyle` prop to filter available keys
- [ ] DDR mode: display arrows only (↑↓←→)
- [ ] Guitar Hero mode: display numbers only (1-5)
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
- [ ] Show when beat map exists and beat mode is selected
- [ ] Pass beat map to ChartEditor component
- [ ] Handle chart export/import via store actions

---

## Phase 5: Practice Mode Key Support

### Task 5.1: Update BeatPracticeView for Key Input
- [ ] Integrate `useKeyboardInput` hook
- [ ] Pass `pressedKey` to `checkTap` function
- [ ] Add key indicators showing which keys to press

### Task 5.2: Create KeyIndicator Component
Create new file: [src/components/ui/KeyIndicator.tsx](src/components/ui/KeyIndicator.tsx)
- [ ] Display required keys for ALL visible upcoming beats
- [ ] Visual representation using arrow symbols (↑↓←→) and numbers (1-5)
- [ ] Animated key press feedback
- [ ] Show upcoming beat keys in sequence

### Task 5.3: Update useBeatStream Hook
- [ ] Pass `ignoreKeyRequirements` from store to BeatStream options
- [ ] Update `checkTap` to accept optional `pressedKey` parameter
- [ ] Handle `wrongKey` accuracy result
- [ ] Include key info in ExtendedButtonPressResult

---

## Phase 6: Visual Feedback Updates

### Task 6.1: Update TapArea for wrongKey Feedback
- [ ] Add distinct "WRONG KEY" message styling
- [ ] Use orange/purple color for wrong key feedback
- [ ] Show which key was pressed vs required
- [ ] Update `getAccuracyColorVar()` to handle 'wrongKey'
- [ ] Update `getAccuracyText()` for 'wrongKey'

### Task 6.2: Update BeatTimeline for Key Display
- [ ] Show required key indicator on beat markers (↑↓←→ and 1-5)
- [ ] Display key icon/text on beats with required keys
- [ ] Update beat marker styling for chart mode

### Task 6.3: Update TapStats for Key Statistics
- [ ] Add "Wrong Keys" count to statistics
- [ ] Wrong key counts as miss for scoring purposes

### Task 6.4: Add CSS Variables for wrongKey
- [ ] Add `--tap-wrong-key` color variable
- [ ] Add `--key-indicator-up`, `--key-indicator-down`, `--key-indicator-left`, `--key-indicator-right`
- [ ] Add `--key-indicator-1` through `--key-indicator-5`
- [ ] Add animation keyframes for key press feedback

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
- [ ] Add chart metadata (key count, keys used)
- [ ] Export format compatible with import

### Task 8.2: Implement Chart-Only Export
- [ ] Create `exportChart()` function using `extractKeyMap` helper
- [ ] Format as `ChartExportData` JSON
- [ ] Trigger file download with descriptive filename (audioId + timestamp)
- [ ] Include metadata: version, audioId, beatCount, keyCount, usedKeys

### Task 8.3: Implement Chart Import
- [ ] Create `importChart()` function
- [ ] File picker for selecting JSON file
- [ ] Validate JSON structure matches `ChartExportData` format
- [ ] Validate beat count matches current beat map (error if mismatch)
- [ ] Warn if audioId doesn't match (allow user to proceed)
- [ ] Apply key assignments using `assignKeysToBeats` helper
- [ ] Show success/error feedback to user

### Task 8.4: Import/Export UI
- [ ] Add "Export Chart" button to ChartEditorToolbar
- [ ] Add "Import Chart" button with file picker
- [ ] Show validation errors in modal/toast
- [ ] Show audioId mismatch warning with continue/cancel options

---

## Phase 9: Testing

### Task 9.1: Unit Tests for Types
- [ ] Test `ExtendedBeatAccuracy` includes 'wrongKey'
- [ ] Test `ExtendedButtonPressResult` with key fields
- [ ] Test helper function re-exports
- [ ] Test `ChartExportData` type validation

### Task 9.2: Unit Tests for useKeyboardInput
- [ ] Test arrow key mapping
- [ ] Test number key mapping
- [ ] Test key repeat prevention
- [ ] Test multiple key tracking

### Task 9.3: Unit Tests for Chart Editor Store
- [ ] Test key assignment actions
- [ ] Test bulk assignment
- [ ] Test clear all keys
- [ ] Test statistics selectors
- [ ] Test export/import actions

### Task 9.4: Integration Tests
- [ ] Test chart editor workflow
- [ ] Test practice mode with required keys
- [ ] Test wrong key feedback
- [ ] Test ignore key requirements toggle
- [ ] Test chart export/import round-trip

---

## Dependencies

### Prerequisites
- **playlist-data-engine** must have `required-keys-implementation-plan.md` complete
- All engine types and helpers must be exported from `playlist-data-engine`

### Internal Dependencies
- Phase 1 (Types) → All other phases
- Phase 2 (Store) → Phase 4, 5, 6, 7
- Phase 3 (Keyboard Hook) → Phase 5
- Phase 4 (Chart Editor) → Phase 8
- Phase 5 (Practice Mode) → Phase 6, 7
- Phase 6 (Visual Feedback) → Phase 5
- Phase 7 (Difficulty Settings) → Phase 5
- Phase 8 (Import/Export) → Phase 1, 2, 4

---

## Questions/Unknowns

### Resolved During Planning
- ~~Input methods~~ → Arrow keys + number keys 1-5, both always active
- ~~Wrong key feedback style~~ → Distinct "WRONG KEY" message with orange/purple color
- ~~Easy mode toggle location~~ → In DifficultySettingsPanel as manual toggle
- ~~Pattern tools~~ → Manual only, no auto-patterns
- ~~Visual style~~ → TapArea + key indicators (default), KeyLane views (optional Phase 10)
- ~~Chart style~~ → DDR (4 arrows) or Guitar Hero (5 numbers), guides editing and viewing
- ~~Undo/redo~~ → Out of scope for initial implementation
- ~~Chart storage~~ → In-memory + export only, no localStorage
- ~~Wrong key scoring~~ → Counts as miss for scoring
- ~~Timeline zoom~~ → No zoom, fixed view with scroll
- ~~Key indicators scope~~ → Show all visible beats
- ~~Statistics~~ → Wrong key count only
- ~~Chart import~~ → Required since export is only persistence

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
- [ ] `ChartExportData` type defined and validated

### Chart Editor
- [ ] Can assign keys to beats via click/drag
- [ ] Can remove keys from beats via erase mode
- [ ] Clear All button removes all key assignments
- [ ] Export creates valid JSON file with chart data
- [ ] Import loads chart data and applies to beat map
- [ ] Import validates beat count and warns on audioId mismatch

### Practice Mode
- [ ] Keyboard input captured and passed to beat stream
- [ ] Both arrow keys and number keys work simultaneously
- [ ] Required keys displayed for all visible beats
- [ ] Wrong key press shows distinct feedback
- [ ] `ignoreKeyRequirements` toggle works correctly

### Visual Feedback
- [ ] "WRONG KEY" message displays with distinct styling
- [ ] Beat timeline shows required key indicators (↑↓←→ and 1-5)
- [ ] Statistics include wrong key count

---

## Phase 10: KeyLane Views (Optional Rhythm Game Visualization)

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
- [ ] Sync with audio playback position
- [ ] Show beat markers approaching hit zone
- [ ] Handle beat visibility window (beats too far ahead/behind not rendered)
- [ ] Responsive sizing for different screen widths

### Task 10.3: Create View Mode Toggle
- [ ] Add toggle in BeatPracticeView: TapArea / DDR Lanes / Guitar Hero Lanes
- [ ] Persist preference to store (`keyLaneViewMode`)
- [ ] Auto-select matching view when chart has style (optional hint)
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
- [ ] Scroll animation (beats moving toward hit zone)
- [ ] Hit feedback animations (burst, flash)
- [ ] DDR-specific colors per lane (left=blue, down=green, up=red, right=purple)
- [ ] Guitar Hero colors per lane (classic 5-color scheme)

### Task 10.6: Handle Edge Cases
- [ ] Empty chart: show "No notes" message in lanes
- [ ] Style mismatch: show hint to switch view mode
- [ ] Beat with no required key: don't show in any lane
- [ ] Very fast BPM: adjust scroll speed proportionally
- [ ] Pause/resume: pause lane animations

---

## Dependencies

### Prerequisites
- **playlist-data-engine** must have `required-keys-implementation-plan.md` complete
- All engine types and helpers must be exported from `playlist-data-engine`

### Internal Dependencies
- Phase 1 (Types) → All other phases
- Phase 2 (Store) → Phase 4, 5, 6, 7, 10
- Phase 3 (Keyboard Hook) → Phase 5
- Phase 4 (Chart Editor) → Phase 8
- Phase 5 (Practice Mode) → Phase 6, 7, 10
- Phase 6 (Visual Feedback) → Phase 5
- Phase 7 (Difficulty Settings) → Phase 5
- Phase 8 (Import/Export) → Phase 1, 2, 4
- Phase 10 (KeyLane Views) → Phase 1, 2, 5

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
- **Chart Sharing** - Cloud storage/sharing for charts
- **Scroll Speed Settings** - Let users adjust KeyLane scroll speed
- **Note Skins** - Custom visual themes for beat markers
