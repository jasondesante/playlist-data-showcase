# Frontend Accuracy Thresholds Implementation Plan

## Overview

Add UI controls to the playlist-data-showcase frontend to allow users to select difficulty presets and configure custom accuracy thresholds for the beat tapping feature. This plan depends on the engine updates from `ACCURACY_THRESHOLDS_PLAN.md`.

## Prerequisites

- [x] Engine plan completed: `playlist-data-engine/docs/plans/ACCURACY_THRESHOLDS_PLAN.md` (Implemented in frontend `src/types/index.ts`)
- [x] Engine updated with new types: `AccuracyThresholds`, `DifficultyPreset` (Implemented in frontend `src/types/index.ts`)
- [x] Engine updated with new constants: `EASY/MEDIUM/HARD_ACCURACY_THRESHOLDS` (Implemented in frontend `src/types/index.ts`)
- [x] Engine updated with `getAccuracyThresholdsForPreset()` function (Implemented in frontend `src/types/index.ts`)
- [x] Engine `BeatStreamOptions` supports `difficultyPreset` and `customThresholds` (Implemented via custom evaluation in `useBeatStream.ts`)

---

## Phase 1: Store Updates

### Task 1.1: Add Difficulty Settings to beatDetectionStore
- [x] Add new state slice in `src/store/beatDetectionStore.ts`
  ```typescript
  interface DifficultySettings {
    /** Current difficulty preset */
    preset: DifficultyPreset;
    /** Custom thresholds (used when preset is 'custom') */
    customThresholds: Partial<AccuracyThresholds>;
  }

  // Add to store state
  interface BeatDetectionState {
    // ... existing state ...
    difficultySettings: DifficultySettings;
  }
  ```

### Task 1.2: Add Difficulty Actions
- [x] Add actions for managing difficulty in `src/store/beatDetectionStore.ts`
  ```typescript
  interface BeatDetectionActions {
    // ... existing actions ...
    setDifficultyPreset: (preset: DifficultyPreset) => void;
    setCustomThreshold: (key: keyof AccuracyThresholds, value: number) => void;
    resetDifficultySettings: () => void;
  }
  ```

### Task 1.3: Add Default State
- [x] Initialize difficulty settings with defaults
  ```typescript
  const DEFAULT_DIFFICULTY_SETTINGS: DifficultySettings = {
    preset: 'medium', // Start with medium as reasonable default
    customThresholds: {},
  };
  ```

---

## Phase 2: Hook Updates

### Task 2.1: Update useBeatStream Hook
- [x] Pass difficulty settings to BeatStream in `src/hooks/useBeatStream.ts` (Implemented via custom evaluation in checkTap)
  ```typescript
  // Get difficulty settings from store
  const difficultySettings = useBeatDetectionStore((state) => state.difficultySettings);

  // Build options for BeatStream
  const streamOptions: BeatStreamOptions = {
      ...DEFAULT_BEAT_STREAM_OPTIONS,
      ...options,
      difficultyPreset: difficultySettings.preset === 'custom'
          ? 'hard' // Base preset when using custom
          : difficultySettings.preset,
      customThresholds: difficultySettings.preset === 'custom'
          ? difficultySettings.customThresholds
          : undefined,
  };
  ```

### Task 2.2: Reinitialize Stream on Difficulty Change
- [x] ~~Add effect to reinitialize BeatStream when difficulty changes~~ (Not needed - thresholds are read dynamically in checkTap)
  ```typescript
  useEffect(() => {
      if (beatStreamRef.current && isActive) {
          // Reinitialize with new thresholds
          initializeStream();
      }
  }, [difficultySettings.preset, difficultySettings.customThresholds]);
  ```

---

## Phase 3: UI Components

### Task 3.1: Create DifficultySelector Component
- [x] Create `src/components/ui/DifficultySelector.tsx`
  ```typescript
  interface DifficultySelectorProps {
    value: DifficultyPreset;
    onChange: (preset: DifficultyPreset) => void;
  }

  export function DifficultySelector({ value, onChange }: DifficultySelectorProps)
  ```
  - [x] Render preset buttons: Easy | Medium | Hard | Custom
  - [x] Show active state for selected preset
  - [x] Color-code presets (green=easy, yellow=medium, red=hard, purple=custom)

### Task 3.2: Create CustomThresholdEditor Component
- [x] Create `src/components/ui/CustomThresholdEditor.tsx`
  ```typescript
  interface CustomThresholdEditorProps {
    thresholds: Partial<AccuracyThresholds>;
    onChange: (key: keyof AccuracyThresholds, value: number) => void;
  }

  export function CustomThresholdEditor({ thresholds, onChange }: CustomThresholdEditorProps)
  ```
  - [x] Render 4 sliders/inputs for perfect, great, good, ok
  - [x] Display values in milliseconds (convert from seconds)
  - [x] Validate thresholds are in ascending order
  - [x] Show visual representation of threshold ranges

### Task 3.3: Create DifficultySettingsPanel Component
- [x] Create `src/components/ui/DifficultySettingsPanel.tsx`
  ```typescript
  interface DifficultySettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
  }

  export function DifficultySettingsPanel({ isOpen, onClose }: DifficultySettingsPanelProps)
  ```
  - [x] Collapsible/expandable panel or modal
  - [x] Contains DifficultySelector
  - [x] Shows CustomThresholdEditor when "Custom" is selected
  - [x] Preview of current thresholds in a visual format

---

## Phase 4: Component Styling

### Task 4.1: Add DifficultySelector Styles
- [x] Create `src/components/ui/DifficultySelector.css`
  - [x] Button group styling for presets
  - [x] Active state styling
  - [x] Color coding per difficulty
  - [x] Responsive layout

### Task 4.2: Add CustomThresholdEditor Styles
- [x] Create `src/components/ui/CustomThresholdEditor.css`
  - [x] Slider/input styling
  - [x] Threshold visualization
  - [x] Validation error states
  - [x] Responsive layout

### Task 4.3: Add DifficultySettingsPanel Styles
- [x] Create `src/components/ui/DifficultySettingsPanel.css`
  - [x] Panel/modal styling
  - [x] Header with close button
  - [x] Content layout
  - [x] Animation for open/close

---

## Phase 5: Integration

### Task 5.1: Add Settings Button to BeatPracticeView
- [x] Update `src/components/ui/BeatPracticeView.tsx`
  - [x] Add settings/gear icon button
  - [x] Add state for panel open/close
  - [x] Render DifficultySettingsPanel

### Task 5.2: Connect to Store
- [x] Wire up DifficultySelector to beatDetectionStore
- [x] Wire up CustomThresholdEditor to beatDetectionStore
- [x] Ensure changes propagate to BeatStream

### Task 5.3: Add Visual Feedback for Current Difficulty
- [x] Show current difficulty preset in header
- [x] Update debug panel to show active thresholds
- [x] Consider showing difficulty indicator during gameplay

---

## Phase 6: TapStats Updates

### Task 6.1: Update Statistics to Include 'Ok'
- [x] Update `src/components/ui/TapStats.tsx` to display 'ok' accuracy count
- [x] Update accuracy percentage calculations
- [x] Update color coding for 'ok' (light blue or similar)

### Task 6.2: Update TapArea Feedback
- [x] Update `src/components/ui/TapArea.tsx` to handle 'ok' accuracy
- [x] Add 'ok' color variable
- [x] Update feedback text display

---

## Phase 7: Debug Panel Enhancements

### Task 7.1: Show Active Thresholds in Debug Panel
- [ ] Update debug panel in `BeatPracticeView.tsx`
- [ ] Display current threshold values
- [ ] Show which preset is active (or "Custom")
- [ ] Add visual comparison of tap offset vs thresholds

---

## Phase 8: Persistence (Optional Enhancement)

### Task 8.1: Persist Difficulty Settings
- [ ] Save difficulty settings to localStorage
- [ ] Load on app startup
- [ ] Consider zustand persist middleware

---

## File Structure

```
src/
├── components/ui/
│   ├── DifficultySelector.tsx      (new)
│   ├── DifficultySelector.css      (new)
│   ├── CustomThresholdEditor.tsx   (new)
│   ├── CustomThresholdEditor.css   (new)
│   ├── DifficultySettingsPanel.tsx (new)
│   ├── DifficultySettingsPanel.css (new)
│   ├── BeatPracticeView.tsx        (modify)
│   ├── TapArea.tsx                 (modify)
│   └── TapStats.tsx                (modify)
├── hooks/
│   └── useBeatStream.ts            (modify)
└── store/
    └── beatDetectionStore.ts       (modify)
```

---

## Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Engine `AccuracyThresholds` type | Engine | Pending |
| Engine `DifficultyPreset` type | Engine | Pending |
| Engine `getAccuracyThresholdsForPreset()` | Engine | Pending |
| Engine `BeatStreamOptions.difficultyPreset` | Engine | Pending |
| Engine `BeatStreamOptions.customThresholds` | Engine | Pending |
| `lucide-react` Settings icon | npm | Installed |

---

## Questions/Unknowns

- [ ] Should difficulty be per-session or persist across sessions?
- [ ] Should we show a difficulty recommendation based on performance?
- [ ] Should we add keyboard shortcuts for changing difficulty?
- [ ] Should custom thresholds be validated on the frontend or rely on engine validation?

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Store | 3 tasks | Low |
| Phase 2: Hooks | 2 tasks | Medium |
| Phase 3: Components | 3 tasks | Medium |
| Phase 4: Styling | 3 tasks | Low |
| Phase 5: Integration | 3 tasks | Medium |
| Phase 6: TapStats | 2 tasks | Low |
| Phase 7: Debug Panel | 1 task | Low |
| Phase 8: Persistence | 1 task | Low |
| **Total** | **18 tasks** | **~6-8 hours** |

---

## Success Criteria

- [ ] User can select between Easy/Medium/Hard/Custom presets
- [ ] Preset selection immediately affects tap accuracy evaluation
- [ ] Custom threshold editor allows fine-tuning all 4 levels
- [ ] Current difficulty is clearly visible during gameplay
- [ ] Statistics correctly track 'ok' accuracy
- [ ] Debug panel shows active thresholds
- [ ] Settings persist across page refresh (if implemented)
- [ ] UI is intuitive and responsive
