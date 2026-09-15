# stellar-pub-repo

A live search over **MedicMedic's public GitHub repositories**, built against the real
[GitHub REST API](https://docs.github.com/en/rest) — no backend, no scraping, no mock data.

## Running it

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## What it does

- **Navbar** — brand (`stellar-pub-repo`) on the left, `Home` and `Stellar Site` (→
  [medicmedic.github.io](https://medicmedic.github.io)) on the right. All trim/accent
  color throughout the app is hot pink.
- **Search** — filters MedicMedic's public repos by name/description. This runs
  entirely in the browser against the repo list already fetched (see "Why search is
  local" below), not as a fresh API call per keystroke.
- **Sort** — four criteria, in priority order **Stars, Last commit, Created, Name**,
  each toggled between descending/ascending with the arrow button beside the group.
  Defaults to Stars, descending.
- **Grid → modal** — clicking a card opens a modal that fetches additional stats
  (commit count, per-language breakdown via `/repos/:repo/languages`, license, open
  issues, watchers, dates) and links out to the repo on GitHub. The commit count reads
  the last-page number off the `Link` header of a 1-commit request, since GitHub's API
  has no "total commits" field — see `getCommitCount` in `src/api/github.ts`.
- **Live updates** — the current view silently re-syncs with GitHub every 90 seconds,
  and there's a manual **Refresh** button. No page reload needed.

## Why search is local

GitHub caps unauthenticated requests at **60/hour**. An earlier version of this app
called GitHub's Search API on every query change, which — combined with the 90-second
poll and normal browsing — burned through that budget in minutes. Since MedicMedic's
public repos are few enough to hold in memory, the app now fetches the full list once
(plus the periodic re-sync and manual refresh) and searches/sorts it client-side. The
data is still 100% real and live; only the *search operation itself* is local rather
than a network round-trip.

## Reviewer guide: reaching all three states

The view can be in exactly one of three states — **Loading**, **Error**, or a
**successful result** (which may be empty). Each is visually and textually distinct
(spinner + neutral copy · red panel naming what failed · gray panel confirming the
list loaded fine and the search simply found nothing). All three are reachable
without touching the code:

| State | Natural trigger | Deterministic trigger (no code edit) |
|---|---|---|
| **Loading** | Happens on first page load and whenever you press **Refresh**, while GitHub responds. | Add `?demo=loading` to the URL, e.g. `http://localhost:5173/?demo=loading`. The view stays in the loading state indefinitely (no network call is made). |
| **Error** | Exceed GitHub's unauthenticated rate limit (60 requests/hour) or go offline and press Refresh. | Add `?demo=error` to the URL. This renders the real error panel with a message that says what failed and what to do next (its text explicitly says it was a simulated failure via the demo flag, and how to get back to live data). |
| **Empty result** | Search for something that doesn't match any of MedicMedic's repo names/descriptions, e.g. `zzz-nonexistent`. | Add `?demo=empty` to the URL. Shown as a neutral "no match" panel, not an error — the list loaded fine, the search just returned nothing. |

Reload the page after adding/removing `?demo=...` for it to take effect; the demo mode
is read once per page load and does not persist across navigation.

## Error messages

Errors are surfaced with the actual reason GitHub gave (rate limit with a wait time
and reset clock, network failure, 404 on the username, or an unexpected HTTP status)
plus a concrete next step ("wait N minutes and press Refresh", "check your connection
and press Refresh", etc.) — see `githubFetch` in `src/api/github.ts`.

## Notes

- GitHub's public API allows unauthenticated, CORS-enabled requests, so everything
  here runs client-side straight against `api.github.com` — no scraping or server
  component required.
- Unauthenticated requests are capped at 60/hour by GitHub. Repeated manual refreshes
  or opening many repo modals in quick succession (each fetches its own commit count
  and language breakdown) are the fastest ways to burn through that budget — and a
  convenient way to trigger the real rate-limit error above.
