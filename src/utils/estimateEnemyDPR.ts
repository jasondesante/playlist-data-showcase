import { AttackResolver, CharacterSheet, DEFAULT_EQUIPMENT } from 'playlist-data-engine';
import type { HitMode } from 'playlist-data-engine';

/**
 * Normalize a dice string to ensure it has a count prefix.
 * "d8" → "1d8", "2d6" → "2d6", "1d8" → "1d8"
 */
function normalizeDice(dice: string): string {
    if (!dice) return '';
    return dice.replace(/\s/g, '').replace(/^d(\d+)/, '1d$1');
}

/**
 * Resolve weapon dice from DEFAULT_EQUIPMENT, matching what
 * CombatEngine.buildAttackFromWeapon does in actual combat.
 * Falls back to the inventory item's own data, normalizing the format.
 */
function resolveWeaponDice(weapon: { name: string; damage?: any; damage_dice?: string }): string {
    const defaultData = DEFAULT_EQUIPMENT[weapon.name];
    if (defaultData?.damage?.dice) return defaultData.damage.dice;
    const raw = weapon.damage?.dice ?? weapon.damage_dice ?? '';
    return normalizeDice(raw);
}

/**
 * Resolve weapon properties from DEFAULT_EQUIPMENT.
 * Falls back to the inventory item's fields (which may be named
 * 'weaponProperties' or 'properties' depending on the source).
 */
function resolveWeaponProperties(weapon: { name: string; weaponProperties?: string[]; properties?: string[] }): string[] {
    const defaultData = DEFAULT_EQUIPMENT[weapon.name];
    if (defaultData?.weaponProperties) return defaultData.weaponProperties;
    return weapon.weaponProperties ?? weapon.properties ?? [];
}

/**
 * Compute the mathematical average (expected value) of a dice formula.
 *
 * Handles "2d6", "2d6+5", "1d8+3", etc. Does NOT roll dice — pure math.
 */
function averageDiceDamage(formula: string): number {
    if (!formula) return 0;
    const clean = formula.replace(/\s/g, '');
    const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return 0;
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    return count * (sides + 1) / 2 + modifier;
}

/**
 * Estimate the DPR of a single spell.
 *
 * Unlike weapon attacks, spells don't use the AC-based hit system:
 * - attack_roll spells: always deal damage (no miss check in the engine)
 * - save-based spells: damage on failed save only (estimated ~60% fail rate)
 * - Spells with neither: damage dice exists but is never applied (ignored)
 *
 * Also applies AoE multiplier for multi-target spells and a discount for
 * leveled spells (resource cost).
 */
function estimateSpellDPR(
    spell: { level?: number; damage?: string; damage_dice?: string; tags?: string[]; attack_roll?: boolean; saving_throw?: string; save?: string },
    targetCount: number,
): number {
    const tags = spell.tags ?? [];
    if (!tags.includes('damage') && !tags.includes('aoe')) return 0;

    const damageFormula = spell.damage ?? spell.damage_dice ?? '';
    if (!damageFormula) return 0;

    const normalized = damageFormula.replace(/\s/g, '').replace(/^d(\d+)/, '1d$1');
    const avgDamage = averageDiceDamage(normalized);
    if (avgDamage <= 0) return 0;

    const isCantrip = (spell.level ?? 0) === 0;
    const isAttackRoll = !!spell.attack_roll;
    const hasSave = !!(spell.saving_throw ?? spell.save);
    const isAOE = tags.includes('aoe');

    // Hit rate depends on spell type
    let hitRate: number;
    if (isAttackRoll) {
        // Attack roll spells always hit in the engine (no miss check)
        hitRate = 1.0;
    } else if (hasSave) {
        // Save-based spells: ~60% failure rate (rough estimate)
        hitRate = 0.6;
    } else {
        // No attack_roll or save — damage never applied in the engine
        return 0;
    }

    let dpr = avgDamage * hitRate;

    // AoE multiplier for expected total damage across targets
    if (isAOE && targetCount > 1) {
        dpr *= Math.min(targetCount, 4);
    }

    // Discount for leveled spells (resource cost, AI conserves them)
    if (!isCantrip) {
        dpr *= 0.5;
    }

    return dpr;
}

/**
 * Estimate enemy DPR by modeling the actual combat action economy.
 *
 * The AI makes ONE decision per turn: weapon attack OR spell cast.
 * Additionally, bosses with legendary_config get extra actions (always hit,
 * dice-based damage) that fire after other combatants' turns.
 *
 * @param enemy - A CharacterSheet representing an enemy
 * @param hitMode - Current hit mode ('scaled' or 'dnd')
 * @param targetAC - The AC of the target (party's average AC)
 * @param partySize - Number of party members (for AoE multiplier)
 * @returns Estimated damage per round
 */
export function estimateEnemyDPR(
    enemy: CharacterSheet,
    hitMode: HitMode,
    targetAC: number,
    partySize: number = 1,
): number {
    // --- Weapon DPR (uses AC-based hit system) ---
    let bestWeaponDPR = 0;
    const weapons = enemy.equipment?.weapons ?? [];
    for (const weapon of weapons) {
        if (!weapon.equipped) continue;

        // Resolve dice from DEFAULT_EQUIPMENT (matches buildAttackFromWeapon)
        const dice = resolveWeaponDice(weapon);
        if (!dice) continue;

        const wp = resolveWeaponProperties(weapon);
        const isFinesse = wp.includes('finesse');
        const isRanged = wp.includes('ranged');
        const abilityScore = hitMode === 'scaled'
            ? (enemy.ability_scores.STR ?? 10)
            : ((isRanged || isFinesse)
                ? (enemy.ability_scores.DEX ?? 10)
                : (enemy.ability_scores.STR ?? 10));

        const weaponAttackBonus = AttackResolver.computeAttackBonus(
            enemy.ability_scores,
            wp,
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

    // --- Spell DPR (uses spell mechanics, not AC-based) ---
    let bestSpellDPR = 0;
    const combatSpells = enemy.combat_spells ?? [];
    for (const spell of combatSpells) {
        const dpr = estimateSpellDPR(spell, partySize);
        if (dpr > bestSpellDPR) bestSpellDPR = dpr;
    }

    // Main action: AI picks the best damage option
    const mainActionDPR = Math.max(bestWeaponDPR, bestSpellDPR);

    // --- Legendary action DPR (always hits, dice-based) ---
    let legendaryDPR = 0;
    const legendaryActions = enemy.legendary_config?.actions ?? [];
    for (const action of legendaryActions) {
        if (!action.damage) continue;
        if (!action.tags?.includes('damage')) continue;

        // Legendary actions always deal damage (no hit check in the engine)
        const avgDamage = averageDiceDamage(action.damage.replace(/\s/g, ''));
        legendaryDPR += avgDamage;
    }

    return mainActionDPR + legendaryDPR;
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
