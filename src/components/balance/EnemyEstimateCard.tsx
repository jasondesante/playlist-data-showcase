/**
 * EnemyEstimateCard Component (Task 2.2)
 *
 * Compact inline card displaying pre-simulation enemy estimates.
 * Shows per-enemy stats (HP, AC, DPR, CR, XP) as horizontal pills
 * and total adjusted XP with encounter multiplier info.
 *
 * Rendered below EncounterConfigForm inside SimulationConfigPanel.
 */

import type { SimulationEstimateSnapshot } from '@/types/simulation';
import { getXPForCR, getEncounterMultiplier } from 'playlist-data-engine';
import { Heart, Shield, Crosshair, Star, Skull, TrendingUp } from 'lucide-react';
import './EnemyEstimateCard.css';

export interface EnemyEstimateCardProps {
    /** Enemy portion of the estimate snapshot (null if preview failed) */
    snapshot: SimulationEstimateSnapshot['enemy'] | null;
    /** Whether estimate is still computing */
    isLoading: boolean;
}

/**
 * Loading skeleton for EnemyEstimateCard.
 * Matches shimmer animation from BalanceLabSkeleton / PartyEstimateCard.
 */
function Skeleton() {
    return (
        <div className="eec-card eec-card-loading" aria-hidden="true">
            <div className="eec-header">
                <div className="eec-shimmer eec-skeleton-title" />
            </div>
            <div className="eec-stats-row">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="eec-shimmer eec-skeleton-pill" />
                ))}
            </div>
            <div className="eec-adjusted-row">
                <div className="eec-shimmer eec-skeleton-adjusted" />
            </div>
        </div>
    );
}

/**
 * Compact enemy estimate card with stat pills and adjusted XP display.
 */
export function EnemyEstimateCard({
    snapshot,
    isLoading,
}: EnemyEstimateCardProps) {
    if (isLoading) {
        return <Skeleton />;
    }

    // No snapshot means enemy preview failed
    if (!snapshot) {
        return null;
    }

    const { count, perEnemyHP, perEnemyAC, perEnemyEstDPR, totalAdjustedXP, enemyCR, archetype, rarity } = snapshot;

    const multiplier = getEncounterMultiplier(count);
    const xpPerEnemy = getXPForCR(enemyCR);
    const rawTotal = xpPerEnemy * count;

    return (
        <div className="eec-card">
            {/* Header */}
            <div className="eec-header">
                <span className="eec-title">Enemy Estimate</span>
                {count > 1 && (
                    <span className="eec-count" title={`${count} enemies`}>
                        &times;{count}
                    </span>
                )}
                <span className="eec-meta">
                    {rarity} {archetype}
                </span>
            </div>

            {/* Stat Pills */}
            <div className="eec-stats-row">
                <div className="eec-pill" title="Hit Points per enemy">
                    <Heart size={11} />
                    <span className="eec-pill-label">HP</span>
                    <span className="eec-pill-value">{Math.round(perEnemyHP)}</span>
                </div>
                <div className="eec-pill" title="Armor Class per enemy">
                    <Shield size={11} />
                    <span className="eec-pill-label">AC</span>
                    <span className="eec-pill-value">{perEnemyAC}</span>
                </div>
                <div className="eec-pill" title="Estimated Damage Per Round per enemy">
                    <Crosshair size={11} />
                    <span className="eec-pill-label">DPR</span>
                    <span className="eec-pill-value">~{perEnemyEstDPR.toFixed(1)}</span>
                </div>
                <div className="eec-pill" title="Challenge Rating">
                    <Star size={11} />
                    <span className="eec-pill-label">CR</span>
                    <span className="eec-pill-value">{enemyCR}</span>
                </div>
                <div className="eec-pill" title={`XP per CR ${enemyCR} enemy`}>
                    <Skull size={11} />
                    <span className="eec-pill-label">XP</span>
                    <span className="eec-pill-value">{xpPerEnemy.toLocaleString()}</span>
                </div>
            </div>

            {/* Adjusted XP */}
            <div className="eec-adjusted-row">
                <div className="eec-adjusted-main" title={`Raw: ${rawTotal.toLocaleString()} XP \u00d7 ${multiplier.toFixed(1)} multiplier = ${totalAdjustedXP.toLocaleString()}`}>
                    <TrendingUp size={11} className="eec-adjusted-icon" />
                    <span className="eec-adjusted-label">Adjusted XP:</span>
                    <span className="eec-adjusted-value">{totalAdjustedXP.toLocaleString()}</span>
                </div>
                <span className="eec-multiplier-hint">
                    &times;{multiplier.toFixed(1)} multiplier for {count} {count === 1 ? 'enemy' : 'enemies'}
                </span>
            </div>
        </div>
    );
}

export default EnemyEstimateCard;
