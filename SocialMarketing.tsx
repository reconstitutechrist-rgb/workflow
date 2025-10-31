import React, { useState, useEffect, useCallback } from 'react';
import Page from './Page';
import Card from './Card';
import Button from './Button';
import { generateMarketingPackage, generateImage, generateVideo, pollVideoOperation } from './geminiService';
import { SocialMarketingPackage, SavedCampaign } from './types';
import PostPreview from './PostPreview';


interface SocialMarketingProps {
  lyrics: string;
  songConcept: string;
}

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant="ghost" onClick={handleCopy} className="text-xs px-2 py-1">
            {copied ? 'Copied!' : 'Copy'}
        </Button>
    );
};

// Helper function to trigger file downloads
const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const SocialMarketing: React.FC<SocialMarketingProps> = ({ lyrics, songConcept }) => {
    const [result, setResult] = useState<SocialMarketingPackage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [targetAudience, setTargetAudience] = useState('Fans of indie pop and heartfelt singer-songwriters.');

    // Image State
    const [imagePrompt, setImagePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
    const [imageUrl, setImageUrl] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageError, setImageError] = useState('');

    // Video State
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [videoPrompts, setVideoPrompts] = useState<string[]>([]);
    const [generatingVideoIndex, setGeneratingVideoIndex] = useState<number | null>(null);
    const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
    const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
    const [videoErrors, setVideoErrors] = useState<Record<number, string>>({});

    // Saved Campaigns State
    const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaign[]>([]);

    // Preview State
    const [activeCaptionIndexes, setActiveCaptionIndexes] = useState<Record<string, number>>({});

    const checkApiKey = useCallback(async () => {
        if (typeof (window as any).aistudio === 'undefined') {
            setApiKeySelected(true); // Assume no environment to check, allow proceeding
            return;
        }
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    // Load saved campaigns from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('museAiSavedCampaigns');
            if (saved) {
                setSavedCampaigns(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load saved campaigns:", e);
        }
    }, []);
    
    // Persist saved campaigns to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('museAiSavedCampaigns', JSON.stringify(savedCampaigns));
        } catch (e) {
            console.error("Failed to save campaigns:", e);
        }
    }, [savedCampaigns]);

    const handleSelectKey = async () => {
        await (window as any).aistudio.openSelectKey();
        setApiKeySelected(true);
    };

    const handleGenerate = async () => {
        if (!lyrics || !songConcept) return;
        setIsLoading(true);
        setError('');
        setResult(null);
        setImageUrl('');
        setImageError('');
        setVideoUrls({});
        setVideoErrors({});
        try {
            const pkg = await generateMarketingPackage(lyrics, songConcept, targetAudience);
            setResult(pkg);
            setImagePrompt(pkg.imagePrompt || '');
            setVideoPrompts(pkg.videoPrompts || []);
            setActiveCaptionIndexes({}); // Reset caption indexes on new generation
        } catch (e) {
            setError('Failed to generate marketing package. Please try again.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) return;
        setIsGeneratingImage(true);
        setImageError('');
        setImageUrl('');
        try {
            const url = await generateImage(imagePrompt, aspectRatio);
            setImageUrl(url);
        } catch (e) {
            setImageError('Failed to generate image.');
            console.error(e);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleGenerateVideo = async (prompt: string, index: number) => {
        if (!apiKeySelected) {
            handleSelectKey();
            return;
        }
        setGeneratingVideoIndex(index);
        setVideoLoadingMessage('Initializing video generation...');
        setVideoErrors(prev => ({ ...prev, [index]: '' }));
        setVideoUrls(prev => ({ ...prev, [index]: '' }));


        try {
            let operation = await generateVideo(prompt, '9:16', '720p');
            setVideoLoadingMessage('Operation started. Polling for results...');

            let pollCount = 0;
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await pollVideoOperation(operation);
                pollCount++;
                setVideoLoadingMessage(`Processing... (check ${pollCount})`);
            }

            if (operation.error) {
                throw new Error(operation.error.message || 'The video operation failed.');
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) throw new Error(`Failed to fetch video (HTTP ${videoResponse.status})`);
                const videoBlob = await videoResponse.blob();
                setVideoUrls(prev => ({ ...prev, [index]: URL.createObjectURL(videoBlob) }));
            } else {
                throw new Error('No video URL found after generation.');
            }
        } catch (e) {
            // FIX: The error object `e` in a catch block is of type `unknown`.
            // We must check if it's an instance of Error before safely accessing `e.message`.
            let errorMessage = "Failed to generate video.";
            if (e instanceof Error) {
                if (e.message.includes('Requested entity was not found')) {
                    errorMessage = "API Key error. Please re-select your API key.";
                    setApiKeySelected(false);
                } else {
                    errorMessage = e.message;
                }
            }
            setVideoErrors(prev => ({ ...prev, [index]: errorMessage }));
            console.error(e);
        } finally {
            setGeneratingVideoIndex(null);
            setVideoLoadingMessage('');
        }
    };

    const handleSaveCampaign = () => {
        if (!result) return;
        const name = window.prompt("Enter a name for this campaign:", `Campaign - ${new Date().toLocaleDateString()}`);
        if (name) {
            const newCampaign: SavedCampaign = {
                ...result,
                id: Date.now().toString(),
                name: name,
                createdAt: Date.now(),
            };
            setSavedCampaigns(prev => [newCampaign, ...prev].sort((a,b) => b.createdAt - a.createdAt));
        }
    };

    const handleLoadCampaign = (campaign: SavedCampaign) => {
        setResult(campaign);
        setTargetAudience('Fans of indie pop and heartfelt singer-songwriters.'); // Reset or load this too if saved
        setImagePrompt(campaign.imagePrompt || '');
        setVideoPrompts(campaign.videoPrompts || []);
        // Reset dynamic content
        setImageUrl('');
        setVideoUrls({});
        setVideoErrors({});
        setError('');
        setActiveCaptionIndexes({});
    };

    const handleDeleteCampaign = (id: string) => {
        if (window.confirm("Are you sure you want to delete this saved campaign?")) {
            setSavedCampaigns(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleCaptionCycle = (platform: string, direction: 'next' | 'prev', totalVariations: number) => {
        setActiveCaptionIndexes(prev => {
            const currentIndex = prev[platform] || 0;
            let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
            if (nextIndex >= totalVariations) nextIndex = 0;
            if (nextIndex < 0) nextIndex = totalVariations - 1;
            return { ...prev, [platform]: nextIndex };
        });
    };

    const aspectRatioClasses = {
        '1:1': 'aspect-square',
        '16:9': 'aspect-video',
        '9:16': 'aspect-[9/16]',
        '4:3': 'aspect-[4/3]',
        '3:4': 'aspect-[3/4]',
    };


    return (
        <Page title="AI Marketing Suite" description="Generate a complete promotional campaign, from press releases to social media videos.">
            <Card>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-300">Target Audience</label>
                        <input
                            type="text"
                            id="targetAudience"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            className="mt-1 block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-500"
                            placeholder="e.g., Fans of lo-fi hip hop and chillwave"
                        />
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                         <p className="text-gray-400 mt-1">
                            {lyrics ? "Click generate to create a campaign, or load a saved one." : "First, create a song in the 'Create' tab."}
                         </p>
                         <div className="flex items-center gap-4">
                            {result && <Button onClick={handleSaveCampaign} variant="secondary">Save Campaign</Button>}
                            <Button onClick={handleGenerate} isLoading={isLoading} disabled={!lyrics || !songConcept}>
                                {result ? 'Regenerate Campaign' : 'Generate Campaign'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {error && <p className="text-red-400 text-center mt-4">{error}</p>}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 {/* Left Column: Written Content */}
                <div className="lg:col-span-1 space-y-6">
                    {savedCampaigns.length > 0 && (
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Saved Campaigns</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {savedCampaigns.map(campaign => (
                                    <div key={campaign.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-md">
                                        <div>
                                            <p className="font-semibold text-sm">{campaign.name}</p>
                                            <p className="text-xs text-gray-500">{new Date(campaign.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => handleLoadCampaign(campaign)}>Load</Button>
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteCampaign(campaign.id)}>Delete</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {result && (
                        <>
                            <Card>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-lg font-semibold">Suggested Hashtags</h3>
                                    <CopyButton textToCopy={result.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')} />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {result.hashtags.map((tag, i) => (
                                        <span key={i} className="bg-gray-700 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                                            {tag.startsWith('#') ? tag : `#${tag}`}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                            <Card>
                                 <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Social Media Captions</h3>
                                 </div>
                                 {result.captions.map((p, i) => (
                                    <div key={i} className="mt-4">
                                        <h4 className="font-bold text-md text-indigo-300">{p.platform}</h4>
                                        <div className="space-y-3 mt-2">
                                            {p.variations.map((v, j) => (
                                                <div key={j} className="flex justify-between items-start p-3 bg-gray-900/50 rounded-md">
                                                    <p className="text-sm text-gray-300 whitespace-pre-wrap flex-1">"{v}"</p>
                                                    <CopyButton textToCopy={v} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </Card>
                            <Card>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Artist Bio</h3>
                                    <CopyButton textToCopy={result.artistBio} />
                                </div>
                                <p className="text-gray-400 mt-2 text-sm whitespace-pre-wrap">{result.artistBio}</p>
                            </Card>
                            <Card>
                                 <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Press Release</h3>
                                    <CopyButton textToCopy={result.pressRelease} />
                                </div>
                                <p className="text-gray-400 mt-2 text-sm whitespace-pre-wrap">{result.pressRelease}</p>
                            </Card>
                             <Card>
                                <h3 className="text-lg font-semibold mb-3">Interview Talking Points</h3>
                                <ul className="space-y-2">
                                    {result.interviewPoints.map((point, i) => (
                                         <li key={i} className="flex justify-between items-start text-sm text-gray-400">
                                             <span>• {point}</span>
                                             <CopyButton textToCopy={point} />
                                         </li>
                                    ))}
                                </ul>
                            </Card>
                            <Card>
                                <h3 className="text-lg font-semibold mb-3">7-Day Release Timeline</h3>
                                <div className="space-y-3">
                                    {result.releaseTimeline.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-2 bg-gray-900/50 rounded-md">
                                            <div className="bg-indigo-500/20 text-indigo-300 font-bold rounded-md h-8 w-8 flex-shrink-0 flex items-center justify-center text-sm">D{item.day}</div>
                                            <div>
                                                <p className="font-semibold text-sm">{item.platform}</p>
                                                <p className="text-xs text-gray-400">{item.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </>
                    )}
                </div>


                {/* Right Column: Visual Assets */}
                <div className="lg:col-span-1 space-y-6">
                    {result && (
                        <>
                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Promotional Image</h3>
                            <p className="text-gray-400 mb-4 text-sm">Use this AI-suggested prompt to generate a visual for your posts.</p>
                            <div className="space-y-3">
                                <div className="flex items-start">
                                    <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} className="block w-full bg-gray-900 border-gray-600 rounded-md shadow-sm placeholder-gray-500 text-sm"/>
                                    <CopyButton textToCopy={imagePrompt} />
                                </div>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="block w-full bg-gray-900 border-gray-600 rounded-md">
                                    <option value="1:1">Square for Posts (1:1)</option>
                                    <option value="9:16">Portrait for Stories (9:16)</option>
                                    <option value="16:9">Landscape for Banners (16:9)</option>
                                    <option value="4:3">Standard (4:3)</option>
                                    <option value="3:4">Tall (3:4)</option>
                                </select>
                                <Button onClick={handleGenerateImage} isLoading={isGeneratingImage} disabled={!imagePrompt} className="w-full">Generate Image</Button>
                            </div>
                            {imageError && <p className="text-red-400 mt-2 text-center text-sm">{imageError}</p>}
                            {imageUrl && !isGeneratingImage && (
                                <div className="mt-4">
                                    <div className={`w-full overflow-hidden rounded-lg bg-gray-900 ${aspectRatioClasses[aspectRatio]}`}>
                                        <img
                                            src={imageUrl}
                                            alt="Generated promotional art"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <a href={imageUrl} download={`MUSE_AI_ART_${Date.now()}.jpg`} className="inline-flex items-center justify-center w-full px-4 py-2 mt-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">Download Image</a>
                                </div>
                            )}
                        </Card>

                        <Card>
                            <h3 className="text-lg font-semibold mb-3">Post Previews</h3>
                            <div className="space-y-6">
                                {result.captions.map(p => {
                                    const platform = p.platform as 'Instagram' | 'TikTok' | 'Twitter/X';
                                    const currentIndex = activeCaptionIndexes[platform] || 0;
                                    const currentCaption = p.variations[currentIndex];
                                    const tikTokVideoUrl = videoUrls[0] ?? '';

                                    const handleShare = () => {
                                        switch (platform) {
                                            case 'Instagram':
                                                if (!imageUrl) {
                                                    alert("Please generate the promotional image first.");
                                                    return;
                                                }
                                                navigator.clipboard.writeText(currentCaption)
                                                    .then(() => {
                                                        triggerDownload(imageUrl, `muse_ai_instagram_${Date.now()}.jpg`);
                                                        alert("Caption copied to clipboard and image download started! Open Instagram to create your post.");
                                                    })
                                                    .catch(err => {
                                                        console.error('Failed to copy caption: ', err);
                                                        alert('Failed to copy caption. Please copy it manually.');
                                                    });
                                                break;
                                            case 'TikTok':
                                                if (!tikTokVideoUrl) {
                                                    alert("Please generate a teaser video first.");
                                                    return;
                                                }
                                                 navigator.clipboard.writeText(currentCaption)
                                                    .then(() => {
                                                        triggerDownload(tikTokVideoUrl, `muse_ai_tiktok_${Date.now()}.mp4`);
                                                        alert("Caption copied to clipboard and video download started! Open TikTok to create your post.");
                                                    })
                                                    .catch(err => {
                                                        console.error('Failed to copy caption: ', err);
                                                        alert('Failed to copy caption. Please copy it manually.');
                                                    });
                                                break;
                                            case 'Twitter/X':
                                                const tweetText = encodeURIComponent(currentCaption);
                                                window.open(`https://x.com/intent/tweet?text=${tweetText}`, '_blank');
                                                break;
                                        }
                                    };

                                    return (
                                        <div key={platform}>
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-md text-indigo-300">{platform}</h4>
                                                <div className="flex items-center gap-1">
                                                     <span className="text-xs text-gray-400">Variation {currentIndex + 1} of {p.variations.length}</span>
                                                    <Button size="sm" variant="ghost" className="px-1 py-1 h-6 w-6" onClick={() => handleCaptionCycle(platform, 'prev', p.variations.length)}>&lt;</Button>
                                                    <Button size="sm" variant="ghost" className="px-1 py-1 h-6 w-6" onClick={() => handleCaptionCycle(platform, 'next', p.variations.length)}>&gt;</Button>
                                                </div>
                                            </div>
                                            <PostPreview
                                                platform={platform}
                                                imageUrl={imageUrl}
                                                videoUrl={platform === 'TikTok' ? tikTokVideoUrl : undefined}
                                                caption={currentCaption}
                                                onShare={handleShare}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                         <Card>
                            <h3 className="text-lg font-semibold mb-3">Teaser Videos (Stories / Reels)</h3>
                             {!apiKeySelected && (
                                <div className="text-center p-4 bg-yellow-900/50 rounded-lg">
                                    <p className="text-yellow-300 text-sm mb-3">Video generation requires selecting an API key with billing enabled. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">Learn more</a>.</p>
                                    <Button onClick={handleSelectKey} variant="secondary">Select API Key</Button>
                                </div>
                            )}
                            <div className="space-y-4 mt-4">
                                {videoPrompts.map((prompt, i) => (
                                     <div key={i} className="p-3 bg-gray-900/50 rounded-md">
                                        <p className="text-sm text-gray-400 mb-2 italic">"{prompt}"</p>
                                        <Button onClick={() => handleGenerateVideo(prompt, i)} isLoading={generatingVideoIndex === i} disabled={generatingVideoIndex !== null} className="w-full text-sm">
                                            {videoUrls[i] ? `Regenerate Video ${i + 1}` : `Generate Video ${i + 1}`}
                                        </Button>
                                        {generatingVideoIndex === i && (
                                            <div className="mt-4 flex items-center justify-center space-x-2">
                                                <svg className="animate-spin h-5 w-5 text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <p className="text-indigo-300 text-sm">{videoLoadingMessage}</p>
                                            </div>
                                        )}
                                        {videoErrors[i] && <p className="text-red-400 mt-2 text-center text-sm">{videoErrors[i]}</p>}
                                        {videoUrls[i] && (
                                            <div className="mt-4">
                                                <video controls key={videoUrls[i]} autoPlay loop className="rounded-lg w-full">
                                                    <source src={videoUrls[i]} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                                <a href={videoUrls[i]} download={`MUSE_AI_TEASER_${i + 1}_${Date.now()}.mp4`} className="inline-flex items-center justify-center w-full px-4 py-2 mt-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                                                    Download Video
                                                </a>
                                            </div>
                                        )}
                                     </div>
                                ))}
                            </div>
                         </Card>
                        </>
                    )}
                </div>
            </div>
        </Page>
    );
};

export default SocialMarketing;