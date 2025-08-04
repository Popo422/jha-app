'use client'

import { useEffect } from 'react'
import { useAppSelector } from '@/lib/hooks'

interface ThemeProviderProps {
  children: React.ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppSelector((state) => state.theme.mode)

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    // Add the current theme class
    if (theme === 'dark') {
      root.classList.add('dark')
    }
    
    // Update the color-scheme for proper OS integration
    root.style.colorScheme = theme
    
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  return <>{children}</>
}