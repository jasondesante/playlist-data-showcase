// Test script to verify ammunition format
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a Ranger character
const testAudio = {
  bass_dominance: 0.4,
  mid_dominance: 0.5,
  treble_dominance: 0.6,
  average_amplitude: 0.5
};

const ranger = CharacterGenerator.generate('test-seed', testAudio, 'Test Ranger', {
  forceClass: 'Ranger',
  level: 1
});

console.log('=== Ranger Character Generated ===');
console.log('Class:', ranger.class);
console.log('\n=== Items ===');
ranger.equipment.items.forEach(item => {
  if (item.name === 'Arrow' || item.name === 'Bolt') {
    console.log(`Name: "${item.name}"`);
    console.log(`Quantity: ${item.quantity}`);
    console.log(`Equipped: ${item.equipped}`);
  }
});

console.log('\n=== Equipment Weights ===');
console.log('Total Weight:', ranger.equipment.totalWeight, 'lbs');
console.log('Equipped Weight:', ranger.equipment.equippedWeight, 'lbs');

// Calculate expected arrow weight
const arrowItem = ranger.equipment.items.find(i => i.name === 'Arrow');
if (arrowItem) {
  const expectedWeight = arrowItem.quantity * 0.05;
  console.log('\nExpected arrow weight (20 × 0.05):', expectedWeight, 'lbs');
  console.log('Arrow weight:', expectedWeight === 1 ? 'CORRECT' : 'INCORRECT');
}

// Generate a Rogue with crossbow (should get Bolts)
const rogue = CharacterGenerator.generate('test-seed-2', testAudio, 'Test Rogue', {
  forceClass: 'Rogue',
  level: 1
});

console.log('\n=== Rogue Character ===');
console.log('Class:', rogue.class);
console.log('\n=== Items with crossbow ===');
rogue.equipment.items.forEach(item => {
  if (item.name === 'Arrow' || item.name === 'Bolt') {
    console.log(`Name: "${item.name}"`);
    console.log(`Quantity: ${item.quantity}`);
  }
});
