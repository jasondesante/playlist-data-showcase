/**
 * Formatter utilities for DataViewerTab
 *
 * These functions format various data types for display in the UI.
 * All functions are pure and can be easily tested in isolation.
 */

import type { EquipmentCondition, FeaturePrerequisite } from 'playlist-data-engine';
import { User, Palette, Sparkles, Smile, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Format level for display with ordinal suffix
 *
 * Converts numeric levels to ordinal strings with appropriate suffixes.
 *
 * @param level - The level number (0 for cantrip, 1+ for other levels)
 * @returns Formatted level string (e.g., "Cantrip", "1st", "2nd", "3rd", "4th")
 *
 * @example
 * formatLevel(0)  // "Cantrip"
 * formatLevel(1)  // "1st"
 * formatLevel(2)  // "2nd"
 * formatLevel(3)  // "3rd"
 * formatLevel(4)  // "4th"
 */
export function formatLevel(level: number): string {
  if (level === 0) return 'Cantrip';
  if (level === 1) return '1st';
  if (level === 2) return '2nd';
  if (level === 3) return '3rd';
  return `${level}th`;
}

/**
 * Format rarity for display
 *
 * Converts snake_case rarity strings to Title Case display strings.
 *
 * @param rarity - The rarity string in snake_case (e.g., 'very_rare')
 * @returns Title Case string (e.g., "Very Rare")
 *
 * @example
 * formatRarity('common')     // "Common"
 * formatRarity('very_rare')  // "Very Rare"
 * formatRarity('legendary')  // "Legendary"
 */
export function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format ability bonus for display
 *
 * Converts numeric bonus to display string with appropriate sign prefix.
 *
 * @param bonus - The numeric bonus value (positive, zero, or negative)
 * @returns Formatted string with sign prefix (e.g., "+2", "-1", "+0")
 *
 * @example
 * formatAbilityBonus(2)   // "+2"
 * formatAbilityBonus(0)   // "+0"
 * formatAbilityBonus(-1)  // "-1"
 */
export function formatAbilityBonus(bonus: number): string {
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * Format spawn weight for display with category labels
 *
 * Spawn weight categories:
 * - spawnWeight === 0: "Game-Only" - never spawns randomly, used by game logic only
 * - spawnWeight < 0.1: "Rare Spawn" - very low probability
 * - spawnWeight < 0.5: "Uncommon" - lower than average probability
 * - spawnWeight >= 0.5: no badge (normal/common spawn)
 *
 * @param weight - The spawn weight value (0-1 typically)
 * @returns Object with label and CSS class, or null for normal items
 */
export function formatSpawnWeight(weight: number | undefined): { label: string; className: string } | null {
  if (weight === undefined) return null;
  if (weight === 0) return { label: 'Game-Only', className: 'dataviewer-badge-gameonly' };
  if (weight < 0.1) return { label: 'Rare Spawn', className: 'dataviewer-badge-rare-spawn' };
  if (weight < 0.5) return { label: 'Uncommon', className: 'dataviewer-badge-uncommon-spawn' };
  return null;
}

/**
 * Format equipment condition for display
 *
 * Converts EquipmentCondition objects into human-readable strings.
 *
 * Condition formats:
 * - vs_creature_type: "vs Dragons", "vs Undead"
 * - at_time_of_day: "at Night", "at Dawn"
 * - wielder_race: "Elf only", "Dwarf only"
 * - wielder_class: "Paladin only", "Rogue only"
 * - while_equipped: "(implicit - always active when equipped)"
 * - on_hit: "on hit"
 * - on_damage_taken: "when hit"
 * - custom: uses the custom description
 *
 * @param condition - The EquipmentCondition object to format
 * @returns Human-readable condition string, or empty string if no condition
 *
 * @example
 * formatCondition({ type: 'vs_creature_type', value: 'dragon' }) // "vs Dragon"
 * formatCondition({ type: 'at_time_of_day', value: 'night' }) // "at Night"
 * formatCondition({ type: 'wielder_race', value: 'Elf' }) // "Elf only"
 */
export function formatCondition(condition: EquipmentCondition | undefined): string {
  if (!condition) return '';

  switch (condition.type) {
    case 'vs_creature_type':
      // Capitalize the creature type (e.g., "dragon" → "Dragon")
      return `vs ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'at_time_of_day':
      // Format time of day (e.g., "night" → "at Night")
      return `at ${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)}`;

    case 'wielder_race':
      // Format race restriction (e.g., "elf" → "Elf only")
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'wielder_class':
      // Format class restriction (e.g., "paladin" → "Paladin only")
      return `${condition.value.charAt(0).toUpperCase() + condition.value.slice(1)} only`;

    case 'while_equipped':
      // Implicit condition - property is always active when equipped
      // Return empty string since this is the default behavior
      return '';

    case 'on_hit':
      // Trigger condition for weapon hits
      return 'on hit';

    case 'on_damage_taken':
      // Trigger condition when wearer takes damage
      return 'when hit';

    case 'custom':
      // Use the custom description if provided, otherwise the value
      return condition.description || condition.value;

    default:
      // Exhaustiveness check - this should never happen
      return '';
  }
}

/**
 * Format feature prerequisites for display
 *
 * Converts FeaturePrerequisite objects into an array of human-readable strings.
 *
 * Prerequisite types:
 * - level: "Level 5+"
 * - features: "Requires: Darkvision, Sneak Attack"
 * - abilities: "STR 13+", "DEX 15+"
 * - class: "Paladin only"
 * - race: "Elf only"
 * - subrace: "High Elf only"
 * - skills: "Skills: Stealth, Perception"
 * - spells: "Spells: Fireball, Shield"
 * - custom: Custom condition description
 *
 * @param prerequisites - The FeaturePrerequisite object to format
 * @returns Array of formatted prerequisite strings
 */
export function formatPrerequisites(prerequisites: FeaturePrerequisite | undefined): string[] {
  if (!prerequisites) return [];

  const result: string[] = [];

  if (prerequisites.level) {
    result.push(`Level ${prerequisites.level}+`);
  }

  if (prerequisites.features && prerequisites.features.length > 0) {
    result.push(`Requires: ${prerequisites.features.join(', ')}`);
  }

  if (prerequisites.abilities) {
    Object.entries(prerequisites.abilities).forEach(([ability, min]) => {
      result.push(`${ability} ${min}+`);
    });
  }

  if (prerequisites.class) {
    result.push(`${prerequisites.class} only`);
  }

  if (prerequisites.race) {
    result.push(`${prerequisites.race} only`);
  }

  if (prerequisites.subrace) {
    result.push(`${prerequisites.subrace} only`);
  }

  if (prerequisites.skills && prerequisites.skills.length > 0) {
    result.push(`Skills: ${prerequisites.skills.join(', ')}`);
  }

  if (prerequisites.spells && prerequisites.spells.length > 0) {
    result.push(`Spells: ${prerequisites.spells.join(', ')}`);
  }

  if (prerequisites.custom) {
    result.push(prerequisites.custom);
  }

  return result;
}

/**
 * Format spell level for display with ordinal suffix
 *
 * Converts numeric spell levels to ordinal strings with appropriate suffixes.
 *
 * @param level - Spell level (0 for cantrips, 1-9 for spell levels)
 * @returns Formatted level string (e.g., "Cantrip", "1st", "3rd")
 *
 * @example
 * formatSpellLevelShort(0)  // "Cantrip"
 * formatSpellLevelShort(1)  // "1st"
 * formatSpellLevelShort(3)  // "3rd"
 * formatSpellLevelShort(5)  // "5th"
 */
export function formatSpellLevelShort(level: number | undefined): string {
  if (level === undefined || level === null) return '';
  if (level === 0) return 'Cantrip';
  if (level === 1) return '1st';
  if (level === 2) return '2nd';
  if (level === 3) return '3rd';
  return `${level}th`;
}

/**
 * Format uses and recharge info for display
 *
 * Converts uses count and recharge type into a human-readable string.
 *
 * @param uses - Number of uses, or null for unlimited
 * @param recharge - Recharge type: 'dawn', 'short_rest', 'long_rest', or undefined
 * @returns Formatted uses string (e.g., "1/dawn", "unlimited", "3/short rest")
 *
 * @example
 * formatSpellUses(1, 'dawn')      // "1/dawn"
 * formatSpellUses(3, 'short_rest') // "3/short rest"
 * formatSpellUses(null, undefined) // "unlimited"
 * formatSpellUses(undefined, undefined) // "once"
 */
export function formatSpellUses(uses: number | null | undefined, recharge: string | undefined): string {
  if (uses === null) return 'unlimited';
  if (uses === undefined) return 'once';
  const rechargeStr = recharge ? `/${recharge.replace('_', ' ')}` : '';
  return `${uses}${rechargeStr}`;
}

/**
 * Check if an option is a color value (hex color)
 *
 * @param option - The option string to check
 * @returns True if the option is a valid hex color (e.g., "#FF0000")
 */
export function isColorOption(option: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(option);
}

/**
 * Get icon component for appearance category
 *
 * @param iconType - The type of appearance icon
 * @returns Lucide icon component
 */
export function getAppearanceIcon(iconType: 'body' | 'color' | 'style' | 'feature'): LucideIcon {
  switch (iconType) {
    case 'body': return User;
    case 'color': return Palette;
    case 'style': return Sparkles;
    case 'feature': return Smile;
    default: return Eye;
  }
}
