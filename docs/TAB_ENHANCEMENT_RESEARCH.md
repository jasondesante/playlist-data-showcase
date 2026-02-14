# Tab Enhancement Research Summary

Research conducted by 13 specialized agents analyzing each tab against the Playlist Data Engine's available features.

---

## 1. PlaylistLoaderTab

**Current Features:**
- Basic PlaylistParser (no options configured)
- Arweave TX ID fetching with error handling
- Simple JSON vs ID detection heuristic
- Standard track parsing via `parser.parse()`

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `validateAudioUrls` | Verify audio URLs exist via HEAD request |
| `strict` mode | Throw errors on invalid tracks instead of skipping |
| `audioUrlValidationTimeout` | Configurable timeout (default 5000ms) |
| `MetadataExtractor.extractImageUrl()` | Priority extraction: image_small > image > image_large |
| `MetadataExtractor.extractTitle()` | Priority extraction: name > title |
| `MetadataExtractor.extractArtist()` | Priority extraction: artist > created_by > minter |
| `MetadataExtractor.parseMetadata()` | Safely parse metadata strings to JSON |
| `MetadataExtractor.convertAttributes()` | Convert OpenSea-style attributes to key-value |

**Enhancement Opportunities:**
- Add URL validation toggle to prevent broken tracks
- Add strict mode toggle to show all parsing errors
- Use MetadataExtractor directly for raw metadata debugging

**File Reference:** `src/hooks/usePlaylistParser.ts:25` - uses `new PlaylistParser()` with no options

---

## 2. AudioAnalysisTab ⭐ High Impact

**Current Features:**
- 3 frequency bands: bass, mid, treble dominance (bars visualization)
- Basic metrics: average_amplitude
- Advanced metrics: spectral_centroid, spectral_rolloff, zero_crossing_rate (displayed)
- Color palette: primary, secondary, accent colors
- Sample positions at 5%, 40%, 70%
- EQ controls: trebleBoost, bassBoost, midBoost multipliers

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `analyzeTimeline()` | Generates AudioTimelineEvent[] with multiple samples over time |
| `SamplingStrategy.interval` | Sample every N seconds |
| `SamplingStrategy.count` | Generate exact number of samples |
| `AudioTimelineEvent.timestamp` | Start time of segment in seconds |
| `AudioTimelineEvent.duration` | Duration of segment in seconds |
| `AudioTimelineEvent.bass/mid/treble` | Per-segment frequency dominance |
| `AudioTimelineEvent.amplitude/peak` | Per-segment energy metrics |
| `rms_energy` | Root Mean Square energy (perceived loudness) |
| `dynamic_range` | Difference between Peak and RMS (track "punch") |

**Enhancement Opportunities:**
- **Timeline Visualization** - Line/waveform graph showing frequency bands over time
- **RMS Energy & Dynamic Range Cards** - Quick win, existing data
- **Multi-sample Timeline** - Expand from 3 positions to 10-20 samples
- **Advanced Metrics Over Time** - Show spectral data as line charts

---

## 3. CharacterGenTab

**Current Features:**
- Game Mode toggle (standard/uncapped)
- Generation Mode toggle (deterministic/non-deterministic)
- Subrace display in character info
- Character import/export JSON
- Equipment display with rarity colors and tooltips
- Audio trait mapping visualization

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `forceName` | Custom character name option |
| `deterministicName` | Toggle for deterministic vs random naming |
| `subrace` option | Direct subrace selection (High Elf, Hill Dwarf, etc.) |
| `feature_effects[]` | Effects from features/traits (stat bonuses, ability unlocks) |
| `equipment_effects[]` | Effects from equipped items |
| `extensions.equipment` | Custom equipment injection during generation |

**Enhancement Opportunities:**
- **Feature Effects Panel** - Display active stat modifiers and ability unlocks
- **Name Customization** - Input field with deterministicName toggle
- **Subrace Selector** - Dropdown when race has available subraces
- **Custom Equipment Injection** - Advanced feature for testing

---

## 4. PartyTab

**Current Features:**
- Character grid view with search/sort
- Character detail modal
- Active character selection synced with audio
- Clear all functionality

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `PartyAnalyzer.analyzeParty()` | Complete analysis with all stats |
| `PartyAnalyzer.calculatePartyLevel()` | Average party level |
| `PartyAnalyzer.calculatePartyStrength()` | Combined strength score |
| `PartyAnalyzer.getAverageAC()` | Average armor class |
| `PartyAnalyzer.getAverageHP()` | Average hit points |
| `PartyAnalyzer.getAverageDamage()` | Estimated damage output |
| `PartyAnalyzer.getXPBudget()` | XP budget for encounter by difficulty |
| Encounter balance system | XP budget tables by level and difficulty |

**Enhancement Opportunities:**
- **Party Overview Panel** - Average level, strength rating, AC/HP/Damage
- **Encounter Generator** - Button using `EnemyGenerator.generateEncounter()`
- **Party Composition Analysis** - Class distribution, role balance
- **Quick Stats Cards** - Total HP, highest/lowest AC, spellcaster count

---

## 5. ItemsTab ⭐ Rich Features

**Current Features:**
- Basic equipment display (weapons, armor, items)
- Equip/unequip with EquipmentEffectApplier
- Weight tracking
- Custom item creator (basic fields)
- Loot box spawning (random, by rarity, treasure hoard)
- EnhancedInventoryItem with instanceId

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `EquipmentModifier.enchant()` | Apply positive modifications |
| `EquipmentModifier.curse()` | Apply negative effects |
| `EquipmentModifier.upgrade()` | Improve existing properties |
| `EquipmentModifier.disenchant()` | Remove enchantments |
| `EquipmentModifier.liftCurse()` | Remove curses |
| `WEAPON_ENCHANTMENTS` | plusOne, plusTwo, plusThree, flaming, frost, shock |
| `ARMOR_ENCHANTMENTS` | plusOne, plusTwo, plusThree |
| `RESISTANCE_ENCHANTMENTS` | fire, cold, lightning resistance |
| `CURSES` | weakness, attunement, berserker |
| `ALL_ENCHANTMENTS` | Combo enchantments (holyAvenger, dragonSlayer) |
| `createStrengthEnchantment()` | Stat boost functions |
| `MAGIC_ITEMS` | 34 pre-built magic items |
| `ITEM_CREATION_TEMPLATES` | 9 templates for item enhancement |
| `EnhancedInventoryItem.modifications[]` | Modification tracking |

**Enhancement Opportunities:**
- **Item Enchanting UI** - Apply predefined enchantments
- **Curse System** - Implement curse mechanics with removal
- **Magic Item Browser** - Display pre-built magic items
- **Modification Display** - Visual indicators for enchantments
- **Enchantment Shop** - Browse and purchase enchantments

---

## 6. DataViewerTab

**Current Features:**
- Data types: Spells, Skills, Class Features, Racial Traits, Races, Classes, Equipment
- Filtering by level, school, type, rarity, name
- Grouping by ability, class, race
- Expanded cards with stats
- Raw JSON dump

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `CharacterSheet.gameMode` | 'standard' or 'uncapped' progression |
| `CharacterSheet.subrace` | Specific subrace (High Elf, Hill Dwarf) |
| `CharacterSheet.feature_effects` | Effects from features/traits |
| `CharacterSheet.equipment_effects` | Effects from equipped items |
| `Equipment.grantsFeatures` | Features granted when equipped |
| `Equipment.grantsSkills` | Skills granted when equipped |
| `Equipment.grantsSpells` | Spells granted when equipped |
| `Equipment.tags` | Search/filter tags |
| `Equipment.spawnWeight` | Spawn weight (0 = game-only) |
| `EquipmentProperty.vs_creature_type` | Property vs specific creature |
| `EquipmentProperty.at_time_of_day` | Time-based effects |
| `EquipmentProperty.wielder_race/class` | Race/class-only items |
| Content pack export/import | Via ExtensionManager |

**Enhancement Opportunities:**
- **Subrace Display** - Show subrace data in Races/Classes
- **Equipment Properties Panel** - Show grantsFeatures/Skills/Spells
- **Equipment Tags Filter** - Filter by tags
- **Spawn Weight Indicator** - Show game-only items
- **Feature/Equipment Effects Viewer** - Display effects arrays

---

## 7. SessionTrackingTab

**Current Features:**
- Session start/end with SessionTracker
- XP calculation with modifiers
- Environmental bonuses (running 1.5x, walking 1.2x, night 1.25x, etc.)
- Gaming bonuses (base +0.25x, RPG +0.20x, etc.)
- Character integration with XP progress
- Last session display with context breakdown

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `MasterySystem.getTrackListenCount()` | Number of times track listened |
| `MasterySystem.getTrackMastery()` | Mastery level 0-5 |
| `MasterySystem.awardMasteryXP()` | +50 flat XP when mastered |
| Mastery Levels | None (0) → Basic (1) → Familiar (3) → Mastered (5) → Epic (10) |
| Session history | Internal tracking of past sessions |
| Session statistics | Total sessions, XP earned, average duration |

**Enhancement Opportunities:**
- **Mastery Progress Display** - Listen count vs next threshold
- **Mastery Badges** - Visual indicators on track cards
- **Session History Card** - Last N sessions list
- **XP This Week** - Weekly progress summary
- **Streak Tracking** - Consecutive days, all-time stats
- **Favorite Tracks** - Most listened tracks

---

## 8. XPCalculatorTab

**Current Features:**
- Duration-based XP (1 XP/sec)
- Environmental modifiers (activity, night, weather, altitude)
- Gaming modifiers (base, RPG, Action/FPS, multiplayer)
- Mastery bonus (+50 XP)
- Manual mode with overrides
- 3.0x multiplier cap
- Character integration
- Visualization with charts

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `xp_per_second` | Custom base rate configuration |
| `mergeProgressionConfig()` | Customize all multipliers |
| `SessionTracker.getSessionsInRange()` | Filter by date range |
| `SessionTracker.getAverageSessionLength()` | Statistics |
| `SessionTracker.getLongestSession()` | Statistics |
| `SessionTracker.getTotalListeningTime()` | Lifetime stats |
| `SessionTracker.getTotalXPEarned()` | Lifetime stats |
| `SessionTracker.clearHistory()` | Reset history |
| GameMode impact | Uncapped = stats every level |

**Enhancement Opportunities:**
- **Session History/Statistics Tab** - Total time, XP, averages
- **XP to Next Level Breakdown** - Percentage, sessions needed
- **Progression Config Panel** - Adjust multipliers
- **GameMode Display** - Impact on progression
- **Reset History Button** - Testing/fresh starts

---

## 9. CharacterLevelingTab

**Current Features:**
- 5 stat strategies: DnD5e, DnD5e_smart, balanced, primary_only, random
- XP progress bar with thresholds
- Level-up modal (HP, stat increases, features)
- pendingStatIncreases tracking with manual selection
- GameMode detection (standard → manual, uncapped → smart)

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `LevelUpProcessor.processLevelUp()` | Direct level-up processing |
| `LevelUpProcessor.setUncappedConfig()` | Custom XP formulas for uncapped |
| Custom XP scaling | Exponential, OSRS-style, linear |
| `StatManager.increaseStats()` | Item-based stat changes |
| `StatManager.decreaseStats()` | Potions, curses, restoration |
| `CharacterUpdateResult.newSpellSlots` | Spell slots from level-ups |
| `CharacterUpdateResult.featuresGained` | New features |
| `capped[]` array | Stat cap warnings |
| `mergeProgressionConfig()` | Global XP rate adjustments |
| `useAverageHP` | Fixed vs rolled HP setting |

**Enhancement Opportunities:**
- **Custom XP Formulas UI** - Uncapped progression config
- **Item-based Stat Changes** - Temporary/permanent (potions, curses)
- **Stat Cap Warnings** - "Capped at 20" indicator
- **Spell Slot Display** - Tracker from newSpellSlots
- **Features Log** - Historical view of featuresGained
- **HP Roll Preference** - Average vs rolled setting

---

## 10. EnvironmentalSensorsTab

**Current Features:**
- Permission requests: geolocation, motion, light
- GPS location display (lat/long, altitude, speed, heading)
- Live motion data (X/Y/Z acceleration graphs)
- Weather data (temp, humidity, wind, pressure, moon phase)
- Raw JSON dump
- Google Maps link

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `detectSevereWeather()` | Blizzard, hurricane, typhoon, tornado detection |
| `calculateXPModifierWithSevereWeather()` | Modifier + alert + safety warning |
| `getSevereWeatherWarning()` | Safety warning text |
| Geographic classification | Hurricane vs typhoon by latitude |
| `SensorDashboard.getDiagnostics()` | Comprehensive diagnostic report |
| `displayEnvironmentalDiagnostics()` | Formatted console output |
| `getSensorStatus()` | Health monitoring |
| `getFailureLog()` | Failure tracking |
| `calculateXPModifierWithForecast()` | XP modifier with forecast |
| Forecast caching | 12 minute TTL |
| `getUpcomingWeather()` | Upcoming weather changes |
| `calculateXPModifier()` | 1.0x-3.0x multiplier |

**Enhancement Opportunities:**
- **Severe Weather Alert Card** - Active alerts with XP bonus
- **XP Modifier Display** - Real-time multiplier
- **Diagnostic Panel** - Sensor health, cache rates, API timing
- **Biome Display** - Detected biome from coordinates
- **Forecast Section** - Upcoming weather with XP predictions
- **Sensor Health Indicators** - Status badges

---

## 11. GamingPlatformsTab

**Current Features:**
- Steam ID input and connection
- Discord Client ID input and connection
- Discord music status ("Listening to...")
- Gaming context display (game, genre, party size)
- Gaming XP bonus calculation
- Gaming summary (minutes, games played)
- Raw JSON dumps

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `getUserInfo()` | Discord user info (username, avatar, globalName) |
| `getGameSchema(appId)` | Steam achievements and stats |
| `getCurrentGameApiStatistics()` | Performance metrics |
| `DiscordActivityButton` | Clickable buttons in Rich Presence |
| `DiscordActivityAssets` | Custom images (album art) |
| `DiscordActivityParty` | Party size in Discord status |
| `recordGameSession()` | Record completed sessions to history |
| `SensorDashboard.displayGamingDiagnostics()` | Formatted diagnostic |

**Enhancement Opportunities:**
- **Discord User Profile Display** - Avatar, username
- **Steam Game Schema/Stats** - Achievements for current game
- **Gaming History Tracking** - Record and display sessions
- **Discord Rich Presence Enhancement** - Album art, buttons
- **API Performance Metrics** - Steam API statistics
- **Diagnostic Dashboard** - Sensor health/cache info

---

## 12. CombatSimulatorTab ⭐ Major Gap

**Current Features:**
- Combat initialization and turn management
- Manual attack targeting
- Multi-target spell casting
- Auto-play mode
- XP awards on victory
- Combat log with history
- Initiative order sidebar
- Status indicators

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `EnemyGenerator.generate()` | Single enemies by template/rarity |
| `EnemyGenerator.generateEncounter()` | Party-balanced encounters |
| `EnemyGenerator.generateEncounterByCR()` | CR-based encounters |
| Audio-influenced generation | bass=brutes, treble=archers |
| Enemy categories | humanoid, beast, undead, dragon, fiend, elemental, construct |
| Enemy archetypes | brute, archer, support |
| Rarity tiers | common, uncommon, elite, boss |
| Equipment generation | For enemies (V2) |
| Enemy spellcasting | (V2) |
| Legendary actions | For bosses (V2) |
| `executeDodge()` | +2 AC action |
| `executeDash()` | Double movement |
| `executeDisengage()` | No opportunity attacks |
| `executeFlee()` | Leave combat (allowFleeing: true) |
| `applyDamage()` | Direct HP manipulation |
| `healCombatant()` | Direct healing |
| `applyTemporaryHP()` | Temp HP management |
| Treasure system | Gold/item rewards configuration |
| `useEnvironment` | Environmental bonuses |
| `useMusic` | Music-based bonuses |
| `tacticalMode` | Advanced tactical rules |

**Enhancement Opportunities:**
- **Enemy Generator Integration** - Balanced encounters with audio influence
- **Dodge/Dash/Disengage Actions** - Tactical action buttons
- **Treasure System** - Configure and display rewards
- **Party Analyzer** - Encounter difficulty indicator
- **Environmental Context** - Pass context for bonuses
- **Fleeing** - Add flee button
- **Template Browser** - Available enemy types

---

## 13. SettingsTab

**Current Features:**
- API Keys: OpenWeather, Steam, Discord Client ID
- Audio Settings: FFT Size
- XP Settings: Base XP Rate
- Debug Settings: Verbose Logging
- Data Management: Export/Import JSON, Reset

**NEW Features Available:**

| Feature | Description |
|---------|-------------|
| `loadConfigFromEnv()` | Load config from environment |
| `mergeConfig()` | Merge user config with defaults |
| `DEFAULT_SENSOR_CONFIG` | Full sensor config (cache TTL, retry, accuracy) |
| `DEFAULT_PROGRESSION_CONFIG` | Full progression config |
| `mergeProgressionConfig()` | Merge custom progression settings |
| `ExtensionManager.exportCustomData()` | Export custom content |
| `ExtensionManager.reset()` | Reset categories to defaults |
| `ExtensionManager.getInfo()` | Statistics about extensions |
| Content Pack System | Save/load packs to JSON |
| Spawn Rate Controls | Race/class/equipment weights |
| Custom Content Registration | Races, classes, equipment, spells, etc. |

**Enhancement Opportunities:**
- **Progression Configuration Panel** - Stat strategies, XP thresholds, game mode
- **Sensor Configuration Panel** - Cache TTL, accuracy mode, retry policy
- **Content Pack Management** - Export/import custom content
- **Spawn Rate Controls** - Race/class/equipment weights
- **Character Generation Options** - Game mode, force options

---

## Top Priority Enhancements

| Priority | Tab | Enhancement | Impact |
|----------|-----|-------------|--------|
| 1 | AudioAnalysis | Timeline visualization with `analyzeTimeline()` | Visual richness |
| 2 | Combat | EnemyGenerator integration for balanced encounters | Gameplay depth |
| 3 | Items | Enchantment/cursed item UI with library | RPG mechanics |
| 4 | Party | PartyAnalyzer + encounter difficulty | Strategic play |
| 5 | Character | Feature effects & equipment effects display | Character depth |
| 6 | Session | Mastery system (track mastery levels) | Progression hook |
| 7 | Sensors | Severe weather alerts + XP modifier display | Engagement |
| 8 | Settings | Content pack management + spawn controls | Customization |

---

## Quick Wins (Easy to Implement)

1. **AudioAnalysis**: Add `rms_energy` and `dynamic_range` cards (existing data)
2. **PlaylistLoader**: Add `validateAudioUrls` toggle (single option)
3. **Sensors**: Display current XP modifier prominently
4. **Session**: Show mastery badge on current track
5. **Items**: Add modification indicators to equipment cards
6. **Combat**: Add Dodge/Dash action buttons

---

*Research completed: 2026-02-13*
