/**
 * BalanceLabSkeleton Component
 *
 * Loading skeleton for the Balance Lab tab results area.
 * Shown during simulation execution to preview the dashboard layout,
 * and during initial store hydration.
 *
 * Matches existing skeleton patterns from PartyAnalyzerCard — uses
 * inline shimmer animation with hsl(var(--muted)) gradients.
 */

import './BalanceLabSkeleton.css';

/**
 * Skeleton for the results dashboard area (shown while simulation is running).
 * Mimics the BalanceDashboard layout: win rate card, metrics grid, chart areas.
 */
export function ResultsDashboardSkeleton() {
    return (
        <div className="bls-dashboard-skeleton" aria-hidden="true">
            {/* Win Rate Card */}
            <div className="bls-win-rate-skeleton">
                <div className="bls-shimmer bls-win-rate-value" />
                <div className="bls-shimmer bls-win-rate-label" />
            </div>

            {/* Metrics Grid (3 columns) */}
            <div className="bls-metrics-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bls-metric-skeleton">
                        <div className="bls-shimmer bls-metric-icon" />
                        <div className="bls-shimmer bls-metric-value" />
                        <div className="bls-shimmer bls-metric-label" />
                    </div>
                ))}
            </div>

            {/* Chart Area — Full Width */}
            <div className="bls-chart-skeleton bls-chart-full">
                <div className="bls-chart-skeleton-header">
                    <div className="bls-shimmer bls-chart-title" />
                    <div className="bls-shimmer bls-chart-subtitle" />
                </div>
                <div className="bls-shimmer bls-chart-area" />
            </div>

            {/* Chart Grid — Two Columns */}
            <div className="bls-chart-grid">
                <div className="bls-chart-skeleton">
                    <div className="bls-chart-skeleton-header">
                        <div className="bls-shimmer bls-chart-title" />
                    </div>
                    <div className="bls-shimmer bls-chart-area bls-chart-area-sm" />
                </div>
                <div className="bls-chart-skeleton">
                    <div className="bls-chart-skeleton-header">
                        <div className="bls-shimmer bls-chart-title" />
                    </div>
                    <div className="bls-shimmer bls-chart-area bls-chart-area-sm" />
                </div>
            </div>

            {/* Second Row Charts */}
            <div className="bls-chart-grid">
                <div className="bls-chart-skeleton">
                    <div className="bls-chart-skeleton-header">
                        <div className="bls-shimmer bls-chart-title" />
                    </div>
                    <div className="bls-shimmer bls-chart-area bls-chart-area-sm" />
                </div>
                <div className="bls-chart-skeleton">
                    <div className="bls-chart-skeleton-header">
                        <div className="bls-shimmer bls-chart-title" />
                    </div>
                    <div className="bls-shimmer bls-chart-area bls-chart-area-sm" />
                </div>
            </div>

            {/* Full Width Chart */}
            <div className="bls-chart-skeleton bls-chart-full">
                <div className="bls-chart-skeleton-header">
                    <div className="bls-shimmer bls-chart-title" />
                    <div className="bls-shimmer bls-chart-subtitle" />
                </div>
                <div className="bls-shimmer bls-chart-area" />
            </div>
        </div>
    );
}

/**
 * Skeleton for the history panel list items.
 * Shown when the store is hydrating or loading saved simulations.
 */
export function SimulationHistorySkeleton() {
    return (
        <div className="bls-history-skeleton" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bls-history-item-skeleton">
                    <div className="bls-shimmer bls-history-badge" />
                    <div className="bls-history-item-info">
                        <div className="bls-shimmer bls-history-title" />
                        <div className="bls-shimmer bls-history-meta" />
                    </div>
                    <div className="bls-shimmer bls-history-action" />
                </div>
            ))}
        </div>
    );
}

export default { ResultsDashboardSkeleton, SimulationHistorySkeleton };
