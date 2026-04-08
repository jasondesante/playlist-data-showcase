/**
 * SimulationExportButton Component
 *
 * Provides export options for simulation results:
 * - Download as JSON (full structured data)
 * - Download as CSV (summary table for spreadsheets)
 * - Copy summary to clipboard
 *
 * (Task 8.4.2)
 */

import { useState, useCallback, memo } from 'react';
import { Download, Copy, FileJson, FileSpreadsheet } from 'lucide-react';
import type { SimulationResults, BalanceReport, CharacterSheet } from 'playlist-data-engine';
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

/** Build the full JSON export payload */
function buildJsonExport(results: SimulationResults, balanceReport: BalanceReport | null): object {
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
    };
}

/** Build a CSV string from simulation results */
function buildCsvExport(results: SimulationResults): string {
    const lines: string[] = [];

    // Summary section
    lines.push('=== Simulation Summary ===');
    lines.push('Total Runs,Player Wins,Enemy Wins,Draws,Player Win Rate,Avg Rounds,Median Rounds,Avg Rounds On Win,Avg Rounds On Loss,Avg HP Remaining %,Player Deaths,Enemy Deaths');
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
        s.totalEnemyDeaths,
    ].join(','));

    lines.push('');

    // Per-combatant metrics section
    lines.push('=== Per-Combatant Metrics ===');
    lines.push('Name,Side,Avg DPR,Median DPR,Avg Damage Dealt,Avg Damage Taken,Avg Healing,Avg Rounds Survived,Survival Rate,Kill Rate,Crit Rate,Hit Rate,Hits Per Run,Misses Per Run,Most Used Action');
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
    lines.push(`  Deaths — Players: ${s.totalPlayerDeaths}  |  Enemies: ${s.totalEnemyDeaths}`);
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
                    `    ${m.name}: DPR ${m.averageDamagePerRound.toFixed(1)}, ` +
                    `Hit Rate ${(m.averageHitRate * 100).toFixed(0)}% (${m.averageHitsPerRun.toFixed(1)} hits / ${m.averageMissesPerRun.toFixed(1)} misses per run), ` +
                    `DMG dealt ${m.averageTotalDamageDealt.toFixed(0)}, ` +
                    `DMG taken ${m.averageTotalDamageTaken.toFixed(0)}, ` +
                    `Survival ${(m.survivalRate * 100).toFixed(0)}%, ` +
                    `Kill Rate ${(m.killRate * 100).toFixed(0)}%, ` +
                    `Crit ${(m.criticalHitRate * 100).toFixed(1)}%`,
                );
            }
        }
        if (enemies.length > 0) {
            lines.push('  Enemies:');
            for (const m of enemies) {
                lines.push(
                    `    ${m.name}: DPR ${m.averageDamagePerRound.toFixed(1)}, ` +
                    `Hit Rate ${(m.averageHitRate * 100).toFixed(0)}% (${m.averageHitsPerRun.toFixed(1)} hits / ${m.averageMissesPerRun.toFixed(1)} misses per run), ` +
                    `DMG dealt ${m.averageTotalDamageDealt.toFixed(0)}, ` +
                    `DMG taken ${m.averageTotalDamageTaken.toFixed(0)}, ` +
                    `Survival ${(m.survivalRate * 100).toFixed(0)}%, ` +
                    `Kill Rate ${(m.killRate * 100).toFixed(0)}%`,
                );
            }
        }
        lines.push('');
    }

    if (results.wasCancelled) {
        lines.push('(Simulation was cancelled — partial results)');
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

export function SimulationExportButton({
    results,
    balanceReport,
    encounterConfig,
    estimateSnapshot,
    validation,
    simEnemies,
    className = '',
}: SimulationExportButtonProps) {
    const [activeMenu, setActiveMenu] = useState(false);

    const closeMenu = useCallback(() => setActiveMenu(false), []);

    const handleExportJson = useCallback(() => {
        try {
            const data = buildJsonExport(results, balanceReport);
            const json = JSON.stringify(data, null, 2);
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const wr = (results.summary.playerWinRate * 100).toFixed(0);
            downloadFile(json, `simulation-${ts}-${wr}pct.json`, 'application/json');
            showToast('Downloaded simulation JSON', 'success', 1500);
        } catch (err) {
            console.error('Failed to export JSON:', err);
            showToast('Failed to export JSON', 'error', 2000);
        }
        closeMenu();
    }, [results, balanceReport, closeMenu]);

    const handleExportCsv = useCallback(() => {
        try {
            const csv = buildCsvExport(results);
            const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const wr = (results.summary.playerWinRate * 100).toFixed(0);
            downloadFile(csv, `simulation-${ts}-${wr}pct.csv`, 'text/csv');
            showToast('Downloaded simulation CSV', 'success', 1500);
        } catch (err) {
            console.error('Failed to export CSV:', err);
            showToast('Failed to export CSV', 'error', 2000);
        }
        closeMenu();
    }, [results, closeMenu]);

    const handleCopySummary = useCallback(async () => {
        try {
            const text = buildClipboardSummary(results, balanceReport, encounterConfig, estimateSnapshot, validation, simEnemies);
            await navigator.clipboard.writeText(text);
            showToast('Copied summary to clipboard', 'success', 1500);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            showToast('Failed to copy to clipboard', 'error', 2000);
        }
        closeMenu();
    }, [results, balanceReport, encounterConfig, estimateSnapshot, validation, simEnemies, closeMenu]);

    return (
        <div className={`seb-container ${className}`}>
            <button
                className="seb-trigger"
                onClick={() => setActiveMenu(!activeMenu)}
                onBlur={() => {
                    // Delay close to allow click on menu items
                    setTimeout(closeMenu, 150);
                }}
                type="button"
                aria-haspopup="true"
                aria-expanded={activeMenu}
            >
                <Download size={14} />
                <span>Export</span>
            </button>

            {activeMenu && (
                <div className="seb-menu" role="menu">
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
