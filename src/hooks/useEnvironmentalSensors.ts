import { useState, useCallback, useEffect, useMemo } from 'react';
import { EnvironmentalSensors, BiomeType } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * React hook for environmental sensor integration via the EnvironmentalSensors engine module.
 *
 * Manages permissions and real-time monitoring of GPS, motion, and weather sensors.
 * Provides environmental context data for XP modifier calculations.
 *
 * @example
 * ```tsx
 * const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, xpModifier, biome } = useEnvironmentalSensors();
 * await requestPermission('geolocation');
 * await startMonitoring();
 * console.log('Activity:', environmentalContext.motion.activity_type);
 * console.log('XP Modifier:', xpModifier);
 * console.log('Biome:', biome); // 'urban' | 'forest' | 'desert' | ...
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} requestPermission - Requests permission for a sensor type ('geolocation' | 'motion' | 'light')
 * @returns {Function} startMonitoring - Starts monitoring all sensors (returns cleanup function)
 * @returns {boolean} isMonitoring - Whether monitoring is currently active
 * @returns {Object} environmentalContext - Current environmental context data
 * @returns {Object} permissions - Permission state for each sensor type
 * @returns {Object} sensors - Raw sensors instance for direct access to engine methods
 * @returns {number} xpModifier - Current XP modifier (1.0 - 3.0) based on environmental factors
 * @returns {string} biome - Current biome type derived from location (urban, forest, desert, etc.)
 */
export const useEnvironmentalSensors = () => {
    const { settings } = useAppStore();
    const {
        permissions,
        setPermission,
        updateEnvironmentalContext,
        environmentalContext
    } = useSensorStore();

    const [sensors] = useState(() => new EnvironmentalSensors(settings.openWeatherApiKey));

    const [isMonitoring, setIsMonitoring] = useState(false);

    // Calculate XP modifier from environmental context (1.0 - 3.0)
    // Updates whenever environmentalContext changes
    const xpModifier = useMemo(() => {
        if (!environmentalContext) return 1.0;
        return sensors.calculateXPModifier();
    }, [environmentalContext, sensors]);

    // Extract biome from environmental context
    // Biome is derived from location data and represents the environmental zone
    const biome = useMemo((): BiomeType | undefined => {
        if (!environmentalContext) return undefined;
        return (environmentalContext as any).biome;
    }, [environmentalContext]);

    // Update API key if settings change
    useEffect(() => {
        // Note: Engine might not support dynamic config update easily without re-instantiation
        // For now, we assume it uses the one passed in constructor.
        // Ideally we'd update it.
    }, [settings.openWeatherApiKey]);

    const requestPermission = useCallback(async (sensorType: 'geolocation' | 'motion' | 'light') => {
        logger.info('EnvironmentalSensors', `Requesting permission: ${sensorType}`);

        try {
            let granted = false;

            if (sensorType === 'motion') {
                // This is the REAL iOS permission prompt
                if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                    const response = await (DeviceMotionEvent as any).requestPermission();
                    granted = response === 'granted';
                } else {
                    // Android or desktop: usually auto-granted
                    granted = true;
                }
            } else if (sensorType === 'geolocation') {
                // Trigger actual geolocation prompt
                await new Promise<void>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        () => resolve(),
                        (error) => {
                            // PositionError.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
                            if (error.code === 1) {
                                reject(new Error('Geolocation permission denied. Please enable location access in your browser settings to use GPS features.'));
                            } else if (error.code === 2) {
                                reject(new Error('Location information unavailable. Please check your device location settings.'));
                            } else if (error.code === 3) {
                                reject(new Error('Location request timed out. Please try again.'));
                            } else {
                                reject(new Error(`Geolocation error: ${error.message}`));
                            }
                        }
                    );
                });
                granted = true;
            } else if (sensorType === 'light') {
                // Light sensor usually doesn't need explicit request
                granted = true;
            }

            setPermission(sensorType, granted ? 'granted' : 'denied');
            return granted;
        } catch (error) {
            console.error(`Permission denied for ${sensorType}`, error);
            setPermission(sensorType, 'denied');
            handleError(error, 'EnvironmentalSensors');
            return false;
        }
    }, [setPermission]);

    const startMonitoring = useCallback(async () => {
        if (isMonitoring) return;

        logger.info('EnvironmentalSensors', 'Starting monitoring');
        setIsMonitoring(true);

        try {
            // Start push-based sensors (motion + light) with live callback
            sensors.startMonitoring((context) => {
                // This fires instantly on every shake/tilt
                // updateEnvironmentalContext({ ...context } as any);
                updateEnvironmentalContext({ ...context });
            });

            // Initial pull of geolocation + weather
            const initial = await sensors.updateSnapshot();
            updateEnvironmentalContext({ ...initial } as any);

            // Keep geolocation/weather fresh every 30 seconds
            const interval = setInterval(async () => {
                try {
                    const updated = await sensors.updateSnapshot();
                    updateEnvironmentalContext({ ...updated } as any);
                } catch (err) {
                    logger.warn('EnvironmentalSensors', 'Snapshot update failed', err);
                }
            }, 30_000);

            // Cleanup function
            return () => {
                clearInterval(interval);
                sensors.stopMonitoring();
                setIsMonitoring(false);
            };
        } catch (error) {
            handleError(error, 'EnvironmentalSensors');
            setIsMonitoring(false);
        }
    }, [sensors, isMonitoring, updateEnvironmentalContext]);

    return { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors, xpModifier, biome };
};
