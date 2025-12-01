import { useState, useCallback } from 'react';
import { CharacterUpdater, CharacterSheet, ListeningSession } from 'playlist-data-engine';
import { useCharacterStore } from '@/store/characterStore';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

export const useCharacterUpdater = () => {
    const { updateCharacter } = useCharacterStore();
    const [updater] = useState(() => new CharacterUpdater());

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

    return { processSession, addManualXP };
};
