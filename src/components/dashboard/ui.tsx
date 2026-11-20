import type { ComponentType, ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Clock3, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MissionStatus } from '../../types'
import { Badge } from '../ui/Badge'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  demo = false,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: string
  actions?: ReactNode
  demo?: boolean
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display uppercase text-4xl leading-[0.95] text-charcoal sm:text-5xl">
            {title}
          </h1>
          {demo && <DemoDataBadge />}
        </div>
        {subtitle && (
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-charcoal/50 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function DemoDataBadge({ label = 'Demo data' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-charcoal/12 bg-charcoal/[0.04] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/40">
      <span className="h-1 w-1 rounded-full bg-orange-500" /> {label}
    </span>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  note,
  accent = false,
  source,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  suffix?: string
  trend?: { value: string; direction: 'up' | 'down'; good?: boolean }
  note?: string
  accent?: boolean
  source?: 'live' | 'local' | 'sample' | 'empty'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5',
        accent
          ? 'border-orange-500/20 bg-orange-500/[0.06]'
          : 'border-charcoal/10 bg-white',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/40">{label}</p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            accent ? 'bg-orange-500 text-white' : 'bg-ivory text-charcoal/60',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="min-w-0 break-words font-display text-2xl leading-none text-charcoal sm:text-3xl">
          {value}
        </span>
        {suffix && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/35">
            {suffix}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1">
        {source && <SourceBadge source={source} />}
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-bold',
              trend.good === false
                ? 'text-red-600'
                : trend.good === true
                  ? 'text-emerald-600'
                  : 'text-charcoal/45',
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        )}
        {note && <span className="text-[10px] leading-tight text-charcoal/40">{note}</span>}
      </div>
    </div>
  )
}

const statusStyles: Record<MissionStatus, { label: string; className: string }> = {
  locked: { label: 'Locked', className: 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/35' },
  available: { label: 'Available', className: 'border-orange-500/25 bg-orange-500/10 text-orange-700' },
  in_progress: { label: 'In progress', className: 'border-amber-500/25 bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', className: 'border-emerald-600/20 bg-emerald-50 text-emerald-700' },
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const config = statusStyles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em]',
        config.className,
      )}
    >
      <span
        className={cn(
          'h-1 w-1 rounded-full',
          status === 'completed' && 'bg-emerald-500',
          status === 'in_progress' && 'bg-amber-500',
          status === 'available' && 'bg-orange-500',
          status === 'locked' && 'bg-charcoal/25',
        )}
      />
      {config.label}
    </span>
  )
}

export function MissionCardMeta({
  minutes,
  xp,
  sensitive,
}: {
  minutes: number
  xp: number
  sensitive?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="muted">
        <Clock3 className="h-3 w-3" /> {minutes} min
      </Badge>
      <Badge tone="orange">
        <Sparkles className="h-3 w-3" /> +{xp} XP
      </Badge>
      {sensitive && <Badge tone="red">Sensitive</Badge>}
    </div>
  )
}

export function SourceBadge({
  source,
  label,
}: {
  source: 'live' | 'local' | 'sample' | 'empty'
  label?: string
}) {
  const config = {
    live: {
      label: label ?? 'Live',
      className: 'border-emerald-600/20 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    },
    local: {
      label: label ?? 'Saved on this device',
      className: 'border-charcoal/12 bg-charcoal/[0.04] text-charcoal/45',
      dot: 'bg-charcoal/40',
    },
    sample: {
      label: label ?? 'Sample data',
      className: 'border-amber-500/20 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },
    empty: {
      label: label ?? 'Not enough data',
      className: 'border-charcoal/10 bg-charcoal/[0.03] text-charcoal/35',
      dot: 'bg-charcoal/20',
    },
  }[source]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em]',
        config.className,
      )}
    >
      <span className={cn('h-1 w-1 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

export function SectionCard({
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
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className={cn('text-[14px] font-semibold text-charcoal', eyebrow && 'mt-1.5')}>
                {title}
              </h2>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="inline-flex rounded-full bg-ivory p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'min-h-[34px] rounded-full px-3.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors',
            value === option.value
              ? 'bg-charcoal text-white'
              : 'text-charcoal/45 hover:text-charcoal',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  detail,
  className,
  barClassName,
}: {
  value: number
  label?: string
  detail?: string
  className?: string
  barClassName?: string
}) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className={className}>
      {(label || detail) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
          {label && <span className="font-semibold text-charcoal/60">{label}</span>}
          {detail && <span className="text-charcoal/35">{detail}</span>}
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-charcoal/[0.06]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full bg-orange-500 transition-[width] duration-500', barClassName)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
