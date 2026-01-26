<!--
SYNC IMPACT REPORT
==================
Version Change: v1.0.0 → v1.1.0 (MINOR - Principle 3 redefinition)
Ratification: 2025-12-01
Last Amendment: 2025-12-01

Principle Changes:
- Principle 3: "Data Validation First" → "Console Logging Over Test Suites"
  (Removed: formal testing, schema validation badges)
  (Added: comprehensive console logging, no test suites allowed)

Constitution Check Gate Updates:
- Gate 3: "Validation Check" → "Logging Check"
  (Now requires: console logs of inputs/outputs; forbids: test files)

Development Standards Changes:
- "Testing Discipline" section → "Logging Discipline" section
- Removed: unit tests, integration tests, determinism tests, schema validation
- Added: console logger utilities, input/output logging, state change logging, error logging

Success Criteria Updates:
- Removed: "invalid data is flagged"
- Added: "console shows complete data flow"

Templates Updated:
- ✅ plan-template.md: Gate 3 changed to Logging Check
- ✅ spec-template.md: Principle 3 description updated
- ✅ tasks-template.md: Removed test requirements from Foundational & Polish phases

Rationale: The showcase app's purpose is to find flaws in the engine by observing its behavior.
Formal tests hide that behavior; console logging reveals it. Developers debug by reading logs,
not by running test assertions.
-->

# Playlist Data Engine Showcase - Project Constitution

**Version**: 1.1.0
**Ratification Date**: 2025-12-01
**Last Amended**: 2025-12-01
**Status**: Active

---

## Mission & Vision

**Mission**: Demonstrate and validate every feature of the `playlist-data-engine` package through a technical proof-of-concept web application.

**Vision**: Create a single-page reference application that developers, QA testers, and team members can use to verify that the engine works correctly across all feature categories—without gameplay simulation, narratives, or cosmetics that would obscure the underlying technical validation.

**Core Philosophy**: "Show, Don't Simulate"—Direct engine feature exposure through organized, readable data displays rather than game mechanics.

---

## Core Principles

### Principle 1: Technical Purity

**Definition**: The showcase app MUST expose engine functionality directly without decorative game mechanics, story narratives, or economy systems.

**Non-Negotiable Rules**:
- No XP wagers, combat strategy mechanics, or permadeath gameplay
- No shop systems, gacha mechanics, or cosmetic purchases
- No character naming/backstory that implies narrative context
- All displayed data MUST be raw engine output (not interpreted/dramatized)

**Rationale**: The app exists to validate that the engine works. Player-facing gameplay mechanics would obscure what's actually being tested and complicate debugging. Developers need to see unfiltered engine behavior.

---

### Principle 2: Deterministic Reproducibility

**Definition**: Character generation and all core engine functions MUST produce identical output when given the same input (same seed, same audio profile, same environmental context).

**Non-Negotiable Rules**:
- All random number generation MUST use seeded RNGs (no cryptographic randomness in character generation)
- Character generator results MUST be verifiable (can regenerate and compare JSON)
- Audio analysis results for the same file MUST be consistent within defined tolerance
- Combat engine MUST resolve deterministically given the same combatants and random seed

**Rationale**: Determinism is a critical property for a game engine built on blockchain/web3 principles. It enables code-based verification, ensures fair play, and allows deterministic replay.

---

### Principle 3: Console Logging Over Test Suites

**Definition**: The showcase app prioritizes real-time console logging and direct observation of engine behavior over formal test suites. Developers learn what's broken by reading logs, not by running tests.

**Non-Negotiable Rules**:
- NO unit tests, integration tests, or test suites in this codebase
- Every tab MUST log comprehensive console output showing:
  - Raw engine inputs and outputs (JSON)
  - Intermediate calculations and transformations
  - Sensor data as it arrives
  - Errors with full stack traces
- Console logs MUST be human-readable and organized by category (e.g., `[PlaylistParser]`, `[AudioAnalyzer]`, `[Combat]`)
- Each engine module invocation MUST log before/after state to show exactly what changed
- Developers debug the engine by opening DevTools console and reading live logs

**Rationale**: Formal tests hide what's actually happening inside the engine. We need to see the raw data flow and behavior to find flaws. Console logging provides transparency—developers can inspect exactly what the engine is doing in real time and spot bugs immediately.

---

### Principle 4: Feature Completeness Over Polish

**Definition**: All 9 core engine modules MUST be instantiable and demonstrated in the app before any cosmetic polishing (animations, theming, responsive design beyond mobile safety).

**Non-Negotiable Rules**:
- Each engine module gets its own isolated tab for independent testing
- Each tab MUST directly map to one module (no hybrid features)
- Basic error recovery/fallback states are mandatory; animations are optional
- Responsive design MUST support mobile (single column) but perfection is not required
- A feature is NOT COMPLETE until all 9 modules are working end-to-end

**Rationale**: Developers need to verify the engine works across ALL modules before the app is production-ready. Polish can happen incrementally; core functionality cannot be partial.

---

### Principle 5: Sensor Integration Requires Graceful Degradation

**Definition**: Environmental and gaming platform sensors MUST work with and without user permissions; fallback to simulated data if real sensors are unavailable.

**Non-Negotiable Rules**:
- Permission request UX MUST clearly indicate what happens if denied (simulated data shown)
- Fallback data MUST be realistic and labeled as simulation
- If a sensor is unavailable (browser doesn't support API), app MUST continue to function
- Gaming platform authentication failures MUST NOT block other tabs from working
- Weather API failures MUST gracefully degrade to default values

**Rationale**: Developers testing locally or on devices without sensors need a complete experience. Graceful degradation prevents frustration and keeps the validation flow continuous.

---

## Governance

### Amendment Procedure

1. **Proposal**: Any team member may propose a constitution amendment via GitHub issue or pull request with clear rationale.
2. **Discussion**: Amendment discussed in PR/issue comments; rationale must address impact on existing principles.
3. **Acceptance Criteria**:
   - All core team members have reviewed
   - Impact on dependent templates (plan, spec, tasks) is understood
   - Version number is proposed with justification
4. **Ratification**: Merged to main branch; `.specify/memory/constitution.md` updated with new version and amendment date.
5. **Propagation**: Dependent templates are updated within the same PR.

### Versioning Policy

Constitution uses Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR** (X.0.0): Backward-incompatible principle removals or redefinitions (e.g., removing a core principle or changing its meaning).
- **MINOR** (x.Y.0): New principle added, or materially expanded guidance in existing principle.
- **PATCH** (x.y.Z): Clarifications, wording improvements, typo fixes, non-semantic refinements.

**Rationale**: Version bumps signal when the project's rules materially change. MAJOR bumps require team discussion; PATCH can be routine.

### Compliance Review

The constitution is **reviewed quarterly** (or on major feature additions):

- **Monthly Spot Checks**: Design artifacts (spec.md, plan.md, tasks.md) are audited against principles during sprint planning.
- **Quarterly Deep Dive**: Full constitution review to ensure principles remain relevant to project state.
- **Annual Refresh**: Major evaluation of all 5 principles; amendments proposed if project scope shifts.

### Constitution Check Gates

The following design gates MUST pass before new features proceed:

1. **Purity Check** (Principle 1): Feature does not introduce gameplay mechanics or narrative elements.
2. **Reproducibility Check** (Principle 2): Feature uses seeded RNGs or deterministic algorithms where applicable.
3. **Logging Check** (Principle 3): Feature includes comprehensive console logging of inputs/outputs; NO test suites.
4. **Completeness Check** (Principle 4): Feature is part of core module coverage (9 modules total).
5. **Degradation Check** (Principle 5): Feature handles sensor/API failures gracefully.

Features failing ANY gate require explicit justification in the plan.md "Complexity Tracking" section.

---

## Development Standards

### Code Organization

The app follows these structural rules:

- **Tab Components** (`src/components/Tabs/`): One file per engine module; no mixed-feature tabs.
- **Store Management** (`src/store/`): Separate Zustand stores for playlist, character, session, sensor, and gaming data.
- **Hooks** (`src/hooks/`): Custom React hooks wrap engine calls; named `use[Module]`.
- **Utilities** (`src/utils/`): Formatting, logging, error handling, storage helpers.

### Logging Discipline

- **Console Logger**: Every tab MUST have a utility for categorized logging (e.g., `logger.info('[PlaylistParser]', data)`)
- **Input/Output Logging**: Before calling any engine function, log the inputs; after receiving results, log the outputs in full JSON
- **Error Logging**: All errors caught and logged with full stack trace to console (no silent failures)
- **State Change Logging**: When state updates (e.g., character data changes), log before/after snapshots
- **Sensor Logging**: When sensor data arrives or changes, log immediately with timestamp and values
- **NO Test Suites**: Zero test files, zero assertions, zero test runners—developers learn by reading logs

### Data Persistence

- **LocalForage**: All app state persists to IndexedDB via LocalForage.
- **Export/Import**: Full app state can be exported as JSON and reimported without data loss.
- **No Hardcoded Secrets**: API keys (OpenWeatherMap, Steam, Discord) are configurable via Settings tab; never committed to code.

### Dependency Management

- **Engine**: `playlist-data-engine` is the single source of truth for game logic.
- **UI Framework**: React 18 + TypeScript (strict mode).
- **Styling**: CSS for utility styling; no tailwind CSS because we aren't pussies.
- **State Management**: Zustand for cross-component state; no Redux or Context API.
- **Storage**: LocalForage (IndexedDB wrapper); no raw IndexedDB or localStorage.

---

## Success Criteria (Principle-Based)

A release is considered **complete and valid** when:

✅ **Purity**: No gameplay loops, no cosmetics, no narrative. Data is presented as-is.
✅ **Reproducibility**: Character generation is verifiable; same input = same output (testable by regenerating).
✅ **Logging**: Every tab logs all inputs, outputs, state changes, and errors; console shows complete data flow.
✅ **Completeness**: All 9 core modules are instantiable and working end-to-end.
✅ **Degradation**: Sensors fail gracefully; app continues to function without them; failures are logged.

---

## Ratification & Amendment History

| Date | Version | Change | Amended By |
|------|---------|--------|-----------|
| 2025-12-01 | 1.0.0 | Initial constitution ratification | Project Initiation |
| 2025-12-01 | 1.1.0 | Principle 3 redefined: Console Logging Over Test Suites (no formal tests) | Project Refinement |

---

**Constitution Owner**: Project Team
**Review Schedule**: Quarterly
**Last Review**: 2025-12-01
