'use client'

import { useEffect, useMemo, useState } from 'react'
import { getProjects, getSprintProgress, getSprints } from '@/lib/db'
import type { Project, Sprint, SprintProgress } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function pct(completed: number, total: number) {
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

export function SprintProgressPanel({ defaultSprintId }: { defaultSprintId?: string }) {
  const [loadingSprints, setLoadingSprints] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [progress, setProgress] = useState<SprintProgress | null>(null)

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const selectedSprint = useMemo(() => {
    if (!selectedSprintId) return null
    return sprints.find((s) => s.id === selectedSprintId) ?? null
  }, [selectedSprintId, sprints])

  useEffect(() => {
    const load = async () => {
      setLoadingSprints(true)
      setError(null)
      try {
        const projList = await getProjects()
        const activeProjects = projList.filter((p) => p.status === 'active')
        const sprintLists = await Promise.all(activeProjects.map((p) => getSprints(p.id)))
        const allSprints = sprintLists.flat().sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))

        setProjects(projList)
        setSprints(allSprints)

        const preferredId =
          (defaultSprintId && allSprints.some((s) => s.id === defaultSprintId) ? defaultSprintId : '') ||
          allSprints[0]?.id ||
          ''
        setSelectedSprintId(preferredId)
      } catch (e) {
        console.error(e)
        setError('Gagal memuat daftar sprint')
        setProjects([])
        setSprints([])
        setSelectedSprintId('')
      } finally {
        setLoadingSprints(false)
      }
    }

    load()
  }, [defaultSprintId])

  useEffect(() => {
    const loadProgress = async () => {
      if (!selectedSprintId) {
        setProgress(null)
        return
      }
      setLoadingProgress(true)
      setError(null)
      try {
        const data = await getSprintProgress(selectedSprintId)
        setProgress(data.length > 0 ? data[data.length - 1] : null)
      } catch (e) {
        console.error(e)
        setError('Gagal memuat progress sprint')
        setProgress(null)
      } finally {
        setLoadingProgress(false)
      }
    }

    loadProgress()
  }, [selectedSprintId])

  if (loadingSprints) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  if (sprints.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg">
        <p className="text-sm">Belum ada sprint di project yang statusnya active.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="font-semibold mb-4 text-foreground">Sprint Progress</h3>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Pilih Sprint</p>
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih sprint..." />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((s) => {
                const projectName = projectNameById.get(s.project_id) || 'Project'
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {projectName} — {s.name} ({s.status})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        {selectedSprint && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Sprint Name</p>
              <p className="font-medium text-foreground">{selectedSprint.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-sm text-foreground">
                {new Date(selectedSprint.start_date).toLocaleDateString('id-ID')} -{' '}
                {new Date(selectedSprint.end_date).toLocaleDateString('id-ID')}
              </p>
            </div>
          </>
        )}

        {loadingProgress ? (
          <div className="text-sm text-muted-foreground">Memuat progress...</div>
        ) : progress ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Tasks Progress</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Developer</span>
                    <span className="text-foreground">
                      {progress.developer_completed_tasks}/{progress.developer_total_tasks} (
                      {pct(progress.developer_completed_tasks, progress.developer_total_tasks)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${pct(progress.developer_completed_tasks, progress.developer_total_tasks)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Designer</span>
                    <span className="text-foreground">
                      {progress.designer_completed_tasks}/{progress.designer_total_tasks} (
                      {pct(progress.designer_completed_tasks, progress.designer_total_tasks)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-pink-500 h-2 rounded-full"
                      style={{
                        width: `${pct(progress.designer_completed_tasks, progress.designer_total_tasks)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Story Points Progress</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Developer</span>
                    <span className="text-foreground">
                      {progress.developer_completed_story_points}/{progress.developer_total_story_points} (
                      {pct(progress.developer_completed_story_points, progress.developer_total_story_points)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${pct(progress.developer_completed_story_points, progress.developer_total_story_points)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Designer</span>
                    <span className="text-foreground">
                      {progress.designer_completed_story_points}/{progress.designer_total_story_points} (
                      {pct(progress.designer_completed_story_points, progress.designer_total_story_points)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${pct(progress.designer_completed_story_points, progress.designer_total_story_points)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Belum ada data progress untuk sprint ini.</div>
        )}
      </div>
    </div>
  )
}

