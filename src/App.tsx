type Work = {
  number: string
  title: string
  category: string
  year: string
  art: 'form' | 'story' | 'objects' | 'play'
  posterTitle: string
  posterNote: string
  visualDescription: string
}

const works: Work[] = [
  {
    number: '001',
    title: 'Form in motion',
    category: 'Product motion',
    year: '2026',
    art: 'form',
    posterTitle: 'FORM',
    posterNote: 'A study in movement',
    visualDescription:
      'A silver poster with the word Form and a fine circular motion study.',
  },
  {
    number: '002',
    title: 'Somewhere, slowly',
    category: 'Scroll story',
    year: '2026',
    art: 'story',
    posterTitle: 'A PLACE\nBETWEEN',
    posterNote: 'A story told by scrolling',
    visualDescription:
      'A warm orange poster with a pale sun, a diagonal line, and the words A Place Between.',
  },
  {
    number: '003',
    title: 'Soft structures',
    category: '3D showcase',
    year: '2026',
    art: 'objects',
    posterTitle: 'OBJECT\nSTUDIES',
    posterNote: 'Light, volume, and space',
    visualDescription:
      'A dark blue poster with a faceted geometric object.',
  },
  {
    number: '004',
    title: 'Little orbit',
    category: 'Mini game',
    year: '2026',
    art: 'play',
    posterTitle: 'PLAY\nA LITTLE',
    posterNote: 'A small game for a short pause',
    visualDescription:
      'A pale green poster with playful circles and a small checkerboard.',
  },
]

const App = () => (
  <>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    <div className="studio" id="top">
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Fril Studio home">
          FRIL<span aria-hidden="true">.</span>
          <span className="wordmark-studio">STUDIO</span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#works">Works</a>
          <a href="#about">About</a>
        </nav>

        <details className="mobile-nav">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <a href="#works">Works</a>
            <a href="#about">About</a>
          </nav>
        </details>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-topline">
            <p>Independent web studio</p>
            <p>Seoul · Working everywhere</p>
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Code&nbsp; / &nbsp;Motion&nbsp; / &nbsp;Story&nbsp; / &nbsp;Play</p>
            <h1 id="hero-title">
              Ideas you can
              <br />
              <span>step inside.</span>
            </h1>
            <div className="hero-bottom">
              <p className="hero-description">
                We make interactive experiences for the open web — small worlds
                built to be explored.
              </p>
              <a className="explore-link" href="#works">
                <span>Explore selected works</span>
                <span className="explore-arrow" aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <span className="hero-index" aria-hidden="true">FS—001</span>
        </section>

        <section className="works" id="works" aria-labelledby="works-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The collection</p>
              <h2 id="works-title">Selected works</h2>
            </div>
            <span className="section-count">01 — 04</span>
          </div>

          <div className="work-grid">
            {works.map((work, index) => (
              <article
                className={`work-item${index === 0 ? ' work-item--feature' : ''}`}
                key={work.number}
              >
                <div
                  className={`artwork artwork--${work.art}`}
                  role="img"
                  aria-label={work.visualDescription}
                >
                  <span className="artwork-label">FRIL STUDIO&nbsp; / &nbsp;{work.number}</span>
                  <span className="artwork-shape" aria-hidden="true" />
                  <span className="artwork-title" aria-hidden="true">{work.posterTitle}</span>
                  <span className="artwork-note" aria-hidden="true">{work.posterNote}</span>
                  <span className="artwork-coordinates" aria-hidden="true">{work.year}</span>
                </div>
                <div className="work-caption">
                  <div className="work-name-line">
                    <span className="work-number">{work.number}</span>
                    <h3>{work.title}</h3>
                  </div>
                  <p className="work-meta">
                    <span>{work.category}</span>
                    <span>{work.year}</span>
                  </p>
                  <p className="work-status">In development</p>
                </div>
              </article>
            ))}
          </div>
          <p className="collection-note">
            A few ideas taking shape. Each experience has its own point of view.
          </p>
        </section>

        <section className="about" id="about" aria-labelledby="about-title">
          <div className="about-label">
            <p className="eyebrow">A little about us</p>
            <span>02 — Studio</span>
          </div>
          <div className="about-copy">
            <h2 id="about-title">A quiet place for curious work.</h2>
            <div className="about-detail">
              <p>
                Fril Studio is an independent practice exploring what happens
                when code, motion, and stories meet in a browser.
              </p>
              <p>
                The studio is a small gallery and a way in. Every work is made
                to stand on its own, with the freedom to find its own tools,
                colors, and rules.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="footer-mark" href="#top">FRIL STUDIO<span aria-hidden="true">.</span></a>
        <span>Made for the open web&nbsp; · &nbsp;© 2026</span>
        <a className="back-to-top" href="#top">Back to top ↑</a>
      </footer>
    </div>
  </>
)

export default App
