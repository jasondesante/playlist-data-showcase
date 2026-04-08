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
    /** Callback when a combatant row is clicked */
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

interface ColumnDef {
    key: SortKey;
    label: string;
    icon: React.ReactNode;
    /** Tooltip explaining what this metric means */
    tooltip: string;
    /** Extract the comparable value from a metric */
    getValue: (m: CombatantSimulationMetrics) => number | string;
    /** Format the value for display */
    format: (m: CombatantSimulationMetrics) => string;
    /** Higher values are "better" for highlighting purposes */
    higherIsBetter: boolean;
}

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS: ColumnDef[] = [
    {
        key: 'name',
        label: 'Name',
        icon: <Swords size={12} />,
        tooltip: 'Combatant name',
        getValue: (m) => m.name,
        format: (m) => m.name,
        higherIsBetter: false,
    },
    {
        key: 'side',
        label: 'Side',
        icon: <Shield size={12} />,
        tooltip: 'Whether this combatant is on the player or enemy side',
        getValue: (m) => m.side,
        format: (m) => m.side === 'player' ? 'Player' : 'Enemy',
        higherIsBetter: false,
    },
    {
        key: 'dpr',
        label: 'DPR',
        icon: <Crosshair size={12} />,
        tooltip: 'Average Damage Per Round — total damage dealt divided by rounds survived',
        getValue: (m) => m.averageDamagePerRound,
        format: (m) => m.averageDamagePerRound.toFixed(1),
        higherIsBetter: true,
    },
    {
        key: 'avgDmgDealt',
        label: 'Avg DMG/Run',
        icon: <Swords size={12} />,
        tooltip: 'Average total damage dealt per simulation run',
        getValue: (m) => m.averageTotalDamageDealt,
        format: (m) => m.averageTotalDamageDealt.toFixed(0),
        higherIsBetter: true,
    },
    {
        key: 'hitRate',
        label: 'Hit Rate',
        icon: <Crosshair size={12} />,
        tooltip: 'Percentage of attack/spell attempts that hit (hits / (hits + misses))',
        getValue: (m) => m.averageHitRate,
        format: (m) => `${(m.averageHitRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'damageTaken',
        label: 'Avg Dmg Taken',
        icon: <Heart size={12} />,
        tooltip: 'Average total damage taken per simulation run across all runs',
        getValue: (m) => m.averageTotalDamageTaken,
        format: (m) => m.averageTotalDamageTaken.toFixed(0),
        higherIsBetter: false,
    },
    {
        key: 'survivalRate',
        label: 'Survival',
        icon: <Shield size={12} />,
        tooltip: 'Percentage of simulation runs where this combatant was still alive at combat end',
        getValue: (m) => m.survivalRate,
        format: (m) => `${(m.survivalRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'killRate',
        label: 'Kill Rate',
        icon: <Skull size={12} />,
        tooltip: 'Percentage of simulation runs where this combatant scored the killing blow on at least one enemy',
        getValue: (m) => m.killRate,
        format: (m) => `${(m.killRate * 100).toFixed(0)}%`,
        higherIsBetter: true,
    },
    {
        key: 'critRate',
        label: 'Crit Rate',
        icon: <Zap size={12} />,
        tooltip: 'Percentage of attack rolls that were natural 20 critical hits (expected ~5%)',
        getValue: (m) => m.criticalHitRate,
        format: (m) => `${(m.criticalHitRate * 100).toFixed(1)}%`,
        higherIsBetter: true,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopPerformerKey(
    metrics: CombatantSimulationMetrics[],
    column: ColumnDef,
): string | null {
    if (metrics.length === 0) return null;

    let best: CombatantSimulationMetrics | null = null;
    for (const m of metrics) {
        if (!best || (column.higherIsBetter
            ? column.getValue(m) > column.getValue(best)
            : column.getValue(m) < column.getValue(best))) {
            best = m;
        }
    }
    return best?.combatantId ?? null;
}

function getSortIcon(
    columnKey: SortKey,
    sort: SortState,
): React.ReactNode {
    if (sort.key !== columnKey) {
        return <ArrowUpDown size={12} className="pcm-sort-icon pcm-sort-inactive" />;
    }
    return sort.direction === 'asc'
        ? <ArrowUp size={12} className="pcm-sort-icon pcm-sort-active" />
        : <ArrowDown size={12} className="pcm-sort-icon pcm-sort-active" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

function PerCombatantMetricsComponent({
    metrics,
    highlightedCombatantId,
    onCombatantClick,
    className = '',
}: PerCombatantMetricsProps) {
    const [sort, setSort] = useState<SortState>({ key: 'dpr', direction: 'desc' });

    // Convert Map to array
    const metricsArray = useMemo(
        () => Array.from(metrics.values()),
        [metrics],
    );

    // Pre-compute top performers per numeric column
    const topPerformers = useMemo(() => {
        const map = new Map<string, string | null>();
        for (const col of COLUMNS) {
            if (col.key === 'name' || col.key === 'side') continue;
            map.set(col.key, getTopPerformerKey(metricsArray, col));
        }
        return map;
    }, [metricsArray]);

    // Sort metrics
    const sorted = useMemo(() => {
        const col = COLUMNS.find((c) => c.key === sort.key);
        if (!col) return metricsArray;

        const dir = sort.direction === 'asc' ? 1 : -1;
        return [...metricsArray].sort((a, b) => {
            const va = col.getValue(a);
            const vb = col.getValue(b);
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

    const handleRowClick = useCallback((combatantId: string) => {
        onCombatantClick?.(combatantId);
    }, [onCombatantClick]);

    const isClickable = !!onCombatantClick;

    // Split into players and enemies for section display
    const players = useMemo(() => sorted.filter((m) => m.side === 'player'), [sorted]);
    const enemies = useMemo(() => sorted.filter((m) => m.side === 'enemy'), [sorted]);

    if (metricsArray.length === 0) {
        return null;
    }

    const renderSection = (
        label: string,
        data: CombatantSimulationMetrics[],
    ) => {
        if (data.length === 0) return null;

        return (
            <div className="pcm-section">
                <div className={`pcm-section-label pcm-section-${label.toLowerCase()}`}>
                    {label}
                </div>
                <div className="pcm-table-wrapper">
                    <table className={`pcm-table ${isClickable ? 'pcm-table-clickable' : ''}`}>
                        <thead>
                            <tr>
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`pcm-th pcm-th-${col.key}`}
                                    >
                                        <button
                                            className="pcm-sort-btn"
                                            onClick={() => handleSort(col.key)}
                                            type="button"
                                            title={`${col.tooltip} — click to sort`}
                                        >
                                            <span className="pcm-th-content">
                                                {col.icon}
                                                <span className="pcm-th-label">{col.label}</span>
                                                {getSortIcon(col.key, sort)}
                                            </span>
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((m) => {
                                const isHighlighted = highlightedCombatantId === m.combatantId;
                                return (
                                    <tr
                                        key={m.combatantId}
                                        className={`pcm-row pcm-row-${m.side} ${isHighlighted ? 'pcm-row-highlighted' : ''} ${isClickable ? 'pcm-row-clickable' : ''}`}
                                        onClick={isClickable ? () => handleRowClick(m.combatantId) : undefined}
                                        tabIndex={isClickable ? 0 : undefined}
                                        onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(m.combatantId); } } : undefined}
                                        role={isClickable ? 'button' : undefined}
                                        aria-pressed={isClickable ? isHighlighted : undefined}
                                    >
                                        {COLUMNS.map((col) => {
                                            const isTop = topPerformers.get(col.key) === m.combatantId;
                                            return (
                                                <td
                                                    key={col.key}
                                                    className={`pcm-td pcm-td-${col.key} ${isTop ? 'pcm-top-performer' : ''}`}
                                                    title={col.format(m)}
                                                >
                                                    {col.format(m)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className={`pcm-per-combatant-metrics ${className}`}>
            <div className="pcm-header">
                <Crosshair size={14} className="pcm-header-icon" />
                <span className="pcm-header-title">Per-Combatant Metrics</span>
                <span className="pcm-header-count">{metricsArray.length} combatants</span>
            </div>
            {renderSection('Players', players)}
            {renderSection('Enemies', enemies)}
        </div>
    );
}

export const PerCombatantMetrics = memo(PerCombatantMetricsComponent);
export default PerCombatantMetrics;
