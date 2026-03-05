'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardMetrics } from '@/lib/supabase';

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const completionRate =
    metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0;

  const cards = [
    {
      title: 'Total Projects',
      value: metrics.totalProjects,
      description: `${metrics.activeProjects} active`,
      icon: '📊',
    },
    {
      title: 'Tasks Completed',
      value: `${completionRate}%`,
      description: `${metrics.completedTasks} of ${metrics.totalTasks} tasks`,
      icon: '✓',
    },
    {
      title: 'Team Members',
      value: metrics.totalTeamMembers,
      description: 'Across all projects',
      icon: '👥',
    },
    {
      title: 'Current Sprint',
      value: metrics.currentSprint?.name || 'No active sprint',
      description: metrics.currentSprint
        ? `Ends ${new Date(metrics.currentSprint.end_date).toLocaleDateString('id-ID')}`
        : 'Create a new sprint',
      icon: '🎯',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <CardDescription className="text-xs">{card.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
