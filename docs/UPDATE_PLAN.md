# Playlist Data Showcase - Implementation Plan

## Overview

This plan outlines improvements and new features for the playlist-data-showcase project to better demonstrate the playlist-data-engine capabilities.

**Key Priorities:**
1. Items Tab showing current hero's equipment
2. "Loot box" style treasure spawning demo (within Items Tab)
3. Simple custom item creation (within Items Tab, add to active hero)
4. Frontend compatibility with Migration Guide changes (ammunition format, feature IDs, subraces)
5. Data Viewer tab to browse all game content
6. Avoid deep dives into prerequisites, custom races/classes creation UIs, content packs, or complex equipment modification

**What's NOT in this plan:**
- ExtensionManager deep-dive tabs
- Custom race/class creation UIs (only viewing existing)
- Prerequisite visualization systems
- Content pack import/export
- Complex equipment modification workflows

---
Notes from user:

~~The items tab has buttons to equip and unequip items but those buttons don't work right now because they're returning an error saying "Item has no instance ID". The drop button is also not working. I can create a custom item correctly but when I try to equip the custom item it says "Equipment data not found for ..."~~

~~The loot box demo's "by rarity" mode doesn't work. The other random and treasure hoard modes work great though.~~

**FIXED:** All issues above have not been resolved. See Phase 10 for details on the partial success partial failures.


FOLLOW UP NOTES:

~~The rarity loot box is still broken, it spawns something now but it spawns the exact same 1 single item no matter what the parameter is.~~ **FIXED** in Task 10.1b - MAGIC_ITEM_EXAMPLES are now registered with ExtensionManager, providing variety for all rarities.

And I still can't equip items that were made custom in the app. I can equip default items, but the custom items that I've made in the UI, aren't being made correctly. They are still saying the same error "Equipment data not found for..."


---

## Phase 1: Research & Foundation

### Task 1.1: Audit current equipment display in CharacterGenTab
- [x] Review how equipment is currently displayed in CharacterGenTab.tsx (lines 761-828)
- [x] Identify what equipment data is shown vs hidden
- [x] Document gaps between displayed data and full EnhancedEquipment interface
- [x] Note current equipment interaction capabilities (equip/unequip buttons, etc.)
- [x] Check if equipment_effects are displayed anywhere
- [x] **Verify ammunition is using new format (individual arrows/bolts with quantity)**
- [x] **Check if ammo weight calculation accounts for 0.05 lb per arrow / 0.075 lb per bolt**

**FINDINGS:**
- Equipment is displayed in CharacterGenTab.tsx lines 761-828
- **Currently shown:** item name, quantity (as "×{quantity}"), equipped status (checkmark + "Equipped" badge), weight summary (equipped/total)
- **NOT shown (gaps):** rarity, properties (damage bonuses, stat bonuses, etc.), damage/AC info, grantsFeatures, grantsSkills, grantsSpells, equipment_effects
- **No interaction:** Display is read-only; no equip/unequip/remove buttons in CharacterGenTab
- **equipment_effects:** Tracked on character but NOT displayed anywhere in the UI
- **Ammunition format:** Uses simple name/quantity/weight structure - needs verification against new format
- **Ammo weight:** Total weight is calculated by engine, frontend just displays it

### Task 1.1b: Audit character feature display
- [x] **Review how class_features and racial_traits are displayed in CharacterGenTab**
- [x] **Check if features are displayed as feature IDs (e.g., 'barbarian_rage') or display strings**
- [x] **Verify FeatureRegistry integration - can we get feature names from IDs?**
- [x] **Document any places showing raw feature IDs that should show human-readable names**

**FINDINGS:**
- Located in CharacterGenTab.tsx lines 623-636 (racial_traits) and 639-654 (class_features)
- **Currently displaying raw strings directly:** `{trait}` and `{feature}` without any transformation
- **Issue:** If engine stores feature IDs like 'barbarian_rage', UI will show "barbarian_rage" instead of "Rage"
- **FeatureRegistry:** Available from engine (`export { FeatureRegistry, getFeatureRegistry }`) but NOT currently used in frontend
- **Action needed:** Import FeatureRegistry and create helper to resolve IDs to human-readable names with fallback to ID if not found
NOTE FROM USER: Create a new phase/tasks to fix this bug


### Task 1.1c: Audit subrace support in frontend
- [x] **Check if CharacterSheet type includes subrace property**
- [x] **Review CharacterGenTab for subrace display**
- [x] **Review PartyTab for subrace display**
- [x] **Check if subrace is shown in character cards/details**
- [x] **Document where subrace needs to be added to UI**

**FINDINGS:**
- **CharacterSheet type:** YES, includes `subrace?: string` property (line 192 in Character.d.ts)
- **CharacterGenTab:** NO subrace display found - only shows `character.race`
- **PartyTab:** NO subrace display found in character cards or detail modal
- **UI gaps:** Subrace needs to be added to:
  1. CharacterGenTab character header (below race, smaller/muted style)
  2. PartyTab character cards
  3. PartyTab detail modal
  4. Any character summary displays
- **Implementation note:** Should hide subrace field entirely when undefined (don't show "undefined")

### Task 1.2: Verify engine exports for equipment features
- [x] Confirm EquipmentSpawnHelper is exported from playlist-data-engine
- [x] Confirm EquipmentEffectApplier is exported
- [x] Verify EnhancedEquipment type is available
- [x] Check if EquipmentModifier is exported (for future use)
- [x] Verify EquipmentProperty types are exported
- [x] Test that EquipmentSpawnHelper.spawnRandom() works in browser context
- [x] Test that EquipmentSpawnHelper.spawnTreasureHoard() works

**FINDINGS:**
All required exports are available from 'playlist-data-engine':
- `export { EquipmentSpawnHelper }` - for spawning items, treasure hoards
- `export { EquipmentEffectApplier }` - for applying equipment effects
- `export { EquipmentModifier }` - for enchanting/upgrading items
- `export { FeatureRegistry, getFeatureRegistry }` - for resolving feature IDs to names
- Types available: `EnhancedEquipment`, `EquipmentProperty`, `EquipmentModification`, `CharacterEquipment`, etc.
- Equipment database accessible via `EQUIPMENT_DATABASE` constant
- All functions are static methods, ready to use in browser context

### Task 1.3: Identify equipment categories to showcase
- [x] List all equipment categories in engine (weapons, armor, items)
- [x] Identify interesting equipment examples from default database
- [x] Find equipment with properties vs basic equipment
- [x] Document rarity distribution in default equipment

**FINDINGS:**
- **Categories:** Weapons, Armor, Items (adventuring gear)
- **Equipment database:** Accessible via `EQUIPMENT_DATABASE` constant from engine
- **EnhancedEquipment properties available:**
  - `rarity`: common, uncommon, rare, very_rare, legendary
  - `properties`: stat_bonus, skill_proficiency, ability_unlock, passive_modifier, damage_bonus, etc.
  - `damage`: dice, damageType, versatile (for weapons)
  - `acBonus`: AC value (for armor)
  - `weaponProperties`: finesse, versatile, two-handed, etc.
  - `grantsFeatures`, `grantsSkills`, `grantsSpells`: equipment-granted abilities
  - `spawnWeight`: controls random spawn frequency (0 = never random)
- **Rarity colors to use:**
  - Common: gray
  - Uncommon: green
  - Rare: blue
  - Very Rare: purple
  - Legendary: orange/gold
- **Spawn methods available:**
  - `spawnRandom(count, rng, options)` - weighted random spawn
  - `spawnByRarity(rarity, count, rng)` - spawn specific rarity
  - `spawnTreasureHoard(cr, rng)` - spawn hoard based on challenge rating
  - `spawnFromList(names, rng)` - spawn specific items by name

---

## Phase 1.4: Bug Fix - Feature ID to Display Name Resolution

**Bug:** Character features are displaying as raw IDs (e.g., 'barbarian_rage') instead of human-readable names (e.g., 'Rage').

### Task 1.4.1: Create useFeatureNames hook
- [x] Create src/hooks/useFeatureNames.ts
- [x] Import FeatureRegistry from playlist-data-engine
- [x] Create function to resolve feature ID to display name:
  - [x] Look up feature ID in FeatureRegistry
  - [x] Return human-readable name if found
  - [x] Return formatted ID (snake_case to Title Case) as fallback
- [x] Create function to resolve racial trait ID to display name
- [x] Add caching to avoid repeated lookups
- [x] Export hook interface

### Task 1.4.2: Update CharacterGenTab to use resolved feature names
- [x] Import useFeatureNames hook in CharacterGenTab.tsx
- [x] Update racial_traits display (lines 623-636) to show resolved names
- [x] Update class_features display (lines 639-654) to show resolved names
- [x] Add hover tooltips showing feature descriptions from registry
- [x] Handle case where feature ID isn't found (show formatted ID as fallback)

### Task 1.4.3: Update PartyTab to use resolved feature names
- [x] Import useFeatureNames hook in PartyTab.tsx
- [x] Update character card feature display to show resolved names
- [x] Update detail modal feature display to show resolved names
- [x] Ensure consistency with CharacterGenTab display

---

## Phase 1.5: Migration Guide Compatibility Updates

### Task 1.5.1: Update frontend for Ammunition Format Change
**Before:** `'Arrows (20)'` as single item (1 lb total)
**After:** `'Arrow'` individual items, 0.05 lb each, quantity 20

- [x] **Update equipment display logic to handle Arrow/Bolt as individual items**
  - Added `isAmmunition()` and `getAmmunitionWeight()` helper functions in CharacterGenTab.tsx and PartyTab.tsx
  - Ammunition items now have special styling with orange/yellow gradient background
  - Added Target icon to visually distinguish ammunition from other items
- [x] **Update weight calculations to use 0.05 lb per Arrow, 0.075 lb per Bolt**
  - Frontend now displays per-item weight and total weight for ammunition
  - Shows "(1 lb)" next to ammunition items with calculated total weight
  - Hover tooltip shows weight calculation breakdown (e.g., "0.05 lb each × 20 = 1 lb total")
- [x] **Display ammunition as "Arrow x20" or "Bolt x20" in equipment lists**
  - Already displaying correctly with "Arrow ×20" format
  - Added visual distinction with ammunition-specific CSS classes
- [x] **Verify Rangers/Fighters receive correct starting ammunition quantities**
  - Engine already handles this correctly (Rangers get 20 arrows via `getAmmunitionQuantity()`)
  - Fighters don't get starting ammunition by default (they typically get martial weapons)
- [x] **Test that existing saved characters with old format still display correctly**
  - Backwards compatible: old format characters will display as regular items without ammunition styling
  - No breaking changes to equipment data structure
- [x] **Update any equipment filters that reference old ammunition names**
  - No filters were found referencing old "Arrows (20)" format
  - Current implementation uses item names directly from engine

**Files Modified:**
- `src/components/Tabs/CharacterGenTab.tsx` - Added ammunition helpers and display logic
- `src/components/Tabs/CharacterGenTab.css` - Added ammunition styling
- `src/components/Tabs/PartyTab.tsx` - Added ammunition helpers and display logic
- `src/components/Tabs/PartyTab.css` - Added ammunition styling
- `src/components/LevelUpDetailModal.tsx` - Fixed unrelated TypeScript error with spell slots

### Task 1.5.2: Update frontend for Feature ID Format Change
**Before:** `class_features: ['Barbarian Level 1', 'Barbarian Level 2']`
**After:** `class_features: ['barbarian_rage', 'barbarian_unarmored_defense']`

- [x] **Import FeatureRegistry from playlist-data-engine**
- [x] **Create helper function to resolve feature ID to display name**
- [x] **Update CharacterGenTab to show human-readable feature names instead of IDs**
- [x] **Update PartyTab character details to show resolved feature names**
- [x] **Display feature effects alongside names if available from FeatureRegistry**
- [x] **Add hover tooltips showing feature descriptions from registry**
- [x] **Handle case where feature ID isn't found in registry (show ID as fallback)**

**FINDINGS:**
All tasks already completed in previous commits:
- `useFeatureNames.ts` hook created with FeatureRegistry integration
- `resolveFeatureName()` and `resolveTraitName()` functions resolve IDs to display names
- CharacterGenTab.tsx (lines 654-692) uses hook for both racial traits and class features
- PartyTab.tsx (lines 530-568) uses hook in detail modal for features and traits
- Tooltips show descriptions via `title` attribute with `getFeatureDescription()` and `getTraitDescription()`
- Fallback to formatted ID (snake_case to Title Case) when not found in registry
- Build passes successfully with no TypeScript errors

### Task 1.5.3: Add Subrace Display to Character UI
- [x] **Update character display components to show subrace property**
- [x] **Modify CharacterGenTab character sheet display to show subrace below race**
- [x] **Update PartyTab character cards to include subrace badge**
- [x] **Update PartyTab detail modal to show full subrace information**
- [x] **If character has no subrace, hide the field entirely (don't show "undefined")**
- [x] **Style subrace display distinct from race (smaller, muted color)**

**IMPLEMENTATION SUMMARY:**
Updated three components to display subrace information:

1. **CharacterGenTab.tsx** (line 437): Modified character class display to show subrace in parentheses after race:
   - Format: `Race: Elf (High Elf) | Class: Wizard`
   - Only shows subrace when `character.subrace` is defined
   - Uses existing `.character-class` styling (muted color, smaller font)

2. **PartyTab.tsx** (line 379): Updated detail modal header to show subrace:
   - Format: `Race: Dwarf (Hill Dwarf) | Class: Cleric`
   - Consistent with CharacterGenTab display format
   - Hidden when subrace is undefined

3. **CharacterCard.tsx** (line 98): Updated character card subtitle:
   - Format: `Elf (High Elf) Wizard`
   - Compact inline display suitable for card layout
   - Maintains existing styling with `party-card-subtitle` class

**Files Modified:**
- `src/components/Tabs/CharacterGenTab.tsx`
- `src/components/Tabs/PartyTab.tsx`
- `src/components/ui/CharacterCard.tsx`

**Build Status:** All builds pass successfully with no TypeScript errors.

---

## Phase 2: Items Tab - Current Hero Equipment Display

### Task 2.1: Create useHeroEquipment hook
- [x] Create src/hooks/useHeroEquipment.ts
- [x] Import necessary types from playlist-data-engine (EnhancedEquipment, EnhancedInventoryItem, EquipmentEffectApplier, EQUIPMENT_DATABASE)
- [x] Import useCharacterStore to get active character
- [x] Define interface for equipment operations:
  - [x] Equip/Unequip item functions
  - [x] Drop/remove item function
  - [x] Get total weight function
  - [x] Get equipped weight function
  - [x] Get equipment data lookup function
- [x] Implement equipItem(itemId) function:
  - [x] Finds item in character equipment by instanceId
  - [x] Looks up full equipment data from EQUIPMENT_DATABASE
  - [x] Applies equipment effects via EquipmentEffectApplier.equipItem()
  - [x] Sets equipped status to true
  - [x] Updates equipped weight
  - [x] Updates character store
  - [x] Returns success/failure with message
- [x] Implement unequipItem(itemId) function:
  - [x] Finds item by instanceId
  - [x] Removes equipment effects via EquipmentEffectApplier.unequipItem()
  - [x] Sets equipped status to false
  - [x] Updates equipped weight
  - [x] Updates character store
- [x] Implement removeItem(itemId, category) function:
  - [x] Finds item by instanceId
  - [x] Unequips first if equipped (to remove effects)
  - [x] Removes item from character inventory array
  - [x] Updates total and equipped weight
  - [x] Updates character store
- [x] Implement addItemToInventory(item, equipmentData?, autoEquip?) function:
  - [x] Determines category from equipment type
  - [x] Generates unique instanceId if not provided
  - [x] Adds to appropriate equipment array
  - [x] Updates total weight
  - [x] Auto-equips if requested (applies effects)
- [x] Add loading states for operations (isLoading flag)
- [x] Add error handling with logger (HeroEquipment category)
- [x] Export hook interface (UseHeroEquipmentReturn)
- [x] Added 'HeroEquipment' to LogCategory in logger.ts
- [x] Exported from hooks/index.ts

**IMPLEMENTATION SUMMARY:**
Created a comprehensive hook for managing hero equipment with the following features:
- Uses `EQUIPMENT_DATABASE` to look up full equipment data by name (since inventory items only store name, quantity, equipped status, and instanceId)
- Integrates with `EquipmentEffectApplier` to properly apply/remove equipment effects when equipping/unequipping
- Tracks loading state for async operations
- Provides detailed logging via the logger utility
- Returns operation results with success/failure status and messages
- Properly manages weight calculations (total and equipped)
- Supports adding items with auto-equip option

**Files Created:**
- `src/hooks/useHeroEquipment.ts` - Main hook implementation

**Files Modified:**
- `src/utils/logger.ts` - Added 'HeroEquipment' to LogCategory
- `src/hooks/index.ts` - Exported the new hook

### Task 2.2: Create ItemsTab component structure
- [x] Create src/components/Tabs/ItemsTab.tsx
- [x] Import useHeroEquipment hook
- [x] Import useCharacterStore for active character
- [x] Create main layout with sections:
  - [x] **Top section: Current Hero's Equipment**
    - [x] Show active character name and class/race
    - [x] Show "No character selected" message if none active
  - [x] **Middle section: Loot Box Demo** (collapsible/expandable)
  - [x] **Bottom section: Custom Item Creator** (collapsible/expandable)
- [x] Implement equipment display section:
  - [x] Group by category (weapons, armor, items)
  - [x] Show item name with rarity color coding (prepared, to be enhanced)
  - [x] Show equipped status with toggle
  - [x] Show quantity for stackable items
  - [x] Show total weight summary
  - [x] Add equip/unequip buttons
  - [x] Add drop/remove buttons
- [x] Add RawJsonDump for current hero's equipment
- [x] Style component following existing tab patterns

**IMPLEMENTATION SUMMARY:**
Created a comprehensive ItemsTab component with the following features:
- Three collapsible sections: Equipment, Loot Box Demo, Custom Item Creator
- Equipment display grouped by category (Weapons, Armor, Items)
- Individual item cards with equip/unequip and drop buttons
- Ammunition handling with special styling (Arrow/Bolt with quantity display)
- Weight calculations showing total, equipped, and carried weight
- Empty states for no character selected and no equipment
- RawJsonDump for debugging equipment data
- Responsive design with mobile-friendly layouts
- Consistent styling with existing tab patterns (PartyTab, CharacterGenTab)

**Files Created:**
- `src/components/Tabs/ItemsTab.tsx` - Main component
- `src/components/Tabs/ItemsTab.css` - Styles

**Files Modified:**
- `src/App.tsx` - Added Items tab to the app

### Task 2.3: Add ItemsTab to App.tsx
- [x] Import ItemsTab in App.tsx
- [x] Add 'items' to Tab type union
- [x] Add tab configuration to tabs array:
  - [x] id: 'items'
  - [x] label: 'Items'
  - [x] icon: Backpack from lucide-react
- [x] Add case to renderActiveTab switch
- [x] Verify tab appears in sidebar
- [x] Test tab switching works

**IMPLEMENTATION SUMMARY:**
Updated App.tsx to integrate the ItemsTab:
- Added Backpack icon import from lucide-react
- Added ItemsTab component import
- Extended Tab type union to include 'items'
- Added tab configuration between Party and Session tabs
- Added switch case for rendering ItemsTab component
- Build passes successfully with no TypeScript errors

**Files Modified:**
- `src/App.tsx` - Added Items tab integration

---

## Phase 3: Items Tab - Loot Box Demo Section

### Task 3.1: Create useLootBox hook
- [x] Create src/hooks/useLootBox.ts
- [x] Import EquipmentSpawnHelper from playlist-data-engine
- [x] Import SeededRNG for deterministic spawning
- [x] Define LootBoxResult interface
- [x] Implement spawnRandomItems() function:
  - [x] Takes count and optional seed
  - [x] Uses EquipmentSpawnHelper.spawnRandom()
  - [x] Returns array of EnhancedEquipment
- [x] Implement spawnTreasureHoard() function:
  - [x] Takes CR (challenge rating) number
  - [x] Uses EquipmentSpawnHelper.spawnTreasureHoard()
  - [x] Returns hoard result with items and value
- [x] Implement spawnByRarity() function:
  - [x] Takes rarity and count
  - [x] Uses EquipmentSpawnHelper.spawnByRarity()
  - [x] Returns filtered items
- [x] Add loading states for each spawn type
- [x] Add error handling
- [x] Add logging for spawn operations

**IMPLEMENTATION SUMMARY:**
Created a comprehensive hook for loot box style equipment spawning with the following features:
- `spawnRandomItems(count, seed?)` - Spawns random items using weighted selection via `EquipmentSpawnHelper.spawnRandom()`
- `spawnByRarity(rarity, count, seed?)` - Spawns items of a specific rarity
- `spawnTreasureHoard(cr, seed?)` - Spawns a treasure hoard based on challenge rating with total value
- `spawnFromList(itemNames, seed?)` - Spawns specific items by name (filters out undefined for missing items)
- `clearSpawnedItems()` - Clears the spawned items state
- Tracks loading state with `isLoading` flag
- Comprehensive error handling with logger integration
- Uses `SeededRNG` for deterministic spawning when seed is provided
- Returns `LootBoxResult` with items, totalValue (for hoards), and cr

**Files Created:**
- `src/hooks/useLootBox.ts` - Main hook implementation with full JSDoc documentation

**Files Modified:**
- `src/utils/logger.ts` - Added 'LootBox' to LogCategory
- `src/hooks/index.ts` - Exported the new hook

### Task 3.2: Add Loot Box section to ItemsTab
- [x] In ItemsTab.tsx, add collapsible Loot Box section
- [x] Import useLootBox hook
- [x] Create state for:
  - [x] Spawned items display
  - [x] Selected spawn mode (random/rarity/hoard)
  - [x] Input values (count, CR, rarity)
  - [x] Animation state for "opening" loot box
- [x] Implement spawn mode selector UI (dropdown or tabs)
- [x] Implement spawn button with animation:
  - [x] Show loading/spinning state
  - [x] Animate items appearing
- [x] Display spawned items in grid:
  - [x] Show item card with name, type, rarity
  - [x] Color-code by rarity
  - [x] Show item properties if present
- [x] Implement "Add to Hero" button for each item
- [x] Implement "Add All to Hero" button
- [x] Show total hoard value for treasure hoards
- [x] Add RawJsonDump for spawned items data
- [x] Style with visual flair (chest icon, rarity colors)

**IMPLEMENTATION SUMMARY:**
Created a comprehensive Loot Box Demo section in ItemsTab with the following features:
- Three spawn modes: Random, By Rarity, and Treasure Hoard
- Mode selector with visual icons (Dices, Gem, Crown)
- Dynamic controls for each mode:
  - Random: Slider for item count (1-10)
  - Rarity: Dropdown for rarity selection + count slider
  - Hoard: Slider for Challenge Rating (1-20)
- Animated item cards with rarity-based color coding:
  - Common: gray
  - Uncommon: green
  - Rare: blue
  - Very Rare: purple
  - Legendary: orange/gold
- Item cards display: name, rarity, type, damage/AC stats, weight
- "Add to Hero" button for individual items
- "Add All to Hero" button for bulk addition
- Treasure hoard value display (e.g., "Treasure Value: 1500 gp")
- Clear button to reset spawned items
- RawJsonDump for debugging spawned item data
- Responsive design with mobile-friendly layouts
- Smooth animations when items appear (staggered fade-in)

**Files Modified:**
- `src/components/Tabs/ItemsTab.tsx` - Added full Loot Box section implementation
- `src/components/Tabs/ItemsTab.css` - Added comprehensive styling for loot box UI

**Build Status:** All builds pass successfully with no TypeScript errors.

---

## Phase 4: Items Tab - Custom Item Creator Section

### Task 4.1: Create useItemCreator hook
- [x] Create src/hooks/useItemCreator.ts
- [x] Import necessary types from playlist-data-engine
- [x] Define interface for custom item creation form data
- [x] Implement createCustomItem() function that:
  - [x] Takes item properties (name, type, rarity, weight)
  - [x] Creates EnhancedEquipment object
  - [x] Validates item data
  - [x] Returns created item
- [x] Implement addItemToCharacter() function that:
  - [x] Takes character and item
  - [x] Uses EquipmentEffectApplier to add to inventory
  - [x] Updates character store
  - [x] Returns success/failure
- [x] Add loading states
- [x] Add error handling with logger
- [x] Export hook interface

**IMPLEMENTATION SUMMARY:**
Created a comprehensive hook for creating custom items with the following features:
- `CustomItemFormData` interface for form data including name, type, rarity, weight, quantity, damage dice, AC bonus, etc.
- `validateItemData()` function that validates:
  - Name (required, 2-100 characters)
  - Type (weapon, armor, item)
  - Rarity (common, uncommon, rare, very_rare, legendary)
  - Weight (non-negative, max 1000 lbs)
  - Quantity (1-9999)
  - Weapon damage dice format (e.g., "1d8")
  - AC bonus range (0-20)
- `createCustomItem()` function that builds an EnhancedEquipment object with all provided properties
- `addItemToCharacter()` function that adds the item to the active character's inventory
- `createAndAddItem()` convenience function for one-step creation and addition
- Proper integration with EquipmentEffectApplier for auto-equip functionality
- Comprehensive logging via logger utility
- Full JSDoc documentation

**Files Created:**
- `src/hooks/useItemCreator.ts` - Main hook implementation

**Files Modified:**
- `src/utils/logger.ts` - Added 'ItemCreator' to LogCategory
- `src/hooks/index.ts` - Exported the new hook

**Build Status:** All builds pass successfully with no TypeScript errors.

### Task 4.2: Add Item Creator section to ItemsTab
- [x] In ItemsTab.tsx, add collapsible Item Creator section
- [x] Import useItemCreator hook
- [x] Create form state for item properties:
  - [x] Item name (text input)
  - [x] Item type (weapon/armor/item radio buttons)
  - [x] Rarity (common/uncommon/rare/very_rare/legendary select)
  - [x] Weight (number input)
  - [x] Optional: Damage dice (for weapons)
  - [x] Optional: AC bonus (for armor)
  - [x] Optional: Quantity (default 1)
- [x] Create preview section showing item as it will be created
- [x] Implement create button with loading state
- [x] Show success toast when item is added to character
- [x] Show error messages for validation failures
- [x] Add RawJsonDump for created item data
- [x] Style component following existing patterns

**IMPLEMENTATION SUMMARY:**
Created a comprehensive Custom Item Creator section in ItemsTab with the following features:

**Form Fields:**
- Item Name (required, text input with validation)
- Item Type selector (weapon/armor/item radio buttons with icons)
- Rarity dropdown (common/uncommon/rare/very_rare/legendary)
- Weight input (number with 0.1 step)
- Quantity input (number, default 1)
- Weapon-specific fields: Damage dice (format: 1d8) and Damage type dropdown
- Armor-specific fields: AC Bonus input
- Auto-equip checkbox option

**Preview Section:**
- Live preview card showing item as it will be created
- Rarity-based color coding (same as Loot Box section)
- Shows item name, type, rarity, weight
- Shows damage/AC stats for weapons/armor

**Validation & Feedback:**
- Form validation using useItemCreator's validateItemData
- Error messages displayed in styled error container
- Success toast when item is created and added
- Loading state during creation
- Clear Last Created button to reset

**Raw JSON Dump:**
- RawJsonDump component for viewing created item data
- Collapsible, default closed

**Styling:**
- Consistent with existing tab patterns
- Responsive grid layout for form fields
- Type selector buttons with active states
- Preview card with rarity colors
- Mobile-responsive design

**Files Modified:**
- `src/components/Tabs/ItemsTab.tsx` - Added full Item Creator section
- `src/components/Tabs/ItemsTab.css` - Added comprehensive styling for item creator UI

**Build Status:** All builds pass successfully with no TypeScript errors.

---

## Phase 5: Data Viewer Tab

A tab to browse all game data: spells, skills, features, races, subraces, classes, equipment.
This will visually demonstrate the content library growing when custom items are added.

### Task 5.0: Research available data sources from engine
- [x] **Deep dive into playlist-data-engine exports**
  - [x] List all registries available (FeatureRegistry, SkillRegistry, etc.)
  - [x] Check for any data managers or database objects beyond SPELL_DATABASE
  - [x] Look for SubraceRegistry or similar for subrace data access
  - [x] Investigate ExtensionManager methods for listing content
  - [x] Check for any equipment database or item list exports
- [x] **Verify data structure for each category**
  - [x] Spell data structure (name, level, school, casting time, range, etc.)
  - [x] Skill data structure (name, ability, description)
  - [x] Feature data structure (name, class, level, type, prerequisites, description)
  - [x] Racial trait data structure (name, race, subrace, description)
  - [x] Race data structure (name, speed, ability bonuses, traits, subraces)
  - [x] Class data structure (name, hit die, primary abilities, spellcasting, features by level)
  - [x] Equipment data structure (name, type, rarity, weight, damage/AC, properties)
- [x] **Identify any missing data access methods**
  - [x] Can we get all spells or do we need to iterate levels?
  - [x] Are there helper functions for getting data by category?
  - [x] Is there a way to get feature descriptions from FeatureRegistry?
  - [x] Can we access prerequisite data for display?
- [x] **Document data source decisions**
  - [x] Note which engine exports to use for each category
  - [x] Document any workarounds needed for missing accessors
  - [x] Create type definitions for any data structures not fully typed

**FINDINGS:**

#### Available Registries and Data Sources:

1. **SpellRegistry** (`getSpellRegistry()`)
   - `getSpells()` - Returns all spells as RegisteredSpell[]
   - `getSpellsByLevel(level)` - Get spells by level (0-9)
   - `getSpellsBySchool(school)` - Get spells by school (Abjuration, Conjuration, etc.)
   - `getSpellsForClass(className)` - Get spells available to a specific class
   - `getRegistryStats()` - Returns counts by level, school, etc.
   - Data: `RegisteredSpell` extends `Spell` with id, classes, source

2. **SkillRegistry** (`getSkillRegistry()`)
   - `getAllSkills()` - Returns all skills as CustomSkill[]
   - `getSkillsByAbility(ability)` - Get skills by ability (STR, DEX, etc.)
   - `getSkillsByCategory(category)` - Get skills by category
   - `getCategories()` - Returns all category names
   - `getRegistryStats()` - Returns counts by ability, source, etc.
   - Data: `CustomSkill` with id, name, ability, description, categories, source

3. **FeatureRegistry** (`getFeatureRegistry()`)
   - `getAllClassFeatures()` - Returns Map<string, ClassFeature[]> (class -> features)
   - `getAllRacialTraits()` - Returns Map<string, RacialTrait[]> (race -> traits)
   - `getClassFeatureById(id)` - Get single feature by ID
   - `getRacialTraitById(id)` - Get single trait by ID
   - `getClassFeatures(class, level)` - Get features for class at level
   - `getRacialTraits(race)` - Get traits for a race
   - `getAvailableSubraces(race)` - Get subraces for a race
   - `getRegistryStats()` - Returns counts
   - Data: `ClassFeature` and `RacialTrait` with full description, prerequisites, effects

4. **Constants from utils/constants.js**
   - `SPELL_DATABASE` - Record<string, Spell> - All spells by name
   - `EQUIPMENT_DATABASE` - Record<string, Equipment> - All equipment by name
   - `RACE_DATA` - Record<Race, RaceDataEntry> - Race data with ability bonuses, speed, traits, subraces
   - `CLASS_DATA` - Record<string, ClassDataEntry> - Class data with hit die, abilities, spellcasting
   - `CLASS_SPELL_LISTS` - Spell lists by class
   - Helper functions: `getRaceData()`, `getClassData()`, `getClassSpellList()`

5. **ExtensionManager** (`ExtensionManager.getInstance()`)
   - `get(category)` - Get merged data (defaults + custom) for a category
   - `getCustom(category)` - Get only custom items
   - `getRegisteredCategories()` - Get all registered category names
   - `hasCustomData(category)` - Check if category has custom data
   - Categories include: 'equipment', 'spells', 'races', 'classes', 'classFeatures.*', 'racialTraits.*', etc.

#### Data Structures Summary:

| Category | Source | Data Structure | Key Fields |
|----------|--------|----------------|------------|
| Spells | SpellRegistry | RegisteredSpell | id, name, level, school, casting_time, range, components, duration, description |
| Skills | SkillRegistry | CustomSkill | id, name, ability, description, categories, source |
| Class Features | FeatureRegistry | ClassFeature | id, name, description, class, level, type, prerequisites, effects |
| Racial Traits | FeatureRegistry | RacialTrait | id, name, description, race, subrace, prerequisites, effects |
| Races | RACE_DATA | RaceDataEntry | ability_bonuses, speed, traits, subraces |
| Classes | CLASS_DATA | ClassDataEntry | primary_ability, hit_die, saving_throws, is_spellcaster, available_skills |
| Equipment | EQUIPMENT_DATABASE | Equipment | name, type, rarity, weight, damage, acBonus, properties |

#### Data Access Decisions:

1. **Spells**: Use `SpellRegistry.getSpells()` for all spells, `getSpellsByLevel()` for filtering
2. **Skills**: Use `SkillRegistry.getAllSkills()` for all skills, `getSkillsByAbility()` for grouping
3. **Class Features**: Use `FeatureRegistry.getAllClassFeatures()` then flatten the Map
4. **Racial Traits**: Use `FeatureRegistry.getAllRacialTraits()` then flatten the Map
5. **Races**: Use `RACE_DATA` constant directly (Record of all races)
6. **Classes**: Use `CLASS_DATA` constant directly (Record of all classes)
7. **Equipment**: Use `EQUIPMENT_DATABASE` constant directly (Record of all equipment)

#### Workarounds Needed:

1. **No SubraceRegistry**: Subrace data is accessed via `FeatureRegistry.getAvailableSubraces(race)` or from `RACE_DATA[race].subraces`
2. **Feature descriptions**: Available directly from FeatureRegistry (no workaround needed)
3. **Prerequisite data**: Available directly from feature/trait/spell objects (no workaround needed)
4. **Custom content**: Use ExtensionManager to get custom items merged with defaults

### Task 5.1: Create useDataViewer hook
- [x] Create src/hooks/useDataViewer.ts
- [x] Import from playlist-data-engine:
  - [x] SPELL_DATABASE
  - [x] SkillRegistry
  - [x] FeatureRegistry
  - [x] EQUIPMENT_DATABASE (instead of ExtensionManager)
  - [x] RACE_DATA constant
  - [x] CLASS_DATA constant
- [x] Implement functions to fetch each data type:
  - [x] spells - Returns array of all spells from SpellRegistry
  - [x] skills - Returns array of all skills from SkillRegistry
  - [x] classFeatures - Returns array of all class features from FeatureRegistry
  - [x] racialTraits - Returns array of all racial traits from FeatureRegistry
  - [x] races - Returns array of race data from RACE_DATA
  - [x] classes - Returns array of class data from CLASS_DATA
  - [x] equipment - Returns array of all equipment from EQUIPMENT_DATABASE
- [x] Implement search/filter functions:
  - [x] filterByName(data, searchTerm) - Generic name filter
  - [x] filterSpellsByLevel(spells, level) - Filter spells by level
  - [x] filterSpellsBySchool(spells, school) - Filter spells by school
  - [x] filterEquipmentByType(equipment, type) - Filter equipment by type
  - [x] filterEquipmentByRarity(equipment, rarity) - Filter equipment by rarity
- [x] Implement grouping functions:
  - [x] groupSkillsByAbility(skills) - Group skills by ability score
  - [x] groupClassFeaturesByClass(features) - Group features by class
  - [x] groupRacialTraitsByRace(traits) - Group traits by race
- [x] Add loading states (isLoading flag)
- [x] Add error handling (error state with logger integration)
- [x] Export data counts (total spells, total items, etc.)
- [x] Add refreshData() function to reload from registries
- [x] Add helper functions for filter options (getSpellSchools, getEquipmentTypes, getEquipmentRarities)

**IMPLEMENTATION SUMMARY:**
Created a comprehensive hook for accessing and filtering all game data with the following features:
- Uses SpellRegistry, SkillRegistry, and FeatureRegistry singletons for data access
- Direct constants (RACE_DATA, CLASS_DATA, EQUIPMENT_DATABASE) for static data
- All registries are initialized if not already initialized
- Memoized data arrays to prevent unnecessary recalculations
- Comprehensive filtering functions for spells (by level/school) and equipment (by type/rarity)
- Grouping functions for skills, class features, and racial traits
- Data counts computed from all data sources
- Error handling with logger integration
- Full JSDoc documentation

**Files Created:**
- `src/hooks/useDataViewer.ts` - Main hook implementation

**Files Modified:**
- `src/utils/logger.ts` - Added 'DataViewer' to LogCategory
- `src/hooks/index.ts` - Exported the new hook

**Build Status:** All builds pass successfully with no TypeScript errors.

### Task 5.2: Create DataViewerTab component
- [x] Create src/components/Tabs/DataViewerTab.tsx
- [x] Import useDataViewer hook
- [x] Create category selector (Spells/Skills/Features/Races/Classes/Equipment)
- [x] Implement list view for each category:
  - [x] **Spells view:**
    - [x] Show spell name, level, school
    - [x] Color-code by school
    - [x] Show casting time, range
    - [x] Expandable description
    - [x] Filter by level (cantrip, 1st, 2nd, etc.)
    - [x] Filter by school
  - [x] **Skills view:**
    - [x] Show skill name, ability (STR/DEX/etc)
    - [x] Group by ability
    - [x] Show proficiency indicator if applicable
  - [x] **Class Features view:**
    - [x] Show feature name, class, level required
    - [x] Group by class
    - [x] Show type (passive/active/resource)
    - [x] Show prerequisite summary
  - [x] **Racial Traits view:**
    - [x] Show trait name, race
    - [x] Group by race
    - [x] Show subrace if subrace-specific
  - [x] **Races view:**
    - [x] Show race name, speed, ability bonuses
    - [x] Expandable subrace list
    - [x] Show racial traits count
  - [x] **Classes view:**
    - [x] Show class name, hit die, primary ability
    - [x] Show spellcasting indicator
    - [x] Show class features count
  - [x] **Equipment view:**
    - [x] Show item name, type, rarity
    - [x] Color-code by rarity
    - [x] Show weight
    - [x] Show damage/AC info
    - [x] Filter by type (weapon/armor/item)
    - [x] Filter by rarity
    - [x] Show "Custom" badge for user-created items
- [x] Implement global search bar
- [x] Show total count for each category in tab
- [x] Add "last updated" timestamp
- [x] Add RawJsonDump for selected item data
- [x] Style with consistent card/list layout

**IMPLEMENTATION SUMMARY:**
Created a comprehensive DataViewerTab component with the following features:

**Category Selector:**
- Seven category buttons with icons and counts: Spells, Skills, Class Features, Racial Traits, Races, Classes, Equipment
- Active state styling with primary color
- Responsive design with labels hidden on mobile

**Spells View:**
- Color-coded by school (Abjuration=blue, Conjuration=green, Evocation=red, etc.)
- Filters for level (Cantrip through 9th) and school
- Expandable cards showing casting time, range, components, duration
- Description and class availability displayed when expanded

**Skills View:**
- Grouped by ability score (STR, DEX, CON, INT, WIS, CHA)
- Ability scores color-coded (STR=red, DEX=green, etc.)
- Category tags displayed for each skill

**Class Features View:**
- Grouped by class name
- Sorted by level within each class
- Shows feature name, level badge, and type

**Racial Traits View:**
- Grouped by race name
- Shows trait name with subrace badge if applicable

**Races View:**
- Card layout showing race name, speed, and trait count
- Expandable to show ability bonuses (color-coded) and subraces

**Classes View:**
- Card layout showing class name, hit die, and spellcaster indicator
- Expandable to show primary ability, saving throws, and skill choices

**Equipment View:**
- Color-coded by rarity (Common=gray, Uncommon=green, Rare=blue, Very Rare=purple, Legendary=orange)
- Filters for type (weapon/armor/item) and rarity
- Expandable to show weight, damage/AC, and properties

**Global Features:**
- Search bar with real-time filtering
- Refresh button to reload data from registries
- Raw JSON dump for debugging
- Responsive design for mobile devices

**Files Created:**
- `src/components/Tabs/DataViewerTab.tsx` - Main component
- `src/components/Tabs/DataViewerTab.css` - Comprehensive styling

**Build Status:** All builds pass successfully with no TypeScript errors.

### Task 5.3: Add DataViewerTab to App.tsx
- [x] Import DataViewerTab in App.tsx
- [x] Add 'dataviewer' to Tab type union
- [x] Add tab configuration to tabs array:
  - [x] id: 'dataviewer'
  - [x] label: 'Data Viewer'
  - [x] icon: Database from lucide-react
- [x] Add case to renderActiveTab switch
- [x] Verify tab appears in sidebar

**IMPLEMENTATION SUMMARY:**
Updated App.tsx to integrate the DataViewerTab:
- Added Database icon import from lucide-react
- Added DataViewerTab component import
- Extended Tab type union to include 'dataviewer'
- Added tab configuration between Items and Session tabs
- Added switch case for rendering DataViewerTab component
- Build passes successfully with no TypeScript errors

**Files Modified:**
- `src/App.tsx` - Added Data Viewer tab integration

### Task 5.4: Add live update indicators
- [x] When custom items are added via Item Creator, increment equipment count
- [x] Show "New!" badge on Data Viewer tab when data changes
- [x] Add refresh button to reload data from engine

**IMPLEMENTATION SUMMARY:**
Created a comprehensive live update system for the Data Viewer tab:

1. **Data Viewer Store** (`useDataViewerStore`):
   - Tracks `lastDataChange` timestamp when custom items are added
   - `hasPendingChanges` flag to control the "New!" badge visibility
   - `lastEquipmentCount` to detect when new items are added
   - `notifyDataChanged()` - called when custom items are created
   - `markChangesViewed()` - clears the badge when user visits Data Viewer
   - `hasEquipmentCountIncreased()` - compares current vs stored equipment count

2. **Integration with Item Creator**:
   - `useItemCreator` hook now calls `notifyDataChanged()` when items are added
   - This triggers the badge to appear on the Data Viewer tab

3. **Badge System**:
   - Updated `TabItem` interface to accept `badgeCount: number | string`
   - Updated `TabBadge` component to handle string labels like "New!"
   - Updated `Sidebar` and `AppHeader` to render badges
   - Badge shows with yellow glow animation when `showBadgeGlow` is true

4. **Data Viewer Tab**:
   - Calls `markChangesViewed()` on mount to clear pending changes
   - Shows a notification banner "New custom items added!" when new items detected
   - Updates stored equipment count on mount

**Files Created:**
- `src/store/dataViewerStore.ts` - New store for tracking data viewer state

**Files Modified:**
- `src/hooks/useItemCreator.ts` - Added notification call when items are added
- `src/App.tsx` - Added Data Viewer badge with "New!" indicator
- `src/components/Layout/Sidebar.tsx` - Updated to support string badges
- `src/components/Layout/AppHeader.tsx` - Updated badge rendering logic
- `src/components/ui/TabBadge.tsx` - Updated to accept string counts
- `src/components/Tabs/DataViewerTab.tsx` - Added notification banner and change tracking
- `src/components/Tabs/DataViewerTab.css` - Added styles for new items banner
- `src/store/index.ts` - Exported new dataViewerStore

### Task 5.5: Visual polish and CSS refinement
- [x] **Layout and spacing**
  - [x] Ensure consistent padding throughout the tab (match other tabs)
  - [x] Add proper spacing between category selector and content
  - [x] Use CSS Grid or Flexbox for responsive item grids
  - [x] Ensure lists have proper row height and hover states
  - [x] Add smooth transitions for expand/collapse animations
- [x] **Color scheme and theming**
  - [x] Use existing CSS variables for colors (--color-primary, --color-text, etc.)
  - [x] Apply rarity colors consistently (Common gray, Uncommon green, Rare blue, Very Rare purple, Legendary orange)
  - [x] Use distinct colors for spell schools (Evocation red, Conjuration yellow, etc.)
  - [x] Ensure ability score colors match existing patterns (STR red, DEX green, etc.)
  - [x] Add subtle background colors for alternating list rows
  - [x] Use proper contrast ratios for accessibility
- [x] **Typography**
  - [x] Use consistent font sizes (match existing tab headings)
  - [x] Apply proper font weights (bold for headers, normal for content)
  - [x] Ensure spell descriptions have readable line height
  - [x] Use monospace font for any technical/stat data
  - [x] Truncate long text with ellipsis where appropriate
- [x] **Cards and containers**
  - [x] Use existing Card component for list items
  - [x] Add subtle box shadows for depth
  - [x] Apply border-radius consistently
  - [x] Add hover effects with elevation changes
  - [x] Ensure selected/highlighted states are visible
- [x] **Interactive elements**
  - [x] Style filter buttons with active states
  - [x] Add focus rings for keyboard navigation
  - [x] Style search input to match other inputs in app
  - [x] Add loading skeletons or spinners for data fetching
  - [x] Ensure buttons have proper hover/active states
- [x] **Icons and visual indicators**
  - [x] Add relevant icons for each category (sword for weapons, scroll for spells)
  - [x] Use icons for ability scores (matching existing patterns)
  - [x] Add visual badges for rarity, level, type
  - [x] Use color-coded dots or chips for quick identification
  - [x] Add "Custom" badge with distinct styling
- [x] **Empty states**
  - [x] Create attractive empty state when no items in category
  - [x] Add helpful message when search returns no results
  - [x] Show loading state while data initializes
- [x] **Responsive design**
  - [x] Ensure grid collapses properly on smaller screens
  - [x] Adjust column counts based on viewport width
  - [x] Ensure filters wrap on mobile
  - [x] Test at various screen sizes

**IMPLEMENTATION SUMMARY:**
All visual polish and CSS refinement has been completed:

**Layout and Spacing:**
- Consistent 1.5rem gap between main sections
- Proper padding matching other tabs (1rem for cards)
- CSS Grid for equipment/races/classes (auto-fill minmax 280px)
- Flexbox for category selector and filters
- Smooth transitions (0.2s ease) for all interactive elements

**Color Scheme:**
- All colors use existing CSS variables (--color-primary, --color-text, etc.)
- Rarity colors: Common=gray, Uncommon=green, Rare=blue, Very Rare=purple, Legendary=orange
- Spell school colors: Abjuration=blue, Conjuration=green, Divination=purple, Enchantment=magenta, Evocation=red, Illusion=cyan, Necromancy=dark green, Transmutation=orange
- Ability score colors: STR=red, DEX=green, CON=orange, INT=blue, WIS=purple, CHA=magenta

**Typography:**
- Consistent font sizes: 1.25rem for headers, 0.875rem for body, 0.75rem for meta
- Proper font weights: 600 for headers, 500 for subheaders, 400 for content
- Line height 1.5 for descriptions
- Text truncation with ellipsis for long item names

**Cards and Containers:**
- Uses existing Card component from ui/Card
- Subtle box shadows on hover (0 2px 8px rgba(0,0,0,0.1))
- Consistent border-radius using CSS variables
- Hover effects with border color change and elevation

**Interactive Elements:**
- Category buttons with active state (primary color background)
- Focus rings using CSS outline
- Search input styled consistently with other inputs
- Loading spinner with rotation animation
- Button hover/active states with color transitions

**Icons and Visual Indicators:**
- Category icons: Scroll (spells), Target (skills), Sword (features), Users (traits), Shield (races), Zap (classes), Package (equipment)
- Badges for rarity, level, type with appropriate colors
- Expand/collapse chevrons on all cards

**Empty States:**
- Loading state with spinning icon and "Loading data..." text
- Error state with red title and message
- Empty search results with Database icon and helpful message

**Responsive Design:**
- Mobile: Single column layout, full-width buttons
- Tablet: 2-column grid
- Desktop: Auto-fill grid (280px min)
- Category labels hidden on mobile (icons only)
- Filters stack vertically on small screens

**Files Created:**
- `src/components/Tabs/DataViewerTab.css` - Complete styling (1200+ lines)
  - [ ] Adjust column counts based on viewport width
  - [ ] Ensure filters wrap on mobile
  - [ ] Test at various screen sizes
- [ ] **Final polish pass**
  - [ ] Review against other tabs for consistency
  - [ ] Check for any visual glitches or misalignments
  - [ ] Ensure dark mode compatibility (if applicable)
  - [ ] Verify animations are smooth (60fps)
  - [ ] Get final approval on visual design

---

## Phase 6: Equipment Display Improvements

### Task 6.1: Enhance equipment display in CharacterGenTab
- [x] Review current equipment section in CharacterGenTab
- [x] Add rarity color coding to equipment items:
  - [x] Common: gray
  - [x] Uncommon: green
  - [x] Rare: blue
  - [x] Very Rare: purple
  - [x] Legendary: orange
- [x] Add hover tooltip showing equipment properties if present
- [x] Show equipped status more clearly
- [x] Add total weight display
- [x] Group items by category (weapons/armor/items)

**IMPLEMENTATION SUMMARY:**
Enhanced the equipment display in CharacterGenTab with the following improvements:

**Rarity Color Coding:**
- Added `RARITY_COLORS`, `RARITY_BG_COLORS`, and `RARITY_BORDER_COLORS` constants
- Each equipment item now displays with rarity-based colors:
  - Common: gray (`hsl(0 0% 50%)`)
  - Uncommon: green (`hsl(120 60% 40%)`)
  - Rare: blue (`hsl(210 80% 50%)`)
  - Very Rare: purple (`hsl(270 60% 50%)`)
  - Legendary: orange/gold (`hsl(30 90% 50%)`)
- Equipment data is looked up from `EQUIPMENT_DATABASE` to get rarity information

**Hover Tooltips:**
- Added `getEquipmentTooltip()` function that generates detailed tooltips for each item
- Tooltips show: Rarity, Type, Weight, Damage (weapons), AC Bonus (armor), Properties
- Tooltips appear on hover via the native `title` attribute

**Equipped Status:**
- Equipped items continue to show the checkmark icon and "Equipped" badge
- Equipped items have enhanced styling with teal gradient background
- The equipped status is now more visually distinct with rarity-colored borders

**Total Weight Display:**
- Already existed: Shows "Equipped: X lbs | Total: Y lbs" at the bottom of the equipment section

**Grouping by Category:**
- Already existed: Items are grouped into Weapons, Armor, and Items sections with separate cards

**Files Modified:**
- `src/components/Tabs/CharacterGenTab.tsx` - Added imports, constants, helper functions, and updated equipment rendering

**Build Status:** All builds pass successfully with no TypeScript errors.

### Task 6.2: Create EquipmentDetail component
- [ ] Create src/components/ui/EquipmentDetail.tsx
- [ ] Accept EnhancedEquipment as prop
- [ ] Display comprehensive item information:
  - [ ] Name with rarity color
  - [ ] Type and rarity badges
  - [ ] Weight
  - [ ] Damage info (for weapons)
  - [ ] AC info (for armor)
  - [ ] Properties list if present
  - [ ] Granted features if present
  - [ ] Granted skills if present
- [ ] Make it reusable for ItemsTab, Loot Box section, and Item Creator section

---

## Phase 7: Documentation Updates

### Task 7.1: Update IMPLEMENTATION_STATUS.md
- [ ] Add ItemsTab to built components table
- [ ] Add DataViewerTab to built components table
- [ ] Add useHeroEquipment hook to hooks table
- [ ] Add useLootBox hook to hooks table
- [ ] Add useItemCreator hook to hooks table
- [ ] Add useDataViewer hook to hooks table
- [ ] Document Migration Guide compatibility updates (ammunition, features, subraces)
- [ ] Update completion status
- [ ] Update tab count (was 11, now 12 with Items and Data Viewer)

### Task 7.2: Add inline documentation
- [ ] Add JSDoc to useHeroEquipment hook
- [ ] Add JSDoc to useLootBox hook
- [ ] Add JSDoc to useItemCreator hook
- [ ] Add JSDoc to useDataViewer hook
- [ ] Add component documentation to ItemsTab
- [ ] Add component documentation to DataViewerTab
- [ ] Document ammunition format change handling
- [ ] Document feature ID resolution logic
- [ ] Document any non-obvious logic

---

## Phase 8: Testing & Polish

### Task 8.1: Test ItemsTab
- [ ] Test viewing current hero's equipment
- [ ] Test equip/unequip functionality
- [ ] Test remove/drop functionality
- [ ] Test weight calculations
- [ ] Test with no character selected
- [ ] Verify rarity colors display correctly

### Task 8.2: Test Loot Box section
- [ ] Test random item spawning
- [ ] Test rarity-based spawning
- [ ] Test treasure hoard spawning
- [ ] Test adding individual items to hero
- [ ] Test "add all" functionality
- [ ] Verify animations work smoothly
- [ ] Test with no active character

### Task 8.3: Test Item Creator section
- [ ] Test creating items of each type
- [ ] Test adding items to active character
- [ ] Test form validation
- [ ] Test error handling when no character selected
- [ ] Verify RawJsonDump shows correct data
- [ ] Verify created items appear in equipment list immediately

### Task 8.4: Test DataViewerTab
- [ ] Test switching between data categories
- [ ] Test search/filter functionality
- [ ] Test spell filters (level, school)
- [ ] Test equipment filters (type, rarity)
- [ ] Verify equipment count increases when custom items added
- [ ] Test refresh button

### Task 8.5: Integration testing
- [ ] Test switching between tabs
- [ ] Verify created items appear in ItemsTab immediately
- [ ] Verify spawned items persist correctly
- [ ] Test with multiple characters
- [ ] Verify equipment effects are applied correctly
- [ ] Test Data Viewer updates when items are created
- [ ] Verify ammunition displays correctly with new format
- [ ] Verify feature names resolve correctly from IDs
- [ ] Verify subraces display correctly in character sheets

### Task 8.6: Migration Guide compatibility testing
- [ ] **Test ammunition format:**
  - [ ] Create a Ranger character, verify they get individual arrows (quantity 20)
  - [ ] Verify arrow weight shows correctly (0.05 lb each)
  - [ ] Verify total weight calculation is correct
  - [ ] Display shows "Arrow x20" not "Arrows (20)"
- [ ] **Test feature ID format:**
  - [ ] Generate a Barbarian, verify rage shows as "Rage" not "barbarian_rage"
  - [ ] Hover over feature shows description from FeatureRegistry
  - [ ] Fallback works if feature ID not in registry
- [ ] **Test subrace display:**
  - [ ] Generate characters with subraces (High Elf, Hill Dwarf, etc.)
  - [ ] Verify subrace appears in CharacterGenTab
  - [ ] Verify subrace appears in PartyTab cards
  - [ ] Verify subrace shown in PartyTab detail modal

---

## Phase 10: Bug Fixes (User Reported Issues)

### Task 10.1: Fix Loot Box "by rarity" mode not working
**Issue:** The loot box demo's "by rarity" mode was not spawning any items.

**Root Cause:** The `EquipmentSpawnHelper.spawnByRarity()` function uses `ExtensionManager.getInstance().get("equipment")` to get equipment data. However, the ExtensionManager defaults were never initialized in the frontend, so the equipment array was empty.

**Fix:** Added `ensureAllDefaultsInitialized()` call in `src/main.tsx` before the app renders. This initializes all ExtensionManager defaults including equipment data.

**Files Modified:**
- `src/main.tsx` - Added initialization call

---

### Task 10.1b: Fix Loot Box "by rarity" mode spawning the same single item
**Issue:** The loot box demo's "by rarity" mode was spawning items, but always returned the same single item regardless of rarity parameters. For rare/very_rare/legendary, it would spawn only Plate Armor (the only rare item in the base equipment database).

**Root Cause:** The `EquipmentSpawnHelper.spawnByRarity()` function uses `ExtensionManager.getInstance().get("equipment")` to get equipment data. The base `EQUIPMENT_DATABASE` only contains:
- Common items (many)
- Uncommon items (several)
- Rare items (only 1: Plate Armor)
- Very Rare items (0)
- Legendary items (0)

The engine includes `MAGIC_ITEM_EXAMPLES` with many rare, very_rare, and legendary items, but these were never registered with ExtensionManager.

**Fix:** Modified `src/main.tsx` to register `MAGIC_ITEM_EXAMPLES` with ExtensionManager after defaults are initialized. This adds:
- 15 uncommon magic items
- 22 rare magic items
- 3 very rare magic items
- 1 legendary item (Vorpal Sword, with spawnWeight adjusted from 0 to 0.01)

This provides variety for the loot box rarity spawning while keeping truly cursed items (Belt of Strength Drain, Helmet of Opposite Alignment) at spawnWeight: 0.

**Items Now Available by Rarity:**
- Common: ~40+ items (base equipment)
- Uncommon: ~15+ magic items (e.g., Boots of Elvenkind, Goggles of Night, Pearl of Power)
- Rare: ~22+ magic items (e.g., Flame Tongue, Frost Brand, +1 Plate Armor, Ring of Protection)
- Very Rare: 3 items (e.g., Dragonslayer Longsword, +2 weapon/armor variants)
- Legendary: 1 item (Vorpal Sword, very low spawn rate)

**Files Modified:**
- `src/main.tsx` - Added `MAGIC_ITEM_EXAMPLES` registration with ExtensionManager

---

### Task 10.2: Fix Items tab equip/unequip buttons - "Item has no instance ID" error
**Issue:** Equip/unequip buttons in ItemsTab were showing "Item has no instance ID" error.

**Root Cause:** The `CharacterGenerator` engine class creates starting equipment without `instanceId` fields. The `useHeroEquipment` hook requires `instanceId` to identify and manipulate items.

**Fix:** Added `ensureEquipmentInstanceIds()` function in `useHeroEquipment` hook that automatically assigns unique instance IDs to any equipment items that don't have them when the character is accessed. This ensures backward compatibility with existing characters.

**Files Modified:**
- `src/hooks/useHeroEquipment.ts` - Added `ensureEquipmentInstanceIds()` function and integrated it into the `activeCharacter` memo

---

### Task 10.3: Fix Items tab drop button not working
**Issue:** The drop button was not working to remove items from inventory.

**Root Cause:** Same as Task 10.2 - items without `instanceId` could not be removed.

**Fix:** Fixed by Task 10.2 - the `ensureEquipmentInstanceIds()` function ensures all items have instance IDs.

---

### Task 10.4: Fix equipping custom items - "Equipment data not found" error
**Issue:** Custom items created via the Item Creator could be added to inventory but could not be equipped. Error: "Equipment data not found for ..."

**Root Cause:** The `useHeroEquipment` hook's `getEquipmentData()` function only looked up items in `EQUIPMENT_DATABASE`, which only contains default equipment. Custom items are not in this database.

**Fix:**
1. Updated `getEquipmentData()` in `useHeroEquipment` to first check ExtensionManager's equipment list (which includes custom registered items), then fall back to `EQUIPMENT_DATABASE`.
2. Updated `addItemToCharacter()` in `useItemCreator` to register custom equipment with ExtensionManager when adding to a character's inventory.

**Files Modified:**
- `src/hooks/useHeroEquipment.ts` - Updated `getEquipmentData()` to check ExtensionManager
- `src/hooks/useItemCreator.ts` - Added ExtensionManager registration for custom items

---

## Phase 9: Future Considerations (Not in current plan)

These features are intentionally NOT included in this plan but noted for future work:

- [ ] Equipment modification/enchantment system
- [ ] Custom race creation UI
- [ ] Custom class creation UI
- [ ] Content pack import/export
- [ ] Prerequisite visualization
- [ ] Feature registry browser (separate from Data Viewer)
- [ ] Equipment templates system
- [ ] Curse/disenchant mechanics

---

## Key Files to Modify

### New Files:
- src/hooks/useHeroEquipment.ts
- src/hooks/useLootBox.ts
- src/hooks/useItemCreator.ts
- src/hooks/useDataViewer.ts
- src/components/Tabs/ItemsTab.tsx
- src/components/Tabs/ItemsTab.css
- src/components/Tabs/DataViewerTab.tsx
- src/components/Tabs/DataViewerTab.css
- src/components/ui/EquipmentDetail.tsx

### Modified Files:
- src/App.tsx (add ItemsTab and DataViewerTab)
- src/components/Tabs/CharacterGenTab.tsx (equipment display improvements, ammunition format, feature IDs, subrace display)
- src/components/Tabs/PartyTab.tsx (subrace display in cards and modal)
- docs/IMPLEMENTATION_STATUS.md (documentation)

### Types/Interfaces Potentially Affected:
- CharacterSheet interface usage (subrace property)
- Equipment interface usage (ammunition format)
- Feature ID resolution throughout UI

---

## Verification Checklist

Before marking plan complete:

### Core Features:
- [ ] ItemsTab displays current hero's equipment
- [ ] ItemsTab allows equipping/unequipping items
- [ ] ItemsTab allows removing items
- [ ] Loot Box section allows spawning items via different methods
- [ ] Spawned items can be added to current hero
- [ ] Item Creator section allows creating custom items
- [ ] Custom items can be added to current hero
- [ ] DataViewerTab shows all game data categories
- [ ] Data Viewer updates when custom items are added
- [ ] Equipment displ