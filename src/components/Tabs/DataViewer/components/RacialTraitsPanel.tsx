/**
 * RacialTraitsPanel Component
 *
 * Displays a list of racial traits grouped by race.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.4
 */

import { ChevronDown, ChevronUp, Users, Plus } from 'lucide-react';
import type { RacialTrait, FeaturePrerequisite } from 'playlist-data-engine';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import type { FeatureEffect } from '../../../ui/EffectDisplay';
import { EffectList } from '../../../ui/EffectDisplay';
import { formatPrerequisites } from '../utils/formatters';

/**
 * Props for the RacialTraitsPanel component
 */
export interface RacialTraitsPanelProps {
  /** Array of racial traits to display (already filtered) */
  racialTraits: RacialTrait[];
  /** Function to group racial traits by race */
  groupRacialTraitsByRace: (traits: RacialTrait[]) => Record<string, RacialTrait[]>;
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'racialTraits', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'racialTraits', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'racialTraits', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'racialTraits', itemName: string) => boolean;
  /** Handler to open racial trait creator */
  onCreateTrait: () => void;
  /** Render function for spawn mode controls */
  renderSpawnModeControls: () => React.ReactNode;
}

/**
 * Render prerequisites section for racial traits
 *
 * @param prerequisites - The prerequisites to render
 */
function renderPrerequisites(prerequisites: FeaturePrerequisite | undefined) {
  const prereqStrings = formatPrerequisites(prerequisites);
  if (prereqStrings.length === 0) return null;

  return (
    <div className="dataviewer-item-section">
      <span className="dataviewer-item-section-title">Prerequisites:</span>
      <div className="dataviewer-item-tags">
        {prereqStrings.map((prereq, idx) => (
          <span key={idx} className="dataviewer-tag dataviewer-tag-condition">
            {prereq}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a single racial trait card within a race group
 */
function RacialTraitCard({
  trait,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  trait: RacialTrait;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const hasEffects = trait.effects && trait.effects.length > 0;
  const hasDescription = trait.description && trait.description.length > 0;
  const hasPrerequisites = trait.prerequisites && formatPrerequisites(trait.prerequisites).length > 0;
  const hasImage = trait.image || trait.icon;
  const isExpandable = hasEffects || hasDescription || hasPrerequisites || hasImage;
  const isCustom = checkIsCustomItem(trait.name);

  return (
    <div
      className={`dataviewer-group-item ${isExpandable ? 'dataviewer-group-item-expandable' : ''}`}
      onClick={() => isExpandable && onToggle()}
    >
      <div className="dataviewer-group-item-header">
        {/* Trait image/icon thumbnail */}
        {hasImage && (
          <div className="dataviewer-item-thumbnail dataviewer-item-thumbnail-small">
            <ArweaveImage
              src={trait.image || trait.icon || ''}
              alt={trait.name}
              width={28}
              height={28}
              showShimmer={true}
              fallback={
                <div className="dataviewer-item-thumbnail-fallback dataviewer-item-thumbnail-fallback-small">
                  <Users size={14} />
                </div>
              }
            />
          </div>
        )}
        <span className="dataviewer-group-item-name">{trait.name}</span>
        <div className="dataviewer-item-badges">
          {trait.subrace && (
            <span className="dataviewer-badge dataviewer-badge-small dataviewer-badge-subrace">
              {trait.subrace}
            </span>
          )}
          {isExpandable && (
            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="dataviewer-group-item-details">
          {/* Full-size trait image when expanded */}
          {trait.image && (
            <div className="dataviewer-item-image">
              <ArweaveImage
                src={trait.image}
                alt={trait.name}
                width={150}
                height={150}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-item-image-fallback">
                    <Users size={36} />
                  </div>
                }
              />
            </div>
          )}
          {trait.description && (
            <div className="dataviewer-item-description">
              {trait.description}
            </div>
          )}
          {renderPrerequisites(trait.prerequisites)}
          {/* Task 5.3: Using reusable EffectsList component */}
          <div className="dataviewer-item-section">
            <EffectList
              effects={(trait.effects || []) as FeatureEffect[]}
              compact
              showStacking
            />
          </div>
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="racialTraits"
                itemName={trait.name}
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
 * RacialTraitsPanel - Displays a list of racial traits grouped by race
 */
export function RacialTraitsPanel({
  racialTraits,
  groupRacialTraitsByRace,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateTrait,
  renderSpawnModeControls
}: RacialTraitsPanelProps) {
  const grouped = groupRacialTraitsByRace(racialTraits);
  const raceNames = Object.keys(grouped).sort();

  return (
    <div className="dataviewer-list">
      {/* Racial Trait Creation Header */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateTrait}
          leftIcon={Plus}
        >
          Create Trait
        </Button>
      </div>

      <div className="dataviewer-grouped-list">
        {raceNames.map(raceName => (
          <div key={raceName} className="dataviewer-group">
            <div className="dataviewer-group-header">
              <span className="dataviewer-group-title">{raceName}</span>
              <span className="dataviewer-group-count">({grouped[raceName].length})</span>
            </div>
            <div className="dataviewer-group-items">
              {grouped[raceName].map(trait => {
                const isExpanded = expandedItems.has(trait.id);

                return (
                  <RacialTraitCard
                    key={trait.id}
                    trait={trait}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpanded(trait.id)}
                    onEdit={() => onEdit('racialTraits', trait.name)}
                    onDelete={() => onDelete('racialTraits', trait.name)}
                    onDuplicate={() => onDuplicate('racialTraits', trait.name)}
                    checkIsCustomItem={(itemName) => checkIsCustomItem('racialTraits', itemName)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {renderSpawnModeControls()}
    </div>
  );
}
