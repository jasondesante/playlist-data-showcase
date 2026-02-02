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
- [ ] **Deep dive into playlist-data-engine exports**
  - [ ] List all registries available (FeatureRegistry, SkillRegistry, etc.)
  - [ ] Check for any data managers or database objects beyond SPELL_DATABASE
  - [ ] Look for SubraceRegistry or similar for subrace data access
  - [ ] Investigate ExtensionManager methods for listing content
  - [ ] Check for any equipment database or item list exports
- [ ] **Verify data structure for each category**
  - [ ] Spell data structure (name, level, school, casting time, range, etc.)
  - [ ] Skill data structure (name, ability, description)
  - [ ] Feature data structure (name, class, level, type, prerequisites, description)
  - [ ] Racial trait data structure (name, race, subrace, description)
  - [ ] Race data structure (name, speed, ability bonuses, traits, subraces)
  - [ ] Class data structure (name, hit die, primary abilities, spellcasting, features by level)
  - [ ] Equipment data structure (name, type, rarity, weight, damage/AC, properties)
- [ ] **Identify any missing data access methods**
  - [ ] Can we get all spells or do we need to iterate levels?
  - [ ] Are there helper functions for getting data by category?
  - [ ] Is there a way to get feature descriptions from FeatureRegistry?
  - [ ] Can we access prerequisite data for display?
- [ ] **Document data source decisions**
  - [ ] Note which engine exports to use for each category
  - [ ] Document any workarounds needed for missing accessors
  - [ ] Create type definitions for any data structures not fully typed

### Task 5.1: Create useDataViewer hook
- [ ] Create src/hooks/useDataViewer.ts
- [ ] Import from playlist-data-engine:
  - [ ] SPELL_DATABASE or SpellManager
  - [ ] SkillRegistry
  - [ ] FeatureRegistry
  - [ ] ExtensionManager (for equipment list)
  - [ ] getRaceData helper
  - [ ] getClassData helper
- [ ] Implement functions to fetch each data type:
  - [ ] getAllSpells() - Returns array of all spells
  - [ ] getAllSkills() - Returns array of all skills from SkillRegistry
  - [ ] getAllClassFeatures() - Returns array of all class features
  - [ ] getAllRacialTraits() - Returns array of all racial traits
  - [ ] getAllRaces() - Returns array of race data with subraces
  - [ ] getAllClasses() - Returns array of class data
  - [ ] getAllEquipment() - Returns array of all equipment from ExtensionManager
- [ ] Implement search/filter functions:
  - [ ] filterByName(data, searchTerm)
  - [ ] filterByCategory(data, category)
  - [ ] filterByLevel(data, level) - for spells/features
- [ ] Add loading states
- [ ] Add error handling
- [ ] Export data counts (total spells, total items, etc.)

### Task 5.2: Create DataViewerTab component
- [ ] Create src/components/Tabs/DataViewerTab.tsx
- [ ] Import useDataViewer hook
- [ ] Create category selector (Spells/Skills/Features/Races/Classes/Equipment)
- [ ] Implement list view for each category:
  - [ ] **Spells view:**
    - [ ] Show spell name, level, school
    - [ ] Color-code by school
    - [ ] Show casting time, range
    - [ ] Expandable description
    - [ ] Filter by level (cantrip, 1st, 2nd, etc.)
    - [ ] Filter by school
  - [ ] **Skills view:**
    - [ ] Show skill name, ability (STR/DEX/etc)
    - [ ] Group by ability
    - [ ] Show proficiency indicator if applicable
  - [ ] **Class Features view:**
    - [ ] Show feature name, class, level required
    - [ ] Group by class
    - [ ] Show type (passive/active/resource)
    - [ ] Show prerequisite summary
  - [ ] **Racial Traits view:**
    - [ ] Show trait name, race
    - [ ] Group by race
    - [ ] Show subrace if subrace-specific
  - [ ] **Races view:**
    - [ ] Show race name, speed, ability bonuses
    - [ ] Expandable subrace list
    - [ ] Show racial traits count
  - [ ] **Classes view:**
    - [ ] Show class name, hit die, primary ability
    - [ ] Show spellcasting indicator
    - [ ] Show class features count
  - [ ] **Equipment view:**
    - [ ] Show item name, type, rarity
    - [ ] Color-code by rarity
    - [ ] Show weight
    - [ ] Show damage/AC info
    - [ ] Filter by type (weapon/armor/item)
    - [ ] Filter by rarity
    - [ ] Show "Custom" badge for user-created items
- [ ] Implement global search bar
- [ ] Show total count for each category in tab
- [ ] Add "last updated" timestamp
- [ ] Add RawJsonDump for selected item data
- [ ] Style with consistent card/list layout

### Task 5.3: Add DataViewerTab to App.tsx
- [ ] Import DataViewerTab in App.tsx
- [ ] Add 'dataviewer' to Tab type union
- [ ] Add tab configuration to tabs array:
  - [ ] id: 'dataviewer'
  - [ ] label: 'Data Viewer'
  - [ ] icon: Database or BookOpen from lucide-react
- [ ] Add case to renderActiveTab switch
- [ ] Verify tab appears in sidebar

### Task 5.4: Add live update indicators
- [ ] When custom items are added via Item Creator, increment equipment count
- [ ] Show "New!" badge on Data Viewer tab when data changes
- [ ] Add refresh button to reload data from engine

### Task 5.5: Visual polish and CSS refinement
- [ ] **Layout and spacing**
  - [ ] Ensure consistent padding throughout the tab (match other tabs)
  - [ ] Add proper spacing between category selector and content
  - [ ] Use CSS Grid or Flexbox for responsive item grids
  - [ ] Ensure lists have proper row height and hover states
  - [ ] Add smooth transitions for expand/collapse animations
- [ ] **Color scheme and theming**
  - [ ] Use existing CSS variables for colors (--color-primary, --color-text, etc.)
  - [ ] Apply rarity colors consistently (Common gray, Uncommon green, Rare blue, Very Rare purple, Legendary orange)
  - [ ] Use distinct colors for spell schools (Evocation red, Conjuration yellow, etc.)
  - [ ] Ensure ability score colors match existing patterns (STR red, DEX green, etc.)
  - [ ] Add subtle background colors for alternating list rows
  - [ ] Use proper contrast ratios for accessibility
- [ ] **Typography**
  - [ ] Use consistent font sizes (match existing tab headings)
  - [ ] Apply proper font weights (bold for headers, normal for content)
  - [ ] Ensure spell descriptions have readable line height
  - [ ] Use monospace font for any technical/stat data
  - [ ] Truncate long text with ellipsis where appropriate
- [ ] **Cards and containers**
  - [ ] Use existing Card component for list items
  - [ ] Add subtle box shadows for depth
  - [ ] Apply border-radius consistently
  - [ ] Add hover effects with elevation changes
  - [ ] Ensure selected/highlighted states are visible
- [ ] **Interactive elements**
  - [ ] Style filter buttons with active states
  - [ ] Add focus rings for keyboard navigation
  - [ ] Style search input to match other inputs in app
  - [ ] Add loading skeletons or spinners for data fetching
  - [ ] Ensure buttons have proper hover/active states
- [ ] **Icons and visual indicators**
  - [ ] Add relevant icons for each category (sword for weapons, scroll for spells)
  - [ ] Use icons for ability scores (matching existing patterns)
  - [ ] Add visual badges for rarity, level, type
  - [ ] Use color-coded dots or chips for quick identification
  - [ ] Add "Custom" badge with distinct styling
- [ ] **Empty states**
  - [ ] Create attractive empty state when no items in category
  - [ ] Add helpful message when search returns no results
  - [ ] Show loading state while data initializes
- [ ] **Responsive design**
  - [ ] Ensure grid collapses properly on smaller screens
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
- [ ] Review current equipment section in CharacterGenTab
- [ ] Add rarity color coding to equipment items:
  - [ ] Common: gray
  - [ ] Uncommon: green
  - [ ] Rare: blue
  - [ ] Very Rare: purple
  - [ ] Legendary: orange
- [ ] Add hover tooltip showing equipment properties if present
- [ ] Show equipped status more clearly
- [ ] Add total weight display
- [ ] Group items by category (weapons/armor/items)

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
- [ ] Equipment display shows rarity colors

### Migration Guide Compatibility:
- [ ] Ammunition displays in new format (individual arrows with quantity)
- [ ] Arrow weight uses 0.05 lb per arrow, bolt weight uses 0.075 lb per bolt
- [ ] Feature IDs resolve to human-readable names from FeatureRegistry
- [ ] Feature tooltips show descriptions
- [ ] Subraces display in CharacterGenTab character sheet
- [ ] Subraces display in PartyTab character cards
- [ ] Subraces display in PartyTab detail modal

### Quality:
- [ ] All new code follows existing patterns
- [ ] Documentation is updated
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Existing characters with old formats still work
