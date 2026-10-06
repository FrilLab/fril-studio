import { useI18n } from './i18n'
import type { Locale } from './i18n'
import type { TranslationKey } from './i18n/en'

type Work = {
  number: string
  title: TranslationKey
  category: TranslationKey
  year: string
  art: 'form' | 'story' | 'objects' | 'play'
  posterTitle: TranslationKey
  posterNote: TranslationKey
  visualDescription: TranslationKey
}

const works: Work[] = [
  {
    number: '001',
    title: 'works.form.title',
    category: 'works.form.category',
    year: '2026',
    art: 'form',
    posterTitle: 'works.form.posterTitle',
    posterNote: 'works.form.posterNote',
    visualDescription: 'accessibility.artwork.form',
  },
  {
    number: '002',
    title: 'works.story.title',
    category: 'works.story.category',
    year: '2026',
    art: 'story',
    posterTitle: 'works.story.posterTitle',
    posterNote: 'works.story.posterNote',
    visualDescription: 'accessibility.artwork.story',
  },
  {
    number: '003',
    title: 'works.objects.title',
    category: 'works.objects.category',
    year: '2026',
    art: 'objects',
    posterTitle: 'works.objects.posterTitle',
    posterNote: 'works.objects.posterNote',
    visualDescription: 'accessibility.artwork.objects',
  },
  {
    number: '004',
    title: 'works.play.title',
    category: 'works.play.category',
    year: '2026',
    art: 'play',
    posterTitle: 'works.play.posterTitle',
    posterNote: 'works.play.posterNote',
    visualDescription: 'accessibility.artwork.play',
  },
]

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
                    aria-label={t(work.visualDescription)}
                  >
                    <span className="artwork-label">FRIL STUDIO&nbsp; / &nbsp;{work.number}</span>
                    <span className="artwork-shape" aria-hidden="true" />
                    <span className="artwork-title" aria-hidden="true">{t(work.posterTitle)}</span>
                    <span className="artwork-note" aria-hidden="true">{t(work.posterNote)}</span>
                    <span className="artwork-coordinates" aria-hidden="true">{work.year}</span>
                  </div>
                  <div className="work-caption">
                    <div className="work-name-line">
                      <span className="work-number">{work.number}</span>
                      <h3>{t(work.title)}</h3>
                    </div>
                    <p className="work-meta">
                      <span>{t(work.category)}</span>
                      <span>{work.year}</span>
                    </p>
                    <p className="work-status">{t('works.status')}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="collection-note">{t('works.collectionNote')}</p>
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
