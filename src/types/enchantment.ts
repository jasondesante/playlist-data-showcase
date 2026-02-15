/**
 * Enchantment Type Definitions
 *
 * Types and interfaces for the enchantment system UI.
 * These types categorize enchantments for display in the enchantment modal
 * and provide structured data for rendering enchantment options.
 */

import type { EquipmentModification } from 'playlist-data-engine';

/**
 * Categories of enchantments available in the system
 */
export type EnchantmentCategory = 'weapon' | 'armor' | 'resistance' | 'stat' | 'combo';

/**
 * Sub-categories within weapon enchantments
 */
export type WeaponEnchantmentType = 'enhancement' | 'elemental' | 'special';

/**
 * Sub-categories within curses
 */
export type CurseType = 'penalty' | 'stat_reduction' | 'vulnerability' | 'special';

/**
 * Rarity levels for enchantments (used for display styling)
 */
export type EnchantmentRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';

/**
 * Interface for enchantment display information in the UI
 */
export interface EnchantmentInfo {
    /** Unique identifier for the enchantment */
    id: string;
    /** Display name */
    name: string;
    /** Description for tooltip/display */
    description: string;
    /** Category for grouping in UI */
    category: EnchantmentCategory;
    /** Sub-type within category (optional) */
    subType?: WeaponEnchantmentType | CurseType | string;
    /** Rarity for styling */
    rarity: EnchantmentRarity;
    /** Icon/emoji for visual display */
    icon: string;
    /** Whether this is a negative effect (curse) */
    isCurse: boolean;
    /** The actual EquipmentModification object */
    modification: EquipmentModification;
}

/**
 * Grouped enchantments for UI display
 */
export interface EnchantmentGroup {
    /** Group display name */
    name: string;
    /** Group description */
    description: string;
    /** Category identifier */
    category: EnchantmentCategory;
    /** Enchantments in this group */
    enchantments: EnchantmentInfo[];
}

/**
 * Stat boost configuration for stat enchantment UI
 */
export interface StatBoostConfig {
    /** The stat being boosted */
    stat: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    /** The bonus amount (1-4) */
    bonus: 1 | 2 | 3 | 4;
}

/**
 * Curse info interface for curse display
 */
export interface CurseInfo extends EnchantmentInfo {
    /** Whether this curse locks the item (attunement) */
    locksItem: boolean;
    /** Warning message to display before applying */
    warningMessage: string;
}

/**
 * Weapon enchantment definitions for UI reference
 */
export const WEAPON_ENCHANTMENT_DEFINITIONS: Record<string, Omit<EnchantmentInfo, 'modification'>> = {
    // Enhancement enchantments
    plusOne: {
        id: 'plus_one',
        name: '+1 Enhancement',
        description: '+1 to attack and damage rolls',
        category: 'weapon',
        subType: 'enhancement',
        rarity: 'uncommon',
        icon: '⚔️',
        isCurse: false
    },
    plusTwo: {
        id: 'plus_two',
        name: '+2 Enhancement',
        description: '+2 to attack and damage rolls',
        category: 'weapon',
        subType: 'enhancement',
        rarity: 'rare',
        icon: '⚔️',
        isCurse: false
    },
    plusThree: {
        id: 'plus_three',
        name: '+3 Enhancement',
        description: '+3 to attack and damage rolls',
        category: 'weapon',
        subType: 'enhancement',
        rarity: 'very_rare',
        icon: '⚔️',
        isCurse: false
    },
    // Elemental enchantments
    flaming: {
        id: 'flaming',
        name: 'Flaming',
        description: '+1d6 fire damage on hit, sheds bright light',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '🔥',
        isCurse: false
    },
    frost: {
        id: 'frost',
        name: 'Frost',
        description: '+1d6 cold damage on hit',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '❄️',
        isCurse: false
    },
    shocking: {
        id: 'shocking',
        name: 'Shocking',
        description: '+1d6 lightning damage on hit',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '⚡',
        isCurse: false
    },
    thundering: {
        id: 'thundering',
        name: 'Thundering',
        description: '+1d6 thunder damage on hit, creates thunderous clap',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '🔊',
        isCurse: false
    },
    acidic: {
        id: 'acidic',
        name: 'Acidic',
        description: '+1d6 acid damage on hit',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '🧪',
        isCurse: false
    },
    poison: {
        id: 'poison',
        name: 'Poison',
        description: '+1d6 poison damage on hit',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '☠️',
        isCurse: false
    },
    holy: {
        id: 'holy',
        name: 'Holy',
        description: '+1d6 radiant damage on hit',
        category: 'weapon',
        subType: 'elemental',
        rarity: 'rare',
        icon: '✨',
        isCurse: false
    },
    // Special enchantments
    vampiric: {
        id: 'vampiric',
        name: 'Vampiric',
        description: 'Regain 1d6 HP when dealing damage',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '🩸',
        isCurse: false
    },
    vorpalEdge: {
        id: 'vorpal_edge',
        name: 'Vorpal Edge',
        description: 'Critical hits on 19-20',
        category: 'weapon',
        subType: 'special',
        rarity: 'very_rare',
        icon: '🗡️',
        isCurse: false
    },
    keenEdge: {
        id: 'keen_edge',
        name: 'Keen Edge',
        description: 'Critical hits on 18-20',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '🔪',
        isCurse: false
    },
    mighty: {
        id: 'mighty',
        name: 'Mighty',
        description: 'Weapon damage dice increased by one step',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '💪',
        isCurse: false
    },
    returning: {
        id: 'returning',
        name: 'Returning',
        description: 'Weapon returns to wielder\'s hand after being thrown',
        category: 'weapon',
        subType: 'special',
        rarity: 'uncommon',
        icon: '🔄',
        isCurse: false
    },
    lifestealing: {
        id: 'lifestealing',
        name: 'Lifestealing',
        description: 'Regain 2d6 HP when dealing damage',
        category: 'weapon',
        subType: 'special',
        rarity: 'very_rare',
        icon: '💀',
        isCurse: false
    }
};

/**
 * Armor enchantment definitions for UI reference
 */
export const ARMOR_ENCHANTMENT_DEFINITIONS: Record<string, Omit<EnchantmentInfo, 'modification'>> = {
    plusOne: {
        id: 'plus_one',
        name: '+1 Enhancement',
        description: '+1 Armor Class',
        category: 'armor',
        rarity: 'uncommon',
        icon: '🛡️',
        isCurse: false
    },
    plusTwo: {
        id: 'plus_two',
        name: '+2 Enhancement',
        description: '+2 Armor Class',
        category: 'armor',
        rarity: 'rare',
        icon: '🛡️',
        isCurse: false
    }
};

/**
 * Resistance enchantment definitions for UI reference
 */
export const RESISTANCE_ENCHANTMENT_DEFINITIONS: Record<string, Omit<EnchantmentInfo, 'modification'>> = {
    fire: {
        id: 'fire_resistance',
        name: 'Fire Resistance',
        description: 'Resistance to fire damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '🔥',
        isCurse: false
    },
    cold: {
        id: 'cold_resistance',
        name: 'Cold Resistance',
        description: 'Resistance to cold damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '❄️',
        isCurse: false
    },
    lightning: {
        id: 'lightning_resistance',
        name: 'Lightning Resistance',
        description: 'Resistance to lightning damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '⚡',
        isCurse: false
    },
    acid: {
        id: 'acid_resistance',
        name: 'Acid Resistance',
        description: 'Resistance to acid damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '🧪',
        isCurse: false
    },
    poison: {
        id: 'poison_resistance',
        name: 'Poison Resistance',
        description: 'Resistance to poison damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '☠️',
        isCurse: false
    },
    necrotic: {
        id: 'necrotic_resistance',
        name: 'Necrotic Resistance',
        description: 'Resistance to necrotic damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '💀',
        isCurse: false
    },
    radiant: {
        id: 'radiant_resistance',
        name: 'Radiant Resistance',
        description: 'Resistance to radiant damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '✨',
        isCurse: false
    },
    thunder: {
        id: 'thunder_resistance',
        name: 'Thunder Resistance',
        description: 'Resistance to thunder damage',
        category: 'resistance',
        rarity: 'uncommon',
        icon: '🔊',
        isCurse: false
    },
    all: {
        id: 'all_resistance',
        name: 'Universal Resistance',
        description: 'Resistance to all damage types',
        category: 'resistance',
        rarity: 'legendary',
        icon: '🌟',
        isCurse: false
    }
};

/**
 * Combo enchantment definitions for UI reference
 */
export const COMBO_ENCHANTMENT_DEFINITIONS: Record<string, Omit<EnchantmentInfo, 'modification'>> = {
    holyAvenger: {
        id: 'holy_avenger',
        name: 'Holy Avenger',
        description: '+3 enhancement, +2d6 radiant vs fiends/undead, +5 saves vs spells',
        category: 'combo',
        rarity: 'legendary',
        icon: '⚔️✨',
        isCurse: false
    },
    dragonSlayer: {
        id: 'dragon_slayer',
        name: 'Dragonslayer',
        description: '+2 enhancement, +3d6 damage vs dragons, fire resistance',
        category: 'combo',
        rarity: 'very_rare',
        icon: '🐉',
        isCurse: false
    },
    demonHunter: {
        id: 'demon_hunter',
        name: 'Demon Hunter',
        description: '+1 enhancement, +2d6 damage vs fiends',
        category: 'combo',
        rarity: 'rare',
        icon: '😈',
        isCurse: false
    },
    undeadBane: {
        id: 'undead_bane',
        name: 'Undead Bane',
        description: '+1 enhancement, +2d6 radiant damage vs undead',
        category: 'combo',
        rarity: 'rare',
        icon: '👻',
        isCurse: false
    }
};

/**
 * Curse definitions for UI reference
 */
export const CURSE_DEFINITIONS: Record<string, Omit<CurseInfo, 'modification'>> = {
    minusOne: {
        id: 'minus_one',
        name: '-1 Penalty',
        description: '-1 penalty to attack and damage rolls',
        category: 'weapon',
        subType: 'penalty',
        rarity: 'uncommon',
        icon: '📉',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will apply a -1 penalty to attack and damage rolls.'
    },
    minusTwo: {
        id: 'minus_two',
        name: '-2 Penalty',
        description: '-2 penalty to attack and damage rolls',
        category: 'weapon',
        subType: 'penalty',
        rarity: 'rare',
        icon: '📉',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will apply a -2 penalty to attack and damage rolls.'
    },
    weakness: {
        id: 'weakness',
        name: 'Weakness',
        description: '-4 Strength while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '💪',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Strength by 4 while equipped.'
    },
    feeblemind: {
        id: 'feeblemind',
        name: 'Feeblemind',
        description: '-4 Intelligence while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '🧠',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Intelligence by 4 while equipped.'
    },
    clumsiness: {
        id: 'clumsiness',
        name: 'Clumsiness',
        description: '-4 Dexterity while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '🤸',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Dexterity by 4 while equipped.'
    },
    frailty: {
        id: 'frailty',
        name: 'Frailty',
        description: '-4 Constitution while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '💔',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Constitution by 4 while equipped.'
    },
    foolishness: {
        id: 'foolishness',
        name: 'Foolishness',
        description: '-4 Wisdom while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '🤔',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Wisdom by 4 while equipped.'
    },
    repulsiveness: {
        id: 'repulsiveness',
        name: 'Repulsiveness',
        description: '-4 Charisma while equipped',
        category: 'weapon',
        subType: 'stat_reduction',
        rarity: 'rare',
        icon: '😬',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will reduce Charisma by 4 while equipped.'
    },
    fireVulnerability: {
        id: 'fire_vulnerability',
        name: 'Fire Vulnerability',
        description: 'Vulnerability to fire damage (double damage)',
        category: 'weapon',
        subType: 'vulnerability',
        rarity: 'rare',
        icon: '🔥',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause vulnerability to fire damage, doubling incoming fire damage.'
    },
    coldVulnerability: {
        id: 'cold_vulnerability',
        name: 'Cold Vulnerability',
        description: 'Vulnerability to cold damage (double damage)',
        category: 'weapon',
        subType: 'vulnerability',
        rarity: 'rare',
        icon: '❄️',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause vulnerability to cold damage, doubling incoming cold damage.'
    },
    lifesteal: {
        id: 'lifesteal',
        name: 'Lifesteal Curse',
        description: 'Wielder takes 1d4 necrotic damage when dealing damage',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '🩸',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause you to take 1d4 necrotic damage when dealing damage.'
    },
    attunement: {
        id: 'attunement',
        name: 'Attunement Lock',
        description: 'Once equipped, cannot be removed unless targeted by remove curse',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '🔒',
        isCurse: true,
        locksItem: true,
        warningMessage: '⚠️ WARNING: This will lock the item! Once equipped, you will NOT be able to unequip this item unless the curse is lifted.'
    },
    berserker: {
        id: 'berserker',
        name: 'Berserker',
        description: 'Must attack each round or take disadvantage on all attacks, +1 to attack/damage',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '😤',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will force you to attack each round or suffer disadvantage on all attacks. Grants +1 to attack/damage.'
    },
    heavyBurden: {
        id: 'heavy_burden',
        name: 'Heavy Burden',
        description: 'Equipment weight is doubled, -5 walking speed',
        category: 'weapon',
        subType: 'special',
        rarity: 'uncommon',
        icon: '🏋️',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will double the equipment weight and reduce walking speed by 5.'
    },
    lightSensitivity: {
        id: 'light_sensitivity',
        name: 'Light Sensitivity',
        description: 'Disadvantage on attacks and perception in bright light',
        category: 'weapon',
        subType: 'special',
        rarity: 'uncommon',
        icon: '☀️',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause disadvantage on attacks and perception in bright light.'
    },
    invisibility: {
        id: 'invisibility',
        name: 'Cursed Invisibility',
        description: 'Invisible while equipped, but disadvantage on attacks',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '👻',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will grant invisibility but cause disadvantage on all attacks while equipped.'
    },
    hallucinations: {
        id: 'hallucinations',
        name: 'Hallucinations',
        description: '25% chance each round to see enemies as allies and vice versa',
        category: 'weapon',
        subType: 'special',
        rarity: 'very_rare',
        icon: '🌀',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause hallucinations with 25% chance each round to confuse allies and enemies.'
    },
    bloodMoney: {
        id: 'blood_money',
        name: 'Blood Money',
        description: 'Wielder takes 1d4 damage when dealing damage to enemies',
        category: 'weapon',
        subType: 'special',
        rarity: 'rare',
        icon: '💰',
        isCurse: true,
        locksItem: false,
        warningMessage: 'This will cause you to take 1d4 damage when dealing damage to enemies.'
    }
};

/**
 * Stat boost display names and icons
 */
export const STAT_BOOST_INFO: Record<string, { name: string; icon: string; fullName: string }> = {
    STR: { name: 'Strength', icon: '💪', fullName: 'Strength' },
    DEX: { name: 'Dexterity', icon: '🤸', fullName: 'Dexterity' },
    CON: { name: 'Constitution', icon: '❤️', fullName: 'Constitution' },
    INT: { name: 'Intelligence', icon: '🧠', fullName: 'Intelligence' },
    WIS: { name: 'Wisdom', icon: '👁️', fullName: 'Wisdom' },
    CHA: { name: 'Charisma', icon: '😊', fullName: 'Charisma' }
};

/**
 * Create stat boost enchantment info
 */
export function createStatBoostEnchantmentInfo(stat: keyof typeof STAT_BOOST_INFO, bonus: 1 | 2 | 3 | 4): Omit<EnchantmentInfo, 'modification'> {
    const statInfo = STAT_BOOST_INFO[stat];
    const rarityMap: Record<number, EnchantmentRarity> = {
        1: 'uncommon',
        2: 'rare',
        3: 'very_rare',
        4: 'legendary'
    };

    return {
        id: `${stat.toLowerCase()}_boost_${bonus}`,
        name: `${statInfo.name} +${bonus}`,
        description: `+${bonus} ${statInfo.fullName}`,
        category: 'stat',
        rarity: rarityMap[bonus],
        icon: statInfo.icon,
        isCurse: false
    };
}
