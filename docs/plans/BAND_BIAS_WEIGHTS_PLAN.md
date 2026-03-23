# Band Bias Weights Implementation Plan

## Overview

Add the ability to bias the composite stream scoring toward specific frequency bands (low/mid/high). This allows users to control which band gets preference when generating the composite rhythm stream.

## Problem Statement

Currently, the composite stream selection is purely merit-based using 4 scoring factors:
- IOI Variance (30%) - rhythmic variety
- Syncopation (30%) - offbeat emphasis
- Phrase Significance (25%) - pattern detection
- Density (15%) - note count (bell curve)

If the bass band wins 70% of sections, it's because it scores highest on these factors. There's no way to manually bias the selection.

## Proposed Solution

Add `bandBiasWeights` as multipliers on the final score:
- `1.0` = no bias (default)
- `> 1.0` = favor this band
- `< 1.0` = disfavor this band

Example: To reduce bass dominance, set `{ low: 0.5, mid: 1.0, high: 1.0 }`

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
- [ ] **File**: `src/core/analysis/beat/StreamScorer.ts`
- [ ] Modify the `scoreSection()` method to apply band bias:

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
- [ ] **File**: `src/core/generation/RhythmGenerator.ts`
- [ ] Add scoring configuration option:

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
- [ ] **File**: `src/core/generation/RhythmGenerator.ts`
- [ ] Update the constructor to pass scoring config:

```typescript
constructor(options: RhythmGenerationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // ... other initializations ...

    // NEW: Pass scoring config to StreamScorer
    this.streamScorer = new StreamScorer(this.options.scoringConfig);
}
```

### Task 1.5: Export New Types
- [ ] **File**: `src/index.ts`
- [ ] Ensure `StreamScorerConfig` is exported:

```typescript
export {
    // ... existing exports ...
    StreamScorer,
    type StreamScorerConfig,
    type StreamScoringResult,
    // ...
} from './core/analysis/beat/StreamScorer.js';
```

### Task 1.6: Add Tests
- [ ] **File**: `tests/unit/beat/streamScorer.test.ts`
- [ ] Add tests for band bias:

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

---

## Phase 2: Frontend Type Updates (playlist-data-showcase)

### Task 2.1: Import StreamScorerConfig Type
- [ ] **File**: `src/types/rhythmGeneration.ts`
- [ ] Add import and re-export:

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

### Task 2.2: Update AutoLevelSettings Interface
- [ ] **File**: `src/types/rhythmGeneration.ts`
- [ ] Add scoring config to settings:

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

    // NEW: Band bias weights
    bandBiasWeights?: {
        low: number;
        mid: number;
        high: number;
    };
}
```

- [ ] Update defaults:

```typescript
export const DEFAULT_AUTO_LEVEL_SETTINGS: AutoLevelSettings = {
    // ... existing defaults ...
    bandBiasWeights: undefined, // NEW
};
```

---

## Phase 3: Frontend UI Updates

### Task 3.1: Add Band Bias UI to AutoLevelSettings
- [ ] **File**: `src/components/ui/AutoLevelSettings.tsx`
- [ ] Add a collapsible "Band Preference" section with sliders:

```tsx
<CollapsibleSection
    title="Band Preference"
    subtitle="Control which frequency bands are favored"
    collapsed={!showAdvanced}
    onCollapsedChange={setShowAdvanced}
>
    <div className="band-bias-controls">
        <div className="band-bias-row">
            <label>Low (Bass)</label>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.bandBiasWeights?.low ?? 1.0}
                onChange={(e) => handleBandBiasChange('low', parseFloat(e.target.value))}
            />
            <span>{(settings.bandBiasWeights?.low ?? 1.0).toFixed(1)}</span>
        </div>
        <div className="band-bias-row">
            <label>Mid</label>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.bandBiasWeights?.mid ?? 1.0}
                onChange={(e) => handleBandBiasChange('mid', parseFloat(e.target.value))}
            />
            <span>{(settings.bandBiasWeights?.mid ?? 1.0).toFixed(1)}</span>
        </div>
        <div className="band-bias-row">
            <label>High</label>
            <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.bandBiasWeights?.high ?? 1.0}
                onChange={(e) => handleBandBiasChange('high', parseFloat(e.target.value))}
            />
            <span>{(settings.bandBiasWeights?.high ?? 1.0).toFixed(1)}</span>
        </div>
        <button onClick={resetBandBias} className="reset-button">
            Reset to Equal
        </button>
    </div>
</CollapsibleSection>
```

### Task 3.2: Add Band Bias Styles
- [ ] **File**: `src/components/ui/AutoLevelSettings.css`
- [ ] Add slider styles:

```css
.band-bias-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--color-surface-elevated);
    border-radius: 8px;
}

.band-bias-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.band-bias-row label {
    width: 80px;
    font-weight: 500;
}

.band-bias-row input[type="range"] {
    flex: 1;
}

.band-bias-row span {
    width: 40px;
    text-align: right;
    font-family: monospace;
}

.reset-button {
    align-self: flex-end;
    padding: 4px 12px;
    font-size: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
}
```

### Task 3.3: Pass Band Bias to Rhythm Generation
- [ ] **File**: `src/hooks/useRhythmGeneration.ts`
- [ ] Update the generate function to pass scoring config:

```typescript
const generatorOptions: RhythmGenerationOptions = {
    difficulty: options?.difficulty ?? 'medium',
    outputMode: options?.outputMode ?? 'composite',
    minimumTransientIntensity: options?.minimumTransientIntensity ?? 0.2,
    transientConfig: options?.transientConfig,
    densityValidation: options?.densityValidation,

    // NEW: Pass band bias weights
    scoringConfig: options?.bandBiasWeights ? {
        bandBiasWeights: options.bandBiasWeights
    } : undefined,
};
```

### Task 3.4: Update RhythmGenerationTab Props
- [ ] **File**: `src/components/Tabs/BeatDetectionTab/RhythmGenerationTab.tsx`
- [ ] Add bandBiasWeights to props and pass through:

```typescript
interface RhythmGenerationTabProps {
    // ... existing props ...
    bandBiasWeights?: { low: number; mid: number; high: number };
}
```

---

## Phase 4: CompositeStreamPanel Visualization
### Task 4.1: Display Band Bias Info
- [ ] **File**: `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.tsx`
- [ ] Add a note showing if band bias was applied:

```tsx
{bandBiasWeights && (
    <div className="band-bias-info">
        <Info size={14} />
        <span>
            Band bias applied:
            Low {bandBiasWeights.low.toFixed(1)}x |
            Mid {bandBiasWeights.mid.toFixed(1)}x |
            High {bandBiasWeights.high.toFixed(1)}x
        </span>
    </div>
)}
```

---

## Phase 5: Documentation Updates (playlist-data-engine)

### Task 5.1: Update DATA_ENGINE_REFERENCE.md
- [ ] **File**: `docs/DATA_ENGINE_REFERENCE.md`
- [ ] Add `bandBiasWeights` to the `StreamScorerConfig` section:
  - Description: "Band bias multipliers applied to final section scores"
  - Type: `{ low: number; mid: number; high: number } | undefined`
  - Default: `undefined` (no bias)
  - Range: `0.0 - 2.0` (0 = never win, 1 = neutral, 2 = strongly favored)
- [ ] Add `scoringConfig` to the `RhythmGenerationOptions` section:
  - Description: "Configuration for stream scoring algorithm"
  - Type: `Partial<StreamScorerConfig>`
  - Default: `undefined`

### Task 5.2: Update BEAT_DETECTION.md
- [ ] **File**: `docs/BEAT_DETECTION.md`
- [ ] Add a new section explaining the band bias feature:
  - What it does: Allows manual control over which frequency bands are favored
  - When to use: When automatic selection is too bass-heavy or you want to focus on specific frequencies
- [ ] Add or update an example showing `bandBiasWeights` usage:

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

- [ ] Document common use cases:
  - Reducing bass dominance: `{ low: 0.5, mid: 1.0, high: 1.0 }`
  - Focusing on melody/rhythm: `{ low: 0.3, mid: 1.5, high: 1.0 }`
  - Emphasizing percussion: `{ low: 1.0, mid: 1.0, high: 1.5 }`

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

- [ ] Engine: Band bias multiplies scores correctly
- [ ] Engine: Undefined bias = no change to scores
- [ ] Engine: Missing band in config defaults to 1.0
- [ ] Engine: All unit tests pass
- [ ] Frontend: UI sliders update settings
- [ ] Frontend: Settings pass through to generation
- [ ] Frontend: Composite reflects biased band selection
- [ ] Frontend: Reset button restores equal weights
- [ ] Integration: End-to-end test with biased weights
- [ ] Docs: DATA_ENGINE_REFERENCE.md updated with new parameters
- [ ] Docs: BEAT_DETECTION.md updated with example and use cases

---

## Example Usage

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

---

## Files Summary

### Engine (playlist-data-engine)

| File | Change |
|------|--------|
| `src/core/analysis/beat/StreamScorer.ts` | Add bandBiasWeights to config, apply in scoreSection() |
| `src/core/generation/RhythmGenerator.ts` | Add scoringConfig option, pass to StreamScorer |
| `src/index.ts` | Export StreamScorerConfig |
| `tests/unit/beat/streamScorer.test.ts` | Add band bias tests |

### Frontend (playlist-data-showcase)

| File | Change |
|------|--------|
| `src/types/rhythmGeneration.ts` | Add bandBiasWeights to AutoLevelSettings |
| `src/components/ui/AutoLevelSettings.tsx` | Add band bias sliders |
| `src/components/ui/AutoLevelSettings.css` | Add slider styles |
| `src/hooks/useRhythmGeneration.ts` | Pass bandBiasWeights to engine |
| `src/components/Tabs/BeatDetectionTab/RhythmGenerationTab.tsx` | Pass bandBiasWeights prop |
| `src/components/ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel.tsx` | Display bias info |

### Documentation (playlist-data-engine)

| File | Change |
|------|--------|
| `docs/DATA_ENGINE_REFERENCE.md` | Document bandBiasWeights in StreamScorerConfig and scoringConfig in RhythmGenerationOptions |
| `docs/BEAT_DETECTION.md` | Add band bias section with examples and use cases |
