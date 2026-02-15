# ItemsTab Enhancement Plan

**Created:** 2026-02-13
**Feature:** Enchantment System, Curse Mechanics, Modification Display, and Enhanced Item Creator

---

## Design Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| **Enchantment Stacking** | ✅ Allow stacking | Users can apply multiple enchantments to one item (e.g., +1 Flaming Sword) |
| **Curse Effects** | ✅ Implement attunement lock | Items with attunement curse cannot be unequipped until curse is lifted |
| **Stat Boost UI** | ✅ Dropdown with bonus level | Select stat type, then select bonus (1-4) from dropdown |

---

## Overview

This plan enhances the ItemsTab to showcase the full capabilities of the playlist-data-engine's equipment system, including:
1. **Enchantment UI** - Apply predefined enchantments to equipped items
2. **Curse System** - Curse items and provide lift curse functionality
3. **Modification Display** - Show enchantment/curse badges on items
4. **Magic Items Loot** - Add magic items as a loot table option
5. **Enhanced Creator Info** - Document additional API options in item creator

---

## Phase 1: Foundation & Research

### 1.1 Create useItemEnchantment Hook
- [x] Create `src/hooks/useItemEnchantment.ts`
- [x] Import `EquipmentModifier`, enchantment/curse libraries from data engine:
  ```typescript
  import {
    EquipmentModifier,
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment
  } from 'playlist-data-engine';
  ```
- [x] Implement `enchantItem()` function
- [x] Implement `curseItem()` function
- [x] Implement `disenchantItem()` function (removes enchantments, keeps curses)
- [x] Implement `liftCurse()` function (removes curses, keeps enchantments)
- [x] Implement `getItemModifications()` function (get all active modifications)
- [x] Implement `isEnchanted()` and `isCursed()` helper functions

### 1.2 Create Enchantment Type Definitions
- [x] Create `src/types/enchantment.ts` if needed
- [x] Define `EnchantmentCategory` type ('weapon' | 'armor' | 'resistance' | 'stat' | 'combo')
- [x] Define `EnchantmentInfo` interface for UI display
- [x] Export enchantment groupings for UI:
  - Weapon enchantments: plusOne/Two/Three, flaming, frost, shock, etc.
  - Armor enchantments: plusOne/Two
  - Resistance enchantments: fire, cold, lightning, etc.
  - Stat enchantments: STR/DEX/CON/INT/WIS/CHA boosts
  - Combo enchantments: holyAvenger, dragonSlayer, etc.

### 1.3 Research Existing Equipment Effects Flow
- [x] Document how `EnhancedInventoryItem.modifications[]` is structured
- [x] Verify `EquipmentEffectApplier` integration for modified items
- [x] Test that modifications persist through equip/unequip cycles

**Research Complete (2026-02-15):**

#### EnhancedInventoryItem.modifications[] Structure
```typescript
interface EnhancedInventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
    modifications?: EquipmentModification[];  // Per-instance modifications
    templateId?: string;                      // Template ID if created from template
    instanceId?: string;                      // Unique instance ID for tracking
}

interface EquipmentModification {
    id: string;                    // Unique modification ID
    name: string;                  // Display name
    properties: EquipmentProperty[];  // Properties added by modification
    addsFeatures?: Array<string | EquipmentMiniFeature>;  // Features granted
    addsSkills?: Array<{ skillId: string; level: 'proficient' | 'expertise'; }>;
    addsSpells?: Array<{ spellId: string; level?: number; uses?: number; recharge?: string; }>;
    appliedAt: string;             // ISO timestamp
    source: string;                // 'enchantment' | 'curse' | 'upgrade' | 'template'
    description?: string;          // User-facing description
}
```

#### EquipmentEffectApplier Integration
- EquipmentEffectApplier does NOT directly read `modifications[]`
- Instead, `EquipmentModifier.enchant/curse/upgrade` handles the integration:
  1. If item is equipped: unequip first (removes old effects)
  2. Add modification to `item.modifications[]`
  3. If was equipped: re-equip with all modifications applied
- Effects are stored in `character.equipment_effects[]` with `instanceId` for per-instance tracking

#### Modification Persistence
- Modifications persist automatically through equip/unequip cycles
- They are stored on the item itself in `character.equipment.weapons/armor/items[].modifications[]`
- When unequipping: only `equipment_effects[]` entry is removed, modifications stay on item
- When re-equipping: effects are recalculated from base properties + all modifications
- `instanceId` links equipment_effects entries to specific item instances

---

## Phase 2: Modification Display UI

### 2.1 Add Modification Badges to Equipment Items
- [x] Update `renderEquipmentItem()` in ItemsTab.tsx
- [x] Show enchantment badges (e.g., "+1", "🔥 Flaming", "❄️ Frost")
- [x] Show curse indicators (e.g., "🔮 Cursed", "⚠️ Attunement")
- [x] Style badges with appropriate colors:
  - Enchantments: Blue/purple gradient
  - Curses: Red/orange warning colors
- [x] Add tooltip showing modification details on hover

### 2.2 Update CSS for Modification Display
- [x] Add `.items-modification-badge` class
- [x] Add `.items-modification-enchantment` variant
- [x] Add `.items-modification-curse` variant
- [x] Add `.items-modification-combo` variant for combo enchantments
- [x] Ensure badges wrap properly on narrow screens

### 2.3 Display Modifications in Item Details
- [x] Show modification list in equipment item expand/collapse
- [x] Display modification source (enchantment/curse/upgrade)
- [x] Show modification properties (stat bonuses, damage bonuses, etc.)

---

## Phase 3: Enchantment Modal UI

### 3.1 Create EnchantmentModal Component
- [x] Create `src/components/modals/EnchantmentModal.tsx`
- [x] Modal receives: `item`, `itemType`, `onEnchant`, `onCurse`, `onClose`
- [x] Use existing Card/Button UI components
- [x] Implement modal overlay with close on backdrop click

**Completed (2026-02-15):**
- Created `src/components/modals/EnchantmentModal.tsx` with full tabbed UI
- Created `src/components/modals/EnchantmentModal.css` with styling
- Modal includes Enchant and Curse tabs
- Supports stat boost enchantments (+1 through +4 for all 6 stats)
- Shows already-applied badges
- Close on backdrop click and escape key
- Includes rarity-based card styling
- Shows curse warnings

### 3.2 Enchantment Selection UI
- [x] Create tabbed interface for enchantment categories:
  - Tab 1: "Enchant" (positive modifications)
  - Tab 2: "Curse" (negative modifications) - only show if item not already cursed
- [x] **Stacking Support:**
  - [x] Allow multiple enchantments on same item (e.g., +1 AND Flaming)
  - [x] Show "Already Applied" badge on enchantments item already has
  - [x] Allow re-applying same enchantment (upgrades stack)
- [x] Group enchantments by type:
  - **Weapon**: Enhancement (+1/+2/+3), Elemental (Flaming/Frost/Shock), Special (Vampiric, Vorpal)
  - **Armor**: Enhancement (+1/+2), Resistances
  - **Items**: Stat bonuses, Skills, Movement
- [x] Display enchantment cards with:
  - Name and icon
  - Description
  - Rarity indicator
  - "Apply" button

### 3.3 Curse Application Flow
- [x] Show warning confirmation before applying curse
- [x] Warning message: "⚠️ This will curse the item! Cursed items may have negative effects."
- [ ] After curse is applied, show "Lift Curse" button (needs integration in ItemsTab)
- [x] Show attunement warning for `CURSES.attunement`
- [x] **Attunement Lock Implementation:**
  - [x] Track attunement curse state on item (check `modifications[]` for attunement curse)
  - [x] Disable "Unequip" button when attunement curse is active (done in ItemsTab)
  - [x] Show locked indicator (🔒 icon) on attunement-cursed items (done in ItemsTab)
  - [x] Add tooltip: "This item is cursed with attunement. Lift the curse to unequip." (done in ItemsTab)
  - [ ] "Lift Curse" button remains enabled to allow removal (needs integration)

### 3.4 Stat Boost Enchantment UI
- [x] Create stat boost section in enchantment modal
- [x] Stat type dropdown: STR, DEX, CON, INT, WIS, CHA (displayed as grouped buttons)
- [x] Bonus level dropdown: +1, +2, +3, +4 (displayed as buttons)
- [x] Show preview of stat boost before applying (shown via button labels)
- [x] Call appropriate `create*Enchantment(bonus)` function

### 3.5 Post-Enchantment Actions
- [ ] Show "Remove Enchantment" button for enchanted items
- [ ] Show "Lift Curse" button for cursed items
- [ ] Show "Disenchant" button (removes enchantments, keeps curses)
- [ ] Confirmation dialog before removing modifications

### 3.6 Create Modal CSS
- [x] Create `src/components/modals/EnchantmentModal.css`
- [x] Style modal overlay and content
- [x] Style enchantment category tabs
- [x] Style enchantment cards
- [x] Style curse warning states

**Completed (2026-02-15):**
- Created comprehensive CSS following StatSelectionModal patterns
- Includes responsive design for mobile
- Rarity-based card styling (common, uncommon, rare, very_rare, legendary)
- Curse-specific styling with red theme
- Stat boost section styling
- Accessibility: reduced motion support

---

## Phase 4: Integrate Enchantment into ItemsTab

### 4.1 Add Enchant Button to Equipment Items
- [ ] Add "Enchant" button to equipped items in `renderEquipmentItem()`
- [ ] Button opens EnchantmentModal with selected item
- [ ] Pass item type to modal for appropriate enchantment filtering
- [ ] Update equipment state after enchantment applied
- [ ] **Attunement Lock Check:**
  - [ ] Check if item has attunement curse before showing unequip button
  - [ ] If attunement curse active, show locked state (🔒 icon, disabled unequip)
  - [ ] Allow "Lift Curse" action even when locked

### 4.2 Wire up useItemEnchantment Hook
- [ ] Import hook in ItemsTab.tsx
- [ ] Connect `enchantItem()` to modal callback
- [ ] Connect `curseItem()` to modal callback
- [ ] Connect `liftCurse()` to modal callback
- [ ] Connect `disenchantItem()` to modal callback
- [ ] Handle success/error states with toasts

### 4.3 Update Equipment Effects Display
- [ ] Show modifications in `renderEquipmentEffects()`
- [ ] Group effects by source (base item vs modification)
- [ ] Highlight enchantment effects with different styling
- [ ] Highlight curse effects with warning styling

---

## Phase 5: Magic Items Loot Option

### 5.1 Add Magic Items Spawn Mode
- [ ] Add "magic" option to `SpawnMode` type
- [ ] Add "Magic Items" button to loot box mode selector
- [ ] Import `MAGIC_ITEMS` and `getMagicItemsByRarity()` from data engine
- [ ] Create `spawnMagicItems()` function in useLootBox hook

### 5.2 Magic Items Loot UI
- [ ] Add rarity filter for magic items
- [ ] Show magic item count in database
- [ ] Display magic items with special styling (sparkle icon)
- [ ] Show item properties (grantsFeatures, grantsSkills, etc.)

### 5.3 Update useLootBox Hook
- [ ] Add `spawnMagicItems(count, rarity?, seed?)` function
- [ ] Filter `MAGIC_ITEMS` by rarity if specified
- [ ] Use SeededRNG for deterministic selection
- [ ] Return `LootBoxResult` with magic items

---

## Phase 6: Enhanced Item Creator Info

### 6.1 Add Informational Text to Creator
- [ ] Add collapsible "Advanced Options" info section
- [ ] List available properties not in UI:
  - `properties[]` - Stat bonuses, skill proficiencies, passive modifiers
  - `grantsFeatures[]` - Feature IDs granted when equipped
  - `grantsSkills[]` - Skill proficiencies granted when equipped
  - `grantsSpells[]` - Spells granted when equipped
  - `tags[]` - Search/filter tags
  - `spawnWeight` - Weight for random loot generation

### 6.2 Add API Example Section
- [ ] Show code example for creating advanced items programmatically
- [ ] Link to EQUIPMENT_SYSTEM.md documentation
- [ ] Mention that full API is available via `playlist-data-engine`

### 6.3 Update Creator Preview
- [ ] Show which properties will be applied
- [ ] Show default values for omitted properties
- [ ] Indicate which fields are advanced/optional

---

## Phase 7: Testing & Polish

### 7.1 Test Enchantment Flow
- [ ] Test applying weapon enchantments
- [ ] Test applying armor enchantments
- [ ] Test applying resistance enchantments
- [ ] Test applying stat boost enchantments
- [ ] Test applying combo enchantments
- [ ] Verify modifications appear in equipment_effects
- [ ] Verify stat changes are applied correctly

### 7.2 Test Curse Flow
- [ ] Test applying curses
- [ ] Test lift curse functionality
- [ ] Test disenchant (removes enchantments, keeps curses)
- [ ] Verify curse warnings display correctly
- [ ] Test attunement curse behavior

### 7.3 Test Magic Items Loot
- [ ] Test spawning random magic items
- [ ] Test spawning magic items by rarity
- [ ] Verify magic items have correct properties
- [ ] Test adding magic items to character

### 7.4 Visual Polish
- [ ] Review badge placement on items
- [ ] Review modal responsiveness
- [ ] Review toast messages
- [ ] Review empty states
- [ ] Review error states

### 7.5 Documentation
- [ ] Update inline comments in code
- [ ] Update hook documentation
- [ ] Update component documentation

---

## Technical Notes

### EquipmentModifier API Reference
```typescript
// Enchant item (positive modification)
EquipmentModifier.enchant(equipment, itemName, modification, character?)

// Curse item (negative modification)
EquipmentModifier.curse(equipment, itemName, modification, character?)

// Upgrade item (improve existing properties)
EquipmentModifier.upgrade(equipment, itemName, modification, character?)

// Remove specific modification
EquipmentModifier.removeModification(equipment, itemName, modificationId, character?)

// Remove all enchantments (keeps curses)
EquipmentModifier.disenchant(equipment, itemName, character?)

// Remove all curses (keeps enchantments)
EquipmentModifier.liftCurse(equipment, itemName, character?)

// Query methods
EquipmentModifier.getCombinedEffects(equipment, itemName, instanceId?)
EquipmentModifier.isEnchanted(equipment, itemName)
EquipmentModifier.isCursed(equipment, itemName)
EquipmentModifier.getItemSummary(equipment, itemName)
```

### Enchantment Collections
- `WEAPON_ENCHANTMENTS` - plusOne, plusTwo, plusThree, flaming, frost, shock, etc.
- `ARMOR_ENCHANTMENTS` - plusOne, plusTwo
- `RESISTANCE_ENCHANTMENTS` - fire, cold, lightning, acid, poison, etc.
- `CURSES` - weakness, attunement, berserker, etc.
- `ALL_ENCHANTMENTS` - holyAvenger, dragonSlayer, demonHunter, undeadBane

### Stat Boost Functions
- `createStrengthEnchantment(bonus: 1|2|3|4)`
- `createDexterityEnchantment(bonus: 1|2|3|4)`
- `createConstitutionEnchantment(bonus: 1|2|3|4)`
- `createIntelligenceEnchantment(bonus: 1|2|3|4)`
- `createWisdomEnchantment(bonus: 1|2|3|4)`
- `createCharismaEnchantment(bonus: 1|2|3|4)`

### Query Functions
- `getEnchantment(id)` - Get enchantment by ID
- `getCurse(id)` - Get curse by ID
- `getAllEnchantments()` - Get all enchantments
- `getAllCurses()` - Get all curses
- `getEnchantmentsByType(type)` - Filter by type

---

## Files to Create/Modify

### New Files
- `src/hooks/useItemEnchantment.ts` - Hook for enchantment operations
- `src/components/modals/EnchantmentModal.tsx` - Enchantment UI modal
- `src/components/modals/EnchantmentModal.css` - Modal styles

### Modified Files
- `src/components/Tabs/ItemsTab.tsx` - Add enchant button, modification display
- `src/components/Tabs/ItemsTab.css` - Badge styles, modal trigger styles
- `src/hooks/useLootBox.ts` - Add magic items spawn mode

---

## Dependencies
- `playlist-data-engine` exports:
  - `EquipmentModifier`
  - `WEAPON_ENCHANTMENTS`, `ARMOR_ENCHANTMENTS`, `RESISTANCE_ENCHANTMENTS`
  - `CURSES`, `ALL_ENCHANTMENTS`
  - `create*Enchantment` functions
  - `getEnchantment`, `getCurse`, `getAllEnchantments`, etc.
  - `MAGIC_ITEMS`, `getMagicItemsByRarity`

---

## Success Criteria
- [ ] Users can enchant equipped items with predefined enchantments
- [ ] Users can curse items (with warning)
- [ ] Users can lift curses from cursed items
- [ ] Modification badges display on items showing active enchantments/curses
- [ ] Magic items are available as a loot option
- [ ] Item creator shows info about additional API options
- [ ] All flows work without errors
- [ ] UI is responsive and accessible
