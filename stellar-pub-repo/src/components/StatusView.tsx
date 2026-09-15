import type { ExplorerError } from '../types'
import { EmptyIcon, WarningIcon } from './Icons'

export function LoadingView() {
  return (
    <div className="status-view status-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p className="status-title">Loading MedicMedic’s repositories…</p>
      <p className="status-body">Talking to the GitHub API. This usually takes a second.</p>
    </div>
  )
}

export function ErrorView({ error, onRetry }: { error: ExplorerError; onRetry: () => void }) {
  return (
    <div className="status-view status-error" role="alert">
      <WarningIcon className="status-icon" />
      <p className="status-title">Couldn&apos;t load repositories</p>
      <p className="status-body">{error.message}</p>
      <button type="button" className="retry-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export function EmptyView({ query }: { query: string }) {
  return (
    <div className="status-view status-empty" role="status">
      <EmptyIcon className="status-icon" />
      <p className="status-title">
        {query ? (
          <>
            No repositories match &ldquo;{query}&rdquo;
          </>
        ) : (
          'MedicMedic has no public repositories right now'
        )}
      </p>
      <p className="status-body">
        {query
          ? 'GitHub returned the repository list fine — none of them match your search. Try a different term or clear the search to see everything.'
          : 'Check back later, or open the GitHub profile directly.'}
      </p>
    </div>
  )
}
