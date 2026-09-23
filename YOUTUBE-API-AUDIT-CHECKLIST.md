# ClipFree AI — YouTube API Compliance Audit Checklist

This file is a preparation guide, not legal advice.

## Current API client
- Name: ClipFree AI
- Primary URL: https://frymastercheese.github.io/Video-clipper/
- Privacy Policy: https://frymastercheese.github.io/Video-clipper/privacy.html
- Terms: https://frymastercheese.github.io/Video-clipper/terms.html
- YouTube Terms: https://www.youtube.com/t/terms
- Google Privacy Policy: https://policies.google.com/privacy
- API client type: Browser-based web application / GitHub Pages
- Primary use case: Video uploading & account management, analytics/reporting, client-side media editing
- Target audience: Individual Content Creators

## Form
Official form:
https://support.google.com/youtube/contact/yt_api_form

For an initial compliance audit, use the first audit option shown in the current form. In the explanation, state clearly that the immediate reason is to complete the YouTube API compliance audit for the API project used by ClipFree AI, including the restriction that videos.insert uploads from an unverified project are currently forced to Private.

## Project details to have ready
- Google Cloud Project ID
- Numeric Google Cloud Project Number
- OAuth Client ID
- Your connected YouTube channel URL
- Primary website URL
- Privacy Policy URL
- Terms URL
- Expected daily upload count and API usage
- Full legal contact/address details requested by Google

## Suggested business/use-case description
ClipFree AI is a browser-based media workflow tool for individual content creators. It provides independent functionality beyond YouTube itself: client-side video clipping and 9:16 rendering, captions, thumbnails, metadata/SEO packaging, reusable-media source discovery with attribution, upload queue/retry visibility, playlist management, and a dashboard that displays the authorizing user's YouTube channel and analytics data. The user explicitly initiates or enables upload workflows, chooses the intended visibility, and confirms rights/Community Guidelines compliance before upload. The application does not request or store Google passwords and does not sell or use YouTube user data for advertising or surveillance.

## Evidence screenshots to prepare
1. Homepage showing ClipFree AI and the footer links to Privacy Policy / Terms / YouTube Terms.
2. Privacy Policy page showing:
   - YouTube API Services disclosure
   - Google Privacy Policy link
   - data accessed/used
   - revocation link / deletion process
3. Terms page showing agreement to YouTube Terms.
4. OAuth warning/consent screen showing requested scopes.
5. Connected-channel dashboard showing the authorized channel.
6. Upload interface showing:
   - visibility control
   - Community Guidelines / rights confirmation
   - title/description/tags
7. FULL AUTO upload queue showing user-initiated batch controls and per-item status.

## Important
YouTube's API compliance audit and Google's OAuth app verification/publishing status are separate processes. Passing the YouTube API audit is the step relevant to the videos.insert Private-only restriction. Staying signed in for long periods still requires an OAuth architecture capable of securely using refresh tokens (normally a backend), not a client secret embedded in GitHub Pages.
