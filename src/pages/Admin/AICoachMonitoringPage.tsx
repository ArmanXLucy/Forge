import { useMemo } from 'react'
import { Activity, BrainCircuit, Gauge, Layers3, Target } from 'lucide-react'
import {
  Bar,
  BarChart,
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
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { useModelMetadata } from '../../features/admin/useModelMetadata'
import { formatDate } from '../../lib/utils'

export default function AICoachMonitoringPage() {
  const { data, loading, error } = useAdminSnapshot()
  const { metadata } = useModelMetadata()

  const metrics = useMemo(() => {
    if (!data) return null
    const byExercise = new Map<string, { exercise: string; sessions: number; members: Set<string>; reps: number }>()
    data.aiSessions.forEach((session) => {
      const item = byExercise.get(session.exerciseLabel) ?? {
        exercise: session.exerciseLabel,
        sessions: 0,
        members: new Set<string>(),
        reps: 0,
      }
      item.sessions += 1
      item.reps += session.reps
      item.members.add(session.userId)
      byExercise.set(session.exerciseLabel, item)
    })
    const scored = data.aiSessions.filter((session) => session.averageFormScore !== null)
    return {
      sessions: data.aiSessions.length,
      members: new Set(data.aiSessions.map((session) => session.userId)).size,
      reps: data.aiSessions.reduce((sum, session) => sum + session.reps, 0),
      averageForm: scored.length
        ? Math.round((scored.reduce((sum, session) => sum + (session.averageFormScore ?? 0), 0) / scored.length) * 1000) / 1000
        : null,
      byExercise: [...byExercise.values()]
        .map((item) => ({ ...item, memberCount: item.members.size }))
        .sort((a, b) => b.sessions - a.sessions),
      recent: data.aiSessions
        .slice()
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 10),
    }
  }, [data])

  if (loading) return <AdminLoading label="Loading AI Coach activity…" />
  if (error) return <AdminError message={error} />
  if (!data || !metrics) return <AdminEmptyState title="No AI Coach activity" description="Member AI Coach sessions will appear here." />

  return (
    <div>
      <AdminPageHeader
        eyebrow="AI management"
        title="AI Coach monitoring"
        subtitle="Member usage and outcomes from saved AI Coach camera sessions. Raw camera frames are never stored."
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat icon={Activity} label="Saved sessions" value={metrics.sessions} accent />
        <AdminStat icon={Layers3} label="Members" value={metrics.members} />
        <AdminStat icon={Target} label="Total reps counted" value={metrics.reps} />
        <AdminStat icon={Gauge} label="Average form score" value={metrics.averageForm === null ? '—' : metrics.averageForm.toFixed(3)} note={`${metadata?.version ? `model ${metadata.version}` : 'model metadata unavailable'}`} />
        <AdminStat icon={BrainCircuit} label="Supported exercises" value={3} note="squat · bicep curl · push-up" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AdminPanel eyebrow="Usage" title="Sessions by exercise">
          {metrics.byExercise.length ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byExercise} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#17171710" vertical={false} />
                  <XAxis dataKey="exercise" tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #17171718', fontSize: 11 }} />
                  <Bar dataKey="sessions" name="Sessions" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <AdminEmptyState title="No sessions" description="Exercise usage will appear after members save AI Coach sessions." />}
        </AdminPanel>

        <AdminPanel eyebrow="Adoption" title="Exercise breakdown" bodyClassName="p-0">
          {metrics.byExercise.length ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  <th className="px-5 py-3">Exercise</th>
                  <th className="px-4 py-3">Sessions</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-5 py-3">Reps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {metrics.byExercise.map((item) => (
                  <tr key={item.exercise} className="text-[11px]">
                    <td className="px-5 py-3 font-medium text-charcoal/65">{item.exercise}</td>
                    <td className="px-4 py-3 text-charcoal/50">{item.sessions}</td>
                    <td className="px-4 py-3 text-charcoal/50">{item.memberCount}</td>
                    <td className="px-5 py-3 text-charcoal/50">{item.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <AdminEmptyState title="No exercise activity" description="Exercise adoption appears after the first AI session." />}
        </AdminPanel>
      </div>

      <AdminPanel className="mt-4" eyebrow="Recent" title="AI Coach sessions" bodyClassName="p-0">
        {metrics.recent.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  <th className="px-5 py-3">Member UID</th>
                  <th className="px-4 py-3">Exercise</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Reps</th>
                  <th className="px-4 py-3">Form</th>
                  <th className="px-5 py-3">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {metrics.recent.map((session) => (
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
        ) : <AdminEmptyState title="No sessions recorded" description="Member AI Coach sessions will be listed here." />}
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        Metrics reflect only sessions explicitly saved to Firestore. Camera video and pose frames remain on the member's device.
      </p>
    </div>
  )
}
