# Density (Notes/Second) & BPM-Aware Quantization Plan

## Overview

Two related engine changes that improve rhythm generation quality:

1. **Density metric: notes/beat → notes/second** — A 120 BPM track with 2 notes/beat (4 notes/sec) feels much easier than a 180 BPM track with 2 notes/beat (6 notes/sec). The current notes/beat metric doesn't capture this, making difficulty balancing inaccurate across tempos.

2. **BPM-aware quantization step** — At high BPMs, 16th notes become unplayable (180 BPM = 83ms per 16th). A new extensible pipeline step applies BPM-based rules to constrain the quantization grid for fundamental playability, independent of difficulty settings.

### Design Decisions

- **No backward compatibility** — Old serialized data won't be loaded by new versions. Clean rename of all fields.
- **BPM source** — `UnifiedBeatMap.quarterNoteBpm` (confirmed to exist at `BeatMap.ts:1628` and `BeatMap.ts:1958`)
- **BPM to DensityAnalyzer** — Add `bpm: number` parameter to `analyze()` signature (option A: explicit dependency)
- **BPM to DifficultyVariantGenerator** — Pass BPM through (simpler than pre-computing and threading density values)
- **Every code path** that uses notes/beat as a density measurement must be converted to notes/second, including private methods, comments, and test assertions

---

## Phase 1: Engine — DensityAnalyzer Notes/Second Conversion

Convert the core density measurement from notes/beat to notes/second. This is the foundational change that everything else builds on.

### Task 1.1: Update DensityAnalyzer to accept and use BPM

- [ ] Add `bpm: number` parameter to `DensityAnalyzer.analyze(streams, bpm)` method
- [ ] Add a helper: `notesPerSecond = transientsPerBeat * (bpm / 60)`
- [ ] Replace all `transientsPerBeat` values in output with `notesPerSecond` equivalents
- [ ] Update `DensityAnalyzerConfig` thresholds from notes/beat to notes/second
  - Current: sparse < 1.0, dense > 1.75 (notes/beat)
  - New: sparse < ~2.5, dense > ~4.5 (notes/sec at ~150 BPM reference)
  - **Note:** Thresholds need calibration — will use initial values and tune
- [ ] Rename fields in `BandDensityMetrics`:
  - `transientsPerBeat` → `notesPerSecond`
  - `minTransientsPerBeat` → `minNotesPerSecond`
  - `maxTransientsPerBeat` → `maxNotesPerSecond`
- [ ] Rename fields in `SectionDensityMetrics`: same renames
- [ ] Rename fields in `DensityAnalysisResult.combinedMetrics`: same renames
- [ ] Keep `perBeatDensity` array name (it's per-beat granularity, not the unit) but update `transientCount` to stay as-is (count is unit-independent)
- [ ] Update `categorizeDensity()` — rename parameter from `transientsPerBeat` to `notesPerSecond`, update threshold comparisons
- [ ] Update `determineNaturalDifficulty()` — no change needed (it just maps category)
- [ ] Update `calculateVariance()` — now takes notes/second values as input
- [ ] Update `analyzeBand()` — convert `transientsPerBeat` calculation to `notesPerSecond` using BPM
- [ ] Update `calculateCombinedMetrics()` — same conversion
- [ ] Update `calculateSectionMetrics()` — same conversion
- [ ] Update all JSDoc comments that reference "transients per beat" → "notes per second"
- **File:** `playlist-data-engine/src/core/analysis/beat/DensityAnalyzer.ts`

### Task 1.2: Update CompositeStreamGenerator density thresholds and calculation

- [ ] Update `SPARSE_THRESHOLD` and `DENSE_THRESHOLD` constants from notes/beat to notes/second
- [ ] Update `determineNaturalDifficulty()` to accept BPM and convert to notes/second
  - Current: `notesPerBeat = beats.length / totalQuarterNotes`
  - New: `notesPerSecond = (beats.length / totalQuarterNotes) * (bpm / 60)`
  - This method currently doesn't accept BPM — need to add it as parameter
  - The `generate()` method has access to `streams.streams.low.quarterNoteInterval` — can derive BPM from there: `60 / quarterNoteInterval`
- [ ] Update JSDoc comments: "notes/beat" → "notes/second"
- **File:** `playlist-data-engine/src/core/analysis/beat/CompositeStreamGenerator.ts`

### Task 1.3: Update StreamScorer density factor

- [ ] Update `calculateDensityFactor()` bell curve from "2 notes/beat" to appropriate notes/second value
  - Current: `optimalDensity = 2.0`, `bellCurveWidth = 1.5`
  - The method averages `transientCount` across section beats — this gives notes/beat (count per beat)
  - Need to convert to notes/sec: multiply by `bpm / 60`
  - `optimalDensity` should become a notes/sec value (e.g., ~4.0 at 120 BPM = 2 notes/beat)
  - `bellCurveWidth` needs recalibration for notes/sec scale
- [ ] The scorer needs BPM — either pass it to the `score()` method or to the constructor
  - Since `score()` already receives `DensityAnalysisResult` (which will have notes/sec after 1.1), the scorer could derive BPM from the density values... but that's fragile
  - Better: add `bpm` to `StreamScorerConfig` or `score()` signature
- [ ] Update all JSDoc comments referencing "2 notes per beat"
- **File:** `playlist-data-engine/src/core/analysis/beat/StreamScorer.ts`

### Task 1.4: Update DifficultyVariantGenerator density ranges and calculation

- [ ] Convert `SUBDIVISION_LIMITS.targetDensityRange` from notes/beat to notes/second:
  - Easy: `{ min: 0, max: 2.5 }` (was 0-1.0 notes/beat)
  - Medium: `{ min: 2.5, max: 4.5 }` (was 1.0-1.75 notes/beat)
  - Hard: `{ min: 4.5, max: Infinity }` (was >1.75 notes/beat)
  - Natural: `{ min: 0, max: Infinity }` (unchanged conceptually)
- [ ] Update `SubdivisionLimitConfig.targetDensityRange` comment: "transients per beat" → "notes per second"
- [ ] Update private `calculateDensity()` method to return notes/second
  - Current: `beats.length / totalBeats` (notes/beat)
  - New: `(beats.length / totalBeats) * (bpm / 60)`
  - Needs BPM — add `bpm` parameter or accept via constructor/config
- [ ] Update `reduceDensityToTarget()` — receives density from `calculateDensity()` which is now notes/sec; `targetRange` is now notes/sec, so comparison works as-is
- [ ] Update JSDoc comments on SUBDIVISION_LIMITS entries: "transients/beat" → "notes/sec"
- [ ] Update `generateVariant()` and related methods that call `calculateDensity()` — thread BPM through
- **Note:** The `densityMultiplier` used in enhancement (lines 284, 340, 1396, 1400) is a ratio multiplier, not an absolute density value — these do NOT need conversion
- **File:** `playlist-data-engine/src/core/analysis/beat/DifficultyVariantGenerator.ts`

### Task 1.5: Update RhythmGenerator pipeline

- [ ] Pass BPM to `DensityAnalyzer.analyze()` — BPM available from `unifiedBeatMap.quarterNoteBpm`
- [ ] Pass BPM to `CompositeStreamGenerator.generate()` — derive from `streams.streams.low.quarterNoteInterval` or pass through
- [ ] Pass BPM to `StreamScorer.score()` — pass from `unifiedBeatMap.quarterNoteBpm`
- [ ] Pass BPM to `DifficultyVariantGenerator.generateVariant()` — pass from `unifiedBeatMap.quarterNoteBpm`
- [ ] Update `RhythmMetadata.averageDensity` to be notes/second (currently: `densityAnalysis.combinedMetrics.transientsPerBeat`)
- [ ] Update JSON serialization types — rename all `transientsPerBeat` → `notesPerSecond` in:
  - `BandDensityMetricsJSON` (line 546)
  - `DensityAnalysisResult.combinedMetrics` JSON (line 566)
  - `SectionDensityMetricsJSON` (line 575)
- [ ] Update serialize methods (~line 1867) and deserialize methods (~line 1881) for renamed fields
- **File:** `playlist-data-engine/src/core/generation/RhythmGenerator.ts`

### Task 1.6: Update LevelSerializer compatibility

- [ ] Update backward-compat stub that creates fake density data with hardcoded `transientsPerBeat: 0.5`
  - Change field name to `notesPerSecond` with appropriate value
  - Also rename `minTransientsPerBeat` → `minNotesPerSecond`, `maxTransientsPerBeat` → `maxNotesPerSecond`
- **File:** `playlist-data-engine/src/core/analysis/LevelSerializer.ts`

### Task 1.7: Update engine index.ts exports

- [ ] Verify all renamed types are still properly exported from `beat/index.ts`
- [ ] Verify all renamed types are still properly exported from `src/index.ts`
- [ ] Any new types (if field names changed on interfaces) should be reflected
- **Files:** `playlist-data-engine/src/core/analysis/beat/index.ts`, `playlist-data-engine/src/index.ts`

### Task 1.8: Update engine unit tests

- [ ] Update `DensityAnalyzer.test.ts` — all threshold assertions, expected output values, field name references
- [ ] Update `RhythmGenerator.test.ts` — metadata assertions, JSON serialization field names
- [ ] Update `LevelSerializer.compatibility.test.ts` — field name assertions (lines 258, 264, 268, 275)
- [ ] Update `streamScorer.test.ts` — density factor expectations
- [ ] Update `compositeStreamGenerator.test.ts` — natural difficulty assertions
- [ ] Update `difficultyVariantGenerator.test.ts` — density range expectations
- **Files:** All test files in `playlist-data-engine/tests/` and `src/core/`

### Task 1.9: Update engine integration tests

- [ ] Update `phraseDensityAnalysis.integration.test.ts` — all `transientsPerBeat` references:
  - Lines 262, 310, 316, 360, 366, 444, 449, 454, 556, 588, 615, 694, 940, 946, 947, 948
  - Update console.log labels from "Transients per beat" / "Transients/beat" / "t/b" to notes/sec equivalents
  - Update expected values from notes/beat to notes/sec (need BPM context)
- **File:** `playlist-data-engine/tests/integration/phraseDensityAnalysis.integration.test.ts`

---

## Phase 2: Engine — BPM-Aware Quantization Step

Create a new extensible pipeline step that applies BPM-based rules to constrain the quantization grid. This is about fundamental playability at any difficulty, separate from difficulty-based subdivision limits.

### Architecture: Decide-Then-Quantize (No Double Quantization)

**Critical design principle:** The current `RhythmQuantizer.quantizeBand()` makes grid decisions AND quantizes in the same per-beat loop. This creates a problem: if BPM-based rules later change the grid (e.g., forcing 16th → 8th), re-quantizing already-quantized beats is lossy — you'd be snapping an already-snapped timestamp to a different grid, compounding quantization error.

**Solution:** Split `quantizeBand()` into two phases:
1. **Grid Decision Phase** — For each beat, decide the grid type (16th/triplet/8th). BPM-aware rules apply HERE, influencing the decision before any snapping happens.
2. **Quantization Phase** — Using the final grid decisions (already BPM-constrained), quantize each transient from its **original** timestamp to the chosen grid.

This means there is only ONE quantization pass. The BPM rules are consulted during grid decision-making, not applied post-hoc to already-quantized data.

### Task 2.1: Refactor RhythmQuantizer into decide-then-quantize

- [ ] Split `quantizeBand()` into two methods:
  - `decideGrids(transients, unifiedBeatMap, band)` → returns `GridDecision[]`
  - `quantizeToGrids(transients, unifiedBeatMap, band, gridDecisions)` → returns `GeneratedBeat[]`
- [ ] `decideGrids()` iterates beats, finds transients in each beat's range, and calls `detectGrid()` or uses forced grid — but does NOT quantize
- [ ] `quantizeToGrids()` takes the grid decisions AND the **original raw transient timestamps**, then snaps each transient to the chosen grid position
- [ ] `quantizeBand()` becomes the orchestrator: `decideGrids()` → `quantizeToGrids()` → `deduplicateBeats()`
- [ ] The public `quantize()` API stays the same — this is an internal refactor
- **File:** `playlist-data-engine/src/core/analysis/beat/RhythmQuantizer.ts`

### Task 2.2: Design the TempoAwareQuantizer rule interface

- [ ] Define a `TempoQuantizationRule` interface:
```typescript
interface TempoQuantizationRule {
  id: string;
  description: string;
  /** Check if this rule applies given the BPM and context */
  applies(bpm: number, context: TempoRuleContext): boolean;
  /**
   * Modify grid decisions based on this rule.
   * Receives the raw transients and original grid decisions so it can
   * make informed decisions (e.g., check transient positions before overriding).
   * Returns modified grid decisions.
   */
  apply(decisions: GridDecision[], context: TempoRuleContext): GridDecision[];
}
interface TempoRuleContext {
  bpm: number;
  quarterNoteInterval: number;
  band: Band;
  /** Raw transients for this band (original timestamps, not quantized) */
  transients: TransientResult[];
}
```
- [ ] Define `TempoAwareQuantizerConfig`:
```typescript
interface TempoAwareQuantizerConfig {
  rules: TempoQuantizationRule[];
  /** Whether tempo-aware quantization is enabled (default: true) */
  enabled: boolean;
}
```
- [ ] Create file: `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.ts`

### Task 2.3: Implement the first rule — High BPM 16th note restriction

- [ ] Create `HighBpmGridRestrictionRule`:
  - If BPM > configurable threshold (default: ~160), restrict max grid to `straight_8th`
  - If BPM > higher threshold (default: ~200), restrict max grid to `straight_8th` and disable triplets too
  - Applies to `mid` and `high` bands (low is already forced to `straight_8th`)
  - Overrides `straight_16th` grid decisions → `straight_8th`
  - Overrides `triplet_8th` grid decisions → `straight_8th` at very high BPM
- [ ] This rule ONLY changes grid decisions — it does NOT quantize anything
- [ ] The quantization happens later using the modified grid decisions, snapping from the **original** transient timestamps to the (now 8th-note) grid
- [ ] No deduplication needed at this level — dedup happens naturally during quantization when two transients snap to the same grid point

### Task 2.4: Implement TempoAwareQuantizer class

- [ ] Constructor takes `TempoAwareQuantizerConfig`
- [ ] Main method: `decideGrids(transients, unifiedBeatMap, band)` → `GridDecision[]`
  - Calls the base `RhythmQuantizer.decideGrids()` to get initial grid decisions
  - Then applies each applicable rule to modify the grid decisions
  - Returns the final, BPM-constrained grid decisions
- [ ] The TempoAwareQuantizer plugs into the decide-then-quantize flow:
  ```
  decideGrids()           →  RhythmQuantizer base decisions
  ↓
  TempoAwareQuantizer.applyRules()  →  BPM-constrained decisions
  ↓
  quantizeToGrids()       →  Quantize from original timestamps to final grid
  ```
- [ ] Default config includes the high BPM restriction rule
- **File:** `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.ts`

### Task 2.5: Integrate into RhythmGenerator pipeline

- [ ] Modify `RhythmGenerator.quantizeTransients()` to use the decide-then-quantize flow:
  1. Split transients by band (existing)
  2. Apply density validation per band (existing)
  3. **Decide grids** — base grid detection per beat
  4. **Apply BPM-aware rules** — modify grid decisions based on tempo
  5. **Quantize to final grids** — snap original transients to the BPM-constrained grids
- [ ] Add `TempoAwareQuantizer` as a collaborator of `RhythmGenerator` (like `RhythmQuantizer`, `DensityAnalyzer`, etc.)
- [ ] Add to `RhythmGenerationOptions`:
```typescript
/** BPM-aware quantization rules config. When undefined, default rules apply. */
tempoQuantizationConfig?: TempoAwareQuantizerConfig;
```
- [ ] Pass BPM from `unifiedBeatMap.quarterNoteBpm`
- **File:** `playlist-data-engine/src/core/generation/RhythmGenerator.ts`

### Task 2.6: Verify difficulty variant generation interaction

- [ ] The `DifficultyVariantGenerator`'s subdivision limits should still work on top of tempo-aware limits
- [ ] After tempo-aware quantization, the grid types are already constrained — difficulty variants further simplify from there
- [ ] Verify that Easy difficulty (which limits to 8th notes) still works correctly when tempo-aware quantization has already removed 16th notes
- [ ] No changes expected — the variant generator simply receives the already-constrained streams

### Task 2.7: Write tests for TempoAwareQuantizer

- [ ] Test that at BPM > 160, grid decisions are changed to `straight_8th` instead of `straight_16th`
- [ ] Test that at normal BPM (< 160), 16th note grid decisions are preserved
- [ ] Test that quantization uses original transient timestamps (not re-quantized data) — verify quantization error is based on original position
- [ ] Test the rule interface extensibility (add a no-op rule, verify it chains)
- [ ] Test deduplication when BPM rule causes transients to snap to same grid point
- **File:** `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.test.ts`

---

## Phase 3: Frontend — Update Density Display & UI

Update the frontend to reflect the notes/second metric. The BPM-aware quantization step is engine-only and needs no frontend changes (it's a pipeline optimization).

### Task 3.1: Update DifficultyConversionPanel density display

- [ ] Change "X.XX notes/beat" labels to "X.XX notes/sec" (lines 159, 1141)
- [ ] Update tooltip labels: "notes/beat" → "notes/sec" (lines 168, 176, 184)
- [ ] Update `DENSITY_THRESHOLDS` constant values from notes/beat to notes/second (lines 71-74)
  - `sparse: 1.0` → `sparse: ~2.5`
  - `dense: 1.75` → `dense: ~4.5`
- [ ] Update `densityStatus` useMemo threshold comparisons (lines 1086-1098)
- [ ] Update `MAX_DENSITY_DISPLAY` if needed (currently 2.5, will need to be higher for notes/sec)
- [ ] Update `DensityMeter` component:
  - Rename prop `transientsPerBeat` → `notesPerSecond` (line 131)
  - Update threshold position calculations (lines 144-145, 151)
- [ ] Update all inline bar zone widths that use `DENSITY_THRESHOLDS` (lines 1148, 1153-1154, 1160-1161, 1173, 1179)
- **File:** `playlist-data-showcase/src/components/ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel.tsx`

### Task 3.2: Update type imports and usage in frontend

- [ ] Update any frontend code that accesses `transientsPerBeat` on density analysis results to use `notesPerSecond`
- [ ] Check `rhythmGeneration.ts` type re-exports — the `DensityAnalysisResult` type is re-exported from the engine
- [ ] Check store code (`beatDetectionStore.ts`) for any density field references
- [ ] Check `useRhythmGeneration.ts` for any density references
- **Files:** `src/types/rhythmGeneration.ts`, `src/store/beatDetectionStore.ts`, `src/hooks/useRhythmGeneration.ts`

### Task 3.3: Update DensityMeter legend labels

- [ ] Update threshold labels in the legend from notes/beat values to notes/second values (lines 223, 229, 235)
- [ ] Ensure tooltips reference "notes/sec"

---

## Phase 4: Documentation

Update engine documentation to reflect both the density unit change and the new quantization architecture.

### Task 4.1: Update DATA_ENGINE_REFERENCE.md

- [ ] Update `DensityAnalyzer` section — change description from "transients per beat" to "notes per second", update `analyze()` method signature to show BPM parameter
- [ ] Update `RhythmQuantizer` section — mention the decide-then-quantize architecture and the new `TempoAwareQuantizer` integration
- [ ] Add `TempoAwareQuantizer` section — document the rule interface, default rules, and configuration options
- [ ] Update `DifficultyVariantGenerator` section — update `targetDensityRange` descriptions from notes/beat to notes/second
- [ ] Update `StreamScorer` section — update density factor description from "2 notes per beat" to notes/second
- [ ] Update `CompositeStreamGenerator` section — update density threshold descriptions
- [ ] Update `RhythmGenerator` pipeline phases — add Phase 1.4 for tempo-aware quantization
- [ ] Update `RhythmGenerationOptions` table — add `tempoQuantizationConfig` option
- **File:** `playlist-data-engine/DATA_ENGINE_REFERENCE.md`

### Task 4.2: Update BEAT_DETECTION.md

- [ ] Update "Natural Difficulty Detection" table — change "Transients/Beat" column to "Notes/Second" with new thresholds
- [ ] Update "Rhythm Quantization" section — describe the decide-then-quantize architecture
- [ ] Add a new subsection under "Rhythm Quantization" for BPM-aware rules:
  - Explain the rule interface design and extensibility
  - Document the high BPM 16th restriction rule
  - Show example of how grid decisions are modified before quantization
  - Contrast with difficulty-based subdivision limits (which happen later in the pipeline)
- [ ] Update "Scoring and Composite Generation" section — update density factor description
- [ ] Update "Difficulty Variant Generation" section — update "Target Density Ranges" from notes/beat to notes/second
- **File:** `playlist-data-engine/docs/BEAT_DETECTION.md`

---

## Dependencies

- Phase 2 (BPM-aware quantization) depends on Phase 1 (notes/second density) — both changes affect the RhythmGenerator pipeline
- Phase 2, Task 2.1 (refactor into decide-then-quantize) must complete before Tasks 2.2-2.5
- Phase 2, Task 2.6 (variant generation interaction) depends on Task 2.5 (pipeline integration)
- Phase 3 (frontend) depends on Phase 1 completing — the UI reads density values from the engine output
- Phase 4 (documentation) depends on Phases 1 and 2 completing — docs should reflect final implementation

## Questions/Unknowns

- **Threshold calibration:** The exact notes/second thresholds for sparse/moderate/dense need real-world testing. Proposed initial values (~2.5 / ~4.5 notes/sec) are approximations. The plan should include a tuning pass after implementation.
- **BPM threshold for 16th restriction:** The exact BPM cutoff for restricting 16th notes needs playtesting. Proposed ~160 BPM as initial threshold. This should be configurable via the rule's config.
- **Multi-tempo tracks:** The `UnifiedBeatMap` supports `tempoSections` for multi-tempo tracks. Should the TempoAwareQuantizer apply rules per-section (local BPM) or globally (primary BPM)? Per-section is more accurate but more complex.

## Files Affected (Complete List)

### Engine source files:
- `playlist-data-engine/src/core/analysis/beat/DensityAnalyzer.ts` — core rename + BPM param
- `playlist-data-engine/src/core/analysis/beat/CompositeStreamGenerator.ts` — thresholds + calc
- `playlist-data-engine/src/core/analysis/beat/StreamScorer.ts` — bell curve + BPM
- `playlist-data-engine/src/core/analysis/beat/DifficultyVariantGenerator.ts` — ranges + calc
- `playlist-data-engine/src/core/analysis/beat/RhythmQuantizer.ts` — decide-then-quantize refactor
- `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.ts` — **NEW FILE**
- `playlist-data-engine/src/core/analysis/LevelSerializer.ts` — compat stub field names
- `playlist-data-engine/src/core/generation/RhythmGenerator.ts` — thread BPM, JSON types
- `playlist-data-engine/src/core/analysis/beat/index.ts` — export verification
- `playlist-data-engine/src/index.ts` — export verification

### Engine test files:
- `playlist-data-engine/src/core/analysis/beat/DensityAnalyzer.test.ts`
- `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.test.ts` — **NEW FILE**
- `playlist-data-engine/src/core/generation/RhythmGenerator.test.ts`
- `playlist-data-engine/src/core/analysis/LevelSerializer.compatibility.test.ts`
- `playlist-data-engine/tests/unit/beat/streamScorer.test.ts`
- `playlist-data-engine/tests/unit/beat/compositeStreamGenerator.test.ts`
- `playlist-data-engine/tests/unit/beat/difficultyVariantGenerator.test.ts`
- `playlist-data-engine/tests/integration/phraseDensityAnalysis.integration.test.ts`

### Frontend files:
- `playlist-data-showcase/src/components/ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel.tsx`
- `playlist-data-showcase/src/types/rhythmGeneration.ts` (if density types are re-exported)
- `playlist-data-showcase/src/store/beatDetectionStore.ts` (if density fields are referenced)
- `playlist-data-showcase/src/hooks/useRhythmGeneration.ts` (if density fields are referenced)

### Documentation:
- `playlist-data-engine/DATA_ENGINE_REFERENCE.md`
- `playlist-data-engine/docs/BEAT_DETECTION.md`
