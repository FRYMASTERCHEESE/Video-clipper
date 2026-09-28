ClipFree AI — MAX MODE v4
29 September 2026

REPLACE THESE 5 FILES
- index.html
- youtube.js
- animal-generator.js
- category-pages.js
- upload-speed-boost.js

KEEP all your other files.

WHAT MAX MODE FIXES

1. STOPS OLD CACHED CODE
index.html now loads every main module with ?v=20260929-max4. Android Chrome therefore requests the new files instead of silently reusing an older SEO/upload script. This is important because your screenshots were still showing titles produced by older code.

2. NO MORE RISKY DIRECT FAST-UPLOAD BYPASS
The previous speed module could bypass ClipFree's normal final FFmpeg export. That was fast, but YouTube sometimes created the video entry and later showed “Upload failed: Can't process file”. MAX MODE disables that risky bypass.

3. YOUTUBE PROCESSING MUST SUCCEED
youtube.js now polls YouTube processingDetails after videos.insert. A Short is not counted as confirmed merely because YouTube returned an ID. If YouTube reports failed/terminated, the batch stops immediately. If processing is still pending after 90 seconds, the batch stops and tells you not to retry blindly.

4. UNIQUE FINAL SEO
The final SEO guard stays active after the older optimizers. It uses the actual animal/source metadata, checks connected-channel titles and local title history, and blocks generic patterns including “Lions in the Wild”, “Wild Lions: Nature Moment” and “Amazing Wildlife Moment”.

5. DUPLICATE FOOTAGE PROTECTION
The source URL/file history and visual fingerprint checks remain active. If a finished Short looks like footage already used, ClipFree searches for another unused PD/CC0 source instead of intentionally uploading the duplicate.

6. ONE UPLOAD AT A TIME
The existing single-flight YouTube lock remains active, so one requested Short cannot be claimed by multiple export-ready events.

7. PUBLIC / PRIVATE
ClipFree still requests the visibility you choose and reads back YouTube's actual status. Code cannot override a YouTube-side API compliance restriction that forces an API upload Private.

IMPORTANT
MAX MODE prioritizes a playable YouTube upload over the old aggressive speed shortcut. It may take a little longer to encode, but that is better than creating failed “Can't process file” entries.

FIRST TEST
1. Upload all 5 replacement files.
2. Close every old coreyvibe.org tab.
3. Reopen https://coreyvibe.org/
4. Create exactly 1 Short.
5. Do not test 3/8/20 until the first Short says YouTube processing succeeded.
