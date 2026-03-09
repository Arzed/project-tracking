'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getProject, getSprint, updateSprint } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import type { Project, Sprint } from '@/lib/supabase';

function normalizeDateInputValue(value: string) {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

export default function EditSprintPage({ params }: { params: Promise<{ id: string; sprintId: string }> }) {
  const { id: projectId, sprintId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    start_date: string;
    end_date: string;
    status: Sprint['status'];
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [proj, spr] = await Promise.all([getProject(projectId), getSprint(sprintId)]);
        setProject(proj);
        setSprint(spr);
        if (!spr) {
          setFormData(null);
          return;
        }
        setFormData({
          name: spr.name ?? '',
          start_date: normalizeDateInputValue(spr.start_date),
          end_date: normalizeDateInputValue(spr.end_date),
          status: spr.status,
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load sprint');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, sprintId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setError(null);
    try {
      if (!formData.name.trim()) {
        throw new Error('Sprint name is required');
      }

      if (!formData.start_date || !formData.end_date) {
        throw new Error('Start date and end date are required');
      }

      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        throw new Error('End date must be after start date');
      }

      await updateSprint(sprintId, {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
      });

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      console.error('Error updating sprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sprint');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </main>
    );
  }

  if (!sprint || !formData) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Edit Sprint</h1>
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline">Back</Button>
            </Link>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">Sprint not found</h2>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Edit Sprint</h1>
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Details</CardTitle>
              {project && (
                <p className="text-sm text-muted-foreground">
                  Editing sprint in project: <span className="font-medium text-foreground">{project.name}</span>
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
                  <Label htmlFor="name">Sprint Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter sprint name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Sprint['status']) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Link href={`/projects/${projectId}`}>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
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

