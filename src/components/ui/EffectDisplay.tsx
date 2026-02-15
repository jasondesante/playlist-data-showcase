/**
 * EffectDisplay Components
 *
 * Components for displaying feature_effects and equipment_effects in the CharacterGenTab.
 * Includes EffectBadge for individual effects, EffectList for grouped effects,
 * and ActiveEffectsSummary for a combined summary card.
 *
 * Task 2.1: Effect Display Components (Phase 2)
 */

import { useMemo } from 'react';
import { Zap, Swords, Shield, Heart, Sparkles, BookOpen, Target, TrendingUp, Award } from 'lucide-react';
import './EffectDisplay.css';

// ===========================================
// Types
// ===========================================

/**
 * Effect type labels and colors
 * Based on FeatureEffectType from playlist-data-engine
 */
export const EFFECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  'stat_bonus': { label: 'Stat Bonus', color: 'hsl(var(--cute-pink))', icon: TrendingUp },
  'passive_modifier': { label: 'Passive', color: 'hsl(var(--cute-teal))', icon: Shield },
  'ability_unlock': { label: 'Ability', color: 'hsl(var(--cute-purple))', icon: Sparkles },
  'skill_proficiency': { label: 'Skill', color: 'hsl(var(--cute-yellow))', icon: Award },
  'damage_bonus': { label: 'Damage', color: 'hsl(var(--cute-orange))', icon: Swords },
  'resource_grant': { label: 'Resource', color: 'hsl(var(--cute-teal))', icon: Heart },
  'spell_slot_bonus': { label: 'Spell Slot', color: 'hsl(var(--primary))', icon: BookOpen },
  // Equipment property types
  'ac_bonus': { label: 'AC Bonus', color: 'hsl(var(--cute-teal))', icon: Shield },
  'damage': { label: 'Damage', color: 'hsl(var(--cute-orange))', icon: Swords },
  'versatile': { label: 'Versatile', color: 'hsl(var(--cute-yellow))', icon: Swords },
  'reach': { label: 'Reach', color: 'hsl(var(--cute-purple))', icon: Target },
  'range': { label: 'Range', color: 'hsl(var(--cute-teal))', icon: Target },
  // Default fallback
  'default': { label: 'Effect', color: 'hsl(var(--muted-foreground))', icon: Zap }
};

/**
 * Feature effect from playlist-data-engine
 */
export interface FeatureEffect {
  type: string;
  target: string;
  value: number | string | boolean;
  condition?: string;
  description?: string;
}

/**
 * Equipment property from playlist-data-engine
 */
export interface EquipmentProperty {
  type: string;
  target?: string;
  value?: number | string | boolean;
  description?: string;
}

/**
 * Equipment effect with source information
 */
export interface EquipmentEffect {
  source: string;
  instanceId?: string;
  effects: EquipmentProperty[];
  features?: { featureId: string; description?: string }[];
  skills?: { skillId: string; level: string }[];
  spells?: { spellId: string; level?: number; uses?: number; recharge?: string }[];
}

/**
 * Props for EffectBadge component
 */
export interface EffectBadgeProps {
  effect: FeatureEffect | EquipmentProperty;
  source?: string;
  showTarget?: boolean;
  compact?: boolean;
}

/**
 * Props for EffectList component
 */
export interface EffectListProps {
  effects: (FeatureEffect | EquipmentProperty)[];
  source?: string;
  compact?: boolean;
  groupByType?: boolean;
}

/**
 * Props for ActiveEffectsSummary component
 */
export interface ActiveEffectsSummaryProps {
  featureEffects?: FeatureEffect[];
  equipmentEffects?: EquipmentEffect[];
  className?: string;
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Format effect value for display
 */
function formatEffectValue(value: number | string | boolean | undefined): string {
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return value >= 0 ? `+${value}` : `${value}`;
  }
  return String(value);
}

/**
 * Format target string for display
 */
function formatTarget(target: string | undefined): string {
  if (!target) return '';
  // Convert snake_case to Title Case
  return target
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get config for effect type
 */
function getEffectTypeConfig(type: string) {
  return EFFECT_TYPE_CONFIG[type] || EFFECT_TYPE_CONFIG['default'];
}

/**
 * Group effects by their type
 */
function groupEffectsByType(effects: (FeatureEffect | EquipmentProperty)[]): Map<string, (FeatureEffect | EquipmentProperty)[]> {
  const groups = new Map<string, (FeatureEffect | EquipmentProperty)[]>();
  for (const effect of effects) {
    const type = effect.type || 'default';
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(effect);
  }
  return groups;
}

/**
 * Combine and aggregate stat bonuses
 */
function aggregateStatBonuses(effects: (FeatureEffect | EquipmentProperty)[]): Map<string, number> {
  const bonuses = new Map<string, number>();
  for (const effect of effects) {
    if (effect.type === 'stat_bonus' && typeof effect.value === 'number' && effect.target) {
      const current = bonuses.get(effect.target) || 0;
      bonuses.set(effect.target, current + effect.value);
    }
  }
  return bonuses;
}

// ===========================================
// EffectBadge Component
// ===========================================

export function EffectBadge({ effect, source, showTarget = true, compact = false }: EffectBadgeProps) {
  const config = getEffectTypeConfig(effect.type);
  const Icon = config.icon;
  const valueStr = formatEffectValue(effect.value);
  const targetStr = formatTarget(effect.target);
  const hasTarget = effect.target && showTarget;
  const hasValue = effect.value !== undefined;

  // Build accessible label for screen readers
  const accessibleLabel = [
    config.label,
    hasTarget ? targetStr : '',
    hasValue ? valueStr : '',
    source ? `from ${source}` : '',
    effect.description || ''
  ].filter(Boolean).join(': ');

  return (
    <span
      className={`effect-badge ${compact ? 'effect-badge-compact' : ''}`}
      style={{
        '--effect-color': config.color
      } as React.CSSProperties}
      title={effect.description || (effect as FeatureEffect).condition || ''}
      role="img"
      aria-label={accessibleLabel}
    >
      <Icon size={compact ? 12 : 14} className="effect-badge-icon" aria-hidden="true" />
      <span className="effect-badge-type">{config.label}</span>
      {hasTarget && (
        <span className="effect-badge-target">{targetStr}</span>
      )}
      {hasValue && (
        <span className="effect-badge-value">{valueStr}</span>
      )}
      {source && (
        <span className="effect-badge-source">from {source}</span>
      )}
    </span>
  );
}

// ===========================================
// EffectList Component
// ===========================================

export function EffectList({ effects, source, compact = false, groupByType = false }: EffectListProps) {
  if (!effects || effects.length === 0) {
    return null;
  }

  if (groupByType) {
    const groups = groupEffectsByType(effects);
    return (
      <div className="effect-list-grouped">
        {Array.from(groups.entries()).map(([type, typeEffects]) => {
          const config = getEffectTypeConfig(type);
          const Icon = config.icon;
          return (
            <div key={type} className="effect-type-group">
              <div className="effect-type-header">
                <Icon size={14} style={{ color: config.color }} />
                <span className="effect-type-label">{config.label}</span>
                <span className="effect-type-count">{typeEffects.length}</span>
              </div>
              <div className="effect-type-items">
                {typeEffects.map((effect, idx) => (
                  <EffectBadge
                    key={idx}
                    effect={effect}
                    source={source}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="effect-list">
      {effects.map((effect, idx) => (
        <EffectBadge
          key={idx}
          effect={effect}
          source={source}
          compact={compact}
        />
      ))}
    </div>
  );
}

// ===========================================
// ActiveEffectsSummary Component
// ===========================================

export function ActiveEffectsSummary({
  featureEffects = [],
  equipmentEffects = [],
  className = ''
}: ActiveEffectsSummaryProps) {
  // Collect all equipment properties from equipment effects
  const allEquipmentProps = useMemo(() => {
    const props: (EquipmentProperty & { source: string })[] = [];
    for (const eqEffect of equipmentEffects) {
      for (const prop of eqEffect.effects || []) {
        props.push({ ...prop, source: eqEffect.source });
      }
    }
    return props;
  }, [equipmentEffects]);

  // Combine all effects
  const allEffects = useMemo(() => {
    const combined: (FeatureEffect | (EquipmentProperty & { source: string }))[] = [
      ...featureEffects.map(e => ({ ...e, source: 'Feature' })),
      ...allEquipmentProps
    ];
    return combined;
  }, [featureEffects, allEquipmentProps]);

  // Calculate aggregated stat totals
  const statTotals = useMemo(() => {
    return aggregateStatBonuses(allEffects);
  }, [allEffects]);

  // Group all effects by type
  const groupedEffects = useMemo(() => {
    return groupEffectsByType(allEffects);
  }, [allEffects]);

  // Check if there are any effects to display
  const hasEffects = allEffects.length > 0;

  if (!hasEffects) {
    return null;
  }

  return (
    <div className={`active-effects-summary ${className}`} role="region" aria-label="Active effects summary">
      <div className="active-effects-header">
        <Zap size={16} className="active-effects-icon" aria-hidden="true" />
        <h4 className="active-effects-title">Active Effects</h4>
        <span className="active-effects-count" aria-label={`${allEffects.length} total effects`}>{allEffects.length}</span>
      </div>

      {/* Stat Totals Summary */}
      {statTotals.size > 0 && (
        <div className="active-effects-totals">
          <span className="active-effects-totals-label">Stat Totals:</span>
          <div className="active-effects-totals-list">
            {Array.from(statTotals.entries()).map(([stat, total]) => (
              <span key={stat} className="active-effects-total-badge">
                <span className="active-effects-total-stat">{formatTarget(stat)}</span>
                <span className={`active-effects-total-value ${total >= 0 ? 'positive' : 'negative'}`}>
                  {total >= 0 ? '+' : ''}{total}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Effects by Type */}
      <div className="active-effects-groups">
        {Array.from(groupedEffects.entries()).map(([type, effects]) => {
          const config = getEffectTypeConfig(type);
          const Icon = config.icon;
          return (
            <div key={type} className="active-effects-type-group">
              <div className="active-effects-type-header">
                <Icon size={14} className="active-effects-type-icon" style={{ color: config.color }} />
                <span className="active-effects-type-label">{config.label}</span>
              </div>
              <div className="active-effects-type-items">
                {effects.map((effect, idx) => (
                  <EffectBadge
                    key={idx}
                    effect={effect}
                    source={(effect as any).source}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================
// Inline Effect Indicators (for features/traits/equipment)
// ===========================================

export interface InlineEffectIndicatorsProps {
  effects?: FeatureEffect[];
  className?: string;
}

/**
 * Compact inline indicators for showing effects next to features/traits
 */
export function InlineEffectIndicators({ effects, className = '' }: InlineEffectIndicatorsProps) {
  if (!effects || effects.length === 0) {
    return null;
  }

  return (
    <div className={`inline-effect-indicators ${className}`} role="group" aria-label="Effect indicators">
      {effects.map((effect, idx) => {
        const config = getEffectTypeConfig(effect.type);
        const valueStr = formatEffectValue(effect.value);
        const targetStr = formatTarget(effect.target);

        // Build accessible label
        const accessibleLabel = `${config.label}${targetStr ? `: ${targetStr}` : ''}${valueStr ? ` ${valueStr}` : ''}`;

        return (
          <span
            key={idx}
            className="inline-effect-indicator"
            style={{ '--effect-color': config.color } as React.CSSProperties}
            title={`${config.label}${targetStr ? `: ${targetStr}` : ''}${valueStr ? ` ${valueStr}` : ''}${effect.description ? ` - ${effect.description}` : ''}`}
            role="img"
            aria-label={accessibleLabel}
          >
            {valueStr || targetStr || config.label}
          </span>
        );
      })}
    </div>
  );
}

// ===========================================
// Inline Equipment Effect Indicators
// ===========================================

export interface InlineEquipmentEffectIndicatorsProps {
  equipmentEffect?: EquipmentEffect;
  className?: string;
}

/**
 * Compact inline indicators for showing effects next to equipment items
 * Displays properties from EquipmentEffect.effects array
 */
export function InlineEquipmentEffectIndicators({ equipmentEffect, className = '' }: InlineEquipmentEffectIndicatorsProps) {
  if (!equipmentEffect || !equipmentEffect.effects || equipmentEffect.effects.length === 0) {
    return null;
  }

  return (
    <div className={`inline-effect-indicators ${className}`} role="group" aria-label="Equipment effect indicators">
      {equipmentEffect.effects.map((prop, idx) => {
        const config = getEffectTypeConfig(prop.type);
        const valueStr = formatEffectValue(prop.value);
        const targetStr = formatTarget(prop.target);

        // Build accessible label
        const accessibleLabel = `${config.label}${targetStr ? `: ${targetStr}` : ''}${valueStr ? ` ${valueStr}` : ''}`;

        return (
          <span
            key={idx}
            className="inline-effect-indicator"
            style={{ '--effect-color': config.color } as React.CSSProperties}
            title={`${config.label}${targetStr ? `: ${targetStr}` : ''}${valueStr ? ` ${valueStr}` : ''}${prop.description ? ` - ${prop.description}` : ''}`}
            role="img"
            aria-label={accessibleLabel}
          >
            {valueStr || targetStr || config.label}
          </span>
        );
      })}
    </div>
  );
}

export default EffectBadge;
