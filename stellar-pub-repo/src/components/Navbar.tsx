const STELLAR_SITE_URL = 'https://medicmedic.github.io'

interface NavbarProps {
  onHome: () => void
}

export function Navbar({ onHome }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a className="navbar-brand" href="/">
          stellar-pub-repo
        </a>
        <nav className="navbar-links">
          <button type="button" className="navbar-link" onClick={onHome}>
            Home
          </button>
          <a
            className="navbar-link"
            href={STELLAR_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Stellar Site
          </a>
        </nav>
      </div>
    </header>
  )
}
