import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Camera,
  CameraOff,
  Check,
  CircleStop,
  Clock3,
  Dumbbell,
  Gauge,
  Info,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Upload,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, ProgressBar, SectionCard, SourceBadge } from '../../components/dashboard/ui'
import { Button, buttonClasses } from '../../components/ui/Button'
import { useActivityStore } from '../../store/useActivityStore'
import { useDataStatus } from '../../hooks/useDataStatus'
import { EXERCISES } from '../../features/ai-coach/types'
import type { AIVerdict, ExerciseKey, Landmark, PoseFrame, ScoreResult } from '../../features/ai-coach/types'
import { loadAIClient, loadPoseLandmarker, type AIClient } from '../../features/ai-coach/lib/modelClient'
import { measuredSummary, primaryAngle } from '../../features/ai-coach/lib/featurePipeline'
import { RepCounter } from '../../features/ai-coach/lib/repCounter'
import type { AISessionScore } from '../../types'
import { cn } from '../../lib/utils'

type Phase = 'idle' | 'loading' | 'live' | 'paused' | 'finished'

interface MediaPipeLandmarker {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => { landmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>> }
  close?: () => void
}

const EDGES: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
]
const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32]

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function formatCameraError(error: unknown) {
  const name = (error as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera permission was denied. Allow camera access in your browser, or load a video instead.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found. Connect a camera or load a recorded video.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use by another application. Close it and try again.'
  }
  return (error as Error)?.message ?? 'The camera could not be started.'
}

function formatSessionError(error: unknown) {
  const message = (error as Error)?.message ?? ''
  if (/webassembly|wasm|onnx|mediapipe|pose|dynamically imported|model metadata|form models/i.test(message)) {
    return 'The AI models could not start in this browser. Check your connection and that WebAssembly is enabled, then retry. Camera video never leaves your device.'
  }
  return formatCameraError(error)
}

function buildCues(exercise: ExerciseKey, score: ScoreResult) {
  const features = score.features
  const cues: string[] = []
  const rom = features.angle_range_clip
  const asymmetry = features.knee_lr_diff_mean
  const torso = features.torso_max
  const rhythm = features.rep_period_cv

  if (exercise === 'squat') {
    if (Number.isFinite(rom) && rom < 38) cues.push('Knee range looks limited in this window.')
    if (Number.isFinite(asymmetry) && asymmetry > 12) cues.push('Left/right knee angle differs by more than 12°.')
    if (Number.isFinite(torso) && torso > 38) cues.push('Torso lean increases through the movement.')
  } else if (exercise === 'bicep_curl') {
    if (Number.isFinite(rom) && rom < 40) cues.push('Elbow range looks limited in this window.')
    if (Number.isFinite(features.elbow_lr_diff_mean) && features.elbow_lr_diff_mean > 14) {
      cues.push('The left and right elbows are moving differently.')
    }
    if (Number.isFinite(torso) && torso > 25) cues.push('Torso inclination changes during the set.')
  } else {
    if (Number.isFinite(rom) && rom < 32) cues.push('Elbow range looks limited in this window.')
    if (Number.isFinite(features.elbow_lr_diff_mean) && features.elbow_lr_diff_mean > 14) {
      cues.push('The left and right elbows are moving differently.')
    }
    if (Number.isFinite(rhythm) && rhythm > 0.35) cues.push('Rep rhythm is variable. Slow the tempo if needed.')
  }

  if (!cues.length) cues.push('Measured movement is consistent in this window.')
  return cues.slice(0, 3)
}

export default function AICoachPage() {
  const dataStatus = useDataStatus()
  const addAISession = useActivityStore((s) => s.addAISession)
  const aiSessions = useActivityStore((s) => s.aiSessions)

  const [exercise, setExercise] = useState<ExerciseKey>('squat')
  const [phase, setPhase] = useState<Phase>('idle')
  const [source, setSource] = useState<'camera' | 'video' | null>(null)
  const [reps, setReps] = useState(0)
  const [framesCount, setFramesCount] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [poseDetected, setPoseDetected] = useState(false)
  const [poseReady, setPoseReady] = useState(false)
  const [detectionRate, setDetectionRate] = useState(0)
  const [pGood, setPGood] = useState<number | null>(null)
  const [verdict, setVerdict] = useState<AIVerdict>('insufficient-data')
  const [scores, setScores] = useState<AISessionScore[]>([])
  const [cues, setCues] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingLabel, setLoadingLabel] = useState('Preparing camera…')
  const [saved, setSaved] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileUrlRef = useRef<string | null>(null)
  const clientRef = useRef<AIClient | null>(null)
  const landmarkerRef = useRef<MediaPipeLandmarker | null>(null)
  const animationRef = useRef(0)
  const framesRef = useRef<PoseFrame[]>([])
  const repCounterRef = useRef(new RepCounter('squat'))
  const scoresRef = useRef<AISessionScore[]>([])
  const exerciseRef = useRef<ExerciseKey>('squat')
  const sourceRef = useRef<'camera' | 'video' | null>(null)
  const pausedRef = useRef(false)
  const startTimeRef = useRef(0)
  const lastDetectRef = useRef(0)
  const lastSampleRef = useRef(0)
  const lastScoreRef = useRef(0)
  const scoringRef = useRef(false)
  const sampledRef = useRef(0)
  const detectedRef = useRef(0)
  const elapsedRef = useRef(0)
  const landmarksRef = useRef<Landmark[] | null>(null)

  useEffect(() => {
    exerciseRef.current = exercise
  }, [exercise])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null
    }
  }, [])

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(animationRef.current)
    animationRef.current = 0
  }, [])

  const drawOverlay = useCallback((landmarks: Landmark[] | null) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const rect = video.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)
    if (!landmarks) return

    const videoWidth = video.videoWidth || 1
    const videoHeight = video.videoHeight || 1
    const scale = Math.min(rect.width / videoWidth, rect.height / videoHeight)
    const width = videoWidth * scale
    const height = videoHeight * scale
    const offsetX = (rect.width - width) / 2
    const offsetY = (rect.height - height) / 2
    const x = (index: number) => offsetX + landmarks[index].x * width
    const y = (index: number) => offsetY + landmarks[index].y * height
    const lineWidth = Math.max(2, width / 380)

    context.strokeStyle = '#F97316'
    context.lineWidth = lineWidth
    context.lineJoin = 'round'
    context.lineCap = 'round'
    EDGES.forEach(([a, b]) => {
      context.beginPath()
      context.moveTo(x(a), y(a))
      context.lineTo(x(b), y(b))
      context.stroke()
    })
    context.fillStyle = '#fff'
    JOINTS.forEach((index) => {
      context.beginPath()
      context.arc(x(index), y(index), Math.max(2.4, width / 330), 0, Math.PI * 2)
      context.fill()
    })
  }, [])

  const stopEverything = useCallback(
    (nextPhase: Phase = 'finished') => {
      pausedRef.current = true
      stopLoop()
      stopStream()
      if (videoRef.current) videoRef.current.pause()
      setPhase(nextPhase)
    },
    [stopLoop, stopStream],
  )

  useEffect(() => {
    return () => {
      stopLoop()
      stopStream()
      // Keep the module-level pose landmarker alive: it is reused when the user
      // returns to this page. Closing it here left a cached, closed landmarker
      // behind and the next camera session could no longer detect a pose.
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    }
  }, [stopLoop, stopStream])

  useEffect(() => {
    if (phase !== 'live' || pausedRef.current) return
    const timer = window.setInterval(() => {
      const next = Math.floor((performance.now() - startTimeRef.current) / 1000)
      elapsedRef.current = next
      setElapsed(next)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  const runScore = useCallback(async () => {
    const video = videoRef.current
    if (!clientRef.current || scoringRef.current || framesRef.current.length < 20 || !video) return
    scoringRef.current = true
    const frames = framesRef.current.slice(-180)
    const currentExercise = exerciseRef.current
    try {
      const result = await clientRef.current.score(currentExercise, frames)
      const measured = measuredSummary(frames, currentExercise)
      const sessionScore: AISessionScore = {
        atSeconds: elapsedRef.current,
        pGood: result.pGood,
        threshold: result.threshold,
        verdict: result.verdict === 'good' ? 'good' : 'needs-work',
        rangeOfMotion: measured.rangeOfMotion,
        tempoVariation: measured.repRhythm,
        torsoLean: measured.torsoLean,
        kneeAsymmetry: measured.kneeAsymmetry,
      }
      scoresRef.current = [...scoresRef.current, sessionScore].slice(-80)
      setScores(scoresRef.current)
      setPGood(result.pGood)
      setVerdict(result.verdict)
      setCues(buildCues(currentExercise, result))
    } catch (scoreError) {
      setError(
        (scoreError as Error)?.message?.includes('ONNX') ||
          (scoreError as Error)?.message?.includes('input')
          ? 'The form model could not score this window. Keep recording and try again.'
          : (scoreError as Error)?.message ?? 'The form model could not score this window.',
      )
    } finally {
      scoringRef.current = false
    }
  }, [])

  const loop = useCallback(
    (now: number) => {
      if (pausedRef.current) return
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      if (!video || !landmarker) return

      if (video.readyState >= 2) {
        if (now - lastDetectRef.current >= 66) {
          lastDetectRef.current = now
          try {
            const result = landmarker.detectForVideo(video, now)
            const raw = result.landmarks?.[0] ?? null
            const landmarks = raw
              ? raw.map((point) => ({
                  x: point.x,
                  y: point.y,
                  z: point.z,
                  visibility: point.visibility ?? 1,
                }))
              : null
            landmarksRef.current = landmarks
            drawOverlay(landmarks)
            const required = EXERCISES[exerciseRef.current].requiredLandmarks
            const visibleRequired = required.filter(
              (index) => (landmarks?.[index]?.visibility ?? 0) >= 0.25,
            ).length
            const ready =
              Boolean(landmarks) && visibleRequired >= Math.ceil(required.length * 0.8)
            setPoseDetected(Boolean(landmarks))
            setPoseReady(ready)

            if (ready && now - lastSampleRef.current >= 100) {
              lastSampleRef.current = now
              const timestamp = (now - startTimeRef.current) / 1000
              const poseFrame: PoseFrame = { t: timestamp, p: landmarks as Landmark[] }
              framesRef.current = [...framesRef.current, poseFrame].slice(-600)
              sampledRef.current += 1
              detectedRef.current += 1
              const angle = primaryAngle([poseFrame], exerciseRef.current)
              const nextReps = repCounterRef.current.update(angle, now)
              setReps(nextReps)
              setFramesCount(framesRef.current.length)
              setDetectionRate(
                sampledRef.current ? Math.round((detectedRef.current / sampledRef.current) * 100) : 0,
              )
              if (now - lastScoreRef.current >= 1800 && framesRef.current.length >= 20) {
                lastScoreRef.current = now
                void runScore()
              }
            } else {
              sampledRef.current += 1
              setDetectionRate(
                sampledRef.current ? Math.round((detectedRef.current / sampledRef.current) * 100) : 0,
              )
            }
          } catch {
            // A single failed detection should not end the session.
          }
        }
      }
      animationRef.current = requestAnimationFrame(loop)
    },
    [drawOverlay, runScore],
  )

  const beginSession = useCallback(
    (nextSource: 'camera' | 'video') => {
      sourceRef.current = nextSource
      setSource(nextSource)
      framesRef.current = []
      scoresRef.current = []
      repCounterRef.current = new RepCounter(exerciseRef.current)
      sampledRef.current = 0
      detectedRef.current = 0
      elapsedRef.current = 0
      startTimeRef.current = performance.now()
      lastDetectRef.current = 0
      lastSampleRef.current = 0
      lastScoreRef.current = 0
      pausedRef.current = false
      setReps(0)
      setFramesCount(0)
      setElapsed(0)
      setDetectionRate(0)
      setPGood(null)
      setVerdict('insufficient-data')
      setScores([])
      setCues([])
      setError(null)
      setSaved(false)
      setPhase('live')
      animationRef.current = requestAnimationFrame(loop)
    },
    [loop],
  )

  const ensureModels = useCallback(async () => {
    if (!clientRef.current) {
      setLoadingLabel('Loading form models…')
      clientRef.current = await loadAIClient()
    }
    if (!landmarkerRef.current) {
      setLoadingLabel('Loading pose detection…')
      landmarkerRef.current = (await loadPoseLandmarker()) as MediaPipeLandmarker
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    setPhase('loading')
    setLoadingLabel('Starting camera…')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not expose a camera API. Load a recorded video instead.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('The camera preview is not ready yet.')
      video.srcObject = stream
      video.loop = false
      await video.play()
      await ensureModels()
      beginSession('camera')
    } catch (cameraError) {
      stopStream()
      setError(formatSessionError(cameraError))
      setPhase('idle')
    }
  }

  const loadVideo = async (file: File) => {
    if (!videoRef.current) return
    setError(null)
    setPhase('loading')
    setLoadingLabel('Loading video and models…')
    try {
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
      fileUrlRef.current = URL.createObjectURL(file)
      const video = videoRef.current
      video.srcObject = null
      video.src = fileUrlRef.current
      video.loop = true
      video.controls = false
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) return resolve()
        video.onloadedmetadata = () => resolve()
      })
      await video.play()
      await ensureModels()
      beginSession('video')
    } catch (videoError) {
      stopStream()
      setError(formatSessionError(videoError))
      setPhase('idle')
    }
  }

  const pauseSession = () => {
    if (phase !== 'live') return
    pausedRef.current = true
    stopLoop()
    videoRef.current?.pause()
    setPhase('paused')
  }

  const resumeSession = () => {
    if (phase !== 'paused' || !videoRef.current) return
    pausedRef.current = false
    void videoRef.current.play()
    setPhase('live')
    animationRef.current = requestAnimationFrame(loop)
  }

  const finishSession = () => {
    stopEverything('finished')
  }

  const resetSession = () => {
    stopEverything('idle')
    landmarksRef.current = null
    drawOverlay(null)
    framesRef.current = []
    scoresRef.current = []
    setReps(0)
    setFramesCount(0)
    setElapsed(0)
    setPGood(null)
    setVerdict('insufficient-data')
    setScores([])
    setCues([])
    setDetectionRate(0)
    setPoseDetected(false)
    setPoseReady(false)
    setError(null)
    setSaved(false)
    setSource(null)
    sourceRef.current = null
    elapsedRef.current = 0
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current)
      fileUrlRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
    setPhase('idle')
  }

  const changeExercise = (next: ExerciseKey) => {
    if (phase === 'live' || phase === 'paused') return
    setExercise(next)
    exerciseRef.current = next
    repCounterRef.current.reset(next)
    setReps(0)
  }

  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score.pGood, 0) / scores.length
    : null
  const bestScore = scores.length ? Math.max(...scores.map((score) => score.pGood)) : null
  const threshold = EXERCISES[exercise].defaultThreshold
  const selected = EXERCISES[exercise]
  const overallVerdict: AIVerdict = scores.length
    ? averageScore !== null && averageScore >= threshold
      ? 'good'
      : 'needs-work'
    : 'insufficient-data'

  const saveSession = () => {
    if (!scores.length) {
      toast.error('No model score was captured. Record a little longer before saving.')
      return
    }
    addAISession({
      exercise,
      exerciseLabel: selected.label,
      completedAt: new Date().toISOString(),
      durationSeconds: elapsed,
      reps,
      scores,
      averageFormScore: averageScore,
      bestFormScore: bestScore,
      verdict: overallVerdict,
      source: source ?? 'camera',
    })
    setSaved(true)
    toast.success(dataStatus.isCloud ? 'AI session saved to your account.' : 'AI session saved on this device.')
  }

  const stageStatus =
    phase === 'live'
      ? !poseDetected
        ? 'Finding pose'
        : !poseReady
          ? 'Adjust framing'
          : 'Pose tracked'
      : phase === 'paused'
        ? 'Paused'
        : phase === 'finished'
          ? 'Session complete'
          : phase === 'loading'
            ? 'Loading'
            : 'Ready'

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Coach"
        subtitle="Real pose tracking and a trained form classifier — built as a second opinion, not a replacement for your coach."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source="live" label="Models verified" />
            <Link to="/dashboard/progress" className={buttonClasses('outline', 'sm')}>
              Session history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-2xl bg-charcoal p-5 text-white sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-orange-500/20" />
          <div className="absolute -right-10 top-10 h-52 w-52 rounded-full border border-orange-500/15" />
          <div className="absolute right-24 top-32 hidden h-3 w-3 rounded-full bg-orange-500 sm:block" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-light">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Camera form check
            </p>
            <h2 className="mt-3 max-w-2xl font-display uppercase text-3xl leading-[0.94] sm:text-4xl xl:text-5xl">
              Your camera.
              <br />
              Real model<span className="text-orange-500">.</span>
            </h2>
            <p className="mt-3 max-w-xl text-[12px] leading-relaxed text-white/50">
              MediaPipe tracks 33 pose landmarks at 10 samples per second. A per-exercise ONNX
              classifier scores form from a rolling movement window. Reps are counted from joint
              motion, separately from the classifier.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Squat', value: '66% threshold' },
              { label: 'Curl', value: '64% threshold' },
              { label: 'Push-up', value: '58% threshold' },
            ].map((item) => (
              <span
                key={item.label}
                className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60"
              >
                {item.label} · {item.value}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard
          eyebrow="Live workout"
          title={selected.label}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em]',
                  phase === 'live' && poseReady
                    ? 'border-emerald-600/20 bg-emerald-50 text-emerald-700'
                    : phase === 'live'
                      ? 'border-amber-500/20 bg-amber-50 text-amber-700'
                      : phase === 'loading'
                      ? 'border-amber-500/20 bg-amber-50 text-amber-700'
                      : 'border-charcoal/10 bg-charcoal/[0.04] text-charcoal/40',
                )}
              >
                <span
                  className={cn(
                    'h-1 w-1 rounded-full',
                    phase === 'live' && poseReady
                      ? 'animate-pulse-dot bg-emerald-500'
                      : phase === 'live'
                        ? 'bg-amber-500'
                        : 'bg-charcoal/30',
                  )}
                />
                {stageStatus}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-charcoal/30">
                {source === 'video' ? 'Video input' : source === 'camera' ? 'Camera live' : 'No source'}
              </span>
            </div>
          }
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(Object.keys(EXERCISES) as ExerciseKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => changeExercise(key)}
                disabled={phase === 'live' || phase === 'paused'}
                aria-pressed={exercise === key}
                className={cn(
                  'min-h-[38px] rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                  exercise === key
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-charcoal/15 bg-white text-charcoal/50 hover:border-charcoal/30',
                )}
              >
                {EXERCISES[key].shortLabel}
              </button>
            ))}
            <span className="ml-auto hidden text-[9px] uppercase tracking-[0.1em] text-charcoal/30 sm:inline">
              {selected.cameraHint}
            </span>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className={cn('h-full w-full object-contain', phase === 'idle' && 'opacity-0')}
            />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

            {phase === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-white">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Camera className="h-6 w-6 text-orange-400" />
                </span>
                <p className="mt-3 font-display uppercase text-2xl leading-none">
                  Start your form check<span className="text-orange-500">.</span>
                </p>
                <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-white/45">
                  {selected.cameraHint} Nothing is uploaded. Camera frames stay in this browser.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" onClick={startCamera}>
                    <Camera className="h-3.5 w-3.5" /> Start camera
                  </Button>
                  <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 hover:bg-white hover:text-charcoal">
                    <Upload className="h-3.5 w-3.5" /> Load video
                    <input
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void loadVideo(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {phase === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/80 px-5 text-center text-white">
                <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
                <p className="mt-3 text-[12px] font-semibold">{loadingLabel}</p>
                <p className="mt-1 max-w-xs text-[10px] text-white/40">
                  Pose and form models download once, then run locally in your browser.
                </p>
              </div>
            )}

            {phase === 'finished' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal px-5 text-center text-white">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500">
                  <Check className="h-6 w-6" />
                </span>
                <p className="mt-3 font-display uppercase text-3xl leading-none">Set complete.</p>
                <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-white/45">
                  {reps} reps detected · {clock(elapsed)} · {scores.length ? `${scores.length} model windows` : 'no model window'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-charcoal/35">
              <Info className="h-3 w-3" /> {selected.cameraHint}
            </p>
            <span className="text-[9px] uppercase tracking-[0.1em] text-charcoal/30">
              {!poseDetected
                ? 'No pose detected'
                : poseReady
                  ? 'Required joints visible'
                  : 'Move back until required joints are visible'}{' '}
              · {detectionRate}% of sampled frames ready
            </span>
          </div>

          {phase === 'live' && !poseReady && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-50 p-3.5 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {poseDetected
                  ? `Pose found, but the camera cannot see every required joint. ${selected.cameraHint}`
                  : `No person detected yet. ${selected.cameraHint} Stay in frame for a moment so tracking can lock on.`}
              </span>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[11px] text-red-800" role="alert">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard eyebrow="Live metrics" title={`${selected.primaryAngleLabel} · ${EXERCISES[exercise].shortLabel}`}>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-orange-500 p-4 text-white">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/65">Reps</p>
                <p className="mt-1 font-display uppercase text-5xl leading-none">{reps}</p>
                <p className="mt-1 text-[9px] text-white/65">Angle-state detector</p>
              </div>
              <div className="rounded-xl border border-charcoal/10 bg-ivory/60 p-4">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Timer</p>
                <p className="mt-1 font-display uppercase text-3xl leading-none text-charcoal">{clock(elapsed)}</p>
                <p className="mt-1 text-[9px] text-charcoal/35">Session record</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-charcoal/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  Form quality
                </p>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em]',
                    verdict === 'good'
                      ? 'bg-emerald-50 text-emerald-700'
                      : verdict === 'needs-work'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-charcoal/[0.04] text-charcoal/35',
                  )}
                >
                  {verdict === 'good'
                    ? 'Good'
                    : verdict === 'needs-work'
                      ? 'Needs work'
                      : 'Collecting'}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <p className="font-display uppercase text-3xl leading-none text-charcoal">
                  {pGood !== null ? `${Math.round(pGood * 100)}%` : '—'}
                </p>
                <p className="text-right text-[9px] leading-relaxed text-charcoal/35">
                  p(GOOD) from the model
                  <br />
                  threshold {Math.round(threshold * 100)}%
                </p>
              </div>
              <ProgressBar value={pGood !== null ? pGood * 100 : 0} className="mt-3" />
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/30">
                {scores.length
                  ? `${scores.length} scored windows · average ${averageScore !== null ? Math.round(averageScore * 100) : '—'}%`
                  : 'A score appears after about two seconds of visible movement.'}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-ivory/60 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/30">Frames</p>
                <p className="mt-1 font-display uppercase text-lg leading-none text-charcoal">{framesCount}</p>
              </div>
              <div className="rounded-lg bg-ivory/60 p-3">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/30">Detection</p>
                <p className="mt-1 font-display uppercase text-lg leading-none text-charcoal">{detectionRate}%</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {phase === 'idle' && (
                <Button size="sm" onClick={startCamera}>
                  <Camera className="h-3.5 w-3.5" /> Start camera
                </Button>
              )}
              {phase === 'live' && (
                <>
                  <Button variant="outline" size="sm" onClick={pauseSession}>
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </Button>
                  <Button variant="dark" size="sm" onClick={finishSession}>
                    <CircleStop className="h-3.5 w-3.5" /> Finish set
                  </Button>
                </>
              )}
              {phase === 'paused' && (
                <>
                  <Button size="sm" onClick={resumeSession}>
                    <Play className="h-3.5 w-3.5" /> Resume
                  </Button>
                  <Button variant="dark" size="sm" onClick={finishSession}>
                    <CircleStop className="h-3.5 w-3.5" /> Finish set
                  </Button>
                </>
              )}
              {phase === 'finished' && (
                <>
                  <Button size="sm" onClick={saveSession} disabled={saved}>
                    {saved ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {saved ? 'Saved' : 'Save session'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetSession}>
                    <RotateCcw className="h-3.5 w-3.5" /> New set
                  </Button>
                </>
              )}
              {phase === 'live' && (
                <Button variant="ghost" size="sm" onClick={resetSession}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Measured feedback"
            title={cues.length ? 'What the window shows.' : 'Waiting for a clear window.'}
          >
            {cues.length ? (
              <ul className="space-y-2">
                {cues.map((cue) => (
                  <li key={cue} className="flex items-start gap-2 text-[11px] leading-relaxed text-charcoal/55">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {cue}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-relaxed text-charcoal/40">
                Cues are based on measured joint range, torso movement and left/right differences.
                They appear only after the model scores a window.
              </p>
            )}
            <div className="mt-3 rounded-xl bg-ivory p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                <Brain className="h-3 w-3 text-orange-500" /> Model estimate
              </p>
              <p className="mt-1.5 text-[9px] leading-relaxed text-charcoal/40">
                Held-out accuracy is modest, especially for squat and curl. Treat this as a secondary
                signal and stop if anything hurts.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

      {phase === 'finished' && (
        <SectionCard
          eyebrow="Session summary"
          title={saved ? `Saved to your ${dataStatus.isCloud ? 'account' : 'local'} history.` : 'Review before saving.'}
          className="mt-4"
          action={<SourceBadge source={scores.length ? 'live' : 'empty'} label="Model output" />}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Exercise', value: selected.label },
              { label: 'Reps detected', value: reps },
              { label: 'Duration', value: clock(elapsed) },
              {
                label: 'Average form',
                value: averageScore !== null ? `${Math.round(averageScore * 100)}%` : '—',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-charcoal/10 bg-ivory/50 p-4">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                  {item.label}
                </p>
                <p className="mt-1.5 font-display text-2xl leading-none text-charcoal">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-charcoal/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">
                  Model windows
                </p>
                <span className="text-[9px] text-charcoal/30">{scores.length} scored</span>
              </div>
              <div className="mt-3 flex h-12 items-end gap-1">
                {scores.length ? (
                  scores.map((score, index) => (
                    <span
                      key={`${score.atSeconds}-${index}`}
                      className={cn(
                        'flex-1 rounded-t-sm',
                        score.verdict === 'good' ? 'bg-emerald-500' : 'bg-orange-500',
                      )}
                      style={{ height: `${Math.max(8, Math.round(score.pGood * 100))}%` }}
                      title={`p(GOOD) ${Math.round(score.pGood * 100)}%`}
                    />
                  ))
                ) : (
                  <span className="text-[10px] text-charcoal/35">No windows scored.</span>
                )}
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-charcoal/30">
                Each bar is one model window. Green is above the shipped threshold; orange is below it.
              </p>
            </div>
            <div className="rounded-xl bg-charcoal p-4 text-white">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-orange-400">
                Overall estimate
              </p>
              <p className="mt-1.5 font-display uppercase text-2xl leading-none">
                {overallVerdict === 'good'
                  ? 'Good form window'
                  : overallVerdict === 'needs-work'
                    ? 'Needs work'
                    : 'Insufficient data'}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                {scores.length
                  ? `Average p(GOOD) ${Math.round((averageScore ?? 0) * 100)}% against a ${Math.round(threshold * 100)}% threshold.`
                  : 'Record at least two seconds of visible movement for a model estimate.'}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard eyebrow="How it works" title="Three independent signals.">
          <ol className="space-y-3">
            {[
              ['Pose', 'MediaPipe finds 33 landmarks in each sampled frame.'],
              ['Reps', 'The primary joint angle crosses a calibrated bottom and top range.'],
              ['Form', 'A 60-feature window is scored by the per-exercise ONNX Random Forest.'],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal text-[9px] font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-charcoal">{title}</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-charcoal/40">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
        <SectionCard eyebrow="Privacy" title="Frames stay in the browser.">
          <ul className="space-y-2.5">
            {[
              'Camera frames are processed locally; no video is uploaded.',
              'Pose landmarks are held in page memory and discarded on reset.',
              'Only the session summary is saved, and only when you press Save session.',
              'No medical diagnosis, prescription or injury assessment is produced.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[10px] leading-relaxed text-charcoal/50">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" /> {item}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard eyebrow="Before you start" title="Set the camera up properly.">
          <ul className="space-y-2.5">
            {selected.cues.map((cue) => (
              <li key={cue} className="flex items-start gap-2 text-[10px] leading-relaxed text-charcoal/50">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {cue}
              </li>
            ))}
            <li className="flex items-start gap-2 text-[10px] leading-relaxed text-charcoal/50">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> Camera access needs localhost or HTTPS. Stop if you feel pain, dizziness or unusual discomfort.
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.1em] text-charcoal/25">
        <span className="inline-flex items-center gap-1.5">
          <CameraOff className="h-3 w-3" /> Camera access is requested only when you press Start.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dumbbell className="h-3 w-3" /> Supports squat, bicep curl and push-up.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3 w-3" /> {aiSessions.length} AI sessions saved {dataStatus.isCloud ? 'to your account' : 'on this device'}.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3 w-3" /> Model sampling: 10 fps · inference: local.
        </span>
      </div>
    </div>
  )
}
