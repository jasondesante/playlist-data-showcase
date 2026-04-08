import { useMemo } from 'react';
import type {
    SimulationResults,
    CombatantSimulationMetrics,
    EncounterDifficulty,
} from 'playlist-data-engine';
import type { SimulationEstimateSnapshot } from '@/types/simulation';
import type {
    EstimateValidation,
    EstimateComparison,
    DifficultyComparison,
    EstimateSuggestion,
} from '@/types/simulation';
import { getWinRateDifficulty } from '@/types/simulation';
import { logger } from '@/utils/logger';

// ─── Difficulty tier ordering for computing tier delta ──────────────────────

const DIFFICULTY_TIER_ORDER: Record<EncounterDifficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
    deadly: 3,
};

const SIGNIFICANCE_THRESHOLD = 10; // |deltaPercent| > 10% is significant

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get combatant metrics from either a Map or a plain object.
 * The worker serializes Maps via Object.fromEntries, so we handle both.
 */
function getCombatantMetrics(
    results: SimulationResults,
): CombatantSimulationMetrics[] {
    const raw = results.perCombatantMetrics;
    if (raw instanceof Map) {
        return Array.from(raw.values());
    }
    // Plain object from worker serialization
    if (raw && typeof raw === 'object') {
        return Object.values(raw) as CombatantSimulationMetrics[];
    }
    return [];
}

/**
 * Compute the average of a numeric field across a filtered set of combatants.
 */
function averageField(
    metrics: CombatantSimulationMetrics[],
    field: keyof CombatantSimulationMetrics,
): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => {
        const val = m[field];
        return acc + (typeof val === 'number' ? val : 0);
    }, 0);
    return sum / metrics.length;
}

/**
 * Build a single metric comparison entry.
 */
function makeComparison(
    label: string,
    estimated: number,
    actual: number,
): EstimateComparison {
    const delta = actual - estimated;
    const deltaPercent =
        estimated !== 0 ? (delta / Math.abs(estimated)) * 100 : actual !== 0 ? 100 : 0;
    return {
        label,
        estimated: Math.round(estimated * 10) / 10,
        actual: Math.round(actual * 10) / 10,
        delta: Math.round(delta * 10) / 10,
        deltaPercent: Math.round(deltaPercent * 10) / 10,
        isSignificant: Math.abs(deltaPercent) > SIGNIFICANCE_THRESHOLD,
    };
}

// ─── Suggestion generators ──────────────────────────────────────────────────

function suggestPartyDPROverestimate(
    comp: EstimateComparison,
    partyAC: number,
): EstimateSuggestion {
    // Estimate miss rate: with avg AC vs assumed +5 attack bonus
    // AC 16 vs +5 → need 11+ → 50% hit rate → 50% miss rate
    const assumedAttackBonus = 5;
    const needToHit = Math.max(2, partyAC - assumedAttackBonus + 1);
    const missRatePercent = Math.round(Math.max(0, Math.min(95, ((21 - needToHit) / 20) * 100)));

    return {
        severity: 'warning',
        metric: comp.label,
        message: `PartyAnalyzer.estimateCharacterDamage() overestimates by ${Math.abs(comp.deltaPercent)}%`,
        codeReference: {
            file: 'playlist-data-engine/src/core/combat/PartyAnalyzer.ts',
            function: 'estimateCharacterDamage()',
            line: 279,
        },
        suggestedFix: `Formula assumes every attack hits (no miss chance). With avg AC ${partyAC} vs avg enemy +${assumedAttackBonus} attack bonus: miss rate ≈ ${missRatePercent}%. Consider: result *= (1 - missRate)`,
    };
}

function suggestPartyDPRUnderestimate(
    comp: EstimateComparison,
): EstimateSuggestion {
    return {
        severity: 'info',
        metric: comp.label,
        message: `PartyAnalyzer.estimateCharacterDamage() underestimates by ${Math.abs(comp.deltaPercent)}%`,
        codeReference: {
            file: 'playlist-data-engine/src/core/combat/PartyAnalyzer.ts',
            function: 'estimateCharacterDamage()',
            line: 279,
        },
        suggestedFix: `estimateCharacterDamage() uses a flat 1d8 base (4.5 avg). Consider checking the character's actual equipment weapons and combat_spells for a more accurate estimate.`,
    };
}

function suggestEnemyDPROverestimate(
    comp: EstimateComparison,
    enemyAC: number,
): EstimateSuggestion {
    return {
        severity: 'warning',
        metric: comp.label,
        message: `Enemy DPR overestimated by ${Math.abs(comp.deltaPercent)}%`,
        codeReference: {
            file: 'src/utils/estimateEnemyDPR.ts',
            function: 'estimateEnemyDPR()',
        },
        suggestedFix: `Enemy hit rate may be lower than assumed. Consider factoring in hit probability: estDPR × ((enemyAttackBonus + 10.5) / (targetAC + 0.5)). Target AC ≈ ${enemyAC}.`,
    };
}

function suggestEnemyDPRUnderestimate(
    comp: EstimateComparison,
    enemyArchetype: string,
): EstimateSuggestion {
    return {
        severity: 'warning',
        metric: comp.label,
        message: `Enemy DPR underestimated by ${Math.abs(comp.deltaPercent)}%`,
        codeReference: {
            file: 'src/utils/estimateEnemyDPR.ts',
            function: 'estimateEnemyDPR()',
        },
        suggestedFix: `Enemy archetype "${enemyArchetype}" may have multiattack, legendary actions, or spell damage not fully captured. Check legendary_config.actions and combat_spells for additional damage sources.`,
    };
}

function suggestDifficultyTierOff(
    comparison: DifficultyComparison,
    xpRatio: number,
): EstimateSuggestion {
    const predictedEasier = comparison.tierDelta > 0;
    return {
        severity: 'error',
        metric: 'Difficulty',
        message: `Difficulty prediction off by ${comparison.tierDelta} tier${comparison.tierDelta > 1 ? 's' : ''}: predicted ${comparison.predicted}, actual ${comparison.actual}`,
        codeReference: {
            file: 'playlist-data-engine/src/constants/EncounterBalance.ts',
            function: 'XP_BUDGET_PER_LEVEL / ENEMY_COUNT_MULTIPLIER',
        },
        suggestedFix: predictedEasier
            ? `XP budget underestimates encounter difficulty (ratio: ${xpRatio.toFixed(1)}×). The ENEMY_COUNT_MULTIPLIER or XP_BUDGET_PER_LEVEL values may need adjustment for this archetype.`
            : `XP budget overestimates encounter difficulty (ratio: ${xpRatio.toFixed(1)}×). The party composition may make this encounter easier than XP alone suggests.`,
    };
}

function suggestHighMissRate(
    side: 'player' | 'enemy',
    metrics: CombatantSimulationMetrics[],
): EstimateSuggestion | null {
    if (metrics.length === 0) return null;
    const avgHitRate = averageField(metrics, 'averageHitRate');
    const missRate = 1 - avgHitRate;
    const label = side === 'player' ? 'Player' : 'Enemy';

    if (missRate >= 0.50) {
        return {
            severity: 'error',
            metric: `${label} Hit Rate`,
            message: `${label} miss rate is critically high at ${(missRate * 100).toFixed(0)}% (hit rate ${(avgHitRate * 100).toFixed(0)}%)`,
            codeReference: {
                file: 'playlist-data-engine/src/core/combat/AttackResolver.ts',
                function: 'resolveAttack()',
            },
            suggestedFix: `${label} attack bonus may be too low relative to target AC, or AC values are inflated. Check stat scaling, equipment, and proficiency bonuses for the ${side.toLowerCase()} side.`,
        };
    }
    if (missRate >= 0.25) {
        return {
            severity: 'warning',
            metric: `${label} Hit Rate`,
            message: `${label} miss rate is elevated at ${(missRate * 100).toFixed(0)}% (hit rate ${(avgHitRate * 100).toFixed(0)}%)`,
            codeReference: {
                file: 'playlist-data-engine/src/core/combat/AttackResolver.ts',
                function: 'resolveAttack()',
            },
            suggestedFix: `Review ${side.toLowerCase()} attack bonuses vs target AC. Consider whether ability scores, proficiency, or magic weapons need adjustment.`,
        };
    }
    return null;
}

// ─── Main hook ──────────────────────────────────────────────────────────────

/**
 * React hook for comparing pre-simulation estimates against actual simulation results.
 *
 * Takes the estimate snapshot (captured when "Run" was clicked) and the completed
 * simulation results, then computes metric comparisons and actionable code suggestions
 * for significant discrepancies.
 *
 * Returns null if either input is null or if the simulation has no completed runs.
 *
 * @param estimateSnapshot - Pre-simulation estimate snapshot
 * @param simulationResults - Completed simulation results
 * @returns EstimateValidation if both inputs are valid, null otherwise
 */
export function useEstimateValidation(
    estimateSnapshot: SimulationEstimateSnapshot | null,
    simulationResults: SimulationResults | null,
): EstimateValidation | null {
    return useMemo(() => {
        if (!estimateSnapshot || !simulationResults) return null;
        if (simulationResults.summary.totalRuns === 0) return null;

        try {
            const allMetrics = getCombatantMetrics(simulationResults);
            const playerMetrics = allMetrics.filter((m) => m.side === 'player');
            const enemyMetrics = allMetrics.filter((m) => m.side === 'enemy');

            // ── Metric comparisons ──

            const comparisons: EstimateComparison[] = [];

            // Party DPR: estimated from PartyAnalyzer vs actual from player combatants
            const actualPartyDPR = averageField(playerMetrics, 'averageDamagePerRound');
            comparisons.push(
                makeComparison('Party DPR', estimateSnapshot.party.estimatedDPR, actualPartyDPR),
            );

            // Enemy DPR: estimated from estimateEnemyDPR vs actual from enemy combatants
            const actualEnemyDPR = averageField(enemyMetrics, 'averageDamagePerRound');
            comparisons.push(
                makeComparison('Enemy DPR', estimateSnapshot.enemy.perEnemyEstDPR.avg, actualEnemyDPR),
            );

            // ── Difficulty comparison ──

            const actualWinRate = simulationResults.summary.playerWinRate;
            const { difficulty: actualDifficulty } = getWinRateDifficulty(actualWinRate);
            const predictedDifficulty = estimateSnapshot.prediction.predictedDifficulty;

            const tierDelta = Math.abs(
                DIFFICULTY_TIER_ORDER[actualDifficulty] -
                    DIFFICULTY_TIER_ORDER[predictedDifficulty],
            );

            const difficultyComparison: DifficultyComparison = {
                predicted: predictedDifficulty,
                actual: actualDifficulty,
                predictedWinRate: estimateSnapshot.prediction.predictedWinRate,
                actualWinRate,
                tierDelta,
            };

            // ── Win rate comparison ──
            const predictedWinRate = estimateSnapshot.prediction.predictedWinRate;

            comparisons.push(
                makeComparison(
                    'Win Rate',
                    predictedWinRate * 100, // convert to percentage for display
                    actualWinRate * 100,
                ),
            );

            // ── Suggestions ──

            const suggestions: EstimateSuggestion[] = [];

            // Party DPR suggestions
            const partyDPRComp = comparisons[0];
            if (partyDPRComp.isSignificant) {
                if (partyDPRComp.deltaPercent < 0) {
                    // Overestimate (estimated higher than actual)
                    suggestions.push(
                        suggestPartyDPROverestimate(partyDPRComp, estimateSnapshot.party.averageAC),
                    );
                } else {
                    // Underestimate
                    suggestions.push(suggestPartyDPRUnderestimate(partyDPRComp));
                }
            }

            // Enemy DPR suggestions
            const enemyDPRComp = comparisons[1];
            if (enemyDPRComp.isSignificant) {
                if (enemyDPRComp.deltaPercent < 0) {
                    // Overestimate
                    suggestions.push(
                        suggestEnemyDPROverestimate(enemyDPRComp, estimateSnapshot.enemy.perEnemyAC.avg),
                    );
                } else {
                    // Underestimate
                    suggestions.push(
                        suggestEnemyDPRUnderestimate(enemyDPRComp, estimateSnapshot.enemy.archetype),
                    );
                }
            }

            // Difficulty tier suggestions
            if (tierDelta >= 1) {
                suggestions.push(
                    suggestDifficultyTierOff(difficultyComparison, estimateSnapshot.prediction.xpRatio),
                );
            }

            // Hit/miss rate suggestions
            const playerMissSuggestion = suggestHighMissRate('player', playerMetrics);
            if (playerMissSuggestion) suggestions.push(playerMissSuggestion);

            const enemyMissSuggestion = suggestHighMissRate('enemy', enemyMetrics);
            if (enemyMissSuggestion) suggestions.push(enemyMissSuggestion);

            logger.debug('BalanceLab', 'Estimate validation computed', {
                significantComparisons: comparisons.filter((c) => c.isSignificant).length,
                suggestionCount: suggestions.length,
                tierDelta,
            });

            return {
                comparisons,
                difficultyComparison,
                suggestions,
            };
        } catch (err) {
            logger.warn('BalanceLab', 'Failed to compute estimate validation', {
                error: err instanceof Error ? err.message : 'Unknown error',
            });
            return null;
        }
    }, [estimateSnapshot, simulationResults]);
}
