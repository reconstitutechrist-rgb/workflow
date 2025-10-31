import { GoogleGenAI, GenerateContentResponse, Chat, Type, Modality } from "@google/genai";
import { LyricsAndConcept, SocialMarketingPackage, ChatMessage, SongData } from './types';

let ai: GoogleGenAI;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export interface SongGenerationResponse {
    conversationalResponse: string;
    songData: SongData;
}

export const generateOrRefineSong = async (history: ChatMessage[]): Promise<SongGenerationResponse> => {
    const ai = getAi();
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            conversationalResponse: {
                type: Type.STRING,
                description: "Your friendly, conversational reply to the user, explaining what you've done or asking clarifying questions. Acknowledge their last message and describe the changes you made."
            },
            songData: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the song." },
                    style: { type: Type.STRING, description: "A detailed description of the musical style, genre, instruments, tempo, and emotional delivery." },
                    lyrics: { type: Type.STRING, description: "The full, structured song lyrics with tags like [Intro], [Verse 1], [Chorus], [Bridge], etc." }
                },
                required: ["title", "style", "lyrics"]
            }
        },
        required: ["conversationalResponse", "songData"]
    };

    const systemInstruction = `You are Song Maker GPT, an expert AI songwriter. Your goal is to collaborate with the user to create a complete song. 
- Start with their initial idea and iteratively refine it based on their feedback.
- Maintain the full context of the conversation.
- When you provide an updated song, you MUST format your response as a single JSON object containing 'conversationalResponse' and 'songData'.
- The 'conversationalResponse' is your friendly chat text to the user.
- The 'songData' object must contain the complete, most up-to-date 'title', 'style', and 'lyrics'.
- The lyrics must be fully written out and structured with tags like [Verse], [Chorus], etc.`;
    
    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const text = result.text.trim();
    return JSON.parse(text);
};


export const generateLyricsAndConcept = async (prompt: string): Promise<LyricsAndConcept> => {
    const ai = getAi();
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            lyrics: {
                type: Type.STRING,
                description: "Full song lyrics, clearly structured with tags like [Verse 1], [Chorus], [Bridge], etc."
            },
            concept: {
                type: Type.STRING,
                description: "A short, one-paragraph concept for the song, describing its mood, story, and style."
            },
            chordProgression: {
                type: Type.STRING,
                description: "A suggested chord progression for the song, formatted like 'Verse: Am-G-C-F, Chorus: C-G-Am-F'."
            }
        },
        required: ["lyrics", "concept", "chordProgression"]
    };

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Based on the following user prompt, generate song lyrics, a concept, and a chord progression. The lyrics must be structured with tags like [Verse], [Chorus]. The chord progression should be appropriate for the song's mood. Prompt: "${prompt}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const text = result.text.trim();
    return JSON.parse(text);
};

// Internal function for actual audio generation
const _internalGenerateAudio = async (detailedPrompt: string): Promise<string> => {
    const ai = getAi();
    const parts = [{ 
        text: detailedPrompt 
    }];

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts }],
        config: {
            responseModalities: [Modality.AUDIO],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData) {
        return part.inlineData.data;
    }
    throw new Error("The AI model did not return valid audio data.");
};

// Orchestrator function that uses a text model to create a better prompt for the audio model
export const generateInstrumentalTrack = async (songStyle: string, referenceAudio?: { base64: string, mimeType: string }): Promise<string> => {
    const ai = getAi();
    
    // Step 1: Use a powerful text model to generate a "performance script" for the TTS model.
    const producerPrompt = `You are an expert audio designer using a creative hack. You have a text-to-speech (TTS) model that can only speak or make vocal sounds, but you need to make it produce something that sounds like an instrumental music track. The user wants a track with this style: "${songStyle}".

    Your task is to write a detailed "script" for the TTS model to perform. This script should not be a description OF music, but rather a sequence of sounds for the TTS model TO READ that will MIMIC music.
    
    Use these techniques:
    - Onomatopoeia: Use words that sound like instruments (e.g., "thump" for a kick drum, "tssss" for a cymbal, "strummm" for a guitar).
    - Scatting/Vocalization: For melodies, use syllables like "doo-doo-daaah" or "la-la-liii".
    - Rhythmic Phrasing: Structure the prompt with timing cues like "(slowly)", "(faster)", "(pause)".
    - Layering descriptions: Describe a beat and a melody concurrently, e.g., "A steady beat of 'boom-tish-boom-tish' while a soft melody goes 'laaa-da-deee-daaa'".
    
    Example: If the user asks for "a sad, slow acoustic guitar song", a good script might be: "(Slowly) Strummm... da-dum... strummm... A lonely melody hums... mmm-hmmm-hmmm... da-da-dummm... (pause)".

    Generate ONLY the performance script for the TTS model. Do not include any explanations.`;

    const detailedPromptResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: producerPrompt,
    });

    const detailedPrompt = detailedPromptResponse.text.trim();
    console.log("Orchestrator Generated Script:", detailedPrompt);

    // Step 2: Use the generated performance script to call the audio generation model.
    return await _internalGenerateAudio(detailedPrompt);
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Sing these lyrics in a clear, melodic tone: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Failed to generate audio.");
    }
    return base64Audio;
};

export const masterAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    // This feature is not supported by current models. The UI will prevent this from being called.
    // This function remains as a safeguard.
    throw new Error("Audio Mastering is not supported by the available AI models.");
};

export const separateAudioStem = async (audioBase64: string, mimeType: string, stemToExtract: 'vocals' | 'instrumental'): Promise<string> => {
    // This feature is not supported by current models. The UI will prevent this from being called.
    // This function remains as a safeguard.
    throw new Error("Stem Separation is not supported by the available AI models.");
};


export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio,
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("Failed to edit image.");
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getAi();
    const imagePart = { inlineData: { data: imageBase64, mimeType: mimeType } };
    const textPart = { text: prompt };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' | '1:1', resolution: '720p' | '1080p', image?: { base64: string, mimeType: string }) => {
    // A new instance must be created to use the latest API key from the selection dialog.
    const aiWithUserKey = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const requestPayload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: resolution,
            aspectRatio: aspectRatio,
        }
    };

    if (image) {
        requestPayload.image = {
            imageBytes: image.base64,
            mimeType: image.mimeType,
        };
    }

    return await aiWithUserKey.models.generateVideos(requestPayload);
};

export const extendVideo = async (prompt: string, previousOperation: any, aspectRatio: '16:9' | '9:16' | '1:1') => {
    const aiWithUserKey = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const previousVideo = previousOperation.response?.generatedVideos?.[0]?.video;
    if (!previousVideo) {
        throw new Error("No previous video found in the operation to extend.");
    }

    const requestPayload: any = {
        model: 'veo-3.1-generate-preview', // This model is required for extension
        prompt: prompt,
        video: previousVideo,
        config: {
            numberOfVideos: 1,
            resolution: '720p', // Extension only supports 720p
            aspectRatio: aspectRatio,
        }
    };

    return await aiWithUserKey.models.generateVideos(requestPayload);
};

export const pollVideoOperation = async (operation: any) => {
    // A new instance must be created to use the latest API key from the selection dialog.
    const aiWithUserKey = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return await aiWithUserKey.operations.getVideosOperation({ operation: operation });
};


export const generateMarketingPackage = async (lyrics: string, concept: string, targetAudience: string): Promise<SocialMarketingPackage> => {
    const ai = getAi();
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of 10 relevant hashtags."
            },
            description: {
                type: Type.STRING,
                description: "A one-paragraph promotional description for the song."
            },
            captions: {
                type: Type.ARRAY,
                description: "Captions for Instagram, TikTok, and Twitter/X.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        platform: { type: Type.STRING },
                        variations: {
                            type: Type.ARRAY,
                            description: "3 distinct variations of the caption for A/B testing.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["platform", "variations"]
                }
            },
            imagePrompt: {
                type: Type.STRING,
                description: "A visually descriptive prompt for an AI image generator to create a promotional image for the song, suitable for platforms like Instagram."
            },
            artistBio: {
                type: Type.STRING,
                description: "A short, compelling 100-word artist bio suitable for a press kit, inspired by the song's themes."
            },
            pressRelease: {
                type: Type.STRING,
                description: "A professional 250-word press release announcing the new single, including a headline, introduction, a quote from the artist, and details about the release."
            },
            interviewPoints: {
                type: Type.ARRAY,
                description: "A list of 5 interesting talking points for an interview about the song.",
                items: { type: Type.STRING }
            },
            releaseTimeline: {
                type: Type.ARRAY,
                description: "A 7-day promotional release timeline with actions for each day.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.INTEGER },
                        platform: { type: Type.STRING },
                        action: { type: Type.STRING }
                    },
                    required: ["day", "platform", "action"]
                }
            },
            videoPrompts: {
                type: Type.ARRAY,
                description: "A list of 3 distinct, highly visual prompts for generating 5-10 second teaser videos for social media.",
                items: { type: Type.STRING }
            }
        },
        required: ["hashtags", "description", "captions", "imagePrompt", "artistBio", "pressRelease", "interviewPoints", "releaseTimeline", "videoPrompts"]
    };

    const prompt = `Create a comprehensive social media and press marketing package for a new song.
    The package should be tailored for the following target audience: "${targetAudience}".

    Song Concept: ${concept}
    
    Lyrics: ${lyrics}`;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });
    const text = result.text.trim();
    return JSON.parse(text);
};


export const startChatStream = async (model: string, history: ChatMessage[], newMessage: string, systemInstruction?: string) => {
    const ai = getAi();
    
    const apiHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
        model: model,
        history: apiHistory,
        config: {
            systemInstruction: systemInstruction || 'You are MUSE AI, a creative partner and technical expert for musicians, artists, and songwriters. Your purpose is to provide inspiring creative advice and clear, actionable technical support. Engage users in a friendly, encouraging tone. Help them with songwriting, music theory, production techniques, marketing ideas, and overcoming creative blocks. Be their ultimate collaborator.',
        },
    });

    return await chat.sendMessageStream({ message: newMessage });
};


export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (!text.trim()) {
        return "";
    }
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLanguage}. Return only the translated text, without any introductory phrases or explanations. Text: "${text}"`,
            config: {
                temperature: 0,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Translation failed:", error);
        return text; // Return original text on failure
    }
};


export const generateChatResponse = async (history: ChatMessage[], newMessage: string, systemInstruction: string): Promise<string> => {
    const ai = getAi();

    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    return response.text;
};

export const summarizeConversationForVideo = async (history: ChatMessage[]): Promise<string[]> => {
    const ai = getAi();
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            scenes: {
                type: Type.ARRAY,
                description: "An array of strings, where each string is a detailed visual prompt for a 7-second video scene.",
                items: { type: Type.STRING }
            }
        },
        required: ["scenes"]
    };
    
    const finalPrompt = "Based on our entire conversation, summarize the final music video concept into a JSON object with a 'scenes' key. The value should be an array of strings. Each string must be a detailed, standalone prompt for an AI video generator to create a 7-second scene. Ensure the scenes flow together to create a cohesive video for the full song. Only return the JSON object, with no other text or explanation.";

    const contents = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: finalPrompt }] });

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            systemInstruction: "You are an AI assistant that helps summarize conversations into structured JSON."
        }
    });

    try {
        const parsed = JSON.parse(result.text.trim());
        if (Array.isArray(parsed.scenes) && parsed.scenes.every((s: any) => typeof s === 'string') && parsed.scenes.length > 0) {
            return parsed.scenes;
        }
    } catch (e) {
        console.error("Failed to parse scene prompts JSON:", result.text);
        throw new Error("The AI returned an invalid format for the scene prompts.");
    }
    throw new Error("The AI returned an invalid or empty list of scene prompts.");
};

export const generateChatTitle = async (firstMessage: string): Promise<string> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a very short, concise title (4-5 words max) for a chat conversation that starts with this message: "${firstMessage}". Only return the title, with no extra text or quotation marks.`,
            config: {
                temperature: 0.2,
                stopSequences: ["\n"],
            }
        });
        return response.text.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
        console.error("Title generation failed:", error);
        return `Conversation started...`;
    }
};