import { useCallback, useEffect, useRef, useState } from 'react'
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
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
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
import {
  getSupportTicketStats,
  listSupportTicketsPage,
  searchSupportTickets,
  type AdminTicketStats,
} from '../../services/cloud/adminRepository'
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

const PAGE_SIZE = 12

const EMPTY_STATS: AdminTicketStats = {
  total: 0,
  open: 0,
  inProgress: 0,
  waiting: 0,
  resolved: 0,
  urgent: 0,
}

export default function AdminHelpDeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [stats, setStats] = useState<AdminTicketStats>(EMPTY_STATS)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [querySearch, setQuerySearch] = useState('')
  const [status, setStatus] = useState<SupportStatus | 'all'>('all')
  const [priority, setPriority] = useState<SupportPriority | 'all'>('all')
  const [category, setCategory] = useState<SupportCategory | 'all'>('all')
  const [assignee, setAssignee] = useState<'all' | 'unassigned'>('all')
  const [page, setPage] = useState(1)
  const [cursors, setCursors] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([
    null,
  ])
  const [nextCursor, setNextCursor] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [bounded, setBounded] = useState(false)
  const [searchCapped, setSearchCapped] = useState(false)
  const [version, setVersion] = useState(0)
  const filterSignature = useRef('|all|all|all|all')

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    getSupportTicketStats()
      .then(setStats)
      .catch(() => undefined)
  }, [version])

  useEffect(() => {
    const timer = window.setTimeout(() => setQuerySearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const signature = `${querySearch}|${status}|${priority}|${category}|${assignee}`
    if (filterSignature.current !== signature) {
      filterSignature.current = signature
      const timer = window.setTimeout(() => {
        setPage(1)
        setCursors([null])
        setNextCursor(null)
      }, 300)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [querySearch, status, priority, category, assignee])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const run = async () => {
      try {
        if (querySearch) {
          const result = await searchSupportTickets({
            search: querySearch,
            status,
            priority,
            category,
            assignee,
          })
          if (cancelled) return
          setTickets(result.tickets)
          setTotal(result.tickets.length)
          setBounded(true)
          setSearchCapped(result.capped)
          setNextCursor(null)
        } else {
          const result = await listSupportTicketsPage({
            pageSize: PAGE_SIZE,
            cursor: cursors[page - 1] ?? null,
            status,
            priority,
            category,
            assignee,
          })
          if (cancelled) return
          setTickets(result.tickets)
          setTotal(result.total)
          setBounded(result.mode === 'bounded')
          setSearchCapped(false)
          setNextCursor(result.nextCursor)
        }
        setError(null)
      } catch (reason) {
        if (!cancelled) setError((reason as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [assignee, category, cursors, page, priority, querySearch, status, version])

  const pageCount = Math.max(1, Math.ceil((bounded ? tickets.length : total) / PAGE_SIZE))
  const paged = bounded
    ? tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : tickets
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const last = bounded
    ? Math.min(page * PAGE_SIZE, tickets.length)
    : Math.min((page - 1) * PAGE_SIZE + tickets.length, total)

  const nextPage = () => {
    if (page >= pageCount) return
    if (!bounded && nextCursor) {
      setCursors((current) => {
        const copy = [...current]
        copy[page] = nextCursor
        return copy
      })
    }
    setPage((value) => value + 1)
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Support operations"
        title="Help Desk"
        subtitle="Every member ticket, conversation and assignment in one operational queue."
        actions={
          <button type="button" onClick={reload} className={buttonClasses('outline', 'sm')}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh queue
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <AdminStat icon={CircleHelp} label="Total tickets" value={stats.total} accent />
        <AdminStat icon={MessageSquare} label="Open" value={stats.open} />
        <AdminStat icon={Clock3} label="In progress" value={stats.inProgress} />
        <AdminStat icon={Users} label="Waiting for user" value={stats.waiting} />
        <AdminStat
          icon={Filter}
          label="Urgent tickets"
          value={stats.urgent}
          note={`${stats.resolved} resolved / closed`}
        />
      </div>

      <AdminPanel className="mt-4" bodyClassName="p-0">
        <div className="grid gap-2 border-b border-charcoal/8 p-4 sm:grid-cols-2 lg:grid-cols-6 sm:px-5">
          <label className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ticket ID, name or email"
              aria-label="Search tickets"
              className="w-full rounded-xl border border-charcoal/12 bg-ivory/50 py-2.5 pl-9 pr-3 text-[12px] focus:border-orange-500 focus:outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            aria-label="Filter by status"
            className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            {SUPPORT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as typeof priority)}
            aria-label="Filter by priority"
            className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All priorities</option>
            {SUPPORT_PRIORITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
            aria-label="Filter by category"
            className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All categories</option>
            {SUPPORT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value as typeof assignee)}
            aria-label="Filter by assignment"
            className="rounded-xl border border-charcoal/12 bg-white px-2.5 py-2.5 text-[10px] font-semibold text-charcoal/60 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All assignments</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {loading ? (
          <AdminLoading label="Loading support queue…" />
        ) : error ? (
          <div className="p-5">
            <AdminError message={error} />
          </div>
        ) : paged.length === 0 ? (
          <AdminEmptyState
            icon={CircleHelp}
            title={
              querySearch || status !== 'all' || priority !== 'all' || category !== 'all' || assignee !== 'all'
                ? 'No tickets match those filters'
                : 'No support tickets yet'
            }
            description={
              querySearch || status !== 'all' || priority !== 'all' || category !== 'all' || assignee !== 'all'
                ? 'Adjust the filters to widen the queue.'
                : 'Member help requests will appear here as soon as they are submitted.'
            }
          />
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
                  {paged.map((ticket) => (
                    <tr key={ticket.id} className="text-[11px] hover:bg-ivory/40">
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/help-desk/${ticket.id}`} className="group block max-w-[250px]">
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-orange-600">
                            {ticket.ticketId}
                          </span>
                          <span className="mt-0.5 block truncate font-semibold text-charcoal group-hover:text-orange-700">
                            {ticket.subject}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[150px] truncate font-medium text-charcoal/70">
                          {ticket.userName}
                        </p>
                        <p className="max-w-[170px] truncate text-[9px] text-charcoal/35">
                          {ticket.userEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/50">
                        {supportCategoryLabel(ticket.category)}
                      </td>
                      <td className="px-4 py-3.5">
                        <SupportPriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-3.5">
                        <SupportStatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/45">
                        {ticket.assignedAdminName || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal/45">
                        {formatDate(new Date(ticket.lastMessageAt))}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/admin/help-desk/${ticket.id}`}
                          className={buttonClasses('outline', 'sm', '!min-h-[32px] !px-2.5 !text-[8px]')}
                        >
                          Manage <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-charcoal/8 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                Showing {first}–{last} of {bounded ? tickets.length : total}
                {bounded ? ' · bounded result set' : ''}
                {searchCapped ? ' · search capped at 50' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
                  aria-label="Previous ticket page"
                >
                  ‹
                </button>
                <span className="px-2 text-[10px] font-semibold text-charcoal/50">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount || loading}
                  onClick={nextPage}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/50 disabled:opacity-30"
                  aria-label="Next ticket page"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </AdminPanel>
      <p className="mt-3 text-[9px] leading-relaxed text-charcoal/35">
        Status filtering is server-paginated. Search uses ticket ID, email or name prefixes. Combining
        priority, category or assignment filters uses a bounded scan of up to 500 matching records
        instead of creating an index for every filter combination.
      </p>
    </div>
  )
}
