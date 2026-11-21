import { useMemo } from 'react'
import { BarChart3, Download, Target, TrendingUp, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { buttonClasses } from '../../components/ui/Button'
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { supportCategoryLabel, SUPPORT_CATEGORIES } from '../../types/support'

const COLORS = ['#F97316', '#171717', '#F59E0B', '#10B981', '#3B82F6', '#78716C']

export default function AdminAnalyticsPage() {
  const { data, loading, error } = useAdminSnapshot()

  const registrationSeries = useMemo(() => {
    if (!data) return []
    const series: Array<{ label: string; key: string; registrations: number }> = []
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - index)
      series.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-GB', { month: 'short' }),
        registrations: 0,
      })
    }
    data.users.forEach((user) => {
      const item = series.find((entry) => entry.key === user.createdAt.slice(0, 7))
      if (item) item.registrations += 1
    })
    return series
  }, [data])

  const missionSeries = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { mission: string; completed: number; inProgress: number }>()
    data.missions.forEach((record) => {
      const entry = map.get(record.missionId) ?? { mission: record.missionId, completed: 0, inProgress: 0 }
      if (record.status === 'completed') entry.completed += 1
      if (record.status === 'in_progress') entry.inProgress += 1
      map.set(record.missionId, entry)
    })
    return [...map.values()]
  }, [data])

  const categorySeries = useMemo(() => {
    if (!data) return []
    return SUPPORT_CATEGORIES.map((category) => ({
      name: category.label,
      value: data.tickets.filter((ticket) => ticket.category === category.value).length,
    })).filter((item) => item.value > 0)
  }, [data])

  const workoutSeries = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { title: string; sessions: number; minutes: number }>()
    data.workouts.forEach((workout) => {
      const entry = map.get(workout.title) ?? { title: workout.title, sessions: 0, minutes: 0 }
      entry.sessions += 1
      entry.minutes += Math.round(workout.durationSeconds / 60)
      map.set(workout.title, entry)
    })
    return [...map.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 8)
  }, [data])

  const exportUsers = () => {
    if (!data) return
    const header = ['uid', 'name', 'email', 'status', 'goal', 'experience', 'registered']
    const rows = data.users.map((user) => [
      user.uid,
      user.fullName,
      user.email,
      user.accountStatus,
      user.goal ?? '',
      user.experience ?? '',
      user.createdAt,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `forge-users-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <AdminLoading label="Building analytics…" />
  if (error) return <AdminError message={error} />
  if (!data) return <AdminEmptyState title="No analytics data" description="Platform data will appear as members use the application." />

  const active = new Set(data.workouts.map((workout) => workout.userId)).size
  const completedMissions = data.missions.filter((record) => record.status === 'completed').length

  return (
    <div>
      <AdminPageHeader
        eyebrow="Platform intelligence"
        title="Analytics & reports"
        subtitle="Aggregate member, training, mission and support data from the live Firestore collections."
        actions={
          <button type="button" onClick={exportUsers} className={buttonClasses('dark', 'sm')}>
            <Download className="h-3.5 w-3.5" /> Export users CSV
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Users} label="Member accounts" value={data.users.length} accent />
        <AdminStat icon={TrendingUp} label="Members with workouts" value={active} />
        <AdminStat icon={BarChart3} label="Workout sessions" value={data.workouts.length} />
        <AdminStat icon={Target} label="Mission completions" value={completedMissions} note={`${data.missions.length} participation records`} />
      </div>

      {data.errors.length > 0 && <div className="mt-4"><AdminError message={`Partial data: ${data.errors.join(' · ')}`} /></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Growth" title="Registrations by month">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationSeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#17171710" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                <Line type="monotone" dataKey="registrations" stroke="#F97316" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Training" title="Most completed workouts">
          {workoutSeries.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutSeries} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="title" width={130} tick={{ fontSize: 9, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Bar dataKey="sessions" name="Sessions" fill="#171717" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No workout data" description="Workout completion analytics appear after sessions are recorded." />}
        </AdminPanel>

        <AdminPanel eyebrow="Profile path" title="Mission completion">
          {missionSeries.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missionSeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis dataKey="mission" tick={{ fontSize: 8, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" name="In progress" stackId="a" fill="#171717" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No mission records" description="Mission participation will appear after members start their profile path." />}
        </AdminPanel>

        <AdminPanel eyebrow="Support" title="Tickets by category">
          {categorySeries.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categorySeries} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>
                    {categorySeries.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No support tickets" description="Ticket category analytics appear after members contact support." />}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Support" title="Category breakdown" bodyClassName="p-0">
        <ul className="divide-y divide-charcoal/5">
          {SUPPORT_CATEGORIES.map((category) => {
            const count = data.tickets.filter((ticket) => ticket.category === category.value).length
            return (
              <li key={category.value} className="flex items-center justify-between px-5 py-3 text-[11px]">
                <span className="text-charcoal/60">{supportCategoryLabel(category.value)}</span>
                <span className="font-semibold text-charcoal">{count}</span>
              </li>
            )
          })}
        </ul>
      </AdminPanel>
      <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-charcoal/25">
        Reports are generated from Firestore at request time. CSV export contains visible member profile fields only.
      </p>
    </div>
  )
}
