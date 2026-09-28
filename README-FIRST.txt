ClipFree AI — FAST + SAFE upload fix
29 September 2026

Replace ONLY:
  upload-speed-boost.js

Do NOT replace index.html.
Your current index.html already loads upload-speed-boost.js after category-pages.js.

What this replacement does:
- validates the finished video locally before the fast upload path
- falls back to the safer re-encode path if the MP4 is unhealthy
- creates a visual fingerprint from two frames of every finished animal Short
- blocks same-looking finished footage in the same/future batches
- when a duplicate-looking Short is detected, searches for a different unused PD/CC0 source and rebuilds it
- adds a last-moment title collision guard so repeated YouTube titles are changed before upload
- keeps one-upload-at-a-time behavior
- keeps the existing Public/Private handling (YouTube can still force Private while API compliance restrictions apply)

After upload:
1. Close the ClipFree tab completely.
2. Reopen https://coreyvibe.org/
3. Test 3 Shorts.
4. Expected: three different-looking Shorts and three different titles.
5. If any rendered file fails the local video check, ClipFree should re-encode it instead of sending the bad fast-path file to YouTube.
