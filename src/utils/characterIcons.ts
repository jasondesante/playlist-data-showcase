/**
 * Character Icon Utilities
 *
 * Provides icon mappings for D&D 5e character classes.
 * Used across multiple components to maintain consistent iconography.
 */

/**
 * Get the avatar emoji for a given character class.
 * @param charClass - The character class name
 * @returns An emoji representing the class, or a default person emoji
 */
export function getCharacterAvatar(charClass: string): string {
  const classEmojis: Record<string, string> = {
    'Fighter': '⚔️',
    'Wizard': '🧙',
    'Rogue': '🗡️',
    'Cleric': '✨',
    'Ranger': '🏹',
    'Barbarian': '🪓',
    'Bard': '🎸',
    'Druid': '🌿',
    'Monk': '👊',
    'Paladin': '🛡️',
    'Sorcerer': '🔮',
    'Warlock': '👁️',
  };
  return classEmojis[charClass] || '👤';
}

/**
 * Get the icon for a specific character stat.
 * Used for displaying stat icons in character sheets.
 */
export function getStatIcon(stat: string): string {
  const statIcons: Record<string, string> = {
    'STR': '💪',
    'DEX': '🏃',
    'CON': '❤️',
    'INT': '🧠',
    'WIS': '👁️',
    'CHA': '🎭',
    'HP': '❤️',
    'AC': '🛡️',
    'Initiative': '⚡',
    'Speed': '👟',
  };
  return statIcons[stat] || '📊';
}
