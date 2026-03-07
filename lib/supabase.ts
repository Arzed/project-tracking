import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  team: 'developer' | 'designer';
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  sprint_id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assigned_to?: string;
  story_points?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  task_type: 'feature' | 'bug' | 'improvement' | 'design';
  created_at: string;
  updated_at: string;
}

export interface SprintProgress {
  id: string;
  sprint_id: string;
  date: string;
  developer_completed_tasks: number;
  developer_total_tasks: number;
  developer_completed_story_points: number;
  developer_total_story_points: number;
  designer_completed_tasks: number;
  designer_total_tasks: number;
  designer_completed_story_points: number;
  designer_total_story_points: number;
  completed_tasks: number;
  total_tasks: number;
  completed_story_points: number;
  total_story_points: number;
  created_at: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalTeamMembers: number;
  currentSprint?: Sprint;
  sprintProgress?: SprintProgress;
}
