# 数据库迁移计划

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [迁移概览](#一迁移概览)
2. [阶段一：基础设施](#二阶段一基础设施)
3. [阶段二：组织架构](#三阶段二组织架构)
4. [阶段三：多维表格](#四阶段三多维表格)
5. [阶段四：任务增强](#五阶段四任务增强)
6. [阶段五：视图系统](#六阶段五视图系统)
7. [数据迁移脚本](#七数据迁移脚本)

---

## 一、迁移概览

### 1.1 现有表结构

```sql
-- 现有表清单
profiles              -- 用户资料
projects              -- 项目
columns               -- 看板列
tasks                 -- 任务
task_comments         -- 任务评论
project_members       -- 项目成员
activity_logs         -- 活动日志
notifications         -- 通知
bookmarks             -- 收藏
stripe_customers      -- Stripe 客户
stripe_subscriptions  -- Stripe 订阅
stripe_orders         -- Stripe 订单
```

### 1.2 迁移策略

1. **向后兼容** - 所有新增字段提供默认值，不破坏现有数据
2. **分阶段执行** - 每个阶段独立迁移，可单独回滚
3. **数据保留** - 不删除现有数据，仅标记废弃
4. **零停机** - 在线迁移，不影响服务

### 1.3 迁移顺序总览

```
阶段一 (基础设施)
├── M001: 添加 auth_provider 字段到 profiles
├── M002: 添加 locale 字段到 profiles
└── M003: 创建 system_settings 表

阶段二 (组织架构)
├── M010: 创建 organizations 表
├── M011: 创建 organization_members 表
├── M012: 创建 roles 表
├── M013: 创建 permissions 表
├── M014: 创建 workspaces 表
├── M015: 创建 workspace_members 表
├── M016: 创建 invitations 表
├── M017: 修改 projects 表添加 workspace_id
├── M018: 修改 project_members 添加 role_id
└── M019: 迁移现有数据到新组织结构

阶段三 (多维表格)
├── M020: 创建 field_definitions 表
├── M021: 创建 field_options 表
├── M022: 创建 field_values 表
├── M023: 迁移现有任务字段到自定义字段
└── M024: 创建系统默认字段

阶段四 (任务增强)
├── M030: 修改 tasks 表添加层级支持
├── M031: 创建 task_links 表
├── M032: 创建 attachments 表
├── M033: 创建 task_watchers 表
├── M034: 创建 time_entries 表
└── M035: 创建 task_labels 表

阶段五 (视图系统)
├── M040: 创建 views 表
├── M041: 迁移现有 columns 到 views
└── M042: 创建默认视图
```

---

## 二、阶段一：基础设施

### M001: 添加 auth_provider 字段到 profiles

**目的**: 支持多认证源

```sql
-- Migration: M001_add_auth_provider_to_profiles
-- Description: 添加认证提供者字段以支持 LDAP/本地认证

-- PostgreSQL / MySQL 通用
ALTER TABLE profiles 
ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'supabase';

-- 添加 LDAP 相关字段
ALTER TABLE profiles 
ADD COLUMN ldap_dn VARCHAR(255) NULL;

ALTER TABLE profiles 
ADD COLUMN external_id VARCHAR(255) NULL;

-- 创建索引
CREATE INDEX idx_profiles_auth_provider ON profiles(auth_provider);
CREATE INDEX idx_profiles_external_id ON profiles(external_id);

-- 添加约束 (可选，确保只有 LDAP 用户有 ldap_dn)
-- ALTER TABLE profiles
-- ADD CONSTRAINT chk_ldap_dn CHECK (
--   (auth_provider = 'ldap' AND ldap_dn IS NOT NULL) OR
--   (auth_provider != 'ldap' AND ldap_dn IS NULL)
-- );
```

**Prisma Schema 变更**:

```prisma
model Profile {
  // ... 现有字段 ...
  
  // 新增字段
  auth_provider String  @default("supabase") @db.VarChar(20)
  ldap_dn       String? @db.VarChar(255)
  external_id   String? @db.VarChar(255)
  
  @@index([auth_provider])
  @@index([external_id])
}
```

### M002: 添加 locale 字段到 profiles

**目的**: 用户语言偏好

```sql
-- Migration: M002_add_locale_to_profiles
-- Description: 添加用户语言偏好字段

ALTER TABLE profiles 
ADD COLUMN locale VARCHAR(10) DEFAULT 'en';

ALTER TABLE profiles 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- 更新现有用户为默认值
UPDATE profiles SET locale = 'en' WHERE locale IS NULL;
UPDATE profiles SET timezone = 'UTC' WHERE timezone IS NULL;
```

**Prisma Schema 变更**:

```prisma
model Profile {
  // ... 现有字段 ...
  
  locale   String @default("en") @db.VarChar(10)
  timezone String @default("UTC") @db.VarChar(50)
}
```

### M003: 创建 system_settings 表

**目的**: 存储系统级配置

```sql
-- Migration: M003_create_system_settings
-- Description: 创建系统设置表

CREATE TABLE system_settings (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description VARCHAR(500),
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO system_settings (id, key, value, description) VALUES
  ('01', 'auth.providers', '["supabase"]', '启用的认证提供者'),
  ('02', 'auth.ldap.enabled', 'false', 'LDAP 认证是否启用'),
  ('03', 'i18n.default_locale', 'en', '默认语言'),
  ('04', 'i18n.available_locales', '["en","zh-CN"]', '可用语言列表');
```

**Prisma Schema**:

```prisma
model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(100)
  value       String   @db.Text
  description String?  @db.VarChar(500)
  is_secret   Boolean  @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@map("system_settings")
}
```

---

## 三、阶段二：组织架构

### M010: 创建 organizations 表

```sql
-- Migration: M010_create_organizations
-- Description: 创建组织表

CREATE TABLE organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  logo_url VARCHAR(500),
  billing_plan VARCHAR(20) DEFAULT 'free',
  settings JSON,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_org_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_billing_plan ON organizations(billing_plan);
```

**Prisma Schema**:

```prisma
model Organization {
  id           String   @id @default(cuid())
  name         String   @db.VarChar(100)
  slug         String   @unique @db.VarChar(100)
  description  String?  @db.Text
  logo_url     String?  @db.VarChar(500)
  billing_plan String   @default("free") @db.VarChar(20)
  settings     Json?
  created_by   String?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  // Relations
  creator    Profile?             @relation("OrgCreator", fields: [created_by], references: [id])
  members    OrganizationMember[]
  workspaces Workspace[]
  roles      Role[]
  invitations Invitation[]

  @@index([slug])
  @@index([billing_plan])
  @@map("organizations")
}
```

### M011: 创建 organization_members 表

```sql
-- Migration: M011_create_organization_members
-- Description: 创建组织成员表

CREATE TABLE organization_members (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_orgmember_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_orgmember_user FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_orgmember_role FOREIGN KEY (role_id) 
    REFERENCES roles(id),
  CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_orgmembers_org ON organization_members(organization_id);
CREATE INDEX idx_orgmembers_user ON organization_members(user_id);
CREATE INDEX idx_orgmembers_status ON organization_members(status);
```

### M012: 创建 roles 表

```sql
-- Migration: M012_create_roles
-- Description: 创建角色表

CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36),  -- NULL 表示系统预设角色
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  description VARCHAR(500),
  permissions JSON NOT NULL,    -- 权限列表
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_role_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_roles_org_slug ON roles(organization_id, slug);
CREATE INDEX idx_roles_is_system ON roles(is_system);

-- 插入系统预设角色
INSERT INTO roles (id, organization_id, name, slug, description, permissions, is_system) VALUES
  ('role_org_owner', NULL, 'Organization Owner', 'org_owner', '组织所有者，拥有全部权限', 
   '["*"]', TRUE),
  ('role_org_admin', NULL, 'Organization Admin', 'org_admin', '组织管理员，管理组织设置和成员',
   '["org:read","org:update","org:members:*","org:roles:*","workspace:*","project:*","task:*","view:*"]', TRUE),
  ('role_ws_admin', NULL, 'Workspace Admin', 'workspace_admin', '工作空间管理员',
   '["workspace:read","workspace:update","workspace:members:*","project:*","task:*","view:*"]', TRUE),
  ('role_proj_admin', NULL, 'Project Admin', 'project_admin', '项目管理员',
   '["project:read","project:update","project:members:*","project:fields:*","task:*","view:*"]', TRUE),
  ('role_member', NULL, 'Member', 'member', '普通成员',
   '["project:read","task:create","task:read","task:update","task:comment","view:read"]', TRUE),
  ('role_guest', NULL, 'Guest', 'guest', '访客，只读权限',
   '["project:read","task:read","view:read"]', TRUE);
```

### M013: 创建 permissions 表 (可选，用于权限审计)

```sql
-- Migration: M013_create_permission_audit
-- Description: 权限变更审计表

CREATE TABLE permission_audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36),
  actor_id VARCHAR(36) NOT NULL,
  target_user_id VARCHAR(36),
  target_role_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,   -- 'grant', 'revoke', 'role_change'
  resource_type VARCHAR(50),     -- 'organization', 'workspace', 'project'
  resource_id VARCHAR(36),
  old_value JSON,
  new_value JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) 
    REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_permission_audit_org ON permission_audit_logs(organization_id);
CREATE INDEX idx_permission_audit_actor ON permission_audit_logs(actor_id);
CREATE INDEX idx_permission_audit_target ON permission_audit_logs(target_user_id);
CREATE INDEX idx_permission_audit_created ON permission_audit_logs(created_at);
```

### M014: 创建 workspaces 表

```sql
-- Migration: M014_create_workspaces
-- Description: 创建工作空间表

CREATE TABLE workspaces (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'private',  -- private, internal, public
  icon VARCHAR(50),
  color VARCHAR(20),
  settings JSON,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_ws_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_ws_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_ws_org_slug UNIQUE (organization_id, slug)
);

CREATE INDEX idx_workspaces_org ON workspaces(organization_id);
CREATE INDEX idx_workspaces_visibility ON workspaces(visibility);
```

### M015: 创建 workspace_members 表

```sql
-- Migration: M015_create_workspace_members
-- Description: 创建工作空间成员表

CREATE TABLE workspace_members (
  id VARCHAR(36) PRIMARY KEY,
  workspace_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_wsmember_ws FOREIGN KEY (workspace_id) 
    REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_wsmember_user FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_wsmember_role FOREIGN KEY (role_id) 
    REFERENCES roles(id),
  CONSTRAINT uq_ws_user UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_wsmembers_ws ON workspace_members(workspace_id);
CREATE INDEX idx_wsmembers_user ON workspace_members(user_id);
```

### M016: 创建 invitations 表

```sql
-- Migration: M016_create_invitations
-- Description: 创建邀请表

CREATE TABLE invitations (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  workspace_id VARCHAR(36),
  project_id VARCHAR(36),
  email VARCHAR(255) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  token VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired, revoked
  invited_by VARCHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_invite_org FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_invite_ws FOREIGN KEY (workspace_id) 
    REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_invite_role FOREIGN KEY (role_id) 
    REFERENCES roles(id),
  CONSTRAINT fk_invite_inviter FOREIGN KEY (invited_by) 
    REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
```

### M017: 修改 projects 表

```sql
-- Migration: M017_modify_projects
-- Description: 为 projects 添加 workspace_id 和其他字段

-- 添加新字段
ALTER TABLE projects ADD COLUMN workspace_id VARCHAR(36);
ALTER TABLE projects ADD COLUMN visibility VARCHAR(20) DEFAULT 'private';
ALTER TABLE projects ADD COLUMN icon VARCHAR(50);
ALTER TABLE projects ADD COLUMN color VARCHAR(20);
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN default_view_id VARCHAR(36);

-- 暂时不添加外键约束，等数据迁移完成后再添加
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_archived ON projects(archived_at);
```

### M018: 修改 project_members 表

```sql
-- Migration: M018_modify_project_members
-- Description: 为 project_members 添加 role_id

ALTER TABLE project_members ADD COLUMN role_id VARCHAR(36);

-- 迁移现有角色数据
UPDATE project_members SET role_id = 'role_org_owner' WHERE role = 'owner';
UPDATE project_members SET role_id = 'role_proj_admin' WHERE role = 'admin';
UPDATE project_members SET role_id = 'role_member' WHERE role = 'member';

-- 添加外键约束
ALTER TABLE project_members 
  ADD CONSTRAINT fk_pm_role FOREIGN KEY (role_id) REFERENCES roles(id);

-- 保留原 role 字段一段时间，标记为废弃
-- 后续版本再删除
```

### M019: 数据迁移脚本

```sql
-- Migration: M019_migrate_to_org_structure
-- Description: 将现有数据迁移到新的组织结构

-- 1. 为每个项目所有者创建个人组织
INSERT INTO organizations (id, name, slug, description, created_by, created_at)
SELECT 
  CONCAT('org_', p.user_id),
  CONCAT(COALESCE(pr.full_name, pr.email), '''s Organization'),
  CONCAT('org-', LOWER(REPLACE(pr.email, '@', '-at-'))),
  'Auto-created personal organization',
  p.user_id,
  NOW()
FROM (SELECT DISTINCT user_id FROM projects) p
JOIN profiles pr ON p.user_id = pr.id
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 2. 将项目所有者添加为组织所有者
INSERT INTO organization_members (id, organization_id, user_id, role_id, status)
SELECT 
  CONCAT('om_', p.user_id),
  CONCAT('org_', p.user_id),
  p.user_id,
  'role_org_owner',
  'active'
FROM (SELECT DISTINCT user_id FROM projects) p
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 3. 为每个组织创建默认工作空间
INSERT INTO workspaces (id, organization_id, name, slug, description, created_by)
SELECT 
  CONCAT('ws_default_', o.id),
  o.id,
  'Default Workspace',
  'default',
  'Default workspace for existing projects',
  o.created_by
FROM organizations o
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 4. 将现有项目关联到默认工作空间
UPDATE projects p
SET workspace_id = CONCAT('ws_default_org_', p.user_id)
WHERE workspace_id IS NULL;

-- 5. 将现有项目成员添加到组织成员
INSERT INTO organization_members (id, organization_id, user_id, role_id, status)
SELECT 
  CONCAT('om_', pm.id),
  CONCAT('org_', p.user_id),
  pm.user_id,
  CASE pm.role 
    WHEN 'owner' THEN 'role_org_owner'
    WHEN 'admin' THEN 'role_proj_admin'
    ELSE 'role_member'
  END,
  'active'
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id != p.user_id
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 6. 添加外键约束 (在数据迁移完成后)
ALTER TABLE projects 
  ADD CONSTRAINT fk_project_workspace FOREIGN KEY (workspace_id) 
  REFERENCES workspaces(id) ON DELETE SET NULL;
```

---

## 四、阶段三：多维表格

### M020: 创建 field_definitions 表

```sql
-- Migration: M020_create_field_definitions
-- Description: 创建自定义字段定义表

CREATE TABLE field_definitions (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  config JSON,
  position INT DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_field_project FOREIGN KEY (project_id) 
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_field_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_field_project_slug UNIQUE (project_id, slug)
);

CREATE INDEX idx_field_defs_project ON field_definitions(project_id);
CREATE INDEX idx_field_defs_type ON field_definitions(type);
CREATE INDEX idx_field_defs_system ON field_definitions(is_system);
```

### M021: 创建 field_options 表

```sql
-- Migration: M021_create_field_options
-- Description: 创建字段选项表 (用于 select/multiselect/status 类型)

CREATE TABLE field_options (
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

CREATE INDEX idx_field_options_field ON field_options(field_definition_id);
```

### M022: 创建 field_values 表

```sql
-- Migration: M022_create_field_values
-- Description: 创建字段值表 (EAV 模式)

CREATE TABLE field_values (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  field_definition_id VARCHAR(36) NOT NULL,
  
  -- 根据字段类型使用不同的列
  text_value TEXT,
  number_value DECIMAL(20, 6),
  date_value TIMESTAMP,
  boolean_value BOOLEAN,
  json_value JSON,  -- 用于数组、对象等复杂类型
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_fv_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_fv_field FOREIGN KEY (field_definition_id) 
    REFERENCES field_definitions(id) ON DELETE CASCADE,
  CONSTRAINT uq_fv_task_field UNIQUE (task_id, field_definition_id)
);

CREATE INDEX idx_field_values_task ON field_values(task_id);
CREATE INDEX idx_field_values_field ON field_values(field_definition_id);
CREATE INDEX idx_field_values_text ON field_values(text_value(100));
CREATE INDEX idx_field_values_number ON field_values(number_value);
CREATE INDEX idx_field_values_date ON field_values(date_value);
```

### M023: 迁移现有任务字段

```sql
-- Migration: M023_migrate_task_fields
-- Description: 将现有任务的固定字段迁移为自定义字段值

-- 为每个项目创建系统字段定义
-- 此脚本需要为每个项目循环执行，这里展示单个项目的逻辑

-- 创建优先级字段
INSERT INTO field_definitions (id, project_id, name, slug, type, config, is_system, position)
SELECT 
  CONCAT('fd_priority_', id),
  id,
  'Priority',
  'priority',
  'priority',
  '{"options": [
    {"id": "low", "label": "Low", "color": "#22c55e"},
    {"id": "medium", "label": "Medium", "color": "#eab308"},
    {"id": "high", "label": "High", "color": "#ef4444"}
  ]}',
  TRUE,
  1
FROM projects;

-- 创建截止日期字段
INSERT INTO field_definitions (id, project_id, name, slug, type, config, is_system, position)
SELECT 
  CONCAT('fd_due_date_', id),
  id,
  'Due Date',
  'due_date',
  'date',
  '{"includeTime": false}',
  TRUE,
  2
FROM projects;

-- 创建负责人字段
INSERT INTO field_definitions (id, project_id, name, slug, type, config, is_system, position)
SELECT 
  CONCAT('fd_assignee_', id),
  id,
  'Assignee',
  'assignee',
  'user',
  '{"allowMultiple": false, "scope": "project"}',
  TRUE,
  3
FROM projects;

-- 迁移优先级值
INSERT INTO field_values (id, task_id, field_definition_id, text_value)
SELECT 
  CONCAT('fv_priority_', t.id),
  t.id,
  CONCAT('fd_priority_', c.project_id),
  t.priority
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE t.priority IS NOT NULL;

-- 迁移截止日期值
INSERT INTO field_values (id, task_id, field_definition_id, date_value)
SELECT 
  CONCAT('fv_due_date_', t.id),
  t.id,
  CONCAT('fd_due_date_', c.project_id),
  t.due_date
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE t.due_date IS NOT NULL;

-- 迁移负责人值
INSERT INTO field_values (id, task_id, field_definition_id, text_value)
SELECT 
  CONCAT('fv_assignee_', t.id),
  t.id,
  CONCAT('fd_assignee_', c.project_id),
  t.assigned_to
FROM tasks t
JOIN columns c ON t.column_id = c.id
WHERE t.assigned_to IS NOT NULL;
```

### M024: 创建系统默认字段模板

```sql
-- Migration: M024_create_default_field_templates
-- Description: 创建字段模板表，供新项目使用

CREATE TABLE field_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL,
  config JSON,
  position INT DEFAULT 0,
  is_default BOOLEAN DEFAULT TRUE,  -- 是否在新项目中自动创建
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认模板
INSERT INTO field_templates (id, name, slug, type, config, position, is_default) VALUES
  ('tpl_title', 'Title', 'title', 'text', '{"isTitle": true, "maxLength": 500}', 0, TRUE),
  ('tpl_description', 'Description', 'description', 'textarea', '{}', 1, TRUE),
  ('tpl_status', 'Status', 'status', 'status', '{"options": [
    {"id": "todo", "label": "To Do", "color": "#6b7280"},
    {"id": "in_progress", "label": "In Progress", "color": "#3b82f6"},
    {"id": "done", "label": "Done", "color": "#22c55e"}
  ]}', 2, TRUE),
  ('tpl_priority', 'Priority', 'priority', 'priority', '{"options": [
    {"id": "low", "label": "Low", "color": "#22c55e"},
    {"id": "medium", "label": "Medium", "color": "#eab308"},
    {"id": "high", "label": "High", "color": "#ef4444"},
    {"id": "urgent", "label": "Urgent", "color": "#dc2626"}
  ]}', 3, TRUE),
  ('tpl_assignee', 'Assignee', 'assignee', 'user', '{"allowMultiple": false}', 4, TRUE),
  ('tpl_due_date', 'Due Date', 'due_date', 'date', '{"includeTime": false}', 5, TRUE),
  ('tpl_labels', 'Labels', 'labels', 'multiselect', '{"allowCreate": true}', 6, FALSE),
  ('tpl_estimate', 'Estimate', 'estimate', 'number', '{"min": 0, "format": "number"}', 7, FALSE);
```

---

## 五、阶段四：任务增强

### M030: 修改 tasks 表

```sql
-- Migration: M030_enhance_tasks
-- Description: 增强任务表，支持层级结构和更多元数据

-- 添加父任务字段 (子任务支持)
ALTER TABLE tasks ADD COLUMN parent_id VARCHAR(36);
ALTER TABLE tasks ADD COLUMN task_type VARCHAR(20) DEFAULT 'task';

-- 添加直接项目关联 (解耦列)
ALTER TABLE tasks ADD COLUMN project_id VARCHAR(36);

-- 添加更多元数据
ALTER TABLE tasks ADD COLUMN status_id VARCHAR(36);  -- 关联到 field_options
ALTER TABLE tasks ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;

-- 更改 position 为 Float 以支持更灵活的排序
ALTER TABLE tasks MODIFY COLUMN position FLOAT;

-- 创建索引
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status_id);
CREATE INDEX idx_tasks_archived ON tasks(archived_at);

-- 添加自引用外键
ALTER TABLE tasks 
  ADD CONSTRAINT fk_task_parent FOREIGN KEY (parent_id) 
  REFERENCES tasks(id) ON DELETE CASCADE;

-- 迁移数据：设置 project_id
UPDATE tasks t
JOIN columns c ON t.column_id = c.id
SET t.project_id = c.project_id
WHERE t.project_id IS NULL;

-- 添加项目外键
ALTER TABLE tasks 
  ADD CONSTRAINT fk_task_project FOREIGN KEY (project_id) 
  REFERENCES projects(id) ON DELETE CASCADE;
```

### M031: 创建 task_links 表

```sql
-- Migration: M031_create_task_links
-- Description: 创建任务关联表

CREATE TABLE task_links (
  id VARCHAR(36) PRIMARY KEY,
  from_task_id VARCHAR(36) NOT NULL,
  to_task_id VARCHAR(36) NOT NULL,
  link_type VARCHAR(20) NOT NULL,  -- blocks, blocked_by, relates_to, duplicates, cloned_from
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

CREATE INDEX idx_task_links_from ON task_links(from_task_id);
CREATE INDEX idx_task_links_to ON task_links(to_task_id);
CREATE INDEX idx_task_links_type ON task_links(link_type);
```

### M032: 创建 attachments 表

```sql
-- Migration: M032_create_attachments
-- Description: 创建附件表

CREATE TABLE attachments (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL,          -- bytes
  file_type VARCHAR(100) NOT NULL,    -- MIME type
  thumbnail_url VARCHAR(1000),
  storage_provider VARCHAR(20) DEFAULT 'supabase',  -- supabase, s3, local
  storage_path VARCHAR(500),
  uploaded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_attachment_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_attachment_uploader FOREIGN KEY (uploaded_by) 
    REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_type ON attachments(file_type);
CREATE INDEX idx_attachments_uploader ON attachments(uploaded_by);
```

### M033: 创建 task_watchers 表

```sql
-- Migration: M033_create_task_watchers
-- Description: 创建任务关注者表

CREATE TABLE task_watchers (
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

CREATE INDEX idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX idx_task_watchers_user ON task_watchers(user_id);
```

### M034: 创建 time_entries 表

```sql
-- Migration: M034_create_time_entries
-- Description: 创建时间追踪表

CREATE TABLE time_entries (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  description VARCHAR(500),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration INT,                       -- 秒
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_time_task FOREIGN KEY (task_id) 
    REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_time_user FOREIGN KEY (user_id) 
    REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_time_entries_task ON time_entries(task_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_started ON time_entries(started_at);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);
```

### M035: 创建 labels 表

```sql
-- Migration: M035_create_labels
-- Description: 创建标签表 (项目级)

CREATE TABLE labels (
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

CREATE TABLE task_labels (
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

CREATE INDEX idx_labels_project ON labels(project_id);
CREATE INDEX idx_task_labels_task ON task_labels(task_id);
CREATE INDEX idx_task_labels_label ON task_labels(label_id);
```

---

## 六、阶段五：视图系统

### M040: 创建 views 表

```sql
-- Migration: M040_create_views
-- Description: 创建视图表

CREATE TABLE views (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,          -- kanban, list, table, calendar, timeline, gantt, gallery
  config JSON NOT NULL,               -- 视图配置
  is_default BOOLEAN DEFAULT FALSE,
  is_personal BOOLEAN DEFAULT FALSE,  -- 个人视图 vs 共享视图
  is_locked BOOLEAN DEFAULT FALSE,    -- 是否锁定 (防止修改)
  created_by VARCHAR(36),
  position INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_view_project FOREIGN KEY (project_id) 
    REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_view_creator FOREIGN KEY (created_by) 
    REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_views_project ON views(project_id);
CREATE INDEX idx_views_type ON views(type);
CREATE INDEX idx_views_creator ON views(created_by);
CREATE INDEX idx_views_default ON views(is_default);
```

### M041: 迁移现有 columns 到 views

```sql
-- Migration: M041_migrate_columns_to_views
-- Description: 将现有列数据迁移为看板视图配置

-- 1. 为每个项目创建默认看板视图
INSERT INTO views (id, project_id, name, type, config, is_default, position)
SELECT 
  CONCAT('view_kanban_', p.id),
  p.id,
  'Board',
  'kanban',
  JSON_OBJECT(
    'fields', JSON_OBJECT(
      'visible', JSON_ARRAY('title', 'assignee', 'priority', 'due_date'),
      'order', JSON_ARRAY('title', 'assignee', 'priority', 'due_date')
    ),
    'kanban', JSON_OBJECT(
      'groupFieldId', 'status',
      'cardFields', JSON_ARRAY('assignee', 'priority', 'due_date'),
      'cardSize', 'normal',
      'showEmptyGroups', TRUE
    )
  ),
  TRUE,
  0
FROM projects p;

-- 2. 将现有列转换为状态选项
-- 需要为每个项目执行
INSERT INTO field_definitions (id, project_id, name, slug, type, config, is_system, position)
SELECT 
  CONCAT('fd_status_', p.id),
  p.id,
  'Status',
  'status',
  'status',
  (
    SELECT JSON_OBJECT(
      'options', JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', c.id,
          'label', c.name,
          'color', CASE 
            WHEN c.position = 0 THEN '#6b7280'
            WHEN c.position = (SELECT MAX(position) FROM columns WHERE project_id = p.id) THEN '#22c55e'
            ELSE '#3b82f6'
          END,
          'position', c.position
        )
      )
    )
    FROM columns c
    WHERE c.project_id = p.id
    ORDER BY c.position
  ),
  TRUE,
  0
FROM projects p;

-- 3. 迁移任务的状态值
INSERT INTO field_values (id, task_id, field_definition_id, text_value)
SELECT 
  CONCAT('fv_status_', t.id),
  t.id,
  CONCAT('fd_status_', c.project_id),
  c.id  -- 使用列 ID 作为状态值
FROM tasks t
JOIN columns c ON t.column_id = c.id;

-- 4. 更新任务的 status_id
UPDATE tasks t
JOIN columns c ON t.column_id = c.id
SET t.status_id = c.id;
```

### M042: 创建默认视图

```sql
-- Migration: M042_create_default_views
-- Description: 为每个项目创建默认的多种视图

-- 列表视图
INSERT INTO views (id, project_id, name, type, config, is_default, position)
SELECT 
  CONCAT('view_list_', id),
  id,
  'List',
  'list',
  '{"fields": {"visible": ["title", "status", "assignee", "priority", "due_date"], "order": ["title", "status", "assignee", "priority", "due_date"]}}',
  FALSE,
  1
FROM projects;

-- 表格视图
INSERT INTO views (id, project_id, name, type, config, is_default, position)
SELECT 
  CONCAT('view_table_', id),
  id,
  'Table',
  'table',
  '{"fields": {"visible": ["title", "status", "assignee", "priority", "due_date", "created_at"], "order": ["title", "status", "assignee", "priority", "due_date", "created_at"]}, "table": {"rowHeight": "normal", "wrapText": false}}',
  FALSE,
  2
FROM projects;
```

---

## 七、数据迁移脚本

### 7.1 迁移执行顺序

```bash
# 阶段一：基础设施
prisma migrate deploy --name M001_add_auth_provider_to_profiles
prisma migrate deploy --name M002_add_locale_to_profiles
prisma migrate deploy --name M003_create_system_settings

# 阶段二：组织架构
prisma migrate deploy --name M010_create_organizations
prisma migrate deploy --name M011_create_organization_members
prisma migrate deploy --name M012_create_roles
prisma migrate deploy --name M013_create_permission_audit
prisma migrate deploy --name M014_create_workspaces
prisma migrate deploy --name M015_create_workspace_members
prisma migrate deploy --name M016_create_invitations
prisma migrate deploy --name M017_modify_projects
prisma migrate deploy --name M018_modify_project_members
prisma migrate deploy --name M019_migrate_to_org_structure

# 阶段三：多维表格
prisma migrate deploy --name M020_create_field_definitions
prisma migrate deploy --name M021_create_field_options
prisma migrate deploy --name M022_create_field_values
prisma migrate deploy --name M023_migrate_task_fields
prisma migrate deploy --name M024_create_default_field_templates

# 阶段四：任务增强
prisma migrate deploy --name M030_enhance_tasks
prisma migrate deploy --name M031_create_task_links
prisma migrate deploy --name M032_create_attachments
prisma migrate deploy --name M033_create_task_watchers
prisma migrate deploy --name M034_create_time_entries
prisma migrate deploy --name M035_create_labels

# 阶段五：视图系统
prisma migrate deploy --name M040_create_views
prisma migrate deploy --name M041_migrate_columns_to_views
prisma migrate deploy --name M042_create_default_views
```

### 7.2 回滚脚本

每个迁移都应有对应的回滚脚本，存放在 `/prisma/rollbacks/` 目录。

```sql
-- Rollback: M010_create_organizations
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

-- Rollback: M020_create_field_definitions
DROP TABLE IF EXISTS field_values;
DROP TABLE IF EXISTS field_options;
DROP TABLE IF EXISTS field_definitions;

-- 等等...
```

### 7.3 数据验证脚本

```sql
-- 验证组织迁移
SELECT 
  (SELECT COUNT(*) FROM organizations) as org_count,
  (SELECT COUNT(*) FROM organization_members) as member_count,
  (SELECT COUNT(DISTINCT user_id) FROM projects) as expected_org_count;

-- 验证字段迁移
SELECT 
  p.id as project_id,
  p.name as project_name,
  (SELECT COUNT(*) FROM field_definitions fd WHERE fd.project_id = p.id) as field_count,
  (SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id WHERE c.project_id = p.id) as task_count,
  (SELECT COUNT(*) FROM field_values fv 
   JOIN tasks t ON fv.task_id = t.id 
   JOIN columns c ON t.column_id = c.id 
   WHERE c.project_id = p.id) as value_count
FROM projects p;

-- 验证视图迁移
SELECT 
  p.id as project_id,
  p.name as project_name,
  (SELECT COUNT(*) FROM columns c WHERE c.project_id = p.id) as column_count,
  (SELECT COUNT(*) FROM views v WHERE v.project_id = p.id) as view_count
FROM projects p;
```

---

## 附录

### A. Prisma Schema 完整版

完整的 Prisma Schema 文件请参见：[prisma/schema.prisma.proposed](../prisma/schema.prisma.proposed)

### B. 相关文档

- [03-api-specification.md](./03-api-specification.md) - API 接口规范
- [04-frontend-skeleton.md](./04-frontend-skeleton.md) - 前端骨架设计
