/**
 * PartyTab Component
 *
 * Displays all analyzed characters in a grid view.
 * Features: search, sort, detail modal, empty state.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Users, Search, X, Trash2, ChevronDown, Check, Star, Circle, Target } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useFeatureNames } from '../../hooks/useFeatureNames';
import { CharacterCard } from '../ui/CharacterCard';
import { getCharacterAvatar, getStatIcon } from '../../utils/characterIcons';
import { logger } from '../../utils/logger';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { showToast } from '../ui/Toast';
import { Tooltip } from '../ui/Tooltip';
import './PartyTab.css';

type SortOption = 'date-added' | 'level' | 'name' | 'xp' | 'class';

const SORT_OPTIONS: Record<SortOption, string> = {
  'date-added': 'Date Added',
  'level': 'Level',
  'name': 'Name',
  'xp': 'XP',
  'class': 'Class',
};

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/**
 * Calculate XP progress percentage for current level
 */
function calculateXPProgress(character: { level: number; xp: { current: number; next_level: number } }): number {
  const { xp, level } = character;
  const prevLevelThreshold = XP_THRESHOLDS[level - 1] || 0;
  const currentLevelProgress = xp.current - prevLevelThreshold;
  const levelXPNeeded = xp.next_level - prevLevelThreshold;
  return levelXPNeeded > 0 ? (currentLevelProgress / levelXPNeeded) * 100 : 0;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get skill proficiency display
 */
function getSkillProficiencyDisplay(prof: string): string {
  if (prof === 'expertise') return '★★';
  if (prof === 'proficient') return '★';
  return '○';
}

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

export function PartyTab() {
  const { characters, resetCharacters, activeCharacterId, setActiveCharacter } = useCharacterStore();
  const { resolveFeatureName, resolveTraitName, getFeatureDescription, getTraitDescription } = useFeatureNames();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [selectedCharacter, setSelectedCharacter] = useState<typeof characters[number] | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Loading states
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [settingActiveSeed, setSettingActiveSeed] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Hero selection state for party analysis
  // All heroes are selected by default
  const [selectedHeroSeeds, setSelectedHeroSeeds] = useState<Set<string>>(() => {
    return new Set(characters.map(c => c.seed));
  });

  // Sync selectedHeroSeeds when characters change (new characters added/removed)
  useEffect(() => {
    setSelectedHeroSeeds(prevSeeds => {
      const characterSeeds = new Set(characters.map(c => c.seed));
      // Add new characters (auto-select new additions)
      const newSeeds = new Set(prevSeeds);
      characters.forEach(c => {
        if (!prevSeeds.has(c.seed)) {
          newSeeds.add(c.seed);
        }
      });
      // Remove seeds for characters that no longer exist
      newSeeds.forEach(seed => {
        if (!characterSeeds.has(seed)) {
          newSeeds.delete(seed);
        }
      });
      return newSeeds;
    });
  }, [characters]);

  // Toggle selection for a single hero
  const toggleHeroSelection = useCallback((seed: string) => {
    setSelectedHeroSeeds(prevSeeds => {
      const newSeeds = new Set(prevSeeds);
      if (newSeeds.has(seed)) {
        newSeeds.delete(seed);
      } else {
        newSeeds.add(seed);
      }
      return newSeeds;
    });
  }, []);

  // Select all heroes
  const selectAllHeroes = useCallback(() => {
    setSelectedHeroSeeds(new Set(characters.map(c => c.seed)));
  }, [characters]);

  // Deselect all heroes
  const deselectAllHeroes = useCallback(() => {
    setSelectedHeroSeeds(new Set());
  }, []);

  // Hero selection state is ready for Phase 2/3 integration:
  // - selectedHeroSeeds: Set of seeds for heroes included in party analysis
  // - toggleHeroSelection(seed): Toggle a single hero's selection
  // - selectAllHeroes(): Select all heroes
  // - deselectAllHeroes(): Deselect all heroes
  // These will be passed to PartyOverviewPanel and used in Selection Controls Bar
  void selectedHeroSeeds;
  void toggleHeroSelection;
  void selectAllHeroes;
  void deselectAllHeroes;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  const handleSortSelect = (value: SortOption) => {
    setSortBy(value);
    setIsSortDropdownOpen(false);
  };

  // Filter and sort characters
  const filteredAndSortedCharacters = useMemo(() => {
    let filtered = characters;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((char) =>
        char.name.toLowerCase().includes(query) ||
        char.class.toLowerCase().includes(query) ||
        char.race.toLowerCase().includes(query)
      );
    }

    // Sort characters
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'level':
          return b.level - a.level;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'xp':
          return b.xp.current - a.xp.current;
        case 'class':
          return a.class.localeCompare(b.class);
        case 'date-added':
        default:
          // Sort by generated_at timestamp (newest first)
          const aDate = new Date(a.generated_at || 0).getTime();
          const bDate = new Date(b.generated_at || 0).getTime();
          return bDate - aDate;
      }
    });

    return sorted;
  }, [characters, searchQuery, sortBy]);

  const handleCardClick = (character: typeof characters[number]) => {
    setSelectedCharacter(character);
  };

  const handleCloseModal = () => {
    setSelectedCharacter(null);
  };

  const handleClearAll = async () => {
    if (isClearing) return;

    const confirmMessage = `Are you sure you want to delete all ${characters.length} character(s)? This cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsClearing(true);
    try {
      logger.info('System', 'PartyTab: Clearing all characters', { count: characters.length });
      resetCharacters();
      setSelectedCharacter(null);
      showToast(`Successfully deleted ${characters.length} character(s)`, 'success');
      logger.info('System', 'PartyTab: All characters cleared successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear characters';
      logger.error('System', 'PartyTab: Failed to clear characters', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSetActiveCharacter = async (characterSeed: string) => {
    if (isSettingActive) return;

    setIsSettingActive(true);
    setSettingActiveSeed(characterSeed);
    try {
      // Find the character for toast message
      const character = characters.find(c => c.seed === characterSeed);
      const characterName = character?.name || 'Unknown character';

      // Set the active character (existing behavior)
      setActiveCharacter(characterSeed);

      // NEW: Find and select the corresponding track for bidirectional sync
      const { currentPlaylist, selectTrack } = usePlaylistStore.getState();
      const { load } = useAudioPlayerStore.getState();

      if (currentPlaylist) {
        const matchingTrack = currentPlaylist.tracks.find((t) => t.id === characterSeed);
        if (matchingTrack) {
          logger.info('Store', 'PartyTab: Syncing track selection when setting active hero', {
            characterSeed,
            trackId: matchingTrack.id,
            trackTitle: matchingTrack.title
          });
          selectTrack(matchingTrack);
          // CRITICAL FIX: Load the new track into the audio player so it's ready to play
          // Without this, currentUrl remains outdated and clicking play won't work
          // Using load() instead of play() to avoid auto-playing - user clicks play button
          try {
            load(matchingTrack.audio_url);
          } catch (loadError) {
            logger.warn('Store', 'PartyTab: Failed to load track into audio player', {
              trackId: matchingTrack.id,
              error: loadError
            });
            // Track selection still worked, just audio loading failed - show warning toast
            showToast(`Set ${characterName} as active (audio loading failed)`, 'warning');
            return;
          }
        } else {
          logger.warn('Store', 'PartyTab: Could not find track for active character', {
            characterSeed,
            playlistName: currentPlaylist.name
          });
        }
      }

      showToast(`Set ${characterName} as active character`, 'success');
      logger.info('System', 'PartyTab: Active character set successfully', { characterSeed, characterName });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set active character';
      logger.error('System', 'PartyTab: Failed to set active character', error);
      showToast(errorMessage, 'error');
    } finally {
      setIsSettingActive(false);
      setSettingActiveSeed(null);
    }
  };

  // Empty state - no characters
  if (characters.length === 0) {
    return (
      <div className="party-tab">
        <header className="party-header">
          <div className="party-header-icon">
            <Users size={24} />
          </div>
          <div className="party-header-text">
            <h1 className="party-header-title">Party</h1>
            <h2 className="party-header-subtitle">View all your generated characters</h2>
          </div>
        </header>

        <Card variant="elevated" className="party-empty-state">
          <div className="party-empty-icon">👥</div>
          <h3 className="party-empty-title">No Characters Yet</h3>
          <div className="party-empty-description">
            Go to the Character Generation tab to create characters from your playlist tracks.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="party-tab">
      <header className="party-header">
        <div className="party-header-icon">
          <Users size={24} />
        </div>
        <div className="party-header-text">
          <h1 className="party-header-title">Party</h1>
          <h2 className="party-header-subtitle">
            {characters.length} {characters.length === 1 ? 'character' : 'characters'}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          leftIcon={Trash2}
          disabled={isClearing}
          isLoading={isClearing}
          title={`Delete all ${characters.length} character(s)`}
        >
          {isClearing ? 'Clearing...' : 'Clear All'}
        </Button>
      </header>

      {/* Controls: Search and Sort */}
      <div className="party-controls">
        <div className="party-search">
          <Input
            type="text"
            placeholder="Search by name, class, or race..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={Search}
            size="md"
          />
        </div>
        <div className="party-sort" ref={sortDropdownRef}>
          <button
            className="party-sort-dropdown-btn"
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            aria-label={`Sort by ${SORT_OPTIONS[sortBy]}`}
            aria-expanded={isSortDropdownOpen}
          >
            <span className="party-sort-label">{SORT_OPTIONS[sortBy]}</span>
            <ChevronDown
              size={16}
              className={`party-sort-chevron ${isSortDropdownOpen ? 'party-sort-chevron-open' : ''}`}
            />
          </button>
          {isSortDropdownOpen && (
            <div className="party-sort-dropdown-menu">
              {(Object.entries(SORT_OPTIONS) as [SortOption, string][]).map(([value, label]) => (
                <button
                  key={value}
                  className={`party-sort-dropdown-item ${sortBy === value ? 'party-sort-dropdown-item-active' : ''}`}
                  onClick={() => handleSortSelect(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* No results state */}
      {filteredAndSortedCharacters.length === 0 && (
        <Card variant="default" className="party-no-results">
          <div className="party-no-results-icon">🔍</div>
          <h3 className="party-no-results-title">No Results Found</h3>
          <div className="party-no-results-text">
            Try adjusting your search or sort criteria.
          </div>
        </Card>
      )}

      {/* Character Grid */}
      <div className="party-grid">
        {filteredAndSortedCharacters.map((character) => (
          <CharacterCard
            key={character.seed}
            character={character}
            onClick={() => handleCardClick(character)}
            variant="selectable"
            isActive={character.seed === activeCharacterId}
            onSetActive={() => handleSetActiveCharacter(character.seed)}
            isLoading={isSettingActive && settingActiveSeed === character.seed}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedCharacter && (
        <div className="party-detail-modal" onClick={handleCloseModal}>
          <div className="party-detail-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="party-detail-header">
              <div className="party-detail-title-section">
                <div className="party-detail-avatar">{getCharacterAvatar(selectedCharacter.class)}</div>
                <div className="party-detail-info">
                  <h2>{selectedCharacter.name}</h2>
                  <div>
                    Race: {selectedCharacter.race}{selectedCharacter.subrace ? ` (${selectedCharacter.subrace})` : ''} | Class: {selectedCharacter.class}
                  </div>
                </div>
              </div>
              <button className="party-detail-close" onClick={handleCloseModal} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="party-detail-body">
              {/* Core Stats */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">Core Stats</h4>
                <div className="party-detail-stats-grid">
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('HP')}</span>
                    <div>
                      <div className="party-detail-stat-label">Hit Points</div>
                      <div className="party-detail-stat-value">{selectedCharacter.hp.current}/{selectedCharacter.hp.max}</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('AC')}</span>
                    <div>
                      <div className="party-detail-stat-label">
                        Armor Class <Tooltip content="Armor Class (AC): How hard you are to hit in combat. Attackers must roll equal to or higher than this number to successfully strike you. Ranges from 10 (unarmored) up to 20+ (heavy armor with magic), with your Dexterity modifier often adding to this value." />
                      </div>
                      <div className="party-detail-stat-value">{selectedCharacter.armor_class}</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('Initiative')}</span>
                    <div>
                      <div className="party-detail-stat-label">
                        Initiative <Tooltip content="Initiative: Your reflexes and reaction time in combat. Higher initiative means you act earlier in the turn order. Calculated as your Dexterity modifier plus the roll of a d20 when combat begins." />
                      </div>
                      <div className="party-detail-stat-value">+{selectedCharacter.initiative}</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('Speed')}</span>
                    <div>
                      <div className="party-detail-stat-label">
                        Speed <Tooltip content="Speed: How many feet your character can move in one 6-second turn during combat. Most races have 30 feet speed (Dwarves and Halflings have 25). You can split this movement before and after your actions." />
                      </div>
                      <div className="party-detail-stat-value">{selectedCharacter.speed} ft</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon"><Star size={16} /></span>
                    <div>
                      <div className="party-detail-stat-label">
                        Proficiency <Tooltip content="Proficiency Bonus: A measure of your overall training that adds to attacks, skills, and saving throws you're proficient with. Starts at +2 and increases to +6 by level 17. You add this bonus whenever you use something your character has specifically trained in." />
                      </div>
                      <div className="party-detail-stat-value">+{selectedCharacter.proficiency_bonus}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ability Scores */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">
                  Ability Scores
                  <Tooltip content="Ability Scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma) represent your character's raw natural talent. Each score has a modifier (ranging from -5 to +5) that you add to related actions—attacks, damage, skill checks, and saving throws. These modifiers are calculated as floor((score - 10) / 2), so a score of 14 gives a +2 modifier while a score of 8 gives a -1." />
                </h4>
                <div className="party-detail-abilities-grid">
                  {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                    <div key={ability} className="party-detail-ability-item">
                      <div className="party-detail-ability-name">{ability}</div>
                      <div className="party-detail-ability-score">{selectedCharacter.ability_scores[ability]}</div>
                      <div className="party-detail-ability-modifier">
                        {selectedCharacter.ability_modifiers[ability] >= 0 ? '+' : ''}
                        {selectedCharacter.ability_modifiers[ability]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">
                  Skills
                  <Tooltip content="Skills represent specific trained abilities like Stealth, Athletics, or Persuasion. When making a skill check, you roll a d20 plus the ability modifier (like DEX for Stealth) and add your proficiency bonus if you're trained in that skill. Some characters (Bards and Rogues) can have expertise in skills, adding double their proficiency bonus for even better results." />
                </h4>
                <div className="party-detail-skills-list">
                  {Object.entries(selectedCharacter.skills).map(([skill, prof]) => {
                    const modifier = selectedCharacter.ability_modifiers[
                      skill.includes('Athletics') ? 'STR' :
                        skill.includes('Acrobatics|Sleight|Stealth') ? 'DEX' :
                          skill.includes('Arcana|History|Investigation|Nature|Religion') ? 'INT' :
                            skill.includes('Animal|Insight|Medicine|Perception|Survival') ? 'WIS' :
                              'CHA'
                    ] || 0;
                    const proficiencyBonus = prof === 'expertise' ? selectedCharacter.proficiency_bonus * 2 :
                      prof === 'proficient' ? selectedCharacter.proficiency_bonus : 0;
                    const totalMod = modifier + proficiencyBonus;

                    return (
                      <div key={skill} className="party-detail-skill-item">
                        <span className="party-detail-skill-name">{skill.replace(/_/g, ' ')}</span>
                        <span className={`party-detail-skill-modifier party-detail-skill-${prof}`}>
                          {totalMod >= 0 ? '+' : ''}{totalMod}
                        </span>
                        <span className={`party-detail-skill-proficient ${prof}`}>
                          {getSkillProficiencyDisplay(prof)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Saving Throws */}
              {selectedCharacter.saving_throws && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Saving Throws
                    <Tooltip content="Saving throws are your ability to resist sudden threats—dodging fireballs, enduring poison, or shaking off mind control. You roll a d20 plus the relevant ability modifier, plus your proficiency bonus if your class is trained in that saving throw. Each class specializes in two saving throws (like Constitution for Barbarians or Dexterity for Rogues)." />
                  </h4>
                  <div className="party-detail-saving-throws-grid">
                    {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((ability) => (
                      <div
                        key={ability}
                        className={`party-detail-saving-throw-item ${selectedCharacter.saving_throws[ability] ? 'proficient' : ''}`}
                        title={selectedCharacter.saving_throws[ability] ? 'Proficient' : 'Not proficient'}
                      >
                        <span className="party-detail-saving-throw-ability">{ability}</span>
                        <span className="party-detail-saving-throw-indicator">
                          {selectedCharacter.saving_throws[ability] ? (
                            <Check size={14} />
                          ) : (
                            <Circle size={14} />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Race & Heritage */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">Race & Heritage</h4>
                <div className="party-detail-appearance-section">
                  <div className="party-detail-appearance-row">
                    <span className="party-detail-appearance-label">Race</span>
                    <span className="party-detail-appearance-value">{selectedCharacter.race}</span>
                  </div>
                  {selectedCharacter.subrace && (
                    <div className="party-detail-appearance-row">
                      <span className="party-detail-appearance-label">Subrace</span>
                      <span className="party-detail-appearance-value">{selectedCharacter.subrace}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Racial Traits */}
              {selectedCharacter.racial_traits && selectedCharacter.racial_traits.length > 0 && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Racial Traits
                    <Tooltip content="Racial Traits are innate special abilities that all members of your character's race possess. Examples include Darkvision (seeing in darkness), Dwarven Resilience (resisting poison), or Fey Ancestry (resisting magic charms). These traits are passive bonuses that are always active and don't require any action to use." />
                  </h4>
                  <div className="party-detail-traits-grid">
                    {selectedCharacter.racial_traits.map((trait, idx) => {
                      const displayName = resolveTraitName(trait);
                      const description = getTraitDescription(trait);
                      return (
                        <span
                          key={idx}
                          className="party-detail-trait-badge"
                          title={description || trait}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Class Features */}
              {selectedCharacter.class_features && selectedCharacter.class_features.length > 0 && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Class Features
                    <Tooltip content="Class Features are special abilities and techniques your character learns as they level up, representing their specialized training. Examples include Action Surge (Fighters can act twice), Rage (Barbarians gain combat bonuses), or Spellcasting (magic users learn to cast spells). Features unlock at specific levels and make each class play differently." />
                  </h4>
                  <div className="party-detail-traits-grid">
                    {selectedCharacter.class_features.map((feature, idx) => {
                      const displayName = resolveFeatureName(feature);
                      const description = getFeatureDescription(feature);
                      return (
                        <span
                          key={idx}
                          className="party-detail-trait-badge"
                          title={description || feature}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Appearance */}
              {selectedCharacter.appearance && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Appearance
                    <Tooltip content="Your character's physical appearance is generated deterministically from the music's characteristics—body type, skin tone, hair color and style, eye color, and 1-3 facial features like scars or tattoos are all derived from the audio profile. Magical classes also gain an aura color that glows with mystical energy based on the album artwork's color palette." />
                  </h4>
                  <div className="party-detail-appearance-section">
                    {/* Body Type */}
                    {selectedCharacter.appearance.body_type && (
                      <div className="party-detail-appearance-row">
                        <span className="party-detail-appearance-label">Body Type</span>
                        <span className="party-detail-appearance-value">{selectedCharacter.appearance.body_type}</span>
                      </div>
                    )}

                    {/* Color Swatches Grid */}
                    <div className="party-detail-appearance-colors-grid">
                      {selectedCharacter.appearance.skin_tone && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.skin_tone }}
                            title="Skin Tone"
                          />
                          <span className="party-detail-appearance-color-label">Skin</span>
                        </div>
                      )}
                      {selectedCharacter.appearance.hair_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.hair_color }}
                            title="Hair Color"
                          />
                          <span className="party-detail-appearance-color-label">Hair</span>
                        </div>
                      )}
                      {selectedCharacter.appearance.eye_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.eye_color }}
                            title="Eye Color"
                          />
                          <span className="party-detail-appearance-color-label">Eyes</span>
                        </div>
                      )}
                      {selectedCharacter.appearance.primary_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.primary_color }}
                            title="Primary Color"
                          />
                          <span className="party-detail-appearance-color-label">Primary</span>
                        </div>
                      )}
                      {selectedCharacter.appearance.secondary_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.secondary_color }}
                            title="Secondary Color"
                          />
                          <span className="party-detail-appearance-color-label">Secondary</span>
                        </div>
                      )}
                      {(selectedCharacter.appearance as any).accent_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: (selectedCharacter.appearance as any).accent_color }}
                            title="Accent Color"
                          />
                          <span className="party-detail-appearance-color-label">Accent</span>
                        </div>
                      )}
                      {selectedCharacter.appearance.aura_color && (
                        <div className="party-detail-appearance-color-item">
                          <div
                            className="party-detail-appearance-color-swatch"
                            style={{ backgroundColor: selectedCharacter.appearance.aura_color }}
                            title="Aura Color"
                          />
                          <span className="party-detail-appearance-color-label">Aura</span>
                        </div>
                      )}
                    </div>

                    {/* Hair Style */}
                    {selectedCharacter.appearance.hair_style && (
                      <div className="party-detail-appearance-row">
                        <span className="party-detail-appearance-label">Hair Style</span>
                        <span className="party-detail-appearance-value">{selectedCharacter.appearance.hair_style}</span>
                      </div>
                    )}

                    {/* Facial Features */}
                    {selectedCharacter.appearance.facial_features && selectedCharacter.appearance.facial_features.length > 0 && (
                      <div className="party-detail-appearance-features">
                        <span className="party-detail-appearance-label">Facial Features</span>
                        <div className="party-detail-traits-grid">
                          {selectedCharacter.appearance.facial_features.map((feature, idx) => (
                            <span key={idx} className="party-detail-trait-badge">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {selectedCharacter.equipment && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Equipment
                    <Tooltip content="Equipment includes weapons, armor, and adventure gear. Each item has a weight (in pounds) and can be equipped or unequipped. Equipped items contribute to your carried weight, and while the system tracks equipment, stat bonuses from gear are not currently applied to your character. Items can have quantities greater than 1, useful for things like ammunition or consumables." />
                  </h4>
                  <div className="party-detail-equipment-section">
                    {selectedCharacter.equipment.weapons.length > 0 && (
                      <div className="party-detail-equipment-category">
                        <div className="party-detail-equipment-category-label">Weapons</div>
                        <div className="party-detail-equipment-items">
                          {selectedCharacter.equipment.weapons.map((weapon, idx) => (
                            <div key={idx} className={`party-detail-equipment-item ${weapon.equipped ? 'party-detail-equipment-item-equipped' : ''}`}>
                              {weapon.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                              <span className="party-detail-equipment-name">{weapon.name}</span>
                              {weapon.quantity > 1 && <span className="party-detail-equipment-quantity">×{weapon.quantity}</span>}
                              {weapon.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.equipment.armor.length > 0 && (
                      <div className="party-detail-equipment-category">
                        <div className="party-detail-equipment-category-label">Armor</div>
                        <div className="party-detail-equipment-items">
                          {selectedCharacter.equipment.armor.map((armor, idx) => (
                            <div key={idx} className={`party-detail-equipment-item ${armor.equipped ? 'party-detail-equipment-item-equipped' : ''}`}>
                              {armor.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                              <span className="party-detail-equipment-name">{armor.name}</span>
                              {armor.quantity > 1 && <span className="party-detail-equipment-quantity">×{armor.quantity}</span>}
                              {armor.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.equipment.items.length > 0 && (
                      <div className="party-detail-equipment-category">
                        <div className="party-detail-equipment-category-label">Items</div>
                        <div className="party-detail-equipment-items">
                          {selectedCharacter.equipment.items.map((item, idx) => {
                            const isAmmo = isAmmunition(item.name);
                            const ammoWeight = isAmmo ? getAmmunitionWeight(item.name) : null;
                            const totalAmmoWeight = ammoWeight !== null
                              ? Math.round(ammoWeight * item.quantity * 100) / 100
                              : null;

                            return (
                              <div key={idx} className={`party-detail-equipment-item ${item.equipped ? 'party-detail-equipment-item-equipped' : ''} ${isAmmo ? 'party-detail-equipment-item-ammunition' : ''}`}>
                                {item.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                                {isAmmo && <Target className="party-detail-equipment-ammo-icon" size={14} />}
                                <span className="party-detail-equipment-name">{item.name}</span>
                                {item.quantity > 1 && <span className="party-detail-equipment-quantity">×{item.quantity}</span>}
                                {isAmmo && ammoWeight !== null && (
                                  <span
                                    className="party-detail-equipment-ammo-weight"
                                    title={`${ammoWeight} lb each × ${item.quantity} = ${totalAmmoWeight} lb total`}
                                  >
                                    ({totalAmmoWeight} lb)
                                  </span>
                                )}
                                {item.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Equipment Weight Display */}
                    <div className="party-detail-equipment-weight">
                      <span className="party-detail-equipment-weight-label">Equipped: <strong>{selectedCharacter.equipment.equippedWeight} lbs</strong></span>
                      <span className="party-detail-equipment-weight-separator">|</span>
                      <span className="party-detail-equipment-weight-label">Total: <strong>{selectedCharacter.equipment.totalWeight} lbs</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spells */}
              {selectedCharacter.spells && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">
                    Spells
                    <Tooltip content="Spells are magical abilities that spellcasters can use. Cantrips are weak spells you can cast endlessly, while leveled spells consume spell slots (a limited resource that refreshes after a long rest). Each spell has a casting time, range, duration, and effects—spells can deal damage, heal allies, create magical effects, or manipulate the battlefield." />
                  </h4>
                  <div className="party-detail-spells-section">
                    {selectedCharacter.spells.cantrips.length > 0 && (
                      <div className="party-detail-spells-group">
                        <div className="party-detail-spells-group-title">Cantrips</div>
                        <div className="party-detail-spells-list">
                          {selectedCharacter.spells.cantrips.map((spell) => (
                            <span key={spell} className="party-detail-spell-tag">
                              {spell}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.spells.known_spells.length > 0 && (
                      <div className="party-detail-spells-group">
                        <div className="party-detail-spells-group-title">Known Spells</div>
                        <div className="party-detail-spells-list">
                          {selectedCharacter.spells.known_spells.map((spell) => (
                            <span key={spell} className="party-detail-spell-tag">
                              {spell}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.spells.spell_slots && Object.keys(selectedCharacter.spells.spell_slots).length > 0 && (
                      <div className="party-detail-spells-group">
                        <div className="party-detail-spells-group-title">Spell Slots</div>
                        <div className="party-detail-spells-list">
                          {Object.entries(selectedCharacter.spells.spell_slots)
                            .filter(([_, slot]) => slot.total > 0)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([level, slot]) => (
                              <span key={level} className="party-detail-spell-tag">
                                Level {level}: {slot.used}/{slot.total}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.spells.cantrips.length === 0 && selectedCharacter.spells.known_spells.length === 0 && (
                      <div className="party-detail-spells-empty">No spells learned yet</div>
                    )}
                  </div>
                </div>
              )}

              {/* XP Progress */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">Experience</h4>
                <div className="party-detail-xp-section">
                  <div className="party-detail-xp-header">
                    <span className="party-detail-xp-label">Progress to Level {selectedCharacter.level + 1}</span>
                    <span className="party-detail-xp-values">
                      {formatNumber(selectedCharacter.xp.current)} / {formatNumber(selectedCharacter.xp.next_level)}
                    </span>
                  </div>
                  <div className="party-detail-xp-bar">
                    <div
                      className="party-detail-xp-fill"
                      style={{ width: `${Math.min(calculateXPProgress(selectedCharacter), 100)}%` }}
                    />
                  </div>
                  <div className="party-detail-xp-hint">
                    {formatNumber(selectedCharacter.xp.next_level - selectedCharacter.xp.current)} XP needed for next level
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartyTab;
