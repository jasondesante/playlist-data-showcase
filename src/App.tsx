import { useState, createContext, useContext, useEffect } from 'react';
import { Music, User, Activity, Zap, Gamepad2, Swords, Settings, Users } from 'lucide-react';
import { AppHeader } from './components/Layout/AppHeader';
import { MainLayout } from './components/Layout/MainLayout';
import { ToastContainer } from './components/ui/Toast';
import { LevelUpDetailModal } from './components/LevelUpDetailModal';
import type { TabItem } from './components/Layout/Sidebar';
import { PlaylistLoaderTab } from './components/Tabs/PlaylistLoaderTab';
import { AudioAnalysisTab } from './components/Tabs/AudioAnalysisTab';
import { CharacterGenTab } from './components/Tabs/CharacterGenTab';
import { PartyTab } from './components/Tabs/PartyTab';
import { SessionTrackingTab } from './components/Tabs/SessionTrackingTab';
import { XPCalculatorTab } from './components/Tabs/XPCalculatorTab';
import { CharacterLevelingTab } from './components/Tabs/CharacterLevelingTab';
import { EnvironmentalSensorsTab } from './components/Tabs/EnvironmentalSensorsTab';
import { GamingPlatformsTab } from './components/Tabs/GamingPlatformsTab';
import { CombatSimulatorTab } from './components/Tabs/CombatSimulatorTab';
import { SettingsTab } from './components/Tabs/SettingsTab';
import { useAutoCharacterSetup } from './hooks/useAutoCharacterSetup';
import { useSessionCompletion } from './hooks/useSessionCompletion';
import { useCharacterStore } from './store/characterStore';
import { usePlaylistStore } from './store/playlistStore';
import { logger } from './utils/logger';

type Tab = 'playlist' | 'audio' | 'character' | 'party' | 'session' | 'xp' | 'leveling' | 'sensors' | 'gaming' | 'combat' | 'settings';

// Create context for active tab
const TabContext = createContext<{ activeTab: Tab } | null>(null);

export const useTabContext = () => useContext(TabContext);

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('playlist');

  // Auto-analyze and generate characters on first listen of new tracks
  useAutoCharacterSetup();

  // Handle session completion - process XP and show level-up modals
  const { showLevelUpModal, levelUpDetails, closeLevelUpModal } = useSessionCompletion();

  // Restore selectedTrack from activeCharacterId on app mount
  // This ensures hero-track synchronization after page reload
  useEffect(() => {
    logger.info('System', 'Mount: Starting track restoration from active character');
    const { restoreSelectedTrackFromActiveCharacter, activeCharacterId, characters } = useCharacterStore.getState();
    logger.info('System', 'Mount: Character state', {
      activeCharacterId,
      characterCount: characters.length,
      characterNames: characters.map(c => ({ name: c.name, seed: c.seed }))
    });

    // Log playlist state before restoration
    const playlistBefore = usePlaylistStore.getState().currentPlaylist;
    const selectedTrackBefore = usePlaylistStore.getState().selectedTrack;
    logger.info('System', 'Mount: Playlist state before restoration', {
      hasPlaylist: !!playlistBefore,
      playlistName: playlistBefore?.name,
      trackCount: playlistBefore?.tracks.length,
      hasSelectedTrack: !!selectedTrackBefore,
      selectedTrackId: selectedTrackBefore?.id
    });

    restoreSelectedTrackFromActiveCharacter();

    // Log playlist state after restoration
    setTimeout(() => {
      const selectedTrackAfter = usePlaylistStore.getState().selectedTrack;
      logger.info('System', 'Mount: Playlist state after restoration (100ms delay)', {
        hasSelectedTrack: !!selectedTrackAfter,
        selectedTrackId: selectedTrackAfter?.id,
        selectedTrackTitle: selectedTrackAfter?.title
      });
    }, 100);
  }, []); // Only run once on mount

  const tabs: TabItem[] = [
    { id: 'playlist', label: 'Playlist', icon: Music },
    { id: 'audio', label: 'Audio Analysis', icon: Music },
    { id: 'character', label: 'Character Gen', icon: User },
    { id: 'party', label: 'Party', icon: Users },
    { id: 'session', label: 'Session', icon: Activity },
    { id: 'xp', label: 'XP Calc', icon: Zap },
    { id: 'leveling', label: 'Leveling', icon: User },
    { id: 'sensors', label: 'Sensors', icon: Activity },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'combat', label: 'Combat', icon: Swords },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'playlist': return <PlaylistLoaderTab />;
      case 'audio': return <AudioAnalysisTab />;
      case 'character': return <CharacterGenTab />;
      case 'party': return <PartyTab />;
      case 'session': return <SessionTrackingTab />;
      case 'xp': return <XPCalculatorTab />;
      case 'leveling': return <CharacterLevelingTab />;
      case 'sensors': return <EnvironmentalSensorsTab />;
      case 'gaming': return <GamingPlatformsTab />;
      case 'combat': return <CombatSimulatorTab />;
      case 'settings': return <SettingsTab />;
      default: return null;
    }
  };

  return (
    <TabContext.Provider value={{ activeTab }}>
      <div className="app-root">
        <AppHeader tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as Tab)} />

      <MainLayout>
        {renderActiveTab()}
      </MainLayout>

      <ToastContainer position="top-right" />

        {/* Level-Up Detail Modal */}
        <LevelUpDetailModal
          levelUpDetails={levelUpDetails}
          isOpen={showLevelUpModal}
          onClose={closeLevelUpModal}
        />
      </div>
    </TabContext.Provider>
  );
}

export default App;
