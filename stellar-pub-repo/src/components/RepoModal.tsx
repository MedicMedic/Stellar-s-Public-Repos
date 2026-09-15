import { useEffect, useRef, useState } from 'react'
import { getCommitCount, getLanguages } from '../api/github'
import type { RepoWithCommits } from '../types'
import { CloseIcon, ForkIcon, GithubIcon, IssueIcon, StarIcon, WatchIcon } from './Icons'

interface RepoModalProps {
  repo: RepoWithCommits
  onClose: () => void
}

interface Stats {
  commitCount: number | null
  languages: Record<string, number> | null
}

// Fixed categorical slot order (never reassigned per language) — see
// src/index.css. Beyond 8 languages the rest fold into "Other" rather than
// generating a 9th hue.
const MAX_LANGUAGE_SLOTS = 8

function topLanguages(languages: Record<string, number>): [string, number][] {
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1])
  if (sorted.length <= MAX_LANGUAGE_SLOTS) return sorted
  const head = sorted.slice(0, MAX_LANGUAGE_SLOTS - 1)
  const otherBytes = sorted.slice(MAX_LANGUAGE_SLOTS - 1).reduce((sum, [, v]) => sum + v, 0)
  return [...head, ['Other', otherBytes]]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function RepoModal({ repo, onClose }: RepoModalProps) {
  const [stats, setStats] = useState<Stats>({
    commitCount: repo.commitCount ?? null,
    languages: null,
  })
  const [loadingStats, setLoadingStats] = useState(true)
  // Captured once at mount rather than read directly in render, which a
  // component body must keep pure (no Date.now() calls during render).
  const [openedAt] = useState(() => Date.now())
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Move focus into the modal on open, and back to whatever triggered it on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([
      repo.commitCount !== undefined
        ? Promise.resolve(repo.commitCount)
        : getCommitCount(repo.full_name, controller.signal),
      getLanguages(repo.full_name, controller.signal),
    ]).then(([commitResult, langResult]) => {
      if (controller.signal.aborted) return
      setStats({
        commitCount: commitResult.status === 'fulfilled' ? commitResult.value : null,
        languages: langResult.status === 'fulfilled' ? langResult.value : null,
      })
      setLoadingStats(false)
    })
    return () => controller.abort()
  }, [repo.full_name, repo.commitCount])

  // Escape closes the modal; Tab is trapped so keyboard focus can't leak
  // behind the overlay onto cards the user can no longer see.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const languageEntries = stats.languages ? topLanguages(stats.languages) : []
  const totalLanguageBytes = languageEntries.reduce((sum, [, v]) => sum + v, 0)

  const daysSincePush = (openedAt - new Date(repo.pushed_at).getTime()) / DAY_MS
  const isActive = !repo.archived && daysSincePush <= 30

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-modal-title"
        ref={modalRef}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          ref={closeButtonRef}
        >
          <CloseIcon />
        </button>

        <div className="modal-banner">
          <span className="modal-avatar" aria-hidden="true">
            {repo.name.charAt(0).toUpperCase()}
          </span>
          <div className="modal-banner-text">
            <h2 className="modal-title" id="repo-modal-title">
              {repo.name}
            </h2>
            {repo.language && <span className="modal-language-chip">{repo.language}</span>}
          </div>
        </div>

        <div className="modal-body">
          {(isActive || repo.archived) && (
            <div className="modal-badges">
              {repo.archived ? (
                <span className="badge badge-archived">
                  <span className="badge-dot" />
                  Archived
                </span>
              ) : (
                <span className="badge badge-active">
                  <span className="badge-dot" />
                  Actively maintained
                </span>
              )}
            </div>
          )}

          <p className="modal-description">{repo.description ?? 'No description provided.'}</p>

          <div className="modal-stats-grid">
            <div className="stat-tile">
              <span className="stat-tile-icon">
                <StarIcon />
              </span>
              <span className="stat-tile-value">{repo.stargazers_count}</span>
              <span className="stat-tile-label">Stars</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon">
                <ForkIcon />
              </span>
              <span className="stat-tile-value">{repo.forks_count}</span>
              <span className="stat-tile-label">Forks</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon">
                <WatchIcon />
              </span>
              <span className="stat-tile-value">{repo.watchers_count}</span>
              <span className="stat-tile-label">Watchers</span>
            </div>
            <div className="stat-tile">
              <span className="stat-tile-icon">
                <IssueIcon />
              </span>
              <span className="stat-tile-value">{repo.open_issues_count}</span>
              <span className="stat-tile-label">Open issues</span>
            </div>
            <div className="stat-tile stat-tile-wide">
              <span className="stat-tile-value stat-tile-value-small">
                {loadingStats ? (
                  <span className="skeleton-pulse">···</span>
                ) : (
                  (stats.commitCount ?? '—')
                )}
              </span>
              <span className="stat-tile-label">Commits</span>
            </div>
            <div className="stat-tile stat-tile-wide">
              <span className="stat-tile-value stat-tile-value-small">
                {new Date(repo.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="stat-tile-label">Created</span>
            </div>
          </div>

          {languageEntries.length > 0 && (
            <div className="modal-languages">
              <p className="modal-section-label">Languages</p>
              <div className="language-bar">
                {languageEntries.map(([lang, bytes], i) => (
                  <span
                    key={lang}
                    className="language-bar-segment"
                    style={{
                      width: `${(bytes / totalLanguageBytes) * 100}%`,
                      background: `var(--series-${(i % MAX_LANGUAGE_SLOTS) + 1})`,
                    }}
                  />
                ))}
              </div>
              <ul className="language-legend">
                {languageEntries.map(([lang, bytes], i) => (
                  <li key={lang} className="language-legend-item">
                    <span
                      className="language-legend-swatch"
                      style={{ background: `var(--series-${(i % MAX_LANGUAGE_SLOTS) + 1})` }}
                      aria-hidden="true"
                    />
                    {lang} · {((bytes / totalLanguageBytes) * 100).toFixed(0)}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="modal-license">{repo.license?.name ?? 'No license'}</p>

          <a className="modal-link" href={repo.html_url} target="_blank" rel="noopener noreferrer">
            <GithubIcon />
            View repository on GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
