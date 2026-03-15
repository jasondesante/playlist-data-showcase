/**
 * Color constants for the DataViewer component
 *
 * These color mappings are used throughout the data viewer for consistent
 * visual styling of spells, equipment, abilities, etc.
 */

/**
 * Spell school color mapping
 */
export const SCHOOL_COLORS: Record<string, string> = {
  'Abjuration': 'hsl(210 80% 50%)',      // Blue
  'Conjuration': 'hsl(120 60% 40%)',     // Green
  'Divination': 'hsl(270 60% 50%)',      // Purple
  'Enchantment': 'hsl(300 60% 50%)',     // Magenta
  'Evocation': 'hsl(0 70% 50%)',         // Red
  'Illusion': 'hsl(180 60% 45%)',        // Cyan
  'Necromancy': 'hsl(150 60% 30%)',      // Dark Green
  'Transmutation': 'hsl(30 90% 50%)',    // Orange
};

/**
 * Spell school background colors
 */
export const SCHOOL_BG_COLORS: Record<string, string> = {
  'Abjuration': 'hsl(210 80% 50% / 0.1)',
  'Conjuration': 'hsl(120 60% 40% / 0.1)',
  'Divination': 'hsl(270 60% 50% / 0.1)',
  'Enchantment': 'hsl(300 60% 50% / 0.1)',
  'Evocation': 'hsl(0 70% 50% / 0.1)',
  'Illusion': 'hsl(180 60% 45% / 0.1)',
  'Necromancy': 'hsl(150 60% 30% / 0.1)',
  'Transmutation': 'hsl(30 90% 50% / 0.1)',
};

/**
 * Rarity color mapping
 */
export const RARITY_COLORS: Record<string, string> = {
  'common': 'var(--color-text-secondary)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};

/**
 * Rarity background colors
 */
export const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.1)',
  'uncommon': 'hsl(120 60% 40% / 0.1)',
  'rare': 'hsl(210 80% 50% / 0.1)',
  'very_rare': 'hsl(270 60% 50% / 0.1)',
  'legendary': 'hsl(30 90% 50% / 0.15)'
};

/**
 * Ability score color mapping
 */
export const ABILITY_COLORS: Record<string, string> = {
  'STR': 'hsl(0 70% 50%)',      // Red
  'DEX': 'hsl(120 60% 40%)',    // Green
  'CON': 'hsl(30 90% 50%)',     // Orange
  'INT': 'hsl(210 80% 50%)',    // Blue
  'WIS': 'hsl(270 60% 50%)',    // Purple
  'CHA': 'hsl(300 60% 50%)',    // Magenta
};
