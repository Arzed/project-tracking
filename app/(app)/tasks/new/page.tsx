'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createTask, getTeamMembers, getSprint } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TeamMember, Sprint } from '@/lib/supabase';
import Link from 'next/link';

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sprintId = searchParams.get('sprintId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);

  const computeEndDate = (startDate: string, durationDays: number) => {
    const [y, m, d] = startDate.split('-').map(Number);
    if (!y || !m || !d) return '';
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Math.max(0, durationDays - 1));
    return dt.toISOString().slice(0, 10);
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    task_type: 'feature' as Task['task_type'],
    assigned_to: '',
    story_points: '',
    duration_days: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const duration = Number(formData.duration_days);
    if (!formData.start_date || !formData.duration_days || Number.isNaN(duration) || duration < 1) {
      if (formData.end_date) setFormData((prev) => ({ ...prev, end_date: '' }));
      return;
    }
    const computed = computeEndDate(formData.start_date, Math.floor(duration));
    if (computed && computed !== formData.end_date) {
      setFormData((prev) => ({ ...prev, end_date: computed }));
    }
  }, [formData.start_date, formData.duration_days]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const members = await getTeamMembers();
        setTeamMembers(members);

        if (sprintId) {
          const sprintData = await getSprint(sprintId);
          setSprint(sprintData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load necessary data');
      }
    };

    fetchData();
  }, [sprintId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintId) {
      setError('No sprint selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!formData.title.trim()) {
        throw new Error('Task title is required');
      }

      if ((formData.start_date && !formData.duration_days) || (!formData.start_date && formData.duration_days)) {
        throw new Error('Tanggal mulai dan durasi harus diisi bersamaan');
      }

      if (formData.duration_days && Number(formData.duration_days) < 1) {
        throw new Error('Durasi minimal 1 hari');
      }

      const computedEndDate =
        formData.start_date && formData.duration_days
          ? computeEndDate(formData.start_date, Math.floor(Number(formData.duration_days)))
          : '';

      await createTask({
        sprint_id: sprintId,
        title: formData.title,
        description: formData.description.trim() || undefined,
        start_date: formData.start_date || undefined,
        end_date: computedEndDate || undefined,
        duration_days: formData.duration_days ? Math.floor(Number(formData.duration_days)) : undefined,
        status: formData.status,
        priority: formData.priority,
        task_type: formData.task_type,
        assigned_to: formData.assigned_to && formData.assigned_to !== 'unassigned' ? formData.assigned_to : undefined,
        story_points: formData.story_points ? parseInt(formData.story_points) : undefined,
      });

      router.push('/tasks');
      router.refresh();
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!sprintId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-900">Error: No sprint ID provided</h2>
          <p className="mt-2 text-red-700">Please select a sprint from the tasks page to add a task.</p>
          <Button asChild className="mt-4">
            <Link href="/tasks">Back to Tasks</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          {sprint && (
            <p className="text-sm text-muted-foreground">
              Adding task to sprint: <span className="font-medium text-foreground">{sprint.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.task_type}
                  onValueChange={(value: Task['task_type']) => setFormData({ ...formData, task_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="improvement">Improvement</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Task['priority']) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={formData.assigned_to || 'unassigned'}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value === 'unassigned' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Story Points</Label>
                <Input
                  id="points"
                  type="number"
                  min="0"
                  placeholder="e.g. 1, 2, 3, 5, 8"
                  value={formData.story_points}
                  onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_days">Durasi Pengerjaan (hari)</Label>
              <Input
                id="duration_days"
                type="number"
                min="1"
                step="1"
                placeholder="mis. 5"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Selesai</Label>
                <Input id="end_date" type="date" value={formData.end_date} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Task['status']) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/tasks">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create New Task</h1>
          <Link href="/tasks">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
        
        <Suspense fallback={<div>Loading...</div>}>
          <NewTaskForm />
        </Suspense>
      </div>
    </main>
  );
}

