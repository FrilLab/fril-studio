// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { I18nProvider, resolveLocale } from './index'

describe('locale resolution', () => {
  it('uses Korean for a Korean browser preference', () => {
    expect(resolveLocale(null, ['ko-KR', 'en-US'])).toBe('ko')
  })

  it('falls back to English for an unsupported browser language', () => {
    expect(resolveLocale(null, ['ja-JP'])).toBe('en')
  })

  it('gives a saved preference priority over the browser language', () => {
    expect(resolveLocale('ko', ['en-US'])).toBe('ko')
  })

  it('falls back to English for a saved unsupported locale', () => {
    expect(resolveLocale('ja', ['ko-KR'])).toBe('en')
  })
})

describe('language switcher', () => {
  let root: Root
  let container: HTMLDivElement

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true
    document.head.innerHTML = '<meta name="description" content="English description" />'
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('switches the studio copy and persists an explicit choice', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      )
    })

    expect(document.documentElement.lang).toBe('en')
    expect(container.querySelector('#works-title')?.textContent).toBe('Selected works')

    const koreanButton = container.querySelector<HTMLButtonElement>(
      '.language-option[aria-label="Korean"]',
    )
    expect(koreanButton).not.toBeNull()
    act(() => koreanButton?.click())

    expect(container.querySelector('#works-title')?.textContent).toBe('주요 작품')
    expect(document.documentElement.lang).toBe('ko')
    expect(document.title).toContain('안으로 들어가 볼 수 있는 아이디어')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content'))
      .toContain('독립 웹 스튜디오입니다')
    expect(localStorage.getItem('fril-studio-locale')).toBe('ko')
    expect(container.querySelector('.language-option[aria-pressed="true"]')?.textContent)
      .toBe('KO')
  })

  it('loads the saved preference ahead of the browser language', () => {
    localStorage.setItem('fril-studio-locale', 'ko')

    act(() => {
      root.render(
        <I18nProvider>
          <App />
        </I18nProvider>,
      )
    })

    expect(document.documentElement.lang).toBe('ko')
    expect(container.querySelector('#works-title')?.textContent).toBe('주요 작품')
  })
})
