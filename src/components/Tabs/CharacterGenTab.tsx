import { useState, useRef } from 'react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterGenerator } from '../../hooks/useCharacterGenerator';
import { useCharacterStore } from '../../store/characterStore';
import type { CharacterSheet } from 'playlist-data-engine';
import { validateCharacterSheet } from '../../schemas/characterSchema';
import { RawJsonDump } from '../ui/RawJsonDump';

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
  const { characters, addCharacter } = useCharacterStore();

  // State for determinism verification
  const [determinismResult, setDeterminismResult] = useState<{
    isMatch: boolean | null;
    original: CharacterSheet | null;
    regenerated: CharacterSheet | null;
  }>({ isMatch: null, original: null, regenerated: null });

  // State for import/export
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportCharacter = () => {
    if (!character) {
      console.warn('[CharacterGenTab] No character to export');
      return;
    }

    try {
      // Create a clean export object with metadata
      const exportData = {
        ...character,
        _exportMetadata: {
          exportedAt: new Date().toISOString(),
          exportedFrom: 'playlist-data-showcase',
          version: '1.0.0'
        }
      };

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${character.name.replace(/[^a-z0-9]/gi, '_')}_level${character.level}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);

      console.log('[CharacterGenTab] Character exported successfully', {
        name: character.name,
        filename: link.download
      });
    } catch (error) {
      console.error('[CharacterGenTab] Export failed', error);
      setImportError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleImportCharacter = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setImportError(null);
    setImportSuccess(false);

    console.log('[CharacterGenTab] Importing character from file:', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        if (!jsonContent) {
          throw new Error('Empty file content');
        }

        const parsedData = JSON.parse(jsonContent);

        // Remove export metadata if present (it's not part of CharacterSheet type)
        const { _exportMetadata, ...characterData } = parsedData as any;

        // Validate with Zod schema
        const validation = validateCharacterSheet(characterData);

        if (!validation.success) {
          console.error('[CharacterGenTab] Validation failed', validation.error);
          setImportError(validation.error || 'Invalid character file');
          setTimeout(() => setImportError(null), 5000);
          return;
        }

        if (validation.data) {
          // Add the validated character to the store
          addCharacter(validation.data);

          console.log('[CharacterGenTab] Character imported successfully', {
            name: validation.data.name,
            race: validation.data.race,
            class: validation.data.class
          });

          setImportSuccess(true);
          setTimeout(() => setImportSuccess(false), 3000);
        }
      } catch (error) {
        console.error('[CharacterGenTab] Import failed', error);
        setImportError('Import failed: ' + (error instanceof Error ? error.message : 'Invalid JSON file'));
        setTimeout(() => setImportError(null), 5000);
      }

      // Reset file input so same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      console.error('[CharacterGenTab] File read error');
      setImportError('Failed to read file');
      setTimeout(() => setImportError(null), 5000);
    };

    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          {character && (
            <>
              <button
                onClick={handleExportCharacter}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                title="Download character as JSON file"
              >
                Export Character
              </button>
              <button
                onClick={triggerFileInput}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                title="Import character from JSON file"
              >
                Import Character
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportCharacter}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Import Status Messages */}
      {importError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-sm font-medium text-red-400">Import Error</p>
          <p className="text-sm text-red-300 mt-1">{importError}</p>
        </div>
      )}
      {importSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
          <p className="text-sm font-medium text-green-400">Success!</p>
          <p className="text-sm text-green-300 mt-1">Character imported successfully. Check the Character Leveling tab to view all stored characters.</p>
        </div>
      )}

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

          {/* Audio Trait Mapping */}
          {audioProfile && (
            <div>
              <h4 className="font-bold mb-3">Audio Trait Mapping</h4>
              <p className="text-sm text-muted-foreground mb-3">
                How the audio characteristics influenced this character's ability scores
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 font-medium">Audio Trait</th>
                      <th className="text-left p-2 font-medium">Value</th>
                      <th className="text-left p-2 font-medium">Maps To</th>
                      <th className="text-center p-2 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Bass Dominance</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{(audioProfile.bass_dominance * 100).toFixed(1)}%</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                          STR (Strength)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.STR}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500" />
                          <span>Treble Dominance</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{(audioProfile.treble_dominance * 100).toFixed(1)}%</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                          DEX (Dexterity)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.DEX}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500" />
                          <span>Average Amplitude</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{(audioProfile.average_amplitude * 100).toFixed(1)}%</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                          CON (Constitution)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.CON}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500" />
                          <span>Mid Dominance</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">{(audioProfile.mid_dominance * 100).toFixed(1)}%</td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                          INT (Intelligence)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.INT}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-500" />
                          <span>Balance</span>
                          <span className="text-xs text-muted-foreground">(Bass ÷ Treble)</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {audioProfile.treble_dominance > 0
                          ? (audioProfile.bass_dominance / audioProfile.treble_dominance).toFixed(2)
                          : 'N/A'}
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                          WIS (Wisdom)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.WIS}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-pink-500" />
                          <span>Mid + Amplitude</span>
                          <span className="text-xs text-muted-foreground">(Combined)</span>
                        </div>
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {((audioProfile.mid_dominance + audioProfile.average_amplitude) / 2 * 100).toFixed(1)}%
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs font-medium">
                          CHA (Charisma)
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold">{character.ability_scores.CHA}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Higher values in each audio trait contribute to higher ability scores. The combination of traits creates unique character builds based on the audio profile.
              </p>
            </div>
          )}

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

          {/* Raw JSON Dump - Character Sheet */}
          <div>
            <h4 className="font-bold mb-3">Raw Character Data</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Complete character sheet data from the playlist-data-engine CharacterGenerator module
            </p>
            <RawJsonDump
              data={character}
              title={`Character Sheet: ${character.name}`}
              timestamp={new Date()}
              status="healthy"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterGenTab;
