# Implementation Plan: Playlist Data Engine Showcase App

**Branch**: `01-engine-showcase` | **Date**: 2025-12-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/01-engine-showcase/spec.md`

---

## Summary

Build a single-page web application that demonstrates and validates all 9 modules of the `playlist-data-engine` package through 10 isolated, data-focused tabs. The app is purely technical validation—no gameplay, narrative, or cosmetics—with comprehensive console logging as the primary debugging interface. Developers verify engine functionality by observing raw data flows in console logs and inspecting structured displays of engine outputs.

**Core approach**: React 18 + TypeScript frontend exposing engine modules directly, with LocalForage persistence and graceful sensor degradation. Console logging replaces formal tests as the mechanism for understanding engine behavior.

---

## Technical Context

**Language/Version**: TypeScript 5.x (React 18)

**Primary Dependencies**:
- `@audio-alchemist/playlist-data-engine` (core)
- React 18 + React Router v6 (navigation)
- TailwindCSS (styling)
- Zustand (state management)
- LocalForage (persistence)
- Web Audio API (audio analysis)
- Browser Geolocation, Motion, Light APIs (sensors)
- OpenWeatherMap API (weather), Steam Web API, Discord OAuth (optional integrations)

**Storage**: LocalForage (IndexedDB wrapper); no backend database

**Testing**: Console logging + manual verification (NO test frameworks)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge); mobile responsive (single column)

**Project Type**: Web single-page application (SPA)

**Performance Goals**:
- Audio analysis: < 10 seconds
- Combat simulation (50 rounds): < 5 seconds
- Tab navigation: immediate (no loading spinners)
- Character generation: < 2 seconds

**Constraints**:
- No gameplay mechanics or combat strategy
- No cosmetic economy or narrative
- No formal test files (zero `.test.ts`, `.spec.ts`)
- All state visible through console logging
- Sensors degrade gracefully when unavailable

**Scale/Scope**:
- 10 tabs (1 per engine module + 1 settings)
- Up to 20 visible characters + unlimited session history
- Support 50+ concurrent listening sessions in history
- Audio files up to 100MB (sampled, not fully buffered)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Required Gates** (from `.specify/memory/constitution.md` v1.1.0):

1. **Purity Check**: Feature does not introduce gameplay mechanics or narrative elements
2. **Reproducibility Check**: Feature uses seeded RNGs or deterministic algorithms where applicable
3. **Logging Check**: Feature includes comprehensive console logging; NO test files or test suites
4. **Completeness Check**: Feature is part of core module coverage (9 modules total)
5. **Degradation Check**: Feature handles sensor/API failures gracefully (if applicable)

**Gate Status** (mark ✅ PASS or ⚠ NEEDS JUSTIFICATION):

- ✅ **Purity Check**: PASS
  - No XP wagers, shop, cosmetics, or narratives
  - All tabs expose raw engine output without decorative mechanics
  - Character names derived from track data only (no personalization)

- ✅ **Reproducibility Check**: PASS
  - Character generator uses seeded RNGs from engine (same seed → same character)
  - Character Generation tab includes "Regenerate & Compare" feature
  - Audio analysis deterministic within tolerance (same file → same frequency breakdown)
  - Combat engine deterministic (same combatants + seed → same outcome)

- ✅ **Logging Check**: PASS
  - Every tab logs inputs/outputs before/after engine operations
  - Categorized console logging: `[PlaylistParser]`, `[AudioAnalyzer]`, etc.
  - Errors logged with full stack traces
  - State changes logged (before/after snapshots)
  - Zero test files, zero assertions, zero test runners

- ✅ **Completeness Check**: PASS
  - All 9 modules covered (1 tab per module, 1 settings tab = 10 tabs)
  - PlaylistParser → Playlist Loader
  - AudioAnalyzer → Audio Analysis
  - CharacterGenerator → Character Generation
  - SessionTracker → Session Tracking
  - XPCalculator → XP Calculator
  - CharacterUpdater + LevelUpProcessor → Character Leveling
  - EnvironmentalSensors → Environmental Sensors
  - GamingPlatformSensors → Gaming Platforms
  - CombatEngine → Combat Simulator
  - Settings → API keys + preferences

- ✅ **Degradation Check**: PASS
  - Geolocation, Motion, Light sensors: request permissions; use simulated data if denied/unavailable
  - Weather API: fallback to default values if API key missing or request fails
  - Steam/Discord: optional authentication; app works without them
  - Audio URLs: error logged if CORS fails; can use different track
  - Session history: persisted; app continues if IndexedDB unavailable (in-memory fallback)

**All gates PASS**: Feature is approved for Phase 0 research and design.

---

## Project Structure

### Documentation (this feature)

```text
specs/01-engine-showcase/
├── spec.md                          # Feature specification
├── plan.md                          # This file
├── research.md                      # Phase 0 research (TBD)
├── data-model.md                    # Phase 1 data model (TBD)
├── quickstart.md                    # Phase 1 quickstart (TBD)
├── contracts/                       # Phase 1 API contracts (TBD)
│   ├── playlist-loader.md
│   ├── audio-analyzer.md
│   ├── character-generator.md
│   ├── session-tracker.md
│   ├── xp-calculator.md
│   ├── character-updater.md
│   ├── environmental-sensors.md
│   ├── gaming-platforms.md
│   └── combat-simulator.md
├── checklists/
│   └── requirements.md              # Quality checklist
└── tasks.md                         # Phase 2 tasks (TBD)
```

### Source Code (repository root)

Frontend SPA structure:

```text
src/
├── components/
│   ├── Tabs/
│   │   ├── PlaylistLoaderTab.tsx
│   │   ├── AudioAnalysisTab.tsx
│   │   ├── CharacterGenTab.tsx
│   │   ├── SessionTrackingTab.tsx
│   │   ├── XPCalculatorTab.tsx
│   │   ├── CharacterLevelingTab.tsx
│   │   ├── EnvironmentalSensorsTab.tsx
│   │   ├── GamingPlatformsTab.tsx
│   │   ├── CombatSimulatorTab.tsx
│   │   └── SettingsTab.tsx
│   ├── Sidebar.tsx                  # Quick reference panel
│   └── Layout.tsx                   # Tab navigation + layout
├── store/
│   ├── playlistStore.ts             # Zustand store for playlist
│   ├── characterStore.ts            # Character sheet state
│   ├── sessionStore.ts              # Session history
│   ├── sensorStore.ts               # Environmental & gaming sensor data
│   └── appStore.ts                  # Global app state
├── hooks/
│   ├── usePlaylistParser.ts
│   ├── useAudioAnalyzer.ts
│   ├── useCharacterGenerator.ts
│   ├── useSessionTracker.ts
│   ├── useXPCalculator.ts
│   ├── useCharacterUpdater.ts
│   ├── useEnvironmentalSensors.ts
│   ├── useGamingPlatforms.ts
│   └── useCombatEngine.ts
├── utils/
│   ├── logger.ts                    # Categorized console logging utility
│   ├── storage.ts                   # LocalForage helpers
│   ├── formatting.ts                # Display formatting
│   ├── errorHandling.ts             # Error catching and logging
│   └── sensorDegradation.ts         # Graceful fallback handlers
├── types/
│   └── index.ts                     # TypeScript interfaces (from engine)
├── App.tsx
├── App.css
└── index.tsx

public/
├── index.html
└── favicon.ico
```

**Structure Decision**: Single web SPA with 10 tabs in a tabbed interface. No backend API—all engine code runs client-side. State managed via Zustand stores and persisted via LocalForage.

---

## Implementation Phases

### Phase 0: Research & Clarification (Synchronous)

**Goal**: Resolve technical unknowns and finalize architecture decisions.

**Research Tasks**:
1. Verify `playlist-data-engine` module exports and interfaces
2. Document AudioAnalyzer "Triple Tap" sampling strategy for web integration
3. Research Web Audio API frequency analysis (FFT, band separation)
4. Research browser Geolocation, DeviceMotion, AmbientLightSensor APIs and fallback patterns
5. Research Steam Web API and Discord OAuth integration patterns
6. Research Zustand store structure for 9-module state isolation
7. Document LocalForage + IndexedDB for session/character persistence

**Deliverable**: `research.md` with decisions, rationales, and alternative considerations

---

### Phase 1: Design & Contracts (Synchronous)

**Prerequisites**: research.md complete

**Tasks**:

1. **Data Model** (`data-model.md`):
   - Entity definitions (Playlist, PlaylistTrack, AudioProfile, CharacterSheet, etc.)
   - Zod validation schemas for all engine outputs
   - State machine for sensor permission lifecycle
   - Session history schema

2. **API Contracts** (`.contracts/`):
   - One contract file per engine module
   - Input/output specs for each hook
   - Error scenarios and fallbacks
   - Data format examples (JSON)

3. **Quickstart** (`quickstart.md`):
   - "Hello World" walkthrough: Load playlist → Generate character → View logs
   - Tab-by-tab feature overview
   - Console log examples
   - Sensor permission flow

4. **Agent Context Update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add React 18, TailwindCSS, Zustand, LocalForage technology context

**Deliverable**: data-model.md, /contracts/*.md, quickstart.md, agent context updated

---

### Phase 2: Task Generation (via `/speckit.tasks` command)

**Prerequisites**: plan.md + spec.md complete

**Output**: tasks.md with:
- Phase Setup: Project initialization, dependencies, linting
- Phase Foundational: Logger utility, error handling, Zustand stores, LocalForage setup
- Phase US1 (P1): Playlist Loader → Audio Analysis → Character Gen (core P1 functionality)
- Phase US2 (P2): Session Tracking → XP Calculator (progression system)
- Phase US3 (P3): Combat Simulator (bonus feature)
- Phase Polish: Console logging audit, responsiveness, documentation

---

## Complexity Tracking

> **All gates PASS**: No complexity violations or justifications needed.

The feature is straightforward:
- All 9 modules are independent tab components
- No gameplay complexity (pure data display)
- No narrative or cosmetic systems to design
- Console logging replaces testing (simpler, more transparent)
- Browser APIs well-understood (Geolocation, Motion, Light, Web Audio)
- Zustand + LocalForage are proven patterns for React state + persistence

---

## Next Steps

1. ✅ **Constitution Check**: All gates PASS
2. 📋 **Phase 0**: Research & finalize architecture (ready for `/speckit.plan` execution or manual research)
3. 🏗️ **Phase 1**: Design data model, contracts, and quickstart
4. 📝 **Phase 2**: Generate tasks via `/speckit.tasks` command
5. 🚀 **Phase 3**: Implementation (after tasks generated)

---

**Status**: READY FOR PHASE 0 RESEARCH & PHASE 1 DESIGN

