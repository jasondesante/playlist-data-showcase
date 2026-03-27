# Standalone Pitch Analysis Implementation Plan

> [!CAUTION]
> **CRITICAL REPOSITORY WARNING FOR AI AGENTS:**
> The `playlist-data-engine` is a sibling project on the local file system. **DO NOT** attempt to edit files inside `node_modules/playlist-data-engine`. All engine modifications MUST be made in the actual source repository located at `../playlist-data-engine/src/...`.

## Overview
This plan implements a standalone full-song pitch analysis feature in the `playlist-data-engine`. Unlike the `PitchBeatLinker` (which is highly specialized for mapping pitches to rhythm game quarter notes), this feature is entirely decoupled and intended for arbitrary, generalized use cases where a full track's pitch map is needed.

This analyzer will provide two primary backend options for generating full-song pitch maps:
1. **The `EssentiaPitchDetector`**: The component from `ESSENTIA_PITCH_DETECTOR_PLAN.md` which extracts continuous frame-by-frame pitch contours (e.g., `predominant_melodia`, `pitch_crepe`).
2. **Spotify Basic Pitch (`@spotify/basic-pitch-ts`)**: A powerful, native-polyphonic neural network that processes a full audio buffer and outputs discrete polyphonic MIDI events instead of raw frequency frames.

The frontend (`playlist-data-showcase`) will include a dedicated UI tool for testing these algorithms, viewing the raw outputs, and potentially exporting the resulting generic pitch maps.

---

## Phase 1: Core Architecture (Engine)
Build the standalone pitch orchestrator and the Spotify Basic Pitch adapter.

### Task 1.1: Implement `SpotifyBasicPitchAnalyzer.ts`
- [ ] **Add Dependency**: Run `npm install @spotify/basic-pitch-ts` inside `../playlist-data-engine`.
- [ ] **Create the file** at `../playlist-data-engine/src/core/analysis/SpotifyBasicPitchAnalyzer.ts`.
- [ ] **Implement `analyze(audioBuffer: AudioBuffer): Promise<BasicPitchOutput>`**:
  - Load the Basic Pitch TFJS/ONNX model internally using the library's built-in `BasicPitch` class.
  - Process the entire un-split `AudioBuffer` at once (as required by the library).
  - Return the mapped MIDI events (Start Time, End Time, Pitch, Amplitude, and Bend Data).

### Task 1.2: Implement `StandalonePitchAnalyzer.ts`
- [ ] **Create the file** at `../playlist-data-engine/src/core/analysis/StandalonePitchAnalyzer.ts`.
- [ ] **Define `StandalonePitchAlgorithm` type**:
  - Includes `'spotify_basic_pitch'` as an option.
  - Re-exports or integrates the `'predominant_melodia', 'pitch_crepe', etc.` types from `EssentiaPitchDetector`.
- [ ] **Implement `analyzeFullSong(audioBuffer, config): Promise<PitchMapOutput>`**:
  - If the `spotify_basic_pitch` algorithm is selected, pass the buffer directly to `SpotifyBasicPitchAnalyzer.analyze()`.
  - If an Essentia algorithm is selected, extract the float array (`buffer.getChannelData(0)`), split it into frames, and run it through `EssentiaPitchDetector.detectSignal()`.
  - Return a highly-detailed generic `PitchMapOutput` payload. 

---

## Phase 2: Unifying the Output Format (Engine)
Because Essentia outputs continuous frames (`[120Hz, 122Hz, 0Hz...]`) and Spotify Basic Pitch outputs discrete MIDI events (`[Note C4 from 0.5s to 1.0s]`), the engine needs a unified payload structure.

### Task 2.1: Define `PitchMapOutput` Types
- [ ] **Update types in `../playlist-data-engine/src/core/types/AudioProfile.ts` (or similar location)**:
  - Create the `PitchMapOutput` interface containing two primary properties:
    - `frames?: PitchResult[]`: Sourced from Essentia.
    - `midiEvents?: BasicPitchNoteEvent[]`: Sourced from Spotify Basic Pitch.
  - Add standard metadata (analyzer execution time, average confidence score, polyphonic flag).

---

## Phase 3: Dedicated UI Utility (Showcase)
Create a standalone tool in the showcase for triggering full-song pitch analysis outside of the level generator context.

### Task 3.1: Create `StandalonePitchTab.tsx`
- [ ] **Create the file** at `src/components/Tabs/StandalonePitchTab.tsx` (or inside the `AudioAnalysisTab`).
- [ ] **Implement Algorithm Selection**:
  - Add a `<select>` or radio group to choose between "Spotify Basic Pitch" and the specific Essentia models.
- [ ] **Implement the Visualizer**:
  - Since this isn't a rhythm game level, build a simple canvas or raw JSON-viewer component that displays the resulting pitch map.
  - If Essentia is run, graph the continuous pitch line.
  - If Spotify is run, graph a "piano roll" view of the discrete MIDI notes taking advantage of the `start` and `duration` times.

### Task 3.2: Expose an "Export" Button
- [ ] Allow the user to dump the raw `PitchMapOutput` payload to a `.json` file.
- [ ] (Optional/Future) Add a button to convert and download the Spotify Basic Pitch output specifically as a standard `.mid` file for use in standard DAWs.

---

## Phase 4: Documentation Updates (Engine)
Reflect these new generalized tools in the engine architecture docs.

### Task 4.1: Update `DATA_ENGINE_REFERENCE.md`
- [ ] Document the `StandalonePitchAnalyzer.ts` and `SpotifyBasicPitchAnalyzer.ts` classes in the exports table.
- [ ] Document the new `PitchMapOutput` types so consumers know what data shapes to expect depending on the algorithm selected.

---

## Dependencies
- Expects `EssentiaPitchDetector.ts` to exist and be functional (as defined in `ESSENTIA_PITCH_DETECTOR_PLAN.md`).
- `@spotify/basic-pitch-ts` is a heavy dependency that requires WebGL/WASM optimization; standard browser memory constraints apply on massive audio buffers.

## Questions/Unknowns
- **Output Uniformity**: Do you want the `StandalonePitchAnalyzer` to automatically coerce/convert Essentia frames into MIDI events (so the output format is universally JSON MIDI regardless of the detector used)? Or are you okay with having two mutually exclusive output shapes (`frames` vs `midiEvents`)?
- **Spotify Payload Limit**: `basic-pitch` can be memory-heavy when passed a 5-minute `AudioBuffer`. While the engine handles it, we may need to establish a chunking methodology internally if iOS Safari hits the WebKit per-tab memory limits. Is this acceptable to prototype first and fix if memory errors manifest?
