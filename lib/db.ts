import { supabase, type TeamMember, type Project, type Sprint, type Task, type SprintProgress, type DashboardMetrics } from './supabase';

// Team Members
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('team_members')
    .insert([member])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Sprints
export async function getSprints(projectId: string): Promise<Sprint[]> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveSprint(projectId: string): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getSprint(id: string): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createSprint(sprint: Omit<Sprint, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('sprints')
    .insert([sprint])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSprint(id: string, updates: Partial<Sprint>) {
  const { data, error } = await supabase
    .from('sprints')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSprint(id: string) {
  const { error } = await supabase
    .from('sprints')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Tasks
export async function getTasks(sprintId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Sprint Progress
export async function getSprintProgress(sprintId: string): Promise<SprintProgress[]> {
  const { data, error } = await supabase
    .from('sprint_progress')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('date', { ascending: true });

  if (error) throw error;
  if (data && data.length > 0) {
    return data.map((row: any) => {
      const devCompletedTasks = row.developer_completed_tasks ?? 0;
      const devTotalTasks = row.developer_total_tasks ?? 0;
      const devCompletedSP = row.developer_completed_story_points ?? 0;
      const devTotalSP = row.developer_total_story_points ?? 0;
      const desCompletedTasks = row.designer_completed_tasks ?? 0;
      const desTotalTasks = row.designer_total_tasks ?? 0;
      const desCompletedSP = row.designer_completed_story_points ?? 0;
      const desTotalSP = row.designer_total_story_points ?? 0;

      return {
        ...row,
        developer_completed_tasks: devCompletedTasks,
        developer_total_tasks: devTotalTasks,
        developer_completed_story_points: devCompletedSP,
        developer_total_story_points: devTotalSP,
        designer_completed_tasks: desCompletedTasks,
        designer_total_tasks: desTotalTasks,
        designer_completed_story_points: desCompletedSP,
        designer_total_story_points: desTotalSP,
        completed_tasks: devCompletedTasks + desCompletedTasks,
        total_tasks: devTotalTasks + desTotalTasks,
        completed_story_points: devCompletedSP + desCompletedSP,
        total_story_points: devTotalSP + desTotalSP,
      } as SprintProgress;
    });
  }

  const [sprint, tasks, teamMembers] = await Promise.all([getSprint(sprintId), getTasks(sprintId), getTeamMembers()]);
  if (!sprint) return [];

  const teamById = new Map<string, TeamMember['team']>();
  for (const m of teamMembers) {
    if (m?.id && m.team) teamById.set(m.id, m.team);
  }

  const devTasks = tasks.filter((t) => t.assigned_to && teamById.get(t.assigned_to) === 'developer');
  const desTasks = tasks.filter((t) => t.assigned_to && teamById.get(t.assigned_to) === 'designer');

  const devTotalTasks = devTasks.length;
  const devCompletedTasks = devTasks.filter((t) => t.status === 'done').length;
  const desTotalTasks = desTasks.length;
  const desCompletedTasks = desTasks.filter((t) => t.status === 'done').length;

  const devTotalSP = devTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const devCompletedSP = devTasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const desTotalSP = desTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const desCompletedSP = desTasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);

  const nowISO = new Date().toISOString();
  const startDate = sprint.start_date;
  const todayDate = new Date().toISOString().slice(0, 10);

  return [
    {
      id: `computed-${sprintId}-${startDate}`,
      sprint_id: sprintId,
      date: startDate,
      developer_completed_tasks: 0,
      developer_total_tasks: devTotalTasks,
      developer_completed_story_points: 0,
      developer_total_story_points: devTotalSP,
      designer_completed_tasks: 0,
      designer_total_tasks: desTotalTasks,
      designer_completed_story_points: 0,
      designer_total_story_points: desTotalSP,
      completed_tasks: 0,
      total_tasks: devTotalTasks + desTotalTasks,
      completed_story_points: 0,
      total_story_points: devTotalSP + desTotalSP,
      created_at: nowISO,
    },
    {
      id: `computed-${sprintId}-${todayDate}`,
      sprint_id: sprintId,
      date: todayDate,
      developer_completed_tasks: devCompletedTasks,
      developer_total_tasks: devTotalTasks,
      developer_completed_story_points: devCompletedSP,
      developer_total_story_points: devTotalSP,
      designer_completed_tasks: desCompletedTasks,
      designer_total_tasks: desTotalTasks,
      designer_completed_story_points: desCompletedSP,
      designer_total_story_points: desTotalSP,
      completed_tasks: devCompletedTasks + desCompletedTasks,
      total_tasks: devTotalTasks + desTotalTasks,
      completed_story_points: devCompletedSP + desCompletedSP,
      total_story_points: devTotalSP + desTotalSP,
      created_at: nowISO,
    },
  ];
}

export async function recordSprintProgress(
  progress: Omit<
    SprintProgress,
    | 'id'
    | 'created_at'
    | 'completed_tasks'
    | 'total_tasks'
    | 'completed_story_points'
    | 'total_story_points'
  >
) {
  const { data, error } = await supabase
    .from('sprint_progress')
    .insert([progress])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Dashboard Metrics
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const projects = await getProjects();
    const activeProjects = projects.filter(p => p.status === 'active');
    const allTasks = await Promise.all(
      projects.map(async (p) => {
        const sprints = await getSprints(p.id);
        const tasks = await Promise.all(sprints.map(s => getTasks(s.id)));
        return tasks.flat();
      })
    );
    const flatTasks = allTasks.flat();
    const completedTasks = flatTasks.filter(t => t.status === 'done').length;
    const teamMembers = await getTeamMembers();
    let currentSprint: Sprint | null = null;
    for (const project of activeProjects) {
      currentSprint = await getActiveSprint(project.id);
      if (currentSprint) break;
    }
    const sprintProgress = currentSprint ? (await getSprintProgress(currentSprint.id)).pop() : undefined;

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalTasks: flatTasks.length,
      completedTasks,
      totalTeamMembers: teamMembers.length,
      currentSprint: currentSprint || undefined,
      sprintProgress,
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return {
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      totalTeamMembers: 0,
    };
  }
}
