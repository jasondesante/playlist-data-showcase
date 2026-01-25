<!--
  HISTORICAL DOCUMENT - Last updated December 2025

  For current implementation status, see /IMPLEMENTATION_STATUS.md
  For current task breakdown, see /COMPLETION_PLAN.md

  This document contains the original feature specification for the
  Playlist Data Engine Showcase App. It is kept here for historical
  context. The actual implementation may differ from this original spec.
-->

# Feature Specification: Playlist Data Engine Showcase App

**Feature Branch**: `01-engine-showcase`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "the whole app"

**Constitution Alignment**: This spec MUST align with the 5 core principles in `.specify/memory/constitution.md` (v1.1.0):
1. Technical Purity (no game mechanics or narrative)
2. Deterministic Reproducibility
3. Console Logging Over Test Suites (comprehensive logging; NO test files)
4. Feature Completeness Over Polish
5. Sensor Integration with Graceful Degradation

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Validates Entire Engine (Priority: P1)

A developer wants to quickly verify that the entire `playlist-data-engine` package works correctly across all feature categories.

**Why this priority**: This is the core purpose of the app. Developers are the primary users, and they need confidence that the engine is production-ready before using it in their own applications.

**Independent Test**: Developer can use the app to instantiate all 9 engine modules, view their outputs, and inspect console logs showing raw data flow—demonstrating end-to-end functionality without running any formal test suites.

**Acceptance Scenarios**:

1. **Given** the developer has loaded the app in a browser, **When** they navigate through all 10 tabs, **Then** each tab successfully instantiates its corresponding engine module and displays structured data
2. **Given** the Playlist Loader tab is open, **When** they paste an Arweave transaction ID or JSON, **Then** the playlist parses correctly and tracks display with metadata
3. **Given** the Character Generation tab is open, **When** they select a track and generate a character, **Then** the character sheet displays all D&D 5e attributes and can be regenerated deterministically
4. **Given** the Console is open (DevTools), **When** any engine operation executes, **Then** comprehensive logs show inputs, outputs, and state changes with readable categorization (e.g., `[PlaylistParser]`, `[AudioAnalyzer]`)
5. **Given** an engine operation fails (e.g., broken audio URL, denied sensor permission), **When** the failure occurs, **Then** the app logs the error with full stack trace and continues functioning

---

### User Story 2 - QA Tester Validates Individual Engine Modules (Priority: P2)

A QA tester wants to isolate and validate specific engine modules (e.g., just PlaylistParser, just CombatEngine) to identify flaws in the engine.

**Why this priority**: QA needs the ability to test modules independently to pinpoint failures. This supports the app's role as a technical validation tool.

**Independent Test**: QA tester can navigate to a specific tab, provide test inputs (playlist JSON, audio file, character data), and inspect console logs to verify module outputs are correct and deterministic.

**Acceptance Scenarios**:

1. **Given** the QA tester is in a specific module tab (e.g., Audio Analysis), **When** they provide test input, **Then** they can inspect the raw output in console logs and verify it matches expected engine behavior
2. **Given** the Character Generation tab is open, **When** they generate the same character twice with identical inputs, **Then** console logs show identical JSON output (determinism verified)
3. **Given** Environmental Sensors tab is open and sensor permission is denied, **When** the user clicks "Request Permission", **Then** fallback simulated data is shown with a clear label, and logs show the degradation flow

---

### User Story 3 - Team Lead Demonstrates Engine Capabilities (Priority: P3)

A team lead wants to show stakeholders/investors what the engine can do without exposing complexity or requiring them to run tests.

**Why this priority**: Business/investor demonstrations are secondary to developer/QA use. The app enables non-technical audiences to see engine outputs displayed clearly.

**Independent Test**: Team lead can open the app, navigate tabs, click buttons, and point to visual displays showing engine features (character sheets, combat logs, sensor data) with raw data visible in logs if interested.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** the user navigates to different tabs, **Then** each tab clearly shows what engine feature is being demonstrated (e.g., "PlaylistParser: Parses Arweave playlist data")
2. **Given** the audience has no technical background, **When** they see a character sheet, **Then** it displays all character attributes in a readable table format without requiring knowledge of D&D mechanics
3. **Given** a sensor fails or permission is denied, **When** fallback data is displayed, **Then** the difference between real and simulated data is clearly labeled

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a tabbed single-page application with 10 tabs, one for each core engine module or feature category
- **FR-002**: System MUST instantiate all 9 core engine modules (PlaylistParser, AudioAnalyzer, CharacterGenerator, SessionTracker, XPCalculator, CharacterUpdater, EnvironmentalSensors, GamingPlatformSensors, CombatEngine) and expose their capabilities
- **FR-003**: System MUST log all engine inputs, outputs, state changes, and errors to the browser console with categorized, human-readable formatting
- **FR-004**: System MUST support importing playlists from Arweave (via transaction ID) or raw JSON files
- **FR-005**: System MUST display parsed playlist metadata and track lists with sortable/filterable views
- **FR-006**: System MUST extract and display audio analysis results (frequency breakdown, color palette, metrics)
- **FR-007**: System MUST generate D&D 5e character sheets deterministically from audio profiles with full ability scores, skills, spells, and equipment
- **FR-008**: System MUST allow manual character generation testing with "regenerate and compare" functionality
- **FR-009**: System MUST request browser permissions for Geolocation, Motion, and Light sensors; gracefully degrade to simulated data if denied
- **FR-010**: System MUST display live environmental sensor data (GPS, motion, weather, light) with XP modifier calculations
- **FR-011**: System MUST authenticate and track Steam and Discord gaming activity when user provides credentials
- **FR-012**: System MUST allow session simulation (start/end listening sessions with duration and activity type)
- **FR-013**: System MUST calculate XP with bonuses based on duration, activity, environment, gaming context, and mastery
- **FR-014**: System MUST track character XP accumulation and apply level-ups with stat/HP/ability improvements
- **FR-015**: System MUST simulate D&D 5e combat with initiative, attack rolls, damage calculation, and combat logs
- **FR-016**: System MUST persist all app state to IndexedDB and allow full export/import as JSON
- **FR-017**: System MUST provide a Settings tab for API key configuration (OpenWeatherMap, Steam, Discord) and engine preferences
- **FR-018**: System MUST NOT include any formal test suites, unit tests, or test runners
- **FR-019**: System MUST NOT introduce gameplay mechanics, narratives, or cosmetic economy systems

### Key Entities *(include if feature involves data)*

- **Playlist**: Metadata (name, creator, image, genre, tags) + array of Tracks
- **PlaylistTrack**: Identity data (chain, contract, token ID), content (title, artist, audio URL, duration), metadata (genre, tags, BPM, key)
- **AudioProfile**: Bass/mid/treble dominance, amplitude, advanced metrics (spectral), color palette, analysis metadata
- **CharacterSheet**: Race, class, level, ability scores, skills, spells, equipment, appearance, XP
- **EnvironmentalContext**: Location, motion, weather, light, derived biome/time-of-day, XP modifier
- **GamingContext**: Current game, platform, activity status, lifetime gaming minutes
- **ListeningSession**: Track UUID, duration, start/end times, base XP, bonus XP, contexts
- **CombatInstance**: Combatants, current turn, round number, action history, winner/status

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 core engine modules are instantiable and produce output within the app (0 missing modules)
- **SC-002**: Character generation is verifiable as deterministic (same input produces identical JSON output)
- **SC-003**: Developers can inspect complete data flow by reading console logs; no silent failures or hidden operations
- **SC-004**: Environmental sensors degrade gracefully—if permissions denied or browser unsupported, app continues with simulated data labeled as such
- **SC-005**: Playlist parsing succeeds for valid Arweave JSON; invalid inputs logged with clear error messages
- **SC-006**: Audio analysis completes in under 10 seconds for typical audio files
- **SC-007**: Combat simulation runs 50-round encounter in under 5 seconds
- **SC-008**: All app state exports/imports without data loss; exported JSON is valid and reimportable
- **SC-009**: No test files or test runners present in codebase (zero `.test.ts`, `.spec.ts`, or test directories)
- **SC-010**: Mobile responsive layout (single-column) on phones; all tabs functional without horizontal scroll

---

## Assumptions

- **Audio Files**: Audio files are accessible via CORS-enabled URLs (Arweave URLs assumed CORS-enabled)
- **Browser APIs**: Geolocation, DeviceMotion, AmbientLightSensor, and Web Audio API available in modern browsers; degradation handled when unavailable
- **External Services**: OpenWeatherMap API requires valid key (optional); Steam/Discord APIs require user authentication (optional)
- **Engine Package**: `playlist-data-engine` exports all required modules and types; interfaces stable enough for reference implementation
- **Data Retention**: All state retained in session; cleared on browser close (LocalForage persists; no server sync)
- **User Knowledge**: Developers are familiar with D&D 5e mechanics and audio/signal processing concepts; no tutorials provided

---

## Edge Cases

- What happens when playlist JSON is malformed? (Logged error; partial data displayed or "unable to parse" message)
- How does the system handle missing audio URLs? (Audio analysis tab shows error; can use different track)
- What if sensor permission is revoked mid-session? (Logging continues; real sensor data stops, fallback data shown)
- How does combat handle characters with 0 HP? (Marked defeated; combat continues; log shows status)
- What if user rapidly switches between tabs? (Previous tab's async operations cancel or complete; no state corruption)
- How does export handle large character arrays? (JSON export limited by browser memory; user warned if >10MB)

