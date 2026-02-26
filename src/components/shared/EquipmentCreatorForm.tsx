/**
 * EquipmentCreatorForm Component
 *
 * A shared form component for creating and editing equipment items.
 * Extracted from ItemsTab.tsx for reuse in DataViewerTab.
 *
 * Features:
 * - Basic info fields: name, type, rarity, weight, quantity
 * - Weapon-specific fields: damage dice, damage type
 * - Armor-specific fields: AC bonus
 * - Auto-equip option
 * - Advanced options documentation
 * - Live preview of the created item
 * - Validation with error display
 *
 * @see useItemCreator - Hook for item creation logic
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Sword,
  Shield,
  Package,
  Info,
  ChevronUp,
  ChevronDown,
  Sparkles,
  X,
  Code,
  ImageIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageFieldInput } from './ImageFieldInput';
import type {
  EnhancedEquipment
} from 'playlist-data-engine';
import {
  useItemCreator,
  type CustomItemFormData,
  type ValidationResult
} from '../../hooks/useItemCreator';
import './EquipmentCreatorForm.css';

/**
 * Rarity color mapping for equipment display
 */
const RARITY_COLORS: Record<string, string> = {
  'common': 'var(--color-text-secondary)',
  'uncommon': 'hsl(120 60% 40%)',
  'rare': 'hsl(210 80% 50%)',
  'very_rare': 'hsl(270 60% 50%)',
  'legendary': 'hsl(30 90% 50%)'
};

/**
 * Rarity background colors for item cards
 */
const RARITY_BG_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.1)',
  'uncommon': 'hsl(120 60% 40% / 0.1)',
  'rare': 'hsl(210 80% 50% / 0.1)',
  'very_rare': 'hsl(270 60% 50% / 0.1)',
  'legendary': 'hsl(30 90% 50% / 0.15)'
};

/**
 * Rarity border colors for item cards
 */
const RARITY_BORDER_COLORS: Record<string, string> = {
  'common': 'hsl(0 0% 50% / 0.3)',
  'uncommon': 'hsl(120 60% 40% / 0.4)',
  'rare': 'hsl(210 80% 50% / 0.4)',
  'very_rare': 'hsl(270 60% 50% / 0.4)',
  'legendary': 'hsl(30 90% 50% / 0.5)'
};

/**
 * Equipment type categories
 */
export type EquipmentType = 'weapon' | 'armor' | 'item';

/**
 * Equipment rarity levels
 */
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';

/**
 * Props for the EquipmentCreatorForm component
 */
export interface EquipmentCreatorFormProps {
  /** Initial form data (for editing) */
  initialData?: Partial<EquipmentCreatorFormData>;
  /** Callback when form is submitted */
  onSubmit: (data: EquipmentCreatorFormData, equipment: EnhancedEquipment) => Promise<void> | void;
  /** Callback when form data changes */
  onChange?: (data: EquipmentCreatorFormData) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether the form is in edit mode */
  isEditMode?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether to show the preview section */
  showPreview?: boolean;
  /** Whether to show the advanced options section */
  showAdvancedOptions?: boolean;
  /** Whether to show the auto-equip checkbox */
  showAutoEquip?: boolean;
  /** External validation result */
  externalValidation?: ValidationResult;
}

/**
 * Form data interface (extends CustomItemFormData from hook)
 */
export interface EquipmentCreatorFormData extends CustomItemFormData {
  autoEquip?: boolean;
  icon?: string;
  image?: string;
}

/**
 * Get icon for equipment type
 */
function getEquipmentTypeIcon(type: string) {
  switch (type) {
    case 'weapon':
      return Sword;
    case 'armor':
      return Shield;
    default:
      return Package;
  }
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
 * EquipmentCreatorForm Component
 *
 * A reusable form for creating and editing equipment items.
 */
export function EquipmentCreatorForm({
  initialData,
  onSubmit,
  onChange,
  onCancel,
  isEditMode = false,
  submitButtonText,
  disabled = false,
  showPreview = true,
  showAdvancedOptions = true,
  showAutoEquip = true,
  externalValidation
}: EquipmentCreatorFormProps) {
  // Get item creator hook functions
  const {
    validateItemData,
    createCustomItem,
    isLoading: isCreatorLoading
  } = useItemCreator();

  // Form state
  const [itemName, setItemName] = useState(initialData?.name || '');
  const [itemType, setItemType] = useState<EquipmentType>(initialData?.type || 'weapon');
  const [itemRarity, setItemRarity] = useState<EquipmentRarity>(initialData?.rarity || 'common');
  const [itemWeight, setItemWeight] = useState(initialData?.weight ?? 1);
  const [itemQuantity, setItemQuantity] = useState(initialData?.quantity ?? 1);
  const [damageDice, setDamageDice] = useState(initialData?.damageDice || '');
  const [damageType, setDamageType] = useState(initialData?.damageType || 'slashing');
  const [acBonus, setAcBonus] = useState<number | ''>(initialData?.acBonus ?? '');
  const [autoEquip, setAutoEquip] = useState(initialData?.autoEquip ?? false);
  const [itemIcon, setItemIcon] = useState(initialData?.icon || '');
  const [itemImage, setItemImage] = useState(initialData?.image || '');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isAdvancedOptionsExpanded, setIsAdvancedOptionsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build form data object
  const formData: EquipmentCreatorFormData = useMemo(() => ({
    name: itemName,
    type: itemType,
    rarity: itemRarity,
    weight: itemWeight,
    quantity: itemQuantity,
    ...(itemType === 'weapon' && damageDice && {
      damageDice,
      damageType
    }),
    ...(itemType === 'armor' && acBonus !== '' && {
      acBonus: Number(acBonus)
    }),
    autoEquip,
    ...(itemIcon.trim() && { icon: itemIcon.trim() }),
    ...(itemImage.trim() && { image: itemImage.trim() })
  }), [itemName, itemType, itemRarity, itemWeight, itemQuantity, damageDice, damageType, acBonus, autoEquip, itemIcon, itemImage]);

  // Notify parent of form changes
  useEffect(() => {
    onChange?.(formData);
  }, [formData, onChange]);

  // Generate preview item
  const previewItem: EnhancedEquipment | null = useMemo(() => {
    if (!itemName.trim()) return null;

    const result = createCustomItem(formData as CustomItemFormData);
    return result.success ? result.equipment || null : null;
  }, [itemName, itemType, itemRarity, itemWeight, damageDice, damageType, acBonus, itemQuantity, itemIcon, itemImage, createCustomItem, formData]);

  // Handle form submission
  const handleSubmit = async () => {
    // Validate
    const validation = validateItemData(formData as CustomItemFormData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    // Check external validation
    if (externalValidation && !externalValidation.valid) {
      setFormErrors(externalValidation.errors);
      return;
    }

    setFormErrors([]);

    // Create the equipment object
    const result = createCustomItem(formData as CustomItemFormData);
    if (!result.success || !result.equipment) {
      setFormErrors([result.error || 'Failed to create item']);
      return;
    }

    // Call onSubmit callback
    setIsSubmitting(true);
    try {
      await onSubmit(formData, result.equipment);
      // Clear form on success (only for create mode)
      if (!isEditMode) {
        setItemName('');
        setDamageDice('');
        setAcBonus('');
        setItemIcon('');
        setItemImage('');
      }
    } catch (error) {
      setFormErrors([error instanceof Error ? error.message : 'An error occurred']);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onCancel?.();
  };

  // Get button text
  const getButtonText = () => {
    if (submitButtonText) return submitButtonText;
    if (isEditMode) return 'Save Changes';
    return 'Create & Add to Hero';
  };

  return (
    <div className="equipment-creator-form">
      {/* Basic Info */}
      <div className="equipment-creator-section" role="group" aria-labelledby="equipment-basic-section-title">
        <h4 className="equipment-creator-section-title" id="equipment-basic-section-title">Basic Information</h4>
        <div className="equipment-creator-grid">
          {/* Item Name */}
          <div className="equipment-creator-field equipment-creator-field-full">
            <label className="equipment-creator-label" htmlFor="equipment-name">
              Item Name <span className="equipment-creator-required">*</span>
            </label>
            <input
              id="equipment-name"
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Sword of Flames"
              className="equipment-creator-input"
              disabled={disabled}
            />
          </div>

          {/* Item Type */}
          <div className="equipment-creator-field">
            <label className="equipment-creator-label">Item Type <span className="equipment-creator-default">default: item</span></label>
            <div className="equipment-creator-type-selector" role="group" aria-label="Item type selection">
              <button
                type="button"
                className={`equipment-creator-type-btn ${itemType === 'weapon' ? 'equipment-creator-type-btn-active' : ''}`}
                onClick={() => setItemType('weapon')}
                disabled={disabled}
                aria-pressed={itemType === 'weapon'}
                aria-label="Weapon type"
              >
                <Sword size={16} aria-hidden="true" />
                <span>Weapon</span>
              </button>
              <button
                type="button"
                className={`equipment-creator-type-btn ${itemType === 'armor' ? 'equipment-creator-type-btn-active' : ''}`}
                onClick={() => setItemType('armor')}
                disabled={disabled}
                aria-pressed={itemType === 'armor'}
                aria-label="Armor type"
              >
                <Shield size={16} aria-hidden="true" />
                <span>Armor</span>
              </button>
              <button
                type="button"
                className={`equipment-creator-type-btn ${itemType === 'item' ? 'equipment-creator-type-btn-active' : ''}`}
                onClick={() => setItemType('item')}
                disabled={disabled}
                aria-pressed={itemType === 'item'}
                aria-label="Item type"
              >
                <Package size={16} aria-hidden="true" />
                <span>Item</span>
              </button>
            </div>
          </div>

          {/* Rarity */}
          <div className="equipment-creator-field">
            <label className="equipment-creator-label" htmlFor="equipment-rarity">
              Rarity <span className="equipment-creator-default">default: common</span>
            </label>
            <select
              id="equipment-rarity"
              value={itemRarity}
              onChange={(e) => setItemRarity(e.target.value as EquipmentRarity)}
              className="equipment-creator-select"
              disabled={disabled}
            >
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="very_rare">Very Rare</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>

          {/* Weight */}
          <div className="equipment-creator-field">
            <label className="equipment-creator-label" htmlFor="equipment-weight">
              Weight (lb) <span className="equipment-creator-optional">optional</span>
            </label>
            <input
              id="equipment-weight"
              type="number"
              min="0"
              max="1000"
              step="0.1"
              value={itemWeight}
              onChange={(e) => setItemWeight(parseFloat(e.target.value) || 0)}
              className="equipment-creator-input"
              disabled={disabled}
            />
          </div>

          {/* Quantity */}
          <div className="equipment-creator-field">
            <label className="equipment-creator-label" htmlFor="equipment-quantity">
              Quantity <span className="equipment-creator-default">default: 1</span>
            </label>
            <input
              id="equipment-quantity"
              type="number"
              min="1"
              max="9999"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              className="equipment-creator-input"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Image Fields Section */}
      <div className="equipment-creator-section equipment-creator-images-section" role="group" aria-labelledby="equipment-images-section-title">
        <h4 className="equipment-creator-section-title" id="equipment-images-section-title">
          <ImageIcon size={16} aria-hidden="true" />
          Images <span className="equipment-creator-optional">(optional)</span>
        </h4>
        <div className="equipment-creator-images-grid">
          <div className="equipment-creator-field">
            <ImageFieldInput
              value={itemIcon}
              onChange={setItemIcon}
              label="Item Icon"
              placeholder="e.g., assets/icons/sword.png"
              fieldType="icon"
              previewSize="sm"
              disabled={disabled}
            />
          </div>
          <div className="equipment-creator-field">
            <ImageFieldInput
              value={itemImage}
              onChange={setItemImage}
              label="Item Image"
              placeholder="e.g., assets/equipment/flaming-sword.png"
              fieldType="image"
              previewSize="md"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Weapon-specific fields */}
      {itemType === 'weapon' && (
        <div className="equipment-creator-section" role="group" aria-labelledby="equipment-weapon-section-title">
          <h4 className="equipment-creator-section-title" id="equipment-weapon-section-title">
            <Sword size={16} aria-hidden="true" />
            Weapon Properties <span className="equipment-creator-optional">(optional)</span>
          </h4>
          <div className="equipment-creator-grid">
            <div className="equipment-creator-field">
              <label className="equipment-creator-label" htmlFor="damage-dice">
                Damage Dice <span className="equipment-creator-optional">optional</span>
              </label>
              <input
                id="damage-dice"
                type="text"
                value={damageDice}
                onChange={(e) => setDamageDice(e.target.value)}
                placeholder="e.g., 1d8, 2d6"
                className="equipment-creator-input"
                disabled={disabled}
                aria-describedby="damage-dice-hint"
              />
              <span className="equipment-creator-hint" id="damage-dice-hint">Format: 1d8, 2d6, etc.</span>
            </div>

            <div className="equipment-creator-field">
              <label className="equipment-creator-label" htmlFor="damage-type">
                Damage Type <span className="equipment-creator-default">default: slashing</span>
              </label>
              <select
                id="damage-type"
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                className="equipment-creator-select"
                disabled={disabled}
              >
                <option value="slashing">Slashing</option>
                <option value="piercing">Piercing</option>
                <option value="bludgeoning">Bludgeoning</option>
                <option value="fire">Fire</option>
                <option value="cold">Cold</option>
                <option value="lightning">Lightning</option>
                <option value="acid">Acid</option>
                <option value="poison">Poison</option>
                <option value="necrotic">Necrotic</option>
                <option value="radiant">Radiant</option>
                <option value="force">Force</option>
                <option value="psychic">Psychic</option>
                <option value="thunder">Thunder</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Armor-specific fields */}
      {itemType === 'armor' && (
        <div className="equipment-creator-section" role="group" aria-labelledby="equipment-armor-section-title">
          <h4 className="equipment-creator-section-title" id="equipment-armor-section-title">
            <Shield size={16} aria-hidden="true" />
            Armor Properties <span className="equipment-creator-optional">(optional)</span>
          </h4>
          <div className="equipment-creator-grid">
            <div className="equipment-creator-field">
              <label className="equipment-creator-label" htmlFor="ac-bonus">
                AC Bonus <span className="equipment-creator-optional">optional</span>
              </label>
              <input
                id="ac-bonus"
                type="number"
                min="0"
                max="20"
                value={acBonus}
                onChange={(e) => setAcBonus(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="e.g., 2"
                className="equipment-creator-input"
                disabled={disabled}
                aria-describedby="ac-bonus-hint"
              />
              <span className="equipment-creator-hint" id="ac-bonus-hint">Base AC provided by armor</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Options Info */}
      {showAdvancedOptions && (
        <div className="equipment-creator-section equipment-creator-advanced-options">
          <button
            type="button"
            className="equipment-creator-advanced-options-toggle"
            onClick={() => setIsAdvancedOptionsExpanded(!isAdvancedOptionsExpanded)}
            disabled={disabled}
            aria-expanded={isAdvancedOptionsExpanded}
            aria-controls="equipment-creator-advanced-options-content"
          >
            <Info size={16} aria-hidden="true" />
            <span>Advanced Options</span>
            {isAdvancedOptionsExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>

          {isAdvancedOptionsExpanded && (
            <div className="equipment-creator-advanced-options-content" id="equipment-creator-advanced-options-content">
              <p className="equipment-creator-advanced-options-intro">
                The UI above covers basic item creation. The <code>playlist-data-engine</code> API
                supports additional properties for more advanced items:
              </p>

              <div className="equipment-creator-advanced-options-list">
                <div className="equipment-creator-advanced-option">
                  <h5>properties[]</h5>
                  <p>Equipment properties like stat bonuses, skill proficiencies, damage bonuses, and passive modifiers.</p>
                  <span className="equipment-creator-advanced-option-types">
                    Types: stat_bonus, skill_proficiency, ability_unlock, passive_modifier, special_property, damage_bonus, stat_requirement
                  </span>
                </div>

                <div className="equipment-creator-advanced-option">
                  <h5>grantsFeatures[]</h5>
                  <p>Feature IDs or inline feature definitions granted when the item is equipped.</p>
                </div>

                <div className="equipment-creator-advanced-option">
                  <h5>grantsSkills[]</h5>
                  <p>Skill proficiencies granted when equipped. Format: {'{ skillId, level: "proficient" | "expertise" }'}</p>
                </div>

                <div className="equipment-creator-advanced-option">
                  <h5>grantsSpells[]</h5>
                  <p>Spells granted when equipped. Format: {'{ spellId, level?, uses?, recharge? }'}</p>
                </div>

                <div className="equipment-creator-advanced-option">
                  <h5>tags[]</h5>
                  <p>Search and filter tags for categorization (e.g., ["magic", "dwarven", "cursed"]).</p>
                </div>

                <div className="equipment-creator-advanced-option">
                  <h5>spawnWeight</h5>
                  <p>Weight for random loot generation. Default is 0 (won&apos;t spawn randomly). Set higher for common items.</p>
                </div>
              </div>

              <div className="equipment-creator-advanced-options-code">
                <h5>
                  <Code size={14} />
                  Programmatic Example
                </h5>
                <pre className="equipment-creator-code-block">
{`import { ExtensionManager } from 'playlist-data-engine';

const flamingSword = {
  name: 'Flaming Sword',
  type: 'weapon',
  rarity: 'rare',
  weight: 3,
  damage: { dice: '1d8', damageType: 'slashing' },
  properties: [{
    type: 'damage_bonus',
    target: 'fire',
    value: '1d6',
    description: '+1d6 fire damage'
  }],
  grantsFeatures: ['fire_resistance'],
  tags: ['magic', 'fire']
};

ExtensionManager.getInstance()
  .register('equipment', [flamingSword]);`}
                </pre>
              </div>

              <p className="equipment-creator-advanced-options-docs">
                See <code>docs/engine/docs/EQUIPMENT_SYSTEM.md</code> for full API documentation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-equip option */}
      {showAutoEquip && (
        <div className="equipment-creator-section">
          <label className="equipment-creator-checkbox">
            <input
              type="checkbox"
              checked={autoEquip}
              onChange={(e) => setAutoEquip(e.target.checked)}
              disabled={disabled}
            />
            <span>Auto-equip when added to character</span>
          </label>
        </div>
      )}

      {/* Validation Errors */}
      {formErrors.length > 0 && (
        <div className="equipment-creator-errors" role="alert" aria-live="assertive">
          {formErrors.map((error, index) => (
            <div key={index} className="equipment-creator-error">
              <X size={14} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="equipment-creator-actions">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          isLoading={isSubmitting || isCreatorLoading}
          disabled={disabled || !itemName.trim()}
        >
          {getButtonText()}
        </Button>

        {onCancel && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Preview Section */}
      {showPreview && previewItem && (
        <div className="equipment-creator-preview" role="status" aria-live="polite" aria-label="Equipment preview">
          <h4 className="equipment-creator-preview-title">
            <Sparkles size={16} aria-hidden="true" />
            Preview
          </h4>
          <div
            className="equipment-creator-preview-card"
            style={{
              backgroundColor: RARITY_BG_COLORS[previewItem.rarity] || RARITY_BG_COLORS.common,
              borderColor: RARITY_BORDER_COLORS[previewItem.rarity] || RARITY_BORDER_COLORS.common
            }}
          >
            <div className="equipment-creator-preview-header">
              {previewItem.icon ? (
                <img
                  src={previewItem.icon}
                  alt={previewItem.name}
                  className="equipment-creator-preview-icon"
                  onError={(e) => {
                    // Fallback to type icon on error
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (() => {
                const TypeIcon = getEquipmentTypeIcon(previewItem.type);
                return <TypeIcon size={18} style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }} />;
              })()}
              <span
                className="equipment-creator-preview-name"
                style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }}
              >
                {previewItem.name}
              </span>
            </div>
            {previewItem.image && (
              <div className="equipment-creator-preview-image">
                <img
                  src={previewItem.image}
                  alt={previewItem.name}
                  onError={(e) => {
                    // Hide broken image
                    const target = e.target as HTMLImageElement;
                    target.parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="equipment-creator-preview-meta">
              <span style={{ color: RARITY_COLORS[previewItem.rarity] || RARITY_COLORS.common }}>
                {formatRarity(previewItem.rarity)}
              </span>
              <span>•</span>
              <span>{previewItem.type.charAt(0).toUpperCase() + previewItem.type.slice(1)}</span>
              <span>•</span>
              <span>{previewItem.weight} lb</span>
            </div>
            {previewItem.damage && (
              <div className="equipment-creator-preview-stat">
                <span className="equipment-creator-preview-stat-label">Damage:</span>
                <span>{previewItem.damage.dice} {previewItem.damage.damageType}</span>
              </div>
            )}
            {previewItem.acBonus !== undefined && (
              <div className="equipment-creator-preview-stat">
                <span className="equipment-creator-preview-stat-label">AC Bonus:</span>
                <span>+{previewItem.acBonus}</span>
              </div>
            )}

            {/* Preview Properties Summary */}
            <div className="equipment-creator-preview-properties">
              <h5 className="equipment-creator-preview-properties-title">
                Properties Summary
              </h5>
              <div className="equipment-creator-preview-properties-list">
                <div className="equipment-creator-preview-property-group">
                  <span className="equipment-creator-preview-property-group-label">
                    User Defined
                  </span>
                  <div className="equipment-creator-preview-property-tags">
                    <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                      name: &quot;{previewItem.name}&quot;
                    </span>
                    {previewItem.type !== 'item' && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        type: {previewItem.type}
                      </span>
                    )}
                    {previewItem.rarity !== 'common' && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        rarity: {previewItem.rarity}
                      </span>
                    )}
                    {previewItem.weight !== 1 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        weight: {previewItem.weight}
                      </span>
                    )}
                    {previewItem.icon && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        icon: set
                      </span>
                    )}
                    {previewItem.image && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        image: set
                      </span>
                    )}
                  </div>
                </div>

                <div className="equipment-creator-preview-property-group">
                  <span className="equipment-creator-preview-property-group-label">
                    Defaults Applied
                  </span>
                  <div className="equipment-creator-preview-property-tags">
                    {previewItem.rarity === 'common' && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-default">
                        rarity: common
                      </span>
                    )}
                    {previewItem.weight === 1 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-default">
                        weight: 1
                      </span>
                    )}
                    <span className="equipment-creator-preview-tag equipment-creator-preview-tag-default">
                      quantity: {itemQuantity}
                    </span>
                    <span className="equipment-creator-preview-tag equipment-creator-preview-tag-default">
                      spawnWeight: 0
                    </span>
                  </div>
                </div>

                {!previewItem.damage && previewItem.type === 'weapon' && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Optional (Not Set)
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-optional">
                        damage: not specified
                      </span>
                    </div>
                  </div>
                )}

                {previewItem.acBonus === undefined && previewItem.type === 'armor' && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Optional (Not Set)
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-optional">
                        acBonus: not specified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentCreatorForm;
