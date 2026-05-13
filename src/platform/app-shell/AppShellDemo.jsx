import AppShell from './AppShell.jsx'
import HomePage from '../../pages/HomePage.jsx'

export default function AppShellDemo() {
  return (
    <div style={{ height: '80vh', minHeight: '600px', border: '2px dashed var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <AppShell showDemo={true}>
        <HomePage />
      </AppShell>
    </div>
  )
}
