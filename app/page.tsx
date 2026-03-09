import Link from 'next/link'
import { getDashboardMetrics, getProjects, getSprintProgress, getSprints, getTasks, getTeamMembers } from '@/lib/db'
import { MetricCards } from '@/components/dashboard/metric-cards'
import { Button } from '@/components/ui/button'
import { AnalyticsPanel } from '@/components/analytics/analytics-panel'
import SCurve from '@/components/s-curve'
import { SprintProgressPanel } from '@/components/dashboard/sprint-progress-panel'
import { ReportDownloadButton, type ReportTaskRow } from '@/components/new-components/report-download-button'
import type { Task } from '@/lib/supabase'

export const revalidate = 0

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const STATUS_ORDER: Record<Task['status'], number> = {
  todo: 0,
  in_progress: 1,
  review: 2,
  done: 3,
}

function formatDate(value?: string) {
  if (!value) return ''
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function parseDateUTC(value?: string) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function diffDaysUTCISO(a?: string, b?: string) {
  const da = parseDateUTC(a)
  const db = parseDateUTC(b)
  if (!da || !db) return null
  return Math.floor((da.getTime() - db.getTime()) / 86400000)
}

function formatTimeline(start?: string, end?: string) {
  const a = formatDate(start)
  const b = formatDate(end)
  if (!a && !b) return '—'
  if (a && !b) return a
  if (!a && b) return b
  return `${a} - ${b}`
}

function priorityBadgeClass(priority: Task['priority']) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
  }
}

function statusBadgeClass(status: Task['status']) {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'review':
      return 'bg-purple-100 text-purple-800'
    case 'done':
      return 'bg-green-100 text-green-800'
  }
}

function statusLabel(status: Task['status']) {
  switch (status) {
    case 'todo':
      return 'To Do'
    case 'in_progress':
      return 'In Progress'
    case 'review':
      return 'Review'
    case 'done':
      return 'Done'
  }
}

function pct(completed: number, total: number) {
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

function toInt(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function toStr(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw ? String(raw) : ''
}

function buildHref(
  current: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | number | null | undefined>
) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(current)) {
    const val = toStr(v)
    if (!val) continue
    params.set(k, val)
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null || v === '') {
      params.delete(k)
      continue
    }
    params.set(k, String(v))
  }
  if (params.get('page') === '1') params.delete('page')
  if (params.get('pageSize') === '10') params.delete('pageSize')
  const qs = params.toString()
  return qs ? `/?${qs}` : '/'
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = toStr(sp.q).trim()
  const statusFilterRaw = toStr(sp.status).trim()
  const priorityFilterRaw = toStr(sp.priority).trim()
  const sprintIdFilterRaw = toStr(sp.sprintId).trim()
  const sortRaw = toStr(sp.sort).trim()
  const orderRaw = toStr(sp.order).trim()

  const page = Math.max(1, toInt(sp.page) ?? 1)
  const pageSizeRaw = toInt(sp.pageSize) ?? 10
  const pageSize = Math.min(50, Math.max(5, pageSizeRaw))
  const order: 'asc' | 'desc' = orderRaw === 'desc' ? 'desc' : 'asc'
  const sort: 'priority' | 'title' | 'sprint' | 'timeline' | 'duration' | 'status' =
    sortRaw === 'title' || sortRaw === 'sprint' || sortRaw === 'timeline' || sortRaw === 'duration' || sortRaw === 'status'
      ? sortRaw
      : 'priority'

  const metrics = await getDashboardMetrics()
  const progressData = metrics.currentSprint ? await getSprintProgress(metrics.currentSprint.id) : []
  const teamMembers = await getTeamMembers()
  const memberById = new Map(teamMembers.map((m) => [m.id, m.name]))
  const teamById = new Map(teamMembers.map((m) => [m.id, m.team]))
  const projects = await getProjects()
  const activeProjects = projects.filter((p) => p.status === 'active')
  const sprintEntriesNested = await Promise.all(
    activeProjects.map(async (p) => {
      const sprintList = await getSprints(p.id)
      return Promise.all(
        sprintList.map(async (sprint) => {
          const tasks = await getTasks(sprint.id)
          return { sprint, tasks }
        })
      )
    })
  )
  const sprintEntries = sprintEntriesNested.flat()
  const taskRows = sprintEntries.flatMap((x) =>
    x.tasks.map((t) => ({
      task: t,
      sprint: x.sprint,
    }))
  )

  console.log(activeProjects)
  console.log(sprintEntries)
  console.log(taskRows)

  const sprintOptions = sprintEntries
    .map((x) => x.sprint)
    .sort((a, b) => a.name.localeCompare(b.name))

  const statusFilter =
    statusFilterRaw === 'todo' ||
    statusFilterRaw === 'in_progress' ||
    statusFilterRaw === 'review' ||
    statusFilterRaw === 'done'
      ? (statusFilterRaw as Task['status'])
      : ''

  const priorityFilter =
    priorityFilterRaw === 'low' ||
    priorityFilterRaw === 'medium' ||
    priorityFilterRaw === 'high' ||
    priorityFilterRaw === 'urgent'
      ? (priorityFilterRaw as Task['priority'])
      : ''

  const sprintIdFilter =
    sprintIdFilterRaw && sprintOptions.some((s) => s.id === sprintIdFilterRaw) ? sprintIdFilterRaw : ''

  const filteredRows = taskRows.filter(({ task, sprint }) => {
    if (statusFilter && task.status !== statusFilter) return false
    if (priorityFilter && task.priority !== priorityFilter) return false
    if (sprintIdFilter && sprint.id !== sprintIdFilter) return false
    if (q) {
      const memberName = task.assigned_to ? memberById.get(task.assigned_to) || '' : ''
      const memberTeam = task.assigned_to ? teamById.get(task.assigned_to) || '' : ''
      const hay = `${task.title ?? ''} ${task.description ?? ''} ${sprint.name ?? ''} ${memberName} ${memberTeam}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const dir = order === 'asc' ? 1 : -1
  const sortedRows = filteredRows.sort((a, b) => {
    const dateA = a.task.actual_end_date || a.task.end_date || a.task.start_date || a.sprint.end_date || a.sprint.start_date || ''
    const dateB = b.task.actual_end_date || b.task.end_date || b.task.start_date || b.sprint.end_date || b.sprint.start_date || ''

    let cmp = 0
    switch (sort) {
      case 'title':
        cmp = (a.task.title || '').localeCompare(b.task.title || '')
        break
      case 'sprint':
        cmp = (a.sprint.name || '').localeCompare(b.sprint.name || '')
        break
      case 'timeline':
        cmp = (dateA || '').localeCompare(dateB || '')
        break
      case 'duration': {
        const da = a.task.duration_days == null ? Number.POSITIVE_INFINITY : a.task.duration_days
        const db = b.task.duration_days == null ? Number.POSITIVE_INFINITY : b.task.duration_days
        cmp = da - db
        break
      }
      case 'status':
        cmp = STATUS_ORDER[a.task.status] - STATUS_ORDER[b.task.status]
        break
      case 'priority':
      default:
        cmp = PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]
        break
    }

    if (cmp !== 0) return cmp * dir

    const tiePriority = PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority]
    if (tiePriority !== 0) return tiePriority
    return (dateA || '').localeCompare(dateB || '')
  })

  const totalTasks = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalTasks / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pagedRows = sortedRows.slice(startIndex, endIndex)
  const reportTasks: ReportTaskRow[] = sortedRows.map(({ task, sprint }) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    task_type: task.task_type,
    assignee_name: task.assigned_to ? memberById.get(task.assigned_to) || 'Unknown' : 'Unassigned',
    assignee_team: task.assigned_to ? teamById.get(task.assigned_to) || 'Unknown' : '—',
    sprint_name: sprint.name,
    start_date: task.start_date || sprint.start_date,
    end_date: task.end_date || sprint.end_date,
    actual_end_date: task.actual_end_date,
    duration_days: task.duration_days ?? null,
    story_points: task.story_points ?? null,
  }))

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monitoring</h1>
            <p className="text-muted-foreground mt-2">Kurva S, progress sprint, analytics, dan daftar task</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <ReportDownloadButton tasks={reportTasks} />
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/analytics">Analytics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/tasks">Tasks</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/team">Team</Link>
            </Button>
          </div>
        </div>

        <MetricCards metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div id="report-chart">
              <SCurve
                projectId={metrics.currentSprint?.project_id}
                progress={progressData}
                sprintStartDate={metrics.currentSprint?.start_date}
                sprintEndDate={metrics.currentSprint?.end_date}
              />
            </div>
          </div>

          <div id="report-sprint-progress" className="space-y-4">
            <SprintProgressPanel defaultSprintId={metrics.currentSprint?.id} />
          </div>
        </div>

        <div id="report-table" className="bg-card border rounded-lg">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/tasks">Buka Kanban</Link>
            </Button>
          </div>
          <div className="px-6 py-4 border-b">
            <form className="flex flex-col flex-wrap lg:flex-row lg:items-end gap-3" method="GET" action="/">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-2">Cari</label>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Cari task, deskripsi, atau sprint..."
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="min-w-[180px]">
                <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                <select
                  name="priority"
                  defaultValue={priorityFilter}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Semua</option>
                  <option value="urgent">urgent</option>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>

              <div className="min-w-[180px]">
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Semua</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="min-w-[220px]">
                <label className="block text-sm font-medium text-foreground mb-2">Sprint</label>
                <select
                  name="sprintId"
                  defaultValue={sprintIdFilter}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Semua</option>
                  {sprintOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-foreground mb-2">Sort</label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="priority">Priority</option>
                  <option value="timeline">Target Timeline</option>
                  <option value="duration">Duration</option>
                  <option value="status">Status</option>
                  <option value="sprint">Sprint</option>
                  <option value="title">Task</option>
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className="block text-sm font-medium text-foreground mb-2">Order</label>
                <select
                  name="order"
                  defaultValue={order}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>

              <div className="min-w-[160px]">
                <label className="block text-sm font-medium text-foreground mb-2">Per halaman</label>
                <select
                  name="pageSize"
                  defaultValue={String(pageSize)}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Terapkan
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">Reset</Link>
                </Button>
              </div>
            </form>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium text-muted-foreground">Priority</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Task/Deliverable</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Member</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Team</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Sprint</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Target Timeline</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Duration</th>
                  <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={8}>
                      Tidak ada task dari sprint aktif.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map(({ task, sprint }) => (
                    <tr key={task.id} className="border-t">
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${priorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-foreground line-clamp-1">{task.title}</div>
                        <div className="mt-1">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-xs text-primary underline underline-offset-2"
                          >
                            Detail
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        {task.assigned_to ? memberById.get(task.assigned_to) || 'Unknown' : 'Unassigned'}
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        {task.assigned_to ? teamById.get(task.assigned_to) || 'Unknown' : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-foreground">{sprint.name}</div>
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        <div>
                          <div>
                            {formatTimeline(task.start_date || sprint.start_date, task.end_date || sprint.end_date)}
                          </div>
                          {task.actual_end_date && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {(() => {
                                const target = task.end_date || sprint.end_date
                                const delta = diffDaysUTCISO(task.actual_end_date, target) ?? 0
                                const suffix =
                                  target && delta !== 0
                                    ? delta > 0
                                      ? ` • Terlambat ${delta} hari`
                                      : ` • Lebih cepat ${Math.abs(delta)} hari`
                                    : target
                                      ? ' • Tepat waktu'
                                      : ''
                                return `Aktual: ${formatDate(task.actual_end_date)}${suffix}`
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        {task.duration_days ? `${task.duration_days} hari` : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${statusBadgeClass(
                            task.status
                          )}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan {totalTasks === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalTasks)} dari {totalTasks}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm" disabled={safePage <= 1}>
                <Link href={buildHref(sp, { page: Math.max(1, safePage - 1) })}>Sebelumnya</Link>
              </Button>
              <div className="text-sm text-muted-foreground">
                Halaman {safePage} / {totalPages}
              </div>
              <Button asChild variant="outline" size="sm" disabled={safePage >= totalPages}>
                <Link href={buildHref(sp, { page: Math.min(totalPages, safePage + 1) })}>Berikutnya</Link>
              </Button>
            </div>
          </div>
        </div>

        <AnalyticsPanel showTitle={false} />
      </div>
    </main>
  )
}
