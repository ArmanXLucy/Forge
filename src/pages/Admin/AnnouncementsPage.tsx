import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Megaphone, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
} from '../../components/admin/ui'
import { Modal } from '../../components/ui/Modal'
import { Button, buttonClasses } from '../../components/ui/Button'
import { useAdminAccess } from '../../features/admin/useAdminAccess'
import {
  deleteAnnouncement,
  listAnnouncements,
  saveAnnouncement,
  setAnnouncementPublished,
} from '../../services/cloud/adminRepository'
import type {
  Announcement,
  AnnouncementStatus,
  AnnouncementTone,
} from '../../types/admin'
import { formatDate } from '../../lib/utils'

const EMPTY_FORM = {
  title: '',
  body: '',
  tone: 'info' as AnnouncementTone,
  status: 'draft' as AnnouncementStatus,
}

export default function AnnouncementsPage() {
  const { admin } = useAdminAccess()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listAnnouncements()
      .then((result) => {
        if (cancelled) return
        setItems(result)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError((reason as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const startCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const startEdit = (item: Announcement) => {
    setEditing(item)
    setForm({
      title: item.title,
      body: item.body,
      tone: item.tone,
      status: item.status,
    })
    setOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!admin || saving) return
    if (form.title.trim().length < 3 || form.body.trim().length < 10) {
      toast.error('Add a title and at least 10 characters of announcement text.')
      return
    }
    setSaving(true)
    try {
      await saveAnnouncement({
        id: editing?.id,
        title: form.title,
        body: form.body,
        tone: form.tone,
        status: form.status,
        admin,
      })
      setOpen(false)
      setEditing(null)
      reload()
      toast.success(form.status === 'published' ? 'Announcement published.' : 'Announcement saved.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (item: Announcement) => {
    if (!admin || busyId) return
    setBusyId(item.id)
    try {
      const next = item.status !== 'published'
      await setAnnouncementPublished(item.id, next, admin)
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: next ? 'published' : 'draft',
                publishedAt: next ? new Date().toISOString() : null,
              }
            : entry,
        ),
      )
      toast.success(next ? 'Announcement published.' : 'Announcement unpublished.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (item: Announcement) => {
    if (!admin || busyId) return
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return
    setBusyId(item.id)
    try {
      await deleteAnnouncement(item.id, admin)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      toast.success('Announcement deleted.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  const published = items.filter((item) => item.status === 'published').length
  const drafts = items.filter((item) => item.status === 'draft').length
  const archived = items.filter((item) => item.status === 'archived').length

  return (
    <div>
      <AdminPageHeader
        eyebrow="Platform content"
        title="Announcements"
        subtitle="Publish durable member-facing notices. Published announcements appear on the member Overview page."
        actions={
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" /> New announcement
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStat icon={Megaphone} label="Announcements" value={items.length} accent />
        <AdminStat icon={Eye} label="Published" value={published} />
        <AdminStat icon={Pencil} label="Drafts" value={drafts} />
        <AdminStat icon={EyeOff} label="Archived" value={archived} />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        {loading ? (
          <AdminLoading label="Loading announcements…" />
        ) : error ? (
          <div className="p-5">
            <AdminError message={error} />
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Create a draft, then publish it when you are ready for members to see it."
            action={
              <Button size="sm" onClick={startCreate}>
                <Plus className="h-3.5 w-3.5" /> New announcement
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-charcoal/5">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        item.status === 'published'
                          ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-emerald-700'
                          : item.status === 'archived'
                            ? 'rounded-full bg-charcoal/[0.04] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/40'
                            : 'rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-700'
                      }
                    >
                      {item.status}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.1em] text-charcoal/30">
                      {item.tone}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] font-semibold text-charcoal">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 max-w-2xl text-[10px] leading-relaxed text-charcoal/45">
                    {item.body}
                  </p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.1em] text-charcoal/30">
                    {item.createdByName} · updated {formatDate(new Date(item.updatedAt))}
                    {item.publishedAt ? ` · published ${formatDate(new Date(item.publishedAt))}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void togglePublish(item)}
                    className={buttonClasses('outline', 'sm', '!min-h-[32px] !px-2.5 !text-[8px]')}
                  >
                    {item.status === 'published' ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3" /> Publish
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => startEdit(item)}
                    aria-label={`Edit ${item.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/45 hover:text-orange-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void remove(item)}
                    aria-label={`Delete ${item.title}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/45 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        Publishing is immediate and in-app only. No email or push provider is connected. Members can
        only read published announcement records; drafts stay visible to platform administrators.
      </p>

      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false)
        }}
        title={editing ? 'Edit announcement' : 'New announcement'}
        description="Publish a clear, durable notice for members. Markdown is not rendered."
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="field-label">Title *</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              maxLength={140}
              className="field-input !py-2.5 !text-[13px]"
              placeholder="Platform maintenance this weekend"
            />
            <span className="mt-1 block text-right text-[9px] text-charcoal/30">
              {form.title.length}/140
            </span>
          </label>
          <label className="block">
            <span className="field-label">Announcement *</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              rows={7}
              maxLength={4000}
              className="field-textarea !text-[13px]"
              placeholder="Explain what changed, who it affects and what members should do."
            />
            <span className="mt-1 block text-right text-[9px] text-charcoal/30">
              {form.body.length}/4000
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Tone</span>
              <select
                value={form.tone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tone: event.target.value as AnnouncementTone,
                  }))
                }
                className="field-input !py-2.5 !text-[13px]"
              >
                <option value="info">Information</option>
                <option value="update">Product update</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
            <label className="block">
              <span className="field-label">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as AnnouncementStatus,
                  }))
                }
                className="field-input !py-2.5 !text-[13px]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-charcoal/8 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
              className={buttonClasses('outline', 'sm')}
            >
              Cancel
            </button>
            <Button type="submit" size="sm" disabled={saving}>
              <Send className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : form.status === 'published' ? 'Save & publish' : 'Save announcement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
