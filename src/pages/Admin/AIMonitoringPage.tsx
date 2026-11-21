import { useMemo } from 'react'
import { BrainCircuit, CheckCircle2, Cpu, Database, FileCheck2, Gauge, Layers3 } from 'lucide-react'
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
} from '../../components/admin/ui'
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { useModelMetadata } from '../../features/admin/useModelMetadata'
import { formatDate } from '../../lib/utils'

const COLORS = ['#10B981', '#F97316', '#78716C']

export default function AIMonitoringPage() {
  const { data, loading, error } = useAdminSnapshot()
  const { metadata, available, status } = useModelMetadata()

  const sessionStats = useMemo(() => {
    if (!data) return null
    const byExercise = new Map<string, { exercise: string; sessions: number; reps: number }>()
    data.aiSessions.forEach((session) => {
      const item = byExercise.get(session.exerciseLabel) ?? { exercise: session.exerciseLabel, sessions: 0, reps: 0 }
      item.sessions += 1
      item.reps += session.reps
      byExercise.set(session.exerciseLabel, item)
    })
    const verdicts = [
      { name: 'Good form', value: data.aiSessions.filter((session) => session.verdict === 'good').length },
      { name: 'Needs work', value: data.aiSessions.filter((session) => session.verdict === 'needs-work').length },
      { name: 'Insufficient data', value: data.aiSessions.filter((session) => session.verdict === 'insufficient-data').length },
    ]
    const withScores = data.aiSessions.filter((session) => session.averageFormScore !== null)
    return {
      total: data.aiSessions.length,
      uniqueMembers: new Set(data.aiSessions.map((session) => session.userId)).size,
      averageForm: withScores.length
        ? Math.round((withScores.reduce((sum, session) => sum + (session.averageFormScore ?? 0), 0) / withScores.length) * 1000) / 1000
        : null,
      byExercise: [...byExercise.values()].sort((a, b) => b.sessions - a.sessions),
      verdicts,
    }
  }, [data])

  if (loading || status === 'loading') return <AdminLoading label="Loading AI monitoring data…" />
  if (error) return <AdminError message={error} />
  if (!data || !sessionStats) return <AdminEmptyState title="No AI data available" description="AI monitoring will populate after members save AI Coach sessions." />

  const modelsReady = available ? Object.values(available).filter(Boolean).length : 0

  return (
    <div>
      <AdminPageHeader
        eyebrow="AI management"
        title="Model monitoring"
        subtitle="Operational visibility for the bundled client-side ONNX form classifiers. Model artifacts are read-only."
      />

      {status === 'error' && <AdminError message="The model metadata or ONNX classifier files could not be loaded from /models." />}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat icon={FileCheck2} label="Model files" value={`${modelsReady}/3`} note={metadata ? `Version ${metadata.version}` : 'Metadata unavailable'} accent />
        <AdminStat icon={BrainCircuit} label="Saved AI sessions" value={sessionStats.total} note="not raw inference requests" />
        <AdminStat icon={Layers3} label="Members using AI" value={sessionStats.uniqueMembers} note="distinct member records" />
        <AdminStat icon={Gauge} label="Average form score" value={sessionStats.averageForm === null ? '—' : sessionStats.averageForm.toFixed(3)} note="mean p(GOOD)" />
        <AdminStat icon={Cpu} label="Inference latency" value="Unavailable" note="not collected by the client" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Runtime" title="Classifier availability">
          <ul className="space-y-3">
            {[
              ['Squat', 'squat', 'form_classifier_squat.onnx'],
              ['Bicep curl', 'bicep_curl', 'form_classifier_bicep_curl.onnx'],
              ['Push-up', 'push_up', 'form_classifier_push_up.onnx'],
            ].map(([label, key, file]) => {
              const ok = available?.[key as keyof typeof available] === true
              return (
                <li key={label} className="flex items-center gap-3 rounded-xl border border-charcoal/8 p-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-charcoal">{label}</p>
                    <p className="truncate text-[9px] text-charcoal/40">{file}</p>
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-[0.1em] ${ok ? 'text-emerald-700' : 'text-red-600'}`}>{ok ? 'Available' : 'Missing'}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 rounded-xl bg-ivory p-3 text-[9px] leading-relaxed text-charcoal/40">
            Latency, failed-inference events and raw request counts are not collected because inference runs entirely in the browser. Only completed session records saved to Firestore are shown.
          </div>
        </AdminPanel>

        <AdminPanel eyebrow="Configuration" title="Metadata & thresholds">
          {metadata ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(metadata.thresholds).map(([exercise, threshold]) => (
                  <div key={exercise} className="rounded-xl border border-charcoal/8 bg-white p-3">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">{exercise.replace('_', ' ')}</p>
                    <p className="mt-1 font-display text-xl text-charcoal">{threshold}</p>
                    <p className="text-[8px] text-charcoal/30">p(GOOD) threshold</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-[9px] text-charcoal/45">
                <p><span className="font-semibold text-charcoal/65">Version:</span> {metadata.version}</p>
                <p><span className="font-semibold text-charcoal/65">Class order:</span> {metadata.class_order.join(' → ')}</p>
                <p><span className="font-semibold text-charcoal/65">Feature vector:</span> {metadata.feature_order.length} features</p>
                <p><span className="font-semibold text-charcoal/65">Runtime:</span> onnxruntime-web · browser WASM</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[9px] leading-relaxed text-amber-800">
                {metadata.notes.find((note) => /accuracy/i.test(note)) ?? 'Model output is a secondary signal, not a clinical judgement.'}
              </div>
            </div>
          ) : <AdminEmptyState title="Metadata unavailable" description="The model metadata file could not be read." />}
        </AdminPanel>

        <AdminPanel eyebrow="Usage" title="Sessions by exercise">
          {sessionStats.byExercise.length ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionStats.byExercise} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis dataKey="exercise" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Bar dataKey="sessions" name="Sessions" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No saved sessions" description="Exercise usage appears after AI Coach sessions are saved." />}
        </AdminPanel>

        <AdminPanel eyebrow="Outcomes" title="Verdict distribution">
          {sessionStats.total ? (
            <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sessionStats.verdicts} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={3}>
                      {sessionStats.verdicts.map((item, index) => <Cell key={item.name} fill={COLORS[index]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {sessionStats.verdicts.map((item, index) => (
                  <li key={item.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-charcoal/55"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[index] }} /> {item.name}</span>
                    <span className="font-semibold text-charcoal">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <AdminEmptyState title="No verdict data" description="Saved session verdicts will appear here." />}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Recent" title="Latest AI session records" bodyClassName="p-0">
        {data.aiSessions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  <th className="px-5 py-3">Member UID</th>
                  <th className="px-4 py-3">Exercise</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reps</th>
                  <th className="px-4 py-3">Average form</th>
                  <th className="px-5 py-3">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {data.aiSessions
                  .slice()
                  .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                  .slice(0, 12)
                  .map((session) => (
                    <tr key={`${session.userId}-${session.id}`} className="text-[10px]">
                      <td className="max-w-[160px] truncate px-5 py-3 text-charcoal/40">{session.userId}</td>
                      <td className="px-4 py-3 font-medium text-charcoal/65">{session.exerciseLabel}</td>
                      <td className="px-4 py-3 text-charcoal/45">{formatDate(new Date(session.completedAt))}</td>
                      <td className="px-4 py-3 text-charcoal/55">{session.reps}</td>
                      <td className="px-4 py-3 text-charcoal/55">{session.averageFormScore === null ? '—' : session.averageFormScore.toFixed(3)}</td>
                      <td className="px-5 py-3 capitalize text-charcoal/55">{session.verdict.replace('-', ' ')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : <AdminEmptyState icon={Database} title="No AI session records" description="Session-level AI data appears after members save an AI Coach analysis." />}
      </AdminPanel>
      <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-charcoal/25">
        Model artifacts in ml/ and public/models/ are read-only and were not modified.
      </p>
    </div>
  )
}
