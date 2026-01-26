import { useState, useRef } from 'react';
import './CharacterGenTab.css';
import { User, Sparkles, Download, Upload, RefreshCw, Wand2 } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterGenerator } from '../../hooks/useCharacterGenerator';
import { useCharacterStore } from '../../store/characterStore';
import type { CharacterSheet } from 'playlist-data-engine';
import { validateCharacterSheet } from '../../schemas/characterSchema';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { GameModeToggle } from '../ui/GameModeToggle';
import type { GameMode } from '../ui/GameModeToggle';
import { showToast } from '../ui/Toast';

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
  const { addCharacter, getActiveCharacter } = useCharacterStore();

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

  // State for game mode selection
  const [gameMode, setGameMode] = useState<GameMode>('uncapped');

  // Get the active character
  const character = getActiveCharacter();

  const handleGenerate = async () => {
    if (!audioProfile) {
      console.warn('[CharacterGenTab] No audio profile available. Please analyze audio first.');
      showToast('⚠️ No audio profile available. Please analyze audio first.', 'warning');
      return;
    }
    if (!selectedTrack) {
      console.warn('[CharacterGenTab] No track selected.');
      showToast('⚠️ No track selected. Please select a track from the Playlist tab.', 'warning');
      return;
    }

    // Use track UUID as deterministic seed for consistent character generation
    // This ensures the same track always generates the same character
    const seed = selectedTrack.id;
    await generateCharacter(audioProfile, seed, gameMode);

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
    await generateCharacter(audioProfile, selectedTrack.id, gameMode);

    // Get the regenerated character (active character may have changed)
    const regenerated = getActiveCharacter();

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

  // Get character avatar emoji based on class
  const getCharacterAvatar = (charClass: string) => {
    const classEmojis: Record<string, string> = {
      'Fighter': '⚔️',
      'Wizard': '🧙',
      'Rogue': '🗡️',
      'Cleric': '✨',
      'Ranger': '🏹',
      'Barbarian': '🪓',
      'Bard': '🎸',
      'Druid': '🌿',
      'Monk': '👊',
      'Paladin': '🛡️',
      'Sorcerer': '🔥',
      'Warlock': '👁️',
    };
    return classEmojis[charClass] || '👤';
  };

  return (
    <div className="character-gen-container">
      {/* Header with Status Indicator */}
      <div className="character-gen-header">
        <div className="character-gen-header-content">
          <div className="character-gen-header-title-row">
            <div className="character-gen-header-icon-wrapper">
              <User className="character-gen-header-icon" />
            </div>
            <h2 className="character-gen-header-title">Character Generator</h2>
          </div>
          <p className="character-gen-header-subtitle">Generate D&D characters from audio profiles</p>
        </div>
        <div className="character-gen-actions">
          {character && (
            <Button
              onClick={handleVerifyDeterminism}
              disabled={isGenerating || !audioProfile}
              isLoading={isGenerating}
              leftIcon={RefreshCw}
              variant="secondary"
              size="sm"
            >
              Regenerate
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !audioProfile}
            isLoading={isGenerating}
            leftIcon={Wand2}
            variant="primary"
            size="sm"
          >
            {character ? 'Generate New' : 'Generate'}
          </Button>
          {character && (
            <>
              <Button
                onClick={handleExportCharacter}
                leftIcon={Download}
                variant="outline"
                size="sm"
                title="Download character as JSON file"
              >
                Export
              </Button>
              <Button
                onClick={triggerFileInput}
                leftIcon={Upload}
                variant="outline"
                size="sm"
                title="Import character from JSON file"
              >
                Import
              </Button>
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

      {/* Game Mode Selector */}
      <GameModeToggle value={gameMode} onChange={setGameMode} />

      {/* Import Status Messages */}
      {importError && (
        <div className="character-status-message error fade-in">
          <p className="character-status-title error">Import Error</p>
          <p className="character-status-text">{importError}</p>
        </div>
      )}
      {importSuccess && (
        <div className="character-status-message success fade-in">
          <p className="character-status-title success">Success!</p>
          <p className="character-status-text">Character imported successfully. Check the Character Leveling tab to view all stored characters.</p>
        </div>
      )}

      {/* Empty State - No prerequisites met */}
      {!selectedTrack && !audioProfile && !character && (
        <Card variant="flat" padding="md">
          <div className="character-gen-empty-state">
            <div className="character-gen-empty-icon-wrapper">
              <span className="character-gen-empty-icon" role="img" aria-label="Character">👤</span>
            </div>
            <h4 className="character-gen-empty-title">No Track Selected</h4>
            <p className="character-gen-empty-description">
              Select a track from the Playlist tab and analyze its audio to generate a unique character based on the audio profile.
            </p>
          </div>
        </Card>
      )}

      {/* Ready State - Ready to generate */}
      {selectedTrack && audioProfile && !character && (
        <Card variant="flat" padding="sm" className="character-ready-card fade-in">
          <div className="character-ready-content">
            <div className="character-ready-icon-wrapper">
              <Sparkles className="character-ready-icon" />
            </div>
            <div className="character-ready-text">
              <p className="character-ready-title">Ready to generate</p>
              <p className="character-ready-description">
                Using audio profile from <span>{selectedTrack.title}</span> by {selectedTrack.artist}
              </p>
              <p className="character-ready-seed">
                Seed: {selectedTrack.id} (deterministic - same track always generates same character)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Determinism Verification Result */}
      {determinismResult.isMatch !== null && (
        <Card
          variant={determinismResult.isMatch ? 'flat' : 'outlined'}
          padding="sm"
          className={determinismResult.isMatch ? 'border-cute-teal/30' : 'border-destructive/30'}
          style={{
            backgroundColor: determinismResult.isMatch
              ? 'hsl(var(--cute-teal) / 0.1)'
              : 'hsl(var(--destructive) / 0.1)'
          }}
        >
          <div className="character-determinism-result">
            <span className={`character-determinism-icon ${determinismResult.isMatch ? 'match' : 'mismatch'}`}>
              {determinismResult.isMatch ? '✓' : '✗'}
            </span>
            <div className="character-determinism-content">
              <p className="character-determinism-title">
                {determinismResult.isMatch ? 'Deterministic match!' : 'Mismatch!'}
              </p>
              <p className="character-determinism-description">
                {determinismResult.isMatch
                  ? `The character was regenerated identically with the same seed (${selectedTrack?.id}).`
                  : 'The regenerated character differs from the original (this should not happen).'}
              </p>
              {!determinismResult.isMatch && determinismResult.original && determinismResult.regenerated && (
                <div className="character-determinism-mismatch">
                  <p className="character-determinism-mismatch-title">Difference detected:</p>
                  {(() => {
                    const diffPath = getDiffPath(determinismResult.original, determinismResult.regenerated);
                    return diffPath ? (
                      <code className="character-determinism-diff-code">
                        {diffPath.join(' → ')}
                      </code>
                    ) : (
                      <p className="character-determinism-deep-note">Deep comparison shows differences</p>
                    );
                  })()}
                  <div className="character-determinism-comparison">
                    <div>
                      <p className="character-determinism-comparison-label">Original:</p>
                      <p className="character-determinism-comparison-name">{determinismResult.original.name}</p>
                      <p className="character-determinism-comparison-details">
                        {determinismResult.original.race} {determinismResult.original.class}
                      </p>
                    </div>
                    <div>
                      <p className="character-determinism-comparison-label">Regenerated:</p>
                      <p className="character-determinism-comparison-name">{determinismResult.regenerated.name}</p>
                      <p className="character-determinism-comparison-details">
                        {determinismResult.regenerated.race} {determinismResult.regenerated.class}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {character && (
        <div className="character-sheet fade-in-up">
          {/* Character Header with Avatar and Level Badge */}
          <Card variant="default" padding="md" className="character-header-card">
            <div className="character-header-content">
              {/* Character Avatar */}
              <div className="character-avatar">
                <span role="img" aria-label="Character class">
                  {getCharacterAvatar(character.class)}
                </span>
                {/* Level Badge */}
                <div className="character-level-badge">
                  {character.level}
                </div>
              </div>

              {/* Character Info */}
              <div className="character-info">
                <div className="character-name-row">
                  <h3 className="character-name">{character.name}</h3>
                  {/* Game Mode Badge */}
                  {character.gameMode && (
                    <div
                      className={`character-game-mode-badge ${character.gameMode}`}
                      title={
                        character.gameMode === 'standard'
                          ? 'Standard Mode: Stats cap at 20, manual stat selection required at level-ups'
                          : 'Uncapped Mode: Unlimited stat progression, automatic stat increases on level-up'
                      }
                    >
                      {character.gameMode === 'standard' ? 'STATS CAPPED @ 20' : 'UNLIMITED PROGRESSION'}
                    </div>
                  )}
                </div>
                <p className="character-class">
                  Level {character.level} {character.race} {character.class}
                </p>
                <p className="character-xp">
                  XP: {character.xp.current} / {character.xp.next_level}
                </p>
              </div>
            </div>
          </Card>

          {/* Core Stats Grid */}
          <div className="character-stats-grid">
            <Card variant="elevated" padding="sm" className="character-stat-card">
              <p className="character-stat-label">HP</p>
              <p className="character-stat-value character-count-up">{character.hp.max}</p>
            </Card>
            <Card variant="elevated" padding="sm" className="character-stat-card">
              <p className="character-stat-label">AC</p>
              <p className="character-stat-value character-count-up">{character.armor_class}</p>
            </Card>
            <Card variant="elevated" padding="sm" className="character-stat-card">
              <p className="character-stat-label">Initiative</p>
              <p className="character-stat-value character-count-up">+{character.initiative}</p>
            </Card>
            <Card variant="elevated" padding="sm" className="character-stat-card">
              <p className="character-stat-label">Speed</p>
              <p className="character-stat-value character-count-up">{character.speed} ft</p>
            </Card>
          </div>

          {/* Audio Trait Mapping */}
          {audioProfile && (
            <Card variant="default" padding="md">
              <CardHeader>
                <CardTitle>Audio Trait Mapping</CardTitle>
                <CardDescription>
                  How the audio characteristics influenced this character's ability scores
                </CardDescription>
              </CardHeader>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="character-audio-mapping-table">
                  <thead>
                    <tr>
                      <th>Audio Trait</th>
                      <th>Value</th>
                      <th>Maps To</th>
                      <th className="character-audio-score">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--cute-pink))' }} />
                          <span className="character-audio-trait-name">Bass Dominance</span>
                        </div>
                      </td>
                      <td className="character-audio-value">{(audioProfile.bass_dominance * 100).toFixed(1)}%</td>
                      <td><span className="character-audio-badge str">STR</span></td>
                      <td className="character-audio-score">{character.ability_scores.STR}</td>
                    </tr>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--cute-teal))' }} />
                          <span className="character-audio-trait-name">Treble Dominance</span>
                        </div>
                      </td>
                      <td className="character-audio-value">{(audioProfile.treble_dominance * 100).toFixed(1)}%</td>
                      <td><span className="character-audio-badge dex">DEX</span></td>
                      <td className="character-audio-score">{character.ability_scores.DEX}</td>
                    </tr>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--cute-yellow))' }} />
                          <span className="character-audio-trait-name">Average Amplitude</span>
                        </div>
                      </td>
                      <td className="character-audio-value">{(audioProfile.average_amplitude * 100).toFixed(1)}%</td>
                      <td><span className="character-audio-badge con">CON</span></td>
                      <td className="character-audio-score">{character.ability_scores.CON}</td>
                    </tr>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                          <span className="character-audio-trait-name">Mid Dominance</span>
                        </div>
                      </td>
                      <td className="character-audio-value">{(audioProfile.mid_dominance * 100).toFixed(1)}%</td>
                      <td><span className="character-audio-badge int">INT</span></td>
                      <td className="character-audio-score">{character.ability_scores.INT}</td>
                    </tr>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--cute-purple))' }} />
                          <span className="character-audio-trait-name">Balance</span>
                        </div>
                      </td>
                      <td className="character-audio-value">
                        {audioProfile.treble_dominance > 0
                          ? (audioProfile.bass_dominance / audioProfile.treble_dominance).toFixed(2)
                          : 'N/A'}
                      </td>
                      <td><span className="character-audio-badge wis">WIS</span></td>
                      <td className="character-audio-score">{character.ability_scores.WIS}</td>
                    </tr>
                    <tr className="character-audio-trait-row">
                      <td>
                        <div className="character-audio-trait-cell">
                          <span className="character-audio-trait-dot" style={{ backgroundColor: 'hsl(var(--cute-orange))' }} />
                          <span className="character-audio-trait-name">Mid + Amp</span>
                        </div>
                      </td>
                      <td className="character-audio-value">
                        {((audioProfile.mid_dominance + audioProfile.average_amplitude) / 2 * 100).toFixed(1)}%
                      </td>
                      <td><span className="character-audio-badge cha">CHA</span></td>
                      <td className="character-audio-score">{character.ability_scores.CHA}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="character-audio-trait-note">
                Higher values in each audio trait contribute to higher ability scores. The combination of traits creates unique character builds based on the audio profile.
              </p>
            </Card>
          )}

          {/* Ability Scores */}
          <Card variant="default" padding="md">
            <h4 className="card-title">Ability Scores</h4>
            <div className="character-abilities-grid">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                <div key={ability} className="character-ability-card">
                  <p className="character-ability-label">{ability}</p>
                  <p className="character-ability-score character-count-up">{character.ability_scores[ability]}</p>
                  <p className="character-ability-modifier">
                    {character.ability_modifiers[ability] >= 0 ? '+' : ''}
                    {character.ability_modifiers[ability]}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Skills Grid */}
          <Card variant="default" padding="md">
            <h4 className="card-title">Skills</h4>
            <div className="character-skills-grid">
              {Object.entries(character.skills).map(([skill, prof]) => (
                <div key={skill} className="character-skill-item" title={
                  prof === 'expertise' ? 'Expertise (double proficiency)' :
                  prof === 'proficient' ? 'Proficient' : 'Not proficient'
                }>
                  <span className="character-skill-name">{skill.replace(/_/g, ' ')}</span>
                  <span className={`character-skill-proficiency ${prof}`}>
                    {prof === 'expertise' ? '★★' : prof === 'proficient' ? '★' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Equipment */}
          {character.equipment && (character.equipment.weapons.length > 0 || character.equipment.armor.length > 0) && (() => {
            const equipment = character.equipment;
            return (
              <Card variant="default" padding="md">
                <h4 className="card-title">Equipment</h4>
                <div className="character-equipment-section">
                  {equipment.weapons.length > 0 && (
                    <Card variant="flat" padding="sm" className="character-equipment-card">
                      <div className="character-equipment-label">Weapons</div>
                      <div className="character-equipment-items">
                        {equipment.weapons.map((weapon, idx) => (
                          <span key={idx} className="character-equipment-item">
                            {weapon.name}
                            {weapon.quantity > 1 && <span className="character-equipment-quantity"> ×{weapon.quantity}</span>}
                            {weapon.equipped && <span className="character-equipment-equipped" title="Equipped"> ✓</span>}
                            {idx < equipment.weapons.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                  {equipment.armor.length > 0 && (
                    <Card variant="flat" padding="sm" className="character-equipment-card">
                      <div className="character-equipment-label">Armor</div>
                      <div className="character-equipment-items">
                        {equipment.armor.map((armor, idx) => (
                          <span key={idx} className="character-equipment-item">
                            {armor.name}
                            {armor.quantity > 1 && <span className="character-equipment-quantity"> ×{armor.quantity}</span>}
                            {armor.equipped && <span className="character-equipment-equipped" title="Equipped"> ✓</span>}
                            {idx < equipment.armor.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Spells */}
          {character.spells && (character.spells.cantrips.length > 0 || character.spells.known_spells.length > 0) && (
            <Card variant="default" padding="md">
              <h4 className="card-title">Spells</h4>
              <div className="character-equipment-section">
                {character.spells.cantrips.length > 0 && (
                  <Card variant="flat" padding="sm" className="character-equipment-card">
                    <p className="character-equipment-label">Cantrips</p>
                    <p className="character-equipment-items">{character.spells.cantrips.join(', ')}</p>
                  </Card>
                )}
                {character.spells.known_spells.length > 0 && (
                  <Card variant="flat" padding="sm" className="character-equipment-card">
                    <p className="character-equipment-label">Known Spells</p>
                    <p className="character-equipment-items">{character.spells.known_spells.join(', ')}</p>
                  </Card>
                )}
              </div>
            </Card>
          )}

          {/* Raw JSON Dump - Character Sheet */}
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle>Raw Character Data</CardTitle>
              <CardDescription>
                Complete character sheet data from the playlist-data-engine CharacterGenerator module
              </CardDescription>
            </CardHeader>
            <RawJsonDump
              data={character}
              title={`Character Sheet: ${character.name}`}
              timestamp={new Date()}
              status="healthy"
              defaultOpen={false}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

export default CharacterGenTab;
