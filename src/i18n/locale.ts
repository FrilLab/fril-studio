export type Locale = 'en' | 'ko'

export function resolveLocale(
  savedLocale: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (savedLocale !== null) {
    return isLocale(savedLocale) ? savedLocale : 'en'
  }

  const preferredLanguage = browserLanguages[0] ?? ''
  return preferredLanguage.toLowerCase().split(/[-_]/, 1)[0] === 'ko' ? 'ko' : 'en'
}

function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'ko'
}
