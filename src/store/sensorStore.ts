import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EnvironmentalContext, GamingContext } from '@/types';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

interface SensorState {
    permissions: {
        geolocation: PermissionState;
        motion: PermissionState;
        light: PermissionState;
    };
    environmentalContext: EnvironmentalContext | null;
    gamingContext: GamingContext | null;

    setPermission: (sensor: 'geolocation' | 'motion' | 'light', status: PermissionState) => void;
    updateEnvironmentalContext: (context: EnvironmentalContext) => void;
    updateGamingContext: (context: GamingContext) => void;
    resetPermissions: () => void;
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

            setPermission: (sensor, status) => {
                logger.info('Store', `Setting permission for ${sensor}`, status);
                set((state) => ({
                    permissions: { ...state.permissions, [sensor]: status }
                }));
            },

            updateEnvironmentalContext: (context) => {
                // Don't log every update as it might be frequent
                set({ environmentalContext: context });
            },

            updateGamingContext: (context) => {
                set({ gamingContext: context });
            },

            resetPermissions: () => {
                logger.info('Store', 'Resetting permissions');
                set({
                    permissions: {
                        geolocation: 'prompt',
                        motion: 'prompt',
                        light: 'prompt',
                    }
                });
            }
        }),
        {
            name: 'sensor-storage',
            storage: createJSONStorage(() => storage),
        }
    )
);
