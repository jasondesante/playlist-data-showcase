/**
 * PartyCompositionPanel Component
 *
 * Displays party composition visualization including class distribution,
 * role breakdown, and quick stats.
 *
 * Part of Phase 4: Party Composition Visualization
 */

import { useMemo } from 'react';
import { CharacterSheet, SpellManager } from 'playlist-data-engine';
import { Tooltip } from '../ui/Tooltip';
import { Swords, Shield, Wand2, Heart, Footprints, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './PartyCompositionPanel.css';

export interface PartyCompositionPanelProps {
  /** All available characters */
  characters: CharacterSheet[];
  /** Set of seeds for characters selected for analysis */
  selectedSeeds: Set<string>;
}

/**
 * Role categories for D&D 5e classes
 */
type Role = 'tank' | 'dps' | 'caster' | 'support';

interface RoleConfig {
  name: string;
  icon: React.ReactNode;
  classes: string[];
  description: string;
  colorClass: string;
}

/**
 * Role definitions based on class archetypes
 */
const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  tank: {
    name: 'Tank',
    icon: <Shield size={16} />,
    classes: ['Fighter', 'Paladin', 'Barbarian'],
    description: 'High AC/HP frontliners who protect allies',
    colorClass: 'tank'
  },
  dps: {
    name: 'DPS',
    icon: <Swords size={16} />,
    classes: ['Rogue', 'Ranger', 'Monk'],
    description: 'High damage dealers who focus on eliminating threats',
    colorClass: 'dps'
  },
  caster: {
    name: 'Caster',
    icon: <Wand2 size={16} />,
    classes: ['Wizard', 'Sorcerer', 'Warlock'],
    description: 'Spell-focused damage dealers and controllers',
    colorClass: 'caster'
  },
  support: {
    name: 'Support',
    icon: <Heart size={16} />,
    classes: ['Cleric', 'Bard', 'Druid'],
    description: 'Healers and utility providers',
    colorClass: 'support'
  }
};

/**
 * Class icons for display
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
 * Class colors for the bars
 */
const CLASS_COLORS: Record<string, string> = {
  'Barbarian': 'hsl(0, 65%, 45%)',
  'Bard': 'hsl(280, 60%, 50%)',
  'Cleric': 'hsl(45, 70%, 50%)',
  'Druid': 'hsl(120, 45%, 35%)',
  'Fighter': 'hsl(210, 50%, 45%)',
  'Monk': 'hsl(35, 70%, 50%)',
  'Paladin': 'hsl(195, 65%, 45%)',
  'Ranger': 'hsl(150, 50%, 35%)',
  'Rogue': 'hsl(270, 40%, 40%)',
  'Sorcerer': 'hsl(300, 60%, 50%)',
  'Warlock': 'hsl(260, 55%, 40%)',
  'Wizard': 'hsl(220, 70%, 55%)'
};

interface ClassCount {
  className: string;
  count: number;
  percentage: number;
}

interface RoleCount {
  role: Role;
  count: number;
  percentage: number;
  config: RoleConfig;
}

interface CompositionData {
  classDistribution: ClassCount[];
  roleDistribution: RoleCount[];
  quickStats: {
    totalHP: number;
    highestAC: number;
    lowestAC: number;
    spellcasterCount: number;
    averageSpeed: number;
  };
}

/**
 * Calculate composition data from selected characters
 */
function calculateComposition(characters: CharacterSheet[]): CompositionData {
  // Calculate class distribution
  const classCounts = new Map<string, number>();
  characters.forEach(char => {
    const count = classCounts.get(char.class) || 0;
    classCounts.set(char.class, count + 1);
  });

  const classDistribution: ClassCount[] = Array.from(classCounts.entries())
    .map(([className, count]) => ({
      className,
      count,
      percentage: (count / characters.length) * 100
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate role distribution
  const roleCounts = new Map<Role, number>();
  characters.forEach(char => {
    for (const [role, config] of Object.entries(ROLE_CONFIGS) as [Role, RoleConfig][]) {
      if (config.classes.includes(char.class)) {
        const count = roleCounts.get(role) || 0;
        roleCounts.set(role, count + 1);
        break;
      }
    }
  });

  const roleDistribution: RoleCount[] = Array.from(roleCounts.entries())
    .map(([role, count]) => ({
      role,
      count,
      percentage: (count / characters.length) * 100,
      config: ROLE_CONFIGS[role]
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate quick stats
  const acValues = characters.map(c => c.armor_class);
  const speeds = characters.map(c => c.speed);

  // Use SpellManager to determine spellcasters
  let spellcasterCount = 0;
  try {
    spellcasterCount = characters.filter(c => {
      try {
        return SpellManager.isSpellcaster(c.class as any);
      } catch {
        // Fallback to checking if character has spells
        return c.spells && (c.spells.cantrips.length > 0 || c.spells.known_spells.length > 0);
      }
    }).length;
  } catch {
    // Fallback: check if character has spells property with content
    spellcasterCount = characters.filter(c =>
      c.spells && (c.spells.cantrips.length > 0 || c.spells.known_spells.length > 0)
    ).length;
  }

  const quickStats = {
    totalHP: characters.reduce((sum, c) => sum + c.hp.max, 0),
    highestAC: Math.max(...acValues),
    lowestAC: Math.min(...acValues),
    spellcasterCount,
    averageSpeed: Math.round(speeds.reduce((sum, s) => sum + s, 0) / characters.length)
  };

  return {
    classDistribution,
    roleDistribution,
    quickStats
  };
}

/**
 * Class distribution bar component
 */
function ClassDistributionBar({ classDistribution }: { classDistribution: ClassCount[] }) {
  if (classDistribution.length === 0) return null;

  return (
    <div className="composition-section">
      <h4 className="composition-section-title">
        Class Distribution
        <Tooltip content="Shows the breakdown of character classes in your party. A balanced party typically has a mix of different classes." />
      </h4>
      <div className="class-distribution-bars">
        {classDistribution.map(({ className, count, percentage }) => (
          <div key={className} className="class-bar-container">
            <div className="class-bar-header">
              <span className="class-bar-name">
                <span className="class-icon">{CLASS_ICONS[className] || '⚔️'}</span>
                {className}
              </span>
              <span className="class-bar-count">
                {count} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="class-bar-track">
              <div
                className="class-bar-fill"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: CLASS_COLORS[className] || 'var(--color-primary)'
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Role distribution component
 */
function RoleDistribution({ roleDistribution }: { roleDistribution: RoleCount[] }) {
  if (roleDistribution.length === 0) return null;

  // Check if party is balanced (has at least some diversity)
  const isBalanced = roleDistribution.length >= 3;

  return (
    <div className="composition-section">
      <h4 className="composition-section-title">
        Role Distribution
        <Tooltip content="Roles are determined by class archetype: Tanks (Fighter, Paladin, Barbarian), DPS (Rogue, Ranger, Monk), Casters (Wizard, Sorcerer, Warlock), Support (Cleric, Bard, Druid)." />
      </h4>
      <div className="role-distribution-grid">
        {roleDistribution.map(({ role, count, percentage, config }) => (
          <div key={role} className={`role-card role-card-${config.colorClass}`}>
            <div className="role-card-icon">{config.icon}</div>
            <div className="role-card-content">
              <div className="role-card-name">{config.name}</div>
              <div className="role-card-count">{count} {count === 1 ? 'hero' : 'heroes'}</div>
              <div className="role-card-percentage">{percentage.toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`role-balance-indicator ${isBalanced ? 'balanced' : 'unbalanced'}`}>
        {isBalanced ? (
          <>
            <span className="balance-icon balanced">✓</span>
            <span>Balanced party composition</span>
          </>
        ) : (
          <>
            <span className="balance-icon unbalanced">⚠</span>
            <span>Consider adding more role diversity</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Quick stats row component
 */
function QuickStatsRow({ quickStats }: { quickStats: CompositionData['quickStats'] }) {
  const stats = [
    {
      icon: <Heart size={14} />,
      label: 'Total HP Pool',
      value: quickStats.totalHP,
      color: 'hp'
    },
    {
      icon: <ArrowUpRight size={14} />,
      label: 'Highest AC',
      value: quickStats.highestAC,
      color: 'ac-high'
    },
    {
      icon: <ArrowDownRight size={14} />,
      label: 'Lowest AC',
      value: quickStats.lowestAC,
      color: 'ac-low'
    },
    {
      icon: <Wand2 size={14} />,
      label: 'Spellcasters',
      value: quickStats.spellcasterCount,
      color: 'caster'
    },
    {
      icon: <Footprints size={14} />,
      label: 'Avg Speed',
      value: `${quickStats.averageSpeed} ft`,
      color: 'speed'
    }
  ];

  return (
    <div className="composition-section">
      <h4 className="composition-section-title">
        Quick Stats
        <Tooltip content="Aggregated stats from all selected party members." />
      </h4>
      <div className="quick-stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`quick-stat-item quick-stat-${stat.color}`}>
            <div className="quick-stat-icon">{stat.icon}</div>
            <div className="quick-stat-content">
              <div className="quick-stat-value">{stat.value}</div>
              <div className="quick-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state when no heroes are selected
 */
function EmptyState() {
  return (
    <div className="composition-empty">
      <div className="composition-empty-icon">📊</div>
      <h3 className="composition-empty-title">No Heroes Selected</h3>
      <div className="composition-empty-text">
        Select heroes from the party to see composition analysis.
      </div>
    </div>
  );
}

/**
 * Too few heroes state
 */
function TooFewState({ count }: { count: number }) {
  return (
    <div className="composition-empty">
      <div className="composition-empty-icon">👥</div>
      <h3 className="composition-empty-title">Add More Heroes</h3>
      <div className="composition-empty-text">
        Select at least 2 heroes to see meaningful composition analysis. Currently selected: {count}.
      </div>
    </div>
  );
}

/**
 * Main PartyCompositionPanel component
 */
export function PartyCompositionPanel({
  characters,
  selectedSeeds
}: PartyCompositionPanelProps) {
  // Filter characters by selection
  const selectedCharacters = useMemo(() =>
    characters.filter(c => selectedSeeds.has(c.seed)),
    [characters, selectedSeeds]
  );

  // Calculate composition data
  const composition = useMemo(() => {
    if (selectedCharacters.length < 2) return null;
    return calculateComposition(selectedCharacters);
  }, [selectedCharacters]);

  // Show empty state when no heroes selected
  if (selectedCharacters.length === 0) {
    return (
      <div className="party-composition-panel party-composition-panel-empty">
        <EmptyState />
      </div>
    );
  }

  // Show too few state when only 1 hero selected
  if (selectedCharacters.length === 1 || !composition) {
    return (
      <div className="party-composition-panel party-composition-panel-empty">
        <TooFewState count={selectedCharacters.length} />
      </div>
    );
  }

  return (
    <div className="party-composition-panel">
      {/* Class Distribution */}
      <ClassDistributionBar
        classDistribution={composition.classDistribution}
      />

      {/* Role Distribution */}
      <RoleDistribution
        roleDistribution={composition.roleDistribution}
      />

      {/* Quick Stats */}
      <QuickStatsRow quickStats={composition.quickStats} />
    </div>
  );
}

export default PartyCompositionPanel;
