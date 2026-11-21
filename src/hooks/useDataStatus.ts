import { useAuth } from '../features/auth/AuthContext'
import { useProfileStore } from '../store/useProfileStore'
import { useActivityStore } from '../store/useActivityStore'
import { isFirestoreConfigured } from '../lib/firestore'

export function useDataStatus() {
  const { user } = useAuth()
  const profileSync = useProfileStore((s) => s.syncStatus)
  const profileError = useProfileStore((s) => s.syncError)
  const activitySync = useActivityStore((s) => s.syncStatus)
  const activityError = useActivityStore((s) => s.syncError)
  const lastSyncedAt = useProfileStore((s) => s.lastSyncedAt)
  const isCloud =
    Boolean(user && !user.isDemo && isFirestoreConfigured) &&
    (profileSync === 'synced' || profileSync === 'saving') &&
    (activitySync === 'synced' || activitySync === 'saving')
  const isConnecting = profileSync === 'loading' || activitySync === 'loading'
  const error = profileError ?? activityError
  return {
    isCloud,
    isConnecting,
    source: (isCloud ? 'live' : 'local') as 'live' | 'local',
    label: isCloud ? 'Synced to your account' : 'Saved on this device',
    shortLabel: isCloud ? 'Cloud' : user?.isDemo ? 'Demo' : 'Local',
    error,
    lastSyncedAt,
  }
}
