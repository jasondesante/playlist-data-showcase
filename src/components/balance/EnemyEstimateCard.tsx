/**
 * EnemyEstimateCard Component (Task 2.2)
 *
 * Compact inline card displaying pre-simulation enemy estimates.
 * Shows per-enemy stats (HP, AC, DPR, CR, XP) as horizontal pills
 * with min/avg/max ranges across generated samples, and total adjusted
 * XP with encounter multiplier info.
 *
 * Rendered below EncounterConfigForm inside SimulationConfigPanel.
 */

import type { SimulationEstimateSnapshot } from '@/types/simulation';
import { getXPForCR, getEncounterMultiplier } from 'playlist-data-engine';
import { Heart, Shield, Crosshair, Star, Skull, TrendingUp, AlertCircle, Swords } from 'lucide-react';
import { formatRange } from '@/utils/estimateEnemyDPR';
import { PillTooltip } from './PillTooltip';
import './EnemyEstimateCard.css';

const SAMPLE_OPTIONS = [10, 100, 1000] as const;

export interface EnemyEstimateCardProps {
    /** Enemy portion of the estimate snapshot (null if preview failed) */
    snapshot: SimulationEstimateSnapshot['enemy'] | null;
    /** Whether estimate is still computing */
    isLoading: boolean;
    /** Current sample count */
    selectedSampleCount: number;
    /** Callback to change sample count */
    onSampleCountChange: (count: number) => void;
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
 * Compact enemy estimate card with stat pills (showing ranges) and adjusted XP display.
 */
export function EnemyEstimateCard({
    snapshot,
    isLoading,
    selectedSampleCount,
    onSampleCountChange,
}: EnemyEstimateCardProps) {
    if (isLoading) {
        return <Skeleton />;
    }

    // No snapshot means enemy preview failed — show a message instead of hiding
    if (!snapshot) {
        return (
            <div className="eec-card eec-card-unavailable">
                <div className="eec-header">
                    <span className="eec-title">Enemy Estimate</span>
                </div>
                <div className="eec-unavailable">
                    <AlertCircle size={13} className="eec-unavailable-icon" />
                    <span className="eec-unavailable-text">Unable to preview enemy</span>
                </div>
            </div>
        );
    }

    const { count, perEnemyHP, perEnemyAC, perEnemyEstDPR, totalAdjustedXP, enemyCR, archetype, rarity, sampleCount } = snapshot;

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
                <select
                    className="eec-sample-select"
                    value={selectedSampleCount}
                    onChange={(e) => onSampleCountChange(Number(e.target.value))}
                    title="Number of enemy generations to sample for stat ranges"
                >
                    {SAMPLE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n} samples</option>
                    ))}
                </select>
            </div>

            {/* Stat Pills */}
            <div className="eec-stats-row">
                <PillTooltip tooltip="Hit Points per enemy — min / avg / max across generated samples">
                    <div className="eec-pill">
                        <Heart size={11} />
                        <span className="eec-pill-label">HP</span>
                        <span className="eec-pill-value">{formatRange(perEnemyHP)}</span>
                    </div>
                </PillTooltip>
                <PillTooltip tooltip="Armor Class per enemy — min / avg / max across generated samples">
                    <div className="eec-pill">
                        <Shield size={11} />
                        <span className="eec-pill-label">AC</span>
                        <span className="eec-pill-value">{formatRange(perEnemyAC)}</span>
                    </div>
                </PillTooltip>
                <PillTooltip tooltip="Damage Per Round — estimated min / avg / max across generated samples">
                    <div className="eec-pill">
                        <Crosshair size={11} />
                        <span className="eec-pill-label">DPR</span>
                        <span className="eec-pill-value">~{formatRange(perEnemyEstDPR, 1)}</span>
                    </div>
                </PillTooltip>
                <PillTooltip tooltip="Challenge Rating — D&D 5e measure of enemy power (1 = 1st-level party, scales with level)">
                    <div className="eec-pill">
                        <Star size={11} />
                        <span className="eec-pill-label">CR</span>
                        <span className="eec-pill-value">{enemyCR}</span>
                    </div>
                </PillTooltip>
                <PillTooltip tooltip={`Experience Points — XP awarded per CR ${enemyCR} enemy on defeat`}>
                    <div className="eec-pill">
                        <Skull size={11} />
                        <span className="eec-pill-label">XP</span>
                        <span className="eec-pill-value">{xpPerEnemy.toLocaleString()}</span>
                    </div>
                </PillTooltip>
                {snapshot.weaponNames && snapshot.weaponNames.length > 0 && (
                    <PillTooltip tooltip={`Equipped weapon(s): ${snapshot.weaponNames.join(', ')}`}>
                        <div className="eec-pill">
                            <Swords size={11} />
                            <span className="eec-pill-label">Weapon</span>
                            <span className="eec-pill-value">{snapshot.weaponNames.join(', ')}</span>
                        </div>
                    </PillTooltip>
                )}
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
