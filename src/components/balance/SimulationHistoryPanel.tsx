import { useState, useMemo, useId, useCallback } from 'react';
import {
    ChevronDown,
    ChevronUp,
    History,
    Swords,
    Trash2,
    AlertTriangle,
} from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';
import { SimulationHistoryItem } from './SimulationHistoryItem';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import './SimulationHistoryPanel.css';

export interface SimulationHistoryPanelProps {
    activeSimulationId: string | null;
    onSelectSimulation: (id: string) => void;
    className?: string;
}

const MAX_VISIBLE_ITEMS = 10;

export function SimulationHistoryPanel({
    activeSimulationId,
    onSelectSimulation,
    className = '',
}: SimulationHistoryPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

    const uniqueId = useId();
    const contentId = `simulation-history-content-${uniqueId}`;

    const savedSimulations = useSimulationStore((s) => s.savedSimulations);
    const deleteSimulation = useSimulationStore((s) => s.deleteSimulation);
    const clearAllSimulations = useSimulationStore((s) => s.clearAllSimulations);

    const visibleSimulations = useMemo(() => {
        if (showAll || savedSimulations.length <= MAX_VISIBLE_ITEMS) {
            return savedSimulations;
        }
        return savedSimulations.slice(0, MAX_VISIBLE_ITEMS);
    }, [savedSimulations, showAll]);

    const hasMore = savedSimulations.length > MAX_VISIBLE_ITEMS;
    const remainingCount = savedSimulations.length - MAX_VISIBLE_ITEMS;

    const handleDelete = useCallback(
        (id: string) => {
            deleteSimulation(id);
        },
        [deleteSimulation],
    );

    const handleClearAll = useCallback(() => {
        clearAllSimulations();
        setShowClearAllConfirm(false);
    }, [clearAllSimulations]);

    const handleToggleCollapsed = () => {
        setIsCollapsed((prev) => !prev);
    };

    // Empty state
    if (savedSimulations.length === 0) {
        return (
            <div className={`simulation-history-panel ${className}`}>
                <div className="simulation-history-panel-header">
                    <div className="simulation-history-panel-title-row">
                        <History className="simulation-history-panel-icon" size={18} />
                        <h3 className="simulation-history-panel-title">Saved Simulations</h3>
                    </div>
                </div>
                <div className="simulation-history-panel-empty" role="status">
                    <Swords className="simulation-history-panel-empty-icon" size={32} />
                    <p className="simulation-history-panel-empty-text">No saved simulations</p>
                    <p className="simulation-history-panel-empty-hint">
                        Run a simulation and save the results to see them here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`simulation-history-panel ${className}`}>
            {/* Header */}
            <div
                className="simulation-history-panel-header"
                onClick={handleToggleCollapsed}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleCollapsed();
                    }
                }}
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
                aria-label={`Saved Simulations - ${savedSimulations.length} results. Click to ${isCollapsed ? 'expand' : 'collapse'}`}
            >
                <div className="simulation-history-panel-title-row">
                    <History className="simulation-history-panel-icon" size={18} />
                    <h3 className="simulation-history-panel-title">Saved Simulations</h3>
                    <span className="simulation-history-panel-count">
                        {savedSimulations.length} result{savedSimulations.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="simulation-history-panel-header-actions">
                    {!isCollapsed && savedSimulations.length > 1 && (
                        <button
                            className="simulation-history-panel-clear-all-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowClearAllConfirm(true);
                            }}
                            title="Clear all saved simulations"
                            type="button"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <div className="simulation-history-panel-toggle">
                        {isCollapsed ? (
                            <ChevronDown size={18} />
                        ) : (
                            <ChevronUp size={18} />
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div id={contentId} role="region" aria-label="Saved simulation list">
                    <div
                        className="simulation-history-panel-list"
                        role="list"
                        aria-label="Saved simulations"
                    >
                        {visibleSimulations.map((sim) => (
                            <SimulationHistoryItem
                                key={sim.id}
                                simulation={sim}
                                isActive={sim.id === activeSimulationId}
                                onSelect={onSelectSimulation}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>

                    {/* Show More */}
                    {hasMore && (
                        <div className="simulation-history-panel-footer">
                            <button
                                className="simulation-history-panel-show-more"
                                onClick={() => setShowAll((prev) => !prev)}
                                aria-label={showAll ? 'Show fewer simulations' : `Show ${remainingCount} more simulations`}
                                type="button"
                            >
                                {showAll ? 'Show Less' : `Show ${remainingCount} More`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Clear All Confirm */}
            <ConfirmDialog
                isOpen={showClearAllConfirm}
                title="Clear All Simulations"
                message={`Delete all ${savedSimulations.length} saved simulation${savedSimulations.length !== 1 ? 's' : ''}? This cannot be undone.`}
                confirmText="Delete All"
                isDestructive
                icon={AlertTriangle}
                onConfirm={handleClearAll}
                onCancel={() => setShowClearAllConfirm(false)}
            />
        </div>
    );
}

export default SimulationHistoryPanel;
