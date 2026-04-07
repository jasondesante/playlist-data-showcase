/**
 * Simulation Progress Bar (Task 8.2.5)
 *
 * Shows progress (runs completed / total), estimated time remaining,
 * cancel button, and live win rate preview.
 */

import { Clock, X } from 'lucide-react';
import './SimulationProgressBar.css';

interface SimulationProgressBarProps {
    /** Number of runs completed */
    completed: number;
    /** Total runs requested */
    total: number;
    /** Estimated milliseconds remaining (null if too early) */
    estimatedMsRemaining: number | null;
    /** Current live win rate (0-1), or null if not yet available */
    liveWinRate: number | null;
    /** Cancel callback */
    onCancel: () => void;
}

function formatDuration(ms: number): string {
    if (ms < 1000) return `<1s`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
}

export function SimulationProgressBar({
    completed,
    total,
    estimatedMsRemaining,
    liveWinRate,
    onCancel,
}: SimulationProgressBarProps) {
    const fraction = total > 0 ? completed / total : 0;
    const percent = (fraction * 100).toFixed(1);

    return (
        <div className="sim-progress-bar">
            <div className="sim-progress-track">
                <div
                    className="sim-progress-fill"
                    style={{ width: `${fraction * 100}%` }}
                />
            </div>
            <div className="sim-progress-info">
                <span className="sim-progress-count">
                    {completed.toLocaleString()} / {total.toLocaleString()} ({percent}%)
                </span>
                {liveWinRate !== null && (
                    <span className={`sim-progress-winrate ${liveWinRate >= 0.5 ? 'sim-wr-favorable' : 'sim-wr-unfavorable'}`}>
                        {completed > 0 && (liveWinRate * 100).toFixed(1)}% win rate
                    </span>
                )}
                {estimatedMsRemaining !== null && (
                    <span className="sim-progress-eta">
                        <Clock size={12} />
                        {formatDuration(estimatedMsRemaining)}
                    </span>
                )}
                <button
                    className="sim-progress-cancel"
                    onClick={onCancel}
                    title="Cancel simulation"
                >
                    <X size={14} />
                    Cancel
                </button>
            </div>
        </div>
    );
}
