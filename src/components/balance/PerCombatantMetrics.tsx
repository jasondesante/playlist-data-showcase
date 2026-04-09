import { useState, useMemo, useCallback, memo } from 'react';
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Swords,
    Shield,
    Crosshair,
    Heart,
    Skull,
    Zap,
} from 'lucide-react';
import type { CombatantSimulationMetrics } from 'playlist-data-engine';
import './PerCombatantMetrics.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PerCombatantMetricsProps {
    /** Per-combatant metrics from simulation results (Map keyed by combatant ID) */
    metrics: Map<string, CombatantSimulationMetrics>;
    /** Currently highlighted combatant ID (from chart interactivity) */
    highlightedCombatantId?: string | null;
    /** Callback when a combatant column is clicked */
    onCombatantClick?: (combatantId: string | null) => void;
    className?: string;
}

type SortKey =
    | 'name'
    | 'side'
    | 'dpr'
    | 'avgDmgDealt'
    | 'hitRate'
    | 'damageTaken'
    | 'survivalRate'
    | 'killRate'
    | 'critRate';

type SortDirection = 'asc' | 'desc';

interface SortState {
    key: SortKey;
    direction: SortDirection;
}

// ─── Row Definitions (formerly columns — now the vertical axis) ───────────────

interface RowDef {
    key: SortKey;
    label: string;
    icon: React.ReactNode;
    tooltip: string;
    getValue: (m: CombatantSimulationMetrics) => number | string;
    format: (m: CombatantSimulationMetrics) => string;
    /** Higher values are "better" for top-performer highlighting */
    higherIsBetter: boolean;
}

const ROWS: RowDef[] = [
    {
        key: 'side',
        label: 'Side',
        icon: <Shield size={12} />,
        tooltip: 'Player or Enemy',
        getValue: (m) => m.side,
        format: (m) => m.side === 'player' ? 'Player' : 'Enemy',
        higherIsBetter: false,
    },
    {
        key: 'dpr',
        label: 'DPR',
        icon: <Crosshair size={12} />,
        tooltip: 'Average Damage Per Round',
        getValue: (m) => m.averageDamagePerRound,
        format: (m) => m.averageDamagePerRound.toFixed(1),
        higherIsBetter: true,
    },
    {
        key: 'avgDmgDealt',
        label: 'Avg DMG/Run',
        icon: <Swords size={12} />,
        tooltip: 'Average total damage dealt per run',
        getValue: (m) => m.averageTotalDamageDealt,
        format: (m) => m.averageTotalDamageDealt.toFixed(0),
        higherIsBetter: true,
    },
    {
        key: 'hitRate',
        label: 'Hit Rate',
        icon: <Crosshair size={12} />,
        tooltip: 'Percentage of attacks that hit',
        getValue: (m) => m.averageHitRate,
        format: (m) => `${(m.averageHitRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'damageTaken',
        label: 'Avg Dmg Taken',
        icon: <Heart size={12} />,
        tooltip: 'Average total damage taken per run',
        getValue: (m) => m.averageTotalDamageTaken,
        format: (m) => m.averageTotalDamageTaken.toFixed(0),
        higherIsBetter: false,
    },
    {
        key: 'survivalRate',
        label: 'Survival',
        icon: <Shield size={12} />,
        tooltip: 'Percentage of runs survived',
        getValue: (m) => m.survivalRate,
        format: (m) => `${(m.survivalRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'killRate',
        label: 'Kill Rate',
        icon: <Skull size={12} />,
        tooltip: 'Percentage of runs with a kill',
        getValue: (m) => m.killRate,
        format: (m) => `${(m.killRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'critRate',
        label: 'Crit Rate',
        icon: <Zap size={12} />,
        tooltip: 'Critical hit rate (expected ~5%)',
        getValue: (m) => m.criticalHitRate,
        format: (m) => `${(m.criticalHitRate * 100).toFixed(1)}%`,
        higherIsBetter: true,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopPerformerKey(
    metrics: CombatantSimulationMetrics[],
    row: RowDef,
): string | null {
    if (metrics.length === 0) return null;

    let best: CombatantSimulationMetrics | null = null;
    for (const m of metrics) {
        if (!best || (row.higherIsBetter
            ? row.getValue(m) > row.getValue(best)
            : row.getValue(m) < row.getValue(best))) {
            best = m;
        }
    }
    return best?.combatantId ?? null;
}

function getSortIcon(
    rowKey: SortKey,
    sort: SortState,
): React.ReactNode {
    if (sort.key !== rowKey) {
        return <ArrowUpDown size={10} className="pcm-sort-icon pcm-sort-inactive" />;
    }
    return sort.direction === 'asc'
        ? <ArrowUp size={10} className="pcm-sort-icon pcm-sort-active" />
        : <ArrowDown size={10} className="pcm-sort-icon pcm-sort-active" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

function PerCombatantMetricsComponent({
    metrics,
    highlightedCombatantId,
    onCombatantClick,
    className = '',
}: PerCombatantMetricsProps) {
    const [sort, setSort] = useState<SortState>({ key: 'dpr', direction: 'desc' });

    const metricsArray = useMemo(
        () => Array.from(metrics.values()),
        [metrics],
    );

    // Pre-compute top performers per numeric row
    const topPerformers = useMemo(() => {
        const map = new Map<string, string | null>();
        for (const row of ROWS) {
            if (row.key === 'name' || row.key === 'side') continue;
            map.set(row.key, getTopPerformerKey(metricsArray, row));
        }
        return map;
    }, [metricsArray]);

    // Sort combatants (controls column order)
    const sorted = useMemo(() => {
        const row = ROWS.find((r) => r.key === sort.key);
        if (!row) return metricsArray;

        const dir = sort.direction === 'asc' ? 1 : -1;
        return [...metricsArray].sort((a, b) => {
            const va = row.getValue(a);
            const vb = row.getValue(b);
            if (typeof va === 'string' && typeof vb === 'string') {
                return va.localeCompare(vb) * dir;
            }
            return ((va as number) - (vb as number)) * dir;
        });
    }, [metricsArray, sort]);

    const handleSort = useCallback((key: SortKey) => {
        setSort((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    }, []);

    const handleColumnClick = useCallback((combatantId: string) => {
        onCombatantClick?.(combatantId);
    }, [onCombatantClick]);

    const isClickable = !!onCombatantClick;

    if (metricsArray.length === 0) {
        return null;
    }

    return (
        <div className={`pcm-per-combatant-metrics ${className}`}>
            <div className="pcm-header">
                <Crosshair size={14} className="pcm-header-icon" />
                <span className="pcm-header-title">Per-Combatant Metrics</span>
                <span className="pcm-header-count">{metricsArray.length} combatants</span>
            </div>
            <div className="pcm-table-wrapper">
                <table className={`pcm-table pcm-table-transposed ${isClickable ? 'pcm-table-clickable' : ''}`}>
                    <thead>
                        {/* Header row: empty label cell + one column per combatant */}
                        <tr>
                            <th className="pcm-th pcm-th-label-cell">
                                <span className="pcm-th-content">
                                    <Swords size={12} />
                                    <span className="pcm-th-label">Name</span>
                                </span>
                            </th>
                            {sorted.map((m) => {
                                const isHighlighted = highlightedCombatantId === m.combatantId;
                                return (
                                    <th
                                        key={m.combatantId}
                                        className={`pcm-th pcm-th-combatant pcm-th-combatant-${m.side} ${isHighlighted ? 'pcm-th-combatant-highlighted' : ''}`}
                                    >
                                        <button
                                            className="pcm-combatant-header"
                                            onClick={isClickable ? () => handleColumnClick(m.combatantId) : undefined}
                                            type="button"
                                            title={m.name}
                                        >
                                            <span className="pcm-combatant-name">{m.name}</span>
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.key} className="pcm-row">
                                <td className="pcm-td pcm-td-label">
                                    <button
                                        className="pcm-sort-btn pcm-sort-btn-row"
                                        onClick={() => handleSort(row.key)}
                                        type="button"
                                        title={`${row.tooltip} — click to sort columns`}
                                    >
                                        <span className="pcm-th-content">
                                            {row.icon}
                                            <span className="pcm-th-label">{row.label}</span>
                                            {getSortIcon(row.key, sort)}
                                        </span>
                                    </button>
                                </td>
                                {sorted.map((m) => {
                                    const isTop = topPerformers.get(row.key) === m.combatantId;
                                    const isHighlighted = highlightedCombatantId === m.combatantId;
                                    return (
                                        <td
                                            key={m.combatantId}
                                            className={`pcm-td pcm-td-value pcm-td-value-${m.side} ${isTop ? 'pcm-top-performer' : ''} ${isHighlighted ? 'pcm-td-highlighted' : ''}`}
                                            title={`${m.name}: ${row.format(m)}`}
                                        >
                                            {row.format(m)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export const PerCombatantMetrics = memo(PerCombatantMetricsComponent);
export default PerCombatantMetrics;
