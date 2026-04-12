# Playlist Data Showcase

A React demo application for the **[Playlist Data Engine](#the-playlist-data-engine)** — a TypeScript library for deep audio analysis of music playlists. Extract sonic fingerprints, detect beats with subdivision, run pitch contour analysis, classify genres and moods via ML models, build rhythm game levels, and generate D&D 5e characters and combat encounters — all derived from the music itself.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

Requires the [playlist-data-engine](https://github.com/jasondesante/playlist-data-engine) as a sibling directory (linked via `file:../playlist-data-engine` in package.json).

## The Playlist Data Engine

The engine is a modular, serverless music analysis library that powers [ar://listen](https://listen.arweave.net/). It parses playlists stored on Arweave and extracts everything it can from the audio — then uses that analysis to drive interactive features:

**Audio Analysis** — Sonic fingerprinting (triple-tap sampling at 5%/40%/70%), full timeline analysis, and color palette extraction from audio frequency data.

**Genre & Mood Classification** — ML-powered genre/mood/vibe detection using TensorFlow.js with essentia.js WASM models (Discogs-EffNet embeddings, 400+ subgenres, 60 moods).

**Pitch Analysis** — Full-track pitch detection via the pYIN algorithm with melody contour extraction, voicing ratio, and note distribution.

**Beat Detection & Rhythm Games** — Beat tracking using the Ellis 2007 dynamic programming algorithm, beat subdivision (eighth notes, triplets, swing, quintuplets), chart creation for rhythm game levels, accuracy scoring with combo and groove systems, and procedural rhythm generation.

**Level Generation** — Complete rhythm game level pipeline from beat maps: key assignment, difficulty scaling, and level export/import.

These audio systems feed into the RPG layer:

**Character Generation** — Deterministic D&D 5e characters from audio profiles. Frequency bands map to ability scores (bass → STR, mid → INT/WIS/CHA, treble → DEX), class selection is influenced by audio characteristics, and equipment/features are derived from the sonic fingerprint.

**Combat System** — Turn-based D&D 5e combat with AI opponents, procedural enemy generation from music (bass-heavy tracks spawn brutes, treble-heavy spawn archers), and Monte Carlo simulation for balance testing.

**Progression** — Multi-source XP system (listening, combat, rhythm game, environmental sensors) with D&D 5e authentic leveling, stat increases, equipment effects, and a track mastery prestige system.

**Extensibility** — Runtime content pack system for custom races, classes, equipment, spells, skills, and features across 20+ categories with spawn rate control and validation.

All generation is deterministic — same seed + same audio = same character, same enemies, same combat outcomes.

## What's in This Showcase

The app is organized into tabs, each demonstrating a different engine feature:

| Tab | What it does |
|-----|-------------|
| **Home** | Landing page with playlist search, track cards, and quick actions |
| **Playlist** | Parse playlists from Arweave transaction IDs or raw JSON |
| **Audio Analysis** | Frequency analysis (bass/mid/treble), genre/mood classification, pitch contour graphing, color extraction |
| **Beat Detection** | Beat map generation, subdivisions (eighth notes, triplets, swing), chart editor, practice mode, rhythm generation |
| **Character Gen** | Generate D&D 5e characters from audio profiles with equipment browser and enchantment system |
| **Party** | View all generated characters in a grid with party composition analysis |
| **Items** | Equipment management with enchantment/curse system, loot box spawning, and item creator |
| **Data Viewer** | Browse all game content (spells, skills, features, races, classes) with filtering and custom content creators |
| **Session** | Track listening sessions with animated timer, real-time XP, and mastery badges |
| **XP Calc** | Calculate XP from various sources (base, environmental, gaming, rhythm) with multiplier configuration |
| **Leveling** | Character progression with stat management, level-up handling, prestige system, and uncapped mode |
| **Sensors** | GPS/motion/weather sensor integration with biome detection and real-time data visualization |
| **Gaming** | Steam integration for game activity tracking with genre-based XP bonuses |
| **Combat** | Full combat simulation with encounter generation, enemy templates, combat log, and export |
| **Balance Lab** | Monte Carlo combat simulation with statistical analysis, win rate charts, and balance recommendations |
| **Settings** | API key configuration, audio settings, logging, and privacy controls |

## How It All Connects

```
Playlist (Arweave)
    │
    ▼
Audio Analysis ──► Sonic Fingerprint
    │                  (bass/mid/treble/energy)
    │                       │
    ├──► Genre/Mood         ├──► Character Generation
    │    Classification     │    (D&D 5e stats, equipment, class)
    │                       │
    ├──► Pitch Analysis     ├──► Enemy Generation
    │    (pYIN contour)     │    (audio-weighted templates, CR scaling)
    │                       │
    ├──► Beat Detection     │
    │    (Ellis DP)         │
    │       │               │
    │       ▼               ▼
    │   Rhythm Game ──► Combat ◄────┘
    │   (charts, scoring,    (turn-based D&D 5e)
    │    combo, groove)          │
    │                            ▼
    └──► Level Generation   XP & Leveling
         (key maps,          (multi-source,
          difficulty)         prestige system)
```

Audio is the source of truth — the RPG layer is one of many things powered by it. The same audio always produces the same analysis, the same rhythm game levels, the same characters, and the same combat outcomes.

## Tech Stack

**Showcase app:**
- React 18, TypeScript, Vite
- Zustand (state management with localStorage persistence via LocalForage)
- Recharts (charts and data visualization)
- Lucide React (icons)
- Howler.js (audio playback)

**Engine (linked dependency):**
- TensorFlow.js + essentia.js (WASM) — ML models for music classification
- Web Audio API — audio analysis (browser) with `web-audio-api` polyfill for Node.js
- Zod — runtime validation
- MurmurHash V3 — deterministic seeded RNG
- 7,205 tests across 183 test files

## State Management

The app uses 10 Zustand stores, all persisted to localStorage:

- `appStore` — API keys, audio config, logging, privacy
- `playlistStore` — Current playlist, selected track, audio profile
- `characterStore` — Generated characters, active character, equipment effects
- `sessionStore` — Active session, session history, XP tracking
- `sensorStore` — Environmental/gaming sensor data
- `beatDetectionStore` — Beat maps, practice mode, chart editor
- `simulationStore` — Combat simulation results
- `audioPlayerStore` — Playback state, volume, loading
- `dataViewerStore` — Data viewer UI state
- `progressionConfigStore` — XP progression configuration

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
npm test             # Run tests (Vitest)
npm run test:watch   # Watch mode tests
npm run lint:css     # Lint CSS (Stylelint)
```

## Engine Documentation

Full engine documentation lives in `docs/engine/`:

- [Engine README](./docs/engine/README.md) — Architecture overview and module guide
- [Data Engine Reference](./docs/engine/DATA_ENGINE_REFERENCE.md) — Complete API documentation
- [Usage in Other Projects](./docs/engine/USAGE_IN_OTHER_PROJECTS.md) — Integration examples

**Feature docs:**
- [Audio Analysis](./docs/engine/features/AUDIO_ANALYSIS.md)
- [Beat Detection](./docs/engine/features/BEAT_DETECTION.md)
- [Combat System](./docs/engine/features/COMBAT_SYSTEM.md)
- [Enemy Generation](./docs/engine/features/ENEMY_GENERATION.md)
- [XP and Stats](./docs/engine/features/XP_AND_STATS.md)
- [Equipment System](./docs/engine/features/EQUIPMENT_SYSTEM.md)
- [Extensibility Guide](./docs/engine/features/EXTENSIBILITY_GUIDE.md)
- [Content Packs](./docs/engine/features/CONTENT_PACKS.md)
- [Custom Content](./docs/engine/features/CUSTOM_CONTENT.md)
- [IRL Sensors](./docs/engine/features/IRL_SENSORS.md)
- [Rolls and Seeds](./docs/engine/features/ROLLS_AND_SEEDS.md)
- [Prerequisites](./docs/engine/features/PREREQUISITES.md)

## License

MIT
