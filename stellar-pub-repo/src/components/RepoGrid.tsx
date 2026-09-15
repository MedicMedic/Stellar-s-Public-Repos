import type { RepoWithCommits } from '../types'
import { RepoCard } from './RepoCard'

interface RepoGridProps {
  repos: RepoWithCommits[]
  onOpen: (repo: RepoWithCommits) => void
}

export function RepoGrid({ repos, onOpen }: RepoGridProps) {
  return (
    <div className="repo-grid">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} onOpen={onOpen} />
      ))}
    </div>
  )
}
