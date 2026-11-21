import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = resolve(process.cwd())
const dist = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const target = join(root, 'public', 'ort')

if (!existsSync(dist)) {
  console.error('[ort] onnxruntime-web is not installed. Run npm install first.')
  process.exit(1)
}

mkdirSync(target, { recursive: true })
const files = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
]
for (const file of files) {
  const source = join(dist, file)
  if (!existsSync(source)) continue
  mkdirSync(dirname(join(target, file)), { recursive: true })
  copyFileSync(source, join(target, file))
  console.log(`[ort] copied ${file}`)
}
