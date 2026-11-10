import { createContext, useContext, useEffect } from 'react'
import { DirectionProvider as RdxDirProvider } from '@radix-ui/react-direction'
import { useLanguage } from '@/i18n'
import { setCookie, removeCookie } from '@/lib/cookies'

export type Direction = 'ltr' | 'rtl'

const DIRECTION_COOKIE_NAME = 'dir'
const DIRECTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type DirectionContextType = {
  defaultDir: Direction
  dir: Direction
  setDir: (dir: Direction) => void
  resetDir: () => void
}

const DirectionContext = createContext<DirectionContextType | null>(null)

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const { direction: languageDirection } = useLanguage()
  const dir = languageDirection

  useEffect(() => {
    const htmlElement = document.documentElement
    htmlElement.setAttribute('dir', dir)
  }, [dir])

  useEffect(() => {
    setCookie(
      DIRECTION_COOKIE_NAME,
      languageDirection,
      DIRECTION_COOKIE_MAX_AGE
    )
  }, [languageDirection])

  const setDir = (dir: Direction) => {
    setCookie(DIRECTION_COOKIE_NAME, dir, DIRECTION_COOKIE_MAX_AGE)
  }

  const resetDir = () => {
    removeCookie(DIRECTION_COOKIE_NAME)
  }

  return (
    <DirectionContext
      value={{
        defaultDir: languageDirection,
        dir,
        setDir,
        resetDir,
      }}
    >
      <RdxDirProvider dir={dir}>{children}</RdxDirProvider>
    </DirectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
