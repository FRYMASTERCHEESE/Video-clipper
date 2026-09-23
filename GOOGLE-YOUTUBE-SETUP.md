# Google / YouTube one-time setup for ClipFree AI

## 1. Create or open a Google Cloud project
Use the Google account that owns or manages the YouTube channel you want ClipFree to work with.

## 2. Enable APIs
Enable:
- YouTube Data API v3
- YouTube Analytics API

## 3. Configure Google Auth Platform
Set up the OAuth consent screen. If the app is still in **Testing**, add the Google account that owns/manages the YouTube channel under **Audience → Test users**.

## 4. Create an OAuth Client ID
Create a **Web application** OAuth client.

Authorized JavaScript origin:

`https://frymastercheese.github.io`

Do not put `/Video-clipper/` on the JavaScript origin.

## 5. Save the Client ID in ClipFree
Open:

`https://frymastercheese.github.io/Video-clipper/`

Go to **Setup**, paste the OAuth Client ID, then press **Save settings on this device**.

Do not paste a Google OAuth client secret into ClipFree.

## 6. Connect YouTube
Press **Connect YouTube**, use the test-user Google account, review the permissions, and approve them.

## 7. Test uploads privately first
New/unverified YouTube API projects can have API uploads forced to Private until Google's compliance audit is completed.

## 8. Optional charity button
In ClipFree **Setup**, paste the official donation page for the charity or fundraiser you want to support. The website opens that page directly; ClipFree does not process the donation itself.

## Optional app links for Google verification

Privacy Policy: `https://frymastercheese.github.io/Video-clipper/privacy.html`

Terms of Service: `https://frymastercheese.github.io/Video-clipper/terms.html`
