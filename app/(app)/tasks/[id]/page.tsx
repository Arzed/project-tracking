'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteTask, getTask, getTeamMembers, updateTask } from '@/lib/db';
import type { Task, TeamMember } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const STATUSES: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES: Task['priority'][] = ['low', 'medium', 'high', 'urgent'];
const TYPES: Task['task_type'][] = ['feature', 'bug', 'improvement', 'design'];

const statusLabel: Record<Task['status'], string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const priorityLabel: Record<Task['priority'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const typeLabel: Record<Task['task_type'], string> = {
  feature: 'Feature',
  bug: 'Bug',
  improvement: 'Improvement',
  design: 'Design',
};

function computeEndDate(startDate: string, durationDays: number) {
  const [y, m, d] = startDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Math.max(0, durationDays - 1));
  return dt.toISOString().slice(0, 10);
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    task_type: 'feature' as Task['task_type'],
    assigned_to: '',
    story_points: '',
    start_date: '',
    duration_days: '',
    actual_end_date: '',
  });

  const computedEndDate = useMemo(() => {
    const duration = Number(formData.duration_days);
    if (!formData.start_date || !formData.duration_days || Number.isNaN(duration) || duration < 1) return '';
    return computeEndDate(formData.start_date, Math.floor(duration));
  }, [formData.start_date, formData.duration_days]);

  const targetEndDate = useMemo(() => {
    if (computedEndDate) return computedEndDate;
    return task?.end_date ?? '';
  }, [computedEndDate, task?.end_date]);

  useEffect(() => {
    if (formData.status !== 'done') return;
    if (formData.actual_end_date) return;
    const today = new Date().toISOString().slice(0, 10);
    setFormData((prev) => ({ ...prev, actual_end_date: today }));
  }, [formData.status, formData.actual_end_date]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [t, members] = await Promise.all([getTask(taskId), getTeamMembers()]);
        setTeamMembers(members);
        if (!t) {
          setTask(null);
          return;
        }
        setTask(t);
        setFormData({
          title: t.title ?? '',
          description: t.description ?? '',
          status: t.status,
          priority: t.priority,
          task_type: t.task_type,
          assigned_to: t.assigned_to ?? '',
          story_points: t.story_points != null ? String(t.story_points) : '',
          start_date: t.start_date ?? '',
          duration_days: t.duration_days != null ? String(t.duration_days) : '',
          actual_end_date: t.actual_end_date ?? '',
        });
      } catch (e) {
        console.error(e);
        setError('Gagal memuat data task');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [taskId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.title.trim()) throw new Error('Judul task wajib diisi');

      if ((formData.start_date && !formData.duration_days) || (!formData.start_date && formData.duration_days)) {
        throw new Error('Tanggal mulai dan durasi harus diisi bersamaan');
      }

      if (formData.duration_days && Number(formData.duration_days) < 1) {
        throw new Error('Durasi minimal 1 hari');
      }

      const durationDays = formData.duration_days ? Math.floor(Number(formData.duration_days)) : undefined;
      const startDate = formData.start_date || undefined;
      const computedTargetEndDate = startDate && durationDays ? computeEndDate(startDate, durationDays) : undefined;
      const finalTargetEndDate = computedTargetEndDate || task?.end_date || undefined;
      const actualEndDate =
        formData.status === 'done'
          ? formData.actual_end_date || finalTargetEndDate || new Date().toISOString().slice(0, 10)
          : undefined;

      if (startDate && actualEndDate && new Date(actualEndDate) < new Date(startDate)) {
        throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
      }

      const updated = await updateTask(taskId, {
        title: formData.title,
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        task_type: formData.task_type,
        assigned_to: formData.assigned_to && formData.assigned_to !== 'unassigned' ? formData.assigned_to : undefined,
        story_points: formData.story_points ? parseInt(formData.story_points) : undefined,
        start_date: startDate,
        duration_days: durationDays,
        end_date: finalTargetEndDate,
        actual_end_date: actualEndDate,
      });

      setTask(updated);
      setFormData((prev) => ({ ...prev, actual_end_date: actualEndDate ?? '' }));
      setSuccess('Task berhasil disimpan');
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Gagal menyimpan task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteTask(taskId);
      router.push('/tasks');
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Gagal menghapus task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Task tidak ditemukan</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/tasks">Kembali ke Tasks</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Detail Task</h1>
            <p className="text-muted-foreground mt-2">Edit informasi task</p>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={saving}>
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak bisa dibatalkan. Task akan dihapus permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={saving}>
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button asChild variant="outline">
              <Link href="/tasks">Kembali</Link>
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Edit Task</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                    {success}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: Task['status']) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: Task['priority']) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Pilih priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {priorityLabel[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="task_type">Type</Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(value: Task['task_type']) => setFormData({ ...formData, task_type: value })}
                    >
                      <SelectTrigger id="task_type">
                        <SelectValue placeholder="Pilih type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {typeLabel[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assignee</Label>
                    <Select
                      value={formData.assigned_to || 'unassigned'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assigned_to: value === 'unassigned' ? '' : value })
                      }
                    >
                      <SelectTrigger id="assigned_to">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="story_points">Story Points</Label>
                  <Input
                    id="story_points"
                    type="number"
                    min="0"
                    value={formData.story_points}
                    onChange={(e) => setFormData({ ...formData, story_points: e.target.value })}
                    placeholder="e.g. 1, 2, 3, 5, 8"
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
                    <Label htmlFor="duration_days">Durasi (hari)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      min="1"
                      step="1"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      placeholder="mis. 3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="target_end_date">Target Selesai</Label>
                    <Input id="target_end_date" type="date" value={targetEndDate} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actual_end_date">Tanggal Selesai Aktual</Label>
                    <Input
                      id="actual_end_date"
                      type="date"
                      value={formData.actual_end_date}
                      onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                      disabled={formData.status !== 'done'}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push('/tasks')}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

