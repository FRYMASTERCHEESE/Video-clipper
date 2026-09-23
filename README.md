# ClipFree AI — FULL AUTO YouTube + Animal Shorts Suite

ClipFree AI is a static browser-based video workflow designed for free hosting on GitHub Pages. It combines local video processing, automatic clipping, YouTube SEO, official YouTube API tools, reusable-media discovery, an AI-assisted animal Shorts generator, and a direct-to-charity donation button.

## FULL AUTO workflow

After YouTube is connected once, the main workflow can be:

**Choose one source → transcribe/analyse → pick a highlight → crop 9:16 → captions → thumbnail → title → description → tags → hashtags → attribution → upload → Shorts playlist.**

For a reusable source, FULL AUTO can search Wikimedia Commons for manageable video files whose metadata indicates straightforward reuse licences such as Public Domain, CC0, or attribution-only CC BY. The source page and licence credit are preserved in the generated YouTube description.

## AI-assisted Animal Shorts Generator

Presets included:

- Lions
- Wild animals
- Cute kittens
- Cute puppies

The generator can:

1. Search Wikimedia Commons for multiple reusable animal source clips.
2. Download up to three phone-manageable sources.
3. Build a new 9:16 multi-source montage locally with FFmpeg.wasm.
4. Create a themed story/caption pack for the selected animal/style.
5. Hand the montage to FULL AUTO for SEO, captions, thumbnail and YouTube upload.
6. Keep source/licence attribution in the final description.

This free mode is **AI-assisted editing/assembly**, not a cloud text-to-video diffusion model. It avoids paid AI-video credits and does not require a paid video-generation API key.

## Automatic Clip Studio

- Local FFmpeg WebAssembly processing
- GitHub Pages-safe local FFmpeg class worker
- Browser-based Whisper Tiny English transcription through Transformers.js
- Automatic spoken-highlight scoring
- No-speech fallback for wildlife/animal footage
- 9:16, 1:1, 16:9 and original output
- Automatic title, description, tags and hashtags
- SRT captions, including generated fallback captions for animal montages
- Automatic 1280×720 thumbnail generation
- No watermark added by ClipFree
- No paid AI key required for clipping/transcription

## YouTube tools

After Google OAuth authorization:

- Channel snapshot
- Last-28-days views
- Estimated watch hours
- Average view duration
- Net subscriber change
- Recent video audit
- Growth-plan suggestions based on available channel data
- Conservative metadata completion
- Channel description helper
- Official YouTube upload API
- Automatic captions and thumbnail upload where permitted
- Automatic Shorts playlist creation/insertion
- Creative Commons YouTube discovery (discovery only; it does not rip YouTube videos)

## Charity donation button ❤️

Open **Setup** and enter:

- Charity / fundraiser name
- Official donation URL

The donation buttons then open that external donation page directly. ClipFree does not collect, store, route, or hold donation money. This is safer for a static GitHub Pages site and lets the chosen charity/fundraiser handle the payment itself.

## One-time Google setup

1. Open Google Cloud Console and create/open a project.
2. Enable:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
3. Configure the OAuth consent screen.
4. Create **OAuth 2.0 Client ID → Web application**.
5. Add this Authorized JavaScript origin:
   - `https://frymastercheese.github.io`
6. Add your own Google/YouTube account as a **test user** while the app remains in Testing.
7. Open ClipFree AI → **Setup** and paste the OAuth Client ID.
8. Do **not** put an OAuth client secret into this static website.

## Important Google / YouTube behaviour

- OAuth access tokens stay in page memory.
- The OAuth Client ID is stored in browser localStorage for convenience.
- YouTube API quotas apply.
- New/unverified YouTube API projects can have API uploads forced to **Private** until Google completes the required compliance audit.
- Custom thumbnail/caption actions can still depend on channel permissions and API behaviour.

## Reuse and monetization

A reuse licence is not the same thing as guaranteed monetization eligibility. Keep attribution where required and add meaningful original editing, context, commentary, structure, narration or other value. Do not use fake views, subscriber bots, engagement exchanges or spam.

## Files to upload to GitHub Pages

Upload every file in this ZIP to the **root** of the `Video-clipper` repository:

- `index.html`
- `styles.css`
- `app.js`
- `youtube.js`
- `animal-generator.js`
- `site.js`
- `ffmpeg-worker.js`
- `ffmpeg-const.js`
- `ffmpeg-errors.js`
- `README.md`
- `GOOGLE-YOUTUBE-SETUP.md`
- `privacy.html`
- `terms.html`

Then use **Settings → Pages → Deploy from a branch → main → /(root)**.

Expected URL:

`https://frymastercheese.github.io/Video-clipper/`

## First test

1. Refresh the deployed site after GitHub Pages finishes publishing.
2. Confirm YouTube still connects.
3. Test **Lions → Generate animal Short + upload**.
4. Keep the tab open while the browser downloads/encodes media.
5. Use a Private upload first.
6. Configure the charity link in Setup only after choosing the official donation page you want to support.

## Device limits

The browser does the video work locally. Phone RAM, CPU/GPU speed, browser support, source-video size, network speed, YouTube quotas and third-party source availability still create practical limits. The animal generator deliberately prefers smaller reusable clips to improve Android reliability.
