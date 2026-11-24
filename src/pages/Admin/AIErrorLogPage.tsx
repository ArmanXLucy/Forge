import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Filter,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import {
  MonitoringPill,
  MonitoringRangeControl,
  MonitoringScopeNotice,
} from '../../components/admin/monitoring'
import { buttonClasses } from '../../components/ui/Button'
import { buildDailyActivity, formatPercent } from '../../features/ai-monitoring/aggregate'
import type { AIMonitoringEventRecord } from '../../features/ai-monitoring/records'
import { useAIErrors, type ErrorFeatureFilter } from '../../features/ai-monitoring/useAIErrors'
import type { MonitoringRange } from '../../features/ai-monitoring/useAIMonitoring'
import { formatDate } from '../../lib/utils'

const PAGE_SIZE = 20

function categoryTone(category: string | undefined): 'bad' | 'warn' | 'info' | 'neutral' {
  if (category === 'inference' || category === 'model_load' || category === 'schema_load') return 'bad'
  if (category === 'camera' || category === 'pose_detection' || category === 'validation') return 'warn'
  if (category === 'persistence') return 'info'
  return 'neutral'
}

function featureLabel(feature: string): string {
  return feature === 'ai-coach' ? 'AI Coach' : 'Recommendation'
}

function countBy(values: (string | undefined)[]) {
  const counts = new Map<string, number>()
  values.forEach((value) => {
    if (!value) return
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export default function AIErrorLogPage() {
  const [range, setRange] = useState<MonitoringRange>(30)
  const [feature, setFeature] = useState<ErrorFeatureFilter>('all')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(0)
  const { events, truncated, cappedAt, windowStart, loading, error, refresh } = useAIErrors(range, feature)

  const categories = useMemo(
    () => countBy(events.map((event) => event.errorCategory ?? 'unknown')),
    [events],
  )
  const eventTypes = useMemo(() => countBy(events.map((event) => event.eventType)), [events])
  const featureCounts = useMemo(() => countBy(events.map((event) => event.feature)), [events])
  const members = useMemo(() => new Set(events.map((event) => event.userId).filter(Boolean)).size, [events])
  const filtered = useMemo(
    () => events.filter((event) => category === 'all' || (event.errorCategory ?? 'unknown') === category),
    [events, category],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageEvents = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const daily = useMemo(
    () => buildDailyActivity(events, new Date(windowStart)),
    [events, windowStart],
  )

  const header = (
    <AdminPageHeader
      eyebrow="AI management"
      title="AI error log"
      subtitle="Sanitised failure events from the recommendation and AI Coach pipelines. Messages are capped at write time and never include answers, footage, landmarks or email addresses."
      actions={
        <>
          <MonitoringRangeControl value={range} onChange={setRange} disabled={loading} />
          <button type="button" onClick={refresh} className={buttonClasses('outline', 'sm')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </>
      }
    />
  )

  if (loading) {
    return (
      <div>
        {header}
        <AdminLoading label="Loading AI error events…" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {header}
        <AdminError message={error} />
      </div>
    )
  }

  return (
    <div>
      {header}

      <MonitoringScopeNotice
        truncated={truncated}
        cappedAt={cappedAt}
        count={events.length}
        windowStart={windowStart}
        noun="error events"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat
          icon={ShieldAlert}
          label="Error events"
          value={events.length}
          note={feature === 'all' ? 'Both AI features' : featureLabel(feature)}
          accent
        />
        <AdminStat icon={Users} label="Affected members" value={members} note="Distinct signed-in UIDs" />
        <AdminStat
          icon={AlertTriangle}
          label="Failure categories"
          value={categories.length}
          note={categories[0] ? 'Most frequent: ' + categories[0].name.replace(/_/g, ' ') : 'No category recorded'}
        />
        <AdminStat
          icon={CalendarClock}
          label="Latest error"
          value={events[0] ? formatDate(new Date(events[0].createdAt)) : '—'}
          note={events[0] ? featureLabel(events[0].feature) + ' · ' + events[0].eventType : 'No errors in this window'}
        />
        <AdminStat
          icon={Filter}
          label="Feature split"
          value={(featureCounts.find((item) => item.name === 'workout-recommendation')?.count ?? 0) + ' / ' + (featureCounts.find((item) => item.name === 'ai-coach')?.count ?? 0)}
          note="Recommendation / AI Coach"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AdminPanel eyebrow="Breakdown" title="By category" className="xl:col-span-1">
          {categories.length ? (
            <div className="space-y-3">
              {categories.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setCategory(item.name)
                    setPage(0)
                  }}
                  className="block w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-3 text-[10px]">
                    <span className={'font-medium capitalize ' + (category === item.name ? 'text-orange-700' : 'text-charcoal/60')}>
                      {item.name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-charcoal/40">
                      {item.count} · {formatPercent(events.length ? item.count / events.length : null, 0)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.06]">
                    <div
                      className="h-full rounded-full bg-red-500/65"
                      style={{ width: Math.max(4, (item.count / Math.max(1, events.length)) * 100) + '%' }}
                    />
                  </div>
                </button>
              ))}
              {category !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setCategory('all')
                    setPage(0)
                  }}
                  className="text-[9px] font-bold uppercase tracking-[0.12em] text-orange-600"
                >
                  Clear category filter
                </button>
              )}
            </div>
          ) : (
            <AdminEmptyState title="No errors categorised" description="No error events were returned for this window." />
          )}
        </AdminPanel>

        <AdminPanel eyebrow="Volume" title="Errors by day (UTC)" className="xl:col-span-2">
          {events.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => String(value).slice(5)}
                    minTickGap={18}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name="Errors"
                    stroke="#DC2626"
                    fill="#DC2626"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AdminEmptyState
              title="No AI errors in this window"
              description="A clean window does not prove zero real failures: telemetry writes are best-effort and a failed write is dropped."
            />
          )}
          <p className="mt-2 text-[9px] text-charcoal/35">Days without errors are omitted, not plotted as zero.</p>
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Events" title="Error history" bodyClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/5 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={feature}
              onChange={(event) => {
                setFeature(event.target.value as ErrorFeatureFilter)
                setPage(0)
              }}
              aria-label="Filter by AI feature"
              className="rounded-lg border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] text-charcoal/60"
            >
              <option value="all">All AI features</option>
              <option value="workout-recommendation">Workout recommendation</option>
              <option value="ai-coach">AI Coach</option>
            </select>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(0)
              }}
              aria-label="Filter by error category"
              className="rounded-lg border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] text-charcoal/60"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[9px] text-charcoal/40">
            {filtered.length} matching event{filtered.length === 1 ? '' : 's'} · page {safePage + 1} of {pageCount}
          </p>
        </div>

        {pageEvents.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead>
                  <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    <th className="px-5 py-3">When</th>
                    <th className="px-4 py-3">Feature</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-5 py-3">Member</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5">
                  {pageEvents.map((item: AIMonitoringEventRecord) => (
                    <tr key={item.id} className="text-[10px]">
                      <td className="whitespace-nowrap px-5 py-3 text-charcoal/45">{formatDate(new Date(item.createdAt))}</td>
                      <td className="px-4 py-3 text-charcoal/55">{featureLabel(item.feature)}</td>
                      <td className="px-4 py-3 font-medium text-charcoal/65">{item.eventType}</td>
                      <td className="px-4 py-3">
                        <MonitoringPill tone={categoryTone(item.errorCategory)}>
                          {item.errorCategory ?? 'unknown'}
                        </MonitoringPill>
                      </td>
                      <td className="px-4 py-3 font-mono text-[9px] text-charcoal/45">{item.errorCode ?? '—'}</td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-charcoal/45" title={item.message ?? ''}>
                        {item.message ?? 'No message recorded'}
                      </td>
                      <td className="px-4 py-3 text-charcoal/45">
                        {item.modelId ?? '—'}
                        {item.modelVersion ? ' · ' + item.modelVersion : ''}
                        {item.exercise ? ' · ' + item.exercise : ''}
                      </td>
                      <td className="max-w-[130px] truncate px-5 py-3 text-charcoal/35" title={item.userId}>
                        {item.userId || 'unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/5 px-5 py-3">
              <p className="text-[9px] text-charcoal/40">
                Showing rows {(safePage * PAGE_SIZE + 1).toLocaleString()}–
                {(safePage * PAGE_SIZE + pageEvents.length).toLocaleString()} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  className={buttonClasses('outline', 'sm')}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                  className={buttonClasses('outline', 'sm')}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <AdminEmptyState
            title={events.length ? 'No events match these filters' : 'No AI errors recorded'}
            description={
              events.length
                ? 'Clear the feature or category filter to see all errors in this window.'
                : 'A clean window only means no error event reached Firestore; writes are best-effort.'
            }
          />
        )}
      </AdminPanel>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Signal" title="Most frequent event types">
          {eventTypes.length ? (
            <div className="space-y-2">
              {eventTypes.slice(0, 8).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="font-medium text-charcoal/60">{item.name}</span>
                  <span className="text-charcoal/40">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-charcoal/40">No event types recorded.</p>
          )}
        </AdminPanel>
        <AdminPanel eyebrow="Retention" title="How this log behaves">
          <ul className="space-y-2.5 text-[10px] leading-relaxed text-charcoal/50">
            <li>Only error-status events are read. Successful operations never enter this page.</li>
            <li>Documents are immutable to clients; retention cleanup is reserved for a super administrator.</li>
            <li>Messages are sanitised before writing: URLs, emails and token-like strings are stripped and capped.</li>
            <li>Counts are a lower bound — a dropped monitoring write never blocks or degrades the AI feature.</li>
            <li>No stack traces, frame data or free-text answers are stored.</li>
          </ul>
        </AdminPanel>
      </div>
    </div>
  )
}
