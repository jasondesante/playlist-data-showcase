import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
    RhythmXPConfig,
    DEFAULT_RHYTHM_XP_CONFIG,
    mergeRhythmXPConfig,
} from '@/types';

/**
 * Current version of the rhythm XP config schema.
 * Increment when making breaking changes to require migration.
 */
const RHYTHM_XP_CONFIG_VERSION = 1;

/**
 * Metadata for the rhythm XP config store.
 */
interface RhythmXPConfigMetadata {
    version: number;
    lastModified: number;
}

/**
 * State interface for the rhythm XP config store.
 */
interface RhythmXPConfigState {
    config: RhythmXPConfig;
    metadata: RhythmXPConfigMetadata;
}

/**
 * Actions for the rhythm XP config store.
 */
interface RhythmXPConfigActions {
    /**
     * Update the rhythm XP config.
     * Merges provided config with existing config.
     * Automatically updates metadata (lastModified timestamp).
     * @param config - Partial config object with properties to update
     */
    updateConfig: (config: Partial<RhythmXPConfig>) => void;

    /**
     * Update a base XP value for a specific accuracy level.
     * @param key - The accuracy level key (perfect, great, good, ok, miss, wrongKey)
     * @param value - The new base XP value
     */
    updateBaseXP: (key: keyof RhythmXPConfig['baseXP'], value: number) => void;

    /**
     * Update the XP ratio.
     * @param value - The new XP ratio value
     */
    updateXPRatio: (value: number) => void;

    /**
     * Update combo configuration.
     * @param config - Partial combo config to merge
     */
    updateComboConfig: (config: Partial<RhythmXPConfig['combo']>) => void;

    /**
     * Update groove configuration.
     * @param config - Partial groove config to merge
     */
    updateGrooveConfig: (config: Partial<RhythmXPConfig['groove']>) => void;

    /**
     * Update the max multiplier.
     * @param value - The new max multiplier value
     */
    updateMaxMultiplier: (value: number) => void;

    /**
     * Reset all rhythm XP config to defaults.
     * Resets metadata version and updates lastModified.
     */
    resetConfig: () => void;

    /**
     * Get the current rhythm XP config.
     * @returns The current config object
     */
    getConfig: () => RhythmXPConfig;

    /**
     * Check if any config differs from defaults.
     * Useful for showing visual indicators in the UI.
     * @returns true if any config differs from its default
     */
    hasCustomConfig: () => boolean;

    /**
     * Check if a base XP value differs from its default.
     * @param key - The base XP key to check
     * @returns true if the value differs from default
     */
    isBaseXPModified: (key: keyof RhythmXPConfig['baseXP']) => boolean;
}

interface RhythmXPConfigStoreState extends RhythmXPConfigState {
    actions: RhythmXPConfigActions;
}

/**
 * Create the initial state with default config and metadata.
 */
const createInitialState = (): RhythmXPConfigState => ({
    config: { ...DEFAULT_RHYTHM_XP_CONFIG },
    metadata: {
        version: RHYTHM_XP_CONFIG_VERSION,
        lastModified: Date.now(),
    },
});

/**
 * Compare two values for equality with tolerance for floating point numbers.
 */
const isEqual = (a: number, b: number, tolerance = 0.001): boolean => {
    return Math.abs(a - b) < tolerance;
};

/**
 * Deep compare a partial config with the full default config.
 */
const hasConfigDiff = (
    userConfig: Partial<RhythmXPConfig>,
    defaultConfig: RhythmXPConfig
): boolean => {
    // Check baseXP
    if (userConfig.baseXP) {
        for (const key of Object.keys(defaultConfig.baseXP) as Array<keyof typeof defaultConfig.baseXP>) {
            if (userConfig.baseXP[key] !== undefined &&
                !isEqual(userConfig.baseXP[key], defaultConfig.baseXP[key])) {
                return true;
            }
        }
    }

    // Check xpRatio
    if (userConfig.xpRatio !== undefined && !isEqual(userConfig.xpRatio, defaultConfig.xpRatio)) {
        return true;
    }

    // Check maxMultiplier
    if (userConfig.maxMultiplier !== undefined && !isEqual(userConfig.maxMultiplier, defaultConfig.maxMultiplier)) {
        return true;
    }

    // Check combo
    if (userConfig.combo) {
        if (userConfig.combo.enabled !== defaultConfig.combo.enabled) return true;
        if (userConfig.combo.cap !== undefined && !isEqual(userConfig.combo.cap, defaultConfig.combo.cap)) return true;
        if (userConfig.combo.endBonus?.enabled !== undefined &&
            userConfig.combo.endBonus.enabled !== defaultConfig.combo.endBonus.enabled) return true;
    }

    // Check groove
    if (userConfig.groove) {
        if (userConfig.groove.perHitMultiplier !== defaultConfig.groove.perHitMultiplier) return true;
        if (userConfig.groove.perHitScale !== undefined &&
            !isEqual(userConfig.groove.perHitScale, defaultConfig.groove.perHitScale)) return true;
        if (userConfig.groove.endBonus) {
            if (userConfig.groove.endBonus.enabled !== defaultConfig.groove.endBonus.enabled) return true;
            if (userConfig.groove.endBonus.maxStreakWeight !== undefined &&
                !isEqual(userConfig.groove.endBonus.maxStreakWeight, defaultConfig.groove.endBonus.maxStreakWeight)) return true;
            if (userConfig.groove.endBonus.avgHotnessWeight !== undefined &&
                !isEqual(userConfig.groove.endBonus.avgHotnessWeight, defaultConfig.groove.endBonus.avgHotnessWeight)) return true;
            if (userConfig.groove.endBonus.durationWeight !== undefined &&
                !isEqual(userConfig.groove.endBonus.durationWeight, defaultConfig.groove.endBonus.durationWeight)) return true;
        }
    }

    return false;
};

export const useRhythmXPConfigStore = create<RhythmXPConfigStoreState>()(
    persist(
        (set, get) => ({
            ...createInitialState(),

            actions: {
                /**
                 * Update the rhythm XP config.
                 */
                updateConfig: (newConfig) => {
                    logger.info('Store', 'Updating rhythm XP config', Object.keys(newConfig));

                    set((state) => {
                        const mergedConfig = mergeRhythmXPConfig({
                            ...state.config,
                            ...newConfig,
                            // Deep merge nested objects
                            baseXP: newConfig.baseXP
                                ? { ...state.config.baseXP, ...newConfig.baseXP }
                                : state.config.baseXP,
                            combo: newConfig.combo
                                ? {
                                      ...state.config.combo,
                                      ...newConfig.combo,
                                      endBonus: {
                                          ...state.config.combo.endBonus,
                                          ...(newConfig.combo.endBonus || {}),
                                      },
                                  }
                                : state.config.combo,
                            groove: newConfig.groove
                                ? {
                                      ...state.config.groove,
                                      ...newConfig.groove,
                                      endBonus: {
                                          ...state.config.groove.endBonus,
                                          ...(newConfig.groove.endBonus || {}),
                                      },
                                  }
                                : state.config.groove,
                        });

                        return {
                            config: mergedConfig,
                            metadata: {
                                ...state.metadata,
                                lastModified: Date.now(),
                            },
                        };
                    });
                },

                /**
                 * Update a base XP value for a specific accuracy level.
                 */
                updateBaseXP: (key, value) => {
                    logger.debug('Store', 'Updating base XP', { key, value });

                    set((state) => ({
                        config: {
                            ...state.config,
                            baseXP: {
                                ...state.config.baseXP,
                                [key]: value,
                            },
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Update the XP ratio.
                 */
                updateXPRatio: (value) => {
                    logger.debug('Store', 'Updating XP ratio', { value });

                    set((state) => ({
                        config: {
                            ...state.config,
                            xpRatio: value,
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Update combo configuration.
                 */
                updateComboConfig: (newComboConfig) => {
                    logger.debug('Store', 'Updating combo config', newComboConfig);

                    set((state) => ({
                        config: {
                            ...state.config,
                            combo: mergeRhythmXPConfig({
                                combo: { ...state.config.combo, ...newComboConfig },
                            }).combo,
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Update groove configuration.
                 */
                updateGrooveConfig: (newGrooveConfig) => {
                    logger.debug('Store', 'Updating groove config', newGrooveConfig);

                    set((state) => ({
                        config: {
                            ...state.config,
                            groove: mergeRhythmXPConfig({
                                groove: { ...state.config.groove, ...newGrooveConfig },
                            }).groove,
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Update the max multiplier.
                 */
                updateMaxMultiplier: (value) => {
                    logger.debug('Store', 'Updating max multiplier', { value });

                    set((state) => ({
                        config: {
                            ...state.config,
                            maxMultiplier: value,
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Reset all rhythm XP config to defaults.
                 */
                resetConfig: () => {
                    logger.warn('Store', 'Resetting rhythm XP config to defaults');

                    set({
                        ...createInitialState(),
                    });
                },

                /**
                 * Get the current rhythm XP config.
                 */
                getConfig: () => {
                    return get().config;
                },

                /**
                 * Check if any config differs from defaults.
                 */
                hasCustomConfig: () => {
                    const { config } = get();
                    return hasConfigDiff(config, DEFAULT_RHYTHM_XP_CONFIG);
                },

                /**
                 * Check if a base XP value differs from its default.
                 */
                isBaseXPModified: (key) => {
                    const { config } = get();
                    return !isEqual(config.baseXP[key], DEFAULT_RHYTHM_XP_CONFIG.baseXP[key]);
                },
            },
        }),
        {
            name: 'rhythm-xp-config-storage',
            storage: createJSONStorage(() => storage),
            // Only persist config and metadata, not actions
            partialize: (state) => ({
                config: state.config,
                metadata: state.metadata,
            }),
            // Merge persisted state with initial state to preserve actions
            merge: (persistedState, currentState) => ({
                ...currentState,
                config: (persistedState as any)?.config ?? currentState.config,
                metadata: (persistedState as any)?.metadata ?? currentState.metadata,
            }),
            // Migration function for future schema changes
            version: RHYTHM_XP_CONFIG_VERSION,
            migrate: (persistedState, version) => {
                const state = persistedState as RhythmXPConfigStoreState;

                if (version < RHYTHM_XP_CONFIG_VERSION) {
                    logger.info('Store', 'Migrating rhythm XP config', { fromVersion: version, toVersion: RHYTHM_XP_CONFIG_VERSION });

                    // Reset to defaults if version is outdated
                    return {
                        config: createInitialState().config,
                        metadata: createInitialState().metadata,
                    };
                }

                return {
                    config: state.config ?? createInitialState().config,
                    metadata: state.metadata ?? createInitialState().metadata,
                };
            },
            // Callback after zustand finishes hydrating from storage
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('Store', 'Rhythm XP config store rehydrated from storage', {
                            version: state.metadata.version,
                            lastModified: new Date(state.metadata.lastModified).toISOString(),
                            hasCustomConfig: state.actions.hasCustomConfig(),
                        });
                    }
                };
            },
        }
    )
);

/**
 * Selector to get config directly (without actions).
 * Use this in components that only need to read config.
 */
export const useRhythmXPConfig = () => useRhythmXPConfigStore((state) => state.config);

/**
 * Selector to get actions directly.
 * Use this in components that only need to update config.
 */
export const useRhythmXPConfigActions = () => useRhythmXPConfigStore((state) => state.actions);

/**
 * Selector to get metadata directly.
 */
export const useRhythmXPConfigMetadata = () => useRhythmXPConfigStore((state) => state.metadata);
