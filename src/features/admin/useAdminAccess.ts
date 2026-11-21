import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getAdminUser } from '../../services/cloud/adminRepository'
import type { AdminUser } from '../../types/admin'

export type AdminAccessStatus = 'loading' | 'anonymous' | 'denied' | 'admin' | 'error'

export function useAdminAccessState() {
  const { user, loading } = useAuth()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [status, setStatus] = useState<AdminAccessStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    if (loading) {
      setStatus('loading')
      return
    }
    if (!user) {
      setAdmin(null)
      setStatus('anonymous')
      setError(null)
      return
    }
    if (user.isDemo) {
      setAdmin(null)
      setStatus('denied')
      setError('Demo accounts cannot access the admin workspace.')
      return
    }
    setStatus('loading')
    getAdminUser(user.uid)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          setAdmin(null)
          setStatus('denied')
          setError('This account does not have an administrator role.')
          return
        }
        if (!record.active) {
          setAdmin(record)
          setStatus('denied')
          setError('This administrator account is inactive.')
          return
        }
        setAdmin(record)
        setStatus('admin')
        setError(null)
      })
      .catch((reason: unknown) => {
        if (cancelled) return
        setAdmin(null)
        setStatus('error')
        setError((reason as Error).message || 'Could not verify administrator access.')
      })
    return () => {
      cancelled = true
    }
  }, [user, loading, version])

  return { admin, status, error, refresh }
}


type AdminAccessValue = ReturnType<typeof useAdminAccessState>

const AdminAccessContext = createContext<AdminAccessValue | null>(null)

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const value = useAdminAccessState()
  return createElement(AdminAccessContext.Provider, { value }, children)
}

export function useAdminAccess(): AdminAccessValue {
  const value = useContext(AdminAccessContext)
  if (!value) throw new Error('useAdminAccess must be used inside AdminAccessProvider')
  return value
}
