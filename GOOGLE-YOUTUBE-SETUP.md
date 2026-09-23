# Google / YouTube one-time setup for ClipFree AI

You only need to do this once for the website owner account.

## 1. Create a Google Cloud project
Go to Google Cloud Console and create a project for ClipFree AI.

## 2. Enable APIs
Enable both:
- YouTube Data API v3
- YouTube Analytics API

## 3. Configure OAuth consent
Configure the OAuth consent screen. If the app is still in Testing, add the Google account that owns your YouTube channel as a test user.

## 4. Create an OAuth Client ID
Create credentials → OAuth client ID → **Web application**.

Add this Authorized JavaScript origin:

`https://frymastercheese.github.io`

You do not need to put a Google client secret into ClipFree AI.

## 5. Optional public-search API key
An API key is optional. It is only needed if you want the Creative Commons finder to work before signing into YouTube.

If you create one, restrict it to:
- HTTP referrer: `https://frymastercheese.github.io/*`
- API: YouTube Data API v3

## 6. Save it in ClipFree AI
Open:

`https://frymastercheese.github.io/Video-clipper/`

Go to **Setup**, paste the OAuth Client ID, optionally paste the API key, then press **Save settings on this device**.

## 7. Connect YouTube
Press **Connect YouTube** and approve the Google permissions shown by Google.

## 8. Test safely
For the first upload, keep Privacy set to **Private**. New/unverified YouTube API projects can be forced to Private by YouTube until Google completes the required API audit.
