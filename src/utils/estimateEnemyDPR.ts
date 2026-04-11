import { AttackResolver, CharacterSheet } from 'playlist-data-engine';
import type { HitMode } from 'playlist-data-engine';

/**
 * Estimate enemy DPR using the same formula as the actual combat simulator.
 *
 * For each equipped weapon, computes the DPR via AttackResolver.estimateDPR()
 * which mirrors the real damage formulas for both 'scaled' and 'dnd' hitModes.
 * Also checks combat_spells for damage cantrips/spells.
 *
 * @param enemy - A CharacterSheet representing an enemy
 * @param hitMode - Current hit mode ('scaled' or 'dnd')
 * @param targetAC - The AC of the target (party's average AC)
 * @returns Estimated damage per round
 */
export function estimateEnemyDPR(
    enemy: CharacterSheet,
    hitMode: HitMode,
    targetAC: number,
): number {
    // --- Weapon DPR ---
    let bestWeaponDPR = 0;
    const weapons = enemy.equipment?.weapons ?? [];
    for (const weapon of weapons) {
        if (!weapon.equipped) continue;

        const dice = weapon.damage?.dice ?? (weapon as any).damage_dice ?? '';
        if (!dice) continue;

        // Scaled mode always uses STR for damage (matches rollDamageScaled).
        // DND mode uses DEX for finesse/ranged weapons.
        const isFinesse = weapon.weaponProperties?.includes('finesse') ?? false;
        const isRanged = weapon.weaponProperties?.includes('ranged') ?? false;
        const abilityScore = hitMode === 'scaled'
            ? (enemy.ability_scores.STR ?? 10)
            : ((isRanged || isFinesse)
                ? (enemy.ability_scores.DEX ?? 10)
                : (enemy.ability_scores.STR ?? 10));

        // Attack bonus for damage scaling (delegated to engine)
        const weaponAttackBonus = AttackResolver.computeAttackBonus(
            enemy.ability_scores,
            weapon.weaponProperties ?? [],
            enemy.proficiency_bonus ?? 2,
        );

        const dpr = AttackResolver.estimateDPR({
            hitMode,
            level: enemy.level ?? 1,
            abilityScore,
            targetAC,
            damageDice: dice,
            proficiencyBonus: enemy.proficiency_bonus,
            attackBonus: weaponAttackBonus,
        });

        if (dpr > bestWeaponDPR) {
            bestWeaponDPR = dpr;
        }
    }

    // --- Spell DPR (cantrips and combat spells) ---
    let bestSpellDPR = 0;
    const combatSpells = enemy.combat_spells ?? [];
    for (const spell of combatSpells) {
        const tags = spell.tags ?? [];
        if (!tags.includes('damage') && !tags.includes('aoe')) continue;

        const isCantrip = (spell.level ?? 0) === 0;
        const damageFormula = spell.damage ?? spell.damage_dice ?? '';
        if (!damageFormula) continue;

        const normalized = damageFormula.replace(/\s/g, '').replace(/^d(\d+)/, '1d$1');
        let dpr: number;

        try {
            dpr = AttackResolver.estimateDPR({
                hitMode,
                level: enemy.level ?? 1,
                abilityScore: enemy.ability_scores.INT ?? 10,
                targetAC,
                damageDice: normalized,
                proficiencyBonus: enemy.proficiency_bonus,
            });
        } catch {
            continue;
        }

        if (tags.includes('aoe')) dpr *= 0.5;
        if (!isCantrip) dpr *= 0.3;

        if (dpr > bestSpellDPR) bestSpellDPR = dpr;
    }

    // --- Determine attack count ---
    let attackCount = 1;
    const legendaryActions = enemy.legendary_config?.actions ?? [];
    const damagingLegendaryActions = legendaryActions.filter(
        (action) => action.damage && action.tags?.includes('damage')
    );
    if (damagingLegendaryActions.length >= 2) {
        attackCount = 3;
    } else if (damagingLegendaryActions.length === 1 || weapons.length > 1) {
        attackCount = 2;
    }

    return Math.max(bestWeaponDPR, bestSpellDPR) * attackCount;
}

/**
 * Get the equipped weapon names from an enemy for display purposes.
 */
export function getEnemyWeaponNames(enemy: CharacterSheet): string[] {
    return (enemy.equipment?.weapons ?? [])
        .filter(w => w.equipped)
        .map(w => w.name);
}

/**
 * Format a stat range as "min–avg–max" (integers by default, or with decimals).
 * If min === max, just shows the single value.
 */
export function formatRange(range: { min: number; avg: number; max: number }, decimals = 0): string {
    const f = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    if (range.min === range.max) return f(range.avg);
    return `${f(range.min)}\u2013${f(range.avg)}\u2013${f(range.max)}`;
}
