/**
 * Property type configuration for equipment properties
 *
 * Maps property types to appropriate icons and labels for visual identification.
 */

import {
  TrendingUp,
  Award,
  Sparkles,
  Shield,
  Flame,
  Star,
  Zap
} from 'lucide-react';

/**
 * Equipment property type configuration with icons
 * Maps property types to appropriate icons for visual identification
 *
 * Task 2.3: Property Icon System
 */
export const PROPERTY_TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; label: string }> = {
  'stat_bonus': { icon: TrendingUp, label: 'Stat Bonus' },
  'skill_proficiency': { icon: Award, label: 'Skill' },
  'ability_unlock': { icon: Sparkles, label: 'Ability' },
  'passive_modifier': { icon: Shield, label: 'Passive' },
  'damage_bonus': { icon: Flame, label: 'Damage' },
  'special_property': { icon: Star, label: 'Special' },
  // Fallback for unknown types
  'default': { icon: Zap, label: 'Property' }
};

/**
 * Get property type configuration, with fallback to default
 *
 * Task 2.3: Property Icon System
 *
 * Returns the icon and label for a given property type, used to visually
 * identify different equipment property types in the UI.
 *
 * @param type - The property type string (e.g., 'stat_bonus', 'skill_proficiency')
 * @returns Configuration object with icon component and label string
 *
 * @example
 * const config = getPropertyTypeConfig('stat_bonus');
 * // Returns: { icon: TrendingUp, label: 'Stat Bonus' }
 *
 * const config = getPropertyTypeConfig('unknown_type');
 * // Returns: { icon: Zap, label: 'Property' } (default fallback)
 */
export function getPropertyTypeConfig(type: string) {
  return PROPERTY_TYPE_CONFIG[type] || PROPERTY_TYPE_CONFIG['default'];
}
