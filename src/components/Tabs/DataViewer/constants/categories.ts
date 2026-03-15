/**
 * Category configuration for the DataViewer component
 *
 * Maps data categories to their display configuration including labels, icons, and counts.
 */

import {
  Database,
  Scroll,
  Sword,
  Shield,
  Users,
  Zap,
  Package,
  Target,
  Eye
} from 'lucide-react';
import { type DataCategory, type DataCounts } from '../../../../hooks/useDataViewer';

/**
 * Category configuration with icons and labels
 */
export const CATEGORY_CONFIG: Record<DataCategory, { label: string; icon: typeof Database; countKey: keyof DataCounts }> = {
  spells: { label: 'Spells', icon: Scroll, countKey: 'spells' },
  skills: { label: 'Skills', icon: Target, countKey: 'skills' },
  classFeatures: { label: 'Class Features', icon: Sword, countKey: 'classFeatures' },
  racialTraits: { label: 'Racial Traits', icon: Users, countKey: 'racialTraits' },
  races: { label: 'Races', icon: Shield, countKey: 'races' },
  classes: { label: 'Classes', icon: Zap, countKey: 'classes' },
  equipment: { label: 'Equipment', icon: Package, countKey: 'equipment' },
  appearance: { label: 'Appearance', icon: Eye, countKey: 'appearance' },
};
