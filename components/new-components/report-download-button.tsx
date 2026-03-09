'use client'

import { useMemo, useState } from 'react'
import { Download, FileText, FileSpreadsheet, File as FileIcon, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ReportTaskRow = {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  task_type: string
  assignee_name: string
  assignee_team: string
  sprint_name: string
  start_date?: string
  end_date?: string
  actual_end_date?: string
  duration_days?: number | null
  story_points?: number | null
}

function escapeHTML(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function downloadWord(filename: string, html: string) {
  const header =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>Report</title><style>@page{size:A4 landscape;margin:12mm;}body{font-family:Arial,sans-serif;}</style></head><body>"
  const footer = '</body></html>'
  const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + html + footer)
  const fileDownload = document.createElement('a')
  document.body.appendChild(fileDownload)
  fileDownload.href = source
  fileDownload.download = filename
  fileDownload.click()
  document.body.removeChild(fileDownload)
}

export function ReportDownloadButton({
  tasks,
  chartElementId = 'report-chart',
  sprintProgressElementId = 'report-sprint-progress',
  tableElementId = 'report-table',
  fileBaseName = 'Project_Report',
}: {
  tasks: ReportTaskRow[]
  chartElementId?: string
  sprintProgressElementId?: string
  tableElementId?: string
  fileBaseName?: string
}) {
  const [isExporting, setIsExporting] = useState(false)

  const tasksSheetRows = useMemo(() => {
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      status: t.status,
      task_type: t.task_type,
      assignee_name: t.assignee_name,
      assignee_team: t.assignee_team,
      sprint: t.sprint_name,
      start_date: t.start_date || '',
      target_end_date: t.end_date || '',
      actual_end_date: t.actual_end_date || '',
      duration_days: t.duration_days ?? '',
      story_points: t.story_points ?? '',
    }))
  }, [tasks])

  const exportToPDF = async () => {
    setIsExporting(true)
    try {
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentW = pageW - margin * 2
      const chartElement = document.getElementById(chartElementId)
      const sprintProgressElement = document.getElementById(sprintProgressElementId)
      const tableElement = document.getElementById(tableElementId)

      pdf.setFontSize(18)
      pdf.text('Project Progress Report', pageW / 2, 15, { align: 'center' })
      pdf.setFontSize(10)
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageW / 2, 22, { align: 'center' })

      if (chartElement) {
        const chartDataUrl = await toPng(chartElement, { quality: 0.95, backgroundColor: '#ffffff' })
        const chartY = 28
        const chartH = Math.min(110, pageH - chartY - margin)
        pdf.addImage(chartDataUrl, 'PNG', margin, chartY, contentW, chartH)
      }

      if (sprintProgressElement) {
        const sprintProgressDataUrl = await toPng(sprintProgressElement, { quality: 0.95, backgroundColor: '#ffffff' })
        pdf.addPage('a4', 'l')
        const pageW2 = pdf.internal.pageSize.getWidth()
        const pageH2 = pdf.internal.pageSize.getHeight()
        const contentW2 = pageW2 - margin * 2
        pdf.setFontSize(14)
        pdf.text('Sprint Progress', pageW2 / 2, 15, { align: 'center' })
        const boxY = 20
        const boxH = Math.min(170, pageH2 - boxY - margin)
        pdf.addImage(sprintProgressDataUrl, 'PNG', margin, boxY, contentW2, boxH)
      }

      if (tableElement) {
        const tableDataUrl = await toPng(tableElement, { quality: 0.95, backgroundColor: '#ffffff' })
        pdf.addPage('a4', 'l')
        const pageW2 = pdf.internal.pageSize.getWidth()
        const pageH2 = pdf.internal.pageSize.getHeight()
        const contentW2 = pageW2 - margin * 2
        pdf.setFontSize(14)
        pdf.text('Tasks', pageW2 / 2, 15, { align: 'center' })
        const tableY = 20
        const tableH = Math.min(170, pageH2 - tableY - margin)
        pdf.addImage(tableDataUrl, 'PNG', margin, tableY, contentW2, tableH)
      }

      pdf.save(`${fileBaseName}.pdf`)
    } catch (error) {
      console.error('PDF Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToXLSX = async () => {
    setIsExporting(true)
    try {
      const wb = XLSX.utils.book_new()

      const tasksSheet = XLSX.utils.json_to_sheet(tasksSheetRows)

      XLSX.utils.book_append_sheet(wb, tasksSheet, 'Tasks')

      XLSX.writeFile(wb, `${fileBaseName}.xlsx`)
    } catch (error) {
      console.error('XLSX Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToWord = async () => {
    setIsExporting(true)
    try {
      const chartElement = document.getElementById(chartElementId)
      const sprintProgressElement = document.getElementById(sprintProgressElementId)
      const tableElement = document.getElementById(tableElementId)

      const chartDataUrl = chartElement ? await toPng(chartElement, { quality: 0.95, backgroundColor: '#ffffff' }) : ''
      const sprintProgressDataUrl = sprintProgressElement
        ? await toPng(sprintProgressElement, { quality: 0.95, backgroundColor: '#ffffff' })
        : ''
      const tableDataUrl = tableElement ? await toPng(tableElement, { quality: 0.95, backgroundColor: '#ffffff' }) : ''

      const rowsHTML = tasks
        .map((t) => {
          return (
            '<tr>' +
            `<td>${escapeHTML(t.title)}</td>` +
            `<td>${escapeHTML(t.assignee_name || '—')}</td>` +
            `<td>${escapeHTML(t.assignee_team || '—')}</td>` +
            `<td>${escapeHTML(t.sprint_name)}</td>` +
            `<td>${escapeHTML(t.start_date || '')}</td>` +
            `<td>${escapeHTML(t.end_date || '')}</td>` +
            `<td>${escapeHTML(t.actual_end_date || '')}</td>` +
            `<td>${escapeHTML(t.status)}</td>` +
            '</tr>'
          )
        })
        .join('')

      const html =
        `<h1>Project Progress Report</h1>` +
        `<p>Generated on: ${escapeHTML(new Date().toLocaleString())}</p>` +
        (chartDataUrl ? `<h2>S-Curve</h2><img src="${chartDataUrl}" style="width: 100%; max-width: 800px;" />` : '') +
        (sprintProgressDataUrl
          ? `<h2>Sprint Progress</h2><img src="${sprintProgressDataUrl}" style="width: 100%; max-width: 800px;" />`
          : '') +
        // (tableDataUrl ? `<h2>Tasks (Snapshot)</h2><img src="${tableDataUrl}" style="width: 100%; max-width: 800px;" />` : '') +
        `<h2>Tasks (Data)</h2>` +
        `<table border="1" style="border-collapse: collapse; width: 100%;">` +
        `<tr><th>Title</th><th>Member</th><th>Team</th><th>Sprint</th><th>Start</th><th>Target End</th><th>Actual End</th><th>Status</th></tr>` +
        rowsHTML +
        `</table>`

      downloadWord(`${fileBaseName}.doc`, html)
    } catch (error) {
      console.error('Word Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isExporting} variant="default">
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          <span className="ml-2">Download Report</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void exportToPDF()
          }}
          disabled={isExporting}
        >
          <FileIcon className="size-4 text-rose-500" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void exportToXLSX()
          }}
          disabled={isExporting}
        >
          <FileSpreadsheet className="size-4 text-emerald-600" />
          XLSX
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void exportToWord()
          }}
          disabled={isExporting}
        >
          <FileText className="size-4 text-blue-500" />
          Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
