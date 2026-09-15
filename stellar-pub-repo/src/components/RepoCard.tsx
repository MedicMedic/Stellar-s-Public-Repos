import type { GithubRepo } from '../types'
import { ForkIcon, StarIcon } from './Icons'

interface RepoCardProps {
  repo: GithubRepo
  onOpen: (repo: GithubRepo) => void
}

export function RepoCard({ repo, onOpen }: RepoCardProps) {
  return (
    <button type="button" className="repo-card" onClick={() => onOpen(repo)}>
      <div className="repo-card-top">
        <h3 className="repo-card-name">{repo.name}</h3>
        {repo.language && <span className="repo-card-language">{repo.language}</span>}
      </div>
      <p className="repo-card-description">{repo.description ?? 'No description provided.'}</p>
      <div className="repo-card-stats">
        <span>
          <StarIcon /> {repo.stargazers_count}
        </span>
        <span>
          <ForkIcon /> {repo.forks_count}
        </span>
      </div>
    </button>
  )
}
