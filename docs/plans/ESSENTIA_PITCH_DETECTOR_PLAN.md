# EssentiaPitchDetector Implementation Plan

## Overview
Currently, the `playlist-data-engine` uses a custom pure-TypeScript implementation of the pYIN algorithm for pitch detection, which exhibits poor accuracy on polyphonic music and destroys harmonics due to band-pass filtering.

However, since the engine already imports the `essentia.js` WebAssembly library for genre classification (`MusicClassifier`), we can leverage its natively compiled, high-performance pitch extraction algorithms without adding massive new dependencies.

This plan details adding an `EssentiaPitchDetector` as an alternative to the existing pYIN `PitchDetector`. It provides options for 6 different algorithms (including the industry-standard `predominant_melodia` for polyphonic music, and neural networks like `pitch_crepe`).

The new detector will produce the exact same `PitchResult[]` output, plugging seamlessly into the `PitchBeatLinker`. A new UI in the `playlist-data-showcase` will let you instantly toggle between the default pYIN and the new Essentia options for A/B testing.

---

## Algorithm Categories

The 6 algorithms fall into two distinct categories with different runtime requirements:

### Built-in WASM Algorithms (5 of 6)
These are compiled directly into the `essentia-wasm.wasm` binary. They require no external model files — the WASM module is loaded once via `import('essentia.js/dist/essentia-wasm.es.js')` and all algorithms are available immediately after `await EssentiaWASM.ready`.

| Algorithm | Best For | Returns Confidence? | Polyphonic? |
|-----------|----------|-------------------|-------------|
| `predominant_melodia` | Lead melody in polyphonic music **(Recommended default)** | `pitchConfidence[]` | Single F0 |
| `pitch_melodia` | Standard monophonic melody extraction | `pitchConfidence[]` | Single F0 |
| `pitch_yin_probabilistic` | WASM-accelerated pYIN (same algo, C++ speed) | `voicedProbabilities[]` | Single F0 |
| `multipitch_melodia` | Multiple simultaneous F0 contours (MELODIA) | **No** | Multi F0 |
| `multipitch_klapuri` | Harmonic summation multi-pitch detection | **No** | Multi F0 |

### External Model Algorithm (1 of 6)
CREPE is a neural network model that is **not** built into the essentia.js WASM binary and is **not** available through essentia.js's model wrapper classes (`TensorflowMusiCNN`, `TensorflowVGGish`). It requires a separate TensorFlow.js model file loaded directly via `tf.loadGraphModel()`.

| Algorithm | Best For | Returns Confidence? | Polyphonic? | External Model? |
|-----------|----------|-------------------|-------------|----------------|
| `pitch_crepe` | Neural network pitch detection (high accuracy) | Yes (per-frame) | Single F0 | **Yes — requires TFJS model** |

**CREPE model variants (all converted to TFJS):**

| Variant | Size | Path | Notes |
|---------|------|------|-------|
| `tiny` | ~2MB | `public/models/crepe/tiny/model.json` | Fastest, lowest accuracy |
| `small` | ~6MB | `public/models/crepe/small/model.json` | Good speed/accuracy tradeoff |
| `medium` | ~20MB | `public/models/crepe/medium/model.json` | High accuracy |
| **`large`** | **~49MB** | **`public/models/crepe/large/model.json`** | **Recommended default** |
| `full` | ~85MB | `public/models/crepe/full/model.json` | Highest accuracy, slowest |

**CREPE model loading strategy:**
1. **Iteration phase**: The converted TFJS model (`model.json` + `.bin` shards) lives locally in `playlist-data-showcase/public/models/crepe/`. The frontend passes the URL as a parameter to the engine at analysis time. The **`large` variant is the recommended default** (best accuracy/speed tradeoff).
2. **Verification phase**: Once confirmed working, the model URL can be bundled as a default in the engine itself so it doesn't need to be passed explicitly.
3. The `.pb` models have been converted to browser-compatible TFJS format using the `convert-pb-to-tfjs-browser.py` script in the showcase repo. Browser `tfjs` cannot read `.pb` files natively.
4. CREPE uses the same `@tensorflow/tfjs` dependency already installed for genre classification — no new package needed.

---

## Multi-Pitch Output Mapping (multipitch_melodia / multipitch_klapuri)

The two multi-pitch algorithms return an **array of pitch values per frame** (multiple F0s simultaneously), unlike the single-F0 algorithms. To maintain drop-in compatibility with the `PitchResult[]` interface used by `PitchBeatLinker`:

- **Primary pitch**: Use the **lowest frequency** (most fundamental) as the main `frequency` in `PitchResult`
- **Alternative hypotheses**: Store all other detected pitches in `PitchResult.alternativeHypotheses` (this field already exists on the type)
- **Confidence**: Since multi-pitch algorithms do not return confidence arrays, default `probability` to `1.0` for frames where at least one pitch is found

This preserves the existing `PitchResult` shape while making polyphonic data available for future analysis.

---

## Existing essentia.js Patterns (Reference)

The `EssentiaPitchDetector` should follow the same patterns established by `MusicClassifier`:

### WASM Loading (from MusicClassifier.ts:875)
```typescript
const wasmModule = await import('essentia.js/dist/essentia-wasm.es.js');
await wasmModule.EssentiaWASM.ready;
const essentia = new wasmModule.EssentiaWASM.EssentiaJS(false);
```

### Array Conversions
- `EssentiaWASM.arrayToVector(float32Array)` — Float32Array → VectorFloat (required by all algorithms)
- `EssentiaWASM.vectorToArray(vectorFloat)` — VectorFloat → Float32Array
- These live on `EssentiaWASM` directly, **not** on `EssentiaJS`

### Algorithm Invocation Pattern
```typescript
const algorithms = new EssentiaWASM.EssentiaJS(false);
const signalVector = EssentiaWASM.arrayToVector(audioSignal);
const result = algorithms.PredominantPitchMelodia(signalVector, frameSize, hopSize, sampleRate, ...);
// result.pitch → number[], result.pitchConfidence → number[]
```

### Static Factory Pattern
`MusicClassifier` uses `static async create()` for WASM initialization. `EssentiaPitchDetector` should do the same — the constructor should not be async, but a `static async create(config)` factory handles the async WASM loading.

### Essentia Algorithm API Signatures (from core_api.d.ts)

**PredominantPitchMelodia** (19 params):
```
signal, binResolution=10, filterIterations=3, frameSize=2048,
guessUnvoiced=false, harmonicWeight=0.8, hopSize=128,
magnitudeCompression=1, magnitudeThreshold=40, maxFrequency=20000,
minDuration=100, minFrequency=80, numberHarmonics=20,
peakDistributionThreshold=0.9, peakFrameThreshold=0.9,
pitchContinuity=27.5625, referenceFrequency=55, sampleRate=44100,
timeContinuity=100, voiceVibrato=false, voicingTolerance=0.2
→ { pitch: number[], pitchConfidence: number[] }
```

**PitchMelodia** (18 params):
```
signal, binResolution=10, filterIterations=3, frameSize=2048,
guessUnvoiced=false, harmonicWeight=0.8, hopSize=128,
magnitudeCompression=1, magnitudeThreshold=40, maxFrequency=20000,
minDuration=100, minFrequency=40, numberHarmonics=20,
peakDistributionThreshold=0.9, peakFrameThreshold=0.9,
pitchContinuity=27.5625, referenceFrequency=55, sampleRate=44100,
timeContinuity=100
→ { pitch: number[], pitchConfidence: number[] }
```

**PitchYinProbabilistic** (7 params):
```
signal, frameSize=2048, hopSize=256, lowRMSThreshold=0.1,
outputUnvoiced="negative", preciseTime=false, sampleRate=44100
→ { pitch: number[], voicedProbabilities: number[] }
```

**MultiPitchMelodia** (18 params):
```
signal, binResolution=10, filterIterations=3, frameSize=2048,
guessUnvoiced=false, harmonicWeight=0.8, hopSize=128,
magnitudeCompression=1, magnitudeThreshold=40, maxFrequency=20000,
minDuration=100, minFrequency=40, numberHarmonics=20,
peakDistributionThreshold=0.9, peakFrameThreshold=0.9,
pitchContinuity=27.5625, referenceFrequency=55, sampleRate=44100,
timeContinuity=100
→ { pitch: number[] }  (NO confidence array)
```

**MultiPitchKlapuri** (12 params):
```
signal, binResolution=10, frameSize=2048, harmonicWeight=0.8,
hopSize=128, magnitudeCompression=1, magnitudeThreshold=40,
maxFrequency=1760, minFrequency=80, numberHarmonics=10,
referenceFrequency=55, sampleRate=44100
→ { pitch: number[] }  (NO confidence array)
```

---

## Phase 1: Create EssentiaPitchDetector (Engine)
Build the core class responsible for loading the Essentia WASM and executing the chosen pitch algorithm.

### Task 1.1: Create `src/core/analysis/EssentiaPitchDetector.ts`
- [x] **Create the file** at `../playlist-data-engine/src/core/analysis/EssentiaPitchDetector.ts`
- [x] **Define the `EssentiaPitchAlgorithm` type:**
  - `predominant_melodia` - Extracts the lead melody from polyphonic music (Strongly Recommended default).
  - `multipitch_melodia` - Extracts multiple simultaneous F0 contours.
  - `multipitch_klapuri` - Harmonic summation polyphonic pitch detection.
  - `pitch_melodia` - Standard monophonic melody extraction.
  - `pitch_yin_probabilistic` - WASM-accelerated version of pYIN.
  - `pitch_crepe` - Neural network pitch detection using TensorFlow.js (requires external model — see Algorithm Categories above).
- [x] **Define the `EssentiaPitchDetectorConfig` interface:**
  - `algorithm: EssentiaPitchAlgorithm`
  - `minFrequency: number` (default: 80)
  - `maxFrequency: number` (default: 20000)
  - `frameSize: number` (default: 2048)
  - `hopSize: number` (default: 128 - Essentia prefers finer hop sizes than pYIN's 512)
  - `targetSampleRate: number` (default: 44100)
  - `crepeModelUrl?: string` (Optional, required only for `pitch_crepe`. Defaults to `/models/crepe/large/model.json`)

### Task 1.2: Implement the Class Architecture
- [x] **Implement static async factory: `static async create(config): Promise<EssentiaPitchDetector>`**
  - Use the pattern from `MusicClassifier.ts:875` to load the WASM instance via `import('essentia.js/dist/essentia-wasm.es.js')`.
  - Await `EssentiaWASM.ready`.
  - Instantiate `new EssentiaWASM.EssentiaJS(false)` for access to DSP algorithms.
  - Store `EssentiaWASM.arrayToVector` and `vectorToArray` for Float32Array ↔ VectorFloat conversions.
- [x] **Implement `detectSignal(signal: Float32Array, sampleRate: number): PitchResult[]`**
  - Return type must match the existing `PitchResult[]` interface exactly for drop-in compatibility with `PitchBeatLinker`.
  - Convert `signal` via `arrayToVector(signal)`.
  - Write a switch statement to dispatch to the correct algorithm (e.g., `PredominantPitchMelodia(vector, frameSize, hopSize, ...)`, `MultiPitchMelodia(...)`, etc.).
  - Map Essentia's raw output arrays to structured `PitchResult[]` instances calculating timestamps, probabilities, and MIDI note values.
  - **Multi-pitch handling** (`multipitch_melodia`, `multipitch_klapuri`):
    - Use the lowest frequency (most fundamental) as the primary `frequency`
    - Store all other detected pitches in `alternativeHypotheses: { frequency, probability }[]`
    - Default `probability` to `1.0` since these algorithms don't return confidence arrays
- [x] **Implement CREPE-specific inference**
  - CREPE is **not** part of essentia.js — it's a standalone TFJS model loaded via `tf.loadGraphModel()`, using the same `@tensorflow/tfjs` dependency already installed for genre classification.
  - Load the converted TFJS model (`model.json` + `.bin` shards) during initialization via the `crepeModelUrl` config parameter.
  - Compute mel-spectrograms as input (can reuse essentia's `MelBands` algorithm for this).
  - Map CREPE output (frequency + confidence per frame) to `PitchResult[]`.
  - **Prerequisite:** The raw `crepe.pb` model must first be converted to a browser-compatible TFJS format using the `convert-pb-to-tfjs-browser.py` script provided in the `playlist-data-showcase` repository.

---

## Phase 2: Wire into PitchBeatLinker (Engine)
Integrate the new Essentia Pitch Detector into the existing generation pipeline.

### Task 2.1: Update `PitchBeatLinkerConfig`
**File**: `../playlist-data-engine/src/core/generation/PitchBeatLinker.ts`
- [x] Add `useEssentiaPitch?: boolean` to enable the alternative detector.
- [x] Add `essentiaPitchAlgorithm?: EssentiaPitchAlgorithm`.
- [x] Add `crepeModelUrl?: string`.

### Task 2.2: Modify `PitchBeatLinker` Construction and Execution
- [x] **Update constructor** to store the new config options without creating the instantiated `EssentiaPitchDetector` right away. Leave it lazy-loaded.
- [x] **Make `link()` async** — currently synchronous, but Essentia WASM loading and CREPE model loading are asynchronous. The method signature changes from `link(...): LinkedPitchAnalysis` to `async link(...): Promise<LinkedPitchAnalysis>`.
- [x] **Update `link()` method to conditionally instantiate the Essentia class:**
  - If `this.config.useEssentiaPitch` is true, lazily await `EssentiaPitchDetector.create(config)` if it hasn't been instantiated yet (cache the instance for reuse).
  - Change `fullSpectrumResults` assignment from the rigid `PitchDetector.ts` call to the new `EssentiaPitchDetector.detectSignal()` call.
  - Keep the legacy `PitchDetector` setup as a fallback when `useEssentiaPitch` is false.

### Task 2.3: Update Pipeline Caller
**File**: `../playlist-data-engine/src/core/generation/LevelGenerator.ts`
- [x] Update the `pitchLinker.link(...)` call site: Change to `await pitchLinker.link(...)` since `link()` is now async.
- [x] Ensure `mapPitchToBeats()` awaits the `link` call properly.
- [x] Propagate the essentia config options from `LevelGenerationOptions` through to `PitchBeatLinkerConfig`.

---

## Phase 3: UI Integration (Showcase)
Add the settings to the frontend to allow testing and comparing algorithms dynamically.

### Task 3.1: Update `AutoLevelSettings` Component
**File**: `src/components/Tabs/BeatDetectionTab/.../AutoLevelSettings.tsx`
- [x] Add a Switch/Toggle for "Use Essentia Pitch Detection" (replaces pYIN).
- [x] Add a Dropdown (Select) for the Algorithm choice that only appears when Essentia is active:
  - Group the built-in WASM algorithms together: Predominant Melodia, Pitch Melodia, Pitch YIN (Probabilistic), MultiPitch Melodia, MultiPitch Klapuri
  - Show CREPE as a separate option with a note that it requires an external model
- [x] Add a Text Input for the `crepeModelUrl` that only appears when `pitch_crepe` is chosen. Default to `/models/crepe/large/model.json`.

### Task 3.2: Connect UI State to Generation Engine
- [x] Update `beatDetectionStore` (or corresponding state management) to store the `useEssentiaPitch`, `essentiaPitchAlgorithm`, and `crepeModelUrl` values.
- [x] Pass these values into the `LevelGeneratorOptions` config object when clicking the "Analyze" button so they map directly into the `PitchBeatLinkerConfig`.

---

## Phase 4: Documentation Updates (Engine)
Ensure the technical design is documented for future reference and users.

### Task 4.1: Update `DATA_ENGINE_REFERENCE.md`
- [x] Add an `EssentiaPitchDetector` row to the Class Exports table.
- [x] Document the `EssentiaPitchAlgorithm` string literals with category annotations (built-in WASM vs external model).
- [x] Add a full `### EssentiaPitchDetector` section detailing the static factory, `detectSignal` behaviors, and `EssentiaPitchDetectorConfig` properties.

### Task 4.2: Update `BEAT_DETECTION.md`
- [ ] Add `EssentiaPitchDetector` to the Source Files table.
- [ ] Under the main algorithm explanation, add an "Essentia.js Alternatives" subsection explaining the benefits of `PredominantPitchMelodia` for polyphonic music and why it was introduced to replace the custom pYIN implementation natively.

---

## Dependencies
- Requires `essentia.js` to be correctly installed and bundled (already confirmed to exist and work in `MusicClassifier`).
- Requires `@tensorflow/tfjs` for CREPE model inference (already installed as a peer dependency for genre classification).
- `pitch_crepe` requires a converted TFJS model hosted locally in `public/models/crepe/` during iteration, later bundled as a default in the engine.
- Changes span exactly two linked environments: the NPM package source (`playlist-data-engine`) and the consumer application (`playlist-data-showcase`).

---

> [!CAUTION]
> **CRITICAL REPOSITORY WARNING FOR AI AGENTS:**
> The `playlist-data-engine` is a sibling project on the local file system. **DO NOT** attempt to edit files inside `node_modules/playlist-data-engine`. All engine modifications MUST be made in the actual source repository located at `../playlist-data-engine/src/...`.
