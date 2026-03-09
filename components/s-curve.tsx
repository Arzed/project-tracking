"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  TrendingUp, 
} from 'lucide-react';
import type { SprintProgress } from '@/lib/supabase'

function weightStatus(s) {
  return s === 'done' ? 1 : s === 'review' || s === 'wip' ? 0.5 : 0;
}

function normalizeDash(s) {
  return String(s || '').replaceAll('–', '-').replaceAll('—', '-');
}

function parseDayRange(raw) {
  const s = normalizeDash(raw).toLowerCase();
  const m = s.match(/day\s*(\d{1,3})\s*-\s*(\d{1,3})/);
  if (!m) return null;
  const start = Number.parseInt(m[1], 10);
  const end = Number.parseInt(m[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) return null;
  return { start, end };
}

function parseDayMonth(token) {
  const t = String(token || '').trim();
  const m = t.match(/^(\d{1,2})\s*([A-Za-zÀ-ÿ]+)$/);
  if (!m) return null;
  const day = Number.parseInt(m[1], 10);
  const monRaw = m[2].toLowerCase();
  const monthMap = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    agu: 7,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    okt: 9,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    des: 11,
    dec: 11,
    december: 11,
  };
  const month = monthMap[monRaw];
  if (!Number.isFinite(day) || day < 1 || day > 31 || month === undefined) return null;
  return { day, month };
}

function parseSprintDateRange(raw, year) {
  const s = normalizeDash(raw);
  const parts = s.split('-').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const left = parts[0];
  const right = parts[1];

  const rightParsed = parseDayMonth(right);
  if (!rightParsed) return null;

  const leftFull = parseDayMonth(left);
  if (leftFull) {
    return {
      start: new Date(year, leftFull.month, leftFull.day, 0, 0, 0, 0),
      end: new Date(year, rightParsed.month, rightParsed.day, 23, 59, 59, 999),
    };
  }

  const leftDay = Number.parseInt(left, 10);
  if (!Number.isFinite(leftDay)) return null;
  return {
    start: new Date(year, rightParsed.month, leftDay, 0, 0, 0, 0),
    end: new Date(year, rightParsed.month, rightParsed.day, 23, 59, 59, 999),
  };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const p = Object.fromEntries(payload.map((x) => [x.dataKey, x.value]));
  const fmt = (v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—');
  const head = typeof label === "number" ? `Day ${label}` : label;

  const dev = typeof p.actualDev === 'number' ? p.actualDev : null;
  const devTarget = typeof p.targetDev === 'number' ? p.targetDev : null;
  const devStatus =
    dev === null
      ? 'Belum mulai'
      : devTarget !== null && dev >= devTarget
        ? 'Tepat / Cepat'
        : 'Terlambat';

  const des = typeof p.actualDes === 'number' ? p.actualDes : null;
  const desTarget = typeof p.targetDes === 'number' ? p.targetDes : null;
  const desStatus =
    des === null
      ? 'Belum mulai'
      : desTarget !== null && des >= desTarget
        ? 'Tepat / Cepat'
        : 'Terlambat';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-extrabold text-zinc-900">{head}</div>
      <div className="mt-1 grid gap-1">
        <div className="flex items-center justify-between gap-6">
          <span className="font-semibold text-zinc-600">DEV</span>
          <span className="font-bold text-zinc-900">{fmt(dev)} / {fmt(devTarget)} · {devStatus}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="font-semibold text-zinc-600">DES</span>
          <span className="font-bold text-zinc-900">{fmt(des)} / {fmt(desTarget)} · {desStatus}</span>
        </div>
      </div>
    </div>
  );
}

function ProgressTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = Object.fromEntries(payload.map((x) => [x.dataKey, x.value]))
  const fmt = (v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—')
  const actual = typeof p.actualDev === 'number' ? p.actualDev : null
  const target = typeof p.targetDev === 'number' ? p.targetDev : null
  const status =
    actual === null
      ? 'Belum mulai'
      : target !== null && actual >= target
        ? 'Tepat / Cepat'
        : 'Terlambat'

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-extrabold text-zinc-900">{`Day ${label}`}</div>
      <div className="mt-1 grid gap-1">
        <div className="flex items-center justify-between gap-6">
          <span className="font-semibold text-zinc-600">ACTUAL</span>
          <span className="font-bold text-zinc-900">{fmt(actual)} / {fmt(target)} · {status}</span>
        </div>
      </div>
    </div>
  )
}

function parseDateUTC(value) {
  const parts = String(value || '').split('-').map((v) => Number.parseInt(v, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null
  const [y, m, d] = parts
  if (!y || !m || !d) return null
  return new Date(Date.UTC(y, m - 1, d))
}

function diffDaysUTC(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000)
}

function clampPct(v) {
  if (v < 0) return 0
  if (v > 100) return 100
  return v
}

export default function SCurve({
  sprints = [],
  progress = [],
  projectId,
  sprintStartDate,
  sprintEndDate,
  today,
  year,
}: {
  sprints?: any[]
  progress?: SprintProgress[]
  projectId?: string
  sprintStartDate?: string
  sprintEndDate?: string
  today?: Date
  year?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [apiData, setApiData] = useState<{
    dayData: Array<any>
    sprintData: Array<any>
    todayDay: number
    cutoffIndex: number
  } | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  const hasApi = Boolean(projectId)
  const hasProgress = Array.isArray(progress) && progress.length > 0
  const [view, setView] = useState("day");
  const safeToday = today ?? new Date()
  const safeYear = year ?? safeToday.getFullYear()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const run = async () => {
      setApiLoading(true)
      try {
        const res = await fetch(`/api/s-curve?projectId=${encodeURIComponent(projectId)}`)
        const json = await res.json()
        if (!res.ok) return
        if (cancelled) return
        setApiData({
          dayData: Array.isArray(json.dayData) ? json.dayData : [],
          sprintData: Array.isArray(json.sprintData) ? json.sprintData : [],
          todayDay: typeof json.todayDay === 'number' ? json.todayDay : 0,
          cutoffIndex: typeof json.cutoffIndex === 'number' ? json.cutoffIndex : 0,
        })
      } finally {
        if (!cancelled) setApiLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const computed = useMemo(() => {
    if (apiData) {
      return {
        sprintClamped: apiData.sprintData,
        safeCutoffIndex: apiData.cutoffIndex,
        dayData: apiData.dayData,
        todayDay: apiData.todayDay,
      }
    }

    if (hasProgress) {
      const rows = [...progress].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const startRaw = sprintStartDate || rows[0]?.date
      const endRaw = sprintEndDate || rows[rows.length - 1]?.date
      const startDt = startRaw ? parseDateUTC(startRaw) : null
      const endDt = endRaw ? parseDateUTC(endRaw) : null
      const denom = startDt && endDt ? Math.max(1, diffDaysUTC(endDt, startDt)) : 1

      const dayData = [{ dayNum: 0, targetDev: 0, actualDev: 0, targetDes: 0, actualDes: null }]
      for (const r of rows) {
        const dt = parseDateUTC(r.date)
        const dayNum = startDt && dt ? diffDaysUTC(dt, startDt) + 1 : dayData.length
        const expected = startDt && dt ? clampPct((diffDaysUTC(dt, startDt) / denom) * 100) : 0
        const actual = r.total_tasks > 0 ? +(((r.completed_tasks / r.total_tasks) * 100).toFixed(1)) : 0
        dayData.push({
          dayNum,
          targetDev: +expected.toFixed(1),
          actualDev: actual,
          targetDes: null,
          actualDes: null,
        })
      }

      const todayMs = safeToday.getTime()
      let todayDay = dayData.length > 0 ? dayData[dayData.length - 1].dayNum : 0
      if (startDt && endDt) {
        const t = new Date(Date.UTC(safeToday.getFullYear(), safeToday.getMonth(), safeToday.getDate()))
        if (t.getTime() < startDt.getTime()) todayDay = 0
        else if (t.getTime() > endDt.getTime()) todayDay = dayData[dayData.length - 1].dayNum
        else todayDay = Math.min(dayData[dayData.length - 1].dayNum, diffDaysUTC(t, startDt) + 1)
      } else if (Number.isFinite(todayMs)) {
        todayDay = dayData[dayData.length - 1].dayNum
      }

      const sprintClamped = [{ day: "Start", targetDev: 0, actualDev: 0, targetDes: null, actualDes: null }]
      return { sprintClamped, safeCutoffIndex: 0, dayData, todayDay }
    }

    const todayMs = safeToday.getTime();
    const meta = sprints
      .map((sp) => ({
        id: sp.id,
        days: sp.days,
        dates: sp.dates,
        dayRange: parseDayRange(sp.days),
        dateRange: sp.dates ? parseSprintDateRange(sp.dates, safeYear) : null,
      }))
      .filter((x) => x.id !== undefined);

    let cutoffSprintId = 0;
    let todayDay = 0;
    for (const m of meta) {
      const r = m.dateRange;
      const dr = m.dayRange;
      if (r && todayMs > r.end.getTime()) cutoffSprintId = m.id;
      if (r && dr && todayMs >= r.start.getTime() && todayMs <= r.end.getTime()) {
        cutoffSprintId = m.id;
        const msDay = 24 * 60 * 60 * 1000;
        const offset = Math.floor((todayMs - r.start.getTime()) / msDay);
        todayDay = Math.min(dr.end, dr.start + Math.max(0, offset));
        break;
      }
      if (dr && cutoffSprintId === m.id) todayDay = dr.end;
    }

    const totalG = Math.max(
      1,
      sprints.reduce((a, sp) => a + sp.tasks.filter((t) => t.tp === "G").length, 0),
    );
    const totalD = Math.max(
      1,
      sprints.reduce((a, sp) => a + sp.tasks.filter((t) => t.tp === "D").length, 0),
    );
    let cpG = 0, caG = 0, cpD = 0, caD = 0;

    const sprintData = [{ day: "Start", targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }];
    sprints.forEach((sp) => {
      const g = sp.tasks.filter((t) => t.tp === "G");
      const d = sp.tasks.filter((t) => t.tp === "D");
      cpG += g.length;
      cpD += d.length;
      caG += g.reduce((a, t) => a + weightStatus(t.s), 0);
      caD += d.reduce((a, t) => a + weightStatus(t.s), 0);

      const devTarget = +((cpG / totalG) * 100).toFixed(1);
      const developer = +((caG / totalG) * 100).toFixed(1);
      const desTarget = +((cpD / totalD) * 100).toFixed(1);
      const designer = +((caD / totalD) * 100).toFixed(1);

      sprintData.push({
        day: `S${sp.id} · ${sp.days}`,
        targetDev: devTarget,
        actualDev: developer,
        targetDes: desTarget,
        actualDes: designer,
      });
    });

    const cutoffIndex = Math.max(
      0,
      cutoffSprintId
        ? sprintData.findIndex((x) =>
            String(x.day || "").startsWith(`S${cutoffSprintId} ·`),
          )
        : 0,
    );
    const safeCutoffIndex = cutoffIndex >= 0 ? cutoffIndex : 0;
    const sprintClamped = sprintData.map((row, idx) => {
      if (idx <= safeCutoffIndex) return row;
      return { ...row, actualDev: null, actualDes: null };
    });

    const dayData = [{ dayNum: 0, targetDev: 0, actualDev: 0, targetDes: 0, actualDes: 0 }];
    let prevEnd = 0;
    let prevDevT = 0, prevDevA = 0, prevDesT = 0, prevDesA = 0;
    for (const sp of sprints) {
      const dr = parseDayRange(sp.days);
      if (!dr) continue;
      const sprintRow = sprintData.find((x) => x.day === `S${sp.id} · ${sp.days}`);
      if (!sprintRow) continue;
      const end = dr.end;
      const len = Math.max(1, end - prevEnd);
      const actualEnd = Math.min(end, Math.max(todayDay, 0));
      const actualLen = Math.max(1, actualEnd - prevEnd);
      for (let d = prevEnd + 1; d <= end; d += 1) {
        const fT = (d - prevEnd) / len;
        const devTarget = +(prevDevT + fT * (sprintRow.targetDev - prevDevT)).toFixed(1);
        const desTarget = +(prevDesT + fT * (sprintRow.targetDes - prevDesT)).toFixed(1);

        let developerRaw = prevDevA;
        let designerRaw = prevDesA;
        if (d <= actualEnd) {
          const fA = (d - prevEnd) / actualLen;
          developerRaw = +(prevDevA + fA * (sprintRow.actualDev - prevDevA)).toFixed(1);
          designerRaw = +(prevDesA + fA * (sprintRow.actualDes - prevDesA)).toFixed(1);
        } else if (actualEnd >= prevEnd + 1) {
          developerRaw = +sprintRow.actualDev.toFixed(1);
          designerRaw = +sprintRow.actualDes.toFixed(1);
        }
        dayData.push({
          dayNum: d,
          targetDev: devTarget,
          actualDev: developerRaw,
          targetDes: desTarget,
          actualDes: designerRaw,
        });
      }
      prevEnd = end;
      prevDevT = sprintRow.targetDev;
      prevDevA = sprintRow.actualDev;
      prevDesT = sprintRow.targetDes;
      prevDesA = sprintRow.actualDes;
    }

    return { sprintClamped, safeCutoffIndex, dayData, todayDay };
  }, [sprints, progress, sprintStartDate, sprintEndDate, safeToday, safeYear, hasProgress, apiData]);

  const isDay = view === "day";
  const chartData = isDay ? computed.dayData : computed.sprintClamped;
  const todayX = isDay
    ? computed.todayDay
    : (computed.sprintClamped[computed.safeCutoffIndex] || computed.sprintClamped[computed.sprintClamped.length - 1])?.day;

  const ACTUAL_DEV_COLOR = '#22c55e';
  const ACTUAL_DES_COLOR = '#eab308';

  const showDesignerSeries = Boolean(apiData) || !hasProgress;

  if (!mounted) {
    return (
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Cumulative Progress</h3>
            <p className="text-sm text-zinc-500">Tracking daily completion percentage</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-xs font-bold text-zinc-700">
              <button type="button" className="h-8 px-3 rounded-md bg-zinc-900 text-white" disabled>
                Hari
              </button>
              <button type="button" className="h-8 px-3 rounded-md text-zinc-700" disabled>
                Sprint
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100 text-xs font-medium text-zinc-600">
              <TrendingUp className="w-4 h-4" />
              Loading...
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full bg-zinc-50 rounded-xl border border-zinc-100" />
      </div>
    )
  }

  return (
    <div 
      className="bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">Cumulative Progress</h3>
          <p className="text-sm text-zinc-500">Tracking daily completion percentage</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-xs font-bold text-zinc-700">
            <button
              type="button"
              onClick={() => setView("sprint")}
              className={`h-8 px-3 rounded-md ${!isDay ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
              disabled={apiLoading}
            >
              Sprint
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={`h-8 px-3 rounded-md ${isDay ? "bg-zinc-900 text-white" : "text-zinc-700"}`}
              disabled={apiLoading}
            >
              Hari
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100 text-xs font-medium text-zinc-600">
            <TrendingUp className="w-4 h-4" />
            {apiLoading ? 'Loading...' : hasApi ? 'API Sync' : 'Real-time Sync'}
          </div>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACTUAL_DEV_COLOR} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={ACTUAL_DEV_COLOR} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACTUAL_DES_COLOR} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={ACTUAL_DES_COLOR} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTargetDev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorTargetDes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.08}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey={isDay ? "dayNum" : "day"}
              type={isDay ? "number" : "category"}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickFormatter={(v) => (isDay ? `D${v}` : v)}
              interval={isDay ? 6 : 0}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip content={hasProgress && !apiData ? <ProgressTooltip /> : <CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
            />
            
            <Area
              type="monotone"
              dataKey="targetDev"
              name="Target Dev"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorTargetDev)"
            />
            {showDesignerSeries && (
              <Area
                type="monotone"
                dataKey="targetDes"
                name="Target Des"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorTargetDes)"
              />
            )}

            <Area
              type="monotone"
              dataKey="actualDev"
              name="Actual Dev"
              stroke={ACTUAL_DEV_COLOR}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDev)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />

            {showDesignerSeries && (
              <Area
                type="monotone"
                dataKey="actualDes"
                name="Actual Des"
                stroke={ACTUAL_DES_COLOR}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorDes)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            )}

            {chartData.length > 1 ? (
              <ReferenceLine x={todayX} stroke="#e4e4e7" strokeWidth={2} label={{ position: 'top', value: 'Today', fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
