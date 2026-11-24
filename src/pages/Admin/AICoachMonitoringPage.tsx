import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import {
  MonitoringPill,
  MonitoringRangeControl,
  MonitoringScopeNotice,
} from '../../components/admin/monitoring'
import { buttonClasses } from '../../components/ui/Button'
import { useAdminAISessions } from '../../features/admin/useAdminAISessions'
import { useModelMetadata } from '../../features/admin/useModelMetadata'
import {
  formatMetric,
  formatMs,
  formatPercent,
} from '../../features/ai-monitoring/aggregate'
import { useAIMonitoring, type MonitoringRange } from '../../features/ai-monitoring/useAIMonitoring'
import { formatDate } from '../../lib/utils'

const PAGE_SIZE = 10
const VERDICT_COLORS: Record<string, string> = {
  good: '#059669',
  'needs-work': '#F59E0B',
  'insufficient-data': '#A8A29E',
}

export default function AICoachMonitoringPage() {
  const [range, setRange] = useState<MonitoringRange>(30)
  const [exerciseFilter, setExerciseFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [page, setPage] = useState(0)

  const {
    events,
    summary,
    loading: eventsLoading,
    error: eventsError,
    truncated,
    cappedAt,
    windowStart,
    refresh: refreshEvents,
  } = useAIMonitoring('ai-coach', range)
  const {
    sessions,
    summary: saved,
    truncated: sessionsTruncated,
    cappedAt: sessionsCap,
    loading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
  } = useAdminAISessions(range)
  const { metadata } = useModelMetadata()

  const loading = eventsLoading || sessionsLoading
  const error = eventsError || sessionsError

  const refresh = () => {
    refreshEvents()
    refreshSessions()
  }

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        if (exerciseFilter !== 'all' && session.exercise !== exerciseFilter) return false
        if (sourceFilter !== 'all' && session.source !== sourceFilter) return false
        if (verdictFilter !== 'all' && session.verdict !== verdictFilter) return false
        return true
      }),
    [sessions, exerciseFilter, sourceFilter, verdictFilter],
  )

  const pageCount = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageSessions = filteredSessions.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const exerciseData = useMemo(() => {
    if (summary.coach.exercises.length) {
      return summary.coach.exercises.map((item) => ({ exercise: item.name, starts: item.count }))
    }
    return saved.byExercise.map((item) => ({ exercise: item.label, starts: item.sessions }))
  }, [summary.coach.exercises, saved.byExercise])

  const verdictData = saved.verdicts.map((item) => ({ name: item.name, value: item.count }))
  const modelLoadFailures = events.filter((event) => event.eventType === 'model.load_failed').length
  const inferenceFailures = events.filter((event) => event.eventType === 'inference.failed').length

  const header = (
    <AdminPageHeader
      eyebrow="AI management"
      title="AI Coach monitoring"
      subtitle="Session reliability and saved outcomes for the browser form classifier. Camera frames, video and pose landmarks never leave the member's device."
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
        <AdminLoading label="Loading AI Coach monitoring…" />
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
        noun="AI Coach events"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat
          icon={Activity}
          label="Saved sessions"
          value={saved.sessions}
          note={saved.latestAt ? 'Latest ' + formatDate(new Date(saved.latestAt)) : 'No saved sessions in window'}
          accent
        />
        <AdminStat
          icon={Users}
          label="Members"
          value={saved.members}
          note="Distinct members with a saved AI Coach session"
        />
        <AdminStat icon={Target} label="Total reps counted" value={saved.reps} note="Only reps in saved sessions" />
        <AdminStat
          icon={Gauge}
          label="Average form score"
          value={formatMetric(saved.averageForm)}
          note={
            saved.scoredSessions
              ? saved.scoredSessions + ' of ' + saved.sessions + ' sessions scored'
              : saved.sessions
                ? 'Saved sessions had no scoreable windows'
                : 'No sessions measured'
          }
        />
        <AdminStat
          icon={CheckCircle2}
          label="Completion rate"
          value={formatPercent(summary.coach.completionRate)}
          note={
            summary.coach.terminal
              ? summary.coach.terminal +
                ' terminal attempts · ' +
                summary.coach.interrupted +
                ' interrupted · ' +
                summary.coach.failed +
                ' failed'
              : 'No terminal session attempts measured'
          }
        />
      </div>

      <p className="mt-2 text-[9px] text-charcoal/35">
        Saved outcomes read the latest {sessionsCap.toLocaleString()} AI Coach session documents, newest first
        {sessionsTruncated ? ' — cap reached, older saves in the window are excluded.' : '; all saves in the window were read.'}
      </p>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AdminPanel eyebrow="Lifecycle" title="Session attempts" className="xl:col-span-1">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Started', value: summary.coach.started },
              { label: 'Completed', value: summary.coach.completed },
              { label: 'Interrupted', value: summary.coach.interrupted },
              { label: 'Failed', value: summary.coach.failed },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">{item.label}</p>
                <p className="mt-1 font-display text-xl text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-[10px]">
            <div className="flex items-center justify-between gap-3 border-t border-charcoal/5 pt-2">
              <dt className="text-charcoal/45">Saved after completion</dt>
              <dd className="font-medium text-charcoal/65">{summary.coach.saved}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal/45">Session failure rate</dt>
              <dd className="font-medium text-charcoal/65">{formatPercent(summary.coach.failureRate)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal/45">Model / inference errors</dt>
              <dd className="font-medium text-charcoal/65">
                {modelLoadFailures} load · {inferenceFailures} score
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal/45">Mean inference latency</dt>
              <dd className="font-medium text-charcoal/65">{formatMs(summary.coach.latency.avgMs)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-charcoal/45">p95 session-average latency</dt>
              <dd className="font-medium text-charcoal/65">{formatMs(summary.coach.latency.p95Ms)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
            {summary.coach.latency.inferenceCount
              ? 'Latency aggregates ' +
                summary.coach.latency.inferenceCount +
                ' scored windows across ' +
                summary.coach.latency.sampleCount +
                ' saved sessions.'
              : 'No timed inferences were recorded in this window.'}
          </p>
        </AdminPanel>

        <AdminPanel eyebrow="Usage" title="Session starts by exercise" className="xl:col-span-2">
          {exerciseData.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis
                    dataKey="exercise"
                    tick={{ fontSize: 10, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171818', fontSize: 11 }} />
                  <Bar dataKey="starts" name="Session starts" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AdminEmptyState
              title="No AI Coach activity"
              description="Start a camera or video session while signed in to populate this chart."
            />
          )}
          <p className="mt-2 text-[9px] text-charcoal/35">
            Uses session-start events when available, otherwise saved sessions. Interrupted attempts are included.
          </p>
        </AdminPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Outcomes" title="Saved verdict distribution">
          {verdictData.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[170px_1fr]">
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {verdictData.map((item) => (
                        <Cell key={item.name} fill={VERDICT_COLORS[item.name] ?? '#78716C'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      formatter={(value) => <span className="text-[9px] capitalize text-charcoal/50">{String(value)}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {saved.verdicts.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="inline-flex items-center gap-2 capitalize text-charcoal/55">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: VERDICT_COLORS[item.name] ?? '#78716C' }}
                      />
                      {item.name.replace('-', ' ')}
                    </span>
                    <span className="font-medium text-charcoal/65">
                      {item.count} · {formatPercent(saved.sessions ? item.count / saved.sessions : null, 0)}
                    </span>
                  </div>
                ))}
                <p className="border-t border-charcoal/5 pt-2 text-[9px] leading-relaxed text-charcoal/35">
                  &quot;Insufficient data&quot; means too few scoreable windows — it is not a form judgement.
                </p>
              </div>
            </div>
          ) : (
            <AdminEmptyState title="No saved outcomes" description="Saved session verdicts will appear here." />
          )}
        </AdminPanel>

        <AdminPanel eyebrow="Reliability" title="Failure signals">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Error events</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{summary.errorEvents}</p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Model load</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{modelLoadFailures}</p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Score calls</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{inferenceFailures}</p>
            </div>
          </div>
          {summary.errorsByCategory.length ? (
            <div className="mt-4 space-y-2">
              {summary.errorsByCategory.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="capitalize text-charcoal/50">{item.name.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-charcoal/65">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-charcoal/40">
              {events.length ? 'No AI Coach error events in this window.' : 'No monitoring events yet.'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal/5 pt-3">
            <MonitoringPill tone="info">
              {metadata?.version ? 'classifier v' + metadata.version : 'version unavailable'}
            </MonitoringPill>
            <MonitoringPill>
              thresholds {metadata ? 'sq ' + metadata.thresholds.squat.toFixed(2) + ' · bi ' +
                metadata.thresholds.bicep_curl.toFixed(2) + ' · pu ' + metadata.thresholds.push_up.toFixed(2) : 'unavailable'}
            </MonitoringPill>
            <MonitoringPill tone={summary.coach.averageConfidence === null ? 'neutral' : 'good'}>
              {summary.coach.averageConfidence === null
                ? 'confidence not measured'
                : 'mean confidence ' + summary.coach.averageConfidence.toFixed(3)}
            </MonitoringPill>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        className="mt-4"
        eyebrow="History"
        title="Saved AI Coach sessions"
        action={
          <div className="flex flex-wrap gap-2">
            <select
              value={exerciseFilter}
              onChange={(event) => {
                setExerciseFilter(event.target.value)
                setPage(0)
              }}
              aria-label="Filter by exercise"
              className="rounded-lg border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] text-charcoal/60"
            >
              <option value="all">All exercises</option>
              {saved.byExercise.map((item) => (
                <option key={item.exercise} value={item.exercise}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value)
                setPage(0)
              }}
              aria-label="Filter by source"
              className="rounded-lg border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] text-charcoal/60"
            >
              <option value="all">All sources</option>
              <option value="camera">Camera</option>
              <option value="video">Video</option>
            </select>
            <select
              value={verdictFilter}
              onChange={(event) => {
                setVerdictFilter(event.target.value)
                setPage(0)
              }}
              aria-label="Filter by verdict"
              className="rounded-lg border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] text-charcoal/60"
            >
              <option value="all">All verdicts</option>
              <option value="good">Good</option>
              <option value="needs-work">Needs work</option>
              <option value="insufficient-data">Insufficient data</option>
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        {pageSessions.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    <th className="px-5 py-3">Member UID</th>
                    <th className="px-4 py-3">Exercise</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Reps</th>
                    <th className="px-4 py-3">Form</th>
                    <th className="px-4 py-3">Verdict</th>
                    <th className="px-5 py-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5">
                  {pageSessions.map((session) => (
                    <tr key={session.userId + '-' + session.id} className="text-[10px]">
                      <td className="max-w-[150px] truncate px-5 py-3 text-charcoal/40" title={session.userId}>
                        {session.userId || 'unknown'}
                      </td>
                      <td className="px-4 py-3 font-medium text-charcoal/65">{session.exerciseLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-charcoal/45">
                        {formatDate(new Date(session.completedAt))}
                      </td>
                      <td className="px-4 py-3 text-charcoal/55">{session.reps}</td>
                      <td className="px-4 py-3 text-charcoal/55">
                        {session.verdict === 'insufficient-data' ? '—' : formatMetric(session.averageFormScore)}
                      </td>
                      <td className="px-4 py-3 capitalize text-charcoal/55">{session.verdict.replace('-', ' ')}</td>
                      <td className="px-5 py-3 capitalize text-charcoal/45">{session.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/5 px-5 py-3">
              <p className="text-[9px] text-charcoal/40">
                {filteredSessions.length} matching session{filteredSessions.length === 1 ? '' : 's'} · page{' '}
                {safePage + 1} of {pageCount}
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
            title={sessions.length ? 'No sessions match these filters' : 'No saved AI Coach sessions'}
            description={
              sessions.length
                ? 'Clear one or more filters to see saved outcomes.'
                : 'Saved sessions appear after a member finishes and saves an AI Coach set.'
            }
          />
        )}
      </AdminPanel>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-charcoal/35">
        <span className="inline-flex items-center gap-1.5">
          <BrainCircuit className="h-3 w-3" />
          Form classifier {metadata?.version ? 'v' + metadata.version : 'version unavailable'} · rendered in-browser with
          ONNX Runtime Web
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Failures are client-reported; a lost event reduces counts but never blocks a workout.
        </span>
        <span>No camera footage, frames or landmarks are persisted.</span>
      </div>
    </div>
  )
}
