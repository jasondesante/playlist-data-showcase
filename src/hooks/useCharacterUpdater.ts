import { useState, useCallback } from 'react';
import { CharacterUpdater, CharacterSheet, ListeningSession, type CharacterUpdateResult, type Ability, type StatIncreaseStrategyType, StatManager } from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

/**
 * Result from applying a pending stat increase
 * (Mirrored from playlist-data-engine Progression types)
 */
interface ApplyPendingStatIncreaseResult {
    /** Updated character with stats applied */
    character: CharacterSheet;
    /** Stats that were increased */
    statIncreases: Array<{
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;
    /** Remaining pending stat increases (counter) */
    remainingPending: number;
    /** Timestamp of completion */
    timestamp: number;
}

/**
 * React hook for updating characters with session data and manual XP.
 *
 * This hook wraps the CharacterUpdater engine module to process listening
 * sessions and apply XP, level-ups, and mastery bonuses to characters.
 *
 * @example
 * ```tsx
 * const { processSession, addManualXP, addXPFromSource, updateStatStrategy } = useCharacterUpdater();
 * const result = await processSession(character, session);
 * if (result.leveledUp) console.log('Level up!', result.newLevel);
 *
 * // Add XP from specific source
 * const xpResult = addXPFromSource(character, 500, 'quest');
 *
 * // Change stat strategy (affects future level-ups only)
 * updateStatStrategy('dnD5e_smart');
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} processSession - Processes a listening session and updates character (handles level-ups, mastery)
 * @returns {Function} addManualXP - Adds manual XP to a character (creates dummy session)
 * @returns {Function} addXPFromSource - Adds XP from a specific source (combat, quest, boss_defeat, etc.)
 * @returns {Function} applyPendingStatIncrease - Applies pending stat increases with selected stats
 * @returns {Function} hasPendingStatIncreases - Checks if character has pending stat increases
 * @returns {Function} getPendingStatIncreaseCount - Gets count of pending stat increases
 * @returns {Function} updateStatStrategy - Updates the StatManager strategy for future level-ups
 */
export const useCharacterUpdater = () => {
    const { updateCharacter } = useCharacterStore();

    // Create a single StatManager instance outside of CharacterUpdater
    // This allows us to update its configuration at runtime
    const [statManager] = useState(() => new StatManager({ strategy: 'dnD5e_smart' }));

    // Pass statManager to CharacterUpdater constructor
    const [updater] = useState(() => new CharacterUpdater(statManager));

    const processSession = useCallback((character: CharacterSheet, session: ListeningSession) => {
        logger.info('CharacterUpdater', 'Processing session for character', {
            charName: character.name,
            duration: session.duration_seconds
        });

        try {
            const result = updater.updateCharacterFromSession(character, session);

            if (result.leveledUp) {
                logger.info('CharacterUpdater', 'Level Up!', {
                    newLevel: result.newLevel
                });
            }

            updateCharacter(result.character);
            return result;
        } catch (error) {
            handleError(error, 'CharacterUpdater');
            return null;
        }
    }, [updater, updateCharacter]);

    const addManualXP = useCallback((character: CharacterSheet, amount: number) => {
        logger.info('CharacterUpdater', 'Adding manual XP', { amount });

        // Create a dummy session for manual XP
        const dummySession: ListeningSession = {
            track_uuid: 'manual-xp',
            start_time: Date.now(),
            end_time: Date.now(),
            duration_seconds: 0,
            base_xp_earned: amount,
            bonus_xp: 0,
            total_xp_earned: amount,
            environmental_context: undefined,
            gaming_context: undefined
        };

        return processSession(character, dummySession);
    }, [processSession]);

    /**
     * Add XP from a specific source (combat, quest, boss_defeat, exploration, etc.)
     * Uses the engine's addXP method which handles level-ups and stat increases.
     *
     * Valid source strings: 'combat', 'quest', 'boss_defeat', 'exploration', 'crafting', 'social', or any custom string
     *
     * @param character - The character to add XP to
     * @param amount - Amount of XP to add
     * @param source - Source of the XP for tracking (e.g., 'combat', 'quest', 'boss_defeat')
     * @returns Result object with updated character and level-up details
     */
    const addXPFromSource = useCallback((
        character: CharacterSheet,
        amount: number,
        source?: string
    ): Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'> => {
        logger.info('CharacterUpdater', 'Adding XP from source', {
            charName: character.name,
            amount,
            source: source || 'unknown'
        });

        try {
            const result = updater.addXP(character, amount, source);

            if (result.leveledUp) {
                logger.info('CharacterUpdater', 'Level Up from XP!', {
                    newLevel: result.newLevel,
                    source
                });
            }

            updateCharacter(result.character);
            return result;
        } catch (error) {
            handleError(error, 'CharacterUpdater');
            // Return a safe fallback result
            return {
                character,
                xpEarned: 0,
                leveledUp: false
            };
        }
    }, [updater, updateCharacter]);

    /**
     * Apply pending stat increases with user-selected stats.
     * In D&D 5e, you can either: +2 to one stat OR +1 to two stats.
     *
     * @param character - Character with pending stat increases
     * @param primaryStat - The stat to get +2 (or one of the +1s if using two stats)
     * @param secondaryStats - Optional array of 1 additional stat for +1/+1 distribution
     * @returns Result with updated character, stat increases, and remaining pending count
     */
    const applyPendingStatIncrease = useCallback((
        character: CharacterSheet,
        primaryStat: Ability,
        secondaryStats?: Ability[]
    ): ApplyPendingStatIncreaseResult => {
        logger.info('CharacterUpdater', 'Applying pending stat increase', {
            charName: character.name,
            primaryStat,
            secondaryStats
        });

        try {
            const result = updater.applyPendingStatIncrease(character, primaryStat, secondaryStats);

            logger.info('CharacterUpdater', 'Stat increase applied', {
                increases: result.statIncreases.length,
                remainingPending: result.remainingPending
            });

            updateCharacter(result.character);
            return result;
        } catch (error) {
            handleError(error, 'CharacterUpdater');
            // Return a safe fallback result
            return {
                character,
                statIncreases: [],
                remainingPending: updater.getPendingStatIncreaseCount(character),
                timestamp: Date.now()
            };
        }
    }, [updater, updateCharacter]);

    /**
     * Check if character has pending stat increases.
     *
     * @param character - Character to check
     * @returns true if character has pending stat increases
     */
    const hasPendingStatIncreases = useCallback((character: CharacterSheet): boolean => {
        return updater.hasPendingStatIncreases(character);
    }, [updater]);

    /**
     * Get the count of pending stat increases.
     *
     * @param character - Character to check
     * @returns Number of pending stat increases
     */
    const getPendingStatIncreaseCount = useCallback((character: CharacterSheet): number => {
        return updater.getPendingStatIncreaseCount(character);
    }, [updater]);

    /**
     * Update the StatManager strategy for future level-ups.
     * This changes how stats are automatically increased when characters level up.
     *
     * Strategy changes affect future level-ups only, not existing pending stat increases.
     *
     * Valid strategies:
     * - 'dnD5e': Manual D&D 5e - standard mode, you choose stats manually (+2 to one or +1 to two)
     * - 'dnD5e_smart': Smart Auto - intelligently picks best stats based on class
     * - 'balanced': Balanced - +1 to two lowest stats each time
     * - 'primary_only': Primary Only - always boosts class's primary stat
     * - 'random': Random - random stat selection each level-up
     *
     * @param strategy - The new stat increase strategy to use
     *
     * @example
     * ```tsx
     * // Switch to smart auto-selection
     * updateStatStrategy('dnD5e_smart');
     *
     * // Switch to balanced distribution
     * updateStatStrategy('balanced');
     * ```
     */
    const updateStatStrategy = useCallback((strategy: StatIncreaseStrategyType): void => {
        logger.info('CharacterUpdater', 'Updating stat strategy', { strategy });
        try {
            statManager.updateConfig({ strategy });
            logger.info('CharacterUpdater', 'Stat strategy updated successfully', { strategy });
        } catch (error) {
            handleError(error, 'CharacterUpdater');
        }
    }, [statManager]);

    return {
        processSession,
        addManualXP,
        addXPFromSource,
        applyPendingStatIncrease,
        hasPendingStatIncreases,
        getPendingStatIncreaseCount,
        updateStatStrategy
    };
};
