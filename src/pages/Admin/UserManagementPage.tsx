import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore'
import { toast } from 'sonner'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
  AccountStatusBadge,
  SupportStatusBadge,
} from '../../components/admin/ui'
import { Modal } from '../../components/ui/Modal'
import { buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import {
  getAdminUserDetail,
  getAdminUserStats,
  listAdminUsersPage,
  logAdminActivity,
  searchAdminUsers,
  updateUserAccount,
  type AdminUserStats,
} from '../../services/cloud/adminRepository'
import type { AdminUserDetail, AdminUserSummary } from '../../types/admin'
import { formatDate } from '../../lib/utils'

const PAGE_SIZE = 12

const EMPTY_STATS: AdminUserStats = {
  total: 0,
  active: 0,
  suspended: 0,
  missingProfiles: 0,
}

function periodStart(period: 'all' | '7' | '30' | '90') {
  if (period === 'all') return null
  const date = new Date()
  date.setDate(date.getDate() - Number(period))
  return date
}

export default function UserManagementPage() {
  const { admin } = useAdminAccess()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [stats, setStats] = useState<AdminUserStats>(EMPTY_STATS)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('all')
  const [page, setPage] = useState(1)
  const [cursors, setCursors] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([
    null,
  ])
  const [nextCursor, setNextCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [searchCapped, setSearchCapped] = useState(false)
  const [version, setVersion] = useState(0)
  const [selected, setSelected] = useState<AdminUserSummary | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [statsVersion, setStatsVersion] = useState(0)
  const filterSignature = useRef('|all|all')

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    getAdminUserStats()
      .then(setStats)
      .catch(() => undefined)
  }, [statsVersion])

  useEffect(() => {
    const timer = window.setTimeout(() => setQuerySearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const signature = `${querySearch}|${status}|${period}`
    if (filterSignature.current !== signature) {
      filterSignature.current = signature
      const timer = window.setTimeout(() => {
        setPage(1)
        setCursors([null])
        setNextCursor(null)
      }, 300)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [querySearch, status, period])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        if (querySearch) {
          const result = await searchAdminUsers({
            search: querySearch,
            status,
            since: periodStart(period),
          })
          if (cancelled) return
          setUsers(result.users)
          setTotal(result.users.length)
          setSearchMode(true)
          setSearchCapped(result.capped)
          setNextCursor(null)
        } else {
          const result = await listAdminUsersPage({
            pageSize: PAGE_SIZE,
            cursor: cursors[page - 1] ?? null,
            status,
            since: periodStart(period),
          })
          if (cancelled) return
          setUsers(result.users)
          setTotal(result.total)
          setSearchMode(false)
          setSearchCapped(false)
          setNextCursor(result.nextCursor)
        }
        setError(null)
      } catch (reason) {
        if (!cancelled) setError((reason as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [cursors, page, querySearch, status, period, version])

  const pageCount = Math.max(1, Math.ceil((searchMode ? users.length : total) / PAGE_SIZE))
  const paged = searchMode
    ? users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : users
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = searchMode
    ? Math.min(page * PAGE_SIZE, users.length)
    : Math.min((page - 1) * PAGE_SIZE + users.length, total)

  const nextPage = () => {
    if (page >= pageCount) return
    if (!searchMode && nextCursor) {
      setCursors((current) => {
        const copy = [...current]
        copy[page] = nextCursor
        return copy
      })
    }
    setPage((value) => value + 1)
  }

  const openUser = async (user: AdminUserSummary) => {
    setSelected(user)
    setDetail(null)
    setEditName(user.fullName)
    setDetailLoading(true)
    try {
      setDetail(await getAdminUserDetail(user.uid))
    } catch (reason) {
      toast.error((reason as Error).message)
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const applyStatusLocally = (uid: string, next: 'active' | 'suspended', reason: string | null) => {
    const update = (user: AdminUserSummary): AdminUserSummary => ({
      ...user,
      accountStatus: next,
      suspensionReason: next === 'suspended' ? reason : null,
      suspendedAt: next === 'suspended' ? new Date().toISOString() : null,
      suspendedByName: next === 'suspended' ? admin?.name ?? null : null,
    })
    setUsers((items) => items.map((item) => (item.uid === uid ? update(item) : item)))
    setSelected((item) => (item && item.uid === uid ? update(item) : item))
    setDetail((current) =>
      current && current.user.uid === uid
        ? { ...current, user: update(current.user) }
        : current,
    )
    setStats((current) => ({
      ...current,
      active: Math.max(0, current.active + (next === 'active' ? 1 : -1)),
      suspended: Math.max(0, current.suspended + (next === 'suspended' ? 1 : -1)),
    }))
  }

  const suspendAccount = async () => {
    if (!selected || !admin || saving) return
    const reason = suspendReason.trim()
    if (reason.length < 10) {
      toast.error('Add a suspension reason of at least 10 characters.')
      return
    }
    setSaving(true)
    try {
      await updateUserAccount(selected.uid, {
        accountStatus: 'suspended',
        suspensionReason: reason,
        suspendedAt: Timestamp.now(),
        suspendedBy: admin.uid,
        suspendedByName: admin.name,
      })
      await logAdminActivity({
        adminId: admin.uid,
        adminName: admin.name,
        action: 'user.suspend',
        targetType: 'user',
        targetId: selected.uid,
        detail: `${selected.fullName} (${selected.email})`,
        metadata: { reason },
      })
      applyStatusLocally(selected.uid, 'suspended', reason)
      setSuspendOpen(false)
      setSuspendReason('')
      setStatsVersion((value) => value + 1)
      toast.success('User suspended.')
    } catch (reasonValue) {
      toast.error((reasonValue as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const reactivateAccount = async () => {
    if (!selected || !admin || saving) return
    setSaving(true)
    try {
      const previousReason = selected.suspensionReason
      await updateUserAccount(selected.uid, {
        accountStatus: 'active',
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        suspendedByName: null,
      })
      await logAdminActivity({
        adminId: admin.uid,
        adminName: admin.name,
        action: 'user.reactivate',
        targetType: 'user',
        targetId: selected.uid,
        detail: `${selected.fullName} (${selected.email})`,
        metadata: previousReason ? { previousReason } : undefined,
      })
      applyStatusLocally(selected.uid, 'active', null)
      setStatsVersion((value) => value + 1)
      toast.success('User reactivated.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const saveName = async () => {
    if (!selected || !admin || editName.trim().length < 2 || saving) return
    setSaving(true)
    try {
      await updateUserAccount(selected.uid, { fullName: editName.trim() })
      setUsers((items) =>
        items.map((item) =>
          item.uid === selected.uid ? { ...item, fullName: editName.trim() } : item,
        ),
      )
      setSelected({ ...selected, fullName: editName.trim() })
      setDetail((current) =>
        current ? { ...current, user: { ...current.user, fullName: editName.trim() } } : current,
      )
      await logAdminActivity({
        adminId: admin.uid,
        adminName: admin.name,
        action: 'user.update',
        targetType: 'user',
        targetId: selected.uid,
        detail: 'Display name updated',
      })
      toast.success('User record updated.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const activeDetail = detail?.user.accountStatus ?? selected?.accountStatus ?? 'active'
  const reason = detail?.user.suspensionReason ?? selected?.suspensionReason ?? null

  return (
    <div>
      <AdminPageHeader
        eyebrow="User management"
        title="Members"
        subtitle="Search, inspect and moderate member accounts. Access is enforced through Firestore admin rules."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Users} label="Total registered" value={stats.total} accent />
        <AdminStat icon={UserCheck} label="Active accounts" value={stats.active} />
        <AdminStat icon={UserX} label="Suspended" value={stats.suspended} />
        <AdminStat
          icon={ShieldOff}
          label="Missing profiles"
          value={stats.missingProfiles}
          note="No completed profile timestamp"
        />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-charcoal/8 p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name prefix, email or UID"
              aria-label="Search users"
              className="w-full rounded-xl border border-charcoal/12 bg-ivory/50 py-2.5 pl-9 pr-3 text-[13px] text-charcoal placeholder:text-charcoal/30 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            aria-label="Filter by account status"
            className="rounded-xl border border-charcoal/12 bg-white px-3 py-2.5 text-[11px] font-semibold text-charcoal/65 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            aria-label="Filter by registration date"
            className="rounded-xl border border-charcoal/12 bg-white px-3 py-2.5 text-[11px] font-semibold text-charcoal/65 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">Any registration date</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <AdminLoading label="Loading member records…" />
        ) : error ? (
          <div className="p-5">
            <AdminError message={error} />
          </div>
        ) : paged.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title={querySearch || status !== 'all' || period !== 'all' ? 'No users match those filters' : 'No registered users yet'}
            description={
              querySearch || status !== 'all' || period !== 'all'
                ? 'Adjust the search or filters to widen the result set.'
                : 'New member accounts will appear here.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-4 py-3">Goal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Record updated</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5">
                  {paged.map((user) => (
                    <tr key={user.uid} className="text-[11px] hover:bg-ivory/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-[9px] font-bold uppercase text-white">
                            {initials(user.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[210px] truncate text-[12px] font-semibold text-charcoal">
                              {user.fullName}
                            </p>
                            <p className="max-w-[220px] truncate text-[10px] text-charcoal/40">
                              {user.email || user.uid}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/55">{labelGoal(user.goal)}</td>
                      <td className="px-4 py-3.5">
                        <AccountStatusBadge status={user.accountStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/45">
                        {formatDate(new Date(user.createdAt))}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/45">
                        {formatDate(new Date(user.updatedAt))}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/45">
                        {user.profileCompletedAt ? 'Complete' : 'Incomplete'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void openUser(user)}
                          className={buttonClasses('outline', 'sm', '!min-h-[34px] !px-3 !text-[9px]')}
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-charcoal/8 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                Showing {first}–{last} of {searchMode ? users.length : total}
                {searchCapped ? ' · search capped at 50' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
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
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        Search uses Firestore prefix matching on display name or email, plus exact UID. Middle-of-word
        matching is not available without a search index. Legacy accounts without an explicit
        active status appear under “All statuses”.
      </p>

      <Modal
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null)
          setDetail(null)
        }}
        title={selected?.fullName ?? 'Member record'}
        description={selected ? `${selected.email || 'No email'} · UID ${selected.uid}` : undefined}
        size="lg"
      >
        {detailLoading ? (
          <AdminLoading label="Loading member history…" />
        ) : selected && detail ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    Account status
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <AccountStatusBadge status={detail.user.accountStatus} />
                    <span className="text-[10px] text-charcoal/40">
                      Registered {formatDate(new Date(detail.user.createdAt))}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (activeDetail === 'suspended') void reactivateAccount()
                    else {
                      setSuspendReason('')
                      setSuspendOpen(true)
                    }
                  }}
                  className={buttonClasses(activeDetail === 'active' ? 'outline' : 'primary', 'sm')}
                >
                  {activeDetail === 'active' ? (
                    <UserX className="h-3.5 w-3.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  {activeDetail === 'active' ? 'Suspend account' : 'Reactivate account'}
                </button>
              </div>
              {activeDetail === 'suspended' && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] leading-relaxed text-red-900">
                  <p className="font-semibold">Suspension reason</p>
                  <p className="mt-1">{reason || 'No reason recorded for this legacy suspension.'}</p>
                  <p className="mt-1 text-red-800/60">
                    {detail.user.suspendedByName ? `By ${detail.user.suspendedByName}` : ''}
                    {detail.user.suspendedAt
                      ? ` · ${formatDate(new Date(detail.user.suspendedAt))}`
                      : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Workouts', detail.workoutCount],
                ['Measurements', detail.measurementCount],
                ['Missions', detail.missions.length],
                ['AI sessions', detail.aiSessions],
                ['Nutrition days', detail.nutritionDays],
                ['Tickets', detail.ticketCount],
                ['Recent workouts', detail.workouts.length],
                ['Profile', detail.user.profileCompletedAt ? 'Complete' : 'Incomplete'],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-charcoal/8 bg-white p-3">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[16px] font-semibold text-charcoal">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-charcoal/10 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Permitted profile edit
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="field-input !py-2.5 !text-[13px]"
                  aria-label="Member display name"
                />
                <button
                  type="button"
                  disabled={
                    saving ||
                    editName.trim().length < 2 ||
                    editName.trim() === detail.user.fullName
                  }
                  onClick={() => void saveName()}
                  className={buttonClasses('dark', 'sm')}
                >
                  Save name
                </button>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/35">
                Account deletion requires the Firebase Admin SDK to remove the Auth identity as well
                as Firestore data. It is intentionally not exposed in the browser.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  Recent workouts
                </p>
                {detail.workouts.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.workouts.slice(0, 5).map((workout) => (
                      <li key={workout.id} className="rounded-lg border border-charcoal/8 p-2.5">
                        <p className="text-[11px] font-semibold text-charcoal">{workout.title}</p>
                        <p className="text-[9px] text-charcoal/40">
                          {formatDate(new Date(workout.completedAt))} ·{' '}
                          {Math.round(workout.durationSeconds / 60)} min ·{' '}
                          {workout.exercisesCompleted}/{workout.totalExercises}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[10px] text-charcoal/35">No workout records.</p>
                )}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  Mission participation
                </p>
                {detail.missions.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.missions.map((mission) => (
                      <li
                        key={mission.missionId}
                        className="flex items-center justify-between rounded-lg border border-charcoal/8 px-2.5 py-2"
                      >
                        <span className="text-[10px] font-medium text-charcoal/65">
                          {mission.missionId}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/40">
                          {mission.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[10px] text-charcoal/35">No mission records.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Support history
              </p>
              {detail.recentTickets.length ? (
                <ul className="mt-2 space-y-2">
                  {detail.recentTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <Link
                        to={`/admin/help-desk/${ticket.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-charcoal/8 px-3 py-2 hover:border-orange-500/25"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-charcoal">
                            {ticket.subject}
                          </p>
                          <p className="text-[9px] text-charcoal/40">
                            {ticket.ticketId} · {formatDate(new Date(ticket.lastMessageAt))}
                          </p>
                        </div>
                        <SupportStatusBadge status={ticket.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[10px] text-charcoal/35">No support tickets.</p>
              )}
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Progress measurements
              </p>
              {detail.measurements.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.measurements.slice(0, 8).map((measurement) => (
                    <span
                      key={measurement.id}
                      className="rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[9px] text-charcoal/55"
                    >
                      {formatDate(new Date(measurement.measuredAt))} ·{' '}
                      {measurement.weightKg ?? '—'} kg
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-charcoal/35">No progress records.</p>
              )}
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                Recent nutrition days
              </p>
              {detail.recentNutrition.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {detail.recentNutrition.map((day) => (
                    <div key={day.id} className="rounded-lg border border-charcoal/8 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-charcoal">{day.date}</span>
                        <span className="text-[8px] uppercase tracking-[0.1em] text-charcoal/30">
                          {day.mealCount} meals
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-charcoal/40">
                        {day.calories} kcal · P {day.protein}g · C {day.carbs}g · F {day.fat}g
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-charcoal/35">No nutrition records.</p>
              )}
            </div>
          </div>
        ) : (
          <AdminError message="Member history could not be loaded." />
        )}
      </Modal>

      <Modal
        open={suspendOpen}
        onClose={() => {
          if (!saving) setSuspendOpen(false)
        }}
        title="Suspend account"
        description={
          selected
            ? `This will immediately block ${selected.fullName} from member data in Firestore.`
            : undefined
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setSuspendOpen(false)}
              className={buttonClasses('outline', 'sm')}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || suspendReason.trim().length < 10}
              onClick={() => void suspendAccount()}
              className={buttonClasses('primary', 'sm')}
            >
              {saving ? 'Suspending…' : 'Suspend account'}
            </button>
          </div>
        }
      >
        <label className="block">
          <span className="field-label">Reason for suspension *</span>
          <textarea
            value={suspendReason}
            onChange={(event) => setSuspendReason(event.target.value)}
            maxLength={500}
            rows={4}
            className="field-textarea !text-[13px]"
            placeholder="Explain why access is being suspended. The member will see this reason."
          />
          <span className="mt-1 block text-right text-[9px] text-charcoal/30">
            {suspendReason.length}/500
          </span>
        </label>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] leading-relaxed text-amber-800">
          The reason, timestamp and your administrator name are written to the member record and the
          audit log. The restriction is enforced by Firestore security rules, not only by this UI.
        </p>
      </Modal>
    </div>
  )
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'AT'
  )
}

function labelGoal(goal: string | null) {
  if (!goal) return 'Not set'
  return goal
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
