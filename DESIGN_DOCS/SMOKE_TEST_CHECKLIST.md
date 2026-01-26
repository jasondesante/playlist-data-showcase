# Smoke Test Checklist

**Purpose:** Quick verification that all basic functionality works after refactoring or changes.

**Last Updated:** 2026-01-24

---

## Pre-Test Setup

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run build` to verify TypeScript compilation passes
- [ ] Run `npm run dev` to start the development server
- [ ] Open browser to `http://localhost:5173`
- [ ] Open browser DevTools Console

---

## Tab Rendering Tests

For each tab below:
1. Navigate to the tab
2. Verify the tab renders without errors
3. Check console for any errors or warnings
4. Verify expected UI elements are present

### 1. Playlist Loader Tab
- [ ] Tab loads without errors
- [ ] Input field for Arweave TX ID is visible
- [ ] "Load Playlist" button is visible
- [ ] Track list area is visible (empty or populated)

### 2. Audio Analysis Tab
- [ ] Tab loads without errors
- [ ] Status indicator is visible
- [ ] Audio analysis controls are visible
- [ ] Results area is visible

### 3. Character Generation Tab
- [ ] Tab loads without errors
- [ ] "Generate Character" button is visible
- [ ] Character display area is visible
- [ ] Ability scores section is present
- [ ] **Game Mode Toggle is visible (Task 6.1.3)**
- [ ] **Can toggle between Standard and Uncapped modes (Task 6.1.3)**
- [ ] **Game mode badge displays on generated character (Task 6.1.3)**
- [ ] **Different modes produce different characters with same seed (Task 6.1.3)**

### 4. Session Tracking Tab
- [ ] Tab loads without errors
- [ ] "Start Session" button is visible
- [ ] "End Session" button is visible (disabled when no session active)
- [ ] Session timer display is visible

### 5. XP Calculator Tab
- [ ] Tab loads without errors
- [ ] Duration input field is visible
- [ ] "Calculate XP" button is visible
- [ ] Results display area is visible

### 6. Character Leveling Tab
- [ ] Tab loads without errors
- [ ] XP display is visible
- [ ] Level display is visible
- [ ] "Add XP" button is visible

### 7. Environmental Sensors Tab
- [ ] Tab loads without errors
- [ ] "Request Permissions" button is visible
- [ ] Sensor status indicators are visible
- [ ] Environmental data display area is visible

### 8. Gaming Platforms Tab
- [ ] Tab loads without errors
- [ ] Steam API input field is visible
- [ ] Discord Client ID input field is visible
- [ ] Connection status indicators are visible

### 9. Combat Simulator Tab
- [ ] Tab loads without errors
- [ ] "Start Combat" button is visible
- [ ] Combatant selection area is visible
- [ ] Combat results area is visible

### 10. Settings Tab
- [ ] Tab loads without errors
- [ ] API key input fields are visible
- [ ] Settings save indicators are present

---

## Component Rendering Tests

### Layout Components
- [ ] AppHeader displays title and subtitle correctly
- [ ] Sidebar displays all 10 tabs
- [ ] MainLayout container renders correctly
- [ ] Active tab is highlighted in sidebar

### Shared UI Components
- [ ] RawJsonDump component renders (when data is available)
- [ ] StatusIndicator component renders with all states
- [ ] LoadingSpinner component renders when loading

---

## Store Verification Tests

### playlistStore
- [ ] Store initializes without errors
- [ ] Can select a track
- [ ] Selected track persists (check with LocalForage)

### characterStore
- [ ] Store initializes without errors
- [ ] Can add a character
- [ ] Can update a character
- [ ] Characters persist (check with LocalForage)

### sensorStore
- [ ] Store initializes without errors
- [ ] Can update environmental context
- [ ] Context persists (check with LocalForage)

### gamingStore
- [ ] Store initializes without errors
- [ ] Can update gaming context
- [ ] Context persists (check with LocalForage)

### appStore
- [ ] Store initializes without errors
- [ ] Settings load correctly
- [ ] Can update settings
- [ ] Settings persist (check with LocalForage)

---

## Hook Verification Tests

All hooks should be importable and initialize without errors:

- [ ] usePlaylistParser
- [ ] useAudioAnalyzer
- [ ] useCharacterGenerator
- [ ] useSessionTracker
- [ ] useXPCalculator
- [ ] useEnvironmentalSensors
- [ ] useGamingPlatforms
- [ ] useCombatEngine

---

## Engine Integration Tests

Verify all engine imports work correctly:

- [ ] PlaylistParser imports from playlist-data-engine
- [ ] AudioAnalyzer imports from playlist-data-engine
- [ ] CharacterGenerator imports from playlist-data-engine
- [ ] SessionTracker imports from playlist-data-engine
- [ ] XPCalculator imports from playlist-data-engine
- [ ] EnvironmentalSensors imports from playlist-data-engine
- [ ] GamingPlatformSensors imports from playlist-data-engine
- [ ] CombatEngine imports from playlist-data-engine

---

## Console Output Checks

After clicking through all tabs:

- [ ] No TypeScript errors in console
- [ ] No React warnings in console
- [ ] No uncaught exceptions
- [ ] No missing import errors
- [ ] No CORS errors (unless testing external APIs)

---

## Performance Checks

- [ ] Page loads within 3 seconds on localhost
- [ ] Tab switches are instantaneous
- [ ] No UI freezes during interactions
- [ ] No memory leaks evident (check DevTools Memory profiler if needed)

---

## Mobile Responsive Checks (Optional)

- [ ] Header displays correctly on narrow viewport
- [ ] Sidebar is accessible on mobile
- [ ] Tab content is scrollable on mobile
- [ ] Touch targets are minimum 44px

---

## Test Results Summary

**Date:** ___________________

**Tester:** ___________________

**Build Hash:** ___________________

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Tab Rendering | ____ | ____ | |
| Components | ____ | ____ | |
| Stores | ____ | ____ | |
| Hooks | ____ | ____ | |
| Engine Imports | ____ | ____ | |
| Console | ____ | ____ | |
| Performance | ____ | ____ | |

**Overall Result:** ☐ Pass ☐ Fail

**Issues Found:**
```
(List any issues discovered during testing)
```

**Actions Required:**
```
(List any follow-up actions needed)
```
