import { useState } from 'react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterGenerator } from '../../hooks/useCharacterGenerator';
import { useCharacterStore } from '../../store/characterStore';
import type { CharacterSheet } from 'playlist-data-engine';

/**
 * CharacterGenTab Component
 *
 * Demonstrates the CharacterGenerator engine module by:
 * 1. Generating a D&D 5e character from an audio profile
 * 2. Displaying character sheet with all attributes (HP, AC, stats, skills, equipment, spells)
 * 3. Using real audio profile from the Audio Analysis tab (via playlistStore)
 * 4. Using track UUID as deterministic seed for consistent character generation
 * 5. Storing generated characters in the character store
 * 6. Verifying determinism by regenerating with the same seed and comparing results
 */
export function CharacterGenTab() {
  const { selectedTrack, audioProfile } = usePlaylistStore();
  const { generateCharacter, isGenerating } = useCharacterGenerator();
  const { characters } = useCharacterStore();

  // State for determinism verification
  const [determinismResult, setDeterminismResult] = useState<{
    isMatch: boolean | null;
    original: CharacterSheet | null;
    regenerated: CharacterSheet | null;
  }>({ isMatch: null, original: null, regenerated: null });

  // Only show the most recent character
  const character = characters.length > 0 ? characters[characters.length - 1] : null;

  const handleGenerate = async () => {
    if (!audioProfile) {
      console.warn('[CharacterGenTab] No audio profile available. Please analyze audio first.');
      return;
    }
    if (!selectedTrack) {
      console.warn('[CharacterGenTab] No track selected.');
      return;
    }

    // Use track UUID as deterministic seed for consistent character generation
    // This ensures the same track always generates the same character
    const seed = selectedTrack.id;
    await generateCharacter(audioProfile, seed);

    // Reset determinism verification state on new generation
    setDeterminismResult({ isMatch: null, original: null, regenerated: null });
  };

  const handleVerifyDeterminism = async () => {
    if (!audioProfile || !selectedTrack || !character) {
      console.warn('[CharacterGenTab] Cannot verify determinism - missing prerequisites');
      return;
    }

    // Store the current character as the original for comparison
    const original = character;

    console.log('[CharacterGenTab] Verifying determinism with seed:', selectedTrack.id);

    // Regenerate with the same seed
    await generateCharacter(audioProfile, selectedTrack.id);

    // Get the regenerated character
    const regenerated = characters.length > 0 ? characters[characters.length - 1] : null;

    if (!regenerated) {
      console.error('[CharacterGenTab] Regeneration failed - no character returned');
      return;
    }

    // Compare the two characters deeply
    const isMatch = JSON.stringify(original) === JSON.stringify(regenerated);

    console.log('[CharacterGenTab] Determinism check result:', isMatch ? 'MATCH' : 'MISMATCH');

    setDeterminismResult({
      isMatch,
      original,
      regenerated
    });
  };

  // Helper to get the difference key path between two objects
  const getDiffPath = (obj1: any, obj2: any, path = ''): string[] | null => {
    if (obj1 === obj2) return null;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
      return [path];
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;
      if (!(key in obj1) || !(key in obj2)) {
        return [newPath];
      }
      const diff = getDiffPath(obj1[key], obj2[key], newPath);
      if (diff) return diff;
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Character Generator</h2>
        <div className="flex gap-2">
          {character && (
            <button
              onClick={handleVerifyDeterminism}
              disabled={isGenerating || !audioProfile}
              className="px-4 py-2 bg-accent text-accent-foreground border border-border rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate with Same Seed'}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !audioProfile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : character ? 'Generate New Character' : 'Generate Character'}
          </button>
        </div>
      </div>

      {/* Show helpful messages when prerequisites aren't met */}
      {!selectedTrack && (
        <p className="text-muted-foreground">Select a track from the Playlist tab first</p>
      )}
      {selectedTrack && !audioProfile && (
        <p className="text-muted-foreground">Analyze the audio in the Audio Analysis tab first</p>
      )}
      {selectedTrack && audioProfile && (
        <div className="p-3 bg-accent/50 rounded-md border border-border">
          <p className="text-sm">
            <span className="font-medium">Ready to generate:</span> Using audio profile from{' '}
            <span className="font-medium">{selectedTrack.title}</span> by {selectedTrack.artist}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Seed: {selectedTrack.id} (deterministic - same track always generates same character)
          </p>
        </div>
      )}

      {/* Determinism Verification Result */}
      {determinismResult.isMatch !== null && (
        <div className={`p-4 rounded-md border ${
          determinismResult.isMatch
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {determinismResult.isMatch ? '✓' : '✗'}
            </span>
            <div>
              <p className="font-bold">
                {determinismResult.isMatch ? 'Deterministic match!' : 'Mismatch!'}
              </p>
              <p className="text-sm text-muted-foreground">
                {determinismResult.isMatch
                  ? `The character was regenerated identically with the same seed (${selectedTrack?.id}).`
                  : 'The regenerated character differs from the original (this should not happen).'}
              </p>
            </div>
          </div>

          {!determinismResult.isMatch && determinismResult.original && determinismResult.regenerated && (
            <div className="mt-4 p-3 bg-background/50 rounded">
              <p className="text-sm font-medium mb-2">Difference detected:</p>
              {(() => {
                const diffPath = getDiffPath(determinismResult.original, determinismResult.regenerated);
                return diffPath ? (
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {diffPath.join(' → ')}
                  </code>
                ) : (
                  <p className="text-xs text-muted-foreground">Deep comparison shows differences</p>
                );
              })()}

              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Original:</p>
                  <p className="font-mono">{determinismResult.original.name}</p>
                  <p className="text-muted-foreground">
                    {determinismResult.original.race} {determinismResult.original.class}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Regenerated:</p>
                  <p className="font-mono">{determinismResult.regenerated.name}</p>
                  <p className="text-muted-foreground">
                    {determinismResult.regenerated.race} {determinismResult.regenerated.class}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {character && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary/20 to-accent rounded-lg border border-border">
            <h3 className="text-2xl font-bold">{character.name}</h3>
            <p className="text-lg text-muted-foreground">
              Level {character.level} {character.race} {character.class}
            </p>
            <div className="mt-2 text-sm text-muted-foreground">
              XP: {character.xp.current} / {character.xp.next_level}
            </div>
          </div>

          {/* Core Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-card border border-border rounded-md text-center">
              <p className="text-sm text-muted-foreground">HP</p>
              <p className="text-2xl font-bold">{character.hp.max}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-md text-center">
              <p className="text-sm text-muted-foreground">AC</p>
              <p className="text-2xl font-bold">{character.armor_class}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-md text-center">
              <p className="text-sm text-muted-foreground">Initiative</p>
              <p className="text-2xl font-bold">+{character.initiative}</p>
            </div>
            <div className="p-4 bg-card border border-border rounded-md text-center">
              <p className="text-sm text-muted-foreground">Speed</p>
              <p className="text-2xl font-bold">{character.speed} ft</p>
            </div>
          </div>

          {/* Ability Scores */}
          <div>
            <h4 className="font-bold mb-3">Ability Scores</h4>
            <div className="grid grid-cols-6 gap-3">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                <div key={ability} className="p-3 bg-card border border-border rounded-md text-center">
                  <p className="text-xs text-muted-foreground font-medium">{ability}</p>
                  <p className="text-xl font-bold">{character.ability_scores[ability]}</p>
                  <p className="text-sm text-primary">
                    {character.ability_modifiers[ability] >= 0 ? '+' : ''}
                    {character.ability_modifiers[ability]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <h4 className="font-bold mb-3">Skills</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(character.skills).map(([skill, prof]) => (
                <div key={skill} className="flex items-center justify-between p-2 bg-card border border-border rounded text-sm">
                  <span className="capitalize">{skill.replace(/_/g, ' ')}</span>
                  <span className={prof !== 'none' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                    {prof === 'expertise' ? '★★' : prof === 'proficient' ? '★' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment */}
          {character.equipment && (
            <div>
              <h4 className="font-bold mb-3">Equipment</h4>
              <div className="space-y-2">
                {character.equipment.weapons.length > 0 && (
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Weapons</p>
                    <p className="text-sm">{character.equipment.weapons.join(', ')}</p>
                  </div>
                )}
                {character.equipment.armor.length > 0 && (
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Armor</p>
                    <p className="text-sm">{character.equipment.armor.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spells */}
          {character.spells && (
            <div>
              <h4 className="font-bold mb-3">Spells</h4>
              <div className="space-y-2">
                {character.spells.cantrips.length > 0 && (
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Cantrips</p>
                    <p className="text-sm">{character.spells.cantrips.join(', ')}</p>
                  </div>
                )}
                {character.spells.known_spells.length > 0 && (
                  <div className="p-3 bg-card border border-border rounded">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Known Spells</p>
                    <p className="text-sm">{character.spells.known_spells.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CharacterGenTab;
