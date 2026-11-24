import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, ScrollText, ShieldCheck } from 'lucide-react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { buttonClasses } from '../../components/ui/Button'
import { listAdminActivity } from '../../services/cloud/adminRepository'
import type { AdminActivityLog } from '../../types/admin'
import { formatDate } from '../../lib/utils'

const PAGE_SIZE = 25

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'user.suspend', label: 'User suspended' },
  { value: 'user.reactivate', label: 'User reactivated' },
  { value: 'user.update', label: 'User updated' },
  { value: 'content.create', label: 'Content created' },
  { value: 'content.update', label: 'Content updated' },
  { value: 'content.delete', label: 'Content deleted' },
  { value: 'content.publish', label: 'Content published' },
  { value: 'content.unpublish', label: 'Content unpublished' },
  { value: 'announcement.create', label: 'Announcement created' },
  { value: 'announcement.update', label: 'Announcement updated' },
  { value: 'announcement.publish', label: 'Announcement published' },
  { value: 'announcement.unpublish', label: 'Announcement unpublished' },
  { value: 'announcement.delete', label: 'Announcement deleted' },
  { value: 'ticket.reply', label: 'Ticket reply' },
  { value: 'ticket.status', label: 'Ticket status' },
  { value: 'ticket.priority', label: 'Ticket priority' },
  { value: 'ticket.assign', label: 'Ticket assignment' },
  { value: 'ticket.internal_note', label: 'Internal note' },
  { value: 'admin.role', label: 'Admin role' },
  { value: 'admin.active', label: 'Admin status' },
  { value: 'admin.provision', label: 'Admin provisioned' },
  { value: 'notification.broadcast', label: 'Broadcast sent' },
  { value: 'platform.settings.update', label: 'Settings updated' },
]

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([])
  const [action, setAction] = useState('all')
  const [page, setPage] = useState(1)
  const [cursorStack, setCursorStack] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([
    null,
  ])
  const [nextCursor, setNextCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    setPage(1)
    setCursorStack([null])
    setNextCursor(null)
  }, [action])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAdminActivity({
      pageSize: PAGE_SIZE,
      cursor: cursorStack[page - 1] ?? null,
      action,
    })
      .then((result) => {
        if (cancelled) return
        setLogs(result.logs)
        setTotal(result.total)
        setNextCursor(result.nextCursor)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError((reason as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [action, cursorStack, page, version])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const nextPage = () => {
    if (page >= pageCount) return
    if (nextCursor) {
      setCursorStack((current) => {
        const copy = [...current]
        copy[page] = nextCursor
        return copy
      })
    }
    setPage((value) => value + 1)
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Governance"
        title="Activity log"
        subtitle="Immutable records of privileged administrative actions. Entries cannot be edited or deleted from the admin panel."
        actions={
          <button type="button" onClick={reload} className={buttonClasses('outline', 'sm')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh log
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <AdminStat icon={ScrollText} label="Recorded actions" value={total} accent />
        <AdminStat icon={ShieldCheck} label="Storage" value="Immutable" note="Firestore rules deny update/delete" />
        <AdminStat icon={ShieldCheck} label="Current page" value={logs.length} note="Newest first" />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-charcoal/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="rounded-xl border border-charcoal/12 bg-white px-3 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none"
            aria-label="Filter by action"
          >
            {ACTION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
            {total} action{total === 1 ? '' : 's'} · admin-only
          </p>
        </div>

        {loading ? (
          <AdminLoading label="Loading audit records…" />
        ) : error ? (
          <div className="p-5">
            <AdminError message={error} />
          </div>
        ) : logs.length === 0 ? (
          <AdminEmptyState
            icon={ScrollText}
            title={action === 'all' ? 'No administrative actions yet' : 'No actions match that filter'}
            description={
              action === 'all'
                ? 'Suspensions, content changes, announcements and ticket actions will be recorded here.'
                : 'Choose another action type to review the audit trail.'
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-charcoal/5">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/55">
                          {log.action}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
                          {log.targetType || 'record'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] font-semibold text-charcoal">{log.detail || 'Administrative action'}</p>
                      <p className="mt-0.5 text-[9px] text-charcoal/40">
                        {log.adminName} · ID {log.adminId.slice(0, 12)} · target {log.targetId || '—'}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="mt-1.5 rounded-lg bg-ivory px-2.5 py-1.5 text-[9px] leading-relaxed text-charcoal/45">
                          {Object.entries(log.metadata)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
                      {formatDate(new Date(log.createdAt))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 border-t border-charcoal/8 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
                  aria-label="Previous audit page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[10px] font-semibold text-charcoal/50">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount || loading}
                  onClick={nextPage}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
                  aria-label="Next audit page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </AdminPanel>
    </div>
  )
}
