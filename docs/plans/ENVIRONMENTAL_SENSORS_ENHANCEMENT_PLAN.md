# EnvironmentalSensorsTab Enhancement Plan

## Overview

Enhance the EnvironmentalSensorsTab to showcase all available engine features including XP modifier calculation, biome detection, severe weather alerts, and sensor diagnostics.

**User Context:**
- Weather API key is entered but no data is loading - need to troubleshoot
- Diagnostics panel is HIGH PRIORITY to help debug sensor issues
- XP modifier should be simple (just the total, no breakdown)

**Current State:**
- Permission requests (geolocation, motion, light)
- GPS location display (lat/long, altitude, speed, heading)
- Live motion data (X/Y/Z acceleration graphs)
- Weather display (temp, humidity, wind, pressure, moon phase) - **NOT WORKING**
- Raw JSON dump

**Missing Features:**
- XP Modifier display (1.0x - 3.0x based on all environmental factors) - **SIMPLE**
- Biome detection display - **DATA ALREADY EXISTS**
- Sensor diagnostics panel - **HIGH PRIORITY for debugging**
- Severe weather alerts (if data available)

---

## Phase 1: Hook & Store Updates

### 1.1 Update useEnvironmentalSensors Hook
- [x] Add `xpModifier` state and expose from hook
  - [x] Call `sensors.calculateXPModifier()` and store result
  - [x] Update when environmentalContext changes
- [x] Add `biome` extraction from environmentalContext
  - [x] Biome is already in EnvironmentalContext type: `environmentalContext.biome`
- [x] Add optional `severeWeatherAlert` state
  - [x] Call `sensors.detectSevereWeather()` when weather updates
  - [x] Store result (null if no severe weather)
- [x] Add `diagnostics` state (optional, for debug panel)
  - [x] Call `sensors.getDiagnostics()` for comprehensive sensor health

**Files to modify:**
- `src/hooks/useEnvironmentalSensors.ts`

**New return values from hook:**
```typescript
{
  // Existing
  requestPermission,
  startMonitoring,
  isMonitoring,
  environmentalContext,
  permissions,
  sensors,

  // New
  xpModifier: number,           // 1.0 - 3.0
  severeWeatherAlert: SevereWeatherAlert | null,
  diagnostics: SensorDiagnostics | null
}
```

---

## Phase 2: XP Modifier Card (Simple)

### 2.1 Create XP Modifier Display Card
- [x] Create prominent XP Modifier card in EnvironmentalSensorsTab
  - [x] Large multiplier display (e.g., "1.75x")
  - [x] Color-coded based on value:
    - 1.0x - 1.24x: Default/muted
    - 1.25x - 1.49x: Yellow (bonus active)
    - 1.5x - 1.99x: Orange (high bonus)
    - 2.0x+: Green/teal (epic bonus)
  - [x] Optional: small label like "XP Bonus" or "Environmental Modifier"

**Files to modify:**
- `src/components/Tabs/EnvironmentalSensorsTab.tsx`
- `src/components/Tabs/EnvironmentalSensorsTab.css`

**UI Placement:** Above weather card, highly visible

**Note:** Keep it simple - just show the total multiplier, no breakdown needed

---

## Phase 3: Biome Display

### 3.1 Add Biome to GPS/Location Card
- [x] Display biome in GPS location card
  - [x] Use emoji mapping for biomes:
    - urban: 🏙️
    - forest: 🌲
    - desert: 🏜️
    - mountain: ⛰️
    - valley: 🏞️
    - water/coastal: 🌊
    - tundra: ❄️
    - plains: 🌾
    - jungle: 🌴
    - swamp: 🐊
    - taiga: 🌲❄️
    - savanna: 🦁
  - [x] Show biome name below coordinates
  - [x] Style as subtle badge or label

**Files to modify:**
- `src/components/Tabs/EnvironmentalSensorsTab.tsx`
- `src/components/Tabs/EnvironmentalSensorsTab.css`

**Note:** Biome data is already in `environmentalContext.biome` from the engine

---

## Phase 4: Severe Weather Alerts (If Data Available)

### 4.1 Add Severe Weather Alert Card
- [x] Create conditional alert card that appears when severe weather detected
  - [x] Only renders if `severeWeatherAlert` is not null
  - [x] Animated warning icon
  - [x] Alert type display (Blizzard/Hurricane/Typhoon/Tornado)
  - [x] Severity level badge (moderate/high/extreme)
  - [x] XP bonus indicator (+50%, +75%, +100%)
  - [x] Safety warning text from `getSevereWeatherWarning()`
  - [x] Dismissible card

**Alert Types & Bonuses:**
| Type | XP Bonus | Detection Criteria |
|------|----------|-------------------|
| Blizzard | +50% | Heavy snow + wind >25 km/h |
| Hurricane | +75% | Wind >118 km/h in tropics (lat <23.5°) |
| Typhoon | +75% | Wind >118 km/h in temperate zones |
| Tornado | +100% | Tornado weather type detected |

**Files to modify:**
- `src/components/Tabs/EnvironmentalSensorsTab.tsx`
- `src/components/Tabs/EnvironmentalSensorsTab.css`

---

## Phase 5: Sensor Diagnostics (HIGH PRIORITY - For Troubleshooting)

### 5.1 Add Diagnostics Panel
- [x] Create always-visible "Diagnostics" section at bottom of tab
  - [x] This is CRITICAL for debugging why weather isn't working
  - [x] Show each sensor with status badge:
    - 🟢 Geolocation: Working / Last update: 2s ago
    - 🟡 Motion: Permission granted / No data yet
    - 🔴 Weather: API Error - "Invalid API key" / Last attempt: failed
  - [x] Weather API specific debugging:
    - [x] API key configured? (yes/no - DON'T show the actual key)
    - [x] Last API call timestamp
    - [x] API response status (success/error)
    - [x] Error message if failed
    - [x] Cache hit/miss status
  - [x] Cache statistics:
    - Geolocation cache: hit/miss
    - Weather cache: hit/miss, age
  - [x] Recent failures (last 5):
    - Timestamp, sensor type, error message

**Files to modify:**
- `src/hooks/useEnvironmentalSensors.ts` - expose diagnostics
- `src/components/Tabs/EnvironmentalSensorsTab.tsx`
- `src/components/Tabs/EnvironmentalSensorsTab.css`

**UI Goal:** At a glance, user should see:
1. Is the weather API key being recognized?
2. Is the weather API being called?
3. What error is it returning?
4. When was the last successful call?

---

## Phase 6: Weather Troubleshooting (Do First!)

### 6.1 Investigate Weather API Issue
**Current Issue:** API key entered but no weather data loading

- [x] Add debug logging to `useEnvironmentalSensors.ts`
  - [x] Log when `updateSnapshot()` is called
  - [x] Log the API key being used (first/last 4 chars only for security)
  - [x] Log the API response or error
  - [x] Log what `environmentalContext.weather` contains after update

- [x] Check the data flow:
  1. Settings → appStore → openWeatherApiKey
  2. useEnvironmentalSensors reads from appStore
  3. EnvironmentalSensors constructor receives API key
  4. `updateSnapshot()` calls weather API
  5. Result stored in environmentalContext

  **✅ ISSUE FOUND AND FIXED:**
  The `EnvironmentalSensors` instance was created in `useState(() => ...)` at hook mount time.
  However, the `settings.openWeatherApiKey` might not be hydrated from LocalForage yet at that moment.

  **Fix Applied:**
  - Added `_hasHydrated` state to `appStore` with `onRehydrateStorage` callback
  - Updated `useEnvironmentalSensors` to wait for hydration before creating `EnvironmentalSensors`
  - Added logic to recreate `EnvironmentalSensors` instance when API key changes after hydration
  - This ensures the API key is properly loaded before being passed to the engine

- [ ] Common issues to check:
  - [x] Is the API key actually being passed to EnvironmentalSensors? **YES - NOW FIXED**
  - [ ] Is the geolocation data available (needed for weather lookup)?
  - [ ] CORS issues in browser? (OpenWeather should be fine)
  - [ ] API key restrictions? (some keys are restricted by domain)
  - [ ] Is the API key activated? (new keys can take a few hours)

### 6.2 Improve Weather Error UI
- [x] Update weather empty state card to show specific reason:
  - [x] "No GPS location" (need location for weather)
  - [x] "API key not configured" (check settings)
  - [x] "API error: [specific message]" (rate limit, invalid key, etc.)
  - [x] "Network error" (can't reach OpenWeather)
- [x] Add manual refresh button for weather
- [x] Show last successful update time

**Files to modify:**
- `src/hooks/useEnvironmentalSensors.ts`
- `src/components/Tabs/EnvironmentalSensorsTab.tsx`
- `src/store/appStore.ts`

---

## Dependencies

- Phase 1 (hook updates) is the foundation - do first
- Phase 6 (weather troubleshooting) should be done early to understand why weather isn't working
- Phase 5 (diagnostics) will help debug weather issues - do alongside Phase 6
- Phase 2-4 are UI enhancements that depend on Phase 1

**Suggested Order:**
1. Phase 1 (hook) + Phase 6 (debug logging)
2. Phase 5 (diagnostics panel) - to see debug info
3. Phase 2 (XP modifier) - quick win once data is flowing
4. Phase 3 (biome) - very quick, data already exists
5. Phase 4 (severe weather) - only if weather works after troubleshooting

---

## API Reference (from engine)

### EnvironmentalSensors Methods
```typescript
// XP Modifier
sensors.calculateXPModifier(): number  // 1.0 - 3.0

// Severe Weather
sensors.detectSevereWeather(): SevereWeatherAlert | null
sensors.getSevereWeatherWarning(): string | null

// Diagnostics
sensors.getDiagnostics(): {
  timestamp: number,
  diagnosticMode: boolean,
  sensors: SensorStatus[],
  cache: CacheStats,
  performance: PerformanceMetrics,
  recentFailures: FailureLog[],
  permissions: PermissionState[],
  context: EnvironmentalContext
}

// Activity Detection
sensors.getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
```

### EnvironmentalContext Properties
```typescript
interface EnvironmentalContext {
  geolocation?: GeolocationData;
  motion?: MotionData;
  weather?: WeatherData;
  light?: LightData;
  biome?: BiomeType;  // <-- Already available!
  environmental_xp_modifier?: number;
  timestamp: number;
}
```

### SevereWeatherAlert Type
```typescript
interface SevereWeatherAlert {
  type: 'blizzard' | 'hurricane' | 'typhoon' | 'tornado';
  severity: 'moderate' | 'high' | 'extreme';
  xpBonus: number;  // 0.5, 0.75, or 1.0
  message: string;
}
```

---

## Questions/Unknowns

1. **~~Weather not working?~~** - User confirmed API key is entered but no data loads
   - Need to add logging to trace where it fails
   - Possible causes: API key not passed correctly, geolocation missing, API key not activated yet
   - Diagnostics panel will help identify the issue

2. **Biome data source** - Already in `environmentalContext.biome` from engine, just needs to be displayed

3. **Severe weather data** - Comes from same weather API call, no extra work needed if weather is working

4. **Forecast** - User not interested. Skip.

---

## Quick Win Checklist

**Do These First (for debugging):**
- [x] Add debug logging to `useEnvironmentalSensors.ts` to see what's happening with weather API
- [x] Add diagnostics panel to show API status, errors, and last call info
- [ ] Check browser console for errors when monitoring starts

**Then These (once we know data is flowing):**
- [x] Add `xpModifier` to hook return and display in card (15 min)
- [x] Display `environmentalContext.biome` in GPS card (5 min - data already exists!)
- [x] Add severe weather alert card (only if weather is working) (20 min)

---

*Plan created: 2026-02-14*
