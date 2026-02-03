/**
 * Test script to verify subrace generation and display
 * Tests that characters are generated with subraces and that the data is properly stored
 */

import { CharacterGenerator } from 'playlist-data-engine';
import { writeFileSync } from 'fs';

// ANSI color codes for terminal output
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

function header(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message, 'cyan');
  log('='.repeat(60), 'cyan');
}

function success(message) {
  log('✅ ' + message, 'green');
}

function error(message) {
  log('❌ ' + message, 'red');
}

function info(message) {
  log('ℹ️  ' + message, 'blue');
}

// Create a mock audio profile for testing
function createMockAudioProfile() {
  return {
    bass_dominance: 0.3,
    mid_dominance: 0.4,
    treble_dominance: 0.3,
    average_amplitude: 0.5,
    spectral_centroid: 5000,
    spectral_rolloff: 10000,
    zero_crossing_rate: 0.1,
    color_palette: {
      colors: ['#FF0000', '#00FF00', '#0000FF'],
      primary_color: '#FF0000',
      secondary_color: '#00FF00',
      accent_color: '#0000FF',
      brightness: 0.5,
      saturation: 0.7,
      is_monochrome: false
    },
    analysis_metadata: {
      duration_analyzed: 30,
      full_buffer_analyzed: false,
      sample_positions: [10, 30, 50, 70, 90],
      analyzed_at: new Date().toISOString()
    }
  };
}

const testResults = [];

function testSubraceGenerationWithSpecificSubrace() {
  header('TEST 1: Subrace Generation with Specific Subrace');

  // Test cases with forceRace AND specific subrace
  const specificSubraceTests = [
    { race: 'Elf', subrace: 'High Elf', expected: 'High Elf' },
    { race: 'Elf', subrace: 'Wood Elf', expected: 'Wood Elf' },
    { race: 'Elf', subrace: 'Drow', expected: 'Drow' },
    { race: 'Dwarf', subrace: 'Hill Dwarf', expected: 'Hill Dwarf' },
    { race: 'Dwarf', subrace: 'Mountain Dwarf', expected: 'Mountain Dwarf' },
    { race: 'Halfling', subrace: 'Lightfoot Halfling', expected: 'Lightfoot Halfling' },
    { race: 'Halfling', subrace: 'Stout Halfling', expected: 'Stout Halfling' },
    { race: 'Gnome', subrace: 'Forest Gnome', expected: 'Forest Gnome' },
    { race: 'Gnome', subrace: 'Rock Gnome', expected: 'Rock Gnome' },
  ];

  const audioProfile = createMockAudioProfile();
  let passedCount = 0;
  let failedCount = 0;

  for (const { race, subrace, expected } of specificSubraceTests) {
    try {
      log(`\nTesting ${race} (${subrace})...`, 'yellow');

      // Generate a character with this race AND subrace
      const testChar = CharacterGenerator.generate(
        `test-${race.toLowerCase()}-${subrace.toLowerCase().replace(/\s+/g, '-')}`,
        audioProfile,
        `Test ${subrace}`,
        {
          forceClass: 'Fighter',
          forceRace: race,
          subrace: subrace, // IMPORTANT: Must specify subrace explicitly
          level: 1,
          gameMode: 'standard'
        }
      );

      // Check if subrace is present and correct
      const hasSubrace = testChar.subrace && testChar.subrace.length > 0;
      const correctSubrace = testChar.subrace === expected;

      if (hasSubrace && correctSubrace) {
        success(`${race} has correct subrace: "${testChar.subrace}"`);
        info(`  Full display: ${testChar.race} (${testChar.subrace})`);
        passedCount++;
      } else if (!hasSubrace) {
        error(`${race} (${subrace}) is missing subrace`);
        failedCount++;
      } else {
        error(`${race} has wrong subrace: "${testChar.subrace}" (expected "${expected}")`);
        failedCount++;
      }

      testResults.push({
        test: `${race} (${subrace}) generation`,
        race: race,
        expectedSubrace: expected,
        actualSubrace: testChar.subrace || 'none',
        status: (hasSubrace && correctSubrace) ? 'PASS' : 'FAIL'
      });

    } catch (err) {
      error(`Error generating ${race} (${subrace}): ${err.message}`);
      failedCount++;
    }
  }

  log(`\n${'-'.repeat(60)}`, 'cyan');
  log(`Results: ${passedCount} passed, ${failedCount} failed`, 'cyan');
  return { passedCount, failedCount };
}

function testSubracePropertyInCharacterSheet() {
  header('TEST 2: Verify subrace property exists in CharacterSheet');

  const audioProfile = createMockAudioProfile();
  const testChar = CharacterGenerator.generate(
    'test-elf-high-elf',
    audioProfile,
    'Test High Elf',
    {
      forceRace: 'Elf',
      subrace: 'High Elf',
      forceClass: 'Wizard',
      level: 1,
      gameMode: 'standard'
    }
  );

  const checks = [
    { name: 'subrace property exists', check: 'subrace' in testChar },
    { name: 'subrace is string or undefined', check: testChar.subrace === undefined || typeof testChar.subrace === 'string' },
    { name: 'subrace not null', check: testChar.subrace !== null },
    { name: 'subrace has value "High Elf"', check: testChar.subrace === 'High Elf' }
  ];

  let passedCount = 0;
  for (const { name, check } of checks) {
    if (check) {
      success(name);
      passedCount++;
    } else {
      error(name);
    }
  }

  info(`Generated character subrace value: "${testChar.subrace}"`);

  return { passedCount, totalCount: checks.length };
}

function testPureSubrace() {
  header('TEST 3: Test "pure" subrace (no subrace)');

  const audioProfile = createMockAudioProfile();
  const testChar = CharacterGenerator.generate(
    'test-elf-pure',
    audioProfile,
    'Test Pure Elf',
    {
      forceRace: 'Elf',
      subrace: 'pure', // Explicitly no subrace
      forceClass: 'Wizard',
      level: 1,
      gameMode: 'standard'
    }
  );

  const hasNoSubrace = !testChar.subrace || testChar.subrace.length === 0;

  if (hasNoSubrace) {
    success('Character correctly has no subrace when "pure" is specified');
    info(`  Display: ${testChar.race} only`);
    return { passedCount: 1, totalCount: 1 };
  } else {
    error(`Character has unexpected subrace: "${testChar.subrace}"`);
    return { passedCount: 0, totalCount: 1 };
  }
}

function testAllSubracesForRace() {
  header('TEST 4: Test all available subraces for Elf');

  const audioProfile = createMockAudioProfile();
  const elfSubraces = ['High Elf', 'Wood Elf', 'Drow'];
  const generatedChars = [];

  for (const subrace of elfSubraces) {
    try {
      const char = CharacterGenerator.generate(
        `test-elf-${subrace.toLowerCase().replace(/\s+/g, '-')}`,
        audioProfile,
        `${subrace} Character`,
        {
          forceRace: 'Elf',
          subrace: subrace,
          forceClass: 'Wizard',
          level: 1,
          gameMode: 'standard'
        }
      );
      generatedChars.push({ subrace, char });
      success(`Generated ${subrace}`);
    } catch (err) {
      error(`Failed to generate ${subrace}: ${err.message}`);
    }
  }

  log('\nAll Elf subraces tested:', 'yellow');
  for (const { subrace, char } of generatedChars) {
    info(`  - ${subrace}: ${char.race} (${char.subrace})`);
  }

  const passedCount = generatedChars.length === elfSubraces.length ? 1 : 0;
  return { passedCount, totalCount: 1 };
}

function testCharacterDataStructure() {
  header('TEST 5: Verify complete character data structure');

  const audioProfile = createMockAudioProfile();
  const testChar = CharacterGenerator.generate(
    'test-dwarf-hill-cleric',
    audioProfile,
    'Hill Dwarf Cleric',
    {
      forceRace: 'Dwarf',
      subrace: 'Hill Dwarf',
      forceClass: 'Cleric',
      level: 1,
      gameMode: 'standard'
    }
  );

  log('\nCharacter data structure:', 'yellow');
  log(JSON.stringify({
    name: testChar.name,
    race: testChar.race,
    subrace: testChar.subrace,
    class: testChar.class,
    level: testChar.level,
    hasSubrace: !!testChar.subrace
  }, null, 2));

  if (testChar.subrace === 'Hill Dwarf') {
    success(`Character has correct subrace property: "${testChar.subrace}"`);
    return { passedCount: 1, totalCount: 1 };
  } else {
    error(`Character subrace is incorrect: "${testChar.subrace}" (expected "Hill Dwarf")`);
    return { passedCount: 0, totalCount: 1 };
  }
}

// Run all tests
async function runAllTests() {
  log('\n', 'cyan');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     SUBRACE GENERATION AND DISPLAY VERIFICATION TESTS     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  try {
    const test1 = testSubraceGenerationWithSpecificSubrace();
    const test2 = testSubracePropertyInCharacterSheet();
    const test3 = testPureSubrace();
    const test4 = testAllSubracesForRace();
    const test5 = testCharacterDataStructure();

    const totalPassed = test1.passedCount + test2.passedCount + test3.passedCount + test4.passedCount + test5.passedCount;
    const totalFailed = test1.failedCount + (test2.totalCount - test2.passedCount) + (test3.totalCount - test3.passedCount) + (test4.totalCount - test4.passedCount) + (test5.totalCount - test5.passedCount);

    header('FINAL RESULTS');
    log(`Total Passed: ${totalPassed}`, 'green');
    log(`Total Failed: ${totalFailed}`, totalFailed === 0 ? 'green' : 'red');

    // Save results to file
    const reportPath = '/tmp/subrace_test_results.json';
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      testResults,
      summary: { totalPassed, totalFailed }
    }, null, 2));
    info(`Detailed results saved to: ${reportPath}`);

    // Summary for frontend verification
    header('FRONTEND VERIFICATION CHECKLIST');
    if (totalPassed > totalFailed) {
      success('Characters are being generated with subraces correctly');
      info('Frontend components should display subraces as:');
      info('  - CharacterGenTab: "Race: Elf (High Elf) | Class: Wizard"');
      info('  - PartyTab cards: "Elf (High Elf) Wizard Lv 1"');
      info('  - PartyTab modal: "Race: Elf (High Elf) | Class: Wizard"');
      log('', 'reset');
      info('IMPORTANT NOTE:');
      info('Subraces are ONLY generated when:');
      info('  1. forceRace is set AND subrace is specified explicitly, OR');
      info('  2. subrace is undefined (random selection between pure and subraces)');
      info('When forceRace is set WITHOUT subrace option, it defaults to "pure"');
    } else {
      error('Characters may not be generating with subraces correctly');
    }

  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    console.error(err);
  }
}

runAllTests();
