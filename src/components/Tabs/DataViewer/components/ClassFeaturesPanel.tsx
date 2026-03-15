/**
 * ClassFeaturesPanel Component
 *
 * Displays a list of class features grouped by class.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.3
 */

import { ChevronDown, ChevronUp, Sword, Plus } from 'lucide-react';
import type { ClassFeature } from 'playlist-data-engine';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import type { FeatureEffect } from '../../../ui/EffectDisplay';
import { EffectList } from '../../../ui/EffectDisplay';

/**
 * Props for the ClassFeaturesPanel component
 */
export interface ClassFeaturesPanelProps {
  /** Array of class features to display (already filtered) */
  classFeatures: ClassFeature[];
  /** Function to group class features by class */
  groupClassFeaturesByClass: (features: ClassFeature[]) => Record<string, ClassFeature[]>;
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'classFeatures', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'classFeatures', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'classFeatures', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'classFeatures', itemName: string) => boolean;
  /** Handler to open class feature creator */
  onCreateFeature: () => void;
  /** Render function for spawn mode controls */
  renderSpawnModeControls: () => React.ReactNode;
}

/**
 * Renders a single class feature card within a class group
 */
function ClassFeatureCard({
  feature,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  feature: ClassFeature;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  const hasEffects = feature.effects && feature.effects.length > 0;
  const hasDescription = feature.description && feature.description.length > 0;
  const hasImage = feature.image || feature.icon;
  const isExpandable = hasEffects || hasDescription || hasImage;
  const isCustom = checkIsCustomItem(feature.name);

  return (
    <div
      className={`dataviewer-group-item ${isExpandable ? 'dataviewer-group-item-expandable' : ''}`}
      onClick={() => isExpandable && onToggle()}
    >
      <div className="dataviewer-group-item-header">
        {/* Feature image/icon thumbnail */}
        {hasImage && (
          <div className="dataviewer-item-thumbnail dataviewer-item-thumbnail-small">
            <ArweaveImage
              src={feature.image || feature.icon || ''}
              alt={feature.name}
              width={28}
              height={28}
              showShimmer={true}
              fallback={
                <div className="dataviewer-item-thumbnail-fallback dataviewer-item-thumbnail-fallback-small">
                  <Sword size={14} />
                </div>
              }
            />
          </div>
        )}
        <span className="dataviewer-group-item-name">{feature.name}</span>
        <div className="dataviewer-item-badges">
          <span className="dataviewer-badge dataviewer-badge-small">Level {feature.level}</span>
          {isExpandable && (
            isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </div>
      </div>
      {feature.type && (
        <span className="dataviewer-group-item-type">{feature.type}</span>
      )}
      {isExpanded && (
        <div className="dataviewer-group-item-details">
          {/* Full-size feature image when expanded */}
          {feature.image && (
            <div className="dataviewer-item-image">
              <ArweaveImage
                src={feature.image}
                alt={feature.name}
                width={150}
                height={150}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-item-image-fallback">
                    <Sword size={36} />
                  </div>
                }
              />
            </div>
          )}
          {feature.description && (
            <div className="dataviewer-item-description">
              {feature.description}
            </div>
          )}
          {/* Task 5.3: Using reusable EffectsList component */}
          <div className="dataviewer-item-section">
            <EffectList
              effects={(feature.effects || []) as FeatureEffect[]}
              compact
              showStacking
            />
          </div>
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="classFeatures"
                itemName={feature.name}
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
 * ClassFeaturesPanel - Displays a list of class features grouped by class
 */
export function ClassFeaturesPanel({
  classFeatures,
  groupClassFeaturesByClass,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateFeature,
  renderSpawnModeControls
}: ClassFeaturesPanelProps) {
  const grouped = groupClassFeaturesByClass(classFeatures);
  const classNames = Object.keys(grouped).sort();

  return (
    <div className="dataviewer-list">
      {/* Class Feature Creation Header */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateFeature}
          leftIcon={Plus}
        >
          Create Feature
        </Button>
      </div>

      <div className="dataviewer-grouped-list">
        {classNames.map(className => (
          <div key={className} className="dataviewer-group">
            <div className="dataviewer-group-header">
              <span className="dataviewer-group-title">{className}</span>
              <span className="dataviewer-group-count">({grouped[className].length})</span>
            </div>
            <div className="dataviewer-group-items">
              {grouped[className]
                .sort((a, b) => a.level - b.level)
                .map(feature => {
                  const isExpanded = expandedItems.has(feature.id);

                  return (
                    <ClassFeatureCard
                      key={feature.id}
                      feature={feature}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpanded(feature.id)}
                      onEdit={() => onEdit('classFeatures', feature.name)}
                      onDelete={() => onDelete('classFeatures', feature.name)}
                      onDuplicate={() => onDuplicate('classFeatures', feature.name)}
                      checkIsCustomItem={(itemName) => checkIsCustomItem('classFeatures', itemName)}
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
