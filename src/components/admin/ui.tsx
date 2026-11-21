import type { ComponentType, ReactNode } from 'react'
import { Inbox, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { SupportPriority, SupportStatus } from '../../types/support'
import { supportPriorityLabel, supportStatusLabel } from '../../types/support'
import type { AccountStatus } from '../../types/admin'

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-4xl uppercase leading-[0.95] text-charcoal sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-charcoal/50">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function AdminStat({
  icon: Icon,
  label,
  value,
  note,
  accent,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  note?: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        accent ? 'border-orange-500/20 bg-orange-500/[0.06]' : 'border-charcoal/10 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/40">{label}</p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            accent ? 'bg-orange-500 text-white' : 'bg-ivory text-charcoal/55',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 break-words font-display text-2xl leading-none text-charcoal">{value}</p>
      {note && <p className="mt-2 text-[10px] leading-tight text-charcoal/40">{note}</p>}
    </div>
  )
}

export function AdminPanel({
  title,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  eyebrow?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-charcoal/10 bg-white', className)}>
      {(title || eyebrow || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className={cn('text-[13px] font-semibold text-charcoal', eyebrow && 'mt-1')}>
                {title}
              </h2>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  )
}

const statusTones: Record<SupportStatus, string> = {
  open: 'border-orange-500/25 bg-orange-500/10 text-orange-700',
  in_progress: 'border-blue-500/20 bg-blue-50 text-blue-700',
  waiting_for_user: 'border-amber-500/25 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-600/20 bg-emerald-50 text-emerald-700',
  closed: 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/45',
}

const priorityTones: Record<SupportPriority, string> = {
  low: 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/45',
  medium: 'border-blue-500/20 bg-blue-50 text-blue-700',
  high: 'border-amber-500/25 bg-amber-50 text-amber-700',
  urgent: 'border-red-500/20 bg-red-50 text-red-700',
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em]',
        statusTones[status],
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {supportStatusLabel(status)}
    </span>
  )
}

export function SupportPriorityBadge({ priority }: { priority: SupportPriority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em]',
        priorityTones[priority],
      )}
    >
      {supportPriorityLabel(priority)}
    </span>
  )
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em]',
        status === 'active'
          ? 'border-emerald-600/20 bg-emerald-50 text-emerald-700'
          : 'border-red-500/20 bg-red-50 text-red-700',
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
  )
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string
  description: string
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-charcoal/10 bg-ivory text-charcoal/35">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[13px] font-semibold text-charcoal">{title}</p>
      <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-charcoal/45">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function AdminLoading({ label = 'Loading records…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-16 text-[10px] uppercase tracking-[0.14em] text-charcoal/40">
      <Loader2 className="h-4 w-4 animate-spin text-orange-500" /> {label}
    </div>
  )
}

export function AdminError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] leading-relaxed text-red-700">
      {message}
    </div>
  )
}

export function AdminTableShell({ children }: { children: ReactNode }) {
  return <div className="-mx-5 overflow-x-auto sm:-mx-6">{children}</div>
}

export function AdminField({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-relaxed text-charcoal/40">{hint}</span>}
    </label>
  )
}
