/**
 * PartyTab Component
 *
 * Displays all analyzed characters in a grid view.
 * Features: search, sort, detail modal, empty state.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Users, Search, X, Trash2, ChevronDown, Check, Star, Circle } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { CharacterCard } from '../ui/CharacterCard';
import { getCharacterAvatar, getStatIcon } from '../../utils/characterIcons';
import { logger } from '../../utils/logger';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
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

export function PartyTab() {
  const { characters, resetCharacters, activeCharacterId, setActiveCharacter } = useCharacterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [selectedCharacter, setSelectedCharacter] = useState<typeof characters[number] | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to delete all ${characters.length} character(s)? This cannot be undone.`)) {
      resetCharacters();
    }
  };

  const handleSetActiveCharacter = (characterSeed: string) => {
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
        load(matchingTrack.audio_url);
      } else {
        logger.warn('Store', 'PartyTab: Could not find track for active character', {
          characterSeed,
          playlistName: currentPlaylist.name
        });
      }
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
          title={`Delete all ${characters.length} character(s)`}
        >
          Clear All
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
                    Race: {selectedCharacter.race} | Class: {selectedCharacter.class}
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
                      <div className="party-detail-stat-label">Armor Class</div>
                      <div className="party-detail-stat-value">{selectedCharacter.armor_class}</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('Initiative')}</span>
                    <div>
                      <div className="party-detail-stat-label">Initiative</div>
                      <div className="party-detail-stat-value">+{selectedCharacter.initiative}</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon">{getStatIcon('Speed')}</span>
                    <div>
                      <div className="party-detail-stat-label">Speed</div>
                      <div className="party-detail-stat-value">{selectedCharacter.speed} ft</div>
                    </div>
                  </div>
                  <div className="party-detail-stat-item">
                    <span className="party-detail-stat-icon"><Star size={16} /></span>
                    <div>
                      <div className="party-detail-stat-label">Proficiency</div>
                      <div className="party-detail-stat-value">+{selectedCharacter.proficiency_bonus}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ability Scores */}
              <div className="party-detail-section">
                <h4 className="party-detail-section-title">Ability Scores</h4>
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
                <h4 className="party-detail-section-title">Skills</h4>
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
                  <h4 className="party-detail-section-title">Saving Throws</h4>
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

              {/* Racial Traits */}
              {selectedCharacter.racial_traits && selectedCharacter.racial_traits.length > 0 && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">Racial Traits</h4>
                  <div className="party-detail-traits-grid">
                    {selectedCharacter.racial_traits.map((trait, idx) => (
                      <span key={idx} className="party-detail-trait-badge">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Class Features */}
              {selectedCharacter.class_features && selectedCharacter.class_features.length > 0 && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">Class Features</h4>
                  <div className="party-detail-traits-grid">
                    {selectedCharacter.class_features.map((feature, idx) => (
                      <span key={idx} className="party-detail-trait-badge">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Appearance */}
              {selectedCharacter.appearance && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">Appearance</h4>
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
                  <h4 className="party-detail-section-title">Equipment</h4>
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
                          {selectedCharacter.equipment.items.map((item, idx) => (
                            <div key={idx} className={`party-detail-equipment-item ${item.equipped ? 'party-detail-equipment-item-equipped' : ''}`}>
                              {item.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                              <span className="party-detail-equipment-name">{item.name}</span>
                              {item.quantity > 1 && <span className="party-detail-equipment-quantity">×{item.quantity}</span>}
                              {item.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                            </div>
                          ))}
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
                  <h4 className="party-detail-section-title">Spells</h4>
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
