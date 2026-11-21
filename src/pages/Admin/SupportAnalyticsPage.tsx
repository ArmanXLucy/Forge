import { useMemo } from 'react'
import { CheckCircle2, Clock3, MessageSquare, Timer, TriangleAlert } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  SupportStatusBadge,
} from '../../components/admin/ui'
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { supportCategoryLabel, supportStatusLabel, SUPPORT_CATEGORIES, SUPPORT_STATUSES } from '../../types/support'
import { formatDate } from '../../lib/utils'

const COLORS = ['#F97316', '#3B82F6', '#F59E0B', '#10B981', '#78716C']

export default function SupportAnalyticsPage() {
  const { data, loading, error } = useAdminSnapshot()

  const metrics = useMemo(() => {
    if (!data) return null
    const firstResponses: number[] = []
    data.tickets.forEach((ticket) => {
      const firstAdmin = data.messages.find(
        (message) => message.ticketId === ticket.id && message.senderRole === 'admin',
      )
      if (firstAdmin) {
        firstResponses.push(
          Math.max(0, (new Date(firstAdmin.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000),
        )
      }
    })
    const active = data.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
    const resolved = data.tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status))
    const resolvedWithDates = resolved.filter((ticket) => ticket.resolvedAt)
    const resolutionHours = resolvedWithDates.map(
      (ticket) => Math.max(0, (new Date(ticket.resolvedAt as string).getTime() - new Date(ticket.createdAt).getTime()) / 3600000),
    )
    return {
      total: data.tickets.length,
      active: active.length,
      resolved: resolved.length,
      urgent: active.filter((ticket) => ticket.priority === 'urgent').length,
      averageFirstResponse:
        firstResponses.length > 0
          ? Math.round(firstResponses.reduce((sum, value) => sum + value, 0) / firstResponses.length)
          : null,
      averageResolution:
        resolutionHours.length > 0
          ? Math.round((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length) * 10) / 10
          : null,
      responseSample: firstResponses.length,
      resolutionSample: resolutionHours.length,
    }
  }, [data])

  const statusSeries = useMemo(
    () =>
      data
        ? SUPPORT_STATUSES.map((status) => ({
            name: status.label,
            value: data.tickets.filter((ticket) => ticket.status === status.value).length,
          }))
        : [],
    [data],
  )

  const categorySeries = useMemo(
    () =>
      data
        ? SUPPORT_CATEGORIES.map((category) => ({
            name: category.label,
            tickets: data.tickets.filter((ticket) => ticket.category === category.value).length,
          })).filter((item) => item.tickets > 0)
        : [],
    [data],
  )

  if (loading) return <AdminLoading label="Calculating support metrics…" />
  if (error) return <AdminError message={error} />
  if (!data || !metrics) return <AdminEmptyState title="No support data" description="Support analytics will appear after tickets are created." />

  return (
    <div>
      <AdminPageHeader
        eyebrow="Support intelligence"
        title="Support analytics"
        subtitle="Queue health, response timing and category demand calculated from real ticket and message records."
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat icon={MessageSquare} label="Total tickets" value={metrics.total} accent />
        <AdminStat icon={Clock3} label="Active queue" value={metrics.active} note={`${metrics.urgent} urgent`} />
        <AdminStat icon={CheckCircle2} label="Resolved / closed" value={metrics.resolved} />
        <AdminStat icon={Timer} label="First response" value={metrics.averageFirstResponse === null ? '—' : `${metrics.averageFirstResponse}m`} note={metrics.responseSample ? `${metrics.responseSample} tickets with admin reply` : 'No admin replies yet'} />
        <AdminStat icon={TriangleAlert} label="Avg resolution" value={metrics.averageResolution === null ? '—' : `${metrics.averageResolution}h`} note={metrics.resolutionSample ? `${metrics.resolutionSample} resolved with timestamp` : 'Not enough resolved data'} />
      </div>

      {data.errors.length > 0 && <div className="mt-4"><AdminError message={`Partial data: ${data.errors.join(' · ')}`} /></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Queue" title="Tickets by status">
          {statusSeries.some((item) => item.value > 0) ? (
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusSeries} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78} paddingAngle={3}>
                      {statusSeries.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {statusSeries.map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-2 text-charcoal/55">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /> {item.name}
                    </span>
                    <span className="font-semibold text-charcoal">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <AdminEmptyState title="No tickets yet" description="Status distribution will appear when members open tickets." />}
        </AdminPanel>

        <AdminPanel eyebrow="Demand" title="Tickets by category">
          {categorySeries.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySeries} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 9, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Bar dataKey="tickets" name="Tickets" fill="#F97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No category data" description="Category demand will appear after the first ticket." />}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Recent" title="Tickets needing attention" bodyClassName="p-0">
        {data.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length ? (
          <ul className="divide-y divide-charcoal/5">
            {data.tickets
              .filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
              .sort((a, b) => {
                const weight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
                return weight[a.priority] - weight[b.priority] || b.lastMessageAt.localeCompare(a.lastMessageAt)
              })
              .slice(0, 8)
              .map((ticket) => (
                <li key={ticket.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-charcoal">{ticket.subject}</p>
                    <p className="text-[9px] text-charcoal/40">{ticket.ticketId} · {ticket.userName} · {supportCategoryLabel(ticket.category)} · {formatDate(new Date(ticket.lastMessageAt))}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/40">{supportStatusLabel(ticket.status)}</span>
                    <SupportStatusBadge status={ticket.status} />
                  </div>
                </li>
              ))}
          </ul>
        ) : <AdminEmptyState title="Support queue is clear" description="No active tickets currently need attention." />}
      </AdminPanel>

      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        First response and resolution times are only calculated from tickets with the required timestamps.
        No synthetic SLA values are displayed.
      </p>
    </div>
  )
}
