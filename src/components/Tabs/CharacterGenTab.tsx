import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterGenerator } from '../../hooks/useCharacterGenerator';
import { useCharacterStore } from '../../store/characterStore';

/**
 * CharacterGenTab Component
 *
 * Demonstrates the CharacterGenerator engine module by:
 * 1. Generating a D&D 5e character from an audio profile
 * 2. Displaying character sheet with all attributes (HP, AC, stats, skills, equipment, spells)
 * 3. Using real audio profile from the Audio Analysis tab (via playlistStore)
 * 4. Using track UUID as deterministic seed for consistent character generation
 * 5. Storing generated characters in the character store
 *
 * TODO: Phase 4.3 - Add determinism verification, audio trait mapping display, and export/import
 */
export function CharacterGenTab() {
  const { selectedTrack, audioProfile } = usePlaylistStore();
  const { generateCharacter, isGenerating } = useCharacterGenerator();
  const { characters } = useCharacterStore();

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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Character Generator</h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !audioProfile}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : character ? 'Generate New Character' : 'Generate Character'}
        </button>
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
