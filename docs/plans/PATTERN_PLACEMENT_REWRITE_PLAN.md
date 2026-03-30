# Pattern Placement Rewrite Plan

> **Status**: Ready for Implementation
> **Created**: 2026-03-30
> **Related**: [PITCH_DETECTION_LEVEL_GENERATION_UI_PLAN.md](./PITCH_DETECTION_LEVEL_GENERATION_UI_PLAN.md)

## Overview

The `ButtonMapper` in playlist-data-engine currently places patterns **one beat at a time**, only ever using `pattern.keys[0]` from each selected pattern. A "Clockwise Full Roll" (`['up', 'right', 'down', 'left']`) contributes only `'up'` to one beat — the next beat independently picks a random pattern and uses only its first key.

This rewrite replaces the beat-by-beat approach with a **run-based pattern placement algorithm** that:
1. Classifies every beat as pitch or pattern, then groups consecutive pattern beats into **runs**
2. Strategically selects multi-beat patterns to fill each run end-to-end
3. Places the **full sequence** of keys from each pattern across consecutive beats
4. Handles transitions smoothly at the boundaries between pattern runs and pitch sections

---

## Current Architecture (to be replaced)

```
Pass 1: For each beat independently:
  - Try pitch mapping → pitchKey
  - Try pattern fallback → pattern.keys[0] only ← BUG
  - Track previousKey

Pass 2: blendPitchAndPattern()
  - Sort by probability, replace lowest with pattern
  - Still beat-by-beat, no pattern memory

Pass 3: fillPatternHoles()
  - For each null beat:
    - Find compatible pattern → keys[i] = pattern.keys[0] ← BUG
    - patternIds[i] = pattern.id  (claims full pattern, but only 1 beat placed)
```

### Root cause locations

| Location | Problem |
|----------|---------|
| `selectPatternButton()` line 884-891 | Returns `pattern.keys[0]` only |
| `fillPatternHoles()` line 573 | `keys[i] = pattern.keys[0]` only |
| `mapButtons()` Pass 1 line 754-759 | Calls `selectPatternButton` per beat |
| No run detection | No concept of "consecutive pattern beats" |

---

## New Architecture

```
Phase A: Classify & Group
  1. For each beat: pitchKey (if pitch available + direction != 'none')
  2. Apply pitchInfluenceWeight blending (same logic, same result)
  3. Identify runs: consecutive sequences of pattern-only beats
  4. For each run, record: startIndex, endIndex, previousPitchKey, nextPitchKey

Phase B: Place Patterns (NEW)
  For each pattern run:
    1. Greedily fill with largest compatible pattern first
    2. Remainder filled with smaller patterns
    3. Residual 1-2 beats filled with interpolated keys
    4. Smooth transition at boundaries (last key of pattern → first pitch key)
```

### Key principle: full pattern placement

When "Clockwise Full Roll" (`['up', 'right', 'down', 'left']`) is placed on a 4-beat run:
- Beat 0: `'up'` (pattern: ddr_roll_clockwise_full, position 0)
- Beat 1: `'right'` (pattern: ddr_roll_clockwise_full, position 1)
- Beat 2: `'down'` (pattern: ddr_roll_clockwise_full, position 2)
- Beat 3: `'left'` (pattern: ddr_roll_clockwise_full, position 3)

All 4 beats share the same `patternId`, and the UI can highlight them as a unified pattern sequence.

---

## Phase 1: Engine — Run-Based Pattern Placement Algorithm

### Task 1.1: Add `PatternRun` and `PatternPlacement` types

Define new internal types in `ButtonMapper.ts`:

```typescript
/** A consecutive run of beats that need pattern filling */
interface PatternRun {
  /** Start index in the beat array */
  startIndex: number;
  /** End index (exclusive) in the beat array */
  endIndex: number;
  /** Number of beats in this run */
  length: number;
  /** Key from the pitch beat immediately before this run (null if run starts at beat 0) */
  previousKey: T | null;
  /** Key from the pitch beat immediately after this run (null if run ends at last beat) */
  nextKey: T | null;
}

/** Result of placing a pattern within a run */
interface PatternPlacement {
  /** The pattern that was placed */
  pattern: ButtonPattern<T>;
  /** Beat index where this pattern starts */
  startIndex: number;
  /** Number of beats actually filled by this pattern */
  filledLength: number;
}
```

- [x] Add `PatternRun<T>` interface to ButtonMapper.ts
- [x] Add `PatternPlacement<T>` interface to ButtonMapper.ts

### Task 1.2: Create `classifyBeats()` function

Extract the pitch classification logic from `mapButtons()` Pass 1 into a pure function:

```typescript
function classifyBeats<T>(
  beats: BeatInfo[],
  pitchAnalysis: PitchAtBeat[] | undefined,
  config: ButtonMappingConfig,
  difficulty: DifficultyLevel,
): {
  pitchKeys: (T | null)[];
  probabilities: number[];
}
```

This function:
- Builds pitch-by-timestamp lookup (same as current)
- For each beat, attempts pitch mapping (same transition table logic)
- Returns `null` for beats with no pitch or `direction === 'none'`

- [x] Extract pitch lookup + per-beat classification from `mapButtons()` into `classifyBeats()`
- [x] Keep all existing pitch mapping logic (DDR_TRANSITIONS, GUITAR_HERO_TRANSITIONS, etc.) unchanged
- [x] Unit test: beats with pitch → non-null, beats without → null

### Task 1.3: Create `identifyPatternRuns()` function

Pure function that scans the pitch classification results and groups consecutive null (pattern-needed) beats into runs:

```typescript
function identifyPatternRuns<T>(
  pitchKeys: (T | null)[],
): PatternRun<T>[]
```

Logic:
1. Scan left-to-right through `pitchKeys`
2. When a null is encountered, start a new run
3. Extend the run while consecutive nulls
4. When a non-null is hit, end the run
5. Record `previousKey` (last non-null before run) and `nextKey` (first non-null after run)
6. Return array of all runs (may be empty if all beats have pitch)

Edge cases:
- Run at start of song: `previousKey = null`
- Run at end of song: `nextKey = null`
- Entire song is pattern: single run covering all beats
- No pattern beats needed: empty array

- [x] Implement `identifyPatternRuns()`
- [x] Unit test: no runs when all beats have pitch
- [x] Unit test: single run for entire pattern-only song
- [x] Unit test: multiple runs separated by pitch beats
- [x] Unit test: edge runs (start/end of song)

### Task 1.4: Create `isPatternRunCompatible()` function

Check if a full multi-beat pattern is compatible for placement within a run, considering boundary transitions:

```typescript
function isPatternRunCompatible<T extends DDRButton | GuitarHeroButton>(
  pattern: ButtonPattern<T>,
  run: PatternRun<T>,
  positionInRun: number,  // 0 = start of run
  previousKey: T | null,  // key before the pattern (run previous or previous pattern's last key)
  nextKey: T | null,      // key after the pattern (run next key)
): boolean
```

Compatibility rules:
- `pattern.keys[0]` should differ from `previousKey` (no immediate repeat)
- `pattern.keys[last]` should allow smooth transition to `nextKey`
  - DDR: last key should be adjacent-to or same-as next key
  - Guitar Hero: last key should be between previous and next, or moving toward next
- Pattern difficulty must be ≤ `maxDifficulty`

- [x] Implement `isPatternRunCompatible()`
- [x] Reuse existing `DDR_ADJACENT` and interpolation logic from current code
- [x] Unit test: compatible pattern accepted
- [x] Unit test: pattern that starts with same key as previous rejected
- [x] Unit test: pattern that ends with incompatible key for next rejected

### Task 1.5: Create `selectPatternForRun()` function

Strategic pattern selection for a run. Uses a greedy approach — largest compatible pattern first:

```typescript
function selectPatternForRun<T extends DDRButton | GuitarHeroButton>(
  run: PatternRun<T>,
  patternLibrary: ButtonPattern<T>[],
  maxDifficulty: number,
): PatternPlacement<T>[]
```

Algorithm:
1. Sort eligible patterns by `keys.length` descending (largest first)
2. Filter by `difficulty <= maxDifficulty`
3. Walk through the run from `startIndex`:
   a. Find all compatible patterns (considering remaining run length, previousKey, nextKey)
   b. Prefer patterns that exactly fill the remaining space
   c. Otherwise pick the largest compatible pattern that fits
   d. If no pattern fits, mark the beat for interpolation fallback
   e. Advance position by pattern length, update previousKey
4. For residual beats (1-2 left after all patterns placed), use `interpolateButton()`
5. Return array of `PatternPlacement` objects

Variety considerations:
- Track recently used patterns within `config.patternMemory` measures
- Avoid placing the same pattern twice in a row within a run
- Prefer different categories when multiple options exist

- [x] Implement `selectPatternForRun()` with greedy largest-first strategy
- [x] Handle residual beats with `interpolateButton()`
- [x] Add patternMemory-based variety tracking
- [x] Unit test: exact-fit pattern selected for matching run length
- [x] Unit test: largest-fit pattern selected for longer run (e.g., 8-beat run → 4-beat pattern + 4-beat pattern)
- [x] Unit test: single-key residual beats handled gracefully
- [x] Unit test: patternMemory avoids repeating same pattern consecutively

### Task 1.6: Create `placePatterns()` function

Takes the placements and writes keys + pattern IDs into the final arrays:

```typescript
function placePatterns<T extends DDRButton | GuitarHeroButton>(
  pitchKeys: (T | null)[],
  patternIds: (string | undefined)[],
  runs: PatternRun<T>[],
  placementsByRun: PatternPlacement<T>[][],
): {
  keys: T[];
  patternIds: (string | undefined)[];
}
```

For each run, for each placement:
- Write `pattern.keys[j]` into `keys[placement.startIndex + j]`
- Write `pattern.id` into `patternIds[placement.startIndex + j]`
- Pitch-derived beats keep their keys (already in `pitchKeys`)

- [x] Implement `placePatterns()`
- [x] Preserve pitch-derived keys unchanged
- [x] Unit test: full 4-key pattern written across 4 consecutive beats
- [x] Unit test: pitch keys between runs preserved

### Task 1.7: Rewrite `mapButtons()` to use the new pipeline

Replace the current 3-pass approach:

```typescript
// OLD:
// Pass 1: per-beat pitch + pattern.keys[0]
// Pass 2: blendPitchAndPattern (beat-by-beat)
// Pass 3: fillPatternHoles (beat-by-beat, keys[0] only)

// NEW:
// Step 1: classifyBeats() → pitchKeys, probabilities
// Step 2: blendPitchAndPattern() → determine final pitch vs pattern (keep this logic)
// Step 3: identifyPatternRuns() → runs of consecutive pattern beats
// Step 4: For each run, selectPatternForRun() → placements
// Step 5: placePatterns() → final keys + patternIds
// Step 6: applyConsecutiveLimit() → fix any monotony (keep existing)
```

The `blendPitchAndPattern()` function stays mostly the same — it correctly decides which beats should be pitch vs pattern. What changes is that instead of using the pattern key directly, we just mark beats as "needs pattern" (null) and let the run-based system fill them.

- [x] Rewrite `mapButtons()` with the new 6-step pipeline
- [x] Keep `blendPitchAndPattern()` logic for pitch/pattern classification (it's correct for that purpose)
- [x] Feed classification results into `identifyPatternRuns()` + `selectPatternForRun()` + `placePatterns()`
- [x] Keep `applyConsecutiveLimit()` as post-processing
- [x] Build final `ButtonAssignment[]` with proper source/patternId per beat

### Task 1.8: Update `buildMetadata()` for pattern run stats

Enhance metadata to reflect the new placement strategy:

- `patternInfluencedBeats`: still a count, same as before
- `patternsUsed`: now actually meaningful — patterns that were fully placed
- Add optional `patternPlacements` to metadata: array of `{ patternId, startIndex, length }` for UI visualization

- [x] Keep existing metadata fields unchanged (backward compatible)
- [x] The `patternsUsed` set will now contain fewer, more meaningful entries

---

## Phase 2: Engine — Tests

### Task 2.1: Test full pattern placement

- [x] Test: 4-beat pattern run → single 4-beat pattern placed (all keys from pattern used)
- [x] Test: 8-beat pattern run → two 4-beat patterns placed
- [x] Test: 3-beat pattern run → 3-beat pattern or 2+1 placement
- [x] Test: 1-beat gap between pitch beats → interpolated single key
- [x] Test: pattern-only song (pitchInfluenceWeight=0, no pitch analysis) → entire song filled with patterns

### Task 2.2: Test boundary transitions

- [x] Test: pattern run followed by pitch beat → last key of pattern transitions smoothly to first pitch key
- [x] Test: pitch beat followed by pattern run → first key of pattern transitions smoothly from pitch key
- [x] Test: run at song start (no previous key) → pattern starts from neutral position
- [x] Test: run at song end (no next key) → pattern doesn't need to consider next

### Task 2.3: Test variety and pattern memory

- [x] Test: consecutive runs don't use the same pattern
- [x] Test: large run uses different patterns in sequence (not same pattern repeated)
- [x] Test: patternMemory setting respected

### Task 2.4: Test difficulty constraints

- [x] Test: easy difficulty only uses patterns with difficulty ≤ 3
- [x] Test: medium difficulty uses patterns with difficulty ≤ 6
- [x] Test: hard difficulty uses all patterns

### Task 2.5: Test backward compatibility

- [x] Test: `MappedLevelResult` shape unchanged
- [x] Test: `keyAssignments` Map still populated correctly
- [x] Test: `mappingSources` Map still populated correctly (pitch vs pattern per beat)
- [x] Test: `mappingPatternIds` Map now shows the same patternId for consecutive beats in the same pattern placement
- [x] Test: existing `ButtonMappingConfig` options all still work
- [x] Test: `pitchInfluenceWeight: 1.0` still produces mostly pitch-derived output
- [x] Test: `pitchInfluenceWeight: 0.0` still produces pattern-only output

---

## Phase 3: Engine — Cleanup

### Task 3.1: Remove old functions

- [ ] Remove `selectPatternButton()` (replaced by `selectPatternForRun()`)
- [ ] Remove `fillPatternHoles()` (replaced by run-based placement)
- [ ] Remove `selectPatternFromLibrary()` standalone function (logic absorbed into `selectPatternForRun()`)
- [ ] Remove `isPatternCompatible()` (replaced by `isPatternRunCompatible()`)
- [ ] Keep `interpolateButton()` (still used for residual beats)
- [ ] Keep `findNextPitchKey()` (still used by `identifyPatternRuns()`)

### Task 3.2: Update existing tests

- [ ] Update `ButtonMapper.patternSelection.test.ts` — ensure tests still pass with new implementation
- [ ] Update `ButtonMapper.blendPitchAndPattern.test.ts` — ensure blend logic still works
- [ ] Update `ButtonMapper.bandAware.test.ts` — ensure band metadata still correct

---

## Phase 4: Frontend — Update MappingSourceTimeline

### Task 4.1: Visualize pattern runs in MappingSourceTimeline

When consecutive beats share the same `patternId`, visually group them:

- Add a subtle connecting line/bracket between consecutive beats with the same patternId
- Use a slightly different opacity or glow to show "this is one pattern spanning N beats"
- The tooltip should show pattern position: "Clockwise Full Roll (beat 2/4)"

- [ ] Add visual grouping for consecutive same-patternId beats
- [ ] Show pattern position in tooltip (e.g., "beat 2 of 4")

### Task 4.2: Update PatternLibraryUsage counts

The `patternsUsed` metadata will now contain fewer entries (full patterns actually placed), but each pattern covers more beats. The usage counts should reflect the number of **placements** (how many times a pattern was placed), not individual beats.

- [ ] Count pattern placements (groups of consecutive same-patternId beats), not individual beats
- [ ] Show both: "Clockwise Full Roll — placed 12 times (48 beats)"

---

## Project Layout

- **playlist-data-engine**: `../playlist-data-engine/` — the engine library (separate project, separate git repo)
- **playlist-data-showcase**: `./` — the frontend demo app (this project)

The agent has access to both project folders and can read/write files in either.

## Dependencies

- **playlist-data-engine** changes must be built and published/linked before frontend changes
- No new npm dependencies needed
- No new types need to be added to the frontend's `levelGeneration.ts` — the `ChartedBeat.patternId` field already exists and the new algorithm just fills it correctly

## Questions/Unknowns

- Should the `patternMemory` config (default: 4 measures) apply across runs, or only within a single run? Current plan: within a run + avoid same pattern consecutively across adjacent runs.
- For runs longer than the largest available pattern (e.g., 16-beat run, largest pattern is 8 beats), should we prefer repeating the same pattern or mixing different patterns? Current plan: mix different patterns for variety.
- Should the algorithm consider phrase boundaries (from rhythm generation) as natural pattern run boundaries? This could improve musical coherence. Current plan: not in this phase — use it as a future enhancement.
