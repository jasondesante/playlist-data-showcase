/**
 * PartyAnalyzerCard Component
 *
 * A compact card displaying party analysis for the combat simulator.
 * Shows party statistics, XP budget by difficulty, and class composition.
 *
 * Part of Phase 7.2: Party Analyzer Display
 */

import { useMemo } from 'react';
import { CharacterSheet, PartyAnalyzer, PartyAnalysis } from 'playlist-data-engine';
import { Users, Shield, Heart, Zap, Crosshair } from 'lucide-react';
import { CombatExportButton, type ExportAction } from '../ui/CombatExportButton';
import './PartyAnalyzerCard.css';

export interface PartyAnalyzerCardProps {
  /** All selected party members */
  partyMembers: CharacterSheet[];
  /** Show loading state */
  isLoading?: boolean;
  /** Compact mode - shows only essential stats */
  compact?: boolean;
  /** Optional export handler - receives action type, returns success */
  onExport?: (action: ExportAction) => Promise<boolean> | boolean;
}

/**
 * Difficulty color mapping
 */
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'difficulty-easy',
  medium: 'difficulty-medium',
  hard: 'difficulty-hard',
  deadly: 'difficulty-deadly'
};

/**
 * Class icons for composition display
 */
const CLASS_ICONS: Record<string, string> = {
  'Barbarian': '🪓',
  'Bard': '🎵',
  'Cleric': '✝️',
  'Druid': '🌿',
  'Fighter': '⚔️',
  'Monk': '👊',
  'Paladin': '🛡️',
  'Ranger': '🏹',
  'Rogue': '🗡️',
  'Sorcerer': '✨',
  'Warlock': '👁️',
  'Wizard': '🧙'
};

/**
 * Stat item component
 */
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}

function StatItem({ icon, label, value, subtitle }: StatItemProps) {
  return (
    <div className="party-analyzer-stat">
      <div className="party-analyzer-stat-icon">{icon}</div>
      <div className="party-analyzer-stat-content">
        <div className="party-analyzer-stat-label">{label}</div>
        <div className="party-analyzer-stat-value">{value}</div>
        {subtitle && <div className="party-analyzer-stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

/**
 * XP card component
 */
interface XPCardProps {
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Deadly';
  xp: number;
}

function XPCard({ difficulty, xp }: XPCardProps) {
  return (
    <div className={`party-analyzer-xp-card ${DIFFICULTY_COLORS[difficulty.toLowerCase()]}`}>
      <div className="party-analyzer-xp-difficulty">{difficulty}</div>
      <div className="party-analyzer-xp-value">{xp.toLocaleString()} XP</div>
    </div>
  );
}

/**
 * Class badge component
 */
function ClassBadge({ className, count }: { className: string; count: number }) {
  return (
    <div className="party-analyzer-class-badge">
      <span className="party-analyzer-class-icon">{CLASS_ICONS[className] || '⚔️'}</span>
      <span className="party-analyzer-class-name">{className}</span>
      {count > 1 && <span className="party-analyzer-class-count">×{count}</span>}
    </div>
  );
}

/**
 * Skeleton loading state
 */
function SkeletonLoader() {
  return (
    <div className="party-analyzer-card party-analyzer-card-loading">
      <div className="party-analyzer-header">
        <div className="party-analyzer-skeleton-title" />
      </div>
      <div className="party-analyzer-stats-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="party-analyzer-stat-skeleton">
            <div className="party-analyzer-skeleton-icon" />
            <div className="party-analyzer-skeleton-content">
              <div className="party-analyzer-skeleton-label" />
              <div className="party-analyzer-skeleton-value" />
            </div>
          </div>
        ))}
      </div>
      <div className="party-analyzer-xp-section-skeleton">
        <div className="party-analyzer-skeleton-section-title" />
        <div className="party-analyzer-xp-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="party-analyzer-xp-skeleton" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state when no party members selected
 */
function EmptyState() {
  return (
    <div className="party-analyzer-card party-analyzer-card-empty">
      <div className="party-analyzer-empty-icon">👥</div>
      <div className="party-analyzer-empty-title">No Party Members</div>
      <div className="party-analyzer-empty-text">
        Select party members above to see analysis
      </div>
    </div>
  );
}

/**
 * Calculate class composition from party members
 */
function calculateClassComposition(members: CharacterSheet[]): Map<string, number> {
  const classCounts = new Map<string, number>();
  members.forEach(member => {
    const count = classCounts.get(member.class) || 0;
    classCounts.set(member.class, count + 1);
  });
  return classCounts;
}

/**
 * Main PartyAnalyzerCard component
 */
export function PartyAnalyzerCard({
  partyMembers,
  isLoading = false,
  compact = false,
  onExport
}: PartyAnalyzerCardProps) {
  // Calculate party analysis using PartyAnalyzer
  const analysis = useMemo((): PartyAnalysis | null => {
    if (partyMembers.length === 0) return null;
    try {
      return PartyAnalyzer.analyzeParty(partyMembers);
    } catch (error) {
      console.error('[PartyAnalyzerCard] Failed to analyze party:', error);
      return null;
    }
  }, [partyMembers]);

  // Calculate class composition
  const classComposition = useMemo(() => {
    if (partyMembers.length === 0) return null;
    return calculateClassComposition(partyMembers);
  }, [partyMembers]);

  // Show loading skeleton
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Show empty state
  if (!analysis || partyMembers.length === 0) {
    return <EmptyState />;
  }

  // Format numbers for display
  const formatNumber = (n: number): string => n.toLocaleString();

  return (
    <div className="party-analyzer-card party-analyzer-card-loaded">
      {/* Header */}
      <div className="party-analyzer-header">
        <div className="party-analyzer-title">
          <Users size={16} />
          <span>Party Analysis</span>
        </div>
        <div className="party-analyzer-header-actions">
          {onExport && (
            <CombatExportButton
              onExport={onExport}
              size="icon"
              variant="toggle"
              label="Party Data"
              tooltip="Export party analysis"
            />
          )}
          <div className="party-analyzer-party-size">
            {analysis.partySize} {analysis.partySize === 1 ? 'hero' : 'heroes'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="party-analyzer-stats-grid">
        <StatItem
          icon={<Users size={14} />}
          label="Avg Level"
          value={analysis.averageLevel.toFixed(1)}
        />
        <StatItem
          icon={<Shield size={14} />}
          label="Avg AC"
          value={analysis.averageAC.toFixed(1)}
        />
        <StatItem
          icon={<Heart size={14} />}
          label="Avg HP"
          value={Math.round(analysis.averageHP)}
        />
        <StatItem
          icon={<Zap size={14} />}
          label="Strength"
          value={formatNumber(analysis.totalStrength)}
        />
        <StatItem
          icon={<Crosshair size={14} />}
          label="Est. Damage"
          value={analysis.averageDamage.toFixed(1)}
        />
      </div>

      {/* XP Budget Section - Hidden in compact mode */}
      {!compact && (
        <div className="party-analyzer-xp-section">
          <div className="party-analyzer-xp-title">
            Encounter Thresholds
          </div>
          <div className="party-analyzer-xp-grid">
            <XPCard difficulty="Easy" xp={analysis.easyXP} />
            <XPCard difficulty="Medium" xp={analysis.mediumXP} />
            <XPCard difficulty="Hard" xp={analysis.hardXP} />
            <XPCard difficulty="Deadly" xp={analysis.deadlyXP} />
          </div>
        </div>
      )}

      {/* Class Composition - Hidden in compact mode */}
      {!compact && classComposition && (
        <div className="party-analyzer-composition-section">
          <div className="party-analyzer-composition-title">
            Class Composition
          </div>
          <div className="party-analyzer-class-badges">
            {Array.from(classComposition.entries()).map(([className, count]) => (
              <ClassBadge key={className} className={className} count={count} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PartyAnalyzerCard;
