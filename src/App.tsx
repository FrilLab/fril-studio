const App = () => (
  <main className="studio">
    <header className="masthead">
      <a className="wordmark" href="/" aria-label="Fril Studio home">
        fril<span aria-hidden="true">.</span>
      </a>
      <span className="masthead-note">Independent web studio</span>
    </header>

    <section className="intro" aria-labelledby="studio-title">
      <p className="eyebrow">Code · Motion · Story · Play</p>
      <h1 id="studio-title">A small studio for curious things.</h1>
      <p className="intro-copy">
        Fril Studio explores interactive web experiences that invite you to
        pause, play, and look closer.
      </p>
    </section>

    <section className="works" aria-labelledby="works-title">
      <div className="section-heading">
        <h2 id="works-title">The collection</h2>
        <span>01 / Works</span>
      </div>
      <p className="empty-state">
        New experiences are taking shape. Check back soon.
      </p>
    </section>

    <footer className="footer">
      <span>Fril Studio</span>
      <span>Made for the open web</span>
    </footer>
  </main>
)

export default App
