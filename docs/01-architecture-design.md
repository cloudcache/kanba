# 系统架构设计文档

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [整体架构](#一整体架构)
2. [组织与权限架构](#二组织与权限架构)
3. [多维表格架构](#三多维表格架构)
4. [认证架构](#四认证架构)
5. [国际化架构](#五国际化架构)
6. [数据库兼容架构](#六数据库兼容架构)

---

## 一、整体架构

### 1.1 系统分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         表现层 (Presentation)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 看板视图 │ │ 列表视图 │ │ 表格视图 │ │ 日历视图 │ │ 甘特图  │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                              │                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    组件层 (Components)                         │  │
│  │  shadcn/ui + 自定义组件 + 国际化文本                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         应用层 (Application)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Server Actions / API Routes                 │  │
│  │  认证中间件 │ 权限检查 │ 数据验证 │ 业务逻辑                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         领域层 (Domain)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ 组织管理 │ │ 项目管理 │ │ 任务管理 │ │ 字段管理 │ │ 视图管理 │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                               │
│  │ 权限管理 │ │ 认证管理 │ │ 通知管理 │                               │
│  └─────────┘ └─────────┘ └─────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       基础设施层 (Infrastructure)                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     数据库适配层                              │    │
│  │  ┌──────────────┐    ┌──────────────┐                       │    │
│  │  │  PostgreSQL  │    │    MySQL     │                       │    │
│  │  └──────────────┘    └──────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     认证适配层                                │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │    │
│  │  │Supabase│ │  LDAP  │ │ LLDAP  │ │ Local  │               │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     存储适配层                                │    │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │    │
│  │  │  Supabase  │ │    S3      │ │ Local FS   │               │    │
│  │  │  Storage   │ │  Storage   │ │  Storage   │               │    │
│  │  └────────────┘ └────────────┘ └────────────┘               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构规划

```
/app
  /[locale]                      # 国际化路由
    /layout.tsx
    /page.tsx
    /(auth)                      # 认证相关页面
      /login/page.tsx
      /signup/page.tsx
      /forgot-password/page.tsx
    /(dashboard)                 # 主应用
      /layout.tsx
      /page.tsx                  # Dashboard 首页
      /organizations             # 组织管理
        /page.tsx
        /[orgId]
          /settings/page.tsx
          /members/page.tsx
          /roles/page.tsx
      /workspaces                # 工作空间
        /[workspaceId]
          /page.tsx
          /settings/page.tsx
      /projects                  # 项目管理
        /[projectId]
          /page.tsx              # 默认视图
          /board/page.tsx        # 看板视图
          /list/page.tsx         # 列表视图
          /table/page.tsx        # 表格视图
          /calendar/page.tsx     # 日历视图
          /timeline/page.tsx     # 时间线视图
          /settings
            /page.tsx
            /fields/page.tsx     # 自定义字段
            /members/page.tsx
      /tasks
        /[taskId]/page.tsx       # 任务详情
      /settings                  # 用户设置
        /page.tsx
        /profile/page.tsx
        /preferences/page.tsx
  /api
    /auth                        # 认证 API
      /ldap/route.ts
      /callback/route.ts
    /webhooks
      /stripe/route.ts
    /v1                          # 公开 API (未来)
      /...

/lib
  /adapters                      # 适配器层
    /database
      /index.ts
      /postgres.ts
      /mysql.ts
    /auth
      /index.ts
      /supabase.ts
      /ldap.ts
      /lldap.ts
    /storage
      /index.ts
      /supabase.ts
      /s3.ts
      /local.ts
  /services                      # 业务服务层
    /organization.ts
    /workspace.ts
    /project.ts
    /task.ts
    /field.ts
    /view.ts
    /permission.ts
    /notification.ts
  /permissions                   # 权限定义
    /index.ts
    /roles.ts
    /actions.ts
  /i18n                          # 国际化配置
    /config.ts
    /request.ts
  /utils                         # 工具函数
    /db.ts
    /validation.ts

/locales                         # 国际化文件
  /en.json
  /zh-CN.json
  /zh-TW.json

/components
  /ui                            # shadcn/ui 组件
  /layout                        # 布局组件
  /organization                  # 组织相关组件
  /workspace                     # 工作空间组件
  /project                       # 项目组件
  /task                          # 任务组件
  /field                         # 自定义字段组件
  /view                          # 视图组件
    /kanban
    /list
    /table
    /calendar
    /timeline
    /gantt
  /auth                          # 认证组件
  /i18n                          # 国际化组件

/prisma
  /schema.prisma                 # Prisma Schema
  /migrations                    # 迁移文件
    /postgresql                  # PostgreSQL 特定迁移
    /mysql                       # MySQL 特定迁移
```

---

## 二、组织与权限架构

### 2.1 组织层级模型

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Organization                                 │
│  (组织 - 对应一个公司/团队)                                           │
│  - id, name, slug, logo, billing_plan                               │
│  - settings: JSON (组织级配置)                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
│ OrganizationMember│ │   Workspace   │ │      Role         │
│ (组织成员)         │ │ (工作空间)     │ │ (自定义角色)       │
│ - user_id         │ │ - org_id      │ │ - permissions[]   │
│ - role_id         │ │ - name        │ │ - is_system       │
│ - status          │ │ - visibility  │ │ - org_id          │
└───────────────────┘ └───────┬───────┘ └───────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │    Project    │   │WorkspaceMember│
            │  - workspace_id│   │ - role_id     │
            │  - visibility │   │               │
            └───────┬───────┘   └───────────────┘
                    │
            ┌───────┴───────┐
            ▼               ▼
    ┌───────────────┐ ┌───────────────┐
    │ProjectMember  │ │     Task      │
    │ - role_id     │ │ - project_id  │
    └───────────────┘ └───────────────┘
```

### 2.2 RBAC 权限模型

#### 2.2.1 权限定义

```typescript
// 权限命名规范: {resource}:{action}
const PERMISSIONS = {
  // ========== 组织级权限 ==========
  'org:read': '查看组织信息',
  'org:update': '更新组织设置',
  'org:delete': '删除组织',
  'org:billing': '管理账单',
  'org:members:read': '查看组织成员',
  'org:members:invite': '邀请成员',
  'org:members:remove': '移除成员',
  'org:members:update_role': '修改成员角色',
  'org:roles:read': '查看角色',
  'org:roles:create': '创建角色',
  'org:roles:update': '更新角色',
  'org:roles:delete': '删除角色',
  'org:audit_log': '查看审计日志',
  
  // ========== 工作空间级权限 ==========
  'workspace:create': '创建工作空间',
  'workspace:read': '查看工作空间',
  'workspace:update': '更新工作空间',
  'workspace:delete': '删除工作空间',
  'workspace:members:manage': '管理空间成员',
  
  // ========== 项目级权限 ==========
  'project:create': '创建项目',
  'project:read': '查看项目',
  'project:update': '更新项目设置',
  'project:delete': '删除项目',
  'project:archive': '归档项目',
  'project:members:manage': '管理项目成员',
  'project:share': '分享项目',
  'project:fields:manage': '管理自定义字段',
  'project:views:manage': '管理视图',
  
  // ========== 任务级权限 ==========
  'task:create': '创建任务',
  'task:read': '查看任务',
  'task:update': '更新任务',
  'task:delete': '删除任务',
  'task:assign': '分配任务',
  'task:move': '移动任务',
  'task:comment': '评论任务',
  'task:attachment:manage': '管理附件',
  'task:time:manage': '管理工时',
  
  // ========== 视图级权限 ==========
  'view:create': '创建视图',
  'view:update': '更新视图',
  'view:delete': '删除视图',
  'view:share': '分享视图',
} as const;

type Permission = keyof typeof PERMISSIONS;
```

#### 2.2.2 预设角色

| 角色 | 代码 | 范围 | 权限 | 是否系统角色 |
|------|------|------|------|--------------|
| 组织所有者 | `org_owner` | Organization | 全部权限 | 是 |
| 组织管理员 | `org_admin` | Organization | 除删除组织外的全部权限 | 是 |
| 空间管理员 | `workspace_admin` | Workspace | 空间和项目管理权限 | 是 |
| 项目管理员 | `project_admin` | Project | 项目和任务管理权限 | 是 |
| 成员 | `member` | Project | 任务操作权限 | 是 |
| 访客 | `guest` | Project | 只读权限 | 是 |

#### 2.2.3 权限检查流程

```
用户请求 → 认证检查 → 获取用户上下文 → 权限检查 → 执行操作
                              │
                              ▼
              ┌───────────────────────────────┐
              │        权限检查逻辑            │
              ├───────────────────────────────┤
              │ 1. 获取用户在该资源的角色      │
              │ 2. 获取角色的权限列表          │
              │ 3. 检查是否包含所需权限        │
              │ 4. 支持权限继承（org→ws→proj）│
              └───────────────────────────────┘
```

### 2.3 成员邀请流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  管理员发起  │───►│ 创建邀请记录 │───►│ 发送邀请邮件 │───►│ 用户接受邀请 │
│    邀请     │    │ (待接受状态) │    │ (含邀请链接) │    │  (验证token)│
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
                                                                ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │  成员加入   │◄───│ 更新邀请状态 │◄───│ 用户注册/登录│
                   │ 组织/项目   │    │  (已接受)   │    │  (如未注册) │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 三、多维表格架构

### 3.1 自定义字段系统设计

#### 3.1.1 字段类型体系

```
字段类型分类：
├── 基础类型
│   ├── text          # 单行文本
│   ├── textarea      # 多行文本
│   ├── number        # 数字
│   ├── currency      # 货币
│   └── percent       # 百分比
│
├── 日期时间类型
│   ├── date          # 日期
│   ├── datetime      # 日期时间
│   └── duration      # 时长
│
├── 选择类型
│   ├── select        # 单选
│   ├── multiselect   # 多选
│   ├── status        # 状态 (特殊单选)
│   └── priority      # 优先级 (特殊单选)
│
├── 关联类型
│   ├── user          # 用户 (单选)
│   ├── users         # 用户 (多选)
│   └── relation      # 关联其他任务
│
├── 媒体类型
│   ├── attachment    # 附件
│   ├── url           # 链接
│   ├── email         # 邮箱
│   └── phone         # 电话
│
└── 高级类型
    ├── formula       # 公式字段
    ├── rollup        # 汇总字段
    ├── lookup        # 查找字段
    ├── progress      # 进度条
    ├── rating        # 评分
    └── checkbox      # 复选框
```

#### 3.1.2 EAV 存储模式

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ FieldDefinition │       │   FieldOption   │       │   FieldValue    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ project_id      │──┐    │ field_def_id    │───────│ task_id         │
│ name            │  │    │ label           │       │ field_def_id    │
│ slug            │  │    │ value           │       │ text_value      │
│ type            │  │    │ color           │       │ number_value    │
│ config (JSON)   │◄─┼────│ icon            │       │ date_value      │
│ position        │  │    │ position        │       │ json_value      │
│ is_required     │  │    └─────────────────┘       │ created_at      │
│ is_system       │  │                              │ updated_at      │
└─────────────────┘  │                              └─────────────────┘
                     │
                     └──────────────────────────────────────┘
```

#### 3.1.3 字段配置结构

```typescript
interface FieldConfig {
  // ===== 文本类型配置 =====
  text: {
    maxLength?: number;
    minLength?: number;
    placeholder?: string;
    pattern?: string;          // 正则验证
  };
  
  // ===== 数字类型配置 =====
  number: {
    min?: number;
    max?: number;
    precision?: number;        // 小数位数
    format?: 'number' | 'currency' | 'percent';
    currencyCode?: string;     // ISO 4217 货币代码
    currencyPosition?: 'before' | 'after';
  };
  
  // ===== 日期类型配置 =====
  date: {
    includeTime?: boolean;
    defaultToToday?: boolean;
    dateFormat?: string;       // 日期格式
    minDate?: string;
    maxDate?: string;
  };
  
  // ===== 选择类型配置 =====
  select: {
    options: FieldOption[];
    allowCreate?: boolean;     // 允许创建新选项
    defaultOptionId?: string;
  };
  
  // ===== 用户类型配置 =====
  user: {
    allowMultiple?: boolean;
    scope?: 'project' | 'workspace' | 'organization';
    defaultToCurrentUser?: boolean;
  };
  
  // ===== 关联类型配置 =====
  relation: {
    targetProjectId?: string;  // null = 同项目
    relationType?: 'one-to-one' | 'one-to-many' | 'many-to-many';
    reverseName?: string;      // 反向关联字段名
    reverseFieldId?: string;   // 反向字段 ID
  };
  
  // ===== 公式类型配置 =====
  formula: {
    expression: string;        // 公式表达式
    resultType: 'text' | 'number' | 'date' | 'boolean';
    referencedFields: string[];// 引用的字段 ID
  };
  
  // ===== 汇总类型配置 =====
  rollup: {
    relationFieldId: string;   // 关联字段 ID
    targetFieldId: string;     // 目标字段 ID
    aggregation: RollupAggregation;
  };
  
  // ===== 进度条配置 =====
  progress: {
    min?: number;              // 默认 0
    max?: number;              // 默认 100
    showLabel?: boolean;
  };
  
  // ===== 评分配置 =====
  rating: {
    max?: number;              // 默认 5
    icon?: 'star' | 'heart' | 'circle';
    allowHalf?: boolean;
  };
}

type RollupAggregation = 
  | 'count' 
  | 'count_values'
  | 'count_unique'
  | 'count_empty'
  | 'count_not_empty'
  | 'percent_empty'
  | 'percent_not_empty'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'range'
  | 'earliest_date'
  | 'latest_date'
  | 'date_range';
```

### 3.2 视图系统设计

#### 3.2.1 视图类型

| 视图类型 | 代码 | 描述 | 必需字段 |
|----------|------|------|----------|
| 看板 | `kanban` | 按状态分组的卡片视图 | 状态字段 |
| 列表 | `list` | 简洁的条目列表 | - |
| 表格 | `table` | 电子表格风格 | - |
| 日历 | `calendar` | 按日期显示 | 日期字段 |
| 时间线 | `timeline` | 里程碑时间线 | 日期字段 |
| 甘特图 | `gantt` | 项目进度图 | 开始/结束日期 |
| 画廊 | `gallery` | 卡片网格 | - |

#### 3.2.2 视图配置结构

```typescript
interface ViewConfig {
  // ===== 通用配置 =====
  fields: {
    visible: string[];         // 显示的字段 ID
    order: string[];           // 字段顺序
    widths?: Record<string, number>; // 列宽度 (表格视图)
  };
  
  // ===== 筛选条件 =====
  filters?: {
    operator: 'and' | 'or';
    conditions: FilterCondition[];
  };
  
  // ===== 排序 =====
  sorts?: Array<{
    fieldId: string;
    direction: 'asc' | 'desc';
  }>;
  
  // ===== 分组 =====
  groupBy?: {
    fieldId: string;
    collapsed?: string[];      // 收起的分组
    hideEmpty?: boolean;
  };
  
  // ===== 看板配置 =====
  kanban?: {
    groupFieldId: string;      // 分组字段 (通常是状态)
    cardFields: string[];      // 卡片显示字段
    cardSize: 'compact' | 'normal' | 'large';
    showEmptyGroups: boolean;
  };
  
  // ===== 日历配置 =====
  calendar?: {
    startDateFieldId: string;
    endDateFieldId?: string;
    defaultView: 'month' | 'week' | 'day' | 'agenda';
    showWeekends: boolean;
    firstDayOfWeek: 0 | 1;     // 0=周日, 1=周一
  };
  
  // ===== 甘特图配置 =====
  gantt?: {
    startDateFieldId: string;
    endDateFieldId: string;
    progressFieldId?: string;
    dependencyFieldId?: string;
    showCriticalPath: boolean;
    showMilestones: boolean;
    scale: 'day' | 'week' | 'month' | 'quarter';
  };
  
  // ===== 时间线配置 =====
  timeline?: {
    dateFieldId: string;
    groupByFieldId?: string;
    scale: 'day' | 'week' | 'month' | 'quarter' | 'year';
    showToday: boolean;
  };
  
  // ===== 表格配置 =====
  table?: {
    frozenColumns?: number;    // 冻结列数
    rowHeight: 'compact' | 'normal' | 'tall';
    wrapText: boolean;
  };
}

interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
}

type FilterOperator = 
  // 通用
  | 'equals' | 'not_equals'
  | 'is_empty' | 'is_not_empty'
  // 文本
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  // 数字
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
  // 选择
  | 'is_any_of' | 'is_none_of'
  // 日期
  | 'is_before' | 'is_after' | 'is_on_or_before' | 'is_on_or_after'
  | 'is_within'  // 在...之内
  | 'today' | 'tomorrow' | 'yesterday'
  | 'this_week' | 'next_week' | 'last_week'
  | 'this_month' | 'next_month' | 'last_month'
  | 'this_year'
  // 用户
  | 'is_me' | 'is_not_me';
```

### 3.3 任务增强设计

#### 3.3.1 任务层级结构

```
TaskType 层级：
├── Epic (史诗)
│   └── Story (用户故事)
│       └── Task (任务)
│           └── Subtask (子任务)
│
└── Milestone (里程碑) - 独立层级
    └── 关联的 Tasks
```

#### 3.3.2 任务关联类型

| 关联类型 | 代码 | 描述 | 语义 |
|----------|------|------|------|
| 阻塞 | `blocks` | A 阻塞 B | B 依赖 A 完成 |
| 被阻塞 | `blocked_by` | A 被 B 阻塞 | A 依赖 B 完成 |
| 相关 | `relates_to` | A 与 B 相关 | 无依赖关系 |
| 重复 | `duplicates` | A 是 B 的重复 | A 可能需关闭 |
| 克隆自 | `cloned_from` | A 克隆自 B | 记录来源 |

---

## 四、认证架构

### 4.1 多认证源架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AuthProvider (统一入口)                       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐             │
│  │ Supabase │  │  LDAP/   │  │  OAuth   │  │  Local  │             │
│  │   Auth   │  │  LLDAP   │  │ (Google) │  │Password │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘             │
│       │             │             │              │                  │
│       └─────────────┴─────────────┴──────────────┘                  │
│                         │                                           │
│              ┌──────────▼──────────┐                               │
│              │   Unified Session   │                               │
│              │     Management      │                               │
│              │  (JWT / Cookie)     │                               │
│              └──────────┬──────────┘                               │
│                         │                                           │
│              ┌──────────▼──────────┐                               │
│              │   Profile Sync      │                               │
│              │  (用户数据同步)      │                               │
│              └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 LDAP 认证流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  用户输入    │───►│ LDAP Bind   │───►│ 搜索用户DN  │───►│ 验证密码    │
│  账号密码   │    │ (Admin DN)  │    │ (Search)    │    │ (User Bind) │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
        ┌───────────────────────────────────────────────────────┘
        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 获取用户组   │───►│ 组角色映射  │───►│ 同步Profile │───►│ 生成Session │
│ (memberOf)  │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 4.3 LDAP 配置结构

```typescript
interface LDAPConfig {
  // 连接配置
  url: string;                    // ldap://host:389 或 ldaps://host:636
  baseDN: string;                 // dc=example,dc=com
  bindDN: string;                 // cn=admin,dc=example,dc=com
  bindPassword: string;
  
  // TLS 配置
  tlsEnabled: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
    ca?: string;                  // CA 证书
  };
  
  // 用户搜索配置
  userSearchBase: string;         // ou=users,dc=example,dc=com
  userSearchFilter: string;       // (uid={{username}}) 或 (mail={{username}})
  userSearchScope: 'base' | 'one' | 'sub';
  
  // 属性映射
  attributeMapping: {
    id: string;                   // uidNumber 或 entryUUID
    username: string;             // uid
    email: string;                // mail
    fullName: string;             // cn 或 displayName
    avatar?: string;              // jpegPhoto
    groups?: string;              // memberOf
  };
  
  // 组配置 (可选)
  groupSearchBase?: string;
  groupSearchFilter?: string;
  groupMemberAttribute?: string;  // member 或 uniqueMember
  
  // 组角色映射
  groupRoleMapping?: Array<{
    ldapGroup: string;            // cn=admins,ou=groups,dc=example,dc=com
    organizationId?: string;
    roleId: string;
  }>;
}
```

### 4.4 会话管理

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
  authProvider: 'supabase' | 'ldap' | 'lldap' | 'local';
  organizationId?: string;
  permissions?: string[];         // 缓存的权限列表
  expiresAt: number;
}
```

---

## 五、国际化架构

### 5.1 目录结构

```
/locales
  /en.json                       # 英文 (默认/fallback)
  /zh-CN.json                    # 简体中文
  /zh-TW.json                    # 繁体中文
  /ja.json                       # 日文 (可选)
  
/lib/i18n
  /config.ts                     # 国际化配置
  /request.ts                    # 请求处理
  
/app/[locale]
  /layout.tsx                    # 语言感知布局
  /...                           # 其他页面
```

### 5.2 消息文件结构

```json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "create": "创建",
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "confirm": "确认",
    "search": "搜索",
    "filter": "筛选",
    "sort": "排序",
    "export": "导出",
    "import": "导入"
  },
  "auth": {
    "login": "登录",
    "logout": "退出登录",
    "signup": "注册",
    "forgotPassword": "忘记密码",
    "resetPassword": "重置密码",
    "email": "邮箱",
    "password": "密码",
    "confirmPassword": "确认密码",
    "rememberMe": "记住我",
    "loginWith": "使用 {provider} 登录",
    "noAccount": "没有账号？",
    "hasAccount": "已有账号？",
    "ldap": {
      "title": "企业账号登录",
      "username": "用户名",
      "domain": "域"
    }
  },
  "organization": {
    "title": "组织",
    "create": "创建组织",
    "settings": "组织设置",
    "members": "成员管理",
    "roles": "角色管理",
    "billing": "账单",
    "inviteMember": "邀请成员",
    "removeMember": "移除成员"
  },
  "workspace": {
    "title": "工作空间",
    "create": "创建工作空间",
    "settings": "空间设置"
  },
  "project": {
    "title": "项目",
    "create": "创建项目",
    "settings": "项目设置",
    "members": "项目成员",
    "archive": "归档项目",
    "share": "分享项目"
  },
  "task": {
    "title": "任务",
    "create": "创建任务",
    "edit": "编辑任务",
    "delete": "删除任务",
    "assign": "分配给",
    "dueDate": "截止日期",
    "priority": {
      "label": "优先级",
      "low": "低",
      "medium": "中",
      "high": "高",
      "urgent": "紧急"
    },
    "status": {
      "label": "状态",
      "todo": "待办",
      "inProgress": "进行中",
      "done": "已完成"
    },
    "subtask": "子任务",
    "attachment": "附件",
    "comment": "评论",
    "activity": "活动"
  },
  "view": {
    "kanban": "看板",
    "list": "列表",
    "table": "表格",
    "calendar": "日历",
    "timeline": "时间线",
    "gantt": "甘特图"
  },
  "field": {
    "title": "字段",
    "create": "创建字段",
    "edit": "编辑字段",
    "types": {
      "text": "文本",
      "number": "数字",
      "date": "日期",
      "select": "单选",
      "multiselect": "多选",
      "user": "用户",
      "relation": "关联"
    }
  },
  "errors": {
    "generic": "发生错误，请稍后重试",
    "notFound": "未找到",
    "unauthorized": "未授权",
    "forbidden": "无权限",
    "validation": "验证失败"
  }
}
```

### 5.3 日期和数字格式化

```typescript
// 使用 Intl API 进行本地化格式化
const formatters = {
  date: (date: Date, locale: string) => 
    new Intl.DateTimeFormat(locale, { 
      dateStyle: 'medium' 
    }).format(date),
    
  datetime: (date: Date, locale: string) => 
    new Intl.DateTimeFormat(locale, { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(date),
    
  relativeTime: (date: Date, locale: string) => {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    // ... 计算相对时间
  },
    
  number: (num: number, locale: string) => 
    new Intl.NumberFormat(locale).format(num),
    
  currency: (amount: number, locale: string, currency: string) => 
    new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency 
    }).format(amount),
    
  percent: (num: number, locale: string) => 
    new Intl.NumberFormat(locale, { 
      style: 'percent' 
    }).format(num),
};
```

---

## 六、数据库兼容架构

### 6.1 适配器模式

```typescript
interface DatabaseAdapter {
  provider: 'postgresql' | 'mysql';
  
  // SQL 语法差异处理
  sql: {
    // 字符串匹配
    ilike: (field: string, value: string) => string;
    
    // JSON 操作
    jsonExtract: (field: string, path: string) => string;
    jsonContains: (field: string, value: any) => string;
    
    // 日期函数
    now: () => string;
    dateAdd: (field: string, interval: number, unit: string) => string;
    dateDiff: (field1: string, field2: string, unit: string) => string;
    
    // 字符串函数
    concat: (...fields: string[]) => string;
    substring: (field: string, start: number, length: number) => string;
    
    // 聚合函数
    groupConcat: (field: string, separator: string) => string;
    
    // 分页
    limit: (offset: number, limit: number) => string;
    
    // UUID 生成
    uuid: () => string;
  };
  
  // 类型映射
  types: {
    uuid: string;        // PostgreSQL: uuid, MySQL: char(36)
    json: string;        // 两者都支持 JSON
    text: string;        // 两者都支持 TEXT
    timestamp: string;   // PostgreSQL: timestamp, MySQL: datetime
    boolean: string;     // PostgreSQL: boolean, MySQL: tinyint(1)
  };
}
```

### 6.2 兼容性处理清单

| 特性 | PostgreSQL | MySQL | 处理方式 |
|------|------------|-------|----------|
| UUID | 原生支持 `uuid` | `CHAR(36)` | 应用层生成 CUID |
| JSON | `jsonb` | `json` | 使用 Prisma JSON 类型 |
| 布尔 | `boolean` | `tinyint(1)` | Prisma 自动转换 |
| 自增 | `SERIAL` | `AUTO_INCREMENT` | Prisma 处理 |
| 大小写搜索 | `ILIKE` | `LIKE` (默认不敏感) | 适配器封装 |
| 枚举 | 原生 ENUM | Prisma ENUM | 使用 Prisma ENUM |
| 数组 | 原生支持 | 不支持 | JSON 存储 |
| 全文搜索 | `tsvector` | `FULLTEXT` | 分别实现 |
| 时间精度 | 微秒 | 秒 (可配置) | 统一毫秒 |

### 6.3 迁移策略

```
/prisma
  /schema.prisma              # 主 Schema (provider 由环境变量决定)
  /migrations
    /shared                   # 通用迁移 (Prisma 管理)
    /postgresql               # PostgreSQL 特定 SQL
    /mysql                    # MySQL 特定 SQL
  /seed.ts                    # 种子数据
```

---

## 附录

### A. 技术决策记录 (ADR)

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-001 | 使用 next-intl 进行国际化 | 已采纳 |
| ADR-002 | 使用 EAV 模式存储自定义字段 | 已采纳 |
| ADR-003 | 使用 Prisma 进行数据库兼容 | 已采纳 |
| ADR-004 | 使用 ldapjs 进行 LDAP 认证 | 已采纳 |
| ADR-005 | RBAC 权限模型设计 | 已采纳 |

### B. 相关文档

- [02-database-migration.md](./02-database-migration.md) - 数据库迁移计划
- [03-api-specification.md](./03-api-specification.md) - API 接口规范
