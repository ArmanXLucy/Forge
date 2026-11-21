import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, HardDrive, ImageOff, Images, Search } from 'lucide-react'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { useSupabaseStorageHealth } from '../../hooks/useSupabaseStorageHealth'
import { listAllUsers } from '../../services/cloud/adminRepository'
import type { AdminUserSummary } from '../../types/admin'
import { cn } from '../../lib/utils'

export default function MediaPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const storageHealth = useSupabaseStorageHealth()

  useEffect(() => {
    listAllUsers()
      .then((items) => {
        setUsers(items)
        setError(null)
      })
      .catch((reason: unknown) => setError((reason as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const media = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return users
      .filter((user) => Boolean(user.avatarUrl || user.photoURL))
      .filter((user) => !needle || user.fullName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle))
  }, [users, search])

  if (loading) return <AdminLoading label="Loading media records…" />
  if (error) return <AdminError message={error} />

  const storedAvatars = users.filter((user) => Boolean(user.avatarUrl)).length
  const externalAvatars = users.filter((user) => !user.avatarUrl && Boolean(user.photoURL)).length

  return (
    <div>
      <AdminPageHeader
        eyebrow="Platform"
        title="Media management"
        subtitle="Profile images are stored in Supabase Storage and referenced from member Firestore documents."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Images} label="Images in use" value={media.length} accent />
        <AdminStat icon={HardDrive} label="Supabase avatars" value={storedAvatars} />
        <AdminStat icon={ExternalLink} label="External avatars" value={externalAvatars} note="Google profile URLs" />
        <AdminStat icon={HardDrive} label="Storage status" value={storageHealth === 'ok' ? 'Connected' : storageHealth === 'missing-bucket' ? 'Bucket missing' : storageHealth === 'checking' ? 'Checking' : 'Unavailable'} />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-charcoal/8 p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member media" aria-label="Search media" className="w-full rounded-xl border border-charcoal/12 bg-ivory/50 py-2.5 pl-9 pr-3 text-[12px] focus:border-orange-500 focus:outline-none" />
          </label>
          <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">{media.length} images</p>
        </div>
        {media.length === 0 ? (
          <AdminEmptyState icon={ImageOff} title="No profile images" description="Member profile photos will appear here once uploaded to Supabase Storage." />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-5">
            {media.map((user) => {
              const image = user.avatarUrl ?? user.photoURL
              return (
                <figure key={user.uid} className="overflow-hidden rounded-xl border border-charcoal/10 bg-white">
                  <div className="aspect-square overflow-hidden bg-ivory">
                    {image ? (
                      <img src={image} alt={`${user.fullName} profile`} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <figcaption className="p-3">
                    <p className="truncate text-[11px] font-semibold text-charcoal">{user.fullName}</p>
                    <p className="truncate text-[9px] text-charcoal/40">{user.email}</p>
                    <span className={cn('mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em]', user.avatarUrl ? 'bg-emerald-50 text-emerald-700' : 'bg-charcoal/[0.04] text-charcoal/45')}>
                      {user.avatarUrl ? 'Supabase' : 'External'}
                    </span>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        )}
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        The browser cannot enumerate the full Storage bucket with the publishable key. This view lists image URLs referenced by member documents; upload and deletion remain protected by the profile-image Edge Function.
      </p>
    </div>
  )
}
