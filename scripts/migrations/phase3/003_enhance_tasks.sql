-- Migration: M030_enhance_tasks
-- Phase: 3 - Task Enhancements
-- Description: Enhance tasks table with subtasks, links, and additional features

-- Create task type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_type_enum') THEN
    CREATE TYPE task_type_enum AS ENUM (
      'epic', 'story', 'task', 'subtask', 'bug', 'milestone'
    );
  END IF;
END $$;

-- Create link type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_type') THEN
    CREATE TYPE link_type AS ENUM (
      'blocks', 'blocked_by', 'relates_to', 'duplicates', 'cloned_from', 'parent_of'
    );
  END IF;
END $$;

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Make column_id nullable (tasks can exist without being in a column)
ALTER TABLE tasks ALTER COLUMN column_id DROP NOT NULL;

-- Change position to FLOAT for fractional positioning
ALTER TABLE tasks ALTER COLUMN position TYPE DOUBLE PRECISION;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived_at);

-- Add self-referential foreign key for parent_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_task_parent' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT fk_task_parent 
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create task_links table
CREATE TABLE IF NOT EXISTS task_links (
  id VARCHAR(36) PRIMARY KEY,
  from_task_id VARCHAR(36) NOT NULL,
  to_task_id VARCHAR(36) NOT NULL,
  link_type VARCHAR(20) NOT NULL,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_link_from FOREIGN KEY (from_task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_to FOREIGN KEY (to_task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_task_link UNIQUE (from_task_id, to_task_id, link_type)
);

CREATE INDEX IF NOT EXISTS idx_task_links_from ON task_links(from_task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_to ON task_links(to_task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_type ON task_links(link_type);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  thumbnail_url VARCHAR(1000),
  storage_provider VARCHAR(20) DEFAULT 'supabase',
  storage_path VARCHAR(500),
  uploaded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_attachment_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachment_uploader FOREIGN KEY (uploaded_by) 
    REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_type ON attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON attachments(uploaded_by);

-- Create task_watchers table
CREATE TABLE IF NOT EXISTS task_watchers (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_watcher_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_watcher_user FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT uq_task_watcher UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON task_watchers(user_id);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  description VARCHAR(500),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration INT,
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_time_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_time_user FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON time_entries(started_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(billable);

-- Create labels table
CREATE TABLE IF NOT EXISTS labels (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_label_project FOREIGN KEY (project_id) 
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT uq_label_project_name UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_labels_project ON labels(project_id);

-- Create task_labels junction table
CREATE TABLE IF NOT EXISTS task_labels (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  label_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_tl_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_tl_label FOREIGN KEY (label_id) 
    REFERENCES labels(id) ON DELETE CASCADE,
  CONSTRAINT uq_task_label UNIQUE (task_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id);

-- Migrate existing tasks: Set project_id from column
UPDATE tasks t
SET project_id = c.project_id
FROM columns c
WHERE t.column_id = c.id AND t.project_id IS NULL;
