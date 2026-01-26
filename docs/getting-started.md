# Quick Start Guide

Get up and running with the Playlist Character Generator in 5 minutes.

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)

To check your versions:

```bash
node --version  # Should be v18+
npm --version
```

---

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd playlist-data-showcase
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

   This installs:
   - React 18.2
   - Vite 5.0
   - TypeScript 5.3
   - playlist-data-engine (local package)

3. **Build the data engine** (if needed):
   ```bash
   cd playlist-data-engine
   npm run build
   cd ..
   ```

---

## Running the Demo

Start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

---

## 5-Minute Walkthrough

### Step 1: Load a Playlist

1. Navigate to the **Playlist Loader** tab
2. Enter an Arweave transaction ID containing a playlist
3. Click **Load Playlist** to fetch and parse the tracks

> **Tip:** If you don't have a transaction ID, you can skip this step and use the demo data.

### Step 2: Analyze Audio

1. Go to the **Audio Analysis** tab
2. Select a track from your loaded playlist
3. Click **Analyze Audio** to extract audio features
4. View the analysis results including tempo, energy, and mood

### Step 3: Generate a Character

1. Navigate to the **Character Generator** tab
2. Choose your **Game Mode**:
   - **Standard Mode** - Stats cap at 20, manual stat selection on level-up
   - **Uncapped Mode** - Unlimited stat progression, automatic stat increases
3. Select an audio profile to base the character on
4. Click **Generate Character** to create your D&D 5e character

### Step 4: Run a Combat

1. Go to the **Combat Simulator** tab
2. Click **Generate Enemy** to create a foe
3. Click **Start Combat** to begin the battle
4. Watch the combat unfold with dice rolls and damage calculations
5. When you win, your character earns XP from combat!

### Step 5: Check Level-Up Details

1. Navigate to the **Character Leveling** tab
2. Use the **XP Sources** buttons to simulate activities:
   - **Complete Quest** (+500 XP)
   - **Defeat Boss** (+5,000 XP)
   - **Exploration** (+250 XP)
3. When you level up, a modal appears showing:
   - HP increases
   - New features (if any)
   - Stat increases (Uncapped mode)
   - Pending stat increases (Standard mode)
4. For **Standard Mode**, click **Apply Stat Increases** to manually allocate your stats

---

## Next Steps

Now that you've tried the basics, explore more features:

- [Architecture Overview](./architecture/overview.md) - Learn how the system works
- [Contributing Guide](./development/contributing.md) - Contribute to the project
- [Data Engine Reference](./engine/FROM_DATA_ENGINE/DATA_ENGINE_REFERENCE.md) - Full API documentation
- [Bug Tracker](./design/bugs-to-fix.md) - Known issues and improvements

---

**Back to [Documentation Index](./index.md)**
