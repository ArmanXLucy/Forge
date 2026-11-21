import { useEffect, useMemo, useState } from 'react'
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
import { toast } from 'sonner'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
  AccountStatusBadge,
} from '../../components/admin/ui'
import { Modal } from '../../components/ui/Modal'
import { buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import {
  getAdminUserDetail,
  listAllUsers,
  logAdminActivity,
  updateUserAccount,
} from '../../services/cloud/adminRepository'
import type { AdminUserDetail, AdminUserSummary } from '../../types/admin'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

const PAGE_SIZE = 12

export default function UserManagementPage() {
  const { admin } = useAdminAccess()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90'>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUserSummary | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await listAllUsers())
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, status, period])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const now = Date.now()
    return users.filter((user) => {
      if (status !== 'all' && user.accountStatus !== status) return false
      if (period !== 'all' && now - new Date(user.createdAt).getTime() > Number(period) * 86400000) {
        return false
      }
      if (!needle) return true
      return (
        user.fullName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.uid.toLowerCase().includes(needle)
      )
    })
  }, [users, search, status, period])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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

  const setAccountStatus = async (next: 'active' | 'suspended') => {
    if (!selected) return
    setSaving(true)
    try {
      await updateUserAccount(selected.uid, { accountStatus: next })
      if (admin) {
        await logAdminActivity({
          adminId: admin.uid,
          adminName: admin.name,
          action: next === 'suspended' ? 'user.suspend' : 'user.reactivate',
          targetType: 'user',
          targetId: selected.uid,
          detail: `${selected.fullName} (${selected.email})`,
        })
      }
      setUsers((items) =>
        items.map((item) => (item.uid === selected.uid ? { ...item, accountStatus: next } : item)),
      )
      setSelected({ ...selected, accountStatus: next })
      setDetail((current) =>
        current ? { ...current, user: { ...current.user, accountStatus: next } } : current,
      )
      toast.success(next === 'suspended' ? 'User suspended.' : 'User reactivated.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const saveName = async () => {
    if (!selected || editName.trim().length < 2) return
    setSaving(true)
    try {
      await updateUserAccount(selected.uid, { fullName: editName.trim() })
      setUsers((items) =>
        items.map((item) =>
          item.uid === selected.uid ? { ...item, fullName: editName.trim() } : item,
        ),
      )
      setSelected({ ...selected, fullName: editName.trim() })
      toast.success('User record updated.')
      if (admin) {
        await logAdminActivity({
          adminId: admin.uid,
          adminName: admin.name,
          action: 'user.update',
          targetType: 'user',
          targetId: selected.uid,
          detail: 'Display name updated',
        })
      }
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = users.filter((user) => user.accountStatus === 'active').length
  const suspendedCount = users.length - activeCount

  return (
    <div>
      <AdminPageHeader
        eyebrow="User management"
        title="Members"
        subtitle="Search, inspect and moderate member accounts. Access is enforced through Firestore admin rules."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Users} label="Total registered" value={users.length} accent />
        <AdminStat icon={UserCheck} label="Active accounts" value={activeCount} />
        <AdminStat icon={UserX} label="Suspended" value={suspendedCount} />
        <AdminStat icon={ShieldOff} label="Missing profiles" value={users.filter((user) => !user.profileCompletedAt).length} note="Registration incomplete" />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-charcoal/8 p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or UID"
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
          <div className="p-5"><AdminError message={error} /></div>
        ) : paged.length === 0 ? (
          <AdminEmptyState
            icon={Users}
            title={users.length ? 'No users match those filters' : 'No registered users yet'}
            description={users.length ? 'Adjust the search or filters to widen the result set.' : 'New member accounts will appear here.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    <th className="px-5 py-3">Member</th>
                    <th className="px-4 py-3">Goal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
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
                            <p className="max-w-[210px] truncate text-[12px] font-semibold text-charcoal">{user.fullName}</p>
                            <p className="max-w-[220px] truncate text-[10px] text-charcoal/40">{user.email || user.uid}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/55">{labelGoal(user.goal)}</td>
                      <td className="px-4 py-3.5"><AccountStatusBadge status={user.accountStatus} /></td>
                      <td className="px-4 py-3.5 text-charcoal/45">{formatDate(new Date(user.createdAt))}</td>
                      <td className="px-4 py-3.5 text-charcoal/45">{user.profileCompletedAt ? 'Complete' : 'Incomplete'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button type="button" onClick={() => void openUser(user)} className={buttonClasses('outline', 'sm', '!min-h-[34px] !px-3 !text-[9px]')}>
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 text-[10px] font-semibold text-charcoal/50">{page} / {pageCount}</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </AdminPanel>

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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-charcoal/10 bg-ivory/60 p-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Account status</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <AccountStatusBadge status={detail.user.accountStatus} />
                  <span className="text-[10px] text-charcoal/40">Registered {formatDate(new Date(detail.user.createdAt))}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void setAccountStatus(detail.user.accountStatus === 'active' ? 'suspended' : 'active')}
                className={buttonClasses(detail.user.accountStatus === 'active' ? 'outline' : 'primary', 'sm')}
              >
                {detail.user.accountStatus === 'active' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                {detail.user.accountStatus === 'active' ? 'Suspend account' : 'Reactivate account'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Workouts', detail.workouts.length],
                ['Measurements', detail.measurements.length],
                ['Missions', detail.missions.length],
                ['AI sessions', detail.aiSessions],
                ['Nutrition days', detail.nutritionDays],
                ['Tickets', detail.tickets],
                ['Weight entries', detail.measurements.length],
                ['Profile', detail.user.profileCompletedAt ? 'Complete' : 'Incomplete'],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-charcoal/8 bg-white p-3">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">{label}</p>
                  <p className="mt-1.5 text-[16px] font-semibold text-charcoal">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-charcoal/10 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Permitted profile edit</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input value={editName} onChange={(event) => setEditName(event.target.value)} className="field-input !py-2.5 !text-[13px]" aria-label="Member display name" />
                <button type="button" disabled={saving || editName.trim().length < 2 || editName.trim() === detail.user.fullName} onClick={() => void saveName()} className={buttonClasses('dark', 'sm')}>
                  Save name
                </button>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/35">
                Account deletion requires the Firebase Admin SDK to remove the Auth identity as well as Firestore data. It is intentionally not exposed in the browser.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Recent workouts</p>
                {detail.workouts.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.workouts.slice(0, 5).map((workout) => (
                      <li key={workout.id} className="rounded-lg border border-charcoal/8 p-2.5">
                        <p className="text-[11px] font-semibold text-charcoal">{workout.title}</p>
                        <p className="text-[9px] text-charcoal/40">{formatDate(new Date(workout.completedAt))} · {Math.round(workout.durationSeconds / 60)} min · {workout.exercisesCompleted}/{workout.totalExercises}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-[10px] text-charcoal/35">No workout records.</p>}
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Mission participation</p>
                {detail.missions.length ? (
                  <ul className="mt-2 space-y-2">
                    {detail.missions.map((mission) => (
                      <li key={mission.missionId} className="flex items-center justify-between rounded-lg border border-charcoal/8 px-2.5 py-2">
                        <span className="text-[10px] font-medium text-charcoal/65">{mission.missionId}</span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/40">{mission.status.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-[10px] text-charcoal/35">No mission records.</p>}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Progress measurements</p>
              {detail.measurements.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.measurements.slice(0, 8).map((measurement) => (
                    <span key={measurement.id} className="rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[9px] text-charcoal/55">
                      {formatDate(new Date(measurement.measuredAt))} · {measurement.weightKg ?? '—'} kg
                    </span>
                  ))}
                </div>
              ) : <p className="mt-2 text-[10px] text-charcoal/35">No progress records.</p>}
            </div>
          </div>
        ) : (
          <AdminError message="Member history could not be loaded." />
        )}
      </Modal>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AT'
}

function labelGoal(goal: string | null) {
  if (!goal) return 'Not set'
  return goal
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
