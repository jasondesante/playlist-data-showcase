import { useState, useCallback, useMemo } from 'react';
import { FeatureQuery, ClassFeature, RacialTrait } from 'playlist-data-engine';
import { logger } from '@/utils/logger';

/**
 * Cache for resolved feature names to avoid repeated query lookups
 */
interface FeatureCache {
  classFeatures: Map<string, ClassFeature | null>;
  racialTraits: Map<string, RacialTrait | null>;
}

/**
 * React hook for resolving feature and trait IDs to human-readable display names.
 *
 * This hook uses the FeatureRegistry from playlist-data-engine to look up
 * class features and racial traits by their IDs and return their display names.
 * If a feature/trait is not found in the query, it formats the ID as a fallback.
 *
 * @example
 * ```tsx
 * const { resolveFeatureName, resolveTraitName, getFeatureDescription } = useFeatureNames();
 *
 * // Resolve a class feature ID to its display name
 * const featureName = resolveFeatureName('barbarian_rage'); // Returns "Rage"
 *
 * // Resolve a racial trait ID to its display name
 * const traitName = resolveTraitName('elf_darkvision'); // Returns "Darkvision"
 *
 * // Get feature description for tooltips
 * const description = getFeatureDescription('barbarian_rage');
 * ```
 *
 * @returns {Object} Hook return object
 * @returns {Function} resolveFeatureName - Resolves a class feature ID to display name
 * @returns {Function} resolveTraitName - Resolves a racial trait ID to display name
 * @returns {Function} getFeatureDescription - Gets the description for a class feature
 * @returns {Function} getTraitDescription - Gets the description for a racial trait
 * @returns {Function} resolveFeatureNames - Resolves multiple class feature IDs at once
 * @returns {Function} resolveTraitNames - Resolves multiple racial trait IDs at once
 */
export const useFeatureNames = () => {
  // Cache for resolved features to avoid repeated lookups
  const [cache] = useState<FeatureCache>({
    classFeatures: new Map(),
    racialTraits: new Map(),
  });

  // Get the FeatureQuery instance
  const query = useMemo(() => FeatureQuery.getInstance(), []);

  /**
   * Format a snake_case ID to a human-readable Title Case string
   *
   * @param id - The feature/trait ID to format
   * @returns Formatted display name
   *
   * @example
   * formatIdToDisplayName('barbarian_rage') // "Barbarian Rage"
   * formatIdToDisplayName('fighter_action_surge') // "Fighter Action Surge"
   */
  const formatIdToDisplayName = useCallback((id: string): string => {
    if (!id) return '';

    return id
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  /**
   * Resolve a class feature ID to its display name
   *
   * Looks up the feature in the FeatureRegistry cache. If found, returns the
   * feature's name property. If not found, formats the ID as a fallback.
   *
   * @param featureId - The class feature ID to resolve
   * @returns The display name of the feature
   */
  const resolveFeatureName = useCallback((featureId: string): string => {
    if (!featureId) return '';

    // Check cache first
    const cached = cache.classFeatures.get(featureId);
    if (cached !== undefined) {
      return cached?.name ?? formatIdToDisplayName(featureId);
    }

    try {
      // Look up in query
      const feature = query.getClassFeatureById(featureId);

      // Cache the result (null if not found)
      cache.classFeatures.set(featureId, feature ?? null);

      return feature?.name ?? formatIdToDisplayName(featureId);
    } catch (error) {
      logger.warn('FeatureNames', `Failed to resolve feature ID: ${featureId}`, error);
      return formatIdToDisplayName(featureId);
    }
  }, [cache.classFeatures, formatIdToDisplayName, query]);

  /**
   * Resolve a racial trait ID to its display name
   *
   * Looks up the trait in the FeatureRegistry cache. If found, returns the
   * trait's name property. If not found, formats the ID as a fallback.
   *
   * @param traitId - The racial trait ID to resolve
   * @returns The display name of the trait
   */
  const resolveTraitName = useCallback((traitId: string): string => {
    if (!traitId) return '';

    // Check cache first
    const cached = cache.racialTraits.get(traitId);
    if (cached !== undefined) {
      return cached?.name ?? formatIdToDisplayName(traitId);
    }

    try {
      // Look up in query
      const trait = query.getRacialTraitById(traitId);

      // Cache the result (null if not found)
      cache.racialTraits.set(traitId, trait ?? null);

      return trait?.name ?? formatIdToDisplayName(traitId);
    } catch (error) {
      logger.warn('FeatureNames', `Failed to resolve trait ID: ${traitId}`, error);
      return formatIdToDisplayName(traitId);
    }
  }, [cache.racialTraits, formatIdToDisplayName, query]);

  /**
   * Get the description for a class feature
   *
   * @param featureId - The class feature ID to look up
   * @returns The description of the feature, or undefined if not found
   */
  const getFeatureDescription = useCallback((featureId: string): string | undefined => {
    if (!featureId) return undefined;

    // Check cache first
    const cached = cache.classFeatures.get(featureId);
    if (cached !== undefined) {
      return cached?.description;
    }

    try {
      const feature = query.getClassFeatureById(featureId);
      cache.classFeatures.set(featureId, feature ?? null);
      return feature?.description;
    } catch (error) {
      logger.warn('FeatureNames', `Failed to get feature description: ${featureId}`, error);
      return undefined;
    }
  }, [cache.classFeatures, query]);

  /**
   * Get the description for a racial trait
   *
   * @param traitId - The racial trait ID to look up
   * @returns The description of the trait, or undefined if not found
   */
  const getTraitDescription = useCallback((traitId: string): string | undefined => {
    if (!traitId) return undefined;

    // Check cache first
    const cached = cache.racialTraits.get(traitId);
    if (cached !== undefined) {
      return cached?.description;
    }

    try {
      const trait = query.getRacialTraitById(traitId);
      cache.racialTraits.set(traitId, trait ?? null);
      return trait?.description;
    } catch (error) {
      logger.warn('FeatureNames', `Failed to get trait description: ${traitId}`, error);
      return undefined;
    }
  }, [cache.racialTraits, query]);

  /**
   * Resolve multiple class feature IDs to their display names
   *
   * @param featureIds - Array of class feature IDs to resolve
   * @returns Array of resolved display names in the same order
   */
  const resolveFeatureNames = useCallback((featureIds: string[]): string[] => {
    return featureIds.map(id => resolveFeatureName(id));
  }, [resolveFeatureName]);

  /**
   * Resolve multiple racial trait IDs to their display names
   *
   * @param traitIds - Array of racial trait IDs to resolve
   * @returns Array of resolved display names in the same order
   */
  const resolveTraitNames = useCallback((traitIds: string[]): string[] => {
    return traitIds.map(id => resolveTraitName(id));
  }, [resolveTraitName]);

  /**
   * Get the effects for a class feature
   *
   * @param featureId - The class feature ID to look up
   * @returns The effects array of the feature, or undefined if not found
   */
  const getFeatureEffects = useCallback((featureId: string) => {
    if (!featureId) return undefined;

    // Check cache first
    const cached = cache.classFeatures.get(featureId);
    if (cached !== undefined) {
      return cached?.effects;
    }

    try {
      const feature = query.getClassFeatureById(featureId);
      cache.classFeatures.set(featureId, feature ?? null);
      return feature?.effects;
    } catch (error) {
      logger.warn('FeatureNames', `Failed to get feature effects: ${featureId}`, error);
      return undefined;
    }
  }, [cache.classFeatures, query]);

  /**
   * Get the effects for a racial trait
   *
   * @param traitId - The racial trait ID to look up
   * @returns The effects array of the trait, or undefined if not found
   */
  const getTraitEffects = useCallback((traitId: string) => {
    if (!traitId) return undefined;

    // Check cache first
    const cached = cache.racialTraits.get(traitId);
    if (cached !== undefined) {
      return cached?.effects;
    }

    try {
      const trait = query.getRacialTraitById(traitId);
      cache.racialTraits.set(traitId, trait ?? null);
      return trait?.effects;
    } catch (error) {
      logger.warn('FeatureNames', `Failed to get trait effects: ${traitId}`, error);
      return undefined;
    }
  }, [cache.racialTraits, query]);

  return {
    resolveFeatureName,
    resolveTraitName,
    getFeatureDescription,
    getTraitDescription,
    getFeatureEffects,
    getTraitEffects,
    resolveFeatureNames,
    resolveTraitNames,
    formatIdToDisplayName,
  };
};
