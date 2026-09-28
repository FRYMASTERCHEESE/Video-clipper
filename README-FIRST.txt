ClipFree AI — SINGLE-UPLOAD LOCK + DUPLICATE/TITLE/PRIVACY FIX
29 September 2026

REPLACE THESE 3 FILES:
- youtube.js
- animal-generator.js
- category-pages.js

KEEP YOUR EXISTING:
- index.html
- upload-speed-boost.js
- app.js
- all other files

WHY 2 VIDEOS COULD UPLOAD WHEN YOU SELECTED 1
The animal workflow can legitimately fire more than one internal
"clipfree-export-ready" event while the final SEO/cover/originality package is
being prepared. youtube.js previously kept autoUploadQueued=true until an upload
finished, but it did not have a second "upload already in flight" lock.

That meant two export-ready events could both enter the YouTube uploader before
the first one finished, causing TWO YouTube videos from ONE requested Short.

THIS UPDATE FIXES THAT EXACT RACE:
1. Animal-generator uploads ignore intermediate export-ready events.
2. YouTube waits for __clipfreeGrowthFinalReady on animal Shorts.
3. autoUploadInFlight allows only ONE event to claim each queued upload.
4. Later re-dispatched export events are ignored while that upload is running.
5. The lock is released on success or failure.

THE OTHER FIXES ARE INCLUDED TOO:
- exact source-video SHA-256 fingerprint duplicate protection
- source URL + raw media URL history
- different title generation
- checks titles already loaded from the connected YouTube channel
- requested Public vs actual YouTube privacy verification
- accurate animal SEO and title protection

TEST:
Select exactly 1 Short.
Expected result: exactly 1 confirmed YouTube video ID.
If Public is requested but YouTube returns Private, ClipFree will show the
actual Private status instead of claiming Public.
