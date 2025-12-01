import { useState, useCallback } from 'react';
import { CombatEngine, CharacterSheet } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

export const useCombatEngine = () => {
    const [engine] = useState(() => new CombatEngine());

    const startCombat = useCallback((party: CharacterSheet[], enemies: CharacterSheet[]) => {
        logger.info('CombatEngine', 'Starting combat', {
            partySize: party.length,
            enemyCount: enemies.length
        });

        try {
            const combat = engine.startCombat(party, enemies);

            logger.info('CombatEngine', 'Combat initialized', {
                combatId: combat.id,
                turnOrder: combat.combatants.map(c => c.character.name)
            });

            return combat;
        } catch (error) {
            handleError(error, 'CombatEngine');
            return null;
        }
    }, [engine]);

    return { startCombat };
};
