# Batch Image Tool Bug Research

## Overview

Investigation into why images assigned via the DataViewerTab's batch image tool aren't showing in the UI for spells and other content.

**Date Researched:** 2026-03-10
**Status:** Root cause identified, fix needed

---

## Problem Statement

User used the DataViewerTab's batch image tool to assign images to spells, but images aren't appearing in the UI. The system appears to be checking arweave gateways correctly, suggesting network requests are happening but something else is wrong.

---

## Research Findings

### How the Batch Image Tool Works

**Location:** `src/components/Tabs/DataViewer/SpawnModeControls.tsx` (lines 611-689)

The batch image tool supports two modes:

#### 1. Predicate Mode
Applies the same icon/image URL to ALL items in a category.
```typescript
updatedCount = manager.batchUpdateImages(
  batchCategory as any,
  () => true, // Match all items
  updates
);
```

#### 2. Property Mode
Applies different URLs based on a property value (e.g., spell school).
```typescript
updatedCount = manager.batchByCategory(batchCategory as any, batchProperty, valueMap);
```

### Data Flow

```
User Action: Apply batch images
           │
           ▼
SpawnModeControls.handleBatchApply()
           │
           ▼
ExtensionManager.batchUpdateImages() or batchByCategory()
           │
           ├─► Gets all items via this.get(category)
           │   └─► Returns defaults + existing custom items
           │
           ├─► Updates matching items with icon/image URLs
           │   └─► Creates updatedItems array with ALL items
           │
           ├─► Stores with mode: 'replace'
           │   this.extensions.set(category, {
           │     items: updatedItems,
           │     options: { mode: 'replace' }
           │   })
           │
           ├─► Calls invalidateRegistryCache(category)
           │   └─► SpellQuery cache is cleared
           │
           ▼
UI should refresh... BUT DOESN'T
```

### How Spells Display Images

**Location:** `src/components/Tabs/DataViewerTab.tsx` (lines 898-965)

Spells display images correctly when data is available:
```typescript
const hasImage = spell.image || spell.icon;

// Thumbnail
{hasImage && (
  <ArweaveImage
    src={spell.image || spell.icon || ''}
    alt={spell.name}
    ...
  />
)}

// Full-size when expanded
{spell.image && (
  <ArweaveImage
    src={spell.image}
    ...
  />
)}
```

The UI code is correct - it reads `spell.image` and `spell.icon` properties.

---

## Root Causes Identified

### Bug #1: Missing UI Refresh Notification (FIXED ✓ 2026-03-10)

**Location:** `src/components/Tabs/DataViewer/SpawnModeControls.tsx`

After a successful batch operation, the tool did NOT properly refresh the UI:

```typescript
// Lines 678-680 - What originally happened
setSuccessMessage(`Successfully updated images for ${updatedCount} items.`);
showToast(`Updated images for ${updatedCount} items in ${batchCategory}`, 'success');
logger.info('DataViewer', `Batch image update: ${updatedCount} items in ${batchCategory}`);
// Missing: cache invalidation AND notifyDataChanged() call!
```

**Why this matters:**
- `useDataViewer` hook uses `useMemo` with `lastDataChange` as a dependency
- When `lastDataChange` changes, memoized data re-computes
- BUT: SpellQuery, SkillQuery, FeatureQuery all use internal caching
- Without invalidating caches first, queries return stale cached data
- Without calling `notifyDataChanged()`, `lastDataChange` stays the same
- UI doesn't refresh to show updated images

**Complete Fix:**
1. Invalidate all query caches to pick up updated data from ExtensionManager
2. Call `notifyDataChanged()` to trigger useMemo re-computation

### Bug #2: No Data Persistence

**Location:** `playlist-data-engine/src/core/extensions/ExtensionManager.ts`

ExtensionManager stores data **in-memory only**. From the code comment (line 8):
> "Runtime only: Custom data provided each session"

**Why this matters:**
- Batch image updates are stored in `this.extensions` Map
- On page reload, ExtensionManager is re-initialized
- Default data is loaded from JSON files
- All batch image updates are **lost**

This is by design - the system expects custom content to be re-registered each session or persisted via export/import.

### Minor Issue: Mode Semantics

**Location:** `playlist-data-engine/src/core/extensions/ExtensionManager.ts` (lines 1230, 1335)

Batch methods store data with `mode: 'replace'`:

```typescript
this.extensions.set(category, {
  items: updatedItems,
  options: { mode: 'replace' },  // Could be 'relative'
  registeredAt: Date.now()
});
```

This works correctly because `updatedItems` contains ALL items (updated + unchanged), but semantically it might be clearer to use `'relative'` mode to indicate merging with defaults.

---

## Key Files Involved

| File | Purpose | Issue |
|------|---------|-------|
| `src/components/Tabs/DataViewer/SpawnModeControls.tsx` | Batch image tool UI | Missing `notifyDataChanged()` call |
| `src/hooks/useDataViewer.ts` | Data fetching hook | Uses `lastDataChange` as dependency |
| `src/store/dataViewerStore.ts` | State management | Has `notifyDataChanged()` action |
| `src/components/Tabs/DataViewerTab.tsx` | Spell display UI | Working correctly |
| `src/components/shared/ArweaveImage.tsx` | Image rendering | Working correctly |
| `playlist-data-engine/.../ExtensionManager.ts` | Data storage | No persistence (by design) |

---

## Implementation Plan

### Phase 1: Fix Immediate UI Refresh

- [x] **Task 1.1: Add notifyDataChanged call to SpawnModeControls** ✓ 2026-03-10
  - Import `useDataViewerStore` in SpawnModeControls.tsx
  - Get `notifyDataChanged` from store
  - Call `notifyDataChanged()` after successful batch operation
  - Location: After line 680 in `handleBatchApply`

```typescript
// Add after successful batch operation
const notifyDataChanged = useDataViewerStore.getState().notifyDataChanged;
notifyDataChanged();
```

- [x] **Task 1.2: Verify fix works** ✓ 2026-03-10
  - Test batch image tool in predicate mode
  - Test batch image tool in property mode
  - Confirm UI refreshes immediately after apply

  **Findings during verification:**
  - Discovered Task 1.1 fix was incomplete - `notifyDataChanged()` alone is not enough
  - SpellQuery, SkillQuery, FeatureQuery all use internal caching
  - When `useMemo` re-runs (due to `lastDataChange` change), queries return cached data
  - Must invalidate query caches BEFORE calling `notifyDataChanged()`
  - Fixed by adding cache invalidation calls:
    ```typescript
    SpellQuery.getInstance().invalidateCache();
    SkillQuery.getInstance().invalidateCache();
    FeatureQuery.getInstance().invalidateCache();
    useDataViewerStore.getState().notifyDataChanged();
    ```
  - Build passes successfully

### Phase 2: Add Persistence (Optional Enhancement)

- [x] **Task 2.1: Design persistence strategy** ✓ 2026-03-10

  **Decision: Option A - Auto-save to localStorage with auto-restore**

  **Rationale:**
  1. **Consistency with existing patterns:** The codebase already uses localStorage for custom equipment persistence in `useItemCreator.ts` with `CUSTOM_EQUIPMENT_CACHE` and `CUSTOM_EQUIPMENT_STORAGE_KEY`. This approach follows the same pattern.

  2. **User experience:** Users expect batch image changes to persist across sessions without manual export/import. The current "by design" behavior of losing data on reload creates friction.

  3. **No infrastructure changes needed:** localStorage is already available and used. No changes to ExtensionManager or the data engine are required.

  4. **Export/import still works:** The existing export functionality (`handleExport` in SpawnModeControls) already captures batch image updates because `manager.getCustom()` returns items from `extensions` which includes batch-applied image data. Users can still manually export/import for backup or sharing.

  **Implementation Details:**

  1. **New utility module:** `src/utils/batchImagePersistence.ts`
     - `BATCH_IMAGE_STORAGE_KEY` - localStorage key
     - `saveBatchImageUpdates(category, updates)` - saves updates to localStorage
     - `loadBatchImageUpdates()` - loads updates from localStorage
     - `clearBatchImageUpdates()` - clears localStorage
     - `restoreBatchImageUpdates()` - restores to ExtensionManager on startup

  2. **Integration points:**
     - `SpawnModeControls.handleBatchApply()` - call `saveBatchImageUpdates()` after success
     - `main.tsx` - call `restoreBatchImageUpdates()` after `ensureAllDefaultsInitialized()`

  3. **Data structure:**
     ```typescript
     {
       version: '1.0',
       updatedAt: number,
       categories: {
         [category]: {
           updates: [{ name, icon?, image? }]
         }
       }
     }
     ```

- [ ] **Task 2.2: Implement localStorage persistence**
  - Create `src/utils/batchImagePersistence.ts` with save/load/restore functions
  - Integrate save into `SpawnModeControls.handleBatchApply()`
  - Integrate restore into `main.tsx` after ExtensionManager initialization
  - Test: Apply batch images, reload page, images should persist

### Phase 3: Documentation

- [ ] **Task 3.1: Update user documentation**
  - Document that batch image changes are session-only
  - Explain export/import workflow for persistence

---

## Quick Fix Code

The complete fix for Bug #1 (updated after Task 1.2 verification):

```typescript
// In SpawnModeControls.tsx, add at top of file:
import { useDataViewerStore } from '@/store/dataViewerStore';
import { ExtensionManager, SpellQuery, SkillQuery, FeatureQuery } from 'playlist-data-engine';

// In handleBatchApply, after successful operation (around line 680):
// Invalidate query caches to pick up the updated image data
SpellQuery.getInstance().invalidateCache();
SkillQuery.getInstance().invalidateCache();
FeatureQuery.getInstance().invalidateCache();

// Trigger UI refresh to show updated images
useDataViewerStore.getState().notifyDataChanged();
```

---

## Testing Checklist

- [ ] Batch image tool applies images to all items in predicate mode
- [ ] Batch image tool applies images by property in property mode
- [ ] UI refreshes immediately after batch apply (no manual refresh needed)
- [ ] Images appear in spell cards (thumbnail and expanded view)
- [ ] Arweave URLs resolve correctly through gateway fallback
- [ ] Export includes custom image data
- [ ] Import restores custom image data

---

## Dependencies

- None for Phase 1 fix
- Phase 2 may require architectural decisions about persistence strategy

## Questions/Unknowns

- Should batch image data persist across sessions automatically?
- What's the expected user workflow - one-time batch apply or persistent configuration?
- Should we add an "Auto-save batch changes" toggle?
