# Band Bias Weights Implementation Plan

## Overview

Expose the full `StreamScorerConfig` through `RhythmGenerationOptions`, allowing users to control:

1. **Factor Weights** - How much each scoring factor contributes:
   - `ioiVarianceWeight` (rhythmic variety)
   - `syncopationWeight` (offbeat emphasis)
   - `phraseSignificanceWeight` (pattern detection)
   - `densityWeight` (note count)

2. **Band Bias Weights** - Manual preference multipliers for each frequency band:
   - `low` (bass)
   - `mid`
   - `high`

This allows fine-grained control over which band gets selected for each section of the composite stream.

## Problem Statement

Currently, the composite stream selection is purely merit-based using 4 scoring factors:
- IOI Variance (30%) - rhythmic variety
- Syncopation (30%) - offbeat emphasis
- Phrase Significance (25%) - pattern detection
- Density (15%) - note count (bell curve)

If the bass band wins 70% of sections, it's because it scores highest on these factors. There's no way to manually bias the selection.

## Proposed Solution

Add `scoringConfig?: Partial<StreamScorerConfig>` to `RhythmGenerationOptions`, exposing:

### Factor Weights (how much each factor contributes to the score)
| Parameter | Default | Purpose |
|-----------|---------|---------|
| `ioiVarianceWeight` | 0.30 | Rhythmic variety importance |
| `syncopationWeight` | 0.30 | Offbeat emphasis importance |
| `phraseSignificanceWeight` | 0.25 | Pattern detection importance |
| `densityWeight` | 0.15 | Note count importance |

**Note**: Factor weights should sum to ~1.0 for balanced scoring.

### Band Bias Weights (multiplier on final score per band)
| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `bandBiasWeights.low` | undefined | 0.0-2.0 | 0 = never win, 1 = neutral, 2 = strongly favored |
| `bandBiasWeights.mid` | undefined | 0.0-2.0 | Same as above |
| `bandBiasWeights.high` | undefined | 0.0-2.0 | Same as above |

**Note**: When `undefined`, no bias is applied (all bands compete on merit alone).

---

## Phase 1: Engine Changes (playlist-data-engine)

### Task 1.1: Update StreamScorerConfig

- [x] **File**: `src/core/analysis/beat/StreamScorer.ts`
- [x] Add `bandBiasWeights` to the config interface:

```typescript
export interface StreamScorerConfig {
    beatsPerSection: number;
    ioiVarianceWeight: number;
    syncopationWeight: number;
    phraseSignificanceWeight: number;
    densityWeight: number;
    offbeatGridPositions: {
        straight_16th: number[];
        triplet_8th: number[];
    };
    // NEW: Band bias multipliers
    bandBiasWeights?: {
        low: number;
        mid: number;
        high: number;
    };
}
```

- [x] Update default config (no bias by default):
```typescript
const DEFAULT_STREAM_SCORER_CONFIG: StreamScorerConfig = {
    // ... existing defaults ...
    bandBiasWeights: undefined, // NEW: undefined = no bias
};
```

### Task 1.2: Apply Bias in scoreSection()
- [x] **File**: `src/core/analysis/beat/StreamScorer.ts`
- [x] Modify the `scoreSection()` method to apply band bias:

```typescript
private scoreSection(
    rhythmMap: GeneratedRhythmMap,
    band: Band,
    beatRange: { start: number; end: number },
    phraseAnalysis: PhraseAnalysisResult,
    densityAnalysis: DensityAnalysisResult
): SectionScore {
    // ... existing factor calculations ...

    // Combine factors with weights
    let score =
        ioiVariance * this.config.ioiVarianceWeight +
        syncopationLevel * this.config.syncopationWeight +
        phraseSignificance * this.config.phraseSignificanceWeight +
        densityFactor * this.config.densityWeight;

    // NEW: Apply band bias if configured
    if (this.config.bandBiasWeights) {
        const bias = this.config.bandBiasWeights[band] ?? 1.0;
        score *= bias;
    }

    return {
        beatRange,
        band,
        score,
        factors: {
            ioiVariance,
            syncopationLevel,
            phraseSignificance,
            densityFactor,
        },
    };
}
```

### Task 1.3: Add ScoringConfig to RhythmGenerationOptions
- [x] **File**: `src/core/generation/RhythmGenerator.ts`
- [x] Add scoring configuration option:

```typescript
export interface RhythmGenerationOptions {
    difficulty?: DifficultyPreset;
    outputMode?: OutputMode;
    measureStartOffset?: number;
    minimumTransientIntensity?: number;
    transientConfig?: BandTransientConfigOverrides;
    densityValidation?: DensityValidationConfig;

    // NEW: Stream scoring configuration
    scoringConfig?: Partial<StreamScorerConfig>;

    seed?: string;
    verbose?: boolean;
    enableCache?: boolean;
    cacheMaxAge?: number;
}
```

### Task 1.4: Pass ScoringConfig to StreamScorer
- [x] **File**: `src/core/generation/RhythmGenerator.ts`
- [x] Update the constructor to pass scoring config:

```typescript
constructor(options: RhythmGenerationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // ... other initializations ...

    // NEW: Pass scoring config to StreamScorer
    this.streamScorer = new StreamScorer(this.options.scoringConfig);
}
```

### Task 1.5: Export New Types
- [x] **File**: `src/index.ts`
- [x] Ensure `StreamScorerConfig` is exported:

```typescript
export {
    // ... existing exports ...
    StreamScorer,
    type StreamScorerConfig,
    type StreamScoringResult,
    // ...
} from './core/analysis/beat/StreamScorer.js';
```

**Completed**: Also exported `BandBiasWeights` type which is referenced by `StreamScorerConfig`.

### Task 1.6: Add Tests
- [x] **File**: `tests/unit/beat/streamScorer.test.ts`
- [x] Add tests for band bias:

```typescript
describe('Band Bias Weights', () => {
    it('should apply band bias to final scores', () => {
        const scorer = new StreamScorer({
            bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.5 }
        });
        // ... test that scores are multiplied by bias
    });

    it('should default to no bias when not configured', () => {
        const scorer = new StreamScorer();
        // ... test that scores are unchanged
    });

    it('should handle missing band in bias config', () => {
        const scorer = new StreamScorer({
            bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.0 }
        });
        // ... test that missing bands default to 1.0
    });
});
```

**Completed**: Added 7 comprehensive tests for band bias weights:
- `should apply band bias to final scores` - verifies score multiplication
- `should default to no bias when not configured` - verifies default behavior
- `should handle missing band in bias config by defaulting to 1.0` - verifies partial config handling
- `should affect section winners based on bias` - verifies winners change based on bias
- `should include bandBiasWeights in config when set` - verifies config getter
- `should return bandBiasWeights in scoring result config` - verifies result includes config

---

## Phase 2: Frontend Type Updates (playlist-data-showcase)

### Task 2.1: Import StreamScorerConfig Type
- [x] **File**: `src/types/rhythmGeneration.ts`
- [x] Add import and re-export:

```typescript
import type {
    // ... existing imports ...
    StreamScorerConfig,
} from 'playlist-data-engine';

// Re-export
export type {
    // ... existing exports ...
    StreamScorerConfig,
} from 'playlist-data-engine';
```

**Completed**: Added `StreamScorerConfig` and `BandBiasWeights` to re-exports.

### Task 2.2: Update AutoLevelSettings Interface
- [x] **File**: `src/types/rhythmGeneration.ts`
- [x] Add scoring config to settings (exposes ALL scoring parameters):

```typescript
export interface AutoLevelSettings {
    preset: RhythmPresetName;
    difficulty: DifficultyLevel;
    outputMode: OutputMode;
    intensityThreshold: number;
    transientConfig?: BandTransientConfigOverrides;
    usePerBandDefaults: boolean;
    enableDensityValidation: boolean;
    densityMaxRetries: number;

    // NEW: Full scoring configuration
    scoringConfig?: Partial<StreamScorerConfig>;
}
```

**Note**: This exposes ALL StreamScorerConfig parameters:
- `ioiVarianceWeight` (default: 0.30) - How much rhythmic variety matters
- `syncopationWeight` (default: 0.30) - How much offbeat emphasis matters
- `phraseSignificanceWeight` (default: 0.25) - How much pattern detection matters
- `densityWeight` (default: 0.15) - How much note count matters
- `beatsPerSection` (default: 8) - Section size for scoring
- `bandBiasWeights` - Manual band preference multipliers

- [x] Update defaults:

```typescript
export const DEFAULT_AUTO_LEVEL_SETTINGS: AutoLevelSettings = {
    // ... existing defaults ...
    scoringConfig: undefined, // NEW - uses engine defaults when undefined
};
```

**Completed**: Added `scoringConfig?: Partial<StreamScorerConfig>` to interface and `scoringConfig: undefined` to defaults. Also imported `StreamScorerConfig` type for local use.

---

## Phase 3: Frontend UI Updates

### Task 3.1: Add Scoring Config UI to AutoLevelSettings
- [x] **File**: `src/components/ui/AutoLevelSettings.tsx`
- [x] Add a collapsible "Scoring Configuration" section with two subsections:

#### Subsection A: Factor Weights
Control how much each scoring factor contributes to band selection (weights should sum to ~1.0):

```tsx
<div className="scoring-factor-controls">
    <h4>Scoring Factors</h4>
    <p className="help-text">Adjust how much each factor contributes to band selection</p>

    <div className="factor-row">
        <label>Rhythmic Variety (IOI)</label>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.scoringConfig?.ioiVarianceWeight ?? 0.30}
            onChange={(e) => handleScoringFactorChange('ioiVarianceWeight', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.ioiVarianceWeight ?? 0.30).toFixed(2)}</span>
    </div>
    <div className="factor-row">
        <label>Syncopation</label>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.scoringConfig?.syncopationWeight ?? 0.30}
            onChange={(e) => handleScoringFactorChange('syncopationWeight', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.syncopationWeight ?? 0.30).toFixed(2)}</span>
    </div>
    <div className="factor-row">
        <label>Phrase Significance</label>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.scoringConfig?.phraseSignificanceWeight ?? 0.25}
            onChange={(e) => handleScoringFactorChange('phraseSignificanceWeight', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.phraseSignificanceWeight ?? 0.25).toFixed(2)}</span>
    </div>
    <div className="factor-row">
        <label>Density</label>
        <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.scoringConfig?.densityWeight ?? 0.15}
            onChange={(e) => handleScoringFactorChange('densityWeight', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.densityWeight ?? 0.15).toFixed(2)}</span>
    </div>
    <div className="weight-total">
        Total: {calculateTotalWeight().toFixed(2)} {calculateTotalWeight() === 1.0 ? '✓' : '⚠️ (should be 1.0)'}
    </div>
</div>
```

#### Subsection B: Band Bias Weights
Control which frequency bands are favored (multiplier on final score):

```tsx
<div className="band-bias-controls">
    <h4>Band Preference</h4>
    <p className="help-text">1.0 = neutral, &lt;1.0 = disfavor, &gt;1.0 = favor</p>

    <div className="band-bias-row">
        <label>Low (Bass)</label>
        <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.scoringConfig?.bandBiasWeights?.low ?? 1.0}
            onChange={(e) => handleBandBiasChange('low', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.bandBiasWeights?.low ?? 1.0).toFixed(1)}x</span>
    </div>
    <div className="band-bias-row">
        <label>Mid</label>
        <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.scoringConfig?.bandBiasWeights?.mid ?? 1.0}
            onChange={(e) => handleBandBiasChange('mid', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.bandBiasWeights?.mid ?? 1.0).toFixed(1)}x</span>
    </div>
    <div className="band-bias-row">
        <label>High</label>
        <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.scoringConfig?.bandBiasWeights?.high ?? 1.0}
            onChange={(e) => handleBandBiasChange('high', parseFloat(e.target.value))}
        />
        <span>{(settings.scoringConfig?.bandBiasWeights?.high ?? 1.0).toFixed(1)}x</span>
    </div>
</div>
```

- [x] Add reset buttons for both sections:
```tsx
<div className="reset-buttons">
    <button onClick={resetFactorWeights} className="reset-button">
        Reset Factors to Default
    </button>
    <button onClick={resetBandBias} className="reset-button">
        Reset Band Bias to Equal
    </button>
</div>
```

**Completed**: Reset buttons implemented in both the scoring factors and band bias sections.

### Task 3.2: Add Scoring Config Styles
- [x] **File**: `src/components/ui/AutoLevelSettings.css`
- [x] Add styles for both factor controls and band bias controls:

```css
/* Scoring Factor Controls */
.scoring-factor-controls,
.band-bias-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--color-surface-elevated);
    border-radius: 8px;
    margin-bottom: 12px;
}

.scoring-factor-controls h4,
.band-bias-controls h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
}

.help-text {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--color-text-secondary);
}

.factor-row,
.band-bias-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.factor-row label,
.band-bias-row label {
    width: 140px;
    font-weight: 500;
    font-size: 13px;
}

.factor-row input[type="range"],
.band-bias-row input[type="range"] {
    flex: 1;
}

.factor-row span,
.band-bias-row span {
    width: 50px;
    text-align: right;
    font-family: monospace;
    font-size: 13px;
}

.weight-total {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
    font-size: 12px;
    color: var(--color-text-secondary);
}

/* Reset Buttons */
.reset-buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
}

.reset-button {
    padding: 4px 12px;
    font-size: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.reset-button:hover {
    background: var(--color-surface-hover);
}
```

### Task 3.3: Pass Scoring Config to Rhythm Generation
- [x] **File**: `src/hooks/useRhythmGeneration.ts`
- [x] Update the generate function to pass the full scoring config:

```typescript
const generatorOptions: RhythmGenerationOptions = {
    difficulty: options?.difficulty ?? 'medium',
    outputMode: options?.outputMode ?? 'composite',
    minimumTransientIntensity: options?.minimumTransientIntensity ?? 0.2,
    transientConfig: options?.transientConfig,
    densityValidation: options?.densityValidation,

    // NEW: Pass full scoring config (includes factor weights AND band bias)
    scoringConfig: options?.scoringConfig,
};
```

### Task 3.4: Update RhythmGenerationTab Props
- [x] **File**: `src/components/Tabs/BeatDetectionTab/RhythmGenerationTab.tsx`
- [x] Add scoringConfig to props and pass through:

```typescript
interface RhythmGenerationTabProps {
    // ... existing props ...
    scoringConfig?: Partial<StreamScorerConfig>;
}
```

**Completed**: Added `scoringConfig?: Partial<StreamScorerConfig>` to:
- `RhythmGenerationTabProps` interface
- `RhythmGenerationResultProps` interface
- `CompositeStreamPanelProps` interface
- Passed scoringConfig through from BeatDetectionTab → RhythmGenerationTab → RhythmGenerationResult → CompositeStreamPanel
- Also passed scoringConfig to generateRhythm calls in onRetry and onRegenerateWithThreshold callbacks

---

## Phase 4: CompositeStreamPanel Visualization
### Task 4.1: Display Scoring Config Info
- [x] **File**: `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.tsx`
- [x] Add a note showing if custom scoring config was applied:

```tsx
{scoringConfig && (
    <div className="scoring-config-info">
        <Info size={14} />
        <span>
            Custom scoring applied
            {scoringConfig.bandBiasWeights && (
                <> | Bias: Low {scoringConfig.bandBiasWeights.low.toFixed(1)}x,
                Mid {scoringConfig.bandBiasWeights.mid.toFixed(1)}x,
                High {scoringConfig.bandBiasWeights.high.toFixed(1)}x</>
            )}
            {(scoringConfig.ioiVarianceWeight !== undefined ||
              scoringConfig.syncopationWeight !== undefined ||
              scoringConfig.phraseSignificanceWeight !== undefined ||
              scoringConfig.densityWeight !== undefined) && (
                <> | Factors: IOI {scoringConfig.ioiVarianceWeight ?? 0.30},
                Sync {scoringConfig.syncopationWeight ?? 0.30},
                Phrase {scoringConfig.phraseSignificanceWeight ?? 0.25},
                Density {scoringConfig.densityWeight ?? 0.15}</>
            )}
        </span>
    </div>
)}
```

**Completed**: Added `Info` icon import, used `scoringConfig` prop, and added display section showing custom scoring config info with band bias values (color-coded by band) and factor weights. Added CSS styles for the new `.composite-scoring-config-info` section.

---

## Phase 5: Documentation Updates (playlist-data-engine)

### Task 5.1: Update DATA_ENGINE_REFERENCE.md
- [x] **File**: `docs/DATA_ENGINE_REFERENCE.md`
- [x] Add `bandBiasWeights` to the `StreamScorerConfig` section:
  - Description: "Band bias multipliers applied to final section scores"
  - Type: `{ low: number; mid: number; high: number } | undefined`
  - Default: `undefined` (no bias)
  - Range: `0.0 - 2.0` (0 = never win, 1 = neutral, 2 = strongly favored)
- [x] Add `scoringConfig` to the `RhythmGenerationOptions` section:
  - Description: "Configuration for stream scoring algorithm"
  - Type: `Partial<StreamScorerConfig>`
  - Default: `undefined`

**Completed**: Added full `StreamScorerConfig` documentation including all factor weights, offbeat grid positions, and `bandBiasWeights` with type/range/description tables. Also added `scoringConfig` to `RhythmGenerator` options table.

### Task 5.2: Update BEAT_DETECTION.md
- [x] **File**: `docs/BEAT_DETECTION.md`
- [x] Add a new section explaining the band bias feature:
  - What it does: Allows manual control over which frequency bands are favored
  - When to use: When automatic selection is too bass-heavy or you want to focus on specific frequencies
- [x] Add or update an example showing `bandBiasWeights` usage:

```typescript
// Example: Favor high frequencies, reduce bass dominance
const result = await analyzer.generateRhythm('song.mp3', 'track-001', {
    difficulty: 'medium',
    outputMode: 'composite',
    scoringConfig: {
        bandBiasWeights: {
            low: 0.3,   // Reduce bass contribution (bass wins 30% as often)
            mid: 1.0,   // Neutral - no change
            high: 1.5,  // Favor high frequencies (hi-hats, cymbals)
        }
    }
});
```

- [x] Document common use cases:
  - Reducing bass dominance: `{ low: 0.5, mid: 1.0, high: 1.0 }`
  - Focusing on melody/rhythm: `{ low: 0.3, mid: 1.5, high: 1.0 }`
  - Emphasizing percussion: `{ low: 1.0, mid: 1.0, high: 1.5 }`

**Completed**: Added "Custom Scoring Configuration" subsection to the "Scoring and Composite Generation" section with:
- When to use custom scoring
- Factor weights table with parameters, defaults, ranges, and purposes
- Band bias weights table with parameters, defaults, ranges, and effects
- Visual diagram showing how bias affects band selection
- Common use cases table

Also added three new usage examples:
- "Custom Scoring with Band Bias" - basic band bias usage
- "Custom Scoring with Factor Weights" - adjusting scoring factor contributions
- "Combined Scoring Configuration" - using both factor weights and band bias together

---

## Implementation Order

- [ ] 1. **Engine Phase 1.1-1.5**: Update types and pass through config
- [ ] 2. **Engine Phase 1.6**: Add tests
- [ ] 3. **Frontend Phase 2.1-2.2**: Update types
- [ ] 4. **Frontend Phase 3.1-3.4**: Add UI controls
- [ ] 5. **Frontend Phase 4.1**: Update visualization
- [ ] 6. **Docs Phase 5.1-5.2**: Update engine documentation

---

## Testing Checklist

### Engine Tests
- [x] Band bias multiplies scores correctly
- [x] Undefined bias = no change to scores
- [x] Missing band in config defaults to 1.0
- [x] Custom factor weights are applied correctly
- [x] All unit tests pass (30 tests passing)

### Frontend Tests
- [ ] Factor weight sliders update settings
- [ ] Band bias sliders update settings
- [ ] Weight total indicator shows correct sum
- [ ] Settings pass through to generation hook
- [ ] Composite reflects customized scoring
- [ ] Reset buttons restore defaults
- [ ] Factor reset restores to 0.30/0.30/0.25/0.15
- [ ] Band bias reset restores to 1.0/1.0/1.0

### Integration Tests
- [ ] End-to-end test with custom factor weights
- [ ] End-to-end test with band bias weights
- [ ] End-to-end test with both combined

### Documentation
- [x] DATA_ENGINE_REFERENCE.md updated with all scoring parameters
- [x] BEAT_DETECTION.md updated with examples and use cases

---

## Example Usage

### Example 1: Band Bias Only
```typescript
// Favor mid and high bands, reduce bass
const generator = new RhythmGenerator({
    outputMode: 'composite',
    scoringConfig: {
        bandBiasWeights: {
            low: 0.3,   // Bass rarely wins
            mid: 1.2,   // Mid slightly favored
            high: 1.5,  // High strongly favored
        }
    }
});
```

### Example 2: Combined (Factor Weights + Band Bias)
```typescript
// Focus on syncopated high-frequency rhythms
const generator = new RhythmGenerator({
    outputMode: 'composite',
    scoringConfig: {
        // Favor syncopation and variety
        ioiVarianceWeight: 0.35,
        syncopationWeight: 0.40,
        phraseSignificanceWeight: 0.15,
        densityWeight: 0.10,

        // And bias toward high frequencies
        bandBiasWeights: {
            low: 0.2,   // Almost never use bass
            mid: 1.0,   // Neutral
            high: 1.8,  // Strongly favor high frequencies
        }
    }
});
```

---

## Files Summary

### Engine (playlist-data-engine)

| File | Change |
|------|--------|
| `src/core/analysis/beat/StreamScorer.ts` | Add bandBiasWeights to config, apply in scoreSection() |
| `src/core/generation/RhythmGenerator.ts` | Add scoringConfig option, pass to StreamScorer |
| `src/index.ts` | Export StreamScorerConfig |
| `tests/unit/beat/streamScorer.test.ts` | Add band bias and factor weight tests |

### Frontend (playlist-data-showcase)

| File | Change |
|------|--------|
| `src/types/rhythmGeneration.ts` | Add scoringConfig to AutoLevelSettings (exposes all StreamScorerConfig params) |
| `src/components/ui/AutoLevelSettings.tsx` | Add factor weight sliders + band bias sliders with reset buttons |
| `src/components/ui/AutoLevelSettings.css` | Add styles for both control sections |
| `src/hooks/useRhythmGeneration.ts` | Pass scoringConfig to engine |
| `src/components/Tabs/BeatDetectionTab/RhythmGenerationTab.tsx` | Pass scoringConfig prop |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.tsx` | Display scoring config info |

### Documentation (playlist-data-engine)

| File | Change |
|------|--------|
| `docs/DATA_ENGINE_REFERENCE.md` | Document ALL StreamScorerConfig parameters + scoringConfig in RhythmGenerationOptions |
| `docs/BEAT_DETECTION.md` | Add scoring customization section with examples for factor weights and band bias |
