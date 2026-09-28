ClipFree AI — SPEED + QUALITY MAX v7
29 September 2026

UPLOAD / REPLACE THESE FILES:
1. index.html
2. video-engine-v7.js          NEW
3. originality-lite-v7.js      NEW
4. youtube.js
5. ai-voiceover.js
6. animal-generator.js
7. category-pages.js
8. upload-speed-boost.js

KEEP ALL OTHER CURRENT FILES.

WHAT CHANGED

VIDEO SPEED
- Animal Shorts now use a ONE-PASS video + narration encode.
- The finished normalized MP4 skips the old second full video encode.
- YouTube's quick foreground processing wait is reduced to 12 seconds; slow
  processing continues in the background.
- Captions, thumbnail and playlist finishing calls run in parallel.
- The heavy Originality Guard second video re-encode is replaced by
  Originality Lite because original AI narration + fresh vertical edit +
  captions + attribution already provide a transformation layer.
- If YouTube explicitly reports a processing failure, the batch stops before
  continuing with more videos.

VIDEO QUALITY
- Strong phones: adaptive 1080x1920, 30 fps.
- Lower-memory phones: 720x1280, 30 fps for much faster/reliable browser encoding.
- H.264 High Profile, yuv420p, BT.709, Fast Start MP4.
- CRF 20/21 quality-focused encoding with the superfast preset.
- 2 B-frames and a 2-second GOP.
- Exact FFmpeg byte array is written into the MP4 to avoid accidental extra bytes.

AUDIO QUALITY
- Original local AI narration on every Short.
- q8 Kokoro voice model on devices with enough memory; q4 fallback.
- 48 kHz stereo AAC at 192 kbps.
- Spoken narration is NEVER looped. If it ends early, the video pads silence.
- Strict PD/CC0 animal sound remains the fallback if AI narration cannot load.
- No third-party music is added.

EXTRA
- 15, 24, 30, 45 and 60 second Short options.
- 30 seconds is the new default.
- Existing unique SEO, actual-animal detection, visual duplicate protection,
  PD/CC0 attribution and Processing Tracker remain active.
- ClipFree adds no watermark.

WHY THIS IS FASTER
The previous wildlife path could encode the same video more than once:
montage creation -> automatic export -> Originality Guard transformation.
v7 reduces the normal animal path to ONE video encode.

YOUTUBE COMPATIBILITY
The v7 MP4 settings are aligned with YouTube's recommended H.264 + AAC,
4:2:0, Fast Start and BT.709 upload guidance.

FIRST TEST
1. Fully close old coreyvibe.org tabs.
2. Reopen the site.
3. Create exactly 1 Short at 30 seconds.
4. Confirm:
   - original AI voice is audible
   - video is sharp/vertical
   - one upload gets one YouTube video ID
   - no "Can't process file"
5. Then test 4 Shorts.

NOTE
1080p requires more CPU/RAM. v7 automatically drops to 720p HQ on devices that
would be more likely to become slow or unstable at 1080p.
