# playlist-data-showcase: Arweave Default URLs Upgrade Plan

## Overview

Update the frontend to use Arweave-hosted default model URLs. **This plan assumes the backend (playlist-data-engine) has been upgraded first.**

### Prerequisites

- [ ] Backend plan completed: `ENGINE_ARWEAVE_UPGRADE_PLAN.md`
- [ ] Backend published to npm (or available via git)
- [ ] Backend exports: `SingleStepModelConfig`, `isSingleStepModel`, `DEFAULT_ARWEAVE_MODELS`

### Dependencies

```bash
# Update to the new engine version
npm install playlist-data-engine@latest
# or if using git:
# npm install github:jasondesante/playlist-data-engine#main
```

---

## Phase 1: Update Types (After Backend Ready)

**Goal**: Add frontend types to match the backend. Do NOT change behavior yet.

### 1.1 Add SingleStepModelConfig Interface

**File:** `src/hooks/useMusicClassifier.ts`

Add AFTER the existing `TwoStepModelConfig` interface (around line 28):

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
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck` or `tsc --noEmit`
- [ ] App still runs: `npm run dev`

---

### 1.2 Update TwoStepModelConfig Interface

**File:** `src/hooks/useMusicClassifier.ts`

Update the existing interface to add optional type fields:

```typescript
/**
 * Model configuration for two-step architecture.
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
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App still runs: `npm run dev`

---

### 1.3 Update UseMusicClassifierOptions Interface

**File:** `src/hooks/useMusicClassifier.ts`

Update the models type to support all three formats:

```typescript
/**
 * Extended options for the MusicClassifier hook
 */
export interface UseMusicClassifierOptions extends Partial<MusicClassifierOptions> {
    /** Model paths - can be single-step (string/object) or two-step (object) */
    models?: {
        genre?: string | SingleStepModelConfig | TwoStepModelConfig;
        mood?: string | SingleStepModelConfig | TwoStepModelConfig;
        danceability?: string | SingleStepModelConfig | TwoStepModelConfig;
        voice?: string | SingleStepModelConfig | TwoStepModelConfig;
        acoustic?: string | SingleStepModelConfig | TwoStepModelConfig;
    };
}
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App still runs: `npm run dev`
- [ ] Test: Analyze a track - should still work with local models

---

## Phase 2: Test with Local Models (Object Format)

**Goal**: Verify the new object format works with local models BEFORE switching to Arweave.

### 2.1 Update DEFAULT_CLASSIFIER_OPTIONS - Genre Only

**File:** `src/hooks/useMusicClassifier.ts`

Convert ONLY the genre model to object format with explicit types:

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        // Genre: Convert to object format with explicit types
        genre: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/genre_discogs400/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        // Mood: Keep existing format (unchanged)
        mood: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/mtg_jamendo_moodtheme/model.json'
        },
        // Danceability: Keep existing format (unchanged)
        danceability: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
    }
};
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test genre analysis with a sample track
- [ ] Verify genres are returned correctly
- [ ] Check console for any errors

**If genre analysis breaks**: ROLLBACK this change and investigate.

---

### 2.2 Update DEFAULT_CLASSIFIER_OPTIONS - Mood

**File:** `src/hooks/useMusicClassifier.ts`

Convert mood model to object format:

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        genre: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/genre_discogs400/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        // Mood: Convert to object format with explicit type
        mood: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/mtg_jamendo_moodtheme/model.json',
            embeddingType: 'effnet'
        },
        danceability: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
    }
};
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test mood analysis
- [ ] Verify moods are returned correctly

**If mood analysis breaks**: ROLLBACK this change and investigate.

---

### 2.3 Update DEFAULT_CLASSIFIER_OPTIONS - Danceability

**File:** `src/hooks/useMusicClassifier.ts`

Convert danceability to SingleStepModelConfig format:

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        genre: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/genre_discogs400/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        mood: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/mtg_jamendo_moodtheme/model.json',
            embeddingType: 'effnet'
        },
        // Danceability: Convert to object format
        danceability: {
            modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            modelType: 'musicnn'
        },
    }
};
```

**Validation:**
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test danceability analysis
- [ ] Verify danceability score is returned

**If danceability breaks**: ROLLBACK this change and investigate.

---

### 2.4 Full Integration Test with Local Models

At this point, all models use the new object format but with LOCAL URLs.

**Validation:**
- [ ] Full analysis works (genre + mood + danceability)
- [ ] No console errors
- [ ] Results match previous behavior
- [ ] Performance is acceptable

**Only proceed to Phase 3 if Phase 2 is 100% working.**

---

## Phase 3: Switch to Arweave URLs

**Goal**: Replace local model URLs with Arweave URLs one at a time.

### 3.1 Switch Genre to Arweave

**File:** `src/hooks/useMusicClassifier.ts`

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        // Genre: Switch to Arweave URLs
        genre: {
            embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
            classifier: 'https://arweave.net/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        // Mood: Still local
        mood: {
            embedding: '/models/discogs-effnet-bs64-1-tfjs-browser-frozen/model.json',
            classifier: '/models/mtg_jamendo_moodtheme/model.json',
            embeddingType: 'effnet'
        },
        // Danceability: Already remote
        danceability: {
            modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            modelType: 'musicnn'
        },
    }
};
```

**Note**: Replace with actual Arweave URLs from backend's `DEFAULT_ARWEAVE_MODELS`.

**Validation:**
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test genre analysis
- [ ] First load will be slower (model download from Arweave)
- [ ] Verify genres are returned correctly
- [ ] Check network tab for Arweave requests

**If genre analysis breaks**:
1. Check browser console for CORS errors
2. Verify Arweave URLs are correct
3. ROLLBACK to local URLs if needed

---

### 3.2 Switch Mood to Arweave

**File:** `src/hooks/useMusicClassifier.ts`

```typescript
const DEFAULT_CLASSIFIER_OPTIONS: UseMusicClassifierOptions = {
    topN: 10,
    threshold: 0.05,
    models: {
        genre: {
            embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
            classifier: 'https://arweave.net/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
            embeddingType: 'effnet',
            classifierType: 'discogs400'
        },
        // Mood: Switch to Arweave URLs
        mood: {
            embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
            classifier: 'https://arweave.net/BUXf3AoFuIsrNDkV2hW6BhiwSVTuFllWOUQv5mu6qQ8/model.json',
            embeddingType: 'effnet'
        },
        danceability: {
            modelUrl: 'https://turbo-gateway.com/nX9KX1OVhEaT1dStNcsRiZKCQTWuHjAMl4MWprIFyZU/model.json',
            modelType: 'musicnn'
        },
    }
};
```

**Validation:**
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test mood analysis
- [ ] Verify moods are returned correctly

---

### 3.3 Switch Danceability to Arweave (if using local)

**File:** `src/hooks/useMusicClassifier.ts`

```typescript
danceability: {
    modelUrl: 'https://arweave.net/kUIS-Xxr4k3MZ4K2gHdvMgZxK7aBYce_FPGIkGA_hjM/model.json',
    modelType: 'musicnn'
},
```

**Validation:**
- [ ] App runs: `npm run dev`
- [ ] **CRITICAL**: Test danceability analysis
- [ ] Verify danceability score is returned

---

## Phase 4: Add Model Presets (Optional Enhancement)

**Goal**: Uncomment and update the MODEL_PRESETS constant for easy model switching.

### 4.1 Uncomment and Update MODEL_PRESETS

**File:** `src/hooks/useMusicClassifier.ts`

Uncomment the existing `MODEL_PRESETS` block (lines 77-163) and ensure it uses the new format:

```typescript
export const MODEL_PRESETS = {
    genre: {
        discogs400: {
            label: 'Discogs 400',
            description: '400 genres (two-step)',
            config: {
                embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
                embeddingType: 'effnet' as const,
                classifier: 'https://arweave.net/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
                classifierType: 'discogs400' as const
            }
        },
        jamendo: {
            label: 'Jamendo',
            description: '80+ genres (two-step)',
            config: {
                embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
                embeddingType: 'effnet' as const,
                classifier: 'https://arweave.net/MuhF5mek1BJPZLoPNY1TBTPUUBEXbVmMfAGgBp-_MyA/model.json',
                classifierType: 'jamendo' as const
            }
        },
        // ... other presets
    },
    // ... mood and danceability presets
} as const;
```

**Validation:**
- [ ] TypeScript compiles
- [ ] App runs
- [ ] Presets are importable from the hook

---

## Phase 5: Remove Legacy Support (Future)

**Goal**: After confirming everything works, remove string support from types.

**This is a BREAKING CHANGE and should only be done in a major version.**

### 5.1 Update UseMusicClassifierOptions

Remove `string` from the union type:

```typescript
models?: {
    genre?: SingleStepModelConfig | TwoStepModelConfig;
    mood?: SingleStepModelConfig | TwoStepModelConfig;
    danceability?: SingleStepModelConfig | TwoStepModelConfig;
    voice?: SingleStepModelConfig | TwoStepModelConfig;
    acoustic?: SingleStepModelConfig | TwoStepModelConfig;
};
```

**Validation:**
- [ ] TypeScript compiles
- [ ] All existing usage still works (no strings being passed)

---

## Final Checklist

- [ ] All three analyses work (genre, mood, danceability)
- [ ] All models load from Arweave URLs
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] TypeScript compiles without errors
- [ ] App builds successfully: `npm run build`

---

## Rollback Plan

Each phase is designed to be independently rollback-able:

1. **Phase 2 issues**: Revert to original `DEFAULT_CLASSIFIER_OPTIONS`
2. **Phase 3 issues**: Switch specific model back to local URL
3. **Complete failure**: Revert to previous engine version

```bash
# Emergency rollback to previous engine
npm install playlist-data-engine@<previous-version>
```

---

## Debugging Tips

### If genre analysis fails:

1. **Check browser console** for errors
2. **Check Network tab** for failed model loads (404, CORS)
3. **Verify URL format** - Arweave URLs should be `https://arweave.net/<txid>/model.json`
4. **Test URL directly** - Open the model.json URL in browser

### If type errors occur:

1. Ensure engine version is updated
2. Check that engine exports the new types
3. Run `npm run typecheck` to see specific errors

### If CORS errors:

1. Verify Arweave gateway supports CORS
2. Try alternative gateway: `https://arweave.net/` vs `https://turbo-gateway.com/`
