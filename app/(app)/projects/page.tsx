'use client';

import { useState, useEffect } from 'react';
import { getProjects } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Project } from '@/lib/supabase';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

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

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">Manage all your projects and their sprints</p>
          </div>
          <Button asChild>
            <Link href="/projects/new">New Project</Link>
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
            <h2 className="font-semibold text-red-900">{error}</h2>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <CardDescription>{project.description || 'No description provided'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Created {new Date(project.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
            <h3 className="font-semibold text-lg mb-2 text-foreground">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Create your first project to get started with tracking</p>
            <Button asChild>
              <Link href="/projects/new">Create Project</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

