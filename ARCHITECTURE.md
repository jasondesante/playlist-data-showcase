# Architecture: Playlist Data Showcase

> **This document has moved to [docs/architecture/overview.md](./docs/architecture/overview.md)**
> Please update your bookmarks.

---

**Last Updated:** 2026-01-24
**Version:** 0.1.0

This document describes the architecture of the Playlist Data Showcase application, a React-based demo that showcases all features of the `playlist-data-engine` library.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Architecture Patterns](#architecture-patterns)
4. [Hook Pattern](#hook-pattern)
5. [Store Pattern](#store-pattern)
6. [Component Structure](#component-structure)
7. [Data Flow](#data-flow)
8. [Integration with Engine](#integration-with-engine)

---

## Project Overview

The Playlist Data Showcase is a **single-page React application** that demonstrates all capabilities of the `playlist-data-engine` library. The application is built with:

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Zustand** - State management
- **LocalForage** - Persistent storage
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

The app follows a **modular architecture** with clear separation of concerns:
- **Hooks** wrap engine modules
- **Stores** manage application state
- **Components** render UI and orchestrate hooks/stores

---

## Directory Structure

```
src/
├── App.tsx                          # Root component (62 lines - clean!)
├── main.tsx                         # Application entry point
├── components/                      # React components
│   ├── Layout/                      # Layout components
│   │   ├── AppHeader.tsx           # App header with title
│   │   ├── MainLayout.tsx          # Main container layout
│   │   └── Sidebar.tsx             # Navigation sidebar
│   ├── Tabs/                        # Tab components (10 tabs)
│   │   ├── PlaylistLoaderTab.tsx   # Playlist parsing demo
│   │   ├── AudioAnalysisTab.tsx    # Audio analysis demo
│   │   ├── CharacterGenTab.tsx     # Character generation demo
│   │   ├── SessionTrackingTab.tsx  # Session tracking demo
│   │   ├── XPCalculatorTab.tsx     # XP calculation demo
│   │   ├── CharacterLevelingTab.tsx # Character leveling demo
│   │   ├── EnvironmentalSensorsTab.tsx # Sensor demo
│   │   ├── GamingPlatformsTab.tsx  # Gaming integration demo
│   │   ├── CombatSimulatorTab.tsx  # Combat engine demo
│   │   └── SettingsTab.tsx         # Settings management
│   └── ui/                          # Shared UI components
│       ├── RawJsonDump.tsx         # Collapsible JSON display
│       ├── StatusIndicator.tsx     # Health status badge
│       ├── LoadingSpinner.tsx      # Loading animation
│       └── MotionGraph.tsx         # Motion sensor visualization
├── hooks/                           # Custom React hooks
│   ├── index.ts                    # Hook exports
│   ├── usePlaylistParser.ts        # PlaylistParser wrapper
│   ├── useAudioAnalyzer.ts         # AudioAnalyzer wrapper
│   ├── useCharacterGenerator.ts    # CharacterGenerator wrapper
│   ├── useSessionTracker.ts        # SessionTracker wrapper
│   ├── useXPCalculator.ts          # XPCalculator wrapper
│   ├── useCharacterUpdater.ts      # CharacterUpdater wrapper
│   ├── useEnvironmentalSensors.ts  # EnvironmentalSensors wrapper
│   ├── useGamingPlatforms.ts       # GamingPlatformSensors wrapper
│   └── useCombatEngine.ts          # CombatEngine wrapper
├── store/                           # Zustand stores
│   ├── index.ts                    # Store exports
│   ├── playlistStore.ts            # Playlist & track state
│   ├── characterStore.ts           # Character sheets
│   ├── sessionStore.ts             # Active sessions
│   ├── sensorStore.ts              # Environmental & gaming context
│   └── appStore.ts                 # App settings
├── utils/                           # Utility functions
│   ├── logger.ts                   # Logging utility
│   ├── errorHandling.ts            # Error handling
│   ├── storage.ts                  # LocalForage wrapper
│   ├── cn.ts                       # className merge utility
│   ├── env.ts                      # Environment variables
│   └── sensorDegradation.ts        # Sensor fallback logic
├── schemas/                         # Zod validation schemas
│   └── characterSchema.ts          # Character import/export validation
└── types/                           # TypeScript type definitions
    └── index.ts                    # Shared types
```

---

## Architecture Patterns

### Core Principles

1. **Separation of Concerns**: Each layer has a single responsibility
   - Hooks wrap engine logic
   - Stores manage state
   - Components render UI

2. **Unidirectional Data Flow**: Data flows from stores → components → UI
   - Components read from stores via hooks
   - Components update stores via actions
   - UI reacts to state changes

3. **Dependency Injection**: Engine modules are injected via hooks
   - Hooks instantiate engine classes
   - Components use hooks, not engine directly
   - Easy to mock for testing

4. **Persistence by Default**: All stores persist to LocalForage
   - Survives page refreshes
   - No data loss on reload
   - Users can export/import full state

---

## Hook Pattern

Hooks are the **primary integration point** with the `playlist-data-engine`. Each hook wraps a single engine module and provides a clean React interface.

### Hook Structure

```typescript
import { useState, useCallback } from 'react';
import { EngineModule } from 'playlist-data-engine';
import { useSomeStore } from '@/store/someStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

export const useEngineModule = () => {
    // 1. Get store actions
    const { setData } = useSomeStore();

    // 2. Initialize engine instance (stable reference)
    const [engine] = useState(() => new EngineModule(config));

    // 3. Define operation function
    const performOperation = useCallback(async (input: InputType) => {
        // 3a. Log input
        logger.info('ModuleName', 'Operation description', { input });

        try {
            // 3b. Call engine method
            const result = await engine.method(input);

            // 3c. Log output
            logger.info('ModuleName', 'Result', { result });

            // 3d. Update store
            setData(result);

            return result;
        } catch (error) {
            // 3e. Handle errors
            handleError(error, 'ModuleName');
            return null;
        }
    }, [engine, setData]);

    // 4. Return public interface
    return { performOperation };
};
```

### Hook Example: `useCharacterGenerator`

```typescript
export const useCharacterGenerator = () => {
    const { addCharacter } = useCharacterStore();
    const [isGenerating, setIsGenerating] = useState(false);

    const generateCharacter = useCallback(async (
        audioProfile: AudioProfile,
        seed?: string
    ): Promise<CharacterSheet | null> => {
        logger.info('CharacterGenerator', 'Generating character', { seed });
        setIsGenerating(true);

        try {
            const character = CharacterGenerator.generate(
                seed || `seed-${Date.now()}`,
                audioProfile,
                `Hero-${Date.now().toString().slice(-4)}`
            );

            logger.info('CharacterGenerator', 'Character generated', {
                name: character.name,
                race: character.race,
                class: character.class
            });

            addCharacter(character);
            return character;
        } catch (error) {
            handleError(error, 'CharacterGenerator');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [addCharacter]);

    return { generateCharacter, isGenerating };
};
```

### Available Hooks

| Hook | Engine Module | Purpose |
|------|--------------|---------|
| `usePlaylistParser` | `PlaylistParser` | Parse Arweave playlists |
| `useAudioAnalyzer` | `AudioAnalyzer` | Extract audio fingerprints |
| `useCharacterGenerator` | `CharacterGenerator` | Generate D&D characters |
| `useSessionTracker` | `SessionTracker` | Track listening sessions |
| `useXPCalculator` | `XPCalculator` | Calculate XP with bonuses |
| `useCharacterUpdater` | `CharacterUpdater` | Apply sessions to characters |
| `useEnvironmentalSensors` | `EnvironmentalSensors` | Get environmental context |
| `useGamingPlatforms` | `GamingPlatformSensors` | Get gaming context |
| `useCombatEngine` | `CombatEngine` | Run D&D 5e combat |

---

## Store Pattern

Stores use **Zustand** with **LocalForage persistence**. Each store manages a specific domain of application state.

### Store Structure

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface State {
    // State properties
    data: DataType | null;
    status: 'idle' | 'loading' | 'success' | 'error';

    // Actions
    setData: (data: DataType) => void;
    clearData: () => void;
}

export const useStore = create<State>()(
    persist(
        (set) => ({
            // Initial state
            data: null,
            status: 'idle',

            // Actions
            setData: (data) => {
                logger.info('Store', 'Setting data', data);
                set({ data, status: 'success' });
            },

            clearData: () => {
                logger.info('Store', 'Clearing data');
                set({ data: null, status: 'idle' });
            },
        }),
        {
            name: 'storage-name',  // LocalForage key
            storage: createJSONStorage(() => storage),
        }
    )
);
```

### Store Example: `playlistStore`

```typescript
interface PlaylistState {
    currentPlaylist: ServerlessPlaylist | null;
    selectedTrack: PlaylistTrack | null;
    audioProfile: AudioProfile | null;
    isLoading: boolean;
    error: string | null;
    rawResponseData: unknown;
    parsedTimestamp: string | null;

    setPlaylist: (playlist: ServerlessPlaylist, rawData?: unknown) => void;
    selectTrack: (track: PlaylistTrack) => void;
    setAudioProfile: (profile: AudioProfile | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearPlaylist: () => void;
}

export const usePlaylistStore = create<PlaylistState>()(
    persist(
        (set) => ({
            currentPlaylist: null,
            selectedTrack: null,
            audioProfile: null,
            isLoading: false,
            error: null,
            rawResponseData: null,
            parsedTimestamp: null,

            setPlaylist: (playlist, rawData) => {
                logger.info('Store', 'Setting playlist', {
                    name: playlist.name,
                    tracks: playlist.tracks.length
                });
                set({
                    currentPlaylist: playlist,
                    error: null,
                    rawResponseData: rawData ?? null,
                    parsedTimestamp: new Date().toISOString(),
                    audioProfile: null  // Clear when loading new playlist
                });
            },

            // ... other actions
        }),
        {
            name: 'playlist-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
```

### Available Stores

| Store | Domain | Storage Key |
|-------|--------|-------------|
| `playlistStore` | Playlist, tracks, audio profile | `playlist-storage` |
| `characterStore` | Generated characters | `character-storage` |
| `sessionStore` | Active listening sessions | `session-storage` |
| `sensorStore` | Environmental & gaming context | `sensor-storage` |
| `appStore` | App settings (API keys, etc.) | `app-settings` |

### Store Access Pattern

```typescript
// In components
import { usePlaylistStore } from '@/store/playlistStore';

function MyComponent() {
    // Destructure specific values (optimal re-renders)
    const { currentPlaylist, selectTrack } = usePlaylistStore();

    return <div onClick={() => selectTrack(track)}>...</div>;
}
```

---

## Component Structure

Components follow a **hierarchical structure** with clear responsibilities:

### Layout Components

**Location:** `src/components/Layout/`

| Component | Purpose | Props |
|-----------|---------|-------|
| `AppHeader` | App title and subtitle | None |
| `MainLayout` | Container with sidebar + main area | `tabs`, `activeTab`, `onTabChange`, `children` |
| `Sidebar` | Navigation sidebar with tab buttons | `tabs`, `activeTab`, `onTabChange` |

### Tab Components

**Location:** `src/components/Tabs/`

Each tab demonstrates a specific engine module:

| Tab | Engine Module | Purpose |
|-----|--------------|---------|
| `PlaylistLoaderTab` | `PlaylistParser` | Parse playlists from Arweave |
| `AudioAnalysisTab` | `AudioAnalyzer` | Extract audio fingerprints |
| `CharacterGenTab` | `CharacterGenerator` | Generate characters from audio |
| `SessionTrackingTab` | `SessionTracker` | Track listening sessions |
| `XPCalculatorTab` | `XPCalculator` | Calculate XP with bonuses |
| `CharacterLevelingTab` | `CharacterUpdater` | Level up characters |
| `EnvironmentalSensorsTab` | `EnvironmentalSensors` | Get environmental context |
| `GamingPlatformsTab` | `GamingPlatformSensors` | Get gaming context |
| `CombatSimulatorTab` | `CombatEngine` | Run D&D 5e combat |
| `SettingsTab` | (N/A) | Configure app settings |

### Tab Component Pattern

```typescript
/**
 * TabName Component
 *
 * Demonstrates the [EngineModule] engine module by:
 * 1. [Feature 1]
 * 2. [Feature 2]
 * 3. [Feature 3]
 */
export function TabName() {
    // 1. Get data from stores
    const { someData } = useSomeStore();

    // 2. Use hook for engine operations
    const { performOperation } = useEngineModule();

    // 3. Local state for UI
    const [localState, setLocalState] = useState(initialValue);

    // 4. Event handlers
    const handleAction = () => {
        performOperation(data);
    };

    // 5. Render
    return (
        <div className="space-y-6">
            {/* Status indicator */}
            <StatusIndicator status="healthy" label="Ready" />

            {/* Controls */}
            <button onClick={handleAction}>Do Something</button>

            {/* Results */}
            <div>{someData && <Display data={someData} />}</div>

            {/* Raw JSON dump */}
            <RawJsonDump data={someData} title="Results" />
        </div>
    );
}
```

### Shared UI Components

**Location:** `src/components/ui/`

| Component | Purpose | Props |
|-----------|---------|-------|
| `RawJsonDump` | Collapsible JSON display | `data`, `title`, `timestamp`, `status`, `defaultOpen` |
| `StatusIndicator` | Health status badge | `status` ('healthy' | 'degraded' | 'error'), `label` |
| `LoadingSpinner` | Loading animation | `size`, `label` |
| `MotionGraph` | Motion sensor line graph | `xData`, `yData`, `zData`, `label` |

---

## Data Flow

### Request Flow

```
User Action
    ↓
Component Event Handler
    ↓
Hook Function (logs input)
    ↓
Engine Method (does work)
    ↓
Hook Function (logs output)
    ↓
Store Action (updates state)
    ↓
Component Re-render (shows new state)
```

### Example: Generating a Character

```
1. User clicks "Generate Character"
   ↓
2. CharacterGenTab.handleGenerate()
   ↓
3. useCharacterGenerator.generateCharacter(audioProfile)
   - Logs: "Generating character" { seed }
   ↓
4. CharacterGenerator.generate(seed, audioProfile, name)
   - Engine does deterministic generation
   ↓
5. Hook receives result
   - Logs: "Character generated" { name, race, class }
   ↓
6. characterStore.addCharacter(character)
   - Logs: "Adding character"
   - Persists to LocalForage
   ↓
7. Component re-renders with new character
   - Shows character sheet
   - Shows raw JSON dump
```

### Error Handling Flow

```
Engine throws error
    ↓
Hook catch block
    ↓
handleError(error, 'ModuleName')
    - Logs error with stack trace
    - Returns null or safe default
    ↓
Component receives null
    - Shows error message to user
    - Sets StatusIndicator to 'error'
```

---

## Integration with Engine

### Engine Import

The engine is imported as a **local dependency** via `package.json`:

```json
{
  "dependencies": {
    "playlist-data-engine": "file:/playlist-data-engine"
  }
}
```

This allows:
- Live updates when developing both projects
- Type safety via TypeScript
- No build step for engine changes

### Engine Module Usage

Each engine module is used through a **custom hook**:

```typescript
// Import engine types
import { CharacterGenerator, AudioProfile, CharacterSheet } from 'playlist-data-engine';

// Use hook (not engine directly)
const { generateCharacter } = useCharacterGenerator();
```

### Engine API Reference

For detailed engine API documentation, see:
- `docs/engine/usage-in-other-projects.md`
- `docs/engine/data-engine-reference.md`

---

## Utilities

### Logger (`utils/logger.ts`)

Consistent logging across the app:

```typescript
logger.info('ModuleName', 'Message', { data });
logger.warn('ModuleName', 'Warning message');
logger.error('ModuleName', 'Error message', error);
logger.debug('ModuleName', 'Debug info', data);
```

### Error Handling (`utils/errorHandling.ts`)

Centralized error handling:

```typescript
handleError(error, 'ModuleName');
// Logs error + stack trace
// Returns user-friendly error message
```

### Storage (`utils/storage.ts`)

LocalForage wrapper for persistent storage:

```typescript
import { storage } from '@/utils/storage';

// Used by Zustand persist middleware
storage.getItem('key');
storage.setItem('key', value);
```

### Class Name Merge (`utils/cn.ts`)

Merge Tailwind classes:

```typescript
import { cn } from '@/utils/cn';

cn('base-class', condition && 'conditional-class', otherClass);
```

---

## Type Safety

All types are defined in:
- `src/types/index.ts` - Shared application types
- `playlist-data-engine` - Engine types (imported)

Example:
```typescript
import type { PlaylistTrack, AudioProfile, CharacterSheet } from '@/types';
import type { EnvironmentalContext, GamingContext } from 'playlist-data-engine';
```

---

## Styling

- **Tailwind CSS** for styling
- **CSS Variables** for theming (bg-background, text-foreground, etc.)
- **Responsive Design** - Mobile-first approach
- **Component Isolation** - Each component is self-contained

---

## Build & Development

### Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

### Build Output

- `dist/` - Production build (HTML + JS + CSS)
- Type checking via `tsc --noEmit`
- Husky pre-commit hooks for type checking

---

## Summary

The Playlist Data Showcase architecture is designed for:
- **Clarity** - Easy to understand and navigate
- **Modularity** - Each component/hook/store is independent
- **Type Safety** - TypeScript everywhere
- **Developer Experience** - Clean code, good logging, easy debugging
- **Engine Demonstration** - Every engine feature is showcased

The app is a **reference implementation** for using the `playlist-data-engine` library in React applications.
