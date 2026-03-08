'use client';

import { useMemo, useState, useEffect } from 'react';
import { getTasks, getProjects, getTeamMembers, getActiveSprint } from '@/lib/db';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Task, Project, Sprint, TeamMember } from '@/lib/supabase';

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | TeamMember['team'] | 'unassigned'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamMemberById = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const m of teamMembers) map.set(m.id, m);
    return map;
  }, [teamMembers]);

  const filteredTasks = useMemo(() => {
    if (selectedTeam === 'all') return tasks;
    if (selectedTeam === 'unassigned') return tasks.filter((t) => !t.assigned_to);
    return tasks.filter((t) => {
      const assigneeId = t.assigned_to;
      if (!assigneeId) return false;
      const member = teamMemberById.get(assigneeId);
      return member?.team === selectedTeam;
    });
  }, [selectedTeam, tasks, teamMemberById]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const projList = await getProjects();
        setProjects(projList);

        const teamList = await getTeamMembers();
        setTeamMembers(teamList);

        if (projList.length > 0) {
          const firstProjectId = projList[0].id;
          setSelectedProjectId(firstProjectId);

          const sprint = await getActiveSprint(firstProjectId);
          setActiveSprint(sprint);

          if (sprint) {
            const taskList = await getTasks(sprint.id);
            setTasks(taskList);
          }
        }
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleProjectChange = async (projectId: string) => {
    setLoading(true);
    try {
      setSelectedProjectId(projectId);
      const sprint = await getActiveSprint(projectId);
      setActiveSprint(sprint);

      if (sprint) {
        const taskList = await getTasks(sprint.id);
        setTasks(taskList);
      } else {
        setTasks([]);
      }
    } catch (err) {
      setError('Failed to load sprint data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async () => {
    if (activeSprint) {
      const updatedTasks = await getTasks(activeSprint.id);
      setTasks(updatedTasks);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
            <p className="text-muted-foreground mt-2">Manage tasks in Kanban board format</p>
          </div>
          {activeSprint ? (
            <Button asChild>
              <Link href={`/tasks/new?sprintId=${activeSprint.id}`}>New Task</Link>
            </Button>
          ) : (
            <Button disabled>New Task</Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
            <h2 className="font-semibold text-red-900">{error}</h2>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sprint Selection</CardTitle>
            <CardDescription>Choose a project and view its active sprint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Select Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Filter Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as typeof selectedTeam)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All teams</option>
                  <option value="developer">Developer</option>
                  <option value="designer">Designer</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              {activeSprint && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground">{activeSprint.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(activeSprint.start_date).toLocaleDateString('id-ID')} -{' '}
                    {new Date(activeSprint.end_date).toLocaleDateString('id-ID')}
                  </p>
                </div>
              )}

              {!activeSprint && selectedProjectId && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
                  <p className="text-sm">No active sprint found for this project. Create a new sprint to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          </div>
        ) : activeSprint && tasks.length >= 0 ? (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">Task Board</h2>
            <KanbanBoard tasks={filteredTasks} teamMembers={teamMembers} onTaskUpdate={handleTaskUpdate} />
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            <h3 className="font-semibold text-lg mb-2 text-foreground">No active sprint</h3>
            <p className="text-muted-foreground mb-6">Select a project with an active sprint to view tasks</p>
          </div>
        )}
      </div>
    </main>
  );
}

