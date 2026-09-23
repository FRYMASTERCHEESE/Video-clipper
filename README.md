# ClipFree AI — YouTube Growth Suite

This build combines the browser-based ClipFree AI video clipper with YouTube workflow tools that use Google's official APIs.

## What is included

### Automatic Clip Studio
- Local browser-based FFmpeg video processing
- GitHub Pages-safe local FFmpeg class worker fix
- Browser-based Whisper Tiny English transcription through Transformers.js
- Automatic spoken-highlight scoring
- Automatic 9:16 / 1:1 / 16:9 / original export
- YouTube title, description, tags and hashtag generation
- SRT caption generation
- Automatic 1280×720 thumbnail image generation from the selected clip
- No watermark added by the app
- No paid AI API key required for clipping/transcription

### YouTube Growth Dashboard
After the channel owner connects with Google OAuth:
- Channel snapshot
- Last-28-days views
- Estimated watch hours
- Average view duration
- Net subscriber change
- Recent video audit
- Top watch-time based growth-plan suggestions
- Metadata completeness checks
- A conservative **Fill missing metadata** action that preserves the video's existing title and fills thin descriptions/tags instead of blindly rewriting strong metadata
- Channel description draft + explicit Apply button

### Creative Commons Finder
- Searches through the official YouTube Data API
- Restricts search to `videoLicense=creativeCommon`
- Restricts to embeddable/syndicated videos
- Re-checks returned video license metadata
- Builds attribution text
- Opens the original YouTube page
- Does **not** rip/download YouTube videos

### YouTube Upload
- Uses the official YouTube Data API
- Accepts the ClipFree-generated clip automatically or a manually selected local video
- Prefills title, description and tags from the ClipFree SEO pack
- Privacy / category / made-for-kids settings
- Optional subscriber notification
- Optional SRT caption upload
- Optional auto-generated thumbnail upload
- Optional playlist insertion after upload

## One-time Google setup

1. Open Google Cloud Console and create/open a project.
2. Enable:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
3. Configure the OAuth consent screen as required by Google.
4. Create **OAuth 2.0 Client ID → Web application**.
5. Add this Authorized JavaScript origin:
   - `https://frymastercheese.github.io`
6. Optionally create an API key for Creative Commons searches before logging in.
7. Restrict the API key to your GitHub Pages referrer and the YouTube Data API.
8. Open ClipFree AI → **Setup** and paste the OAuth Client ID. The optional API key can go in the second field.

Do **not** place a Google OAuth client secret in this static website. This build does not need or ask for one.

## Important Google/YouTube behavior

- OAuth access tokens are kept in page memory. They are not written to this repository.
- The OAuth Client ID and optional API key are stored in browser `localStorage` for convenience.
- Google may show an unverified-app warning until your OAuth consent screen/app is configured and verified as required.
- Videos uploaded from an unverified YouTube API project created after July 28, 2020 are restricted to **Private** by YouTube until the API project passes Google's audit.
- YouTube API quotas still apply.
- Custom thumbnail upload depends on the channel having permission to use custom thumbnails.
- Caption upload can fail if an equivalent caption track already exists or the channel/API permissions do not allow it.

## Growth reality

This software can reduce manual work and use your real channel performance data, but it cannot guarantee subscribers, views or watch hours. Do not use fake views, subscriber bots, engagement exchanges or spam. YouTube monetization also evaluates originality/authenticity; Creative Commons permission alone does not guarantee monetization eligibility if a channel simply republishes other people's content with minimal change.

## GitHub Pages deployment

Upload all of these files to the **root** of your `Video-clipper` repository:

- `index.html`
- `styles.css`
- `app.js`
- `youtube.js`
- `ffmpeg-worker.js`
- `ffmpeg-const.js`
- `ffmpeg-errors.js`
- `README.md`

Then use **Settings → Pages → Deploy from a branch → main → /(root)**.

Your current site URL is expected to be:

`https://frymastercheese.github.io/Video-clipper/`

## First test order

1. Refresh the deployed site after GitHub Pages finishes publishing.
2. Upload a short 20–60 second video to Clip Studio.
3. Confirm the status moves past **Loading video engine** (this verifies the local FFmpeg worker fix).
4. Let Auto Mode finish transcription/export.
5. Confirm **YouTube Upload** says the generated clip is ready.
6. In Setup, add the Google OAuth Client ID.
7. Connect YouTube.
8. Load the Growth Dashboard.
9. Test a YouTube upload as **Private** first.
10. Only after the private test succeeds, enable optional captions/thumbnail/playlist actions.

## Browser/device notes

The clipper runs on the visitor's device. Very large or long videos can exceed mobile browser RAM. Start with short videos when testing on Android. The YouTube API tools themselves are much lighter than FFmpeg/Whisper processing.
