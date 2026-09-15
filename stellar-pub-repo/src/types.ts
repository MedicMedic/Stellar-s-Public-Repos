export interface GithubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  language: string | null
  created_at: string
  updated_at: string
  pushed_at: string
  archived: boolean
  fork: boolean
  size: number
  default_branch: string
  topics?: string[]
  license: { name: string } | null
}

export interface RepoWithCommits extends GithubRepo {
  commitCount?: number
}

export type SortCriterion = 'stars' | 'updated' | 'created' | 'commits'
export type SortDirection = 'desc' | 'asc'

export interface SortCriterionOption {
  key: SortCriterion
  label: string
}

export const SORT_CRITERIA: SortCriterionOption[] = [
  { key: 'stars', label: 'Stars' },
  { key: 'updated', label: 'Last commit' },
  { key: 'created', label: 'Created' },
  { key: 'commits', label: 'Commits' },
]

export type ErrorKind = 'rate-limit' | 'not-found' | 'network' | 'demo' | 'unknown'

export interface ExplorerError {
  message: string
  kind: ErrorKind
}
