import React, { useState, useEffect, useCallback } from 'react';
import Page from '../ui/Page';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { generateSpeech, masterAudio, separateAudioStem } from '../../services/geminiService';
import WaveformPlayer from '../ui/WaveformPlayer'; // Import the new component
// FIX: Removed 'js-base64' import to use a compliant custom decoder.

interface AudioProductionProps {
  lyrics: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// FIX: Implement a base64 decode function that returns Uint8Array as per guidelines.
const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to decode base64 and create an AudioBuffer
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


const AudioProduction: React.FC<AudioProductionProps> = ({ lyrics }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const [masteringFile, setMasteringFile] = useState<File | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string>('');
  const [masteredAudioUrl, setMasteredAudioUrl] = useState<string>('');
  const [isMastering, setIsMastering] = useState(false);
  const [masteringError, setMasteringError] = useState('');

  const [separationFile, setSeparationFile] = useState<File | null>(null);
  const [originalSeparationUrl, setOriginalSeparationUrl] = useState<string>('');
  const [vocalStemUrl, setVocalStemUrl] = useState<string>('');
  const [instrumentalStemUrl, setInstrumentalStemUrl] = useState<string>('');
  const [isSeparating, setIsSeparating] = useState(false);
  const [separationError, setSeparationError] = useState('');
  const [stemToSeparate, setStemToSeparate] = useState<'vocals' | 'instrumental'>('vocals');

  const [pitchCorrection, setPitchCorrection] = useState(0);
  const [timingCorrection, setTimingCorrection] = useState(0);

  useEffect(() => {
    // Safari requires a user gesture to create an AudioContext, so we create it on component mount
    // and resume it on button click.
    if (!audioContext) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioContext(context);
    }
    return () => {
      audioContext?.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateVocal = useCallback(async () => {
    if (!lyrics || !audioContext) return;
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    setIsLoading(true);
    setError('');
    setAudioUrl(null);

    try {
      const base64Audio = await generateSpeech(lyrics);
      
      // FIX: Use custom decode function which returns a Uint8Array and takes one argument.
      const audioBytes = decode(base64Audio);
      if(!audioBytes) throw new Error("Could not decode audio");

      // FIX: `audioBytes` is now a Uint8Array, matching the expected type for `decodeAudioData`.
      const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
      
      // Auto-play removed for better user control with the new waveform player.
      // const source = audioContext.createBufferSource();
      // source.buffer = audioBuffer;
      // source.connect(audioContext.destination);
      // source.start();

      // For download and player, create a blob URL (WAV header required)
      const wavBlob = bufferToWave(audioBuffer);
      setAudioUrl(URL.createObjectURL(wavBlob));

    } catch (e) {
      setError('Failed to generate vocal track. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [lyrics, audioContext]);

  const handleMasteringFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMasteringFile(file);
      setOriginalAudioUrl(URL.createObjectURL(file));
      setMasteredAudioUrl('');
      setMasteringError('');
    }
  };

  const handleMasterTrack = async () => {
    if (!masteringFile || !audioContext) return;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    setIsMastering(true);
    setMasteringError('');
    setMasteredAudioUrl('');

    try {
        const base64 = await fileToBase64(masteringFile);
        const masteredBase64 = await masterAudio(base64, masteringFile.type);
        
        // FIX: Use custom decode function which returns a Uint8Array and takes one argument.
        const audioBytes = decode(masteredBase64);
        if(!audioBytes) throw new Error("Could not decode mastered audio");

        // FIX: `audioBytes` is now a Uint8Array, matching the expected type for `decodeAudioData`.
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        const wavBlob = bufferToWave(audioBuffer);
        setMasteredAudioUrl(URL.createObjectURL(wavBlob));

    } catch (e) {
        setMasteringError('Failed to master the audio track. The model may not support this yet.');
        console.error(e);
    } finally {
        setIsMastering(false);
    }
  };

  const handleSeparationFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setSeparationFile(file);
        setOriginalSeparationUrl(URL.createObjectURL(file));
        setVocalStemUrl('');
        setInstrumentalStemUrl('');
        setSeparationError('');
    }
  };

  const handleSeparateStems = async () => {
    if (!separationFile || !audioContext) return;

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    setIsSeparating(true);
    setSeparationError('');
    setVocalStemUrl('');
    setInstrumentalStemUrl('');

    try {
        const base64 = await fileToBase64(separationFile);

        const stemBase64 = await separateAudioStem(base64, separationFile.type, stemToSeparate);
        const stemBytes = decode(stemBase64);
        if (!stemBytes) throw new Error(`Could not decode ${stemToSeparate} stem`);

        const stemBuffer = await decodeAudioData(stemBytes, audioContext, 24000, 1);
        const stemWavBlob = bufferToWave(stemBuffer);
        const stemUrl = URL.createObjectURL(stemWavBlob);

        if (stemToSeparate === 'vocals') {
            setVocalStemUrl(stemUrl);
        } else {
            setInstrumentalStemUrl(stemUrl);
        }
    } catch (e) {
        setSeparationError('Failed to separate stems. The model may not support this feature yet.');
        console.error(e);
    } finally {
        setIsSeparating(false);
    }
  };


  // Utility to convert an AudioBuffer to a WAV Blob
  const bufferToWave = (abuffer: AudioBuffer) => {
    const numOfChan = abuffer.numberOfChannels,
          len = abuffer.length * numOfChan * 2 + 44;
    let buffer = new ArrayBuffer(len),
        view = new DataView(buffer),
        channels = [],
        i, sample,
        offset = 0,
        pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(len - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(len - pos - 4); // chunk length

    for(i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    let frameIndex = 0;
    while(pos < len && frameIndex < abuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][frameIndex]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        frameIndex++;
    }

    return new Blob([buffer], {type: "audio/wav"});

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
  }


  return (
    <Page title="Audio Production" description="Bring your lyrics to life by generating vocal tracks and polishing your final mix with AI mastering.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Lyrics</h3>
            <p className="text-gray-400 whitespace-pre-wrap h-96 overflow-y-auto">{lyrics || "No lyrics generated yet. Go to the 'Create' tab first."}</p>
          </Card>
        </div>
        <div className="md:col-span-2 space-y-8">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Vocal Regeneration (TTS)</h3>
            <p className="text-gray-400 mb-6">Use AI to generate a vocal performance for your lyrics. The generated audio will be played automatically.</p>
            <Button onClick={handleGenerateVocal} isLoading={isLoading} disabled={!lyrics}>
              Generate Vocal Track
            </Button>
            {error && <p className="text-red-400 mt-4">{error}</p>}
            {audioUrl && (
              <div className="mt-6">
                <h4 className="font-semibold">Playback & Download:</h4>
                <WaveformPlayer audioUrl={audioUrl} />
              </div>
            )}
          </Card>
          
          <Card>
            <div className="opacity-50">
              <h3 className="text-xl font-semibold mb-4">Vocal Refinement <span className="text-sm bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full ml-2">Coming Soon</span></h3>
              <p className="text-gray-400 mb-6">Fine-tune the generated vocal track. Adjust pitch, correct timing, or add harmonies. Requires a vocal track to be generated first.</p>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="pitch" className="block text-sm font-medium text-gray-300">Pitch Correction ({pitchCorrection} cents)</label>
                  <input
                    id="pitch"
                    type="range"
                    min="-100"
                    max="100"
                    value={pitchCorrection}
                    onChange={(e) => setPitchCorrection(Number(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-not-allowed accent-indigo-400 disabled:opacity-70"
                    disabled
                  />
                </div>
                
                <div>
                  <label htmlFor="timing" className="block text-sm font-medium text-gray-300">Timing Adjustment</label>
                  <input
                    id="timing"
                    type="range"
                    min="-50"
                    max="50"
                    value={timingCorrection}
                    onChange={(e) => setTimingCorrection(Number(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-not-allowed accent-indigo-400 disabled:opacity-70"
                    disabled
                  />
                </div>

                <Button disabled>Generate Harmony Track</Button>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500 mt-4">This advanced audio-to-audio feature is not yet supported by the available AI models.</p>
          </Card>

          <Card>
            <div className="opacity-50">
                <h3 className="text-xl font-semibold mb-4">AI Mastering Service <span className="text-sm bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full ml-2">Coming Soon</span></h3>
                <p className="text-gray-400 mb-6">Upload your final mix to apply professional mastering for optimal loudness and clarity on all platforms.</p>
                <div className="space-y-4">
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleMasteringFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled
                    />
                     <Button onClick={handleMasterTrack} isLoading={isMastering} disabled>
                        Master Track
                    </Button>
                </div>
                {masteringError && <p className="text-red-400 mt-4">{masteringError}</p>}
            </div>
            <p className="text-xs text-center text-gray-500 mt-4">This advanced audio-to-audio feature is not yet supported by the available AI models.</p>
          </Card>

          <Card>
            <div className="opacity-50">
                <h3 className="text-xl font-semibold mb-4">Stem Separation <span className="text-sm bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full ml-2">Coming Soon</span></h3>
                <p className="text-gray-400 mb-6">Upload a mixed song to separate the vocals from the instrumental track.</p>
                <div className="space-y-4">
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleSeparationFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        disabled
                    />
                    <fieldset>
                      <legend className="text-sm font-medium text-gray-300">Stem to extract:</legend>
                      <div className="mt-2 flex items-center space-x-6">
                        <div className="flex items-center">
                          <input
                            id="vocals"
                            name="stem-type"
                            type="radio"
                            checked={stemToSeparate === 'vocals'}
                            onChange={() => setStemToSeparate('vocals')}
                            className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                            disabled
                          />
                          <label htmlFor="vocals" className="ml-2 block text-sm text-gray-300">
                            Vocals
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            id="instrumental"
                            name="stem-type"
                            type="radio"
                            checked={stemToSeparate === 'instrumental'}
                            onChange={() => setStemToSeparate('instrumental')}
                            className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                            disabled
                          />
                          <label htmlFor="instrumental" className="ml-2 block text-sm text-gray-300">
                            Instrumental
                          </label>
                        </div>
                      </div>
                    </fieldset>
                     <Button onClick={handleSeparateStems} isLoading={isSeparating} disabled>
                        Separate Stem
                    </Button>
                </div>
                {separationError && <p className="text-red-400 mt-4">{separationError}</p>}
            </div>
             <p className="text-xs text-center text-gray-500 mt-4">This advanced audio-to-audio feature is not yet supported by the available AI models.</p>
          </Card>

        </div>
      </div>
    </Page>
  );
};

export default AudioProduction;