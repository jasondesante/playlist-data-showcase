import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { config } from '@/utils/env';

interface AppSettings {
    /** OpenWeatherMap API key for weather data (optional) */
    openWeatherApiKey: string;
    /** Steam Web API key for game activity (optional) */
    steamApiKey: string;
    /** Discord Client ID for music status RPC (optional) */
    discordClientId: string;
    /** Audio sample rate in Hz (default: 44100) */
    audioSampleRate: number;
    /** FFT size for audio analysis (1024, 2048, 4096, or 8192) */
    audioFftSize: number;
    /** Base XP rate multiplier (0.1 - 5.0, default: 1.0) */
    baseXpRate: number;
    /** Enable verbose console logging for debugging */
    verboseLogging: boolean;
}

interface AppState {
    /** Current application settings */
    settings: AppSettings;
    /** Update one or more settings (merges with existing) */
    updateSettings: (settings: Partial<AppSettings>) => void;
    /** Reset all settings to defaults from environment/config */
    resetSettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
    openWeatherApiKey: config.openWeatherApiKey,
    steamApiKey: config.steamApiKey,
    discordClientId: config.discordClientId,
    audioSampleRate: 44100,
    audioFftSize: 2048,
    baseXpRate: 1.0,
    verboseLogging: false,
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,

            /**
             * Update one or more application settings
             * Merges provided settings with existing settings
             * Automatically persists to LocalForage
             * @param newSettings - Partial settings object with properties to update
             * @example
             * ```ts
             * updateSettings({ openWeatherApiKey: 'your-key' });
             * updateSettings({ audioFftSize: 4096, baseXpRate: 1.5 });
             * ```
             */
            updateSettings: (newSettings) => {
                logger.info('Store', 'Updating app settings', Object.keys(newSettings));
                set((state) => ({
                    settings: { ...state.settings, ...newSettings }
                }));
            },

            /**
             * Reset all settings to defaults from environment/config
             * Resets to values from DEFAULT_SETTINGS (loaded from env.config)
             * @example
             * ```ts
             * resetSettings(); // Back to environment defaults
             * ```
             */
            resetSettings: () => {
                logger.warn('Store', 'Resetting app settings to defaults');
                set({ settings: DEFAULT_SETTINGS });
            }
        }),
        {
            name: 'app-settings',
            storage: createJSONStorage(() => storage),
        }
    )
);
