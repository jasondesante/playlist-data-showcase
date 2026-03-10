/**
 * SpawnModeControls Component
 *
 * Controls for managing spawn modes and weights for ExtensionManager categories.
 * Part of DataViewerTab Custom Content Creation Upgrade - Phase 1.4.
 *
 * Features:
 * - Mode selector buttons (Relative/Absolute/Default/Replace)
 * - Current mode indicator badge
 * - Reset button for current category
 * - Reset All button
 * - Weight editor (expandable advanced section with grouped items)
 * - Import/Export buttons for custom content
 *
 * @see docs/plans/DATAVIEWER_CUSTOM_CONTENT_PLAN.md for implementation details
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Weight,
  AlertTriangle,
  CheckCircle,
  Info,
  ImagePlus,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSpawnMode, type SpawnMode, type SpawnCategory } from '@/hooks/useSpawnMode';
import { ExtensionManager, SpellQuery, SkillQuery, FeatureQuery } from 'playlist-data-engine';
import { logger } from '@/utils/logger';
import { showToast } from '@/components/ui/Toast';
import { isValidUrlPrefix } from '@/components/shared/ImageFieldInput';
import { useDataViewerStore } from '@/store/dataViewerStore';
import { saveBatchImageUpdates, type BatchImageCategory } from '@/utils/batchImagePersistence';
import './SpawnModeControls.css';

/**
 * Mode configuration for display
 */
const MODE_CONFIG: Record<SpawnMode, { label: string; description: string; color: string }> = {
  relative: {
    label: 'Relative',
    description: 'Custom items added to default pool with weights',
    color: 'var(--cute-green)'
  },
  absolute: {
    label: 'Absolute',
    description: 'Only custom items can spawn',
    color: 'var(--cute-orange)'
  },
  default: {
    label: 'Default',
    description: 'All items have equal weight (1.0)',
    color: 'var(--cute-teal)'
  },
  replace: {
    label: 'Replace',
    description: 'Clear previous custom data before registering',
    color: 'var(--destructive)'
  }
};

/**
 * Categories that support batch image operations
 */
type BatchImageCategory = 'spells' | 'equipment' | 'races.data' | 'classes.data' | 'classFeatures' | 'racialTraits' | 'skills';

/**
 * Batch operation mode
 */
type BatchOperationMode = 'predicate' | 'property';

/**
 * Property configuration for batchByCategory
 */
interface PropertyConfig {
  key: string;
  label: string;
  values: { value: string; label: string }[];
}

/**
 * Category configuration for batch image operations
 */
const BATCH_IMAGE_CATEGORIES: { value: BatchImageCategory; label: string; hasProperties: boolean }[] = [
  { value: 'spells', label: 'Spells', hasProperties: true },
  { value: 'equipment', label: 'Equipment', hasProperties: true },
  { value: 'races.data', label: 'Races', hasProperties: false },
  { value: 'classes.data', label: 'Classes', hasProperties: false },
  { value: 'classFeatures', label: 'Class Features', hasProperties: false },
  { value: 'racialTraits', label: 'Racial Traits', hasProperties: false },
  { value: 'skills', label: 'Skills', hasProperties: false }
];

/**
 * Properties available for batchByCategory per category
 */
const CATEGORY_PROPERTIES: Record<BatchImageCategory, PropertyConfig[]> = {
  'spells': [
    {
      key: 'school',
      label: 'School',
      values: [
        { value: 'Abjuration', label: 'Abjuration' },
        { value: 'Conjuration', label: 'Conjuration' },
        { value: 'Divination', label: 'Divination' },
        { value: 'Enchantment', label: 'Enchantment' },
        { value: 'Evocation', label: 'Evocation' },
        { value: 'Illusion', label: 'Illusion' },
        { value: 'Necromancy', label: 'Necromancy' },
        { value: 'Transmutation', label: 'Transmutation' }
      ]
    },
    {
      key: 'level',
      label: 'Level',
      values: [
        { value: '0', label: 'Cantrip (0)' },
        { value: '1', label: '1st Level' },
        { value: '2', label: '2nd Level' },
        { value: '3', label: '3rd Level' },
        { value: '4', label: '4th Level' },
        { value: '5', label: '5th Level' },
        { value: '6', label: '6th Level' },
        { value: '7', label: '7th Level' },
        { value: '8', label: '8th Level' },
        { value: '9', label: '9th Level' }
      ]
    }
  ],
  'equipment': [
    {
      key: 'rarity',
      label: 'Rarity',
      values: [
        { value: 'common', label: 'Common' },
        { value: 'uncommon', label: 'Uncommon' },
        { value: 'rare', label: 'Rare' },
        { value: 'very_rare', label: 'Very Rare' },
        { value: 'legendary', label: 'Legendary' }
      ]
    },
    {
      key: 'type',
      label: 'Type',
      values: [
        { value: 'weapon', label: 'Weapon' },
        { value: 'armor', label: 'Armor' },
        { value: 'shield', label: 'Shield' },
        { value: 'item', label: 'Item' },
        { value: 'consumable', label: 'Consumable' }
      ]
    }
  ],
  'races.data': [],
  'classes.data': [],
  'classFeatures': [],
  'racialTraits': [],
  'skills': []
};

// ========================================
// WEIGHT EDITOR TYPES & HELPERS
// ========================================

/**
 * Item info for weight editor display
 */
interface WeightItemInfo {
  /** Unique identifier (key in weights map) */
  id: string;
  /** Display name for the item */
  displayName: string;
  /** Grouping key for organizing items */
  group: string;
  /** Group display label */
  groupLabel: string;
  /** Current weight value */
  weight: number;
}

/**
 * Grouped items for display
 */
interface GroupedItems {
  groupKey: string;
  groupLabel: string;
  items: WeightItemInfo[];
}

/**
 * Category grouping configuration
 */
interface CategoryGroupingConfig {
  /** Property to group by */
  groupBy: string;
  /** Function to extract group key from item */
  getGroupKey: (item: any) => string;
  /** Function to format group label */
  formatGroupLabel?: (key: string) => string;
  /** Function to get display name from item */
  getDisplayName: (item: any) => string;
  /** Function to get identifier key (matches weight key) */
  getIdentifierKey: (item: any) => string;
}

/**
 * Grouping configurations per category
 */
const CATEGORY_GROUPING_CONFIGS: Partial<Record<SpawnCategory, CategoryGroupingConfig>> = {
  'spells': {
    groupBy: 'school',
    getGroupKey: (item) => item.school || 'Unknown',
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || item.id || 'Unknown',
    getIdentifierKey: (item) => item.name || item.id
  },
  'equipment': {
    groupBy: 'type',
    getGroupKey: (item) => {
      const type = item.type || 'item';
      // Capitalize and format type
      return type.charAt(0).toUpperCase() + type.slice(1);
    },
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || 'Unknown',
    getIdentifierKey: (item) => item.name
  },
  'classFeatures': {
    groupBy: 'class',
    getGroupKey: (item) => item.class || 'Unknown',
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || item.id || 'Unknown',
    // Weight keys use item.name, so we must match by name
    getIdentifierKey: (item) => item.name || item.id
  },
  'racialTraits': {
    groupBy: 'race',
    getGroupKey: (item) => item.race || 'Unknown',
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || item.id || 'Unknown',
    // Weight keys use item.name, so we must match by name
    getIdentifierKey: (item) => item.name || item.id
  },
  'skills': {
    groupBy: 'ability',
    getGroupKey: (item) => item.ability || 'Unknown',
    formatGroupLabel: (key) => key ? key.toUpperCase() : 'Unknown',
    getDisplayName: (item) => item.name || item.id || 'Unknown',
    getIdentifierKey: (item) => item.id || item.name
  },
  'races.data': {
    groupBy: 'name',
    getGroupKey: () => 'Races',
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || 'Unknown',
    getIdentifierKey: (item) => item.name
  },
  'classes.data': {
    groupBy: 'name',
    getGroupKey: () => 'Classes',
    formatGroupLabel: (key) => key,
    getDisplayName: (item) => item.name || 'Unknown',
    getIdentifierKey: (item) => item.name
  }
};

/**
 * Map to SpawnCategory from similar keys
 */
function normalizeCategory(category: SpawnCategory): SpawnCategory | null {
  // Direct mapping for known categories
  if (CATEGORY_GROUPING_CONFIGS[category]) {
    return category;
  }
  // Handle subcategory patterns like 'spells.Wizard', 'classFeatures.Barbarian'
  if (category.startsWith('spells.')) return 'spells';
  if (category.startsWith('classFeatures.')) return 'classFeatures';
  if (category.startsWith('racialTraits.')) return 'racialTraits';
  if (category.startsWith('skills.')) return 'skills';
  return null;
}

/**
 * Props for SpawnModeControls component
 */
export interface SpawnModeControlsProps {
  /** The category to control spawn modes for */
  category: SpawnCategory;
  /** Label to display for the category */
  categoryLabel?: string;
  /** Whether to show the weight editor */
  showWeightEditor?: boolean;
  /** Whether to show import/export buttons */
  showImportExport?: boolean;
  /** Callback when mode changes */
  onModeChange?: (category: SpawnCategory, mode: SpawnMode) => void;
  /** Callback when category is reset */
  onResetCategory?: (category: SpawnCategory) => void;
  /** Callback when all categories are reset */
  onResetAll?: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Component for managing spawn modes and weights for ExtensionManager categories.
 */
export function SpawnModeControls({
  category,
  categoryLabel,
  showWeightEditor = true,
  showImportExport = true,
  onModeChange,
  onResetCategory,
  onResetAll,
  className = ''
}: SpawnModeControlsProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch Image Tools state
  const [isBatchImageOpen, setIsBatchImageOpen] = useState(false);
  const [batchCategory, setBatchCategory] = useState<BatchImageCategory>('spells');
  const [batchMode, setBatchMode] = useState<BatchOperationMode>('predicate');
  const [batchProperty, setBatchProperty] = useState<string>('school');
  const [batchIconUrl, setBatchIconUrl] = useState('');
  const [batchImageUrl, setBatchImageUrl] = useState('');
  const [batchPropertyValueMap, setBatchPropertyValueMap] = useState<Record<string, { icon?: string; image?: string }>>({});
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);

  // Auto-dismiss success and feedback messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMessage]);

  const {
    getMode,
    setMode,
    getWeights,
    setWeight,
    setWeights,
    resetCategory,
    resetAll,
    hasCustomData,
    getCategoryInfo
  } = useSpawnMode();

  // Get current mode (default to 'relative' if not set)
  const currentMode = getMode(category) || 'relative';
  const modeConfig = MODE_CONFIG[currentMode];

  // Get category info
  const categoryInfo = useMemo(() => getCategoryInfo(category), [getCategoryInfo, category]);
  const hasCustom = hasCustomData(category);
  const weights = getWeights(category);

  // ========================================
  // WEIGHT EDITOR - GROUPED ITEMS
  // ========================================

  // State for collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Build grouped items for weight editor
  // Shows ALL items from registry, with weights applied where they exist (default 1.0)
  const groupedWeightItems = useMemo((): GroupedItems[] => {
    const normalizedCategory = normalizeCategory(category);
    const config = normalizedCategory ? CATEGORY_GROUPING_CONFIGS[normalizedCategory] : null;

    // Fetch ALL items from registry (default + custom)
    let registryItems: any[] = [];
    try {
      const manager = ExtensionManager.getInstance();
      // Map SpawnCategory to ExtensionManager category
      const managerCategory = normalizedCategory || category;
      registryItems = manager.get(managerCategory as any) || [];
    } catch (e) {
      logger.warn('SpawnMode', 'Failed to fetch registry items for weight editor', { error: String(e) });
    }

    if (registryItems.length === 0) return [];

    // Build weight item infos from ALL registry items
    const itemInfos: WeightItemInfo[] = registryItems.map((item) => {
      if (config) {
        const key = config.getIdentifierKey(item);
        const displayName = config.getDisplayName(item);
        const groupKey = config.getGroupKey(item);
        const groupLabel = config.formatGroupLabel ? config.formatGroupLabel(groupKey) : groupKey;
        // Use weight from weights if it exists, otherwise default to 1.0
        const weight = weights[key] ?? 1.0;

        return {
          id: key,
          displayName,
          group: groupKey,
          groupLabel,
          weight
        };
      } else {
        // Fallback: use name property or item itself
        const key = item.name || String(item);
        const weight = weights[key] ?? 1.0;
        return {
          id: key,
          displayName: key,
          group: 'Items',
          groupLabel: 'Items',
          weight
        };
      }
    });

    // Group items by group key
    const groupMap = new Map<string, WeightItemInfo[]>();
    for (const info of itemInfos) {
      const existing = groupMap.get(info.group) || [];
      existing.push(info);
      groupMap.set(info.group, existing);
    }

    // Convert to sorted array of GroupedItems
    const groups: GroupedItems[] = [];
    for (const [groupKey, items] of groupMap.entries()) {
      // Sort items within group alphabetically by display name
      items.sort((a, b) => a.displayName.localeCompare(b.displayName));

      // Find group label from first item
      const groupLabel = items[0]?.groupLabel || groupKey;

      groups.push({
        groupKey,
        groupLabel,
        items
      });
    }

    // Sort groups alphabetically by label
    groups.sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));

    return groups;
  }, [category, weights]);

  // Toggle group collapse
  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // Expand all groups
  const expandAllGroups = useCallback(() => {
    setCollapsedGroups(new Set());
  }, []);

  // Collapse all groups
  const collapseAllGroups = useCallback(() => {
    setCollapsedGroups(new Set(groupedWeightItems.map(g => g.groupKey)));
  }, [groupedWeightItems]);

  // Handle mode change
  const handleModeChange = useCallback((newMode: SpawnMode) => {
    setMode(category, newMode);
    onModeChange?.(category, newMode);
  }, [category, setMode, onModeChange]);

  // Handle reset category
  const handleResetCategory = useCallback(() => {
    if (window.confirm(`Reset all custom data for "${categoryLabel || category}"? This cannot be undone.`)) {
      resetCategory(category);
      onResetCategory?.(category);
      showToast(`Reset ${categoryLabel || category} to defaults`, 'success');
    }
  }, [category, categoryLabel, resetCategory, onResetCategory]);

  // Handle reset all
  const handleResetAll = useCallback(() => {
    if (window.confirm('Reset ALL custom data across ALL categories? This cannot be undone.')) {
      resetAll();
      onResetAll?.();
      showToast('Reset all categories to defaults', 'success');
    }
  }, [resetAll, onResetAll]);

  // Handle weight change
  const handleWeightChange = useCallback((itemName: string, value: number) => {
    const clampedValue = Math.max(0, Math.min(10, value));
    setWeight(category, itemName, clampedValue);
  }, [category, setWeight]);

  // ========================================
  // BATCH IMAGE TOOLS HANDLERS
  // ========================================

  // Get available properties for selected category
  const availableProperties = useMemo(() => {
    return CATEGORY_PROPERTIES[batchCategory] || [];
  }, [batchCategory]);

  // Get property values for selected property
  const propertyValues = useMemo(() => {
    const propConfig = availableProperties.find(p => p.key === batchProperty);
    return propConfig?.values || [];
  }, [availableProperties, batchProperty]);

  // Get count of affected items for preview
  const updateAffectedCount = useCallback(() => {
    try {
      const manager = ExtensionManager.getInstance();
      const items = manager.get(batchCategory as any);

      if (!items || items.length === 0) {
        setAffectedCount(0);
        return;
      }

      if (batchMode === 'predicate') {
        // For predicate mode, all items in category will be affected
        setAffectedCount(items.length);
      } else {
        // For property mode, count items matching the selected property values
        let count = 0;
        for (const propValue of Object.keys(batchPropertyValueMap)) {
          const matchingItems = items.filter((item: any) => String(item[batchProperty]) === propValue);
          count += matchingItems.length;
        }
        setAffectedCount(count);
      }
    } catch (error) {
      logger.warn('DataViewer', 'Failed to get affected count', { error: String(error) });
      setAffectedCount(null);
    }
  }, [batchCategory, batchMode, batchProperty, batchPropertyValueMap]);

  // Update affected count when batch settings change
  useEffect(() => {
    updateAffectedCount();
  }, [updateAffectedCount]);

  // Reset property value map when category or property changes
  useEffect(() => {
    setBatchPropertyValueMap({});
    if (availableProperties.length > 0) {
      setBatchProperty(availableProperties[0].key);
    }
  }, [batchCategory, availableProperties]);

  // Handle property value map change
  const handlePropertyValueMapChange = useCallback((propValue: string, field: 'icon' | 'image', url: string) => {
    setBatchPropertyValueMap(prev => ({
      ...prev,
      [propValue]: {
        ...prev[propValue],
        [field]: url
      }
    }));
  }, []);

  // Validate batch URLs
  const validateBatchUrls = useCallback((): string | null => {
    if (batchMode === 'predicate') {
      if (batchIconUrl && !isValidUrlPrefix(batchIconUrl)) {
        return `Invalid icon URL. Must start with: http://, https://, /, or assets/`;
      }
      if (batchImageUrl && !isValidUrlPrefix(batchImageUrl)) {
        return `Invalid image URL. Must start with: http://, https://, /, or assets/`;
      }
    } else {
      // Property mode - validate all entered URLs
      for (const [propValue, urls] of Object.entries(batchPropertyValueMap)) {
        if (urls.icon && !isValidUrlPrefix(urls.icon)) {
          return `Invalid icon URL for "${propValue}". Must start with: http://, https://, /, or assets/`;
        }
        if (urls.image && !isValidUrlPrefix(urls.image)) {
          return `Invalid image URL for "${propValue}". Must start with: http://, https://, /, or assets/`;
        }
      }
    }
    return null;
  }, [batchMode, batchIconUrl, batchImageUrl, batchPropertyValueMap]);

  // Handle batch image apply
  const handleBatchApply = useCallback(async () => {
    // Validate URLs
    const validationError = validateBatchUrls();
    if (validationError) {
      setBatchError(validationError);
      showToast(validationError, 'error');
      return;
    }

    // Check if we have something to apply
    const hasIcon = batchMode === 'predicate' ? batchIconUrl.trim() : Object.values(batchPropertyValueMap).some(v => v.icon?.trim());
    const hasImage = batchMode === 'predicate' ? batchImageUrl.trim() : Object.values(batchPropertyValueMap).some(v => v.image?.trim());
    if (!hasIcon && !hasImage) {
      setBatchError('Please enter at least one icon or image URL');
      showToast('Please enter at least one icon or image URL', 'error');
      return;
    }

    // Confirm action
    const actionDescription = batchMode === 'predicate'
      ? `Apply images to ALL items in "${batchCategory}"?`
      : `Apply images to items in "${batchCategory}" by "${batchProperty}"?`;

    if (!window.confirm(`${actionDescription}\n\nAffected items: ${affectedCount ?? 'unknown'}`)) {
      return;
    }

    setIsBatchApplying(true);
    setBatchError(null);

    try {
      const manager = ExtensionManager.getInstance();
      let updatedCount = 0;

      if (batchMode === 'predicate') {
        // Use batchUpdateImages for predicate mode
        const updates: { icon?: string; image?: string } = {};
        if (batchIconUrl.trim()) updates.icon = batchIconUrl.trim();
        if (batchImageUrl.trim()) updates.image = batchImageUrl.trim();

        updatedCount = manager.batchUpdateImages(
          batchCategory as any,
          () => true, // Match all items
          updates
        );
      } else {
        // Use batchByCategory for property mode
        const valueMap: Record<string, string | { icon?: string; image?: string }> = {};

        for (const [propValue, urls] of Object.entries(batchPropertyValueMap)) {
          if (urls.icon?.trim() || urls.image?.trim()) {
            if (urls.icon?.trim() && urls.image?.trim()) {
              valueMap[propValue] = { icon: urls.icon.trim(), image: urls.image.trim() };
            } else if (urls.icon?.trim()) {
              valueMap[propValue] = urls.icon.trim();
            } else if (urls.image?.trim()) {
              valueMap[propValue] = { image: urls.image.trim() };
            }
          }
        }

        if (Object.keys(valueMap).length > 0) {
          updatedCount = manager.batchByCategory(batchCategory as any, batchProperty, valueMap);
        }
      }

      setSuccessMessage(`Successfully updated images for ${updatedCount} items.`);
      showToast(`Updated images for ${updatedCount} items in ${batchCategory}`, 'success');
      logger.info('DataViewer', `Batch image update: ${updatedCount} items in ${batchCategory}`);

      // Save batch image updates to localStorage for persistence across page reloads
      try {
        const updatedItems = manager.get(batchCategory as any);
        const itemsWithImages = updatedItems
          .filter((item: any) => item.icon || item.image)
          .map((item: any) => ({
            name: item.name || item.id,
            icon: item.icon,
            image: item.image
          }));
        saveBatchImageUpdates(batchCategory as BatchImageCategory, itemsWithImages);
      } catch (saveError) {
        logger.warn('DataViewer', 'Failed to save batch image updates to localStorage', { error: String(saveError) });
      }

      // Invalidate query caches to pick up the updated image data
      SpellQuery.getInstance().invalidateCache();
      SkillQuery.getInstance().invalidateCache();
      FeatureQuery.getInstance().invalidateCache();

      // Trigger UI refresh to show updated images
      useDataViewerStore.getState().notifyDataChanged();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply batch images.';
      setBatchError(errorMessage);
      showToast(`Batch image failed: ${errorMessage}`, 'error');
      logger.error('DataViewer', 'Batch image update failed', error);
    } finally {
      setIsBatchApplying(false);
    }
  }, [batchCategory, batchMode, batchProperty, batchIconUrl, batchImageUrl, batchPropertyValueMap, affectedCount, validateBatchUrls]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setImportError(null);
    setFeedbackMessage(null);
    setSuccessMessage(null);
    try {
      const manager = ExtensionManager.getInstance();
      const customItems = manager.getCustom(category as any);

      if (!customItems || customItems.length === 0) {
        setFeedbackMessage('No custom items to export for this category.');
        showToast('No custom items to export', 'info');
        return;
      }

      const exportData = {
        category,
        mode: currentMode,
        weights,
        items: customItems,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.replace(/\./g, '_')}_custom_content.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${customItems.length} items successfully.`);
      showToast(`Exported ${customItems.length} items from ${categoryLabel || category}`, 'success');
      logger.info('DataViewer', `Exported ${customItems.length} items from ${category}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export custom content.';
      setImportError(errorMessage);
      showToast(`Export failed: ${errorMessage}`, 'error');
      logger.error('DataViewer', 'Export failed', error);
    } finally {
      setIsExporting(false);
    }
  }, [category, currentMode, weights]);

  // Handle export all
  const handleExportAll = useCallback(async () => {
    setIsExporting(true);
    setImportError(null);
    setFeedbackMessage(null);
    setSuccessMessage(null);
    try {
      const manager = ExtensionManager.getInstance();
      const registeredCategories = manager.getRegisteredCategories();

      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        categories: {}
      };

      let totalItems = 0;
      for (const cat of registeredCategories) {
        const customItems = manager.getCustom(cat as any);
        if (customItems && customItems.length > 0) {
          (exportData.categories as Record<string, unknown>)[cat] = {
            mode: getMode(cat as SpawnCategory),
            weights: getWeights(cat as SpawnCategory),
            items: customItems
          };
          totalItems += customItems.length;
        }
      }

      if (totalItems === 0) {
        setFeedbackMessage('No custom items found across any category.');
        showToast('No custom items to export', 'info');
        return;
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_custom_content.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Exported ${totalItems} items from all categories successfully.`);
      showToast(`Exported ${totalItems} items from all categories`, 'success');
      logger.info('DataViewer', 'Exported all custom content');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export custom content.';
      setImportError(errorMessage);
      logger.error('DataViewer', 'Export all failed', error);
    } finally {
      setIsExporting(false);
    }
  }, [getMode, getWeights]);

  // Handle import file selection
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle import
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.category || !Array.isArray(data.items)) {
        throw new Error('Invalid import file format. Expected { category, items }');
      }

      // Check if category matches (warn if not)
      if (data.category !== category) {
        const proceed = window.confirm(
          `Import file is for category "${data.category}" but you're viewing "${category}". Import anyway?`
        );
        if (!proceed) {
          setIsImporting(false);
          return;
        }
      }

      // Import items
      const manager = ExtensionManager.getInstance();
      const importCategory = data.category as SpawnCategory;

      // Set mode if provided
      if (data.mode) {
        setMode(importCategory, data.mode);
      }

      // Set weights if provided
      if (data.weights) {
        setWeights(importCategory, data.weights);
      }

      // Register items
      manager.register(importCategory as any, data.items, { validate: true });

      setSuccessMessage(`Successfully imported ${data.items.length} items to ${importCategory}.`);
      showToast(`Imported ${data.items.length} items to ${importCategory}`, 'success');
      logger.info('DataViewer', `Imported ${data.items.length} items to ${importCategory}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImportError(errorMessage);
      showToast(`Import failed: ${errorMessage}`, 'error');
      logger.error('DataViewer', 'Import failed', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [category, setMode, setWeights]);

  // Get total item count from grouped items
  const totalItemCount = useMemo(() => {
    return groupedWeightItems.reduce((sum, group) => sum + group.items.length, 0);
  }, [groupedWeightItems]);

  return (
    <div className={`spawn-mode-controls ${className}`}>
      {/* Mode Selector Section */}
      <div className="spawn-mode-section">
        <div className="spawn-mode-header">
          <div className="spawn-mode-title">
            <Settings size={16} />
            <span>Spawn Mode</span>
          </div>
          {hasCustom && (
            <span className="spawn-mode-custom-badge" aria-label={`${categoryInfo.customCount} custom items`}>
              {categoryInfo.customCount} custom
            </span>
          )}
        </div>

        {/* Mode Buttons */}
        <div className="spawn-mode-buttons" role="group" aria-label="Spawn mode selection">
          {(Object.keys(MODE_CONFIG) as SpawnMode[]).map((mode) => {
            const config = MODE_CONFIG[mode];
            const isActive = currentMode === mode;

            return (
              <button
                key={mode}
                type="button"
                className={`spawn-mode-btn ${isActive ? 'spawn-mode-btn-active' : ''}`}
                onClick={() => handleModeChange(mode)}
                title={config.description}
                aria-pressed={isActive}
                aria-label={`${config.label} mode: ${config.description}`}
              >
                <span
                  className="spawn-mode-btn-indicator"
                  style={{ backgroundColor: config.color }}
                  aria-hidden="true"
                />
                <span className="spawn-mode-btn-label">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current Mode Description */}
        <div className="spawn-mode-description" role="status" aria-live="polite">
          <span
            className="spawn-mode-description-indicator"
            style={{ backgroundColor: modeConfig.color }}
            aria-hidden="true"
          />
          <span>{modeConfig.description}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="spawn-mode-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetCategory}
          disabled={!hasCustom}
          leftIcon={RotateCcw}
        >
          Reset Category
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetAll}
          leftIcon={AlertTriangle}
        >
          Reset All
        </Button>
      </div>

      {/* Advanced Section - Weight Editor */}
      {showWeightEditor && groupedWeightItems.length > 0 && (
        <div className="spawn-mode-advanced">
          <button
            type="button"
            className="spawn-mode-advanced-toggle"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            aria-expanded={isAdvancedOpen}
            aria-controls="spawn-mode-weight-editor-panel"
          >
            <Weight size={14} aria-hidden="true" />
            <span>Weight Editor</span>
            <span className="spawn-mode-weight-count">
              {totalItemCount} items
            </span>
            {isAdvancedOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>

          {isAdvancedOpen && (
            <div className="spawn-mode-weight-editor" id="spawn-mode-weight-editor-panel">
              <div className="spawn-mode-weight-header">
                <p className="spawn-mode-weight-help" id="spawn-mode-weight-help-text">
                  Adjust spawn weights (0 = never, 1.0 = default, higher = more common)
                </p>
                <div className="spawn-mode-weight-actions">
                  <button
                    type="button"
                    className="spawn-mode-weight-action-btn"
                    onClick={expandAllGroups}
                    title="Expand all groups"
                  >
                    Expand All
                  </button>
                  <span className="spawn-mode-weight-action-divider">|</span>
                  <button
                    type="button"
                    className="spawn-mode-weight-action-btn"
                    onClick={collapseAllGroups}
                    title="Collapse all groups"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div className="spawn-mode-weight-table-header">
                <span className="spawn-mode-weight-table-col-name">Item</span>
                <span className="spawn-mode-weight-table-col-weight">Weight</span>
              </div>

              <div className="spawn-mode-weight-list" role="group" aria-label="Spawn weight controls">
                {groupedWeightItems.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.groupKey);

                  return (
                    <div key={group.groupKey} className="spawn-mode-weight-group">
                      {/* Group header */}
                      <button
                        type="button"
                        className="spawn-mode-weight-group-header"
                        onClick={() => toggleGroupCollapse(group.groupKey)}
                        aria-expanded={!isCollapsed}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={12} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={12} aria-hidden="true" />
                        )}
                        <span className="spawn-mode-weight-group-label">{group.groupLabel}</span>
                        <span className="spawn-mode-weight-group-count">{group.items.length}</span>
                      </button>

                      {/* Group items */}
                      {!isCollapsed && (
                        <div className="spawn-mode-weight-group-items">
                          {group.items.map((item) => (
                            <div key={item.id} className="spawn-mode-weight-item">
                              <label
                                className="spawn-mode-weight-name"
                                title={item.id !== item.displayName ? `${item.displayName} (${item.id})` : item.id}
                                htmlFor={`weight-input-${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`}
                              >
                                <span className="spawn-mode-weight-name-text">{item.displayName}</span>
                                {item.id !== item.displayName && (
                                  <span className="spawn-mode-weight-name-id">{item.id}</span>
                                )}
                              </label>
                              <input
                                id={`weight-input-${item.id.replace(/[^a-zA-Z0-9]/g, '_')}`}
                                type="number"
                                min="0"
                                max="10"
                                step="0.1"
                                value={item.weight}
                                onChange={(e) => handleWeightChange(item.id, parseFloat(e.target.value) || 0)}
                                className="spawn-mode-weight-input"
                                aria-label={`Weight for ${item.displayName}`}
                                aria-describedby="spawn-mode-weight-help-text"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import/Export Section */}
      {showImportExport && (
        <div className="spawn-mode-import-export">
          <div className="spawn-mode-io-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              isLoading={isExporting}
              disabled={!hasCustom}
              leftIcon={Download}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              isLoading={isExporting}
              leftIcon={Download}
            >
              Export All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              isLoading={isImporting}
              leftIcon={Upload}
            >
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </div>

          {importError && (
            <div className="spawn-mode-import-error" role="alert" aria-live="assertive">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{importError}</span>
            </div>
          )}

          {successMessage && (
            <div className="spawn-mode-success" role="status" aria-live="polite">
              <CheckCircle size={14} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
          )}

          {feedbackMessage && (
            <div className="spawn-mode-feedback" role="status" aria-live="polite">
              <Info size={14} aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Batch Image Tools Section */}
      {showImportExport && (
        <div className="spawn-mode-batch-images">
          <button
            type="button"
            className="spawn-mode-batch-toggle"
            onClick={() => setIsBatchImageOpen(!isBatchImageOpen)}
            aria-expanded={isBatchImageOpen}
            aria-controls="spawn-mode-batch-panel"
          >
            <ImagePlus size={14} aria-hidden="true" />
            <span>Batch Image Tools</span>
            {isBatchImageOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>

          {isBatchImageOpen && (
            <div className="spawn-mode-batch-panel" id="spawn-mode-batch-panel">
              <p className="spawn-mode-batch-help">
                Apply icons and images to multiple items at once using property-based matching.
              </p>

              {/* Category Selector */}
              <div className="spawn-mode-batch-field">
                <label className="spawn-mode-batch-label" htmlFor="batch-category">Category</label>
                <select
                  id="batch-category"
                  className="spawn-mode-batch-select"
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value as BatchImageCategory)}
                >
                  {BATCH_IMAGE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Mode Selector */}
              <div className="spawn-mode-batch-field">
                <label className="spawn-mode-batch-label">Apply Mode</label>
                <div className="spawn-mode-batch-mode-buttons">
                  <button
                    type="button"
                    className={`spawn-mode-batch-mode-btn ${batchMode === 'predicate' ? 'spawn-mode-batch-mode-active' : ''}`}
                    onClick={() => setBatchMode('predicate')}
                  >
                    All Items
                  </button>
                  <button
                    type="button"
                    className={`spawn-mode-batch-mode-btn ${batchMode === 'property' ? 'spawn-mode-batch-mode-active' : ''}`}
                    onClick={() => setBatchMode('property')}
                    disabled={availableProperties.length === 0}
                    title={availableProperties.length === 0 ? 'No properties available for this category' : ''}
                  >
                    By Property
                  </button>
                </div>
              </div>

              {/* Property Selector (only for property mode) */}
              {batchMode === 'property' && availableProperties.length > 0 && (
                <div className="spawn-mode-batch-field">
                  <label className="spawn-mode-batch-label" htmlFor="batch-property">Property</label>
                  <select
                    id="batch-property"
                    className="spawn-mode-batch-select"
                    value={batchProperty}
                    onChange={(e) => setBatchProperty(e.target.value)}
                  >
                    {availableProperties.map(prop => (
                      <option key={prop.key} value={prop.key}>{prop.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Predicate Mode: Single Icon/Image inputs */}
              {batchMode === 'predicate' && (
                <>
                  <div className="spawn-mode-batch-field">
                    <label className="spawn-mode-batch-label" htmlFor="batch-icon-url">Icon URL (optional)</label>
                    <input
                      id="batch-icon-url"
                      type="text"
                      className="spawn-mode-batch-input"
                      value={batchIconUrl}
                      onChange={(e) => setBatchIconUrl(e.target.value)}
                      placeholder="e.g., assets/icons/item.png"
                    />
                    <span className="spawn-mode-batch-hint">Applied to all items in category</span>
                  </div>
                  <div className="spawn-mode-batch-field">
                    <label className="spawn-mode-batch-label" htmlFor="batch-image-url">Image URL (optional)</label>
                    <input
                      id="batch-image-url"
                      type="text"
                      className="spawn-mode-batch-input"
                      value={batchImageUrl}
                      onChange={(e) => setBatchImageUrl(e.target.value)}
                      placeholder="e.g., assets/images/item-full.png"
                    />
                    <span className="spawn-mode-batch-hint">Full-size image for detail views</span>
                  </div>
                </>
              )}

              {/* Property Mode: Value-based inputs */}
              {batchMode === 'property' && propertyValues.length > 0 && (
                <div className="spawn-mode-batch-values">
                  <label className="spawn-mode-batch-label">Property Values</label>
                  <div className="spawn-mode-batch-values-list">
                    {propertyValues.map(pv => (
                      <div key={pv.value} className="spawn-mode-batch-value-row">
                        <span className="spawn-mode-batch-value-label">{pv.label}</span>
                        <input
                          type="text"
                          className="spawn-mode-batch-input spawn-mode-batch-input-sm"
                          value={batchPropertyValueMap[pv.value]?.icon || ''}
                          onChange={(e) => handlePropertyValueMapChange(pv.value, 'icon', e.target.value)}
                          placeholder="Icon URL"
                        />
                        <input
                          type="text"
                          className="spawn-mode-batch-input spawn-mode-batch-input-sm"
                          value={batchPropertyValueMap[pv.value]?.image || ''}
                          onChange={(e) => handlePropertyValueMapChange(pv.value, 'image', e.target.value)}
                          placeholder="Image URL"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Count Preview */}
              <div className="spawn-mode-batch-preview">
                <RefreshCw size={12} aria-hidden="true" />
                <span>Affected items: {affectedCount !== null ? affectedCount : 'calculating...'}</span>
              </div>

              {/* Error Message */}
              {batchError && (
                <div className="spawn-mode-batch-error" role="alert">
                  <AlertTriangle size={12} aria-hidden="true" />
                  <span>{batchError}</span>
                </div>
              )}

              {/* URL Validation Hint */}
              <div className="spawn-mode-batch-url-hint">
                Valid URL prefixes: <code>http://</code>, <code>https://</code>, <code>/</code>, <code>assets/</code>
              </div>

              {/* Apply Button */}
              <div className="spawn-mode-batch-actions">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBatchApply}
                  isLoading={isBatchApplying}
                  leftIcon={ImagePlus}
                >
                  Apply Batch Images
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpawnModeControls;
