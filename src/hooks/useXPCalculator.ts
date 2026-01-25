import { useState, useCallback } from 'react';
import { XPCalculator, EnvironmentalContext, GamingContext } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';
import { useAppStore } from '@/store/appStore';

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
export const useXPCalculator = () => {
    const { settings } = useAppStore();
    const [calculator] = useState(() => new XPCalculator({
        xp_per_second: settings.baseXpRate
    }));

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
            const baseXP = manualOverrides?.baseXP ?? Math.floor(durationSeconds * settings.baseXpRate);

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
                if (movementIntensity > 3) {
                    envDetails.activity = 'running';
                    envMultiplier = 1.5;
                } else if (movementIntensity > 0.5) {
                    envDetails.activity = 'walking';
                    envMultiplier = 1.2;
                } else {
                    envDetails.activity = 'stationary';
                    envMultiplier = 1.0;
                }
            }

            // Night time bonus (1.25x) - check from weather data
            if (envContext?.weather?.isNight && !isManualMode) {
                envDetails.isNightTime = true;
                envMultiplier = Math.max(envMultiplier, 1.25);
            }

            // Weather bonus (1.4x for extreme weather)
            if (envContext?.weather && !isManualMode) {
                const weatherType = envContext.weather.weatherType?.toLowerCase();
                envDetails.weather = envContext.weather.weatherType;
                if (weatherType && ['rain', 'snow', 'thunderstorm', 'mist', 'fog'].some(w => weatherType.includes(w))) {
                    envMultiplier = Math.max(envMultiplier, 1.4);
                }
            }

            // High altitude bonus (1.3x for >=2000m)
            if (envContext?.geolocation?.altitude && envContext.geolocation.altitude >= 2000 && !isManualMode) {
                envDetails.altitude = envContext.geolocation.altitude;
                envMultiplier = Math.max(envMultiplier, 1.3);
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

                // Base gaming bonus: +0.25x
                gamingMultiplier = 1.25;
                gamingDetails.gameName = gamingContext.currentGame?.name;

                // Game type bonuses - genre is string[]
                if (gamingContext.currentGame?.genre) {
                    const genres = gamingContext.currentGame.genre;
                    // Join genres for display
                    gamingDetails.gameGenre = genres.join(', ');

                    // Check for RPG bonus
                    if (genres.some(g => g.toLowerCase().includes('rpg'))) {
                        gamingMultiplier += 0.20; // +0.20x for RPG
                    } else if (genres.some(g => g.toLowerCase().includes('action') || g.toLowerCase().includes('fps'))) {
                        gamingMultiplier += 0.15; // +0.15x for Action/FPS
                    }

                    // Multiplayer bonus - check party size
                    const partySize = gamingContext.currentGame.partySize;
                    if (partySize && partySize > 1) {
                        gamingMultiplier += 0.15;
                    }
                }

                // Cap gaming multiplier at 1.75x
                gamingMultiplier = Math.min(gamingMultiplier, 1.75);
            }

            // Mastery bonus: +50 XP flat (not a multiplier)
            const masteryBonusXP = isMastered ? 50 : 0;

            // Calculate bonus XP from modifiers
            const environmentalBonusXP = Math.floor(baseXP * (envMultiplier - 1.0));
            const gamingBonusXP = Math.floor(baseXP * (gamingMultiplier - 1.0));

            // Total multiplier (environmental × gaming), capped at 3.0x
            const totalMultiplier = Math.min(3.0, envMultiplier * gamingMultiplier);
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
    }, [calculator, settings.baseXpRate]);

    return { calculateXP };
};
