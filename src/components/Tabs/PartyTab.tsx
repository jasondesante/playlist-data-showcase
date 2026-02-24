/**
 * PartyTab Component
 *
 * Displays all analyzed characters in a grid view.
 * Features: search, sort, detail modal, empty state.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Users, Search, X, Trash2, ChevronDown, Check, Star, Circle, Target, BarChart3, PieChart, Sword, Shield, Package, Wand2 } from 'lucide-react';
import { useCharacterStore } from '../../store/characterStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useFeatureNames } from '../../hooks/useFeatureNames';
import { usePartyAnalysis } from '../../hooks/usePartyAnalysis';
import { CharacterCard } from '../ui/CharacterCard';
import { PartyOverviewPanel } from '../Party/PartyOverviewPanel';
import { PartyCompositionPanel } from '../Party/PartyCompositionPanel';
// CollapsibleSection removed in Phase 6 - using dropdown popovers instead
import { getCharacterAvatar, getStatIcon } from '../../utils/characterIcons';
import { logger } from '../../utils/logger';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { showToast } from '../ui/Toast';
import { Tooltip } from '../ui/Tooltip';
import { DetailRow } from '../ui/DetailRow';
import { cn } from '../../utils/cn';
import { DEFAULT_EQUIPMENT, SpellQuery, SkillQuery } from 'playlist-data-engine';
import type { EnhancedEquipment, RegisteredSpell } from 'playlist-data-engine';
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

/**
 * Rarity color mapping for equipment display
 * Phase 1 Task 1.3: Copied from CharacterGenTab
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
 * Phase 1 Task 1.3: Copied from CharacterGenTab
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
 * Phase 1 Task 1.3: Copied from CharacterGenTab
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
 * Phase 1 Task 1.3: Helper function for equipment detail display
 */
function getEquipmentData(itemName: string): EnhancedEquipment | undefined {
  return DEFAULT_EQUIPMENT[itemName];
}

/**
 * Spell level color mapping
 * Cantrips (level 0) are teal, leveled spells (1-9) use progressively deeper purple
 * Phase 1 Task 1.3: Copied from CharacterGenTab
 */
const SPELL_LEVEL_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'hsl(var(--cute-teal) / 0.15)', border: 'hsl(var(--cute-teal) / 0.4)', text: 'hsl(var(--cute-teal))' },
  1: { bg: 'hsl(var(--cute-purple) / 0.1)', border: 'hsl(var(--cute-purple) / 0.3)', text: 'hsl(var(--cute-purple))' },
  2: { bg: 'hsl(var(--cute-purple) / 0.12)', border: 'hsl(var(--cute-purple) / 0.35)', text: 'hsl(var(--cute-purple))' },
  3: { bg: 'hsl(var(--cute-purple) / 0.15)', border: 'hsl(var(--cute-purple) / 0.4)', text: 'hsl(var(--cute-purple))' },
  4: { bg: 'hsl(var(--cute-purple) / 0.18)', border: 'hsl(var(--cute-purple) / 0.45)', text: 'hsl(var(--cute-purple))' },
  5: { bg: 'hsl(var(--cute-purple) / 0.2)', border: 'hsl(var(--cute-purple) / 0.5)', text: 'hsl(var(--cute-purple))' },
  6: { bg: 'hsl(var(--cute-purple) / 0.22)', border: 'hsl(var(--cute-purple) / 0.55)', text: 'hsl(var(--cute-purple))' },
  7: { bg: 'hsl(var(--cute-purple) / 0.25)', border: 'hsl(var(--cute-purple) / 0.6)', text: 'hsl(var(--cute-purple))' },
  8: { bg: 'hsl(var(--cute-purple) / 0.28)', border: 'hsl(var(--cute-purple) / 0.65)', text: 'hsl(var(--cute-purple))' },
  9: { bg: 'hsl(var(--cute-purple) / 0.3)', border: 'hsl(var(--cute-purple) / 0.7)', text: 'hsl(var(--cute-purple))' }
};

/**
 * Get spell data from SpellQuery by name
 * Phase 1 Task 1.3: Helper function for spell detail display
 */
function getSpellData(spellName: string): RegisteredSpell | undefined {
  try {
    const spellQuery = SpellQuery.getInstance();
    const spells = spellQuery.getSpells();
    return spells.find(spell => spell.name === spellName);
  } catch {
    return undefined;
  }
}

/**
 * Format rarity for display (snake_case to Title Case)
 * Phase 1 Task 1.3: Helper function for equipment display
 */
function formatRarity(rarity: string): string {
  return rarity
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PartyTab() {
  const { characters, resetCharacters, activeCharacterId, setActiveCharacter, selectedHeroSeeds, toggleHeroSelection, selectAllHeroes, deselectAllHeroes } = useCharacterStore();
  const { resolveFeatureName, resolveTraitName, getFeatureDescription, getTraitDescription, getFeatureEffects, getTraitEffects } = useFeatureNames();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-added');
  const [selectedCharacter, setSelectedCharacter] = useState<typeof characters[number] | null>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Loading states
  const [isSettingActive, setIsSettingActive] = useState(false);
  const [settingActiveSeed, setSettingActiveSeed] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Phase 1 Task 1.1: Selection state for click-to-select detail panels
  const [selectedTraitId, setSelectedTraitId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<{
    name: string;
    type: 'weapon' | 'armor' | 'item';
  } | null>(null);
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  // Phase 6 Task 6.2: Analysis panel dropdown state
  const [activeAnalysisPanel, setActiveAnalysisPanel] = useState<'overview' | 'composition' | null>(null);
  const analysisPopoverRef = useRef<HTMLDivElement>(null);

  // Phase 1 Task 1.2: Selection handlers that clear other selections (exclusive selection)
  const handleSelectTrait = (traitId: string) => {
    setSelectedTraitId(traitId);
    setSelectedFeatureId(null);
    setSelectedEquipment(null);
    setSelectedSpellId(null);
    setSelectedSkillId(null);
  };

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId);
    setSelectedTraitId(null);
    setSelectedEquipment(null);
    setSelectedSpellId(null);
    setSelectedSkillId(null);
  };

  const handleSelectEquipment = (name: string, type: 'weapon' | 'armor' | 'item') => {
    setSelectedEquipment({ name, type });
    setSelectedTraitId(null);
    setSelectedFeatureId(null);
    setSelectedSpellId(null);
    setSelectedSkillId(null);
  };

  const handleSelectSpell = (spellName: string) => {
    setSelectedSpellId(spellName);
    setSelectedTraitId(null);
    setSelectedFeatureId(null);
    setSelectedEquipment(null);
    setSelectedSkillId(null);
  };

  const handleSelectSkill = (skillName: string) => {
    setSelectedSkillId(skillName);
    setSelectedTraitId(null);
    setSelectedFeatureId(null);
    setSelectedEquipment(null);
    setSelectedSpellId(null);
  };

  // Count of selected heroes for display
  const selectedCount = selectedHeroSeeds.length;
  const totalCount = characters.length;

  // Convert selectedHeroSeeds array to Set for hooks and components
  const selectedSeedsSet = useMemo(() => new Set(selectedHeroSeeds), [selectedHeroSeeds]);

  // Get party analysis using the hook
  const { analysis: partyAnalysis, isLoading: isAnalysisLoading } = usePartyAnalysis(characters, selectedSeedsSet);

  // Close sort dropdown when clicking outside
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

  // Phase 6 Task 6.2: Close analysis popover when clicking outside or pressing Escape
  // Note: We don't close if clicking the analysis toggle buttons - let their onClick handlers manage state
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking inside the popover
      if (analysisPopoverRef.current && analysisPopoverRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking an analysis toggle button - let the button's onClick handle it
      // This prevents the "flash" where the overlay disappears during the click
      if (target instanceof Element && target.closest('.party-analysis-btn')) {
        return;
      }

      // Close if clicking outside both the popover and the toggle buttons
      setActiveAnalysisPanel(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveAnalysisPanel(null);
      }
    };

    if (activeAnalysisPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeAnalysisPanel]);

  // Phase 6 Task 6.2: Toggle analysis panel (only one open at a time)
  const handleToggleAnalysisPanel = (panel: 'overview' | 'composition') => {
    setActiveAnalysisPanel(current => current === panel ? null : panel);
  };

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
        <div className="party-header-actions">
          {/* Party Analysis Group */}
          {characters.length >= 1 && (
            <div className="party-analysis-group">
              <span className="party-analysis-group-label">Analysis</span>
              <div className="party-analysis-group-buttons">
                <button
                  className={cn('party-analysis-btn', activeAnalysisPanel === 'overview' && 'party-analysis-btn-active')}
                  onClick={() => handleToggleAnalysisPanel('overview')}
                  aria-label="Party Overview"
                  aria-expanded={activeAnalysisPanel === 'overview'}
                  title="Party Overview - XP budgets and analysis"
                >
                  <BarChart3 size={16} />
                  <span className="party-analysis-btn-text">Overview</span>
                </button>
                <button
                  className={cn('party-analysis-btn', activeAnalysisPanel === 'composition' && 'party-analysis-btn-active')}
                  onClick={() => handleToggleAnalysisPanel('composition')}
                  disabled={characters.length < 2}
                  aria-label="Party Composition"
                  aria-expanded={activeAnalysisPanel === 'composition'}
                  title={characters.length >= 2 ? 'Party Composition - Class and role distribution' : 'Need 2+ heroes for composition'}
                >
                  <PieChart size={16} />
                  <span className="party-analysis-btn-text">Composition</span>
                </button>
              </div>
            </div>
          )}
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
        </div>
      </header>

      {/* Phase 6 Task 6.2: Analysis Panel Dropdown Popover */}
      {activeAnalysisPanel && (
        <div className="party-analysis-popover" ref={analysisPopoverRef}>
          <div className="party-analysis-popover-header">
            <h3 className="party-analysis-popover-title">
              {activeAnalysisPanel === 'overview' ? 'Party Overview' : 'Party Composition'}
            </h3>
            <button
              className="party-analysis-popover-close"
              onClick={() => setActiveAnalysisPanel(null)}
              aria-label="Close panel"
            >
              <X size={16} />
            </button>
          </div>
          <div className="party-analysis-popover-content">
            {activeAnalysisPanel === 'overview' ? (
              <PartyOverviewPanel
                analysis={partyAnalysis}
                selectedCount={selectedCount}
                totalCount={totalCount}
                isLoading={isAnalysisLoading}
                showTooFewMessage={characters.length < 2}
              />
            ) : (
              <PartyCompositionPanel
                characters={characters}
                selectedSeeds={selectedSeedsSet}
                isLoading={isAnalysisLoading}
              />
            )}
          </div>
        </div>
      )}

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

      {/* Selection Controls Bar - Only show when 2+ characters */}
      {characters.length >= 2 && (
        <div className="party-selection-controls">
          <div className="party-selection-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllHeroes}
              disabled={selectedCount === totalCount}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllHeroes}
              disabled={selectedCount === 0}
            >
              Deselect All
            </Button>
          </div>
          <div className="party-selection-count">
            <strong>{selectedCount}</strong> of <strong>{totalCount}</strong> {totalCount === 1 ? 'hero' : 'heroes'} selected for analysis
          </div>
        </div>
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
            selectionMode={characters.length >= 2}
            isSelected={selectedHeroSeeds.includes(character.seed)}
            onToggleSelection={() => toggleHeroSelection(character.seed)}
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
                    const isSelected = selectedSkillId === skill;
                    return (
                      <span
                        key={skill}
                        className={cn('party-detail-trait-badge', isSelected && 'party-detail-trait-badge-selected')}
                        onClick={() => handleSelectSkill(skill)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectSkill(skill);
                          }
                        }}
                      >
                        {skill.replace(/_/g, ' ')}
                        <span className={`party-detail-skill-proficient ${prof}`}>
                          {getSkillProficiencyDisplay(prof)}
                        </span>
                      </span>
                    );
                  })}
                </div>
                {/* Skill Detail Row */}
                {selectedSkillId && (() => {
                  const skillQuery = SkillQuery.getInstance();
                  const skillData = skillQuery.getSkill(selectedSkillId);
                  if (!skillData) return null;

                  const profLevel = selectedCharacter.skills[selectedSkillId as keyof typeof selectedCharacter.skills];
                  const profText = profLevel === 'expertise' ? 'Expertise (×2 proficiency)' :
                                   profLevel === 'proficient' ? 'Proficient' : 'Not Proficient';

                  return (
                    <DetailRow
                      isVisible={true}
                      title={skillData.name || selectedSkillId.replace(/_/g, ' ')}
                      description={skillData.description}
                      properties={[
                        { label: 'Ability', value: skillData.ability },
                        { label: 'Proficiency', value: profText }
                      ]}
                    />
                  );
                })()}
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
                      const isSelected = selectedTraitId === trait;
                      return (
                        <span
                          key={idx}
                          className={cn('party-detail-trait-badge', isSelected && 'party-detail-trait-badge-selected')}
                          onClick={() => handleSelectTrait(trait)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectTrait(trait);
                            }
                          }}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                  {/* Phase 2 Task 2.2: Trait DetailRow */}
                  <DetailRow
                    isVisible={selectedTraitId !== null}
                    title={selectedTraitId ? resolveTraitName(selectedTraitId) : ''}
                    description={selectedTraitId ? getTraitDescription(selectedTraitId) : undefined}
                    properties={selectedTraitId ? [
                      { label: 'Source', value: selectedCharacter.race || 'Racial Trait' }
                    ] : undefined}
                    effects={selectedTraitId ? getTraitEffects(selectedTraitId) : undefined}
                  />
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
                      const isSelected = selectedFeatureId === feature;
                      return (
                        <span
                          key={idx}
                          className={cn('party-detail-trait-badge', isSelected && 'party-detail-trait-badge-selected')}
                          onClick={() => handleSelectFeature(feature)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectFeature(feature);
                            }
                          }}
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                  {/* Phase 3 Task 3.2: Feature DetailRow */}
                  <DetailRow
                    isVisible={selectedFeatureId !== null}
                    title={selectedFeatureId ? resolveFeatureName(selectedFeatureId) : ''}
                    description={selectedFeatureId ? getFeatureDescription(selectedFeatureId) : undefined}
                    properties={selectedFeatureId ? [
                      { label: 'Source', value: selectedCharacter.class || 'Class Feature' }
                    ] : undefined}
                    effects={selectedFeatureId ? getFeatureEffects(selectedFeatureId) : undefined}
                  />
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
                          {selectedCharacter.equipment.weapons.map((weapon, idx) => {
                            // Phase 4 Task 4.1: Get rarity-based styling
                            const equipmentData = getEquipmentData(weapon.name);
                            const rarity = equipmentData?.rarity || 'common';
                            const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                            const rarityBg = RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common;
                            const rarityBorder = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;
                            // Phase 4 Task 4.2: Selection state
                            const isSelected = selectedEquipment?.name === weapon.name && selectedEquipment?.type === 'weapon';

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'party-detail-equipment-item',
                                  weapon.equipped && 'party-detail-equipment-item-equipped',
                                  isSelected && 'party-detail-equipment-item-selected'
                                )}
                                style={{
                                  backgroundColor: rarityBg,
                                  borderColor: rarityBorder
                                }}
                                onClick={() => handleSelectEquipment(weapon.name, 'weapon')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelectEquipment(weapon.name, 'weapon');
                                  }
                                }}
                              >
                                {weapon.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                                <span className="party-detail-equipment-name" style={{ color: rarityColor, fontWeight: 500 }}>{weapon.name}</span>
                                {weapon.quantity > 1 && <span className="party-detail-equipment-quantity">×{weapon.quantity}</span>}
                                {weapon.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.equipment.armor.length > 0 && (
                      <div className="party-detail-equipment-category">
                        <div className="party-detail-equipment-category-label">Armor</div>
                        <div className="party-detail-equipment-items">
                          {selectedCharacter.equipment.armor.map((armor, idx) => {
                            // Phase 4 Task 4.1: Get rarity-based styling
                            const equipmentData = getEquipmentData(armor.name);
                            const rarity = equipmentData?.rarity || 'common';
                            const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                            const rarityBg = RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common;
                            const rarityBorder = RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common;
                            // Phase 4 Task 4.2: Selection state
                            const isSelected = selectedEquipment?.name === armor.name && selectedEquipment?.type === 'armor';

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'party-detail-equipment-item',
                                  armor.equipped && 'party-detail-equipment-item-equipped',
                                  isSelected && 'party-detail-equipment-item-selected'
                                )}
                                style={{
                                  backgroundColor: rarityBg,
                                  borderColor: rarityBorder
                                }}
                                onClick={() => handleSelectEquipment(armor.name, 'armor')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelectEquipment(armor.name, 'armor');
                                  }
                                }}
                              >
                                {armor.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                                <span className="party-detail-equipment-name" style={{ color: rarityColor, fontWeight: 500 }}>{armor.name}</span>
                                {armor.quantity > 1 && <span className="party-detail-equipment-quantity">×{armor.quantity}</span>}
                                {armor.equipped && <span className="party-detail-equipment-badge">Equipped</span>}
                              </div>
                            );
                          })}
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

                            // Phase 4 Task 4.1: Get rarity-based styling
                            const equipmentData = getEquipmentData(item.name);
                            const rarity = equipmentData?.rarity || 'common';
                            const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
                            const rarityBg = isAmmo
                              ? 'linear-gradient(135deg, hsl(var(--cute-orange) / 0.1), hsl(var(--cute-yellow) / 0.05))'
                              : (RARITY_BG_COLORS[rarity] || RARITY_BG_COLORS.common);
                            const rarityBorder = isAmmo
                              ? 'hsl(var(--cute-orange) / 0.3)'
                              : (RARITY_BORDER_COLORS[rarity] || RARITY_BORDER_COLORS.common);
                            // Phase 4 Task 4.2: Selection state
                            const isSelected = selectedEquipment?.name === item.name && selectedEquipment?.type === 'item';

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'party-detail-equipment-item',
                                  item.equipped && 'party-detail-equipment-item-equipped',
                                  isAmmo && 'party-detail-equipment-item-ammunition',
                                  isSelected && 'party-detail-equipment-item-selected'
                                )}
                                style={{
                                  backgroundColor: isAmmo ? undefined : rarityBg,
                                  background: isAmmo ? rarityBg : undefined,
                                  borderColor: rarityBorder
                                }}
                                onClick={() => handleSelectEquipment(item.name, 'item')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelectEquipment(item.name, 'item');
                                  }
                                }}
                              >
                                {item.equipped && <Check className="party-detail-equipment-checkmark" size={14} />}
                                {isAmmo && <Target className="party-detail-equipment-ammo-icon" size={14} />}
                                <span className="party-detail-equipment-name" style={{ color: rarityColor, fontWeight: 500 }}>{item.name}</span>
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
                  {/* Phase 4 Task 4.3: Equipment DetailRow */}
                  {selectedEquipment && (() => {
                    const equipmentData = getEquipmentData(selectedEquipment.name);
                    if (!equipmentData) return null;

                    // Build properties based on equipment type
                    const properties: { label: string; value: string | number; icon?: typeof Sword }[] = [];

                    // Add rarity
                    if (equipmentData.rarity) {
                      properties.push({ label: 'Rarity', value: formatRarity(equipmentData.rarity) });
                    }

                    // Add type
                    properties.push({ label: 'Type', value: equipmentData.type.charAt(0).toUpperCase() + equipmentData.type.slice(1) });

                    // Add weight
                    if (equipmentData.weight !== undefined) {
                      properties.push({ label: 'Weight', value: `${equipmentData.weight} lb` });
                    }

                    // Add damage for weapons
                    if (equipmentData.type === 'weapon' && equipmentData.damage) {
                      properties.push({ label: 'Damage', value: `${equipmentData.damage.dice} ${equipmentData.damage.damageType}` });
                    }

                    // Add AC for armor
                    if (equipmentData.type === 'armor' && equipmentData.acBonus !== undefined) {
                      properties.push({ label: 'AC Bonus', value: `+${equipmentData.acBonus}` });
                    }

                    // Get appropriate icon based on type
                    const EquipmentIcon = equipmentData.type === 'weapon' ? Sword : equipmentData.type === 'armor' ? Shield : Package;

                    // Convert equipment properties to effects format for display
                    const effects = equipmentData.properties?.map(p => ({
                      type: p.type,
                      target: p.target,
                      value: p.value,
                      description: p.description
                    }));

                    return (
                      <DetailRow
                        isVisible={true}
                        title={equipmentData.name}
                        icon={EquipmentIcon}
                        description={equipmentData.description}
                        properties={properties}
                        effects={effects}
                      />
                    );
                  })()}
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
                          {selectedCharacter.spells.cantrips.map((spell) => {
                            // Phase 5 Task 5.1: Get level-based styling (cantrips are level 0)
                            const levelColors = SPELL_LEVEL_COLORS[0];
                            // Phase 5 Task 5.2: Selection state
                            const isSelected = selectedSpellId === spell;
                            return (
                              <span
                                key={spell}
                                className={cn('party-detail-spell-tag', isSelected && 'party-detail-spell-tag-selected')}
                                style={{
                                  backgroundColor: levelColors.bg,
                                  borderColor: levelColors.border,
                                  color: levelColors.text
                                }}
                                onClick={() => handleSelectSpell(spell)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelectSpell(spell);
                                  }
                                }}
                              >
                                {spell}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {selectedCharacter.spells.known_spells.length > 0 && (
                      <div className="party-detail-spells-group">
                        <div className="party-detail-spells-group-title">Known Spells</div>
                        <div className="party-detail-spells-list">
                          {selectedCharacter.spells.known_spells.map((spell) => {
                            // Phase 5 Task 5.1: Get level-based styling
                            const spellData = getSpellData(spell);
                            const level = spellData?.level ?? 1;
                            const levelColors = SPELL_LEVEL_COLORS[level] || SPELL_LEVEL_COLORS[1];
                            // Phase 5 Task 5.2: Selection state
                            const isSelected = selectedSpellId === spell;
                            return (
                              <span
                                key={spell}
                                className={cn('party-detail-spell-tag', isSelected && 'party-detail-spell-tag-selected')}
                                style={{
                                  backgroundColor: levelColors.bg,
                                  borderColor: levelColors.border,
                                  color: levelColors.text
                                }}
                                onClick={() => handleSelectSpell(spell)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSelectSpell(spell);
                                  }
                                }}
                              >
                                {spell}
                              </span>
                            );
                          })}
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
                  {/* Phase 5 Task 5.3: Spell DetailRow */}
                  {selectedSpellId && (() => {
                    const spellData = getSpellData(selectedSpellId);
                    if (!spellData) return null;

                    // Build properties array
                    const properties: { label: string; value: string | number }[] = [];

                    // School of magic
                    if (spellData.school) {
                      properties.push({ label: 'School', value: spellData.school });
                    }

                    // Level
                    properties.push({
                      label: 'Level',
                      value: spellData.level === 0 ? 'Cantrip' : `Level ${spellData.level}`
                    });

                    // Casting time
                    if (spellData.casting_time) {
                      properties.push({ label: 'Casting Time', value: spellData.casting_time });
                    }

                    // Range
                    if (spellData.range) {
                      properties.push({ label: 'Range', value: spellData.range });
                    }

                    // Duration
                    if (spellData.duration) {
                      properties.push({ label: 'Duration', value: spellData.duration });
                    }

                    // Components
                    if (spellData.components) {
                      const componentsStr = Array.isArray(spellData.components)
                        ? spellData.components.join(', ')
                        : String(spellData.components);
                      properties.push({ label: 'Components', value: componentsStr });
                    }

                    // Classes
                    if (spellData.classes && spellData.classes.length > 0) {
                      properties.push({ label: 'Classes', value: spellData.classes.join(', ') });
                    }

                    return (
                      <DetailRow
                        isVisible={true}
                        title={spellData.name}
                        icon={Wand2}
                        description={spellData.description}
                        properties={properties}
                      />
                    );
                  })()}
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