import { auth } from '../../lib/firebase'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const PROFILE_BUCKET = 'profile-images'
const FUNCTION_URL = import.meta.env.VITE_SUPABASE_UPLOAD_FUNCTION_URL as string | undefined

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageConfigurationError'
  }
}

export const isProfileImageStorageConfigured = Boolean(
  isSupabaseConfigured || FUNCTION_URL,
)

export function validateProfileImage(file: File): string | null {
  if (!file || file.size === 0) return 'Choose a non-empty image file.'
  if (!EXTENSIONS[file.type]) return 'Use a JPEG, PNG or WebP image.'
  if (file.size > MAX_IMAGE_BYTES) return 'Images must be 5 MB or smaller.'
  return null
}

async function currentUid(expectedUid: string): Promise<string> {
  const user = auth?.currentUser
  if (!user) throw new StorageConfigurationError('Sign in again before uploading a photo.')
  const token = await user.getIdToken().catch(() => null)
  if (!token) throw new StorageConfigurationError('Your session expired. Sign in again.')
  if (user.uid !== expectedUid) {
    throw new StorageConfigurationError('This image does not belong to the signed-in account.')
  }
  return user.uid
}

async function uploadThroughFunction(file: File, uid: string): Promise<{ url: string; path: string }> {
  if (!FUNCTION_URL) throw new StorageConfigurationError('Upload function is not configured.')
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new StorageConfigurationError('Sign in again before uploading a photo.')
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  const payload = (await response.json().catch(() => null)) as
    | { url?: string; path?: string; error?: string }
    | null
  if (!response.ok || !payload?.url || !payload.path) {
    throw new Error(payload?.error || 'The image upload service rejected this file.')
  }
  if (!payload.path.startsWith(`${uid}/`)) {
    throw new Error('The upload service returned an invalid file path.')
  }
  return { url: payload.url, path: payload.path }
}

async function uploadDirect(file: File, uid: string): Promise<{ url: string; path: string }> {
  if (!supabase) {
    throw new StorageConfigurationError(
      'Supabase Storage is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }
  const extension = EXTENSIONS[file.type]
  const path = `${uid}/avatar-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`
  const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) {
    if (/row-level security|policy|unauthorized|jwt/i.test(error.message)) {
      throw new Error(
        'Supabase rejected the upload. Ensure Firebase third-party auth and the profile-images storage policies are configured.',
      )
    }
    throw new Error(error.message)
  }
  const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function uploadProfileImage(
  file: File,
  expectedUid: string,
): Promise<{ url: string; path: string }> {
  const validationError = validateProfileImage(file)
  if (validationError) throw new Error(validationError)
  const uid = await currentUid(expectedUid)
  if (FUNCTION_URL) return uploadThroughFunction(file, uid)
  if (isSupabaseConfigured) return uploadDirect(file, uid)
  throw new StorageConfigurationError(
    'Profile photo storage is not configured. Add the Supabase project URL, publishable key and upload function URL.',
  )
}

export async function deleteProfileImage(path: string, expectedUid: string): Promise<void> {
  const uid = await currentUid(expectedUid)
  if (!path.startsWith(`${uid}/`)) {
    throw new Error('Refusing to delete an image outside your account folder.')
  }
  if (FUNCTION_URL) {
    const token = await auth?.currentUser?.getIdToken()
    if (!token) throw new StorageConfigurationError('Sign in again before deleting a photo.')
    const response = await fetch(FUNCTION_URL, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(payload?.error || 'The image could not be deleted.')
    }
    return
  }
  if (!supabase) throw new StorageConfigurationError('Supabase Storage is not configured.')
  const { error } = await supabase.storage.from(PROFILE_BUCKET).remove([path])
  if (error) throw new Error(error.message)
}

export const profileImageLimits = {
  maxBytes: MAX_IMAGE_BYTES,
  maxMegabytes: 5,
  accepted: 'JPEG, PNG or WebP',
}
