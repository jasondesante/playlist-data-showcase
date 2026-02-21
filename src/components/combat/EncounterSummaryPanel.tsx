/**
 * EncounterSummaryPanel Component
 *
 * Displays a summary of the encounter before combat starts.
 * Shows total enemies by type, total encounter XP, difficulty rating vs party,
 * and estimated challenge.
 *
 * Part of Phase 8.4: Encounter Summary Panel
 */

import { useMemo } from 'react';
import { CharacterSheet, getXPForCR, getEncounterMultiplier, calculateAdjustedXP, getXPBudgetPerLevel } from 'playlist-data-engine';
import { Swords, Users, Skull, Star, AlertTriangle } from 'lucide-react';
import { CombatExportButton, type ExportAction } from '../ui/CombatExportButton';
import './EncounterSummaryPanel.css';

export interface EncounterSummaryPanelProps {
  /** Generated enemies for the encounter */
  enemies: CharacterSheet[];
  /** Party members (for difficulty comparison) */
  partyMembers: CharacterSheet[];
  /** Show compact version */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Optional export handler - receives action type, returns success */
  onExport?: (action: ExportAction) => Promise<boolean> | boolean;
}

/**
 * Enemy type breakdown interface
 */
interface EnemyTypeBreakdown {
  categoryName: string;
  categoryIcon: string;
  count: number;
  enemies: Array<{
    name: string;
    level: number;
    rarity: string;
  }>;
}

/**
 * Difficulty rating type
 */
type DifficultyRating = 'trivial' | 'easy' | 'medium' | 'hard' | 'deadly' | 'impossible';

/**
 * Category icons and labels
 */
const CATEGORY_INFO: Record<string, { label: string; icon: string }> = {
  humanoid: { label: 'Humanoid', icon: '👤' },
  beast: { label: 'Beast', icon: '🐾' },
  undead: { label: 'Undead', icon: '💀' },
  fiend: { label: 'Fiend', icon: '😈' },
  elemental: { label: 'Elemental', icon: '🔥' },
  construct: { label: 'Construct', icon: '🤖' },
  dragon: { label: 'Dragon', icon: '🐉' },
  monstrosity: { label: 'Monstrosity', icon: '👹' },
};

/**
 * Difficulty colors and icons
 */
const DIFFICULTY_STYLES: Record<DifficultyRating, { color: string; icon: string; bgColor: string }> = {
  trivial: { color: 'hsl(210 10% 50%)', icon: '○', bgColor: 'hsl(210 10% 50% / 0.1)' },
  easy: { color: 'hsl(142 70% 45%)', icon: '✓', bgColor: 'hsl(142 70% 45% / 0.1)' },
  medium: { color: 'hsl(48 96% 53%)', icon: '⚡', bgColor: 'hsl(48 96% 53% / 0.1)' },
  hard: { color: 'hsl(24 95% 53%)', icon: '⚠️', bgColor: 'hsl(24 95% 53% / 0.1)' },
  deadly: { color: 'hsl(0 84% 60%)', icon: '💀', bgColor: 'hsl(0 84% 60% / 0.1)' },
  impossible: { color: 'hsl(280 70% 50%)', icon: '☠️', bgColor: 'hsl(280 70% 50% / 0.1)' }
};

/**
 * Extract category from enemy name (since CharacterSheet doesn't have category)
 * This is a best-effort mapping based on common enemy names
 */
function inferEnemyCategory(enemy: CharacterSheet): string {
  const name = enemy.name.toLowerCase();

  // Check for dragon types
  if (name.includes('dragon') || name.includes('drake') || name.includes('wyrmling')) {
    return 'dragon';
  }

  // Check for undead types
  if (name.includes('skeleton') || name.includes('zombie') || name.includes('ghost') ||
      name.includes('wight') || name.includes('wraith') || name.includes('vampire') ||
      name.includes('lich') || name.includes('mummy')) {
    return 'undead';
  }

  // Check for fiend types
  if (name.includes('demon') || name.includes('devil') || name.includes('imp') ||
      name.includes('lemure') || name.includes('quasit') || name.includes('succubus')) {
    return 'fiend';
  }

  // Check for elemental types
  if (name.includes('elemental') || name.includes('golem') || name.includes('construct')) {
    return 'elemental';
  }

  // Check for beast types
  if (name.includes('bear') || name.includes('wolf') || name.includes('boar') ||
      name.includes('spider') || name.includes('owlbear') || name.includes('stirge') ||
      name.includes('griffin') || name.includes('basilisk') || name.includes('mimic')) {
    return 'beast';
  }

  // Check for construct types
  if (name.includes('armor') || name.includes('sword') || name.includes('guardian') ||
      name.includes('golem') || name.includes('shield guardian')) {
    return 'construct';
  }

  // Check for monstrosity types
  if (name.includes('owlbear') || name.includes('mimic') || name.includes('basilisk') ||
      name.includes('griffin') || name.includes('hydra') || name.includes('chimera')) {
    return 'monstrosity';
  }

  // Default to humanoid for orcs, goblins, bandits, etc.
  return 'humanoid';
}

/**
 * Infer rarity from enemy name prefix
 */
function inferEnemyRarity(enemy: CharacterSheet): string {
  const name = enemy.name;

  if (name.includes('Warlord') || name.includes('Overlord') || name.includes('Ancient') ||
      name.includes('Elder') || name.includes('Grand ') || name.includes('Chieftain')) {
    return 'boss';
  }

  if (name.includes('Elite') || name.includes('Veteran') || name.includes('Champion') ||
      name.includes('Alpha') || name.includes('Greater')) {
    return 'elite';
  }

  if (name.includes('Improved') || name.includes('Enhanced') || name.includes('Tough')) {
    return 'uncommon';
  }

  return 'common';
}

/**
 * Stat item component
 */
interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

function StatItem({ icon, label, value, subtitle, color }: StatItemProps) {
  return (
    <div className="encounter-summary-stat">
      <div className="encounter-summary-stat-icon" style={color ? { color } : undefined}>
        {icon}
      </div>
      <div className="encounter-summary-stat-content">
        <div className="encounter-summary-stat-label">{label}</div>
        <div className="encounter-summary-stat-value" style={color ? { color } : undefined}>
          {value}
        </div>
        {subtitle && <div className="encounter-summary-stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

/**
 * Enemy type badge component
 */
function EnemyTypeBadge({ breakdown }: { breakdown: EnemyTypeBreakdown }) {
  return (
    <div className="encounter-summary-type-badge">
      <span className="encounter-summary-type-icon">{breakdown.categoryIcon}</span>
      <span className="encounter-summary-type-name">{breakdown.categoryName}</span>
      <span className="encounter-summary-type-count">×{breakdown.count}</span>
    </div>
  );
}

/**
 * Calculate difficulty rating based on XP and party thresholds
 */
function calculateDifficultyRating(
  totalAdjustedXP: number,
  partyMembers: CharacterSheet[]
): { rating: DifficultyRating; thresholds: Record<string, number> } {
  // Default thresholds for level 1 if no party
  const avgLevel = partyMembers.length > 0
    ? Math.round(partyMembers.reduce((sum, m) => sum + m.level, 0) / partyMembers.length)
    : 1;

  // Calculate thresholds based on party size and average level
  const thresholds = {
    easy: getXPBudgetPerLevel(avgLevel, 'easy'),
    medium: getXPBudgetPerLevel(avgLevel, 'medium'),
    hard: getXPBudgetPerLevel(avgLevel, 'hard'),
    deadly: getXPBudgetPerLevel(avgLevel, 'deadly')
  };

  let rating: DifficultyRating = 'trivial';

  if (totalAdjustedXP >= thresholds.deadly * 2) {
    rating = 'impossible';
  } else if (totalAdjustedXP >= thresholds.deadly) {
    rating = 'deadly';
  } else if (totalAdjustedXP >= thresholds.hard) {
    rating = 'hard';
  } else if (totalAdjustedXP >= thresholds.medium) {
    rating = 'medium';
  } else if (totalAdjustedXP >= thresholds.easy) {
    rating = 'easy';
  }

  return { rating, thresholds };
}

/**
 * Main EncounterSummaryPanel component
 */
export function EncounterSummaryPanel({
  enemies,
  partyMembers,
  compact = false,
  className = '',
  onExport
}: EncounterSummaryPanelProps) {
  // Calculate enemy type breakdown
  const enemyBreakdown = useMemo((): EnemyTypeBreakdown[] => {
    if (enemies.length === 0) return [];

    const categoryMap = new Map<string, EnemyTypeBreakdown>();

    enemies.forEach(enemy => {
      const category = inferEnemyCategory(enemy);
      const categoryInfo = CATEGORY_INFO[category] || { label: 'Unknown', icon: '?' };

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          categoryName: categoryInfo.label,
          categoryIcon: categoryInfo.icon,
          count: 0,
          enemies: []
        });
      }

      const breakdown = categoryMap.get(category)!;
      breakdown.count++;
      breakdown.enemies.push({
        name: enemy.name,
        level: enemy.level || 1,
        rarity: inferEnemyRarity(enemy)
      });
    });

    // Sort by count (descending)
    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  }, [enemies]);

  // Calculate total encounter XP and difficulty
  const encounterStats = useMemo(() => {
    if (enemies.length === 0) {
      return {
        totalXP: 0,
        adjustedXP: 0,
        multiplier: 1,
        avgLevel: 0,
        rating: 'trivial' as DifficultyRating,
        thresholds: { easy: 0, medium: 0, hard: 0, deadly: 0 }
      };
    }

    // Get CR for each enemy (use level as effective CR)
    const enemyCRs = enemies.map(e => e.level || 1);
    const multiplier = getEncounterMultiplier(enemyCRs.length);
    const adjustedXP = calculateAdjustedXP(enemyCRs, multiplier);
    const totalXP = enemyCRs.reduce((sum, cr) => sum + getXPForCR(cr), 0);

    const { rating, thresholds } = calculateDifficultyRating(adjustedXP, partyMembers);

    return {
      totalXP,
      adjustedXP,
      multiplier,
      avgLevel: Math.round(enemyCRs.reduce((a, b) => a + b, 0) / enemyCRs.length * 10) / 10,
      rating,
      thresholds
    };
  }, [enemies, partyMembers]);

  // Show nothing if no enemies
  if (enemies.length === 0) {
    return null;
  }

  const difficultyStyle = DIFFICULTY_STYLES[encounterStats.rating];

  return (
    <div className={`encounter-summary-panel ${compact ? 'encounter-summary-compact' : ''} ${className}`}
         style={{ borderColor: difficultyStyle.color }}>
      {/* Header */}
      <div className="encounter-summary-header">
        <div className="encounter-summary-title">
          <Swords size={16} />
          <span>Encounter Summary</span>
        </div>
        <div className="encounter-summary-header-actions">
          {onExport && (
            <CombatExportButton
              onExport={onExport}
              size="icon"
              variant="toggle"
              label="Pre-Combat Data"
              tooltip="Export encounter data"
            />
          )}
          <div className="encounter-summary-rating"
               style={{ color: difficultyStyle.color, backgroundColor: difficultyStyle.bgColor }}>
            {difficultyStyle.icon} {encounterStats.rating.charAt(0).toUpperCase() + encounterStats.rating.slice(1)}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="encounter-summary-stats-grid">
        <StatItem
          icon={<Users size={14} />}
          label="Total Enemies"
          value={enemies.length}
          subtitle={`${enemyBreakdown.length} type${enemyBreakdown.length !== 1 ? 's' : ''}`}
        />
        <StatItem
          icon={<Skull size={14} />}
          label="Total XP"
          value={encounterStats.totalXP.toLocaleString()}
          subtitle={`×${encounterStats.multiplier} multiplier`}
        />
        <StatItem
          icon={<Star size={14} />}
          label="Adjusted XP"
          value={encounterStats.adjustedXP.toLocaleString()}
          subtitle="encounter difficulty"
          color={difficultyStyle.color}
        />
        <StatItem
          icon={<AlertTriangle size={14} />}
          label="Avg CR"
          value={encounterStats.avgLevel}
          subtitle="average enemy level"
        />
      </div>

      {/* Enemy Type Breakdown - Not shown in compact mode */}
      {!compact && enemyBreakdown.length > 0 && (
        <div className="encounter-summary-types-section">
          <div className="encounter-summary-types-title">Enemy Composition</div>
          <div className="encounter-summary-types-grid">
            {enemyBreakdown.map((breakdown, index) => (
              <EnemyTypeBadge key={index} breakdown={breakdown} />
            ))}
          </div>

          {/* Detailed enemy list */}
          <div className="encounter-summary-enemy-list">
            {enemyBreakdown.map((breakdown, catIndex) => (
              <div key={catIndex} className="encounter-summary-enemy-category">
                <div className="encounter-summary-category-header">
                  <span>{breakdown.categoryIcon} {breakdown.categoryName}</span>
                  <span className="encounter-summary-category-count">{breakdown.count}</span>
                </div>
                <div className="encounter-summary-category-enemies">
                  {breakdown.enemies.map((enemy, enemyIndex) => (
                    <div key={enemyIndex} className="encounter-summary-enemy-item">
                      <span className="encounter-summary-enemy-name">{enemy.name}</span>
                      <span className="encounter-summary-enemy-level">CR {enemy.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Party Comparison - Not shown in compact mode */}
      {!compact && partyMembers.length > 0 && (
        <div className="encounter-summary-comparison-section">
          <div className="encounter-summary-comparison-title">
            Party Difficulty Thresholds
          </div>
          <div className="encounter-summary-thresholds-grid">
            <div className="encounter-summary-threshold" style={{ color: DIFFICULTY_STYLES.easy.color }}>
              <span className="encounter-summary-threshold-label">Easy</span>
              <span className="encounter-summary-threshold-value">
                {encounterStats.thresholds.easy.toLocaleString()} XP
              </span>
            </div>
            <div className="encounter-summary-threshold" style={{ color: DIFFICULTY_STYLES.medium.color }}>
              <span className="encounter-summary-threshold-label">Medium</span>
              <span className="encounter-summary-threshold-value">
                {encounterStats.thresholds.medium.toLocaleString()} XP
              </span>
            </div>
            <div className="encounter-summary-threshold" style={{ color: DIFFICULTY_STYLES.hard.color }}>
              <span className="encounter-summary-threshold-label">Hard</span>
              <span className="encounter-summary-threshold-value">
                {encounterStats.thresholds.hard.toLocaleString()} XP
              </span>
            </div>
            <div className="encounter-summary-threshold" style={{ color: DIFFICULTY_STYLES.deadly.color }}>
              <span className="encounter-summary-threshold-label">Deadly</span>
              <span className="encounter-summary-threshold-value">
                {encounterStats.thresholds.deadly.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Challenge indicator */}
      <div className="encounter-summary-challenge">
        <div className="encounter-summary-challenge-bar">
          <div
            className="encounter-summary-challenge-fill"
            style={{
              width: `${Math.min(100, (encounterStats.adjustedXP / encounterStats.thresholds.deadly) * 100)}%`,
              backgroundColor: difficultyStyle.color
            }}
          />
        </div>
        <div className="encounter-summary-challenge-label">
          {encounterStats.rating === 'impossible' && '☠️ This encounter is likely impossible!'}
          {encounterStats.rating === 'deadly' && '💀 Deadly encounter - casualties likely!'}
          {encounterStats.rating === 'hard' && '⚠️ Hard encounter - use resources wisely'}
          {encounterStats.rating === 'medium' && '⚡ Medium encounter - balanced fight'}
          {encounterStats.rating === 'easy' && '✓ Easy encounter - few resources needed'}
          {encounterStats.rating === 'trivial' && '○ Trivial encounter - minimal challenge'}
        </div>
      </div>
    </div>
  );
}

export default EncounterSummaryPanel;
