// Supabase Edge Function: profile-image
//
// Verifies a Firebase ID token server-side, then uses the Supabase service role
// to upload/delete a profile image. This avoids putting a service-role key in
// the browser and works even when Supabase is not configured for Firebase
// third-party auth.
//
// Required function secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   FIREBASE_PROJECT_ID
//
// Deploy with:
//   supabase functions deploy profile-image --no-verify-jwt
//
// `--no-verify-jwt` is intentional: Firebase tokens are verified below with
// Google's public certificates. Never expose SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { importX509, jwtVerify } from 'npm:jose@5'

const BUCKET = 'profile-images'
const MAX_BYTES = 5 * 1024 * 1024
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

let certificateCache: { expires: number; certs: Record<string, string> } | null = null

async function googleCertificates() {
  if (certificateCache && certificateCache.expires > Date.now()) return certificateCache.certs
  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
  )
  if (!response.ok) throw new Error('Could not load Google signing certificates.')
  const certs = (await response.json()) as Record<string, string>
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 3600)
  certificateCache = { certs, expires: Date.now() + maxAge * 1000 }
  return certs
}

async function verifyFirebaseToken(token: string) {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID')
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured on the function.')
  const header = JSON.parse(
    atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/')),
  )
  const kid = header.kid
  if (!kid) throw new Error('Firebase token has no key id.')
  const certs = await googleCertificates()
  const certificate = certs[kid]
  if (!certificate) throw new Error('Unknown Firebase signing key.')
  const key = await importX509(certificate, 'RS256')
  const result = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
  const uid = result.payload.sub
  if (!uid) throw new Error('Firebase token has no subject.')
  return uid as string
}

function tokenFrom(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const token = tokenFrom(request)
    if (!token) return json({ error: 'Missing Firebase authentication token.' }, 401)
    const uid = await verifyFirebaseToken(token)

    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) return json({ error: 'Storage service is not configured.' }, 500)
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (request.method === 'DELETE') {
      const body = (await request.json().catch(() => null)) as { path?: string } | null
      if (!body?.path || !body.path.startsWith(`${uid}/`)) {
        return json({ error: 'Invalid image path.' }, 400)
      }
      const { error } = await supabase.storage.from(BUCKET).remove([body.path])
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return json({ error: 'No image file was provided.' }, 400)
    const extension = MIME_EXT[file.type]
    if (!extension) return json({ error: 'Use a JPEG, PNG or WebP image.' }, 415)
    if (file.size === 0) return json({ error: 'The image is empty.' }, 400)
    if (file.size > MAX_BYTES) return json({ error: 'Images must be 5 MB or smaller.' }, 413)

    const path = `${uid}/avatar-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`
    const oldPath = form.get('oldPath')
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (error) return json({ error: error.message }, 400)

    if (typeof oldPath === 'string' && oldPath.startsWith(`${uid}/`)) {
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => undefined)
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return json({ url: data.publicUrl, path })
  } catch (error) {
    return json({ error: (error as Error).message || 'Upload failed.' }, 401)
  }
})
