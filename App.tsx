
import React, { useState, useCallback } from 'react';
import { Sidebar, SidebarItem } from './components/layout/Sidebar';
import { MusicCreationIcon, AudioProductionIcon, VideoCreationIcon, MarketingIcon, AssistantIcon, LogoIcon } from './constants';
import MusicCreation from './components/features/MusicCreation';
import AudioProduction from './components/features/AudioProduction';
import VideoCreation from './components/features/VideoCreation';
import SocialMarketing from './components/features/SocialMarketing';
import AiAssistant from './components/features/AiAssistant';

type View = 'create' | 'produce' | 'video' | 'market' | 'assist';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('create');
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [songConcept, setSongConcept] = useState<string>('');

  const handleLyricsGenerated = useCallback((lyrics: string, concept: string) => {
    setGeneratedLyrics(lyrics);
    setSongConcept(concept);
    setActiveView('produce');
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'create':
        return <MusicCreation onLyricsGenerated={handleLyricsGenerated} />;
      case 'produce':
        return <AudioProduction lyrics={generatedLyrics} />;
      case 'video':
        return <VideoCreation lyrics={generatedLyrics} songConcept={songConcept} />;
      case 'market':
        return <SocialMarketing lyrics={generatedLyrics} songConcept={songConcept} />;
      case 'assist':
        return <AiAssistant />;
      default:
        return <MusicCreation onLyricsGenerated={handleLyricsGenerated} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-200">
      <Sidebar>
        <div className="flex items-center justify-center py-6 px-4 border-b border-gray-700">
          <LogoIcon className="h-10 w-10 text-indigo-400" />
          <span className="ml-3 text-2xl font-bold">MUSE AI</span>
        </div>
        <SidebarItem
          icon={<MusicCreationIcon className="h-6 w-6" />}
          text="Create"
          active={activeView === 'create'}
          onClick={() => setActiveView('create')}
        />
        <SidebarItem
          icon={<AudioProductionIcon className="h-6 w-6" />}
          text="Produce"
          active={activeView === 'produce'}
          onClick={() => setActiveView('produce')}
        />
        <SidebarItem
          icon={<VideoCreationIcon className="h-6 w-6" />}
          text="Video"
          active={activeView === 'video'}
          onClick={() => setActiveView('video')}
        />
        <SidebarItem
          icon={<MarketingIcon className="h-6 w-6" />}
          text="Market"
          active={activeView === 'market'}
          onClick={() => setActiveView('market')}
        />
        <SidebarItem
          icon={<AssistantIcon className="h-6 w-6" />}
          text="Assistant"
          active={activeView === 'assist'}
          onClick={() => setActiveView('assist')}
        />
      </Sidebar>
      <main className="flex-1 p-6 md:p-10 ml-16 md:ml-64">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
