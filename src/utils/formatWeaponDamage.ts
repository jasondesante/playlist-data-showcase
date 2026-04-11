import { AttackResolver } from 'playlist-data-engine';

/**
 * Format weapon damage for display based on the user's damageDisplay setting.
 * Delegates to AttackResolver.formatWeaponDamage in the engine.
 *
 * 'scaled': Shows flat damage bonus derived from the dice (e.g. "+2 piercing")
 * 'dnd':    Shows the raw dice string (e.g. "1d8 piercing")
 */
export function formatWeaponDamage(
    dice: string,
    damageType: string,
    damageDisplay: 'dnd' | 'scaled',
): string {
    return AttackResolver.formatWeaponDamage(dice, damageType, damageDisplay);
}
