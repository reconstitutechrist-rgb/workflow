import React, { useState, useEffect, useCallback } from 'react';
import Page from './Page';
import Card from './Card';
import Button from './Button';
import TextArea from './TextArea';
import WaveformPlayer from './WaveformPlayer';
import { SongData } from './types';
import { getMusicService } from './musicGenerationService';
import type { SongGenerationResponse } from './musicGenerationService';

interface AudioProductionProps {
  lyrics: string;
  songData?: SongData;
}

const AudioProductionNew: React.FC<AudioProductionProps> = ({ lyrics, songData }) => {
  // Professional AI Music Generation State
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);
  const [songGenerationError, setSongGenerationError] = useState('');
  const [songGenerationProgress, setSongGenerationProgress] = useState('');
  const [generatedSong, setGeneratedSong] = useState<SongGenerationResponse | null>(null);
  const [customStyle, setCustomStyle] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);

  // Initialize custom fields from props
  useEffect(() => {
    if (songData?.style) {
      setCustomStyle(songData.style);
    }
    if (lyrics) {
      setCustomLyrics(lyrics);
    }
  }, [songData, lyrics]);

  const handleGenerateProfessionalSong = useCallback(async () => {
    const finalLyrics = customLyrics || lyrics;
    const finalStyle = customStyle || songData?.style || 'Pop, upbeat';

    if (!finalLyrics && !instrumental) {
      setSongGenerationError('Please provide lyrics or enable instrumental mode');
      return;
    }

    if (!process.env.MUSIC_API_KEY || process.env.MUSIC_API_KEY === 'YOUR_MUSIC_API_KEY_HERE') {
      setSongGenerationError(
        'Music API not configured. Please add your MUSIC_API_KEY to the .env.local file. ' +
        'Get an API key from MusicAPI.ai, Suno API, or Udio API.'
      );
      return;
    }

    setIsGeneratingSong(true);
    setSongGenerationError('');
    setSongGenerationProgress('Submitting your song to the AI music generator...');
    setGeneratedSong(null);

    try {
      const musicService = getMusicService();

      // Start song generation
      const response = await musicService.generateSong({
        lyrics: finalLyrics,
        style: finalStyle,
        title: songData?.title || 'Untitled',
        instrumental: instrumental,
      });

      setSongGenerationProgress(`Song queued! Generation ID: ${response.id}. Waiting for AI to create your music...`);

      // Poll for completion
      const completedSong = await musicService.waitForCompletion(
        response.id,
        (progress) => {
          if (progress.status === 'generating') {
            setSongGenerationProgress(`Creating your song... This usually takes 1-3 minutes. Status: ${progress.status}`);
          } else if (progress.status === 'queued') {
            setSongGenerationProgress('Your song is in the queue. This may take a few moments...');
          }
        },
        60, // Max attempts (60 * 5s = 5 minutes)
        5000 // Check every 5 seconds
      );

      if (completedSong.status === 'failed') {
        throw new Error(completedSong.error || 'Song generation failed');
      }

      setGeneratedSong(completedSong);
      setSongGenerationProgress('Song generated successfully!');

    } catch (error) {
      console.error('Failed to generate professional song:', error);
      setSongGenerationError(
        error instanceof Error
          ? error.message
          : 'Failed to generate song. Please check your API configuration and try again.'
      );
      setSongGenerationProgress('');
    } finally {
      setIsGeneratingSong(false);
    }
  }, [customLyrics, lyrics, customStyle, songData, instrumental]);

  const downloadAudio = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <Page
      title="Audio Production"
      description="Create professional AI-generated music with vocals and instruments, or use experimental TTS for basic vocal tracks."
    >
      <div className="space-y-8">
        {/* Professional AI Music Generation - Primary Feature */}
        <Card hover glow className="border-2 border-primary-500/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-primary-300 bg-clip-text text-transparent mb-2">
                Professional AI Music Generation
              </h3>
              <span className="inline-block px-3 py-1 text-xs font-semibold bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-full">
                Powered by Suno/Udio AI
              </span>
            </div>
          </div>

          <p className="text-gray-300 mb-6 leading-relaxed">
            Generate complete studio-quality songs with professional vocals, instruments, and production.
            This uses state-of-the-art AI music models to create real music, not synthesized speech.
          </p>

          <div className="space-y-6">
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Music Style / Genre
                </label>
                <input
                  type="text"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  placeholder="e.g., Upbeat pop with acoustic guitar, electronic beats"
                  className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Be specific: include genre, tempo, instruments, mood
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Song Title
                </label>
                <input
                  type="text"
                  value={songData?.title || 'Untitled'}
                  disabled
                  className="w-full px-4 py-3 bg-gray-800/30 border border-white/5 rounded-xl text-gray-400"
                />
              </div>
            </div>

            {/* Lyrics */}
            <div>
              <TextArea
                label="Lyrics"
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                placeholder="Enter or edit your song lyrics here..."
                rows={10}
                helperText="Edit the lyrics or use the ones from the Create tab"
                className="font-mono text-sm"
              />
            </div>

            {/* Options */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={instrumental}
                  onChange={(e) => setInstrumental(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-gray-800 text-primary-600 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-0 transition-colors"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Generate Instrumental Only (no vocals)
                </span>
              </label>
            </div>

            {/* Generate Button */}
            <div className="flex items-center space-x-4">
              <Button
                variant="gradient"
                size="lg"
                onClick={handleGenerateProfessionalSong}
                isLoading={isGeneratingSong}
                disabled={(!customLyrics && !lyrics && !instrumental) || isGeneratingSong}
                className="flex-1"
              >
                {isGeneratingSong ? 'Generating Song...' : 'Generate Professional Song'}
              </Button>
            </div>

            {/* Progress */}
            {songGenerationProgress && (
              <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  <p className="text-sm text-primary-300">{songGenerationProgress}</p>
                </div>
              </div>
            )}

            {/* Error */}
            {songGenerationError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300">{songGenerationError}</p>
                {songGenerationError.includes('Music API not configured') && (
                  <div className="mt-3 text-xs text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-300">Setup Instructions:</p>
                    <p>1. Get an API key from one of these providers:</p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>MusicAPI.ai - <a href="https://musicapi.ai" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">musicapi.ai</a></li>
                      <li>Suno API - <a href="https://docs.sunoapi.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">docs.sunoapi.com</a></li>
                      <li>Udio API - <a href="https://udioapi.pro" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">udioapi.pro</a></li>
                    </ul>
                    <p>2. Add your API key to .env.local file:</p>
                    <code className="block mt-1 p-2 bg-gray-900/50 rounded text-primary-400">
                      MUSIC_API_KEY=your_api_key_here
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* Generated Song */}
            {generatedSong && generatedSong.audioUrl && (
              <div className="mt-6 p-6 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      {generatedSong.title || 'Your Generated Song'}
                    </h4>
                    <p className="text-sm text-gray-400">
                      Duration: {generatedSong.duration ? `${Math.floor(generatedSong.duration)}s` : 'Unknown'}
                    </p>
                  </div>
                  {generatedSong.coverImageUrl && (
                    <img
                      src={generatedSong.coverImageUrl}
                      alt="Cover art"
                      className="w-20 h-20 rounded-xl object-cover border-2 border-primary-500/30"
                    />
                  )}
                </div>

                {/* Audio Player */}
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <audio
                    controls
                    src={generatedSong.audioUrl}
                    className="w-full"
                    style={{ filter: 'hue-rotate(200deg)' }}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => downloadAudio(generatedSong.audioUrl!, `${generatedSong.title || 'song'}.mp3`)}
                  >
                    Download MP3
                  </Button>
                  {generatedSong.videoUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(generatedSong.videoUrl, '_blank')}
                    >
                      View Music Video
                    </Button>
                  )}
                </div>

                {generatedSong.lyrics && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-300 hover:text-white">
                      View Lyrics
                    </summary>
                    <pre className="mt-3 p-4 bg-gray-900/50 rounded-xl text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {generatedSong.lyrics}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Info Box */}
        <Card>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">About Professional Music Generation</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Uses Suno AI or Udio AI for studio-quality music production</li>
                <li>• Generates complete songs with real vocals, instruments, and production</li>
                <li>• Generation typically takes 1-3 minutes depending on server load</li>
                <li>• Supports various genres: pop, rock, hip-hop, electronic, classical, and more</li>
                <li>• API key required (get one from MusicAPI.ai, Suno API, or Udio API)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
};

export default AudioProductionNew;
