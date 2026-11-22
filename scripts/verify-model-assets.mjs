import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const includeDist = process.argv.includes('dist')

const assets = [
  {
    name: 'workout_recommendation.onnx',
    bytes: 1617299,
    sha256: 'cf256da0223848750cb25198d3d57da0ebcacc56636a4fdf90ff6c76b3c3c2a7',
    source: join(root, 'workout-recommendation', 'artifacts', 'workout_recommendation.onnx'),
  },
  {
    name: 'feature_schema.json',
    bytes: 3669,
    sha256: 'c6285162d8205b4121d21fb949069772b82826ef6a1873594548b3ed8b2ea9c4',
    source: join(root, 'workout-recommendation', 'artifacts', 'feature_schema.json'),
  },
  {
    name: 'form_classifier_squat.onnx',
    bytes: 373668,
    sha256: '84a84bc130159a403765be9d44d72f87af46e6e19bf74e193694cf7cefe6aa97',
  },
  {
    name: 'form_classifier_bicep_curl.onnx',
    bytes: 373780,
    sha256: '23bfeb8495b9e942059c862d41ea6929b17fe6a87b44ffbe044a2e3927110d44',
  },
  {
    name: 'form_classifier_push_up.onnx',
    bytes: 340970,
    sha256: '18fb7cde7ac4d747d02dbfed87e6cff76e06efa8b78bebcb8aa963b81cece0e7',
  },
  {
    name: 'model_metadata.json',
    bytes: 1986,
    sha256: 'f3cf166f175620f8b750e3287b9f326bc7a8afbcdc4dd82619d7a6e479955411',
  },
]

function digest(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function verifyFile(file, expected, label) {
  if (!existsSync(file)) throw new Error(`${label} is missing: ${file}`)
  const bytes = readFileSync(file)
  if (bytes.length !== expected.bytes) {
    throw new Error(`${label} size changed: expected ${expected.bytes}, got ${bytes.length}`)
  }
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== expected.sha256) {
    throw new Error(`${label} checksum changed. Review the model update before deploying.`)
  }
}

let failures = 0
for (const asset of assets) {
  try {
    const publicFile = join(root, 'public', 'models', asset.name)
    verifyFile(publicFile, asset, `public/models/${asset.name}`)
    if (asset.source) {
      if (!existsSync(asset.source)) throw new Error(`source artifact is missing: ${asset.source}`)
      if (!readFileSync(publicFile).equals(readFileSync(asset.source))) {
        throw new Error(`public copy differs from source artifact for ${asset.name}`)
      }
    }
    if (includeDist) {
      verifyFile(join(root, 'dist', 'models', asset.name), asset, `dist/models/${asset.name}`)
    }
    console.log(`[assets] ok ${asset.name} (${asset.bytes} bytes)`)
  } catch (error) {
    failures += 1
    console.error(`[assets] FAIL ${error instanceof Error ? error.message : String(error)}`)
  }
}

try {
  const schema = JSON.parse(readFileSync(join(root, 'public', 'models', 'feature_schema.json'), 'utf8'))
  if (!Array.isArray(schema.target_labels) || schema.target_labels.length !== 24) {
    throw new Error('recommendation schema must contain exactly 24 target labels')
  }
  if (!Array.isArray(schema.numeric_features) || schema.numeric_features.length !== 4) {
    throw new Error('recommendation schema numeric feature contract changed')
  }
  if (!Array.isArray(schema.categorical_features) || schema.categorical_features.length !== 5) {
    throw new Error('recommendation schema categorical feature contract changed')
  }
  if (schema.onnx_inputs?.length !== 9 || schema.onnx_outputs?.length !== 2) {
    throw new Error('recommendation ONNX input/output contract changed')
  }

  const metadata = JSON.parse(readFileSync(join(root, 'public', 'models', 'model_metadata.json'), 'utf8'))
  if (!Array.isArray(metadata.feature_order) || metadata.feature_order.length !== 60) {
    throw new Error('form classifier metadata must contain exactly 60 features')
  }
  if (!Array.isArray(metadata.class_order) || metadata.class_order.join(',') !== 'BAD,GOOD') {
    throw new Error('form classifier class order changed')
  }
  const thresholds = metadata.thresholds ?? {}
  for (const exercise of ['squat', 'bicep_curl', 'push_up']) {
    if (typeof thresholds[exercise] !== 'number') {
      throw new Error(`missing form threshold for ${exercise}`)
    }
  }
  console.log('[assets] ok recommendation and form model contracts')
} catch (error) {
  failures += 1
  console.error(`[assets] FAIL ${error instanceof Error ? error.message : String(error)}`)
}

if (failures > 0) {
  console.error(`[assets] ${failures} verification failure(s)`)
  process.exit(1)
}

console.log(`[assets] all model assets verified${includeDist ? ' in public/ and dist/' : ' in public/'}`)
