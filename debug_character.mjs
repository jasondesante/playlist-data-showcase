// Debug script to inspect character structure
import { CharacterGenerator } from './node_modules/playlist-data-engine/dist/playlist-data-engine.mjs';

const audioProfile = {
  bass_dominance: 0.5,
  mid_dominance: 0.3,
  treble_dominance: 0.2,
  average_amplitude: 0.5,
  spectral_centroid: 2000,
  spectral_rolloff: 4000,
  zero_crossing_rate: 0.1,
  analysis_metadata: {
    duration_analyzed: 30,
    full_buffer_analyzed: false,
    sample_positions: [0.1, 0.3, 0.5, 0.7, 0.9],
    analyzed_at: new Date().toISOString()
  }
};

const character = CharacterGenerator.generate(
  'debug-seed',
  audioProfile,
  'Debug-Character',
  { gameMode: 'standard' }
);

console.log('Full character object:');
console.log(JSON.stringify(character, null, 2));
