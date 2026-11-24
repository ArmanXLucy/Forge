import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  RefreshCw,
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
import { useAIEvaluation } from '../../features/admin/useAIEvaluation'
import {
  formatMetric,
  formatMs,
  formatPercent,
} from '../../features/ai-monitoring/aggregate'
import { useAIMonitoring, type MonitoringRange } from '../../features/ai-monitoring/useAIMonitoring'
import { formatDate } from '../../lib/utils'

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return Math.round(bytes / 1024) + ' KB'
}

function shortDate(iso: string): string {
  return iso.slice(5, 10)
}

export default function AIMonitoringPage() {
  const [range, setRange] = useState<MonitoringRange>(30)
  const {
    events,
    summary,
    loading,
    error,
    truncated,
    cappedAt,
    windowStart,
    refresh,
  } = useAIMonitoring('workout-recommendation', range)
  const { report, artifacts, status: evaluationStatus, error: evaluationError } = useAIEvaluation()

  const failures = useMemo(
    () => events.filter((event) => event.status === 'error'),
    [events],
  )
  const modelLoadFailures = useMemo(
    () => events.filter((event) => event.eventType === 'model.load_failed').length,
    [events],
  )
  const inferenceFailures = useMemo(
    () => events.filter((event) => event.eventType === 'inference.failed').length,
    [events],
  )
  const saveFailures = useMemo(
    () => events.filter((event) => event.eventType === 'recommendation.save_failed').length,
    [events],
  )
  const categories = summary.recommendation.categories
  const categoryTotal = categories.reduce((sum, item) => sum + item.count, 0)
  const topCategories = categories.slice(0, 6)
  const otherCategories = categories.slice(6).reduce((sum, item) => sum + item.count, 0)

  const header = (
    <AdminPageHeader
      eyebrow="AI management"
      title="Model monitoring"
      subtitle="Live reliability of the workout recommendation model and offline evaluation of every deployed AI artifact. No answer text, pose data or camera media is collected."
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
        <AdminLoading label="Loading recommendation monitoring…" />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        {header}
        <AdminError message={error} />
        <p className="mt-3 text-[10px] text-charcoal/40">
          The AI feature keeps working for members when monitoring is unavailable; events are dropped, never queued
          indefinitely.
        </p>
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
        noun="recommendation events"
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat
          icon={BrainCircuit}
          label="Plans generated"
          value={summary.recommendation.generated}
          note={summary.recommendation.requested + ' generation requests'}
          accent
        />
        <AdminStat
          icon={CheckCircle2}
          label="Generation success"
          value={formatPercent(summary.recommendation.successRate)}
          note={
            summary.recommendation.requested
              ? summary.recommendation.failed + ' explicit failures'
              : 'No requests measured in this window'
          }
        />
        <AdminStat
          icon={Users}
          label="Members using AI"
          value={summary.uniqueMembers}
          note="Distinct signed-in UIDs with monitoring events"
        />
        <AdminStat
          icon={Gauge}
          label="Inference latency"
          value={formatMs(summary.recommendation.latency.avgMs)}
          note={
            summary.recommendation.latency.sampleCount
              ? 'Mean of ' + summary.recommendation.latency.sampleCount + ' measured runs · p95 ' +
                formatMs(summary.recommendation.latency.p95Ms)
              : 'No successful inference timed yet'
          }
        />
        <AdminStat
          icon={AlertTriangle}
          label="Error events"
          value={summary.errorEvents}
          note={failures.length ? 'Latest: ' + formatDate(new Date(failures[0].createdAt)) : 'No errors in this window'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Reliability" title="Where recommendation runs fail">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Inference</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{inferenceFailures}</p>
              <p className="text-[9px] text-charcoal/40">score-call errors</p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Model load</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{modelLoadFailures}</p>
              <p className="text-[9px] text-charcoal/40">ONNX or schema</p>
            </div>
            <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">Persistence</p>
              <p className="mt-1.5 font-display text-xl text-charcoal">{saveFailures}</p>
              <p className="text-[9px] text-charcoal/40">plan save failures</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Failure categories</p>
            {summary.errorsByCategory.length ? (
              <div className="mt-3 space-y-3">
                {summary.errorsByCategory.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-baseline justify-between gap-3 text-[10px]">
                      <span className="font-medium capitalize text-charcoal/65">{item.name.replace(/_/g, ' ')}</span>
                      <span className="text-charcoal/40">{item.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-charcoal/[0.06]">
                      <div
                        className="h-full rounded-full bg-red-500/70"
                        style={{ width: Math.max(4, (item.count / summary.errorEvents) * 100) + '%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-charcoal/40">
                {events.length ? 'No error events were recorded in this window.' : 'No monitoring events yet.'}
              </p>
            )}
          </div>

          <p className="mt-4 border-t border-charcoal/5 pt-3 text-[9px] leading-relaxed text-charcoal/35">
            Events are written after the member-facing operation, never before it. A failed write loses the event;
            counts are therefore a lower bound on real usage.
          </p>
        </AdminPanel>

        <AdminPanel eyebrow="Evaluation" title="Deployed artifact accuracy (offline)">
          {evaluationStatus === 'loading' && <AdminLoading label="Loading evaluation report…" />}
          {evaluationStatus === 'error' && (
            <AdminError message={evaluationError ?? 'Evaluation report could not be loaded.'} />
          )}
          {evaluationStatus === 'ready' && report && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                      <th className="py-2 pr-3">Model</th>
                      <th className="px-3 py-2">Test n</th>
                      <th className="px-3 py-2">Accuracy</th>
                      <th className="px-3 py-2">F1</th>
                      <th className="px-3 py-2">ROC-AUC</th>
                      <th className="py-2 pl-3">Δ baseline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5">
                    {report.models.map((model) => {
                      const f1 = model.metrics.macroF1 ?? model.metrics.f1 ?? null
                      const delta = model.baseline ? model.metrics.accuracy - model.baseline.accuracy : null
                      return (
                        <tr key={model.id} className="text-[10px]">
                          <td className="py-2.5 pr-3 font-medium text-charcoal/70">{model.name}</td>
                          <td className="px-3 py-2.5 text-charcoal/50">{model.metrics.n.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-charcoal/60">{formatMetric(model.metrics.accuracy)}</td>
                          <td className="px-3 py-2.5 text-charcoal/60">{formatMetric(f1)}</td>
                          <td className="px-3 py-2.5 text-charcoal/60">{formatMetric(model.metrics.rocAuc ?? null)}</td>
                          <td className="py-2.5 pl-3">
                            {delta === null ? (
                              <span className="text-charcoal/30">—</span>
                            ) : (
                              <span className={delta < 0 ? 'text-red-600' : 'text-emerald-700'}>
                                {delta > 0 ? '+' : ''}
                                {delta.toFixed(3)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2 text-[9px] leading-relaxed text-charcoal/40">
                <p>
                  Generated <span className="font-medium text-charcoal/60">{formatDate(new Date(report.generatedAt))}</span>{' '}
                  by <code className="text-[9px]">{report.generatedBy}</code> from held-out data. These numbers are static
                  deployment artifacts, not client-writable Firestore records.
                </p>
                <p>
                  Form test set: {report.datasets.form.videos} videos / {report.datasets.form.windows.toLocaleString()}{' '}
                  windows, with {report.datasets.form.testParticipants.length} held-out participants. Recommendation
                  test set is synthetic ({report.datasets.recommendation.testSamples.toLocaleString()} profiles).
                </p>
                <p className="rounded-lg border border-amber-500/20 bg-amber-50/60 px-2.5 py-2 text-amber-800/80">
                  The form models&apos; stored baseline was measured on a pre-refit model. The shipped ONNX was refit on
                  train + validation participants, so its held-out score cannot equal the historical number. The
                  accuracy column shows the deployed artifact&apos;s real score; Δ is included for audit, not as a
                  regression signal.
                </p>
              </div>
            </>
          )}
        </AdminPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Volume" title="Recommendation events by day (UTC)">
          {events.length ? (
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={shortDate}
                    minTickGap={18}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }}
                    labelFormatter={(value) => 'UTC day ' + value}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    name="All events"
                    stroke="#F97316"
                    fill="#F97316"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name="Errors"
                    stroke="#DC2626"
                    fill="#DC2626"
                    fillOpacity={0.12}
                    strokeWidth={1.5}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <AdminEmptyState
              title="No recommendation events"
              description="Events appear after a signed-in member generates a plan with monitoring enabled."
            />
          )}
          <p className="mt-2 text-[9px] text-charcoal/35">Days without events are omitted from the series, not drawn as zero.</p>
        </AdminPanel>

        <AdminPanel eyebrow="Output mix" title="Generated plan categories">
          {topCategories.length ? (
            <div className="space-y-3">
              {topCategories.map((item) => (
                <div key={item.name}>
                  <div className="flex items-baseline justify-between gap-3 text-[10px]">
                    <span className="truncate font-medium text-charcoal/65" title={item.name}>
                      {item.name}
                    </span>
                    <span className="shrink-0 text-charcoal/40">
                      {item.count} · {formatPercent(categoryTotal ? item.count / categoryTotal : null, 0)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-charcoal/[0.06]">
                    <div
                      className="h-full rounded-full bg-orange-500/80"
                      style={{ width: Math.max(4, (item.count / Math.max(1, categoryTotal)) * 100) + '%' }}
                    />
                  </div>
                </div>
              ))}
              {otherCategories > 0 && (
                <p className="text-[9px] text-charcoal/40">
                  + {otherCategories} more across {categories.length - topCategories.length} categories.
                </p>
              )}
            </div>
          ) : (
            <AdminEmptyState
              title="No categories generated"
              description={
                summary.recommendation.requested
                  ? 'Requests were made but none reached a prediction in this window.'
                  : 'No generation requests in this window.'
              }
            />
          )}
          <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
            Predicted class only. Member goals, free text and questionnaire answers are never included in monitoring.
          </p>
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Registry" title="Deployed AI artifacts" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                <th className="px-5 py-3">Model</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Artifact</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-5 py-3">Served</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {evaluationStatus === 'ready' && report ? (
                report.models.map((model) => (
                  <tr key={model.id} className="text-[10px]">
                    <td className="px-5 py-3">
                      <p className="font-medium text-charcoal/70">{model.name}</p>
                      <p className="mt-0.5 text-[9px] text-charcoal/35">{model.id}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-charcoal/50">{model.task.replace(/-/g, ' ')}</td>
                    <td className="px-4 py-3 text-charcoal/55">{model.version}</td>
                    <td className="px-4 py-3">
                      <p className="text-charcoal/55">{model.fileName}</p>
                      <p className="mt-0.5 font-mono text-[8px] text-charcoal/30" title={model.sha256}>
                        {model.sha256.slice(0, 16)}…
                      </p>
                    </td>
                    <td className="px-4 py-3 text-charcoal/50">{formatBytes(model.sizeBytes)}</td>
                    <td className="px-4 py-3 text-charcoal/50">
                      {model.threshold === null ? '—' : model.threshold.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      {artifacts[model.fileName] === true ? (
                        <MonitoringPill tone="good">Available</MonitoringPill>
                      ) : artifacts[model.fileName] === false ? (
                        <MonitoringPill tone="bad">Missing</MonitoringPill>
                      ) : (
                        <MonitoringPill>Checking</MonitoringPill>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[11px] text-charcoal/40">
                    Registry metadata is unavailable. The deployed files are unchanged; check that
                    <code className="mx-1">/models/evaluation_report.json</code> is deployed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel className="mt-4" eyebrow="Diagnostics" title="Recent recommendation failures" bodyClassName="p-0">
        {failures.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  <th className="px-5 py-3">When</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-5 py-3">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {failures.slice(0, 8).map((item) => (
                  <tr key={item.id} className="text-[10px]">
                    <td className="whitespace-nowrap px-5 py-3 text-charcoal/45">{formatDate(new Date(item.createdAt))}</td>
                    <td className="px-4 py-3 font-medium text-charcoal/65">{item.eventType}</td>
                    <td className="px-4 py-3 capitalize text-charcoal/50">{item.errorCategory ?? 'unknown'}</td>
                    <td className="px-4 py-3 font-mono text-[9px] text-charcoal/45">{item.errorCode ?? '—'}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-charcoal/45" title={item.message ?? ''}>
                      {item.message ?? 'No message recorded'}
                    </td>
                    <td className="px-5 py-3 text-charcoal/45">
                      {item.modelId ?? '—'} {item.modelVersion ? '· ' + item.modelVersion : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title={events.length ? 'No failures in this window' : 'No monitoring events yet'}
            description={
              events.length
                ? 'Recommendation requests completed without a recorded failure.'
                : 'Generate a plan while signed in to populate this page.'
            }
          />
        )}
      </AdminPanel>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-charcoal/35">
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          Latest event: {summary.latestAt ? formatDate(new Date(summary.latestAt)) : 'not measured'}
        </span>
        <span>Inference latency is measured on the member device around the ONNX call, not server round-trip time.</span>
        <span>Monitoring failures never block plan generation.</span>
      </div>
    </div>
  )
}
