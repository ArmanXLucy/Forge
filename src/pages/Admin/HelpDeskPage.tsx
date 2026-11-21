import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleHelp,
  Clock3,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react'
import {
  AdminEmptyState,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPanel,
  AdminStat,
  SupportPriorityBadge,
  SupportStatusBadge,
} from '../../components/admin/ui'
import { buttonClasses } from '../../components/ui/Button'
import { getAllTickets } from '../../services/cloud/adminRepository'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  supportCategoryLabel,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '../../types/support'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function AdminHelpDeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<SupportStatus | 'all'>('all')
  const [priority, setPriority] = useState<SupportPriority | 'all'>('all')
  const [category, setCategory] = useState<SupportCategory | 'all'>('all')
  const [assignee, setAssignee] = useState<'all' | 'unassigned'>('all')

  const load = async () => {
    setLoading(true)
    try {
      setTickets(await getAllTickets())
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return tickets.filter((ticket) => {
      if (status !== 'all' && ticket.status !== status) return false
      if (priority !== 'all' && ticket.priority !== priority) return false
      if (category !== 'all' && ticket.category !== category) return false
      if (assignee === 'unassigned' && ticket.assignedAdminId) return false
      if (!needle) return true
      return (
        ticket.subject.toLowerCase().includes(needle) ||
        ticket.ticketId.toLowerCase().includes(needle) ||
        ticket.userName.toLowerCase().includes(needle) ||
        ticket.userEmail.toLowerCase().includes(needle)
      )
    })
  }, [tickets, search, status, priority, category, assignee])

  const stats = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
    waiting: tickets.filter((ticket) => ticket.status === 'waiting_for_user').length,
    resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent' && !['resolved', 'closed'].includes(ticket.status)).length,
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Support operations"
        title="Help Desk"
        subtitle="Every member ticket, conversation and assignment in one operational queue."
        actions={
          <button type="button" onClick={() => void load()} className={buttonClasses('outline', 'sm')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh queue
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat icon={CircleHelp} label="Total tickets" value={stats.total} accent />
        <AdminStat icon={MessageSquare} label="Open" value={stats.open} />
        <AdminStat icon={Clock3} label="In progress" value={stats.progress} />
        <AdminStat icon={Users} label="Waiting for user" value={stats.waiting} />
        <AdminStat icon={Filter} label="Urgent active" value={stats.urgent} note={`${stats.resolved} resolved / closed`} />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="grid gap-2 border-b border-charcoal/8 p-4 sm:grid-cols-2 lg:grid-cols-6 sm:px-5">
          <label className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, member or email" aria-label="Search tickets" className="w-full rounded-xl border border-charcoal/12 bg-ivory/50 py-2.5 pl-9 pr-3 text-[12px] focus:border-orange-500 focus:outline-none" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter by status" className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none">
            <option value="all">All statuses</option>
            {SUPPORT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} aria-label="Filter by priority" className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none">
            <option value="all">All priorities</option>
            {SUPPORT_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label="Filter by category" className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none">
            <option value="all">All categories</option>
            {SUPPORT_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={assignee} onChange={(event) => setAssignee(event.target.value as typeof assignee)} aria-label="Filter by assignment" className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none">
            <option value="all">All assignments</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {loading ? (
          <AdminLoading label="Loading support queue…" />
        ) : error ? (
          <div className="p-5"><AdminError message={error} /></div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState icon={CircleHelp} title={tickets.length ? 'No tickets match those filters' : 'No support tickets yet'} description={tickets.length ? 'Adjust the filters to widen the queue.' : 'Member help requests will appear here as soon as they are submitted.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5">
                  {filtered.map((ticket) => (
                    <tr key={ticket.id} className="text-[11px] hover:bg-ivory/40">
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/help-desk/${ticket.id}`} className="group block max-w-[250px]">
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-orange-600">{ticket.ticketId}</span>
                          <span className="mt-0.5 block truncate font-semibold text-charcoal group-hover:text-orange-700">{ticket.subject}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[150px] truncate font-medium text-charcoal/70">{ticket.userName}</p>
                        <p className="max-w-[170px] truncate text-[9px] text-charcoal/35">{ticket.userEmail}</p>
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/50">{supportCategoryLabel(ticket.category)}</td>
                      <td className="px-4 py-3.5"><SupportPriorityBadge priority={ticket.priority} /></td>
                      <td className="px-4 py-3.5"><SupportStatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3.5 text-charcoal/45">{ticket.assignedAdminName || 'Unassigned'}</td>
                      <td className="px-4 py-3.5 text-charcoal/45">{formatDate(new Date(ticket.lastMessageAt))}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link to={`/admin/help-desk/${ticket.id}`} className={buttonClasses('outline', 'sm', '!min-h-[32px] !px-2.5 !text-[8px]')}>
                          Manage <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-charcoal/8 px-5 py-3 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
              {filtered.length} ticket{filtered.length === 1 ? '' : 's'} in view
            </div>
          </>
        )}
      </AdminPanel>
    </div>
  )
}
