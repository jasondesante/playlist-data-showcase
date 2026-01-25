import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EnvironmentalContext, GamingContext } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface SensorState {
    /** Permission states for each sensor type */
    permissions: {
        geolocation: PermissionState;
        motion: PermissionState;
        light: PermissionState;
    };
    /** Current environmental sensor data (GPS, motion, weather, light) */
    environmentalContext: EnvironmentalContext | null;
    /** Current gaming platform data (Steam activity, Discord status) */
    gamingContext: GamingContext | null;

    /** Set permission status for a specific sensor */
    setPermission: (sensor: 'geolocation' | 'motion' | 'light', status: PermissionState) => void;
    /** Update the environmental context with new sensor data */
    updateEnvironmentalContext: (context: EnvironmentalContext) => void;
    /** Update the gaming context with new platform activity */
    updateGamingContext: (context: GamingContext) => void;
    /** Reset all permissions to 'prompt' state */
    resetPermissions: () => void;
    /** Clear all sensor data and reset permissions */
    resetAll: () => void;
}

export const useSensorStore = create<SensorState>()(
    persist(
        (set) => ({
            permissions: {
                geolocation: 'prompt',
                motion: 'prompt',
                light: 'prompt',
            },
            environmentalContext: null,
            gamingContext: null,

            /**
             * Set permission status for a specific sensor type
             * @param sensor - The sensor type ('geolocation' | 'motion' | 'light')
             * @param status - The permission state ('granted' | 'denied' | 'prompt')
             * @example
             * ```ts
             * setPermission('geolocation', 'granted');
             * setPermission('motion', 'denied');
             * ```
             */
            setPermission: (sensor, status) => {
                logger.info('Store', `Setting permission for ${sensor}`, status);
                set((state) => ({
                    permissions: { ...state.permissions, [sensor]: status }
                }));
            },

            /**
             * Update the environmental context with new sensor data
             * Note: Does not log to avoid excessive logging during frequent updates
             * @param context - The EnvironmentalContext from EnvironmentalSensors
             * @example
             * ```ts
             * const context = await sensors.updateSnapshot();
             * updateEnvironmentalContext(context);
             * ```
             */
            updateEnvironmentalContext: (context) => {
                // Don't log every update as it might be frequent
                set({ environmentalContext: context });
            },

            /**
             * Update the gaming context with new platform activity
             * @param context - The GamingContext from GamingPlatformSensors
             * @example
             * ```ts
             * const context = await gamingSensors.getContext();
             * updateGamingContext(context);
             * ```
             */
            updateGamingContext: (context) => {
                set({ gamingContext: context });
            },

            /**
             * Reset all permissions to 'prompt' state
             * Useful when user wants to re-request permissions
             * @example
             * ```ts
             * resetPermissions(); // All permissions back to 'prompt'
             * ```
             */
            resetPermissions: () => {
                logger.info('Store', 'Resetting permissions');
                set({
                    permissions: {
                        geolocation: 'prompt',
                        motion: 'prompt',
                        light: 'prompt',
                    }
                });
            },

            /**
             * Clear all sensor data and reset permissions
             * Useful for resetting the app or clearing all sensor state
             */
            resetAll: () => {
                logger.warn('Store', 'Resetting all sensor data');
                set({
                    permissions: {
                        geolocation: 'prompt',
                        motion: 'prompt',
                        light: 'prompt',
                    },
                    environmentalContext: null,
                    gamingContext: null
                });
            }
        }),
        {
            name: 'sensor-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
