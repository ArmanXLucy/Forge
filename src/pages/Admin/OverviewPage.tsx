import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  CalendarPlus,
  CheckCircle2,
  CircleHelp,
  Database,
  Dumbbell,
  HardDrive,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminEmptyState, AdminError, AdminLoading, AdminPanel, AdminPageHeader, AdminStat, SupportStatusBadge } from '../../components/admin/ui'
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { useSupabaseStorageHealth } from '../../hooks/useSupabaseStorageHealth'
import { formatDate } from '../../lib/utils'
import { relativeTime } from '../../utils/activity'
import { supportStatusLabel } from '../../types/support'
import { buttonClasses } from '../../components/ui/Button'
import { cn } from '../../lib/utils'

const STATUS_COLORS = ['#F97316', '#3B82F6', '#F59E0B', '#10B981', '#78716C']

function lastDays(count: number) {
  const days: { key: string; label: string }[] = []
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - index)
    days.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    })
  }
  return days
}

export default function AdminOverviewPage() {
  const { data, loading, error, refresh } = useAdminSnapshot()
  const storageHealth = useSupabaseStorageHealth()
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'unavailable'>('checking')
  const [aiVersion, setAiVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/models/model_metadata.json').then((response) => {
        if (!response.ok) throw new Error('metadata')
        return response.json()
      }),
      ...['squat', 'bicep_curl', 'push_up'].map((exercise) =>
        fetch(`/models/form_classifier_${exercise}.onnx`, { method: 'HEAD' }).then((response) => {
          if (!response.ok) throw new Error('model')
          return response
        }),
      ),
    ])
      .then(([metadata]) => {
        if (cancelled) return
        setAiVersion(String(metadata.version ?? 'unknown'))
        setAiStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setAiStatus('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const activeIds = new Set<string>()
    data.workouts.forEach((item) => {
      if (now - new Date(item.completedAt).getTime() <= thirtyDays) activeIds.add(item.userId)
    })
    data.aiSessions.forEach((item) => {
      if (now - new Date(item.completedAt).getTime() <= thirtyDays) activeIds.add(item.userId)
    })
    data.missions.forEach((item) => {
      if (item.completedAt && now - new Date(item.completedAt).getTime() <= thirtyDays) {
        activeIds.add(item.userId)
      }
    })
    const openTickets = data.tickets.filter((ticket) =>
      ['open', 'in_progress', 'waiting_for_user'].includes(ticket.status),
    ).length
    return {
      users: data.users.length,
      activeUsers: activeIds.size,
      newUsers: data.users.filter((user) => now - new Date(user.createdAt).getTime() <= thirtyDays).length,
      workouts: data.workouts.length,
      completedWorkouts: data.workouts.filter((item) => item.exercisesCompleted >= item.totalExercises && item.totalExercises > 0).length,
      missionRecords: data.missions.length,
      completedMissions: data.missions.filter((item) => item.status === 'completed').length,
      tickets: data.tickets.length,
      openTickets,
      aiSessions: data.aiSessions.length,
    }
  }, [data])

  const activityTrend = useMemo(() => {
    const days = lastDays(7)
    return days.map((day) => ({
      day: day.label,
      workouts: data?.workouts.filter((item) => item.completedAt.slice(0, 10) === day.key).length ?? 0,
      ai: data?.aiSessions.filter((item) => item.completedAt.slice(0, 10) === day.key).length ?? 0,
    }))
  }, [data])

  const registrationTrend = useMemo(() => {
    if (!data) return []
    const months: { key: string; label: string; count: number }[] = []
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - index)
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('en-GB', { month: 'short' }),
        count: 0,
      })
    }
    data.users.forEach((user) => {
      const month = user.createdAt.slice(0, 7)
      const entry = months.find((item) => item.key === month)
      if (entry) entry.count += 1
    })
    return months
  }, [data])

  const ticketBreakdown = useMemo(() => {
    if (!data) return []
    return ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'].map((status, index) => ({
      name: supportStatusLabel(status as never),
      value: data.tickets.filter((ticket) => ticket.status === status).length,
      color: STATUS_COLORS[index],
    }))
  }, [data])

  const exercisePopularity = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    data.aiSessions.forEach((session) => {
      counts.set(session.exerciseLabel, (counts.get(session.exerciseLabel) ?? 0) + 1)
    })
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [data])

  const recent = useMemo(() => {
    if (!data) return []
    const items: Array<{ id: string; title: string; detail: string; time: string; type: string }> = []
    data.users.slice(0, 4).forEach((user) =>
      items.push({ id: `u-${user.uid}`, title: user.fullName, detail: user.email, time: user.createdAt, type: 'Registration' }),
    )
    data.workouts
      .slice()
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 4)
      .forEach((workout) =>
        items.push({ id: `w-${workout.id}`, title: workout.title, detail: `${workout.userId.slice(0, 8)} · ${workout.exercisesCompleted}/${workout.totalExercises} exercises`, time: workout.completedAt, type: 'Workout' }),
      )
    data.tickets.slice(0, 4).forEach((ticket) =>
      items.push({ id: `t-${ticket.id}`, title: ticket.subject, detail: `${ticket.ticketId} · ${ticket.userName}`, time: ticket.lastMessageAt, type: 'Support' }),
    )
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8)
  }, [data])

  if (loading) return <AdminLoading label="Loading platform overview…" />
  if (error) return <AdminError message={error} />
  if (!data || !stats) {
    return (
      <AdminEmptyState
        title="No platform data available"
        description="Firestore returned no records. The admin panel will populate as members start using Forge Athletic."
      />
    )
  }

  const supabaseReady = storageHealth === 'ok'

  return (
    <div>
      <AdminPageHeader
        eyebrow="Command center"
        title="Platform overview"
        subtitle="Live operational view of members, training, support and AI activity."
        actions={
          <button type="button" onClick={refresh} className={buttonClasses('outline', 'sm')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh data
          </button>
        }
      />

      {data.errors.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
          Some datasets could not be read: {data.errors.join(' · ')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat icon={Users} label="Registered users" value={stats.users} note={`${stats.newUsers} new in 30 days`} accent />
        <AdminStat icon={Activity} label="Active users · 30d" value={stats.activeUsers} note="Members with training, mission or AI activity" />
        <AdminStat icon={CalendarPlus} label="New registrations" value={stats.newUsers} note="Last 30 days" />
        <AdminStat icon={Dumbbell} label="Workout sessions" value={stats.workouts} note={`${stats.completedWorkouts} fully completed`} />
        <AdminStat icon={Target} label="Mission records" value={stats.missionRecords} note={`${stats.completedMissions} completed`} />
        <AdminStat icon={CircleHelp} label="Support tickets" value={stats.tickets} note={`${stats.openTickets} open / active`} />
        <AdminStat icon={BrainCircuit} label="AI sessions" value={stats.aiSessions} note="Saved inference sessions, not raw requests" />
        <AdminStat icon={Database} label="Nutrition days" value={data.nutritionDays} note="Daily nutrition documents" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Members" title="Registration trend" action={<span className="text-[9px] uppercase tracking-[0.12em] text-charcoal/30">Last 6 months</span>}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationTrend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#17171710" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                <Line type="monotone" dataKey="count" name="Registrations" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, fill: '#F97316' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Activity" title="Training & AI sessions" action={<span className="text-[9px] uppercase tracking-[0.12em] text-charcoal/30">Last 7 days</span>}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityTrend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#17171710" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                <Bar dataKey="workouts" name="Workouts" fill="#171717" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ai" name="AI sessions" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Support" title="Ticket status">
          {ticketBreakdown.some((item) => item.value > 0) ? (
            <div className="grid items-center gap-4 sm:grid-cols-[150px_1fr]">
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ticketBreakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                      {ticketBreakdown.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {ticketBreakdown.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-2 text-charcoal/55">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} /> {item.name}
                    </span>
                    <span className="font-semibold text-charcoal">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <AdminEmptyState icon={CircleHelp} title="No support tickets yet" description="Ticket status breakdown will appear when members open their first request." />
          )}
        </AdminPanel>

        <AdminPanel eyebrow="AI Coach" title="Exercise session mix">
          {exercisePopularity.length ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exercisePopularity} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={84} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Bar dataKey="count" name="Sessions" fill="#F97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AdminEmptyState icon={BrainCircuit} title="No AI sessions recorded" description="AI Coach session records will appear here after members complete a camera session." />
          )}
        </AdminPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel eyebrow="Operations" title="Recent activity" bodyClassName="p-0">
          {recent.length ? (
            <ul className="divide-y divide-charcoal/5">
              {recent.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                  <span className={cn('mt-0.5 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em]', item.type === 'Support' ? 'bg-orange-500/10 text-orange-700' : item.type === 'Workout' ? 'bg-charcoal text-white' : 'bg-charcoal/[0.04] text-charcoal/50')}>
                    {item.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-charcoal">{item.title}</p>
                    <p className="truncate text-[10px] text-charcoal/45">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-charcoal/30">{relativeTime(item.time)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmptyState title="No recent activity" description="Registrations, workouts and support events will appear here." />
          )}
        </AdminPanel>

        <div className="space-y-4">
          <AdminPanel eyebrow="Infrastructure" title="System status">
            <ul className="space-y-3">
              <StatusRow icon={Database} label="Firebase Firestore" detail={data.errors.some((item) => item.startsWith('Users')) ? 'Read error' : 'Connected · live reads'} ok={!data.errors.some((item) => item.startsWith('Users'))} />
              <StatusRow icon={HardDrive} label="Supabase Storage" detail={storageHealth === 'ok' ? 'profile-images reachable' : storageHealth === 'missing-bucket' ? 'Bucket missing' : storageHealth === 'checking' ? 'Checking…' : 'Unreachable'} ok={supabaseReady} />
              <StatusRow icon={BrainCircuit} label="AI model" detail={aiStatus === 'ready' ? `ONNX v${aiVersion} · 3 exercises` : aiStatus === 'checking' ? 'Checking model files…' : 'Model files unavailable'} ok={aiStatus === 'ready'} />
            </ul>
            <p className="mt-4 text-[9px] leading-relaxed text-charcoal/35">
              Status reflects reads from this browser session. Inference latency and failed-inference telemetry are not collected by the current client-only AI implementation.
            </p>
          </AdminPanel>

          <AdminPanel eyebrow="Support" title="Latest tickets" action={<Link to="/admin/help-desk" className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600">View all</Link>}>
            {data.tickets.length ? (
              <ul className="space-y-2.5">
                {data.tickets.slice(0, 4).map((ticket) => (
                  <li key={ticket.id}>
                    <Link to={`/admin/help-desk/${ticket.id}`} className="flex items-start justify-between gap-3 rounded-xl border border-charcoal/8 p-3 transition-colors hover:border-orange-500/20 hover:bg-orange-500/[0.02]">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-charcoal">{ticket.subject}</p>
                        <p className="mt-0.5 text-[9px] text-charcoal/40">{ticket.ticketId} · {ticket.userName}</p>
                      </div>
                      <SupportStatusBadge status={ticket.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <AdminEmptyState icon={CircleHelp} title="Help Desk is clear" description="No member tickets have been created yet." />
            )}
          </AdminPanel>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/admin/users" className={buttonClasses('dark', 'sm')}>
          Manage users <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link to="/admin/help-desk" className={buttonClasses('outline', 'sm')}>
          Open Help Desk <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mt-4 text-[9px] uppercase tracking-[0.12em] text-charcoal/25">
        Overview generated {formatDate(new Date())} · Data source: Firestore
      </p>
    </div>
  )
}

function StatusRow({
  icon: Icon,
  label,
  detail,
  ok,
}: {
  icon: typeof Database
  label: string
  detail: string
  ok: boolean
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ivory text-charcoal/45">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-charcoal">{label}</p>
        <p className="truncate text-[9px] text-charcoal/40">{detail}</p>
      </div>
      <span className={cn('inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em]', ok ? 'text-emerald-700' : 'text-amber-700')}>
        <span className={cn('h-1 w-1 rounded-full', ok ? 'bg-emerald-500' : 'bg-amber-500')} />
        {ok ? 'Operational' : 'Attention'}
      </span>
    </li>
  )
}
