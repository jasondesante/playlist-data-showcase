# Beat Detection Step-Based UI Refactor

## Overview

Refactor `BeatDetectionTab` from a single-page layout with expandable sections to a step-based wizard UI with horizontal tab navigation. This will guide users through the beat map creation workflow while maintaining flexibility to skip optional steps.

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Tab labels | Descriptive: "Analyze", "Subdivide", "Chart", "Ready/Not Ready" |
| Step 1 after completion | Content hides, tab stays visible with checkmark; clicking tab brings content back |
| Step navigation style | Horizontal tabs at top |
| Skip behavior | Click step to jump (no "Next" buttons) |
| Step 4 access | Available immediately after Step 1 |
| Step 3 availability | Disabled until Step 2 is complete |
| Completion status | Checkmark icon (✓) inside completed step tabs |
| Practice mode exit | Intelligent return: if keys assigned → Step 3; else if subdivisions exist → Step 2; else → Step 4 |
| Step 4 dynamic label | Shows "Not Ready" (grayed) until Step 1 complete, then "Ready" |
| Step transitions | Slide + fade animation (direction based on forward/backward navigation) |
| Post-completion UX | Show subtle prompt to proceed to next step or export level |

---

## Current State

The tab currently renders sections conditionally:
1. Primary Card (song info + settings + analyze button)
2. Subdivision Card (expandable `<details>`) - shown when beatMap exists
3. Chart Editor Card (expandable `<details>`) - shown when subdividedBeatMap exists
4. Beat Map Summary Card - shown when selectedTrack exists
5. Practice View - shown when practiceModeActive

## Target State

Horizontal step navigation at the top:
```
[✓ Analyze]  [Subdivide]  [Chart]  [Ready]
[ Analyze ]  [Subdivide]  [Chart]  [Not Ready]  ← when step 1 incomplete
```

**Tab Labels:**
- Step 1: "Analyze"
- Step 2: "Subdivide"
- Step 3: "Chart"
- Step 4: "Ready" (when beatMap exists) or "Not Ready" (when beatMap is null)

**Tab States:**
- **Completed steps**: Show checkmark (✓) inside the tab before the label
- **Active step**: Highlighted with primary color border/background
- **Disabled steps**: Grayed out, reduced opacity, non-clickable

**Content Behavior:**
- Only the active step's content is rendered
- When a step completes, its content hides but the tab remains visible with checkmark
- Clicking any step's tab shows its content (for review or re-analyze)

**Post-Completion Prompts:**
- After completing Step 1: "Great! Ready to subdivide? → Go to Step 2" or "Skip to practice or export →"
- After completing Step 2: "Configure your chart → Go to Step 3" or "Skip to practice →"
- After completing Step 3: "Keys assigned! → Practice or Export"

---

## Phase 1: State Management Setup

- [x] **Task 1.1: Add step state to beatDetectionStore**
  - [x] Add `currentStep: 1 | 2 | 3 | 4` to store state
  - [x] Add `setCurrentStep(step)` action
  - [x] Reset currentStep to 1 when beatMap is cleared (track change)

- [x] **Task 1.2: Create step availability and completion hooks**
  - [x] `useCurrentStep()` - returns current step number
  - [x] `useStepCompletion()` - returns `{ step1: boolean, step2: boolean, step3: boolean }`
    - step1 complete when `beatMap` exists
    - step2 complete when `subdividedBeatMap` exists
    - step3 complete when `chartStatistics.keyCount > 0`
  - [x] `useStepAvailability()` - returns which steps are clickable
    - step1: always available when track selected
    - step2: available when step1 complete
    - step3: available when step2 complete (subdividedBeatMap exists)
    - step4: available when step1 complete

---

## Phase 2: Step Navigation Component

- [x] **Task 2.1: Create StepNav component (`src/components/ui/StepNav.tsx`)**
  - [x] Props interface:
    ```typescript
    interface StepNavProps {
      steps: Array<{ id: number; label: string; dynamicLabel?: string }>;
      currentStep: number;
      completedSteps: Set<number>;
      availableSteps: Set<number>;
      onStepClick: (step: number) => void;
    }
    ```
  - [x] Step labels: "Analyze", "Subdivide", "Chart", "Ready"/"Not Ready"
  - [x] Horizontal layout with descriptive labels (no step numbers displayed)
  - [x] Checkmark (✓) displayed before label for completed steps
  - [x] Step 4 shows "Ready" when available, "Not Ready" when disabled
  - [x] Active step highlighted with primary color border/background
  - [x] Disabled steps grayed out, reduced opacity, non-clickable
  - [x] Cursor changes: pointer for available, not-allowed for disabled

- [x] **Task 2.2: Add StepNav styles (`src/components/ui/StepNav.css`)**
  - [x] Horizontal flex container with equal-width step tabs
  - [x] Checkmark styles for completed steps (✓ before label)
  - [x] Active step highlight (border-bottom or background)
  - [x] Disabled step styles (opacity, cursor, "Not Ready" styling)
  - [x] Hover states for available steps
  - [x] Responsive: scrollable on narrow screens

- [x] **Task 2.3: Add step content transition styles**
  - [x] Create `.step-content-enter` and `.step-content-exit` classes
  - [x] Slide left animation when navigating forward (to higher step)
  - [x] Slide right animation when navigating backward (to lower step)
  - [x] Fade in/out combined with slide
  - [x] Track navigation direction in state for correct animation

- [x] **Task 2.4: Add accessibility**
  - [x] Role="tablist" on container, role="tab" on each step
  - [x] aria-selected on active step
  - [x] aria-disabled on unavailable steps
  - [x] aria-label for Step 4: "Ready" or "Not Ready - complete Step 1 first"
  - [x] Keyboard: Arrow keys to navigate, Enter/Space to select

---

## Phase 3: Refactor BeatDetectionTab Layout

- [x] **Task 3.1: Add StepNav to BeatDetectionTab**
  - [x] Import StepNav component
  - [x] Place below header, above content area
  - [x] Pass current step, completion, and availability props
  - [x] Hide StepNav when practiceModeActive is true

- [ ] **Task 3.2: Create step content rendering logic**
  - [ ] Add `renderStepContent()` that switches on currentStep
  - [ ] Only render content for the active step
  - [ ] Track navigation direction (previousStep vs currentStep) for slide animation
  - [ ] Apply slide-left class when navigating forward, slide-right when navigating backward
  - [ ] Combine slide with fade animation

- [ ] **Task 3.3: Refactor Step 1 (Analyze) content**
  - [ ] Move Primary Card content to Step 1
  - [ ] Keep: song display, BeatDetectionSettings, Analyze button
  - [ ] On analysis complete: call `setCurrentStep(2)` to auto-advance
  - [ ] When user returns to Step 1 from another step: show full content (for re-analyze)

- [ ] **Task 3.4: Refactor Step 2 (Subdivisions) content**
  - [ ] Move SubdivisionSettings to Step 2
  - [ ] Remove `<details>` wrapper - content always visible when on this step
  - [ ] Card wrapper with "Subdivisions" header
  - [ ] No "Skip" button - users click Step 4 tab to skip

- [ ] **Task 3.5: Refactor Step 3 (Chart Editor) content**
  - [ ] Move ChartEditor + ChartEditorToolbar to Step 3
  - [ ] Remove `<details>` wrapper
  - [ ] Card wrapper with "Chart Editor" header
  - [ ] Remove placeholder logic (step will be disabled if not available)

- [ ] **Task 3.6: Refactor Step 4 (Practice) content**
  - [ ] Move BeatMapSummary to Step 4
  - [ ] Keep "Start Practice Mode" button
  - [ ] Keep Export button section
  - [ ] This step is always available after Step 1 completes
  - [ ] When step is disabled (beatMap null): show "Complete Step 1 first" message

- [ ] **Task 3.7: Add post-completion prompts**
  - [ ] Create `StepCompletionPrompt` component or inline UI
  - [ ] After Step 1 complete: "Ready to subdivide? → Go to Subdivide" + "Or skip to practice/export →"
  - [ ] After Step 2 complete: "Configure your chart → Go to Chart" + "Or skip to practice →"
  - [ ] After Step 3 complete: "Keys assigned! → Practice or Export"
  - [ ] Prompts appear at bottom of step content, subtle styling (muted text, arrow icon)

---

## Phase 4: Navigation Behavior

- [ ] **Task 4.1: Implement auto-advance on analysis complete**
  - [ ] After successful beatMap generation, set currentStep to 2
  - [ ] Step 4 remains clickable as an alternative path

- [ ] **Task 4.2: Handle practice mode transitions**
  - [ ] When entering practice mode: hide StepNav (full-screen practice)
  - [ ] When exiting practice mode: show StepNav, intelligently return to appropriate step:
    - If `chartStatistics.keyCount > 0` → return to Step 3 (Chart)
    - Else if `subdividedBeatMap` exists → return to Step 2 (Subdivide)
    - Else → return to Step 4 (Practice/Export)

- [ ] **Task 4.3: Handle track change**
  - [ ] When selectedTrack changes: reset currentStep to 1
  - [ ] Clear beatMap state (existing behavior)

- [ ] **Task 4.4: Handle re-analyze**
  - [ ] User can click Step 1 tab to re-analyze
  - [ ] After re-analyze completes: auto-advance to Step 2 again
  - [ ] Subdivisions and chart may need regeneration (existing behavior handles this)

---

## Phase 5: CSS Cleanup

- [ ] **Task 5.1: Update BeatDetectionTab.css**
  - [ ] Add step content container styles
  - [ ] Add step transition animations (slide + fade):
    ```css
    .step-content-enter-forward { transform: translateX(100%); opacity: 0; }
    .step-content-enter-backward { transform: translateX(-100%); opacity: 0; }
    .step-content-active { transform: translateX(0); opacity: 1; }
    ```
  - [ ] Remove or comment out unused collapsible section styles
  - [ ] Keep existing card styles (still used within steps)

- [ ] **Task 5.2: Responsive adjustments**
  - [ ] StepNav scrollable horizontally on mobile
  - [ ] Step content padding adjustments for small screens
  - [ ] Post-completion prompts stack vertically on mobile

---

## Phase 6: Testing & Polish

- [ ] **Task 6.1: Test step navigation flow**
  - [ ] Step 1 → analyze → auto-advance to Step 2
  - [ ] Click "Ready" tab directly to skip subdivisions
  - [ ] Step 3 disabled until Step 2 generates subdivisions
  - [ ] Completion indicators (checkmarks) update correctly
  - [ ] Step 4 shows "Not Ready" → "Ready" after Step 1 complete

- [ ] **Task 6.2: Test edge cases**
  - [ ] Track change mid-workflow resets to Step 1
  - [ ] Re-analyze from any step
  - [ ] Practice mode entry/exit returns to intelligent step
  - [ ] Storage errors and cache clearing don't break navigation
  - [ ] Slide animation direction correct (forward = left, backward = right)

- [ ] **Task 6.3: Test post-completion prompts**
  - [ ] Prompts appear after completing each step
  - [ ] Clicking prompt link navigates to correct step
  - [ ] Prompts update correctly when returning to previous steps

- [ ] **Task 6.4: Accessibility verification**
  - [ ] Tab navigation reaches all available steps
  - [ ] Arrow keys work for step navigation
  - [ ] Screen reader announces step changes and "Ready"/"Not Ready" status
  - [ ] Focus visible on step tabs

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/beatDetectionStore.ts` | Add currentStep state, setCurrentStep action, previousStep for animation direction, step availability logic |
| `src/components/Tabs/BeatDetectionTab.tsx` | Major refactor: add StepNav, step-based content rendering, post-completion prompts |
| `src/components/Tabs/BeatDetectionTab.css` | Step container styles, slide + fade transitions |
| `src/components/ui/StepNav.tsx` | **NEW** - Step navigation tab component with dynamic labels |
| `src/components/ui/StepNav.css` | **NEW** - Step navigation styles with checkmarks and "Not Ready" state |

## Files to Reference (no changes needed)

- `src/components/ui/BeatDetectionSettings.tsx`
- `src/components/ui/SubdivisionSettings.tsx`
- `src/components/ui/ChartEditor.tsx`
- `src/components/ui/ChartEditorToolbar.tsx`
- `src/components/ui/BeatMapSummary.tsx`
- `src/components/ui/BeatPracticeView.tsx`

---

## Open Questions

- Should we persist currentStep to localStorage so it survives page refresh? (Low priority - can add later if requested)
