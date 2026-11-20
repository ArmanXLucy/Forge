import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
  theme?: 'light' | 'dark'
  className?: string
  titleClassName?: string
  /** Horizontal scroll drift in vw. Set 0 to disable. */
  drift?: number
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.03 },
  },
}

const item = {
  hidden: { opacity: 0, y: 34 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] as const },
  },
}

/**
 * Scroll reveal for every landing section heading. Uses transform/opacity only,
 * so typography metrics and layout remain exactly the same.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  theme = 'light',
  className,
  titleClassName,
  drift = 1.1,
}: SectionHeadingProps) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ['start end', 'end start'],
  })
  const driftX = useTransform(scrollYProgress, [0, 1], [`-${drift}vw`, `${drift}vw`])

  return (
    <motion.div
      ref={rootRef}
      className={cn(align === 'center' && 'mx-auto max-w-3xl text-center', className)}
      variants={reduceMotion ? undefined : container}
      initial={reduceMotion ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.45 }}
    >
      {eyebrow && (
        <motion.p
          variants={reduceMotion ? undefined : item}
          className={theme === 'dark' ? 'eyebrow-light' : 'eyebrow'}
        >
          <motion.span
            variants={
              reduceMotion
                ? undefined
                : {
                    hidden: { scaleX: 0 },
                    show: {
                      scaleX: 1,
                      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
                    },
                  }
            }
            style={{ originX: 0 }}
            className="inline-block h-px w-7 bg-current"
            aria-hidden="true"
          />
          {eyebrow}
        </motion.p>
      )}
      <motion.h2
        variants={
          reduceMotion
            ? undefined
            : {
                hidden: { opacity: 0, y: 52, clipPath: 'inset(0% 0% 100% 0%)' },
                show: {
                  opacity: 1,
                  y: 0,
                  clipPath: 'inset(0% 0% 0% 0%)',
                  transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] },
                },
              }
        }
        style={reduceMotion ? undefined : { x: driftX }}
        className={cn(
          'display-h2 mt-4',
          theme === 'dark' ? 'text-white' : 'text-charcoal',
          titleClassName,
        )}
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          variants={reduceMotion ? undefined : item}
          className={cn(
            'mt-5 max-w-2xl text-[15px] leading-relaxed sm:text-base',
            align === 'center' && 'mx-auto',
            theme === 'dark' ? 'text-white/60' : 'text-charcoal/60',
          )}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  )
}
