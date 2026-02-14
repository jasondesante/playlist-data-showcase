# GamingPlatformsTab Enhancement Plan

## Overview

Enhance the GamingPlatformsTab to showcase Steam game schema/stats, API performance metrics, gaming session history, and diagnostic information. Discord features are de-prioritized since the app runs client-side and Discord RPC requires server-side communication to Discord's servers.

**Current State:**
- Steam ID input and connection
- Discord Client ID input and connection (limited functionality in client-side app)
- Discord music status ("Listening to...") - requires server mode
- Gaming context display (game, genre, party size)
- Gaming XP bonus calculation
- Gaming summary (minutes, games played)
- Raw JSON dumps

**Target Enhancements:**
- Steam Game Schema/Stats display (achievements, player stats)
- Steam API performance metrics
- Gaming session history tracking
- Diagnostic dashboard
- Clear messaging about Discord client-side limitations

---

## Phase 1: Hook Updates - Expose New Steam Features

### 1.1 Update useGamingPlatforms Hook
- [ ] Add `gameSchema` state and fetch method
  - [ ] Add `fetchGameSchema(appId)` method
  - [ ] Call `sensors.steamClient.getGameSchema(appId)` (or equivalent via sensors)
  - [ ] Store result in state
- [ ] Add `apiStatistics` state
  - [ ] Call `sensors.getDiagnostics()` to get API performance metrics
  - [ ] Extract Steam API timing data (avg, min, max, success rate, p95, p99)
- [ ] Add `diagnostics` getter
  - [ ] Expose `sensors.getDiagnostics()` directly for debug panel
- [ ] Add `isServerMode` detection
  - [ ] Check if running in browser vs server environment
  - [ ] Return boolean for Discord capability check

**Files to modify:**
- `src/hooks/useGamingPlatforms.ts`

**New return values from hook:**
```typescript
{
  // Existing
  connectSteam,
  connectDiscord,
  disconnectDiscord,
  checkActivity,
  setMusicStatus,
  clearMusicStatus,
  calculateGamingBonus,
  gamingContext,
  discordConnectionStatus,
  discordConnectionError,

  // New
  gameSchema: GameSchema | null,
  fetchGameSchema: (appId: number) => Promise<void>,
  apiStatistics: ApiStatistics | null,
  diagnostics: GamingDiagnostics | null,
  isServerMode: boolean,  // For Discord capability check
}
```

---

## Phase 2: Discord Client-Side Limitation Warning

### 2.1 Add Environment Detection
- [ ] Detect if running in client-side (browser) vs server mode
  - [ ] Check `typeof window !== 'undefined'` or similar
  - [ ] Add `isServerMode: boolean` to hook return

### 2.2 Gray Out Discord Section in Client-Side Mode
- [ ] Apply visual overlay to Discord card when in client-side mode
  - [ ] Semi-transparent gray overlay
  - [ ] "Server Mode Required" badge at top of section
  - [ ] Disable interactive elements (inputs, buttons)
  - [ ] Keep inputs visible but read-only
- [ ] Add explanatory tooltip/modal on hover
  - [ ] "Discord Rich Presence requires server-side execution"
  - [ ] "Client-side apps cannot communicate with Discord's IPC"
  - [ ] Link to engine docs about server mode

**Files to modify:**
- `src/hooks/useGamingPlatforms.ts`
- `src/components/Tabs/GamingPlatformsTab.tsx`
- `src/components/Tabs/GamingPlatformsTab.css`

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ 🛑 Server Mode Required                 │ ← Badge at top
├─────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░ Discord Music Status           ░░░░░ │
│ ░ [grayed out input]             ░░░░░ │
│ ░ [grayed out button]            ░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                         │
│ ℹ️ Discord features require backend     │
│    server. Click to learn more.         │
└─────────────────────────────────────────┘
```

---

## Phase 3: Steam Game Schema Display

### 3.1 Add Game Schema Section Inside "Currently Gaming" Card
- [ ] When a game is detected and has an `appId`, fetch game schema
  - [ ] Auto-fetch on game detection if `appId` available
  - [ ] Store in `gameSchema` state
- [ ] Create expandable "Game Stats & Achievements" section inside Currently Gaming card
  - [ ] Collapsible/expandable toggle (default collapsed)
  - [ ] Show game name and icon (if available)
  - [ ] Display available achievements list
    - [ ] Achievement name
    - [ ] Achievement description
    - [ ] Completion status (if available)
  - [ ] Display player stats (if available)
    - [ ] Stat name
    - [ ] Current value
  - [ ] Show loading state while fetching
  - [ ] Handle error state gracefully

**Files to modify:**
- `src/hooks/useGamingPlatforms.ts`
- `src/components/Tabs/GamingPlatformsTab.tsx`
- `src/components/Tabs/GamingPlatformsTab.css`

**UI Placement:** Inside "Currently Gaming" card as expandable section

**Game Schema Data Structure (from engine):**
```typescript
interface GameSchema {
  gameName: string;
  gameVersion: string;
  availableGameStats?: {
    achievements?: Achievement[];
    stats?: PlayerStat[];
  };
}

interface Achievement {
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  icongray?: string;
  hidden?: boolean;
}

interface PlayerStat {
  name: string;
  displayName?: string;
  value: number;
}
```

---

## Phase 4: Steam API Performance Metrics

### 4.1 Create API Performance Section
- [ ] Fetch API statistics from diagnostics
  - [ ] Call `sensors.getDiagnostics()` and extract performance data
  - [ ] Or call `steamClient.getCurrentGameApiStatistics()` directly
- [ ] Create "Steam API Performance" card (collapsible)
  - [ ] Show average response time
  - [ ] Show min/max response times
  - [ ] Show success rate percentage
  - [ ] Show P95 and P99 latency (if available)
  - [ ] Show total API calls count
  - [ ] Visual indicator (green/yellow/red based on latency)

**Files to modify:**
- `src/hooks/useGamingPlatforms.ts`
- `src/components/Tabs/GamingPlatformsTab.tsx`
- `src/components/Tabs/GamingPlatformsTab.css`

**UI Placement:** In Raw JSON section or as separate collapsible card

**Performance Thresholds:**
| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Avg Response | <200ms | 200-500ms | >500ms |
| Success Rate | >95% | 80-95% | <80% |

---

## Phase 5: Diagnostic Dashboard

### 6.1 Create Collapsible Diagnostics Panel
- [ ] Add "Sensor Diagnostics" collapsible section
  - [ ] Hidden by default, expandable for debugging
  - [ ] Show Steam connection status
    - [ ] API key configured (masked)
    - [ ] Steam ID connected
    - [ ] Last successful API call
  - [ ] Show Discord connection state
    - [ ] Client ID configured
    - [ ] Connection state (Disconnected/Connecting/Connected/Error/Unavailable)
    - [ ] Last error (if any)
  - [ ] Show cache statistics
    - [ ] Game metadata cache size
    - [ ] Cached games list
  - [ ] Show polling status
    - [ ] Polling active/inactive
    - [ ] Poll interval
    - [ ] Last poll time

**Files to modify:**
- `src/components/Tabs/GamingPlatformsTab.tsx`
- `src/components/Tabs/GamingPlatformsTab.css`

**UI Placement:** At bottom of tab, collapsible

**Diagnostics Data (from engine):**
```typescript
interface GamingDiagnostics {
  timestamp: number;
  steam: {
    authenticated: boolean;
    steamId?: string;
    lastCheck?: number;
    error?: string;
  };
  discord: {
    isConnected: boolean;
    connectionState: DiscordConnectionState;
    lastError?: string;
  };
  cache: {
    gameMetadataCache: Map<string, GameMetadata>;
    size: number;
  };
  polling: {
    active: boolean;
    interval: number;
  };
  performance: {
    currentGameApi: ApiStatistics;
    metadataApi: ApiStatistics;
  };
}
```

---

## Phase 6: Enhanced XP Bonus Breakdown

### 6.1 Improve XP Bonus Display
- [ ] Enhance existing XP bonus card with more detail
  - [ ] Show exact formula being applied
  - [ ] Display each factor as progress bar
  - [ ] Show "potential" bonus if session continues
  - [ ] Add visual countdown/progress to next bonus tier

**Files to modify:**
- `src/components/Tabs/GamingPlatformsTab.tsx`
- `src/components/Tabs/GamingPlatformsTab.css`

---

## Dependencies

- Phase 2 (Discord Warning) is independent and can be done first
- Phase 3 (Game Schema) depends on Phase 1 (Hook Updates)
- Phase 4 (API Metrics) depends on Phase 1 (Hook Updates)
- Phase 5 (Diagnostics) depends on Phase 1 (Hook Updates)
- Phase 6 (XP Enhancement) is independent

~~Phase 5: Gaming Session History~~ - Deferred to later iteration

---

## Questions/Unknowns

1. **Game Schema API Access** - Does `getGameSchema()` require additional Steam API permissions?
   - May need Steam Web API key with specific permissions
   - Some games may not have public schema/achievements

2. **appId Availability** - Is `appId` always available in gaming context?
   - Need to verify `currentGame.appId` is populated from Steam API
   - Fallback UI if appId is missing

3. **~~Session Persistence~~** - ✅ Resolved: In-memory only (no localStorage persistence)

4. **~~Discord Server Mode~~** - ✅ Resolved: Gray out Discord section with "Server Mode Required" overlay

---

## API Reference (from engine)

### GamingPlatformSensors Methods
```typescript
// Core methods (already used)
sensors.authenticate(steamUserId?, discordUserId?)
sensors.startMonitoring(callback?)
sensors.stopMonitoring()
sensors.getContext(): GamingContext
sensors.calculateGamingBonus(): number
sensors.recordGameSession(name: string, durationMinutes: number)

// New methods to use
sensors.getDiagnostics(): GamingDiagnostics
```

### SteamAPIClient Methods (if directly accessible)
```typescript
steamClient.getCurrentGame(steamUserId): Promise<CurrentGame>
steamClient.getGameMetadata(gameName): Promise<GameMetadata>
steamClient.getGameSchema(appId): Promise<GameSchema>
steamClient.getCurrentGameApiStatistics(): ApiStatistics
steamClient.getMetadataApiStatistics(): ApiStatistics
```

### DiscordRPCClient Methods (server mode only)
```typescript
discordClient.connect(): Promise<boolean>  // Returns false in browser
discordClient.isConnectedToDiscord(): boolean
discordClient.getUserInfo(): DiscordUserInfo | null
discordClient.setMusicActivity(details): Promise<boolean>
discordClient.clearMusicActivity(): Promise<boolean>
```

---

## Quick Win Checklist

- [ ] Add `isServerMode` detection to hook (5 min)
- [ ] Gray out Discord section with overlay (20 min)
- [ ] Add explanatory tooltip for Discord limitation (10 min)
- [ ] Add `diagnostics` to hook return (5 min)
- [ ] Create collapsible diagnostics panel (30 min)
- [ ] Add `fetchGameSchema()` to hook (20 min)
- [ ] Add Game Schema section inside Currently Gaming card (45 min)

---

## Priority Order

1. **Phase 2** - Discord Warning (quick win, sets expectations)
2. **Phase 1** - Hook Updates (enables all other features)
3. **Phase 3** - Game Schema Display (high value, showcases Steam integration)
4. **Phase 5** - Diagnostics Panel (debugging, developer experience)
5. **Phase 4** - API Performance Metrics (nice to have)
6. **Phase 6** - Enhanced XP Display (polish)

---

*Plan created: 2026-02-14*
