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
      className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
      style={{
        background: 'var(--background-tertiary)',
        border: '1px solid var(--border)',
        color: theme === 'dark' ? 'var(--warning)' : 'var(--accent-purple)',
      }}
      aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
