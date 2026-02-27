# Loot Box Demo Enhancement Implementation Plan

## Overview

Enhance the ItemsTab loot box demo section to improve UI/UX and integrate the new "box" item type functionality. The loot box demo will now support spawning actual box items that can be held unopened, displaying GP values for all spawn modes, allowing multi-rarity selection, and providing flexible inventory addition options.

### Goals
1. Display GP (gold piece) value for all spawn modes (not just Treasure Hoard)
2. Allow multi-rarity selection via checkboxes instead of single dropdown
3. Add new "Box" spawn mode with existing boxes or custom builder
4. Keep both individual "Add to Hero" buttons AND "Add All" button

### Background
- The "box" item type now exists and can contain items inside
- Box items can be spawned unopened and added to inventory
- `estimateItemValue()` in playlist-data-engine calculates GP but is private
- Current rarity mode only allows selecting ONE rarity at a time

---

## Phase 1: GP Value Calculation Utility

### Task 1.1: Create itemValue.ts utility
- [x] Create new file `src/utils/itemValue.ts`
- [x] Implement `estimateItemValue(item: EnhancedEquipment): number`
  - Base values by rarity:
    - common: 50 gp
    - uncommon: 400 gp
    - rare: 4,000 gp
    - very_rare: 40,000 gp
    - legendary: 200,000 gp
  - Modifiers:
    - weapon: ×1.2
    - armor: ×1.5
    - heavy items (>20 lb): ×1.1
  - Return rounded integer
- [x] Implement `calculateTotalValue(items: EnhancedEquipment[]): number`
  - Sum values from `estimateItemValue()` for all items
  - Return 0 for empty array

---

## Phase 2: Enhance useLootBox Hook

### Task 2.1: Add GP calculation to all spawn methods
- [x] Import `calculateTotalValue` from `@/utils/itemValue`
- [x] Update `LootBoxResult` interface documentation to note `totalValue` is now populated for all modes
- [x] Modify `spawnRandomItems()` to calculate and return `totalValue`
- [x] Modify `spawnByRarity()` to calculate and return `totalValue`
- [x] Modify `spawnFromList()` to calculate and return `totalValue`
- [x] Modify `spawnMagicItems()` to calculate and return `totalValue`
- [x] `spawnTreasureHoard()` already returns `totalValue` from engine (no change needed)

### Task 2.2: Add multi-rarity spawn support
- [x] Add new type `RarityOption = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'`
- [x] Implement `spawnByMultipleRarities(rarities: RarityOption[], count: number, seed?: string): Promise<LootBoxResult>`
  - Validate at least one rarity selected
  - Distribute count evenly across selected rarities
  - Use weighted selection within each rarity pool
  - Calculate and return `totalValue`
- [x] Add to hook's return interface

### Task 2.3: Add box item spawning support
- [x] Import `BoxOpener` and `BoxContents` types from `playlist-data-engine`
- [x] Implement `spawnBoxItem(boxConfig: BoxContents, openImmediately: boolean, seed?: string): Promise<LootBoxResult>`
  - If `openImmediately === false`:
    - Return the box as an equipment item with `type: 'box'`
    - Include `boxContents` property
  - If `openImmediately === true`:
    - Use `BoxOpener.openBox()` to generate contents
    - Return the opened items with calculated `totalValue`
- [x] Add to hook's return interface

---

## Phase 3: ItemsTab UI Changes

### Task 3.1: Add new "Box" spawn mode
- [x] Update `SpawnMode` type to include `'box'`
- [x] Add state variables:
  ```typescript
  const [boxSourceType, setBoxSourceType] = useState<'existing' | 'custom'>('custom');
  const [selectedBoxName, setSelectedBoxName] = useState<string>('');
  const [customBoxContents, setCustomBoxContents] = useState<BoxContents | null>(null);
  const [openBoxImmediately, setOpenBoxImmediately] = useState(true);
  const [customBoxValid, setCustomBoxValid] = useState(false);
  ```
- [x] Add "Box" button to mode selector with `Package` icon
- [x] Create UI controls for Box mode:
  - [x] Toggle: "Use Existing Box" vs "Build Custom Box"
  - [x] Existing Box: Dropdown populated with box items from equipment registry
  - [x] Custom Box: Inline BoxContentsBuilder component (reuse existing component)
  - [x] Toggle: "Spawn Unopened" vs "Spawn & Open" (showing as switch/checkbox)

### Task 3.2: Convert rarity dropdown to checkboxes
- [x] Change state from `selectedRarity: RarityOption` to `selectedRarities: RarityOption[]`
- [x] Default to `['rare']` (single selection to start)
- [x] Replace `<select>` dropdown with checkbox group:
  ```tsx
  <div className="lootbox-rarity-checkboxes">
    {['common', 'uncommon', 'rare', 'very_rare', 'legendary'].map(rarity => (
      <label key={rarity} className="lootbox-rarity-checkbox">
        <input
          type="checkbox"
          checked={selectedRarities.includes(rarity)}
          onChange={() => toggleRarity(rarity)}
        />
        <span style={{ color: RARITY_COLORS[rarity] }}>
          {formatRarity(rarity)}
        </span>
      </label>
    ))}
  </div>
  ```
- [x] Implement `toggleRarity(rarity: RarityOption)` function
  - Add to array if not present
  - Remove from array if present
  - Ensure at least one rarity remains selected (validation)

### Task 3.3: Display GP value for all modes
- [x] Move GP display outside the `spawnMode === 'hoard'` conditional
- [x] Update condition to show for any mode when `totalValue > 0`:
  ```tsx
  {lastHoardResult?.totalValue !== undefined && lastHoardResult.totalValue > 0 && (
    <div className="lootbox-total-value">
      <Coins size={20} />
      <span className="lootbox-value-label">Total Value:</span>
      <span className="lootbox-value-amount">
        {lastHoardResult.totalValue.toLocaleString()} gp
      </span>
    </div>
  )}
  ```
- [x] Import `Coins` icon from lucide-react if not already imported

### Task 3.4: Keep both individual and add-all options
- [x] Keep the individual "Add to Hero" buttons on each item card (no changes)
- [x] Keep the "Add All X Items to Hero" button at the bottom
- [x] Update condition for Add All button from `spawnedItems.length > 1` to `spawnedItems.length > 0`

### Task 3.5: Update handler functions
- [ ] Update `handleSpawnByRarity()`:
  ```typescript
  const handleSpawnByRarity = async () => {
    if (selectedRarities.length === 0) {
      showToast('⚠️ Select at least one rarity', 'warning');
      return;
    }

    setIsAnimating(true);
    setSpawnError(null);
    setLastSpawnMode('rarity');

    const result = selectedRarities.length === 1
      ? await spawnByRarity(selectedRarities[0], rarityCount)
      : await spawnByMultipleRarities(selectedRarities, rarityCount);

    setIsAnimating(false);
    // ... handle result
  };
  ```
- [ ] Add new `handleSpawnBox()` handler:
  ```typescript
  const handleSpawnBox = async () => {
    if (boxSourceType === 'existing' && !selectedBoxName) {
      showToast('⚠️ Select a box to spawn', 'warning');
      return;
    }
    if (boxSourceType === 'custom' && !customBoxContents) {
      showToast('⚠️ Configure box contents', 'warning');
      return;
    }

    setIsAnimating(true);
    setSpawnError(null);
    setLastSpawnMode('box');

    const boxConfig = boxSourceType === 'existing'
      ? getBoxContentsFromRegistry(selectedBoxName)
      : customBoxContents;

    const result = await spawnBoxItem(boxConfig!, openBoxImmediately);
    // ... handle result
  };
  ```
- [ ] Update spawn button onClick to include `handleSpawnBox` for box mode

---

## Phase 4: CSS Styling

### Task 4.1: Add styles for rarity checkboxes
- [ ] Add `.lootbox-rarity-checkboxes` container styles
- [ ] Add `.lootbox-rarity-checkbox` individual checkbox styles
- [ ] Style checkboxes with rarity colors when checked
- [ ] Ensure proper spacing and alignment

### Task 4.2: Add styles for box mode controls
- [ ] Style box source toggle (existing vs custom)
- [ ] Style box selector dropdown
- [ ] Style open/unopened toggle switch
- [ ] Add box preview section styles (if showing preview)

### Task 4.3: Update GP value display styles
- [ ] Rename `.lootbox-hoard-value` to `.lootbox-total-value`
- [ ] Update for use across all spawn modes
- [ ] Consider different color scheme for non-hoard modes (optional)

### Task 4.4: Add box mode icon and button styles
- [ ] Style the "Box" mode selector button
- [ ] Ensure consistent sizing with other mode buttons

---

## Phase 5: Integration & Polish

### Task 5.1: Update mode selector buttons
- [ ] Add fifth button for "Box" mode with `Package` icon
- [ ] Ensure all 5 modes are evenly spaced

### Task 5.2: Update spawn button text dynamically
- [ ] Random: "Spawn Random Items"
- [ ] Rarity: "Spawn by Rarity"
- [ ] Hoard: "Open Treasure Hoard"
- [ ] Magic: "Spawn Magic Items"
- [ ] Box (unopened): "Spawn Box"
- [ ] Box (open): "Spawn & Open Box"

### Task 5.3: Load box items for dropdown
- [ ] Create or use function to get all box-type items from equipment registry
- [ ] Populate the "Existing Box" dropdown with available boxes
- [ ] Show box name and brief description in dropdown options

### Task 5.4: Test all spawn modes
- [ ] Test Random mode spawns items and shows GP value
- [ ] Test single rarity selection still works
- [ ] Test multi-rarity selection spawns mix of rarities
- [ ] Test Treasure Hoard still shows GP value
- [ ] Test Magic Items mode shows GP value
- [ ] Test Box mode - existing box, unopened
- [ ] Test Box mode - existing box, opened
- [ ] Test Box mode - custom box, unopened
- [ ] Test Box mode - custom box, opened
- [ ] Test individual "Add to Hero" buttons work
- [ ] Test "Add All" button works

---

## Dependencies

- [x] `playlist-data-engine` BoxOpener class - Available
- [x] `lucide-react` icons (Package, Coins) - Available
- [x] `BoxContentsBuilder` component - Exists in `src/components/shared/`
- [ ] No blockers identified

---

## Questions/Unknowns

### Resolved
- ~~Should individual "Add to Hero" buttons be removed?~~ **No - keep both options**
- ~~Should Box mode allow multiple boxes?~~ **No - single box only**
- ~~How should users select boxes?~~ **Both existing dropdown AND custom builder**

### Outstanding
- [ ] Are there existing box items in the equipment registry to populate the dropdown?
- [ ] Should custom box configurations be saved/persisted between sessions?

---

## Files Summary

| File | Status | Changes |
|------|--------|---------|
| `src/utils/itemValue.ts` | NEW | GP calculation utility |
| `src/hooks/useLootBox.ts` | MODIFY | Add GP calc, multi-rarity spawn, box spawn |
| `src/components/Tabs/ItemsTab.tsx` | MODIFY | Box mode UI, rarity checkboxes, GP display |
| `src/components/Tabs/ItemsTab.css` | MODIFY | Styles for new UI elements |

---

## Verification Checklist

After implementation, verify:

- [ ] **GP Calculation**: Spawn items in Random mode, verify GP total is shown
- [ ] **Multi-Rarity**: Select Common + Uncommon, verify mix of both rarities spawns
- [ ] **Box Mode - Unopened**: Spawn a box unopened, verify it appears as a box item that can be added to inventory
- [ ] **Box Mode - Opened**: Spawn and open a box, verify contents are shown with GP value
- [ ] **Add Individual**: Click individual "Add to Hero" button, verify item appears in inventory
- [ ] **Add All**: Click "Add All", verify all items appear in hero inventory
- [ ] **Existing Modes**: Verify Random, Hoard, Magic modes still work correctly
- [ ] **No TypeScript errors**: Run `npm run build`
- [ ] **Tests pass**: Run `npm test`
