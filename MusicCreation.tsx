import React, { useState, useEffect, useRef, useCallback } from 'react';
import Page from './Page';
import Card from './Card';
import Button from './Button';
import { generateOrRefineSong, generateInstrumentalTrack } from './geminiService';
import { ChatMessage, SongData } from './types';
import WaveformPlayer from './WaveformPlayer';

// --- Audio Helper Functions ---

const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const bufferToWave = (abuffer: AudioBuffer) => {
    const numOfChan = abuffer.numberOfChannels,
          len = abuffer.length * numOfChan * 2 + 44;
    let buffer = new ArrayBuffer(len),
        view = new DataView(buffer),
        channels = [], i, sample, offset = 0, pos = 0;
    setUint32(0x46464952); setUint32(len - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
    setUint32(len - pos - 4);
    for(i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    let frameIndex = 0;
    while(pos < len && frameIndex < abuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][frameIndex]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(pos, sample, true); pos += 2;
        }
        frameIndex++;
    }
    return new Blob([buffer], {type: "audio/wav"});
    function setUint16(data: number) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data: number) { view.setUint32(pos, data, true); pos += 4; }
}

// FIX: Export the useUndoRedo hook as it is imported by VideoCreation.tsx.
export const useUndoRedo = <T,>(initialState: T) => {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const set = useCallback(
    (newState: T | ((prevState: T) => T)) => {
      const resolvedState =
        newState instanceof Function ? newState(state) : newState;
      const newHistory = history.slice(0, index + 1);
      newHistory.push(resolvedState);
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    },
    [history, index, state],
  );

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prevIndex => prevIndex - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prevIndex => prevIndex + 1);
    }
  }, [index, history.length]);

  const reset = useCallback((newState: T) => {
    setHistory([newState]);
    setIndex(0);
  }, []);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, set, undo, redo, reset, canUndo, canRedo };
};

// --- Component ---

const RegenerateIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M15.312 11.344A5.5 5.5 0 0110 15.5a5.5 5.5 0 01-5.5-5.5H2.5a.5.5 0 01-.354-.854l2.5-2.5a.5.5 0 01.708 0l2.5 2.5a.5.5 0 01-.354.854H4.5A3.5 3.5 0 108 8.128V6.5a.5.5 0 011 0v3.5a.5.5 0 01-.5.5h-3.5a.5.5 0 010-1h1.872A5.503 5.503 0 0115.312 11.344z" clipRule="evenodd"/>
    </svg>
);


interface MusicCreationProps {
  onLyricsGenerated: (lyrics: string, concept: string, songData?: SongData) => void;
}

const initialMessages: ChatMessage[] = [{
    role: 'model',
    text: "Hello! I'm Song Maker GPT, your creative partner. Describe a feeling, a story, or a style of music you have in mind, and let's create a song together."
}];

const MusicCreation: React.FC<MusicCreationProps> = ({ onLyricsGenerated }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestSongData, setLatestSongData] = useState<SongData | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!audioContext) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(context);
    }
    return () => { audioContext?.close(); }
  }, [audioContext]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userInput = chatInput;
    const userMessage: ChatMessage = { role: 'user', text: userInput };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput('');
    setIsLoading(true);

    try {
        const response = await generateOrRefineSong(newMessages);
        setLatestSongData(response.songData);

        const modelMessage: ChatMessage = {
            role: 'model',
            text: response.conversationalResponse,
            songData: response.songData
        };
        setChatMessages([...newMessages, modelMessage]);

    } catch (e) {
        console.error(e);
        const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I ran into a creative block. Could you try phrasing that differently?" };
        setChatMessages([...newMessages, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (isLoading) return;

    // Find the last user message to determine the history to resend.
    let lastUserMessageIndex = -1;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].role === 'user') {
            lastUserMessageIndex = i;
            break;
        }
    }

    // Can only regenerate if there's a user prompt and a model response.
    if (lastUserMessageIndex === -1 || chatMessages[chatMessages.length - 1].role !== 'model') {
        return;
    }

    // The history to resend is everything up to and including the last user message.
    const historyToResend = chatMessages.slice(0, lastUserMessageIndex + 1);
    
    // Show loading state by removing the last model message
    setChatMessages(historyToResend);
    setIsLoading(true);

    try {
        const response = await generateOrRefineSong(historyToResend);
        setLatestSongData(response.songData);

        const modelMessage: ChatMessage = {
            role: 'model',
            text: response.conversationalResponse,
            songData: response.songData
        };
        setChatMessages([...historyToResend, modelMessage]);

    } catch (e) {
        console.error(e);
        const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I ran into a creative block while regenerating. Could you try phrasing that differently?" };
        setChatMessages([...historyToResend, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };


  const handleGenerateMusic = useCallback(async (messageIndex: number) => {
    const message = chatMessages[messageIndex];
    if (!message.songData || !audioContext) return;

    // Set loading state for this specific message
    setChatMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, isLoadingAudio: true, audioUrl: undefined } : msg
    ));

    try {
        if (audioContext.state === 'suspended') await audioContext.resume();
        const base64Audio = await generateInstrumentalTrack(message.songData.style);
        
        const audioBytes = decode(base64Audio);
        if(!audioBytes) throw new Error("Could not decode audio");
        
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        const wavBlob = bufferToWave(audioBuffer);
        const audioUrl = URL.createObjectURL(wavBlob);

        // Update the message with the audio URL and remove loading state
        setChatMessages(prev => prev.map((msg, idx) => 
            idx === messageIndex ? { ...msg, isLoadingAudio: false, audioUrl: audioUrl } : msg
        ));
    } catch (e) {
        console.error(e);
        // Update the message with an error and remove loading state
        setChatMessages(prev => prev.map((msg, idx) => 
            idx === messageIndex ? { ...msg, isLoadingAudio: false, text: msg.text + "\n\nSorry, I couldn't generate the audio for this version." } : msg
        ));
    }
  }, [chatMessages, audioContext]);

  const handleProceed = () => {
    if (latestSongData) {
      // The `concept` for other tabs can be derived from the `style` description
      onLyricsGenerated(latestSongData.lyrics, latestSongData.style, latestSongData);
    }
  };

  const formatSongForDisplay = (song: SongData) => {
      return (
          <>
              <h3 className="font-bold text-lg mt-4">Title: "{song.title}"</h3>
              <p className="text-sm text-gray-400 italic mt-1">Style: {song.style}</p>
              <pre className="whitespace-pre-wrap font-sans text-sm bg-gray-900/50 p-3 rounded-md mt-3">{song.lyrics}</pre>
          </>
      );
  };

  return (
    <Page title="Compose with AI" description="Create your next song through a conversation. Describe your idea, refine the lyrics and style, and generate music as you go.">
      <div className="flex flex-col h-[calc(100vh-14rem)]">
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-prose px-4 py-3 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-700'}`}>
                          <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
                          {msg.songData && (
                              <div className="mt-2 border-t border-gray-600 pt-2">
                                  {formatSongForDisplay(msg.songData)}
                                  <div className="mt-4">
                                      {msg.isLoadingAudio ? (
                                           <div className="flex items-center justify-center p-3 bg-gray-800 rounded-lg">
                                               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                               <span>Generating instrumental...</span>
                                           </div>
                                      ) : msg.audioUrl ? (
                                          <WaveformPlayer audioUrl={msg.audioUrl} />
                                      ) : (
                                          <Button onClick={() => handleGenerateMusic(i)} variant="secondary" size="sm">
                                              Generate Instrumental for this Version
                                          </Button>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                      {i === chatMessages.length - 1 && msg.role === 'model' && chatMessages.length > 1 && !isLoading && (
                          <div className="mt-2 text-left">
                              <Button onClick={handleRegenerate} variant="ghost" size="sm">
                                  <RegenerateIcon />
                                  Regenerate
                              </Button>
                          </div>
                      )}
                  </div>
              ))}
              {isLoading && (
                  <div className="flex items-start">
                      <div className="max-w-prose px-4 py-3 rounded-lg bg-gray-700">
                           <p className="text-sm italic text-gray-400">Song Maker is typing...</p>
                      </div>
                  </div>
              )}
              <div ref={chatEndRef} />
          </div>
          <div className="mt-auto p-4 border-t border-gray-700">
              <div className="flex">
                  <textarea
                      rows={2}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChatSend())}
                      className="flex-1 bg-gray-800 border-gray-600 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 resize-none"
                      placeholder="e.g., 'Make it more powerful' or 'Change the story to be about...'"
                      disabled={isLoading}
                  />
                  <Button onClick={handleChatSend} isLoading={isLoading} className="rounded-l-none self-stretch">Send</Button>
              </div>
          </div>
        </Card>
      </div>
      <div className="mt-6 flex justify-center">
          <Button onClick={handleProceed} variant="primary" size="lg" disabled={!latestSongData}>
              Proceed to Audio Production &raquo;
          </Button>
      </div>
    </Page>
  );
};

export default MusicCreation;
