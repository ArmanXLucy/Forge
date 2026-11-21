import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Search, ShieldCheck, ShieldOff, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { Modal } from '../../components/ui/Modal'
import { Button, buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { roleLabel } from '../../features/admin/access'
import {
  listAdminUsers,
  listAllUsers,
  provisionAdmin,
  setAdminActive,
  updateAdminRole,
} from '../../services/cloud/adminRepository'
import type { AdminRole, AdminUser, AdminUserSummary } from '../../types/admin'
import { ADMIN_ROLES } from '../../types/admin'
import { formatDate } from '../../lib/utils'

export default function RolesPage() {
  const { admin } = useAdminAccess()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null)
  const [role, setRole] = useState<AdminRole>('admin')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [adminList, userList] = await Promise.all([listAdminUsers(), listAllUsers()])
      setAdmins(adminList)
      setUsers(userList)
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const candidates = useMemo(() => {
    const adminIds = new Set(admins.map((item) => item.uid))
    const needle = search.trim().toLowerCase()
    return users
      .filter((user) => !adminIds.has(user.uid))
      .filter(
        (user) =>
          !needle ||
          user.fullName.toLowerCase().includes(needle) ||
          user.email.toLowerCase().includes(needle) ||
          user.uid.toLowerCase().includes(needle),
      )
      .slice(0, 20)
  }, [users, admins, search])

  const changeRole = async (target: AdminUser, nextRole: AdminRole) => {
    if (target.uid === admin?.uid && nextRole !== 'super_admin') {
      toast.error('You cannot remove your own Super Admin role.')
      return
    }
    setSaving(true)
    try {
      await updateAdminRole(target.uid, nextRole)
      setAdmins((items) => items.map((item) => (item.uid === target.uid ? { ...item, role: nextRole } : item)))
      toast.success(`${target.name} is now ${roleLabel(nextRole)}.`)
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (target: AdminUser) => {
    if (target.uid === admin?.uid) {
      toast.error('You cannot deactivate your own administrator account.')
      return
    }
    setSaving(true)
    try {
      await setAdminActive(target.uid, !target.active)
      setAdmins((items) => items.map((item) => (item.uid === target.uid ? { ...item, active: !item.active } : item)))
      toast.success(target.active ? 'Administrator deactivated.' : 'Administrator reactivated.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const provision = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      await provisionAdmin({
        uid: selectedUser.uid,
        email: selectedUser.email,
        name: selectedUser.fullName,
        role,
      })
      await load()
      setProvisionOpen(false)
      setSelectedUser(null)
      setSearch('')
      toast.success('Administrator provisioned.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Access control"
        title="Admins & roles"
        subtitle="Roles are stored in Firestore and verified by security rules. Administrator provisioning is restricted to Super Admins."
        actions={
          <Button size="sm" onClick={() => setProvisionOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" /> Provision admin
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={ShieldCheck} label="Administrators" value={admins.length} accent />
        <AdminStat icon={KeyRound} label="Active roles" value={admins.filter((item) => item.active).length} />
        <AdminStat icon={ShieldOff} label="Inactive roles" value={admins.filter((item) => !item.active).length} />
        <AdminStat icon={Search} label="Member accounts" value={users.length} note="Eligible to be provisioned" />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        {loading ? (
          <AdminLoading label="Loading administrators…" />
        ) : error ? (
          <div className="p-5"><AdminError message={error} /></div>
        ) : admins.length === 0 ? (
          <AdminEmptyState icon={ShieldCheck} title="No administrators found" description="Provision the first administrator from an existing member account." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  <th className="px-5 py-3">Administrator</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Added</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {admins.map((item) => (
                  <tr key={item.uid} className="text-[11px]">
                    <td className="px-5 py-3.5">
                      <p className="text-[12px] font-semibold text-charcoal">{item.name}</p>
                      <p className="text-[10px] text-charcoal/40">{item.email || item.uid}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={item.role}
                        disabled={saving || item.uid === admin?.uid}
                        onChange={(event) => void changeRole(item, event.target.value as AdminRole)}
                        className="rounded-lg border border-charcoal/12 bg-white px-2 py-1.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none disabled:opacity-50"
                        aria-label={`Role for ${item.name}`}
                      >
                        {ADMIN_ROLES.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] ${item.active ? 'text-emerald-700' : 'text-red-600'}`}>
                        <span className={`h-1 w-1 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-charcoal/45">{formatDate(new Date(item.createdAt))}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button type="button" disabled={saving || item.uid === admin?.uid} onClick={() => void toggleActive(item)} className={buttonClasses('outline', 'sm', '!min-h-[32px] !px-2.5 !text-[8px]')}>
                        {item.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <AdminPanel className="mt-4" eyebrow="Role definitions" title="Permission model">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_ROLES.map((item) => (
            <div key={item.value} className="rounded-xl border border-charcoal/8 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/65">{item.label}</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-charcoal/40">{item.description}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <Modal
        open={provisionOpen}
        onClose={() => {
          setProvisionOpen(false)
          setSelectedUser(null)
        }}
        title="Provision administrator"
        description="Choose an existing member account and grant an administrative role."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setProvisionOpen(false)} className={buttonClasses('outline', 'sm')}>Cancel</button>
            <button type="button" disabled={!selectedUser || saving} onClick={() => void provision()} className={buttonClasses('primary', 'sm')}>
              {saving ? 'Provisioning…' : 'Provision admin'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member name or email" className="field-input !py-2.5 !pl-9 !text-[13px]" />
          </label>
          {selectedUser ? (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-3">
              <p className="text-[11px] font-semibold text-charcoal">{selectedUser.fullName}</p>
              <p className="text-[10px] text-charcoal/45">{selectedUser.email} · {selectedUser.uid}</p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-charcoal/8">
              {candidates.length ? candidates.map((user) => (
                <button key={user.uid} type="button" onClick={() => setSelectedUser(user)} className="flex w-full items-center justify-between gap-3 border-b border-charcoal/5 px-3 py-2.5 text-left last:border-b-0 hover:bg-ivory">
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-charcoal">{user.fullName}</span>
                    <span className="block truncate text-[9px] text-charcoal/40">{user.email}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-orange-600">Select</span>
                </button>
              )) : <p className="p-4 text-[10px] text-charcoal/40">No eligible member accounts found.</p>}
            </div>
          )}
          <label className="block">
            <span className="field-label">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="field-input !py-2.5 !text-[13px]">
              {ADMIN_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
      </Modal>
    </div>
  )
}
