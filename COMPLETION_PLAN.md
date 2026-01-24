# Completion Plan: Playlist Data Engine Showcase

**Date:** 2025-01-24
**Project:** playlist-data-showcase
**Goal:** Create a fully functional showcase app demonstrating ALL playlist-data-engine features with clean architecture, verified functionality, and comprehensive documentation.

---

## Quick Reference

| Aspect | Status |
|--------|--------|
| **Current Completion** | ~70% |
| **Foundation** | ✅ Complete (hooks, stores, utilities) |
| **Architecture** | ⚠️ Needs refactoring (877-line App.tsx) |
| **Documentation** | ⚠️ Outdated (doesn't match implementation) |
| **Primary Blocker** | Architecture refactoring before adding features |

### What's Built (Verified)

| Component | File | Status |
|-----------|------|--------|
| PlaylistParser Hook | `src/hooks/usePlaylistParser.ts` | ✅ Working |
| AudioAnalyzer Hook | `src/hooks/useAudioAnalyzer.ts` | ✅ Working |
| CharacterGenerator Hook | `src/hooks/useCharacterGenerator.ts` | ✅ Working |
| SessionTracker Hook | `src/hooks/useSessionTracker.ts` | ⚠️ Minor fix needed |
| XPCalculator Hook | `src/hooks/useXPCalculator.ts` | ✅ Working |
| EnvironmentalSensors Hook | `src/hooks/useEnvironmentalSensors.ts` | ✅ Working |
| GamingPlatforms Hook | `src/hooks/useGamingPlatforms.ts` | ⚠️ Discord game activity to remove |
| CombatEngine Hook | `src/hooks/useCombatEngine.ts` | ✅ Working |
| CharacterStore | `src/store/characterStore.ts` | ✅ Working |
| PlaylistStore | `src/store/playlistStore.ts` | ✅ Working |
| SensorStore | `src/store/sensorStore.ts` | ✅ Working |
| GamingStore | `src/store/gamingStore.ts` | ✅ Working |
| AppStore | `src/store/appStore.ts` | ✅ Working |

### What's Incomplete

| Tab | Missing |
|-----|---------|
| Combat | Full UI, turn-by-turn logging, HP tracking, winner display |
| Settings | Save/load, export/import, all wireups |
| Gaming | Discord music status (remove game activity tracking) |
| XP Calculator | Environmental/gaming context integration, bonus breakdown |
| Audio | Color palette, advanced metrics, visualizations |
| Character | Determinism verification, real audio profile integration |
| All Tabs | Raw JSON dump sections, status indicators |

---

## Phase Structure Overview

```
PHASE 1: Documentation Verification & Cleanup
├── Create IMPLEMENTATION_STATUS.md (primary reference)
├── Archive outdated docs (keep as historical)
├── Verify engine bug fixes
└── Update task completion status

PHASE 2: Code Verification & Analysis
├── Read and understand all current implementations
├── Identify what's actually working vs broken
├── Document engine limitations discovered
└── Create detailed verification checklist

PHASE 3: Architecture Refactoring (Clean Slate)
├── Extract all tabs to modular components
├── Fix useSessionTracker dependency bug
├── Create shared UI components
└── Verify everything still works

PHASE 4: Core Feature Completion (Each Tab)
├── Playlist: Add raw JSON dump section
├── Audio: Color palette, advanced metrics, visualizations
├── Character: Determinism verification, seed integration
├── Session: Add raw JSON dump section
├── XP: Context integration, bonus breakdown, manual overrides
├── Leveling: Add raw JSON dump section
├── Sensors: iOS/Android testing, visualizations
├── Gaming: Discord music status only (remove game tracking)
├── Settings: Full save/load, export/import
└── Combat: Full turn-by-turn simulation with logging

PHASE 5: Cross-Cutting Features
├── Add raw JSON dump sections to all tabs
├── Add status indicators to all tabs
├── Mobile responsiveness testing
├── Performance testing
├── Error recovery testing
└── Console logging audit

PHASE 6: Polish & Final Verification
├── Documentation polish
├── Code comments (JSDoc)
├── Export/import testing
└── Final smoke test all features
```

---

## PHASE 1: Documentation Verification & Cleanup

**Goal:** Establish accurate documentation as the single source of truth.

**Duration:** 1-2 days

### 1.1 Create IMPLEMENTATION_STATUS.md (PRIMARY DOCUMENT)

**Purpose:** This becomes the main reference for what's built, what's not, and how everything works. The old DESIGN_DOCS stays as historical context.

**Tasks:**

#### 1.1.1 Document Overview Section
- [x] Write project summary (what this showcase app is) - COMPLETED 2025-01-24
- [x] Document relationship to playlist-data-engine (local import) - COMPLETED 2025-01-24
- [x] List engine version being used - COMPLETED 2025-01-24
- [x] Document project purpose: testing + demo of all engine features - COMPLETED 2025-01-24

#### 1.1.2 Document Built Components
- [x] Create section "Hooks - What's Built" - COMPLETED 2025-01-24
  - [x] List all 9 hooks with file paths
  - [x] Document each hook's purpose and key methods
  - [x] Note any known issues or limitations
- [x] Create section "Stores - What's Built" - COMPLETED 2025-01-24
  - [x] List all 5 Zustand stores
  - [x] Document what each store manages
  - [x] Note persistence strategy (LocalForage)

#### 1.1.3 Document Tab Implementations
- [x] Create table of all 10 tabs with: - COMPLETED 2025-01-24
  - [x] Tab name
  - [x] Current implementation location (App.tsx lines)
  - [x] Completion status (✅ Complete, ⚠️ Partial, ❌ Incomplete)
  - [x] What's working
  - [x] What's missing
  - [x] Reference to engine module being demonstrated

#### 1.1.4 Document Engine Integration
- [x] List all engine modules being demonstrated - COMPLETED 2025-01-24
- [x] Document how each module is imported (local path) - COMPLETED 2025-01-24
- [x] Note any engine API limitations discovered during implementation - COMPLETED 2025-01-24

#### 1.1.5 Document Known Issues
- [x] List all known bugs or limitations - COMPLETED 2025-01-24
- [x] Document workarounds if any exist - COMPLETED 2025-01-24
- [x] Flag items that need engine fixes vs showcase fixes - COMPLETED 2025-01-24

**File to create:** `IMPLEMENTATION_STATUS.md`

---

### 1.2 Archive Outdated Documentation

**Purpose:** Keep historical docs but mark them as such, so they don't confuse contributors.

**Tasks:**

#### 1.2.1 Update DESIGN_DOCS/PLAYLIST_DATA_ENGINE_SHOWCASE.md
- [x] Add header comment: "HISTORICAL DOCUMENT - Last updated Dec 2025" - COMPLETED 2025-01-24
- [x] Add note at top: "For current implementation status, see /IMPLEMENTATION_STATUS.md" - COMPLETED 2025-01-24
- [x] Add note: "This document describes the original vision and requirements" - COMPLETED 2025-01-24
- [x] Do NOT delete or rewrite - keep as historical reference - COMPLETED 2025-01-24

#### 1.2.2 Update specs/01-engine-showcase/tasks.md
- [x] Add header comment: "ORIGINAL TASK LIST - For reference only" - COMPLETED 2025-01-24
- [x] Add note: "See /COMPLETION_PLAN.md for current task breakdown" - COMPLETED 2025-01-24
- [x] Do NOT delete original tasks - they're useful for context - COMPLETED 2025-01-24

---

### 1.3 Verify Engine Bug Fixes

**Purpose:** Check if TypeScript errors in playlist-data-engine have been fixed.

**Reference:** DESIGN_DOCS/BUGS_TO_FIX.md documents engine build errors.

**Tasks:**

#### 1.3.1 Read Engine Source Files
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/combat/AttackResolver.ts`
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/combat/InitiativeRoller.ts`
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/combat/SpellCaster.ts`
- [ ] Read any other files mentioned in BUGS_TO_FIX.md

#### 1.3.2 Verify Fixes
- [ ] Check if AttackResolver type errors are resolved
- [ ] Check if InitiativeRoller type errors are resolved
- [ ] Check if SpellCaster type errors are resolved
- [ ] For each bug, document:
  - [ ] Is it fixed?
  - [ ] If not fixed, what's the specific error?
  - [ ] What file and line needs attention?
  - [ ] Is this blocking showcase development?

#### 1.3.3 Update BUGS_TO_FIX.md
- [ ] Add note at top: "This file documents playlist-data-engine bugs, not showcase bugs"
- [ ] Add verification status for each bug (✅ Fixed / ⚠️ Still broken)
- [ ] For still-broken items, add note: "Needs engine fix - not blocking showcase"

#### 1.3.4 Create Showcase Bug Tracker (if needed)
- [ ] If any showcase-specific bugs found, create `DESIGN_DOCS/SHOWCASE_BUGS.md`
- [ ] Document each showcase bug with:
  - [ ] Bug description
  - [ ] File/location
  - [ ] Severity (P0/P1/P2)
  - [ ] Steps to reproduce

---

### 1.4 Create Quick Reference Section

**Purpose:** Help new contributors get up to speed quickly.

**Tasks:**

- [ ] Add to IMPLEMENTATION_STATUS.md:
  - [ ] "How to Run the Project" section
  - [ ] "Project Structure" section (directory tree)
  - [ ] "Key Files to Understand" section
  - [ ] "Testing Checklist" section
  - [ ] "Common Issues" section

---

## PHASE 2: Code Verification & Analysis

**Goal:** Deeply understand current implementation and verify what's actually working.

**Duration:** 2-3 days

### 2.1 Verify All Hooks Work Correctly

**Tasks:**

#### 2.1.1 Test usePlaylistParser
- [ ] Read `src/hooks/usePlaylistParser.ts`
- [ ] Verify it imports from engine correctly
- [ ] Verify parsePlaylist method works
- [ ] Check error handling
- [ ] Document any issues found

#### 2.1.2 Test useAudioAnalyzer
- [ ] Read `src/hooks/useAudioAnalyzer.ts`
- [ ] Verify it imports AudioAnalyzer from engine
- [ ] Verify analyzeTrack method works
- [ ] Check progress reporting
- [ ] Document any issues found

#### 2.1.3 Test useCharacterGenerator
- [ ] Read `src/hooks/useCharacterGenerator.ts`
- [ ] Verify it imports CharacterGenerator from engine
- [ ] Verify generateCharacter method works
- [ ] Check what parameters it expects
- [ ] Document any issues found

#### 2.1.4 Test useSessionTracker
- [ ] Read `src/hooks/useSessionTracker.ts`
- [ ] Find the useEffect with unused dependencies
- [ ] Identify which dependencies are unused
- [ ] Document the fix needed

#### 2.1.5 Test useXPCalculator
- [ ] Read `src/hooks/useXPCalculator.ts`
- [ ] Verify it imports XPCalculator from engine
- [ ] Verify calculateXP method works
- [ ] Document what it returns

#### 2.1.6 Test useEnvironmentalSensors
- [ ] Read `src/hooks/useEnvironmentalSensors.ts`
- [ ] Verify it imports EnvironmentalSensors from engine
- [ ] Check permission handling
- [ ] Check monitoring functions
- [ ] Document iOS-specific considerations

#### 2.1.7 Test useGamingPlatforms
- [ ] Read `src/hooks/useGamingPlatforms.ts`
- [ ] Note: Discord game activity tracking needs to be REMOVED
- [ ] Keep Discord music status functionality
- [ ] Document what needs to change

#### 2.1.8 Test useCombatEngine
- [ ] Read `src/hooks/useCombatEngine.ts`
- [ ] Verify it imports CombatEngine from engine
- [ ] Verify startCombat method works
- [ ] Document what needs to be added (turn resolution, logging, etc.)

---

### 2.2 Verify All Stores Work Correctly

**Tasks:**

#### 2.2.1 Test playlistStore
- [ ] Read `src/store/playlistStore.ts`
- [ ] Verify state structure
- [ ] Check persistence works
- [ ] Test selectTrack function

#### 2.2.2 Test characterStore
- [ ] Read `src/store/characterStore.ts`
- [ ] Verify state structure
- [ ] Test addCharacter function
- [ ] Test updateCharacter function

#### 2.2.3 Test sensorStore
- [ ] Read `src/store/sensorStore.ts`
- [ ] Verify state structure
- [ ] Test updateEnvironmentalContext function

#### 2.2.4 Test gamingStore
- [ ] Read `src/store/gamingStore.ts`
- [ ] Note: Remove game activity tracking, keep music status
- [ ] Document what needs to change

#### 2.2.5 Test appStore
- [ ] Read `src/store/appStore.ts`
- [ ] Verify settings structure
- [ ] Test updateSettings function

---

### 2.3 Document Engine API Limitations

**Purpose:** Create reference for developers working with the engine.

**Tasks:**

- [ ] Document: AudioAnalyzer doesn't support smoothingTimeConstant option
- [ ] Document: EnvironmentalSensors doesn't support dynamic config updates
- [ ] Document: Discord RPC CANNOT read game activity (music status only)
- [ ] Document: Any other limitations discovered during testing
- [ ] Add all findings to IMPLEMENTATION_STATUS.md under "Engine API Limitations"

---

### 2.4 Create Detailed Tab-by-Tab Analysis

**Purpose:** Understand exactly what each tab does and what it needs.

**Tasks:**

For each of the 10 tabs in App.tsx:
- [ ] Read the tab implementation
- [ ] List which hooks it uses
- [ ] List which stores it accesses
- [ ] Document what's displayed
- [ ] Document what's missing
- [ ] Note any bugs or issues

Create a table in IMPLEMENTATION_STATUS.md with this information.

---

## PHASE 3: Architecture Refactoring (Clean Slate)

**Goal:** Extract all tabs to modular components before adding new features.

**Duration:** 3-4 days

**Priority:** HIGH - This must be completed before adding features to avoid merge conflicts.

### 3.1 Create Directory Structure

**Tasks:**

- [x] Create `src/components/` directory (if not exists) - ALREADY EXISTS
- [x] Create `src/components/Tabs/` directory - ALREADY EXISTS
- [x] Create `src/components/Layout/` directory - ALREADY EXISTS
- [x] Create `src/components/UI/` directory (for shared components) - EXISTS as `ui/` (lowercase)

---

### 3.2 Extract Layout Components

**Tasks:**

#### 3.2.1 Create AppHeader Component
- [x] Create `src/components/Layout/AppHeader.tsx` - COMPLETED 2025-01-24
- [x] Extract header JSX from App.tsx (lines 34-40) - COMPLETED 2025-01-24
- [x] Make title and subtitle props - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24

#### 3.2.2 Create Sidebar Component
- [x] Create `src/components/Layout/Sidebar.tsx` - COMPLETED 2025-01-24
- [x] Extract sidebar JSX from App.tsx (lines 44-63) - COMPLETED 2025-01-24
- [x] Make tabs array a prop - COMPLETED 2025-01-24
- [x] Make activeTab and onTabChange props - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24

#### 3.2.3 Create MainLayout Component
- [x] Create `src/components/Layout/MainLayout.tsx` - COMPLETED 2025-01-24
- [x] Extract container layout from App.tsx (lines 42-80) - COMPLETED 2025-01-24
- [x] Make children a prop - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24

---

### 3.3 Extract Tab Components

**Tasks:**

For each tab, create a separate file and extract the implementation:

#### 3.3.1 Extract PlaylistLoaderTab
- [x] Create `src/components/Tabs/PlaylistLoaderTab.tsx` - COMPLETED 2025-01-24
- [x] Copy PlaylistTab function from App.tsx (lines 85-160) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.2 Extract AudioAnalysisTab
- [x] Create `src/components/Tabs/AudioAnalysisTab.tsx` - COMPLETED 2025-01-24
- [x] Copy AudioTab function from App.tsx (lines 85-143) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.3 Extract CharacterGenTab
- [x] Create `src/components/Tabs/CharacterGenTab.tsx` - COMPLETED 2025-01-24
- [x] Copy CharacterTab function from App.tsx (lines 85-232) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hooks and stores)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.4 Extract SessionTrackingTab
- [x] Create `src/components/Tabs/SessionTrackingTab.tsx` - COMPLETED 2025-01-24
- [x] Copy SessionTab function from App.tsx (lines 85-166) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hooks and stores)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.5 Extract XPCalculatorTab
- [x] Create `src/components/Tabs/XPCalculatorTab.tsx` - COMPLETED 2025-01-24
- [x] Copy XPTab function from App.tsx (lines 84-127) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hooks)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.6 Extract CharacterLevelingTab
- [x] Create `src/components/Tabs/CharacterLevelingTab.tsx` - COMPLETED 2025-01-24
- [x] Copy LevelingTab function from App.tsx (lines 84-241) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hooks and stores)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.7 Extract EnvironmentalSensorsTab
- [x] Create `src/components/Tabs/EnvironmentalSensorsTab.tsx` - COMPLETED 2025-01-24
- [x] Copy SensorsTab function from App.tsx (lines 84-201) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hooks)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.8 Extract GamingPlatformsTab
- [x] Create `src/components/Tabs/GamingPlatformsTab.tsx` - COMPLETED 2025-01-24
- [x] Copy GamingTab function from App.tsx (lines 84-125) - COMPLETED 2025-01-24
- [x] Add props interface if needed - COMPLETED 2025-01-24 (No props needed - uses hook)
- [x] Ensure all imports are included - COMPLETED 2025-01-24
- [x] Export as default - COMPLETED 2025-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2025-01-24 (TypeScript compilation passes)

#### 3.3.9 Extract CombatSimulatorTab
- [x] Create `src/components/Tabs/CombatSimulatorTab.tsx` - COMPLETED 2026-01-24
- [x] Copy CombatTab function from App.tsx (lines 84-111) - COMPLETED 2026-01-24
- [x] Add props interface if needed - COMPLETED 2026-01-24 (No props needed - uses hooks and stores)
- [x] Ensure all imports are included - COMPLETED 2026-01-24
- [x] Export as default - COMPLETED 2026-01-24
- [x] Test: Verify tab still works after extraction - COMPLETED 2026-01-24 (TypeScript compilation passes)

#### 3.3.10 Extract SettingsTab
- [ ] Create `src/components/Tabs/SettingsTab.tsx`
- [ ] Copy SettingsTab function from App.tsx (lines 849-876)
- [ ] Add props interface if needed
- [ ] Ensure all imports are included
- [ ] Export as default
- [ ] Test: Verify tab still works after extraction

---

### 3.4 Update App.tsx

**Tasks:**

- [ ] Import all extracted tab components
- [ ] Import layout components (AppHeader, Sidebar, MainLayout)
- [ ] Remove inline tab function implementations
- [ ] Update tab rendering to use imported components
- [ ] Verify App.tsx is now ~100-150 lines (down from 877)
- [ ] Test: Run app and verify all tabs work

---

### 3.5 Fix useSessionTracker Dependency Bug

**Tasks:**

- [ ] Open `src/hooks/useSessionTracker.ts`
- [ ] Find the useEffect with environmentalContext/gamingContext dependencies
- [ ] Remove unused dependencies from dependency array
- [ ] Test: Verify sessions still start/end correctly
- [ ] Test: Verify no unnecessary hook recreations

---

### 3.6 Create Shared UI Components

**Tasks:**

#### 3.6.1 Create RawJsonDump Component
- [ ] Create `src/components/UI/RawJsonDump.tsx`
- [ ] Accept props: data, title, defaultOpen
- [ ] Use HTML `<details>` and `<summary>` for collapsible
- [ ] Format JSON with 2-space indent
- [ ] Add syntax highlighting colors (optional)
- [ ] Add timestamp display
- [ ] Export as default

#### 3.6.2 Create StatusIndicator Component
- [ ] Create `src/components/UI/StatusIndicator.tsx`
- [ ] Accept props: status ('healthy' | 'degraded' | 'error'), label
- [ ] Display emoji: 🟢 for healthy, 🟡 for degraded, 🔴 for error
- [ ] Style as badge
- [ ] Export as default

#### 3.6.3 Create LoadingSpinner Component
- [ ] Create `src/components/UI/LoadingSpinner.tsx`
- [ ] Accept props: size, label
- [ ] Display animated spinner
- [ ] Export as default

---

### 3.7 Verify Refactoring Complete

**Tasks:**

- [ ] Run `npm run build` - verify no TypeScript errors
- [ ] Run `npm run dev` - verify app starts
- [ ] Click through all 10 tabs - verify each renders
- [ ] Check console - verify no errors
- [ ] Create smoke test checklist

---

## PHASE 4: Core Feature Completion

**Goal:** Complete all incomplete features for each tab.

**Duration:** 7-10 days

### 4.1 Playlist Loader Tab

**Status:** Mostly complete ✅
**Missing:** Raw JSON dump section

**Tasks:**

#### 4.1.1 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` component after track list
- [ ] Show raw Arweave response data
- [ ] Show parsed ServerlessPlaylist object
- [ ] Add status indicator for parsing result

#### 4.1.2 Add Status Indicator
- [ ] Add `<StatusIndicator>` for fetch state
- [ ] Show 🟢 when playlist loads successfully
- [ ] Show 🔴 when fetch fails
- [ ] Show 🟡 when fetching

#### 4.1.3 (SKIPPED) File Upload Feature
- [ ] PER USER: Not needed - file upload exists on another site
- [ ] Mark FR-004 as "Not applicable for this showcase"

---

### 4.2 Audio Analysis Tab

**Status:** Mostly complete ✅
**Missing:** Color palette, advanced metrics, visualizations, raw JSON dump

**Tasks:**

#### 4.2.1 Add Color Palette Display
- [ ] Check if audioProfile.color_palette exists
- [ ] If exists, display color swatches:
  - [ ] Primary color
  - [ ] Secondary color
  - [ ] Tertiary color
  - [ ] Background color
  - [ ] Text color
- [ ] Show hex codes for each color
- [ ] Show isMonochrome boolean
- [ ] Show brightness value (0-1)
- [ ] Show saturation value (0-1)

#### 4.2.2 Add Advanced Metrics Display
- [ ] Check if spectral_centroid exists
- [ ] If exists, display value with label
- [ ] Check if spectral_rolloff exists
- [ ] If exists, display value with label
- [ ] Check if zero_crossing_rate exists
- [ ] If exists, display value with label
- [ ] Add note: "Only shown when includeAdvancedMetrics=true"

#### 4.2.3 Add Frequency Band Visualization
- [ ] Create simple bar chart using HTML/CSS
- [ ] Three bars: Bass, Mid, Treble
- [ ] Bar height = percentage value
- [ ] Color each bar differently
- [ ] Show exact percentages below each bar

#### 4.2.4 Add Sampling Timeline
- [ ] Create horizontal timeline visualization
- [ ] Mark positions: 5%, 40%, 70%
- [ ] Show total duration analyzed
- [ ] Show whether full buffer was analyzed

#### 4.2.5 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for audioProfile
- [ ] Show all analysis metadata
- [ ] Add status indicator for analysis result

---

### 4.3 Character Generation Tab

**Status:** Partially complete ⚠️
**Missing:** Determinism verification, real audio integration, raw JSON dump

**Tasks:**

#### 4.3.1 Connect to Real Audio Profile
- [ ] Read audioProfile from playlistStore (from Audio Analysis tab)
- [ ] Use selectedTrack.audio_url to generate character
- [ ] Use track UUID as seed instead of random mock data
- [ ] Update generateCharacter call to use real data

#### 4.3.2 Add Determinism Verification
- [ ] Add "Regenerate with Same Seed" button
- [ ] Store first character in state
- [ ] On regeneration, compare new character to stored
- [ ] Display "✓ Deterministic match!" if identical
- [ ] Display "✗ Mismatch!" if different (shouldn't happen)
- [ ] Show side-by-side comparison if mismatch

#### 4.3.3 Add Audio Trait Mapping Display
- [ ] Show which audio traits influenced which attributes:
  - [ ] Bass → STR
  - [ ] Treble → DEX
  - [ ] Amplitude → CON
  - [ ] Mid → INT
  - [ ] Balance → WIS
  - [ ] Mid + Amplitude → CHA
- [ ] Display as a table or list

#### 4.3.4 Add Character Export/Import
- [ ] Add "Export Character" button
- [ ] Download character as JSON file
- [ ] Add "Import Character" button
- [ ] Read JSON file and validate with Zod schema
- [ ] Load imported character into store

#### 4.3.5 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for character sheet
- [ ] Show all character data
- [ ] Add status indicator

---

### 4.4 Session Tracking Tab

**Status:** Complete ✅
**Missing:** Raw JSON dump section

**Tasks:**

#### 4.4.1 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for active session
- [ ] Show session ID, start time, track info
- [ ] Show elapsed time
- [ ] Add status indicator for session state

---

### 4.5 XP Calculator Tab

**Status:** Minimal implementation ⚠️
**Missing:** Context integration, bonus breakdown, raw JSON dump, manual overrides

**Tasks:**

#### 4.5.1 Connect Environmental Context
- [ ] Read environmentalContext from sensorStore
- [ ] Display current environmental data
- [ ] Show environmental XP modifier if available
- [ ] Add note: "From Environmental Sensors tab"

#### 4.5.2 Connect Gaming Context
- [ ] Read gamingContext from gamingStore
- [ ] Display current gaming status
- [ ] Show gaming XP multiplier if actively gaming
- [ ] Add note: "From Gaming Platforms tab"

#### 4.5.3 Add Bonus Breakdown Display
- [ ] Create breakdown table showing:
  - [ ] Base XP (duration × rate)
  - [ ] Activity multiplier (if available)
  - [ ] Environmental bonuses (night, weather, altitude)
  - [ ] Gaming bonus (if actively gaming)
  - [ ] Mastery bonus (if mastered)
- [ ] Show final total XP

#### 4.5.4 Add Visualization
- [ ] Create simple pie chart using CSS conic-gradient
- [ ] Show percentage of XP from each source
- [ ] Add legend

#### 4.5.5 Add Manual Overrides (For Testing)
- [ ] Add "Manual Mode" toggle
- [ ] When enabled, show input fields:
  - [ ] Base XP override
  - [ ] Environmental modifier override (0.5 - 3.0)
  - [ ] Gaming modifier override (1.0 - 1.75)
  - [ ] Mastery toggle
- [ ] When disabled, read from stores (auto mode)

#### 4.5.6 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for XP calculation result
- [ ] Show all inputs and outputs
- [ ] Add status indicator

---

### 4.6 Character Leveling Tab

**Status:** Complete ✅
**Missing:** Raw JSON dump section

**Tasks:**

#### 4.6.1 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for character state
- [ ] Show XP, level, thresholds
- [ ] Add status indicator

---

### 4.7 Environmental Sensors Tab

**Status:** Excellent implementation ✅
**Priority:** iOS/Android permission verification
**Missing:** Advanced visualizations, raw JSON dump

**Tasks:**

#### 4.7.1 Verify Permissions on iOS Safari
- [ ] Open app on iPhone/iPad
- [ ] Test geolocation permission request
- [ ] Test motion permission request (iOS 13+ DeviceMotionEvent)
- [ ] Test light sensor availability
- [ ] Document which permissions work
- [ ] Document any permission dialogs shown
- [ ] Note any iOS-specific issues

#### 4.7.2 Verify Permissions on Android Chrome
- [ ] Open app on Android device
- [ ] Test geolocation permission request
- [ ] Test motion permission request
- [ ] Test light sensor availability
- [ ] Document which permissions work
- [ ] Document any permission dialogs shown
- [ ] Note any Android-specific issues

#### 4.7.3 Add Permission Status Indicators
- [ ] Add `<StatusIndicator>` for each sensor type
- [ ] Show 🟢 when permission granted
- [ ] Show 🔴 when permission denied
- [ ] Show 🟡 when permission not requested yet
- [ ] Display sensor type label next to indicator

#### 4.7.4 Add Live Motion Visualization
- [ ] Create simple line graph for X acceleration
- [ ] Create simple line graph for Y acceleration
- [ ] Create simple line graph for Z acceleration
- [ ] Update graphs in real-time as data comes in
- [ ] Show current activity type (stationary/walking/running)

#### 4.7.5 Add GPS Coordinate Display
- [ ] Show latitude/longitude on a mini map placeholder
- [ ] Show altitude, speed, heading if available
- [ ] Show detected biome (urban/forest/etc.)
- [ ] Link to Google Maps for actual location

#### 4.7.6 Add Weather Status Display
- [ ] Show weather icon based on weather_type
- [ ] Show temperature with feels_like
- [ ] Show humidity percentage
- [ ] Show wind speed and direction
- [ ] Show day/night indicator
- [ ] Show moon phase if available

#### 4.7.7 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for environmentalContext
- [ ] Show all sensor data
- [ ] Add timestamp
- [ ] Add status indicators for each sensor

---

### 4.8 Gaming Platforms Tab

**Status:** Basic implementation ⚠️
**Important:** Remove Discord game activity tracking (not supported)
**Keep:** Discord music status setting

**Tasks:**

#### 4.8.1 Remove Discord Game Activity Tracking
- [ ] Remove any code that tries to read Discord game activity
- [ ] Add comment: "Discord RPC cannot read game activity (platform limitation)"
- [ ] Keep only Steam game activity tracking

#### 4.8.2 Add Discord Music Status Setting
- [ ] Add "Connect Discord" button
- [ ] Add Discord Client ID input field
- [ ] Implement connection flow
- [ ] Show connection status (🟢 connected / 🔴 disconnected)
- [ ] When connected, add "Set Music Status" button
- [ ] Set Discord status to "Listening to {song}" when playing
- [ ] Show progress bar on Discord status
- [ ] Clear status when session ends

#### 4.8.3 Improve Steam Integration
- [ ] Display current Steam game name
- [ ] Display game genre if available
- [ ] Show session duration
- [ ] Show lifetime gaming minutes
- [ ] Show games played while listening list

#### 4.8.4 Add Gaming Bonus Display
- [ ] Calculate and display gaming XP multiplier
- [ ] Show formula: 1.0 + (sessionMinutes × 0.01), max 1.75
- [ ] Show when bonus is active

#### 4.8.5 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for gamingContext
- [ ] Show Steam activity data
- [ ] Show Discord connection status
- [ ] Add status indicators

---

### 4.9 Combat Simulator Tab

**Status:** Incomplete ❌
**Priority:** HIGH - This is the most complex missing feature
**Requirement:** Full turn-by-turn simulation with manual "Next Turn" stepping

**Tasks:**

#### 4.9.1 Store Combat State
- [ ] Add combat state to component
- [ ] Store: CombatInstance, currentTurnIndex, roundNumber
- [ ] Store: combat log array
- [ ] Initialize to null (no combat running)

#### 4.9.2 Display Combatant Cards
- [ ] Show each combatant as a card:
  - [ ] Name, race, class
  - [ ] HP bar (green >50%, yellow 25-50%, red <25%)
  - [ ] Current HP / Max HP
  - [ ] Initiative roll
  - [ ] Highlight current turn combatant
- [ ] Show initiative order on side

#### 4.9.3 Implement Combat Log
- [ ] Create scrollable log section
- [ ] Each log entry shows:
  - [ ] Round number
  - [ ] Combatant name
  - [ ] Action type (Attack, Spell, Dodge, etc.)
  - [ ] Roll values (d20 + modifier = total)
  - [ ] Hit/miss result
  - [ ] Damage dealt (if any)
  - [ ] HP change
- [ ] Use color coding:
  - [ ] Green for hits
  - [ ] Red for misses
  - [ ] Blue for spells
  - [ ] Yellow for status effects

#### 4.9.4 Implement "Next Turn" Button
- [ ] Add button to advance to next combatant
- [ ] On click:
  - [ ] Get current combatant
  - [ ] Execute their action (auto-attack for now)
  - [ ] Log the action
  - [ ] Apply damage if hit
  - [ ] Check for defeated combatants
  - [ ] Check for combat end
  - [ ] Advance to next combatant
  - [ ] Increment round if back to first combatant

#### 4.9.5 Implement Combat Resolution
- [ ] When only one side remains:
  - [ ] Declare winner
  - [ ] Calculate XP awarded
  - [ ] Show rounds elapsed
  - [ ] Display victory overlay
- [ ] Add "Restart Combat" button

#### 4.9.6 Add Manual Attack Controls
- [ ] For current combatant, show:
  - [ ] List of available attacks
  - [ ] List of available targets
  - [ ] "Attack" button for each combination
- [ ] Allow user to choose action instead of auto-attack

#### 4.9.7 Add "Auto-Play" Button
- [ ] Add button to run entire combat automatically
- [ ] Use setInterval to advance turns every 1-2 seconds
- [ ] Scroll log to bottom as it updates
- [ ] Stop when combat ends
- [ ] Add "Pause" button

#### 4.9.8 Add Spell Casting UI
- [ ] For spellcasting combatants, show:
  - [ ] List of known spells
  - [ ] Spell slots remaining
  - [ ] Target selection
  - [ ] "Cast" button

#### 4.9.9 Add Combat Result Overlay
- [ ] When combat ends, show overlay:
  - [ ] Winner name
  - [ ] XP awarded
  - [ ] Rounds elapsed
  - [ ] Total turns
  - [ ] "Close" button to return to tab

#### 4.9.10 Add Raw JSON Dump Section
- [ ] Add `<RawJsonDump>` for CombatInstance
- [ ] Show all combatants, actions, history
- [ ] Add status indicator

---

### 4.10 Settings Tab

**Status:** Placeholder only ⚠️
**Missing:** All save/load functionality, export/import

**Tasks:**

#### 4.10.1 Wire OpenWeather API Key
- [ ] Get current value from appStore
- [ ] Set as input default value
- [ ] On change, call appStore.updateSettings
- [ ] Show save indicator

#### 4.10.2 Wire Steam API Key
- [ ] Get current value from appStore
- [ ] Set as input default value
- [ ] On change, call appStore.updateSettings
- [ ] Show save indicator

#### 4.10.3 Add Discord Client ID Input
- [ ] Add input field for Discord Client ID
- [ ] Get current value from appStore
- [ ] On change, call appStore.updateSettings

#### 4.10.4 Add Audio FFT Size Dropdown
- [ ] Create dropdown with options: 1024, 2048, 4096
- [ ] Get current value from appStore
- [ ] On change, call appStore.updateSettings

#### 4.10.5 Add Base XP Rate Slider
- [ ] Create slider from 0.1 to 5.0
- [ ] Show current value
- [ ] Get current value from appStore
- [ ] On change, call appStore.updateSettings

#### 4.10.6 Implement Export All Data
- [ ] Add "Export All Data to JSON" button
- [ ] Gather data from all stores:
  - [ ] playlistStore
  - [ ] characterStore
  - [ ] sensorStore
  - [ ] gamingStore
  - [ ] appStore
- [ ] Create combined JSON object
- [ ] Trigger download as file

#### 4.10.7 Implement Import Data
- [ ] Add "Import from JSON File" button
- [ ] Add file input (accept .json)
- [ ] On file select:
  - [ ] Read file
  - [ ] Validate JSON structure
  - [ ] Load data into each store
  - [ ] Show success/error message

#### 4.10.8 Add Reset to Defaults
- [ ] Add "Reset to Defaults" button
- [ ] On click:
  - [ ] Confirm with user
  - [ ] Reset all stores to initial state
  - [ ] Clear LocalForage
  - [ ] Show success message

#### 4.10.9 Add Verbose Logging Toggle
- [ ] Add toggle for verbose logging
- [ ] Connect to logger utility
- [ ] Get current value from appStore
- [ ] On change, call appStore.updateSettings

#### 4.10.10 Test Settings Persistence
- [ ] Set a setting
- [ ] Refresh page
- [ ] Verify setting persisted
- [ ] Test all settings

---

## PHASE 5: Cross-Cutting Features

**Goal:** Add features that apply across all tabs.

**Duration:** 3-4 days

### 5.1 Add Raw JSON Dump to All Tabs

**Purpose:** Expose all engine data for verification and learning.

**Tasks:**

For each tab:
- [ ] Playlist: Add raw JSON dump for ServerlessPlaylist
- [ ] Audio: Add raw JSON dump for AudioProfile
- [ ] Character: Add raw JSON dump for CharacterSheet
- [ ] Session: Add raw JSON dump for ListeningSession
- [ ] XP: Add raw JSON dump for XPCalculation
- [ ] Leveling: Add raw JSON dump for character state
- [ ] Sensors: Add raw JSON dump for EnvironmentalContext
- [ ] Gaming: Add raw JSON dump for GamingContext
- [ ] Combat: Add raw JSON dump for CombatInstance
- [ ] Settings: Add raw JSON dump for app settings

For each dump:
- [ ] Use `<RawJsonDump>` component
- [ ] Add descriptive title
- [ ] Default to collapsed (optional)
- [ ] Show data after engine operation completes
- [ ] Add timestamp
- [ ] Add copy to clipboard button

---

### 5.2 Add Status Indicators to All Tabs

**Purpose:** Show visual health status of each engine module.

**Tasks:**

For each tab:
- [ ] Identify what constitutes healthy/degraded/error
- [ ] Add `<StatusIndicator>` at top of tab
- [ ] Update status based on operation results

Status definitions:
- [ ] 🟢 Healthy: Operation completed successfully
- [ ] 🟡 Degraded: Operation completed with fallbacks/warnings
- [ ] 🔴 Error: Operation failed

---

### 5.3 Add Console Logging Audit

**Purpose:** Ensure all operations are logged for debugging.

**Tasks:**

For each tab:
- [ ] Verify inputs are logged before engine operations
- [ ] Verify outputs are logged after engine operations
- [ ] Verify errors are logged with stack traces
- [ ] Add missing logs where needed
- [ ] Use consistent log format:
  - [ ] `[TabName] Input: {data}`
  - [ ] `[TabName] Output: {data}`
  - [ ] `[TabName] Error: {message}`

---

### 5.4 Mobile Responsiveness Testing

**Purpose:** Ensure app works on mobile devices for sensor testing.

**Tasks:**

#### 5.4.1 Test Layout on Mobile
- [ ] Test header displays correctly
- [ ] Test sidebar navigation (may need hamburger menu)
- [ ] Test main content area width
- [ ] Test tab content scrolling

#### 5.4.2 Test Each Tab on Mobile
- [ ] Playlist: Verify track list scrolls
- [ ] Audio: Verify visualizations scale
- [ ] Character: Verify character sheet fits
- [ ] Session: Verify timer displays
- [ ] XP: Verify calculator inputs work
- [ ] Leveling: Verify buttons are touch-friendly
- [ ] Sensors: Verify permission buttons work
- [ ] Gaming: Verify inputs work
- [ ] Combat: Verify cards stack
- [ ] Settings: Verify inputs work

#### 5.4.3 Fix Responsive Issues
- [ ] Adjust sidebar to bottom navigation on mobile
- [ ] Make tables stack vertically
- [ ] Increase touch target sizes (min 44px)
- [ ] Adjust font sizes for readability

---

### 5.5 Performance Testing

**Purpose:** Ensure app is responsive and doesn't freeze.

**Tasks:**

#### 5.5.1 Test Audio Analysis Performance
- [ ] Analyze 3-minute track
- [ ] Measure time to complete
- [ ] Verify UI doesn't freeze
- [ ] Target: <10 seconds

#### 5.5.2 Test Combat Performance
- [ ] Run 50-round combat
- [ ] Measure time to complete
- [ ] Verify UI updates smoothly
- [ ] Target: <5 seconds for auto-play

#### 5.5.3 Test Export Performance
- [ ] Export 100 characters
- [ ] Measure time to complete
- [ ] Verify browser doesn't hang

---

### 5.6 Error Recovery Testing

**Purpose:** Ensure app handles errors gracefully.

**Tasks:**

#### 5.6.1 Test Audio URL Failures
- [ ] Enter invalid Arweave TX ID
- [ ] Verify error message is user-friendly
- [ ] Verify app doesn't crash
- [ ] Test CORS failure scenario
- [ ] Test 404 scenario

#### 5.6.2 Test Sensor Permission Denial
- [ ] Deny geolocation permission
- [ ] Verify simulated data is shown
- [ ] Verify error message explains why
- [ ] Deny motion permission
- [ ] Verify graceful degradation

#### 5.6.3 Test API Key Validation
- [ ] Enter invalid OpenWeather API key
- [ ] Verify error message
- [ ] Verify app continues without weather
- [ ] Enter invalid Steam API key
- [ ] Verify error message

---

## PHASE 6: Polish & Final Verification

**Goal:** Final polish and comprehensive testing.

**Duration:** 2-3 days

### 6.1 Documentation Polish

**Tasks:**

#### 6.1.1 Create ARCHITECTURE.md
- [ ] Document project structure
- [ ] Explain hook pattern
- [ ] Explain store pattern
- [ ] Explain component structure
- [ ] Add directory tree

#### 6.1.2 Create CONTRIBUTING.md
- [ ] Add setup instructions
- [ ] Add development workflow
- [ ] Add testing guidelines
- [ ] Add PR guidelines

#### 6.1.3 Create DEBUGGING.md
- [ ] Add console log guide
- [ ] Add common issues
- [ ] Add troubleshooting steps

#### 6.1.4 Add JSDoc Comments
- [ ] Add JSDoc to all hook exports
- [ ] Add JSDoc to all store actions
- [ ] Add JSDoc to all component props

---

### 6.2 Final Smoke Test

**Tasks:**

#### 6.2.1 Test Complete User Flow
- [ ] Load playlist from Arweave
- [ ] Analyze audio
- [ ] Generate character
- [ ] Start session
- [ ] End session
- [ ] Calculate XP
- [ ] Level up character
- [ ] Request sensor permissions
- [ ] Start combat
- [ ] Finish combat
- [ ] Change settings
- [ ] Export data
- [ ] Import data

#### 6.2.2 Test All Engine Features
- [ ] ✅ PlaylistParser
- [ ] ✅ AudioAnalyzer
- [ ] ✅ CharacterGenerator
- [ ] ✅ SessionTracker
- [ ] ✅ XPCalculator
- [ ] ✅ CharacterUpdater
- [ ] ✅ EnvironmentalSensors
- [ ] ✅ GamingPlatformSensors
- [ ] ✅ CombatEngine

#### 6.2.3 Test Determinism
- [ ] Generate character twice with same seed
- [ ] Verify results are identical
- [ ] Document verification

---

## Verification Criteria

The project is complete when:

### Documentation
- [ ] IMPLEMENTATION_STATUS.md exists and is accurate
- [ ] All original docs marked as historical
- [ ] Engine bug fixes verified or documented
- [ ] ARCHITECTURE.md, CONTRIBUTING.md, DEBUGGING.md exist

### Architecture
- [ ] All tabs are modular components
- [ ] App.tsx is <150 lines
- [ ] No unused dependencies in hooks
- [ ] Shared UI components created

### Features
- [ ] All 10 tabs demonstrate their engine module completely
- [ ] Combat tab shows full turn-by-turn simulation
- [ ] Settings tab saves/loads all configuration
- [ ] XP calculator shows all bonus sources
- [ ] Character gen has determinism verification
- [ ] Gaming tab has Discord music status (no game tracking)
- [ ] All tabs have raw JSON dump sections
- [ ] All tabs have status indicators

### Quality
- [ ] App works on mobile (iOS Safari, Android Chrome)
- [ ] Performance targets met (<10s audio, <5s combat)
- [ ] All operations logged to console
- [ ] Export/import works without data loss
- [ ] Error handling graceful with user-friendly messages

### Engine Showcase
- [ ] Every engine feature has a visible demonstration
- [ ] Developers can verify engine works via console logs
- [ ] Determinism is verifiable
- [ ] Sensor degradation is testable

---

## Task Count Summary

| Phase | Task Count | Duration |
|-------|-----------|----------|
| Phase 1: Documentation | ~25 | 1-2 days |
| Phase 2: Verification | ~45 | 2-3 days |
| Phase 3: Refactoring | ~35 | 3-4 days |
| Phase 4: Features | ~120 | 7-10 days |
| Phase 5: Cross-Cutting | ~35 | 3-4 days |
| Phase 6: Polish | ~20 | 2-3 days |
| **TOTAL** | **~280** | **18-26 days** |

---

## File References

### Show Case App Files
- Main App: `src/App.tsx`
- Hooks: `src/hooks/*.ts`
- Stores: `src/store/*.ts`
- Utilities: `src/utils/*.ts`
- Types: `src/types.ts`

### Documentation Files
- This Plan: `COMPLETION_PLAN.md`
- Implementation Status: `IMPLEMENTATION_STATUS.md` (to create)
- Historical Design: `DESIGN_DOCS/PLAYLIST_DATA_ENGINE_SHOWCASE.md`
- Historical Tasks: `specs/01-engine-showcase/tasks.md`
- Engine Bugs: `DESIGN_DOCS/BUGS_TO_FIX.md`

### Engine Reference Files (External)
- Engine API: `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md`
- Usage Guide: `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md`

---

## Notes

- This plan prioritizes **verification and cleanup** before adding new features
- **Architecture refactoring** (Phase 3) is a hard requirement before Phase 4
- **Combat system** (Phase 4.9) is the largest feature and estimated to take 1-2 days
- **iOS/Android testing** (Phase 4.7) requires real devices
- All tasks are written as **granular checkboxes** for easy tracking
- Each phase ends with **verification criteria** to ensure completion

---

**Last Updated:** 2025-01-24
**Status:** Ready for execution
