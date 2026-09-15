import { useState } from 'react'
import './App.css'
import { Controls } from './components/Controls'
import { Navbar } from './components/Navbar'
import { RepoGrid } from './components/RepoGrid'
import { RepoModal } from './components/RepoModal'
import { EmptyView, ErrorView, LoadingView } from './components/StatusView'
import { useRepoExplorer } from './hooks/useRepoExplorer'
import type { RepoWithCommits, SortCriterion, SortDirection } from './types'

function App() {
  const [query, setQuery] = useState('')
  const [criterion, setCriterion] = useState<SortCriterion>('stars')
  const [direction, setDirection] = useState<SortDirection>('desc')
  const [selectedRepo, setSelectedRepo] = useState<RepoWithCommits | null>(null)

  const { status, repos, error, lastUpdated, isRefreshing, countingCommits, refresh } =
    useRepoExplorer(query, criterion, direction)

  return (
    <>
      <Navbar />
      <main className="page">
        <Controls
          query={query}
          onQueryChange={setQuery}
          criterion={criterion}
          onCriterionChange={setCriterion}
          direction={direction}
          onDirectionToggle={() => setDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />

        {status === 'loading' && <LoadingView />}
        {status === 'error' && error && <ErrorView error={error} onRetry={refresh} />}
        {status === 'success' && countingCommits && <LoadingView countingCommits />}
        {status === 'success' && !countingCommits && repos.length === 0 && (
          <EmptyView query={query.trim()} />
        )}
        {status === 'success' && !countingCommits && repos.length > 0 && (
          <RepoGrid repos={repos} onOpen={setSelectedRepo} />
        )}
      </main>

      {selectedRepo && (
        <RepoModal key={selectedRepo.id} repo={selectedRepo} onClose={() => setSelectedRepo(null)} />
      )}
    </>
  )
}

export default App
