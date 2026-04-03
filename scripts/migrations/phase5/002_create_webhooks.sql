-- Phase 5: Webhooks
-- Create webhooks and webhook_deliveries tables

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255),
    project_id VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    secret VARCHAR(255),
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id VARCHAR(255) PRIMARY KEY,
    webhook_id VARCHAR(255) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_project_id ON webhooks(project_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

-- Create indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Add comments
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery history and status';
