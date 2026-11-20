# Polymathica

A web-based learning tracker with GitHub-backed sync and public sharing. Track progress across subjects with goals, resources, and projects. Public viewers see read-only data; repository owner gets full editing with cross-device sync.

**Live Demo**: [https://japancolorado.github.io/polymathica/](https://japancolorado.github.io/polymathica/)

## Features

- Dashboard and catalog views with progress tracking (not started, in progress, completed)
- Subject management with goals, resources, and nested projects
- Dependency system (prerequisites, corequisites, soft dependencies)
- Auto-sync every 5 minutes when authenticated
- Public read-only sharing, fork to customize
- Dark/light themes, works offline with localStorage cache

## Setup

**1. Enable GitHub Pages**
Settings → Pages → Deploy from branch `main` → folder `/` (root)
Site URL: `https://YOUR-USERNAME.github.io/my-polymathica/`

**2. Create Personal Access Token**
[GitHub Settings](https://github.com/settings/tokens) → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
**Required scope**: `repo`
Copy the token immediately.

**3. Sign In & Configure**
Visit your Pages URL → Sign In → Paste token
Update [js/config.js](js/config.js) if needed: `repoOwner` and `repoName` fields

## Creating Your Own Tracker

**Fork**: Click "Fork" button → Follow setup above

**Clone**:

```bash
git clone https://github.com/JapanColorado/polymathica.git my-polymathica
cd my-polymathica
git remote set-url origin https://github.com/YOUR-USERNAME/my-polymathica.git
git push -u origin main
```

**Customize Catalog**: Edit [data/catalog.json](data/catalog.json) to add/remove subjects

## Renaming Repository

Rename on GitHub → Update `js/config.js` → Commit/push → Re-authenticate on new URL

## Data & Privacy

**Storage**: User data stored in public [data/user-data.json](data/user-data.json), synced via GitHub API, version controlled. LocalStorage used as offline cache.

**Privacy**: All data (progress, goals, resources, projects) is **public** in your repository. Personal Access Token stored in browser only, never committed.

**Backup**: Auto-backed up in git. Export in settings (cog icon) or manually via `data/user-data.json` in GitHub.

## Sync

- **Auto-sync**: Every 5 minutes + on page close when authenticated
- **Manual sync**: Click sync status indicator
- **Conflict resolution**: Last-write-wins
- **Offline**: Works with cached data, syncs when reconnected

## Technical Stack

- Vanilla JavaScript (no frameworks/build tools)
- GitHub Pages hosting + GitHub API storage
- Personal Access Tokens for auth
- LocalStorage for offline cache
- CSS Custom Properties for theming

## Troubleshooting

**Sign in fails**: Verify token has `repo` scope, check expiration, clear localStorage (`localStorage.clear()`), check console (F12)

**Sync fails**: Check sync status indicator, verify signed in as owner, check API rate limits (5000/hour)

**Stale public view**: GitHub Pages CDN caching (wait 1-2 min), hard refresh (Ctrl+Shift+R)

**Cross-device sync issues**: Wait for auto-sync (5 min), manual sync, verify both devices signed in, check GitHub Actions

## FAQ

**Can multiple people edit?** No, only repository owner. Others can fork.

**Make it private?** Set repository to private in GitHub settings.

**Export data?** Download `data/user-data.json` or check git history.

**Lost token?** Generate new token and sign in again. Data is safe in GitHub.

**Use without GitHub?** Yes, but only syncs on reconnect.

## How this was built

Built with [Claude Code](https://claude.com/claude-code).

## License

[MIT](LICENSE)

---

**Version**: 2.0 | **Updated**: November 2025
