import type { ExerciseKey, Landmark, PoseFrame } from '../types'

/**
 * Browser port of the verified feature pipeline in public/model-check.html.
 *
 * The maths must stay identical to that file and to ml/fitness_features.py.
 * Any change here invalidates the model parity check.
 */
const L = {
  l_shoulder: 11,
  r_shoulder: 12,
  l_elbow: 13,
  r_elbow: 14,
  l_wrist: 15,
  r_wrist: 16,
  l_hip: 23,
  r_hip: 24,
  l_knee: 25,
  r_knee: 26,
  l_ankle: 27,
  r_ankle: 28,
  l_foot: 31,
  r_foot: 32,
}

export const PRIMARY_ANGLE: Record<ExerciseKey, string> = {
  squat: 'knee_angle_mean',
  bicep_curl: 'elbow_angle_mean',
  push_up: 'elbow_angle_mean',
}

function sub2(p: Landmark[], a: number, b: number) {
  return [p[b].x - p[a].x, p[b].y - p[a].y]
}

function norm2(v: number[]) {
  return Math.hypot(v[0], v[1])
}

function angleAt(p: Landmark[], a: number, b: number, c: number) {
  const v1 = sub2(p, b, a)
  const v2 = sub2(p, b, c)
  const dot = (v1[0] * v2[0] + v1[1] * v2[1]) / Math.max(norm2(v1) * norm2(v2), 1e-6)
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI
}

function signedBend(p: Landmark[], a: number, b: number, c: number) {
  const v1 = sub2(p, b, a)
  const v2 = sub2(p, b, c)
  const cross = v1[0] * v2[1] - v1[1] * v2[0]
  return Math.sign(cross) * (180 - angleAt(p, a, b, c))
}

export function frameFeatures(p: Landmark[]): Record<string, number> {
  const hipC = { x: (p[L.l_hip].x + p[L.r_hip].x) / 2, y: (p[L.l_hip].y + p[L.r_hip].y) / 2 }
  const shoC = {
    x: (p[L.l_shoulder].x + p[L.r_shoulder].x) / 2,
    y: (p[L.l_shoulder].y + p[L.r_shoulder].y) / 2,
  }
  const torsoLen = Math.max(Math.hypot(shoC.x - hipC.x, shoC.y - hipC.y), 1e-6)

  const kneeL = angleAt(p, L.l_hip, L.l_knee, L.l_ankle)
  const kneeR = angleAt(p, L.r_hip, L.r_knee, L.r_ankle)
  const hipL = angleAt(p, L.l_shoulder, L.l_hip, L.l_knee)
  const hipR = angleAt(p, L.r_shoulder, L.r_hip, L.r_knee)
  const elbL = angleAt(p, L.l_shoulder, L.l_elbow, L.l_wrist)
  const elbR = angleAt(p, L.r_shoulder, L.r_elbow, L.r_wrist)
  const shL = angleAt(p, L.l_elbow, L.l_shoulder, L.l_hip)
  const shR = angleAt(p, L.r_elbow, L.r_shoulder, L.r_hip)
  const ankL = angleAt(p, L.l_knee, L.l_ankle, L.l_foot)
  const ankY = (p[L.l_ankle].y + p[L.r_ankle].y) / 2
  const shoY = (p[L.l_shoulder].y + p[L.r_shoulder].y) / 2
  const sbL = signedBend(p, L.l_hip, L.l_knee, L.l_ankle)
  const sbR = signedBend(p, L.r_hip, L.r_knee, L.r_ankle)

  return {
    knee_angle_mean: (kneeL + kneeR) / 2,
    knee_angle_diff: Math.abs(kneeL - kneeR),
    hip_angle_mean: (hipL + hipR) / 2,
    elbow_angle_mean: (elbL + elbR) / 2,
    elbow_angle_diff: Math.abs(elbL - elbR),
    shoulder_angle_mean: (shL + shR) / 2,
    ankle_angle_l: ankL,
    torso_inclination:
      (Math.acos(Math.min(1, Math.max(-1, Math.abs(shoC.y - hipC.y) / torsoLen))) * 180) /
      Math.PI,
    shoulder_to_hip_x: (shoC.x - hipC.x) / torsoLen,
    knee_bend_abs_mean: (Math.abs(sbL) + Math.abs(sbR)) / 2,
    knee_bend_abs_diff: Math.abs(Math.abs(sbL) - Math.abs(sbR)),
    knee_width_ratio: Math.abs(p[L.l_knee].x - p[L.r_knee].x) / torsoLen,
    ankle_width_ratio: Math.abs(p[L.l_ankle].x - p[L.r_ankle].x) / torsoLen,
    hip_height_norm: (ankY - hipC.y) / torsoLen,
    shoulder_height_norm: (ankY - shoC.y) / torsoLen,
    wrist_height_l: (shoY - p[L.l_wrist].y) / torsoLen,
    wrist_height_r: (shoY - p[L.r_wrist].y) / torsoLen,
  }
}

function percentile(values: number[], q: number) {
  const sorted = values
    .filter(Number.isFinite)
    .slice()
    .sort((a, b) => a - b)
  if (!sorted.length) return Number.NaN
  if (sorted.length === 1) return sorted[0]
  const h = ((sorted.length - 1) * q) / 100
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN

const std = (values: number[]) => {
  if (!values.length) return Number.NaN
  const m = mean(values)
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length)
}

const min = (values: number[]) => (values.length ? Math.min(...values) : Number.NaN)
const max = (values: number[]) => (values.length ? Math.max(...values) : Number.NaN)

function absDiffMean(values: number[]) {
  if (values.length < 2) return 0
  let sum = 0
  for (let index = 1; index < values.length; index += 1) {
    sum += Math.abs(values[index] - values[index - 1])
  }
  return sum / (values.length - 1)
}

export interface RepFeatures {
  rep_rate_per_sec: number
  angle_range_clip: number
  rep_period_mean: number
  rep_period_std: number
  rep_period_cv: number
  rep_period_min: number
  rep_period_max: number
  frac_below_25pct: number
  frac_above_75pct: number
  frac_mid: number
  rom_per_rep: number
}

export function repFeatures(angle: number[], t: number[]): RepFeatures {
  const finite = angle.filter(Number.isFinite)
  const out: RepFeatures = {
    rep_rate_per_sec: Number.NaN,
    angle_range_clip: Number.NaN,
    rep_period_mean: Number.NaN,
    rep_period_std: Number.NaN,
    rep_period_cv: Number.NaN,
    rep_period_min: Number.NaN,
    rep_period_max: Number.NaN,
    frac_below_25pct: Number.NaN,
    frac_above_75pct: Number.NaN,
    frac_mid: Number.NaN,
    rom_per_rep: Number.NaN,
  }
  if (finite.length < 10) return out
  const low = percentile(finite, 15)
  const high = percentile(finite, 85)
  out.angle_range_clip = max(finite) - min(finite)
  if (!(high - low >= 8)) return out

  let state = 'top'
  const events: number[] = []
  for (let index = 0; index < angle.length; index += 1) {
    const value = angle[index]
    if (!Number.isFinite(value)) continue
    if (state === 'top' && value <= low) {
      state = 'bottom'
    } else if (state === 'bottom' && value >= high) {
      state = 'top'
      events.push(t[index])
    }
  }
  const count = events.length
  const duration = t[t.length - 1] - t[0]
  out.rep_rate_per_sec = duration > 0 ? count / duration : Number.NaN
  if (count >= 2) {
    const periods: number[] = []
    for (let index = 1; index < events.length; index += 1) {
      periods.push(events[index] - events[index - 1])
    }
    const periodMean = mean(periods)
    out.rep_period_mean = periodMean
    out.rep_period_std = std(periods)
    out.rep_period_cv = periodMean ? std(periods) / periodMean : Number.NaN
    out.rep_period_min = min(periods)
    out.rep_period_max = max(periods)
    const span = high - low
    if (span > 1e-6) {
      const normalised = angle
        .map((value) => (Number.isFinite(value) ? (value - low) / span : Number.NaN))
        .filter(Number.isFinite)
      out.frac_below_25pct = normalised.filter((value) => value < 0.25).length / normalised.length
      out.frac_above_75pct = normalised.filter((value) => value > 0.75).length / normalised.length
      out.frac_mid =
        normalised.filter((value) => value >= 0.25 && value <= 0.75).length / normalised.length
    }
  }
  if (count >= 1 && Number.isFinite(out.angle_range_clip)) {
    out.rom_per_rep = out.angle_range_clip / count
  }
  return out
}

export type ClipFeatures = Record<string, number>

export function clipFeatures(frames: PoseFrame[], exercise: ExerciseKey): ClipFeatures {
  const perFrame = frames.map((frame) => frameFeatures(frame.p))
  const column = (key: string) => perFrame.map((frame) => frame[key]).filter(Number.isFinite)
  const block = (key: string, prefix: string) => {
    const values = column(key)
    return {
      [`${prefix}_min`]: min(values),
      [`${prefix}_max`]: max(values),
      [`${prefix}_rom`]: values.length ? max(values) - min(values) : Number.NaN,
      [`${prefix}_std`]: std(values),
      [`${prefix}_iqr`]: values.length ? percentile(values, 75) - percentile(values, 25) : Number.NaN,
    }
  }

  const features: ClipFeatures = {}
  Object.assign(
    features,
    block('knee_angle_mean', 'knee'),
    block('hip_angle_mean', 'hip'),
    block('elbow_angle_mean', 'elbow'),
    block('shoulder_angle_mean', 'shoulder'),
    block('ankle_angle_l', 'ankle'),
  )

  const torso = column('torso_inclination')
  const sway = column('shoulder_to_hip_x')
  features.torso_mean = mean(torso)
  features.torso_max = max(torso)
  features.torso_std = std(torso)
  features.torso_rom = torso.length ? max(torso) - min(torso) : Number.NaN
  features.sway_std = std(sway)
  features.sway_maxabs = sway.length ? Math.max(...sway.map(Math.abs)) : Number.NaN
  features.sway_range = sway.length ? max(sway) - min(sway) : Number.NaN

  const kneeDeviation = column('knee_bend_abs_mean')
  features.knee_dev_mean = mean(kneeDeviation)
  features.knee_dev_max = max(kneeDeviation)
  features.knee_dev_asym_mean = mean(column('knee_bend_abs_diff'))

  const kneeWidth = column('knee_width_ratio')
  features.knee_width_min = min(kneeWidth)
  features.knee_width_max = max(kneeWidth)
  features.ankle_width_mean = mean(column('ankle_width_ratio'))

  const hipDrop = column('hip_height_norm')
  features.hip_drop_range = hipDrop.length ? max(hipDrop) - min(hipDrop) : Number.NaN
  features.hip_drop_min = min(hipDrop)
  const shoulderDrop = column('shoulder_height_norm')
  features.shoulder_drop_range = shoulderDrop.length
    ? max(shoulderDrop) - min(shoulderDrop)
    : Number.NaN
  features.knee_lr_diff_mean = mean(column('knee_angle_diff'))
  features.elbow_lr_diff_mean = mean(column('elbow_angle_diff'))

  const wristLeft = column('wrist_height_l')
  const wristRight = column('wrist_height_r')
  features.wrist_l_range = wristLeft.length ? max(wristLeft) - min(wristLeft) : Number.NaN
  features.wrist_r_range = wristRight.length ? max(wristRight) - min(wristRight) : Number.NaN
  features.wrist_l_max = max(wristLeft)
  features.wrist_r_max = max(wristRight)
  features.knee_vel_absmean = absDiffMean(column('knee_angle_mean'))
  features.elbow_vel_absmean = absDiffMean(column('elbow_angle_mean'))

  Object.assign(
    features,
    repFeatures(
      column(PRIMARY_ANGLE[exercise]),
      frames.map((frame) => frame.t),
    ),
  )

  return features
}

export function featureVector(
  frames: PoseFrame[],
  exercise: ExerciseKey,
  featureOrder: string[],
) {
  const features = clipFeatures(frames, exercise)
  return Float32Array.from(
    featureOrder.map((column) => {
      const value = features[column]
      return value === undefined || value === null || Number.isNaN(value) ? Number.NaN : value
    }),
  )
}

export function primaryAngle(frames: PoseFrame[], exercise: ExerciseKey) {
  if (!frames.length) return Number.NaN
  const latest = frames[frames.length - 1]
  return frameFeatures(latest.p)[PRIMARY_ANGLE[exercise]]
}

export function measuredSummary(frames: PoseFrame[], exercise: ExerciseKey) {
  const features = clipFeatures(frames, exercise)
  const duration = frames.length ? frames[frames.length - 1].t - frames[0].t : 0
  const reps = Number.isFinite(features.rep_rate_per_sec)
    ? Math.round(features.rep_rate_per_sec * duration)
    : 0
  return {
    rangeOfMotion: features.angle_range_clip,
    torsoLean: features.torso_max,
    kneeAsymmetry: features.knee_lr_diff_mean,
    repRhythm: features.rep_period_cv,
    reps,
    features,
  }
}
