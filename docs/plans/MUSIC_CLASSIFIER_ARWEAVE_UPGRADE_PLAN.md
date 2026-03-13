# MusicClassifier Arweave Default URLs Upgrade Plan

> **⚠️ SUPERSEDED**: This plan has been split into two separate plans for safer implementation:
>
> - **Backend**: [ENGINE_ARWEAVE_UPGRADE_PLAN.md](./ENGINE_ARWEAVE_UPGRADE_PLAN.md)
> - **Frontend**: [SHOWCASE_ARWEAVE_UPGRADE_PLAN.md](./SHOWCASE_ARWEAVE_UPGRADE_PLAN.md)
>
> The split plans include:
> - Baby-step validation at each phase
> - Non-breaking changes with backward compatibility
> - Clear handoff points between backend and frontend
> - Rollback instructions for each phase
>
> **This document is kept for reference only.**

---

## Original Overview

Upgrade the MusicClassifier to use Arweave-hosted default model URLs with explicit type parameters. This enables the classifier to work out-of-the-box with publicly hosted models while maintaining support for custom model paths.

### Goals

1. **Default to Arweave URLs**: Replace local file paths with publicly accessible Arweave URLs
2. **Always analyze**: Never skip genre, mood, or danceability analysis - use defaults if custom paths aren't provided
3. **Explicit type parameters**: Add `modelType` for single-step and `embeddingType`/`classifierType` for two-step to handle Arweave URLs that don't contain identifying keywords

### Key Design Decisions

- **Single-step models** use an object with `modelUrl` and `modelType` (not just a string)
- **Two-step models** use an object with `embedding`, `classifier`, and optional type params
- **Discriminated union**: Type guards detect which config type based on presence of `modelUrl` vs `embedding`+`classifier`
- **Mood and danceability have fixed types** - no detection needed
- **Only genre needs `classifierType`** since it can vary (discogs400, jamendo, tzanetakis, mtt_musicnn)

---

## Phase 1: playlist-data-engine Core Changes

### 1.1 Create SingleStepModelConfig Interface

- [ ] Add new `SingleStepModelConfig` interface
  - `modelUrl: string` - URL to the model
  - `modelType: ModelArchitecture` - Explicit architecture type
  - `labels?: string[]` - Optional custom labels override

**File:** `src/core/analysis/MusicClassifier.ts`

```typescript
/**
 * Configuration for single-step model architecture where one model
 * handles feature extraction and classification internally.
 */
export interface SingleStepModelConfig {
    /** URL to the model file */
    modelUrl: string;
    /** Explicit model architecture type (overrides URL detection) */
    modelType: ModelArchitecture;
    /** Optional custom labels for model output */
    labels?: string[];
}
```

### 1.2 Update TwoStepModelConfig Interface

- [ ] Add `embeddingType` parameter (optional, for when URL doesn't contain keywords)
- [ ] Add `classifierType` parameter (optional, only needed for genre models)

**File:** `src/core/analysis/MusicClassifier.ts` (lines 36-43)

```typescript
/**
 * Configuration for two-step model architecture where embedding
 * and classifier models are separate files.
 */
export interface TwoStepModelConfig {
    /** URL to the embedding model (e.g., discogs-effnet-bs64-1.json) */
    embedding: string;
    /** URL to the classifier model that operates on embeddings */
    classifier: string;
    /** Optional custom labels for classifier output */
    labels?: string[];
    /** Explicit embedding architecture type (overrides URL detection) */
    embeddingType?: ModelArchitecture;
    /** Explicit classifier type for genre models (overrides URL detection) */
    classifierType?: GenreListType;
}
```

### 1.3 Update ModelConfig Union Type

- [ ] Change `ModelConfig` to be a union of single-step and two-step configs
- [ ] Remove plain string from the union (use `SingleStepModelConfig` instead)

**File:** `src/core/analysis/MusicClassifier.ts` (line 60)

```typescript
/**
 * Model configuration that accepts either:
 * - SingleStepModelConfig: One model handles everything (has modelUrl)
 * - TwoStepModelConfig: Separate embedding + classifier models (has embedding + classifier)
 */
export type ModelConfig = SingleStepModelConfig | TwoStepModelConfig;
```

### 1.4 Add Type Guards

- [ ] Add `isSingleStepModel()` type guard
- [ ] Update `isTwoStepModel()` type guard (already exists)

**File:** `src/core/analysis/MusicClassifier.ts`

```typescript
/**
 * Type guard to check if a model config is a single-step configuration.
 */
export function isSingleStepModel(config: ModelConfig): config is SingleStepModelConfig {
    return typeof config === 'object' && config !== null && 'modelUrl' in config;
}

/**
 * Type guard to check if a model config is a two-step configuration.
 */
export function isTwoStepModel(config: ModelConfig): config is TwoStepModelConfig {
    return typeof config === 'object' && config !== null &&
        'embedding' in config && 'classifier' in config;
}
```

### 1.5 Update Detection Functions

- [ ] Modify `detectModelArchitecture()` to accept optional explicit type
- [ ] Modify `detectGenreListType()` to accept optional explicit type

**File:** `src/core/analysis/MusicClassifier.ts`

```typescript
export function detectModelArchitecture(
    modelUrl: string,
    explicitType?: ModelArchitecture
): ModelArchitecture {
    // Use explicit type if provided
    if (explicitType) return explicitType;

    // Fall back to URL parsing
    const url = modelUrl.toLowerCase();
    if (url.includes('effnet') || url.includes('discogs')) return 'effnet';
    if (url.includes('vggish')) return 'vggish';
    if (url.includes('tempocnn') || (url.includes('tempo') && !url.includes('temple'))) return 'tempocnn';
    return 'musicnn';
}

export function detectGenreListType(
    modelUrl: string,
    explicitType?: GenreListType
): GenreListType {
    // Use explicit type if provided
    if (explicitType) return explicitType;

    // Fall back to URL parsing
    const url = modelUrl.toLowerCase();
    if (url.includes('jamendo')) return 'jamendo';
    if (url.includes('discogs400') || url.includes('discogs')) return 'discogs400';
    if (url.includes('tzanetakis')) return 'tzanetakis';
    if (url.includes('mtt_musicnn')) return 'mtt_musicnn';
    return 'jamendo';
}
```

### 1.6 Define Default Arweave URLs

- [ ] Create constants for default model configurations

**File:** `src/core/analysis/MusicClassifier.ts`

```typescript
/**
 * Default model configurations using Arweave-hosted models.
 * These work out-of-the-box without any local model files.
 */
const DEFAULT_MODELS = {
    genre: {
        embedding: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        classifier: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        embeddingType: 'effnet' as ModelArchitecture,
        classifierType: 'discogs400' as GenreListType
    },
    mood: {
        embedding: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        classifier: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        embeddingType: 'effnet' as ModelArchitecture
        // classifierType not needed - mood always uses jamendo labels
    },
    danceability: {
        modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
        modelType: 'musicnn' as ModelArchitecture
        // Always uses danceability-musicnn-msd-2, fixed labels
    }
};
```

### 1.7 Update Constructor

- [ ] Merge user options with Arweave defaults
- [ ] Ensure genre, mood, danceability are always configured

**File:** `src/core/analysis/MusicClassifier.ts` (lines 739-763)

```typescript
constructor(options: MusicClassifierOptions = {}) {
    // Start with defaults, then merge user overrides
    const defaultModels = {
        genre: DEFAULT_MODELS.genre,
        mood: DEFAULT_MODELS.mood,
        danceability: DEFAULT_MODELS.danceability
    };

    // Merge: user can override specific models while keeping defaults for others
    const mergedModels = {
        ...defaultModels,
        ...options.models
    };

    this.options = {
        models: mergedModels,
        topN: 5,
        threshold: 0.05,
        cacheEmbeddings: true,
        ...options,
        models: mergedModels  // Ensure merged models take precedence
    };
}
```

### 1.8 Update analyze() Method

- [ ] Remove conditional checks - always run genre, mood, danceability
- [ ] Update to handle new `SingleStepModelConfig` format

**File:** `src/core/analysis/MusicClassifier.ts` (lines 1034-1163)

```typescript
async analyze(audioUrl: string): Promise<MusicClassificationProfile> {
    // ... audio loading code ...

    const modelsUsed: string[] = [];
    const results: Partial<MusicClassificationProfile> = {
        genres: [],
        moods: [],
        mood_tags: [],
        vibe_metrics: {}
    };

    // 1. Analyze Genre (always runs with defaults)
    const genreConfig = this.options.models!.genre!;
    const genreModelUrl = isTwoStepModel(genreConfig)
        ? genreConfig.classifier
        : genreConfig.modelUrl;
    const genreType = isTwoStepModel(genreConfig)
        ? genreConfig.classifierType
        : undefined;
    const genreLabels = getGenreLabels(detectGenreListType(genreModelUrl, genreType));

    results.genres = await this.runModelPrediction(genreConfig, audioSignal, genreLabels);
    results.primary_genre = results.genres.length > 0 ? results.genres[0].name : "Unknown";
    modelsUsed.push(formatModelForMetadata(genreConfig));

    // 2. Analyze Mood (always runs with defaults)
    const moodConfig = this.options.models!.mood!;
    results.moods = await this.runModelPrediction(moodConfig, audioSignal, JAMENDO_MOODS);
    results.mood_tags = results.moods.slice(0, 3).map(m => m.name);
    modelsUsed.push(formatModelForMetadata(moodConfig));

    // 3. Analyze Danceability (always runs with defaults)
    const danceConfig = this.options.models!.danceability!;
    const danceTags = await this.runModelPrediction(danceConfig, audioSignal, DANCEABILITY_LABELS);
    const danceableTag = danceTags.find(tag => tag.name === 'danceable');
    results.vibe_metrics!.danceability = danceableTag?.confidence ?? 0;
    modelsUsed.push(formatModelForMetadata(danceConfig));

    // ... rest of method ...
}
```

### 1.9 Update runModelPrediction()

- [ ] Handle `SingleStepModelConfig` in addition to `TwoStepModelConfig`
- [ ] Use `modelType` from single-step config

**File:** `src/core/analysis/MusicClassifier.ts` (lines 1549-1568)

```typescript
private async runModelPrediction(
    config: ModelConfig,
    audioSignal: Float32Array,
    labels: string[]
): Promise<ClassificationTag[]> {
    let predictions: number[];

    if (isTwoStepModel(config)) {
        // Two-step architecture: embedding model + classifier
        predictions = await this.predictWithTwoStepModel(config, audioSignal);
    } else if (isSingleStepModel(config)) {
        // Single-step architecture: one model does it all
        const architecture = detectModelArchitecture(config.modelUrl, config.modelType);
        const features = this.getFeaturesForArchitecture(audioSignal, architecture);
        predictions = await this.predictWithModel(config.modelUrl, features);
    } else {
        throw new Error('Invalid model configuration');
    }

    return this.mapPredictions(predictions, labels);
}
```

### 1.10 Update predictWithTwoStepModel()

- [ ] Pass `embeddingType` to architecture detection
- [ ] Pass `classifierType` to genre list detection (when applicable)

**File:** `src/core/analysis/MusicClassifier.ts` (lines 1229-1272)

```typescript
private async predictWithTwoStepModel(
    config: TwoStepModelConfig,
    audioSignal: Float32Array
): Promise<number[]> {
    // Step 1: Detect embedding architecture (use explicit type if provided)
    const architecture = detectModelArchitecture(config.embedding, config.embeddingType);

    // Step 2: Get architecture-specific features
    const features = this.getFeaturesForArchitecture(audioSignal, architecture);

    // ... rest of method unchanged ...
}
```

### 1.11 Update formatModelForMetadata()

- [ ] Handle `SingleStepModelConfig` format

**File:** `src/core/analysis/MusicClassifier.ts` (lines 658-663)

```typescript
export function formatModelForMetadata(config: ModelConfig): string {
    if (isTwoStepModel(config)) {
        return `${config.embedding} -> ${config.classifier}`;
    }
    if (isSingleStepModel(config)) {
        return config.modelUrl;
    }
    return String(config);
}
```

---

## Phase 2: playlist-data-engine Documentation

### 2.1 Update DATA_ENGINE_REFERENCE.md

- [ ] Update `ModelConfig` type documentation (around line 1316)
- [ ] Add `SingleStepModelConfig` interface documentation
- [ ] Update `TwoStepModelConfig` interface documentation with new params
- [ ] Update "Default Configuration" table with Arweave URLs
- [ ] Update "Architecture Detection" section to mention explicit type override
- [ ] Add examples using Arweave URLs with explicit types

**New documentation structure:**

```typescript
// Single-step configuration (one model)
interface SingleStepModelConfig {
    modelUrl: string;       // URL to the model
    modelType?: ModelArchitecture;  // Explicit type (optional, overrides URL detection)
    labels?: string[];      // Optional custom labels
}

// Two-step configuration (embedding + classifier)
interface TwoStepModelConfig {
    embedding: string;      // URL to embedding model
    classifier: string;     // URL to classifier model
    labels?: string[];      // Optional custom labels
    embeddingType?: ModelArchitecture;  // Explicit embedding type
    classifierType?: GenreListType;     // Explicit genre list type (for genre models)
}

// Union type
type ModelConfig = SingleStepModelConfig | TwoStepModelConfig;
```

### 2.2 Update docs/AUDIO_ANALYSIS.md

- [ ] Add `SingleStepModelConfig` to documentation
- [ ] Update "Model Configuration Formats" section
- [ ] Update examples to show new object format for single-step
- [ ] Add Arweave URL example

---

## Phase 3: playlist-data-showcase Updates

### 3.1 Update useMusicClassifier.ts Interfaces

- [ ] Add `SingleStepModelConfig` interface
- [ ] Update `TwoStepModelConfig` interface
- [ ] Update `ModelConfig` type

**File:** `src/hooks/useMusicClassifier.ts` (lines 24-42)

```typescript
/**
 * Configuration for single-step model architecture.
 */
export interface SingleStepModelConfig {
    /** URL to the model file */
    modelUrl: string;
    /** Explicit model architecture type */
    modelType: 'effnet' | 'vggish' | 'musicnn' | 'tempocnn';
    /** Optional custom labels */
    labels?: string[];
}

/**
 * Configuration for two-step model architecture.
 */
export interface TwoStepModelConfig {
    /** URL to the embedding model */
    embedding: string;
    /** URL to the classifier model */
    classifier: string;
    /** Optional custom labels */
    labels?: string[];
    /** Explicit embedding architecture type */
    embeddingType?: 'effnet' | 'vggish' | 'musicnn' | 'tempocnn';
    /** Explicit classifier type for genre models */
    classifierType?: 'jamendo' | 'discogs400' | 'tzanetakis' | 'mtt_musicnn';
}

/**
 * Model configuration - single or two-step.
 */
export type ModelConfig = SingleStepModelConfig | TwoStepModelConfig;
```

### 3.2 Update Default Options

- [ ] Update `DEFAULT_CLASSIFIER_OPTIONS` with Arweave URLs and explicit types

**File:** `src/hooks/useMusicClassifier.ts` (lines 48-73)

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        genre: {
            embedding: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            classifier: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        mood: {
            embedding: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            classifier: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            embeddingType: 'effnet'
        },
        danceability: {
            modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            modelType: 'musicnn'
        }
    }
};
```

### 3.3 Update ModelsConfig Interface

- [ ] Update to use new `ModelConfig` type

**File:** `src/hooks/useMusicClassifier.ts`

```typescript
export interface UseMusicClassifierOptions extends Partial<MusicClassifierOptions> {
    models?: {
        genre?: ModelConfig;
        mood?: ModelConfig;
        danceability?: ModelConfig;
        voice?: ModelConfig;
        acoustic?: ModelConfig;
    };
}
```

---

## Phase 4: Testing & Validation

### 4.1 Unit Tests

- [ ] Test `isSingleStepModel()` type guard
- [ ] Test `isTwoStepModel()` type guard
- [ ] Test `detectModelArchitecture()` with explicit type parameter
- [ ] Test `detectGenreListType()` with explicit type parameter
- [ ] Test that explicit types override URL detection
- [ ] Test default model configuration is applied correctly
- [ ] Test user override of specific models preserves defaults for others

### 4.2 Integration Tests

- [ ] Test end-to-end analysis with Arweave URLs
- [ ] Test that all three analyses (genre, mood, danceability) run by default
- [ ] Test partial override (e.g., custom genre, default mood/danceability)
- [ ] Test with slow network (Arweave can be slow)

### 4.3 Browser Testing

- [ ] Test model loading from Arweave in browser
- [ ] Test CORS headers on Arweave URLs
- [ ] Test caching behavior across multiple analyses

---

## Default Model Summary

| Analysis | Type | Embedding URL | Classifier URL | Types |
|----------|------|---------------|----------------|-------|
| **Genre** | Two-step | `turbo-gateway.com/...` | `turbo-gateway.com/...` | `effnet`, `discogs400` |
| **Mood** | Two-step | `turbo-gateway.com/...` | `turbo-gateway.com/...` | `effnet` (jamendo fixed) |
| **Danceability** | Single-step | `turbo-gateway.com/...` | N/A | `musicnn` (fixed) |

**Note:** All URLs currently use the same placeholder. Replace with actual model URLs once uploaded to Arweave.

---

## Dependencies

| Dependency | Description |
|------------|-------------|
| Arweave URLs | Need actual transaction IDs for each model |
| CORS | Verify Arweave URLs have correct CORS headers |
| playlist-data-engine | Must be updated and published first |
| playlist-data-showcase | Depends on updated engine |

---

## Implementation Order

1. Phase 1: Core engine changes (interfaces, detection, defaults)
2. Phase 2: Documentation updates
3. Phase 3: Showcase updates
4. Phase 4: Testing
5. Replace placeholder URLs with actual Arweave URLs
6. Publish engine update
7. Update showcase to use new engine version

---

## Questions/Unknowns

1. ~~Should danceability use two-step format?~~ **No, single-step with object format**
2. ~~Do mood/danceability need type detection?~~ **No, fixed types**
3. **Actual Arweave URLs**: User will provide once models are uploaded

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1 | 11 subtasks | Medium |
| Phase 2 | 2 files | Low |
| Phase 3 | 3 subtasks | Low |
| Phase 4 | 3 categories | Medium |
