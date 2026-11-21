import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { useAuth } from '../../features/auth/AuthContext'
import { useProfileStore } from '../../store/useProfileStore'
import {
  deleteProfileImage,
  isProfileImageStorageConfigured,
  profileImageLimits,
  uploadProfileImage,
  validateProfileImage,
} from '../../services/cloud/storageService'

export function ProfilePhotoCard({ storageReady = true }: { storageReady?: boolean }) {
  const { user } = useAuth()
  const profile = useProfileStore((s) => s.profile)
  const avatarUrl = useProfileStore((s) => s.avatarUrl)
  const avatarPath = useProfileStore((s) => s.avatarPath)
  const setAvatar = useProfileStore((s) => s.setAvatar)
  const removeAvatar = useProfileStore((s) => s.removeAvatar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const name = profile?.name ?? user?.displayName ?? 'Athlete'
  const canUpload = Boolean(user && !user.isDemo && isProfileImageStorageConfigured && storageReady)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const chooseFile = (selected: File | null) => {
    setError(null)
    if (!selected) {
      setFile(null)
      return
    }
    if (!user || user.isDemo) {
      setError('Sign in with a real account before uploading a profile photo.')
      return
    }
    if (!isProfileImageStorageConfigured) {
      setError(
        'Photo storage is not configured yet. Add the Supabase URL, publishable key and upload function URL.',
      )
      return
    }
    if (!storageReady) {
      setError('Photo storage is not ready yet. Create the profile-images bucket in Supabase and reload Settings.')
      return
    }
    const validation = validateProfileImage(selected)
    if (validation) {
      setError(validation)
      return
    }
    setFile(selected)
  }

  const handleUpload = async () => {
    if (!file || !user || user.isDemo) return
    setUploading(true)
    setError(null)
    let uploaded: { url: string; path: string } | null = null
    try {
      uploaded = await uploadProfileImage(file, user.uid)
      await setAvatar(uploaded.url, uploaded.path)
      if (avatarPath && avatarPath !== uploaded.path) {
        await deleteProfileImage(avatarPath, user.uid).catch(() => undefined)
      }
      setFile(null)
      toast.success('Profile photo updated.')
    } catch (uploadError) {
      if (uploaded && user) {
        await deleteProfileImage(uploaded.path, user.uid).catch(() => undefined)
      }
      const message = (uploadError as Error).message
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!user || user.isDemo) return
    setRemoving(true)
    setError(null)
    try {
      await removeAvatar()
      if (avatarPath) await deleteProfileImage(avatarPath, user.uid).catch(() => undefined)
      setConfirmRemove(false)
      setFile(null)
      toast.success('Profile photo removed.')
    } catch (removeError) {
      const message = (removeError as Error).message
      setError(message)
      toast.error(message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative">
          <Avatar
            src={preview ?? avatarUrl ?? user?.photoURL}
            name={name}
            className="h-20 w-20 border border-charcoal/10 bg-charcoal text-2xl"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUpload || uploading}
            aria-label="Choose a profile photo"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[13px] font-semibold text-charcoal">Profile photo</h2>
            <span className="rounded-full border border-charcoal/10 bg-ivory px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-charcoal/40">
              Supabase Storage
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-charcoal/40">
            {profileImageLimits.accepted} · up to {profileImageLimits.maxMegabytes} MB. Used in the
            top bar, sidebar and account card.
          </p>
          {!isProfileImageStorageConfigured && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700">
              Upload is disabled until Supabase Storage is configured.
            </p>
          )}
          {user?.isDemo && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700">
              Demo mode cannot upload photos. Sign in with a Firebase account.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[10px] leading-relaxed text-red-700">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {file ? (
              <>
                <Button size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? 'Uploading…' : 'Save photo'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={!canUpload || uploading}
              >
                <Camera className="h-3.5 w-3.5" /> {avatarUrl ? 'Replace photo' : 'Upload photo'}
              </Button>
            )}
            {avatarUrl && !file && !confirmRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemove(true)}
                disabled={removing}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
            {confirmRemove && (
              <>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleRemove}
                  disabled={removing}
                >
                  {removing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Confirm remove
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
