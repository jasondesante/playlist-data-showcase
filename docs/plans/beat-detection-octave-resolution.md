# Beat Detection: Octave Ambiguity Resolution

## Overview

The Ellis 2007 beat tracking algorithm has a fundamental weakness: it cannot distinguish between double-tempo and half-tempo (e.g., 146 BPM vs 73 BPM). This causes sparse beat detection when the algorithm locks onto the wrong tempo octave.

**Problem**: A 2:21 track at 146 BPM with sharp transients only detects 60 beats (expected ~343 beats).

**Root Cause**: The perceptual weighting in TempoDetector gives equal preference to 73 BPM and 146 BPM (~96% weight for both). When sparse beat detection occurs, the algorithm incorrectly assigns fractional tempos (24 BPM, 73 BPM) to sections instead of recognizing them as octave errors of the true tempo.

**Solution**: Re-enable the TPS2 (duple meter) calculation from the Ellis paper, which boosts tempos with strong half-period evidence. This improved accuracy from 77% → 84% in the original paper.

---

## Phase 1: Add Octave Resolution to TempoDetector (playlist-data-engine)

### Task 1.1: Add new configuration option
- [x] Add `useOctaveResolution?: boolean` to `TempoDetectorConfig` in `src/core/types/BeatMap.ts`
- [x] Set default value to `false` (opt-in)
- [x] Update `DEFAULT_TEMPO_DETECTOR_CONFIG` constant

### Task 1.2: Re-enable TPS2 calculation
- [x] Uncomment `calculateTPS2()` method in `TempoDetector.ts` (exists at lines 301-314, not 47-48 as originally noted)
- [x] Uncomment `calculateTPS3()` method if needed for triple meter support (exists at lines 328-341)
- [x] Verify the calculation logic is correct per Ellis paper Equation 7:
  ```
  TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + 0.25×TPS(2τ-1) + 0.25×TPS(2τ+1)
  ```
  **Verified**: Code matches equation exactly. Note: Methods exist but calls are commented out at lines 120-121.

### Task 1.3: Integrate TPS2 into tempo estimation
- [x] Modify `estimateTempo()` to use TPS2 score when `useOctaveResolution` is true
- [x] Compare primary tempo with half-period tempo using TPS2 scores
- [x] Prefer faster tempo if TPS2 score is stronger
- [x] Return updated `TempoEstimate` with corrected primary BPM

### Task 1.4: Add unit tests
- [x] Test case: half-tempo detection (73 BPM should become 146 BPM)
- [x] Test case: correct tempo preserved (146 BPM stays 146 BPM)
- [x] Test case: sub-harmonic detection (24 BPM should become 146 BPM if 146 is primary)
- [x] Test with `useOctaveResolution: false` to verify backward compatibility
- [x] Test that `useOctaveResolution` defaults to `false`
- [x] Test that `useOctaveResolution` can be explicitly enabled
- [x] Test octave resolution with various tempos (80, 100, 120, 140, 160 BPM)

---

## Phase 2: Update playlist-data-engine Documentation

> **Note**: This phase updates documentation in the `playlist-data-engine` project.

### Task 2.1: Update TempoDetector documentation
- [x] Update JSDoc for `TempoDetectorConfig` to document new `useOctaveResolution` option
- [x] Update JSDoc for `estimateTempo()` to explain octave resolution behavior
- [x] Document the TPS2 calculation and its purpose

### Task 2.2: Update BeatMap types documentation
- [x] Update JSDoc for `TempoDetectorConfig` interface in `BeatMap.ts`

### Task 2.3: Update DATA_ENGINE_REFERENCE.md
- [x] Add `useOctaveResolution` option to `TempoDetectorConfig` section in `docs/DATA_ENGINE_REFERENCE.md`
- [x] Document the default value (`false`) and behavior
- [x] Explain when/why to enable it (opt-in feature)

### Task 2.4: Update engine README/changelog
- [x] Add entry to CHANGELOG.md in `playlist-data-engine` for the new feature
- [x] Update any relevant sections in README or docs/

---

## Phase 3: Update Showcase App

> **Note**: This phase is done in the `playlist-data-showcase` project.

### Task 3.1: Add option to Zustand store
- [x] Add `useOctaveResolution: boolean` to `generatorOptions` in `beatDetectionStore.ts`
- [x] Set default value to `false` (opt-in, preserves current behavior)
- [x] Add selector hook if needed (not strictly needed - `useGeneratorOptions` already provides access, same pattern as other simple options)

### Task 3.2: Add UI toggle
- [x] Consider adding to Advanced Settings in `BeatDetectionSettings.tsx`
- [x] Or keep as hidden/always-on option for initial release (Decision: Made it visible in Advanced Settings)
- [x] Add to settings note/info section if visible

### Task 3.3: Integration testing
- [ ] Test with problem track (146 BPM, 60 beats detected)
- [ ] Verify improved beat count after changes
- [ ] Verify practice mode availability improves

---

## Phase 4: Verification

### Task 4.1: Manual testing
- [ ] Test with tracks at various tempos (60-200 BPM)
- [ ] Verify no regression in correctly-detected tracks
- [ ] Verify improvement in problematic tracks

### Task 4.2: Performance check
- [ ] Ensure TPS2 calculation doesn't significantly slow down analysis
- [ ] Profile if needed

---

## Files to Modify

### playlist-data-engine

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Add `useOctaveResolution` to config interface |
| `src/core/analysis/beat/TempoDetector.ts` | Re-enable TPS2, integrate into estimation |
| `CHANGELOG.md` | Add entry for new feature |

### playlist-data-showcase

| File | Changes |
|------|---------|
| `src/store/beatDetectionStore.ts` | Add option to store |
| `src/components/ui/BeatDetectionSettings.tsx` | Add UI toggle (optional) |
| `docs/DATA_ENGINE_REFERENCE.md` | Document new option for showcase developers |

---

## Dependencies

- None - this is a self-contained improvement

---

## Future Improvements (Not in this plan)

### Option 2: Tactus Range Normalization
Simple fallback that prefers tempos in the human tapping range (70-140 BPM):
```typescript
while (bpm < 70) bpm *= 2;
while (bpm > 140) bpm /= 2;
```
**When to add**: If octave resolution alone doesn't help enough with extreme cases (e.g., 24 BPM detected for 146 BPM track).

### Option 3: Sparse Section Recovery Pass
A 2nd pass in BeatMapGenerator that:
1. Identifies sections with low beat density (< 0.5 beats/sec)
2. Re-runs beat tracking at double-tempo in those sections
3. Merges recovered beats back into the beat map

**When to add**: If octave resolution improves initial tempo detection but sections are still sparse due to transient detection issues (not tempo issues).

**Implementation location**: `BeatMapGenerator.ts` as a post-processing step after `trackBeats()` but before returning the beat map.

---

## Questions/Unknowns

- [ ] Should TPS3 (triple meter) also be re-enabled? Currently commented out alongside TPS2.
- [ ] Should the UI toggle be visible or hidden for initial release?
- [ ] What's the performance impact of TPS2 calculation on longer tracks?
