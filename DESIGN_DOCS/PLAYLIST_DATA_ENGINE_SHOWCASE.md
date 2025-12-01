# Playlist Data Engine Showcase App
## Design Document: Technology Proof-of-Concept

---

## 1. Project Overview

**Playlist Data Engine Showcase** is a minimal, interactive web application designed to **demonstrate and validate every feature** of the `playlist-data-engine` package.

Unlike the Audio Alchemists game (which focuses on storytelling, idle RPG mechanics, and cosmetics), this showcase app is purely **technical validation**—a testing ground to verify that:

- ✅ Playlist parsing and metadata extraction works
- ✅ Audio analysis (frequency profiles) extracts meaningful data
- ✅ Character generation is deterministic and data-rich
- ✅ Environmental sensors integrate correctly (GPS, motion, weather)
- ✅ Gaming platform sensors (Steam, Discord) authenticate and track
- ✅ Combat engine handles all D&D 5e mechanics
- ✅ Session tracking and XP calculation work as designed
- ✅ All data types and interfaces are properly typed

**Target Users:** Developers, QA testers, and team members who need to verify the engine works across all feature categories.

**Scope:** Single-page app with tabbed interface showing each engine module in isolation.

---

## 2. Core Philosophy

**"Show, Don't Simulate"**

Rather than building a game on top of the engine (like Audio Alchemists), this app directly exposes the engine's capabilities:

- **No Gameplay Mechanics:** No XP wagers, combat strategies, or permadeath.
- **No Cosmetics or Economy:** No shop, gacha, or decorations.
- **No Narrative:** No story, character names, or flavor text.
- **Direct Data Display:** Raw engine output displayed in organized, readable tables and visualizations.

The app is essentially **10-15 isolated test benches**, each one focused on a single engine module.

---

## 3. Feature List & Architecture

### 3.1 Core Modules to Showcase

| Module | Purpose | Tab Name | Key Demo |
|--------|---------|----------|----------|
| **PlaylistParser** | Parse Arweave JSON into typed objects | Playlist Loader | Load JSON, display metadata + tracks |
| **AudioAnalyzer** | Extract frequency profiles from audio | Audio Analysis | Analyze track, show frequency breakdown |
| **EnvironmentalSensors** | GPS, motion, weather, light | Environmental Data | Request permissions, display sensor values |
| **GamingPlatformSensors** | Steam + Discord integration | Gaming Platforms | Connect, show current game + history |
| **CharacterGenerator** | Create deterministic D&D characters | Character Gen | Generate characters for tracks |
| **SessionTracker** | Record listening sessions | Session Tracking | Start/end sessions, view history |
| **XPCalculator** | Calculate XP with bonuses | XP Calculator | Input duration + bonuses, show results |
| **CharacterUpdater** | Apply sessions to characters | Character Leveling | Track XP accumulation, level-ups |
| **CombatEngine** | D&D 5e combat simulation | Combat Simulator | Generate enemies, run combat, show log |

### 3.2 Supporting Features

**Playlist Management:**
- Import from Arweave (by transaction ID or raw JSON)
- Display full playlist metadata
- List all tracks with extracted metadata
- Quick-look at track details (title, artist, duration, audio URL, genre, tags)

**Character Management:**
- View generated character sheet (full D&D 5e data)
- Show ability scores, skills, spells, equipment
- Display audio profile used to generate character
- Character persistence (save/load generated characters)

**Data Visualization:**
- Frequency spectrum (bass/mid/treble pie chart or bar graph)
- Environmental context aggregator (sensor data snapshot)
- Combat log (round-by-round breakdown)
- XP calculation breakdown (base + bonuses = total)
- Sensor permission status dashboard

**Testing & Validation:**
- Determinism checker: Generate same character twice, verify identical output
- Data type validator: Verify all objects match interface schemas
- Error recovery: Show what happens when sensors fail or are denied
- Fallback states: Display app behavior without permissions

---

## 4. UI Layout & Navigation

### 4.1 Overall Structure

```
┌─────────────────────────────────────────────────────┐
│  PLAYLIST DATA ENGINE SHOWCASE v1.0                 │
├─────────────────────────────────────────────────────┤
│  [Playlist] [Audio] [Sensors] [Gaming] [Character] │
│  [Sessions] [XP] [Leveling] [Combat] [Settings]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Active Tab Content Here]                         │
│                                                     │
│  Sidebar Info | Main Content Area | Debug Panel   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 Tab Descriptions

#### Tab 1: Playlist Loader
**Purpose:** Validate PlaylistParser

**Components:**
- Input field: Paste Arweave transaction ID or raw JSON
- Load button
- Status: "Loading...", "Parsed X tracks", or error message
- Metadata display:
  - Playlist name, description, image, creator, genre, tags
  - Total track count
  - Duration of playlist (sum of track durations)
- Sortable track list:
  - Click a track to expand details
  - Show: Title, Artist, Duration, Image, Audio URL, Genre, Tags, BPM, Key
  - Validation badge: ✓ Valid track / ✗ Invalid metadata
- Pagination: Show 10 tracks per page

**Demo Data:**
- Provide a default Arweave ID for quick testing
- Allow uploading custom JSON files

---

#### Tab 2: Audio Analysis
**Purpose:** Validate AudioAnalyzer & ColorExtractor

**Components:**
- Track selector (dropdown from loaded playlist)
- Analyze button
- Frequency breakdown:
  - Bass dominance: [████░░░░] 45%
  - Mid dominance: [█████░░░] 52%
  - Treble dominance: [███░░░░░] 31%
  - Average amplitude: [██████░░] 61%
  - Pie chart visualization
- Advanced metrics (if enabled):
  - Spectral centroid: 2145 Hz
  - Spectral rolloff: 8234 Hz
  - Zero crossing rate: 0.034
- Color palette (extracted from album art):
  - Show 4-5 dominant colors
  - Label: Primary, Secondary, Accent
  - Brightness, Saturation percentages
  - Monochrome badge: Yes/No
- Duration analyzed: X seconds
- Full buffer analyzed: Yes/No
- Analysis timestamp

**Visual:**
- Frequency spectrum graph (FFT visualization if possible)
- Color palette display (swatches)
- Analysis metadata timestamp

---

#### Tab 3: Environmental Sensors
**Purpose:** Validate EnvironmentalSensors, GeolocationProvider, MotionDetector, WeatherAPIClient, LightSensor

**Components:**
- Permission dashboard:
  - Status row for each sensor type:
    - Geolocation: [Not requested] → [Request] → [Granted ✓] / [Denied ✗]
    - Motion: [Not requested] → [Request] → [Granted ✓] / [Denied ✗]
    - Light: [Not requested] → [Request] → [Granted ✓] / [Denied ✗]
    - Weather: [API Key required] [Input field] [Validate]
  - Permission buttons: Request All / Deny All / Reset All
  - Fallback note: "If denied, app will use simulated data"
- Live sensor data (when permissions granted):
  - **Geolocation:**
    - Latitude, Longitude (10 decimal places)
    - Altitude (meters), Accuracy (meters)
    - Heading (0-360°), Speed (m/s)
    - Biome detection: [Urban/Forest/Desert/Mountain/Water/Tundra]
  - **Motion:**
    - Acceleration: X, Y, Z (m/s²)
    - Rotation rate: alpha, beta, gamma (deg/sec)
    - Movement intensity: [████░░░░] 45%
    - Activity detection: [Stationary/Walking/Running/Driving]
  - **Light:**
    - Illuminance: 5000 lux
    - Environment: [Bright daylight / Indoor / Dim / Dark]
  - **Weather** (if API key provided):
    - Temperature: 22°C
    - Feels like: 20°C
    - Humidity: 65%
    - Pressure: 1013 hPa
    - Weather type: [Clear/Clouds/Rain/Snow/Thunderstorm/Mist]
    - Wind: 5 m/s @ 180°
    - Visibility: 10000 m
    - Is night: No
    - Moon phase: 0.45 (waning gibbous)
- Environmental context aggregator:
  - Show the final `EnvironmentalContext` object (JSON formatted)
  - Composite XP modifier (0.5x - 3.0x) calculated from all sensors
  - Time of day: [Dawn / Day / Dusk / Night]
  - Season: [Spring / Summer / Autumn / Winter] (if available)
- Sensor data export:
  - Download as JSON
  - Copy to clipboard

**Visual:**
- Gauge displays for compass heading
- Pie chart for movement intensity
- Live data feed (updates every 1-2 seconds)
- Fallback simulated data when denied

---

#### Tab 4: Gaming Platforms
**Purpose:** Validate GamingPlatformSensors, SteamAPIClient, DiscordRPCClient

**Components:**
- Authentication panel:
  - Steam:
    - Input field: "Enter Steam User ID"
    - Connect button
    - Status: [Not connected] → [Authenticating...] → [Connected ✓] / [Failed ✗]
    - Show: Account name, Avatar, Profile URL (clickable link)
  - Discord:
    - Connect button (OAuth flow)
    - Status: [Not connected] → [Authenticating...] → [Connected ✓] / [Failed ✗]
    - Show: Username, Avatar, User ID
- Gaming activity monitor:
  - Currently playing:
    - Game name
    - Source: [Steam / Discord / Both / None]
    - Genre(s): [Action, RPG, Indie, etc.]
    - Session duration: X minutes
    - Party size: X players (if multiplayer)
    - Last updated: relative time ("2 minutes ago")
  - Lifetime gaming stats:
    - Total gaming minutes while listening to music: X
    - Games played list: [Game1, Game2, Game3, ...]
  - Gaming context JSON export
- Bonus calculator:
  - "Currently gaming while listening?" toggle
  - Show XP bonus multiplier (e.g., "+25% XP bonus active")

**Visual:**
- Account avatars (small profile pictures)
- Game icon/logo (fetched from Steam)
- "Connected" badge with color (green = both platforms, yellow = one, red = none)
- Status indicator (live / last updated X ago)

---

#### Tab 5: Character Generation
**Purpose:** Validate CharacterGenerator & related helpers

**Components:**
- Track selector (with audio profile from previous tab)
- Generate button
- Character sheet display:
  - **Header:** Name, Race, Class, Level
  - **Core Stats:**
    - HP: current/max
    - AC (Armor Class)
    - Initiative bonus
    - Speed
    - Proficiency bonus
  - **Ability Scores:** STR, DEX, CON, INT, WIS, CHA (with modifiers)
  - **Skills:** All 18 skills with proficiency level (none/proficient/expertise)
  - **Saving Throws:** Which abilities have proficiency
  - **Class Features:** List of class-specific features granted
  - **Spells** (if spellcaster):
    - Spell slots available by level
    - Known spells (as clickable list)
    - Cantrips
  - **Equipment:**
    - Weapons (with damage info)
    - Armor (with AC contribution)
    - Misc items
  - **Appearance:**
    - Body type, Skin tone, Hair (style + color), Eye color, Facial features
    - Primary/secondary colors from audio analysis
    - Aura color (if magical class)
  - **XP Info:**
    - Current XP: 0 (level 1)
    - XP to next level: 300
- Determinism tester:
  - Generate same character twice
  - Show "✓ Deterministic match!" or "✗ Mismatch!" badge
  - Option to download both JSON and compare

**Visual:**
- ASCII art character portrait (or simple colored rectangle with class icon)
- Stat bars for ability scores (STR/DEX/CON etc.)
- Skill matrix (rows = skills, highlight proficiencies)

---

#### Tab 6: Session Tracking
**Purpose:** Validate SessionTracker

**Components:**
- Session simulator (controls):
  - Start session button
  - Track selector (which track being listened to)
  - Duration slider: 0-600 seconds (simulates real time)
  - Activity type selector: Stationary/Walking/Running/Driving
  - Environmental context toggle (if sensors available)
  - End session button
- Active session display:
  - Session ID
  - Track UUID
  - Elapsed time (updates in real-time)
  - Playback position percentage
- Session history:
  - Table of all ended sessions
  - Track UUID, Start time, End time, Duration, Base XP, Bonus XP, Total XP
  - Sort by date, track, or XP earned
  - Click to view session details (full EnvironmentalContext, GamingContext if recorded)

**Visual:**
- Real-time timer display
- Progress bar showing playback %
- Session list with inline expandable details

---

#### Tab 7: XP Calculator
**Purpose:** Validate XPCalculator

**Components:**
- Manual XP calculation tool:
  - Duration input: 0-3600 seconds (or minutes)
  - Base XP rate selector (default: 1 XP/sec)
  - Activity bonus selector: Stationary/Walking/Running/Driving (applies multiplier)
  - Environmental bonuses (optional):
    - Night time bonus (+10%)
    - Extreme weather bonus (+20%)
    - High altitude bonus (+15%)
  - Gaming bonus (optional):
    - Currently gaming bonus (+25%)
  - Track mastery (optional):
    - Is track mastered? (Yes/No)
    - Mastery bonus XP (e.g., +50)
  - Calculate button
- Results display:
  - Base XP: [duration * base_rate]
  - Activity multiplier: [x1.0 / x1.2 / x1.5 / x1.3]
  - Environmental bonuses: [+0 / +10% / +20% / +15%]
  - Gaming bonus: [+0 / +25%]
  - Mastery bonus: [+0 / +50]
  - **Total XP earned: [result]**
  - Breakdown pie chart

**Calculation Formula Display:**
```
Base XP = duration * 1.0 = X XP
Activity Bonus = X * 1.2 = Y XP
Environmental Bonus = Y * 1.1 (night) = Z XP
Gaming Bonus = Z * 1.25 = W XP
Mastery Bonus = W + 50 = TOTAL XP
```

---

#### Tab 8: Character Leveling
**Purpose:** Validate CharacterUpdater & LevelUpProcessor

**Components:**
- Character selector (load previously generated character or create new)
- XP accumulation simulator:
  - Current XP bar: [progress bar showing XP/next level threshold]
  - Level: 1 → 20 selector
  - Current XP input: 0-300000
  - Add XP button (quick presets: +50, +100, +300, +1000)
  - Set XP to level input
- Character state display:
  - Level (updates as you add XP)
  - XP progress: X / 300 (next level)
  - HP: updates on level-up
  - AC: updates if ability scores improve
  - Ability scores: show improvements
  - Proficiency bonus: updates per D&D 5e rules
  - Spell slots (if applicable): show available slots per level
- Level-up history:
  - Log of all level-ups achieved
  - Show benefits granted: HP increase, AC change, ability improvements, new spells, new class features
  - Timestamp of each level-up

**Visual:**
- XP bar (progress toward next level)
- Level number (large)
- Stat comparison (before/after level-up)
- Achievement notification on level-up

---

#### Tab 9: Combat Simulator
**Purpose:** Validate CombatEngine

**Components:**
- Combat setup:
  - Player team selector:
    - Load previously generated character
    - Or create enemy combatant (quick presets: Goblin, Ogre, Dragon, Lich, etc.)
    - Add multiple characters/enemies to the combat
  - Environment toggle: Use environmental context in combat calculations
  - Start combat button
- Combat visualization:
  - Combatants on screen:
    - Player character card: Name, Class, Level, HP bar, AC, Initiative
    - Enemy card: Name, Class, Level, HP bar, AC, Initiative
    - Initiative order (list of combatants, highlight current turn)
  - Turn log (scrollable):
    - Round 1:
      - "Goblin rolls initiative: 8 + 3 = 11"
      - "Fighter rolls initiative: 12 + 2 = 14"
    - Round 1, Turn 1 (Fighter's turn):
      - "Fighter attacks Goblin with Longsword"
      - "Attack roll: 18 + 3 = 21 vs AC 15"
      - "HIT! Damage roll: 2d8 + 2 = [5, 4] + 2 = 11 damage"
      - "Goblin HP: 20 → 9"
    - Round 1, Turn 2 (Goblin's turn):
      - "Goblin attacks Fighter with Shortsword"
      - "Attack roll: 8 + 2 = 10 vs AC 16"
      - "MISS!"
    - [Continue for all rounds...]
  - Combat end result:
    - Winner: [Character name]
    - Defeated: [List]
    - Rounds elapsed: X
    - Total turns: X
    - XP awarded: X
    - Combat duration: X seconds (real time)
- Combat control buttons:
  - Next turn (manual step-through option)
  - Speed slider: Slow (1 action/sec) → Normal (auto) → Fast (instant)
  - Pause / Resume
  - Reset / New combat
- Exported combat result:
  - JSON download
  - Copy full turn log to clipboard

**Visual:**
- Character cards with HP bars (red = critical, yellow = damaged, green = healthy)
- Initiative tracker (visual order of turns)
- Combat log in monospace font (terminal-style)
- Damage numbers popping up as they occur (animated)
- Victory/defeat overlay

---

#### Tab 10: Settings & Debug
**Purpose:** Configuration and troubleshooting

**Components:**
- Environment configuration:
  - API Keys:
    - OpenWeatherMap API key input (for weather sensor)
    - Test connectivity button
  - AudioAnalyzer options:
    - Include advanced metrics: [Toggle]
    - Sample rate: [Dropdown] 44100 / 48000 / 96000
    - FFT size: [Dropdown] 1024 / 2048 / 4096
  - XP Calculator defaults:
    - Base XP per second: [Input]
    - Activity bonuses: [Multiplier inputs]
    - Reset to defaults button
  - Combat config:
    - Use environment in combat: [Toggle]
    - Use music in combat: [Toggle]
    - Tactical mode: [Toggle]
    - Max turns before draw: [Input]
- Data management:
  - Export all data (full app state as JSON)
  - Import state from JSON file
  - Clear all local storage
  - Reset to defaults
- Debug mode:
  - Enable verbose logging: [Toggle]
  - Show raw engine outputs: [Toggle]
  - Validation reporting: [Toggle]
- Demo data presets:
  - Load sample Arweave playlist ID
  - Generate 5 random characters
  - Create sample session history
  - Populate environmental data

---

### 4.3 Sidebar (Always Visible)

**Left sidebar shows:**
- App version
- Current loaded playlist (if any)
  - Playlist name
  - Track count
- Current character (if any)
  - Name, Race, Class, Level
  - XP progress bar
- Quick stats:
  - Total sessions tracked
  - Total XP earned (all characters)
  - Total environmental samples
  - Connected gaming platforms
- Quick actions:
  - [New Playlist]
  - [New Character]
  - [Export All Data]

---

## 5. Data Flow & Integration

### 5.1 Sequence: Load Playlist → Generate Character → Track Session

```
1. User loads Arweave JSON (Playlist Loader tab)
   ↓
2. PlaylistParser.parse() → ServerlessPlaylist
   ├─ Display playlist metadata
   └─ Display track list
   ↓
3. User selects track (Audio Analysis tab)
   ↓
4. AudioAnalyzer.extractSonicFingerprint() → AudioProfile
   ├─ Display frequency breakdown
   ├─ Extract color palette from album art
   └─ Show analysis metadata
   ↓
5. User generates character (Character Generation tab)
   ↓
6. CharacterGenerator.generate() → CharacterSheet
   ├─ Display full character sheet
   └─ Save to local state
   ↓
7. User simulates session (Session Tracking tab)
   ├─ SessionTracker.startSession() → sessionId
   └─ (time passes)
   ├─ SessionTracker.endSession() → ListeningSession
   └─ Display session results
   ↓
8. XP applied to character (Character Leveling tab)
   ├─ CharacterUpdater.updateCharacterFromSession()
   ├─ LevelUpProcessor checks if level-up occurs
   └─ Display updated character state
```

### 5.2 Sensor Integration Flow

```
User clicks "Request Permissions" (Environmental Sensors tab)
   ↓
EnvironmentalSensors.requestPermissions(['geolocation', 'motion'])
   ├─ Browser requests permission for Geolocation API
   ├─ Browser requests permission for DeviceMotionEvent
   └─ User grants/denies
   ↓
EnvironmentalSensors.startMonitoring()
   ├─ GeolocationProvider.getCurrentPosition() → updates on location change
   ├─ MotionDetector.startMonitoring() → updates on device motion
   ├─ WeatherAPIClient.getWeather(lat, lon) → fetches weather (if API key provided)
   ├─ LightSensor.startMonitoring() → updates on light change
   └─ All data aggregates into EnvironmentalContext
   ↓
App displays live sensor values
   ├─ Maps, coordinates, compass
   ├─ Motion intensity gauge
   ├─ Weather icon & values
   ├─ Light level
   └─ Composite XP modifier (0.5x - 3.0x)
```

### 5.3 Gaming Platforms Integration Flow

```
User clicks "Connect Steam" (Gaming Platforms tab)
   ↓
GamingPlatformSensors.authenticate(steamUserId)
   ├─ SteamAPIClient validates user
   └─ Fetches account info
   ↓
GamingPlatformSensors.startMonitoring()
   ├─ SteamAPIClient.getCurrentGame() → polls every 30 sec
   ├─ If game changed:
   │  └─ SteamAPIClient.getGameMetadata() → fetches genre/tags
   └─ Updates GamingContext
   ↓
App displays:
   ├─ Currently playing game
   ├─ Game genre (for bonus calculation)
   ├─ Total gaming minutes
   ├─ Gaming bonus (if actively gaming + listening)
   └─ Connected status badge
```

---

## 6. Data Persistence & Storage

**All data stored in LocalForage (IndexedDB wrapper):**

```typescript
// Keys in store:
"playlist:current" → ServerlessPlaylist
"characters:*" → Array<CharacterSheet>  // Generated characters
"sessions:history" → Array<ListeningSession>
"sensors:environmental" → EnvironmentalContext (latest)
"gaming:context" → GamingContext (latest)
"auth:steam" → { userId, accountName, avatar }
"auth:discord" → { userId, username, avatar }
"app:settings" → { apiKeys, preferences, defaults }
```

**Export/Import:**
- Single JSON file containing all app state
- Useful for backup and team sharing
- Importable back into app

---

## 7. Validation & Testing Features

### 7.1 Data Type Validation

Each tab includes a subtle validation indicator:

```
✓ Valid Character Sheet (all required fields present)
✗ Invalid AudioProfile (missing spectral_centroid)
```

Uses Zod schemas from engine to validate outputs.

### 7.2 Determinism Checker

**Character Generation tab:**
- Generate character from track
- Generate same character again (click "Regenerate")
- Compare JSON outputs
- Display: "✓ Deterministic match!" or "✗ Outputs differ!"

**Purpose:** Verify CharacterGenerator always produces identical output for same seed + audio profile.

### 7.3 Error Recovery

If an operation fails (e.g., audio URL is broken):

```
⚠ Audio Analysis Failed
┌─────────────────────────────────────────┐
│ Failed to download audio from URL:      │
│ https://example.com/broken-audio.mp3    │
│                                         │
│ Error: CORS policy, or file 404         │
│                                         │
│ [Retry] [Use Different Track]          │
└─────────────────────────────────────────┘
```

### 7.4 Permission Denied Fallback

If user denies sensor permissions:

```
⚠ Geolocation Permission Denied
Showing simulated data for demonstration:
- Latitude: 51.5074° N
- Longitude: -0.1278° W
[Use Real Data] [Simulate Different Location]
```

---

## 8. Visual Design & UX

### 8.1 Design System

**Color Palette:**
- Primary: Deep blue (#1a365d) - trust, technical
- Accent: Cyan (#06b6d4) - highlights, active state
- Success: Green (#10b981) - validation, connected
- Warning: Orange (#f59e0b) - caution, simulation
- Error: Red (#ef4444) - failed, denied
- Neutral: Gray (#6b7280) - secondary text

**Typography:**
- Headings: Bold, sans-serif (clarity)
- Body: Regular, readable line height (scannability)
- Data: Monospace font for sensor values and JSON

**Layout:**
- Tabbed navigation (consistent with many web apps)
- Left sidebar for quick reference
- 2-3 column layout depending on content
- Mobile responsive (single column on small screens)

### 8.2 Data Visualization

- **Charts:** Frequency spectrum (bar chart or polar), XP breakdown (pie chart)
- **Tables:** Sessions, combat log (sortable, searchable)
- **Gauges:** Movement intensity, illuminance (circular progress)
- **Progress bars:** XP to next level, permission status
- **Cards:** Character details, track info, combatant status
- **Real-time updates:** Sensor values refreshing live, turn log appending

---

## 9. Technology Stack

**Frontend:**
- React 18 + TypeScript
- TailwindCSS (utility styling)
- Zustand (state management)
- React Router v6 (tab navigation)

**Audio & Sensors:**
- Web Audio API (frequency analysis)
- Geolocation API
- DeviceMotionEvent (accelerometer/gyroscope)
- AmbientLightSensor API
- Fetch API (weather, Steam, Discord)

**Data & Storage:**
- LocalForage (IndexedDB)
- Zod (validation schemas)
- JSON serialization

**Integrations:**
- OpenWeatherMap API (weather sensor)
- Steam Web API (gaming platform)
- Discord OAuth + RPC (gaming platform)
- Arweave (playlist import)

**Engine Integration:**
```typescript
import {
  PlaylistParser,
  AudioAnalyzer,
  CharacterGenerator,
  SessionTracker,
  XPCalculator,
  CharacterUpdater,
  EnvironmentalSensors,
  GamingPlatformSensors,
  CombatEngine,
} from 'playlist-data-engine';
```

---

## 10. Development Roadmap

### Phase 1: Core Showcase (Weeks 1-2)
- [ ] UI shell with 10 tabs
- [ ] Playlist Loader tab (PlaylistParser)
- [ ] Audio Analysis tab (AudioAnalyzer)
- [ ] Environmental Sensors tab (EnvironmentalSensors)
- [ ] Gaming Platforms tab (GamingPlatformSensors)
- [ ] Settings tab (configuration)

### Phase 2: Character & Progression (Week 3)
- [ ] Character Generation tab (CharacterGenerator)
- [ ] Session Tracking tab (SessionTracker)
- [ ] XP Calculator tab (XPCalculator)
- [ ] Character Leveling tab (CharacterUpdater + LevelUpProcessor)

### Phase 3: Combat & Polish (Week 4)
- [ ] Combat Simulator tab (CombatEngine)
- [ ] Debug & validation features
- [ ] Error handling & fallbacks
- [ ] Visual polish & animations

---

## 11. Success Criteria

✅ **All engine modules are instantiable** - No missing imports or broken references

✅ **Data flows correctly end-to-end** - Playlist → Audio → Character → Session → XP → Leveling

✅ **Sensors work (with graceful fallbacks)** - Permissions request/deny flows work, simulated data shown when denied

✅ **Gaming platform auth works** - Can authenticate Steam and Discord, track gaming activity

✅ **Combat engine outputs valid results** - Combats resolve with proper initiative, attack rolls, and damage

✅ **All data types validate** - Output matches TypeScript interfaces and Zod schemas

✅ **Determinism is verifiable** - Same character generated twice produces identical output

✅ **Performance is acceptable** - Playlist parsing, character generation, and combat runs in <5 seconds

✅ **Mobile friendly** - All tabs work on mobile (with permission flows)

✅ **No hardcoded secrets** - API keys configurable via settings, no credentials in code

---

## 12. Success Story Example

**A developer wants to verify the full engine integration:**

1. Opens Showcase app
2. **Playlist Loader tab:** Pastes Arweave ID → sees playlist with 20 tracks parsed ✓
3. **Audio Analysis tab:** Selects track → analyzes frequency profile → sees bass/mid/treble breakdown ✓
4. **Environmental Sensors tab:** Grants permission → sees live GPS/motion/weather data ✓
5. **Gaming Platforms tab:** Connects Steam → sees current game and gaming bonus calculated ✓
6. **Character Generation tab:** Generates character → sees full D&D 5e sheet with 40+ attributes ✓
7. **Session Tracking tab:** Simulates 30-second listening session → sees session recorded ✓
8. **XP Calculator tab:** Inputs session duration + activity bonus → calculates total XP correctly ✓
9. **Character Leveling tab:** Applies XP to character → sees HP/AC increase on level-up ✓
10. **Combat Simulator tab:** Generates enemy → runs combat → sees proper D&D mechanics applied ✓
11. **Settings tab:** Exports all data as JSON → imports it back → everything intact ✓

**Result:** Confidence that the entire playlist-data-engine ecosystem works correctly across all modules.

---

## 13. Key Differences from Audio Alchemists Game

| Aspect | Game (Audio Alchemists) | Showcase App |
|--------|----------------------|--------------|
| **Goal** | Tell a story, provide idle RPG experience | Demonstrate engine features |
| **Focus** | Gameplay loops, character progression narratives | Data validation, direct feature exposure |
| **Combat** | High-stakes, wager-based, strategy | Simulation only, no player stakes |
| **Cosmetics** | Gacha shop, gold currency, decorations | None |
| **Character** | Tied to specific track, persistent across sessions | Generated on-demand, one-off demos |
| **Sensors** | Used for XP multiplier (optional gameplay feature) | Displayed directly for validation |
| **UI** | Game screen with playlist sidebar | Tabbed technical interface |
| **Audience** | Players | Developers, QA, team leads |

---

## 14. File Structure (Future)

```
src/
├── components/
│   ├── Tabs/
│   │   ├── PlaylistLoaderTab.tsx
│   │   ├── AudioAnalysisTab.tsx
│   │   ├── EnvironmentalSensorsTab.tsx
│   │   ├── GamingPlatformsTab.tsx
│   │   ├── CharacterGenTab.tsx
│   │   ├── SessionTrackingTab.tsx
│   │   ├── XPCalculatorTab.tsx
│   │   ├── CharacterLevelingTab.tsx
│   │   ├── CombatSimulatorTab.tsx
│   │   └── SettingsTab.tsx
│   ├── Sidebar.tsx
│   ├── Layout.tsx
│   └── DataViz/
│       ├── FrequencyChart.tsx
│       ├── XPBreakdownChart.tsx
│       ├── CombatLog.tsx
│       └── CharacterCard.tsx
├── store/
│   ├── playlistStore.ts
│   ├── characterStore.ts
│   ├── sessionStore.ts
│   ├── sensorStore.ts
│   └── gamingStore.ts
├── hooks/
│   ├── useAudioAnalyzer.ts
│   ├── useCharacterGenerator.ts
│   ├── useSessionTracker.ts
│   ├── useEnvironmentalSensors.ts
│   └── useGamingPlatforms.ts
├── utils/
│   ├── storage.ts (LocalForage helpers)
│   ├── validation.ts (Zod schema checks)
│   ├── formatting.ts (display utils)
│   └── errorHandling.ts
└── App.tsx
```

---

**Document Version:** 1.0
**Created:** December 1, 2025
**Purpose:** Proof-of-concept validation app for Playlist Data Engine
**Target Users:** Developers, QA, team members
**Philosophy:** Show, Don't Simulate - Direct engine feature exposure
