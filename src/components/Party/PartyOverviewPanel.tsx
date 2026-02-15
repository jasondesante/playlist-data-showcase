/**
 * PartyOverviewPanel Component
 *
 * Displays aggregated party statistics using PartyAnalysis data.
 * Shows quick stat cards and XP budget information for encounter planning.
 *
 * Part of Phase 2: Party Overview Panel Component
 */

import { Users, Shield, Heart, Zap, Crosshair } from 'lucide-react';
import { PartyAnalysis } from 'playlist-data-engine';
import { Tooltip } from '../ui/Tooltip';
import './PartyOverviewPanel.css';

export interface PartyOverviewPanelProps {
  /** Party analysis result from usePartyAnalysis hook */
  analysis: PartyAnalysis | null;
  /** Number of heroes currently selected for analysis */
  selectedCount: number;
  /** Total number of heroes in the party */
  totalCount: number;
}

/**
 * Format a number for display (adds commas for thousands)
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Stat card configuration
 */
interface StatCardConfig {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  tooltip?: string;
}

/**
 * Individual stat card component
 */
function StatCard({ label, value, subtitle, icon, tooltip }: StatCardConfig) {
  return (
    <div className="party-stat-card">
      <div className="party-stat-card-icon">{icon}</div>
      <div className="party-stat-card-content">
        <div className="party-stat-card-label">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <div className="party-stat-card-value">{value}</div>
        {subtitle && <div className="party-stat-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

/**
 * XP budget card for displaying encounter difficulty thresholds
 */
interface XPBudgetCardProps {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Deadly';
  xp: number;
  colorClass: string;
}

function XPBudgetCard({ difficulty, xp, colorClass }: XPBudgetCardProps) {
  return (
    <div className={`party-xp-card party-xp-card-${colorClass}`}>
      <div className="party-xp-card-difficulty">{difficulty}</div>
      <div className="party-xp-card-value">{formatNumber(xp)} XP</div>
    </div>
  );
}

/**
 * Empty state when no heroes are selected
 */
function EmptyState() {
  return (
    <div className="party-overview-empty">
      <div className="party-overview-empty-icon">👥</div>
      <h3 className="party-overview-empty-title">No Heroes Selected</h3>
      <div className="party-overview-empty-text">
        Select heroes from the party below to see analysis.
      </div>
    </div>
  );
}

/**
 * Main PartyOverviewPanel component
 */
export function PartyOverviewPanel({
  analysis,
  selectedCount,
  totalCount
}: PartyOverviewPanelProps) {
  // Show empty state when no heroes are selected
  if (!analysis || selectedCount === 0) {
    return (
      <div className="party-overview-panel party-overview-panel-empty">
        <EmptyState />
      </div>
    );
  }

  // Build stat cards configuration
  const statCards: StatCardConfig[] = [
    {
      label: 'Average Level',
      value: analysis.averageLevel.toFixed(1),
      subtitle: `${analysis.partySize} ${analysis.partySize === 1 ? 'hero' : 'heroes'}`,
      icon: <Users size={20} />,
      tooltip: 'The average level of all selected party members. Used for calculating encounter difficulty thresholds.'
    },
    {
      label: 'Average AC',
      value: analysis.averageAC.toFixed(1),
      icon: <Shield size={20} />,
      tooltip: 'Average Armor Class of the party. Higher AC means the party is harder to hit in combat.'
    },
    {
      label: 'Average HP',
      value: Math.round(analysis.averageHP),
      icon: <Heart size={20} />,
      tooltip: 'Average Hit Points per party member. Indicates overall durability of the party.'
    },
    {
      label: 'Total Strength',
      value: formatNumber(analysis.totalStrength),
      icon: <Zap size={20} />,
      tooltip: 'An abstract power score calculated from party level, HP, AC, and damage output. Higher values indicate a stronger party.'
    },
    {
      label: 'Est. Damage',
      value: analysis.averageDamage.toFixed(1),
      icon: <Crosshair size={20} />,
      tooltip: 'Estimated average damage output per round for the party. Based on character classes and levels.'
    }
  ];

  return (
    <div className="party-overview-panel">
      {/* Stats Grid */}
      <div className="party-stats-grid">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* XP Budget Section */}
      <div className="party-xp-section">
        <h4 className="party-xp-section-title">
          Encounter Thresholds
          <Tooltip content="XP thresholds indicate how much monster XP the party can handle for each difficulty level. For a balanced encounter, the total monster XP should match the party's threshold for the desired difficulty." />
          <span className="party-xp-section-subtitle">
            Based on {selectedCount} of {totalCount} {totalCount === 1 ? 'hero' : 'heroes'}
          </span>
        </h4>
        <div className="party-xp-grid">
          <XPBudgetCard difficulty="Easy" xp={analysis.easyXP} colorClass="easy" />
          <XPBudgetCard difficulty="Medium" xp={analysis.mediumXP} colorClass="medium" />
          <XPBudgetCard difficulty="Hard" xp={analysis.hardXP} colorClass="hard" />
          <XPBudgetCard difficulty="Deadly" xp={analysis.deadlyXP} colorClass="deadly" />
        </div>
      </div>
    </div>
  );
}

export default PartyOverviewPanel;
