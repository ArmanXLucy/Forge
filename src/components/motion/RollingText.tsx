import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface RollingTextProps {
  children: ReactNode
  className?: string
}

/**
 * Reference-style rolling label. Add `group/roll` to the trigger element.
 * The duplicate label is absolutely positioned inside the same line box, so
 * the element's width, height and spacing stay identical to the plain label.
 */
export function RollingText({ children, className }: RollingTextProps) {
  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <span className="block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover/roll:-translate-y-full motion-reduce:transition-none">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-full block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover/roll:-translate-y-full motion-reduce:hidden"
      >
        {children}
      </span>
    </span>
  )
}
