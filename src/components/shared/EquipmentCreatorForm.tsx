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

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  ImageIcon,
  Box,
  Plus,
  Trash2,
  RefreshCw,
  Zap,
  BookOpen,
  Award,
  Tag,
  Weight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ImageFieldInput } from './ImageFieldInput';
import { BoxContentsBuilder } from './BoxContentsBuilder';
import type {
  EnhancedEquipment,
  BoxContents,
  EquipmentProperty
} from 'playlist-data-engine';
import { ExtensionManager } from 'playlist-data-engine';
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
export type EquipmentType = 'weapon' | 'armor' | 'item' | 'box';

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
  boxContents?: BoxContents;
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
    case 'box':
      return Box;
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
 * Equipment property types for the builder
 */
export const EQUIPMENT_PROPERTY_TYPES = [
  { value: 'stat_bonus', label: 'Stat Bonus', description: 'Ability score bonus (STR, DEX, etc.)' },
  { value: 'skill_proficiency', label: 'Skill Proficiency', description: 'Grant proficiency or expertise' },
  { value: 'ability_unlock', label: 'Ability Unlock', description: 'Unlock special ability (darkvision, etc.)' },
  { value: 'passive_modifier', label: 'Passive Modifier', description: 'Constant bonus (AC, speed, etc.)' },
  { value: 'special_property', label: 'Special Property', description: 'Game-specific property' },
  { value: 'damage_bonus', label: 'Damage Bonus', description: 'Extra damage of a type' },
  { value: 'stat_requirement', label: 'Stat Requirement', description: 'Minimum stat to use item' },
] as const;

/**
 * Local equipment property interface (allows partial properties for form editing)
 */
interface LocalEquipmentProperty {
  type: string;
  target: string;
  value?: string | number | boolean;
  description?: string;
}

/**
 * Common tag suggestions for equipment
 */
const TAG_SUGGESTIONS = [
  'magic', 'rare', 'cursed', 'consumable', 'attunement', 'artifact',
  'dwarven', 'elven', 'holy', 'unholy', 'elemental', 'nature',
  'divine', 'arcane', 'martial', 'simple', 'finesse', 'versatile',
  'two-handed', 'ranged', 'melee', 'light', 'medium', 'heavy',
  'shield', 'focus', 'amulet', 'ring', 'cloak', 'boots', 'helm'
];

/**
 * Granted skill interface
 */
interface GrantedSkill {
  skillId: string;
  level: 'proficient' | 'expertise';
}

/**
 * Granted spell interface
 */
interface GrantedSpell {
  spellId: string;
  level?: number;
  uses?: number;
  recharge?: string;
}

/**
 * Registry data for dropdowns
 */
interface RegistryData {
  features: Array<{ id: string; name: string; type: string }>;
  skills: Array<{ id: string; name: string }>;
  spells: Array<{ id: string; name: string; level: number }>;
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
  const [boxContents, setBoxContents] = useState<BoxContents | undefined>(initialData?.boxContents);
  const [boxContentsValid, setBoxContentsValid] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isAdvancedOptionsExpanded, setIsAdvancedOptionsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Advanced options state
  const [properties, setProperties] = useState<LocalEquipmentProperty[]>(initialData?.properties || []);
  const [grantsFeatures, setGrantsFeatures] = useState<string[]>(initialData?.grantsFeatures || []);
  const [grantsSkills, setGrantsSkills] = useState<GrantedSkill[]>(initialData?.grantsSkills || []);
  const [grantsSpells, setGrantsSpells] = useState<GrantedSpell[]>(initialData?.grantsSpells || []);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [spawnWeight, setSpawnWeight] = useState<number>(0);

  // Registry data for dropdowns
  const [registryData, setRegistryData] = useState<RegistryData>({
    features: [],
    skills: [],
    spells: []
  });

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load registry data
  const loadRegistryData = useCallback(() => {
    try {
      const manager = ExtensionManager.getInstance();

      // Load features (class features + racial traits)
      const classFeatures = (manager.get('classFeatures') || []) as Array<{ id?: string; name: string; class?: string }>;
      const racialTraits = (manager.get('racialTraits') || []) as Array<{ id?: string; name: string; race?: string }>;

      const featuresData = [
        ...classFeatures.map(f => ({
          id: f.id || f.name.toLowerCase().replace(/\s+/g, '_'),
          name: f.name,
          type: 'class'
        })),
        ...racialTraits.map(t => ({
          id: t.id || t.name.toLowerCase().replace(/\s+/g, '_'),
          name: t.name,
          type: 'racial'
        }))
      ];

      // Load skills
      const skills = (manager.get('skills') || []) as Array<{ id?: string; name: string }>;
      const skillsData = skills.map(s => ({
        id: s.id || s.name.toLowerCase().replace(/\s+/g, '_'),
        name: s.name
      }));

      // Load spells
      const spells = (manager.get('spells') || []) as Array<{ name: string; level?: number }>;
      const spellsData = spells.map(s => ({
        id: s.name.toLowerCase().replace(/\s+/g, '_'),
        name: s.name,
        level: s.level || 0
      }));

      setRegistryData({
        features: featuresData,
        skills: skillsData,
        spells: spellsData
      });
    } catch (error) {
      console.warn('Failed to load registry data:', error);
    }
  }, []);

  // Load registry data on mount
  useEffect(() => {
    loadRegistryData();
  }, [loadRegistryData]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Build form data object
  const formData: EquipmentCreatorFormData = useMemo(() => {
    // Convert local properties to EquipmentProperty format (filter out incomplete properties)
    const validProperties = properties
      .filter(p => p.type && p.target)
      .map(p => ({
        type: p.type as EquipmentProperty['type'],
        target: p.target,
        ...(p.value !== undefined && { value: p.value }),
        ...(p.description && { description: p.description })
      })) as EquipmentProperty[];

    return {
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
      ...(itemType === 'box' && boxContents && { boxContents }),
      autoEquip,
      ...(itemIcon.trim() && { icon: itemIcon.trim() }),
      ...(itemImage.trim() && { image: itemImage.trim() }),
      // Advanced options
      ...(validProperties.length > 0 && { properties: validProperties }),
      ...(grantsFeatures.length > 0 && { grantsFeatures }),
      ...(grantsSkills.length > 0 && { grantsSkills: grantsSkills as Array<{ skillId: string; level: 'proficient' | 'expertise' }> }),
      ...(grantsSpells.length > 0 && { grantsSpells: grantsSpells as Array<{ spellId: string; level?: number; uses?: number; recharge?: string }> }),
      ...(tags.length > 0 && { tags }),
      spawnWeight
    };
  }, [itemName, itemType, itemRarity, itemWeight, itemQuantity, damageDice, damageType, acBonus, autoEquip, itemIcon, itemImage, boxContents, properties, grantsFeatures, grantsSkills, grantsSpells, tags, spawnWeight]);

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

    // Check box contents validation for box type
    if (itemType === 'box' && !boxContentsValid) {
      setFormErrors(['Box contents validation failed. Please check the configuration.']);
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
        setBoxContents(undefined);
        // Clear advanced options
        setProperties([]);
        setGrantsFeatures([]);
        setGrantsSkills([]);
        setGrantsSpells([]);
        setTags([]);
        setSpawnWeight(0);
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
              <button
                type="button"
                className={`equipment-creator-type-btn ${itemType === 'box' ? 'equipment-creator-type-btn-active' : ''}`}
                onClick={() => setItemType('box')}
                disabled={disabled}
                aria-pressed={itemType === 'box'}
                aria-label="Box type"
              >
                <Box size={16} aria-hidden="true" />
                <span>Box</span>
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

      {/* Box-specific fields */}
      {itemType === 'box' && (
        <div className="equipment-creator-section equipment-creator-box-section" role="group" aria-labelledby="equipment-box-section-title">
          <h4 className="equipment-creator-section-title" id="equipment-box-section-title">
            <Box size={16} aria-hidden="true" />
            Box Contents <span className="equipment-creator-required">*</span>
          </h4>
          <p className="equipment-creator-box-intro">
            Configure what items or gold this box contains when opened.
            Each drop generates one result from its pool based on weights.
          </p>
          <BoxContentsBuilder
            value={boxContents}
            onChange={setBoxContents}
            onValidChange={setBoxContentsValid}
            disabled={disabled}
            showRequirements={true}
          />
        </div>
      )}

      {/* Advanced Options */}
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
            <Zap size={16} aria-hidden="true" />
            <span>Advanced Options</span>
            <span className="equipment-creator-advanced-options-count">
              ({properties.length + grantsFeatures.length + grantsSkills.length + grantsSpells.length + tags.length} configured)
            </span>
            {isAdvancedOptionsExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>

          {isAdvancedOptionsExpanded && (
            <div className="equipment-creator-advanced-options-content" id="equipment-creator-advanced-options-content">
              {/* Properties Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('properties')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('properties')}
                >
                  <Zap size={14} aria-hidden="true" />
                  <span>Equipment Properties</span>
                  <span className="equipment-creator-advanced-section-count">
                    {properties.length}
                  </span>
                  {expandedSections.has('properties') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('properties') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Add properties like stat bonuses, skill proficiencies, and damage bonuses.
                    </p>
                    <div className="equipment-creator-properties-list">
                      {properties.map((prop, index) => (
                        <div key={index} className="equipment-creator-property-item">
                          <div className="equipment-creator-property-header">
                            <span className="equipment-creator-property-number">Property {index + 1}</span>
                            <button
                              type="button"
                              className="equipment-creator-property-remove"
                              onClick={() => setProperties(prev => prev.filter((_, i) => i !== index))}
                              disabled={disabled}
                              title="Remove property"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="equipment-creator-property-fields">
                            <div className="equipment-creator-field">
                              <label className="equipment-creator-label">Type</label>
                              <select
                                value={prop.type}
                                onChange={(e) => {
                                  const newProps = [...properties];
                                  newProps[index] = { type: e.target.value, target: '' };
                                  setProperties(newProps);
                                }}
                                className="equipment-creator-select equipment-creator-select-sm"
                                disabled={disabled}
                              >
                                <option value="">Select type...</option>
                                {EQUIPMENT_PROPERTY_TYPES.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            {prop.type && (
                              <div className="equipment-creator-field">
                                <label className="equipment-creator-label">Target</label>
                                <input
                                  type="text"
                                  value={prop.target || ''}
                                  onChange={(e) => {
                                    const newProps = [...properties];
                                    newProps[index] = { ...newProps[index], target: e.target.value };
                                    setProperties(newProps);
                                  }}
                                  placeholder={prop.type === 'stat_bonus' ? 'STR, DEX, etc.' : prop.type === 'passive_modifier' ? 'ac, speed, etc.' : 'Target'}
                                  className="equipment-creator-input equipment-creator-input-sm"
                                  disabled={disabled}
                                />
                              </div>
                            )}
                            {prop.type && prop.target && (
                              <div className="equipment-creator-field">
                                <label className="equipment-creator-label">Value</label>
                                <input
                                  type={prop.type === 'stat_bonus' || prop.type === 'passive_modifier' ? 'number' : 'text'}
                                  value={typeof prop.value === 'boolean' ? '' : (prop.value ?? '')}
                                  onChange={(e) => {
                                    const newProps = [...properties];
                                    let val: string | number | undefined;
                                    if (prop.type === 'stat_bonus' || prop.type === 'passive_modifier') {
                                      val = e.target.value ? parseFloat(e.target.value) : undefined;
                                    } else {
                                      val = e.target.value || undefined;
                                    }
                                    newProps[index] = { ...newProps[index], value: val };
                                    setProperties(newProps);
                                  }}
                                  placeholder={prop.type === 'stat_bonus' ? 'e.g., 2' : prop.type === 'damage_bonus' ? 'e.g., 1d6' : 'Value'}
                                  className="equipment-creator-input equipment-creator-input-sm"
                                  disabled={disabled}
                                />
                              </div>
                            )}
                            {prop.type && prop.target && (
                              <div className="equipment-creator-field equipment-creator-field-full">
                                <label className="equipment-creator-label">Description (optional)</label>
                                <input
                                  type="text"
                                  value={prop.description || ''}
                                  onChange={(e) => {
                                    const newProps = [...properties];
                                    newProps[index] = { ...newProps[index], description: e.target.value || undefined };
                                    setProperties(newProps);
                                  }}
                                  placeholder="e.g., +2 Strength bonus"
                                  className="equipment-creator-input equipment-creator-input-sm"
                                  disabled={disabled}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="equipment-creator-add-btn"
                      onClick={() => setProperties(prev => [...prev, { type: '', target: '' }])}
                      disabled={disabled}
                    >
                      <Plus size={14} />
                      Add Property
                    </button>
                  </div>
                )}
              </div>

              {/* Grants Features Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('grantsFeatures')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('grantsFeatures')}
                >
                  <Award size={14} aria-hidden="true" />
                  <span>Grants Features</span>
                  <span className="equipment-creator-advanced-section-count">
                    {grantsFeatures.length}
                  </span>
                  {expandedSections.has('grantsFeatures') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('grantsFeatures') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Features from the registry that are granted when this item is equipped.
                    </p>
                    <div className="equipment-creator-multiselect">
                      <div className="equipment-creator-multiselect-header">
                        <button
                          type="button"
                          className="equipment-creator-refresh-btn"
                          onClick={loadRegistryData}
                          disabled={disabled}
                          title="Refresh from registry"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <div className="equipment-creator-chips">
                        {grantsFeatures.map((featureId, index) => {
                          const feature = registryData.features.find(f => f.id === featureId);
                          return (
                            <span key={index} className="equipment-creator-chip">
                              {feature?.name || featureId}
                              <button
                                type="button"
                                className="equipment-creator-chip-remove"
                                onClick={() => setGrantsFeatures(prev => prev.filter((_, i) => i !== index))}
                                disabled={disabled}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <div className="equipment-creator-multiselect-input-row">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !grantsFeatures.includes(e.target.value)) {
                              setGrantsFeatures(prev => [...prev, e.target.value]);
                            }
                          }}
                          className="equipment-creator-select equipment-creator-select-sm"
                          disabled={disabled}
                        >
                          <option value="">Add feature...</option>
                          {registryData.features
                            .filter(f => !grantsFeatures.includes(f.id))
                            .map(f => (
                              <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                            ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Or enter custom ID..."
                          className="equipment-creator-input equipment-creator-input-sm"
                          disabled={disabled}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = (e.target as HTMLInputElement).value.trim();
                              if (value && !grantsFeatures.includes(value)) {
                                setGrantsFeatures(prev => [...prev, value]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grants Skills Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('grantsSkills')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('grantsSkills')}
                >
                  <BookOpen size={14} aria-hidden="true" />
                  <span>Grants Skills</span>
                  <span className="equipment-creator-advanced-section-count">
                    {grantsSkills.length}
                  </span>
                  {expandedSections.has('grantsSkills') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('grantsSkills') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Skill proficiencies granted when this item is equipped.
                    </p>
                    <div className="equipment-creator-skills-list">
                      {grantsSkills.map((skill, index) => {
                        const skillData = registryData.skills.find(s => s.id === skill.skillId);
                        return (
                          <div key={index} className="equipment-creator-skill-item">
                            <span className="equipment-creator-skill-name">
                              {skillData?.name || skill.skillId}
                            </span>
                            <select
                              value={skill.level}
                              onChange={(e) => {
                                const newSkills = [...grantsSkills];
                                newSkills[index] = { ...newSkills[index], level: e.target.value as 'proficient' | 'expertise' };
                                setGrantsSkills(newSkills);
                              }}
                              className="equipment-creator-select equipment-creator-select-xs"
                              disabled={disabled}
                            >
                              <option value="proficient">Proficient</option>
                              <option value="expertise">Expertise</option>
                            </select>
                            <button
                              type="button"
                              className="equipment-creator-skill-remove"
                              onClick={() => setGrantsSkills(prev => prev.filter((_, i) => i !== index))}
                              disabled={disabled}
                              title="Remove skill"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="equipment-creator-multiselect-input-row">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !grantsSkills.some(s => s.skillId === e.target.value)) {
                            setGrantsSkills(prev => [...prev, { skillId: e.target.value, level: 'proficient' }]);
                          }
                        }}
                        className="equipment-creator-select equipment-creator-select-sm"
                        disabled={disabled}
                      >
                        <option value="">Add skill...</option>
                        {registryData.skills
                          .filter(s => !grantsSkills.some(gs => gs.skillId === s.id))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Grants Spells Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('grantsSpells')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('grantsSpells')}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Grants Spells</span>
                  <span className="equipment-creator-advanced-section-count">
                    {grantsSpells.length}
                  </span>
                  {expandedSections.has('grantsSpells') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('grantsSpells') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Spells granted when this item is equipped, with uses and recharge options.
                    </p>
                    <div className="equipment-creator-spells-list">
                      {grantsSpells.map((spell, index) => {
                        const spellData = registryData.spells.find(s => s.id === spell.spellId);
                        return (
                          <div key={index} className="equipment-creator-spell-item">
                            <div className="equipment-creator-spell-header">
                              <span className="equipment-creator-spell-name">
                                {spellData?.name || spell.spellId}
                              </span>
                              <button
                                type="button"
                                className="equipment-creator-spell-remove"
                                onClick={() => setGrantsSpells(prev => prev.filter((_, i) => i !== index))}
                                disabled={disabled}
                                title="Remove spell"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <div className="equipment-creator-spell-options">
                              <div className="equipment-creator-field">
                                <label className="equipment-creator-label equipment-creator-label-xs">Uses</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={spell.uses ?? ''}
                                  onChange={(e) => {
                                    const newSpells = [...grantsSpells];
                                    newSpells[index] = { ...newSpells[index], uses: e.target.value ? parseInt(e.target.value) : undefined };
                                    setGrantsSpells(newSpells);
                                  }}
                                  placeholder="∞"
                                  className="equipment-creator-input equipment-creator-input-xs"
                                  disabled={disabled}
                                />
                              </div>
                              <div className="equipment-creator-field">
                                <label className="equipment-creator-label equipment-creator-label-xs">Recharge</label>
                                <select
                                  value={spell.recharge || ''}
                                  onChange={(e) => {
                                    const newSpells = [...grantsSpells];
                                    newSpells[index] = { ...newSpells[index], recharge: e.target.value || undefined };
                                    setGrantsSpells(newSpells);
                                  }}
                                  className="equipment-creator-select equipment-creator-select-xs"
                                  disabled={disabled}
                                >
                                  <option value="">None</option>
                                  <option value="short_rest">Short Rest</option>
                                  <option value="long_rest">Long Rest</option>
                                  <option value="dawn">Dawn</option>
                                  <option value="daily">Daily</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="equipment-creator-multiselect-input-row">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !grantsSpells.some(s => s.spellId === e.target.value)) {
                            setGrantsSpells(prev => [...prev, { spellId: e.target.value }]);
                          }
                        }}
                        className="equipment-creator-select equipment-creator-select-sm"
                        disabled={disabled}
                      >
                        <option value="">Add spell...</option>
                        {registryData.spells
                          .filter(s => !grantsSpells.some(gs => gs.spellId === s.id))
                          .sort((a, b) => a.level - b.level)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Level {s.level})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('tags')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('tags')}
                >
                  <Tag size={14} aria-hidden="true" />
                  <span>Tags</span>
                  <span className="equipment-creator-advanced-section-count">
                    {tags.length}
                  </span>
                  {expandedSections.has('tags') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('tags') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Tags for categorization, search, and filtering.
                    </p>
                    <div className="equipment-creator-chips">
                      {tags.map((tag, index) => (
                        <span key={index} className="equipment-creator-chip">
                          {tag}
                          <button
                            type="button"
                            className="equipment-creator-chip-remove"
                            onClick={() => setTags(prev => prev.filter((_, i) => i !== index))}
                            disabled={disabled}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="equipment-creator-multiselect-input-row">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value && !tags.includes(e.target.value)) {
                            setTags(prev => [...prev, e.target.value]);
                          }
                        }}
                        className="equipment-creator-select equipment-creator-select-sm"
                        disabled={disabled}
                      >
                        <option value="">Add tag...</option>
                        {TAG_SUGGESTIONS.filter(t => !tags.includes(t)).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or custom tag..."
                        className="equipment-creator-input equipment-creator-input-sm"
                        disabled={disabled}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const value = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/\s+/g, '_');
                            if (value && !tags.includes(value)) {
                              setTags(prev => [...prev, value]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Spawn Weight Section */}
              <div className="equipment-creator-advanced-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('spawnWeight')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('spawnWeight')}
                >
                  <Weight size={14} aria-hidden="true" />
                  <span>Spawn Weight</span>
                  <span className="equipment-creator-advanced-section-count">
                    {spawnWeight}
                  </span>
                  {expandedSections.has('spawnWeight') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('spawnWeight') && (
                  <div className="equipment-creator-advanced-section-content">
                    <p className="equipment-creator-advanced-section-hint">
                      Weight for random loot generation. Higher values = more common in random loot.
                    </p>
                    <div className="equipment-creator-spawnweight-row">
                      <div className="equipment-creator-field">
                        <label className="equipment-creator-label">Spawn Weight</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={spawnWeight}
                          onChange={(e) => setSpawnWeight(parseFloat(e.target.value) || 0)}
                          className="equipment-creator-input equipment-creator-input-sm"
                          disabled={disabled}
                        />
                      </div>
                      <div className="equipment-creator-spawnweight-info">
                        <span className="equipment-creator-spawnweight-label">
                          {spawnWeight === 0 ? (
                            <><X size={12} /> Never spawns randomly (game-only)</>
                          ) : spawnWeight < 0.5 ? (
                            <>Very rare spawn (like legendary items)</>
                          ) : spawnWeight < 1 ? (
                            <>Rare spawn (like very_rare items)</>
                          ) : spawnWeight === 1 ? (
                            <>Normal spawn (like common items)</>
                          ) : (
                            <>Common spawn (higher than normal)</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Documentation Reference (collapsed by default) */}
              <div className="equipment-creator-advanced-section equipment-creator-docs-section">
                <button
                  type="button"
                  className="equipment-creator-advanced-section-toggle"
                  onClick={() => toggleSection('docs')}
                  disabled={disabled}
                  aria-expanded={expandedSections.has('docs')}
                >
                  <Info size={14} aria-hidden="true" />
                  <span>API Documentation</span>
                  {expandedSections.has('docs') ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedSections.has('docs') && (
                  <div className="equipment-creator-advanced-section-content">
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
            {previewItem.type === 'box' && boxContents && (
              <div className="equipment-creator-preview-stat">
                <span className="equipment-creator-preview-stat-label">Box Contents:</span>
                <span>{boxContents.drops.length} {boxContents.drops.length === 1 ? 'drop' : 'drops'}</span>
                {boxContents.openRequirements && boxContents.openRequirements.length > 0 && (
                  <span className="equipment-creator-preview-box-req">
                    (requires key item)
                  </span>
                )}
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
                    {/* Advanced Properties */}
                    {properties.length > 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        properties: {properties.length}
                      </span>
                    )}
                    {grantsFeatures.length > 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        grantsFeatures: {grantsFeatures.length}
                      </span>
                    )}
                    {grantsSkills.length > 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        grantsSkills: {grantsSkills.length}
                      </span>
                    )}
                    {grantsSpells.length > 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        grantsSpells: {grantsSpells.length}
                      </span>
                    )}
                    {tags.length > 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        tags: {tags.length}
                      </span>
                    )}
                    {spawnWeight !== 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-user">
                        spawnWeight: {spawnWeight}
                      </span>
                    )}
                  </div>
                </div>

                {/* Advanced Properties Detail */}
                {properties.length > 0 && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Equipment Properties
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      {properties.filter(p => p.type && p.target).map((prop, idx) => (
                        <span key={idx} className="equipment-creator-preview-tag equipment-creator-preview-tag-advanced">
                          {prop.type}: {prop.target}{prop.value !== undefined ? ` = ${prop.value}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Granted Features */}
                {grantsFeatures.length > 0 && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Grants Features
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      {grantsFeatures.map((featureId, idx) => {
                        const feature = registryData.features.find(f => f.id === featureId);
                        return (
                          <span key={idx} className="equipment-creator-preview-tag equipment-creator-preview-tag-advanced">
                            {feature?.name || featureId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Granted Skills */}
                {grantsSkills.length > 0 && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Grants Skills
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      {grantsSkills.map((skill, idx) => {
                        const skillData = registryData.skills.find(s => s.id === skill.skillId);
                        return (
                          <span key={idx} className="equipment-creator-preview-tag equipment-creator-preview-tag-advanced">
                            {skillData?.name || skill.skillId} ({skill.level})
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Granted Spells */}
                {grantsSpells.length > 0 && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Grants Spells
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      {grantsSpells.map((spell, idx) => {
                        const spellData = registryData.spells.find(s => s.id === spell.spellId);
                        return (
                          <span key={idx} className="equipment-creator-preview-tag equipment-creator-preview-tag-advanced">
                            {spellData?.name || spell.spellId}
                            {spell.uses && ` (${spell.uses} uses`}
                            {spell.recharge && ` / ${spell.recharge}`}
                            {spell.uses && ')'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="equipment-creator-preview-property-group">
                    <span className="equipment-creator-preview-property-group-label">
                      Tags
                    </span>
                    <div className="equipment-creator-preview-property-tags">
                      {tags.map((tag, idx) => (
                        <span key={idx} className="equipment-creator-preview-tag equipment-creator-preview-tag-advanced">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
                    {spawnWeight === 0 && (
                      <span className="equipment-creator-preview-tag equipment-creator-preview-tag-default">
                        spawnWeight: 0
                      </span>
                    )}
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
