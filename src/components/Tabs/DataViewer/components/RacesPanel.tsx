/**
 * RacesPanel Component
 *
 * Displays a list of races with their traits, ability bonuses, and subrace information.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.5
 */

import { ChevronDown, ChevronUp, Shield, Users, Zap, Sparkles, Plus } from 'lucide-react';
import type { RaceDataEntry, SubraceDataEntry } from '../../../../hooks/useDataViewer';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import { ABILITY_COLORS } from '../constants';
import { formatAbilityBonus } from '../utils/formatters';

/**
 * Props for the RacesPanel component
 */
export interface RacesPanelProps {
  /** Array of races to display (already filtered) */
  races: RaceDataEntry[];
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'races', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'races', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'races', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'races', itemName: string) => boolean;
  /** Handler to open race creator */
  onCreateRace: () => void;
}

/**
 * Render subrace section with ability bonuses, traits, and requirements
 *
 * Displays detailed information about a specific subrace variant:
 * - Subrace name
 * - Ability bonuses (color-coded by ability)
 * - Subrace-specific traits
 * - Requirements (e.g., ability score minimums)
 *
 * @param subraceName - The display name of the subrace
 * @param subraceData - The subrace data containing bonuses, traits, and requirements
 *
 * @example
 * // High Elf subrace data
 * renderSubraceSection("High Elf", {
 *   ability_bonuses: { INT: 1 },
 *   traits: ["Elf Weapon Training", "Cantrip"],
 *   requirements: undefined
 * })
 * // Renders: High Elf header with "INT +1" bonus and traits list
 *
 * @example
 * // Dark Elf subrace with requirements
 * renderSubraceSection("Dark Elf (Drow)", {
 *   ability_bonuses: { CHA: 1 },
 *   traits: ["Superior Darkvision", "Drow Magic"],
 *   requirements: undefined
 * })
 */
function renderSubraceSection(
  subraceName: string,
  subraceData: SubraceDataEntry | undefined
) {
  if (!subraceData) {
    // Subrace exists but has no specific data - just show the name
    return (
      <div className="dataviewer-subrace-section">
        <div className="dataviewer-subrace-header">
          <span className="dataviewer-subrace-name">{subraceName}</span>
        </div>
        <div className="dataviewer-subrace-content">
          <span className="dataviewer-subrace-no-data">No additional data available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dataviewer-subrace-section">
      <div className="dataviewer-subrace-header">
        <span className="dataviewer-subrace-name">{subraceName}</span>
      </div>
      <div className="dataviewer-subrace-content">
        {/* Subrace-specific ability bonuses */}
        {subraceData.ability_bonuses && Object.keys(subraceData.ability_bonuses).length > 0 && (
          <div className="dataviewer-subrace-bonuses">
            {Object.entries(subraceData.ability_bonuses).map(([ability, bonus]) => (
              <span
                key={ability}
                className="dataviewer-subrace-bonus"
                style={{ color: ABILITY_COLORS[ability] }}
              >
                {ability} {formatAbilityBonus(bonus as number)}
              </span>
            ))}
          </div>
        )}

        {/* Subrace-specific traits */}
        {subraceData.traits && subraceData.traits.length > 0 && (
          <div className="dataviewer-subrace-traits">
            <span className="dataviewer-subrace-traits-label">Traits:</span>
            <div className="dataviewer-subrace-traits-list">
              {subraceData.traits.map((trait: string, idx: number) => (
                <span key={idx} className="dataviewer-tag dataviewer-tag-subrace-trait">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Requirements (if any) */}
        {subraceData.requirements?.abilities && Object.keys(subraceData.requirements.abilities).length > 0 && (
          <div className="dataviewer-subrace-requirements">
            <span className="dataviewer-subrace-requirements-label">Requirements:</span>
            <div className="dataviewer-subrace-requirements-list">
              {Object.entries(subraceData.requirements.abilities).map(([ability, minimum]) => (
                <span key={ability} className="dataviewer-tag dataviewer-tag-requirement">
                  {ability} {minimum as number}+
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a single race card
 */
function RaceCard({
  race,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  race: RaceDataEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const raceName = race.name || `Race-${index}`;
  const hasImage = race.image || race.icon;
  const isCustom = checkIsCustomItem(raceName);

  return (
    <div className="dataviewer-card">
      <div
        className="dataviewer-card-header"
        onClick={onToggle}
      >
        <div className="dataviewer-card-header-content">
          {/* Race image/icon thumbnail */}
          {hasImage ? (
            <div className="dataviewer-card-thumbnail">
              <ArweaveImage
                src={race.image || race.icon || ''}
                alt={raceName}
                width={32}
                height={32}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-card-thumbnail-fallback">
                    <Shield size={16} />
                  </div>
                }
              />
            </div>
          ) : (
            <Shield size={18} className="dataviewer-card-icon" />
          )}
          <span className="dataviewer-card-title">{raceName}</span>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      <div className="dataviewer-card-meta">
        <span className="dataviewer-card-stat">
          <Zap size={14} />
          Speed: {race.speed} ft
        </span>
        <span className="dataviewer-card-stat">
          <Sparkles size={14} />
          {race.traits.length} Traits
        </span>
        {race.subraces && race.subraces.length > 0 && (
          <span className="dataviewer-card-stat">
            <Users size={14} />
            {race.subraces.length} Subraces
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="dataviewer-card-details">
          {/* Full-size race image when expanded */}
          {race.image && (
            <div className="dataviewer-card-image">
              <ArweaveImage
                src={race.image}
                alt={raceName}
                width={180}
                height={180}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-card-image-fallback">
                    <Shield size={48} />
                  </div>
                }
              />
            </div>
          )}
          {/* Race description */}
          {race.description && (
            <div className="dataviewer-card-section">
              <div className="dataviewer-item-description">
                {race.description}
              </div>
            </div>
          )}

          {/* Base race ability bonuses */}
          {race.ability_bonuses && Object.keys(race.ability_bonuses).length > 0 && (
            <div className="dataviewer-card-section">
              <span className="dataviewer-card-section-title">Ability Bonuses:</span>
              <div className="dataviewer-card-bonuses">
                {Object.entries(race.ability_bonuses).map(([ability, bonus]) => (
                  <span
                    key={ability}
                    className="dataviewer-card-bonus"
                    style={{ color: ABILITY_COLORS[ability] }}
                  >
                    {ability} {formatAbilityBonus(bonus as number)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Base race traits */}
          {race.traits && race.traits.length > 0 && (
            <div className="dataviewer-card-section">
              <span className="dataviewer-card-section-title">Traits:</span>
              <div className="dataviewer-card-tags">
                {race.traits.map((trait: string) => (
                  <span key={trait} className="dataviewer-tag">{trait}</span>
                ))}
              </div>
            </div>
          )}

          {/* Subrace details */}
          {race.subraceData && Object.keys(race.subraceData).length > 0 && (
            <div className="dataviewer-card-section">
              <span className="dataviewer-card-section-title">Subrace Details:</span>
              <div className="dataviewer-subraces-container">
                {Object.entries(race.subraceData).map(([subraceName, subraceEntry]) => (
                  renderSubraceSection(subraceName, subraceEntry)
                ))}
              </div>
            </div>
          )}
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="races"
                itemName={raceName}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                showActions={true}
                size="sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RacesPanel - Displays a list of races with their details
 */
export function RacesPanel({
  races,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateRace
}: RacesPanelProps) {
  return (
    <div className="dataviewer-list">
      {/* Race Creation Header */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateRace}
          leftIcon={Plus}
        >
          Create Race
        </Button>
      </div>

      <div className="dataviewer-grid">
        {races.map((race, index) => {
          const raceName = race.name || `Race-${index}`;
          const isExpanded = expandedItems.has(raceName);

          return (
            <RaceCard
              key={raceName}
              race={race}
              index={index}
              isExpanded={isExpanded}
              onToggle={() => toggleExpanded(raceName)}
              onEdit={() => onEdit('races', raceName)}
              onDelete={() => onDelete('races', raceName)}
              onDuplicate={() => onDuplicate('races', raceName)}
              checkIsCustomItem={(itemName) => checkIsCustomItem('races', itemName)}
            />
          );
        })}
      </div>
    </div>
  );
}
