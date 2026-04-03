-- Phase 5: Automation Rules
-- Create automation_rules table for workflow automation

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS automation_rules (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    trigger_config JSONB NOT NULL,
    conditions JSONB,
    actions JSONB NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_automation_rules_project_id ON automation_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_is_enabled ON automation_rules(is_enabled);

-- Add comment
COMMENT ON TABLE automation_rules IS 'Automation rules for workflow triggers and actions';
