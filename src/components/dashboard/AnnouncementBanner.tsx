import { useEffect, useState } from 'react'
import { Info, Megaphone, Wrench } from 'lucide-react'
import { getPublishedAnnouncements } from '../../services/cloud/adminRepository'
import { useAuth } from '../../features/auth/AuthContext'
import type { Announcement } from '../../types/admin'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

export function AnnouncementBanner() {
  const { user } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])

  useEffect(() => {
    if (!user || user.isDemo) return
    let cancelled = false
    getPublishedAnnouncements(3)
      .then((next) => {
        if (!cancelled) setItems(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user])

  if (!items.length) return null

  return (
    <div className="mb-4 space-y-2.5">
      {items.map((item) => {
        const Icon =
          item.tone === 'maintenance' ? Wrench : item.tone === 'update' ? Megaphone : Info
        return (
          <section
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-2xl border px-4 py-3.5 sm:px-5',
              item.tone === 'maintenance'
                ? 'border-amber-500/25 bg-amber-50 text-amber-950'
                : item.tone === 'update'
                  ? 'border-orange-500/25 bg-orange-500/[0.05] text-charcoal'
                  : 'border-charcoal/10 bg-white text-charcoal',
            )}
            aria-label={`Announcement: ${item.title}`}
          >
            <span
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                item.tone === 'maintenance'
                  ? 'bg-amber-500/15 text-amber-700'
                  : 'bg-orange-500/10 text-orange-600',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-semibold">{item.title}</p>
                <span className="text-[8px] font-bold uppercase tracking-[0.1em] opacity-50">
                  {item.tone}
                </span>
                {item.publishedAt && (
                  <span className="text-[8px] uppercase tracking-[0.08em] opacity-35">
                    {formatDate(new Date(item.publishedAt))}
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed opacity-60">
                {item.body}
              </p>
            </div>
          </section>
        )
      })}
    </div>
  )
}
