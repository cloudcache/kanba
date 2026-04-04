-- ============================================
-- Kanba - PostgreSQL Database Initialization
-- Version: 1.0.0
-- ============================================

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS / PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- For non-OAuth users
  full_name VARCHAR(255),
  avatar_url TEXT,
  subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  stripe_customer_id VARCHAR(255),
  auth_provider VARCHAR(50) DEFAULT 'local', -- local, google, github, ldap
  ldap_dn TEXT,
  external_id VARCHAR(255),
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_admin BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE,
  color VARCHAR(20) DEFAULT '#6366f1',
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  public_share_token VARCHAR(255),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_is_archived ON projects(is_archived);

-- ============================================
-- 3. COLUMNS TABLE (Kanban Columns)
-- ============================================
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  name VARCHAR(255), -- Alias for title
  position INTEGER DEFAULT 0,
  color VARCHAR(20),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_columns_project_id ON columns(project_id);
CREATE INDEX idx_columns_position ON columns(position);

-- ============================================
-- 4. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'todo',
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  is_done BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_type VARCHAR(50) DEFAULT 'task', -- task, bug, feature, epic, story
  labels JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_is_done ON tasks(is_done);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);

-- ============================================
-- 5. PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- ============================================
-- 6. TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_edited BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);

-- ============================================
-- 7. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- project, task, column, comment
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_task_id ON activity_logs(task_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================
-- 8. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error, mention, assignment
  read BOOLEAN DEFAULT false,
  link TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- 9. BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id),
  UNIQUE(user_id, task_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

-- ============================================
-- 10. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',
  interval VARCHAR(20) DEFAULT 'month', -- month, year
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSONB DEFAULT '[]',
  project_limit INTEGER DEFAULT 1,
  task_limit INTEGER DEFAULT 100,
  member_limit INTEGER DEFAULT 1,
  storage_limit_mb INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);

-- ============================================
-- 11. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_category ON system_settings(category);

-- ============================================
-- 12. STRIPE CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- ============================================
-- 13. STRIPE SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, trialing, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stripe_subscriptions_user_id ON stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subscriptions_status ON stripe_subscriptions(status);

-- ============================================
-- 14. USER SESSIONS TABLE (for custom auth)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- 15. PROJECT INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_invitations_token ON project_invitations(token);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate slug for projects
CREATE OR REPLACE FUNCTION generate_project_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_project_slug_trigger BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION generate_project_slug();

-- Auto-sync name and title for columns
CREATE OR REPLACE FUNCTION sync_column_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NULL THEN
    NEW.name = NEW.title;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_column_name_trigger BEFORE INSERT OR UPDATE ON columns
  FOR EACH ROW EXECUTE FUNCTION sync_column_name();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default subscription plans
INSERT INTO subscription_plans (name, description, price, currency, interval, features, project_limit, task_limit, member_limit, is_active, sort_order) VALUES
  ('Free', 'Basic features for individuals', 0, 'usd', 'month', '["1 Project", "100 Tasks", "1 Member", "Basic Support"]', 1, 100, 1, true, 1),
  ('Pro', 'Unlimited features for professionals', 4.90, 'usd', 'month', '["Unlimited Projects", "Unlimited Tasks", "10 Members", "Priority Support", "API Access", "Advanced Analytics"]', -1, -1, 10, true, 2),
  ('Enterprise', 'Custom solutions for teams', 19.90, 'usd', 'month', '["Everything in Pro", "Unlimited Members", "SSO/LDAP", "Dedicated Support", "Custom Integrations", "SLA"]', -1, -1, -1, true, 3)
ON CONFLICT DO NOTHING;

-- Default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
  ('site_name', '"Kanba"', 'Site name displayed in the UI', 'general', true),
  ('site_description', '"Project Management Made Simple"', 'Site description for SEO', 'general', true),
  ('allow_registration', 'true', 'Allow new user registration', 'auth', false),
  ('require_email_verification', 'false', 'Require email verification after signup', 'auth', false),
  ('ldap_enabled', 'false', 'Enable LDAP authentication', 'auth', false),
  ('free_project_limit', '1', 'Maximum projects for free users', 'limits', false),
  ('free_task_limit', '100', 'Maximum tasks per project for free users', 'limits', false),
  ('stripe_enabled', 'true', 'Enable Stripe payments', 'payment', false),
  ('payment_currency', '"usd"', 'Default payment currency', 'payment', false),
  ('enable_ai_features', 'false', 'Enable AI-powered features', 'features', false),
  ('enable_api_access', 'false', 'Enable API access for users', 'features', false),
  ('enable_webhooks', 'false', 'Enable webhook integrations', 'features', false)
ON CONFLICT (key) DO NOTHING;

-- Create default admin user (password: admin123 - CHANGE THIS!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO profiles (email, password_hash, full_name, is_admin, email_verified) VALUES
  ('admin@kanba.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q.1z.lKT0lK0Vu', 'System Admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ORGANIZATION TABLES
-- ============================================

-- Organizations (matches Prisma schema)
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  billing_plan VARCHAR(50) DEFAULT 'free',
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles (matches Prisma schema)
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(30) REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT false,
  hierarchy_level INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Organization Members (matches Prisma schema)
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(30) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id VARCHAR(30) REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited', 'pending')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Invitations (matches Prisma schema)
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id VARCHAR(30) REFERENCES roles(id),
  invited_by VARCHAR(30) NOT NULL REFERENCES profiles(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces (matches Prisma schema)
CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'internal', 'public')),
  settings JSONB,
  position INTEGER DEFAULT 0,
  created_by VARCHAR(30) REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(30) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(30) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id VARCHAR(30) REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited', 'pending')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Workspace Projects
CREATE TABLE IF NOT EXISTS workspace_projects (
  id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(30) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id VARCHAR(30) NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, project_id)
);

-- Indexes for organization tables
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_org ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_visibility ON workspaces(visibility);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_project ON workspace_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system);

-- ============================================
-- END OF INITIALIZATION
-- ============================================
