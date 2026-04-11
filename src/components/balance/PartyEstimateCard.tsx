/**
 * PartyEstimateCard Component (Task 2.1)
 *
 * Compact inline card displaying pre-simulation party estimates.
 * Shows party stats (level, AC, HP, DPR, strength) as horizontal pills
 * and XP budgets per difficulty tier, color-coded against encounter XP.
 *
 * Rendered below PartySelector inside SimulationConfigPanel.
 */

import type { PartyAnalysis } from 'playlist-data-engine';
import { Swords, Shield, Heart, Crosshair, Zap, Wrench } from 'lucide-react';
import './PartyEstimateCard.css';

export interface PartyEstimateCardProps {
    /** Party analysis data from PartyAnalyzer.analyzeParty() */
    analysis: PartyAnalysis | null;
    /** Whether analysis is still computing */
    isLoading: boolean;
    /** Encounter adjusted XP for color-coding XP budgets (optional) */
    encounterXP?: number;
    /** Enemy-aware DPR estimate (damage per hit × hit rate vs enemy AC). Overrides averageDamage if provided. */
    estimatedDPR?: number;
    /** Primary weapon name(s) used by the party */
    weaponName?: string;
}

/**
 * Determine XP budget color class based on encounter XP vs threshold.
 *   green  — encounter XP < 80% of threshold (comfortable)
 *   yellow — encounter XP is 80-100% of threshold (near)
 *   red    — encounter XP >= threshold (exceeded)
 */
function xpBudgetColor(encounterXP: number, threshold: number): string {
    if (threshold <= 0) return '';
    const ratio = encounterXP / threshold;
    if (ratio >= 1) return 'pec-xp-exceeded';
    if (ratio >= 0.8) return 'pec-xp-near';
    return 'pec-xp-clear';
}

/**
 * Loading skeleton for PartyEstimateCard.
 * Matches shimmer animation from BalanceLabSkeleton.
 */
function Skeleton() {
    return (
        <div className="pec-card pec-card-loading" aria-hidden="true">
            <div className="pec-header">
                <div className="pec-shimmer pec-skeleton-title" />
            </div>
            <div className="pec-stats-row">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="pec-shimmer pec-skeleton-pill" />
                ))}
            </div>
            <div className="pec-xp-row">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="pec-shimmer pec-skeleton-xp" />
                ))}
            </div>
        </div>
    );
}

/**
 * Compact party estimate card with stat pills and XP budgets.
 */
export function PartyEstimateCard({
    analysis,
    isLoading,
    encounterXP,
    estimatedDPR,
    weaponName,
}: PartyEstimateCardProps) {
    if (isLoading) {
        return <Skeleton />;
    }

    if (!analysis) {
        return null;
    }

    const hasEncounterXP = encounterXP !== undefined && encounterXP > 0;

    return (
        <div className="pec-card">
            {/* Header */}
            <div className="pec-header">
                <span className="pec-title">Party Estimate</span>
                <span className="pec-party-size">
                    {analysis.partySize} {analysis.partySize === 1 ? 'hero' : 'heroes'}
                </span>
            </div>

            {/* Stat Pills */}
            <div className="pec-stats-row">
                <div className="pec-pill" data-tooltip="Average character level">
                    <Swords size={11} />
                    <span className="pec-pill-label">Lv</span>
                    <span className="pec-pill-value">{analysis.averageLevel.toFixed(1)}</span>
                </div>
                <div className="pec-pill" data-tooltip="Average Armor Class — harder to hit = higher AC">
                    <Shield size={11} />
                    <span className="pec-pill-label">AC</span>
                    <span className="pec-pill-value">{analysis.averageAC.toFixed(1)}</span>
                </div>
                <div className="pec-pill" data-tooltip="Average Hit Points — total health before falling unconscious">
                    <Heart size={11} />
                    <span className="pec-pill-label">HP</span>
                    <span className="pec-pill-value">{Math.round(analysis.averageHP)}</span>
                </div>
                <div className="pec-pill" data-tooltip="Damage Per Round — estimated average damage output per party member per round">
                    <Crosshair size={11} />
                    <span className="pec-pill-label">DPR</span>
                    <span className="pec-pill-value">~{(estimatedDPR ?? analysis.averageDamage).toFixed(1)}</span>
                </div>
                <div className="pec-pill" data-tooltip="Total Party Strength — composite power score based on level, stats, and equipment">
                    <Zap size={11} />
                    <span className="pec-pill-label">Str</span>
                    <span className="pec-pill-value">{analysis.totalStrength.toLocaleString()}</span>
                </div>
                {weaponName && (
                    <div className="pec-pill" data-tooltip="Primary weapon(s) used by the party">
                        <Wrench size={11} />
                        <span className="pec-pill-label">Weapon</span>
                        <span className="pec-pill-value">{weaponName}</span>
                    </div>
                )}
            </div>

            {/* XP Budgets */}
            <div className="pec-xp-row">
                <span className="pec-xp-label">XP Budgets:</span>
                <div
                    className={`pec-xp-budget ${hasEncounterXP ? xpBudgetColor(encounterXP, analysis.easyXP) : ''}`}
                    title={hasEncounterXP ? `Encounter XP: ${encounterXP.toLocaleString()}` : undefined}
                >
                    <span className="pec-xp-tier">Easy</span>
                    <span className="pec-xp-value">{analysis.easyXP.toLocaleString()}</span>
                </div>
                <div
                    className={`pec-xp-budget ${hasEncounterXP ? xpBudgetColor(encounterXP, analysis.mediumXP) : ''}`}
                    title={hasEncounterXP ? `Encounter XP: ${encounterXP.toLocaleString()}` : undefined}
                >
                    <span className="pec-xp-tier">Medium</span>
                    <span className="pec-xp-value">{analysis.mediumXP.toLocaleString()}</span>
                </div>
                <div
                    className={`pec-xp-budget ${hasEncounterXP ? xpBudgetColor(encounterXP, analysis.hardXP) : ''}`}
                    title={hasEncounterXP ? `Encounter XP: ${encounterXP.toLocaleString()}` : undefined}
                >
                    <span className="pec-xp-tier">Hard</span>
                    <span className="pec-xp-value">{analysis.hardXP.toLocaleString()}</span>
                </div>
                <div
                    className={`pec-xp-budget ${hasEncounterXP ? xpBudgetColor(encounterXP, analysis.deadlyXP) : ''}`}
                    title={hasEncounterXP ? `Encounter XP: ${encounterXP.toLocaleString()}` : undefined}
                >
                    <span className="pec-xp-tier">Deadly</span>
                    <span className="pec-xp-value">{analysis.deadlyXP.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

export default PartyEstimateCard;
