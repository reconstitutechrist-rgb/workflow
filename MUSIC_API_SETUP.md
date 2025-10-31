# Music API Setup Guide

Your MUSE AI platform now supports professional AI music generation using Suno AI or Udio AI! This guide will help you set up access to these powerful music generation services.

## Why Professional Music Generation?

The previous implementation used Google's Gemini TTS (text-to-speech) model with workarounds to create music-like sounds. This approach had serious limitations:
- ❌ Poor quality vocals (robotic, unnatural)
- ❌ Terrible instrument sounds (onomatopoeia-based)
- ❌ No real music production
- ❌ Not actual songs

The new implementation uses **state-of-the-art AI music models** that:
- ✅ Generate studio-quality music
- ✅ Create realistic vocals with emotion and expression
- ✅ Produce authentic instruments and arrangements
- ✅ Generate complete, production-ready songs
- ✅ Support all genres and styles

## Supported Providers

### Option 1: MusicAPI.ai (Recommended)
**Best for:** Easy setup, supports both Suno and Udio

- Website: https://musicapi.ai
- Supports: Suno AI V4, Udio AI v1.5
- Pricing: Pay-as-you-go
- Setup difficulty: ⭐ Easy

### Option 2: Suno API Direct
**Best for:** Direct access to Suno's latest models

- Website: https://docs.sunoapi.com
- Official Suno V5 support
- Multiple third-party providers available
- Setup difficulty: ⭐⭐ Moderate

### Option 3: Udio API
**Best for:** Alternative to Suno with different style

- Website: https://udioapi.pro
- Udio v1.5 Allegro (studio quality)
- Songs up to 2:10 minutes
- Setup difficulty: ⭐⭐ Moderate

## Setup Instructions

### Step 1: Choose Your Provider

Select one of the providers above based on your needs:
- **MusicAPI.ai**: Easiest to set up, good documentation
- **Suno API**: Best quality, most popular
- **Udio API**: Good alternative with unique sound

### Step 2: Get Your API Key

#### For MusicAPI.ai:
1. Visit https://musicapi.ai
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

#### For Suno API (via third-party):
1. Visit one of these providers:
   - https://api.sunoapi.com
   - https://www.goapi.ai
   - https://api.box

2. Sign up and get an API key

#### For Udio API:
1. Visit https://udioapi.pro
2. Create an account
3. Get your API key from the dashboard

### Step 3: Configure Your Environment

1. Open the `.env.local` file in your project root

2. Add your API configuration:

```bash
# Music Generation API Configuration
MUSIC_API_PROVIDER=musicapi  # Options: 'musicapi', 'suno', 'udio'
MUSIC_API_KEY=your_actual_api_key_here

# Optional: Custom API URL
# MUSIC_API_URL=https://api.musicapi.ai
```

3. Replace `your_actual_api_key_here` with your real API key

4. Save the file

### Step 4: Restart Your Development Server

```bash
npm run dev
```

### Step 5: Test Music Generation

1. Go to the **Create** tab
2. Generate song lyrics
3. Click "Proceed to Audio Production"
4. In the **Audio Production** tab, you'll see the new "Professional AI Music Generation" section
5. Click "Generate Professional Song"
6. Wait 1-3 minutes for your song to be generated
7. Enjoy studio-quality music! 🎵

## Configuration Options

### Provider Selection

You can switch between providers by changing `MUSIC_API_PROVIDER`:

```bash
# Use MusicAPI.ai (supports both Suno and Udio)
MUSIC_API_PROVIDER=musicapi

# Use Suno API directly
MUSIC_API_PROVIDER=suno

# Use Udio API
MUSIC_API_PROVIDER=udio
```

### Custom API URL

If you're using a self-hosted solution or specific provider URL:

```bash
MUSIC_API_URL=https://your-custom-api-url.com
```

## Features

### What You Can Generate

- **Full Songs**: Complete tracks with vocals, instruments, and production
- **Instrumentals**: Music without vocals
- **Any Genre**: Pop, rock, hip-hop, electronic, classical, jazz, country, and more
- **Custom Styles**: Specify instruments, tempo, mood, and production style
- **Length**: Songs typically 1-3 minutes (varies by provider)

### Generation Options

- **Lyrics**: Use AI-generated lyrics or write your own
- **Style**: Describe the musical style in detail (genre, tempo, instruments, mood)
- **Title**: Give your song a name
- **Instrumental**: Toggle to generate music without vocals

## Pricing & Costs

Pricing varies by provider:

- **MusicAPI.ai**: Typically $0.05-0.20 per song
- **Suno API**: Around $0.10 per song
- **Udio API**: Similar pricing to Suno

Check your provider's website for current pricing.

## Troubleshooting

### "Music API not configured" Error

**Solution**: Make sure you've set `MUSIC_API_KEY` in `.env.local` and restarted the dev server.

### "Failed to generate song" Error

**Possible causes**:
1. Invalid API key - Double-check your key
2. Insufficient credits - Add credits to your account
3. API service down - Check provider status page
4. Network issues - Check your internet connection

### Songs Taking Too Long

Generation typically takes 1-3 minutes. If it's taking longer:
1. Check the progress messages
2. Ensure your internet connection is stable
3. The service might be experiencing high load
4. Try again later

### Poor Quality Results

Tips for better results:
1. **Be specific** with style descriptions: Include genre, tempo, instruments
2. **Structure lyrics** with tags: [Verse], [Chorus], [Bridge]
3. **Try different providers**: Suno vs Udio have different strengths
4. **Refine your prompt**: More detail = better results

## Example Prompts

### Good Style Descriptions:

```
Upbeat pop song with acoustic guitar, hand claps, and electronic beats.
Tempo: 120 BPM. Happy and energetic mood. Clean vocals with harmonies.
```

```
Dark electronic synthwave with heavy bass, retro 80s synths, and
dramatic drums. Slow to medium tempo. Mysterious atmospheric mood.
```

```
Acoustic folk ballad with fingerpicked guitar and gentle piano.
Slow tempo. Intimate and emotional vocals. Warm and nostalgic feel.
```

### Poor Style Descriptions:

❌ "Pop"
❌ "Happy song"
❌ "Rock music"

Be specific! The AI needs details to create exactly what you want.

## Support

If you need help:
1. Check the provider's documentation
2. Review error messages in the browser console
3. Ensure your API key has sufficient credits
4. Contact your API provider's support

## Legal & Usage

- Generated music is typically royalty-free for the account holder
- Check your provider's terms of service for commercial use rights
- Some providers require attribution
- Usage limits and fair use policies apply

---

Happy music creation! 🎵✨
