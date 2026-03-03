# Required Keys Frontend Integration - Implementation Plan

## Overview

This plan integrates the Required Keys feature from `playlist-data-engine` into the `playlist-data-showcase` frontend. The feature enables rhythm game chart creation (like Guitar Hero/DDR) where specific keys must be pressed for specific beats.

### Key Features
- **Full Chart Editor** - UI for assigning keys to beats in a timeline
- **Dual Input Support** - DDR style (arrow keys) + Guitar Hero style (number keys 1-5)
- **Wrong Key Feedback** - Distinct visual feedback for wrong key presses
- **Easy Mode Toggle** - Option to ignore key requirements in difficulty settings

### Data Engine Dependencies
This plan assumes the data engine has completed `required-keys-implementation-plan.md`:
- `requiredKey?: string` on Beat interface
- `'wrongKey'` accuracy type in BeatAccuracy
- `keyMatch`, `pressedKey`, `requiredKey` fields on ButtonPressResult
- `ignoreKeyRequirements` option in BeatStreamOptions
- Helper functions: `assignKeyToBeat`, `assignKeysToBeats`, `extractKeyMap`, `clearAllKeys`, `hasRequiredKeys`, `getKeyCount`, `getUsedKeys`

---

## Phase 1: Type System Updates

### Task 1.1: Update ExtendedBeatAccuracy Type
- [x] Add `'wrongKey'` to `ExtendedBeatAccuracy` type in [src/types/index.ts](src/types/index.ts)
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
- [ ] Create `ChartEditorMode` type: `'view' | 'paint' | 'erase'`
- [ ] Create `ChartEditorTool` type: `'select' | 'paint' | 'erase' | 'clear-all'`
- [ ] Create `SupportedKey` type: `'up' | 'down' | 'left' | 'right' | '1' | '2' | '3' | '4' | '5'`
- [ ] Create `ChartEditorState` interface for managing editor state

---

## Phase 2: Store Updates (beatDetectionStore)

### Task 2.1: Add Chart Editor State
- [ ] Add `chartEditorActive: boolean` state
- [ ] Add `selectedKey: SupportedKey | null` state (currently selected key for painting)
- [ ] Add `editorMode: ChartEditorMode` state
- [ ] Add `chartModified: boolean` state (track unsaved changes)

### Task 2.2: Add ignoreKeyRequirements to Settings
- [ ] Add `ignoreKeyRequirements: boolean` to difficulty settings state
- [ ] Default to `false` (key requirements enforced)
- [ ] Add `setIgnoreKeyRequirements(boolean)` action

### Task 2.3: Add Chart Editor Actions
- [ ] Add `startChartEditor()` action
- [ ] Add `stopChartEditor()` action
- [ ] Add `setSelectedKey(key: SupportedKey | null)` action
- [ ] Add `setEditorMode(mode: ChartEditorMode)` action
- [ ] Add `assignKeyToBeat(beatIndex: number, key: string | null)` action
- [ ] Add `assignKeysToBeats(assignments: KeyAssignment[])` action
- [ ] Add `clearAllKeys()` action
- [ ] Add `saveChart()` action (persist to beat map)

### Task 2.4: Add Chart Statistics Selectors
- [ ] Add `useHasRequiredKeys()` selector (returns boolean)
- [ ] Add `useKeyCount()` selector (returns number of beats with keys)
- [ ] Add `useUsedKeys()` selector (returns array of unique keys used)
- [ ] Add `useKeyMap()` selector (returns Map<number, string>)

---

## Phase 3: Keyboard Input Hook

### Task 3.1: Create useKeyboardInput Hook
Create new file: [src/hooks/useKeyboardInput.ts](src/hooks/useKeyboardInput.ts)
- [ ] Support arrow keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- [ ] Support number keys: `1`, `2`, `3`, `4`, `5`
- [ ] Map arrow keys to: `'up'`, `'down'`, `'left'`, `'right'`
- [ ] Map number keys to: `'1'`, `'2'`, `'3'`, `'4'`, `'5'`
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
- [ ] Display available keys: arrows (↑↓←→) and numbers (1-5)
- [ ] Highlight currently selected key
- [ ] Visual distinction between DDR and Guitar Hero sections
- [ ] Click to select key for painting
- [ ] Keyboard shortcuts for quick selection

### Task 4.2: Create ChartEditor Component
Create new file: [src/components/ui/ChartEditor.tsx](src/components/ui/ChartEditor.tsx)
- [ ] Timeline view with beat markers
- [ ] Show required key indicators on beats
- [ ] Click beat to assign selected key
- [ ] Click assigned beat to remove key (in erase mode)
- [ ] Drag to paint multiple beats
- [ ] Zoom controls for timeline
- [ ] Undo/redo support (future consideration)

### Task 4.3: Create ChartEditorToolbar Component
Create new file: [src/components/ui/ChartEditorToolbar.tsx](src/components/ui/ChartEditorToolbar.tsx)
- [ ] Tool selection: Paint, Erase, Clear All
- [ ] Key palette integration
- [ ] Chart statistics display (key count, keys used)
- [ ] Save/Export buttons
- [ ] Undo/Redo buttons (optional)

### Task 4.4: Integrate Chart Editor into AudioAnalysisTab
- [ ] Add "Chart Editor" collapsible section (like subdivision settings)
- [ ] Show when beat map exists and beat mode is selected
- [ ] Pass beat map to ChartEditor component
- [ ] Handle chart save/export

---

## Phase 5: Practice Mode Key Support

### Task 5.1: Update BeatPracticeView for Key Input
- [ ] Integrate `useKeyboardInput` hook
- [ ] Pass `pressedKey` to `checkTap` function
- [ ] Handle multiple key zones for visual display
- [ ] Add key indicators showing which keys to press

### Task 5.2: Create KeyIndicator Component
Create new file: [src/components/ui/KeyIndicator.tsx](src/components/ui/KeyIndicator.tsx)
- [ ] Display required key for upcoming beats
- [ ] Visual representation of arrow/number keys
- [ ] Animated key press feedback
- [ ] Support both DDR and Guitar Hero visual styles

### Task 5.3: Create KeyLane Component
Create new file: [src/components/ui/KeyLane.tsx](src/components/ui/KeyLane.tsx)
- [ ] Vertical lane for each key (like Guitar Hero)
- [ ] Beats scroll down lanes
- [ ] Hit zone at bottom
- [ ] Visual feedback on hit/miss

### Task 5.4: Update useBeatStream Hook
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
- [ ] Show required key indicator on beat markers
- [ ] Color-code beats by required key
- [ ] Display key icon/text on beats with required keys
- [ ] Update beat marker styling for chart mode

### Task 6.3: Update TapStats for Key Statistics
- [ ] Add "Wrong Keys" count to statistics
- [ ] Track key accuracy per key type
- [ ] Show key match percentage

### Task 6.4: Add CSS Variables for wrongKey
- [ ] Add `--tap-wrong-key` color variable
- [ ] Add `--key-indicator-up`, `--key-indicator-down`, etc.
- [ ] Add animation keyframes for key press feedback

---

## Phase 7: Difficulty Settings Integration

### Task 7.1: Add ignoreKeyRequirements Toggle
Update [src/components/ui/DifficultySettingsPanel.tsx](src/components/ui/DifficultySettingsPanel.tsx)
- [ ] Add "Key Requirements" section
- [ ] Add toggle switch for "Ignore Key Requirements"
- [ ] Show description: "Easy mode - timing only, no key matching required"
- [ ] Connect to store via `useBeatDetectionStore`

### Task 7.2: Update DifficultySelector
- [ ] Consider auto-enabling `ignoreKeyRequirements` when "Easy" preset selected
- [ ] Add visual indicator when key requirements are disabled

### Task 7.3: Update Store Selectors
- [ ] Add `useIgnoreKeyRequirements()` selector
- [ ] Pass setting to useBeatStream hook

---

## Phase 8: Export and Serialization

### Task 8.1: Update Beat Map Export
Update `handleExportBeatMap` in [src/components/Tabs/AudioAnalysisTab.tsx](src/components/Tabs/AudioAnalysisTab.tsx)
- [ ] Include `requiredKey` in beat export data
- [ ] Add chart metadata (key count, keys used)
- [ ] Export format compatible with future import

### Task 8.2: Add Chart-Only Export
- [ ] Export just the key assignments (lighter weight)
- [ ] Format: `{ audioId, keyMap: { [beatIndex]: key } }`
- [ ] Allow sharing charts between users

### Task 8.3: Add Chart Import (Future Consideration)
- [ ] Design import format
- [ ] Validate imported chart against beat map
- [ ] Handle beat count mismatches

---

## Phase 9: Testing

### Task 9.1: Unit Tests for Types
- [ ] Test `ExtendedBeatAccuracy` includes 'wrongKey'
- [ ] Test `ExtendedButtonPressResult` with key fields
- [ ] Test helper function re-exports

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

### Task 9.4: Integration Tests
- [ ] Test chart editor workflow
- [ ] Test practice mode with required keys
- [ ] Test wrong key feedback
- [ ] Test ignore key requirements toggle

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

---

## Questions/Unknowns

### Resolved During Planning
- ~~Input methods~~ → Arrow keys + number keys 1-5
- ~~Wrong key feedback style~~ → Distinct "WRONG KEY" message with orange/purple color
- ~~Easy mode toggle location~~ → In DifficultySettingsPanel as toggle

### To Resolve During Implementation
- [ ] Should chart editor support undo/redo? (Consider for future)
- [ ] Should we support custom key mappings? (Out of scope for initial implementation)
- [ ] Multi-key beats (simultaneous presses)? (Out of scope - engine doesn't support yet)
- [ ] Hold notes? (Out of scope - engine doesn't support yet)
- [ ] Chart import functionality? (Design in Phase 8, implement later)

---

## Success Criteria

### Type System
- [ ] `ExtendedBeatAccuracy` includes `'wrongKey'`
- [ ] `ExtendedButtonPressResult` includes `keyMatch`, `pressedKey`, `requiredKey`
- [ ] All engine helper functions re-exported and usable

### Chart Editor
- [ ] Can assign keys to beats via click/drag
- [ ] Can remove keys from beats
- [ ] Chart persists with beat map
- [ ] Export includes required key data

### Practice Mode
- [ ] Keyboard input captured and passed to beat stream
- [ ] Required keys displayed during gameplay
- [ ] Wrong key press shows distinct feedback
- [ ] `ignoreKeyRequirements` toggle works correctly

### Visual Feedback
- [ ] "WRONG KEY" message displays with distinct styling
- [ ] Beat timeline shows required key indicators
- [ ] Statistics include wrong key count

---

## Future Considerations (Out of Scope)

- **Custom Key Bindings** - Allow users to remap keys
- **Multi-key Beats** - Beats requiring simultaneous key presses
- **Hold Notes** - Beats requiring held keys
- **Chart Sharing** - Import/export charts separately from audio
- **Chart Patterns** - Auto-assign patterns like "A-B-A-B"
- **Combo System** - Track combos, wrongKey breaks combo
- **Gamepad Support** - Controller input beyond keyboard
