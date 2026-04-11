import { useMemo } from 'react';
import {
    PartyAnalyzer,
    AttackResolver,
    calculateAdjustedXP,
    getEncounterMultiplier,
    CharacterSheet,
    DEFAULT_EQUIPMENT,
} from 'playlist-data-engine';
import type { HitMode } from 'playlist-data-engine';
import type { EncounterConfigUI } from '@/types/simulation';
import type { SimulationEstimateSnapshot } from '@/types/simulation';
import type { EncounterDifficulty } from 'playlist-data-engine';
import { useEnemyGenerator } from '@/hooks/useEnemyGenerator';
import { logger } from '@/utils/logger';
import { estimateEnemyDPR, getEnemyWeaponNames } from '@/utils/estimateEnemyDPR';

/** Midpoint win rates for each difficulty tier */
const WIN_RATE_MIDPOINTS: Record<EncounterDifficulty, number> = {
    easy: 0.95,
    medium: 0.75,
    hard: 0.55,
    deadly: 0.35,
};

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
 * Compute min/avg/max across an array of numbers.
 */
function statRange(values: number[]): { min: number; avg: number; max: number } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, avg, max };
}

/**
 * Get the most common weapon name across party members for display.
 */
function getPartyWeaponName(party: CharacterSheet[]): string {
    const weaponNames: string[] = [];
    for (const character of party) {
        const equipped = character.equipment?.weapons?.find(w => w.equipped);
        if (equipped) weaponNames.push(equipped.name);
    }
    if (weaponNames.length === 0) return 'Unarmed';
    // Return unique names, comma-separated if multiple
    const unique = [...new Set(weaponNames)];
    return unique.length === 1 ? unique[0] : unique.slice(0, 3).join(', ');
}

/**
 * React hook for computing pre-simulation estimates from party + encounter config.
 *
 * Generates multiple enemy samples to show the spread of possible enemy stats
 * (min/avg/max for HP, AC, DPR). Returns a SimulationEstimateSnapshot with party
 * stats, enemy preview ranges, and derived difficulty predictions.
 * All computation is memoized with useMemo.
 *
 * @param selectedParty - Array of selected party member CharacterSheets
 * @param encounterConfig - Current encounter configuration
 * @param hitMode - Current hit mode ('scaled' or 'dnd')
 * @param sampleCount - Number of enemy samples to generate (default 10)
 * @returns SimulationEstimateSnapshot if both party and config are valid, null otherwise
 */
export function useEstimateSnapshot(
    selectedParty: CharacterSheet[],
    encounterConfig: EncounterConfigUI,
    hitMode: HitMode = 'scaled',
    sampleCount: number = 10
): SimulationEstimateSnapshot | null {
    const { generateEncounterByCR } = useEnemyGenerator();

    // Destructure config fields for stable useMemo dependencies.
    const cr = encounterConfig.cr;
    const enemyCount = encounterConfig.enemyCount;
    const category = encounterConfig.category;
    const archetype = encounterConfig.archetype;
    const rarity = encounterConfig.rarity;
    const difficultyMultiplier = encounterConfig.difficultyMultiplier;
    const statLevels = encounterConfig.statLevels;

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

        // --- Generate multiple enemy samples for range estimation ---
        const sampleHPs: number[] = [];
        const sampleACs: number[] = [];
        const sampleDPRs: number[] = [];
        let sampleWeaponNames: string[] = [];

        for (let i = 0; i < sampleCount; i++) {
            const sampleSeed = `preview-${cr}-${archetype}-${rarity}-${category}-${i}`;
            const sampleEnemies = generateEncounterByCR({
                seed: sampleSeed,
                count: 1,
                targetCR: cr,
                category: category as import('playlist-data-engine').EnemyCategory,
                archetype: archetype as import('playlist-data-engine').EnemyArchetype,
                baseRarity: rarity as import('playlist-data-engine').EnemyRarity,
                difficultyMultiplier,
                statLevels,
            });

            if (sampleEnemies && sampleEnemies.length > 0) {
                const enemy = sampleEnemies[0];
                sampleHPs.push(enemy.hp.max);
                sampleACs.push(enemy.armor_class);
                // Use the same formula as the actual combat simulator
                sampleDPRs.push(estimateEnemyDPR(enemy, hitMode, partyAnalysis.averageAC, selectedParty.length));
                // Collect weapon names from the last sample for display
                if (i === 0) {
                    sampleWeaponNames = getEnemyWeaponNames(enemy);
                }
            }
        }

        if (sampleHPs.length === 0) {
            logger.warn('BalanceLab', 'Failed to generate any preview enemy samples');
            return null;
        }

        // --- Enemy stats (ranges) ---
        const perEnemyHP = statRange(sampleHPs);
        const perEnemyAC = statRange(sampleACs);
        const perEnemyEstDPR = statRange(sampleDPRs);
        const enemyCR = cr;

        // --- Adjusted XP calculation ---
        const enemyCRs = Array(enemyCount).fill(enemyCR);
        const multiplier = getEncounterMultiplier(enemyCRs.length);
        const totalAdjustedXP = calculateAdjustedXP(enemyCRs, multiplier);

        // --- Party DPR using the same formula as actual combat ---
        // The AI picks the best damage action each turn (weapon or cantrip).
        // Model both and take the max per member.
        const avgEnemyAC = perEnemyAC.avg;
        let totalPartyDPR = 0;
        for (const character of selectedParty) {
            // Weapon DPR — look up DEFAULT_EQUIPMENT (matches buildAttackFromWeapon)
            const equippedWeapon = character.equipment?.weapons?.find(w => w.equipped);
            const defaultWeapon = equippedWeapon ? DEFAULT_EQUIPMENT[equippedWeapon.name] : undefined;
            const dice = defaultWeapon?.damage?.dice ?? equippedWeapon?.damage?.dice ?? '1d6';
            const wp = defaultWeapon?.weaponProperties ?? equippedWeapon?.weaponProperties ?? [];
            const isFinesse = wp.includes('finesse');
            const isRanged = wp.includes('ranged');

            const abilityScore = hitMode === 'scaled'
                ? (character.ability_scores.STR ?? 10)
                : ((isRanged || isFinesse)
                    ? (character.ability_scores.DEX ?? 10)
                    : (character.ability_scores.STR ?? 10));

            const weaponAttackBonus = AttackResolver.computeAttackBonus(
                character.ability_scores,
                wp,
                character.proficiency_bonus ?? 2,
            );

            const weaponDPR = AttackResolver.estimateDPR({
                hitMode,
                level: character.level ?? 1,
                abilityScore,
                targetAC: avgEnemyAC,
                damageDice: dice,
                proficiencyBonus: character.proficiency_bonus,
                attackBonus: weaponAttackBonus,
            });

            // Cantrip DPR: attack_roll cantrips always hit in the engine,
            // save-based cantrips have ~60% success rate.
            let bestCantripDPR = 0;
            const combatSpells = character.combat_spells ?? [];
            for (const spell of combatSpells) {
                const isCantrip = (spell.level ?? 0) === 0;
                if (!isCantrip) continue;
                const tags = spell.tags ?? [];
                if (!tags.includes('damage') && !tags.includes('aoe')) continue;

                const dmgFormula = (spell.damage_dice ?? spell.damage ?? '').replace(/\s/g, '').replace(/^d(\d+)/, '1d$1');
                if (!dmgFormula) continue;

                const cantripMatch = dmgFormula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
                if (!cantripMatch) continue;
                const avgDmg = parseInt(cantripMatch[1]) * (parseInt(cantripMatch[2]) + 1) / 2 + (cantripMatch[3] ? parseInt(cantripMatch[3]) : 0);

                const isAttackRoll = !!spell.attack_roll;
                const hasSave = !!(spell.saving_throw ?? spell.save);
                const hitRate = isAttackRoll ? 1.0 : hasSave ? 0.6 : 0;

                const dpr = avgDmg * hitRate;
                if (dpr > bestCantripDPR) bestCantripDPR = dpr;
            }

            // AI picks the best damage action per turn
            totalPartyDPR += Math.max(weaponDPR, bestCantripDPR);
        }
        const estimatedDPR = Math.round((totalPartyDPR / selectedParty.length) * 10) / 10;

        const partyStats = {
            averageLevel: partyAnalysis.averageLevel,
            partySize: partyAnalysis.partySize,
            averageAC: partyAnalysis.averageAC,
            averageHP: partyAnalysis.averageHP,
            estimatedDPR,
            totalStrength: partyAnalysis.totalStrength,
            weaponName: getPartyWeaponName(selectedParty),
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
                archetype,
                rarity,
                sampleCount: sampleHPs.length,
                weaponNames: sampleWeaponNames,
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
            partyDPR: estimatedDPR,
            enemyDPR: perEnemyEstDPR.avg,
            hitMode,
        });

        return snapshot;
    }, [selectedParty, generateEncounterByCR, cr, enemyCount, category, archetype, rarity, difficultyMultiplier, statLevels, sampleCount, hitMode]);
}
