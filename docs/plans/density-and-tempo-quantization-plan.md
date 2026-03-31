# Density (Notes/Second) & BPM-Aware Quantization Plan

## Overview

Two related engine changes that improve rhythm generation quality:

1. **Density metric: notes/beat → notes/second** — A 120 BPM track with 2 notes/beat (4 notes/sec) feels much easier than a 180 BPM track with 2 notes/beat (6 notes/sec). The current notes/beat metric doesn't capture this, making difficulty balancing inaccurate across tempos.

2. **BPM-aware quantization step** — At high BPMs, 16th notes become unplayable (180 BPM = 83ms per 16th). A new extensible pipeline step applies BPM-based rules to constrain the quantization grid for fundamental playability, independent of difficulty settings.

### Design Decisions

- **No backward compatibility** — Old serialized data won't be loaded by new versions. Clean rename of all fields.
- **BPM source** — `UnifiedBeatMap.quarterNoteBpm` (confirmed at `BeatMap.ts:1628` and `BeatMap.ts:1958`)
- **BPM to DensityAnalyzer** — Add `bpm: number` parameter to `analyze()` signature (explicit dependency)
- **BPM to DifficultyVariantGenerator** — The `generate()` method already receives `unifiedBeatMap: UnifiedBeatMap`, so BPM is available. Pass it through to `calculateDensity()` via method parameter. No constructor/config changes needed.
- **BPM to StreamScorer** — Add `bpm?: number` to `StreamScorerConfig`. The scorer is constructed once per generation via `RhythmGenerator`, and config is already threaded there. This keeps the `score()` signature stable.
- **BPM to CompositeStreamGenerator** — Derive BPM inside `generate()` from `streams.streams.low.quarterNoteInterval` (already available). No signature changes needed.
- **Grid confidence on BPM override** — When TempoAwareQuantizer overrides a grid decision, set `confidence: 1.0` and clear `straightAvgOffset`/`tripletAvgOffset`. This matches how `getBandGridType()` already creates forced decisions (line 714-719), and prevents `collectGridDecisions()` from preferring an un-overridden lower-confidence decision over a BPM-forced one.
- **Every code path** that uses notes/beat as a density measurement must be converted to notes/second, including private methods, comments, and test assertions

### Out of Scope

- `BeatMap.ts` `SubdivisionType` (lines 1820-1831) — uses "density" to mean subdivision grid resolution (e.g., `eighth` = 2x density, `sixteenth` = 4x density). These are relative multipliers for subdivision granularity, completely unrelated to the notes/second tempo-adjusted density metric. No changes needed.

---

## Phase 1: Engine — DensityAnalyzer Notes/Second Conversion

Convert the core density measurement from notes/beat to notes/second. This is the foundational change that everything else builds on.

### Task 1.1: Update DensityAnalyzer to accept and use BPM

- [x] Add `bpm: number` parameter to `DensityAnalyzer.analyze(streams, bpm)` method
- [x] Add a helper: `notesPerSecond = transientsPerBeat * (bpm / 60)`
- [x] Replace all `transientsPerBeat` values in output with `notesPerSecond` equivalents
- [x] Update `DensityAnalyzerConfig` thresholds from notes/beat to notes/second
  - Current: sparse < 1.0, dense > 1.75 (notes/beat)
  - New: sparse < ~2.5, dense > ~4.5 (notes/sec at ~150 BPM reference)
  - **Note:** Thresholds need calibration — will use initial values and tune
- [x] Rename fields in `BandDensityMetrics`:
  - `transientsPerBeat` → `notesPerSecond`
  - `minTransientsPerBeat` → `minNotesPerSecond`
  - `maxTransientsPerBeat` → `maxNotesPerSecond`
- [x] Rename fields in `SectionDensityMetrics`: same renames
- [x] Rename fields in `DensityAnalysisResult.combinedMetrics`: same renames
- [x] Keep `perBeatDensity` array name (it's per-beat granularity, not the unit) but update `transientCount` to stay as-is (count is unit-independent)
- [x] Update `categorizeDensity()` — rename parameter from `transientsPerBeat` to `notesPerSecond`, update threshold comparisons
- [x] Update `determineNaturalDifficulty()` — no change needed (it just maps category)
- [x] Update `calculateVariance()` — now takes notes/second values as input
- [x] Update `analyzeBand()` — convert `transientsPerBeat` calculation to `notesPerSecond` using BPM
- [x] Update `calculateCombinedMetrics()` — same conversion
- [x] Update `calculateSectionMetrics()` — same conversion
- [x] Update JSDoc example at top of file (lines 15-20) — `transientsPerBeat` → `notesPerSecond`
- [x] Update all JSDoc comments that reference "transients per beat" → "notes per second"
- **File:** `playlist-data-engine/src/core/analysis/beat/DensityAnalyzer.ts`
- **Note:** Also updated cascading references in `RhythmGenerator.ts` (analyzeDensity caller, JSON types, serialization), `LevelSerializer.ts` (compat stub), `DensityAnalyzer.test.ts`, `RhythmGenerator.test.ts`, and `LevelSerializer.compatibility.test.ts` to keep the build green.

### Task 1.2: Update CompositeStreamGenerator density thresholds and calculation

- [x] Update `SPARSE_THRESHOLD` and `DENSE_THRESHOLD` constants from notes/beat to notes/second
- [x] Update `determineNaturalDifficulty()` to accept BPM and convert to notes/second
  - Current: `notesPerBeat = beats.length / totalQuarterNotes`
  - New: `notesPerSecond = (beats.length / totalQuarterNotes) * (bpm / 60)`
  - This method currently doesn't accept BPM — add it as a parameter
  - Derive BPM inside `generate()` from `streams.streams.low.quarterNoteInterval` (i.e., `60 / quarterNoteInterval`) and pass to `determineNaturalDifficulty()`
  - No changes to the `generate()` signature — BPM is derived internally
- [x] Update JSDoc comments: "notes/beat" → "notes/second" (lines 134-136, 345-346)
- **File:** `playlist-data-engine/src/core/analysis/beat/CompositeStreamGenerator.ts`

### Task 1.3: Update StreamScorer density factor

- [x] Add `bpm?: number` to `StreamScorerConfig` interface
- [x] Update `calculateDensityFactor()` to convert per-beat transient count to notes/sec
  - Current: averages `transientCount` across section beats → notes/beat
  - New: multiply by `(bpm / 60)` to get notes/sec
  - BPM comes from `this.config.bpm`
- [x] Update bell curve constants:
  - Current: `optimalDensity = 2.0` (notes/beat), `bellCurveWidth = 1.5`
  - New: `optimalDensity = 4.0` (notes/sec, equivalent to 2 notes/beat at 120 BPM), `bellCurveWidth = 3.0`
  - Bell curve shape is preserved: 2x scale factor matches notes/beat → notes/sec conversion
  - When BPM is not configured, falls back to `bpmPerSecond = 1` (legacy notes/beat behavior on rescaled curve)
- [x] Update `score()` to validate BPM is available when calculating density factor
  - Decided NOT to throw when BPM is missing — fallback to `bpmPerSecond = 1` preserves backward compatibility for tests and standalone usage. BPM validation will happen at the RhythmGenerator level (Task 1.5).
- [x] Update all JSDoc comments referencing "2 notes per beat" (lines 232, 519, 542-548)
- [x] RhythmGenerator will pass BPM via `StreamScorerConfig` when constructing the scorer
- [x] Updated unit test density factor assertions to pass `bpm: 120` and use notes/sec expectations
- **File:** `playlist-data-engine/src/core/analysis/beat/StreamScorer.ts`

### Task 1.4: Update DifficultyVariantGenerator density ranges and calculation

- [ ] Convert `SUBDIVISION_LIMITS.targetDensityRange` from notes/beat to notes/second:
  - Easy: `{ min: 0, max: 2.5 }` (was 0-1.0 notes/beat)
  - Medium: `{ min: 2.5, max: 4.5 }` (was 1.0-1.75 notes/beat)
  - Hard: `{ min: 4.5, max: Infinity }` (was >1.75 notes/beat)
  - Natural: `{ min: 0, max: Infinity }` (unchanged conceptually)
- [ ] Update `SubdivisionLimitConfig.targetDensityRange` comment: "transients per beat" → "notes per second" (line 195)
- [ ] Update private `calculateDensity()` method to return notes/second
  - **Fix denominator** to use `maxBeatIndex + 1` (count from beat 0, matching DensityAnalyzer's method). Current uses `maxBeat - minBeat + 1` which gives different results when there are leading/trailing gaps — both analyzers must use the same denominator so `reduceDensityToTarget()` compares against the same scale as the analyzer's thresholds
  - Current: `beats.length / (maxBeat - minBeat + 1)` (notes/beat, wrong denominator) — line 979
  - New: `(beats.length / (maxBeatIndex + 1)) * (bpm / 60)` (notes/sec, correct denominator)
  - Add `bpm: number` parameter to `calculateDensity()`
- [ ] Update `reduceDensityToTarget()` — passes BPM through to `calculateDensity()`; `targetRange` comparison works as-is since both sides are now notes/sec
- [ ] Thread BPM through callers:
  - `generateVariant()` (line 629) — already has `unifiedBeatMap`, derive BPM as `unifiedBeatMap.quarterNoteBpm`, pass to `reduceDensityToTarget()` and `calculateDensity()`
  - No signature changes to `generate()` or `generateVariant()` needed — BPM is already available via `unifiedBeatMap`
- [ ] Update JSDoc comments on SUBDIVISION_LIMITS entries: "transients/beat" → "notes/sec" (lines 106, 121, 138)
- [ ] Update `calculateDensity()` JSDoc: "Transients per beat" → "Notes per second" (line 963)
- **Note:** The `densityMultiplier` used in enhancement (lines 284, 340, 1396, 1400) is a ratio multiplier, not an absolute density value — these do NOT need conversion
- **File:** `playlist-data-engine/src/core/analysis/beat/DifficultyVariantGenerator.ts`

### Task 1.5: Update RhythmGenerator pipeline

- [ ] Pass BPM to `DensityAnalyzer.analyze()` — BPM available from `unifiedBeatMap.quarterNoteBpm`
- [ ] Pass BPM to `StreamScorer` via config — `new StreamScorer({ bpm: unifiedBeatMap.quarterNoteBpm })`
- [ ] `CompositeStreamGenerator` derives BPM internally from `quarterNoteInterval` (Task 1.2) — no changes here
- [ ] `DifficultyVariantGenerator` derives BPM internally from `unifiedBeatMap.quarterNoteBpm` (Task 1.4) — no changes here
- [ ] Update `RhythmMetadata.averageDensity` to be notes/second (line 1127: currently `densityAnalysis.combinedMetrics.transientsPerBeat`)
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
- [ ] Update `streamScorer.test.ts` — density factor expectations, BPM config
- [ ] Update `compositeStreamGenerator.test.ts` — natural difficulty assertions
- [ ] Update `difficultyVariantGenerator.test.ts` — density range expectations
- **Files:** All test files in `playlist-data-engine/tests/` and `src/core/`

### Task 1.9: Update engine integration tests

- [ ] Update `phraseDensityAnalysis.integration.test.ts` — all `transientsPerBeat` references:
  - Lines 262, 310, 316, 360, 366, 444, 449, 454, 556, 588, 615, 694, 940, 946, 947, 948
  - Update console.log labels from "Transients per beat" / "Transients/beat" / "t/b" to notes/sec equivalents
  - Update expected values from notes/beat to notes/sec (need BPM context from test setup)
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
- [ ] **Grid confidence handling:** When overriding a grid decision:
  - Set `confidence: 1.0` (forced/authoritative — matches pattern used by `getBandGridType()` at `RhythmQuantizer.ts:714-719`)
  - Clear `straightAvgOffset` and `tripletAvgOffset` (they no longer reflect the chosen grid)
  - This is critical because `RhythmGenerator.collectGridDecisions()` (line 1302) uses confidence to pick between bands — a BPM-forced override should win over a lower-confidence auto-detected decision
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
- [ ] Verify that `collectGridDecisions()` correctly prefers BPM-forced decisions (confidence 1.0) over auto-detected ones
- [ ] No changes expected — the variant generator simply receives the already-constrained streams

### Task 2.7: Write tests for TempoAwareQuantizer

- [ ] Test that at BPM > 160, grid decisions are changed to `straight_8th` instead of `straight_16th`
- [ ] Test that at normal BPM (< 160), 16th note grid decisions are preserved
- [ ] Test that overridden decisions have `confidence: 1.0` and cleared offset fields
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

- [ ] `rhythmGeneration.ts` — Re-exports `DensityAnalysisResult` from engine. When engine renames fields, this type automatically updates. No code changes needed in this file — but verify consumers use the new `notesPerSecond` field name.
- [ ] `beatDetectionStore.ts` — Verified: no references to `transientsPerBeat` or density metric fields. Only references `averageDensityMultiplier` which is a subdivision multiplier (out of scope). **No changes needed.**
- [ ] `useRhythmGeneration.ts` — Verified: no references to density fields at all. **No changes needed.**

### Task 3.3: Update DensityMeter legend labels

- [ ] Update threshold labels in the legend from notes/beat values to notes/second values (lines 223, 229, 235)
- [ ] Ensure tooltips reference "notes/sec"

---

## Phase 4: Documentation

Update engine documentation to reflect both the density unit change and the new quantization architecture.

### Task 4.1: Update DATA_ENGINE_REFERENCE.md

- [ ] Update `DensityAnalyzer` section (line ~2736):
  - Change description: "Calculates transients per beat" → "Calculates notes per second"
  - Update `analyze()` method signature to show `bpm` parameter
  - Update output types: `BandDensityMetrics.transientsPerBeat` → `notesPerSecond`, same for `min`/`max`
- [ ] Update `StreamScorer` section (line ~2757):
  - Update `StreamScorerConfig` table: add `bpm` config option
  - Update `densityFactor` description in ScoringFactors table (line ~2810): "Bell curve for optimal density scoring" → mention it uses notes/sec with BPM-aware bell curve
- [ ] Update `CompositeStreamGenerator` section (line ~2812):
  - Update description to mention BPM-derived density calculation
- [ ] Update `DifficultyVariantGenerator` section (line ~2825):
  - Update `targetDensityRange` descriptions from "transients per beat" to "notes per second"
  - Update `generate()` method signature to show `unifiedBeatMap` parameter (already there)
- [ ] Update `RhythmQuantizer` section — mention the decide-then-quantize architecture and the new `TempoAwareQuantizer` integration
- [ ] Add `TempoAwareQuantizer` section — document the rule interface, default rules, and configuration options
- [ ] Update `RhythmGenerator` pipeline phases — add tempo-aware quantization phase
- [ ] Update `RhythmGenerationOptions` table (line ~2511) — add `tempoQuantizationConfig` option
- **File:** `playlist-data-engine/DATA_ENGINE_REFERENCE.md`

### Task 4.2: Update BEAT_DETECTION.md

- [ ] Update "Natural Difficulty Detection" table (line ~3464):
  - Change column header: "Transients/Beat" → "Notes/Second"
  - Update threshold values: `Sparse: < 1.5`, `Moderate: 1.5 - 2.5`, `Dense: > 2.5` → new notes/sec thresholds
  - **Note:** This table was already stale (code uses 1.0/1.75, doc shows 1.5/2.5) — fix to match new notes/sec thresholds
- [ ] Update "Grid Decision Metadata" section (line ~3380):
  - Update `GridDecision` interface example: add `straight_8th` to grid type union (currently only shows `straight_16th | triplet_8th`)
  - Note that `confidence: 1.0` indicates a forced grid decision (BPM override or band-forced grid)
- [ ] Update "Rhythm Quantization" section — describe the decide-then-quantize architecture
- [ ] Add a new subsection under "Rhythm Quantization" for BPM-aware rules:
  - Explain the rule interface design and extensibility
  - Document the high BPM 16th restriction rule
  - Explain confidence handling: forced overrides set `confidence: 1.0` and clear offset fields
  - Show example of how grid decisions are modified before quantization
  - Contrast with difficulty-based subdivision limits (which happen later in the pipeline)
- [ ] Update "Scoring and Composite Generation" section (line ~3405):
  - Update density factor description: "Bell curve—optimal density scores highest" → mention it now uses notes/sec with BPM-aware optimal value
- [ ] Update "Target Density Ranges" table (line ~3607):
  - Change column header: "transients per beat" → "notes per second"
  - Update `Easy: 0 - 1.0 t/b` → `0 - 2.5 notes/sec`
  - Update `Medium: 1.0 - 1.75 t/b` → `2.5 - 4.5 notes/sec`
  - Update `Hard: > 1.75 t/b` → `> 4.5 notes/sec`
- [ ] Update "Subdivision Limits by Difficulty" table (line ~3615) — no unit change needed (these are grid types, not density), but verify `straight_8th` is listed (currently only shows `straight_16th`, `triplet_8th`)
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
- `playlist-data-engine/src/core/analysis/beat/CompositeStreamGenerator.ts` — thresholds + internal BPM derivation
- `playlist-data-engine/src/core/analysis/beat/StreamScorer.ts` — bell curve + `bpm` in config
- `playlist-data-engine/src/core/analysis/beat/DifficultyVariantGenerator.ts` — ranges + `bpm` param on `calculateDensity()`
- `playlist-data-engine/src/core/analysis/beat/RhythmQuantizer.ts` — decide-then-quantize refactor
- `playlist-data-engine/src/core/analysis/beat/TempoAwareQuantizer.ts` — **NEW FILE**
- `playlist-data-engine/src/core/analysis/LevelSerializer.ts` — compat stub field names
- `playlist-data-engine/src/core/generation/RhythmGenerator.ts` — thread BPM, pass BPM to StreamScorer config, JSON types
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
- `playlist-data-showcase/src/types/rhythmGeneration.ts` — no code changes (re-exports auto-update), verify consumers
- ~~`playlist-data-showcase/src/store/beatDetectionStore.ts`~~ — **verified: no changes needed**
- ~~`playlist-data-showcase/src/hooks/useRhythmGeneration.ts`~~ — **verified: no changes needed**

### Documentation:
- `playlist-data-engine/DATA_ENGINE_REFERENCE.md`
- `playlist-data-engine/docs/BEAT_DETECTION.md`
