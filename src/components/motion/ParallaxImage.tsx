import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
  type MotionStyle,
} from 'framer-motion'
import { cn } from '../../lib/utils'

interface ParallaxImageProps extends Omit<HTMLMotionProps<'img'>, 'ref'> {
  /** Vertical travel in pixels across the viewport pass. */
  strength?: number
  /** Base zoom keeps the frame covered while the image drifts. */
  zoom?: number
  hoverZoom?: boolean
  style?: MotionStyle
  /** Horizontal scroll drift in px. */
  drift?: number
  /** Editorial clip-path reveal on first view. */
  reveal?: boolean
  revealDelay?: number
}

/**
 * Image wrapper matching the reference's "Parallax Image" behaviour.
 * The image is transformed inside its existing overflow-hidden frame, so the
 * document layout and section dimensions never change.
 */
export function ParallaxImage({
  className,
  strength = 24,
  zoom = 1.07,
  hoverZoom = false,
  alt = '',
  style,
  drift = 0,
  reveal = true,
  revealDelay = 0,
  ...props
}: ParallaxImageProps) {
  const ref = useRef<HTMLImageElement>(null)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const revealBottom = useTransform(scrollYProgress, [0.01, 0.16], [100, 0])
  const revealClip = useTransform(revealBottom, (value) => `inset(0% 0% ${value}% 0%)`)
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength])
  const x = useTransform(scrollYProgress, [0, 1], [-drift, drift])

  return (
    <motion.img
      ref={ref}
      alt={alt}
      className={cn(className)}
      style={
        reduceMotion
          ? style
          : { ...style, x, y, scale: zoom, clipPath: reveal ? revealClip : undefined }
      }
      whileHover={
        hoverZoom && !reduceMotion
          ? { scale: zoom + 0.035, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
          : undefined
      }
      transition={{ duration: 1.05, delay: revealDelay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  )
}
