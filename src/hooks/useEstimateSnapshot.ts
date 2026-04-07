import { useMemo } from 'react';
import {
    PartyAnalyzer,
    CombatAI,
    calculateAdjustedXP,
    getEncounterMultiplier,
    CharacterSheet,
} from 'playlist-data-engine';
import type { EncounterConfigUI } from '@/types/simulation';
import type { SimulationEstimateSnapshot } from '@/types/simulation';
import type { EncounterDifficulty } from 'playlist-data-engine';
import { useEnemyGenerator } from '@/hooks/useEnemyGenerator';
import { logger } from '@/utils/logger';

/** Midpoint win rates for each difficulty tier */
const WIN_RATE_MIDPOINTS: Record<EncounterDifficulty, number> = {
    easy: 0.95,
    medium: 0.75,
    hard: 0.55,
    deadly: 0.35,
};

/**
 * Estimate enemy DPR from a CharacterSheet by inspecting weapons and combat spells.
 *
 * Logic:
 * 1. Get all equipped weapons, parse each weapon's damage dice via CombatAI.averageDamageFromFormula()
 * 2. Take the best weapon damage as base single-attack DPR
 * 3. Check if enemy has multiple attacks (legendary_config actions with damage)
 * 4. Multiply base DPR by attack count (1 if single-attack, 2-3 for multiattack enemies)
 * 5. Also check combat_spells for damage cantrips/spells, take max of weapon vs spell DPR
 * 6. Return the final estimated DPR
 */
function estimateEnemyDPR(enemy: CharacterSheet): number {
    const ai = new CombatAI({ playerStyle: 'normal', enemyStyle: 'normal' });

    // --- Weapon DPR ---
    let bestWeaponDPR = 0;
    const weapons = enemy.equipment?.weapons ?? [];
    for (const weapon of weapons) {
        if (!weapon.equipped) continue;

        const damageFormula = weapon.damage?.dice;
        if (!damageFormula) continue;

        try {
            const avgDamage = ai.averageDamageFromFormula(damageFormula);
            if (avgDamage > bestWeaponDPR) {
                bestWeaponDPR = avgDamage;
            }
        } catch {
            // Skip weapons with unparseable damage formulas
        }
    }

    // --- Spell DPR (cantrips and combat spells) ---
    let bestSpellDPR = 0;
    const combatSpells = enemy.combat_spells ?? [];
    for (const spell of combatSpells) {
        // Only consider damage-dealing spells
        const tags = spell.tags ?? [];
        if (!tags.includes('damage') && !tags.includes('aoe')) continue;

        // Prefer cantrips (level 0) since they can be cast every round
        const isCantrip = (spell.level ?? 0) === 0;

        const damageFormula = spell.damage ?? spell.damage_dice ?? '';
        if (!damageFormula) continue;

        try {
            let avgDamage = ai.averageDamageFromFormula(damageFormula);

            // AoE spells are less reliable per-target
            if (tags.includes('aoe')) {
                avgDamage *= 0.5;
            }

            // Non-cantrips have limited slots, weight them lower
            if (!isCantrip) {
                avgDamage *= 0.3;
            }

            if (avgDamage > bestSpellDPR) {
                bestSpellDPR = avgDamage;
            }
        } catch {
            // Skip spells with unparseable damage
        }
    }

    // --- Determine attack count ---
    // Check legendary_config for damaging actions
    let attackCount = 1;
    const legendaryActions = enemy.legendary_config?.actions ?? [];
    const damagingLegendaryActions = legendaryActions.filter(
        (action) => action.damage && action.tags?.includes('damage')
    );

    if (damagingLegendaryActions.length >= 2) {
        attackCount = 3; // Boss with multiattack + legendary actions
    } else if (damagingLegendaryActions.length === 1 || weapons.length > 1) {
        attackCount = 2; // Multiattack or one legendary damage action
    }

    // --- Compute final DPR ---
    const baseDPR = Math.max(bestWeaponDPR, bestSpellDPR);

    return baseDPR * attackCount;
}

/**
 * Derive predicted difficulty by comparing encounter adjusted XP against party XP budgets.
 * Picks the highest budget the encounter XP exceeds.
 */
function derivePredictedDifficulty(
    totalAdjustedXP: number,
    xpBudgets: { easy: number; medium: number; hard: number; deadly: number }
): EncounterDifficulty {
    if (totalAdjustedXP >= xpBudgets.deadly) return 'deadly';
    if (totalAdjustedXP >= xpBudgets.hard) return 'hard';
    if (totalAdjustedXP >= xpBudgets.medium) return 'medium';
    if (totalAdjustedXP >= xpBudgets.easy) return 'easy';
    return 'easy'; // Below easy threshold — still "easy"
}

/**
 * React hook for computing pre-simulation estimates from party + encounter config.
 *
 * Pure computation hook (no side effects). Returns a SimulationEstimateSnapshot
 * with party stats, enemy preview stats, and derived difficulty predictions.
 * All computation is memoized with useMemo.
 *
 * @param selectedParty - Array of selected party member CharacterSheets
 * @param encounterConfig - Current encounter configuration
 * @returns SimulationEstimateSnapshot if both party and config are valid, null otherwise
 */
export function useEstimateSnapshot(
    selectedParty: CharacterSheet[],
    encounterConfig: EncounterConfigUI
): SimulationEstimateSnapshot | null {
    const { generate } = useEnemyGenerator();

    return useMemo(() => {
        // Need at least one party member
        if (selectedParty.length === 0) {
            return null;
        }

        // --- Party analysis ---
        let partyAnalysis;
        try {
            partyAnalysis = PartyAnalyzer.analyzeParty(selectedParty);
        } catch (error) {
            logger.error('BalanceLab', 'Failed to analyze party', error);
            return null;
        }

        // --- Generate a preview enemy ---
        const previewSeed = `preview-${encounterConfig.cr}-${encounterConfig.archetype}-${encounterConfig.rarity}-${encounterConfig.category}`;
        const previewEnemy = generate({
            seed: previewSeed,
            category: encounterConfig.category,
            archetype: encounterConfig.archetype,
            rarity: encounterConfig.rarity,
            difficultyMultiplier: encounterConfig.difficultyMultiplier,
        });

        if (!previewEnemy) {
            logger.warn('BalanceLab', 'Failed to generate preview enemy');
            return null;
        }

        // --- Enemy stats ---
        const perEnemyHP = previewEnemy.hp.max;
        const perEnemyAC = previewEnemy.armor_class;
        const perEnemyEstDPR = estimateEnemyDPR(previewEnemy);
        const enemyCR = previewEnemy.cr ?? previewEnemy.level;

        // --- Adjusted XP calculation ---
        const enemyCount = encounterConfig.enemyCount;
        const enemyCRs = Array(enemyCount).fill(enemyCR);
        const multiplier = getEncounterMultiplier(enemyCRs.length);
        const totalAdjustedXP = calculateAdjustedXP(enemyCRs, multiplier);

        // --- Party stats mapping ---
        const partyStats = {
            averageLevel: partyAnalysis.averageLevel,
            partySize: partyAnalysis.partySize,
            averageAC: partyAnalysis.averageAC,
            averageHP: partyAnalysis.averageHP,
            estimatedDPR: partyAnalysis.averageDamage,
            totalStrength: partyAnalysis.totalStrength,
            xpBudgets: {
                easy: partyAnalysis.easyXP,
                medium: partyAnalysis.mediumXP,
                hard: partyAnalysis.hardXP,
                deadly: partyAnalysis.deadlyXP,
            },
        };

        // --- Prediction ---
        const predictedDifficulty = derivePredictedDifficulty(
            totalAdjustedXP,
            partyStats.xpBudgets
        );
        const xpRatio =
            partyStats.xpBudgets.medium > 0
                ? totalAdjustedXP / partyStats.xpBudgets.medium
                : 0;
        const predictedWinRate = WIN_RATE_MIDPOINTS[predictedDifficulty];

        const snapshot: SimulationEstimateSnapshot = {
            party: partyStats,
            enemy: {
                count: enemyCount,
                perEnemyHP,
                perEnemyAC,
                perEnemyEstDPR,
                totalAdjustedXP,
                enemyCR,
                archetype: encounterConfig.archetype,
                rarity: encounterConfig.rarity,
            },
            prediction: {
                predictedDifficulty,
                xpRatio,
                predictedWinRate,
            },
            timestamp: new Date().toISOString(),
        };

        logger.debug('BalanceLab', 'Estimate snapshot computed', {
            partyLevel: snapshot.party.averageLevel,
            enemyCR: snapshot.enemy.enemyCR,
            enemyCount: snapshot.enemy.count,
            predictedDifficulty: snapshot.prediction.predictedDifficulty,
            xpRatio: snapshot.prediction.xpRatio,
        });

        return snapshot;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParty, encounterConfig]);
}
