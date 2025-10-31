import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';
import type { SongGenerationResponse } from './musicGenerationService';

interface GeneratedSong extends SongGenerationResponse {
  generatedAt: number;
}

interface MusicPlayerPanelProps {
  songs: GeneratedSong[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MusicPlayerPanel: React.FC<MusicPlayerPanelProps> = ({
  songs,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownload = (song: GeneratedSong, type: 'complete' | 'vocals' | 'instrumental') => {
    const baseFilename = song.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'song';

    switch (type) {
      case 'complete':
        if (song.audioUrl) {
          downloadFile(song.audioUrl, `${baseFilename}_complete.mp3`);
        }
        break;
      case 'vocals':
        // Note: Most APIs don't provide separate stems by default
        // This would require additional API calls to generate stems
        if (song.audioUrl) {
          alert('Vocal-only track generation coming soon! This requires additional API support.');
        }
        break;
      case 'instrumental':
        // Similar to vocals - would need separate generation
        if (song.audioUrl) {
          alert('Instrumental-only track generation coming soon! This requires additional API support.');
        }
        break;
    }
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-0 h-screen w-12 bg-gradient-to-l from-gray-900/95 to-gray-900/90 backdrop-blur-xl border-l border-white/10 flex flex-col items-center justify-center z-20 shadow-2xl">
        <button
          onClick={onToggleCollapse}
          className="p-3 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Expand music panel"
        >
          <svg className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="mt-4 -rotate-90 whitespace-nowrap text-sm font-semibold text-primary-400">
          Music Panel ({songs.length})
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 lg:w-96 bg-gradient-to-l from-gray-900/95 to-gray-900/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Generated Music</h3>
            <p className="text-xs text-gray-400">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Collapse music panel"
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No songs generated yet.</p>
            <p className="text-gray-500 text-xs mt-2">
              Ask the AI to generate music from your lyrics!
            </p>
          </div>
        ) : (
          songs.map((song) => (
            <Card key={song.id} className="!p-0 overflow-hidden" hover>
              {/* Cover Art */}
              {song.coverImageUrl ? (
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={song.coverImageUrl}
                    alt={song.title || 'Song cover'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                </div>
              ) : (
                <div className="relative h-40 w-full bg-gradient-to-br from-primary-600/20 to-accent-600/20 flex items-center justify-center">
                  <svg className="h-16 w-16 text-primary-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              )}

              {/* Song Info & Controls */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-white text-sm line-clamp-1">
                    {song.title || 'Untitled'}
                  </h4>
                  {song.duration && (
                    <p className="text-xs text-gray-400">
                      {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                    </p>
                  )}
                </div>

                {/* Audio Player */}
                {song.audioUrl && (
                  <audio
                    controls
                    src={song.audioUrl}
                    className="w-full h-10"
                    style={{ filter: 'hue-rotate(200deg)', height: '36px' }}
                  />
                )}

                {/* Download Options */}
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedSongId(expandedSongId === song.id ? null : song.id)}
                    className="w-full text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors flex items-center justify-center space-x-1"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{expandedSongId === song.id ? 'Hide Downloads' : 'Download Options'}</span>
                  </button>

                  {expandedSongId === song.id && (
                    <div className="space-y-2 animate-fade-in">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(song, 'complete')}
                        disabled={!song.audioUrl}
                        className="w-full !py-2 !text-xs"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        Complete Song
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(song, 'vocals')}
                        disabled={!song.audioUrl}
                        className="w-full !py-2 !text-xs"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Vocals Only
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownload(song, 'instrumental')}
                        disabled={!song.audioUrl}
                        className="w-full !py-2 !text-xs"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        Instrumental Only
                      </Button>
                    </div>
                  )}
                </div>

                {/* View Lyrics */}
                {song.lyrics && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors font-medium">
                      View Lyrics
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-900/50 rounded-lg text-gray-300 whitespace-pre-wrap font-mono text-xs max-h-40 overflow-y-auto">
                      {song.lyrics}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default MusicPlayerPanel;
