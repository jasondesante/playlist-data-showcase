import { useState, useCallback, useEffect, useMemo } from 'react';
import { EnvironmentalSensors, BiomeType, XPBonusSource, XpModifierBreakdown, SolarInfo } from 'playlist-data-engine';
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
    const { settings, _hasHydrated } = useAppStore();
    const {
        permissions,
        setPermission,
        updateEnvironmentalContext,
        environmentalContext
    } = useSensorStore();

    // Track the API key that was used to create the sensors instance
    // This allows us to recreate the instance when the key changes
    const [sensors, setSensors] = useState<EnvironmentalSensors | null>(null);
    const [usedApiKey, setUsedApiKey] = useState<string>('');

    // Create or recreate sensors instance when API key changes (after hydration)
    useEffect(() => {
        // Wait for hydration before creating sensors instance
        if (!_hasHydrated) {
            logger.debug('EnvironmentalSensors', 'Waiting for settings hydration...');
            return;
        }

        const apiKey = settings.openWeatherApiKey;

        // Only recreate if the API key has changed
        if (apiKey === usedApiKey && sensors) {
            return;
        }

        if (apiKey) {
            const maskedKey = apiKey.length > 8
                ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
                : `${apiKey.slice(0, 2)}...${apiKey.slice(-2)}`;
            logger.info('EnvironmentalSensors', `Initializing with API key: ${maskedKey} (${apiKey.length} chars)`);
        } else {
            logger.warn('EnvironmentalSensors', 'No OpenWeather API key configured - weather data will not load');
        }

        const newSensors = new EnvironmentalSensors(apiKey);
        setSensors(newSensors);
        setUsedApiKey(apiKey);
        logger.info('EnvironmentalSensors', 'EnvironmentalSensors instance created/updated');
    }, [_hasHydrated, settings.openWeatherApiKey, usedApiKey, sensors]);

    // Sync engine permissions with browser's actual permission state when sensors instance is created
    // This fixes the bug where permissions had to be requested every time
    useEffect(() => {
        if (!sensors) return;

        const syncPermissionsWithBrowser = async () => {
            const typesToRequest: ('geolocation' | 'motion' | 'weather' | 'light')[] = [];

            // Check geolocation permission
            if ('permissions' in navigator) {
                try {
                    const geoStatus = await navigator.permissions.query({ name: 'geolocation' });
                    if (geoStatus.state === 'granted') {
                        typesToRequest.push('geolocation', 'weather');
                    }
                } catch {
                    // Some browsers don't support permissions.query for geolocation
                }
            }

            // Check motion permission (desktop browsers usually auto-grant)
            if ('DeviceMotionEvent' in window) {
                if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
                    // Desktop browser - motion is auto-granted
                    typesToRequest.push('motion');
                }
                // iOS requires explicit user gesture to check/request, so we skip it here
            }

            // Request permissions for already-granted browser permissions
            if (typesToRequest.length > 0) {
                logger.info('EnvironmentalSensors', 'Auto-syncing permissions with browser state', typesToRequest);
                await sensors.requestPermissions(typesToRequest);

                // Update React store to reflect the synced state
                typesToRequest.forEach(type => {
                    if (type !== 'weather') {
                        setPermission(type, 'granted');
                    }
                });
            }
        };

        syncPermissionsWithBrowser();
    }, [sensors, setPermission]);

    const [isMonitoring, setIsMonitoring] = useState(false);

    // Severe weather alert state - updated when weather changes
    // Null if no severe weather detected
    const [severeWeatherAlert, setSevereWeatherAlert] = useState<SevereWeatherAlert | null>(null);

    // Diagnostics state for debugging sensor issues
    // Contains sensor health, cache stats, and recent failures
    // Uses 'any' since engine's internal type is complex and diagnostics is for debugging
    const [diagnostics, setDiagnostics] = useState<any>(null);

    // Weather-specific error state for UI display
    // Contains the last error message from weather API calls
    const [weatherError, setWeatherError] = useState<string | null>(null);

    // Last successful weather update timestamp
    // Used to show "last successful update" in the UI
    const [lastWeatherSuccess, setLastWeatherSuccess] = useState<number | null>(null);

    // Solar info state - always available when we have location
    // Works WITHOUT API key using astronomical calculations
    const [solarInfo, setSolarInfo] = useState<SolarInfo | null>(null);


    // Calculate XP modifier from environmental context (1.0 - 3.0)
    // Updates whenever environmentalContext changes
    const xpModifier = useMemo(() => {
        if (!environmentalContext || !sensors) return 1.0;
        return sensors.calculateXPModifier();
    }, [environmentalContext, sensors]);

    // Get detailed XP modifier breakdown from engine
    // Includes active bonus sources with labels, icons, and values
    const xpBreakdown = useMemo((): XpModifierBreakdown | null => {
        if (!environmentalContext || !sensors) return null;
        return sensors.getXpModifierBreakdown();
    }, [environmentalContext, sensors]);

    // Extract active bonus sources for UI display
    const xpBonusSources = useMemo((): XPBonusSource[] => {
        return xpBreakdown?.activeBonuses ?? [];
    }, [xpBreakdown]);

    // Extract biome from environmental context
    // Biome is derived from location data and represents the environmental zone
    const biome = useMemo((): BiomeType | undefined => {
        if (!environmentalContext) return undefined;
        return (environmentalContext as any).biome;
    }, [environmentalContext]);

    const requestPermission = useCallback(async (sensorType: 'geolocation' | 'motion' | 'light') => {
        logger.info('EnvironmentalSensors', `Requesting permission: ${sensorType}`);

        try {
            // Call the engine's requestPermissions method to update its internal state
            // This is critical - the engine's startMonitoring() checks its own permission state
            if (sensors) {
                // For geolocation, also request weather permission (weather needs GPS coordinates)
                const typesToRequest: ('geolocation' | 'motion' | 'weather' | 'light')[] = [sensorType];
                if (sensorType === 'geolocation') {
                    typesToRequest.push('weather'); // Weather doesn't need browser permission, but engine needs it set
                }

                const results = await sensors.requestPermissions(typesToRequest);
                const result = results.find(r => r.type === sensorType);
                const granted = result?.granted ?? false;

                // Also update the React store for UI display
                setPermission(sensorType, granted ? 'granted' : 'denied');
                return granted;
            }

            // Fallback if sensors not initialized yet (shouldn't happen after hydration)
            let granted = false;

            if (sensorType === 'motion') {
                if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
                    const response = await (DeviceMotionEvent as any).requestPermission();
                    granted = response === 'granted';
                } else {
                    granted = true;
                }
            } else if (sensorType === 'geolocation') {
                await new Promise<void>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        () => resolve(),
                        (error) => {
                            if (error.code === 1) {
                                reject(new Error('Geolocation permission denied.'));
                            } else if (error.code === 2) {
                                reject(new Error('Location unavailable.'));
                            } else if (error.code === 3) {
                                reject(new Error('Location request timed out.'));
                            } else {
                                reject(new Error(`Geolocation error: ${error.message}`));
                            }
                        }
                    );
                });
                granted = true;
            } else if (sensorType === 'light') {
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
    }, [sensors, setPermission]);

    // Helper to update diagnostics for debugging (shared between functions)
    const updateDiagnosticsState = useCallback(() => {
        if (!sensors) return;

        const diag = sensors.getDiagnostics();
        setDiagnostics(diag);

        // Extract weather-specific error from diagnostics
        const weatherSensor = (diag.sensors as any[])?.find((s: any) => s?.type?.toLowerCase() === 'weather');
        if (weatherSensor?.lastError) {
            setWeatherError(weatherSensor.lastError);
        }

        // Clear error if weather is working
        if (weatherSensor?.health === 'healthy') {
            setWeatherError(null);
        }
    }, [sensors]);

    // Helper to check and track weather status (shared between functions)
    const checkWeatherStatus = useCallback((context: any) => {
        if (!sensors) return;

        if (context?.weather) {
            setLastWeatherSuccess(Date.now());
            setWeatherError(null);
        } else {
            // Check diagnostics for weather error
            const diag = sensors.getDiagnostics();
            const weatherSensor = (diag.sensors as any[])?.find((s: any) => s?.type?.toLowerCase() === 'weather');
            if (weatherSensor?.lastError) {
                setWeatherError(weatherSensor.lastError);
            }
        }

        // Update solar info whenever we have location (works without API key)
        if (context?.geolocation || sensors.getLastKnownGood('geolocation')?.geolocation) {
            const solar = sensors.getSolarInfo();
            setSolarInfo(solar);
        }
    }, [sensors]);

    const startMonitoring = useCallback(async () => {
        if (isMonitoring) return;
        if (!sensors) {
            logger.warn('EnvironmentalSensors', 'Cannot start monitoring - sensors instance not ready (waiting for hydration)');
            return;
        }

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
            // Check weather status for error tracking
            checkWeatherStatus(initial);
            // Update diagnostics after initial snapshot
            updateDiagnosticsState();

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
                    // Check weather status for error tracking
                    checkWeatherStatus(updated);
                    // Update diagnostics after each update
                    updateDiagnosticsState();
                } catch (err) {
                    logger.warn('EnvironmentalSensors', 'Snapshot update failed', err);
                    // Still update diagnostics on error to show the failure
                    updateDiagnosticsState();
                }
            }, 30_000);

            // Cleanup function
            return () => {
                clearInterval(interval);
                sensors.stopMonitoring();
                setIsMonitoring(false);
                setSevereWeatherAlert(null);
                setDiagnostics(null);
                setWeatherError(null);
                setLastWeatherSuccess(null);
            };
        } catch (error) {
            handleError(error, 'EnvironmentalSensors');
            setIsMonitoring(false);
        }
    }, [sensors, isMonitoring, updateEnvironmentalContext, settings.openWeatherApiKey, checkWeatherStatus, updateDiagnosticsState]);

    // Manual refresh for weather data
    const refreshWeather = useCallback(async () => {
        if (!sensors || !isMonitoring) {
            logger.warn('EnvironmentalSensors', 'Cannot refresh weather - not monitoring');
            return;
        }

        logger.info('EnvironmentalSensors', 'Manual weather refresh requested');
        try {
            const updated = await sensors.updateSnapshot();
            updateEnvironmentalContext({ ...updated } as any);
            checkWeatherStatus(updated);
            updateDiagnosticsState();
        } catch (err) {
            logger.error('EnvironmentalSensors', 'Manual weather refresh failed', err);
            setWeatherError(err instanceof Error ? err.message : 'Weather refresh failed');
            updateDiagnosticsState();
        }
    }, [sensors, isMonitoring, updateEnvironmentalContext, checkWeatherStatus, updateDiagnosticsState]);

    return { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors, xpModifier, xpBreakdown, xpBonusSources, biome, severeWeatherAlert, diagnostics, weatherError, lastWeatherSuccess, refreshWeather, solarInfo };
};
