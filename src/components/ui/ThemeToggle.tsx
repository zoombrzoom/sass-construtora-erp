'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { getStoredTheme, setStoredTheme, applyTheme, type Theme } from '@/lib/theme'

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setThemeState(getStoredTheme())
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setStoredTheme(next)
    applyTheme(next)
    setThemeState(next)
  }

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-100 text-gray-400 transition-colors hover:border-brand hover:bg-dark-400 hover:text-brand dark:border-dark-100 dark:hover:border-brand dark:hover:bg-dark-400 dark:hover:text-brand"
      aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
