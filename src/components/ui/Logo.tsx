import { cn } from '../../lib/utils'
import { BRAND } from '../../lib/constants'

interface LogoProps {
  variant?: 'light' | 'dark'
  compact?: boolean
  className?: string
}

export function Logo({ variant = 'dark', compact = false, className }: LogoProps) {
  const isLight = variant === 'light'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-charcoal">
        <svg viewBox="0 0 40 40" className="h-6 w-6" aria-hidden="true">
          <path d="M11 7h19v6.5H17v5.7h10.5V25H17v8h-6V7z" fill="#F97316" />
        </svg>
        <span className="absolute bottom-0 left-0 h-[3px] w-full bg-orange-500" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[20px] leading-none tracking-[0.04em]',
            isLight ? 'text-white' : 'text-charcoal',
          )}
        >
          FORGE
        </span>
        {!compact && (
          <span
            className={cn(
              'mt-1 text-[8px] font-bold uppercase tracking-[0.3em]',
              isLight ? 'text-white/50' : 'text-charcoal/45',
            )}
          >
            Athletic Co.
          </span>
        )}
      </span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  )
}
