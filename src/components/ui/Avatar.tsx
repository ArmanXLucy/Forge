import { useEffect, useState } from 'react'
import { cn, initials } from '../../lib/utils'

export function Avatar({
  src,
  name,
  className,
  textClassName,
}: {
  src?: string | null
  name: string
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-charcoal font-bold text-white',
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={cn('text-[10px] leading-none', textClassName)}>{initials(name)}</span>
      )}
    </span>
  )
}
