import type { ExerciseKey } from '../types'

function percentile(values: number[], q: number) {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const h = ((sorted.length - 1) * q) / 100
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo])
}

const DEFAULTS: Record<ExerciseKey, { low: number; high: number }> = {
  squat: { low: 95, high: 155 },
  bicep_curl: { low: 55, high: 150 },
  push_up: { low: 70, high: 150 },
}

/**
 * Deterministic rep detector based on the primary joint angle.
 *
 * This is motion detection, not a model prediction. It uses a hysteresis
 * threshold so a rep is only counted after the joint returns through a clear
 * top range. Dynamic percentiles adapt to body proportions and camera distance.
 */
export class RepCounter {
  private exercise: ExerciseKey
  private window: number[] = []
  private isDown = false
  private lastRepAt = 0
  private reps = 0
  private low: number
  private high: number

  constructor(exercise: ExerciseKey) {
    this.exercise = exercise
    this.low = DEFAULTS[exercise].low
    this.high = DEFAULTS[exercise].high
  }

  reset(exercise: ExerciseKey = this.exercise) {
    this.exercise = exercise
    this.window = []
    this.isDown = false
    this.lastRepAt = 0
    this.reps = 0
    this.low = DEFAULTS[exercise].low
    this.high = DEFAULTS[exercise].high
  }

  update(angle: number, timestampMs: number) {
    if (!Number.isFinite(angle)) return this.reps
    this.window.push(angle)
    if (this.window.length > 90) this.window.shift()

    if (this.window.length >= 18) {
      const low = percentile(this.window, 10)
      const high = percentile(this.window, 90)
      if (high - low >= 18) {
        this.low = low + (high - low) * 0.08
        this.high = high - (high - low) * 0.08
      }
    }

    if (!this.isDown && angle <= this.low) {
      this.isDown = true
    } else if (this.isDown && angle >= this.high) {
      this.isDown = false
      if (timestampMs - this.lastRepAt > 280) {
        this.reps += 1
        this.lastRepAt = timestampMs
      }
    }
    return this.reps
  }

  get count() {
    return this.reps
  }

  get thresholds() {
    return { low: this.low, high: this.high }
  }

  get isInBottom() {
    return this.isDown
  }
}
