import { getDashboardMetrics, getSprintProgress } from '@/lib/db'
import { MetricCards } from '@/components/dashboard/metric-cards'
import SCurve from '@/components/s-curve'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const revalidate = 0

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics()
  const progressData = metrics.currentSprint ? await getSprintProgress(metrics.currentSprint.id) : []

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Project Tracking Dashboard</h1>
          <p className="text-muted-foreground mt-2">Monitor your team's progress and sprint performance</p>
        </div>

        <MetricCards metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <SCurve
              projectId={metrics.currentSprint?.project_id}
              progress={progressData}
              sprintStartDate={metrics.currentSprint?.start_date}
              sprintEndDate={metrics.currentSprint?.end_date}
            />
          </div>

          <div className="space-y-4">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-foreground">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/projects" className="block">
                  <Button variant="outline" className="w-full">
                    View Projects
                  </Button>
                </Link>
                <Link href="/tasks" className="block">
                  <Button variant="outline" className="w-full">
                    Manage Tasks
                  </Button>
                </Link>
                <Link href="/team" className="block">
                  <Button variant="outline" className="w-full">
                    Team Members
                  </Button>
                </Link>
              </div>
            </div>

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
                                  ? Math.round(
                                      (metrics.sprintProgress.completed_tasks / metrics.sprintProgress.total_tasks) * 100
                                    )
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
                                      (metrics.sprintProgress.completed_story_points /
                                        metrics.sprintProgress.total_story_points) *
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
          </div>
        </div>
      </div>
    </main>
  )
}
