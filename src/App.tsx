import { useState } from 'react';
import { Music, User, Activity, Zap, Gamepad2, Swords, Settings } from 'lucide-react';
import { useEnvironmentalSensors } from './hooks/useEnvironmentalSensors';
import { useGamingPlatforms } from './hooks/useGamingPlatforms';
import { useCombatEngine } from './hooks/useCombatEngine';
import { useCharacterStore } from './store/characterStore';
import { PlaylistLoaderTab } from './components/Tabs/PlaylistLoaderTab';
import { AudioAnalysisTab } from './components/Tabs/AudioAnalysisTab';
import { CharacterGenTab } from './components/Tabs/CharacterGenTab';
import { SessionTrackingTab } from './components/Tabs/SessionTrackingTab';
import { XPCalculatorTab } from './components/Tabs/XPCalculatorTab';
import { CharacterLevelingTab } from './components/Tabs/CharacterLevelingTab';

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
              {activeTab === 'sensors' && <SensorsTab />}
              {activeTab === 'gaming' && <GamingTab />}
              {activeTab === 'combat' && <CombatTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SensorsTab() {
  const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors } = useEnvironmentalSensors();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Environmental Sensors</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Geolocation</p>
            <p className="text-xs text-muted-foreground">{permissions.geolocation}</p>
            <button
              onClick={() => requestPermission('geolocation')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Motion</p>
            <p className="text-xs text-muted-foreground">{permissions.motion}</p>
            <button
              onClick={() => requestPermission('motion')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Light</p>
            <p className="text-xs text-muted-foreground">{permissions.light}</p>
            <button
              onClick={() => requestPermission('light')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
        </div>

        <button
          onClick={() => startMonitoring()}
          disabled={isMonitoring}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
        </button>

        {environmentalContext && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Environmental Data</p>
            <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(environmentalContext, null, 2)}</pre>
          </div>
        )}

        {environmentalContext ? (
          <div className="space-y-4">
            {/* Live Motion Data */}
            {environmentalContext.motion ? (
              <div className="p-5 bg-green-900/20 border border-green-700 rounded-lg">
                <h3 className="font-bold text-green-300 flex items-center gap-2">
                  Live Motion Active
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">X:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.x?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Y:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.y?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Z:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.z?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activity:</span>{' '}
                    <strong className="text-lg">
                      {(() => {
                        // This is safe now because we added getCurrentActivity()
                        if (!sensors || !environmentalContext.motion) return 'unknown';
                        return sensors.getCurrentActivity();
                      })()}
                    </strong>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date(environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold">No Motion Data Yet</h3>
                <ul className="mt-3 text-sm space-y-1">
                  <li>• Did you grant motion permission? (iOS: must tap "Request")</li>
                  <li>• Is your phone flat on a table? Try tilting it!</li>
                  <li>• Motion updates only when device moves</li>
                  <li>• Check: DeviceMotionEvent supported? {typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            )}

            {/* Full Debug Dump */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Raw environmentalContext</summary>
              <pre className="mt-2 text-xs overflow-auto bg-black/50 p-3 rounded">
                {JSON.stringify(environmentalContext, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

      </div>
    </div>
  );
}

function GamingTab() {
  const { connectSteam, gamingContext } = useGamingPlatforms();
  const [steamId, setSteamId] = useState('');

  const handleConnect = async () => {
    await connectSteam(steamId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Gaming Platforms</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Steam User ID</label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Steam ID..."
          />
        </div>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Connect Steam
        </button>

        {gamingContext && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Gaming Status</p>
            <p className="text-xs text-muted-foreground">
              {gamingContext.isActivelyGaming ? 'Currently Gaming' : 'Not Gaming'}
            </p>
          </div>
        )}
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
