const STORAGE_KEY = 'majollo-theme'

export type Theme = 'dark' | 'light'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY)
  return (stored === 'light' || stored === 'dark') ? stored : 'dark'
}

export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, theme)
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.removeAttribute('data-theme')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
}
