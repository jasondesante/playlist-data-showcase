import { CombatAI, CharacterSheet } from 'playlist-data-engine';

/**
 * Estimate enemy DPR from a CharacterSheet by inspecting weapons and combat spells.
 *
 * Standalone pure function (not a hook) that can be reused for both pre-simulation
 * estimates and post-simulation gap analysis.
 *
 * Logic:
 * 1. Get all equipped weapons, parse each weapon's damage dice via CombatAI.averageDamageFromFormula()
 * 2. Take the best weapon damage as base single-attack DPR
 * 3. Check if enemy has multiple attacks (legendary_config actions with damage)
 * 4. Multiply base DPR by attack count (1 if single-attack, 2-3 for multiattack enemies)
 * 5. Also check combat_spells for damage cantrips/spells, take max of weapon vs spell DPR
 * 6. Return the final estimated DPR
 *
 * @param enemy - A CharacterSheet representing an enemy
 * @returns Estimated damage per round
 */
export function estimateEnemyDPR(enemy: CharacterSheet): number {
    const ai = new CombatAI({ playerStyle: 'normal', enemyStyle: 'normal' });

    // --- Weapon DPR ---
    let bestWeaponDPR = 0;
    const weapons = enemy.equipment?.weapons ?? [];
    for (const weapon of weapons) {
        if (!weapon.equipped) continue;

        const damageFormula = weapon.damage?.dice;
        if (!damageFormula) continue;

        try {
            const avgDamage = ai.averageDamageFromFormula(damageFormula);
            if (avgDamage > bestWeaponDPR) {
                bestWeaponDPR = avgDamage;
            }
        } catch {
            // Skip weapons with unparseable damage formulas
        }
    }

    // --- Spell DPR (cantrips and combat spells) ---
    let bestSpellDPR = 0;
    const combatSpells = enemy.combat_spells ?? [];
    for (const spell of combatSpells) {
        // Only consider damage-dealing spells
        const tags = spell.tags ?? [];
        if (!tags.includes('damage') && !tags.includes('aoe')) continue;

        // Prefer cantrips (level 0) since they can be cast every round
        const isCantrip = (spell.level ?? 0) === 0;

        const damageFormula = spell.damage ?? spell.damage_dice ?? '';
        if (!damageFormula) continue;

        try {
            let avgDamage = ai.averageDamageFromFormula(damageFormula);

            // AoE spells are less reliable per-target
            if (tags.includes('aoe')) {
                avgDamage *= 0.5;
            }

            // Non-cantrips have limited slots, weight them lower
            if (!isCantrip) {
                avgDamage *= 0.3;
            }

            if (avgDamage > bestSpellDPR) {
                bestSpellDPR = avgDamage;
            }
        } catch {
            // Skip spells with unparseable damage
        }
    }

    // --- Determine attack count ---
    // Check legendary_config for damaging actions
    let attackCount = 1;
    const legendaryActions = enemy.legendary_config?.actions ?? [];
    const damagingLegendaryActions = legendaryActions.filter(
        (action) => action.damage && action.tags?.includes('damage')
    );

    if (damagingLegendaryActions.length >= 2) {
        attackCount = 3; // Boss with multiattack + legendary actions
    } else if (damagingLegendaryActions.length === 1 || weapons.length > 1) {
        attackCount = 2; // Multiattack or one legendary damage action
    }

    // --- Compute final DPR ---
    const baseDPR = Math.max(bestWeaponDPR, bestSpellDPR);

    return baseDPR * attackCount;
}
