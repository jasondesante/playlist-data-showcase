/**
 * DataViewer Components
 *
 * Export barrel file for DataViewer-related components, constants, utils, and hooks.
 */

// ==========================================
// Existing Components
// ==========================================

export { SpawnModeControls } from './SpawnModeControls';
export type { SpawnModeControlsProps } from './SpawnModeControls';

export { CustomContentBadge } from './CustomContentBadge';
export type { CustomContentBadgeProps } from './CustomContentBadge';

// ==========================================
// Constants
// ==========================================

export {
  SCHOOL_COLORS,
  SCHOOL_BG_COLORS,
  RARITY_COLORS,
  RARITY_BG_COLORS,
  ABILITY_COLORS,
  CATEGORY_CONFIG,
  PROPERTY_TYPE_CONFIG,
  getPropertyTypeConfig
} from './constants';

// ==========================================
// Utils
// ==========================================

export {
  formatLevel,
  formatRarity,
  formatAbilityBonus,
  formatSpawnWeight,
  formatCondition,
  formatPrerequisites,
  formatSpellLevelShort,
  formatSpellUses,
  isColorOption,
  getAppearanceIcon
} from './utils';

// ==========================================
// Panel Components
// ==========================================

export {
  AppearancePanel,
  CategorySelector,
  ClassFeaturesPanel,
  ClassesPanel,
  ContentPanel,
  EquipmentFilters,
  EquipmentPanel,
  RacesPanel,
  RacialTraitsPanel,
  SkillsPanel,
  SpellFilters,
  SpellsPanel
} from './components';

// ==========================================
// Hooks
// ==========================================

export { useDataViewerEditing } from './hooks/useDataViewerEditing';
export type {
  UseDataViewerEditingProps,
  UseDataViewerEditingReturn,
  UseDataViewerEditingDataProps,
  UseDataViewerEditingCreatorProps
} from './hooks/useDataViewerEditing';
