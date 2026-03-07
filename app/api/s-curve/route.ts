import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type Team = 'developer' | 'designer'

const ALLOWED_TEAMS = new Set<Team>(['developer', 'designer'])

function isTeam(value: unknown): value is Team {
  return typeof value === 'string' && ALLOWED_TEAMS.has(value as Team)
}

function parseDateUTC(value: string) {
  const parts = value.split('-').map((v) => parseInt(v, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function diffDaysUTC(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000)
}

function clampPct(v: number) {
  if (v < 0) return 0
  if (v > 100) return 100
  return v
}

function weightStatus(status: string) {
  if (status === 'done') return 1
  if (status === 'review' || status === 'in_progress') return 0.5
  return 0
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId') || ''
    const view = (url.searchParams.get('view') || 'both').toLowerCase()

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, project_id, name, start_date, end_date, status')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true })

    if (sprintsError) throw sprintsError

    const sprintList = (sprints || []).filter((s) => s?.id && s?.start_date && s?.end_date)
    if (sprintList.length === 0) {
      return NextResponse.json({
        projectId,
        sprintData: [{ day: 'Start', targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }],
        dayData: [{ dayNum: 0, targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }],
        todayDay: 0,
        cutoffIndex: 0,
      })
    }

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id, team')
      .order('created_at', { ascending: false })

    if (membersError) throw membersError

    const teamById = new Map<string, Team>()
    for (const m of members || []) {
      if (m?.id && isTeam(m.team)) teamById.set(m.id, m.team)
    }

    const sprintIds = sprintList.map((s) => s.id)
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, sprint_id, status, assigned_to')
      .in('sprint_id', sprintIds)

    if (tasksError) throw tasksError

    const tasksBySprint = new Map<string, Array<{ status: string; assigned_to: string | null }>>()
    for (const t of tasks || []) {
      if (!t?.sprint_id) continue
      const arr = tasksBySprint.get(t.sprint_id) || []
      arr.push({ status: t.status, assigned_to: t.assigned_to || null })
      tasksBySprint.set(t.sprint_id, arr)
    }

    const start0 = parseDateUTC(sprintList[0].start_date)
    const endN = parseDateUTC(sprintList[sprintList.length - 1].end_date)
    if (!start0 || !endN) {
      return NextResponse.json({ error: 'Invalid sprint date range' }, { status: 500 })
    }

    const sprintMeta = sprintList.map((s, idx) => {
      const start = parseDateUTC(s.start_date)!
      const end = parseDateUTC(s.end_date)!
      const startDay = diffDaysUTC(start, start0) + 1
      const endDay = diffDaysUTC(end, start0) + 1
      return {
        idx,
        id: s.id,
        name: s.name,
        start,
        end,
        startDay,
        endDay,
      }
    })

    let totalDev = 0
    let totalDes = 0
    const sprintTotals = sprintMeta.map((s) => {
      const list = tasksBySprint.get(s.id) || []
      let devPlanned = 0
      let desPlanned = 0
      let devActual = 0
      let desActual = 0
      for (const t of list) {
        if (!t.assigned_to) continue
        const team = teamById.get(t.assigned_to)
        if (!team) continue
        const w = weightStatus(t.status)
        if (team === 'developer') {
          devPlanned += 1
          devActual += w
        } else {
          desPlanned += 1
          desActual += w
        }
      }
      totalDev += devPlanned
      totalDes += desPlanned
      return { devPlanned, desPlanned, devActual, desActual }
    })

    const denomDev = Math.max(1, totalDev)
    const denomDes = Math.max(1, totalDes)

    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    const maxPossibleDay = diffDaysUTC(endN, start0) + 1
    const todayDay =
      todayUTC.getTime() < start0.getTime()
        ? 0
        : Math.min(diffDaysUTC(todayUTC, start0) + 1, maxPossibleDay)

    let cutoffIndex = 0
    for (let i = 0; i < sprintMeta.length; i += 1) {
      const s = sprintMeta[i]
      if (todayUTC.getTime() > s.end.getTime()) cutoffIndex = i + 1
      if (todayUTC.getTime() >= s.start.getTime() && todayUTC.getTime() <= s.end.getTime()) {
        cutoffIndex = i + 1
        break
      }
    }

    let cpDev = 0
    let caDev = 0
    let cpDes = 0
    let caDes = 0

    const sprintData: Array<{
      day: string
      sprint_id?: string
      targetDev: number
      actualDev: number | null
      targetDes: number
      actualDes: number | null
    }> = [{ day: 'Start', targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }]

    for (let i = 0; i < sprintMeta.length; i += 1) {
      const totals = sprintTotals[i]
      cpDev += totals.devPlanned
      cpDes += totals.desPlanned
      caDev += totals.devActual
      caDes += totals.desActual

      const devTarget = +(((cpDev / denomDev) * 100).toFixed(1))
      const desTarget = +(((cpDes / denomDes) * 100).toFixed(1))
      const developer = +(((caDev / denomDev) * 100).toFixed(1))
      const designer = +(((caDes / denomDes) * 100).toFixed(1))

      sprintData.push({
        day: `S${i + 1} · ${sprintMeta[i].name}`,
        sprint_id: sprintMeta[i].id,
        targetDev: devTarget,
        actualDev: i + 1 <= cutoffIndex ? developer : null,
        targetDes: desTarget,
        actualDes: i + 1 <= cutoffIndex ? designer : null,
      })
    }

    const maxDay = sprintMeta[sprintMeta.length - 1].endDay
    const dayData: Array<{
      dayNum: number
      targetDev: number
      actualDev: number | null
      targetDes: number
      actualDes: number | null
    }> = [{ dayNum: 0, targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }]

    let prevEndDay = 0
    let prevDevT = 0
    let prevDevA = 0
    let prevDesT = 0
    let prevDesA = 0

    for (let i = 0; i < sprintMeta.length; i += 1) {
      const s = sprintMeta[i]
      const row = sprintData[i + 1]
      const startDay = s.startDay
      const endDay = s.endDay

      for (let d = prevEndDay + 1; d < startDay; d += 1) {
        dayData.push({
          dayNum: d,
          targetDev: +prevDevT.toFixed(1),
          actualDev: d <= todayDay ? +prevDevA.toFixed(1) : null,
          targetDes: +prevDesT.toFixed(1),
          actualDes: d <= todayDay ? +prevDesA.toFixed(1) : null,
        })
      }

      const len = Math.max(1, endDay - startDay)
      for (let d = startDay; d <= endDay; d += 1) {
        const f = (d - startDay) / len
        const devTarget = +(prevDevT + f * (row.targetDev - prevDevT)).toFixed(1)
        const desTarget = +(prevDesT + f * (row.targetDes - prevDesT)).toFixed(1)
        const devActual = +(prevDevA + f * ((row.actualDev ?? prevDevA) - prevDevA)).toFixed(1)
        const desActual = +(prevDesA + f * ((row.actualDes ?? prevDesA) - prevDesA)).toFixed(1)
        dayData.push({
          dayNum: d,
          targetDev: devTarget,
          actualDev: d <= todayDay ? devActual : null,
          targetDes: desTarget,
          actualDes: d <= todayDay ? desActual : null,
        })
      }

      prevEndDay = endDay
      prevDevT = row.targetDev
      prevDevA = row.actualDev ?? prevDevA
      prevDesT = row.targetDes
      prevDesA = row.actualDes ?? prevDesA
    }

    for (let d = prevEndDay + 1; d <= maxDay; d += 1) {
      dayData.push({
        dayNum: d,
        targetDev: +prevDevT.toFixed(1),
        actualDev: d <= todayDay ? +prevDevA.toFixed(1) : null,
        targetDes: +prevDesT.toFixed(1),
        actualDes: d <= todayDay ? +prevDesA.toFixed(1) : null,
      })
    }

    const result = {
      projectId,
      todayDay,
      cutoffIndex,
      sprintData,
      dayData,
    }

    if (view === 'day') return NextResponse.json({ ...result, sprintData: undefined })
    if (view === 'phase') return NextResponse.json({ ...result, dayData: undefined })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error building s-curve:', error)
    return NextResponse.json({ error: 'Failed to build s-curve data' }, { status: 500 })
  }
}
