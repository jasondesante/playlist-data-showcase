/**
 * XP Formula Presets for Uncapped Progression
 *
 * Provides predefined XP progression curves for uncapped mode characters.
 * Each preset defines how XP requirements grow as characters level up beyond level 20.
 *
 * @see LevelUpProcessor.setUncappedConfig from playlist-data-engine
 * @see docs/engine/docs/XP_AND_STATS.md for formula details
 */

import type { XPFormulaPreset } from '../types';

/**
 * D&D 5e XP formula - Natural continuation beyond level 20
 *
 * Formula: XP(n) = XP(n-1) + (n-1) × n × 500
 * This continues the standard D&D 5e progression pattern naturally.
 *
 * Examples:
 * - Level 20: 355,000 XP (standard)
 * - Level 21: 565,000 XP (355000 + 20*21*500)
 * - Level 25: ~735,000 XP
 * - Level 30: ~1,120,000 XP
 */
const dnd5eXPFormula = (level: number): number => {
    // Pre-calculated values for levels 1-20 (D&D 5e official)
    const officialThresholds: Record<number, number> = {
        1: 0,
        2: 300,
        3: 900,
        4: 2700,
        5: 6500,
        6: 14000,
        7: 23000,
        8: 34000,
        9: 48000,
        10: 64000,
        11: 85000,
        12: 100000,
        13: 120000,
        14: 140000,
        15: 165000,
        16: 195000,
        17: 225000,
        18: 265000,
        19: 305000,
        20: 355000,
    };

    // For levels 1-20, use official values
    if (level <= 20 && officialThresholds[level] !== undefined) {
        return officialThresholds[level];
    }

    // For levels 21+, use continuation formula: XP(n) = XP(n-1) + (n-1) × n × 500
    // This continues the D&D 5e pattern naturally
    let totalXP = 355000; // Level 20
    for (let l = 21; l <= level; l++) {
        totalXP += (l - 1) * l * 500;
    }
    return totalXP;
};

/**
 * D&D 5e proficiency bonus formula
 * +1 every 4 levels starting at level 1
 */
const dnd5eProficiencyFormula = (level: number): number => {
    return 2 + Math.floor((level - 1) / 4);
};

/**
 * Linear XP formula - Consistent progression
 *
 * Formula: XP(level) = (level - 1) * 50000
 * Every level requires exactly 50,000 more XP than the previous.
 *
 * Examples:
 * - Level 5: 200,000 XP
 * - Level 10: 450,000 XP
 * - Level 20: 950,000 XP
 * - Level 30: 1,450,000 XP
 */
const linearXPFormula = (level: number): number => {
    return (level - 1) * 50000;
};

/**
 * Linear proficiency formula - +1 every 2 levels
 */
const linearProficiencyFormula = (level: number): number => {
    return 2 + Math.floor((level - 1) / 2);
};

/**
 * Exponential XP formula - Fast early, slow late
 *
 * Formula: XP(level) = floor(1000 * pow(1.5, level - 1))
 * Faster progression at low levels, slower at high levels.
 *
 * Examples:
 * - Level 5: ~5,062 XP
 * - Level 10: ~38,443 XP
 * - Level 20: ~2,225,844 XP
 * - Level 30: ~128,724,223 XP (gets very steep!)
 */
const exponentialXPFormula = (level: number): number => {
    return Math.floor(1000 * Math.pow(1.5, level - 1));
};

/**
 * Exponential proficiency formula - Based on square root
 */
const exponentialProficiencyFormula = (level: number): number => {
    return 2 + Math.floor(Math.sqrt(level));
};

/**
 * OSRS-Style XP formula - Steep curve at high levels
 *
 * Formula: XP(level) = floor(pow(level, 3) * 100)
 * Inspired by Old School RuneScape's exponential XP curve.
 *
 * Examples:
 * - Level 5: 12,500 XP
 * - Level 10: 100,000 XP
 * - Level 20: 800,000 XP
 * - Level 30: 2,700,000 XP
 */
const osrsXPFormula = (level: number): number => {
    return Math.floor(Math.pow(level, 3) * 100);
};

/**
 * OSRS proficiency formula - +1 every 10 levels
 */
const osrsProficiencyFormula = (level: number): number => {
    return 2 + Math.floor(level / 10);
};

/**
 * XP Formula Presets Array
 *
 * Contains all available XP progression presets for uncapped mode.
 * Each preset includes:
 * - id: Unique identifier for storage/reference
 * - name: Display name for UI
 * - description: Short explanation of the progression style
 * - xpFormula: Function that returns total XP required for a given level
 * - proficiencyFormula: Function that returns proficiency bonus for a given level
 * - chartColor: CSS color for chart visualization
 */
export const XP_FORMULA_PRESETS: XPFormulaPreset[] = [
    {
        id: 'dnd5e',
        name: 'D&D 5e (Default)',
        description: 'Natural continuation of D&D 5e progression',
        xpFormula: dnd5eXPFormula,
        proficiencyFormula: dnd5eProficiencyFormula,
        chartColor: '#8b5cf6', // Purple
    },
    {
        id: 'linear',
        name: 'Linear',
        description: '50,000 XP per level - consistent progression',
        xpFormula: linearXPFormula,
        proficiencyFormula: linearProficiencyFormula,
        chartColor: '#3b82f6', // Blue
    },
    {
        id: 'exponential',
        name: 'Exponential',
        description: 'Faster at low levels, slower at high levels',
        xpFormula: exponentialXPFormula,
        proficiencyFormula: exponentialProficiencyFormula,
        chartColor: '#10b981', // Green
    },
    {
        id: 'osrs',
        name: 'OSRS-Style',
        description: 'Old School RuneScape - steep curve at high levels',
        xpFormula: osrsXPFormula,
        proficiencyFormula: osrsProficiencyFormula,
        chartColor: '#f59e0b', // Amber
    },
];

/**
 * Get a preset by its ID
 */
export const getXPFormulaPresetById = (id: string): XPFormulaPreset | undefined => {
    return XP_FORMULA_PRESETS.find((preset) => preset.id === id);
};

/**
 * Default preset ID (D&D 5e)
 */
export const DEFAULT_XP_FORMULA_PRESET_ID = 'dnd5e';
