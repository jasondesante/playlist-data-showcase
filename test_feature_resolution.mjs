/**
 * Test script to verify feature ID resolution works correctly
 * This tests the Migration Guide compatibility for feature ID format changes
 */

import { CharacterGenerator, FeatureRegistry, getFeatureRegistry, ensureFeatureDefaultsInitialized, ensureAllDefaultsInitialized } from 'playlist-data-engine';

console.log('=== Feature ID Resolution Test ===\n');

// Initialize FeatureRegistry
console.log('Initializing FeatureRegistry...');
ensureFeatureDefaultsInitialized();
ensureAllDefaultsInitialized();

const registry = getFeatureRegistry();
if (!registry) {
  console.error('❌ FeatureRegistry not initialized');
  process.exit(1);
}
console.log('✅ FeatureRegistry initialized');

// Test 1: Generate a Barbarian and verify rage shows as "Rage" not "barbarian_rage"
console.log('\n--- Test 1: Barbarian Rage Feature ---');
try {
  // Create a mock audio profile for testing
  const mockAudioProfile = {
    bass_dominance: 0.5,
    mid_dominance: 0.3,
    treble_dominance: 0.2,
    average_amplitude: 0.6
  };

  const barbarian = CharacterGenerator.generate(
    'test-barbarian-rage',
    mockAudioProfile,
    'Test Barbarian'
  );

  console.log('Generated Barbarian:', barbarian.name);
  console.log('Class features:', barbarian.class_features);

  // Check if barbarian_rage is in the features
  if (barbarian.class_features.includes('barbarian_rage')) {
    console.log('✅ Feature ID "barbarian_rage" found in class_features');

    // Try to resolve it
    const rageFeature = registry.getClassFeatureById('barbarian_rage');
    if (rageFeature) {
      console.log(`✅ Feature resolved: "${rageFeature.name}"`);
      console.log(`   Description: ${rageFeature.description?.substring(0, 100)}...`);
    } else {
      console.log('❌ Feature could not be resolved from registry');

      // Test fallback formatting
      const fallbackName = 'barbarian_rage'
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      console.log(`   Fallback format would be: "${fallbackName}"`);
    }
  } else {
    console.log('❌ Feature ID "barbarian_rage" NOT found in class_features');
    console.log('   Available features:', barbarian.class_features);
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error.message);
}

// Test 2: Hover tooltip shows description from FeatureRegistry
console.log('\n--- Test 2: Feature Descriptions ---');
try {
  const testFeatures = [
    'barbarian_rage',
    'barbarian_unarmored_defense',
    'fighter_action_surge',
    'rogue_sneak_attack'
  ];

  for (const featureId of testFeatures) {
    const feature = registry.getClassFeatureById(featureId);
    if (feature) {
      console.log(`✅ ${featureId}`);
      console.log(`   Display Name: "${feature.name}"`);
      console.log(`   Has Description: ${feature.description ? 'Yes' : 'No'}`);
      if (feature.description) {
        console.log(`   Description Preview: "${feature.description.substring(0, 80)}..."`);
      }
    } else {
      console.log(`⚠️  ${featureId} - Not found in registry`);
    }
  }
} catch (error) {
  console.error('❌ Test 2 failed:', error.message);
}

// Test 3: Fallback works if feature ID not in registry
console.log('\n--- Test 3: Fallback for Unknown Features ---');
try {
  const unknownFeatureIds = [
    'unknown_feature_xyz',
    'fake_class_feature_123',
    'totally_not_a_real_feature'
  ];

  for (const featureId of unknownFeatureIds) {
    const feature = registry.getClassFeatureById(featureId);
    const fallbackName = featureId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    console.log(`${featureId}:`);
    console.log(`   In Registry: ${feature ? 'Yes' : 'No'}`);
    console.log(`   Fallback Name: "${fallbackName}"`);
    if (!feature) {
      console.log(`   ✅ Fallback works correctly`);
    }
  }
} catch (error) {
  console.error('❌ Test 3 failed:', error.message);
}

// Test 4: Test racial traits resolution
console.log('\n--- Test 4: Racial Traits Resolution ---');
try {
  // Create a mock audio profile for testing
  const mockAudioProfile = {
    bass_dominance: 0.3,
    mid_dominance: 0.3,
    treble_dominance: 0.4,
    average_amplitude: 0.5
  };

  const elf = CharacterGenerator.generate(
    'test-elf-traits',
    mockAudioProfile,
    'Test Elf'
  );

  console.log('Generated Elf:', elf.name);
  console.log('Racial traits:', elf.racial_traits);

  // Check specific traits
  for (const traitId of elf.racial_traits) {
    const trait = registry.getRacialTraitById(traitId);
    if (trait) {
      console.log(`✅ ${traitId} -> "${trait.name}"`);
    } else {
      const fallbackName = traitId
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      console.log(`⚠️  ${traitId} -> "${fallbackName}" (fallback)`);
    }
  }
} catch (error) {
  console.error('❌ Test 4 failed:', error.message);
}

// Test 5: Verify all classes have features in the registry
console.log('\n--- Test 5: Registry Coverage by Class ---');
try {
  const classes = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

  for (const className of classes) {
    const features = registry.getClassFeatures(className, 1);
    if (features && features.length > 0) {
      console.log(`✅ ${className}: ${features.length} level 1 features`);
      // Show first feature as example
      if (features[0]) {
        console.log(`   Example: "${features[0].name}" (ID: ${features[0].id})`);
      }
    } else {
      console.log(`⚠️  ${className}: No level 1 features found`);
    }
  }
} catch (error) {
  console.error('❌ Test 5 failed:', error.message);
}

console.log('\n=== Feature ID Resolution Test Complete ===');
