import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { config } from '@/utils/env';

interface AppSettings {
    openWeatherApiKey: string;
    steamApiKey: string;
    discordClientId: string;
    audioSampleRate: number;
    audioFftSize: number;
    baseXpRate: number;
    verboseLogging: boolean;
}

interface AppState {
    settings: AppSettings;
    updateSettings: (settings: Partial<AppSettings>) => void;
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

            updateSettings: (newSettings) => {
                logger.info('Store', 'Updating app settings', Object.keys(newSettings));
                set((state) => ({
                    settings: { ...state.settings, ...newSettings }
                }));
            },

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
