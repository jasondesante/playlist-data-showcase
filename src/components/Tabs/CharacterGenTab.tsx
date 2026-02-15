import { useState, useEffect, useRef, useMemo } from 'react';
import './CharacterGenTab.css';
import { User, Sparkles, Download, Upload, Wand2, Plus, Check, Package, Target, ChevronDown, Sword, Shield, Trash2 } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterGenerator } from '../../hooks/useCharacterGenerator';
import { useFeatureNames } from '../../hooks/useFeatureNames';
import { useCharacterStore } from '../../store/characterStore';
import { validateCharacterSheet } from '../../schemas/characterSchema';
import { RawJsonDump } from '../ui/RawJsonDump';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { GameModeToggle } from '../ui/GameModeToggle';
import type { GameMode } from '../ui/GameModeToggle';
import { GenerationModeToggle } from '../ui/GenerationModeToggle';
import type { GenerationMode } from '../ui/GenerationModeToggle';
import { AdvancedOptionsSection } from '../ui/AdvancedOptionsSection';
import type { AdvancedOptions } from '../ui/AdvancedOptionsSection';
import { ActiveEffectsSummary, InlineEffectIndicators, InlineEquipmentEffectIndicators, type EquipmentEffect } from '../ui/EffectDisplay';
import { DetailRow } from '../ui/DetailRow';
import { EquipmentBrowser } from '../ui/EquipmentBrowser';
import { showToast } from '../ui/Toast';
import { cn } from '../../utils/cn';
import { DEFAULT_EQUIPMENT } from 'playlist-data-engine';
import type { EnhancedEquipment } from 'playlist-data-engine';

/**
 * Ammunition types and their per-item weights (in pounds)
 * Following the Migration Guide format: individual items with quantity
 */
const AMMUNITION_TYPES: Record<string, number> = {
  'Arrow': 0.05,
  'Bolt': 0.075
};

/**
 * Check if an item is ammunition
 */
function isAmmunition(itemName: string): boolean {
  return itemName in AMMUNITION_TYPES;
}

/**
 * Get the per-item weight for ammunition
 */
function getAmmunitionWeight(itemName: string): number | null {
  return AMMUNITION_TYPES[itemName] ?? null;
}

/**
 * Rarity color mapping for equipment display
 */
const RARITY_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50%)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};

/**
 * Rarity background colors for item cards
 */
const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.08)',
  'uncommon': 'hsl(120 60% 40% / 0.08)',
  'rare': 'hsl(210 80% 50% / 0.08)',
  'very_rare': 'hsl(270 60% 50% / 0.08)',
  'legendary': 'hsl(30 90% 50% / 0.12)'
};

/**
 * Rarity border colors for item cards
 */
const RARITY_BORDER_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.25)',
  'uncommon': 'hsl(120 60% 40% / 0.3)',
  'rare': 'hsl(210 80% 50% / 0.3)',
  'very_rare': 'hsl(270 60% 50% / 0.3)',
  'legendary': 'hsl(30 90% 50% / 0.4)'
};

/**
 * Get equipment data from database by name
 */
function getEquipmentData(itemName: string): EnhancedEquipment | undefined {
  return DEFAULT_EQUIPMENT[itemName];
}

/**
 * Find equipment effects for a specific item by name from character's equipment_effects array
 * Task 2.4: Inline Equipment Effects
 */
function getEquipmentEffectsByName(itemName: string, equipmentEffects?: EquipmentEffect[]): EquipmentEffect | undefined {
  if (!equipmentEffects || equipmentEffects.length === 0) {
    return undefined;
  }
  return equipmentEffects.find(effect => effect.source === itemName);
}

/**
 * Format rarity for display (snake_case to Title Case)
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get tooltip content for equipment item showing properties
 */
function getEquipmentTooltip(equipmentData?: EnhancedEquipment): string {
  const parts: string[] = [];

  // Add rarity
  if (equipmentData?.rarity) {
    parts.push(`Rarity: ${formatRarity(equipmentData.rarity)}`);
  }

  // Add type
  if (equipmentData?.type) {
    parts.push(`Type: ${equipmentData.type.charAt(0).toUpperCase() + equipmentData.type.slice(1)}`);
  }

  // Add weight
  if (equipmentData?.weight !== undefined) {
    parts.push(`Weight: ${equipmentData.weight} lb`);
  }

  // Add damage for weapons
  if (equipmentData?.type === 'weapon' && equipmentData.damage) {
    parts.push(`Damage: ${equipmentData.damage.dice} ${equipmentData.damage.damageType}`);
  }

  // Add AC for armor
  if (equipmentData?.type === 'armor' && equipmentData.acBonus !== undefined) {
    parts.push(`AC Bonus: +${equipmentData.acBonus}`);
  }

  // Add properties
  if (equipmentData?.properties && equipmentData.properties.length > 0) {
    const propNames = equipmentData.properties.map(p => p.type).join(', ');
    parts.push(`Properties: ${propNames}`);
  }

  return parts.join('\n');
}

/**
 * CharacterGenTab Component
 *
 * Generates D&D 5e characters from audio profiles:
 * 1. Generates a unique D&D character from an audio profile
 * 2. Displays character sheet with all attributes (HP, AC, stats, skills, equipment, spells)
 * 3. Uses real audio profile from the Audio Analysis tab (via playlistStore)
 * 4. Uses track UUID as deterministic seed for consistent character generation
 * 5. Stores generated characters in the character store
 * 6. Supports importing/exporting characters as JSON files
 */
export function CharacterGenTab() {
  const { selectedTrack, audioProfile } = usePlaylistStore();
  const { generateCharacter, isGenerating } = useCharacterGenerator();
  const { addCharacter, getActiveCharacter, setActiveCharacter, characters } = useCharacterStore();
  const { resolveFeatureName, resolveTraitName, getFeatureDescription, getTraitDescription, getFeatureEffects, getTraitEffects } = useFeatureNames();

  // State for import/export
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for game mode selection
  const [gameMode, setGameMode] = useState<GameMode>('uncapped');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('deterministic');
  const [showGameModeSelector, setShowGameModeSelector] = useState(false);

  // State for advanced options (Task 1.5: Advanced Options Integration)
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    forceName: '',
    deterministicName: true,
    forceRace: undefined,
    forceClass: undefined,
    subrace: undefined
  });

  // State for equipment injection (Task 3.3: Track Selected Equipment State)
  const [injectionEquipment, setInjectionEquipment] = useState<EnhancedEquipment[]>([]);

  // Phase 3: Selection state for racial traits (Task 3.1)
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);

  // Handler to add equipment for injection (used by EquipmentBrowser in Task 3.4)
  const handleAddEquipment = (item: EnhancedEquipment) => {
    setInjectionEquipment(prev => {
      // Avoid duplicates by checking name
      if (prev.some(e => e.name === item.name)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  // Handler to remove equipment from injection (used by EquipmentBrowser in Task 3.4)
  const handleRemoveEquipment = (item: EnhancedEquipment) => {
    setInjectionEquipment(prev => prev.filter(e => e.name !== item.name));
  };

  // Handler to clear all injection equipment (used by Clear All button in Task 3.4)
  const handleClearInjectionEquipment = () => {
    setInjectionEquipment([]);
  };

  // State for Equipment Injection section expand/collapse (Task 3.4)
  const [showEquipmentInjection, setShowEquipmentInjection] = useState(false);

  // Get counts of selected equipment by category (Task 3.4)
  const selectedWeaponsCount = useMemo(() =>
    injectionEquipment.filter(e => e.type === 'weapon').length,
    [injectionEquipment]
  );
  const selectedArmorCount = useMemo(() =>
    injectionEquipment.filter(e => e.type === 'armor').length,
    [injectionEquipment]
  );
  const selectedItemsCount = useMemo(() =>
    injectionEquipment.filter(e => e.type === 'item').length,
    [injectionEquipment]
  );
  const totalSelectedCount = injectionEquipment.length;

  // Get the character to display based on priority:
  // 1. Current active character IF it belongs to the selected track (matches seed exactly or as a random variant)
  // 2. The deterministic character for the selected track (seed === track.id)
  // 3. The active character (if no track is selected)
  const character = useMemo(() => {
    const activeChar = getActiveCharacter();

    // If a track is selected, try to find a character that "belongs" to it
    if (selectedTrack?.id) {
      // First, check if the active character is the one we just generated (or selected) for this track
      // It either matches the ID exactly (deterministic) or starts with it (random/spiced)
      if (activeChar && (activeChar.seed === selectedTrack.id || activeChar.seed.startsWith(`${selectedTrack.id}-`))) {
        return activeChar;
      }

      // If not, see if we have a deterministic character for this track in our list
      return characters.find((c) => c.seed === selectedTrack.id);
    }

    // No track selected - show active character
    return activeChar;
  }, [selectedTrack?.id, characters, getActiveCharacter]);

  // Sync active character based on priority:
  // 1. If selectedTrack exists, show its character
  // 2. Otherwise, fall back to activeCharacterId (keep existing active character)
  useEffect(() => {
    // PRIORITY 1: Show character for selectedTrack
    if (selectedTrack?.id) {
      const activeChar = getActiveCharacter();

      // If current active character already "belongs" to this track, don't change it
      if (activeChar && (activeChar.seed === selectedTrack.id || activeChar.seed.startsWith(`${selectedTrack.id}-`))) {
        return;
      }

      // Otherwise, see if we have a deterministic character to switch to
      const matchingCharacter = characters.find((c) => c.seed === selectedTrack.id);

      if (matchingCharacter) {
        setActiveCharacter(matchingCharacter.seed);
      } else {
        // No character exists for this track yet, and current active isn't related
        // Clear active character to show the "Ready to generate" state
        setActiveCharacter(null as unknown as string);
      }

      // Reset game mode selection state when switching tracks
      setShowGameModeSelector(false);
      return;
    }

    // Reset game mode selection state
    setShowGameModeSelector(false);
  }, [selectedTrack?.id, characters, setActiveCharacter, getActiveCharacter]);

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

    // Check if character already exists for this track (either deterministic or spiced version)
    const isRegenerating = characters.some(
      c => c.seed === selectedTrack.id || c.seed.startsWith(`${selectedTrack.id}-`)
    );

    // Determine the seed based on generation mode
    // Deterministic: use track ID (stable)
    // Non-deterministic: use track ID + random suffix for "spice" while keeping link to track
    const seed = generationMode === 'deterministic'
      ? selectedTrack.id
      : `${selectedTrack.id}-${Math.random().toString(36).substring(2, 9)}`;

    // Build advanced options for generation (Task 1.5, Task 3.5)
    const generationOptions = {
      forceName: advancedOptions.forceName || undefined,
      deterministicName: advancedOptions.deterministicName,
      forceRace: advancedOptions.forceRace,
      forceClass: advancedOptions.forceClass,
      subrace: advancedOptions.subrace,
      // Task 3.5: Pass equipment to generation
      extensions: injectionEquipment.length > 0
        ? { equipment: injectionEquipment.map(e => ({ equipment: e })) }
        : undefined
    };

    await generateCharacter(audioProfile, seed, gameMode, selectedTrack, generationOptions);

    // Hide the game mode selector after generation
    setShowGameModeSelector(false);

    // Show appropriate message based on whether this was a new generation or regeneration
    if (isRegenerating) {
      showToast('✨ Character regenerated! Stats have been reset to base values.', 'success');
    } else {
      showToast('✨ Character generated successfully!', 'success');
    }
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
          <div className="character-gen-header-subtitle">Generate D&D characters from audio profiles</div>
        </div>
        <div className="character-gen-actions">
          {/* Show "New" button when selector is closed, "Generate" when selector is open */}
          {!showGameModeSelector ? (
            <Button
              onClick={() => setShowGameModeSelector(true)}
              disabled={!audioProfile}
              leftIcon={Plus}
              variant="primary"
              size="sm"
            >
              New
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !audioProfile}
              isLoading={isGenerating}
              leftIcon={Wand2}
              variant="primary"
              size="sm"
            >
              Generate
            </Button>
          )}
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

      {/* Selection Section - show when "New" was clicked */}
      {showGameModeSelector && (
        <div className="character-gen-selection-grid fade-in">
          <GameModeToggle
            value={gameMode}
            onChange={setGameMode}
          />
          <GenerationModeToggle
            value={generationMode}
            onChange={setGenerationMode}
          />
        </div>
      )}

      {/* Advanced Options Section - Task 1.5: Show when "New" was clicked */}
      {showGameModeSelector && (
        <div className="fade-in">
          <AdvancedOptionsSection
            value={advancedOptions}
            onChange={setAdvancedOptions}
          />
        </div>
      )}

      {/* Equipment Injection Section - Task 3.4: Show when "New" was clicked */}
      {showGameModeSelector && (
        <div className="equipment-injection-section fade-in">
          {/* Expandable Header */}
          <button
            type="button"
            className="equipment-injection-header"
            onClick={() => setShowEquipmentInjection(!showEquipmentInjection)}
            aria-expanded={showEquipmentInjection}
            aria-controls="equipment-injection-content"
          >
            <div className="equipment-injection-header-left">
              <Sword className="equipment-injection-header-icon" size={16} />
              <Shield className="equipment-injection-header-icon" size={16} />
              <span className="equipment-injection-title">Equipment Injection</span>
            </div>
            <div className="equipment-injection-header-right">
              {totalSelectedCount > 0 && (
                <span className="equipment-injection-count">
                  {totalSelectedCount} item{totalSelectedCount !== 1 ? 's' : ''} selected
                </span>
              )}
              <ChevronDown
                className={cn('equipment-injection-chevron', showEquipmentInjection && 'equipment-injection-chevron-expanded')}
                size={18}
              />
            </div>
          </button>

          {/* Collapsible Content */}
          <div
            id="equipment-injection-content"
            className={cn('equipment-injection-content', showEquipmentInjection && 'equipment-injection-content-expanded')}
          >
            {/* Category counts and Clear All button */}
            <div className="equipment-injection-controls">
              <div className="equipment-injection-counts">
                <span className="equipment-injection-count-item">
                  <Sword size={12} /> {selectedWeaponsCount} weapon{selectedWeaponsCount !== 1 ? 's' : ''}
                </span>
                <span className="equipment-injection-count-item">
                  <Shield size={12} /> {selectedArmorCount} armor
                </span>
                <span className="equipment-injection-count-item">
                  <Package size={12} /> {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''}
                </span>
              </div>
              {totalSelectedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Trash2}
                  onClick={handleClearInjectionEquipment}
                  className="equipment-injection-clear-btn"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Helper text */}
            <div className="equipment-injection-hint">
              Selected items will be added to the character's starting equipment.
            </div>

            {/* Category browsers grid */}
            <div className="equipment-injection-browsers-grid">
              <EquipmentBrowser
                category="weapon"
                selectedItems={injectionEquipment}
                onSelect={handleAddEquipment}
                onDeselect={handleRemoveEquipment}
                maxHeight="200px"
              />
              <EquipmentBrowser
                category="armor"
                selectedItems={injectionEquipment}
                onSelect={handleAddEquipment}
                onDeselect={handleRemoveEquipment}
                maxHeight="200px"
              />
              <EquipmentBrowser
                category="item"
                selectedItems={injectionEquipment}
                onSelect={handleAddEquipment}
                onDeselect={handleRemoveEquipment}
                maxHeight="200px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Status Messages */}
      {importError && (
        <div className="character-status-message error fade-in">
          <div className="character-status-title error">Import Error</div>
          <div className="character-status-text">{importError}</div>
        </div>
      )}
      {importSuccess && (
        <div className="character-status-message success fade-in">
          <div className="character-status-title success">Success!</div>
          <div className="character-status-text">Character imported successfully. Check the Character Leveling tab to view all stored characters.</div>
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
            <div className="character-gen-empty-description">
              Select a track from the Playlist tab and analyze its audio to generate a unique character based on the audio profile.
            </div>
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
              <div className="character-ready-title">Ready to generate</div>
              <div className="character-ready-description">
                Using audio profile from <span>{selectedTrack.title}</span> by {selectedTrack.artist}
              </div>
              <div className="character-ready-seed">
                {generationMode === 'deterministic' ? (
                  <>Seed: {selectedTrack.id} (deterministic - same track always generates same character)</>
                ) : (
                  <>Mode: Non-Deterministic (random spice enabled - audio profile will influence random results)</>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {character && (
        <div className="character-sheet fade-in-up">
          {/* Combined Character Header and Stats Card */}
          <div className="character-header-stats-card">
            <div className="character-header-stats-content">
              {/* Left Section: Character Avatar and Info */}
              <div className="character-info-section">
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
                  <div className="character-class">
                    Race: {character.race}{character.subrace ? ` (${character.subrace})` : ''} | Class: {character.class}
                  </div>
                  <div className="character-xp">
                    XP: {character.xp.current} / {character.xp.next_level}
                  </div>
                </div>
              </div>

              {/* Right Section: Core Stats Grid */}
              <div className="character-stats-grid">
                <Card variant="elevated" padding="sm" className="character-stat-card">
                  <div className="character-stat-label">HP</div>
                  <div className="character-stat-value character-count-up">{character.hp.current}/{character.hp.max}</div>
                </Card>
                <Card variant="elevated" padding="sm" className="character-stat-card">
                  <div className="character-stat-label">
                    AC <Tooltip content="Armor Class (AC): How hard you are to hit in combat. Attackers must roll equal to or higher than this number to successfully strike you. Ranges from 10 (unarmored) up to 20+ (heavy armor with magic), with your Dexterity modifier often adding to this value." />
                  </div>
                  <div className="character-stat-value character-count-up">{character.armor_class}</div>
                </Card>
                <Card variant="elevated" padding="sm" className="character-stat-card">
                  <div className="character-stat-label">
                    Initiative <Tooltip content="Initiative: Your reflexes and reaction time in combat. Higher initiative means you act earlier in the turn order. Calculated as your Dexterity modifier plus the roll of a d20 when combat begins." />
                  </div>
                  <div className="character-stat-value character-count-up">+{character.initiative}</div>
                </Card>
                <Card variant="elevated" padding="sm" className="character-stat-card">
                  <div className="character-stat-label">
                    Speed <Tooltip content="Speed: How many feet your character can move in one 6-second turn during combat. Most races have 30 feet speed (Dwarves and Halflings have 25). You can split this movement before and after your actions." />
                  </div>
                  <div className="character-stat-value character-count-up">{character.speed} ft</div>
                </Card>
                <Card variant="elevated" padding="sm" className="character-stat-card">
                  <div className="character-stat-label">
                    Proficiency <Tooltip content="Proficiency Bonus: A measure of your overall training that adds to attacks, skills, and saving throws you're proficient with. Starts at +2 and increases to +6 by level 17. You add this bonus whenever you use something your character has specifically trained in." />
                  </div>
                  <div className="character-stat-value character-count-up">+{character.proficiency_bonus}</div>
                </Card>
              </div>
            </div>
          </div>

          {/* Active Effects Summary Card (Task 2.2) */}
          {(character.feature_effects?.length || character.equipment_effects?.length) && (
            <Card variant="default" padding="sm">
              <ActiveEffectsSummary
                featureEffects={character.feature_effects}
                equipmentEffects={character.equipment_effects}
              />
            </Card>
          )}

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
              <div className="character-audio-trait-note">
                Higher values in each audio trait contribute to higher ability scores. The combination of traits creates unique character builds based on the audio profile.
              </div>
            </Card>
          )}

          {/* Ability Scores */}
          <Card variant="default" padding="md">
            <div className="character-section-title">
              Ability Scores
              <Tooltip content="Ability Scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) represent your character's raw natural talent. Each score has a modifier (ranging from -5 to +5) that you add to related actions—attacks, damage, skill checks, and saving throws. These modifiers are calculated as floor((score - 10) / 2), so a score of 14 gives a +2 modifier while a score of 8 gives a -1." />
            </div>
            <div className="character-abilities-grid">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                <div key={ability} className="character-ability-card">
                  <div className="character-ability-label">{ability}</div>
                  <div className="character-ability-score character-count-up">{character.ability_scores[ability]}</div>
                  <div className="character-ability-modifier">
                    {character.ability_modifiers[ability] >= 0 ? '+' : ''}
                    {character.ability_modifiers[ability]}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Saving Throws */}
          <Card variant="default" padding="md">
            <div className="character-section-title">
              Saving Throws
              <Tooltip content="Saving throws are your ability to resist sudden threats—dodging fireballs, enduring poison, or shaking off mind control. You roll a d20 plus the relevant ability modifier, plus your proficiency bonus if your class is trained in that saving throw. Each class specializes in two saving throws (like Constitution for Barbarians or Dexterity for Rogues)." />
            </div>
            <div className="character-saving-throws-grid">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                <div
                  key={ability}
                  className={`character-saving-throw-item ${character.saving_throws?.[ability] ? 'proficient' : ''}`}
                  title={character.saving_throws?.[ability] ? 'Proficient' : 'Not proficient'}
                >
                  <span className="character-saving-throw-ability">{ability}</span>
                  <span className="character-saving-throw-indicator">
                    {character.saving_throws?.[ability] ? (
                      <Check size={14} />
                    ) : (
                      <span className="character-saving-throw-empty">○</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Skills Grid */}
          <Card variant="default" padding="md">
            <div className="character-section-title">
              Skills
              <Tooltip content="Skills represent specific trained abilities like Stealth, Athletics, or Persuasion. When making a skill check, you roll a d20 plus the ability modifier (like DEX for Stealth) and add your proficiency bonus if you're trained in that skill. Some characters (Bards and Rogues) can have expertise in skills, adding double their proficiency bonus for even better results." />
            </div>
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

          {/* Race & Heritage */}
          <Card variant="default" padding="md">
            <div className="character-section-title">Race & Heritage</div>
            <div className="character-appearance-section">
              <div className="character-appearance-row">
                <span className="character-appearance-label">Race</span>
                <span className="character-appearance-value">{character.race}</span>
              </div>
              {character.subrace && (
                <div className="character-appearance-row">
                  <span className="character-appearance-label">Subrace</span>
                  <span className="character-appearance-value">{character.subrace}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Racial Traits */}
          {character.racial_traits && character.racial_traits.length > 0 && (
            <Card variant="default" padding="md">
              <div className="character-section-title">
                Racial Traits
                <Tooltip content="Racial Traits are innate special abilities that all members of your character's race possess. Examples include Darkvision (seeing in darkness), Dwarven Resilience (resisting poison), or Fey Ancestry (resisting magic charms). These traits are passive bonuses that are always active and don't require any action to use." />
              </div>
              <div className="character-traits-grid">
                {character.racial_traits.map((trait, idx) => {
                  const displayName = resolveTraitName(trait);
                  const effects = getTraitEffects(trait);
                  const isSelected = selectedTraitId === trait;
                  return (
                    <span
                      key={idx}
                      className={cn('character-trait-badge', isSelected && 'character-trait-badge-selected')}
                      onClick={() => setSelectedTraitId(trait)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTraitId(trait);
                        }
                      }}
                    >
                      {displayName}
                      {effects && effects.length > 0 && (
                        <InlineEffectIndicators effects={effects} />
                      )}
                    </span>
                  );
                })}
              </div>
              {/* Task 3.3: Trait Detail Row */}
              <DetailRow
                isVisible={selectedTraitId !== null}
                title={selectedTraitId ? resolveTraitName(selectedTraitId) : ''}
                description={selectedTraitId ? getTraitDescription(selectedTraitId) : undefined}
                properties={selectedTraitId ? [
                  { label: 'Source', value: character.race || 'Racial Trait' }
                ] : undefined}
                effects={selectedTraitId ? getTraitEffects(selectedTraitId) : undefined}
              />
            </Card>
          )}

          {/* Class Features */}
          {character.class_features && character.class_features.length > 0 && (
            <Card variant="default" padding="md">
              <div className="character-section-title">
                Class Features
                <Tooltip content="Class Features are special abilities and techniques your character learns as they level up, representing their specialized training. Examples include Action Surge (Fighters can act twice), Rage (Barbarians gain combat bonuses), or Spellcasting (magic users learn to cast spells). Features unlock at specific levels and make each class play differently." />
              </div>
              <div className="character-traits-grid">
                {character.class_features.map((feature, idx) => {
                  const displayName = resolveFeatureName(feature);
                  const description = getFeatureDescription(feature);
                  const effects = getFeatureEffects(feature);
                  return (
                    <span
                      key={idx}
                      className="character-trait-badge"
                      title={description || feature}
                    >
                      {displayName}
                      {effects && effects.length > 0 && (
                        <InlineEffectIndicators effects={effects} />
                      )}
                    </span>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Appearance */}
          {character.appearance && (
            <Card variant="default" padding="md">
              <div className="character-section-title">
                Appearance
                <Tooltip content="Your character's physical appearance is generated deterministically from the music's characteristics—body type, skin tone, hair color and style, eye color, and 1-3 facial features like scars or tattoos are all derived from the audio profile. Magical classes also gain an aura color that glows with mystical energy based on the album artwork's color palette." />
              </div>
              <div className="character-appearance-section">
                {/* Body Type */}
                {character.appearance.body_type && (
                  <div className="character-appearance-row">
                    <span className="character-appearance-label">Body Type</span>
                    <span className="character-appearance-value">{character.appearance.body_type}</span>
                  </div>
                )}

                {/* Color Swatches Grid */}
                <div className="character-appearance-colors-grid">
                  {character.appearance.skin_tone && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.skin_tone }}
                        title="Skin Tone"
                      />
                      <span className="character-appearance-color-label">Skin</span>
                    </div>
                  )}
                  {character.appearance.hair_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.hair_color }}
                        title="Hair Color"
                      />
                      <span className="character-appearance-color-label">Hair</span>
                    </div>
                  )}
                  {character.appearance.eye_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.eye_color }}
                        title="Eye Color"
                      />
                      <span className="character-appearance-color-label">Eyes</span>
                    </div>
                  )}
                  {character.appearance.primary_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.primary_color }}
                        title="Primary Color"
                      />
                      <span className="character-appearance-color-label">Primary</span>
                    </div>
                  )}
                  {character.appearance.secondary_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.secondary_color }}
                        title="Secondary Color"
                      />
                      <span className="character-appearance-color-label">Secondary</span>
                    </div>
                  )}
                  {(character.appearance as any).accent_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: (character.appearance as any).accent_color }}
                        title="Accent Color"
                      />
                      <span className="character-appearance-color-label">Accent</span>
                    </div>
                  )}
                  {character.appearance.aura_color && (
                    <div className="character-appearance-color-item">
                      <div
                        className="character-appearance-color-swatch"
                        style={{ backgroundColor: character.appearance.aura_color }}
                        title="Aura Color"
                      />
                      <span className="character-appearance-color-label">Aura</span>
                    </div>
                  )}
                </div>

                {/* Hair Style */}
                {character.appearance.hair_style && (
                  <div className="character-appearance-row">
                    <span className="character-appearance-label">Hair Style</span>
                    <span className="character-appearance-value">{character.appearance.hair_style}</span>
                  </div>
                )}

                {/* Facial Features */}
                {character.appearance.facial_features && character.appearance.facial_features.length > 0 && (
                  <div className="character-appearance-features">
                    <span className="character-appearance-label">Facial Features</span>
                    <div className="character-traits-grid">
                      {character.appearance.facial_features.map((feature, idx) => (
                        <span key={idx} className="character-trait-badge">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Equipment */}
          {character.equipment && (character.equipment.weapons.length > 0 || character.equipment.armor.length > 0 || character.equipment.items.length > 0) && (() => {
            const equipment = character.equipment;
            return (
              <Card variant="default" padding="md">
                <div className="character-section-title">
                  Equipment
                  <Tooltip content="Equipment includes weapons, armor, and adventure gear. Each item has a weight (in pounds) and can be equipped or unequipped. Equipped items contribute to your carried weight, and while the system tracks equipment, stat bonuses from gear are not currently applied to your character. Items can have quantities greater than 1, useful for things like ammunition or consumables." />
                </div>
                <div className="character-equipment-section">
                  {equipment.weapons.length > 0 && (
                    <Card variant="flat" padding="sm" className="character-equipment-card">
                      <div className="character-equipment-label">Weapons</div>
                      <div className="character-equipment-items">
                        {equipment.weapons.map((weapon, idx) => {
                          const equipmentData = getEquipmentData(weapon.name);
                          const rarity = equipmentData?.rarity || 'common';
                          const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                          const rarityBg = RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common;
                          const rarityBorder = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;
                          const tooltipContent = getEquipmentTooltip(equipmentData);
                          // Task 2.4: Get equipment effects for inline display
                          const weaponEffects = getEquipmentEffectsByName(weapon.name, character.equipment_effects);

                          return (
                            <div key={idx} className="character-equipment-item-wrapper">
                              <span
                                className={`character-equipment-item ${weapon.equipped ? 'character-equipment-item-equipped' : ''}`}
                                style={{
                                  backgroundColor: rarityBg,
                                  borderColor: rarityBorder
                                }}
                                title={tooltipContent}
                              >
                                {weapon.equipped && <Check className="character-equipment-checkmark" size={14} />}
                                <span style={{ color: rarityColor, fontWeight: 500 }}>{weapon.name}</span>
                                {weapon.quantity > 1 && <span className="character-equipment-quantity"> ×{weapon.quantity}</span>}
                                {weapon.equipped && <span className="character-equipment-badge">Equipped</span>}
                              </span>
                              {/* Task 2.4: Inline Equipment Effects */}
                              <InlineEquipmentEffectIndicators equipmentEffect={weaponEffects} />
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                  {equipment.armor.length > 0 && (
                    <Card variant="flat" padding="sm" className="character-equipment-card">
                      <div className="character-equipment-label">Armor</div>
                      <div className="character-equipment-items">
                        {equipment.armor.map((armor, idx) => {
                          const equipmentData = getEquipmentData(armor.name);
                          const rarity = equipmentData?.rarity || 'common';
                          const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                          const rarityBg = RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common;
                          const rarityBorder = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;
                          const tooltipContent = getEquipmentTooltip(equipmentData);
                          // Task 2.4: Get equipment effects for inline display
                          const armorEffects = getEquipmentEffectsByName(armor.name, character.equipment_effects);

                          return (
                            <div key={idx} className="character-equipment-item-wrapper">
                              <span
                                className={`character-equipment-item ${armor.equipped ? 'character-equipment-item-equipped' : ''}`}
                                style={{
                                  backgroundColor: rarityBg,
                                  borderColor: rarityBorder
                                }}
                                title={tooltipContent}
                              >
                                {armor.equipped && <Check className="character-equipment-checkmark" size={14} />}
                                <span style={{ color: rarityColor, fontWeight: 500 }}>{armor.name}</span>
                                {armor.quantity > 1 && <span className="character-equipment-quantity"> ×{armor.quantity}</span>}
                                {armor.equipped && <span className="character-equipment-badge">Equipped</span>}
                              </span>
                              {/* Task 2.4: Inline Equipment Effects */}
                              <InlineEquipmentEffectIndicators equipmentEffect={armorEffects} />
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                  {equipment.items.length > 0 && (
                    <Card variant="flat" padding="sm" className="character-equipment-card">
                      <div className="character-equipment-label">
                        <Package size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        Items
                      </div>
                      <div className="character-equipment-items">
                        {equipment.items.map((item, idx) => {
                          const isAmmo = isAmmunition(item.name);
                          const ammoWeight = isAmmo ? getAmmunitionWeight(item.name) : null;
                          const totalAmmoWeight = ammoWeight !== null
                            ? Math.round(ammoWeight * item.quantity * 100) / 100
                            : null;

                          const equipmentData = getEquipmentData(item.name);
                          const rarity = equipmentData?.rarity || 'common';
                          const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                          const rarityBg = isAmmo
                            ? 'linear-gradient(135deg, hsl(var(--cute-orange) / 0.1), hsl(var(--cute-yellow) / 0.05))'
                            : (RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common);
                          const rarityBorder = isAmmo
                            ? 'hsl(var(--cute-orange) / 0.3)'
                            : (RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common);
                          const tooltipContent = getEquipmentTooltip(equipmentData);
                          // Task 2.4: Get equipment effects for inline display
                          const itemEffects = getEquipmentEffectsByName(item.name, character.equipment_effects);

                          return (
                            <div key={idx} className="character-equipment-item-wrapper">
                              <span
                                className={`character-equipment-item ${item.equipped ? 'character-equipment-item-equipped' : ''} ${isAmmo ? 'character-equipment-item-ammunition' : ''}`}
                                style={{
                                  backgroundColor: isAmmo ? undefined : rarityBg,
                                  background: isAmmo ? rarityBg : undefined,
                                  borderColor: rarityBorder
                                }}
                                title={tooltipContent}
                              >
                                {item.equipped && <Check className="character-equipment-checkmark" size={14} />}
                                {isAmmo && <Target className="character-equipment-ammo-icon" size={14} />}
                                <span style={{ color: rarityColor, fontWeight: 500 }}>{item.name}</span>
                                {item.quantity > 1 && <span className="character-equipment-quantity"> ×{item.quantity}</span>}
                                {isAmmo && ammoWeight !== null && (
                                  <span
                                    className="character-equipment-ammo-weight"
                                    title={`${ammoWeight} lb each × ${item.quantity} = ${totalAmmoWeight} lb total`}
                                  >
                                    ({totalAmmoWeight} lb)
                                  </span>
                                )}
                                {item.equipped && <span className="character-equipment-badge">Equipped</span>}
                              </span>
                              {/* Task 2.4: Inline Equipment Effects */}
                              <InlineEquipmentEffectIndicators equipmentEffect={itemEffects} />
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                  {/* Equipment Weight Display */}
                  <div className="character-equipment-weight">
                    <span className="character-equipment-weight-label">Equipped: <strong>{equipment.equippedWeight} lbs</strong></span>
                    <span className="character-equipment-weight-separator">|</span>
                    <span className="character-equipment-weight-label">Total: <strong>{equipment.totalWeight} lbs</strong></span>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Spells */}
          {character.spells && (
            <Card variant="default" padding="md">
              <div className="character-section-title">
                Spells
                <Tooltip content="Spells are magical abilities that spellcasters can use. Cantrips are weak spells you can cast endlessly, while leveled spells consume spell slots (a limited resource that refreshes after a long rest). Each spell has a casting time, range, duration, and effects—spells can deal damage, heal allies, create magical effects, or manipulate the battlefield." />
              </div>
              <div className="character-equipment-section">
                {character.spells.cantrips.length > 0 && (
                  <Card variant="flat" padding="sm" className="character-equipment-card">
                    <div className="character-equipment-label">Cantrips</div>
                    <div className="character-equipment-items">{character.spells.cantrips.join(', ')}</div>
                  </Card>
                )}
                {character.spells.known_spells.length > 0 && (
                  <Card variant="flat" padding="sm" className="character-equipment-card">
                    <div className="character-equipment-label">Known Spells</div>
                    <div className="character-equipment-items">{character.spells.known_spells.join(', ')}</div>
                  </Card>
                )}
                {character.spells.cantrips.length === 0 && character.spells.known_spells.length === 0 && (
                  <div className="character-spells-empty">No spells learned yet</div>
                )}
              </div>
            </Card>
          )}

          {/* Raw JSON Dump - Character Sheet */}
          <Card variant="default" padding="md">
            <div className="character-section-title">Raw Character Data</div>
            <CardDescription style={{ marginTop: '0.25rem' }}>
              Complete character sheet data from the playlist-data-engine CharacterGenerator module
            </CardDescription>
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
