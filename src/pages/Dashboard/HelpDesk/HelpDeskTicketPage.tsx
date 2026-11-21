import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AdminError,
  AdminLoading,
  SupportPriorityBadge,
  SupportStatusBadge,
} from '../../../components/admin/ui'
import { buttonClasses } from '../../../components/ui/Button'
import { useAuth } from '../../../features/auth/AuthContext'
import { useProfileStore } from '../../../store/useProfileStore'
import {
  addTicketMessage,
  getTicket,
  getTicketMessages,
  reopenTicket,
} from '../../../services/cloud/adminRepository'
import type { SupportMessage, SupportTicket } from '../../../types/support'
import { supportCategoryLabel } from '../../../types/support'
import { formatDate } from '../../../lib/utils'
import { cn } from '../../../lib/utils'

export default function HelpDeskTicketPage() {
  const { ticketId } = useParams()
  const { user } = useAuth()
  const profile = useProfileStore((state) => state.profile)
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [reopening, setReopening] = useState(false)

  const load = async () => {
    if (!ticketId) return
    setLoading(true)
    try {
      const [nextTicket, nextMessages] = await Promise.all([
        getTicket(ticketId),
        getTicketMessages(ticketId),
      ])
      if (!nextTicket) {
        setError('This ticket could not be found.')
        setTicket(null)
      } else if (nextTicket.userId !== user?.uid) {
        setError('You do not have access to this ticket.')
        setTicket(null)
      } else {
        setTicket(nextTicket)
        setMessages(nextMessages)
        setError(null)
      }
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [ticketId, user?.uid])

  const canReply = ticket && ticket.status !== 'closed'

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ticket || !user || sending || reply.trim().length < 2) return
    setSending(true)
    try {
      await addTicketMessage({
        ticket,
        senderId: user.uid,
        senderName: profile?.name ?? user.displayName ?? 'Athlete',
        senderRole: 'user',
        message: reply,
      })
      setReply('')
      await load()
      toast.success('Reply sent.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setSending(false)
    }
  }

  const handleReopen = async () => {
    if (!ticket || reopening) return
    setReopening(true)
    try {
      await reopenTicket(ticket.id)
      await load()
      toast.success('Ticket reopened.')
    } catch (reason) {
      toast.error((reason as Error).message)
    } finally {
      setReopening(false)
    }
  }

  const conversation = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        mine: message.senderRole === 'user',
      })),
    [messages],
  )

  if (loading) {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-white">
        <AdminLoading label="Opening ticket…" />
      </div>
    )
  }
  if (error || !ticket) {
    return (
      <div>
        <Link to="/dashboard/help-desk" className="mb-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40 hover:text-charcoal">
          <ArrowLeft className="h-3.5 w-3.5" /> Help Desk
        </Link>
        <div className="rounded-2xl border border-charcoal/10 bg-white p-5">
          <AdminError message={error ?? 'Ticket not found.'} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => navigate('/dashboard/help-desk')} className="mb-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/40 hover:text-charcoal">
        <ArrowLeft className="h-3.5 w-3.5" /> Help Desk
      </button>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
          <div className="border-b border-charcoal/8 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-orange-600">{ticket.ticketId}</span>
              <SupportStatusBadge status={ticket.status} />
              <SupportPriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="mt-3 text-xl font-semibold text-charcoal sm:text-2xl">{ticket.subject}</h1>
            <p className="mt-1.5 text-[10px] text-charcoal/40">
              {supportCategoryLabel(ticket.category)} · Opened {formatDate(new Date(ticket.createdAt))}
              {ticket.assignedAdminName ? ` · Assigned to ${ticket.assignedAdminName}` : ''}
            </p>
          </div>

          <div className="space-y-4 bg-ivory/30 px-5 py-5 sm:px-6">
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-charcoal/10 bg-white px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-charcoal/35">You · original request</p>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-charcoal/70">{ticket.description}</p>
                <p className="mt-2 text-[9px] text-charcoal/30">{formatDate(new Date(ticket.createdAt))}</p>
              </div>
            </div>

            {conversation.map((message) => (
              <div key={message.id} className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3',
                    message.mine
                      ? 'rounded-br-md bg-charcoal text-white'
                      : 'rounded-bl-md border border-orange-500/20 bg-orange-500/[0.06] text-charcoal',
                  )}
                >
                  <p className={cn('text-[9px] font-bold uppercase tracking-[0.12em]', message.mine ? 'text-white/45' : 'text-orange-700')}>
                    {message.mine ? 'You' : message.senderName || 'Forge support'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed">{message.message}</p>
                  <p className={cn('mt-2 text-[9px]', message.mine ? 'text-white/30' : 'text-charcoal/30')}>
                    {formatDate(new Date(message.createdAt))}
                  </p>
                </div>
              </div>
            ))}

            {conversation.length === 0 && (
              <p className="text-center text-[10px] text-charcoal/35">No replies yet. Support will respond to your request here.</p>
            )}
          </div>

          <div className="border-t border-charcoal/8 p-4 sm:p-5">
            {canReply ? (
              <form onSubmit={sendReply}>
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={3}
                  placeholder={ticket.status === 'resolved' ? 'Reply to reopen this ticket…' : 'Write a reply…'}
                  className="field-textarea !min-h-[92px] !text-[13px]"
                  disabled={sending}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] text-charcoal/35">Do not include passwords or medical information.</p>
                  <button type="submit" disabled={sending || reply.trim().length < 2} className={buttonClasses('primary', 'sm')}>
                    <Send className="h-3.5 w-3.5" /> {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-charcoal/[0.03] px-4 py-3">
                <p className="text-[10px] text-charcoal/45">This ticket is closed. Open a new request if you still need help.</p>
                <button type="button" onClick={() => navigate('/dashboard/help-desk')} className={buttonClasses('outline', 'sm')}>Help Desk</button>
              </div>
            )}
            {ticket.status === 'resolved' && (
              <button type="button" onClick={() => void handleReopen()} disabled={reopening} className={buttonClasses('outline', 'sm', 'mt-2')}>
                <RefreshCw className="h-3.5 w-3.5" /> {reopening ? 'Reopening…' : 'Reopen ticket'}
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-charcoal/35">Ticket details</p>
            <dl className="mt-3 space-y-3 text-[10px]">
              {[
                ['Status', <SupportStatusBadge key="status" status={ticket.status} />],
                ['Priority', <SupportPriorityBadge key="priority" priority={ticket.priority} />],
                ['Category', supportCategoryLabel(ticket.category)],
                ['Created', formatDate(new Date(ticket.createdAt))],
                ['Last update', formatDate(new Date(ticket.lastMessageAt))],
                ['Messages', ticket.messageCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-start justify-between gap-3">
                  <dt className="text-charcoal/40">{label}</dt>
                  <dd className="text-right font-medium text-charcoal/70">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border border-charcoal/10 bg-white p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-charcoal/65">
              <ShieldCheck className="h-4 w-4 text-orange-500" /> Private conversation
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-charcoal/40">
              Only you and authorised support staff can read this ticket. Internal notes are hidden from members.
            </p>
          </div>
          <div className="rounded-2xl border border-charcoal/10 bg-white p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-charcoal/65">
              <Clock3 className="h-4 w-4 text-orange-500" /> Response expectations
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-charcoal/40">
              Support aims to respond within one business day. Urgent technical issues are prioritised.
            </p>
          </div>
          <Link to="/dashboard/help-desk" className="flex items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-charcoal/45 hover:text-charcoal">
            <MessageSquare className="h-3.5 w-3.5" /> All tickets
          </Link>
        </aside>
      </div>
    </div>
  )
}
