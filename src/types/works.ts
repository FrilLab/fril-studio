export type LocalizedText = {
  en: string
  ko: string
}

export type StudioWork = {
  id: string
  slug: string
  title: LocalizedText
  category: LocalizedText
  description: LocalizedText
  year: string
  thumbnail?: string
  entry: string
  status: 'published'
}
