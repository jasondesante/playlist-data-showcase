# Beat Detection: Triple Meter Support (TPS3)

## Overview

Following the successful implementation of TPS2 (octave resolution for duple meter), this plan adds TPS3 support for triple meter detection (3/4, 6/8 time signatures).

**Problem**: The Ellis 2007 beat tracking algorithm with TPS2 resolves duple meter ambiguity (half-tempo/double-tempo), but doesn't handle triple meter music where beats occur in groups of three.

**Solution**: Add optional TPS3 (Tempo Period Strength for triple meter) calculation that boosts tempos with strong third-period evidence. This follows Ellis 2007 Equation 7's pattern for triple meter:

```
TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
```

**Use Case**: Waltzes, 6/8 shuffle feels, and other triple-meter music where the beat subdivision follows a 1-2-3 pattern rather than 1-2-4.

---

## Phase 1: Add Triple Meter to TempoDetector (playlist-data-engine)

### Task 1.1: Add new configuration option
- [x] Add `useTripleMeter?: boolean` to `TempoDetectorConfig` in `src/core/types/BeatMap.ts`
- [x] Set default value to `false` (opt-in)
- [x] Update `DEFAULT_TEMPO_DETECTOR_CONFIG` constant in TempoDetector.ts
- [x] Update `DEFAULT_BEATMAP_GENERATOR_OPTIONS` in BeatMap.ts

### Task 1.2: Document TPS3 calculation
- [ ] Verify the TPS3 calculation in `calculateTPS3()` method is correct per Ellis paper:
  ```
  TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
  ```
  **Note**: Method already exists at TempoDetector.ts lines 370-387

### Task 1.3: Integrate TPS3 into tempo estimation
- [ ] Modify `estimateTempo()` to use TPS3 score when `useTripleMeter` is true
- [ ] Compare primary tempo with third-period tempo using TPS3 scores
- [ ] Prefer faster tempo if TPS3 score is stronger (triple-time vs single-time)
- [ ] Consider interaction with `useOctaveResolution` - both can be enabled simultaneously

### Task 1.4: Add unit tests
- [ ] Test case: triple meter detection (slow 3/4 tempo should detect proper beat)
- [ ] Test case: correct tempo preserved for duple meter when triple meter is enabled
- [ ] Test case: combined useOctaveResolution + useTripleMeter
- [ ] Test with `useTripleMeter: false` to verify backward compatibility
- [ ] Test that `useTripleMeter` defaults to `false`
- [ ] Test that `useTripleMeter` can be explicitly enabled
- [ ] Test triple meter resolution with various tempos (60, 80, 100, 120, 140 BPM)

---

## Phase 2: Update playlist-data-engine Documentation

> **Note**: This phase updates documentation in the `playlist-data-engine` project.

### Task 2.1: Update TempoDetector documentation
- [ ] Update JSDoc for `TempoDetectorConfig` to document new `useTripleMeter` option
- [ ] Update JSDoc for `estimateTempo()` to explain triple meter behavior
- [ ] Document the TPS3 calculation and its purpose (triple meter detection)

### Task 2.2: Update BeatMap types documentation
- [ ] Update JSDoc for `TempoDetectorConfig` interface in `BeatMap.ts`

### Task 2.3: Update BEAT_DETECTION.md
- [ ] Add `useTripleMeter` option to `TempoDetectorConfig` section in `docs/BEAT_DETECTION.md`
- [ ] Document the default value (`false`) and behavior
- [ ] Explain when/why to enable it (opt-in feature for triple meter music)

### Task 2.4: Update DATA_ENGINE_REFERENCE.md
- [ ] Add `useTripleMeter` option to `TempoDetectorConfig` section
- [ ] Document interaction with `useOctaveResolution`

### Task 2.5: Update engine README/changelog
- [ ] Add entry to CHANGELOG.md in `playlist-data-engine` for the new feature

---

## Phase 3: Update Showcase App

> **Note**: This phase is done in the `playlist-data-showcase` project.

### Task 3.1: Add option to Zustand store
- [ ] Add `useTripleMeter: boolean` to `generatorOptions` in `beatDetectionStore.ts`
- [ ] Set default value to `false` (opt-in, preserves current behavior)
- [ ] No new selector hook needed (`useGeneratorOptions` already provides access)

### Task 3.2: Add UI toggle
- [ ] Add to Advanced Settings in `BeatDetectionSettings.tsx` (below Octave Resolution)
- [ ] Use the same On/Off button pattern as Octave Resolution
- [ ] Add tooltip explaining triple meter detection
- [ ] Add to settings info section

### Task 3.3: Add visual feedback for triple meter detection
- [ ] Add visual indicator in the beat display when triple meter is detected
- [ ] Show meter type (duple/triple) in beat visualization or info panel
- [ ] Visual feedback helps users understand how the feature works through the information it provides
- [ ] Consider showing beat groupings (1-2-3 pattern) when triple meter is active

### Task 3.4: Integration testing
- [ ] Create `src/tests/tripleMeter.integration.test.ts` (similar to octaveResolution test)
- [ ] Test with triple meter track (waltz, 6/8 shuffle) - optimal case is detecting triple meter correctly
- [ ] Verify improved beat count for triple meter tracks
- [ ] Document default configuration (useTripleMeter: false)

---

## Phase 4: Verification

### Task 4.1: Manual testing
- [ ] Test with triple meter tracks (waltzes at various tempos)
- [ ] Test with duple meter tracks to verify no regression
- [ ] Test with both `useOctaveResolution` and `useTripleMeter` enabled
- [ ] Verify improvement in problematic tracks

### Task 4.2: Performance check
- [ ] Ensure TPS3 calculation doesn't significantly slow down analysis
- [ ] Profile if needed (should be minimal impact - same pattern as TPS2)

---

## Files to Modify

### playlist-data-engine

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Add `useTripleMeter` to TempoDetectorConfig and DEFAULT_BEATMAP_GENERATOR_OPTIONS |
| `src/core/analysis/beat/TempoDetector.ts` | Integrate TPS3 into estimateTempo(), update JSDoc |
| `docs/BEAT_DETECTION.md` | Document new option |
| `DATA_ENGINE_REFERENCE.md` | Document new option |
| `CHANGELOG.md` | Add entry for new feature |
| `tests/unit/beat/tempoDetector.test.ts` | Add triple meter test cases |

### playlist-data-showcase

| File | Changes |
|------|---------|
| `src/store/beatDetectionStore.ts` | Add `useTripleMeter` to generatorOptions defaults |
| `src/components/ui/BeatDetectionSettings.tsx` | Add UI toggle in Advanced Settings |
| `docs/engine/docs/BEAT_DETECTION.md` | Sync from engine (or link) |
| `docs/engine/DATA_ENGINE_REFERENCE.md` | Sync from engine (or link) |
| `src/tests/tripleMeter.integration.test.ts` | Create integration tests |

---

## Dependencies

- TPS2 (octave resolution) implementation - already complete
- Existing `calculateTPS3()` method in TempoDetector.ts

---

## Interaction with useOctaveResolution

**TPS2 and TPS3 are separate, independent options** - they can both be enabled simultaneously:
- **useOctaveResolution only**: Resolves duple meter ambiguity (half/double tempo)
- **useTripleMeter only**: Resolves triple meter ambiguity (third-tempo)
- **Both enabled**: Both calculations run independently, each resolving their respective meter ambiguities

The options are independent because:
1. Most music is duple meter (4/4, 2/4), so TPS2 helps more often
2. Triple meter music (3/4, 6/8) benefits from TPS3
3. Some tracks could benefit from both (complex meters, tempo changes)

---

## Technical Notes

### TPS3 Formula (Ellis 2007)
```
TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
```

Where:
- `τ` is the tempo period in frames (lag)
- `TPS(τ)` is the autocorrelation value at that lag
- The 0.33 weights normalize the third-harmonic contribution

### Implementation Location
- Method already exists: `TempoDetector.ts` lines 370-387
- Integration needed in: `estimateTempo()` method (around line 143)

---

## Design Decisions

- **TPS3 is separate from TPS2**: The two options work independently and can both be enabled
- **Optimal case**: Successfully detecting triple meter tracks (waltzes, 6/8 shuffles) with correct beat placement
- **Visual feedback required**: The frontend must show visual feedback when triple meter is detected, as this teaches users how the feature works through the information it provides
