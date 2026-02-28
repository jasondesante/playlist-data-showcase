/**
 * Beat Detection Store
 *
 * Manages state for the beat detection feature including:
 * - Beat map generation and caching
 * - Practice mode state
 * - Tap accuracy history
 *
 * Uses zustand with persist middleware for localStorage caching of beat maps.
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
    BeatMap,
    BeatMapGeneratorOptions,
    BeatMapGenerationProgress,
    ButtonPressResult,
} from '@/types';
import { BeatMapGenerator } from 'playlist-data-engine';

/**
 * TapResult extends ButtonPressResult with additional metadata for history tracking.
 */
export interface TapResult extends ButtonPressResult {
    /** Timestamp when the tap occurred (audio context time) */
    tappedAt: number;
    /** Index of the tap in the session */
    tapIndex: number;
}

/**
 * Default options for beat map generation.
 * Matches the engine's defaults.
 */
const DEFAULT_GENERATOR_OPTIONS: BeatMapGeneratorOptions = {
    minBpm: 60,
    maxBpm: 180,
    sensitivity: 1.0,  // Pre-processing sensitivity (0.1-10.0)
    filter: 0.0,       // Post-processing grid-alignment filter (0.0-1.0)
    noiseFloorThreshold: 0.1,
    hopSizeMs: 10,
    fftSize: 2048,
    rollingBpmWindowSize: 8,
    dpAlpha: 680,
    melBands: 40,
    highPassCutoff: 0.4,
    gaussianSmoothMs: 20,
    tempoCenter: 0.5,
    tempoWidth: 1.4,
};

/**
 * Maximum number of beat maps to cache before automatic eviction.
 * This prevents unbounded memory/storage growth for users who analyze many tracks.
 */
const MAX_CACHED_BEAT_MAPS = 20;

/**
 * Number of old caches to remove when the limit is reached.
 */
const EVICTION_COUNT = 5;

interface BeatDetectionState {
    /** The currently loaded beat map (or null if none) */
    beatMap: BeatMap | null;
    /** Whether beat map generation is in progress */
    isGenerating: boolean;
    /** Current generation progress (null when not generating) */
    generationProgress: BeatMapGenerationProgress | null;
    /** Options for beat map generation */
    generatorOptions: BeatMapGeneratorOptions;
    /** Cached beat maps indexed by audio ID for localStorage persistence */
    cachedBeatMaps: Record<string, BeatMap>;
    /** Order of cache insertion (for LRU eviction) - stores audio IDs */
    cacheOrder: string[];
    /** Whether practice mode is currently active */
    practiceModeActive: boolean;
    /** Running history of tap accuracy results */
    tapHistory: TapResult[];
    /** Error message if generation failed */
    error: string | null;
    /** Storage error message (e.g., quota exceeded) */
    storageError: string | null;
}

interface BeatDetectionActions {
    /**
     * Generate a beat map from an audio URL.
     * Uses cached beat map if available (unless forceRegenerate is true).
     * @param audioUrl - URL of the audio file
     * @param audioId - Unique identifier for the audio (used for caching)
     * @param options - Optional override for generator options
     * @param forceRegenerate - If true, regenerate even if cached version exists
     */
    generateBeatMap: (
        audioUrl: string,
        audioId: string,
        options?: Partial<BeatMapGeneratorOptions>,
        forceRegenerate?: boolean
    ) => Promise<BeatMap | null>;

    /**
     * Cancel an ongoing beat map generation.
     */
    cancelGeneration: () => void;

    /**
     * Update the generator options.
     * These will be used for subsequent beat map generations.
     * @param options - Partial options to merge with existing options
     */
    setGeneratorOptions: (options: Partial<BeatMapGeneratorOptions>) => void;

    /**
     * Clear the current beat map and reset related state.
     */
    clearBeatMap: () => void;

    /**
     * Start practice mode.
     * This activates tap tracking and beat visualization.
     */
    startPracticeMode: () => void;

    /**
     * Stop practice mode.
     * This deactivates tap tracking and returns to summary view.
     */
    stopPracticeMode: () => void;

    /**
     * Record a tap result in the history.
     * @param result - The button press result from BeatStream.checkButtonPress()
     */
    recordTap: (result: ButtonPressResult) => void;

    /**
     * Clear the tap history.
     * Useful for starting a fresh practice session.
     */
    clearTapHistory: () => void;

    /**
     * Load a cached beat map by audio ID.
     * Returns null if not found in cache.
     * @param audioId - The audio identifier
     */
    loadCachedBeatMap: (audioId: string) => BeatMap | null;

    /**
     * Cache a beat map for an audio ID.
     * @param audioId - The audio identifier
     * @param beatMap - The beat map to cache
     */
    cacheBeatMap: (audioId: string, beatMap: BeatMap) => void;

    /**
     * Remove a cached beat map.
     * @param audioId - The audio identifier
     */
    removeCachedBeatMap: (audioId: string) => void;

    /**
     * Clear all cached beat maps.
     */
    clearAllCachedBeatMaps: () => void;

    /**
     * Get the current beat map.
     */
    getBeatMap: () => BeatMap | null;

    /**
     * Check if a beat map is currently cached for the given audio ID.
     * @param audioId - The audio identifier
     */
    hasCachedBeatMap: (audioId: string) => boolean;

    /**
     * Clear any error state.
     */
    clearError: () => void;

    /**
     * Clear storage error state.
     */
    clearStorageError: () => void;

    /**
     * Clear old cached beat maps to free up storage space.
     * Removes the oldest cached beat maps.
     * @param count - Number of old caches to remove (default: 1)
     */
    clearOldestCachedBeatMaps: (count?: number) => void;
}

interface BeatDetectionStoreState extends BeatDetectionState {
    actions: BeatDetectionActions;
}

// Singleton BeatMapGenerator instance (created on demand)
let generatorInstance: BeatMapGenerator | null = null;

/**
 * Get or create the BeatMapGenerator instance.
 */
const getGenerator = (options: BeatMapGeneratorOptions): BeatMapGenerator => {
    if (!generatorInstance) {
        generatorInstance = new BeatMapGenerator(options);
    }
    return generatorInstance;
};

/**
 * Create the initial state.
 */
const createInitialState = (): BeatDetectionState => ({
    beatMap: null,
    isGenerating: false,
    generationProgress: null,
    generatorOptions: { ...DEFAULT_GENERATOR_OPTIONS },
    cachedBeatMaps: {},
    cacheOrder: [],
    practiceModeActive: false,
    tapHistory: [],
    error: null,
    storageError: null,
});

/**
 * Check if an error is a quota-related error.
 */
const isQuotaError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes('quota') ||
        message.includes('exceeded') ||
        message.includes('space') ||
        message.includes('full')
    );
};

/**
 * Helper to perform automatic cache eviction if needed.
 * Returns the new cachedBeatMaps and cacheOrder after potential eviction.
 */
const performAutoEvictionIfNeeded = (
    cachedBeatMaps: Record<string, BeatMap>,
    cacheOrder: string[]
): { cachedBeatMaps: Record<string, BeatMap>; cacheOrder: string[]; evictedCount: number } => {
    if (cacheOrder.length < MAX_CACHED_BEAT_MAPS) {
        return { cachedBeatMaps, cacheOrder, evictedCount: 0 };
    }

    // Remove the oldest entries
    const keysToRemove = cacheOrder.slice(0, EVICTION_COUNT);
    const newCachedBeatMaps = { ...cachedBeatMaps };
    keysToRemove.forEach((key) => {
        delete newCachedBeatMaps[key];
    });
    const newCacheOrder = cacheOrder.slice(EVICTION_COUNT);

    logger.info('BeatDetection', 'Auto-evicted old cached beat maps', {
        evictedCount: keysToRemove.length,
        remainingCount: newCacheOrder.length,
    });

    return { cachedBeatMaps: newCachedBeatMaps, cacheOrder: newCacheOrder, evictedCount: keysToRemove.length };
};

/**
 * Custom PersistStorage implementation that wraps createJSONStorage with error handling.
 */
const createErrorHandlingStorage = <S>(
    onError: (error: string) => void
): PersistStorage<S> | undefined => {
    // Create the base storage using createJSONStorage
    const baseStorage = createJSONStorage<S>(() => ({
        getItem: async (name: string): Promise<string | null> => {
            try {
                const value = await storage.getItem<string>(name);
                return value ?? null;
            } catch (error) {
                logger.error('BeatDetection', 'Storage getItem error', { error });
                return null;
            }
        },
        setItem: async (name: string, value: string): Promise<void> => {
            try {
                await storage.setItem(name, value);
            } catch (error) {
                logger.error('BeatDetection', 'Storage setItem error', { error });
                if (isQuotaError(error)) {
                    onError('Storage quota exceeded. Some beat maps may not be saved. Try clearing old cached beat maps.');
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
                    onError(`Storage error: ${errorMessage}`);
                }
            }
        },
        removeItem: async (name: string): Promise<void> => {
            try {
                await storage.removeItem(name);
            } catch (error) {
                logger.error('BeatDetection', 'Storage removeItem error', { error });
            }
        },
    }));

    if (!baseStorage) return undefined;

    // Wrap the setItem to handle errors
    return {
        getItem: baseStorage.getItem,
        setItem: (name: string, value: StorageValue<S>) => {
            try {
                return baseStorage.setItem(name, value);
            } catch (error) {
                logger.error('BeatDetection', 'Storage setItem error', { error });
                if (isQuotaError(error)) {
                    onError('Storage quota exceeded. Some beat maps may not be saved. Try clearing old cached beat maps.');
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
                    onError(`Storage error: ${errorMessage}`);
                }
                return undefined;
            }
        },
        removeItem: baseStorage.removeItem,
    };
};

// Variable to hold the setStorageError function (set during store creation)
let setStorageErrorFn: ((error: string | null) => void) | null = null;

export const useBeatDetectionStore = create<BeatDetectionStoreState>()(
    persist(
        (set, get) => {
            // Store the set function for error handling
            setStorageErrorFn = (error) => set({ storageError: error });

            return {
                ...createInitialState(),

                actions: {
                    generateBeatMap: async (audioUrl, audioId, options, forceRegenerate = false) => {
                        const state = get();

                        // Check cache first (unless force regenerating)
                        if (!forceRegenerate && state.cachedBeatMaps[audioId]) {
                            logger.info('BeatDetection', 'Using cached beat map', { audioId });
                            const cachedMap = state.cachedBeatMaps[audioId];
                            set({
                                beatMap: cachedMap,
                                isGenerating: false,
                                generationProgress: null,
                                error: null,
                            });
                            return cachedMap;
                        }

                        // Start generation
                        logger.info('BeatDetection', 'Starting beat map generation', { audioUrl, audioId });
                        set({
                            isGenerating: true,
                            generationProgress: null,
                            error: null,
                        });

                        try {
                            // Merge provided options with defaults
                            const mergedOptions: BeatMapGeneratorOptions = {
                                ...state.generatorOptions,
                                ...options,
                            };

                            const generator = getGenerator(mergedOptions);

                            // Generate with progress callback
                            const beatMap = await generator.generateBeatMap(
                                audioUrl,
                                audioId,
                                (progress) => {
                                    set({ generationProgress: progress });
                                    logger.debug('BeatDetection', 'Generation progress', {
                                        phase: progress.phase,
                                        progress: progress.progress,
                                    });
                                }
                            );

                            logger.info('BeatDetection', 'Beat map generated successfully', {
                                audioId,
                                beatCount: beatMap.beats.length,
                                bpm: beatMap.bpm,
                            });

                            // Cache the result with automatic eviction
                            const currentState = get();
                            let { cachedBeatMaps, cacheOrder } = currentState;

                            // If this audioId already exists, remove it from order (will be re-added at end)
                            if (cachedBeatMaps[audioId]) {
                                cacheOrder = cacheOrder.filter((id) => id !== audioId);
                            }

                            // Perform auto-eviction if needed
                            const evicted = performAutoEvictionIfNeeded(cachedBeatMaps, cacheOrder);
                            cachedBeatMaps = evicted.cachedBeatMaps;
                            cacheOrder = evicted.cacheOrder;

                            // Add the new beat map
                            cachedBeatMaps = { ...cachedBeatMaps, [audioId]: beatMap };
                            cacheOrder = [...cacheOrder, audioId];

                            set({
                                beatMap,
                                isGenerating: false,
                                generationProgress: null,
                                cachedBeatMaps,
                                cacheOrder,
                                error: null,
                            });

                            return beatMap;
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            logger.error('BeatDetection', 'Beat map generation failed', { error: errorMessage });
                            set({
                                isGenerating: false,
                                generationProgress: null,
                                error: errorMessage,
                            });
                            return null;
                        }
                    },

                    cancelGeneration: () => {
                        const generator = generatorInstance;
                        if (generator) {
                            generator.cancel();
                            logger.info('BeatDetection', 'Beat map generation cancelled');
                        }
                        set({
                            isGenerating: false,
                            generationProgress: null,
                        });
                    },

                    setGeneratorOptions: (options) => {
                        logger.debug('BeatDetection', 'Updating generator options', options);
                        set((state) => ({
                            generatorOptions: {
                                ...state.generatorOptions,
                                ...options,
                            },
                        }));
                    },

                    clearBeatMap: () => {
                        logger.info('BeatDetection', 'Clearing current beat map');
                        set({
                            beatMap: null,
                            practiceModeActive: false,
                            tapHistory: [],
                            error: null,
                        });
                    },

                    startPracticeMode: () => {
                        logger.info('BeatDetection', 'Starting practice mode');
                        set({
                            practiceModeActive: true,
                            tapHistory: [], // Clear history when starting practice
                        });
                    },

                    stopPracticeMode: () => {
                        logger.info('BeatDetection', 'Stopping practice mode');
                        set({ practiceModeActive: false });
                    },

                    recordTap: (result) => {
                        const state = get();
                        const tapResult: TapResult = {
                            ...result,
                            tappedAt: result.matchedBeat.timestamp,
                            tapIndex: state.tapHistory.length,
                        };
                        logger.debug('BeatDetection', 'Recording tap', {
                            accuracy: result.accuracy,
                            offset: result.offset,
                            tapIndex: tapResult.tapIndex,
                        });
                        set((state) => ({
                            tapHistory: [...state.tapHistory, tapResult],
                        }));
                    },

                    clearTapHistory: () => {
                        logger.info('BeatDetection', 'Clearing tap history');
                        set({ tapHistory: [] });
                    },

                    loadCachedBeatMap: (audioId) => {
                        const cached = get().cachedBeatMaps[audioId];
                        if (cached) {
                            logger.info('BeatDetection', 'Loading cached beat map', { audioId });
                            set({ beatMap: cached, error: null });
                            return cached;
                        }
                        return null;
                    },

                    cacheBeatMap: (audioId, beatMap) => {
                        logger.info('BeatDetection', 'Caching beat map', { audioId });
                        set((state) => {
                            let { cachedBeatMaps, cacheOrder } = state;

                            // If this audioId already exists, remove it from order (will be re-added at end)
                            if (cachedBeatMaps[audioId]) {
                                cacheOrder = cacheOrder.filter((id) => id !== audioId);
                            }

                            // Perform auto-eviction if needed
                            const evicted = performAutoEvictionIfNeeded(cachedBeatMaps, cacheOrder);
                            cachedBeatMaps = evicted.cachedBeatMaps;
                            cacheOrder = evicted.cacheOrder;

                            // Add the new beat map
                            return {
                                cachedBeatMaps: { ...cachedBeatMaps, [audioId]: beatMap },
                                cacheOrder: [...cacheOrder, audioId],
                            };
                        });
                    },

                    removeCachedBeatMap: (audioId) => {
                        logger.info('BeatDetection', 'Removing cached beat map', { audioId });
                        set((state) => {
                            const { [audioId]: removed, ...rest } = state.cachedBeatMaps;
                            return {
                                cachedBeatMaps: rest,
                                cacheOrder: state.cacheOrder.filter((id) => id !== audioId),
                            };
                        });
                    },

                    clearAllCachedBeatMaps: () => {
                        logger.warn('BeatDetection', 'Clearing all cached beat maps');
                        set({ cachedBeatMaps: {}, cacheOrder: [] });
                    },

                    getBeatMap: () => {
                        return get().beatMap;
                    },

                    hasCachedBeatMap: (audioId) => {
                        return audioId in get().cachedBeatMaps;
                    },

                    clearError: () => {
                        set({ error: null });
                    },

                    clearStorageError: () => {
                        set({ storageError: null });
                    },

                    clearOldestCachedBeatMaps: (count = 1) => {
                        const state = get();
                        if (state.cacheOrder.length === 0) return;

                        // Remove the oldest entries (first N in cacheOrder)
                        const keysToRemove = state.cacheOrder.slice(0, Math.min(count, state.cacheOrder.length));
                        logger.info('BeatDetection', 'Clearing oldest cached beat maps', {
                            count: keysToRemove.length,
                            keys: keysToRemove,
                        });

                        const newCachedBeatMaps = { ...state.cachedBeatMaps };
                        keysToRemove.forEach((key) => {
                            delete newCachedBeatMaps[key];
                        });

                        set({
                            cachedBeatMaps: newCachedBeatMaps,
                            cacheOrder: state.cacheOrder.slice(keysToRemove.length),
                        });
                    },
                },
            };
        },
        {
            name: 'beat-detection-storage',
            // Use custom storage that wraps the base storage with error handling
            storage: createErrorHandlingStorage((error) => {
                if (setStorageErrorFn) {
                    setStorageErrorFn(error);
                }
            }),
            // Only persist cached beat maps, cache order, and generator options
            partialize: (state) => ({
                cachedBeatMaps: state.cachedBeatMaps,
                cacheOrder: state.cacheOrder,
                generatorOptions: state.generatorOptions,
            }) as BeatDetectionStoreState,
            // Merge persisted state with initial state
            merge: (persistedState, currentState) => {
                const persisted = persistedState as any;
                // If cacheOrder doesn't exist in persisted state, derive it from cachedBeatMaps keys
                // This handles migration from older versions that didn't have cacheOrder
                let cacheOrder = persisted?.cacheOrder;
                if (!cacheOrder && persisted?.cachedBeatMaps) {
                    cacheOrder = Object.keys(persisted.cachedBeatMaps);
                }
                return {
                    ...currentState,
                    cachedBeatMaps: persisted?.cachedBeatMaps ?? currentState.cachedBeatMaps,
                    cacheOrder: cacheOrder ?? currentState.cacheOrder,
                    generatorOptions: persisted?.generatorOptions ?? currentState.generatorOptions,
                };
            },
            // Callback after rehydration
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('BeatDetection', 'Store rehydrated from storage', {
                            cachedBeatMapsCount: Object.keys(state.cachedBeatMaps).length,
                            cacheOrderLength: state.cacheOrder.length,
                        });
                    }
                };
            },
        }
    )
);

// ============================================================
// Selectors
// ============================================================

/**
 * Selector to get the current beat map directly.
 */
export const useBeatMap = () => useBeatDetectionStore((state) => state.beatMap);

/**
 * Selector to get generation state.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useBeatMapGenerationState = () =>
    useBeatDetectionStore(useShallow((state) => ({
        isGenerating: state.isGenerating,
        progress: state.generationProgress,
        error: state.error,
    })));

/**
 * Selector to get generator options.
 */
export const useGeneratorOptions = () =>
    useBeatDetectionStore((state) => state.generatorOptions);

/**
 * Selector to get practice mode state.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const usePracticeModeState = () =>
    useBeatDetectionStore(useShallow((state) => ({
        isActive: state.practiceModeActive,
        tapHistory: state.tapHistory,
    })));

/**
 * Selector to get tap history.
 */
export const useTapHistory = () => useBeatDetectionStore((state) => state.tapHistory);

/**
 * Selector to get cached beat maps.
 */
export const useCachedBeatMaps = () =>
    useBeatDetectionStore((state) => state.cachedBeatMaps);

/**
 * Selector to get storage error state.
 */
export const useStorageError = () =>
    useBeatDetectionStore((state) => state.storageError);

/**
 * Selector to get actions directly.
 */
export const useBeatDetectionActions = () =>
    useBeatDetectionStore((state) => state.actions);

/**
 * Selector to compute tap statistics.
 * Uses useShallow to prevent infinite loops from new object references.
 */
export const useTapStatistics = () =>
    useBeatDetectionStore(useShallow((state) => {
        const history = state.tapHistory;
        if (history.length === 0) {
            return {
                totalTaps: 0,
                perfect: 0,
                great: 0,
                good: 0,
                miss: 0,
                averageOffset: 0,
                standardDeviation: 0,
                currentStreak: 0,
                bestStreak: 0,
            };
        }

        // Count by accuracy
        const counts = {
            perfect: 0,
            great: 0,
            good: 0,
            miss: 0,
        };

        let totalOffset = 0;
        let currentStreak = 0;
        let bestStreak = 0;

        history.forEach((tap) => {
            counts[tap.accuracy]++;

            // Offset is in seconds, convert to ms for display
            totalOffset += Math.abs(tap.offset) * 1000;

            // Track streak (non-miss taps)
            if (tap.accuracy !== 'miss') {
                currentStreak++;
                if (currentStreak > bestStreak) {
                    bestStreak = currentStreak;
                }
            } else {
                currentStreak = 0;
            }
        });

        // Calculate standard deviation of offsets
        const avgOffset = totalOffset / history.length;
        let squaredDiffs = 0;
        history.forEach((tap) => {
            const offsetMs = Math.abs(tap.offset) * 1000;
            squaredDiffs += Math.pow(offsetMs - avgOffset, 2);
        });
        const standardDeviation = Math.sqrt(squaredDiffs / history.length);

        return {
            totalTaps: history.length,
            ...counts,
            averageOffset: Math.round(avgOffset * 10) / 10, // Round to 1 decimal
            standardDeviation: Math.round(standardDeviation * 10) / 10,
            currentStreak,
            bestStreak,
        };
    }));
