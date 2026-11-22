import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Target, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { useAdminSnapshot } from '../../features/admin/useAdminSnapshot'
import { getMissionSettings, setMissionEnabled } from '../../services/cloud/adminRepository'
import { MISSIONS } from '../../data/missions'
import { cn } from '../../lib/utils'

export default function AdminMissionsPage() {
  const { data, loading: snapshotLoading } = useAdminSnapshot()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    getMissionSettings()
      .then(setSettings)
      .catch((reason: unknown) => setError((reason as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (missionId: string, enabled: boolean) => {
    setSaving(missionId)
    try {
      await setMissionEnabled(missionId, enabled)
      setSettings((current) => ({ ...current, [missionId]: enabled }))
      toast.success(enabled ? 'Mission enabled.' : 'Mission hidden from members.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(null)
    }
  }

  const counts = useMemo(() => {
    const map = new Map<string, { started: number; completed: number }>()
    data?.missions.forEach((record) => {
      const current = map.get(record.missionId) ?? { started: 0, completed: 0 }
      current.started += 1
      if (record.status === 'completed') current.completed += 1
      map.set(record.missionId, current)
    })
    return map
  }, [data])

  const totalCompleted = data?.missions.filter((record) => record.status === 'completed').length ?? 0
  const enabledCount = MISSIONS.filter((mission) => settings[mission.id] !== false).length

  if (loading || snapshotLoading) return <AdminLoading label="Loading mission catalog…" />
  if (error) return <AdminError message={error} />

  return (
    <div>
      <AdminPageHeader
        eyebrow="Fitness management"
        title="Missions"
        subtitle="Control which profile missions are visible to members and review completion across the platform."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Target} label="Mission definitions" value={MISSIONS.length} accent />
        <AdminStat icon={Eye} label="Visible to members" value={enabledCount} />
        <AdminStat icon={EyeOff} label="Hidden" value={MISSIONS.length - enabledCount} />
        <AdminStat icon={Trophy} label="Completed records" value={totalCompleted} note={`${data?.missions.length ?? 0} participation records`} />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <ul className="divide-y divide-charcoal/5">
          {MISSIONS.map((mission) => {
            const enabled = settings[mission.id] !== false
            const stats = counts.get(mission.id) ?? { started: 0, completed: 0 }
            return (
              <li key={mission.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold', enabled ? 'bg-orange-500/10 text-orange-700' : 'bg-charcoal/[0.04] text-charcoal/30')}>
                    {mission.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-charcoal">{mission.title}</p>
                    <p className="mt-0.5 max-w-xl text-[10px] leading-relaxed text-charcoal/40">{mission.description}</p>
                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
                      {mission.sensitive ? 'Sensitive · answers protected' : 'Standard'} · {mission.estimatedMinutes} min · {stats.completed}/{stats.started} completed
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={saving === mission.id}
                  onClick={() => void toggle(mission.id, !enabled)}
                  className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2', enabled ? 'bg-orange-500' : 'bg-charcoal/15', saving === mission.id && 'opacity-50')}
                  aria-label={`${enabled ? 'Hide' : 'Show'} ${mission.title}`}
                >
                  <span className={cn('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out', enabled ? 'translate-x-5' : 'translate-x-0')} />
                </button>
              </li>
            )
          })}
        </ul>
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        Visibility writes to `missionSettings` in Firestore. Sensitive mission answers are not displayed in this admin panel and are readable only by user-management administrators under the Firestore rules.
      </p>
    </div>
  )
}
