import { Link } from 'react-router-dom'
import { ExternalLink, Menu, ShieldCheck } from 'lucide-react'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import { roleLabel } from '../../features/admin/access'
import { Avatar } from '../ui/Avatar'

export function AdminTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { admin } = useAdminAccess()
  return (
    <header className="sticky top-0 z-30 border-b border-charcoal/10 bg-ivory/95 backdrop-blur-md">
      <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open admin navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-charcoal/15 text-charcoal lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-charcoal">Forge Athletic admin</p>
          <p className="truncate text-[9px] uppercase tracking-[0.15em] text-charcoal/35">
            Operations & support workspace
          </p>
        </div>
        <Link
          to="/dashboard"
          className="hidden min-h-[38px] items-center gap-1.5 rounded-full border border-charcoal/12 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:text-charcoal sm:inline-flex"
        >
          User app <ExternalLink className="h-3 w-3" />
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-charcoal/12 bg-white py-1 pl-1 pr-3">
          <Avatar name={admin?.name ?? 'Admin'} className="h-8 w-8 text-[10px]" />
          <div className="hidden text-left sm:block">
            <p className="max-w-[130px] truncate text-[10.5px] font-semibold text-charcoal">
              {admin?.name ?? 'Administrator'}
            </p>
            <p className="flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-orange-600">
              <ShieldCheck className="h-2.5 w-2.5" />
              {admin ? roleLabel(admin.role) : 'Verifying'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
