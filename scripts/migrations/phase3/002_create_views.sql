-- Migration: M040_create_views
-- Phase: 3 - View System
-- Description: Create views table for multiple project views

-- Create view type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'view_type') THEN
    CREATE TYPE view_type AS ENUM (
      'kanban', 'list', 'table', 'calendar', 'timeline', 'gantt', 'gallery'
    );
  END IF;
END $$;

-- Create views table
CREATE TABLE IF NOT EXISTS views (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  config JSON NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_personal BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(36),
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_view_project FOREIGN KEY (project_id) 
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_view_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_views_project ON views(project_id);
CREATE INDEX IF NOT EXISTS idx_views_type ON views(type);
CREATE INDEX IF NOT EXISTS idx_views_creator ON views(created_by);
CREATE INDEX IF NOT EXISTS idx_views_default ON views(is_default);
CREATE INDEX IF NOT EXISTS idx_views_personal ON views(is_personal, created_by);
