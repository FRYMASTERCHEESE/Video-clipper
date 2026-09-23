# ClipFree AI — automatic free video clipping + YouTube SEO

A static browser-based AI video clipper that can be hosted free on GitHub Pages, Cloudflare Pages, Netlify, or Vercel.

## Automatic workflow

With **Auto Mode** enabled, the user only needs to choose a video. The site will then try to:

1. Extract speech audio locally in the browser.
2. Transcribe the video using a free open-source Whisper model.
3. Score transcript windows and pick several strong short-form highlights.
4. Automatically select the best-ranked highlight.
5. Generate a YouTube SEO pack for the selected clip:
   - YouTube title
   - Description
   - Tags / keywords
   - Hashtags
6. Generate downloadable `.srt` captions for the selected clip.
7. If **Auto-export best clip** is enabled, render the selected clip automatically.

The default output is **9:16** for YouTube Shorts / Reels / TikTok.

## What it includes

- Automatic upload-to-export workflow
- Browser-based Whisper transcription
- AI-assisted highlight scoring
- 30 / 45 / 60 second automatic clip targets
- Original, 9:16, 1:1, and 16:9 output
- YouTube SEO text generated from the selected clip transcript
- Downloadable SRT captions
- No watermark added by the app
- No account requirement
- No paid API key
- No application-level clip-count counter
- Search-engine metadata for the website itself

## Important reality about “no limits”

The app does not contain a credit counter, paid API quota, or watermark. However, it runs on the visitor's device, so device RAM, CPU/GPU speed, browser capabilities, video size, model-download size, and the hosting provider's normal bandwidth rules still create real practical limits. Very long or high-resolution videos may fail on low-memory phones.

## How the AI works

The site uses an open-source Whisper Tiny English speech-recognition model through Transformers.js. It runs on WebGPU when supported, otherwise WebAssembly. FFmpeg WebAssembly handles audio extraction and video rendering.

The highlight selector scores timestamped transcript windows for factors such as spoken-word density, hook-style language, questions, punctuation, and closeness to the selected target clip length.

The YouTube SEO pack is generated locally from the selected clip's transcript using keyword extraction and title/description templates. It does not need an external paid AI service.

## Free GitHub Pages deployment

1. Create a GitHub repository, for example `clipfree-ai`.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Commit the files.
4. Open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your main branch and `/ (root)`.
7. Save.

GitHub will provide an HTTPS address for the site.

## Testing locally

Because the JavaScript uses ES modules, test it through a local web server rather than double-clicking `index.html`.

Example with Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Notes

- The included speech model is English-focused to keep the download smaller.
- Browser AI is slower than a cloud GPU service but avoids recurring AI API bills.
- Export uses FFmpeg WebAssembly with H.264/AAC.
- This build is intentionally static and free-host-friendly.
