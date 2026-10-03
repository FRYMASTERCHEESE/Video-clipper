ClipFree AI — STRICT ANIMAL + AUDIT TURBO v11
3 October 2026

I FIXED THE WRONG-VIDEO PROBLEM SHOWN IN YOUR SCREENSHOT.

The uploaded Short showed unrelated objects while ClipFree labelled it as a
"Wild Animal". That happened because broad wildlife searches could still accept
a Public Domain/CC0 result whose metadata did NOT identify an animal.

UPLOAD / REPLACE THESE 6 FILES:
- index.html
- youtube.js
- animal-generator.js
- category-pages.js
- video-engine-v7.js
- compliance-demo-v11.js   NEW

You can ignore/delete compliance-demo-v10.js after uploading because the new
index.html no longer loads it.

STRICT FOOTAGE SAFETY
- Every wildlife source must identify a recognized animal in its own
  title/attribution before ClipFree can render it.
- Species-specific searches must match the requested species.
- A lion search cannot silently upload a bottle, scenery, another animal, etc.
- Unidentified "generic wildlife" media is rejected instead of being uploaded.
- The final Growth Engine has an extra compliance-mode species check.

SAFER AUDIT RECORDING
Open:
  https://coreyvibe.org/?audit=1

The audit setup now forces:
- exactly 1 Short
- exactly 10 seconds
- Private visibility
- Lions as the exact demo animal

That makes the reviewer recording deterministic instead of using the broad
"Different animals" search.

FASTER AUDIT UPLOAD
For the 10-second reviewer demo only:
- 720x1280 vertical HD
- H.264 CRF 24
- video max rate about 2.2 Mbps
- AAC 128 kbps
- single-pass encode
- generated captions and cover are shown in the compliance panel, but their
  optional separate YouTube API uploads are disabled during the demo so they
  cannot compete for bandwidth or delay the real video ID
- no playlist creation before the video upload
- YouTube foreground processing wait remains only 6 seconds; slow processing
  continues in the background

Normal ClipFree creator mode keeps the higher-quality adaptive profiles.

IMPORTANT
No browser code can make YouTube's servers or your internet connection upload
faster than the available network bandwidth. v11 reduces the audit file size
and removes unnecessary API/network work around the main upload.

RECORD AGAIN ONLY AFTER THIS VERSION IS LIVE:
1. Fully close all old coreyvibe.org tabs.
2. Open https://coreyvibe.org/?audit=1
3. Refresh YouTube + Analytics.
4. Tap Set up 1 Private 10-second Short.
5. Confirm it says Lions.
6. Show the source title/licence.
7. Tick the rights box manually.
8. Create/upload.
9. Confirm the generated Short actually shows a lion.
10. Wait for a real YouTube video ID.
11. Open YouTube Studio and show that same Private Short.
