<!--
  HISTORICAL DOCUMENT - Last updated December 2025

  For current implementation status, see /IMPLEMENTATION_STATUS.md
  For current task breakdown, see /COMPLETION_PLAN.md

  This document contains the original API contract for the PlaylistParser
  module in the Playlist Data Engine Showcase App. It is kept here for
  historical context. The actual implementation may differ from this contract.
-->

# API Contract: PlaylistParser

**Module**: Playlist Loader Tab
**Related**: [data-model.md](../data-model.md)

---

## Overview

The PlaylistParser hook parses Arweave JSON or raw JSON input into a structured Playlist object with typed tracks.

---

## Hook: `usePlaylistParser`

### Input

**Format**: Either raw JSON (object) or Arweave transaction ID (string)

```typescript
interface PlaylistParserInput {
  source: 'json' | 'arweave';
  data: object | string;  // Raw JSON or transaction ID
  validateUrls?: boolean; // Check if audio URLs respond
}
```

### Output

**Success**:
```typescript
interface PlaylistParserOutput {
  playlist: Playlist;
  trackCount: number;
  validationStatus: 'valid' | 'partial' | 'invalid';
  warnings: string[];  // Non-fatal issues
}
```

**Error**:
```typescript
interface PlaylistParserError {
  code: 'PARSE_ERROR' | 'FETCH_ERROR' | 'VALIDATION_ERROR';
  message: string;
  details?: any;
}
```

---

## Console Logging

Before parsing:
```
[PlaylistParser] Input: { source: "json", data: {...} }
```

After parsing:
```
[PlaylistParser] Output: {
  playlist: { name: "...", creator: "...", tracks: [...] },
  trackCount: 25,
  validationStatus: "valid",
  warnings: []
}
```

On error:
```
[PlaylistParser] Error: { code: "PARSE_ERROR", message: "...", stack: "..." }
```

---

## Acceptance Criteria

1. **Valid JSON**: Parses correctly, returns Playlist with all tracks
2. **Arweave ID**: Fetches JSON from Arweave, parses, returns Playlist
3. **Partial Playlist**: Parses available tracks, sets validationStatus to "partial", warns of missing fields
4. **Invalid JSON**: Sets validationStatus to "invalid", logs error, provides helpful message
5. **Malformed Tracks**: Skips invalid tracks, logs warnings, returns partial playlist
6. **CORS Failure**: Logs error, returns null, shows user friendly message

---

## Examples

### Valid Arweave Playlist

**Input**:
```json
{
  "source": "arweave",
  "data": "AR-TX-ID-HERE"
}
```

**Output**:
```json
{
  "playlist": {
    "name": "Synthwave Dreams",
    "creator": "0x1234...",
    "genre": "electronic",
    "tracks": [
      {
        "title": "Neon Highway",
        "artist": "Digital Phoenix",
        "audio_url": "https://arweave.net/...",
        "duration": 240
      }
    ]
  },
  "trackCount": 1,
  "validationStatus": "valid",
  "warnings": []
}
```

### Invalid JSON Structure

**Input**:
```json
{
  "source": "json",
  "data": { "notAPlaylist": true }
}
```

**Output**:
```json
{
  "playlist": null,
  "trackCount": 0,
  "validationStatus": "invalid",
  "warnings": ["Missing required field: name", "Missing required field: creator"]
}
```

**Console**:
```
[PlaylistParser] Error: { code: "VALIDATION_ERROR", message: "Missing required fields" }
```

---

## Performance Targets

- Parse <100 tracks: < 500ms
- Fetch from Arweave + parse: < 3 seconds
- Validate URLs: +1 second per URL (not used in normal flow)

