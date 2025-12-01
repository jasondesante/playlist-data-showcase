# Phase 1: Data Model

**Date**: 2025-12-01
**Status**: Complete
**Related**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md)

---

## Core Domain Entities

### Playlist

Container for track metadata from Arweave.

```typescript
interface Playlist {
  name: string;              // Playlist title
  description?: string;       // Optional description
  image: string;             // URL to cover art
  creator: string;           // Creator wallet address
  genre?: string;            // Primary genre
  tags?: string[];           // Search tags
  tracks: PlaylistTrack[];   // All tracks in playlist
}
```

**Validation Rules**:
- `name` required, non-empty
- `creator` valid Arweave address or wallet format
- `tracks` array with at least 1 track

---

### PlaylistTrack

Individual track metadata with audio URL.

```typescript
interface PlaylistTrack {
  // Identity & blockchain
  id: string;                // Unique identifier (e.g., "ethereum-0xContract-1" or "AR-{tx_id}")
  uuid: string;              // Instance UUID for engine
  playlist_index: number;    // Order in playlist
  chain_name: string;        // "ethereum", "optimism", "AR"
  token_address?: string;    // Contract address
  token_id?: string;         // Token ID
  tx_id?: string;            // Arweave transaction ID

  // Content
  title: string;             // Track title
  artist: string;            // Artist name
  description?: string;
  album?: string;

  // Assets
  image_url: string;         // Album art URL (CORS-enabled)
  audio_url: string;         // Audio file URL (CORS-enabled, MP3/WAV)
  duration: number;          // Length in seconds

  // Metadata
  genre: string;             // Primary genre
  tags: string[];            // Tag array (lowercase)
  bpm?: number;
  key?: string;
}
```

**Validation Rules**:
- `audio_url` must be valid HTTP(S) URL
- `duration` > 0
- `image_url` should be CORS-enabled
- `tags` array (empty array allowed)

---

### AudioProfile

Result of audio analysis.

```typescript
interface AudioProfile {
  bass_dominance: number;      // 0.0 - 1.0
  mid_dominance: number;       // 0.0 - 1.0
  treble_dominance: number;    // 0.0 - 1.0
  average_amplitude: number;   // 0.0 - 1.0
  spectral_centroid?: number;
  spectral_rolloff?: number;
  zero_crossing_rate?: number;
  color_palette?: ColorPalette;
  analysis_metadata: {
    duration_analyzed: number;     // Seconds analyzed
    full_buffer_analyzed: boolean; // true if entire file analyzed
    sample_positions: number[];    // Percentages sampled
    analyzed_at: string;           // ISO timestamp
  };
}
```

**Validation Rules**:
- All dominance values sum to ~1.0 (allow ±0.05 tolerance)
- `average_amplitude` >= 0
- `analysis_metadata.sample_positions` should contain [0.05, 0.40, 0.70] or subset

---

### ColorPalette

Dominant colors from album art.

```typescript
interface ColorPalette {
  colors: string[];           // Hex colors ranked by frequency
  primary_color: string;      // Most dominant (#RRGGBB)
  secondary_color?: string;
  accent_color?: string;
  brightness: number;         // 0.0 - 1.0
  saturation: number;         // 0.0 - 1.0
  is_monochrome: boolean;
}
```

---

### CharacterSheet

D&D 5e character generated from audio profile.

```typescript
interface CharacterSheet {
  name: string;                    // Generated name from track title
  race: 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling';
  class: 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard';
  level: number;                   // 1-20

  ability_scores: AbilityScores;   // STR, DEX, CON, INT, WIS, CHA
  ability_modifiers: AbilityScores;// Calculated from scores

  proficiency_bonus: number;       // D&D 5e table
  hp: { current: number; max: number; temp: number };
  armor_class: number;
  initiative: number;
  speed: number;                   // Feet per round

  skills: Record<Skill, ProficiencyLevel>; // 18 skills
  saving_throws: Record<Ability, boolean>;

  racial_traits: string[];
  class_features: string[];

  spells?: {
    spell_slots: Record<number, { total: number; used: number }>;
    known_spells: string[];
    cantrips: string[];
  };

  equipment?: {
    weapons: string[];
    armor: string[];
    items: string[];
  };

  appearance?: {
    body_type: string;
    skin_tone: string;
    hair_style: string;
    hair_color: string;
    eye_color: string;
    facial_features: string[];
    primary_color?: string;        // From audio/album
    secondary_color?: string;
    aura_color?: string;           // If magical class
  };

  xp: { current: number; next_level: number };
  seed: string;                    // Track ID used for generation
  generated_at: string;            // ISO timestamp
}
```

**Validation Rules**:
- `level` between 1 and 20
- `hp.current` <= `hp.max`
- `armor_class` >= 10 (minimum AC)
- `ability_scores` all between 3 and 20
- All skills proficiency level in ('none', 'proficient', 'expertise')

---

### EnvironmentalContext

Aggregated sensor data.

```typescript
interface EnvironmentalContext {
  location?: GeolocationData;
  motion?: MotionData;
  weather?: WeatherData;
  light?: LightData;

  // Derived
  biome?: 'urban' | 'forest' | 'desert' | 'mountain' | 'water' | 'tundra';
  time_of_day?: 'dawn' | 'day' | 'dusk' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';

  environmental_xp_modifier: number; // 0.5 - 3.0
  timestamp: number;                 // Unix millis
  degraded: boolean;                 // true if simulated data
}

interface GeolocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  altitude_accuracy?: number;
  heading?: number;    // 0-360°
  speed?: number;      // m/s
  timestamp: number;
}

interface MotionData {
  acceleration: { x: number; y: number; z: number };     // m/s²
  acceleration_with_gravity: { x: number; y: number; z: number };
  rotation_rate: { alpha: number; beta: number; gamma: number }; // deg/sec
  movement_intensity: number; // 0.0 - 1.0
  activity_type: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown';
  timestamp: number;
}

interface WeatherData {
  temperature: number;      // °C
  feels_like: number;
  humidity: number;         // %
  pressure: number;         // hPa
  weather_type: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'mist' | 'fog';
  wind_speed: number;       // m/s
  wind_direction: number;   // °
  visibility: number;       // meters
  is_night: boolean;
  moon_phase?: number;      // 0.0 - 1.0
  timestamp: number;
}

interface LightData {
  illuminance: number;  // lux
  environment: 'bright_daylight' | 'indoor' | 'dim' | 'dark';
  timestamp: number;
}
```

**Validation Rules**:
- `latitude` between -90 and 90
- `longitude` between -180 and 180
- `temperature` in reasonable range (-50 to 50°C)
- `environmental_xp_modifier` between 0.5 and 3.0
- All timestamps valid Unix millis

---

### GamingContext

Gaming platform activity.

```typescript
interface GamingContext {
  isActivelyGaming: boolean;
  platformSource: 'steam' | 'discord' | 'both' | 'none';

  currentGame?: {
    name: string;
    source: 'steam' | 'discord';
    genre?: string[];
    sessionDuration?: number;  // Minutes
    partySize?: number;
  };

  totalGamingMinutes: number;  // Lifetime while listening
  gamesPlayedWhileListening: string[];
  lastUpdated: number;         // Unix millis
}
```

---

### ListeningSession

Record of a listening event.

```typescript
interface ListeningSession {
  id: string;                        // Unique session ID
  track_uuid: string;                // Track being listened to
  start_time: number;                // Unix millis
  end_time: number;
  duration_seconds: number;

  base_xp_earned: number;
  bonus_xp: number;
  total_xp_earned: number;

  activity_type?: 'stationary' | 'walking' | 'running' | 'driving';
  environmental_context?: EnvironmentalContext;
  gaming_context?: GamingContext;

  track_mastered: boolean;           // If this session achieved mastery
  mastery_bonus_xp?: number;
}
```

**Validation Rules**:
- `end_time` > `start_time`
- `duration_seconds` matches (end - start)
- `total_xp_earned` = `base_xp_earned` + `bonus_xp` + (mastery_bonus_xp || 0)

---

### CombatInstance

State of active combat.

```typescript
interface CombatInstance {
  id: string;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  environment?: EnvironmentalContext;
  history: CombatAction[];
  isActive: boolean;
  winner?: Combatant;
  startTime: number;        // Unix millis
  lastUpdated: number;
}

interface Combatant {
  id: string;               // Unique within combat
  character: CharacterSheet;
  initiative: number;       // Roll result
  currentHP: number;
  temporaryHP?: number;
  statusEffects: StatusEffect[];
  position?: { x: number; y: number };
  isDefeated: boolean;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
}

interface StatusEffect {
  name: string;            // e.g., "Charmed", "Prone"
  description: string;
  duration: number;        // Rounds remaining
  source?: string;
  hasConcentration?: boolean;
}

interface CombatAction {
  type: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready';
  actor: Combatant;
  target?: Combatant;
  result?: CombatActionResult;
  timestamp: number;
}

interface CombatActionResult {
  success: boolean;
  roll?: number;           // d20 result
  isCritical?: boolean;
  damage?: number;
  damageType?: string;
  targetHP?: number;
  description: string;
}
```

**Validation Rules**:
- `currentHP` <= `character.hp.max`
- `initiative` positive number
- `roundNumber` >= 1
- `currentTurnIndex` < `combatants.length`

---

## App State Structure (Zustand)

### PlaylistStore

```typescript
interface PlaylistState {
  playlist: Playlist | null;
  selectedTrack: PlaylistTrack | null;
  setPlaylist: (p: Playlist) => void;
  selectTrack: (t: PlaylistTrack) => void;
  clearPlaylist: () => void;
}
```

### CharacterStore

```typescript
interface CharacterState {
  characters: CharacterSheet[];
  selectedCharacterId: string | null;
  addCharacter: (c: CharacterSheet) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, updates: Partial<CharacterSheet>) => void;
  selectCharacter: (id: string) => void;
}
```

### SessionStore

```typescript
interface SessionState {
  activeSessions: Map<string, { startTime: number; trackUuid: string }>;
  sessionHistory: ListeningSession[];
  startSession: (trackUuid: string) => string;     // Returns sessionId
  endSession: (sessionId: string, duration: number) => void;
  addToHistory: (session: ListeningSession) => void;
}
```

### SensorStore

```typescript
interface SensorState {
  environmental: EnvironmentalContext | null;
  gaming: GamingContext | null;
  updateEnvironmental: (ctx: EnvironmentalContext) => void;
  updateGaming: (ctx: GamingContext) => void;
  requestSensorPermissions: () => Promise<void>;
}
```

### AppStore

```typescript
interface AppState {
  apiKeys: { openweathermap?: string; steam?: string; discord?: string };
  settings: { enableLogging: boolean; enableSimulation: boolean };
  setApiKey: (service: string, key: string) => void;
  setSettings: (s: Partial<AppState['settings']>) => void;
}
```

---

## Summary

All entities are derived from the `playlist-data-engine` package interfaces. The data model enforces:
- Validation rules at the entity level
- Proper state isolation via Zustand stores
- Clear relationships between entities
- Graceful fallbacks (degraded flag, simulated data)

