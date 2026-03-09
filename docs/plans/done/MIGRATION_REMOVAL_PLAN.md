# Migration Code Removal Plan

## Overview

This document outlines when migration code can be safely removed from the codebase. Migration code exists to support users with older persisted state (localStorage data). Over time, this code becomes unnecessary as users naturally upgrade.

**Key Principle:** Migration code should be kept for at least 3-6 months after introduction, or longer for critical data migrations.

---

## Current Migrations

### 1. beatDetectionStore.ts - intensityThreshold → filter

**Location:** `src/store/beatDetectionStore.ts:3437-3456`

**Introduced:** 2026-02-28

**Description:** Migrates the deprecated `intensityThreshold` parameter to the new `filter` parameter. This is a direct 1:1 mapping where `filter = intensityThreshold`.

**Risk Level:** Low - The migration is straightforward and users can easily reconfigure if needed.

**Removal Criteria:**
- [ ] At least 3 months have passed (after 2026-05-28)
- [ ] No user reports of migration issues
- [ ] Analytics show most active users have visited at least once since introduction

**Recommended Removal Date:** 2026-05-28 (3 months after introduction)

**Code to Remove:**
```typescript
// Lines 3437-3456
if (generatorOptions && generatorOptions.intensityThreshold !== undefined) {
    const oldThreshold = generatorOptions.intensityThreshold;
    if (generatorOptions.filter === undefined) {
        generatorOptions = {
            ...generatorOptions,
            filter: oldThreshold,
        };
    }
    delete generatorOptions.intensityThreshold;
    logger.info('BeatDetection', 'Migrated intensityThreshold to filter', {
        oldValue: oldThreshold,
        newValue: generatorOptions.filter,
    });
}
```

---

### 2. beatDetectionStore.ts - OSE Config Migrations

**Location:** `src/store/beatDetectionStore.ts:3468-3532`

**Introduced:** 2026-02-28

**Description:** Migrates raw numeric values (`hopSizeMs`, `melBands`, `gaussianSmoothMs`) to structured config objects (`hopSizeConfig`, `melBandsConfig`, `gaussianSmoothConfig`).

**Risk Level:** Low - These are generator options that users can reconfigure.

**Removal Criteria:**
- [ ] At least 3 months have passed (after 2026-05-28)
- [ ] No user reports of migration issues

**Recommended Removal Date:** 2026-05-28 (3 months after introduction)

**Code to Remove:**
- Lines 3468-3490: hopSizeMs → hopSizeConfig migration
- Lines 3492-3511: melBands → melBandsConfig migration
- Lines 3513-3532: gaussianSmoothMs → gaussianSmoothConfig migration

---

### 3. CombatSimulatorTab.tsx - Treasure Item Type Migration

**Location:** `src/components/Tabs/CombatSimulatorTab.tsx:500-614`

**Introduced:** 2026-02-19

**Description:** Migrates legacy `consumable` and `misc` item types to the new `item` type with appropriate tags.

**Risk Level:** Medium - This migration involves heuristic-based type inference that could lose data if removed too early.

**Removal Criteria:**
- [ ] At least 6 months have passed (after 2026-08-19)
- [ ] No user reports of lost treasure item data

**Recommended Removal Date:** 2026-08-19 (6 months after introduction)

**Code to Remove:**
- `COMBAT_SIMULATOR_CONFIG_VERSION` - Can be bumped to 3 (or kept at 2 if no new migrations needed)
- `migrateTreasureItems` function (lines 523-563)
- Migration check in `loadCombatSimulatorConfig` (lines 604-613)

**Already Documented:** Yes - See comments at lines 509-514 and 521

---

### 4. beatDetectionStore.ts - Subdivision Config Deserialization

**Location:** `src/store/beatDetectionStore.ts:3534-3554`

**Status:** NOT A MIGRATION - This is ongoing deserialization logic

**Description:** Converts the serialized array format of `beatSubdivisions` back to a Map. This is NOT migration code - it's required for ALL users because Maps don't serialize to JSON properly.

**Action:** KEEP - This code must remain as long as subdivision config is persisted.

---

### 5. progressionConfigStore.ts - Version-Based Reset

**Location:** `src/store/progressionConfigStore.ts:244-281`

**Status:** NOT A MIGRATION - This is a reset mechanism

**Description:** When the config version changes, settings reset to defaults. This is intentional behavior for config stores where preserving old values isn't critical.

**Action:** KEEP - This is the intended pattern for config stores.

---

### 6. rhythmXPConfigStore.ts - Version-Based Reset

**Location:** `src/store/rhythmXPConfigStore.ts:377-396`

**Status:** NOT A MIGRATION - This is a reset mechanism (currently at v1, no migrations yet)

**Action:** KEEP - This is the intended pattern for config stores.

---

## Removal Schedule Summary

| Migration | Introduced | Remove After | Priority |
|-----------|------------|--------------|----------|
| intensityThreshold → filter | 2026-02-28 | 2026-05-28 | Low |
| OSE config migrations | 2026-02-28 | 2026-05-28 | Low |
| Treasure item types | 2026-02-19 | 2026-08-19 | Medium |

---

## Removal Checklist

When removing migration code, follow these steps:

1. **Verify Timing:** Ensure the recommended removal date has passed
2. **Check Analytics:** If available, verify most users have upgraded
3. **Remove Code:** Delete the migration logic
4. **Update Comments:** Remove any "Remove after YYYY-MM-DD" comments
5. **Test:** Verify the app still works for fresh installs and existing users
6. **Document:** Update this plan to mark the migration as removed

---

## Questions/Unknowns

1. **User Analytics:** Do we have analytics to track when users last visited?
2. **Error Tracking:** Do we have error logging for migration failures?
3. **Version Tracking:** Should we add telemetry to track what versions users are migrating from?

---

## History

- 2026-03-08: Plan created, documenting all current migrations
