import { useMemo } from 'react';
import {
    PartyAnalyzer,
    calculateAdjustedXP,
    getEncounterMultiplier,
    CharacterSheet,
} from 'playlist-data-engine';
import type { EncounterConfigUI } from '@/types/simulation';
import type { SimulationEstimateSnapshot } from '@/types/simulation';
import type { EncounterDifficulty } from 'playlist-data-engine';
import { useEnemyGenerator } from '@/hooks/useEnemyGenerator';
import { logger } from '@/utils/logger';
import { estimateEnemyDPR } from '@/utils/estimateEnemyDPR';

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
    const { generateEncounterByCR } = useEnemyGenerator();

    // Destructure config fields for stable useMemo dependencies.
    // Using individual primitives/refs instead of the whole object prevents
    // unnecessary regeneration when the parent recreates encounterConfig
    // with identical values on an unrelated re-render.
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

        // --- Generate a preview enemy ---
        // Use generateEncounterByCR which correctly targets the requested CR,
        // unlike generate() which ignores CR and produces template-default stats.
        // Seed is derived deterministically from config fields (not random)
        // so the same config always produces the same preview enemy.
        const previewSeed = `preview-${cr}-${archetype}-${rarity}-${category}`;
        const previewEnemies = generateEncounterByCR({
            seed: previewSeed,
            count: 1,
            targetCR: cr,
            category: category as import('playlist-data-engine').EnemyCategory,
            archetype: archetype as import('playlist-data-engine').EnemyArchetype,
            baseRarity: rarity as import('playlist-data-engine').EnemyRarity,
            difficultyMultiplier,
            statLevels,
        });

        if (!previewEnemies || previewEnemies.length === 0) {
            logger.warn('BalanceLab', 'Failed to generate preview enemy');
            return null;
        }

        const previewEnemy = previewEnemies[0];

        // --- Enemy stats ---
        const perEnemyHP = previewEnemy.hp.max;
        const perEnemyAC = previewEnemy.armor_class;
        const perEnemyEstDPR = estimateEnemyDPR(previewEnemy);
        const enemyCR = cr; // Use the requested CR, not the generated enemy's CR

        // --- Adjusted XP calculation ---
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
                archetype,
                rarity,
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
    }, [selectedParty, generateEncounterByCR, cr, enemyCount, category, archetype, rarity, difficultyMultiplier, statLevels]);
}
