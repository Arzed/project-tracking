'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { deleteTask, updateTask } from '@/lib/db';
import type { Task, TeamMember } from '@/lib/supabase';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
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

interface KanbanBoardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskUpdate: () => void;
}

const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

export function KanbanBoard({ tasks, teamMembers, onTaskUpdate }: KanbanBoardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Task['status'] | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setIsUpdating(true);
    try {
      await updateTask(taskId, { status: newStatus });
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, fromStatus: Task['status']) => {
    if (isUpdating) return;
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('application/x-kanban-from-status', fromStatus);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
    if (isUpdating) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) setDragOverStatus(status);
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    if (isUpdating) return;
    e.preventDefault();
    setDragOverStatus(null);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === status) return;

    await handleStatusChange(taskId, status);
  };

  const handleDelete = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await deleteTask(taskId);
      onTaskUpdate();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setDeletingTaskId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'review':
        return 'Review';
      case 'done':
        return 'Done';
      default:
        return status;
    }
  };

  const getAssignee = (assignedTo?: string) => {
    return teamMembers.find((m) => m.id === assignedTo);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUSES.map((status) => {
        const statusTasks = tasks.filter((t) => t.status === status);
        const isOver = dragOverStatus === status;
        return (
          <div key={status} className="flex flex-col">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">{getStatusLabel(status)}</h3>
              <p className="text-sm text-muted-foreground">{statusTasks.length} tasks</p>
            </div>

            <div
              className={`space-y-3 flex-1 rounded-lg transition-colors ${isOver ? 'bg-muted/30 ring-2 ring-primary/40' : ''}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDrop={(e) => handleDrop(e, status)}
              onDragLeave={() => {
                if (dragOverStatus === status) setDragOverStatus(null);
              }}
            >
              {statusTasks.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center text-muted-foreground text-sm min-h-96">
                  No tasks
                </div>
              ) : (
                statusTasks.map((task) => {
                  const assignee = getAssignee(task.assigned_to);
                  const nextStatuses = STATUSES.slice(STATUSES.indexOf(status) + 1);
                  return (
                    <Card
                      key={task.id}
                      draggable={!isUpdating}
                      onDragStart={(e) => handleDragStart(e, task.id, status)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${draggingTaskId === task.id ? 'opacity-60' : ''}`}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-foreground text-sm line-clamp-2">{task.title}</h4>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <Link
                                href={`/tasks/${task.id}`}
                                className="text-xs text-primary underline underline-offset-2"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                              >
                                Detail
                              </Link>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline underline-offset-2 disabled:opacity-50"
                                    disabled={isUpdating || deletingTaskId === task.id}
                                    onDragStart={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="size-3.5" />
                                    Hapus
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus task?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tindakan ini tidak bisa dibatalkan. Task akan dihapus permanen.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={deletingTaskId === task.id}>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(task.id)}
                                      disabled={deletingTaskId === task.id}
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {task.task_type && (
                              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {task.task_type}
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>

                          {task.story_points && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">{task.story_points} pts</span>
                            </div>
                          )}

                          {assignee && (
                            <div className="text-xs">
                              <p className="text-muted-foreground">Assigned to</p>
                              <p className="font-medium text-foreground">{assignee.name}</p>
                            </div>
                          )}

                          {nextStatuses.length > 0 && (
                            <div className="flex gap-1 pt-2 border-t">
                              {nextStatuses.map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  onClick={() => handleStatusChange(task.id, nextStatus)}
                                  disabled={isUpdating}
                                  className="flex-1 px-2 py-1 text-xs font-medium rounded bg-muted hover:bg-muted/80 disabled:opacity-50"
                                  title={`Move to ${getStatusLabel(nextStatus)}`}
                                >
                                  {getStatusLabel(nextStatus).split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
