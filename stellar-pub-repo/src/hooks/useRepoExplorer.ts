import { useCallback, useEffect, useMemo, useState } from 'react'
import { GithubApiError, listAllRepos } from '../api/github'
import type { ExplorerError, GithubRepo, SortCriterion, SortDirection } from '../types'

const POLL_INTERVAL_MS = 90_000

/** Demo hook (documented in the README): lets a reviewer force each UI
 * state deterministically via a URL param, with no code changes. */
function getDemoMode(): 'loading' | 'error' | 'empty' | null {
  const value = new URLSearchParams(window.location.search).get('demo')
  if (value === 'loading' || value === 'error' || value === 'empty') return value
  return null
}

export interface RepoExplorerState {
  status: 'loading' | 'error' | 'success'
  repos: GithubRepo[]
  error: ExplorerError | null
  lastUpdated: Date | null
  isRefreshing: boolean
  refresh: () => void
  demoMode: 'loading' | 'error' | 'empty' | null
}

export function useRepoExplorer(
  query: string,
  criterion: SortCriterion,
  direction: SortDirection,
): RepoExplorerState {
  const demoMode = useMemo(() => getDemoMode(), [])

  const [allRepos, setAllRepos] = useState<GithubRepo[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<ExplorerError | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetches the whole (small) public repo list once; searching and sorting
  // then happen locally in the browser rather than as separate API calls,
  // since GitHub caps unauthenticated requests at 60/hour and a fresh
  // request per keystroke would burn through that fast.
  const load = useCallback(
    async (opts: { silent: boolean }) => {
      if (demoMode === 'loading') {
        // Intentionally never resolves, so the loading state is reachable on demand.
        setStatus('loading')
        return
      }
      if (demoMode === 'error') {
        if (!opts.silent) setStatus('loading')
        setError({
          message:
            'Simulated failure (requested via ?demo=error). Remove that parameter from the URL and press Refresh to load real GitHub data.',
          kind: 'demo',
        })
        setStatus('error')
        return
      }
      if (demoMode === 'empty') {
        if (!opts.silent) setStatus('loading')
        setAllRepos([])
        setStatus('success')
        setLastUpdated(new Date())
        return
      }

      if (!opts.silent) {
        setStatus('loading')
        setError(null)
      } else {
        setIsRefreshing(true)
      }

      try {
        const repos = await listAllRepos()
        setAllRepos(repos.filter((r) => !r.fork))
        setStatus('success')
        setError(null)
        setLastUpdated(new Date())
      } catch (err) {
        if (opts.silent) {
          // A background poll failing shouldn't blow away good data on screen.
          return
        }
        if (err instanceof GithubApiError) {
          setError({ message: err.message, kind: err.kind })
        } else {
          setError({
            message: 'Something unexpected went wrong talking to GitHub. Press Refresh to try again.',
            kind: 'unknown',
          })
        }
        setStatus('error')
      } finally {
        setIsRefreshing(false)
      }
    },
    [demoMode],
  )

  // Fetch once on mount. Deferred a tick so the state updates inside `load`
  // happen in a callback rather than synchronously during the effect itself.
  useEffect(() => {
    const id = setTimeout(() => void load({ silent: false }), 0)
    return () => clearTimeout(id)
  }, [load])

  // Live updates: silently re-poll on an interval.
  useEffect(() => {
    const id = setInterval(() => {
      void load({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? allRepos.filter(
          (r) =>
            r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
        )
      : allRepos

    const dir = direction === 'desc' ? -1 : 1
    const sorted = [...matched]
    switch (criterion) {
      case 'stars':
        sorted.sort((a, b) => dir * (a.stargazers_count - b.stargazers_count))
        break
      case 'updated':
        sorted.sort(
          (a, b) => dir * (new Date(a.pushed_at).getTime() - new Date(b.pushed_at).getTime()),
        )
        break
      case 'created':
        sorted.sort(
          (a, b) => dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        )
        break
      case 'name':
        sorted.sort((a, b) => dir * a.name.localeCompare(b.name))
        break
    }
    return sorted
  }, [allRepos, query, criterion, direction])

  const refresh = useCallback(() => {
    void load({ silent: false })
  }, [load])

  return { status, repos, error, lastUpdated, isRefreshing, refresh, demoMode }
}
