# UI Improvement Plan - Playlist Data Showcase

## Overview

This plan outlines comprehensive improvements to four tabs in the application: Audio Analysis, Session Tracking, XP Calculator, and Character Leveling. The focus is on UI cleanup, better information hierarchy, improved user experience, and fixing identified bugs.

**Task Numbering System**: Phase → Task → Sub-task (e.g., 1.1.1, 1.1.2, etc.)

---

# PHASE 1: AUDIO ANALYSIS TAB

## Task 1.1: Bug Fix - Analyze Audio Button Should Require Active Playback

**Issue**: Currently, users can click "Analyze Audio" before the song starts playing, which results in inaccurate analysis because no audio has been played yet.

**Understanding from Research**: The bass/mid/treble values are "dominance" percentages (0-100%), meaning they represent the prominence of each frequency range independently. They do NOT need to add up to 100% - a track can have 80% bass dominance AND 80% treble dominance simultaneously.

**Root Cause**: The `AudioAnalysisTab` component does not import or check the `audioPlayerStore.playbackState` to verify audio is actually playing.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/AudioAnalysisTab.tsx` (lines 138-147)

**Sub-tasks**:
- [ ] **1.1.1** Research & Verify: Import `useAudioPlayerStore` and examine the playback state values ('idle', 'loading', 'playing', 'paused', 'ended', 'error')
- [ ] **1.1.2** Implementation: Add `playbackState` from `audioPlayerStore` to the component
- [ ] **1.1.3** Implementation: Update the "Analyze Audio" button's `disabled` prop to check `playbackState !== 'playing'`
- [ ] **1.1.4** Implementation: Add a visual hint/tooltip explaining why the button is disabled (e.g., "Start playing audio first")
- [ ] **1.1.5** Testing: Verify that clicking analyze without playback shows a helpful message or disabled state
- [ ] **1.1.6** Testing: Verify that analyze works correctly after audio starts playing

**Reference**: React state management with Zustand stores, conditional rendering based on state

---

## Task 1.2: Feature - Auto-Extract Color Palette with Audio Analysis

**Current State**: The Audio Analysis tab displays color palette data IF it exists in `audioProfile.color_palette`, but no extraction function is actually called. The `ColorExtractor` class exists in `playlist-data-engine` but isn't being used.

**Desired Behavior**: When user clicks "Analyze Audio", automatically extract both the audio profile AND the color palette from the track's artwork image.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/hooks/useAudioAnalyzer.ts` (likely needs a new function)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/AudioAnalysisTab.tsx` (handleAnalyze function, lines 31-39)

**Sub-tasks**:
- [ ] **1.2.1** Research: Examine the `ColorExtractor` class in `node_modules/playlist-data-engine/src/core/analysis/ColorExtractor.ts`
- [ ] **1.2.2** Research: Verify the `ColorExtractor.extractPalette(imageUrl)` function signature and return type
- [ ] **1.2.3** Research: Check if `selectedTrack.image_url` is always available or if fallback handling is needed
- [ ] **1.2.4** Implementation: Create a new function in `useAudioAnalyzer.ts` that calls both `AudioAnalyzer.extractSonicFingerprint()` AND `ColorExtractor.extractPalette()`
- [ ] **1.2.5** Implementation: Merge the color palette into the returned `AudioProfile` object (or create a combined result type)
- [ ] **1.2.6** Implementation: Update `handleAnalyze()` in AudioAnalysisTab to call the combined function
- [ ] **1.2.7** Implementation: Add loading state text to show "Analyzing audio and extracting colors..."
- [ ] **1.2.8** Testing: Test with tracks that have artwork images
- [ ] **1.2.9** Testing: Test with tracks that don't have artwork (should handle gracefully)
- [ ] **1.2.10** Testing: Verify the color palette displays correctly in the existing color palette card (lines 249-327)

**Reference**:
- Image processing in browser using Canvas API (used by ColorExtractor)
- k-means clustering algorithm for color extraction
- Async/await patterns for multiple parallel operations

---

# PHASE 2: SESSION TRACKING TAB

## Task 2.1: Feature - Make Pending Stat Increases Clickable

**Current State**: The pending stat increases display (lines 321-328) shows text like "2 stat increases pending" but is not clickable.

**Desired Behavior**: Clicking on the pending stat increases alert should open the `StatSelectionModal` directly in the Session tab, allowing users to upgrade their stats without navigating away.

**Visual Feedback**: Apply ALL of the following hover effects to indicate clickability:
- Glow/border effect (add a glowing border or shadow on hover)
- Color shift (change background or text color on hover)
- Button-like appearance (rounded corners, distinct hover state)

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.tsx` (lines 321-328)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.css`

**Sub-tasks**:
- [ ] **2.1.1** Research: Examine how `StatSelectionModal` is used in `CharacterLevelingTab.tsx` (lines 692-698)
- [ ] **2.1.2** Research: Identify the props needed: `isOpen`, `pendingCount`, `currentStats`, `onApply`, `onCancel`
- [ ] **2.1.3** Implementation: Import `StatSelectionModal` component into SessionTrackingTab
- [ ] **2.1.4** Implementation: Add state for `showStatModal` (boolean) and `handleOpenStatModal` / `handleCloseStatModal` functions
- [ ] **2.1.5** Implementation: Import `useCharacterUpdater` hook to access `applyPendingStatIncrease` function
- [ ] **2.1.6** Implementation: Add click handler to `session-pending-stats-alert` div that calls `handleOpenStatModal`
- [ ] **2.1.7** CSS: Add `cursor: pointer` to make it look clickable
- [ ] **2.1.8** CSS: Add glowing border/shadow hover effect: `box-shadow: 0 0 12px hsl(var(--primary) / 0.5);` on hover
- [ ] **2.1.9** CSS: Add color shift hover effect: Change background to `hsl(var(--primary) / 0.1)` on hover
- [ ] **2.1.10** CSS: Add button-like appearance: `border-radius: 0.5rem;` and `transition: all 0.2s ease;`
- [ ] **2.1.11** CSS: Add active state for click feedback (slight scale down or darker color)
- [ ] **2.1.12** Implementation: Add `StatSelectionModal` to the JSX with proper props
- [ ] **2.1.13** Implementation: Create `handleApplyStats` function similar to CharacterLevelingTab (lines 287-303)
- [ ] **2.1.14** Testing: Verify clicking the pending stats alert opens the modal
- [ ] **2.1.15** Testing: Verify applying stats in the modal correctly updates the character
- [ ] **2.1.16** Testing: Verify the modal closes after applying or canceling
- [ ] **2.1.17** Testing: Verify success toast notification appears
- [ ] **2.1.18** Testing: Verify all three hover effects work correctly
- [ ] **2.1.19** Testing: Verify keyboard navigation works (Tab to select, Enter to open)

**Reference**:
- Modal component patterns in React
- Click handlers on div elements
- Passing callback functions as props

---

## Task 2.2: Feature - Combined Real-Time XP Display

**Current State**: The Session tab shows "XP Earned This Session" separately from the hero's current XP (lines 370-380).

**Desired Behavior**: Display a combined format like **"XP: 1,279 (+45 this session)"** where the total XP updates in real-time as the session progresses. **Placement: In the hero stats grid** (replacing or enhancing the existing "Current XP" stat at lines 307-318).

**Design Decision**: The combined XP display will be placed IN the hero stats grid, making it one of the key stats displayed alongside Current XP, Next Level, and HP.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.tsx` (lines 103-132, 307-318)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.css`

**Sub-tasks**:
- [ ] **2.2.1** Research: Examine current `displayedXP` state (line 104) and how it's calculated
- [ ] **2.2.2** Research: Examine `activeCharacter.xp.current` to get the base XP value
- [ ] **2.2.3** Research: Examine the hero stats grid structure (lines 306-319) to understand the layout
- [ ] **2.2.4** Implementation: Calculate `totalXP` = `activeCharacter.xp.current` + `displayedXP` (session XP)
- [ ] **2.2.5** Implementation: Replace the existing "Current XP" stat item (lines 307-310) with the combined format
- [ ] **2.2.6** Implementation: Design the display to show the primary number (total XP) prominently, with session gain in parentheses
- [ ] **2.2.7** Implementation: Use CSS to make the session gain (+45 this session) visually distinct (smaller, muted color)
- [ ] **2.2.8** Implementation: Consider using a format like: "1,279 XP" on first line, "+45 this session" on second line
- [ ] **2.2.9** Implementation: Ensure the total XP updates in real-time as `displayedXP` animates
- [ ] **2.2.10** CSS: Style the combined XP display to stand out in the stats grid
- [ ] **2.2.11** Testing: Verify the display shows correct values when session starts (base + 0)
- [ ] **2.2.12** Testing: Verify the total XP animates correctly as session progresses
- [ ] **2.2.13** Testing: Verify the formatting is clear and readable within the stats grid

**Reference**:
- Real-time state updates in React
- Number formatting with `toLocaleString()`
- CSS for visual hierarchy (font sizes, colors)

---

## Task 2.3: Feature - Reorganize Session Tab Layout

**Current State**: The layout has several issues:
1. Header has too much empty space to the right
2. "Now Playing" card takes significant space for a simple display
3. Session counter container has excessive padding/empty space
4. Hero info and song info are in separate areas
5. Song status (Active/Inactive) is redundant with session state

**Design Decisions from User**:
- **Start/End button placement**: Below Hero & Song cards (in a dedicated section, centered or full-width)
- **Timer/counter design**: Redesign the visual style (not just add more info around existing design)

**Desired Layout**:
1. **Compact header** - reduce padding/margins
2. **Hero & Song section** - two side-by-side primary cards
   - Left card: Hero info with combined XP display, clickable pending stats
   - Right card: Song info with image, title, artist, status badge
3. **Session counter** (secondary) - redesigned visual style, smaller/more compact container
4. **Start/End session button** - below Hero & Song cards, prominent placement
5. Remove redundant "Session Details" and "Now Playing" sections

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.tsx` (lines 206-468)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/SessionTrackingTab.css`

**Sub-tasks**:
- [ ] **2.3.1** Research & Sketch: Create a visual mockup/wireframe of the new layout before coding
- [ ] **2.3.2** Research: Identify which existing components can be reused (TrackCard, TimerRing)
- [ ] **2.3.3** Implementation: Reduce header padding in CSS (`.session-tab-header`, `.session-tab-icon-badge`)
- [ ] **2.3.4** Implementation: Remove the "Now Playing" card section (lines 230-242) - info will be moved
- [ ] **2.3.5** Implementation: Create a new "Hero & Song" grid section with two equal-width cards
  - [ ] **2.3.5.1** Left card: Hero info with combined XP display (in stats grid), clickable pending stats
  - [ ] **2.3.5.2** Right card: Song info with image, title, artist, Active/Inactive status badge
  - [ ] **2.3.5.3** Remove redundant "Session Details" header/text
- [ ] **2.3.6** Implementation: Redesign the session timer/counter visual style
  - [ ] **2.3.6.1** Keep the circular progress concept but make it more compact and visually interesting
  - [ ] **2.3.6.2** Consider: smaller size, different color scheme, animated elements, or alternative layout
  - [ ] **2.3.6.3** Place in a more compact container (reduce padding/empty space)
- [ ] **2.3.7** Implementation: Move the Start/End button below the Hero & Song cards
  - [ ] **2.3.7.1** Create a dedicated button section with proper spacing
  - [ ] **2.3.7.2** Make button full-width or centered, larger than current
- [ ] **2.3.8** Implementation: Consolidate the session info items (track, artist, duration) into the song card
- [ ] **2.3.9** CSS: Update grid/flex layouts for responsive design (mobile: stack, desktop: side-by-side)
- [ ] **2.3.10** CSS: Ensure proper spacing and visual hierarchy (hero & song = primary, timer = secondary)
- [ ] **2.3.11** CSS: Style the redesigned timer with new visual approach
- [ ] **2.3.12** Testing: Test layout on mobile viewport (~375px)
- [ ] **2.3.13** Testing: Test layout on desktop viewport (1024px+)
- [ ] **2.3.14** Testing: Verify all functionality still works after reorganization
- [ ] **2.3.15** Testing: Verify button is easily accessible and prominent

**Reference**:
- CSS Grid and Flexbox for layout
- Responsive design with media queries
- Visual hierarchy principles (size, position, contrast)
- Component composition patterns

---

# PHASE 3: XP CALCULATOR TAB

## Task 3.1: Feature - Two-Tab System (Calculator / Results)

**Current State**: All content is in one long scrolling page. After clicking calculate, users must scroll down to see results.

**Desired Behavior**: Two tabs always visible at the top:
- **Calculator tab**: Shows duration input, environment context, gaming context, mastery toggle, manual mode
- **Results tab**: Shows total XP, bonus breakdown, donut chart - empty state until calculated
- Auto-switch to Results tab when "Calculate & Apply" is clicked

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.tsx` (entire component structure)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.css`

**Sub-tasks**:
- [ ] **3.1.1** Research: Examine existing tab patterns in the codebase (how are tabs implemented elsewhere?)
- [ ] **3.1.2** Research: Create a reusable tab component OR implement inline tabs
- [ ] **3.1.3** Implementation: Add state for `activeTab` ('calculator' | 'results')
- [ ] **3.1.4** Implementation: Create tab navigation UI with two tabs
  - [ ] **3.1.4.1** Tab labels: "Calculator" and "Results"
  - [ ] **3.1.4.2** Active tab styling (underline, background color, etc.)
  - [ ] **3.1.4.3** Click handlers to switch tabs
- [ ] **3.1.5** Implementation: Wrap existing calculator content in conditional: `{activeTab === 'calculator' && ...}`
- [ ] **3.1.6** Implementation: Move results section (lines 602-780) into conditional: `{activeTab === 'results' && result && ...}`
- [ ] **3.1.7** Implementation: Add empty state for Results tab when no calculation yet
- [ ] **3.1.8** Implementation: Update `handleCalculate` function to automatically switch to results tab after calculation: `setActiveTab('results')`
- [ ] **3.1.9** CSS: Style tab navigation to match app design system
- [ ] **3.1.10** CSS: Ensure smooth transitions between tabs
- [ ] **3.1.11** Testing: Verify tabs switch correctly when clicked
- [ ] **3.1.12** Testing: Verify auto-switch to results after calculation
- [ ] **3.1.13** Testing: Verify results tab shows empty state before calculation
- [ ] **3.1.14** Testing: Verify calculator tab is accessible from results tab

**Reference**:
- React state for tab management
- Conditional rendering patterns
- Tab UI design patterns (underlines, pills, etc.)

---

## Task 3.2: Feature - Compact Header

**Current State**: Header section (lines 248-256) is taller than other recently-optimized tabs.

**Desired Behavior**: Match the compact header design used in Playlist, Audio Analysis, Character Gen, Party, and Session tabs.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.tsx` (lines 248-256)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.css`

**Sub-tasks**:
- [ ] **3.2.1** Research: Compare header styling in AudioAnalysisTab.css (lines 18-73) as reference
- [ ] **3.2.2** Implementation: Reduce icon badge size from current to match other tabs (~2.25rem or 2.5rem)
- [ ] **3.2.3** Implementation: Reduce title font size to match other tabs (~1.25rem or 1.5rem)
- [ ] **3.2.4** Implementation: Reduce subtitle font size and vertical spacing
- [ ] **3.2.5** CSS: Update `.xp-calculator-header` spacing/padding
- [ ] **3.2.6** CSS: Update `.xp-calculator-header-icon` size
- [ ] **3.2.7** CSS: Update `.xp-calculator-header-content` spacing
- [ ] **3.2.8** Testing: Visually compare header size with other tabs

**Reference**:
- CSS sizing units (rem, px, em)
- Consistent design patterns across tabs

---

## Task 3.3: Feature - Estimated XP Above Calculate Button

**Current State**: Users must click calculate to see what XP they'll get.

**Desired Behavior**: Show estimated XP calculation above the "Calculate & Apply" button, updating in real-time as user changes inputs.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.tsx` (lines 571-599)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.css`

**Sub-tasks**:
- [ ] **3.3.1** Research: Create a `useMemo` or `useEffect` that recalculates XP whenever inputs change (duration, environmental, gaming, mastery, manual)
- [ ] **3.3.2** Implementation: Calculate `estimatedXP` using the same logic as `handleCalculate` but without applying
- [ ] **3.3.3** Implementation: Create a display component showing:
  - [ ] **3.3.3.1** Estimated Total XP (prominent)
  - [ ] **3.3.3.2** Brief breakdown (Base: 180, Environmental: +45, etc.)
- [ ] **3.3.4** Implementation: Place this display above the Calculate button (lines 571-599)
- [ ] **3.3.5** Implementation: Update calculation whenever any input changes
- [ ] **3.3.6** CSS: Style the estimate display to look like a preview/summary
- [ ] **3.3.7** CSS: Ensure it's visually distinct from the actual results
- [ ] **3.3.8** Testing: Verify estimate updates when duration changes
- [ ] **3.3.9** Testing: Verify estimate updates when toggles change
- [ ] **3.3.10** Testing: Verify estimate matches actual calculated result

**Reference**:
- React `useMemo` for derived values
- Real-time UI updates based on state changes
- Preview vs final result UX patterns

---

## Task 3.4: Feature - Duration Input as Main Attraction

**Current State**: Duration input is same size as other context cards.

**Desired Behavior**: Duration input should be visually larger/prominent since it's the primary input.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.tsx` (lines 346-356)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.css`

**Sub-tasks**:
- [ ] **3.4.1** Research: Examine current card sizes in the grid (`.xp-calculator-context-grid`)
- [ ] **3.4.2** Implementation: Make duration input card span 2 columns in the grid (or full width on desktop)
- [ ] **3.4.3** Implementation: Increase font size of the input field and label
- [ ] **3.4.4** Implementation: Add visual emphasis (border, shadow, or background)
- [ ] **3.4.5** CSS: Update grid layout to accommodate larger duration card
- [ ] **3.4.6** CSS: Style the duration card to stand out from context cards
- [ ] **3.4.7** Testing: Verify duration input draws visual attention
- [ ] **3.4.8** Testing: Verify responsive layout works on mobile

**Reference**:
- CSS Grid span properties
- Visual hierarchy through size and emphasis

---

## Task 3.5: Feature - Larger Font Sizes for Context Cards

**Current State**: Context card titles are small with lots of empty space underneath.

**Desired Behavior**: Increase font sizes while maintaining (or slightly reducing) empty space.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/XPCalculatorTab.css`

**Sub-tasks**:
- [ ] **3.5.1** Research: Identify current font sizes for card titles (`.xp-context-card-title`, `.xp-toggle-title`)
- [ ] **3.5.2** Implementation: Increase title font sizes (e.g., from 0.875rem to 1rem or 1.125rem)
- [ ] **3.5.3** Implementation: Increase description font sizes if needed (`.xp-toggle-description`)
- [ ] **3.5.4** Implementation: Reduce vertical padding inside cards to utilize space efficiently
- [ ] **3.5.5** CSS: Fine-tune spacing to eliminate excessive whitespace without cramping
- [ ] **3.5.6** Testing: Visually verify better space utilization
- [ ] **3.5.7** Testing: Ensure text remains readable at new sizes

**Reference**:
- CSS font-size properties
- Whitespace management in UI design

---

# PHASE 4: CHARACTER LEVELING TAB

## Task 4.1: Feature - Compact Header with Character Selector in Same Row

**Current State**: Header (lines 409-417) and character selector (lines 420-443) are on separate rows.

**Desired Behavior**: Title on left side of header, character selector dropdown on right side - single row layout.

**Files to Modify**:
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/CharacterLevelingTab.tsx` (lines 409-443)
- `/Users/jasondesante/playlist-data-showcase/src/components/Tabs/CharacterLevelingTab.css`

**Sub-tasks**:
- [x] **4.1.1** Research: Examine header structure and current character selector implementation
- [x] **4.1.2** Implementation: Restructure header to be flex row with `justify-content: space-between`
- [x] **4.1.3** Implementation: Move title/icon to left side
- [x] **4.1.4** Implementation: Move character selector inline to right side (only when multiple characters exist)
- [x] **4.1.5** Implementation: Remove the separate `leveling-character-selector-card` component
- [x] **4.1.6** CSS: Update `.leveling-header` to be a row instead of column
- [x] **4.1.7** CSS: Add styles for inline character selector in header
- [x] **4.1.8** CSS: Ensure responsive behavior (stacks on mobile, row on desktop)
- [ ] **4.1.9** Testing: Verify header is more compact (less vertical height)
- [ ] **4.1.10** Testing: Verify character selector is accessible
- [ ] **4.1.11** Testing: Verify responsive behavior

**Reference**:
- Flexbox layout with space-between
- Responsive design for header elements

---

# PHASE 5: TESTING & VERIFICATION

## Task 5.1: Cross-Tab Testing Tasks

**Sub-tasks**:
- [ ] **5.1.1** Test all tabs on mobile viewport (~375px width)
- [ ] **5.1.2** Test all tabs on tablet viewport (~768px width)
- [ ] **5.1.3** Test all tabs on desktop viewport (1024px+ width)
- [ ] **5.1.4** Verify all functionality still works after changes
- [ ] **5.1.5** Verify no console errors or warnings
- [ ] **5.1.6** Verify state persists correctly across tab switches
- [ ] **5.1.7** Verify character data updates correctly across tabs
- [ ] **5.1.8** Check accessibility (keyboard navigation, screen readers)
- [ ] **5.1.9** Check loading states and error handling
- [ ] **5.1.10** Performance check - no significant performance regressions

---

# IMPLEMENTATION ORDER RECOMMENDATION

## Quick Wins First (Builds Momentum)
- Task 4.1: Leveling tab header reorganization
- Task 3.2: XP Calculator compact header

## Core Functionality
- Task 1.1: Audio Analysis playback state check (bug fix)
- Task 1.2: Audio Analysis color palette extraction

## UX Improvements
- Task 2.1: Session tab pending stats clickable
- Task 3.1: XP Calculator two-tab system
- Task 3.3: XP Calculator estimated XP display

## Larger Refactors
- Task 2.3: Session tab complete layout reorganization
- Task 2.2: Session tab combined XP display
- Task 3.4: XP Calculator duration prominence
- Task 3.5: XP Calculator font sizes

---

# EDUCATIONAL REFERENCES FOR FURTHER LEARNING

## React & State Management
- [Zustand Documentation](https://github.com/pmndrs/zustand) - State management library used
- [React Hooks Reference](https://react.dev/reference/react) - useState, useEffect, useMemo patterns

## UI/UX Design
- [Material Design Layout Principles](https://m3.material.io/foundations/layout/guiding-principles)
- [Visual Hierarchy in UI](https://www.nngroup.com/articles/visual-hierarchy/)
- [Whitespace in Design](https://lawsofux.com/whitespace-in-design/)

## CSS Techniques
- [CSS Grid Complete Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox Complete Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Custom Properties (Variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

## Audio Analysis
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [FFT and Audio Analysis](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)

## Color Extraction
- [K-means Clustering Algorithm](https://en.wikipedia.org/wiki/K-means_clustering)
- [Color Quantization Techniques](https://en.wikipedia.org/wiki/Color_quantization)

---

# NOTES FOR IMPLEMENTATION

- Take time with each task - research thoroughly before coding
- Test frequently to catch issues early
- Commit often with descriptive messages
- Ask clarifying questions as needed during implementation
- Focus on maintainability - write clean, well-commented code
- Consider future extensibility when designing components
