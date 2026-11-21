import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MessageSquare,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, StatCard } from '../../../components/dashboard/ui'
import { AdminEmptyState, AdminError, AdminLoading, SupportPriorityBadge, SupportStatusBadge } from '../../../components/admin/ui'
import { Modal } from '../../../components/ui/Modal'
import { Button, buttonClasses } from '../../../components/ui/Button'
import { useAuth } from '../../../features/auth/AuthContext'
import { useProfileStore } from '../../../store/useProfileStore'
import { createTicket, getUserTickets } from '../../../services/cloud/adminRepository'
import {
  SUPPORT_CATEGORIES,
  supportCategoryLabel,
  type SupportCategory,
  type SupportTicket,
} from '../../../types/support'
import { formatDate } from '../../../lib/utils'
import { cn } from '../../../lib/utils'

export default function HelpDeskPage() {
  const { user } = useAuth()
  const profile = useProfileStore((state) => state.profile)
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportCategory>('account')
  const [description, setDescription] = useState('')

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      setTickets(await getUserTickets(user.uid))
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [user?.uid])

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length,
      waiting: tickets.filter((ticket) => ticket.status === 'waiting_for_user').length,
      resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    }),
    [tickets],
  )

  const filtered = useMemo(() => {
    if (filter === 'active') return tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
    if (filter === 'resolved') return tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status))
    return tickets
  }, [tickets, filter])

  const resetForm = () => {
    setSubject('')
    setCategory('account')
    setDescription('')
    setFormError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user || submitting) return
    if (subject.trim().length < 4) {
      setFormError('Add a subject of at least 4 characters.')
      return
    }
    if (description.trim().length < 10) {
      setFormError('Describe the issue in at least 10 characters.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const ticket = await createTicket({
        userId: user.uid,
        userName: profile?.name ?? user.displayName ?? 'Athlete',
        userEmail: user.email ?? '',
        subject,
        category,
        priority: 'medium',
        description,
      })
      setOpen(false)
      resetForm()
      toast.success(`Ticket ${ticket.ticketId} created.`)
      navigate(`/dashboard/help-desk/${ticket.id}`)
    } catch (reason) {
      setFormError((reason as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Help & support"
        title="Help Desk"
        subtitle="We're here to help you get the most out of Forge Athletic."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={MessageSquare} label="Total tickets" value={stats.total} note="all requests" accent />
        <StatCard icon={CircleHelp} label="Open" value={stats.open} note="being handled" />
        <StatCard icon={Clock3} label="Awaiting response" value={stats.waiting} note="support replied" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} note="resolved or closed" />
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/8 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1 rounded-full bg-ivory p-1">
            {[
              ['all', 'All'],
              ['active', 'Active'],
              ['resolved', 'Resolved'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as typeof filter)}
                className={cn(
                  'min-h-[30px] rounded-full px-3 text-[9px] font-bold uppercase tracking-[0.1em]',
                  filter === value ? 'bg-charcoal text-white' : 'text-charcoal/45',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
            Private to your account
          </p>
        </div>

        {loading ? (
          <AdminLoading label="Loading your tickets…" />
        ) : error ? (
          <div className="p-5"><AdminError message={error} /></div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={MessageSquare}
            title={tickets.length ? 'No tickets in this view' : 'No support tickets yet'}
            description={tickets.length ? 'Switch filters to see your other requests.' : 'Open a ticket when you need help with your account, training, AI Coach or nutrition.'}
            action={
              <button type="button" onClick={() => setOpen(true)} className={buttonClasses('primary', 'sm')}>
                <Plus className="h-3.5 w-3.5" /> Create your first ticket
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-charcoal/5">
            {filtered.map((ticket) => (
              <li key={ticket.id}>
                <Link to={`/dashboard/help-desk/${ticket.id}`} className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-ivory/50 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-orange-600">{ticket.ticketId}</span>
                      <SupportStatusBadge status={ticket.status} />
                      <SupportPriorityBadge priority={ticket.priority} />
                    </div>
                    <p className="mt-1.5 truncate text-[13px] font-semibold text-charcoal">{ticket.subject}</p>
                    <p className="mt-0.5 text-[10px] text-charcoal/40">
                      {supportCategoryLabel(ticket.category)} · Updated {formatDate(new Date(ticket.lastMessageAt))}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="inline-flex items-center gap-1 text-[9px] text-charcoal/35">
                      <MessageSquare className="h-3 w-3" /> {ticket.messageCount}
                    </span>
                    <ArrowRight className="h-4 w-4 text-charcoal/25 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-charcoal/10 bg-white px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <p className="text-[10px] leading-relaxed text-charcoal/45">
          Tickets are stored under your authenticated Firebase UID. Only you and authorised support
          staff can read them. Internal administrator notes are never exposed here.
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => {
          if (!submitting) {
            setOpen(false)
            resetForm()
          }
        }}
        title="New support ticket"
        description="Tell us what you need help with. Support replies appear in the ticket conversation."
        size="md"
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="field-label">Subject</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} required placeholder="Short summary of the issue" className="field-input !py-2.5 !text-[13px]" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)} className="field-input !py-2.5 !text-[13px]">
                {SUPPORT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <div className="rounded-xl border border-charcoal/8 bg-charcoal/[0.025] p-3">
              <span className="field-label">Priority</span>
              <p className="mt-1 text-[12px] font-medium text-charcoal/60">Set by the support team after review.</p>
            </div>
          </div>
          <label className="block">
            <span className="field-label">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} required maxLength={5000} rows={6} placeholder="What happened? Include any steps you already tried." className="field-textarea !text-[13px]" />
            <span className="mt-1 block text-right text-[9px] text-charcoal/30">{description.length}/5000</span>
          </label>
          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{formError}</p>}
          <p className="text-[9px] leading-relaxed text-charcoal/35">
            File attachments are not enabled in this release. Do not include medical or sensitive health information.
          </p>
          <div className="flex justify-end gap-2 border-t border-charcoal/8 pt-4">
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('outline', 'sm')} disabled={submitting}>Cancel</button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Creating ticket…' : 'Create ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
