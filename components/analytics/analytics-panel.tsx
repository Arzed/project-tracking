'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CartesianGrid,
  Legend,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Project, Sprint, Task, TeamMember } from '@/lib/types'

export function AnalyticsPanel({ showTitle = true }: { showTitle?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('')

  useEffect(() => {
    fetchProjects()
    fetchTeam()
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    fetchProjectData(selectedProject)
  }, [selectedProject])

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team')
      const data = await res.json()
      setTeamMembers(Array.isArray(data) ? data : [])
    } catch {
      setTeamMembers([])
    }
  }

  const fetchProjects = async () => {
    try {
      const projectsRes = await fetch('/api/projects')
      const projectsData = await projectsRes.json()
      const projectList = Array.isArray(projectsData) ? projectsData : []
      setProjects(projectList)

      if (projectList.length > 0) {
        setSelectedProject(projectList[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectData = async (projectId: string) => {
    try {
      const sprintsRes = await fetch(`/api/sprints?projectId=${encodeURIComponent(projectId)}`)
      if (!sprintsRes.ok) {
        setSprints([])
        setTasks([])
        return
      }
      const sprintsData = await sprintsRes.json()
      const sprintList = Array.isArray(sprintsData) ? sprintsData : []
      setSprints(sprintList)

      const taskLists = await Promise.all(
        sprintList.map(async (s) => {
          try {
            const res = await fetch(`/api/tasks?sprintId=${encodeURIComponent(s.id)}`)
            if (!res.ok) return []
            const data = await res.json()
            return Array.isArray(data) ? data : []
          } catch {
            return []
          }
        })
      )
      setTasks(taskLists.flat())
    } catch (error) {
      console.error('Failed to fetch project data:', error)
      setSprints([])
      setTasks([])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    )
  }

  const projectSprints = sprints.filter((s) => s.project_id === selectedProject)
  const projectTasks = tasks.filter((t) => projectSprints.some((s) => s.id === t.sprint_id))

  const teamById = new Map(teamMembers.map((m) => [m.id, m.team]))
  const developerTasks = projectTasks.filter((t) => t.assigned_to && teamById.get(t.assigned_to) === 'developer')
  const designerTasks = projectTasks.filter((t) => t.assigned_to && teamById.get(t.assigned_to) === 'designer')

  const devCompleted = developerTasks.filter((t) => t.status === 'done').length
  const devTotal = developerTasks.length
  const devPercentage = devTotal > 0 ? (devCompleted / devTotal) * 100 : 0

  const designCompleted = designerTasks.filter((t) => t.status === 'done').length
  const designTotal = designerTasks.length
  const designPercentage = designTotal > 0 ? (designCompleted / designTotal) * 100 : 0

  const statusData = [
    { name: 'To Do', count: projectTasks.filter((t) => t.status === 'todo').length },
    { name: 'In Progress', count: projectTasks.filter((t) => t.status === 'in_progress').length },
    { name: 'In Review', count: projectTasks.filter((t) => t.status === 'review').length },
    { name: 'Done', count: projectTasks.filter((t) => t.status === 'done').length },
  ]

  const roleData = [
    { name: 'Developer', tasks: devTotal, completed: devCompleted },
    { name: 'Designer', tasks: designTotal, completed: designCompleted },
  ]

  const priorityData = [
    { name: 'Low', count: projectTasks.filter((t) => t.priority === 'low').length },
    { name: 'Medium', count: projectTasks.filter((t) => t.priority === 'medium').length },
    { name: 'High', count: projectTasks.filter((t) => t.priority === 'high').length },
    { name: 'Urgent', count: projectTasks.filter((t) => t.priority === 'urgent').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {showTitle && <h2 className="text-2xl font-bold">Analytics</h2>}
        {projects.length > 0 && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="rounded border border-input bg-background px-3 py-2"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                <Bar dataKey="tasks" fill="hsl(var(--muted))" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Developers</span>
                <span className="text-sm font-medium">{devPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${devPercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {devCompleted} of {devTotal} tasks
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Designers</span>
                <span className="text-sm font-medium">{designPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${designPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {designCompleted} of {designTotal} tasks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
