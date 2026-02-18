import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
    ProgressionConfigSettings,
    ProgressionConfigState,
    DEFAULT_PROGRESSION_CONFIG_SETTINGS,
    PROGRESSION_CONFIG_VERSION,
} from '@/types';

interface ProgressionConfigActions {
    /**
     * Update the progression config settings.
     * Merges provided settings with existing settings.
     * Automatically updates metadata (lastModified timestamp).
     * @param settings - Partial settings object with properties to update
     */
    updateProgressionConfig: (settings: Partial<ProgressionConfigSettings>) => void;

    /**
     * Update a single activity bonus value.
     * Convenience method for updating individual bonus multipliers.
     * @param key - The activity bonus key to update
     * @param value - The new value
     */
    updateActivityBonus: (key: keyof ProgressionConfigSettings['activity_bonuses'], value: number) => void;

    /**
     * Reset all progression config settings to defaults.
     * Resets metadata version and updates lastModified.
     */
    resetProgressionConfig: () => void;

    /**
     * Get the current progression config settings.
     * @returns The current settings object
     */
    getProgressionConfig: () => ProgressionConfigSettings;

    /**
     * Check if any settings differ from defaults.
     * Useful for showing visual indicators in the UI.
     * @returns true if any setting differs from its default
     */
    hasCustomSettings: () => boolean;

    /**
     * Check if a specific setting differs from its default.
     * @param key - The setting key to check
     * @returns true if the setting differs from default
     */
    isSettingModified: (key: keyof ProgressionConfigSettings) => boolean;

    /**
     * Check if a specific activity bonus differs from its default.
     * @param key - The activity bonus key to check
     * @returns true if the bonus differs from default
     */
    isActivityBonusModified: (key: keyof ProgressionConfigSettings['activity_bonuses']) => boolean;
}

interface ProgressionConfigStoreState extends ProgressionConfigState {
    actions: ProgressionConfigActions;
}

/**
 * Create the initial state with default settings and metadata.
 */
const createInitialState = (): ProgressionConfigState => ({
    settings: { ...DEFAULT_PROGRESSION_CONFIG_SETTINGS },
    metadata: {
        version: PROGRESSION_CONFIG_VERSION,
        lastModified: Date.now(),
    },
});

/**
 * Compare two values for equality with tolerance for floating point numbers.
 */
const isEqual = (a: number, b: number, tolerance = 0.001): boolean => {
    return Math.abs(a - b) < tolerance;
};

export const useProgressionConfigStore = create<ProgressionConfigStoreState>()(
    persist(
        (set, get) => ({
            ...createInitialState(),

            actions: {
                /**
                 * Update the progression config settings.
                 * Merges provided settings with existing settings and updates metadata.
                 */
                updateProgressionConfig: (newSettings) => {
                    logger.info('Store', 'Updating progression config', Object.keys(newSettings));

                    set((state) => ({
                        settings: {
                            ...state.settings,
                            ...newSettings,
                            // Deep merge activity_bonuses if provided
                            activity_bonuses: newSettings.activity_bonuses
                                ? {
                                      ...state.settings.activity_bonuses,
                                      ...newSettings.activity_bonuses,
                                  }
                                : state.settings.activity_bonuses,
                        },
                        metadata: {
                            ...state.metadata,
                            lastModified: Date.now(),
                        },
                    }));
                },

                /**
                 * Update a single activity bonus value.
                 */
                updateActivityBonus: (key, value) => {
                    logger.debug('Store', 'Updating activity bonus', { key, value });

                    set((state) => ({
                        settings: {
                            ...state.settings,
                            activity_bonuses: {
                                ...state.settings.activity_bonuses,
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
                 * Reset all progression config settings to defaults.
                 */
                resetProgressionConfig: () => {
                    logger.warn('Store', 'Resetting progression config to defaults');

                    set({
                        ...createInitialState(),
                    });
                },

                /**
                 * Get the current progression config settings.
                 */
                getProgressionConfig: () => {
                    return get().settings;
                },

                /**
                 * Check if any settings differ from defaults.
                 */
                hasCustomSettings: () => {
                    const { settings } = get();
                    const defaults = DEFAULT_PROGRESSION_CONFIG_SETTINGS;

                    // Check xp_per_second
                    if (!isEqual(settings.xp_per_second, defaults.xp_per_second)) {
                        return true;
                    }

                    // Check all activity bonuses
                    const bonusKeys = Object.keys(defaults.activity_bonuses) as Array<
                        keyof typeof defaults.activity_bonuses
                    >;

                    for (const key of bonusKeys) {
                        if (!isEqual(settings.activity_bonuses[key], defaults.activity_bonuses[key])) {
                            return true;
                        }
                    }

                    return false;
                },

                /**
                 * Check if a specific setting differs from its default.
                 */
                isSettingModified: (key) => {
                    const { settings } = get();
                    const defaults = DEFAULT_PROGRESSION_CONFIG_SETTINGS;

                    if (key === 'xp_per_second') {
                        return !isEqual(settings.xp_per_second, defaults.xp_per_second);
                    }

                    if (key === 'activity_bonuses') {
                        // This would check the entire activity_bonuses object
                        // which is better handled by hasCustomSettings
                        return get().actions.hasCustomSettings();
                    }

                    return false;
                },

                /**
                 * Check if a specific activity bonus differs from its default.
                 */
                isActivityBonusModified: (key) => {
                    const { settings } = get();
                    const defaults = DEFAULT_PROGRESSION_CONFIG_SETTINGS;

                    return !isEqual(settings.activity_bonuses[key], defaults.activity_bonuses[key]);
                },
            },
        }),
        {
            name: 'progression-config-storage',
            storage: createJSONStorage(() => storage),
            // Migration function for future schema changes
            version: PROGRESSION_CONFIG_VERSION,
            migrate: (persistedState, version) => {
                const state = persistedState as ProgressionConfigStoreState;

                // If version is older, apply migrations
                if (version < PROGRESSION_CONFIG_VERSION) {
                    logger.info('Store', 'Migrating progression config', { fromVersion: version, toVersion: PROGRESSION_CONFIG_VERSION });

                    // Example migration (to be expanded as versions increase):
                    // if (version < 2) {
                    //     // Apply v1 -> v2 migration
                    // }

                    // For now, just reset to defaults if version is outdated
                    // This is safe because it's a new store
                    return createInitialState();
                }

                // IMPORTANT: We must preserve the initial state's structure (including actions)
                // because persisted state from JSON storage doesn't include functions.
                // The zustand persist middleware uses the return value of migrate to set the state,
                // so we need to merge the persisted data with the initial state.
                return {
                    ...createInitialState(),
                    settings: state.settings ?? createInitialState().settings,
                    metadata: state.metadata ?? createInitialState().metadata,
                };
            },
            // Callback after zustand finishes hydrating from storage
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        logger.info('Store', 'Progression config store rehydrated from storage', {
                            version: state.metadata.version,
                            lastModified: new Date(state.metadata.lastModified).toISOString(),
                            hasCustomSettings: state.actions.hasCustomSettings(),
                        });
                    }
                };
            },
        }
    )
);

/**
 * Selector to get settings directly (without actions).
 * Use this in components that only need to read settings.
 */
export const useProgressionConfig = () => useProgressionConfigStore((state) => state.settings);

/**
 * Selector to get actions directly.
 * Use this in components that only need to update settings.
 */
export const useProgressionConfigActions = () => useProgressionConfigStore((state) => state.actions);

/**
 * Selector to get metadata directly.
 * Use this to check version or last modified timestamp.
 */
export const useProgressionConfigMetadata = () => useProgressionConfigStore((state) => state.metadata);
