import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const artifacts = join(root, 'workout-recommendation', 'artifacts')
const target = join(root, 'public', 'models')

const files = [
  ['workout_recommendation.onnx', 'workout_recommendation.onnx'],
  ['feature_schema.json', 'feature_schema.json'],
]

if (!existsSync(artifacts)) {
  console.error('[model] workout-recommendation/artifacts is missing.')
  process.exit(1)
}

mkdirSync(target, { recursive: true })
for (const [source, name] of files) {
  const from = join(artifacts, source)
  if (!existsSync(from)) {
    console.error(`[model] missing artifact ${source}`)
    process.exit(1)
  }
  copyFileSync(from, join(target, name))
  console.log(`[model] copied ${name}`)
}
