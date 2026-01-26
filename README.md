# Playlist Data Showcase

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-cyan)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple)](https://vitejs.dev/)

A comprehensive React demo showcasing the **Playlist Data Engine** - a TypeScript library for parsing blockchain music playlists, analyzing audio, generating D&D 5e characters, and simulating combat.

## Quick Start

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Open browser to** `http://localhost:5173`

## What This Demo Showcases

This application demonstrates all features of the `playlist-data-engine` library:

- **Playlist parsing from Arweave** - Load and parse blockchain-hosted music playlists
- **Audio analysis and character generation** - Analyze audio characteristics to generate unique D&D characters
- **D&D 5e combat simulation** - Full combat engine with dice rolling, damage calculations, and victory conditions
- **Environmental sensor integration** - Mobile device sensors (accelerometer, gyroscope, ambient light)
- **XP system with multipliers** - Experience point tracking with source-based multipliers
- **Game mode selection** - Choose between Standard (stats cap at 20) and Uncapped (unlimited progression) modes
- **Multiple XP sources** - Earn XP from combat, quests, exploration, and boss defeats
- **Detailed level-up breakdowns** - Visual modal showing HP increases, stat changes, and new features
- **Stat management system** - Manual stat selection modal and automatic stat strategies

## Documentation

- [Architecture Overview](./docs/architecture/overview.md) - System design and patterns
- [Debugging Guide](./docs/development/debugging.md) - Troubleshooting
- [Documentation Index](./docs/index.md) - Full documentation hub

## Data Engine Docs

- [Data Engine Reference](./docs/engine/DATA_ENGINE_REFERENCE.md) - Complete API documentation
- [Usage Examples](./docs/engine/USAGE_IN_OTHER_PROJECTS.md) - Integration examples

## Quick Tour

The app is organized into tabs, each demonstrating a different engine feature:

1. **Playlist Loader** - Load playlists from Arweave transaction IDs
2. **Audio Analysis** - Analyze track audio and extract features
3. **Character Generator** - Generate D&D 5e characters from audio profiles
4. **Session Tracking** - Track play sessions with timing data
5. **XP Calculator** - Calculate XP with source-based multipliers
6. **Character Leveling** - Level up characters, apply stats, manage game modes
7. **Environmental Sensors** - View real-time sensor data (mobile)
8. **Gaming Platforms** - Detect and display connected gaming platforms
9. **Combat Simulator** - Run full D&D 5e combat encounters
10. **Settings** - Configure application options

## License

MIT

---

Built with [playlist-data-engine](./docs/engine/DATA_ENGINE_REFERENCE.md)
