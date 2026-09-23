# ClipFree verified animal catalog + pages fix

Upload ONLY `site.js` to your existing `Video-clipper` GitHub repository and replace the old `site.js`.

Changes:
- Searches multiple Wikimedia Commons result pages instead of only the old first 20 results.
- Catalogs verified results into 12-per-page pages with Previous / Next / numbered page controls.
- Adds a `Load more matching videos` button so you can keep expanding the catalog.
- Rejects false matches such as Lion Air, MGM lion logos/film intros, military Exercise African Lion, airlines, crash sites and brands.
- For `lion fights`, exact fight/action matches are prioritized; unrelated lion footage is not automatically uploaded as if it were a fight.
- Prefers smaller files for Android reliability and skips a failed source instead of stopping the whole batch.
- Keeps the existing YouTube Discovery Score / SEO optimizer.

Important:
The catalog can check hundreds or thousands of source candidates over repeated Load More rounds, but it cannot guarantee thousands of verified videos for one exact topic if Wikimedia Commons does not contain that many.
