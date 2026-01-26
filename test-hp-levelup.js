/**
 * Test Script: Verify HP increases every level
 *
 * This script tests that HP increases correctly on EVERY level-up,
 * not just at stat increase levels (4, 8, 12, 16, 19).
 *
 * Run with: node test-hp-levelup.js
 */

import { CharacterGenerator, CharacterUpdater, StatManager } from 'playlist-data-engine';

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
    if (!condition) {
        log(`❌ FAILED: ${message}`, 'red');
        return false;
    }
    log(`✓ PASSED: ${message}`, 'green');
    return true;
}

log('\n═══════════════════════════════════════════════════════════════', 'cyan');
log('TEST: HP Increases Every Level', 'cyan');
log('═══════════════════════════════════════════════════════════════\n', 'cyan');

// Create a stat manager for uncapped mode (auto-apply stats)
const statManager = new StatManager({ strategy: 'primary_only' });
const updater = new CharacterUpdater(statManager);

// Test 1: Generate a Fighter (d10 hit die) in uncapped mode
log('Test 1: Generate Fighter (d10 hit die) - Uncapped Mode', 'yellow');

// Create a mock audio profile (required by CharacterGenerator)
const mockAudioProfile = {
    bass_dominance: 0.5,
    mid_dominance: 0.3,
    treble_dominance: 0.2,
    average_amplitude: 0.5,
    tempo_bpm: 120,
    key_signature: 'C',
    mode: 'major'
};

const fighter = CharacterGenerator.generate('test-seed-1', mockAudioProfile, 'TestFighter', {
    gameMode: 'uncapped',
    class: 'Fighter'
});

const initialHP = fighter.hp.max;
log(`  Initial HP at level 1: ${initialHP}`, 'blue');

// Test HP increases across levels 1-10
let allTestsPassed = true;
const hpIncreases = [];
let currentCharacter = fighter;

for (let level = 2; level <= 10; level++) {
    // Add enough XP to reach this level
    const xpNeeded = 1000 * (level - 1); // Simplified XP calculation
    const result = updater.addXP(currentCharacter, xpNeeded, 'test');

    if (result.leveledUp && result.levelUpDetails) {
        const levelUpDetail = result.levelUpDetails.find(d => d.toLevel === level);
        if (levelUpDetail) {
            const hpIncrease = levelUpDetail.hpIncrease;
            const newHP = levelUpDetail.newMaxHP;
            hpIncreases.push({ level, hpIncrease, newHP });

            // Verify HP increased
            const passed = assert(
                hpIncrease > 0,
                `Level ${level}: HP increased by ${hpIncrease} (total: ${newHP})`
            );

            if (!passed) allTestsPassed = false;

            currentCharacter = result.character;
        }
    }
}

log('\nHP Increase Summary:', 'yellow');
hpIncreases.forEach(({ level, hpIncrease, newHP }) => {
    log(`  Level ${level}: +${hpIncrease} HP → ${newHP} total`, 'blue');
});

// Test 2: Standard mode - verify HP still increases at non-stat levels
log('\n\nTest 2: Standard Mode - HP increases at ALL levels', 'yellow');
const standardFighter = CharacterGenerator.generate('test-seed-2', mockAudioProfile, 'StdFighter', {
    gameMode: 'standard',
    class: 'Fighter'
});

const standardInitialHP = standardFighter.hp.max;
log(`  Initial HP at level 1: ${standardInitialHP}`, 'blue');

const standardHpIncreases = [];
let standardCharacter = standardFighter;

// Test levels 2-7 (includes stat level at 4, non-stat levels at 2,3,5,6,7)
for (let level = 2; level <= 7; level++) {
    const xpNeeded = 1000 * (level - 1);
    const result = updater.addXP(standardCharacter, xpNeeded, 'test');

    if (result.leveledUp && result.levelUpDetails) {
        const levelUpDetail = result.levelUpDetails.find(d => d.toLevel === level);
        if (levelUpDetail) {
            const hpIncrease = levelUpDetail.hpIncrease;
            const newHP = levelUpDetail.newMaxHP;
            standardHpIncreases.push({ level, hpIncrease, newHP });

            const isStatLevel = [4, 8, 12, 16, 19].includes(level);
            const levelType = isStatLevel ? 'STAT LEVEL' : 'Regular level';

            // HP should increase regardless of stat increase level
            const passed = assert(
                hpIncrease > 0,
                `Level ${level} (${levelType}): HP increased by ${hpIncrease} (total: ${newHP})`
            );

            if (!passed) allTestsPassed = false;

            standardCharacter = result.character;
        }
    }
}

log('\nStandard Mode HP Increase Summary:', 'yellow');
standardHpIncreases.forEach(({ level, hpIncrease, newHP }) => {
    const isStatLevel = [4, 8, 12, 16, 19].includes(level);
    const levelType = isStatLevel ? ' [STAT]' : '';
    log(`  Level ${level}${levelType}: +${hpIncrease} HP → ${newHP} total`, 'blue');
});

// Test 3: Verify different class hit dice
log('\n\nTest 3: Different Class Hit Dice', 'yellow');

const classes = [
    { name: 'Wizard', hitDie: 6 },
    { name: 'Rogue', hitDie: 8 },
    { name: 'Fighter', hitDie: 10 },
    { name: 'Barbarian', hitDie: 12 }
];

for (const classInfo of classes) {
    const char = CharacterGenerator.generate(`seed-${classInfo.name}`, mockAudioProfile, classInfo.name, {
        class: classInfo.name,
        gameMode: 'uncapped'
    });

    const initialHP = char.hp.max;
    const result = updater.addXP(char, 1000, 'test');

    if (result.leveledUp && result.levelUpDetails) {
        const levelUpDetail = result.levelUpDetails[0];
        const hpIncrease = levelUpDetail.hpIncrease;

        // HP increase should be at least 1 (CON mod could make it higher)
        const passed = assert(
            hpIncrease >= 1 && hpIncrease <= classInfo.hitDie + 5, // max reasonable with CON mod
            `${classInfo.name} (d${classInfo.hitDie}): HP increase ${hpIncrease} is reasonable`
        );

        if (!passed) allTestsPassed = false;
    }
}

// Final summary
log('\n═══════════════════════════════════════════════════════════════', 'cyan');
if (allTestsPassed) {
    log('✓ ALL TESTS PASSED', 'green');
    log('HP increases correctly on EVERY level-up, not just stat increase levels.', 'green');
} else {
    log('✗ SOME TESTS FAILED', 'red');
    log('HP may not be increasing correctly on all level-ups.', 'red');
}
log('═══════════════════════════════════════════════════════════════\n', 'cyan');
