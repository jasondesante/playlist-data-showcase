# Level Import/Export System Upgrade

## Overview

Upgrade the level import/export system so that exported level files are self-contained with track metadata (playlist arweave TX ID, track index, track metadata). This enables:
1. Exporting levels that carry their own song identity
2. Importing levels at any step (not just the ready tab)
3. Validating that the currently selected song matches the level file's song
4. Auto-generated levels (AutoReadyPanel) can be exported
5. Future use: level files can fully load a song into a rhythm game

## Phase 1: Engine — Track Reference & Validation

- [x] **Task 1: Add `TrackReference` type to `LevelExport.ts`**
  - [x] Define `TrackReference` interface with: `playlistTxId?`, `playlistName?`, `trackId`, `trackUuid`, `trackIndex`, `txId?`, `title`, `artist`, `audioUrl`, `imageUrl?`, `duration`
  - [x] Add `trackReference?: TrackReference` to `FullBeatMapExportData` (optional for backward compat with v1 files)
- [x] **Task 2: Add `validateTrackMatch` function to `LevelExport.ts`**
  - [x] Define `TrackMatchResult` type: `{ matches: boolean; mismatchDetails: string[]; requiredTrack?: { title: string; artist: string; playlistName?: string; trackIndex: number } }`
  - [x] Implement `validateTrackMatch(levelTrackRef: TrackReference, currentTrack: { id: string; title: string; artist: string; playlist_index: number; tx_id?: string }): TrackMatchResult`
  - [x] Compare by `trackId` first, then fall back to `title + artist` for fuzzy match
  - [x] When mismatch, include `requiredTrack` info so the UI can tell the user which song to switch to
- [x] **Task 3: Export new types from `index.ts`**
  - [x] Export `TrackReference`, `validateTrackMatch`, `TrackMatchResult`

## Phase 2: Showcase — Store Playlist TX ID

- [x] **Task 1: Add `playlistTxId` to playlistStore**
  - [x] Add `playlistTxId: string | null` to `PlaylistState`
  - [x] Add `setPlaylist` to accept and store the TX ID (or extract from URL when possible)
  - [x] Clear it in `clearPlaylist`
  - [x] Persist it (it's already in the persisted `currentPlaylist` area but we need the raw TX ID separate)
- [x] **Task 2: Pass TX ID from PlaylistLoaderTab**
  - [x] When `parsePlaylist` succeeds with an arweave TX ID input, store it in `playlistStore.playlistTxId`
  - [x] Update `usePlaylistParser.ts` to pass TX ID back to the store

## Phase 3: Showcase — Export with Track Reference

- [x] **Task 1: Update `exportFullBeatMap` in beatDetectionStore to include TrackReference**
  - [x] Read `selectedTrack` from playlistStore and `playlistTxId`
  - [x] Build `TrackReference` object from track data
  - [x] Attach to export data
- [x] **Task 2: Add export button to AutoReadyPanel**
  - [x] Add props: `onExport: () => void`
  - [x] Add an Export button next to Start Practice in the actions section
  - [x] Pass `handleExportAutoLevel` from BeatDetectionTab
- [x] **Task 3: Add auto-level export function (engine serializer)**
  - [x] (Engine) Add `trackReference?: TrackReference` to `LevelSerializerOptions` so `toExportData()` includes it natively
  - [x] In BeatDetectionTab, create `handleExportAutoLevel` using `LevelSerializer.toJSON()` with track reference injected

## Phase 4: Showcase — Import at Any Step + Mismatch Validation

- [x] **Task 1: Add import button at Step 1 (Analyze)**
  - [x] Add an "Import Level" button near the Analyze button in Step 1
  - [x] Add a hidden file input ref for Step 1 import
  - [x] Import should work even when no beatMap exists yet
- [x] **Task 2: Extract `handleImportBeatMap` into a shared handler**
  - [x] Add track mismatch validation: parse file, check `trackReference` against `selectedTrack`
  - [x] If mismatch: show alert/dialog saying "This level is for [song] in [playlist] at track #[N]. Please switch to that song first."
  - [x] If match (or no trackReference in old files): proceed with import as normal
  - [x] Use `validateTrackMatch` from the engine
- [x] **Task 3: Auto-level import support**
  - [x] When importing a file with `generationSource: 'procedural'`, set generation mode to automatic
  - [x] Reconstruct the GeneratedLevel via `LevelSerializer.fromExportData()` and store it
  - [x] Advance to Step 4 (ready tab) after successful import

## Dependencies

- Phase 2 depends on Phase 1 (need TrackReference type)
- Phase 3 depends on Phase 1 + Phase 2 (need type + TX ID)
- Phase 4 depends on Phase 1 + Phase 2 (need validation + TX ID)

## Questions/Unknowns

- **Old level files without trackReference**: These should import fine (treated as "unknown track") — no mismatch check possible, just allow import. Already handled by making `trackReference` optional.
- **Auto-level export format**: Auto levels use `LevelSerializer` (engine) while manual levels use `exportFullBeatMap` (store). Both should include TrackReference. The store's `exportFullBeatMap` needs updating, and a wrapper around `LevelSerializer.toJSON` needs the track ref injected.
- **Should importing a procedural level also load the audio?** No — the track must already be loaded/selected. The trackReference just validates that the right song is selected.
