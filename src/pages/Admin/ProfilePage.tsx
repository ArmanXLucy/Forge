import { useEffect, useState } from 'react'
import { Check, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
} from '../../components/admin/ui'
import { Button, buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { roleLabel } from '../../features/admin/access'
import { useAuth } from '../../features/auth/AuthContext'
import { updateAdminProfile } from '../../services/cloud/adminRepository'
import { ADMIN_ROLES, ROLE_PERMISSIONS } from '../../types/admin'
import { formatDate } from '../../lib/utils'

export default function AdminProfilePage() {
  const { admin, status } = useAdminAccess()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (admin) setName(admin.name)
  }, [admin])

  if (status === 'loading') return <AdminLoading label="Loading admin profile…" />

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  if (!admin) return null

  const roleDefinition = ADMIN_ROLES.find((item) => item.value === admin.role)
  const permissions = ROLE_PERMISSIONS[admin.role] ?? []

  const save = async () => {
    if (name.trim().length < 2 || saving) return
    setSaving(true)
    try {
      await updateAdminProfile(admin.uid, { name: name.trim() })
      toast.success('Admin profile updated. Refresh to see the new name in the sidebar.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Account"
        title="Admin profile"
        subtitle="Your administrator identity, role and effective permissions."
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel eyebrow="Identity" title="Profile">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-charcoal font-display text-2xl uppercase text-white">
              {initials(admin.name)}
            </span>
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-charcoal">{admin.name}</p>
              <p className="truncate text-[11px] text-charcoal/45">{admin.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-orange-700">
                <ShieldCheck className="h-2.5 w-2.5" /> {roleLabel(admin.role)}
              </span>
            </div>
          </div>
          <label className="mt-5 block">
            <span className="field-label">Display name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="field-input !py-2.5 !text-[13px]" />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving || name.trim() === admin.name || name.trim().length < 2}>
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save profile'}
            </Button>
            <button type="button" onClick={() => void handleSignOut()} className={buttonClasses('outline', 'sm')}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </AdminPanel>

        <div className="space-y-4">
          <AdminPanel eyebrow="Access" title={roleDefinition?.label ?? roleLabel(admin.role)}>
            <p className="text-[11px] leading-relaxed text-charcoal/45">{roleDefinition?.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <span key={permission} className="rounded-full border border-charcoal/10 bg-ivory px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal/55">
                  {permission.replace('_', ' ')}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-[9px] text-charcoal/40">
              <p>Status: <span className="font-semibold text-emerald-700">{admin.active ? 'Active' : 'Inactive'}</span></p>
              <p>Created: {formatDate(new Date(admin.createdAt))}</p>
              <p>Last login: {admin.lastLoginAt ? formatDate(new Date(admin.lastLoginAt)) : 'Not recorded'}</p>
              <p className="break-all">UID: {admin.uid}</p>
            </div>
          </AdminPanel>
          <AdminPanel eyebrow="Security" title="Role enforcement">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600"><UserRound className="h-4 w-4" /></span>
              <p className="text-[10px] leading-relaxed text-charcoal/45">
                This role is read from `adminUsers/{'{uid}'}` in Firestore. Hiding navigation does not grant
                or remove permissions: every read and write is checked by Firestore security rules.
              </p>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AD'
}
