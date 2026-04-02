-- Migration: M020_create_field_definitions
-- Phase: 3 - Multi-dimensional table
-- Description: Create field definitions table for custom fields

-- Create field type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
    CREATE TYPE field_type AS ENUM (
      'text', 'textarea', 'number', 'currency', 'percent',
      'date', 'datetime', 'duration',
      'select', 'multiselect', 'status', 'priority',
      'user', 'users', 'relation',
      'attachment', 'url', 'email', 'phone',
      'formula', 'rollup', 'lookup', 'progress', 'rating', 'checkbox'
    );
  END IF;
END $$;

-- Create field_definitions table
CREATE TABLE IF NOT EXISTS field_definitions (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  config JSON,
  position INT DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_field_project FOREIGN KEY (project_id) 
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT uq_field_project_slug UNIQUE (project_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_field_definitions_project ON field_definitions(project_id);
CREATE INDEX IF NOT EXISTS idx_field_definitions_type ON field_definitions(type);
CREATE INDEX IF NOT EXISTS idx_field_definitions_system ON field_definitions(is_system);

-- Create field_options table
CREATE TABLE IF NOT EXISTS field_options (
  id VARCHAR(36) PRIMARY KEY,
  field_definition_id VARCHAR(36) NOT NULL,
  label VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  icon VARCHAR(50),
  position INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_option_field FOREIGN KEY (field_definition_id) 
    REFERENCES field_definitions(id) ON DELETE CASCADE,
  CONSTRAINT uq_option_field_value UNIQUE (field_definition_id, value)
);

CREATE INDEX IF NOT EXISTS idx_field_options_field ON field_options(field_definition_id);
CREATE INDEX IF NOT EXISTS idx_field_options_position ON field_options(position);

-- Create field_values table (EAV pattern)
CREATE TABLE IF NOT EXISTS field_values (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  field_definition_id VARCHAR(36) NOT NULL,
  text_value TEXT,
  number_value DOUBLE PRECISION,
  date_value TIMESTAMP,
  json_value JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_value_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_value_field FOREIGN KEY (field_definition_id) 
    REFERENCES field_definitions(id) ON DELETE CASCADE,
  CONSTRAINT uq_task_field_value UNIQUE (task_id, field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_field_values_task ON field_values(task_id);
CREATE INDEX IF NOT EXISTS idx_field_values_field ON field_values(field_definition_id);

-- Create field_templates table
CREATE TABLE IF NOT EXISTS field_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL,
  config JSON,
  position INT DEFAULT 0,
  is_default BOOLEAN DEFAULT TRUE,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO field_templates (id, name, slug, type, config, position, is_default, description) VALUES
  ('tpl_title', 'Title', 'title', 'text', '{"isTitle": true, "maxLength": 500}', 0, TRUE, 'Task title'),
  ('tpl_description', 'Description', 'description', 'textarea', '{"enableRichText": true}', 1, TRUE, 'Task description'),
  ('tpl_status', 'Status', 'status', 'status', '{"options": [{"id": "todo", "label": "To Do", "color": "#6b7280"}, {"id": "in_progress", "label": "In Progress", "color": "#3b82f6"}, {"id": "done", "label": "Done", "color": "#22c55e"}], "doneStatuses": ["done"], "defaultStatus": "todo"}', 2, TRUE, 'Task status'),
  ('tpl_priority', 'Priority', 'priority', 'priority', '{"options": [{"id": "low", "label": "Low", "color": "#22c55e"}, {"id": "medium", "label": "Medium", "color": "#eab308"}, {"id": "high", "label": "High", "color": "#ef4444"}, {"id": "urgent", "label": "Urgent", "color": "#dc2626"}], "defaultPriority": "medium"}', 3, TRUE, 'Task priority'),
  ('tpl_assignee', 'Assignee', 'assignee', 'user', '{"allowMultiple": false, "scope": "project"}', 4, TRUE, 'Task assignee'),
  ('tpl_due_date', 'Due Date', 'due_date', 'date', '{"includeTime": false}', 5, TRUE, 'Task due date')
ON CONFLICT (slug) DO NOTHING;
