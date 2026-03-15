/**
 * SpellsPanel Component
 *
 * Displays a list of spells with expandable cards showing spell details.
 * Extracted from DataViewerTab as part of the refactoring effort.
 *
 * @see docs/plans/DATAVIEWERTAB_REFACTOR_PLAN.md - Task 2.1
 */

import { ChevronDown, ChevronUp, Scroll, Plus } from 'lucide-react';
import type { RegisteredSpell } from 'playlist-data-engine';
import { ArweaveImage } from '../../../shared/ArweaveImage';
import { Button } from '../../../ui/Button';
import { CustomContentBadge } from '../CustomContentBadge';
import { SCHOOL_COLORS, SCHOOL_BG_COLORS } from '../constants';
import { formatLevel } from '../utils';

/**
 * Props for the SpellsPanel component
 */
export interface SpellsPanelProps {
  /** Array of spells to display (already filtered) */
  spells: RegisteredSpell[];
  /** Set of expanded item IDs */
  expandedItems: Set<string>;
  /** Handler to toggle expansion of an item */
  toggleExpanded: (id: string) => void;
  /** Handler for editing an item */
  onEdit: (category: 'spells', itemName: string) => void;
  /** Handler for deleting an item */
  onDelete: (category: 'spells', itemName: string) => void;
  /** Handler for duplicating an item */
  onDuplicate: (category: 'spells', itemName: string) => void;
  /** Function to check if an item is custom */
  checkIsCustomItem: (category: 'spells', itemName: string) => boolean;
  /** Handler to open spell creator */
  onCreateSpell: () => void;
  /** Render function for spell filters */
  renderSpellFilters: () => React.ReactNode;
  /** Render function for spawn mode controls */
  renderSpawnModeControls: () => React.ReactNode;
}

/**
 * Renders a single spell card
 */
function SpellCard({
  spell,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem
}: {
  spell: RegisteredSpell;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  checkIsCustomItem: (itemName: string) => boolean;
}) {
  // Use name as unique key since spell.id may be undefined for default spells
  const spellKey = spell.id || spell.name;
  const schoolColor = SCHOOL_COLORS[spell.school] || 'var(--color-text-secondary)';
  const schoolBg = SCHOOL_BG_COLORS[spell.school] || 'var(--color-surface-dim)';
  const hasImage = spell.image || spell.icon;
  const isCustom = checkIsCustomItem(spell.name);

  return (
    <div
      key={spellKey}
      className="dataviewer-item-card"
      style={{ backgroundColor: schoolBg }}
    >
      <div
        className="dataviewer-item-header"
        onClick={onToggle}
      >
        {/* Spell image/icon thumbnail */}
        {hasImage && (
          <div className="dataviewer-item-thumbnail">
            <ArweaveImage
              src={spell.image || spell.icon || ''}
              alt={spell.name}
              width={40}
              height={40}
              showShimmer={true}
              fallback={
                <div className="dataviewer-item-thumbnail-fallback">
                  <Scroll size={20} />
                </div>
              }
            />
          </div>
        )}
        <div className="dataviewer-item-header-content">
          <span className="dataviewer-item-name" style={{ color: schoolColor }}>
            {spell.name}
          </span>
          <div className="dataviewer-item-badges">
            <span className="dataviewer-badge" style={{ backgroundColor: schoolColor }}>
              {spell.school}
            </span>
            <span className="dataviewer-badge dataviewer-badge-secondary">
              {formatLevel(spell.level)}
            </span>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {isExpanded && (
        <div className="dataviewer-item-details">
          {/* Full-size spell image when expanded */}
          {spell.image && (
            <div className="dataviewer-item-image">
              <ArweaveImage
                src={spell.image}
                alt={spell.name}
                width={200}
                height={200}
                showShimmer={true}
                fallback={
                  <div className="dataviewer-item-image-fallback">
                    <Scroll size={48} />
                  </div>
                }
              />
            </div>
          )}
          <div className="dataviewer-item-stats">
            <div className="dataviewer-item-stat">
              <span className="dataviewer-item-stat-label">Casting Time:</span>
              <span className="dataviewer-item-stat-value">{spell.casting_time}</span>
            </div>
            <div className="dataviewer-item-stat">
              <span className="dataviewer-item-stat-label">Range:</span>
              <span className="dataviewer-item-stat-value">{spell.range}</span>
            </div>
            <div className="dataviewer-item-stat">
              <span className="dataviewer-item-stat-label">Components:</span>
              <span className="dataviewer-item-stat-value">{spell.components}</span>
            </div>
            <div className="dataviewer-item-stat">
              <span className="dataviewer-item-stat-label">Duration:</span>
              <span className="dataviewer-item-stat-value">{spell.duration}</span>
            </div>
          </div>
          {spell.description && (
            <div className="dataviewer-item-description">
              {spell.description}
            </div>
          )}
          {spell.classes && spell.classes.length > 0 && (
            <div className="dataviewer-item-tags">
              <span className="dataviewer-item-tags-label">Classes:</span>
              {spell.classes.map(cls => (
                <span key={cls} className="dataviewer-tag">{cls}</span>
              ))}
            </div>
          )}
          {isCustom && (
            <div className="dataviewer-item-actions">
              <CustomContentBadge
                category="spells"
                itemName={spell.name}
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
 * SpellsPanel - Displays a list of spells with expandable cards
 */
export function SpellsPanel({
  spells,
  expandedItems,
  toggleExpanded,
  onEdit,
  onDelete,
  onDuplicate,
  checkIsCustomItem,
  onCreateSpell,
  renderSpellFilters,
  renderSpawnModeControls
}: SpellsPanelProps) {
  return (
    <div className="dataviewer-list">
      {/* Spell Creation Header */}
      <div className="dataviewer-section-header">
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateSpell}
          leftIcon={Plus}
        >
          Create Spell
        </Button>
      </div>

      {renderSpellFilters()}

      <div className="dataviewer-items">
        {spells.map(spell => {
          const spellKey = spell.id || spell.name;
          const isExpanded = expandedItems.has(spellKey);

          return (
            <SpellCard
              key={spellKey}
              spell={spell}
              isExpanded={isExpanded}
              onToggle={() => toggleExpanded(spellKey)}
              onEdit={() => onEdit('spells', spell.name)}
              onDelete={() => onDelete('spells', spell.name)}
              onDuplicate={() => onDuplicate('spells', spell.name)}
              checkIsCustomItem={(itemName) => checkIsCustomItem('spells', itemName)}
            />
          );
        })}
      </div>

      {renderSpawnModeControls()}
    </div>
  );
}
