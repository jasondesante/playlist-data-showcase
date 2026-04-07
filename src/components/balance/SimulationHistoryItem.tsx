import { useState, useMemo, memo } from 'react';
import {
    Swords,
    Trash2,
    Clock,
    Users,
    Skull,
    ChevronDown,
    ChevronUp,
    Target,
    GitCompareArrows,
} from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { SavedSimulation } from '@/store/simulationStore';
import './SimulationHistoryItem.css';

export interface SimulationHistoryItemProps {
    simulation: SavedSimulation;
    isActive: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    /** Whether this simulation is currently assigned to comparison slot A */
    isComparisonSlotA?: boolean;
    /** Whether this simulation is currently assigned to comparison slot B */
    isComparisonSlotB?: boolean;
    /** Callback to assign this simulation to a comparison slot */
    onCompare?: (slot: 'A' | 'B') => void;
    className?: string;
}

function formatRelativeTime(timestamp: string): string {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
    });
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.round(secs % 60);
    return `${mins}m ${remainingSecs}s`;
}

function getWinRateColor(winRate: number): string {
    if (winRate >= 0.8) return 'simulation-history-win-rate-high';
    if (winRate >= 0.5) return 'simulation-history-win-rate-medium';
    if (winRate >= 0.3) return 'simulation-history-win-rate-low';
    return 'simulation-history-win-rate-critical';
}

function arePropsEqual(
    prev: SimulationHistoryItemProps,
    next: SimulationHistoryItemProps,
): boolean {
    return (
        prev.simulation.id === next.simulation.id &&
        prev.isActive === next.isActive &&
        prev.isComparisonSlotA === next.isComparisonSlotA &&
        prev.isComparisonSlotB === next.isComparisonSlotB &&
        prev.className === next.className
    );
}

const SimulationHistoryItemComponent = memo(function SimulationHistoryItem({
    simulation,
    isActive,
    onSelect,
    onDelete,
    isComparisonSlotA = false,
    isComparisonSlotB = false,
    onCompare,
    className = '',
}: SimulationHistoryItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { results, config, party, encounter, timestamp, durationMs, label } = simulation;
    const summary = results.summary;

    const relativeTime = useMemo(() => formatRelativeTime(timestamp), [timestamp]);
    const formattedDuration = useMemo(() => formatDuration(durationMs), [durationMs]);
    const winRatePercent = useMemo(
        () => `${(summary.playerWinRate * 100).toFixed(1)}%`,
        [summary.playerWinRate],
    );
    const winRateColorClass = useMemo(
        () => getWinRateColor(summary.playerWinRate),
        [summary.playerWinRate],
    );

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(simulation.id);
    };

    const handleToggleExpand = () => {
        setIsExpanded((prev) => !prev);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = () => {
        onDelete(simulation.id);
        setShowDeleteConfirm(false);
    };

    const displayLabel = label || `${party.memberNames.join(', ')} vs ${encounter.enemySheets.length} enemy${encounter.enemySheets.length !== 1 ? 'ies' : 'y'}`;

    return (
        <>
            <div
                className={`simulation-history-item ${isActive ? 'simulation-history-item-active' : ''} ${className}`}
                role="listitem"
            >
                {/* Main Row */}
                <div className="simulation-history-item-main" onClick={handleToggleExpand}>
                    {/* Win Rate Badge */}
                    <div className={`simulation-history-item-win-rate ${winRateColorClass}`}>
                        <Target size={14} />
                        <span>{winRatePercent}</span>
                    </div>

                    {/* Info */}
                    <div className="simulation-history-item-info">
                        <div className="simulation-history-item-title-row">
                            <span className="simulation-history-item-label" title={displayLabel}>
                                {displayLabel}
                            </span>
                        </div>
                        <div className="simulation-history-item-meta">
                            <span className="simulation-history-item-meta-tag">
                                <Users size={11} />
                                {party.memberNames.length}v{encounter.enemySheets.length}
                            </span>
                            <span className="simulation-history-item-meta-tag">
                                <Swords size={11} />
                                {config.runCount} runs
                            </span>
                            <span className="simulation-history-item-meta-tag">
                                <Clock size={11} />
                                {formattedDuration}
                            </span>
                            <span className="simulation-history-item-time">{relativeTime}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="simulation-history-item-actions">
                        {!isActive && (
                            <button
                                className="simulation-history-item-load-btn"
                                onClick={handleSelect}
                                title="View results"
                                type="button"
                            >
                                View
                            </button>
                        )}
                        {onCompare && !isComparisonSlotA && !isComparisonSlotB && (
                            <button
                                className="simulation-history-item-compare-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCompare('A');
                                }}
                                title="Compare (assign to slot A)"
                                type="button"
                            >
                                <GitCompareArrows size={13} />
                            </button>
                        )}
                        {onCompare && isComparisonSlotA && (
                            <button
                                className="simulation-history-item-compare-btn simulation-history-item-slot-a"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCompare('A');
                                }}
                                title="Remove from comparison slot A"
                                type="button"
                                disabled
                            >
                                A
                            </button>
                        )}
                        {onCompare && isComparisonSlotB && (
                            <button
                                className="simulation-history-item-compare-btn simulation-history-item-slot-b"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCompare('B');
                                }}
                                title="Remove from comparison slot B"
                                type="button"
                                disabled
                            >
                                B
                            </button>
                        )}
                        <button
                            className="simulation-history-item-delete-btn"
                            onClick={handleDeleteClick}
                            title="Delete simulation"
                            type="button"
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="simulation-history-item-toggle">
                            {isExpanded ? (
                                <ChevronUp size={16} />
                            ) : (
                                <ChevronDown size={16} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="simulation-history-item-details">
                        <div className="simulation-history-item-details-grid">
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">Party</span>
                                <span className="simulation-history-item-detail-value">
                                    {party.memberNames.join(', ')} (Lv {party.memberLevels.join(', ')})
                                </span>
                            </div>
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">Enemies</span>
                                <span className="simulation-history-item-detail-value">
                                    {encounter.enemySheets.length} enemy{encounter.enemySheets.length !== 1 ? 'ies' : 'y'}{' '}
                                    (CR {encounter.enemySheets.map((e) => e.cr ?? e.level).join(', ')})
                                </span>
                            </div>
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">Avg Rounds</span>
                                <span className="simulation-history-item-detail-value">
                                    {summary.averageRounds.toFixed(1)}
                                </span>
                            </div>
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">Avg HP Remaining</span>
                                <span className="simulation-history-item-detail-value">
                                    {(summary.averagePlayerHPPercentRemaining * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">Player Deaths</span>
                                <span className="simulation-history-item-detail-value simulation-history-detail-deaths">
                                    <Skull size={12} />
                                    {summary.totalPlayerDeaths}
                                </span>
                            </div>
                            <div className="simulation-history-item-detail">
                                <span className="simulation-history-item-detail-label">AI Strategy</span>
                                <span className="simulation-history-item-detail-value">
                                    P:{config.aiConfig.playerStyle} / E:{config.aiConfig.enemyStyle}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Simulation"
                message={`Delete "${displayLabel}"? This cannot be undone.`}
                confirmText="Delete"
                isDestructive
                onConfirm={handleDeleteConfirm}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </>
    );
}, arePropsEqual);

export const SimulationHistoryItem = SimulationHistoryItemComponent;
export default SimulationHistoryItemComponent;
