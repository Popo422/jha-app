'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/lib/hooks'
import { setTheme, ThemeMode } from '@/lib/features/theme/themeSlice'

export default function ThemeInitializer() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Only run on client side
    const getInitialTheme = (): ThemeMode => {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') {
        return stored
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    const initialTheme = getInitialTheme()
    dispatch(setTheme(initialTheme))
  }, [dispatch])

  return null
}