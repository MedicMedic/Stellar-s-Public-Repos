import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GithubApiError, getCommitCount, listAllRepos, searchRepos } from '../api/github'
import type { ExplorerError, RepoWithCommits, SortCriterion, SortDirection } from '../types'

const POLL_INTERVAL_MS = 90_000
const COMMIT_FETCH_CONCURRENCY = 5

/** Demo hook (documented in the README): lets a reviewer force each UI
 * state deterministically via a URL param, with no code changes. */
function getDemoMode(): 'loading' | 'error' | 'empty' | null {
  const value = new URLSearchParams(window.location.search).get('demo')
  if (value === 'loading' || value === 'error' || value === 'empty') return value
  return null
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await fn(items[index])
    }
  }
  await Promise.all(new Array(Math.min(limit, items.length)).fill(0).map(() => worker()))
  return results
}

export interface RepoExplorerState {
  status: 'loading' | 'error' | 'success'
  repos: RepoWithCommits[]
  error: ExplorerError | null
  lastUpdated: Date | null
  isRefreshing: boolean
  countingCommits: boolean
  refresh: () => void
  demoMode: 'loading' | 'error' | 'empty' | null
}

export function useRepoExplorer(
  query: string,
  criterion: SortCriterion,
  direction: SortDirection,
): RepoExplorerState {
  const demoMode = useMemo(() => getDemoMode(), [])

  const [baseRepos, setBaseRepos] = useState<RepoWithCommits[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [error, setError] = useState<ExplorerError | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const commitCountsRef = useRef<Map<string, number>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadBase = useCallback(
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
        setBaseRepos([])
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
        const trimmed = query.trim()
        const repos = trimmed ? await searchRepos(trimmed) : await listAllRepos()
        const nonForks = repos.filter((r) => !r.fork)
        setBaseRepos(
          nonForks.map((r) => ({ ...r, commitCount: commitCountsRef.current.get(r.full_name) })),
        )
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
    [query, demoMode],
  )

  // Debounced fetch whenever the search query changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void loadBase({ silent: false })
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, demoMode])

  // Live updates: silently re-poll the current view on an interval.
  useEffect(() => {
    const id = setInterval(() => {
      void loadBase({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [loadBase])

  // When sorting by commit count, lazily fetch counts for repos that don't have one yet.
  const needsCommitCounts = criterion === 'commits'
  const countingCommits =
    needsCommitCounts && baseRepos.length > 0 && baseRepos.some((r) => r.commitCount === undefined)

  useEffect(() => {
    if (!needsCommitCounts) return
    const missing = baseRepos.filter((r) => r.commitCount === undefined)
    if (missing.length === 0) return

    let cancelled = false
    void mapWithConcurrency(missing, COMMIT_FETCH_CONCURRENCY, async (repo) => {
      try {
        const count = await getCommitCount(repo.full_name)
        commitCountsRef.current.set(repo.full_name, count)
        return { fullName: repo.full_name, count }
      } catch {
        return { fullName: repo.full_name, count: undefined }
      }
    }).then((results) => {
      if (cancelled) return
      setBaseRepos((prev) =>
        prev.map((r) => {
          const found = results.find((res) => res.fullName === r.full_name)
          return found ? { ...r, commitCount: found.count ?? r.commitCount } : r
        }),
      )
    })

    return () => {
      cancelled = true
    }
  }, [needsCommitCounts, baseRepos])

  const repos = useMemo(() => {
    const dir = direction === 'desc' ? -1 : 1
    const sorted = [...baseRepos]
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
      case 'commits':
        sorted.sort((a, b) => {
          // Repos whose commit count hasn't loaded yet sort last, regardless of direction.
          if (a.commitCount === undefined && b.commitCount === undefined) return 0
          if (a.commitCount === undefined) return 1
          if (b.commitCount === undefined) return -1
          return dir * (a.commitCount - b.commitCount)
        })
        break
    }
    return sorted
  }, [baseRepos, criterion, direction])

  const refresh = useCallback(() => {
    void loadBase({ silent: false })
  }, [loadBase])

  return { status, repos, error, lastUpdated, isRefreshing, countingCommits, refresh, demoMode }
}
