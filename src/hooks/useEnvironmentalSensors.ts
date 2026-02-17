import { useState, useCallback, useEffect, useMemo } from 'react';
import { EnvironmentalSensors, BiomeType } from 'playlist-data-engine';
import { useSensorStore } from '@/store/sensorStore';
import { useAppStore } from '@/store/appStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * Severe weather alert information
 * (Defined locally since not exported from engine's public API)
 */
export interface SevereWeatherAlert {
    type: 'Blizzard' | 'Hurricane' | 'Typhoon' | 'Tornado' | 'None';
    xpBonus: number; // 0.5 to 1.0 (50% to 100%)
    severity: 'moderate' | 'high' | 'extreme';
    message: string;
    detectedAt: number;
}

/**
 * React hook for environmental sensor integration via the EnvironmentalSensors engine module.
 *
 * Manages permissions and real-time monitoring of GPS, motion, and weather sensors.
 * Provides environmental context data for XP modifier calculations.
 *
 * @example
 * ```tsx
 * const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, xpModifier, biome, severeWeatherAlert, diagnostics } = useEnvironmentalSensors();
 * await requestPermission('geolocation');
 * await startMonitoring();
 * console.log('Activity:', environmentalContext.motion.activity_type);
 * console.log('XP Modifier:', xpModifier);
 * console.log('Biome:', biome); // 'urban' | 'forest' | 'desert' | ...
 * console.log('Severe Weather:', severeWeatherAlert); // null if no severe weather
 * console.log('Diagnostics:', diagnostics); // sensor health, cache stats, failures
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
 * @returns {Object|null} severeWeatherAlert - Severe weather alert if detected, null otherwise
 * @returns {Object|null} diagnostics - Comprehensive sensor diagnostics for debugging
 */
export const useEnvironmentalSensors = () => {
    const { settings } = useAppStore();
    const {
        permissions,
        setPermission,
        updateEnvironmentalContext,
        environmentalContext
    } = useSensorStore();

    const [sensors] = useState(() => {
        const apiKey = settings.openWeatherApiKey;
        // Debug: Log API key initialization (first/last 4 chars for security)
        if (apiKey) {
            const maskedKey = apiKey.length > 8
                ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
                : `${apiKey.slice(0, 2)}...${apiKey.slice(-2)}`;
            logger.info('EnvironmentalSensors', `Initializing with API key: ${maskedKey} (${apiKey.length} chars)`);
        } else {
            logger.warn('EnvironmentalSensors', 'No OpenWeather API key configured - weather data will not load');
        }
        return new EnvironmentalSensors(apiKey);
    });

    const [isMonitoring, setIsMonitoring] = useState(false);

    // Severe weather alert state - updated when weather changes
    // Null if no severe weather detected
    const [severeWeatherAlert, setSevereWeatherAlert] = useState<SevereWeatherAlert | null>(null);

    // Diagnostics state for debugging sensor issues
    // Contains sensor health, cache stats, and recent failures
    // Uses 'any' since engine's internal type is complex and diagnostics is for debugging
    const [diagnostics, setDiagnostics] = useState<any>(null);

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
        // Debug: Log current settings state for troubleshooting
        const apiKey = settings.openWeatherApiKey;
        if (apiKey) {
            const maskedKey = apiKey.length > 8
                ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
                : `${apiKey.slice(0, 2)}...${apiKey.slice(-2)}`;
            logger.debug('EnvironmentalSensors', `Current API key from settings: ${maskedKey} (${apiKey.length} chars)`);
        } else {
            logger.warn('EnvironmentalSensors', 'No API key found in settings - weather will not load');
        }
        setIsMonitoring(true);

        // Helper to detect and update severe weather alert
        const updateSevereWeather = () => {
            const alert = sensors.detectSevereWeather();
            setSevereWeatherAlert(alert as SevereWeatherAlert | null);
            if (alert) {
                logger.info('EnvironmentalSensors', `Severe weather detected: ${alert.type}`, alert);
            }
        };

        // Helper to update diagnostics for debugging
        const updateDiagnostics = () => {
            const diag = sensors.getDiagnostics();
            setDiagnostics(diag);
        };

        try {
            // Start push-based sensors (motion + light) with live callback
            sensors.startMonitoring((context) => {
                // This fires instantly on every shake/tilt
                // updateEnvironmentalContext({ ...context } as any);
                updateEnvironmentalContext({ ...context });
            });

            // Initial pull of geolocation + weather
            logger.debug('EnvironmentalSensors', 'Calling updateSnapshot() for initial data...');
            const initial = await sensors.updateSnapshot();
            logger.debug('EnvironmentalSensors', 'updateSnapshot() returned', {
                hasGeolocation: !!(initial as any).geolocation,
                hasWeather: !!(initial as any).weather,
                weatherData: (initial as any).weather ? {
                    temp: (initial as any).weather.temperature,
                    condition: (initial as any).weather.condition,
                    description: (initial as any).weather.description
                } : null
            });
            updateEnvironmentalContext({ ...initial } as any);
            // Check for severe weather after initial snapshot
            updateSevereWeather();
            // Update diagnostics after initial snapshot
            updateDiagnostics();

            // Keep geolocation/weather fresh every 30 seconds
            const interval = setInterval(async () => {
                try {
                    logger.debug('EnvironmentalSensors', 'Calling updateSnapshot() (interval refresh)...');
                    const updated = await sensors.updateSnapshot();
                    logger.debug('EnvironmentalSensors', 'updateSnapshot() interval returned', {
                        hasGeolocation: !!(updated as any).geolocation,
                        hasWeather: !!(updated as any).weather,
                        weatherData: (updated as any).weather ? {
                            temp: (updated as any).weather.temperature,
                            condition: (updated as any).weather.condition
                        } : null
                    });
                    updateEnvironmentalContext({ ...updated } as any);
                    // Check for severe weather after each update
                    updateSevereWeather();
                    // Update diagnostics after each update
                    updateDiagnostics();
                } catch (err) {
                    logger.warn('EnvironmentalSensors', 'Snapshot update failed', err);
                    // Still update diagnostics on error to show the failure
                    updateDiagnostics();
                }
            }, 30_000);

            // Cleanup function
            return () => {
                clearInterval(interval);
                sensors.stopMonitoring();
                setIsMonitoring(false);
                setSevereWeatherAlert(null);
                setDiagnostics(null);
            };
        } catch (error) {
            handleError(error, 'EnvironmentalSensors');
            setIsMonitoring(false);
        }
    }, [sensors, isMonitoring, updateEnvironmentalContext]);

    return { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors, xpModifier, biome, severeWeatherAlert, diagnostics };
};
