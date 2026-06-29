import { createContext, useContext } from 'react'

/** The settings context. Created in its own module so the provider file only
 *  exports a component (keeps React Fast Refresh happy). */
export const SettingsContext = createContext(null)

/** Read the editor settings + actions. Must be used under <SettingsProvider>. */
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>')
  return ctx
}
