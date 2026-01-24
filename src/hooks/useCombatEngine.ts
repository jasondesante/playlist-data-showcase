import { useState, useCallback } from 'react';
import { CombatEngine, CharacterSheet } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { handleError } from '@/utils/errorHandling';

// Types from playlist-data-engine that are not exported from the main package
export interface Combatant {
  id: string;
  character: CharacterSheet;
  initiative: number;
  currentHP: number;
  temporaryHP?: number;
  statusEffects: any[];
  position?: { x: number; y: number };
  isDefeated: boolean;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  spellSlots?: { [level: number]: number };
}

export interface CombatInstance {
  id: string;
  combatants: Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
  environment?: any;
  history: any[];
  isActive: boolean;
  winner?: Combatant;
  startTime: number;
  lastUpdated: number;
}

export interface CombatAction {
  type: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready';
  actor: Combatant;
  target?: Combatant;
  targets?: Combatant[];
  attack?: any;
  spell?: any;
  result?: any;
}

export const useCombatEngine = () => {
    const [engine] = useState(() => new CombatEngine());

    // Combat state
    const [combat, setCombat] = useState<CombatInstance | null>(null);

    const startCombat = useCallback((party: CharacterSheet[], enemies: CharacterSheet[]) => {
        logger.info('CombatEngine', 'Starting combat', {
            partySize: party.length,
            enemyCount: enemies.length
        });

        try {
            const combatInstance = engine.startCombat(party, enemies);

            logger.info('CombatEngine', 'Combat initialized', {
                combatId: combatInstance.id,
                turnOrder: combatInstance.combatants.map(c => c.character.name)
            });

            setCombat(combatInstance);
            return combatInstance;
        } catch (error) {
            handleError(error, 'CombatEngine');
            return null;
        }
    }, [engine]);

    const getCurrentCombatant = useCallback((): Combatant | null => {
        if (!combat) return null;
        return engine.getCurrentCombatant(combat);
    }, [combat, engine]);

    const executeAttack = useCallback((attacker: Combatant, target: Combatant) => {
        if (!combat) return null;

        // Create a basic attack from character's equipment or default
        const attack = attacker.character.equipment?.weapons?.[0]
          ? {
              name: attacker.character.equipment.weapons[0].name,
              damage_dice: '1d6',
              damage_type: 'slashing',
              type: 'melee' as const,
              attack_bonus: attacker.character.ability_modifiers.STR + attacker.character.proficiency_bonus
            }
          : {
              name: 'Unarmed Strike',
              damage_dice: '1',
              damage_type: 'bludgeoning',
              type: 'melee' as const,
              attack_bonus: attacker.character.ability_modifiers.STR
            };

        return engine.executeAttack(combat, attacker, target, attack);
    }, [combat, engine]);

    const nextTurn = useCallback(() => {
        if (!combat) return null;
        const updated = engine.nextTurn(combat);
        setCombat(updated);
        return updated;
    }, [combat, engine]);

    const getCombatResult = useCallback(() => {
        if (!combat) return null;
        return engine.getCombatResult(combat);
    }, [combat, engine]);

    const getLivingCombatants = useCallback((): Combatant[] => {
        if (!combat) return [];
        return combat.combatants.filter(c => !c.isDefeated);
    }, [combat]);

    const resetCombat = useCallback(() => {
        setCombat(null);
    }, []);

    return {
        startCombat,
        getCurrentCombatant,
        executeAttack,
        nextTurn,
        getCombatResult,
        resetCombat,
        getLivingCombatants,
        combat
    };
};
