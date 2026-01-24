import { useState } from 'react';
import { Music, User, Activity, Zap, Gamepad2, Swords, Settings } from 'lucide-react';
import { useCombatEngine } from './hooks/useCombatEngine';
import { useCharacterStore } from './store/characterStore';
import { PlaylistLoaderTab } from './components/Tabs/PlaylistLoaderTab';
import { AudioAnalysisTab } from './components/Tabs/AudioAnalysisTab';
import { CharacterGenTab } from './components/Tabs/CharacterGenTab';
import { SessionTrackingTab } from './components/Tabs/SessionTrackingTab';
import { XPCalculatorTab } from './components/Tabs/XPCalculatorTab';
import { CharacterLevelingTab } from './components/Tabs/CharacterLevelingTab';
import { EnvironmentalSensorsTab } from './components/Tabs/EnvironmentalSensorsTab';
import { GamingPlatformsTab } from './components/Tabs/GamingPlatformsTab';

type Tab = 'playlist' | 'audio' | 'character' | 'session' | 'xp' | 'leveling' | 'sensors' | 'gaming' | 'combat' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('playlist');

  const tabs = [
    { id: 'playlist' as Tab, label: 'Playlist', icon: Music },
    { id: 'audio' as Tab, label: 'Audio Analysis', icon: Music },
    { id: 'character' as Tab, label: 'Character Gen', icon: User },
    { id: 'session' as Tab, label: 'Session', icon: Activity },
    { id: 'xp' as Tab, label: 'XP Calc', icon: Zap },
    { id: 'leveling' as Tab, label: 'Leveling', icon: User },
    { id: 'sensors' as Tab, label: 'Sensors', icon: Activity },
    { id: 'gaming' as Tab, label: 'Gaming', icon: Gamepad2 },
    { id: 'combat' as Tab, label: 'Combat', icon: Swords },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Playlist Data Engine Showcase</h1>
          <p className="text-sm text-muted-foreground">Technical validation • Console logging enabled</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="bg-card border border-border rounded-lg p-6">
              {activeTab === 'playlist' && <PlaylistLoaderTab />}
              {activeTab === 'audio' && <AudioAnalysisTab />}
              {activeTab === 'character' && <CharacterGenTab />}
              {activeTab === 'session' && <SessionTrackingTab />}
              {activeTab === 'xp' && <XPCalculatorTab />}
              {activeTab === 'leveling' && <CharacterLevelingTab />}
              {activeTab === 'sensors' && <EnvironmentalSensorsTab />}
              {activeTab === 'gaming' && <GamingPlatformsTab />}
              {activeTab === 'combat' && <CombatTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function CombatTab() {
  const { startCombat } = useCombatEngine();
  const { characters } = useCharacterStore();

  const handleStartCombat = () => {
    if (characters.length === 0) return;
    // Create a mock enemy
    const enemy = { ...characters[0], name: 'Goblin', hp: { current: 20, max: 20, temp: 0 } };
    startCombat([characters[0]], [enemy]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Combat Engine</h2>

      {characters.length === 0 ? (
        <p className="text-muted-foreground">Generate a character first</p>
      ) : (
        <button
          onClick={handleStartCombat}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Start Combat
        </button>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>
      <p className="text-muted-foreground">Configure API keys and application settings...</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">OpenWeather API Key</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter API key..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Steam API Key</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter API key..."
          />
        </div>
      </div>
    </div>
  );
}

export default App;
