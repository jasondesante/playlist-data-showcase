/**
 * DamageSpreadCalculator Component
 *
 * Shows the full damage distribution for a hero attacking a specific enemy.
 * For each possible d20 roll (1-20), displays:
 * - Whether it hits or misses (vs enemy AC)
 * - Damage dealt (weapon dice + modifier, doubled on crit)
 * - Probability (5% each, except natural 1 miss and natural 20 crit)
 *
 * Also runs a mini simulation (1000 rolls) to show the empirical distribution.
 */

import { useState, useMemo, useCallback, memo } from 'react';
import { Swords, ChevronRight, ChevronDown } from 'lucide-react';
import { AttackResolver, DiceRoller, type CharacterSheet, type AttackSimulationResult, type HitMode } from 'playlist-data-engine';
import './DamageSpreadCalculator.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DamageSpreadCalculatorProps {
    enemy: CharacterSheet;
    party: CharacterSheet[];
    hitMode?: HitMode;
}

interface WeaponOption {
    name: string;
    damageDice: string;
    damageType: string;
    attackBonus: number;
    damageModifier: number;
    type: 'melee' | 'ranged';
    properties: string[];
}

interface RollOutcome {
    d20Roll: number;
    totalRoll: number;
    hits: boolean;
    isCrit: boolean;
    isFumble: boolean;
    damageRange: { min: number; avg: number; max: number } | null;
    damageDice: string;
    label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calculate damage range (min, avg, max) using STR-based damage formula */
function calcDamageRange(
    weapon: WeaponOption,
    isCrit: boolean,
    attackerSTR: number,
    defenderAC: number,
): { min: number; avg: number; max: number } {
    const parsed = DiceRoller.parseDiceFormula(weapon.damageDice);
    const dice = isCrit ? parsed.diceCount * 2 : parsed.diceCount;

    const baseDamage = Math.max(0, attackerSTR - defenderAC);

    // Weapon bonus: small contribution from dice (1-3 depending on weapon size)
    const minPossible = dice;                           // all 1s
    const maxPossible = dice * parsed.diceSides;         // all max
    const avgRoll = (minPossible + maxPossible) / 2;

    const bonusMin = Math.max(1, Math.floor(minPossible / 4));
    const bonusAvg = Math.max(1, Math.floor(avgRoll / 4));
    const bonusMax = Math.max(1, Math.floor(maxPossible / 4));

    return {
        min: Math.max(1, baseDamage + bonusMin),
        avg: Math.max(1, baseDamage + bonusAvg),
        max: Math.max(1, baseDamage + bonusMax),
    };
}

/** Get weapons from a character sheet */
function getWeapons(character: CharacterSheet): WeaponOption[] {
    const weapons = character.equipment?.weapons?.filter(w => w.equipped) ?? [];
    if (weapons.length === 0) {
        // Unarmed strike
        const strMod = Math.floor((character.ability_scores.STR - 10) / 2);
        return [{
            name: 'Unarmed Strike',
            damageDice: '1d1',
            damageType: 'bludgeoning',
            attackBonus: strMod + character.proficiency_bonus,
            damageModifier: strMod,
            type: 'melee' as const,
            properties: [],
        }];
    }

    return weapons.map(w => {
        const isRanged = w.weaponProperties?.includes('ranged') || false;
        const isFinesse = w.weaponProperties?.includes('finesse') || false;
        const ability = isRanged || isFinesse ? 'DEX' : 'STR';
        const abilityMod = Math.floor((character.ability_scores[ability] - 10) / 2);

        return {
            name: w.name,
            damageDice: w.damage?.dice || '1d6',
            damageType: w.damage?.damageType || 'bludgeoning',
            attackBonus: abilityMod + character.proficiency_bonus,
            damageModifier: abilityMod,
            type: isRanged ? 'ranged' as const : 'melee' as const,
            properties: w.weaponProperties || [],
        };
    });
}

/** Run a mini simulation using the engine's AttackResolver.simulateAttacks */
function runMiniSim(
    attacker: CharacterSheet,
    target: CharacterSheet,
    weapon: WeaponOption,
    iterations: number,
    hitMode?: HitMode,
): AttackSimulationResult {
    const attack = {
        name: weapon.name,
        damage_dice: weapon.damageDice,
        attack_bonus: weapon.attackBonus,
        type: weapon.type,
        properties: weapon.properties,
    };

    const result = AttackResolver.simulateAttacks(attacker, target, attack, iterations, undefined, hitMode);

    // eslint-disable-next-line no-console
    console.log(`[DamageSpread] ${iterations} attack simulation — ${weapon.name} vs AC ${target.armor_class}`, {
        weapon: weapon.name,
        dice: weapon.damageDice,
        attackBonus: weapon.attackBonus,
        damageModifier: weapon.damageModifier,
        targetAC: target.armor_class,
        hitRate: result.hitRate,
        critRate: result.critRate,
        missRate: result.missRate,
        averageDamage: result.averageDamage,
        maxDamage: result.maxDamage,
        distribution: result.distribution.map(d => `${d.damage}: ${d.count} (${d.percentage.toFixed(1)}%)`),
    });

    return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

function DamageSpreadCalculatorComponent({ enemy, party, hitMode }: DamageSpreadCalculatorProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedHeroIdx, setSelectedHeroIdx] = useState(0);
    const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);

    const targetAC = enemy.armor_class;

    // Get weapons for selected hero
    const heroWeapons = useMemo(() => {
        if (!party[selectedHeroIdx]) return [];
        return getWeapons(party[selectedHeroIdx]);
    }, [party, selectedHeroIdx]);

    const selectedWeapon = heroWeapons[selectedWeaponIdx] ?? null;

    // Build the 20-roll spread table
    const rollOutcomes = useMemo((): RollOutcome[] => {
        if (!selectedWeapon) return [];
        const isScaled = hitMode !== 'dnd';
        const outcomes: RollOutcome[] = [];
        for (let d20 = 1; d20 <= 20; d20++) {
            const isCrit = DiceRoller.isCriticalHit(d20);
            const isFumble = DiceRoller.isCriticalMiss(d20);
            const totalRoll = d20 + selectedWeapon.attackBonus;
            const hits = isScaled
                ? !isFumble
                : isCrit || (!isFumble && totalRoll >= targetAC);
            const attackerSTR = party[selectedHeroIdx]?.ability_scores.STR ?? 10;
            const damageRange = hits ? calcDamageRange(selectedWeapon, isCrit, attackerSTR, targetAC) : null;
            let label: string;
            if (isCrit) {
                label = 'CRIT!';
            } else if (isFumble) {
                label = 'MISS!';
            } else if (isScaled && totalRoll < targetAC) {
                const deficit = targetAC - totalRoll;
                const scale = Math.max(10, 100 - deficit * 10);
                label = `Scaled ${scale.toFixed(0)}%`;
            } else if (hits) {
                label = 'Hit';
            } else {
                label = 'Miss';
            }
            outcomes.push({ d20Roll: d20, totalRoll, hits, isCrit, isFumble, damageRange, damageDice: selectedWeapon.damageDice, label });
        }
        return outcomes;
    }, [selectedWeapon, targetAC, hitMode]);

    // Stats
    const stats = useMemo(() => {
        if (rollOutcomes.length === 0) return null;
        const hitRolls = rollOutcomes.filter(r => r.hits);
        const hitChance = (hitRolls.length / 20) * 100;
        const avgDamage = rollOutcomes.reduce((sum, r) => sum + (r.damageRange?.avg ?? 0), 0) / 20;
        const maxDamage = Math.max(...rollOutcomes.map(r => r.damageRange?.max ?? 0));
        const minNonZeroDamage = Math.min(...rollOutcomes.filter(r => r.damageRange && r.damageRange.min > 0).map(r => r.damageRange!.min), maxDamage);
        const critRange = rollOutcomes.find(r => r.isCrit)?.damageRange ?? null;
        return { hitChance, avgDamage, maxDamage, minNonZeroDamage, critRange };
    }, [rollOutcomes]);

    // Mini simulation
    const [simResults, setSimResults] = useState<AttackSimulationResult | null>(null);
    const simIterations = 1000;

    const handleRunSim = useCallback(() => {
        if (!selectedWeapon || !party[selectedHeroIdx]) return;
        setSimResults(runMiniSim(party[selectedHeroIdx], enemy, selectedWeapon, simIterations, hitMode));
    }, [selectedWeapon, selectedHeroIdx, party, enemy]);

    // Reset weapon index when hero changes
    const handleHeroChange = useCallback((idx: number) => {
        setSelectedHeroIdx(idx);
        setSelectedWeaponIdx(0);
        setSimResults(null);
    }, []);

    if (party.length === 0) return null;

    return (
        <div className="dsc-container">
            <button
                className={`dsc-toggle ${isExpanded ? 'dsc-toggle-open' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
            >
                <Swords size={12} />
                <span className="dsc-toggle-label">Damage Spread</span>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>

            {isExpanded && (
                <div className="dsc-content">
                    {/* Hero + Weapon selectors */}
                    <div className="dsc-selectors">
                        <label className="dsc-label">
                            Hero
                            <select className="dsc-select" value={selectedHeroIdx} onChange={e => handleHeroChange(Number(e.target.value))}>
                                {party.map((p, i) => (
                                    <option key={p.name + i} value={i}>{p.name}</option>
                                ))}
                            </select>
                        </label>
                        {heroWeapons.length > 1 && (
                            <label className="dsc-label">
                                Weapon
                                <select className="dsc-select" value={selectedWeaponIdx} onChange={e => { setSelectedWeaponIdx(Number(e.target.value)); setSimResults(null); }}>
                                    {heroWeapons.map((w, i) => (
                                        <option key={w.name + i} value={i}>{w.name}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>

                    {selectedWeapon && (
                        <>
                            {/* Summary stats */}
                            {stats && (
                                <div className="dsc-stats">
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Target AC</span>
                                        <span className="dsc-stat-value">{targetAC}</span>
                                    </div>
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Attack Bonus</span>
                                        <span className="dsc-stat-value">+{selectedWeapon.attackBonus}</span>
                                    </div>
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Hit Chance</span>
                                        <span className="dsc-stat-value">{stats.hitChance.toFixed(0)}%</span>
                                    </div>
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Avg Damage/Roll</span>
                                        <span className="dsc-stat-value">{stats.avgDamage.toFixed(1)}</span>
                                    </div>
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Min Hit Dmg</span>
                                        <span className="dsc-stat-value">{stats.minNonZeroDamage}</span>
                                    </div>
                                    <div className="dsc-stat">
                                        <span className="dsc-stat-label">Max Crit Dmg</span>
                                        <span className="dsc-stat-value">{stats.critRange ? `${stats.critRange.min}–${stats.critRange.max}` : '—'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Roll spread table */}
                            <div className="dsc-table-wrapper">
                                <table className="dsc-table">
                                    <thead>
                                        <tr>
                                            <th>Roll</th>
                                            <th>Total</th>
                                            <th>AC {targetAC}</th>
                                            <th>Dmg Range</th>
                                            <th>Prob</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rollOutcomes.map(r => (
                                            <tr key={r.d20Roll} className={`dsc-row ${r.isCrit ? 'dsc-row-crit' : ''} ${r.isFumble ? 'dsc-row-fumble' : ''} ${!r.hits ? 'dsc-row-miss' : ''}`}>
                                                <td className="dsc-td-roll">{r.d20Roll}</td>
                                                <td className="dsc-td-total">{r.totalRoll}</td>
                                                <td className={`dsc-td-result ${r.hits ? 'dsc-hit' : 'dsc-miss'}`}>{r.label}</td>
                                                <td className="dsc-td-damage">{r.damageRange ? `${r.damageRange.min}–${r.damageRange.max}` : '—'}</td>
                                                <td className="dsc-td-prob">5%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mini simulation */}
                            <div className="dsc-sim">
                                <button className="dsc-sim-btn" onClick={handleRunSim} type="button">
                                    Run {simIterations.toLocaleString()} Attack Simulation
                                </button>
                                <div className="dsc-sim-label">Damage dealt per hit (0 = miss)</div>
                                {simResults && (
                                    <div className="dsc-sim-results">
                                        <div className="dsc-sim-bar-chart">
                                            {simResults.distribution.map(({ damage, count, percentage }) => (
                                                <div key={damage} className="dsc-sim-bar-row">
                                                    <span className="dsc-sim-bar-label">{damage}</span>
                                                    <div className="dsc-sim-bar-track">
                                                        <div
                                                            className="dsc-sim-bar-fill"
                                                            style={{ width: `${Math.max(percentage, 0.5)}%` }}
                                                            title={`${damage} dmg: ${count} times (${percentage.toFixed(1)}%)`}
                                                        />
                                                    </div>
                                                    <span className="dsc-sim-bar-pct">{percentage.toFixed(1)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export const DamageSpreadCalculator = memo(DamageSpreadCalculatorComponent);
export default DamageSpreadCalculator;
