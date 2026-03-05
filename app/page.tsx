import Link from 'next/link'
import { getDashboardMetrics, getSprintProgress } from '@/lib/db'
import { MetricCards } from '@/components/dashboard/metric-cards'
import { SCurveChart } from '@/components/charts/scurve-chart'
import { Button } from '@/components/ui/button'
import { AnalyticsPanel } from '@/components/analytics/analytics-panel'

export const revalidate = 0

export default async function MonitoringPage() {
  const metrics = await getDashboardMetrics()
  const progressData = metrics.currentSprint ? await getSprintProgress(metrics.currentSprint.id) : []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Monitoring</h1>
          <p className="text-muted-foreground mt-2">Kurva S, progress sprint, dan analytics proyek</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">Projects</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tasks">Tasks</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/team">Team</Link>
          </Button>
        </div>
      </div>

      <MetricCards metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SCurveChart data={progressData} />
        </div>

        <div className="space-y-4">
          {metrics.currentSprint && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-foreground">Current Sprint</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Sprint Name</p>
                  <p className="font-medium text-foreground">{metrics.currentSprint.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-sm text-foreground">
                    {new Date(metrics.currentSprint.start_date).toLocaleDateString('id-ID')} -{' '}
                    {new Date(metrics.currentSprint.end_date).toLocaleDateString('id-ID')}
                  </p>
                </div>
                {metrics.sprintProgress && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Tasks Progress</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${
                              metrics.sprintProgress.total_tasks > 0
                                ? Math.round((metrics.sprintProgress.completed_tasks / metrics.sprintProgress.total_tasks) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.sprintProgress.completed_tasks}/{metrics.sprintProgress.total_tasks} completed
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Story Points Progress</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${
                              metrics.sprintProgress.total_story_points > 0
                                ? Math.round(
                                    (metrics.sprintProgress.completed_story_points / metrics.sprintProgress.total_story_points) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.sprintProgress.completed_story_points}/{metrics.sprintProgress.total_story_points} points
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!metrics.currentSprint && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg">
              <p className="text-sm">Belum ada sprint aktif di project yang statusnya active.</p>
            </div>
          )}
        </div>
      </div>

      <AnalyticsPanel showTitle={false} />
    </div>
  )
}

