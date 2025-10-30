/**
 * Music Generation Service
 *
 * Integrates with professional AI music generation APIs (Suno, Udio, etc.)
 * to create high-quality songs with vocals and instruments.
 *
 * Supported Providers:
 * - Suno AI (via various API providers)
 * - Udio AI (via various API providers)
 * - MusicAPI.ai (supports both Suno and Udio)
 */

export type MusicProvider = 'suno' | 'udio' | 'musicapi';

export interface MusicGenerationConfig {
  provider: MusicProvider;
  apiKey: string;
  apiUrl?: string; // Optional custom API URL
}

export interface SongGenerationRequest {
  lyrics: string;
  style: string;
  title?: string;
  instrumental?: boolean;
  duration?: number; // in seconds
}

export interface SongGenerationResponse {
  id: string;
  status: 'queued' | 'generating' | 'complete' | 'failed';
  audioUrl?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  title?: string;
  lyrics?: string;
  duration?: number;
  error?: string;
}

/**
 * MusicAPI.ai Service Implementation
 * Supports both Suno and Udio models through a unified API
 */
class MusicAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.musicapi.ai') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a song using Suno AI
   */
  async generateSong(request: SongGenerationRequest): Promise<SongGenerationResponse> {
    try {
      // Create song generation request
      const response = await fetch(`${this.baseUrl}/v1/suno/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.lyrics,
          style: request.style,
          title: request.title || 'Untitled',
          make_instrumental: request.instrumental || false,
          wait_audio: false, // Async generation
        }),
      });

      if (!response.ok) {
        throw new Error(`Music API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id || data.clip_id,
        status: 'queued',
        title: request.title,
        lyrics: request.lyrics,
      };
    } catch (error) {
      console.error('Failed to generate song:', error);
      throw error;
    }
  }

  /**
   * Check the status of a song generation
   */
  async checkStatus(songId: string): Promise<SongGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/suno/status/${songId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Music API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Map API response to our format
      return {
        id: songId,
        status: this.mapStatus(data.status),
        audioUrl: data.audio_url,
        videoUrl: data.video_url,
        coverImageUrl: data.image_url || data.cover_url,
        title: data.title,
        lyrics: data.lyrics,
        duration: data.duration,
        error: data.error,
      };
    } catch (error) {
      console.error('Failed to check song status:', error);
      throw error;
    }
  }

  private mapStatus(apiStatus: string): SongGenerationResponse['status'] {
    const statusMap: Record<string, SongGenerationResponse['status']> = {
      'pending': 'queued',
      'queued': 'queued',
      'processing': 'generating',
      'generating': 'generating',
      'complete': 'complete',
      'completed': 'complete',
      'success': 'complete',
      'failed': 'failed',
      'error': 'failed',
    };
    return statusMap[apiStatus.toLowerCase()] || 'queued';
  }
}

/**
 * Suno Direct API Service (via third-party providers)
 */
class SunoAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.sunoapi.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateSong(request: SongGenerationRequest): Promise<SongGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${request.style}. ${request.lyrics}`,
          make_instrumental: request.instrumental || false,
          wait_audio: false,
          title: request.title || 'Untitled',
        }),
      });

      if (!response.ok) {
        throw new Error(`Suno API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        status: 'queued',
        title: request.title,
        lyrics: request.lyrics,
      };
    } catch (error) {
      console.error('Failed to generate song with Suno:', error);
      throw error;
    }
  }

  async checkStatus(songId: string): Promise<SongGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/get?ids=${songId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Suno API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const song = Array.isArray(data) ? data[0] : data;

      return {
        id: songId,
        status: song.status === 'complete' ? 'complete' : 'generating',
        audioUrl: song.audio_url,
        videoUrl: song.video_url,
        coverImageUrl: song.image_url,
        title: song.title,
        lyrics: song.prompt || song.lyrics,
        duration: song.duration,
      };
    } catch (error) {
      console.error('Failed to check Suno song status:', error);
      throw error;
    }
  }
}

/**
 * Udio API Service
 */
class UdioAPIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.udioapi.pro') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generateSong(request: SongGenerationRequest): Promise<SongGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lyrics: request.lyrics,
          style: request.style,
          title: request.title || 'Untitled',
          instrumental: request.instrumental || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Udio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.generation_id || data.id,
        status: 'queued',
        title: request.title,
        lyrics: request.lyrics,
      };
    } catch (error) {
      console.error('Failed to generate song with Udio:', error);
      throw error;
    }
  }

  async checkStatus(songId: string): Promise<SongGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/status/${songId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Udio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: songId,
        status: data.status === 'completed' ? 'complete' : data.status === 'failed' ? 'failed' : 'generating',
        audioUrl: data.audio_url,
        coverImageUrl: data.cover_image_url,
        title: data.title,
        lyrics: data.lyrics,
        duration: data.duration,
        error: data.error_message,
      };
    } catch (error) {
      console.error('Failed to check Udio song status:', error);
      throw error;
    }
  }
}

/**
 * Main Music Generation Service
 * Manages different providers and provides a unified interface
 */
export class MusicGenerationService {
  private config: MusicGenerationConfig;
  private service: MusicAPIService | SunoAPIService | UdioAPIService;

  constructor(config: MusicGenerationConfig) {
    this.config = config;

    // Initialize the appropriate service based on provider
    switch (config.provider) {
      case 'suno':
        this.service = new SunoAPIService(config.apiKey, config.apiUrl);
        break;
      case 'udio':
        this.service = new UdioAPIService(config.apiKey, config.apiUrl);
        break;
      case 'musicapi':
      default:
        this.service = new MusicAPIService(config.apiKey, config.apiUrl);
        break;
    }
  }

  /**
   * Generate a complete song with vocals and instruments
   */
  async generateSong(request: SongGenerationRequest): Promise<SongGenerationResponse> {
    return this.service.generateSong(request);
  }

  /**
   * Check the status of a song generation
   */
  async checkStatus(songId: string): Promise<SongGenerationResponse> {
    return this.service.checkStatus(songId);
  }

  /**
   * Poll for song completion
   * Automatically checks status at intervals until complete or failed
   */
  async waitForCompletion(
    songId: string,
    onProgress?: (response: SongGenerationResponse) => void,
    maxAttempts = 60,
    intervalMs = 5000
  ): Promise<SongGenerationResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await this.checkStatus(songId);

      if (onProgress) {
        onProgress(response);
      }

      if (response.status === 'complete' || response.status === 'failed') {
        return response;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Song generation timed out');
  }
}

// Export a singleton instance getter
let musicService: MusicGenerationService | null = null;

export const getMusicService = (): MusicGenerationService => {
  if (!musicService) {
    // Get configuration from environment or use defaults
    const provider = (process.env.MUSIC_API_PROVIDER as MusicProvider) || 'musicapi';
    const apiKey = process.env.MUSIC_API_KEY || '';
    const apiUrl = process.env.MUSIC_API_URL;

    if (!apiKey) {
      throw new Error('MUSIC_API_KEY environment variable not set. Please configure your music generation API key.');
    }

    musicService = new MusicGenerationService({
      provider,
      apiKey,
      apiUrl,
    });
  }

  return musicService;
};

// Allow reconfiguring the service
export const setMusicService = (config: MusicGenerationConfig) => {
  musicService = new MusicGenerationService(config);
};
