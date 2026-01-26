# Debugging Guide - Playlist Data Showcase

**Last Updated:** 2025-01-25

This guide helps you debug issues in the playlist-data-showcase application.

---

## Table of Contents

1. [Console Log Guide](#console-log-guide)
2. [Common Issues](#common-issues)
3. [Troubleshooting Steps](#troubleshooting-steps)
4. [Engine-Specific Issues](#engine-specific-issues)

---

## Console Log Guide

### Log Format

The application uses a structured logging format for easy debugging:

```
[Module] Level: Message
[Module] Level: Message - Details
```

**Examples:**
```
[PlaylistParser] Info: Fetching playlist from Arweave
[AudioAnalyzer] Info: Analyzing audio track...
[CharacterGenerator] Info: Generated character: Sonic Midnight City the Bard
[CombatEngine] Info: Combat started - 2 combatants
```

### Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `Info` | Normal operation messages | Successful operations, state changes |
| `Warn` | Warning messages | Degraded functionality, fallbacks |
| `Error` | Error messages | Failed operations, exceptions |
| `Debug` | Verbose debug output | Detailed diagnostics (enable in Settings) |

### Enabling Verbose Logging

To enable detailed debug logging:

1. Go to **Settings** tab
2. Scroll to **Debug Settings** section
3. Toggle **Verbose Logging** to ON
4. Check browser console for detailed logs

### Key Log Patterns by Module

#### PlaylistParser
- `[PlaylistLoader] Info: Fetching playlist from Arweave TX: {txId}`
- `[PlaylistLoader] Info: Playlist parsed successfully - {trackCount} tracks`
- `[PlaylistLoader] Error: Failed to fetch playlist - {error}`

#### AudioAnalyzer
- `[AudioAnalyzer] Info: Analyzing audio track: {trackTitle}`
- `[AudioAnalyzer] Info: Analysis complete - Bass: {bass}%, Mid: {mid}%, Treble: {treble}%`
- `[AudioAnalyzer] Error: Audio analysis failed - {error}`

#### CharacterGenerator
- `[CharacterGen] Info: Generating character with seed: {seed}`
- `[CharacterGen] Info: Generated: {name} ({race} {class})`
- `[CharacterGen] Info: Determinism check - {result}`

#### SessionTracker
- `[SessionTracker] Info: Session started - Session ID: {sessionId}`
- `[SessionTracker] Info: Session ended - Duration: {seconds}s`
- `[SessionTracker] Warn: Session already active - ending current session first`

#### XPCalculator
- `[XPCalculator] Info: Calculating XP - Duration: {seconds}s`
- `[XPCalculator] Info: Environmental modifier: {multiplier}x`
- `[XPCalculator] Info: Gaming modifier: {multiplier}x`
- `[XPCalculator] Info: Total XP: {xp} ({multiplier}x)`

#### CombatEngine
- `[CombatEngine] Info: Combat started - {partyCount} vs {enemyCount}`
- `[CombatEngine] Info: Round {round}, Turn {turn} - {combatant}`
- `[CombatEngine] Info: {combatant} attacks {target} - {result}`
- `[CombatEngine] Info: Combat ended - Winner: {winner}, XP: {xp}`

---

## Common Issues

### Issue: Playlist Not Loading

**Symptoms:**
- Arweave TX ID input shows "Loading..." indefinitely
- Error message: "Failed to fetch playlist"
- No tracks displayed after parsing

**Possible Causes:**
1. Invalid Arweave transaction ID
2. Network connectivity issues
3. CORS policy blocking the request
4. Arweave gateway is down

**Solutions:**
1. Verify the TX ID is valid (43 base64url characters)
2. Check browser DevTools Network tab for failed requests
3. Try a different Arweave gateway (contact maintainer)
4. Check console for specific error messages

**Console logs to look for:**
```
[PlaylistLoader] Error: Failed to fetch playlist - NetworkError
[PlaylistLoader] Error: Invalid Arweave response format
```

---

### Issue: Audio Analysis Fails

**Symptoms:**
- "Analyze Audio" button shows loading forever
- Error: "Audio analysis failed"
- No frequency bands displayed

**Possible Causes:**
1. Invalid audio URL (CORS blocked)
2. Audio file format not supported
3. Network timeout (large file)
4. Web Audio API not supported in browser

**Solutions:**
1. Check if audio URL is accessible directly in browser
2. Verify audio file is MP3, WAV, or OGG format
3. Check console for specific CORS errors
4. Try a different browser (Chrome/Firefox recommended)

**Console logs to look for:**
```
[AudioAnalyzer] Error: Failed to load audio - CORS policy
[AudioAnalyzer] Error: DecodeAudioData error
```

---

### Issue: Character Generation Fails

**Symptoms:**
- "Generate Character" button doesn't work
- Error: "Character generation failed"
- No character sheet displayed

**Possible Causes:**
1. No audio profile available (need to analyze audio first)
2. No track selected
3. Invalid seed value

**Solutions:**
1. Go to **Audio Analysis** tab and analyze a track first
2. Ensure a track is selected in **Playlist Loader** tab
3. Check console for detailed error

**Console logs to look for:**
```
[CharacterGen] Error: No audio profile available
[CharacterGen] Error: No track selected
```

---

### Issue: Sensor Permissions Denied

**Symptoms:**
- Permission buttons show "Denied" status
- No sensor data displayed
- Error messages about permissions

**Possible Causes:**
1. User denied permission in browser dialog
2. Browser doesn't support the sensor API
3. HTTPS requirement (sensors require secure context)
4. iOS restrictions (motion sensor requires user gesture)

**Solutions:**
1. Clear site permissions in browser settings and try again
2. Check browser compatibility (see PLATFORM_LIMITATIONS.md)
3. Ensure app is served over HTTPS
4. On iOS, trigger permission via button click (not automatic)

**Console logs to look for:**
```
[EnvironmentalSensors] Error: Geolocation permission denied
[EnvironmentalSensors] Warn: DeviceMotionEvent not supported
```

---

### Issue: Discord Connection Fails

**Symptoms:**
- "Connect Discord" button shows error
- Status remains "Disconnected" or "Error"
- Discord activity not updating

**Possible Causes:**
1. Discord not running on local machine
2. Invalid Discord Client ID
3. Discord RPC not available

**Solutions:**
1. Ensure Discord desktop app is running
2. Verify Discord Client ID is correct
3. Note: Discord Web and mobile don't support RPC

**Console logs to look for:**
```
[GamingPlatforms] Error: Discord not available
[GamingPlatforms] Error: Failed to connect to Discord RPC
```

---

### Issue: Combat Simulator Not Working

**Symptoms:**
- "Start Combat" button does nothing
- Combat log shows errors
- Combat doesn't progress

**Possible Causes:**
1. No characters available (need to generate first)
2. Invalid combat setup (no party or enemies)
3. JavaScript error in combat logic

**Solutions:**
1. Generate at least one character in **Character Gen** tab
2. Check console for JavaScript errors
3. Ensure both party and enemies are defined

**Console logs to look for:**
```
[CombatEngine] Error: No characters available
[CombatEngine] Error: Invalid combat setup
```

---

### Issue: Data Not Persisting

**Symptoms:**
- Data disappears after page refresh
- Settings reset to defaults
- Characters disappear

**Possible Causes:**
1. LocalForage storage quota exceeded
2. Browser in private/incognito mode
3. Storage cleared by browser
4. Corrupted storage data

**Solutions:**
1. Export data before clearing storage
2. Disable private/incognito mode
3. Check browser storage settings
4. Use "Reset to Defaults" and re-import data

**Console logs to look for:**
```
[Storage] Error: QuotaExceededError
[Storage] Error: Failed to save to LocalForage
```

---

## Troubleshooting Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for error messages (red text)
4. Note the module and error message

### Step 2: Check Network Tab

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Network** tab
3. Reload the page or trigger the action
4. Look for failed requests (red status codes)
5. Check response headers and body

### Step 3: Check Storage

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. Expand **Local Storage** or **IndexedDB**
4. Look for `playlist-storage`, `character-storage`, etc.
5. Verify data exists and is valid JSON

### Step 4: Enable Verbose Logging

1. Go to **Settings** tab
2. Toggle **Verbose Logging** to ON
3. Reproduce the issue
4. Check console for detailed debug output

### Step 5: Export and Reset

1. Go to **Settings** tab
2. Click **Export All Data to JSON**
3. Save the export file
4. Click **Reset to Defaults**
5. Reload the page
6. Try the action again
7. Import data if needed

---

## Engine-Specific Issues

### Playlist-Data-Engine Issues

If you suspect an issue with the underlying `playlist-data-engine` library:

1. **Check engine version:**
   ```bash
   cat package.json | grep playlist-data-engine
   ```

2. **Verify engine build:**
   ```bash
   cd ../playlist-data-engine
   npm run build
   ```

3. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```

4. **Rebuild the engine if needed:**
   ```bash
   cd ../playlist-data-engine
   npm run build
   cd ../playlist-data-showcase
   npm run build
   ```

### Known Engine Limitations

See `../../IMPLEMENTATION_STATUS.md` section "Engine API Limitations Discovered" for documented limitations.

---

## Reporting Issues

When reporting an issue, include:

1. **Browser and version:** (e.g., Chrome 120, Safari 17)
2. **Operating system:** (e.g., macOS 14, Windows 11, iOS 17)
3. **Steps to reproduce:** Detailed steps to recreate the issue
4. **Expected behavior:** What should happen
5. **Actual behavior:** What actually happens
6. **Console logs:** Copy all relevant console output
7. **Screenshots:** If applicable, include screenshots

---

## Additional Resources

- [../../IMPLEMENTATION_STATUS.md](../../IMPLEMENTATION_STATUS.md) - Current implementation status
- [../architecture/overview.md](../architecture/overview.md) - Project architecture documentation
- [contributing.md](./contributing.md) - Contributing guidelines
- [../design/bugs-to-fix.md](../design/bugs-to-fix.md) - Known bugs tracker

---

**Back to [Documentation Index](../index.md)**
