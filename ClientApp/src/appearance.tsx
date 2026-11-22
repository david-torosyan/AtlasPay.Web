import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Appearance = { dark: boolean; motion: boolean; toggleTheme: () => void; toggleMotion: () => void }
const Context = createContext<Appearance | undefined>(undefined)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)
  const [motion, setMotion] = useState(true)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.motion = motion ? 'on' : 'off'
  }, [dark, motion])
  return <Context.Provider value={{ dark, motion, toggleTheme: () => setDark(value => !value), toggleMotion: () => setMotion(value => !value) }}>{children}</Context.Provider>
}

export function useAppearance() {
  const value = useContext(Context)
  if (!value) throw new Error('AppearanceProvider is required.')
  return value
}
