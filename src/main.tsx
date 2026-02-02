import React from 'react'
import ReactDOM from 'react-dom/client'
import { ensureAllDefaultsInitialized } from 'playlist-data-engine'
import App from './App.tsx'
import './styles/index.css'

// Initialize the playlist-data-engine defaults
// This must be called before using any ExtensionManager-based features
// like EquipmentSpawnHelper.spawnByRarity()
ensureAllDefaultsInitialized()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
