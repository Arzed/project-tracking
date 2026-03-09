'use client';

import { useMemo, useState, useEffect } from 'react';
import { getTasks, getProjects, getTeamMembers, getSprints } from '@/lib/db';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Task, Project, Sprint, TeamMember } from '@/lib/supabase';

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<'all' | TeamMember['team'] | 'unassigned'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSprint = useMemo(() => {
    if (!selectedSprintId) return null;
    return sprints.find((s) => s.id === selectedSprintId) ?? null;
  }, [selectedSprintId, sprints]);

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
          const sprintList = await getSprints(firstProjectId);
          setSprints(sprintList);
          setSelectedSprintId('');
          setTasks([]);
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
      setSelectedSprintId('');
      setTasks([]);
      const sprintList = projectId ? await getSprints(projectId) : [];
      setSprints(sprintList);
    } catch (err) {
      setError('Failed to load sprint data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSprintChange = async (sprintId: string) => {
    setLoading(true);
    try {
      setSelectedSprintId(sprintId);
      if (!sprintId) {
        setTasks([]);
        return;
      }
      const taskList = await getTasks(sprintId);
      setTasks(taskList);
    } catch (err) {
      setError('Failed to load tasks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async () => {
    if (selectedSprintId) {
      const updatedTasks = await getTasks(selectedSprintId);
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
          <Button asChild>
            <Link href={selectedSprintId ? `/tasks/new?sprintId=${selectedSprintId}` : '/tasks/new'}>New Task</Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
            <h2 className="font-semibold text-red-900">{error}</h2>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sprint Selection</CardTitle>
            <CardDescription>Select a project and sprint to view tasks</CardDescription>
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
                <label className="block text-sm font-medium text-foreground mb-2">Select Sprint</label>
                <select
                  value={selectedSprintId}
                  onChange={(e) => handleSprintChange(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!selectedProjectId || sprints.length === 0}
                >
                  <option value="">Choose a sprint...</option>
                  {sprints.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status})
                    </option>
                  ))}
                </select>
                {selectedProjectId && sprints.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No sprints found for this project.</p>
                )}
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

              {selectedSprint && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground">{selectedSprint.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedSprint.start_date).toLocaleDateString('id-ID')} -{' '}
                    {new Date(selectedSprint.end_date).toLocaleDateString('id-ID')}
                  </p>
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
        ) : selectedSprintId ? (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6">Task Board</h2>
            <KanbanBoard tasks={filteredTasks} teamMembers={teamMembers} onTaskUpdate={handleTaskUpdate} />
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            <h3 className="font-semibold text-lg mb-2 text-foreground">Pilih sprint terlebih dulu</h3>
            <p className="text-muted-foreground mb-6">Pilih project dan sprint untuk menampilkan Kanban board</p>
          </div>
        )}
      </div>
    </main>
  );
}

