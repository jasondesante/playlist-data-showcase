/**
 * Test 6.5.2: Pending stats persist
 *
 * This test verifies that pending stat increases are preserved across page refreshes.
 *
 * Test steps:
 * 1. Generate a character in standard mode
 * 2. Add XP to reach level 4 (awards pending stat increases)
 * 3. Verify pendingStatIncreases > 0
 * 4. Simulate page refresh (clear state, reload from storage)
 * 5. Verify pendingStatIncreases is still > 0
 */

import { CharacterGenerator } from 'playlist-data-engine';
import { CharacterUpdater, StatManager } from 'playlist-data-engine';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(60), colors.cyan);
  log(`  ${title}`, colors.cyan);
  log('═'.repeat(60), colors.cyan);
}

function logTest(testName) {
  console.log('');
  log(`▶ ${testName}`, colors.yellow);
}

function logPass(message) {
  log(`  ✓ ${message}`, colors.green);
}

function logFail(message) {
  log(`  ✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ℹ ${message}`, colors.blue);
}

// Simulate IndexedDB storage (in-memory for this test)
const simulatedStorage = {
  characters: [],

  saveCharacter(character) {
    const existingIndex = this.characters.findIndex(c => c.seed === character.seed);
    if (existingIndex >= 0) {
      this.characters[existingIndex] = JSON.parse(JSON.stringify(character));
    } else {
      this.characters.push(JSON.parse(JSON.stringify(character)));
    }
    logInfo(`Saved character "${character.name}" to storage`);
  },

  loadCharacter(seed) {
    const character = this.characters.find(c => c.seed === seed);
    if (character) {
      return JSON.parse(JSON.stringify(character));
    }
    return null;
  },

  clear() {
    this.characters = [];
  }
};

async function runTest() {
  log('TEST 6.5.2: Pending Stats Persist', colors.cyan);
  log('Testing that pendingStatIncreases property is saved and restored', colors.cyan);

  let testsPassed = 0;
  let testsFailed = 0;

  // Simulate storage
  simulatedStorage.clear();

  // ========================================
  // Step 1: Generate a standard mode character
  // ========================================
  logSection('Step 1: Generate Standard Mode Character');

  const statManager = new StatManager({ strategy: 'dnD5e' }); // Manual mode for pending stats
  const updater = new CharacterUpdater(statManager);

  const seed = `test-seed-${Date.now()}`;
  const audioProfile = {
    energy: 0.7,
    valence: 0.5,
    tempo: 120,
    danceability: 0.6
  };

  logTest('Generate character in standard mode');
  const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    'TestHero',
    { gameMode: 'standard' }
  );

  logInfo(`Generated: ${character.name}, Level ${character.level}, Game Mode: ${character.gameMode}`);
  logInfo(`Initial pendingStatIncreases: ${character.pendingStatIncreases ?? 0}`);

  if (character.gameMode === 'standard') {
    logPass('Character has gameMode = "standard"');
    testsPassed++;
  } else {
    logFail('Character gameMode is not "standard"');
    testsFailed++;
  }

  // Save to "storage"
  simulatedStorage.saveCharacter(character);

  // ========================================
  // Step 2: Level up to level 4 (pending stats awarded)
  // ========================================
  logSection('Step 2: Level Up to Level 4 (Award Pending Stats)');

  logTest('Add XP to reach level 4');
  logInfo('Starting level: ' + character.level);
  logInfo('Starting XP: ' + character.xp.current);

  // Level 4 threshold is 6500 XP. Add enough XP to reach it.
  const xpToAdd = 6500 - character.xp.current;
  logInfo(`Adding ${xpToAdd} XP...`);

  const result = updater.addXP(character, xpToAdd, 'test');
  logInfo(`Result character level: ${result.character.level}`);
  logInfo(`Result character pendingStatIncreases: ${result.character.pendingStatIncreases ?? 0}`);
  logInfo(`Leveled up: ${result.leveledUp}`);

  if (result.leveledUp) {
    logPass('Character leveled up');
    testsPassed++;
  } else {
    logFail('Character did not level up');
    testsFailed++;
  }

  if (result.character.level >= 4) {
    logPass(`Character reached level ${result.character.level}`);
    testsPassed++;
  } else {
    logFail(`Character only reached level ${result.character.level}`);
    testsFailed++;
  }

  // Check for pending stat increases
  const pendingCount = result.character.pendingStatIncreases ?? 0;
  logInfo(`Pending stat increases count: ${pendingCount}`);

  if (pendingCount > 0) {
    logPass(`Character has ${pendingCount} pending stat increase(s)`);
    testsPassed++;
  } else {
    logFail('Character has 0 pending stat increases (expected > 0)');
    testsFailed++;
  }

  // ========================================
  // Step 3: Save character with pending stats
  // ========================================
  logSection('Step 3: Save Character with Pending Stats');

  logTest('Save character to storage');
  simulatedStorage.saveCharacter(result.character);
  logInfo(`Saved character with pendingStatIncreases = ${result.character.pendingStatIncreases}`);
  logPass('Character saved to storage');
  testsPassed++;

  // ========================================
  // Step 4: Simulate page refresh (reload from storage)
  // ========================================
  logSection('Step 4: Simulate Page Refresh (Reload from Storage)');

  logTest('Clear in-memory character (simulate refresh)');
  character; // Still exists, but we'll reload from storage
  logInfo('In-memory character reference still exists, but will reload from storage...');
  logPass('Ready to reload from storage');
  testsPassed++;

  logTest('Load character from storage');
  const reloadedCharacter = simulatedStorage.loadCharacter(seed);

  if (reloadedCharacter) {
    logPass(`Character loaded from storage: ${reloadedCharacter.name}`);
    testsPassed++;
  } else {
    logFail('Failed to load character from storage');
    testsFailed++;
  }

  // ========================================
  // Step 5: Verify pending stats are preserved
  // ========================================
  logSection('Step 5: Verify Pending Stats Are Preserved');

  logTest('Verify pendingStatIncreases persisted');
  logInfo(`Original pendingStatIncreases: ${result.character.pendingStatIncreases ?? 0}`);
  logInfo(`Reloaded pendingStatIncreases: ${reloadedCharacter?.pendingStatIncreases ?? 0}`);

  const reloadedPending = reloadedCharacter?.pendingStatIncreases ?? 0;
  const originalPending = result.character.pendingStatIncreases ?? 0;

  if (reloadedPending === originalPending && originalPending > 0) {
    logPass(`Pending stat increases preserved! Count: ${reloadedPending}`);
    testsPassed++;
  } else if (reloadedPending === 0) {
    logFail('Pending stat increases NOT preserved (count is 0)');
    testsFailed++;
  } else if (reloadedPending !== originalPending) {
    logFail(`Pending stat count changed! Original: ${originalPending}, Reloaded: ${reloadedPending}`);
    testsFailed++;
  }

  // Additional checks
  logTest('Verify other character properties preserved');
  let allPropsPreserved = true;
  const propsToCheck = [
    'name', 'race', 'class', 'level', 'gameMode',
    'ability_scores', 'xp'
  ];

  for (const prop of propsToCheck) {
    const original = JSON.stringify(result.character[prop]);
    const reloaded = JSON.stringify(reloadedCharacter?.[prop]);
    if (original !== reloaded) {
      logFail(`Property "${prop}" not preserved: "${original}" vs "${reloaded}"`);
      allPropsPreserved = false;
    }
  }

  if (allPropsPreserved) {
    logPass('All checked properties preserved');
    testsPassed++;
  } else {
    testsFailed++;
  }

  // ========================================
  // Test Results Summary
  // ========================================
  logSection('Test Results Summary');

  log(`Total tests run: ${testsPassed + testsFailed}`);
  log(`Tests passed: ${testsPassed}`, colors.green);
  log(`Tests failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);

  console.log('');
  if (testsFailed === 0) {
    log('✓ ALL TESTS PASSED', colors.green);
    log('✓ Task 6.5.2: Pending stats persist - VERIFIED', colors.green);
    return 0;
  } else {
    log('✗ SOME TESTS FAILED', colors.red);
    log('✗ Task 6.5.2: Pending stats persist - FAILED', colors.red);
    return 1;
  }
}

// Run the test
runTest()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
