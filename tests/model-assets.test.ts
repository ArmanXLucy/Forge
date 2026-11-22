import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(resolve(root, path))
}

function sha256(path: string, text = false) {
  const bytes = text
    ? Buffer.from(read(path).toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    : read(path)
  return createHash('sha256').update(bytes).digest('hex')
}

const MODEL_ASSETS = [
  {
    path: 'public/models/workout_recommendation.onnx',
    bytes: 1617299,
    sha256: 'cf256da0223848750cb25198d3d57da0ebcacc56636a4fdf90ff6c76b3c3c2a7',
  },
  {
    path: 'public/models/feature_schema.json',
    bytes: 3482,
    sha256: 'ad373a1174590f28b1a8e910b0a7b0daaef80763a9e6e99bb4c978c736dd8f6c',
    text: true,
  },
  {
    path: 'public/models/form_classifier_squat.onnx',
    bytes: 373668,
    sha256: '84a84bc130159a403765be9d44d72f87af46e6e19bf74e193694cf7cefe6aa97',
  },
  {
    path: 'public/models/form_classifier_bicep_curl.onnx',
    bytes: 373780,
    sha256: '23bfeb8495b9e942059c862d41ea6929b17fe6a87b44ffbe044a2e3927110d44',
  },
  {
    path: 'public/models/form_classifier_push_up.onnx',
    bytes: 340970,
    sha256: '18fb7cde7ac4d747d02dbfed87e6cff76e06efa8b78bebcb8aa963b81cece0e7',
  },
  {
    path: 'public/models/model_metadata.json',
    bytes: 1904,
    sha256: 'ed1c8750fe61d6401918ece9e32560766969e6f54cf518ff1375142f595f02f8',
    text: true,
  },
]

describe('production AI assets', () => {
  for (const asset of MODEL_ASSETS) {
    it(`keeps ${asset.path} contract-identical`, () => {
      const bytes = asset.text
        ? Buffer.from(read(asset.path).toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
        : read(asset.path)
      expect(bytes).toHaveLength(asset.bytes)
      expect(sha256(asset.path, asset.text)).toBe(asset.sha256)
    })
  }

  it('keeps the public recommendation model identical to the validated artifact', () => {
    expect(read('public/models/workout_recommendation.onnx').equals(
      read('workout-recommendation/artifacts/workout_recommendation.onnx'),
    )).toBe(true)
    const normalize = (path: string) =>
      read(path).toString('utf8').replace(/\r\n/g, '\n')
    expect(normalize('public/models/feature_schema.json')).toBe(
      normalize('workout-recommendation/artifacts/feature_schema.json'),
    )
  })

  it('keeps the 24-category recommendation contract and 9/2 tensor contract', () => {
    const schema = JSON.parse(read('public/models/feature_schema.json').toString()) as {
      target_labels: string[]
      numeric_features: string[]
      categorical_features: string[]
      onnx_inputs: unknown[]
      onnx_outputs: unknown[]
    }
    expect(schema.target_labels).toHaveLength(24)
    expect(schema.numeric_features).toEqual(['Age', 'Weight_kg', 'Height_cm', 'BMI'])
    expect(schema.categorical_features).toEqual([
      'Gender',
      'Goal',
      'Equipment',
      'Experience',
      'Injury',
    ])
    expect(schema.onnx_inputs).toHaveLength(9)
    expect(schema.onnx_outputs).toHaveLength(2)
  })

  it('keeps the 60-feature form pipeline and BAD/GOOD class order', () => {
    const metadata = JSON.parse(read('public/models/model_metadata.json').toString()) as {
      feature_order: string[]
      class_order: string[]
      thresholds: Record<string, number>
    }
    expect(metadata.feature_order).toHaveLength(60)
    expect(metadata.class_order).toEqual(['BAD', 'GOOD'])
    expect(metadata.thresholds).toMatchObject({
      squat: 0.66,
      bicep_curl: 0.64,
      push_up: 0.58,
    })
  })

  it('keeps runtime dependencies version-pinned', () => {
    const recommendation = read('src/features/workout-recommendation/lib/inference.ts').toString()
    const aiCoach = read('src/features/ai-coach/lib/modelClient.ts').toString()
    expect(recommendation).toContain("const ORT_VERSION = '1.31.1'")
    expect(aiCoach).toContain("const ORT_VERSION = '1.19.2'")
    expect(aiCoach).toContain("const VISION_VERSION = '0.10.14'")
  })
})
