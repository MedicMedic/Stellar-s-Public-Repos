const STELLAR_SITE_URL = 'https://medicmedic.github.io'

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <a className="navbar-brand" href="/">
          stellar-pub-repo
        </a>
        <nav className="navbar-links">
          <a className="navbar-link" href="/">
            Home
          </a>
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
