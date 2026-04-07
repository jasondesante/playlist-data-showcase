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
import type { SimulationResults, BalanceReport } from 'playlist-data-engine';
import { showToast } from '@/components/ui/Toast';
import './SimulationExportButton.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulationExportButtonProps {
    results: SimulationResults;
    balanceReport: BalanceReport | null;
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
    lines.push('Name,Side,Avg DPR,Median DPR,Avg Damage Dealt,Avg Damage Taken,Avg Healing,Avg Rounds Survived,Survival Rate,Kill Rate,Crit Rate,Most Used Action');
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
            `"${m.mostUsedAction}"`,
        ].join(','));
    }

    lines.push('');

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
function buildClipboardSummary(results: SimulationResults, balanceReport: BalanceReport | null): string {
    const s = results.summary;
    const winRate = (s.playerWinRate * 100).toFixed(1);
    const lines = [
        `Balance Lab Simulation Results`,
        `─────────────────────────────────`,
        `Player Win Rate: ${winRate}%`,
        `  Wins: ${s.playerWins} | Losses: ${s.enemyWins} | Draws: ${s.draws}`,
        `  Total Runs: ${s.totalRuns}`,
        ``,
        `Average Rounds: ${s.averageRounds.toFixed(1)} (median: ${s.medianRounds.toFixed(1)})`,
        `Avg HP Remaining: ${s.averagePlayerHPPercentRemaining.toFixed(1)}%`,
        `Player Deaths: ${s.totalPlayerDeaths} | Enemy Deaths: ${s.totalEnemyDeaths}`,
    ];

    if (balanceReport) {
        lines.push('');
        lines.push(`Balance Score: ${balanceReport.balanceScore}/100 (${balanceReport.difficultyVariance})`);
        lines.push(`Difficulty: ${balanceReport.actualDifficulty} (intended: ${balanceReport.intendedDifficulty})`);
        if (balanceReport.recommendations.length > 0) {
            lines.push('Recommendations:');
            for (const rec of balanceReport.recommendations.slice(0, 3)) {
                lines.push(`  - ${rec.description}`);
            }
        }
    }

    if (results.perCombatantMetrics.size > 0) {
        lines.push('');
        lines.push('Per-Combatant Metrics:');
        for (const [, m] of results.perCombatantMetrics) {
            lines.push(
                `  ${m.name} (${m.side}): DPR ${m.averageDamagePerRound.toFixed(1)}, ` +
                `Survival ${(m.survivalRate * 100).toFixed(0)}%, ` +
                `Kill Rate ${(m.killRate * 100).toFixed(0)}%`,
            );
        }
    }

    if (results.wasCancelled) {
        lines.push('');
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
            const text = buildClipboardSummary(results, balanceReport);
            await navigator.clipboard.writeText(text);
            showToast('Copied summary to clipboard', 'success', 1500);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            showToast('Failed to copy to clipboard', 'error', 2000);
        }
        closeMenu();
    }, [results, balanceReport, closeMenu]);

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
