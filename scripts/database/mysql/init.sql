-- ============================================
-- Kanba - MySQL Database Initialization
-- Version: 1.0.0
-- Requires MySQL 8.0+
-- ============================================

-- Set character encoding
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================
-- 1. USERS / PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  subscription_status ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  auth_provider VARCHAR(50) DEFAULT 'local',
  ldap_dn TEXT,
  external_id VARCHAR(255),
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_admin BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profiles_email (email),
  INDEX idx_profiles_stripe_customer (stripe_customer_id),
  INDEX idx_profiles_is_admin (is_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE,
  color VARCHAR(20) DEFAULT '#6366f1',
  user_id CHAR(36),
  created_by CHAR(36),
  updated_by CHAR(36),
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  public_share_token VARCHAR(255),
  settings JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_projects_user_id (user_id),
  INDEX idx_projects_slug (slug),
  INDEX idx_projects_is_archived (is_archived),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. COLUMNS TABLE (Kanban Columns)
-- ============================================
CREATE TABLE IF NOT EXISTS `columns` (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  position INT DEFAULT 0,
  color VARCHAR(20),
  project_id CHAR(36),
  created_by CHAR(36),
  updated_by CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_columns_project_id (project_id),
  INDEX idx_columns_position (position),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  column_id CHAR(36),
  project_id CHAR(36),
  position INT DEFAULT 0,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo',
  due_date DATETIME,
  start_date DATETIME,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  is_done BOOLEAN DEFAULT FALSE,
  created_by CHAR(36),
  updated_by CHAR(36),
  assigned_to CHAR(36),
  parent_id CHAR(36),
  task_type VARCHAR(50) DEFAULT 'task',
  labels JSON DEFAULT (JSON_ARRAY()),
  attachments JSON DEFAULT (JSON_ARRAY()),
  custom_fields JSON DEFAULT (JSON_OBJECT()),
  archived_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tasks_column_id (column_id),
  INDEX idx_tasks_project_id (project_id),
  INDEX idx_tasks_assigned_to (assigned_to),
  INDEX idx_tasks_is_done (is_done),
  INDEX idx_tasks_due_date (due_date),
  INDEX idx_tasks_parent_id (parent_id),
  FOREIGN KEY (column_id) REFERENCES `columns`(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36),
  user_id CHAR(36),
  role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
  invited_by CHAR(36),
  invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_project_member (project_id, user_id),
  INDEX idx_project_members_project_id (project_id),
  INDEX idx_project_members_user_id (user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  task_id CHAR(36),
  user_id CHAR(36),
  content TEXT NOT NULL,
  attachments JSON DEFAULT (JSON_ARRAY()),
  is_edited BOOLEAN DEFAULT FALSE,
  parent_id CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_task_comments_task_id (task_id),
  INDEX idx_task_comments_user_id (user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  project_id CHAR(36),
  task_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id CHAR(36),
  old_value JSON,
  new_value JSON,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_logs_user_id (user_id),
  INDEX idx_activity_logs_project_id (project_id),
  INDEX idx_activity_logs_task_id (task_id),
  INDEX idx_activity_logs_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  `read` BOOLEAN DEFAULT FALSE,
  link TEXT,
  data JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_read (`read`),
  INDEX idx_notifications_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  project_id CHAR(36),
  task_id CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_project_bookmark (user_id, project_id),
  UNIQUE KEY unique_task_bookmark (user_id, task_id),
  INDEX idx_bookmarks_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'usd',
  `interval` VARCHAR(20) DEFAULT 'month',
  stripe_product_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  features JSON DEFAULT (JSON_ARRAY()),
  project_limit INT DEFAULT 1,
  task_limit INT DEFAULT 100,
  member_limit INT DEFAULT 1,
  storage_limit_mb INT DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscription_plans_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 11. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  `key` VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_system_settings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 12. STRIPE CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) UNIQUE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  metadata JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stripe_customers_user_id (user_id),
  INDEX idx_stripe_customers_stripe_id (stripe_customer_id),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 13. STRIPE SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at DATETIME,
  canceled_at DATETIME,
  trial_start DATETIME,
  trial_end DATETIME,
  metadata JSON DEFAULT (JSON_OBJECT()),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_stripe_subscriptions_user_id (user_id),
  INDEX idx_stripe_subscriptions_status (status),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 14. USER SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_token (token),
  INDEX idx_user_sessions_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 15. PROJECT INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  project_id CHAR(36),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by CHAR(36),
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project_invitations_token (token),
  INDEX idx_project_invitations_email (email),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-generate slug for projects
DELIMITER //
CREATE TRIGGER before_project_insert
BEFORE INSERT ON projects
FOR EACH ROW
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    SET NEW.slug = CONCAT(
      LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-')),
      '-',
      LEFT(NEW.id, 8)
    );
  END IF;
END//

-- Auto-sync name and title for columns
CREATE TRIGGER before_column_insert
BEFORE INSERT ON `columns`
FOR EACH ROW
BEGIN
  IF NEW.name IS NULL THEN
    SET NEW.name = NEW.title;
  END IF;
END//

CREATE TRIGGER before_column_update
BEFORE UPDATE ON `columns`
FOR EACH ROW
BEGIN
  IF NEW.name IS NULL THEN
    SET NEW.name = NEW.title;
  END IF;
END//
DELIMITER ;

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Default subscription plans
INSERT INTO subscription_plans (id, name, description, price, currency, `interval`, features, project_limit, task_limit, member_limit, is_active, sort_order) VALUES
  (UUID(), 'Free', 'Basic features for individuals', 0, 'usd', 'month', '["1 Project", "100 Tasks", "1 Member", "Basic Support"]', 1, 100, 1, TRUE, 1),
  (UUID(), 'Pro', 'Unlimited features for professionals', 4.90, 'usd', 'month', '["Unlimited Projects", "Unlimited Tasks", "10 Members", "Priority Support", "API Access", "Advanced Analytics"]', -1, -1, 10, TRUE, 2),
  (UUID(), 'Enterprise', 'Custom solutions for teams', 19.90, 'usd', 'month', '["Everything in Pro", "Unlimited Members", "SSO/LDAP", "Dedicated Support", "Custom Integrations", "SLA"]', -1, -1, -1, TRUE, 3);

-- Default system settings
INSERT INTO system_settings (`key`, value, description, category, is_public) VALUES
  ('site_name', '"Kanba"', 'Site name displayed in the UI', 'general', TRUE),
  ('site_description', '"Project Management Made Simple"', 'Site description for SEO', 'general', TRUE),
  ('allow_registration', 'true', 'Allow new user registration', 'auth', FALSE),
  ('require_email_verification', 'false', 'Require email verification after signup', 'auth', FALSE),
  ('ldap_enabled', 'false', 'Enable LDAP authentication', 'auth', FALSE),
  ('free_project_limit', '1', 'Maximum projects for free users', 'limits', FALSE),
  ('free_task_limit', '100', 'Maximum tasks per project for free users', 'limits', FALSE),
  ('stripe_enabled', 'true', 'Enable Stripe payments', 'payment', FALSE),
  ('payment_currency', '"usd"', 'Default payment currency', 'payment', FALSE),
  ('enable_ai_features', 'false', 'Enable AI-powered features', 'features', FALSE),
  ('enable_api_access', 'false', 'Enable API access for users', 'features', FALSE),
  ('enable_webhooks', 'false', 'Enable webhook integrations', 'features', FALSE);

-- Create default admin user (password: admin123 - CHANGE THIS!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO profiles (id, email, password_hash, full_name, is_admin, email_verified) VALUES
  (UUID(), 'admin@kanba.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Q.1z.lKT0lK0Vu', 'System Admin', TRUE, TRUE);

-- ============================================
-- ORGANIZATION TABLES
-- ============================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id CHAR(36),
  settings JSON DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSON DEFAULT '[]',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36),
  user_id CHAR(36),
  role_id CHAR(36),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_org_user (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36),
  email VARCHAR(255) NOT NULL,
  role_id CHAR(36),
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by CHAR(36),
  status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL,
  FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  organization_id CHAR(36),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settings JSON DEFAULT '{}',
  created_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for organization tables
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_workspaces_org ON workspaces(organization_id);
CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- END OF INITIALIZATION
-- ============================================
