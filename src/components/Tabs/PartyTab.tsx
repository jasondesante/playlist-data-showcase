/**
 * PartyTab Component
 *
 * Displays all analyzed characters in a grid view.
 * Features: search, sort, detail modal, empty state.
 */

import { useState, useMemo } from 'react';
import { Users, Search, X, Trash2 } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { CharacterCard } from '../ui/CharacterCard';
import { getCharacterAvatar, getStatIcon } from '../../utils/characterIcons';
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
    setActiveCharacter(characterSeed);
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
        <div className="party-sort">
          <select
            className="party-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            {(Object.entries(SORT_OPTIONS) as [SortOption, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
                    Level {selectedCharacter.level} {selectedCharacter.race} {selectedCharacter.class}
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
                      <div className="party-detail-stat-value">{selectedCharacter.hp.max}</div>
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

              {/* Equipment */}
              {selectedCharacter.equipment && (
                <div className="party-detail-section">
                  <h4 className="party-detail-section-title">Equipment</h4>
                  <div className="party-detail-equipment-list">
                    {selectedCharacter.equipment.weapons.map((weapon, idx) => (
                      <div key={idx} className="party-detail-equipment-item">
                        <span className="party-detail-equipment-name">{weapon.name}</span>
                        <span className="party-detail-equipment-qty">
                          {weapon.quantity > 1 ? `×${weapon.quantity}` : ''}
                          {weapon.equipped && ' (equipped)'}
                        </span>
                      </div>
                    ))}
                    {selectedCharacter.equipment.armor.map((armor, idx) => (
                      <div key={idx} className="party-detail-equipment-item">
                        <span className="party-detail-equipment-name">{armor.name}</span>
                        <span className="party-detail-equipment-qty">
                          {armor.quantity > 1 ? `×${armor.quantity}` : ''}
                          {armor.equipped && ' (equipped)'}
                        </span>
                      </div>
                    ))}
                    {selectedCharacter.equipment.items.map((item, idx) => (
                      <div key={idx} className="party-detail-equipment-item">
                        <span className="party-detail-equipment-name">{item.name}</span>
                        <span className="party-detail-equipment-qty">
                          {item.quantity > 1 ? `×${item.quantity}` : ''}
                        </span>
                      </div>
                    ))}
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
