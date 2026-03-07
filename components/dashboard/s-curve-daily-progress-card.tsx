'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SprintProgress } from '@/lib/supabase'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatDay(value: string) {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
}

function pct(completed: number, total: number) {
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

function parseDateUTC(value: string) {
  const parts = value.split('-').map((v) => parseInt(v, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function diffDaysUTC(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime()
  return Math.floor(ms / 86400000)
}

function clampPct(value: number) {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

export function SCurveDailyProgressCard({
  data,
  title = 'Daily Progress',
  sprintStartDate,
  sprintEndDate,
}: {
  data: SprintProgress[]
  title?: string
  sprintStartDate?: string
  sprintEndDate?: string
}) {
  const rows = [...(data || [])].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const inferredStart = rows.length > 0 ? rows[0].date : ''
  const inferredEnd = rows.length > 0 ? rows[rows.length - 1].date : ''

  const startDt =
    (sprintStartDate ? parseDateUTC(sprintStartDate) : null) || (inferredStart ? parseDateUTC(inferredStart) : null)
  const endDt =
    (sprintEndDate ? parseDateUTC(sprintEndDate) : null) || (inferredEnd ? parseDateUTC(inferredEnd) : null)

  const denom = startDt && endDt ? Math.max(1, diffDaysUTC(endDt, startDt)) : 1

  const chartData = rows.map((r) => {
    const dt = parseDateUTC(r.date)
    const expected =
      startDt && dt
        ? clampPct((diffDaysUTC(dt, startDt) / denom) * 100)
        : 0
    const actual = pct(r.completed_tasks, r.total_tasks)
    const onTrack = actual >= expected
    return {
      id: r.id,
      date: formatDay(r.date),
      actual,
      expected,
      onTrackValue: onTrack ? actual : null,
      lateValue: onTrack ? null : actual,
      completed_tasks: r.completed_tasks,
      total_tasks: r.total_tasks,
      completed_story_points: r.completed_story_points,
      total_story_points: r.total_story_points,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Area hijau = on track, area merah = terlambat terhadap target timeline</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground">No progress data available yet</div>
        ) : (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(value, name, item) => {
                    const payload = item?.payload as any
                    if (name === 'expected') return [`${payload.expected}%`, 'Target']
                    if (name === 'onTrackValue' || name === 'lateValue') return [`${payload.actual}%`, 'Actual']
                    return [value as any, name]
                  }}
                  labelFormatter={(label) => `Hari: ${label}`}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: `1px solid var(--border)`,
                  }}
                />
                <Legend
                  formatter={(value) => {
                    if (value === 'onTrackValue') return 'On Track'
                    if (value === 'lateValue') return 'Terlambat'
                    if (value === 'expected') return 'Target'
                    return value as any
                  }}
                />

                <Line type="monotone" dataKey="expected" stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" dot={false} />
                <Area
                  type="monotone"
                  dataKey="onTrackValue"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.25}
                  connectNulls
                  name="On Track"
                />
                <Area
                  type="monotone"
                  dataKey="lateValue"
                  stroke="#dc2626"
                  fill="#dc2626"
                  fillOpacity={0.25}
                  connectNulls
                  name="Terlambat"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
