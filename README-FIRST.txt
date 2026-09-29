ClipFree AI — RIGHTS CHECKBOX FIX v8
30 September 2026

REPLACE THESE 2 FILES:
- category-pages.js
- index.html

WHY IT SAID TO TICK THE BOX WHEN YOU ALREADY HAD
The visible Simple Studio checkbox was correctly ticked.

But older 20-Short code had saved a reference to a DIFFERENT legacy checkbox.
The final single-screen cleanup removes that old 20-Short card from the page.
That left the old JavaScript reference pointing at a detached unchecked box.

FIX v8
- 9–20 Short batches now read the CURRENT visible simpleRights checkbox.
- A checked visible confirmation is synchronized into the hidden YouTube uploader.
- No dependency on the removed 20 Stunning Shorts card.
- The alert now points to the visible checkbox if confirmation is genuinely missing.
- index.html cache-busts category-pages.js so Android Chrome loads the fix immediately.

KEEP ALL OTHER SPEED + QUALITY MAX v7 FILES.

TEST
1. Replace category-pages.js and index.html.
2. Fully close the coreyvibe.org tab.
3. Reopen the website.
4. Tick the visible rights checkbox once.
5. Choose 20 Shorts.
6. Tap the purple button once.

The old “Tick the rights ... in the 20 Stunning Shorts card” alert should be gone.
