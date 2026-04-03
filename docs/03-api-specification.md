# API 接口规范

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [API 设计原则](#一api-设计原则)
2. [认证接口](#二认证接口)
3. [组织管理接口](#三组织管理接口)
4. [工作空间接口](#四工作空间接口)
5. [项目管理接口](#五项目管理接口)
6. [任务管理接口](#六任务管理接口)
7. [自定义字段接口](#七自定义字段接口)
8. [视图管理接口](#八视图管理接口)
9. [通用响应格式](#九通用响应格式)

---

## 一、API 设计原则

### 1.1 路由设计

本项目使用 Next.js App Router 的 Server Actions 和 API Routes 混合模式：

- **Server Actions**: 用于表单提交、数据变更等需要与 UI 紧密集成的操作
- **API Routes**: 用于需要 RESTful 风格或第三方集成的接口

### 1.2 命名规范

```
Server Actions: /actions/{domain}.ts
  - 函数命名: {action}{Entity}  (如 createTask, updateProject)

API Routes: /app/api/v1/{resource}/route.ts
  - RESTful 风格: GET, POST, PUT, DELETE
```

### 1.3 通用请求头

```typescript
interface RequestHeaders {
  'Content-Type': 'application/json';
  'Accept-Language'?: string;  // 国际化: 'en', 'zh-CN', 'zh-TW'
  'Authorization'?: string;    // Bearer token (API Routes)
  'X-Organization-ID'?: string; // 当前组织上下文
  'X-Request-ID'?: string;     // 请求追踪 ID
}
```

### 1.4 通用响应格式

```typescript
// 成功响应
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// 错误响应
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误代码
    message: string;        // 用户可读的错误消息
    details?: unknown;      // 详细错误信息 (开发环境)
    field?: string;         // 字段级错误
  };
}

// 验证错误响应
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    fields: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}
```

### 1.5 错误代码定义

| 错误代码 | HTTP 状态 | 描述 |
|----------|-----------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 验证失败 |
| `CONFLICT` | 409 | 资源冲突 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器错误 |
| `LDAP_AUTH_FAILED` | 401 | LDAP 认证失败 |
| `LDAP_CONNECTION_ERROR` | 503 | LDAP 连接失败 |

---

## 二、认证接口

### 2.1 LDAP 登录

**路径**: `POST /api/auth/ldap`

**描述**: 使用 LDAP/LLDAP 进行用户认证

**请求参数**:

```typescript
interface LDAPLoginRequest {
  username: string;    // LDAP 用户名
  password: string;    // 密码
  domain?: string;     // 可选的域名 (多域支持)
  remember?: boolean;  // 记住登录状态
}
```

**请求示例**:

```json
{
  "username": "john.doe",
  "password": "secret123",
  "domain": "corp.example.com",
  "remember": true
}
```

**成功响应**:

```typescript
interface LDAPLoginResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
      ldapDn: string;
      groups: string[];
    };
    session: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
    };
    organization?: {
      id: string;
      name: string;
      role: string;
    };
  };
}
```

**错误响应**:

| 错误代码 | 描述 |
|----------|------|
| `LDAP_AUTH_FAILED` | 用户名或密码错误 |
| `LDAP_CONNECTION_ERROR` | 无法连接到 LDAP 服务器 |
| `LDAP_USER_NOT_FOUND` | 用户在 LDAP 中不存在 |
| `LDAP_ACCOUNT_DISABLED` | 账户已禁用 |
| `LDAP_PASSWORD_EXPIRED` | 密码已过期 |

### 2.2 获取当前用户

**Server Action**: `getCurrentUser()`

**描述**: 获取当前登录用户信息

**响应**:

```typescript
interface CurrentUserResponse {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  authProvider: 'supabase' | 'ldap' | 'lldap' | 'local';
  locale: string;
  timezone: string;
  subscriptionStatus: 'free' | 'pro';
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    permissions: string[];
  }>;
  currentOrganization?: {
    id: string;
    name: string;
    slug: string;
  };
}
```

### 2.3 切换组织上下文

**Server Action**: `switchOrganization(organizationId: string)`

**描述**: 切换当前用户的组织上下文

**请求参数**:

```typescript
interface SwitchOrganizationRequest {
  organizationId: string;
}
```

**响应**: 返回新的组织上下文信息

---

## 三、组织管理接口

### 3.1 创建组织

**Server Action**: `createOrganization(data)`

**权限要求**: 已认证用户

**请求参数**:

```typescript
interface CreateOrganizationRequest {
  name: string;           // 1-100 字符
  slug?: string;          // 可选，自动从 name 生成
  description?: string;   // 最多 500 字符
  logoUrl?: string;       // 有效 URL
}
```

**验证规则**:

| 字段 | 规则 |
|------|------|
| name | 必填，1-100 字符 |
| slug | 可选，3-50 字符，仅允许小写字母、数字、连字符 |
| description | 可选，最多 500 字符 |
| logoUrl | 可选，有效 URL |

**成功响应**:

```typescript
interface CreateOrganizationResponse {
  success: true;
  data: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    billingPlan: string;
    createdAt: string;
  };
}
```

**错误响应**:

| 错误代码 | 描述 |
|----------|------|
| `VALIDATION_ERROR` | 参数验证失败 |
| `SLUG_TAKEN` | slug 已被使用 |
| `ORG_LIMIT_REACHED` | 已达到组织数量上限 |

### 3.2 获取组织详情

**Server Action**: `getOrganization(organizationId)`

**权限要求**: `org:read`

**请求参数**:

```typescript
interface GetOrganizationRequest {
  organizationId: string;
}
```

**成功响应**:

```typescript
interface OrganizationDetailResponse {
  success: true;
  data: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    billingPlan: string;
    settings: Record<string, unknown>;
    memberCount: number;
    workspaceCount: number;
    projectCount: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3.3 更新组织

**Server Action**: `updateOrganization(organizationId, data)`

**权限要求**: `org:update`

**请求参数**:

```typescript
interface UpdateOrganizationRequest {
  organizationId: string;
  data: {
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    settings?: Record<string, unknown>;
  };
}
```

### 3.4 删除组织

**Server Action**: `deleteOrganization(organizationId)`

**权限要求**: `org:delete` (仅组织所有者)

**请求参数**:

```typescript
interface DeleteOrganizationRequest {
  organizationId: string;
  confirmationPhrase: string; // 需要输入组织名称确认
}
```

### 3.5 组织成员管理

#### 获取成员列表

**Server Action**: `getOrganizationMembers(organizationId, options)`

**权限要求**: `org:members:read`

```typescript
interface GetMembersRequest {
  organizationId: string;
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: 'active' | 'suspended' | 'invited';
  };
}

interface GetMembersResponse {
  success: true;
  data: Array<{
    id: string;
    userId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    role: {
      id: string;
      name: string;
      slug: string;
    };
    status: string;
    joinedAt: string;
  }>;
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

#### 邀请成员

**Server Action**: `inviteOrganizationMember(data)`

**权限要求**: `org:members:invite`

```typescript
interface InviteMemberRequest {
  organizationId: string;
  email: string;
  roleId: string;
  workspaceIds?: string[];  // 可选，同时邀请到工作空间
  message?: string;         // 邀请消息
}

interface InviteMemberResponse {
  success: true;
  data: {
    invitationId: string;
    email: string;
    expiresAt: string;
    status: 'pending';
  };
}
```

#### 更新成员角色

**Server Action**: `updateMemberRole(data)`

**权限要求**: `org:members:update_role`

```typescript
interface UpdateMemberRoleRequest {
  organizationId: string;
  memberId: string;
  roleId: string;
}
```

#### 移除成员

**Server Action**: `removeOrganizationMember(data)`

**权限要求**: `org:members:remove`

```typescript
interface RemoveMemberRequest {
  organizationId: string;
  memberId: string;
}
```

### 3.6 角色管理

#### 获取角色列表

**Server Action**: `getOrganizationRoles(organizationId)`

**权限要求**: `org:roles:read`

```typescript
interface GetRolesResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    permissions: string[];
    isSystem: boolean;
    memberCount: number;
    createdAt: string;
  }>;
}
```

#### 创建自定义角色

**Server Action**: `createOrganizationRole(data)`

**权限要求**: `org:roles:create`

```typescript
interface CreateRoleRequest {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  baseRoleId?: string;  // 基于现有角色创建
}
```

#### 更新角色

**Server Action**: `updateOrganizationRole(data)`

**权限要求**: `org:roles:update`

```typescript
interface UpdateRoleRequest {
  organizationId: string;
  roleId: string;
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
  };
}
```

#### 删除角色

**Server Action**: `deleteOrganizationRole(data)`

**权限要求**: `org:roles:delete`

```typescript
interface DeleteRoleRequest {
  organizationId: string;
  roleId: string;
  replacementRoleId: string;  // 将现有成员转移到此角色
}
```

---

## 四、工作空间接口

### 4.1 创建工作空间

**Server Action**: `createWorkspace(data)`

**权限要求**: `workspace:create`

```typescript
interface CreateWorkspaceRequest {
  organizationId: string;
  name: string;
  slug?: string;
  description?: string;
  visibility?: 'private' | 'internal' | 'public';
  icon?: string;
  color?: string;
}

interface CreateWorkspaceResponse {
  success: true;
  data: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    visibility: string;
    icon?: string;
    color?: string;
    createdAt: string;
  };
}
```

### 4.2 获取工作空间列表

**Server Action**: `getWorkspaces(organizationId, options)`

**权限要求**: `workspace:read`

```typescript
interface GetWorkspacesRequest {
  organizationId: string;
  options?: {
    includeProjects?: boolean;
    includeMemberCount?: boolean;
  };
}

interface GetWorkspacesResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    visibility: string;
    icon?: string;
    color?: string;
    projectCount?: number;
    memberCount?: number;
    projects?: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
}
```

### 4.3 更新工作空间

**Server Action**: `updateWorkspace(workspaceId, data)`

**权限要求**: `workspace:update`

### 4.4 删除工作空间

**Server Action**: `deleteWorkspace(workspaceId)`

**权限要求**: `workspace:delete`

---

## 五、项目管理接口

### 5.1 创建项目

**Server Action**: `createProject(data)`

**权限要求**: `project:create`

```typescript
interface CreateProjectRequest {
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  visibility?: 'private' | 'internal' | 'public';
  icon?: string;
  color?: string;
  templateId?: string;  // 可选，使用项目模板
}

interface CreateProjectResponse {
  success: true;
  data: {
    id: string;
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
    visibility: string;
    defaultViewId?: string;
    createdAt: string;
  };
}
```

**验证规则**:

| 字段 | 规则 |
|------|------|
| workspaceId | 必填，有效的工作空间 ID |
| name | 必填，1-100 字符 |
| slug | 可选，3-50 字符，仅允许小写字母、数字、连字符 |
| visibility | 可选，枚举值 |

### 5.2 获取项目列表

**Server Action**: `getProjects(options)`

**权限要求**: `project:read`

```typescript
interface GetProjectsRequest {
  workspaceId?: string;
  organizationId?: string;
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    archived?: boolean;
    sortBy?: 'name' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  };
}

interface GetProjectsResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    visibility: string;
    icon?: string;
    color?: string;
    taskCount: number;
    memberCount: number;
    workspace: {
      id: string;
      name: string;
    };
    isBookmarked: boolean;
    updatedAt: string;
  }>;
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### 5.3 获取项目详情

**Server Action**: `getProject(projectId)`

**权限要求**: `project:read`

```typescript
interface GetProjectResponse {
  success: true;
  data: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    visibility: string;
    icon?: string;
    color?: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    defaultView?: {
      id: string;
      name: string;
      type: string;
    };
    views: Array<{
      id: string;
      name: string;
      type: string;
      isDefault: boolean;
    }>;
    fields: Array<{
      id: string;
      name: string;
      slug: string;
      type: string;
      isSystem: boolean;
    }>;
    taskCount: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 5.4 更新项目

**Server Action**: `updateProject(projectId, data)`

**权限要求**: `project:update`

```typescript
interface UpdateProjectRequest {
  projectId: string;
  data: {
    name?: string;
    description?: string;
    visibility?: 'private' | 'internal' | 'public';
    icon?: string;
    color?: string;
    defaultViewId?: string;
  };
}
```

### 5.5 归档/取消归档项目

**Server Action**: `archiveProject(projectId)` / `unarchiveProject(projectId)`

**权限要求**: `project:archive`

### 5.6 删除项目

**Server Action**: `deleteProject(projectId)`

**权限要求**: `project:delete`

```typescript
interface DeleteProjectRequest {
  projectId: string;
  confirmationPhrase: string;  // 需要输入项目名称确认
}
```

---

## 六、任务管理接口

### 6.1 创建任务

**Server Action**: `createTask(data)`

**权限要求**: `task:create`

```typescript
interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  parentId?: string;        // 父任务 ID (创建子任务)
  taskType?: 'epic' | 'story' | 'task' | 'subtask' | 'bug' | 'milestone';
  statusId?: string;        // 状态选项 ID
  fields?: Array<{          // 自定义字段值
    fieldId: string;
    value: unknown;
  }>;
  position?: number;        // 插入位置
}

interface CreateTaskResponse {
  success: true;
  data: {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    taskType: string;
    parentId?: string;
    status: {
      id: string;
      label: string;
      color: string;
    };
    position: number;
    fields: Array<{
      fieldId: string;
      fieldName: string;
      fieldType: string;
      value: unknown;
    }>;
    createdBy: {
      id: string;
      fullName: string;
      avatarUrl?: string;
    };
    createdAt: string;
  };
}
```

**验证规则**:

| 字段 | 规则 |
|------|------|
| projectId | 必填，有效的项目 ID |
| title | 必填，1-500 字符 |
| description | 可选，最多 50000 字符 |
| parentId | 可选，有效的任务 ID，且属于同一项目 |
| taskType | 可选，枚举值 |

### 6.2 获取任务列表

**Server Action**: `getTasks(projectId, options)`

**权限要求**: `task:read`

```typescript
interface GetTasksRequest {
  projectId: string;
  options?: {
    viewId?: string;        // 使用视图的筛选和排序配置
    filters?: FilterConfig; // 自定义筛选
    sorts?: SortConfig[];   // 自定义排序
    groupBy?: string;       // 分组字段 ID
    search?: string;        // 搜索关键词
    page?: number;
    pageSize?: number;
    includeSubtasks?: boolean;
    includeArchived?: boolean;
  };
}

interface FilterConfig {
  operator: 'and' | 'or';
  conditions: Array<{
    fieldId: string;
    operator: string;
    value: unknown;
  }>;
}

interface SortConfig {
  fieldId: string;
  direction: 'asc' | 'desc';
}

interface GetTasksResponse {
  success: true;
  data: {
    tasks: Array<TaskSummary>;
    groups?: Array<{
      groupId: string;
      groupLabel: string;
      groupColor?: string;
      tasks: TaskSummary[];
      count: number;
    }>;
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

interface TaskSummary {
  id: string;
  title: string;
  taskType: string;
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
  position: number;
  updatedAt: string;
}
```

### 6.3 获取任务详情

**Server Action**: `getTask(taskId)`

**权限要求**: `task:read`

```typescript
interface GetTaskResponse {
  success: true;
  data: {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    taskType: string;
    parent?: {
      id: string;
      title: string;
    };
    subtasks: Array<{
      id: string;
      title: string;
      status: { id: string; label: string; color: string };
      isDone: boolean;
    }>;
    status: {
      id: string;
      label: string;
      color: string;
    };
    fields: Array<{
      fieldId: string;
      fieldName: string;
      fieldSlug: string;
      fieldType: string;
      value: unknown;
      displayValue: string;
    }>;
    links: {
      blocking: TaskLink[];
      blockedBy: TaskLink[];
      relatedTo: TaskLink[];
    };
    attachments: Attachment[];
    watchers: Watcher[];
    timeEntries: TimeEntrySummary;
    comments: Comment[];
    activityLog: ActivityLogItem[];
    createdBy: UserSummary;
    updatedBy?: UserSummary;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    archivedAt?: string;
  };
}

interface TaskLink {
  id: string;
  taskId: string;
  title: string;
  status: { id: string; label: string; color: string };
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  thumbnailUrl?: string;
  uploadedBy: UserSummary;
  createdAt: string;
}

interface Watcher {
  id: string;
  fullName: string;
  avatarUrl?: string;
}

interface TimeEntrySummary {
  totalDuration: number;  // 秒
  entries: Array<{
    id: string;
    description?: string;
    duration: number;
    user: UserSummary;
    startedAt: string;
  }>;
}
```

### 6.4 更新任务

**Server Action**: `updateTask(taskId, data)`

**权限要求**: `task:update`

```typescript
interface UpdateTaskRequest {
  taskId: string;
  data: {
    title?: string;
    description?: string;
    statusId?: string;
    parentId?: string | null;
    taskType?: string;
    position?: number;
  };
}
```

### 6.5 更新任务字段值

**Server Action**: `updateTaskFieldValue(taskId, fieldId, value)`

**权限要求**: `task:update`

```typescript
interface UpdateFieldValueRequest {
  taskId: string;
  fieldId: string;
  value: unknown;
}

interface UpdateFieldValueResponse {
  success: true;
  data: {
    fieldId: string;
    value: unknown;
    displayValue: string;
    updatedAt: string;
  };
}
```

### 6.6 批量更新任务

**Server Action**: `bulkUpdateTasks(data)`

**权限要求**: `task:update`

```typescript
interface BulkUpdateTasksRequest {
  taskIds: string[];
  updates: {
    statusId?: string;
    assigneeId?: string | null;
    priority?: string;
    dueDate?: string | null;
    fields?: Array<{
      fieldId: string;
      value: unknown;
    }>;
  };
}

interface BulkUpdateTasksResponse {
  success: true;
  data: {
    updatedCount: number;
    failedCount: number;
    failures?: Array<{
      taskId: string;
      error: string;
    }>;
  };
}
```

### 6.7 移动任务

**Server Action**: `moveTask(data)`

**权限要求**: `task:move`

```typescript
interface MoveTaskRequest {
  taskId: string;
  targetProjectId?: string;  // 跨项目移动
  targetStatusId?: string;   // 更改状态
  targetParentId?: string | null;  // 更改父任务
  position?: number;         // 新位置
}
```

### 6.8 删除任务

**Server Action**: `deleteTask(taskId)`

**权限要求**: `task:delete`

### 6.9 任务关联管理

#### 创建关联

**Server Action**: `createTaskLink(data)`

**权限要求**: `task:update`

```typescript
interface CreateTaskLinkRequest {
  fromTaskId: string;
  toTaskId: string;
  linkType: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'cloned_from';
}
```

#### 删除关联

**Server Action**: `deleteTaskLink(linkId)`

**权限要求**: `task:update`

### 6.10 附件管理

#### 上传附件

**Server Action**: `uploadTaskAttachment(taskId, file)`

**权限要求**: `task:attachment:manage`

```typescript
interface UploadAttachmentRequest {
  taskId: string;
  file: File;
}

interface UploadAttachmentResponse {
  success: true;
  data: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    thumbnailUrl?: string;
    uploadedBy: UserSummary;
    createdAt: string;
  };
}
```

#### 删除附件

**Server Action**: `deleteTaskAttachment(attachmentId)`

**权限要求**: `task:attachment:manage`

### 6.11 评论管理

#### 创建评论

**Server Action**: `createTaskComment(taskId, content)`

**权限要求**: `task:comment`

```typescript
interface CreateCommentRequest {
  taskId: string;
  content: string;  // 支持 Markdown
  mentions?: string[];  // @提及的用户 ID
}
```

#### 更新评论

**Server Action**: `updateTaskComment(commentId, content)`

**权限要求**: 评论作者或 `task:update`

#### 删除评论

**Server Action**: `deleteTaskComment(commentId)`

**权限要求**: 评论作者或 `task:update`

### 6.12 时间追踪

#### 开始计时

**Server Action**: `startTimeTracking(taskId)`

**权限要求**: `task:time:manage`

```typescript
interface StartTimeTrackingResponse {
  success: true;
  data: {
    id: string;
    taskId: string;
    startedAt: string;
  };
}
```

#### 停止计时

**Server Action**: `stopTimeTracking(timeEntryId)`

**权限要求**: `task:time:manage`

#### 手动添加时间记录

**Server Action**: `addTimeEntry(data)`

**权限要求**: `task:time:manage`

```typescript
interface AddTimeEntryRequest {
  taskId: string;
  description?: string;
  startedAt: string;
  duration: number;  // 秒
  billable?: boolean;
}
```

---

## 七、自定义字段接口

### 7.1 创建字段

**Server Action**: `createField(projectId, data)`

**权限要求**: `project:fields:manage`

```typescript
interface CreateFieldRequest {
  projectId: string;
  data: {
    name: string;
    slug?: string;
    type: FieldType;
    config?: FieldConfig;
    isRequired?: boolean;
    position?: number;
  };
}

type FieldType = 
  | 'text' | 'textarea' | 'number' | 'currency' | 'percent'
  | 'date' | 'datetime' | 'duration'
  | 'select' | 'multiselect' | 'status' | 'priority'
  | 'user' | 'users' | 'relation'
  | 'attachment' | 'url' | 'email' | 'phone'
  | 'formula' | 'rollup' | 'lookup'
  | 'progress' | 'rating' | 'checkbox';

interface CreateFieldResponse {
  success: true;
  data: {
    id: string;
    projectId: string;
    name: string;
    slug: string;
    type: string;
    config: FieldConfig;
    isRequired: boolean;
    isSystem: boolean;
    position: number;
    createdAt: string;
  };
}
```

**验证规则**:

| 字段 | 规则 |
|------|------|
| name | 必填，1-100 字符 |
| slug | 可选，1-50 字符，仅允许小写字母、数字、下划线 |
| type | 必填，有效的字段类型 |
| config | 根据字段类型验证 |

### 7.2 获取字段列表

**Server Action**: `getFields(projectId)`

**权限要求**: `project:read`

```typescript
interface GetFieldsResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    config: FieldConfig;
    isRequired: boolean;
    isSystem: boolean;
    isVisible: boolean;
    position: number;
    options?: Array<{
      id: string;
      label: string;
      value: string;
      color?: string;
      icon?: string;
    }>;
  }>;
}
```

### 7.3 更新字段

**Server Action**: `updateField(fieldId, data)`

**权限要求**: `project:fields:manage`

```typescript
interface UpdateFieldRequest {
  fieldId: string;
  data: {
    name?: string;
    config?: Partial<FieldConfig>;
    isRequired?: boolean;
    isVisible?: boolean;
    position?: number;
  };
}
```

### 7.4 删除字段

**Server Action**: `deleteField(fieldId)`

**权限要求**: `project:fields:manage`

**注意**: 系统字段不可删除，删除字段会同时删除所有相关的字段值

### 7.5 字段选项管理

#### 添加选项

**Server Action**: `addFieldOption(fieldId, option)`

**权限要求**: `project:fields:manage`

```typescript
interface AddFieldOptionRequest {
  fieldId: string;
  option: {
    label: string;
    value?: string;
    color?: string;
    icon?: string;
    position?: number;
  };
}
```

#### 更新选项

**Server Action**: `updateFieldOption(optionId, data)`

**权限要求**: `project:fields:manage`

#### 删除选项

**Server Action**: `deleteFieldOption(optionId, replacementOptionId?)`

**权限要求**: `project:fields:manage`

```typescript
interface DeleteFieldOptionRequest {
  optionId: string;
  replacementOptionId?: string;  // 将使用此选项的任务转移到此选项
}
```

---

## 八、视图管理接口

### 8.1 创建视图

**Server Action**: `createView(projectId, data)`

**权限要求**: `view:create`

```typescript
interface CreateViewRequest {
  projectId: string;
  data: {
    name: string;
    type: ViewType;
    config: ViewConfig;
    isPersonal?: boolean;
    position?: number;
  };
}

type ViewType = 'kanban' | 'list' | 'table' | 'calendar' | 'timeline' | 'gantt' | 'gallery';

interface CreateViewResponse {
  success: true;
  data: {
    id: string;
    projectId: string;
    name: string;
    type: string;
    config: ViewConfig;
    isDefault: boolean;
    isPersonal: boolean;
    position: number;
    createdAt: string;
  };
}
```

### 8.2 获取视图列表

**Server Action**: `getViews(projectId)`

**权限要求**: `view:read`

```typescript
interface GetViewsResponse {
  success: true;
  data: Array<{
    id: string;
    name: string;
    type: string;
    isDefault: boolean;
    isPersonal: boolean;
    isLocked: boolean;
    position: number;
    createdBy?: {
      id: string;
      fullName: string;
    };
  }>;
}
```

### 8.3 获取视图详情

**Server Action**: `getView(viewId)`

**权限要求**: `view:read`

```typescript
interface GetViewResponse {
  success: true;
  data: {
    id: string;
    projectId: string;
    name: string;
    type: string;
    config: ViewConfig;
    isDefault: boolean;
    isPersonal: boolean;
    isLocked: boolean;
    createdBy?: UserSummary;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 8.4 更新视图

**Server Action**: `updateView(viewId, data)`

**权限要求**: `view:update`

```typescript
interface UpdateViewRequest {
  viewId: string;
  data: {
    name?: string;
    config?: Partial<ViewConfig>;
    isLocked?: boolean;
    position?: number;
  };
}
```

### 8.5 设为默认视图

**Server Action**: `setDefaultView(viewId)`

**权限要求**: `project:update`

### 8.6 删除视图

**Server Action**: `deleteView(viewId)`

**权限要求**: `view:delete`

**注意**: 默认视图和锁定视图不可删除

### 8.7 复制视图

**Server Action**: `duplicateView(viewId, name?)`

**权限要求**: `view:create`

```typescript
interface DuplicateViewRequest {
  viewId: string;
  name?: string;
  asPersonal?: boolean;
}
```

---

## 九、通用响应格式

### 9.1 分页响应

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

### 9.2 批量操作响应

```typescript
interface BulkOperationResponse {
  success: true;
  data: {
    successCount: number;
    failedCount: number;
    results: Array<{
      id: string;
      success: boolean;
      error?: string;
    }>;
  };
}
```

### 9.3 Webhook 事件格式

```typescript
interface WebhookEvent {
  id: string;
  type: string;        // 'task.created', 'task.updated', etc.
  timestamp: string;
  organizationId: string;
  projectId?: string;
  actor: {
    id: string;
    email: string;
    fullName?: string;
  };
  data: {
    before?: unknown;
    after?: unknown;
    changes?: Record<string, { from: unknown; to: unknown }>;
  };
}
```

---

## 附录

### A. 完整的权限列表

请参见 [01-architecture-design.md](./01-architecture-design.md#222-预设角色)

### B. 字段类型配置参考

请参见 [01-architecture-design.md](./01-architecture-design.md#313-字段配置结构)

### C. 视图配置参考

请参见 [01-architecture-design.md](./01-architecture-design.md#322-视图配置结构)
