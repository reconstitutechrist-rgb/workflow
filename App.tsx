
import React, { useState, useCallback } from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { MusicCreationIcon, AudioProductionIcon, VideoCreationIcon, MarketingIcon, AssistantIcon, LogoIcon } from './constants';
import { SongData } from './types';
import MusicCreation from './MusicCreation';
import AudioProductionNew from './AudioProductionNew';
import VideoCreation from './VideoCreation';
import SocialMarketing from './SocialMarketing';
import AiAssistant from './AiAssistant';

type View = 'create' | 'produce' | 'video' | 'market' | 'assist';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('create');
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [songConcept, setSongConcept] = useState<string>('');
  const [songData, setSongData] = useState<SongData | undefined>(undefined);

  const handleLyricsGenerated = useCallback((lyrics: string, concept: string, data?: SongData) => {
    setGeneratedLyrics(lyrics);
    setSongConcept(concept);
    if (data) {
      setSongData(data);
    }
    setActiveView('produce');
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'create':
        return <MusicCreation onLyricsGenerated={handleLyricsGenerated} />;
      case 'produce':
        return <AudioProductionNew lyrics={generatedLyrics} songData={songData} />;
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
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-secondary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      <Sidebar>
        {/* Logo section */}
        <div className="flex items-center justify-center md:justify-start py-8 px-4 mb-4">
          <div className="relative">
            <LogoIcon className="h-10 w-10 text-primary-400 drop-shadow-lg" />
            <div className="absolute inset-0 bg-primary-500 blur-xl opacity-50"></div>
          </div>
          <span className="ml-3 text-2xl font-black bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent hidden md:inline">
            MUSE AI
          </span>
        </div>

        {/* Navigation items */}
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

      <main className="flex-1 p-6 md:p-10 ml-16 md:ml-64 relative z-10 min-h-screen">
        <div className="animate-fade-in">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
