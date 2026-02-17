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
  type: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'flee' | 'help' | 'hide' | 'ready';
  actor: Combatant;
  target?: Combatant;
  targets?: Combatant[];
  attack?: any;
  spell?: any;
  result?: any;
}

/**
 * React hook for D&D 5e turn-based combat via the CombatEngine engine module.
 *
 * Manages combat instances with initiative tracking, attack resolution, spell casting,
 * and turn management. Supports manual turn-by-turn play or auto-play mode.
 *
 * @example
 * ```tsx
 * const { startCombat, executeAttack, nextTurn, getCombatResult } = useCombatEngine();
 * const combat = startCombat(party, enemies);
 * const action = executeAttack(attacker, target);
 * const updated = nextTurn();
 * const result = getCombatResult();
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} startCombat - Starts a new combat with party and enemies
 * @returns {Function} getCurrentCombatant - Gets the combatant whose turn it is
 * @returns {Function} executeAttack - Executes an attack action
 * @returns {Function} executeCastSpell - Executes a spell cast (deducts spell slot)
 * @returns {Function} nextTurn - Advances to the next combatant's turn
 * @returns {Function} getCombatResult - Gets combat result if combat has ended
 * @returns {Function} resetCombat - Resets combat state to null
 * @returns {Function} getLivingCombatants - Gets all non-defeated combatants
 * @returns {Object} combat - Current combat instance (null if no combat)
 */
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
            // Performance timing: Start timer
            const startTime = performance.now();

            const combatInstance = engine.startCombat(party, enemies);

            // Performance timing: Calculate elapsed time
            const endTime = performance.now();
            const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(3);

            logger.info('CombatEngine', 'Combat initialized', {
                combatId: combatInstance.id,
                turnOrder: combatInstance.combatants.map(c => c.character.name),
                initializationTimeSeconds: elapsedSeconds
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

        const action = engine.executeAttack(combat, attacker, target, attack);

        // Update combat state to reflect HP changes from the attack
        // Use structuredClone for deep copy since engine mutates nested objects
        setCombat(structuredClone(combat));

        return action;
    }, [combat, engine]);

    const nextTurn = useCallback(() => {
        if (!combat) return null;
        const updated = engine.nextTurn(combat);
        // Use structuredClone for deep copy since engine mutates nested objects
        setCombat(structuredClone(updated));
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

    const executeCastSpell = useCallback((
        caster: Combatant,
        spell: any,
        targets: Combatant[]
    ) => {
        if (!combat) return null;

        // Deduct spell slot
        const spellLevel = spell.level || 0;
        if (spellLevel > 0 && caster.spellSlots) {
            const availableSlots = caster.spellSlots[spellLevel] || 0;
            if (availableSlots <= 0) {
                console.warn('[CombatEngine] No spell slots remaining for level', spellLevel);
                return null;
            }
            caster.spellSlots[spellLevel] = availableSlots - 1;
        }

        const action = engine.executeCastSpell(combat, caster, spell, targets);

        // Update combat state to reflect spell slot changes
        // Use structuredClone for deep copy since engine mutates nested objects
        setCombat(structuredClone(combat));

        return action;
    }, [combat, engine]);

    const resetCombat = useCallback(() => {
        setCombat(null);
    }, []);

    // ========================================
    // Phase 4: Tactical Actions (Dodge, Dash, Disengage, Flee)
    // ========================================

    /**
     * Execute Dodge action - grants +2 AC until next turn
     */
    const executeDodge = useCallback((combatant: Combatant) => {
        if (!combat) return null;

        const action = engine.executeDodge(combat, combatant);
        setCombat(structuredClone(combat));
        return action;
    }, [combat, engine]);

    /**
     * Execute Dash action - doubles movement speed for the turn
     */
    const executeDash = useCallback((combatant: Combatant) => {
        if (!combat) return null;

        const action = engine.executeDash(combat, combatant);
        setCombat(structuredClone(combat));
        return action;
    }, [combat, engine]);

    /**
     * Execute Disengage action - prevents opportunity attacks this turn
     */
    const executeDisengage = useCallback((combatant: Combatant) => {
        if (!combat) return null;

        const action = engine.executeDisengage(combat, combatant);
        setCombat(structuredClone(combat));
        return action;
    }, [combat, engine]);

    /**
     * Execute Flee action - removes combatant from combat
     * Requires allowFleeing: true in CombatEngine config
     */
    const executeFlee = useCallback((combatant: Combatant) => {
        if (!combat) return null;

        try {
            const action = engine.executeFlee(combat, combatant);
            setCombat(structuredClone(combat));
            return action;
        } catch (error) {
            // Handle case where fleeing is not allowed
            console.warn('[CombatEngine] Flee action failed:', error);
            return null;
        }
    }, [combat, engine]);

    /**
     * Check if fleeing is allowed in current combat configuration
     */
    const canFlee = useCallback((): boolean => {
        return engine.canFlee?.() ?? false;
    }, [engine]);

    return {
        startCombat,
        getCurrentCombatant,
        executeAttack,
        executeCastSpell,
        executeDodge,
        executeDash,
        executeDisengage,
        executeFlee,
        canFlee,
        nextTurn,
        getCombatResult,
        resetCombat,
        getLivingCombatants,
        combat
    };
};
