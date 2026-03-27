# EssentiaPitchDetector Implementation Plan

## Overview
Currently, the `playlist-data-engine` uses a custom pure-TypeScript implementation of the pYIN algorithm for pitch detection, which exhibits poor accuracy on polyphonic music and destroys harmonics due to band-pass filtering. 

However, since the engine already imports the `essentia.js` WebAssembly library for genre classification (`MusicClassifier`), we can leverage its natively compiled, high-performance pitch extraction algorithms without adding massive new dependencies.

This plan details adding an `EssentiaPitchDetector` as an alternative to the existing pYIN `PitchDetector`. It provides options for 6 different algorithms (including the industry-standard `predominant_melodia` for polyphonic music, and neural networks like `pitch_crepe`). 

The new detector will produce the exact same `PitchResult[]` output, plugging seamlessly into the `PitchBeatLinker`. A new UI in the `playlist-data-showcase` will let you instantly toggle between the default pYIN and the new Essentia options for A/B testing.

---

## Phase 1: Create EssentiaPitchDetector (Engine)
Build the core class responsible for loading the Essentia WASM and executing the chosen pitch algorithm.

### Task 1.1: Create `src/core/analysis/EssentiaPitchDetector.ts`
- [ ] **Create the file** at `../playlist-data-engine/src/core/analysis/EssentiaPitchDetector.ts`
- [ ] **Define the `EssentiaPitchAlgorithm` type:**
  - `predominant_melodia` - Extracts the lead melody from polyphonic music (Strongly Recommended).
  - `multipitch_melodia` - Extracts multiple simultaneous F0 contours.
  - `multipitch_klapuri` - Harmonic summation polyphonic pitch detection.
  - `pitch_melodia` - Standard monophonic melody extraction.
  - `pitch_yin_probabilistic` - WASM-accelerated version of pYIN.
  - `pitch_crepe` - Neural network pitch detection using TensorFlow models.
- [ ] **Define the `EssentiaPitchDetectorConfig` interface:**
  - `algorithm: EssentiaPitchAlgorithm`
  - `minFrequency: number` (default: 80)
  - `maxFrequency: number` (default: 20000)
  - `frameSize: number` (default: 2048)
  - `hopSize: number` (default: 128 - Essentia prefers finer hop sizes than pYIN's 512)
  - `targetSampleRate: number` (default: 44100)
  - `crepeModelUrl?: string` (Optional, required only for `pitch_crepe`)

### Task 1.2: Implement the Class Architecture
- [ ] **Implement static async factory: `static async create(config): Promise<EssentiaPitchDetector>`**
  - Use the pattern from `MusicClassifier.ts:875` to load the WASM instance via `import('essentia.js/dist/essentia-wasm.es.js')`.
  - Await `EssentiaWASM.ready`.
  - Instantiate `new EssentiaWASM.EssentiaJS(false)` for access to DSP algorithms.
  - Store `EssentiaWASM.arrayToVector` and `vectorToArray` for Float32Array ↔ VectorFloat conversions.
- [ ] **Implement `detectSignal(signal: Float32Array, sampleRate: number): PitchResult[]`**
  - Convert `signal` via `arrayToVector(signal)`.
  - Write a switch statement to dispatch to the correct algorithm (e.g., `PredominantPitchMelodia(vector, frameSize, hopSize, ...)`, `MultiPitchMelodia(...)`, etc.).
  - Map Essentia's raw output arrays to structured `PitchResult[]` instances calculating timestamps, probabilities, and MIDI note values.
  - NOTE: `MultiPitchMelodia` and `MultiPitchKlapuri` do not return a confidence array. For these, default `probability` to 1.0 when a pitch is found, or determine logic for handling multiple pitch arrays.
- [ ] **Implement CREPE-specific inference**
  - If `pitch_crepe` is selected, load the converted TFJS model (`model.json`) via TensorFlow.js and `EssentiaModel.EssentiaTFInputExtractor` during initialization, exactly like `MusicClassifier` does for genre models.
  - **Prerequisite:** The raw Essentia `crepe.pb` model must first be converted to a browser-compatible TFJS format using the `convert-pb-to-tfjs-browser.py` script provided in the `playlist-data-showcase` repository. Browser `tfjs` cannot read `.pb` files natively.

---

## Phase 2: Wire into PitchBeatLinker (Engine)
Integrate the new Essentia Pitch Detector into the existing generation pipeline.

### Task 2.1: Update `PitchBeatLinkerConfig`
**File**: `../playlist-data-engine/src/core/generation/PitchBeatLinker.ts`
- [ ] Add `useEssentiaPitch?: boolean` to enable the alternative detector.
- [ ] Add `essentiaPitchAlgorithm?: EssentiaPitchAlgorithm`.
- [ ] Add `crepeModelUrl?: string`.

### Task 2.2: Modify `PitchBeatLinker` Construction and Execution
- [ ] **Update constructor** to store the new config options without creating the instantiated `EssentiaPitchDetector` right away. Leave it lazy-loaded.
- [ ] **Update `link()` method to conditionally instantiate the Essentia class:**
  - If `this.config.useEssentiaPitch` is true, lazily await `EssentiaPitchDetector.create(config)` if it hasn't been instantiated yet.
  - Change `fullSpectrumResults` assignment from the rigid `PitchDetector.ts` call to the new `EssentiaPitchDetector` call.
  - Keep the legacy setup as a fallback when `useEssentiaPitch` is false.

### Task 2.3: Update Pipeline Caller
**File**: `../playlist-data-engine/src/core/generation/LevelGenerator.ts`
- [ ] Update line 728 (or respective `pitchLinker.link` call): Change `pitchLinker.link(...)` to `await pitchLinker.link(...)` since the instantiation inside `link` might now be asynchronous if it needs to fetch the WASM or CREPE models.
- [ ] Ensure `mapPitchToBeats()` awaits the `link` call properly.

---

## Phase 3: UI Integration (Showcase)
Add the settings to the frontend to allow testing and comparing algorithms dynamically.

### Task 3.1: Update `AutoLevelSettings` Component
**File**: `src/components/Tabs/BeatDetectionTab/.../AutoLevelSettings.tsx`
- [ ] Add a Switch/Toggle for "Use Essentia Pitch Detection" (replaces pYIN).
- [ ] Add a Dropdown (Select) for the Algorithm choice (Melodia, MultiPitch, Klapuri, CREPE, etc.) that only appears when Essentia is active.
- [ ] Add a Text Input for the `crepeModelUrl` that only appears when `pitch_crepe` is chosen.

### Task 3.2: Connect UI State to Generation Engine
- [ ] Update `beatDetectionStore` (or corresponding state management) to store the `useEssentiaPitch`, `essentiaPitchAlgorithm`, and `crepeModelUrl` values.
- [ ] Pass these values into the `LevelGeneratorOptions` config object when clicking the "Analyze" button so they map directly into the `PitchBeatLinkerConfig`.

---

## Phase 4: Documentation Updates (Engine)
Ensure the technical design is documented for future reference and users.

### Task 4.1: Update `DATA_ENGINE_REFERENCE.md`
- [ ] Add an `EssentiaPitchDetector` row to the Class Exports table.
- [ ] Document the `EssentiaPitchAlgorithm` string literals.
- [ ] Add a full `### EssentiaPitchDetector` section detailing the static factory, `detectSignal` behaviors, and `EssentiaPitchDetectorConfig` properties.

### Task 4.2: Update `BEAT_DETECTION.md`
- [ ] Add `EssentiaPitchDetector` to the Source Files table.
- [ ] Under the main algorithm explanation, add an "Essentia.js Alternatives" subsection explaining the benefits of `PredominantPitchMelodia` for polyphonic music and why it was introduced to replace the custom pYIN implementation natively.

---

## Dependencies
- Requires `essentia.js` to be correctly installed and bundled (already confirmed to exist and work in `MusicClassifier`).
- `pitch_crepe` will require an external URL to host the Essentia `.pb` CREPE model (similar to how genre models are served).
- Changes span exactly two linked environments: the NPM package source (`playlist-data-engine`) and the consumer application (`playlist-data-showcase`).

## Questions/Unknowns
- **CREPE Model Hosting**: Where will the converted TFJS `model.json` for CREPE be hosted? Since browser `tfjs` cannot read the raw `.pb` file from the Essentia models site directly, the converted model and its `.bin` chunks must be hosted on Arweave or locally in the showcase's `public/models` folder before the frontend can pass the URL to the engine.
- **MultiPitch Output Mapping**: `MultiPitchMelodia` returns an array of multiple pitch values for a single frame. Should the detector simplify this by grabbing the strongest/first item in the array to conform to the monophonic `PitchResult` shape, or should it store the others inside `alternativeHypotheses`?

---

> [!CAUTION]
> **CRITICAL REPOSITORY WARNING FOR AI AGENTS:**
> The `playlist-data-engine` is a sibling project on the local file system. **DO NOT** attempt to edit files inside `node_modules/playlist-data-engine`. All engine modifications MUST be made in the actual source repository located at `../playlist-data-engine/src/...`.
