'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SprintProgress } from '@/lib/supabase';

interface SCurveChartProps {
  data: SprintProgress[];
  title?: string;
}

export function SCurveChart({ data, title = 'Sprint Progress - S-Curve' }: SCurveChartProps) {
  // Transform data for both task completion and story points
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
    taskCompletion: item.total_tasks > 0 ? Math.round((item.completed_tasks / item.total_tasks) * 100) : 0,
    storyPointsCompletion:
      item.total_story_points > 0
        ? Math.round((item.completed_story_points / item.total_story_points) * 100)
        : 0,
    completedTasks: item.completed_tasks,
    totalTasks: item.total_tasks,
  }));

  const colors = {
    task: '#3b82f6',
    storyPoints: '#10b981',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Progress tracking over sprint duration</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            No progress data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Completion (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: `1px solid var(--border)`,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="taskCompletion"
                stroke={colors.task}
                dot={{ fill: colors.task }}
                name="Task Completion %"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="storyPointsCompletion"
                stroke={colors.storyPoints}
                dot={{ fill: colors.storyPoints }}
                name="Story Points %"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
