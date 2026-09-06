import { Navigate } from 'react-router-dom'
import { useAppState } from '../context/AppContext'

const HOME_PATH = { seller: '/dashboard', buyer: '/buyer/dashboard' }

export default function RequireRole({ role, children }) {
  const { role: currentRole } = useAppState()

  if (currentRole !== role) {
    return <Navigate to={HOME_PATH[currentRole] ?? '/'} replace />
  }

  return children
}
