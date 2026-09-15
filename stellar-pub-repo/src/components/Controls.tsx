import { SORT_CRITERIA } from '../types'
import type { SortCriterion, SortDirection } from '../types'
import { RefreshIcon, SearchIcon, SortAscIcon, SortDescIcon } from './Icons'

interface ControlsProps {
  query: string
  onQueryChange: (value: string) => void
  criterion: SortCriterion
  onCriterionChange: (value: SortCriterion) => void
  direction: SortDirection
  onDirectionToggle: () => void
  onRefresh: () => void
  isRefreshing: boolean
  lastUpdated: Date | null
}

export function Controls({
  query,
  onQueryChange,
  criterion,
  onCriterionChange,
  direction,
  onDirectionToggle,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: ControlsProps) {
  return (
    <div className="controls">
      <label className="search-field">
        <SearchIcon className="search-field-icon" />
        <input
          type="search"
          placeholder="Search MedicMedic's repositories…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search repositories"
        />
      </label>

      <div className="sort-controls">
        <div className="sort-group" role="group" aria-label="Sort repositories by">
          {SORT_CRITERIA.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`sort-pill${criterion === opt.key ? ' active' : ''}`}
              aria-pressed={criterion === opt.key}
              onClick={() => onCriterionChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sort-direction-toggle"
          onClick={onDirectionToggle}
          aria-label={direction === 'desc' ? 'Sorted highest to lowest, click to reverse' : 'Sorted lowest to highest, click to reverse'}
          title={direction === 'desc' ? 'Descending' : 'Ascending'}
        >
          {direction === 'desc' ? <SortDescIcon /> : <SortAscIcon />}
        </button>
      </div>

      <button
        type="button"
        className="refresh-button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh repositories"
      >
        <RefreshIcon className={isRefreshing ? 'spinning' : ''} />
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </button>

      <span className="live-indicator" title="This list re-syncs with GitHub automatically every 90 seconds">
        <span className="live-dot" aria-hidden="true" />
        {lastUpdated
          ? `Live · synced ${lastUpdated.toLocaleTimeString()}`
          : 'Live'}
      </span>
    </div>
  )
}
