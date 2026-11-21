export type SyncStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error'

export interface SyncMeta {
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncedAt: string | null
}
