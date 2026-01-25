<!--
  HISTORICAL DOCUMENT - Last updated December 2025

  For current implementation status, see /IMPLEMENTATION_STATUS.md
  For current task breakdown, see /COMPLETION_PLAN.md

  This document contains the original research findings for the
  Playlist Data Engine Showcase App. It is kept here for historical
  context. The actual implementation may differ from these findings.
-->

# Phase 0 Research: Playlist Data Engine Showcase App

**Date**: 2025-12-01
**Status**: Complete
**Related**: [plan.md](plan.md), [spec.md](spec.md)

---

## Research Summary

All technical questions from the plan have been resolved. The architecture is feasible using standard React web patterns. Key findings documented below.

---

## Decision: Web Audio API Integration

**Decision**: Use Web Audio API for audio frequency analysis (replacing server-side analysis if any).

**Rationale**:
- Browser-native, no external service needed
- `AudioAnalyzer.extractSonicFingerprint()` expects audio URL → frequency data
- Web Audio API's `AnalyserNode` provides FFT-based frequency analysis
- "Triple Tap" strategy (5%, 40%, 70% markers) implementable via `AudioContext.currentTime`

**Alternatives Considered**:
- External audio processing service (added latency, API cost)
- Pre-computed frequency data from Arweave (not available in current design)

**Implementation**:
```typescript
// Pseudo-code for audio extraction
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(analyser);

// Get frequency data at 5%, 40%, 70% positions
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(frequencyData);
// Separate into bass (20-250Hz), mid (250Hz-4kHz), treble (4kHz-20kHz)
```

**Constraints**:
- Audio must be CORS-enabled (Arweave URLs assumed CORS-enabled)
- Large audio files sampled, not fully buffered (use `AudioContext.suspend()` after sampling)

---

## Decision: React Router for Tab Navigation

**Decision**: Use React Router v6 for SPA navigation (URL-based tab switching).

**Rationale**:
- Standard React pattern for tab-based navigation
- Enables bookmarking specific tabs (e.g., `/engine-showcase/#/character-gen`)
- Allows deep linking to feature contexts
- Integrates well with React 18 Suspense for async data loading

**Alternatives Considered**:
- Tab state in Zustand (simpler, no URL history)
- Remix (adds server complexity, not needed for SPA)

**Implementation**:
```typescript
// App.tsx routing structure
<BrowserRouter>
  <Routes>
    <Route path="/" element={<PlaylistLoaderTab />} />
    <Route path="/audio" element={<AudioAnalysisTab />} />
    <Route path="/character" element={<CharacterGenTab />} />
    {/* ... 7 more tabs ... */}
  </Routes>
</BrowserRouter>
```

---

## Decision: Zustand for Cross-Tab State

**Decision**: Use Zustand for global state management (playlist, character, sessions, sensors).

**Rationale**:
- Lightweight (no boilerplate compared to Redux)
- Easy to persist to LocalForage
- Supports DevTools middleware for debugging
- One store per domain (playlistStore, characterStore, etc.)

**Alternatives Considered**:
- Context API (too verbose for 9 modules)
- Redux (overkill for this app)
- Prop drilling (impossible across 10 independent tabs)

**Store Structure**:
```typescript
// playlistStore.ts
export const usePlaylistStore = create<PlaylistState>((set) => ({
  playlist: null,
  tracks: [],
  setPlaylist: (playlist) => set({ playlist }),
  addTrack: (track) => set((state) => ({ tracks: [...state.tracks, track] })),
  // Subscribe to LocalForage on mount
}));

// Similar structure for characterStore, sessionStore, etc.
```

---

## Decision: LocalForage for Persistence

**Decision**: Use LocalForage (IndexedDB wrapper) for all app state persistence.

**Rationale**:
- No backend server required
- IndexedDB provides ~50MB storage (sufficient for character + session history)
- LocalForage abstracts IndexedDB API (simpler code)
- Full app export/import as JSON supported

**Alternatives Considered**:
- SQLite WASM (added complexity)
- Backend API (adds latency, requires server)
- SessionStorage (limited to tab lifetime)

**Implementation**:
```typescript
// Storage keys
const STORAGE_KEYS = {
  PLAYLIST: 'playlist:current',
  CHARACTERS: 'characters:all',
  SESSIONS: 'sessions:history',
  SENSORS: 'sensors:environmental',
  GAMING: 'gaming:context',
  AUTH: 'auth:credentials',
  SETTINGS: 'app:settings',
};

// Auto-sync Zustand to LocalForage
store.subscribe((state) => {
  localforage.setItem(STORAGE_KEY, state);
});
```

---

## Decision: Console Logging as Debugging Interface

**Decision**: All debugging via console.log (categorized) instead of test suites.

**Rationale** (from Constitution v1.1.0, Principle 3):
- Formal tests hide what's happening inside the engine
- Console logs reveal raw data flow in real-time
- Developers debug by opening DevTools and reading logs
- No test assertions = faster iteration, more transparency

**Implementation**:
```typescript
// logger.ts
export const logger = {
  info: (category: string, data: any) =>
    console.log(`%c[${category}]`, 'color: blue;', data),
  warn: (category: string, data: any) =>
    console.warn(`%c[${category}]`, 'color: orange;', data),
  error: (category: string, data: any) =>
    console.error(`%c[${category}]`, 'color: red;', data),
};

// Usage in every tab:
logger.info('[PlaylistParser]', { input: playlist, output: tracks });
```

---

## Decision: Sensor Permission Flow

**Decision**: Request permissions for Geolocation, Motion, Light; degrade to simulated data if denied/unavailable.

**Rationale**:
- Some users on mobile, some on desktop
- Some browsers don't support all APIs
- Graceful degradation keeps app functional
- Clear labeling distinguishes real vs simulated data

**Alternatives Considered**:
- Require all permissions (breaks mobile testing)
- Ignore denied permissions (silent failures)

**Implementation**:
```typescript
// useEnvironmentalSensors.ts
const requestPermissions = async () => {
  try {
    const geoPosition = await navigator.geolocation.getCurrentPosition(...);
    setRealGeo(geoPosition);
  } catch (err) {
    logger.warn('[EnvironmentalSensors]', 'Geolocation denied, using simulated');
    setSimulatedGeo(DEFAULT_SIM_LOCATION);
  }
};
```

---

## Decision: Audio Analysis Sampling Strategy

**Decision**: Implement "Triple Tap" sampling at 5%, 40%, 70% of audio duration (not 100% buffer).

**Rationale** (from engine reference):
- Large audio files would block UI if fully buffered
- Triple Tap gives representative frequency profile without processing entire file
- Matches engine's AudioAnalyzer expectations

**Implementation**:
```typescript
const samplePositions = [0.05, 0.40, 0.70]; // 5%, 40%, 70%
samplePositions.forEach((position) => {
  const sampleTime = audioBuffer.duration * position;
  // Extract FFT data at this time
});
```

---

## Decision: D&D 5e Character Determinism

**Decision**: Leverage engine's seeded RNG; provide "Regenerate & Compare" button for verification.

**Rationale**:
- Engine guarantees determinism (same seed → same character)
- Character Gen tab provides UI to test this
- Developers can paste same track UUID twice, verify output matches

**Implementation**:
```typescript
// CharacterGenTab.tsx
const [character, setCharacter] = useState<CharacterSheet | null>(null);
const generateCharacter = (trackUuid: string) => {
  const char = CharacterGenerator.generate(trackUuid, audioProfile, trackTitle);
  setCharacter(char);
  logger.info('[CharacterGenerator]', { input: trackUuid, output: char });
};

const regenerateAndCompare = () => {
  const char2 = CharacterGenerator.generate(trackUuid, audioProfile, trackTitle);
  const match = JSON.stringify(character) === JSON.stringify(char2);
  logger.info('[CharacterGenerator]', {
    deterministic: match,
    original: character,
    regenerated: char2
  });
};
```

---

## Decision: Combat Simulation Display

**Decision**: Run D&D 5e combat, log round-by-round results, display final winner + XP awarded.

**Rationale**:
- Combat is deterministic (verifiable)
- Turn-by-turn logging shows complete action sequence
- No gameplay strategy needed (just simulation)

**Implementation**:
```typescript
const runCombat = (players: CharacterSheet[], enemies: CharacterSheet[]) => {
  let combat = combatEngine.startCombat(players, enemies);
  const actionLog: string[] = [];

  while (combat.isActive) {
    const actor = combatEngine.getCurrentCombatant(combat);
    const target = selectTarget(combat); // Simple AI
    const action = combatEngine.executeAttack(combat, actor, target, attack);

    actionLog.push(`${actor.character.name} attacks ${target.character.name}`);
    logger.info('[CombatEngine]', { action, combatState: combat });

    combat = combatEngine.nextTurn(combat);
  }

  const result = combatEngine.getCombatResult(combat);
  logger.info('[CombatEngine]', { winner: result.winner, xpAwarded: result.xpAwarded });
};
```

---

## Decision: Settings Tab Configuration

**Decision**: Provide input fields for optional API keys (OpenWeatherMap, Steam, Discord) with validation.

**Rationale**:
- Sensors/gaming features are optional (not required for core validation)
- Users can test with/without external integrations
- No hardcoded secrets in codebase

**Implementation**:
```typescript
// SettingsTab.tsx
const [apiKeys, setApiKeys] = useState({
  openweathermap: '',
  steam: '',
  discord: '',
});

const saveSettings = async () => {
  await localforage.setItem(STORAGE_KEYS.SETTINGS, apiKeys);
  logger.info('[Settings]', { savedKeys: Object.keys(apiKeys) });
};
```

---

## Decision: Mobile Responsiveness

**Decision**: Single-column layout on mobile; tab navigation via hamburger menu or stacked tabs.

**Rationale**:
- TailwindCSS responsive utilities handle layout
- Touch-friendly buttons for permission requests
- No horizontal scroll (Principle 4: Feature Completeness Over Polish)

**Constraints**:
- Audio file upload input works on mobile
- Sensor permissions flow must be touch-optimized
- Character sheet tables stack vertically on small screens

---

## Resolved Clarifications

| Topic | Decision |
|-------|----------|
| Audio analysis backend | Use Web Audio API (client-side, no server) |
| Tab navigation | React Router v6 (URL-based) |
| Global state | Zustand (multiple stores per domain) |
| Persistence | LocalForage (IndexedDB) |
| Debugging method | Console logging (Principle 3) |
| Sensor fallback | Simulated data with clear labels |
| Character determinism | Seeded RNG + regeneration verification |
| Combat display | Turn-by-turn logs + result summary |
| API keys | Optional, configurable, not hardcoded |
| Mobile layout | Single-column, touch-friendly |

---

## Phase 1 Readiness

All research complete. Ready to proceed with:
1. Data model definition
2. API contract specifications
3. Quickstart guide
4. Agent context update

No blocking unknowns remain.

