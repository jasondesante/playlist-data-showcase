import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ensureAllDefaultsInitialized,
  ExtensionManager,
  MAGIC_ITEM_EXAMPLES,
  EquipmentValidator
} from 'playlist-data-engine'
import App from './App.tsx'
import './styles/index.css'

// Initialize the playlist-data-engine defaults
// This must be called before using any ExtensionManager-based features
// like EquipmentSpawnHelper.spawnByRarity()
ensureAllDefaultsInitialized()

// Register magic items from MAGIC_ITEM_EXAMPLES
// These items provide variety for the loot box rarity spawning
// NOTE: We adjust spawnWeight for demo purposes:
// - Vorpal Sword gets a small spawnWeight (0.01) instead of 0 for legendary loot
// - Truly cursed items (Belt of Strength Drain, Helmet of Opposite Alignment) remain at 0
const manager = ExtensionManager.getInstance()

const magicItemsWithAdjustedWeight = MAGIC_ITEM_EXAMPLES.map((item: any) => {
  // Allow Vorpal Sword to spawn with very low probability for legendary loot boxes
  if (item.name === 'Vorpal Sword') {
    return { ...item, spawnWeight: 0.01 }
  }
  return item
})

const magicItemsWithSpawnWeight = magicItemsWithAdjustedWeight.filter(
  (item: any) => (item.spawnWeight ?? 1) > 0
)

// Validate and register magic items one by one, skipping invalid ones
const validMagicItems: any[] = []
const invalidItemNames: string[] = []

for (const item of magicItemsWithSpawnWeight) {
  const validation = EquipmentValidator.validateEquipment(item)
  if (validation.valid) {
    validMagicItems.push(item)
  } else {
    invalidItemNames.push(item.name)
    console.warn(`Skipping invalid magic item "${item.name}":`, validation.errors)
  }
}

if (invalidItemNames.length > 0) {
  console.warn(`Skipped ${invalidItemNames.length} invalid magic items:`, invalidItemNames)
}

manager.register('equipment', validMagicItems, { validate: true })

// Restore custom equipment cache from localStorage and ExtensionManager
// This ensures custom items remain equippable after page reloads
import { restoreCustomEquipmentFromExtensionManager } from './hooks/useItemCreator'
restoreCustomEquipmentFromExtensionManager()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
