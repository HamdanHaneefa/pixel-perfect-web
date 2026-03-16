import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Upgrade from '@/pages/Upgrade'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPaid } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!isPaid) return <Upgrade />

  return <>{children}</>
}
