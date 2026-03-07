-- Insert sample team members
INSERT INTO team_members (id, name, email, team) VALUES
('tm1', 'John Developer', 'john@example.com', 'developer'),
('tm2', 'Sarah Developer', 'sarah@example.com', 'developer'),
('tm3', 'Mike Designer', 'mike@example.com', 'designer'),
('tm4', 'Lisa Designer', 'lisa@example.com', 'designer')
ON CONFLICT (id) DO NOTHING;

-- Insert sample projects
INSERT INTO projects (id, name, description, status) VALUES
('proj1', 'Mobile App Redesign', 'Complete redesign of the mobile application', 'active'),
('proj2', 'Backend API Optimization', 'Optimize API endpoints for better performance', 'planning'),
('proj3', 'Dashboard Enhancement', 'Improve dashboard with new features', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample sprints (2-week sprints)
INSERT INTO sprints (id, project_id, name, start_date, end_date, status) VALUES
('sprint1', 'proj1', 'Sprint 1', '2025-01-01'::date, '2025-01-14'::date, 'completed'),
('sprint2', 'proj1', 'Sprint 2', '2025-01-15'::date, '2025-01-28'::date, 'completed'),
('sprint3', 'proj1', 'Sprint 3', '2025-01-29'::date, '2025-02-11'::date, 'active'),
('sprint4', 'proj1', 'Sprint 4', '2025-02-12'::date, '2025-02-25'::date, 'upcoming'),
('sprint5', 'proj2', 'Sprint 1', '2025-02-01'::date, '2025-02-14'::date, 'active'),
('sprint6', 'proj3', 'Sprint 1', '2025-01-15'::date, '2025-01-28'::date, 'completed')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 1 (proj1)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task1', 'sprint1', 'Design new home screen', 'Create new home screen design for mobile app', 'done', 'high', 5, 'designer', 'tm3'),
('task2', 'sprint1', 'Implement authentication flow', 'Build login and signup screens', 'done', 'high', 8, 'developer', 'tm1'),
('task3', 'sprint1', 'Create user profile page', 'Design and implement user profile', 'done', 'medium', 5, 'designer', 'tm4'),
('task4', 'sprint1', 'API integration for auth', 'Connect authentication APIs', 'done', 'high', 5, 'developer', 'tm2')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 2 (proj1)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task5', 'sprint2', 'Dashboard design', 'Create main dashboard layout', 'done', 'high', 8, 'designer', 'tm3'),
('task6', 'sprint2', 'Implement dashboard UI', 'Build dashboard components', 'done', 'high', 8, 'developer', 'tm1'),
('task7', 'sprint2', 'Notification system design', 'Design push notification UI', 'done', 'medium', 3, 'designer', 'tm4'),
('task8', 'sprint2', 'Notification API', 'Build notification backend', 'done', 'medium', 5, 'developer', 'tm2')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 3 (proj1 - current)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task9', 'sprint3', 'Settings page design', 'Create settings screen design', 'in_progress', 'medium', 5, 'designer', 'tm3'),
('task10', 'sprint3', 'Implement settings UI', 'Build settings page components', 'in_progress', 'medium', 5, 'developer', 'tm1'),
('task11', 'sprint3', 'Payment integration design', 'Design payment screens', 'review', 'high', 8, 'designer', 'tm4'),
('task12', 'sprint3', 'Payment gateway integration', 'Integrate payment API', 'in_progress', 'high', 8, 'developer', 'tm2'),
('task13', 'sprint3', 'User feedback feature', 'Add feedback collection form', 'todo', 'low', 3, 'developer', 'tm1'),
('task14', 'sprint3', 'Analytics implementation', 'Track user analytics', 'todo', 'medium', 5, 'developer', 'tm2')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 4 (proj1 - upcoming)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task15', 'sprint4', 'Performance optimization', 'Optimize app performance', 'todo', 'medium', 5, 'developer', 'tm1'),
('task16', 'sprint4', 'Dark mode support', 'Add dark mode theme', 'todo', 'low', 3, 'designer', 'tm3'),
('task17', 'sprint4', 'Bug fixes', 'Fix reported bugs', 'todo', 'high', 5, 'developer', 'tm2')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 5 (proj2)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task18', 'sprint5', 'API endpoint optimization', 'Optimize slow endpoints', 'in_progress', 'high', 8, 'developer', 'tm1'),
('task19', 'sprint5', 'Database query optimization', 'Optimize database queries', 'in_progress', 'high', 8, 'developer', 'tm2'),
('task20', 'sprint5', 'Caching implementation', 'Add caching layer', 'todo', 'medium', 5, 'developer', 'tm1')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for Sprint 6 (proj3)
INSERT INTO tasks (id, sprint_id, title, description, status, priority, story_points, role, assigned_to) VALUES
('task21', 'sprint6', 'Dashboard redesign', 'Redesign dashboard layout', 'done', 'high', 8, 'designer', 'tm4'),
('task22', 'sprint6', 'New chart components', 'Build chart visualization', 'done', 'high', 8, 'developer', 'tm2'),
('task23', 'sprint6', 'Data export feature', 'Add CSV export functionality', 'done', 'medium', 5, 'developer', 'tm1')
ON CONFLICT (id) DO NOTHING;

-- Insert sprint progress data
INSERT INTO sprint_progress (
  id,
  sprint_id,
  date,
  completed_tasks,
  total_tasks,
  completed_story_points,
  total_story_points
) VALUES
-- Sprint 1 Progress
('prog1', 'sprint1', '2025-01-01'::date, 0, 4, 0, 23),
('prog2', 'sprint1', '2025-01-04'::date, 1, 4, 5, 23),
('prog3', 'sprint1', '2025-01-07'::date, 2, 4, 13, 23),
('prog4', 'sprint1', '2025-01-10'::date, 3, 4, 18, 23),
('prog5', 'sprint1', '2025-01-14'::date, 4, 4, 23, 23),
-- Sprint 2 Progress
('prog6', 'sprint2', '2025-01-15'::date, 0, 4, 0, 24),
('prog7', 'sprint2', '2025-01-18'::date, 1, 4, 6, 24),
('prog8', 'sprint2', '2025-01-21'::date, 2, 4, 14, 24),
('prog9', 'sprint2', '2025-01-24'::date, 3, 4, 20, 24),
('prog10', 'sprint2', '2025-01-28'::date, 4, 4, 24, 24),
-- Sprint 3 Progress (current)
('prog11', 'sprint3', '2025-01-29'::date, 0, 6, 0, 34),
('prog12', 'sprint3', '2025-02-01'::date, 1, 6, 3, 34),
('prog13', 'sprint3', '2025-02-04'::date, 2, 6, 8, 34),
('prog14', 'sprint3', '2025-02-07'::date, 3, 6, 15, 34),
('prog15', 'sprint3', '2025-02-11'::date, 3, 6, 19, 34)
ON CONFLICT (id) DO NOTHING;
