<!--
  HISTORICAL DOCUMENT - Last updated December 2025

  For current implementation status, see /IMPLEMENTATION_STATUS.md
  For current task breakdown, see /COMPLETION_PLAN.md

  This document contains the original quickstart guide for the
  Playlist Data Engine Showcase App. It is kept here for historical
  context. The actual implementation may differ from this guide.
-->

# Quickstart Guide: Playlist Data Engine Showcase

**Date**: 2025-12-01
**Target Users**: Developers, QA testers
**Time to Complete**: 5 minutes

---

## Overview

This guide walks you through the core functionality of the Playlist Data Engine Showcase app in 5 minutes. You'll verify that the engine can:
- Parse a playlist
- Analyze audio
- Generate a deterministic character

---

## 5-Minute Walkthrough

### Step 1: Load the App

Open your browser to `localhost:3000` (or deployed URL).

**What you see**: 10 tabs along the top:
- Playlist Loader (default active)
- Audio Analysis
- Character Generation
- Session Tracking
- XP Calculator
- Character Leveling
- Environmental Sensors
- Gaming Platforms
- Combat Simulator
- Settings

**Open DevTools** (F12 → Console tab) to see logs as you interact.

---

### Step 2: Load a Playlist (1 min)

In the **Playlist Loader** tab:

1. You'll see an input field for "Arweave Transaction ID or JSON"
2. Copy and paste an example Arweave ID or raw JSON playlist:

```json
{
  "name": "Test Playlist",
  "creator": "0x1234",
  "genre": "electronic",
  "tracks": [
    {
      "title": "Test Track",
      "artist": "Test Artist",
      "audio_url": "https://example.com/audio.mp3",
      "duration": 180,
      "genre": "electronic",
      "tags": ["test"]
    }
  ]
}
```

3. Click **Load Playlist**
4. You should see:
   - Playlist metadata displayed
   - Track count: 1
   - Track details in a table

**Console logs**:
```
[PlaylistParser] Input: { data: {...} }
[PlaylistParser] Output: { playlist: {...}, trackCount: 1, validationStatus: "valid" }
```

---

### Step 3: Analyze Audio (2 min)

In the **Audio Analysis** tab:

1. Select the track you just loaded from the dropdown
2. Click **Analyze Audio**
3. Wait ~3-5 seconds (downloading and analyzing audio)
4. You'll see:
   - Bass dominance: [████░░░░] 45%
   - Mid dominance: [█████░░░] 52%
   - Treble dominance: [███░░░░░] 31%
   - Extracted color palette (if album art available)

**Console logs**:
```
[AudioAnalyzer] Input: { audioUrl: "https://..." }
[AudioAnalyzer] Output: {
  bass_dominance: 0.45,
  mid_dominance: 0.52,
  treble_dominance: 0.31,
  average_amplitude: 0.61,
  color_palette: {...}
}
```

---

### Step 4: Generate a Character (2 min)

In the **Character Generation** tab:

1. The audio profile from Step 3 is pre-loaded
2. Click **Generate Character**
3. Wait ~1-2 seconds
4. You'll see a full D&D 5e character sheet:
   - Name (generated from track title)
   - Race & Class (based on audio profile)
   - Ability Scores (STR, DEX, CON, INT, WIS, CHA)
   - Skills, equipment, spells
   - HP, AC, initiative

**Key feature**: Click **Regenerate & Compare**
- Generates the same character again
- Verifies determinism: `✓ Outputs match!` or `✗ Mismatch!`
- Console shows JSON comparison

**Console logs**:
```
[CharacterGenerator] Input: { seed: "track-id", audioProfile: {...} }
[CharacterGenerator] Output: {
  character: {
    name: "Bard of Echoes",
    race: "Half-Elf",
    class: "Bard",
    ability_scores: { STR: 8, DEX: 15, ... }
  }
}
[CharacterGenerator] Determinism: PASS (outputs match)
```

---

## Next Steps: Explore Other Features

### Session Tracking (US2)

- Click **Session Tracking** tab
- Simulate a listening session:
  - Select the loaded track
  - Set duration (e.g., 30 seconds)
  - Click **Start Session**
  - See real-time elapsed time
  - Click **End Session**
- View session history table

### XP Calculator

- Set duration: 60 seconds
- Set activity: Walking
- Add environmental bonus: +10% (night time)
- Click **Calculate**
- See XP breakdown: Base + Activity + Environmental = Total

### Combat Simulator

- Click **Combat Simulator** tab
- Select your generated character as player
- Select an enemy (e.g., "Goblin")
- Click **Start Combat**
- Watch turn-by-turn combat unfold
- See logs showing attack rolls, damage, winner

### Environmental Sensors

- Click **Environmental Sensors** tab
- Request location/motion/light permissions
- Grant one (e.g., Location)
- See live sensor data
- Deny another → see simulated fallback data with label

---

## Console Logging

The entire app logs to console. To see everything:

1. Open DevTools (F12)
2. Click **Console** tab
3. Filter by `[Module Name]` to see logs from specific engine module
4. Copy any JSON output to verify data structures

Example: Filter to see only PlaylistParser logs:
```
[PlaylistParser]
```

---

## Debugging Tips

### Issue: "Cannot load audio URL"
- Check DevTools console for CORS error
- Audio URLs must be CORS-enabled (Arweave URLs are)
- If using custom URL, ensure it's CORS-enabled

### Issue: "Character regeneration doesn't match"
- Check that audio profile is identical
- Check seed (track UUID) is identical
- If mismatch occurs, engine may have non-deterministic behavior—report this!

### Issue: "Sensor permission denied"
- Check browser allows LocationServices or Motion
- On iPhone: Settings → Privacy → Location/Motion
- On Android: Apps → Permissions
- App will use simulated data as fallback

### Issue: "Can't see console logs"
- Open DevTools: F12 (Windows/Linux) or Cmd+Option+J (Mac)
- Make sure Console tab is active
- Try refreshing the page and repeating the action

---

## What to Verify

Use this checklist to confirm engine is working:

- [ ] Playlist loads and displays tracks
- [ ] Audio analysis extracts frequency data
- [ ] Character generation produces valid D&D 5e character
- [ ] Character regeneration is deterministic (matches previous output)
- [ ] Console shows all inputs and outputs
- [ ] Sensor permissions work (location, motion, light)
- [ ] Sensor graceful degradation works (uses simulated data when denied)
- [ ] Sessions track duration and XP
- [ ] XP calculation applies bonuses correctly
- [ ] Combat simulation completes without errors
- [ ] All data exports/imports correctly

---

## Example Console Log Output

Here's what you'll see when generating a character:

```
[PlaylistParser] Input: {
  source: "json",
  data: {name: "Test", creator: "0x...", tracks: [...]}
}

[PlaylistParser] Output: {
  playlist: {name: "Test", creator: "0x...", ...},
  trackCount: 1,
  validationStatus: "valid"
}

[AudioAnalyzer] Input: {
  audioUrl: "https://example.com/audio.mp3"
}

[AudioAnalyzer] Output: {
  bass_dominance: 0.45,
  mid_dominance: 0.52,
  treble_dominance: 0.31,
  average_amplitude: 0.61,
  color_palette: {...}
}

[CharacterGenerator] Input: {
  seed: "track-uuid",
  audioProfile: {bass_dominance: 0.45, ...},
  name: "Test Track"
}

[CharacterGenerator] Output: {
  character: {
    name: "Bard of Echoes",
    race: "Half-Elf",
    class: "Bard",
    level: 1,
    ability_scores: {STR: 8, DEX: 15, ...},
    hp: {current: 7, max: 7, temp: 0},
    ...
  }
}

[CharacterGenerator] Determinism Test: REGENERATING...
[CharacterGenerator] Determinism Test: PASS (JSON outputs match exactly)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App doesn't load | Clear cache, try incognito mode |
| Audio won't play | Check CORS error in console |
| Character gen fails | Check audio profile exists from Step 3 |
| Sensor permission stuck | Try different browser or device |
| Console logs not showing | Press F12, click Console, refresh page |
| Export fails | Check app isn't using >50MB storage |

---

## Next: Run Tasks

Once you've verified the 5-minute walkthrough, proceed to:

```bash
/speckit.tasks  # Generate implementation tasks
```

Then follow the implementation phases to build the app.

