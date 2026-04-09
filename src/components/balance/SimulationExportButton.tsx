/**
 * SimulationExportButton Component
 *
 * Provides export options for simulation results with a 3-stage content toggle:
 * - Analysis: summary, metrics, balance report, damage spreads
 * - Logs: per-run combat action history (only when collected)
 * - All: analysis + combat logs combined
 *
 * The toggle applies to all three export methods: JSON, CSV, and clipboard.
 *
 * (Task 8.4.2)
 */

import { useState, useCallback, useMemo, memo } from 'react';
import { Download, Copy, FileJson, FileSpreadsheet } from 'lucide-react';
import { AttackResolver, type SimulationResults, type BalanceReport, type CharacterSheet, type AttackSimulationResult, type SimulationRunDetail } from 'playlist-data-engine';
import type { EncounterConfigUI, SimulationEstimateSnapshot, EstimateValidation } from '@/types/simulation';
import { formatRange } from '@/utils/estimateEnemyDPR';
import { showToast } from '@/components/ui/Toast';
import './SimulationExportButton.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationExportButtonProps {
    results: SimulationResults;
    balanceReport: BalanceReport | null;
    /** Encounter configuration used for this simulation */
    encounterConfig?: EncounterConfigUI | null;
    /** Pre-simulation estimate snapshot (for validation comparison) */
    estimateSnapshot?: SimulationEstimateSnapshot | null;
    /** Post-simulation validation results */
    validation?: EstimateValidation | null;
    /** Actual enemies used in the simulation */
    simEnemies?: CharacterSheet[] | null;
    /** Player party characters (for damage spread export) */
    party?: CharacterSheet[] | null;
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a Map to a plain object for JSON serialization */
function mapToObject<K extends string, V>(map: Map<K, V>): Record<string, V> {
    const obj: Record<string, V> = {};
    for (const [key, value] of map) {
        obj[key] = value;
    }
    return obj;
}

type EnemyGenRecord = { name: string; count: number; hpRange: { min: number; max: number; avg: number }; acRange: { min: number; max: number; avg: number }; crRange: { min: number; max: number; avg: number } };

/** Extract enemy generation stats from results (present when enemyRegeneration was enabled) */
function getEnemyGenStats(results: SimulationResults): EnemyGenRecord[] | undefined {
    return (results as any).enemyGenerationStats;
}

// ─── Damage Spread Helpers ─────────────────────────────────────────────────────

interface WeaponInfo {
    name: string;
    damageDice: string;
    attackBonus: number;
    type: 'melee' | 'ranged';
    properties: string[];
}

interface DamageSpreadEntry {
    hero: string;
    enemy: string;
    weapon: string;
    attackBonus: number;
    targetAC: number;
    rollTable: Array<{ d20: number; total: number; result: string; damageRange: { min: number; max: number } | null }>;
    simulation: AttackSimulationResult;
}

/** Parse dice formula without rolling (unlike engine's DiceRoller.parseDiceFormula) */
function parseDiceFormula(formula: string): { diceCount: number; diceSides: number; modifier: number } {
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return { diceCount: 1, diceSides: 6, modifier: 0 };
    return {
        diceCount: parseInt(match[1], 10),
        diceSides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3], 10) : 0,
    };
}

/** Get equipped weapons from a character sheet */
function getWeapons(character: CharacterSheet): WeaponInfo[] {
    const weapons = character.equipment?.weapons?.filter(w => w.equipped) ?? [];
    if (weapons.length === 0) {
        const strMod = Math.floor((character.ability_scores.STR - 10) / 2);
        return [{
            name: 'Unarmed Strike',
            damageDice: '1',
            attackBonus: strMod + character.proficiency_bonus,
            type: 'melee' as const,
            properties: [],
        }];
    }
    return weapons.map(w => {
        const isRanged = w.weaponProperties?.includes('ranged') || false;
        const isFinesse = w.weaponProperties?.includes('finesse') || false;
        const ability = isRanged || isFinesse ? 'DEX' : 'STR';
        const abilityMod = Math.floor((character.ability_scores[ability] - 10) / 2);
        return {
            name: w.name,
            damageDice: w.damage?.dice || '1d6',
            attackBonus: abilityMod + character.proficiency_bonus,
            type: isRanged ? 'ranged' as const : 'melee' as const,
            properties: w.weaponProperties || [],
        };
    });
}

/** Compute damage spreads for all hero/weapon/enemy combos */
function computeDamageSpreads(
    party: CharacterSheet[],
    enemies: CharacterSheet[],
    simIterations: number = 1000,
): DamageSpreadEntry[] {
    const entries: DamageSpreadEntry[] = [];

    for (const hero of party) {
        const weapons = getWeapons(hero);
        for (const enemy of enemies) {
            const targetAC = enemy.armor_class;
            for (const weapon of weapons) {
                // Build the 20-roll spread table
                const rollTable: DamageSpreadEntry['rollTable'] = [];
                const { diceCount, diceSides } = parseDiceFormula(weapon.damageDice);
                for (let d20 = 1; d20 <= 20; d20++) {
                    const isCrit = d20 === 20;
                    const isFumble = d20 === 1;
                    const totalRoll = d20 + weapon.attackBonus;
                    const hits = isCrit || (!isFumble && totalRoll >= targetAC);
                    let damageRange: { min: number; max: number } | null = null;
                    if (hits) {
                        const dice = isCrit ? diceCount * 2 : diceCount;
                        const mod = Math.floor((hero.ability_scores[
                            weapon.type === 'ranged' || weapon.properties.includes('finesse') ? 'DEX' : 'STR'
                        ] - 10) / 2);
                        damageRange = {
                            min: dice + mod,
                            max: dice * diceSides + mod,
                        };
                    }
                    const label = isCrit ? 'CRIT!' : isFumble ? 'MISS!' : hits ? 'Hit' : 'Miss';
                    rollTable.push({ d20, total: totalRoll, result: label, damageRange });
                }

                // Run simulation using the engine
                const attack = {
                    name: weapon.name,
                    damage_dice: weapon.damageDice,
                    attack_bonus: weapon.attackBonus,
                    type: weapon.type,
                    properties: weapon.properties,
                };
                const simulation = AttackResolver.simulateAttacks(hero, enemy, attack, simIterations);

                entries.push({
                    hero: hero.name,
                    enemy: enemy.name,
                    weapon: weapon.name,
                    attackBonus: weapon.attackBonus,
                    targetAC,
                    rollTable,
                    simulation,
                });
            }
        }
    }

    return entries;
}

/** Build the full JSON export payload */
function buildJsonExport(
    results: SimulationResults,
    balanceReport: BalanceReport | null,
    party?: CharacterSheet[] | null,
    simEnemies?: CharacterSheet[] | null,
): object {
    return {
        exportedAt: new Date().toISOString(),
        summary: {
            totalRuns: results.summary.totalRuns,
            playerWins: results.summary.playerWins,
            enemyWins: results.summary.enemyWins,
            draws: results.summary.draws,
            playerWinRate: results.summary.playerWinRate,
            averageRounds: results.summary.averageRounds,
            medianRounds: results.summary.medianRounds,
            averageRoundsOnWin: results.summary.averageRoundsOnWin,
            averageRoundsOnLoss: results.summary.averageRoundsOnLoss,
            averagePlayerHPPercentRemaining: results.summary.averagePlayerHPPercentRemaining,
            totalPlayerDeaths: results.summary.totalPlayerDeaths,
            totalEnemyDeaths: results.summary.totalEnemyDeaths,
            averageRoundsPerPlayerDeath: results.summary.averageRoundsPerPlayerDeath,
            averageRoundsPerEnemyDeath: results.summary.averageRoundsPerEnemyDeath,
        },
        balanceReport: balanceReport ? {
            intendedDifficulty: balanceReport.intendedDifficulty,
            actualDifficulty: balanceReport.actualDifficulty,
            balanceScore: balanceReport.balanceScore,
            difficultyVariance: balanceReport.difficultyVariance,
            confidence: balanceReport.confidence,
            recommendations: balanceReport.recommendations,
        } : null,
        party: results.party,
        encounter: results.encounter,
        perCombatantMetrics: mapToObject(results.perCombatantMetrics),
        enemyGenerationStats: (results as any).enemyGenerationStats ?? null,
        wasCancelled: results.wasCancelled,
        ...(party && simEnemies && simEnemies.length > 0
            ? { damageSpreads: computeDamageSpreads(party, simEnemies) }
            : {}),
    };
}

/** Build a CSV string from simulation results */
function buildCsvExport(
    results: SimulationResults,
    party?: CharacterSheet[] | null,
    simEnemies?: CharacterSheet[] | null,
): string {
    const lines: string[] = [];

    // Summary section
    lines.push('=== Simulation Summary ===');
    lines.push('Total Runs,Player Wins,Enemy Wins,Draws,Player Win Rate,Avg Rounds,Median Rounds,Avg Rounds On Win,Avg Rounds On Loss,Avg HP Remaining %,Player Deaths,Avg Rounds Per Player Death,Enemy Deaths,Avg Rounds Per Enemy Death');
    const s = results.summary;
    lines.push([
        s.totalRuns,
        s.playerWins,
        s.enemyWins,
        s.draws,
        (s.playerWinRate * 100).toFixed(1) + '%',
        s.averageRounds.toFixed(2),
        s.medianRounds.toFixed(1),
        s.averageRoundsOnWin.toFixed(2),
        s.averageRoundsOnLoss.toFixed(2),
        s.averagePlayerHPPercentRemaining.toFixed(1),
        s.totalPlayerDeaths,
        s.averageRoundsPerPlayerDeath.toFixed(2),
        s.totalEnemyDeaths,
        s.averageRoundsPerEnemyDeath.toFixed(2),
    ].join(','));

    lines.push('');

    // Per-combatant metrics section
    lines.push('=== Per-Combatant Metrics ===');
    lines.push('Name,Side,Avg DPR,Median DPR,Avg Damage Dealt,Avg Damage Taken,Avg Healing,Avg Rounds Survived,Survival Rate,Kill Rate,Crit Rate,Hit Rate,Hits Per Run,Misses Per Run,Avg Spell Slots Used,Most Used Action');
    for (const [, m] of results.perCombatantMetrics) {
        lines.push([
            `"${m.name}"`,
            m.side,
            m.averageDamagePerRound.toFixed(2),
            m.medianDamagePerRound.toFixed(2),
            m.averageTotalDamageDealt.toFixed(2),
            m.averageTotalDamageTaken.toFixed(2),
            m.averageHealingDone.toFixed(2),
            m.averageRoundsSurvived.toFixed(2),
            (m.survivalRate * 100).toFixed(1) + '%',
            (m.killRate * 100).toFixed(1) + '%',
            (m.criticalHitRate * 100).toFixed(1) + '%',
            (m.averageHitRate * 100).toFixed(1) + '%',
            m.averageHitsPerRun.toFixed(2),
            m.averageMissesPerRun.toFixed(2),
            m.averageSpellSlotsUsed.toFixed(2),
            `"${m.mostUsedAction}"`,
        ].join(','));
    }

    lines.push('');

    // Enemy generation stats (when enemies were regenerated each run)
    const enemyGenStats = getEnemyGenStats(results);
    if (enemyGenStats && enemyGenStats.length > 0) {
        lines.push('=== Enemy Generation Stats (regenerated each run) ===');
        lines.push('Name,Occurrences,% of Runs,HP Min,HP Avg,HP Max,AC Min,AC Avg,AC Max,CR Min,CR Avg,CR Max');
        const totalRuns = results.summary.totalRuns || 1;
        for (const e of enemyGenStats) {
            lines.push([
                `"${e.name}"`,
                e.count,
                (e.count / totalRuns * 100).toFixed(1) + '%',
                e.hpRange.min,
                e.hpRange.avg.toFixed(0),
                e.hpRange.max,
                e.acRange.min,
                e.acRange.avg.toFixed(0),
                e.acRange.max,
                e.crRange.min,
                e.crRange.avg.toFixed(1),
                e.crRange.max,
            ].join(','));
        }
        lines.push('');
    }

    // Party config
    lines.push('=== Party ===');
    lines.push('Name,Level,Class,AC,Max HP');
    if (results.party.memberNames && results.party.memberNames.length > 0) {
        // Limited info from PartyConfig
        for (const name of results.party.memberNames) {
            lines.push(`"${name}"`);
        }
    }

    lines.push('');

    // Encounter config
    lines.push('=== Encounter ===');
    lines.push('Enemy Count,Average CR');
    lines.push(`${results.encounter.enemyCount},${results.encounter.averageCR.toFixed(2)}`);

    // Damage spreads
    if (party && simEnemies && simEnemies.length > 0) {
        lines.push('');
        lines.push('=== Damage Spreads (1,000 attack simulations) ===');
        lines.push('Hero,Enemy,Weapon,Attack Bonus,Target AC,Hit Rate %,Crit Rate %,Miss Rate %,Avg Damage,Max Damage');
        const spreads = computeDamageSpreads(party, simEnemies);
        for (const ds of spreads) {
            lines.push([
                `"${ds.hero}"`,
                `"${ds.enemy}"`,
                `"${ds.weapon}"`,
                `+${ds.attackBonus}`,
                ds.targetAC,
                ds.simulation.hitRate.toFixed(1),
                ds.simulation.critRate.toFixed(1),
                ds.simulation.missRate.toFixed(1),
                ds.simulation.averageDamage.toFixed(1),
                ds.simulation.maxDamage,
            ].join(','));
        }
    }

    return lines.join('\n');
}

/** Build a plain-text summary for clipboard */
function buildClipboardSummary(
    results: SimulationResults,
    balanceReport: BalanceReport | null,
    encounterConfig?: EncounterConfigUI | null,
    estimateSnapshot?: SimulationEstimateSnapshot | null,
    validation?: EstimateValidation | null,
    simEnemies?: CharacterSheet[] | null,
    party?: CharacterSheet[] | null,
): string {
    const s = results.summary;
    const lines: string[] = [];

    // ─── Header ────────────────────────────────────────────────────────
    lines.push('═══ Balance Lab Simulation Summary ═══');
    lines.push('');

    // ─── Encounter Configuration ───────────────────────────────────────
    if (encounterConfig) {
        lines.push('── Encounter Configuration ──');
        lines.push(`  CR: ${encounterConfig.cr}  |  Enemies: ${encounterConfig.enemyCount}  |  Category: ${encounterConfig.category}  |  Archetype: ${encounterConfig.archetype}`);
        lines.push(`  Rarity: ${encounterConfig.rarity}  |  Difficulty Multiplier: ${encounterConfig.difficultyMultiplier}`);
        if (encounterConfig.statLevels) {
            const sl = encounterConfig.statLevels;
            lines.push(`  Stat Levels — HP: ${sl.hpLevel ?? 'default'}, Attack: ${sl.attackLevel ?? 'default'}, Defense: ${sl.defenseLevel ?? 'default'}`);
        }
        lines.push('');
    }

    // ─── Simulation Settings ───────────────────────────────────────────
    const cfg = results.config;
    lines.push('── Simulation Settings ──');
    lines.push(`  Runs: ${cfg.runCount}  |  Seed: ${cfg.baseSeed || '(random)'}`);
    lines.push(`  Player AI: ${cfg.aiConfig.playerStyle}  |  Enemy AI: ${cfg.aiConfig.enemyStyle}`);
    if (cfg.enemyRegeneration) {
        lines.push(`  Enemy Regeneration: ON (per-run variance enabled)`);
    }
    lines.push('');

    // ─── Party ─────────────────────────────────────────────────────────
    lines.push('── Party ──');
    lines.push(`  Size: ${results.party.memberCount}  |  Avg Level: ${results.party.averageLevel.toFixed(1)}`);
    if (results.party.memberNames.length > 0) {
        lines.push(`  Members: ${results.party.memberNames.join(', ')}`);
    }
    lines.push('');

    // ─── Encounter ─────────────────────────────────────────────────────
    lines.push('── Enemies ──');
    lines.push(`  Count: ${results.encounter.enemyCount}  |  Avg CR: ${results.encounter.averageCR.toFixed(1)}`);
    if (results.encounter.enemyNames.length > 0) {
        lines.push(`  Names: ${results.encounter.enemyNames.join(', ')}`);
    }
    lines.push('');

    // ─── Actual Enemy Details ──────────────────────────────────────────
    if (simEnemies && simEnemies.length > 0) {
        lines.push('── Enemy Details ──');
        for (const enemy of simEnemies) {
            const weapons = enemy.equipment?.weapons?.filter(w => w.equipped) ?? [];
            const mainWeapon = weapons[0];
            const spells = enemy.combat_spells ?? [];
            lines.push(`  ${enemy.name}  (CR ${enemy.cr ?? '?'}  Lv ${enemy.level ?? '?'})`);
            lines.push(`    HP: ${enemy.hp.max}  |  AC: ${enemy.armor_class}${mainWeapon ? `  |  Weapon: ${mainWeapon.name ?? mainWeapon.damage?.dice ?? 'unknown'}` : ''}`);
            if (spells.length > 0) {
                lines.push(`    Spells: ${spells.map(s => s.name).join(', ')}`);
            }
        }
        lines.push('');
    }

    // ─── Enemy Generation Stats ───────────────────────────────────────
    const enemyGenStats = getEnemyGenStats(results);
    if (enemyGenStats && enemyGenStats.length > 0) {
        lines.push('── Enemy Spectrum (regenerated each run) ──');
        const totalRuns = results.summary.totalRuns || 1;
        for (const e of enemyGenStats) {
            lines.push(
                `  ${e.name}: ${e.count} runs (${(e.count / totalRuns * 100).toFixed(0)}%), ` +
                `HP ${e.hpRange.min}–${e.hpRange.avg.toFixed(0)}–${e.hpRange.max}, ` +
                `AC ${e.acRange.min}–${e.acRange.avg.toFixed(0)}–${e.acRange.max}, ` +
                `CR ${e.crRange.min}–${e.crRange.avg.toFixed(1)}–${e.crRange.max}`,
            );
        }
        lines.push('');
    }

    // ─── Pre-Simulation Estimates ──────────────────────────────────────
    if (estimateSnapshot) {
        const est = estimateSnapshot;
        lines.push('── Pre-Simulation Estimates ──');
        lines.push(`  Party — Lv ${est.party.averageLevel.toFixed(1)}, AC ${est.party.averageAC.toFixed(1)}, HP ${Math.round(est.party.averageHP)}, DPR ~${est.party.estimatedDPR.toFixed(1)}`);
        lines.push(`  Enemy — HP ${formatRange(est.enemy.perEnemyHP)}, AC ${formatRange(est.enemy.perEnemyAC)}, DPR ~${formatRange(est.enemy.perEnemyEstDPR, 1)}, CR ${est.enemy.enemyCR} (${est.enemy.sampleCount} samples)`);
        lines.push(`  Predicted: ${est.prediction.predictedDifficulty} (XP ratio ${est.prediction.xpRatio.toFixed(2)}×, est. win rate ${(est.prediction.predictedWinRate * 100).toFixed(0)}%)`);
        lines.push('');
    }

    // ─── Results ───────────────────────────────────────────────────────
    lines.push('── Results ──');
    lines.push(`  Win Rate: ${(s.playerWinRate * 100).toFixed(1)}%  (${s.playerWins}W / ${s.enemyWins}L / ${s.draws}D of ${s.totalRuns} runs)`);
    lines.push(`  Rounds: avg ${s.averageRounds.toFixed(1)}, median ${s.medianRounds.toFixed(1)} (on win: ${s.averageRoundsOnWin.toFixed(1)}, on loss: ${s.averageRoundsOnLoss.toFixed(1)})`);
    lines.push(`  HP Remaining: ${s.averagePlayerHPPercentRemaining.toFixed(1)}%`);
    lines.push(`  Deaths — Players: ${s.totalPlayerDeaths} (avg round ${s.averageRoundsPerPlayerDeath.toFixed(1)})  |  Enemies: ${s.totalEnemyDeaths} (avg round ${s.averageRoundsPerEnemyDeath.toFixed(1)})`);
    lines.push('');

    // ─── Balance Report ────────────────────────────────────────────────
    if (balanceReport) {
        lines.push('── Balance Analysis ──');
        lines.push(`  Score: ${balanceReport.balanceScore}/100  (${balanceReport.difficultyVariance})`);
        lines.push(`  Difficulty: ${balanceReport.actualDifficulty} (intended: ${balanceReport.intendedDifficulty})`);
        lines.push(`  Confidence: ${(balanceReport.confidence * 100).toFixed(0)}%`);
        if (balanceReport.recommendations.length > 0) {
            lines.push('  Recommendations:');
            for (const rec of balanceReport.recommendations) {
                lines.push(`    - ${rec.description}`);
                lines.push(`      Impact: ${rec.expectedImpact}  |  Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
            }
        }
        lines.push('');
    }

    // ─── Estimate Validation ───────────────────────────────────────────
    if (validation) {
        lines.push('── Estimate Validation ──');

        // Comparison table
        for (const cmp of validation.comparisons) {
            const sign = cmp.delta >= 0 ? '+' : '';
            const isWinRate = cmp.label === 'Win Rate';
            const estStr = isWinRate ? `${cmp.estimated.toFixed(0)}%` : cmp.estimated.toFixed(1);
            const actStr = isWinRate ? `${cmp.actual.toFixed(0)}%` : cmp.actual.toFixed(1);
            const status = cmp.isSignificant ? '⚠ SIGNIFICANT' : 'OK';
            lines.push(`  ${cmp.label}:  est ${estStr}  →  actual ${actStr}  (delta ${sign}${cmp.delta.toFixed(1)}, ${sign}${cmp.deltaPercent.toFixed(0)}%)  [${status}]`);
        }

        // Difficulty row
        const dc = validation.difficultyComparison;
        const tierSign = dc.tierDelta > 0 ? '+' : '';
        const dirLabel = dc.tierDelta > 0 ? 'harder' : dc.tierDelta < 0 ? 'easier' : 'exact';
        lines.push(`  Difficulty:  predicted ${dc.predicted}  →  actual ${dc.actual}  (${tierSign}${dc.tierDelta} tier${dc.tierDelta !== 1 ? 's' : ''}, ${dirLabel})`);

        // Suggestions
        if (validation.suggestions.length > 0) {
            lines.push('');
            lines.push('  Suggestions:');
            for (const sug of validation.suggestions) {
                lines.push(`    [${sug.severity.toUpperCase()}] ${sug.message}`);
                lines.push(`      File: ${sug.codeReference.file}`);
                lines.push(`      Function: ${sug.codeReference.function}${sug.codeReference.line != null ? ` (line ${sug.codeReference.line})` : ''}`);
                lines.push(`      Fix: ${sug.suggestedFix}`);
            }
        } else {
            lines.push('  All estimates within acceptable range.');
        }
        lines.push('');
    }

    // ─── Per-Combatant Metrics ─────────────────────────────────────────
    if (results.perCombatantMetrics.size > 0) {
        lines.push('── Per-Combatant Metrics ──');
        const combatants = Array.from(results.perCombatantMetrics.values());
        const players = combatants.filter(m => m.side === 'player');
        const enemies = combatants.filter(m => m.side === 'enemy');

        if (players.length > 0) {
            lines.push('  Players:');
            for (const m of players) {
                lines.push(
                    `    ${m.name}: DPR ${m.averageDamagePerRound.toFixed(1)} (median ${m.medianDamagePerRound.toFixed(1)}), ` +
                    `Hit Rate ${(m.averageHitRate * 100).toFixed(0)}% (${m.averageHitsPerRun.toFixed(1)} hits / ${m.averageMissesPerRun.toFixed(1)} misses per run), ` +
                    `DMG dealt ${m.averageTotalDamageDealt.toFixed(0)}, DMG taken ${m.averageTotalDamageTaken.toFixed(0)}, ` +
                    `Healing ${m.averageHealingDone.toFixed(0)}, ` +
                    `Rounds survived ${m.averageRoundsSurvived.toFixed(1)}, ` +
                    `Survival ${(m.survivalRate * 100).toFixed(0)}%, Kill Rate ${(m.killRate * 100).toFixed(0)}%, ` +
                    `Crit ${(m.criticalHitRate * 100).toFixed(1)}%, Spell Slots ${m.averageSpellSlotsUsed.toFixed(1)}/run, ` +
                    `Most used: ${m.mostUsedAction}`,
                );
            }
        }
        if (enemies.length > 0) {
            lines.push('  Enemies:');
            for (const m of enemies) {
                lines.push(
                    `    ${m.name}: DPR ${m.averageDamagePerRound.toFixed(1)} (median ${m.medianDamagePerRound.toFixed(1)}), ` +
                    `Hit Rate ${(m.averageHitRate * 100).toFixed(0)}% (${m.averageHitsPerRun.toFixed(1)} hits / ${m.averageMissesPerRun.toFixed(1)} misses per run), ` +
                    `DMG dealt ${m.averageTotalDamageDealt.toFixed(0)}, DMG taken ${m.averageTotalDamageTaken.toFixed(0)}, ` +
                    `Rounds survived ${m.averageRoundsSurvived.toFixed(1)}, ` +
                    `Survival ${(m.survivalRate * 100).toFixed(0)}%, Kill Rate ${(m.killRate * 100).toFixed(0)}%`,
                );
            }
        }
        lines.push('');
    }

    // ─── Damage Spreads ─────────────────────────────────────────────────
    if (party && simEnemies && simEnemies.length > 0) {
        lines.push('── Damage Spreads (1,000 attack simulations per combo) ──');
        const spreads = computeDamageSpreads(party, simEnemies);
        for (const ds of spreads) {
            lines.push(`  ${ds.hero} → ${ds.enemy} (${ds.weapon}, +${ds.attackBonus} vs AC ${ds.targetAC})`);
            lines.push(`    Hit: ${ds.simulation.hitRate.toFixed(0)}%  |  Crit: ${ds.simulation.critRate.toFixed(0)}%  |  Miss: ${ds.simulation.missRate.toFixed(0)}%  |  Avg DMG: ${ds.simulation.averageDamage.toFixed(1)}  |  Max DMG: ${ds.simulation.maxDamage}`);
            // Show top damage buckets from simulation
            const topBuckets = ds.simulation.distribution
                .filter(b => b.damage > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            lines.push(`    Top damage: ${topBuckets.map(b => `${b.damage} dmg (${b.percentage.toFixed(1)}%)`).join(', ')}`);
        }
        lines.push('');
    }

    if (results.wasCancelled) {
        lines.push('(Simulation was cancelled — partial results)');
    }

    return lines.join('\n');
}

/** Format a single combat action as a readable log line */
function formatLogAction(action: any, getSide: (id: string) => string): string {
    const actorName = action.actor?.character?.name ?? action.actor?.name ?? 'Unknown';
    const actorSide = getSide(action.actor?.id ?? '');
    const tag = actorSide === 'player' ? '[P]' : '[E]';

    if (action.type === 'attack' && action.result) {
        const targetName = action.target?.character?.name ?? action.target?.name ?? '?';
        const weaponName = action.attack?.name ?? 'attack';
        const roll = action.result.roll;
        const crit = action.result.isCritical ? ' CRIT!' : '';
        const hit = action.result.success;
        const dmg = action.result.damage;
        const dmgType = action.result.damageType ? ` ${action.result.damageType}` : '';
        const hp = action.result.targetHP;
        const hpMax = action.target?.character?.hp?.max;

        let line = `  ${tag} ${actorName} uses ${weaponName} on ${targetName}`;
        if (roll !== undefined) line += ` (roll ${roll}${crit})`;
        if (hit === false) line += ' — MISS';
        else if (dmg !== undefined) line += ` — HIT for ${dmg}${dmgType} damage`;
        if (hp !== undefined && hpMax !== undefined) line += ` → ${hp}/${hpMax} HP`;
        return line;
    }

    if (action.type === 'spell' && action.result) {
        const spellName = action.spell?.name ?? 'spell';
        const desc = action.result.description ?? '';
        const dmg = action.result.damage;
        let line = `  ${tag} ${actorName} casts ${spellName}`;
        if (dmg !== undefined && action.result.success) line += ` — ${dmg} damage`;
        if (desc) line += ` (${desc})`;
        return line;
    }

    if (action.type === 'legendaryAction' && action.result) {
        const laName = action.legendaryAction?.name ?? 'legendary action';
        const desc = action.result.description ?? '';
        const dmg = action.result.damage;
        let line = `  ${tag} ${actorName} uses ${laName}`;
        if (dmg !== undefined && dmg > 0) line += ` — ${dmg} damage`;
        if (desc) line += ` (${desc})`;
        return line;
    }

    if (action.type === 'dodge') return `  ${tag} ${actorName} dodges`;
    if (action.type === 'dash') return `  ${tag} ${actorName} dashes`;
    if (action.type === 'hide') return `  ${tag} ${actorName} hides`;
    if (action.type === 'flee') return `  ${tag} ${actorName} flees`;
    if (action.type === 'useItem') return `  ${tag} ${actorName} uses an item`;
    if (action.type === 'statusEffectTick') {
        const desc = action.result?.description ?? 'status effect tick';
        return `  ${tag} ${actorName} — ${desc}`;
    }

    return `  ${tag} ${actorName} — ${action.type}`;
}

/** Build a human-readable combat log text file from runDetails */
function buildCombatLogExport(results: SimulationResults, runDetails: SimulationRunDetail[]): string {
    const lines: string[] = [];

    lines.push('═══ Combat Logs ═══');
    lines.push(`Simulation: ${results.summary.totalRuns} runs | Seed: ${results.config.baseSeed || '(random)'}`);
    lines.push(`Exported: ${new Date().toISOString()}`);
    lines.push('');

    // Build a side lookup from the combatants of the first run
    const firstCombat = runDetails[0]?.combat;
    const sideMap = new Map<string, 'player' | 'enemy'>();
    if (firstCombat) {
        // Players come first in the combatants array per engine convention
        const partyCount = results.party.memberCount;
        firstCombat.combatants.forEach((c: any, i: number) => {
            sideMap.set(c.id, i < partyCount ? 'player' : 'enemy');
        });
    }
    const getSide = (id: string) => sideMap.get(id) ?? 'unknown';

    for (const run of runDetails) {
        const { combat, result } = run;
        const winner = result.winnerSide;
        const rounds = result.roundsElapsed;
        const winnerName = result.winner?.character?.name ?? winner ?? '?';

        lines.push(`── Run ${run.runIndex + 1} (seed: ${run.seed}) ──`);
        lines.push(`  Winner: ${winnerName} | Rounds: ${rounds} | Turns: ${result.totalTurns}`);
        if (result.description) lines.push(`  ${result.description}`);
        lines.push('');

        // Group actions by round
        const history = combat.history ?? [];
        let currentRound = 0;
        for (const action of history) {
            // Detect round boundaries: roundNumber increments in CombatInstance
            const actionRound = (action as any).roundNumber ?? 0;
            if (actionRound > currentRound) {
                currentRound = actionRound;
                lines.push(`  --- Round ${currentRound} ---`);
            }
            lines.push(formatLogAction(action, getSide));
        }

        // Per-run combatant summary
        if (run.metrics && run.metrics.size > 0) {
            lines.push('');
            lines.push('  Combatant Summary:');
            for (const [, m] of run.metrics) {
                lines.push(
                    `    ${m.name}: ${m.totalDamageDealt} dealt, ${m.totalDamageTaken} taken, ` +
                    `${m.hits} hits / ${m.misses} misses, ${m.criticalHits} crits`,
                );
            }
        }

        lines.push('');
    }

    return lines.join('\n');
}

/** Trigger a file download */
function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

type ExportScope = 'analysis' | 'logs' | 'all';

const SCOPE_OPTIONS: { value: ExportScope; label: string }[] = [
    { value: 'analysis', label: 'Analysis' },
    { value: 'logs', label: 'Logs' },
    { value: 'all', label: 'All' },
];

export function SimulationExportButton({
    results,
    balanceReport,
    encounterConfig,
    estimateSnapshot,
    validation,
    simEnemies,
    party,
    className = '',
}: SimulationExportButtonProps) {
    const [activeMenu, setActiveMenu] = useState(false);
    const [scope, setScope] = useState<ExportScope>('analysis');

    const closeMenu = useCallback(() => setActiveMenu(false), []);

    const hasCombatLogs = results.runDetails !== undefined && results.runDetails.length > 0;

    // When no combat logs exist, force analysis scope
    const effectiveScope = hasCombatLogs ? scope : 'analysis';

    const handleExportJson = useCallback(() => {
        try {
            let data: object;
            if (effectiveScope === 'logs') {
                data = {
                    exportedAt: new Date().toISOString(),
                    config: {
                        runCount: results.config.runCount,
                        baseSeed: results.config.baseSeed,
                    },
                    runCount: results.runDetails!.length,
                    combatLogs: results.runDetails!.map((rd: SimulationRunDetail) => ({
                        runIndex: rd.runIndex,
                        seed: rd.seed,
                        winnerSide: rd.result.winnerSide,
                        roundsElapsed: rd.result.roundsElapsed,
                        totalTurns: rd.result.totalTurns,
                        description: rd.result.description,
                        combatants: rd.combat.combatants.map((c: any) => ({
                            id: c.id,
                            name: c.character?.name,
                            side: c.character ? 'unknown' : undefined,
                            hp: { current: c.currentHP, max: c.character?.hp?.max },
                            defeated: c.isDefeated,
                        })),
                        history: rd.combat.history.map((a: any) => ({
                            type: a.type,
                            actor: a.actor?.character?.name ?? a.actor?.name,
                            target: a.target?.character?.name ?? a.target?.name,
                            attack: a.attack?.name,
                            spell: a.spell?.name,
                            roll: a.result?.roll,
                            hit: a.result?.success,
                            crit: a.result?.isCritical,
                            damage: a.result?.damage,
                            damageType: a.result?.damageType,
                            targetHP: a.result?.targetHP,
                            description: a.result?.description,
                        })),
                        perCombatantMetrics: mapToObject(rd.metrics),
                    })),
                };
            } else if (effectiveScope === 'all') {
                const analysis = buildJsonExport(results, balanceReport, party, simEnemies);
                data = {
                    ...analysis,
                    combatLogs: results.runDetails!.map((rd: SimulationRunDetail) => ({
                        runIndex: rd.runIndex,
                        seed: rd.seed,
                        winnerSide: rd.result.winnerSide,
                        roundsElapsed: rd.result.roundsElapsed,
                        description: rd.result.description,
                        history: rd.combat.history.map((a: any) => ({
                            type: a.type,
                            actor: a.actor?.character?.name ?? a.actor?.name,
                            target: a.target?.character?.name ?? a.target?.name,
                            attack: a.attack?.name,
                            spell: a.spell?.name,
                            roll: a.result?.roll,
                            hit: a.result?.success,
                            crit: a.result?.isCritical,
                            damage: a.result?.damage,
                            damageType: a.result?.damageType,
                            targetHP: a.result?.targetHP,
                            description: a.result?.description,
                        })),
                    })),
                };
            } else {
                data = buildJsonExport(results, balanceReport, party, simEnemies);
            }

            const json = JSON.stringify(data, null, 2);
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const wr = (results.summary.playerWinRate * 100).toFixed(0);
            const suffix = effectiveScope === 'analysis' ? '' : effectiveScope === 'logs' ? '-logs' : '-full';
            downloadFile(json, `simulation${suffix}-${ts}-${wr}pct.json`, 'application/json');
            showToast('Downloaded simulation JSON', 'success', 1500);
        } catch (err) {
            console.error('Failed to export JSON:', err);
            showToast('Failed to export JSON', 'error', 2000);
        }
        closeMenu();
    }, [results, balanceReport, party, simEnemies, effectiveScope, closeMenu]);

    const handleExportCsv = useCallback(() => {
        try {
            let csv: string;
            if (effectiveScope === 'logs') {
                csv = buildCombatLogExport(results, results.runDetails!);
            } else if (effectiveScope === 'all') {
                csv = buildCsvExport(results, party, simEnemies) + '\n\n' + buildCombatLogExport(results, results.runDetails!);
            } else {
                csv = buildCsvExport(results, party, simEnemies);
            }
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const wr = (results.summary.playerWinRate * 100).toFixed(0);
            const suffix = effectiveScope === 'analysis' ? '' : effectiveScope === 'logs' ? '-logs' : '-full';
            downloadFile(csv, `simulation${suffix}-${ts}-${wr}pct.csv`, 'text/csv');
            showToast('Downloaded simulation CSV', 'success', 1500);
        } catch (err) {
            console.error('Failed to export CSV:', err);
            showToast('Failed to export CSV', 'error', 2000);
        }
        closeMenu();
    }, [results, party, simEnemies, effectiveScope, closeMenu]);

    const handleCopySummary = useCallback(async () => {
        try {
            const analysis = buildClipboardSummary(results, balanceReport, encounterConfig, estimateSnapshot, validation, simEnemies, party);
            let text: string;
            if (effectiveScope === 'logs') {
                text = buildCombatLogExport(results, results.runDetails!);
            } else if (effectiveScope === 'all') {
                text = analysis + '\n\n' + buildCombatLogExport(results, results.runDetails!);
            } else {
                text = analysis;
            }
            await navigator.clipboard.writeText(text);
            showToast('Copied summary to clipboard', 'success', 1500);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            showToast('Failed to copy to clipboard', 'error', 2000);
        }
        closeMenu();
    }, [results, balanceReport, encounterConfig, estimateSnapshot, validation, simEnemies, party, effectiveScope, closeMenu]);

    const scopeDescriptions: Record<ExportScope, string> = useMemo(() => ({
        analysis: 'Summary, metrics & balance',
        logs: `${results.runDetails?.length ?? 0} run combat logs`,
        all: 'Analysis + combat logs',
    }), [results.runDetails?.length]);

    return (
        <div
            className={`seb-container ${className}`}
            onBlur={(e) => {
                // Only close when focus leaves the entire container
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setTimeout(closeMenu, 150);
                }
            }}
        >
            <button
                className="seb-trigger"
                onClick={() => setActiveMenu(!activeMenu)}
                type="button"
                aria-haspopup="true"
                aria-expanded={activeMenu}
            >
                <Download size={14} />
                <span>Export</span>
            </button>

            {activeMenu && (
                <div className="seb-menu" role="menu">
                    {/* Scope toggle */}
                    {hasCombatLogs && (
                        <div className="seb-scope-toggle" role="radiogroup" aria-label="Export content scope">
                            {SCOPE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`seb-scope-btn ${scope === opt.value ? 'seb-scope-active' : ''}`}
                                    onClick={() => setScope(opt.value)}
                                    type="button"
                                    role="radio"
                                    aria-checked={scope === opt.value}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <span className="seb-scope-desc">{scopeDescriptions[scope]}</span>
                        </div>
                    )}

                    <button
                        className="seb-menu-item"
                        onClick={handleExportJson}
                        type="button"
                        role="menuitem"
                    >
                        <FileJson size={14} className="seb-menu-icon seb-menu-icon-json" />
                        <div className="seb-menu-text">
                            <span className="seb-menu-label">Download JSON</span>
                            <span className="seb-menu-desc">Full structured data</span>
                        </div>
                    </button>
                    <button
                        className="seb-menu-item"
                        onClick={handleExportCsv}
                        type="button"
                        role="menuitem"
                    >
                        <FileSpreadsheet size={14} className="seb-menu-icon seb-menu-icon-csv" />
                        <div className="seb-menu-text">
                            <span className="seb-menu-label">Download CSV</span>
                            <span className="seb-menu-desc">Summary table for spreadsheets</span>
                        </div>
                    </button>
                    <button
                        className="seb-menu-item"
                        onClick={handleCopySummary}
                        type="button"
                        role="menuitem"
                    >
                        <Copy size={14} className="seb-menu-icon seb-menu-icon-copy" />
                        <div className="seb-menu-text">
                            <span className="seb-menu-label">Copy Summary</span>
                            <span className="seb-menu-desc">Plain text to clipboard</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

export default memo(SimulationExportButton);
