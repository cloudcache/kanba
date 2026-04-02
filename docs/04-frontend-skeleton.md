# 前端骨架设计

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [页面结构规划](#一页面结构规划)
2. [组件架构](#二组件架构)
3. [页面与接口对应关系](#三页面与接口对应关系)
4. [状态管理](#四状态管理)
5. [国际化集成](#五国际化集成)

---

## 一、页面结构规划

### 1.1 路由结构

```
/app
  /[locale]                              # 国际化路由前缀
    ├── layout.tsx                       # 根布局 (主题、国际化 Provider)
    ├── page.tsx                         # 首页 (重定向到 dashboard 或 login)
    │
    ├── /(auth)                          # 认证组 (无侧边栏布局)
    │   ├── layout.tsx                   # 认证布局
    │   ├── login
    │   │   └── page.tsx                 # 登录页
    │   ├── signup
    │   │   └── page.tsx                 # 注册页
    │   ├── forgot-password
    │   │   └── page.tsx                 # 忘记密码页
    │   ├── reset-password
    │   │   └── page.tsx                 # 重置密码页
    │   └── invite
    │       └── [token]
    │           └── page.tsx             # 接受邀请页
    │
    ├── /(dashboard)                     # 主应用组 (带侧边栏布局)
    │   ├── layout.tsx                   # Dashboard 布局
    │   ├── page.tsx                     # Dashboard 首页 (概览)
    │   │
    │   ├── organizations                # 组织管理
    │   │   ├── page.tsx                 # 组织列表/选择
    │   │   ├── new
    │   │   │   └── page.tsx             # 创建组织
    │   │   └── [orgId]
    │   │       ├── page.tsx             # 组织概览
    │   │       ├── settings
    │   │       │   └── page.tsx         # 组织设置
    │   │       ├── members
    │   │       │   └── page.tsx         # 成员管理
    │   │       ├── roles
    │   │       │   └── page.tsx         # 角色管理
    │   │       ├── billing
    │   │       │   └── page.tsx         # 账单管理
    │   │       └── audit-log
    │   │           └── page.tsx         # 审计日志
    │   │
    │   ├── workspaces                   # 工作空间
    │   │   ├── new
    │   │   │   └── page.tsx             # 创建工作空间
    │   │   └── [workspaceId]
    │   │       ├── page.tsx             # 工作空间概览
    │   │       ├── settings
    │   │       │   └── page.tsx         # 空间设置
    │   │       └── members
    │   │           └── page.tsx         # 空间成员
    │   │
    │   ├── projects                     # 项目管理
    │   │   ├── page.tsx                 # 项目列表
    │   │   ├── new
    │   │   │   └── page.tsx             # 创建项目
    │   │   └── [projectId]
    │   │       ├── layout.tsx           # 项目布局 (项目头部、视图切换)
    │   │       ├── page.tsx             # 默认视图 (重定向)
    │   │       ├── board
    │   │       │   └── page.tsx         # 看板视图
    │   │       ├── list
    │   │       │   └── page.tsx         # 列表视图
    │   │       ├── table
    │   │       │   └── page.tsx         # 表格视图
    │   │       ├── calendar
    │   │       │   └── page.tsx         # 日历视图
    │   │       ├── timeline
    │   │       │   └── page.tsx         # 时间线视图
    │   │       ├── gantt
    │   │       │   └── page.tsx         # 甘特图视图
    │   │       └── settings
    │   │           ├── page.tsx         # 项目设置
    │   │           ├── fields
    │   │           │   └── page.tsx     # 自定义字段管理
    │   │           ├── views
    │   │           │   └── page.tsx     # 视图管理
    │   │           └── members
    │   │               └── page.tsx     # 项目成员
    │   │
    │   ├── tasks                        # 任务详情 (模态/全屏)
    │   │   └── [taskId]
    │   │       └── page.tsx             # 任务详情页
    │   │
    │   ├── my                           # 个人空间
    │   │   ├── tasks
    │   │   │   └── page.tsx             # 我的任务
    │   │   ├── bookmarks
    │   │   │   └── page.tsx             # 我的收藏
    │   │   └── activity
    │   │       └── page.tsx             # 我的活动
    │   │
    │   ├── notifications
    │   │   └── page.tsx                 # 通知中心
    │   │
    │   └── settings                     # 用户设置
    │       ├── page.tsx                 # 设置首页
    │       ├── profile
    │       │   └── page.tsx             # 个人资料
    │       ├── preferences
    │       │   └── page.tsx             # 偏好设置
    │       ├── security
    │       │   └── page.tsx             # 安全设置
    │       └── integrations
    │           └── page.tsx             # 集成管理
    │
    └── /api                             # API 路由
        ├── auth
        │   ├── ldap
        │   │   └── route.ts             # LDAP 认证
        │   └── callback
        │       └── route.ts             # OAuth 回调
        └── webhooks
            └── stripe
                └── route.ts             # Stripe Webhook
```

### 1.2 页面层级关系图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Root Layout                                │
│  - ThemeProvider                                                     │
│  - I18nProvider                                                      │
│  - ToastProvider                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌───────────────────────┐               ┌───────────────────────┐
│     Auth Layout       │               │   Dashboard Layout    │
│  - 无侧边栏           │               │  - AppSidebar         │
│  - 居中卡片式         │               │  - TopNav             │
└───────────┬───────────┘               │  - UserProvider       │
            │                           │  - OrgProvider        │
    ┌───────┴───────┐                   └───────────┬───────────┘
    ▼               ▼                               │
┌───────┐       ┌───────┐           ┌───────────────┼───────────────┐
│ Login │       │Signup │           ▼               ▼               ▼
└───────┘       └───────┘   ┌───────────┐   ┌───────────┐   ┌───────────┐
                            │Organization│   │ Workspace │   │  Project  │
                            │   Pages    │   │   Pages   │   │  Layout   │
                            └───────────┘   └───────────┘   └─────┬─────┘
                                                                  │
                                                    ┌─────────────┼─────────────┐
                                                    ▼             ▼             ▼
                                              ┌─────────┐   ┌─────────┐   ┌─────────┐
                                              │  Board  │   │  List   │   │  Table  │
                                              │  View   │   │  View   │   │  View   │
                                              └─────────┘   └─────────┘   └─────────┘
```

---

## 二、组件架构

### 2.1 组件目录结构

```
/components
  ├── /ui                        # shadcn/ui 基础组件
  │   ├── button.tsx
  │   ├── input.tsx
  │   ├── dialog.tsx
  │   └── ...
  │
  ├── /layout                    # 布局组件
  │   ├── app-sidebar.tsx        # 主侧边栏
  │   ├── top-nav.tsx            # 顶部导航
  │   ├── breadcrumb.tsx         # 面包屑
  │   ├── page-header.tsx        # 页面标题区
  │   └── empty-state.tsx        # 空状态
  │
  ├── /auth                      # 认证相关组件
  │   ├── login-form.tsx         # 登录表单
  │   ├── signup-form.tsx        # 注册表单
  │   ├── ldap-login-form.tsx    # LDAP 登录表单
  │   ├── oauth-buttons.tsx      # OAuth 登录按钮
  │   ├── auth-tabs.tsx          # 认证方式切换
  │   └── password-input.tsx     # 密码输入框
  │
  ├── /organization              # 组织相关组件
  │   ├── org-switcher.tsx       # 组织切换器
  │   ├── org-card.tsx           # 组织卡片
  │   ├── org-settings-form.tsx  # 组织设置表单
  │   ├── member-list.tsx        # 成员列表
  │   ├── member-invite-dialog.tsx # 邀请成员对话框
  │   ├── role-list.tsx          # 角色列表
  │   ├── role-editor.tsx        # 角色编辑器
  │   └── permission-picker.tsx  # 权限选择器
  │
  ├── /workspace                 # 工作空间组件
  │   ├── workspace-card.tsx     # 工作空间卡片
  │   ├── workspace-list.tsx     # 工作空间列表
  │   └── workspace-settings-form.tsx
  │
  ├── /project                   # 项目相关组件
  │   ├── project-card.tsx       # 项目卡片
  │   ├── project-list.tsx       # 项目列表
  │   ├── project-header.tsx     # 项目头部
  │   ├── project-settings-form.tsx
  │   ├── view-tabs.tsx          # 视图切换 Tabs
  │   └── project-member-list.tsx
  │
  ├── /task                      # 任务相关组件
  │   ├── task-card.tsx          # 任务卡片 (看板)
  │   ├── task-row.tsx           # 任务行 (列表)
  │   ├── task-detail.tsx        # 任务详情面板
  │   ├── task-detail-modal.tsx  # 任务详情模态框
  │   ├── task-create-form.tsx   # 创建任务表单
  │   ├── task-edit-form.tsx     # 编辑任务表单
  │   ├── task-quick-add.tsx     # 快速添加任务
  │   ├── task-filters.tsx       # 任务筛选器
  │   ├── task-sort.tsx          # 任务排序
  │   ├── task-bulk-actions.tsx  # 批量操作栏
  │   ├── subtask-list.tsx       # 子任务列表
  │   ├── task-links.tsx         # 任务关联
  │   ├── task-comments.tsx      # 任务评论
  │   ├── task-attachments.tsx   # 任务附件
  │   ├── task-activity.tsx      # 任务活动日志
  │   └── task-time-tracker.tsx  # 时间追踪
  │
  ├── /view                      # 视图组件
  │   ├── /kanban                # 看板视图
  │   │   ├── kanban-board.tsx   # 看板容器
  │   │   ├── kanban-column.tsx  # 看板列
  │   │   ├── kanban-card.tsx    # 看板卡片
  │   │   └── kanban-add-column.tsx
  │   │
  │   ├── /list                  # 列表视图
  │   │   ├── list-view.tsx      # 列表容器
  │   │   ├── list-item.tsx      # 列表项
  │   │   └── list-group.tsx     # 列表分组
  │   │
  │   ├── /table                 # 表格视图
  │   │   ├── table-view.tsx     # 表格容器
  │   │   ├── table-header.tsx   # 表头
  │   │   ├── table-row.tsx      # 表格行
  │   │   ├── table-cell.tsx     # 表格单元格
  │   │   └── column-resizer.tsx # 列宽调整
  │   │
  │   ├── /calendar              # 日历视图
  │   │   ├── calendar-view.tsx  # 日历容器
  │   │   ├── calendar-day.tsx   # 日视图
  │   │   ├── calendar-week.tsx  # 周视图
  │   │   └── calendar-month.tsx # 月视图
  │   │
  │   ├── /timeline              # 时间线视图
  │   │   ├── timeline-view.tsx
  │   │   └── timeline-item.tsx
  │   │
  │   ├── /gantt                 # 甘特图视图
  │   │   ├── gantt-view.tsx
  │   │   ├── gantt-bar.tsx
  │   │   └── gantt-dependency.tsx
  │   │
  │   └── view-config-panel.tsx  # 视图配置面板
  │
  ├── /field                     # 自定义字段组件
  │   ├── field-renderer.tsx     # 字段渲染器 (根据类型)
  │   ├── field-editor.tsx       # 字段编辑器
  │   ├── field-list.tsx         # 字段列表
  │   ├── field-config-dialog.tsx
  │   ├── /types                 # 各类型字段组件
  │   │   ├── text-field.tsx
  │   │   ├── number-field.tsx
  │   │   ├── date-field.tsx
  │   │   ├── select-field.tsx
  │   │   ├── multiselect-field.tsx
  │   │   ├── user-field.tsx
  │   │   ├── relation-field.tsx
  │   │   ├── attachment-field.tsx
  │   │   ├── formula-field.tsx
  │   │   ├── progress-field.tsx
  │   │   └── rating-field.tsx
  │   │
  │   └── option-editor.tsx      # 选项编辑器
  │
  ├── /filter                    # 筛选组件
  │   ├── filter-builder.tsx     # 筛选条件构建器
  │   ├── filter-condition.tsx   # 单个筛选条件
  │   ├── filter-presets.tsx     # 筛选预设
  │   └── saved-filters.tsx      # 保存的筛选
  │
  ├── /notification              # 通知组件
  │   ├── notification-bell.tsx  # 通知铃铛
  │   ├── notification-list.tsx  # 通知列表
  │   └── notification-item.tsx  # 通知项
  │
  ├── /i18n                      # 国际化组件
  │   ├── locale-switcher.tsx    # 语言切换器
  │   └── formatted-date.tsx     # 格式化日期
  │
  └── /shared                    # 通用组件
      ├── user-avatar.tsx        # 用户头像
      ├── user-picker.tsx        # 用户选择器
      ├── color-picker.tsx       # 颜色选择器
      ├── icon-picker.tsx        # 图标选择器
      ├── file-upload.tsx        # 文件上传
      ├── rich-text-editor.tsx   # 富文本编辑器
      ├── markdown-preview.tsx   # Markdown 预览
      ├── confirm-dialog.tsx     # 确认对话框
      ├── search-input.tsx       # 搜索输入框
      └── loading-skeleton.tsx   # 加载骨架屏
```

### 2.2 核心组件接口定义

#### 2.2.1 任务卡片组件

```typescript
// components/task/task-card.tsx
interface TaskCardProps {
  task: {
    id: string;
    title: string;
    taskType: TaskType;
    status: {
      id: string;
      label: string;
      color: string;
    };
    priority?: {
      id: string;
      label: string;
      color: string;
    };
    assignee?: {
      id: string;
      fullName: string;
      avatarUrl?: string;
    };
    dueDate?: string;
    subtaskCount: number;
    completedSubtaskCount: number;
    commentCount: number;
    attachmentCount: number;
    labels?: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  viewConfig?: {
    cardFields: string[];
    cardSize: 'compact' | 'normal' | 'large';
  };
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (taskId: string, multiSelect?: boolean) => void;
  onClick?: (taskId: string) => void;
  onContextMenu?: (taskId: string, event: React.MouseEvent) => void;
}
```

#### 2.2.2 字段渲染器组件

```typescript
// components/field/field-renderer.tsx
interface FieldRendererProps {
  field: {
    id: string;
    name: string;
    slug: string;
    type: FieldType;
    config: FieldConfig;
    isRequired: boolean;
  };
  value: unknown;
  mode: 'display' | 'edit' | 'compact';
  onChange?: (value: unknown) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
}

// 根据 field.type 渲染对应的字段组件
export function FieldRenderer({ field, value, mode, onChange, ...props }: FieldRendererProps) {
  const Component = FIELD_COMPONENTS[field.type];
  if (!Component) return null;
  
  return (
    <Component
      field={field}
      value={value}
      mode={mode}
      onChange={onChange}
      {...props}
    />
  );
}

const FIELD_COMPONENTS: Record<FieldType, React.ComponentType<FieldComponentProps>> = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  date: DateField,
  select: SelectField,
  multiselect: MultiselectField,
  user: UserField,
  users: UsersField,
  relation: RelationField,
  attachment: AttachmentField,
  // ... 其他类型
};
```

#### 2.2.3 看板视图组件

```typescript
// components/view/kanban/kanban-board.tsx
interface KanbanBoardProps {
  projectId: string;
  viewId: string;
  config: {
    groupFieldId: string;
    cardFields: string[];
    cardSize: 'compact' | 'normal' | 'large';
    showEmptyGroups: boolean;
  };
  tasks: TaskSummary[];
  groups: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  onTaskMove?: (taskId: string, targetGroupId: string, position: number) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskCreate?: (groupId: string) => void;
  selectedTasks?: string[];
  onSelectionChange?: (taskIds: string[]) => void;
}
```

#### 2.2.4 筛选构建器组件

```typescript
// components/filter/filter-builder.tsx
interface FilterBuilderProps {
  fields: FieldDefinition[];
  value: FilterConfig;
  onChange: (value: FilterConfig) => void;
  maxConditions?: number;
}

interface FilterConfig {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
}

interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: unknown;
}
```

---

## 三、页面与接口对应关系

### 3.1 认证页面

| 页面 | 路径 | 调用接口 |
|------|------|----------|
| 登录 | `/login` | `POST /api/auth/ldap`, Supabase Auth |
| 注册 | `/signup` | Supabase Auth |
| 忘记密码 | `/forgot-password` | Supabase Auth |
| 重置密码 | `/reset-password` | Supabase Auth |
| 接受邀请 | `/invite/[token]` | `acceptInvitation()` |

### 3.2 组织管理页面

| 页面 | 路径 | 调用接口 |
|------|------|----------|
| 组织列表 | `/organizations` | `getUserOrganizations()` |
| 创建组织 | `/organizations/new` | `createOrganization()` |
| 组织概览 | `/organizations/[orgId]` | `getOrganization()` |
| 组织设置 | `/organizations/[orgId]/settings` | `getOrganization()`, `updateOrganization()` |
| 成员管理 | `/organizations/[orgId]/members` | `getOrganizationMembers()`, `inviteOrganizationMember()`, `updateMemberRole()`, `removeOrganizationMember()` |
| 角色管理 | `/organizations/[orgId]/roles` | `getOrganizationRoles()`, `createOrganizationRole()`, `updateOrganizationRole()`, `deleteOrganizationRole()` |
| 账单管理 | `/organizations/[orgId]/billing` | Stripe 相关接口 |
| 审计日志 | `/organizations/[orgId]/audit-log` | `getAuditLogs()` |

### 3.3 工作空间页面

| 页面 | 路径 | 调用接口 |
|------|------|----------|
| 创建工作空间 | `/workspaces/new` | `createWorkspace()` |
| 工作空间概览 | `/workspaces/[wsId]` | `getWorkspace()`, `getProjects()` |
| 空间设置 | `/workspaces/[wsId]/settings` | `getWorkspace()`, `updateWorkspace()` |
| 空间成员 | `/workspaces/[wsId]/members` | `getWorkspaceMembers()` |

### 3.4 项目管理页面

| 页面 | 路径 | 调用接口 |
|------|------|----------|
| 项目列表 | `/projects` | `getProjects()` |
| 创建项目 | `/projects/new` | `createProject()` |
| 项目概览 | `/projects/[projId]` | `getProject()`, 重定向到默认视图 |
| 看板视图 | `/projects/[projId]/board` | `getProject()`, `getTasks()`, `getView()` |
| 列表视图 | `/projects/[projId]/list` | `getProject()`, `getTasks()`, `getView()` |
| 表格视图 | `/projects/[projId]/table` | `getProject()`, `getTasks()`, `getView()` |
| 日历视图 | `/projects/[projId]/calendar` | `getProject()`, `getTasks()`, `getView()` |
| 时间线视图 | `/projects/[projId]/timeline` | `getProject()`, `getTasks()`, `getView()` |
| 甘特图视图 | `/projects/[projId]/gantt` | `getProject()`, `getTasks()`, `getView()` |
| 项目设置 | `/projects/[projId]/settings` | `getProject()`, `updateProject()` |
| 字段管理 | `/projects/[projId]/settings/fields` | `getFields()`, `createField()`, `updateField()`, `deleteField()` |
| 视图管理 | `/projects/[projId]/settings/views` | `getViews()`, `createView()`, `updateView()`, `deleteView()` |
| 项目成员 | `/projects/[projId]/settings/members` | `getProjectMembers()` |

### 3.5 任务页面

| 页面/组件 | 路径/位置 | 调用接口 |
|----------|----------|----------|
| 任务详情 | `/tasks/[taskId]` 或 Modal | `getTask()` |
| 创建任务 | Dialog | `createTask()` |
| 编辑任务 | Inline/Dialog | `updateTask()`, `updateTaskFieldValue()` |
| 批量操作 | Toolbar | `bulkUpdateTasks()` |
| 任务评论 | Task Detail | `createTaskComment()`, `updateTaskComment()`, `deleteTaskComment()` |
| 任务附件 | Task Detail | `uploadTaskAttachment()`, `deleteTaskAttachment()` |
| 任务关联 | Task Detail | `createTaskLink()`, `deleteTaskLink()` |
| 时间追踪 | Task Detail | `startTimeTracking()`, `stopTimeTracking()`, `addTimeEntry()` |

### 3.6 用户设置页面

| 页面 | 路径 | 调用接口 |
|------|------|----------|
| 个人资料 | `/settings/profile` | `getCurrentUser()`, `updateProfile()` |
| 偏好设置 | `/settings/preferences` | `getUserPreferences()`, `updateUserPreferences()` |
| 安全设置 | `/settings/security` | 密码修改, 2FA 设置 |
| 集成管理 | `/settings/integrations` | 第三方集成管理 |

---

## 四、状态管理

### 4.1 状态分层

```
┌─────────────────────────────────────────────────────────────────────┐
│                         全局状态                                     │
│  - 用户信息 (UserProvider)                                          │
│  - 当前组织上下文 (OrganizationProvider)                            │
│  - 主题设置 (ThemeProvider)                                         │
│  - 语言设置 (I18nProvider)                                          │
│  - 通知 (NotificationProvider)                                      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         页面级状态                                   │
│  - 项目数据 (SWR: useProject)                                       │
│  - 任务列表 (SWR: useTasks)                                         │
│  - 视图配置 (SWR: useView)                                          │
│  - 字段定义 (SWR: useFields)                                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         组件级状态                                   │
│  - 表单状态 (React Hook Form / useState)                            │
│  - UI 状态 (useState: 展开/折叠、选中等)                            │
│  - 拖拽状态 (@dnd-kit)                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Provider 结构

```tsx
// app/[locale]/layout.tsx
export default function RootLayout({ children, params }: Props) {
  return (
    <html lang={params.locale}>
      <body>
        <ThemeProvider>
          <I18nProvider locale={params.locale}>
            <ToastProvider>
              {children}
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// app/[locale]/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: Props) {
  return (
    <UserProvider>
      <OrganizationProvider>
        <NotificationProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1">
              <TopNav />
              {children}
            </main>
          </SidebarProvider>
        </NotificationProvider>
      </OrganizationProvider>
    </UserProvider>
  );
}
```

### 4.3 SWR Hooks 示例

```typescript
// hooks/use-project.ts
export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? ['project', projectId] : null,
    () => getProject(projectId)
  );

  return {
    project: data?.data,
    isLoading,
    error,
    mutate,
  };
}

// hooks/use-tasks.ts
export function useTasks(projectId: string, options?: GetTasksOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? ['tasks', projectId, options] : null,
    () => getTasks(projectId, options)
  );

  return {
    tasks: data?.data?.tasks ?? [],
    groups: data?.data?.groups,
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

// hooks/use-fields.ts
export function useFields(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId ? ['fields', projectId] : null,
    () => getFields(projectId)
  );

  return {
    fields: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
```

### 4.4 乐观更新示例

```typescript
// hooks/use-task-mutations.ts
export function useTaskMutations(projectId: string) {
  const { mutate } = useSWRConfig();

  const updateTaskField = async (
    taskId: string,
    fieldId: string,
    value: unknown
  ) => {
    // 乐观更新
    mutate(
      ['tasks', projectId],
      (current: GetTasksResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          data: {
            ...current.data,
            tasks: current.data.tasks.map((task) =>
              task.id === taskId
                ? updateTaskFieldInMemory(task, fieldId, value)
                : task
            ),
          },
        };
      },
      false // 不重新验证
    );

    try {
      // 实际 API 调用
      await updateTaskFieldValue(taskId, fieldId, value);
      // 重新验证以获取最新数据
      mutate(['tasks', projectId]);
      mutate(['task', taskId]);
    } catch (error) {
      // 回滚
      mutate(['tasks', projectId]);
      throw error;
    }
  };

  return { updateTaskField };
}
```

---

## 五、国际化集成

### 5.1 next-intl 配置

```typescript
// lib/i18n/config.ts
export const locales = ['en', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### 5.2 消息文件结构

```json
// locales/zh-CN.json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "create": "创建",
    "loading": "加载中...",
    "search": "搜索",
    "filter": "筛选",
    "sort": "排序"
  },
  "auth": {
    "login": {
      "title": "登录到 Kanba",
      "email": "邮箱",
      "password": "密码",
      "submit": "登录",
      "forgotPassword": "忘记密码？",
      "noAccount": "没有账号？",
      "signUp": "注册"
    },
    "ldap": {
      "title": "企业账号登录",
      "username": "用户名",
      "domain": "域",
      "submit": "登录"
    }
  },
  "organization": {
    "title": "组织",
    "create": "创建组织",
    "settings": "组织设置",
    "members": "成员管理",
    "roles": "角色管理"
  },
  "task": {
    "create": "创建任务",
    "edit": "编辑任务",
    "priority": {
      "low": "低",
      "medium": "中",
      "high": "高",
      "urgent": "紧急"
    },
    "status": {
      "todo": "待办",
      "inProgress": "进行中",
      "done": "已完成"
    }
  },
  "view": {
    "kanban": "看板",
    "list": "列表",
    "table": "表格",
    "calendar": "日历",
    "timeline": "时间线",
    "gantt": "甘特图"
  },
  "errors": {
    "generic": "发生错误，请稍后重试",
    "notFound": "未找到",
    "unauthorized": "未授权",
    "forbidden": "无权限"
  }
}
```

### 5.3 组件中使用国际化

```tsx
// 服务端组件
import { getTranslations } from 'next-intl/server';

export default async function LoginPage() {
  const t = await getTranslations('auth.login');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}

// 客户端组件
'use client';

import { useTranslations } from 'next-intl';

export function LoginForm() {
  const t = useTranslations('auth.login');
  
  return (
    <form>
      <Input placeholder={t('email')} />
      <Input type="password" placeholder={t('password')} />
      <Button type="submit">{t('submit')}</Button>
    </form>
  );
}
```

### 5.4 日期格式化

```tsx
// components/i18n/formatted-date.tsx
'use client';

import { useLocale } from 'next-intl';
import { format, formatRelative, formatDistance } from 'date-fns';
import { zhCN, zhTW, enUS } from 'date-fns/locale';

const localeMap = {
  'en': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

interface FormattedDateProps {
  date: Date | string;
  format?: 'short' | 'medium' | 'long' | 'relative' | 'distance';
}

export function FormattedDate({ date, format: formatType = 'medium' }: FormattedDateProps) {
  const locale = useLocale();
  const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (formatType) {
    case 'short':
      return <span>{format(dateObj, 'P', { locale: dateLocale })}</span>;
    case 'medium':
      return <span>{format(dateObj, 'PPP', { locale: dateLocale })}</span>;
    case 'long':
      return <span>{format(dateObj, 'PPPp', { locale: dateLocale })}</span>;
    case 'relative':
      return <span>{formatRelative(dateObj, new Date(), { locale: dateLocale })}</span>;
    case 'distance':
      return <span>{formatDistance(dateObj, new Date(), { locale: dateLocale, addSuffix: true })}</span>;
  }
}
```

---

## 附录

### A. 组件依赖关系图

```
TaskCard
├── UserAvatar
├── PriorityBadge
├── LabelBadge
├── FormattedDate
└── ProgressBar

KanbanBoard
├── KanbanColumn
│   ├── TaskCard
│   └── TaskQuickAdd
├── DragOverlay
└── TaskDetailModal
    └── TaskDetail
        ├── FieldRenderer
        ├── SubtaskList
        ├── TaskComments
        ├── TaskAttachments
        └── TaskActivity
```

### B. 相关文档

- [05-testing-plan.md](./05-testing-plan.md) - 测试计划
- [06-implementation-roadmap.md](./06-implementation-roadmap.md) - 实施路线图
