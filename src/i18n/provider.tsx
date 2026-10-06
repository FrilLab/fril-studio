import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import en, { type TranslationKey } from './en'
import ko from './ko'
import { I18nContext } from './context'
import { resolveLocale } from './locale'
import type { Locale } from './locale'

const translations: Record<Locale, Record<TranslationKey, string>> = { en, ko }
const preferenceKey = 'fril-studio-locale'

function getInitialLocale(): Locale {
  let savedLocale: string | null = null
  try {
    savedLocale = window.localStorage.getItem(preferenceKey)
  } catch {
    // Storage can be unavailable in private browsing or restricted environments.
  }

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]
  return resolveLocale(savedLocale, browserLanguages)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    try {
      window.localStorage.setItem(preferenceKey, nextLocale)
    } catch {
      // The in-memory locale still changes when persistence is unavailable.
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? translations.en[key],
    [locale],
  )

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t('metadata.title')
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (description) description.content = t('metadata.description')
  }, [locale, t])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
