import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ensureAllDefaultsInitialized,
  ExtensionManager,
  MAGIC_ITEM_EXAMPLES
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
manager.register('equipment', magicItemsWithSpawnWeight)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
