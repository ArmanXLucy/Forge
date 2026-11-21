import { useEffect, useState } from 'react'
import { Database, HardDrive, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
} from '../../components/admin/ui'
import { Button } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { useSupabaseStorageHealth } from '../../hooks/useSupabaseStorageHealth'
import {
  getPlatformSettings,
  logAdminActivity,
  savePlatformSettings,
} from '../../services/cloud/adminRepository'
import type { PlatformSettings } from '../../types/admin'
import { cn } from '../../lib/utils'

const DEFAULT_SETTINGS: PlatformSettings = {
  supportEmail: 'hello@forge-athletic.ch',
  supportSlaHours: 24,
  maintenanceMessage: '',
  updatedAt: '',
}

export default function AdminSettingsPage() {
  const { admin } = useAdminAccess()
  const storageHealth = useSupabaseStorageHealth()
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPlatformSettings()
      .then((record) => {
        if (record) setSettings(record)
        setError(null)
      })
      .catch((reason: unknown) => setError((reason as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!admin || saving) return
    setSaving(true)
    try {
      await savePlatformSettings(settings)
      await logAdminActivity({
        adminId: admin.uid,
        adminName: admin.name,
        action: 'platform.settings.update',
        targetType: 'platform',
        targetId: 'main',
        detail: 'Support email / SLA / maintenance message',
      })
      toast.success('Platform settings saved.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading label="Loading platform settings…" />

  return (
    <div>
      <AdminPageHeader
        eyebrow="Platform"
        title="Settings"
        subtitle="Platform-level support defaults and connection status. Secrets remain outside the browser."
      />
      {error && <div className="mb-4"><AdminError message={error} /></div>}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel eyebrow="Support defaults" title="Help Desk settings">
          <form onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="field-label">Support email</span>
              <input type="email" value={settings.supportEmail} onChange={(event) => setSettings((current) => ({ ...current, supportEmail: event.target.value }))} className="field-input !py-2.5 !text-[13px]" />
            </label>
            <label className="block">
              <span className="field-label">Response target (hours)</span>
              <input type="number" min={1} max={168} value={settings.supportSlaHours} onChange={(event) => setSettings((current) => ({ ...current, supportSlaHours: Number(event.target.value) }))} className="field-input !py-2.5 !text-[13px]" />
            </label>
            <label className="block">
              <span className="field-label">Maintenance message</span>
              <textarea value={settings.maintenanceMessage} onChange={(event) => setSettings((current) => ({ ...current, maintenanceMessage: event.target.value }))} rows={4} className="field-textarea !text-[13px]" placeholder="Optional platform notice. This release stores the message but does not inject it into the member app." />
            </label>
            <Button type="submit" size="sm" disabled={saving}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </form>
        </AdminPanel>

        <div className="space-y-4">
          <AdminPanel eyebrow="Connections" title="Service status">
            <ul className="space-y-3">
              <Status icon={Database} label="Firebase Firestore" detail="Admin reads are connected" ok />
              <Status icon={HardDrive} label="Supabase Storage" detail={storageHealth === 'ok' ? 'profile-images bucket reachable' : storageHealth === 'missing-bucket' ? 'Bucket not found' : storageHealth === 'checking' ? 'Checking…' : 'Unreachable'} ok={storageHealth === 'ok'} />
              <Status icon={ShieldCheck} label="Admin role" detail={admin ? `${admin.role} · verified from Firestore` : 'Not verified'} ok={Boolean(admin)} />
            </ul>
          </AdminPanel>
          <AdminPanel eyebrow="Security" title="Credential boundaries">
            <ul className="space-y-2 text-[10px] leading-relaxed text-charcoal/45">
              <li>• Firebase web config is public by design; authorized by Firestore rules.</li>
              <li>• Supabase service-role key lives only in the Edge Function secrets.</li>
              <li>• Admin roles are stored in `adminUsers` and cannot be self-assigned by members.</li>
              <li>• This page never prints anon keys, service keys or auth tokens.</li>
            </ul>
          </AdminPanel>
          <AdminPanel eyebrow="Data" title="Setting scope">
            <p className="text-[10px] leading-relaxed text-charcoal/45">
              Settings are persisted to `platformSettings/main`. Support email and SLA are available to admin
              workflows; the maintenance message is stored but not yet rendered by the member application.
            </p>
          </AdminPanel>
        </div>
      </div>
    </div>
  )
}

function Status({ icon: Icon, label, detail, ok }: { icon: typeof Database; label: string; detail: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ivory text-charcoal/45"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-charcoal">{label}</p>
        <p className="truncate text-[9px] text-charcoal/40">{detail}</p>
      </div>
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-amber-500')} />
    </li>
  )
}
