ClipFree v42 — HUMAN APPROVAL HARD GATE

WHY THIS FIX EXISTS
A real Moose Short reached YouTube even though the final approval checkboxes
were still unticked and the user had not pressed APPROVE + UPLOAD TO YOUTUBE.

That was an upload-consent race. It does NOT mean the YouTube API compliance
review was approved.

UPLOAD / REPLACE THESE 3 FILES:
1. index.html
2. compliance-demo-v11.js
3. upload-approval-gate-v42.js

WHAT v42 DOES
- The actual YouTube video-upload network request for generated animal Shorts
  is held inside the browser until the user presses APPROVE + UPLOAD TO YOUTUBE.
- One approval click permits exactly one YouTube video upload.
- CANCEL rejects any held upload and sends no video bytes.
- Manual non-animal uploads remain untouched.
- Keeps Title, Description and Public / Unlisted / Private review.
- Keeps the existing v40 lazy runtime and reviewer files.
- Does not replace youtube.js, category-pages.js, animal-generator.js,
  ai-voiceover.js or the source/recovery systems.

AFTER UPLOAD
1. Fully close every coreyvibe.org tab.
2. Reopen https://coreyvibe.org/
3. Look for "v42 FAST LOAD".
4. Test ONE Short.
5. When the final review opens, DO NOT tick anything for 30–60 seconds.
   Confirm no new video appears in YouTube Studio.
6. Then choose Private, tick both boxes, tap APPROVE + UPLOAD TO YOUTUBE,
   and confirm exactly one new video appears.
