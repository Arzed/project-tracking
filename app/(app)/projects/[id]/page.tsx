'use client';

import { useState, useEffect, use } from 'react';
import { getProject, getSprints } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Project, Sprint } from '@/lib/supabase';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const proj = await getProject(id);
        setProject(proj);
        if (proj) {
          const sprintList = await getSprints(proj.id);
          setSprints(sprintList);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  if (!project) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">Project not found</h2>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground mt-2">{project.description}</p>
          </div>
          <Link href="/projects">
            <Button variant="outline">Back to Projects</Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-semibold mt-2 ${getStatusColor(project.status)}`}
                >
                  {project.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium mt-2">{new Date(project.created_at).toLocaleDateString('id-ID')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium mt-2">{new Date(project.updated_at).toLocaleDateString('id-ID')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Sprints</h2>
            <Button asChild>
              <Link href={`/projects/${project.id}/sprints/new`}>New Sprint</Link>
            </Button>
          </div>

          {sprints.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sprints.map((sprint) => (
                <Link key={sprint.id} href={`/projects/${project.id}/sprints/${sprint.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{sprint.name}</CardTitle>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            sprint.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : sprint.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sprint.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                          {new Date(sprint.start_date).toLocaleDateString('id-ID')} -{' '}
                          {new Date(sprint.end_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No sprints yet. Create one to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

