import { useI18n } from './i18n'
import type { Locale } from './i18n'
import works from 'virtual:fril-works'

const App = () => {
  const { locale, setLocale, t } = useI18n()

  const languageButton = (language: Locale, label: string) => (
    <button
      aria-label={label}
      aria-pressed={locale === language}
      className="language-option"
      onClick={() => setLocale(language)}
      type="button"
    >
      {language.toUpperCase()}
    </button>
  )

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('accessibility.skipToContent')}
      </a>
      <div className="studio" id="top">
        <header className="masthead">
          <a className="wordmark" href="#top" aria-label={t('accessibility.homeLink')}>
            FRIL<span aria-hidden="true">.</span>
            <span className="wordmark-studio">STUDIO</span>
          </a>

          <div className="header-tools">
            <nav className="desktop-nav" aria-label={t('accessibility.mainNavigation')}>
              <a href="#works">{t('nav.works')}</a>
              <a href="#about">{t('nav.about')}</a>
            </nav>

            <div className="language-switcher" role="group" aria-label={t('accessibility.languageSwitcher')}>
              {languageButton('en', t('accessibility.english'))}
              <span aria-hidden="true">/</span>
              {languageButton('ko', t('accessibility.korean'))}
            </div>

            <details className="mobile-nav">
              <summary>{t('nav.menu')}</summary>
              <nav aria-label={t('accessibility.mobileNavigation')}>
                <a href="#works">{t('nav.works')}</a>
                <a href="#about">{t('nav.about')}</a>
              </nav>
            </details>
          </div>
        </header>

        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-topline">
              <p>{t('hero.studioType')}</p>
              <p>{t('hero.location')}</p>
            </div>
            <div className="hero-copy">
              <p className="eyebrow">{t('hero.disciplines')}</p>
              <h1 id="hero-title">
                {t('hero.titleFirst')}
                <br />
                <span>{t('hero.titleSecond')}</span>
              </h1>
              <div className="hero-bottom">
                <p className="hero-description">{t('hero.description')}</p>
                <a className="explore-link" href="#works">
                  <span>{t('hero.exploreWorks')}</span>
                  <span className="explore-arrow" aria-hidden="true">↓</span>
                </a>
              </div>
            </div>
            <span className="hero-index" aria-hidden="true">FS—001</span>
          </section>

          <section className="works" id="works" aria-labelledby="works-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t('works.collection')}</p>
                <h2 id="works-title">{t('works.title')}</h2>
              </div>
              <span className="section-count">
                {works.length > 0 ? '01' : '00'} — {String(works.length).padStart(2, '0')}
              </span>
            </div>

            {works.length > 0 ? (
              <>
                <div className="work-grid">
                  {works.map((work, index) => (
                    <article
                      className={`work-item${index === 0 ? ' work-item--feature' : ''}`}
                      key={work.slug}
                    >
                      <a
                        className={`work-preview${work.thumbnail ? '' : ' work-preview--empty'}`}
                        href={work.entry}
                        aria-label={`${work.title[locale]} — ${t('works.viewWork')}`}
                      >
                        {work.thumbnail ? (
                          <img
                            className="work-thumbnail"
                            src={work.thumbnail}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span className="work-preview-fallback" aria-hidden="true">
                            <span>FRIL STUDIO / {work.id}</span>
                            <span>{work.title[locale]}</span>
                          </span>
                        )}
                        <span className="work-preview-link" aria-hidden="true">
                          {t('works.viewWork')} <span>↗</span>
                        </span>
                      </a>
                      <div className="work-caption">
                        <div className="work-name-line">
                          <span className="work-number">{work.id}</span>
                          <h3>{work.title[locale]}</h3>
                        </div>
                        <p className="work-meta">
                          <span>{work.category[locale]}</span>
                          <span>{work.year}</span>
                        </p>
                        <p className="work-description">{work.description[locale]}</p>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="collection-note">{t('works.collectionNote')}</p>
              </>
            ) : (
              <div className="works-empty">
                <h3>{t('works.emptyTitle')}</h3>
                <p>{t('works.emptyDescription')}</p>
              </div>
            )}
          </section>

          <section className="about" id="about" aria-labelledby="about-title">
            <div className="about-label">
              <p className="eyebrow">{t('about.label')}</p>
              <span>{t('about.section')}</span>
            </div>
            <div className="about-copy">
              <h2 id="about-title">{t('about.title')}</h2>
              <div className="about-detail">
                <p>{t('about.paragraphOne')}</p>
                <p>{t('about.paragraphTwo')}</p>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <a className="footer-mark" href="#top">FRIL STUDIO<span aria-hidden="true">.</span></a>
          <span>{t('footer.tagline')}&nbsp; · &nbsp;© 2026</span>
          <a className="back-to-top" href="#top">{t('footer.backToTop')}</a>
        </footer>
      </div>
    </>
  )
}

export default App
