# The Internet — GitHub Pages

This folder is the static “The Internet” new-tab experience, built to run on **GitHub Pages** so you can use it as a custom new-tab URL (e.g. in Zen with New Tab Override).

## Enable GitHub Pages

1. In your repo: **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. **Branch**: `main` (or your default branch).
4. **Folder**: `/docs`.
5. Save. The site will be at `https://<username>.github.io/<repo>/` (or your custom domain).

## Use as New Tab in Zen

Because Zen’s built-in new-tab override can show a blank page:

1. Install a **New Tab Override**–style extension (or use Zen’s new-tab setting if it accepts a URL).
2. Set the new-tab URL to your Pages URL, e.g.  
   `https://<username>.github.io/<repo>/`

Your settings (specimens, artifacts, compass offset, dark mode, image offsets) are stored in **localStorage** when viewed as a normal webpage, so they persist per origin.

## Contents

- **index.html** — Main page (same experience as ZenMod’s new tab).
- **newtab.js** — Logic; uses `localStorage` on the web and `chrome.storage` when run as an extension.
- **three.min.js** — Three.js for the compass.
- **assets/** — Cursor, specimen assets, and artifact images.

All paths are relative so the site works when served from a subpath (e.g. `.../repo/`).
