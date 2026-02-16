import { useState, useCallback, useEffect, useRef } from 'react';
import {
    XPCalculator,
    EnvironmentalContext,
    GamingContext,
    mergeProgressionConfig,
    type ProgressionConfig
} from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useProgressionConfig } from '@/store/progressionConfigStore';
import type { ProgressionConfigSettings } from '@/types';

export interface XPBreakdown {
    baseXP: number;
    environmentalMultiplier: number;
    environmentalBonusXP: number;
    gamingMultiplier: number;
    gamingBonusXP: number;
    masteryBonusXP: number;
    totalMultiplier: number;
    totalXP: number;
    isManualOverride?: boolean;
    environmentalDetails?: {
        activity?: string;
        isNightTime?: boolean;
        weather?: string;
        altitude?: number;
    };
    gamingDetails?: {
        isActivelyGaming?: boolean;
        gameName?: string;
        gameGenre?: string;
    };
}

/**
 * React hook for calculating XP breakdowns for listening sessions.
 *
 * Provides detailed XP calculations with environmental and gaming modifier
 * breakdowns for UI display. The calculator applies bonuses for:
 * - Activity type (running, walking, stationary)
 * - Night time, weather, altitude
 * - Gaming session length and genre
 * - Track mastery (+50 XP flat)
 *
 * @example
 * ```tsx
 * const { calculateXP } = useXPCalculator();
 * const breakdown = await calculateXP(300, envContext, gamingContext, true);
 * console.log(`Total XP: ${breakdown.totalXP} (Base: ${breakdown.baseXP}, Multiplier: ${breakdown.totalMultiplier}x)`);
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} calculateXP - Calculates detailed XP breakdown for a session
 */

/**
 * Map our app's progression config to the engine's ProgressionConfig format.
 *
 * Note: Not all of our config fields map directly to the engine:
 * - Gaming bonuses (gaming_base, rpg_game, etc.) are NOT in ProgressionConfig
 * - rain/snow/storm all map to extreme_weather in the engine
 * - altitude maps to high_altitude in the engine
 *
 * @param config - Our app's progression config settings
 * @returns Partial ProgressionConfig for mergeProgressionConfig()
 */
const mapConfigToEngineFormat = (config: ProgressionConfigSettings) => {
    // Use the highest weather bonus for extreme_weather
    const maxWeatherBonus = Math.max(
        config.activity_bonuses.rain,
        config.activity_bonuses.snow,
        config.activity_bonuses.storm
    );

    // We only provide the fields we want to override.
    // mergeProgressionConfig will merge with defaults for unspecified fields.
    // Type assertion is safe here because the engine handles partial configs.
    return {
        xp: {
            xp_per_second: config.xp_per_second,
            activity_bonuses: {
                stationary: 1.0, // Default - we don't have this in our config
                running: config.activity_bonuses.running,
                walking: config.activity_bonuses.walking,
                driving: 1.0, // Default - we don't have this in our config
                night_time: config.activity_bonuses.night_time,
                extreme_weather: maxWeatherBonus,
                high_altitude: config.activity_bonuses.altitude,
            }
        }
    } as Partial<ProgressionConfig>;
};

export const useXPCalculator = () => {
    const config = useProgressionConfig();
    const [calculator] = useState(() => new XPCalculator({
        xp_per_second: config.xp_per_second
    }));

    // Track previous config to avoid unnecessary engine updates
    const prevConfigRef = useRef<string>('');

    /**
     * Sync our progression config with the engine's global config.
     * This is called whenever our config changes.
     *
     * Note: The engine's mergeProgressionConfig() affects global state.
     * This is intentional for the showcase app - we want to demonstrate
     * the engine API and have config changes affect all calculations.
     */
    useEffect(() => {
        const configJson = JSON.stringify(config);

        // Only update if config actually changed
        if (prevConfigRef.current === configJson) {
            return;
        }
        prevConfigRef.current = configJson;

        try {
            const engineConfig = mapConfigToEngineFormat(config);
            const mergedConfig = mergeProgressionConfig(engineConfig);

            logger.info('XPCalculator', 'Engine config updated', {
                xp_per_second: mergedConfig.xp.xp_per_second,
                running: mergedConfig.xp.activity_bonuses.running,
                walking: mergedConfig.xp.activity_bonuses.walking,
                night_time: mergedConfig.xp.activity_bonuses.night_time,
                extreme_weather: mergedConfig.xp.activity_bonuses.extreme_weather,
            });
        } catch (error) {
            handleError(error, 'XPCalculator.mergeProgressionConfig');
        }
    }, [config]);

    /**
     * Calculate detailed XP breakdown for a listening session
     *
     * Note: This is a client-side calculation for demonstration purposes.
     * The actual XPCalculator.calculateSessionXP() in the engine is more complex
     * and handles internal state differently. This implementation provides a
     * detailed breakdown for UI display purposes.
     *
     * @param durationSeconds - Length of the listening session in seconds
     * @param envContext - Environmental context (optional, for environmental bonuses)
     * @param gamingContext - Gaming context (optional, for gaming bonuses)
     * @param isMastered - Whether the track is mastered (for mastery bonus)
     * @param manualOverrides - Optional manual override values for testing
     */
    const calculateXP = useCallback((
        durationSeconds: number,
        envContext?: EnvironmentalContext,
        gamingContext?: GamingContext,
        isMastered: boolean = false,
        manualOverrides?: {
            baseXP?: number;
            environmentalMultiplier?: number;
            gamingMultiplier?: number;
        }
    ): XPBreakdown | null => {
        logger.info('XPCalculator', 'Calculating XP', { durationSeconds, isMastered });

        try {
            // Use manual overrides if provided, otherwise calculate automatically
            const isManualMode = !!manualOverrides;

            // Base XP: use override if provided, otherwise calculate from duration
            const baseXP = manualOverrides?.baseXP ?? Math.floor(durationSeconds * config.xp_per_second);

            // Calculate or override environmental modifier
            let envMultiplier = 1.0;
            const envDetails: NonNullable<XPBreakdown['environmentalDetails']> = {};

            if (manualOverrides?.environmentalMultiplier !== undefined) {
                // Use manual override
                envMultiplier = manualOverrides.environmentalMultiplier;
                envDetails.activity = 'Manual override';
            } else if (envContext?.motion) {
                // Auto-calculate from context
                const x = envContext.motion.acceleration.x ?? 0;
                const y = envContext.motion.acceleration.y ?? 0;
                const z = envContext.motion.acceleration.z ?? 0;
                const movementIntensity = Math.abs(x) + Math.abs(y) + Math.abs(z);

                // Estimate activity from movement intensity (simplified)
                // Use config values for multipliers
                if (movementIntensity > 3) {
                    envDetails.activity = 'running';
                    envMultiplier = config.activity_bonuses.running;
                } else if (movementIntensity > 0.5) {
                    envDetails.activity = 'walking';
                    envMultiplier = config.activity_bonuses.walking;
                } else {
                    envDetails.activity = 'stationary';
                    envMultiplier = 1.0;
                }
            }

            // Night time bonus - check from weather data
            if (envContext?.weather?.isNight && !isManualMode) {
                envDetails.isNightTime = true;
                envMultiplier = Math.max(envMultiplier, config.activity_bonuses.night_time);
            }

            // Weather bonus - use the highest weather bonus from config
            if (envContext?.weather && !isManualMode) {
                const weatherType = envContext.weather.weatherType?.toLowerCase();
                envDetails.weather = envContext.weather.weatherType;
                if (weatherType && ['rain', 'snow', 'thunderstorm', 'mist', 'fog'].some(w => weatherType.includes(w))) {
                    // Use storm bonus for extreme weather (highest)
                    envMultiplier = Math.max(envMultiplier, config.activity_bonuses.storm);
                }
            }

            // High altitude bonus for >=2000m
            if (envContext?.geolocation?.altitude && envContext.geolocation.altitude >= 2000 && !isManualMode) {
                envDetails.altitude = envContext.geolocation.altitude;
                envMultiplier = Math.max(envMultiplier, config.activity_bonuses.altitude);
            }

            // Calculate or override gaming modifier
            let gamingMultiplier = 1.0;
            const gamingDetails: NonNullable<XPBreakdown['gamingDetails']> = {};

            if (manualOverrides?.gamingMultiplier !== undefined) {
                // Use manual override
                gamingMultiplier = manualOverrides.gamingMultiplier;
                gamingDetails.isActivelyGaming = true;
                gamingDetails.gameName = 'Manual override';
            } else if (gamingContext?.isActivelyGaming) {
                // Auto-calculate from context
                gamingDetails.isActivelyGaming = true;

                // Base gaming bonus from config
                gamingMultiplier = config.activity_bonuses.gaming_base;
                gamingDetails.gameName = gamingContext.currentGame?.name;

                // Game type bonuses - genre is string[]
                if (gamingContext.currentGame?.genre) {
                    const genres = gamingContext.currentGame.genre;
                    // Join genres for display
                    gamingDetails.gameGenre = genres.join(', ');

                    // Check for RPG bonus
                    if (genres.some(g => g.toLowerCase().includes('rpg'))) {
                        gamingMultiplier += config.activity_bonuses.rpg_game;
                    } else if (genres.some(g => g.toLowerCase().includes('action') || g.toLowerCase().includes('fps'))) {
                        gamingMultiplier += config.activity_bonuses.action_fps;
                    }

                    // Multiplayer bonus - check party size
                    const partySize = gamingContext.currentGame.partySize;
                    if (partySize && partySize > 1) {
                        gamingMultiplier += config.activity_bonuses.multiplayer;
                    }
                }

                // Cap gaming multiplier at 1.75x (reasonable cap for gaming)
                gamingMultiplier = Math.min(gamingMultiplier, 1.75);
            }

            // Mastery bonus: +50 XP flat (not a multiplier)
            const masteryBonusXP = isMastered ? 50 : 0;

            // Calculate bonus XP from modifiers
            const environmentalBonusXP = Math.floor(baseXP * (envMultiplier - 1.0));
            const gamingBonusXP = Math.floor(baseXP * (gamingMultiplier - 1.0));

            // Total multiplier (environmental × gaming), capped at config max
            const totalMultiplier = Math.min(config.activity_bonuses.max_multiplier, envMultiplier * gamingMultiplier);
            const totalMultiplierBonus = Math.floor(baseXP * (totalMultiplier - 1.0));

            // Total XP = Base + Environmental Bonus + Gaming Bonus + Mastery Bonus
            const totalXP = baseXP + totalMultiplierBonus + masteryBonusXP;

            const breakdown: XPBreakdown = {
                baseXP,
                environmentalMultiplier: envMultiplier,
                environmentalBonusXP,
                gamingMultiplier,
                gamingBonusXP,
                masteryBonusXP,
                totalMultiplier,
                totalXP,
                isManualOverride: !!manualOverrides,
                environmentalDetails: Object.keys(envDetails).length > 0 ? envDetails : undefined,
                gamingDetails: Object.keys(gamingDetails).length > 0 ? gamingDetails : undefined
            };

            logger.info('XPCalculator', 'Calculation result', breakdown);
            return breakdown;
        } catch (error) {
            handleError(error, 'XPCalculator');
            return null;
        }
    }, [calculator, config]);

    return { calculateXP };
};
