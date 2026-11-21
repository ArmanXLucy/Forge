import { useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminEmptyState, AdminError, AdminLoading, AdminPageHeader, AdminPanel } from './ui'
import { Modal } from '../ui/Modal'
import { Button, buttonClasses } from '../ui/Button'
import { deleteContent, listContent, saveContent } from '../../services/cloud/adminRepository'

export type EntityField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  required?: boolean
  hint?: string
  full?: boolean
}

export type EntityColumn = {
  key: string
  label: string
  className?: string
}

type Row = Record<string, unknown> & { id: string }

const blankValues = (fields: EntityField[]) =>
  Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.type === 'checkbox' ? false : field.type === 'number' ? '' : '',
    ]),
  ) as Record<string, string | boolean>

export function EntityManager({
  collection,
  eyebrow,
  title,
  subtitle,
  entityName,
  fields,
  columns,
  defaults,
}: {
  collection: string
  eyebrow: string
  title: string
  subtitle: string
  entityName: string
  fields: EntityField[]
  columns: EntityColumn[]
  defaults: Record<string, string | boolean | number>
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [values, setValues] = useState<Record<string, string | boolean>>(
    blankValues(fields),
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows((await listContent<Row>(collection)) as Row[])
      setError(null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [collection])

  const startCreate = () => {
    setEditing(null)
    setValues({ ...blankValues(fields), ...defaults } as Record<string, string | boolean>)
    setFormError(null)
    setOpen(true)
  }

  const startEdit = (row: Row) => {
    setEditing(row)
    const next = blankValues(fields)
    fields.forEach((field) => {
      const value = row[field.key]
      next[field.key] =
        field.type === 'checkbox'
          ? value === true
          : value === undefined || value === null
            ? ''
            : String(value)
    })
    setValues(next)
    setFormError(null)
    setOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    for (const field of fields) {
      if (field.required && String(values[field.key] ?? '').trim().length === 0) {
        setFormError(`${field.label} is required.`)
        return
      }
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload: Record<string, unknown> = {}
      fields.forEach((field) => {
        const value = values[field.key]
        payload[field.key] =
          field.type === 'number'
            ? value === '' ? 0 : Number(value)
            : field.type === 'checkbox'
              ? value === true
              : String(value ?? '').trim()
      })
      await saveContent(collection, editing?.id ?? '', payload)
      await load()
      setOpen(false)
      toast.success(`${entityName} saved.`)
    } catch (reason) {
      setFormError((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: Row) => {
    const label = String(row[columns[0]?.key ?? 'name'] ?? entityName)
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return
    try {
      await deleteContent(collection, row.id)
      setRows((items) => items.filter((item) => item.id !== row.id))
      toast.success(`${entityName} deleted.`)
    } catch (reason) {
      toast.error((reason as Error).message)
    }
  }

  const filtered = rows.filter((row) => {
    if (!search.trim()) return true
    const needle = search.toLowerCase()
    return Object.values(row).some((value) =>
      String(value ?? '').toLowerCase().includes(needle),
    )
  })

  return (
    <div>
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={<Button size="sm" onClick={startCreate}><Plus className="h-3.5 w-3.5" /> New {entityName.toLowerCase()}</Button>}
      />
      <AdminPanel bodyClassName="p-0">
        <div className="flex flex-col gap-3 border-b border-charcoal/8 p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${entityName.toLowerCase()} records`} aria-label={`Search ${entityName}`} className="w-full rounded-xl border border-charcoal/12 bg-ivory/50 py-2.5 pl-9 pr-3 text-[12px] focus:border-orange-500 focus:outline-none" />
          </label>
          <span className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">{filtered.length} records · Firestore</span>
        </div>
        {loading ? (
          <AdminLoading label={`Loading ${entityName.toLowerCase()} records…`} />
        ) : error ? (
          <div className="p-5"><AdminError message={error} /></div>
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title={rows.length ? `No ${entityName.toLowerCase()} records match` : `No ${entityName.toLowerCase()} records yet`}
            description={rows.length ? 'Change the search to widen the result set.' : `Create the first ${entityName.toLowerCase()} record in Firestore.`}
            action={<Button size="sm" onClick={startCreate}><Plus className="h-3.5 w-3.5" /> New {entityName.toLowerCase()}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-charcoal/8 text-[8px] font-bold uppercase tracking-[0.14em] text-charcoal/35">
                  {columns.map((column) => <th key={column.key} className={`px-4 py-3 first:pl-5 ${column.className ?? ''}`}>{column.label}</th>)}
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                {filtered.map((row) => (
                  <tr key={row.id} className="text-[11px] hover:bg-ivory/40">
                    {columns.map((column) => (
                      <td key={column.key} className={`px-4 py-3.5 first:pl-5 ${column.className ?? ''}`}>
                        <CellValue field={fields.find((field) => field.key === column.key)} value={row[column.key]} />
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => startEdit(row)} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/45 hover:text-orange-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => void remove(row)} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-charcoal/10 text-charcoal/45 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <Modal
        open={open}
        onClose={() => { if (!saving) setOpen(false) }}
        title={`${editing ? 'Edit' : 'New'} ${entityName.toLowerCase()}`}
        description="Saved directly to the connected Firestore database."
        size="lg"
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className={field.full || field.type === 'textarea' ? 'sm:col-span-2' : undefined}>
                <span className="field-label">{field.label}{field.required ? ' *' : ''}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={String(values[field.key] ?? '')}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    rows={3}
                    placeholder={field.placeholder}
                    className="field-textarea !min-h-[84px] !text-[13px]"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={String(values[field.key] ?? '')}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="field-input !py-2.5 !text-[13px]"
                  >
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <span className="flex min-h-[42px] items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-3">
                    <input
                      type="checkbox"
                      checked={values[field.key] === true}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <span className="text-[11px] text-charcoal/55">{field.hint ?? 'Enabled'}</span>
                  </span>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(values[field.key] ?? '')}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="field-input !py-2.5 !text-[13px]"
                  />
                )}
                {field.type !== 'checkbox' && field.hint && <span className="mt-1 block text-[9px] text-charcoal/35">{field.hint}</span>}
              </label>
            ))}
          </div>
          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{formError}</p>}
          <div className="flex justify-end gap-2 border-t border-charcoal/8 pt-4">
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('outline', 'sm')} disabled={saving}>Cancel</button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {saving ? 'Saving…' : `Save ${entityName.toLowerCase()}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function CellValue({ field, value }: { field?: EntityField; value: unknown }) {
  if (field?.type === 'checkbox') {
    return <span className={value === true ? 'font-semibold text-emerald-700' : 'text-charcoal/35'}>{value === true ? 'Yes' : 'No'}</span>
  }
  if (field?.type === 'select' && field.options) {
    const label = field.options.find((option) => option.value === String(value))?.label ?? String(value ?? '—')
    return <span className="inline-flex rounded-full border border-charcoal/10 bg-charcoal/[0.03] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-charcoal/55">{label}</span>
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return <span className="text-charcoal/45">{formatDate((value as { toDate: () => Date }).toDate())}</span>
    } catch {
      return <span>—</span>
    }
  }
  return <span className="text-charcoal/55">{String(value ?? '—')}</span>
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
