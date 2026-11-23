import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { SectionHeading } from '../../../components/ui/SectionHeading'
import { GALLERY } from '../../../data/landing'

const ORBIT_TURNS = 0.68

function useViewportWidth() {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth,
  )

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}

interface CycloneCardProps {
  image: (typeof GALLERY)[number]
  index: number
  progress: MotionValue<number>
  radiusX: number
  radiusZ: number
  tilt: number
  laneY: number
}

function CycloneCard({
  image,
  index,
  progress,
  radiusX,
  radiusZ,
  tilt,
  laneY,
}: CycloneCardProps) {
  const base = (index / GALLERY.length) * Math.PI * 2 + Math.PI
  const phase = index * 1.28

  const angle = useTransform(progress, (value) => base + value * Math.PI * 2 * ORBIT_TURNS)
  const x = useTransform(angle, (value) => Math.sin(value) * radiusX)
  const z = useTransform(angle, (value) => Math.cos(value) * radiusZ)
  const y = useTransform(
    angle,
    (value) => laneY + Math.sin(value * 1.08 + phase) * 7,
  )
  const rotateY = useTransform(angle, (value) => Math.sin(value + phase * 0.35) * 30)
  const rotateX = useTransform(angle, (value) => tilt + Math.cos(value * 1.2 + phase) * 3.5)
  const rotateZ = useTransform(angle, (value) => Math.sin(value * 0.92 + phase) * 3)
  const scale = useTransform(z, [-radiusZ, radiusZ], [0.66, 1.1])
  const opacity = useTransform(z, [-radiusZ, radiusZ], [0.4, 1])
  const zIndex = useTransform(z, (value) => Math.round(value) + 400)

  return (
    <motion.figure
      className="group absolute inset-0 m-auto aspect-[4/5] w-[8.6rem] max-[379px]:w-[8rem] max-[339px]:w-[7.4rem] sm:w-[11rem] md:w-[13.5rem] lg:w-[15rem] xl:w-[16rem] overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.85)] will-change-transform"
      style={{
        x,
        y,
        z,
        rotateY,
        rotateX,
        rotateZ,
        scale,
        opacity,
        zIndex,
        transformStyle: 'preserve-3d',
      }}
    >
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-4">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-[9px]">
            0{index + 1}
          </p>
          <p className="mt-1 font-display text-sm uppercase leading-none text-white sm:text-lg">
            {image.label}
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 translate-y-1 items-center justify-center rounded-full border border-white/25 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </figcaption>
    </motion.figure>
  )
}

export function GallerySection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const width = useViewportWidth()
  const isTiny = width < 340
  const isNarrow = width >= 340 && width < 380
  const isPhone = width < 640
  const isSmall = width >= 640 && width < 768
  const isTablet = width >= 768 && width < 1024
  const isLaptop = width >= 1024 && width < 1280
  const radiusX = isTiny ? 62 : isNarrow ? 72 : isPhone ? 96 : isSmall ? 140 : isTablet ? 225 : isLaptop ? 290 : 370
  const radiusZ = isTiny ? 140 : isNarrow ? 150 : isPhone ? 170 : isSmall ? 150 : isTablet ? 190 : isLaptop ? 220 : 286
  const tilt = isPhone ? 26 : isSmall ? 26 : 24
  const laneStep = isTiny ? 5 : isNarrow ? 6 : isPhone ? 10 : 14
  const yaw = isPhone ? 0 : 10
  const perspective = isPhone ? 900 : isSmall ? 1050 : isTablet ? 1200 : isLaptop ? 1350 : 1500

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 28,
    mass: 0.35,
  })
  const staticProgress = useMotionValue(0.16)
  const progress = reduceMotion ? staticProgress : smoothProgress

  return (
    <section className="relative overflow-x-clip bg-charcoal py-16 text-white sm:py-20 lg:py-28">
      <div className="container-forge">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Inside the app"
            theme="dark"
            drift={3.2}
            title={
              <>
                Wall of
                <br />
                <span className="text-white/35">fame.</span>
              </>
            }
          />
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-white/50">
              Actual screens from the Forge workspace. This is the product you will use — not a stock-photo version of it.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
              Real product screens · demo profile
            </p>
          </div>
        </div>

        <div
          ref={trackRef}
          data-orbit-track
          className={reduceMotion ? 'relative mt-4' : 'relative mt-4 h-[180vh] min-h-[1000px]'}
        >
          <div
            className={
              reduceMotion
                ? 'relative flex h-[clamp(28rem,78vh,44rem)] items-center justify-center overflow-hidden'
                : 'sticky top-0 flex h-[100svh] min-h-[560px] items-center justify-center overflow-hidden'
            }
          >
            <div
              className="relative h-full w-full"
              style={{ perspective }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${-tilt}deg) rotateY(${yaw}deg)`,
                  transformOrigin: '50% 50%',
                }}
              >
                {GALLERY.map((image, index) => (
                  <CycloneCard
                    key={image.src}
                    image={image}
                    index={index}
                    progress={progress}
                    radiusX={radiusX}
                    radiusZ={radiusZ}
                    tilt={tilt}
                    laneY={(index - (GALLERY.length - 1) / 2) * laneStep}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
