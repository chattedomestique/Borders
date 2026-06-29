import { SettingsProvider } from './state/SettingsContext.jsx'
import AppShell from './features/shell/AppShell.jsx'

export default function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  )
}
