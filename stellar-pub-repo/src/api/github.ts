import type { ErrorKind, GithubRepo } from '../types'

export const GITHUB_USER = 'MedicMedic'

const API_BASE = 'https://api.github.com'

export class GithubApiError extends Error {
  kind: ErrorKind

  constructor(message: string, kind: ErrorKind) {
    super(message)
    this.kind = kind
  }
}

async function githubFetch(path: string, signal?: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new GithubApiError(
      'Could not reach the GitHub API. Check your internet connection, then use the Refresh button to try again.',
      'network',
    )
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    const resetHeader = res.headers.get('x-ratelimit-reset')
    if (remaining === '0' && resetHeader) {
      const resetDate = new Date(Number(resetHeader) * 1000)
      const mins = Math.max(1, Math.ceil((resetDate.getTime() - Date.now()) / 60000))
      throw new GithubApiError(
        `GitHub's public API rate limit was exceeded. Wait about ${mins} minute${mins === 1 ? '' : 's'} (resets at ${resetDate.toLocaleTimeString()}) and press Refresh.`,
        'rate-limit',
      )
    }
    throw new GithubApiError(
      'GitHub rejected the request (403 Forbidden). Wait a few minutes, then press Refresh to try again.',
      'rate-limit',
    )
  }
  if (res.status === 404) {
    throw new GithubApiError(
      `GitHub user "${GITHUB_USER}" could not be found. Check the username and press Refresh.`,
      'not-found',
    )
  }
  if (!res.ok) {
    throw new GithubApiError(
      `GitHub API request failed (HTTP ${res.status} ${res.statusText}). Press Refresh to try again.`,
      'unknown',
    )
  }
  return res
}

/** Fetches every public, non-fork repository for the account. */
export async function listAllRepos(signal?: AbortSignal): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = []
  let page = 1
  for (;;) {
    const res = await githubFetch(
      `/users/${GITHUB_USER}/repos?type=public&per_page=100&page=${page}`,
      signal,
    )
    const batch = (await res.json()) as GithubRepo[]
    repos.push(...batch)
    if (batch.length < 100) break
    page += 1
  }
  return repos
}

/**
 * GitHub's REST API has no "total commits" field. This reads the page count
 * off the `Link` header of a 1-item commits request, which is the standard
 * trick for getting a commit total without paging through every commit.
 */
export async function getCommitCount(fullName: string, signal?: AbortSignal): Promise<number> {
  const res = await githubFetch(`/repos/${fullName}/commits?per_page=1`, signal)
  const link = res.headers.get('link')
  if (link) {
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
    if (match) return Number(match[1])
  }
  const data = (await res.json()) as unknown[]
  return data.length
}

export async function getLanguages(
  fullName: string,
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  const res = await githubFetch(`/repos/${fullName}/languages`, signal)
  return (await res.json()) as Record<string, number>
}
