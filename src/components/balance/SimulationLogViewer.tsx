/**
 * SimulationLogViewer Component
 *
 * Displays the full combat action log for a selected simulation run.
 * Only available when the simulation was run with `collectDetailedLogs: true`.
 *
 * Features:
 * - Dropdown to select a specific run by index
 * - Combat log entries in same format as CombatSimulatorTab
 * - Per-round breakdown with round separators
 * - Per-combatant metrics for the selected run
 * - Run summary (winner, rounds, XP)
 *
 * (Task 8.4.1)
 */

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
    FileText,
    ChevronDown,
    ChevronRight,
    Trophy,
    Skull,
    Swords,
    Shield,
    Clock,
    Zap,
    Heart,
    Target,
    X,
} from 'lucide-react';
import type {
    SimulationResults,
    SimulationRunDetail,
    CombatAction,
    CombatantMetrics,
} from 'playlist-data-engine';
import './SimulationLogViewer.css';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SimulationLogViewerProps {
    results: SimulationResults;
    /** Optional round range filter — only show runs within this range */
    roundRangeFilter?: { min: number; max: number; label: string } | null;
    /** Callback to clear the round range filter */
    onClearRoundFilter?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getLogEntryColor(action: CombatAction): string {
    switch (action.type) {
        case 'dodge': return 'slv-entry-dodge';
        case 'dash': return 'slv-entry-dash';
        case 'disengage': return 'slv-entry-disengage';
        case 'flee': return 'slv-entry-flee';
        case 'spell': return 'slv-entry-spell';
        case 'legendaryAction': return 'slv-entry-legendary';
        case 'statusEffectTick': return 'slv-entry-status';
        case 'useItem': return 'slv-entry-item';
        case 'attack':
            if (action.result?.isCritical) return 'slv-entry-critical';
            if (action.result?.success) return 'slv-entry-hit';
            if (action.result?.success === false) return 'slv-entry-miss';
            return 'slv-entry-neutral';
        default: return 'slv-entry-neutral';
    }
}

function formatActionType(type: CombatAction['type']): string {
    switch (type) {
        case 'attack': return 'attacks';
        case 'spell': return 'casts a spell';
        case 'dodge': return 'dodges';
        case 'dash': return 'dashes';
        case 'disengage': return 'disengages';
        case 'flee': return 'flees';
        case 'useItem': return 'uses an item';
        case 'legendaryAction': return 'uses a legendary action';
        case 'statusEffectTick': return 'status effect tick';
        case 'help': return 'helps';
        case 'hide': return 'hides';
        case 'ready': return 'readies';
        default: return type;
    }
}

function getCombatantName(combatant: { character: { name: string } } | undefined): string {
    return combatant?.character?.name ?? '???';
}

function getCombatantHP(combatant: { currentHP: number; character: { hp: { max: number } } } | undefined): string {
    if (!combatant) return '?';
    return `${combatant.currentHP}/${combatant.character.hp.max}`;
}

/** Group combat actions by round number based on combatant count */
function groupByRound(history: CombatAction[], combatantCount: number): Map<number, CombatAction[]> {
    const rounds = new Map<number, CombatAction[]>();
    for (let i = 0; i < history.length; i++) {
        const roundNum = Math.floor(i / combatantCount) + 1;
        if (!rounds.has(roundNum)) {
            rounds.set(roundNum, []);
        }
        rounds.get(roundNum)!.push(history[i]);
    }
    return rounds;
}

/** Get the side of a combatant (player or enemy) based on ID */
function getSide(combatantId: string): 'player' | 'enemy' {
    return combatantId.startsWith('player_') ? 'player' : 'enemy';
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** Single combat log entry */
const LogEntry = memo(function LogEntry({ action }: { action: CombatAction }) {
    const isHit = action.type === 'attack' && action.result?.success === true;
    const isCrit = action.result?.isCritical === true;

    return (
        <div className={`slv-entry ${getLogEntryColor(action)}`}>
            <div className="slv-entry-meta">
                <span className={`slv-entry-actor slv-entry-actor-${getSide(action.actor.id)}`}>
                    {getCombatantName(action.actor)}
                </span>
                <span className="slv-entry-action">{formatActionType(action.type)}</span>
                {action.target && (
                    <span className="slv-entry-target">
                        {' \u2192 '}
                        <span className={`slv-entry-target-name slv-entry-target-name-${getSide(action.target.id)}`}>
                            {getCombatantName(action.target)}
                        </span>
                    </span>
                )}
            </div>

            {/* Attack details */}
            {action.type === 'attack' && action.result && (
                <div className="slv-entry-details">
                    {action.result.roll !== undefined && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Roll:</span>{' '}
                            <span className={isHit ? 'slv-detail-hit' : 'slv-detail-miss'}>
                                {action.result.roll}
                            </span>
                            {isCrit && <span className="slv-detail-crit">CRIT!</span>}
                        </span>
                    )}
                    {action.result.success !== undefined && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Result:</span>{' '}
                            <span className={isHit ? 'slv-detail-hit' : 'slv-detail-miss'}>
                                {isHit ? 'HIT' : 'MISS'}
                            </span>
                        </span>
                    )}
                    {action.result.damage !== undefined && isHit && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Damage:</span>{' '}
                            <span className="slv-detail-damage">
                                {action.result.damage}{action.result.damageType ? ` ${action.result.damageType}` : ''}
                            </span>
                        </span>
                    )}
                    {action.target && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">HP:</span>{' '}
                            <span className={action.result?.targetHP !== undefined && action.result.targetHP < 10 ? 'slv-detail-low-hp' : ''}>
                                {action.result?.targetHP !== undefined ? action.result.targetHP : '?'}
                                /{action.target.character.hp.max}
                            </span>
                        </span>
                    )}
                    {action.attack && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Weapon:</span>{' '}
                            {action.attack.name}
                        </span>
                    )}
                </div>
            )}

            {/* Spell details */}
            {action.type === 'spell' && action.result && (
                <div className="slv-entry-details">
                    {action.spell && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Spell:</span>{' '}
                            <span className="slv-detail-spell">{action.spell.name}</span>
                        </span>
                    )}
                    {action.result.description && (
                        <span className="slv-detail slv-detail-desc">{action.result.description}</span>
                    )}
                    {action.result.damage !== undefined && action.result.success && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Damage:</span>{' '}
                            <span className="slv-detail-damage">{action.result.damage}</span>
                        </span>
                    )}
                </div>
            )}

            {/* Legendary action details */}
            {action.type === 'legendaryAction' && action.result && (
                <div className="slv-entry-details">
                    {action.legendaryAction && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Action:</span>{' '}
                            <span className="slv-detail-legendary">{action.legendaryAction.name}</span>
                        </span>
                    )}
                    {action.result.description && (
                        <span className="slv-detail slv-detail-desc">{action.result.description}</span>
                    )}
                    {action.result.damage !== undefined && action.result.damage > 0 && (
                        <span className="slv-detail">
                            <span className="slv-detail-label">Damage:</span>{' '}
                            <span className="slv-detail-damage">{action.result.damage}</span>
                        </span>
                    )}
                </div>
            )}

            {/* Status effect tick */}
            {action.type === 'statusEffectTick' && action.result?.description && (
                <div className="slv-entry-details">
                    <span className="slv-detail slv-detail-desc">{action.result.description}</span>
                </div>
            )}

            {/* Description fallback */}
            {action.type !== 'attack' && action.type !== 'spell' && action.type !== 'legendaryAction' && action.type !== 'statusEffectTick' && action.result?.description && (
                <div className="slv-entry-details">
                    <span className="slv-detail slv-detail-desc">{action.result.description}</span>
                </div>
            )}
        </div>
    );
});

/** Run metrics table for a single run */
const RunMetricsTable = memo(function RunMetricsTable({
    metrics,
}: {
    metrics: Map<string, CombatantMetrics>;
}) {
    const entries = useMemo(() => {
        return Array.from(metrics.entries())
            .map(([id, m]) => ({ id, ...m }))
            .sort((a, b) => {
                // Players first, then enemies
                if (a.side === 'player' && b.side === 'enemy') return -1;
                if (a.side === 'enemy' && b.side === 'player') return 1;
                return b.totalDamageDealt - a.totalDamageDealt;
            });
    }, [metrics]);

    if (entries.length === 0) return null;

    const actionTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            attack: 'Attacks',
            castSpell: 'Spells',
            dodge: 'Dodges',
            dash: 'Dashes',
            flee: 'Flees',
            useItem: 'Items',
            legendaryAction: 'Legendary',
            skip: 'Skips',
        };
        return labels[type] || type;
    };

    return (
        <div className="slv-metrics-section">
            <div className="slv-metrics-header">
                <Target size={14} />
                <span>Per-Combatant Metrics</span>
            </div>
            <div className="slv-metrics-table-wrapper">
                <table className="slv-metrics-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Side</th>
                            <th>DPR</th>
                            <th>Dmg Dealt</th>
                            <th>Dmg Taken</th>
                            <th>Healing</th>
                            <th>Survived</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((m) => (
                            <tr key={m.id} className={`slv-metrics-row slv-metrics-row-${m.side}`}>
                                <td className={`slv-metrics-name slv-metrics-name-${m.side}`}>
                                    {m.name}
                                </td>
                                <td className="slv-metrics-side">
                                    {m.side === 'player' ? 'Player' : 'Enemy'}
                                </td>
                                <td className="slv-metrics-dpr">
                                    {m.roundsSurvived > 0
                                        ? (m.totalDamageDealt / m.roundsSurvived).toFixed(1)
                                        : '0'}
                                </td>
                                <td className="slv-metrics-damage">{m.totalDamageDealt}</td>
                                <td className="slv-metrics-damage-taken">{m.totalDamageTaken}</td>
                                <td className="slv-metrics-healing">{m.totalHealingDone}</td>
                                <td className="slv-metrics-survived">
                                    {m.survived ? (
                                        <span className="slv-survived-yes">Yes</span>
                                    ) : (
                                        <span className="slv-survived-no">
                                            R{m.roundsSurvived}
                                        </span>
                                    )}
                                </td>
                                <td className="slv-metrics-actions">
                                    {Object.entries(m.actionsByType)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([type, count]) => (
                                            <span key={type} className="slv-action-badge">
                                                {actionTypeLabel(type)}: {count}
                                            </span>
                                        ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

/** Round separator and header */
const RoundHeader = memo(function RoundHeader({
    roundNum,
    actionCount,
}: {
    roundNum: number;
    actionCount: number;
}) {
    return (
        <div className="slv-round-header">
            <span className="slv-round-number">Round {roundNum}</span>
            <span className="slv-round-actions">{actionCount} actions</span>
        </div>
    );
});

// ─── Main Component ─────────────────────────────────────────────────────────────

/**
 * SimulationLogViewer
 *
 * Allows selecting a specific simulation run and viewing its full combat log,
 * per-round breakdown, and per-combatant metrics.
 */
export function SimulationLogViewer({ results, roundRangeFilter, onClearRoundFilter }: SimulationLogViewerProps) {
    const [selectedRunIndex, setSelectedRunIndex] = useState(0);
    const [showMetrics, setShowMetrics] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    const runDetails = results.runDetails;
    const hasDetailedLogs = runDetails !== undefined && runDetails.length > 0;

    // Filter run details by round range when a filter is active
    const filteredRunDetails = useMemo(() => {
        if (!hasDetailedLogs) return runDetails;
        if (!roundRangeFilter) return runDetails;
        return runDetails.filter(rd => {
            const rounds = rd.result.roundsElapsed;
            return rounds >= roundRangeFilter.min && rounds < roundRangeFilter.max;
        });
    }, [runDetails, hasDetailedLogs, roundRangeFilter]);

    const isFiltered = filteredRunDetails !== runDetails && roundRangeFilter !== null && roundRangeFilter !== undefined;

    // Get the selected run's data (from filtered list)
    const selectedRun = useMemo((): SimulationRunDetail | null => {
        const source = filteredRunDetails;
        if (!source || selectedRunIndex >= source.length) return null;
        return source[selectedRunIndex];
    }, [filteredRunDetails, selectedRunIndex]);

    // Group actions by round
    const roundGroups = useMemo(() => {
        if (!selectedRun) return new Map<number, CombatAction[]>();
        const combatantCount = selectedRun.combat.combatants.length;
        return groupByRound(selectedRun.combat.history, combatantCount);
    }, [selectedRun]);

    // Scroll to top when changing runs or filter
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [selectedRunIndex, roundRangeFilter]);

    // Reset selected index when filter changes
    useEffect(() => {
        setSelectedRunIndex(0);
    }, [roundRangeFilter]);

    const handleRunChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRunIndex(Number(e.target.value));
    }, []);

    // ─── No detailed logs state ──────────────────────────────────────────────
    if (!hasDetailedLogs) {
        return (
            <div className="slv-container">
                <button
                    className="slv-panel-header"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-expanded={!collapsed}
                >
                    <div className="slv-panel-title-row">
                        <FileText size={16} className="slv-panel-icon" />
                        <span className="slv-panel-title">Combat Log Viewer</span>
                    </div>
                    <span className="slv-panel-toggle">
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </span>
                </button>

                {!collapsed && (
                    <div className="slv-empty-state">
                        <FileText size={24} strokeWidth={1.5} className="slv-empty-icon" />
                        <p className="slv-empty-text">No detailed logs available</p>
                        <p className="slv-empty-hint">
                            Enable &quot;Collect detailed logs&quot; in the simulation configuration to view
                            per-run combat logs. This stores the full action history for each run.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // ─── Detailed logs available ─────────────────────────────────────────────

    const run = selectedRun;
    const metrics = run?.metrics;
    const winnerName = run?.result?.winner ? getCombatantName(run.result.winner) : null;

    return (
        <div className="slv-container">
            <button
                className="slv-panel-header"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
            >
                <div className="slv-panel-title-row">
                    <FileText size={16} className="slv-panel-icon" />
                    <span className="slv-panel-title">Combat Log Viewer</span>
                    {isFiltered && (
                        <span className="slv-filter-badge">
                            {filteredRunDetails!.length} of {runDetails!.length}
                        </span>
                    )}
                    {!isFiltered && (
                        <span className="slv-count-badge">{runDetails!.length}</span>
                    )}
                </div>
                <span className="slv-panel-toggle">
                    {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </span>
            </button>

            {!collapsed && (
                <div className="slv-content">
                    {/* ─── Round Range Filter Indicator ─────────────────── */}
                    {isFiltered && (
                        <div className="slv-filter-bar">
                            <span className="slv-filter-label">
                                Showing runs: {roundRangeFilter!.label} rounds
                            </span>
                            <button
                                className="slv-filter-clear"
                                onClick={onClearRoundFilter}
                                type="button"
                                title="Clear filter"
                            >
                                <X size={12} />
                                Clear
                            </button>
                        </div>
                    )}

                    {/* ─── Run Selector ──────────────────────────────────── */}
                    <div className="slv-run-selector">
                        <label className="slv-run-label" htmlFor="slv-run-select">
                            <Swords size={12} />
                            Select Run
                        </label>
                        <select
                            id="slv-run-select"
                            className="slv-run-select"
                            value={selectedRunIndex}
                            onChange={handleRunChange}
                        >
                            {(filteredRunDetails ?? runDetails)!.map((rd, idx) => (
                                <option key={rd.runIndex} value={idx}>
                                    Run {rd.runIndex + 1} —{' '}
                                    {rd.result.winnerSide === 'player'
                                        ? `Player win (${rd.result.roundsElapsed}R)`
                                        : rd.result.winnerSide === 'enemy'
                                            ? `Enemy win (${rd.result.roundsElapsed}R)`
                                            : `Draw (${rd.result.roundsElapsed}R)`}
                                </option>
                            ))}
                        </select>
                        <span className="slv-run-seed">Seed: {run?.seed ?? '—'}</span>
                    </div>

                    {/* ─── Run Summary Bar ───────────────────────────────── */}
                    {run && (
                        <div className="slv-run-summary">
                            <div className={`slv-summary-item slv-summary-${run.result.winnerSide}`}>
                                {run.result.winnerSide === 'player' ? (
                                    <Trophy size={12} />
                                ) : run.result.winnerSide === 'enemy' ? (
                                    <Skull size={12} />
                                ) : (
                                    <Swords size={12} />
                                )}
                                <span>
                                    {run.result.winnerSide === 'player'
                                        ? `Player wins${winnerName ? ` (${winnerName})` : ''}`
                                        : run.result.winnerSide === 'enemy'
                                            ? `Enemy wins${winnerName ? ` (${winnerName})` : ''}`
                                            : 'Draw'}
                                </span>
                            </div>
                            <div className="slv-summary-item">
                                <Clock size={12} />
                                <span>{run.result.roundsElapsed} rounds</span>
                            </div>
                            <div className="slv-summary-item">
                                <Zap size={12} />
                                <span>{run.result.totalTurns} turns</span>
                            </div>
                            <div className="slv-summary-item">
                                <Shield size={12} />
                                <span>{run.result.defeated.length} defeated</span>
                            </div>
                            <div className="slv-summary-item">
                                <Heart size={12} />
                                <span>
                                    {run.combat.combatants
                                        .filter((c) => !c.isDefeated)
                                        .map((c) => `${getCombatantName(c)} (${getCombatantHP(c)})`)
                                        .join(', ') || 'None'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ─── Toggle: Metrics ───────────────────────────────── */}
                    <button
                        className="slv-metrics-toggle"
                        onClick={() => setShowMetrics(!showMetrics)}
                    >
                        <Target size={12} />
                        <span>{showMetrics ? 'Hide' : 'Show'} Run Metrics</span>
                        {showMetrics ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    {showMetrics && metrics && (
                        <RunMetricsTable metrics={metrics} />
                    )}

                    {/* ─── Combat Log ────────────────────────────────────── */}
                    {run && (
                        <div className="slv-log-section">
                            <div className="slv-log-header">
                                <span className="slv-log-title">Action Log</span>
                                <span className="slv-log-count">
                                    {run.combat.history.length} actions in {run.result.roundsElapsed} rounds
                                </span>
                            </div>
                            <div ref={logContainerRef} className="slv-log-container">
                                {Array.from(roundGroups.entries()).map(([roundNum, actions]) => (
                                    <div key={roundNum} className="slv-round-group">
                                        <RoundHeader
                                            roundNum={roundNum}
                                            actionCount={actions.length}
                                        />
                                        {actions.map((action, idx) => (
                                            <LogEntry
                                                key={`${roundNum}-${idx}`}
                                                action={action}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
