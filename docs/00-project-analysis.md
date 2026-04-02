# Kanba 项目管理软件改造分析报告

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [项目现状分析](#一项目现状分析)
2. [功能差距分析](#二功能差距分析)
3. [改造目标](#三改造目标)
4. [技术选型](#四技术选型)

---

## 一、项目现状分析

### 1.1 技术栈概览

| 类别 | 当前技术 |
|------|----------|
| 框架 | Next.js 13.5 (App Router) |
| UI 库 | shadcn/ui + Tailwind CSS |
| 数据库 | Supabase (PostgreSQL) + Prisma ORM |
| 认证 | Supabase Auth (OAuth: Google/GitHub + 邮箱密码) |
| 状态管理 | React Context (UserProvider) |
| 支付 | Stripe |

### 1.2 当前数据模型

```
┌─────────────────────────────────────────────────────────────────────┐
│                        当前数据架构                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Profile ─────┬──────> Project ────> Column ────> Task              │
│     │         │           │                          │               │
│     │         │           └──> ProjectMember         └──> TaskComment│
│     │         │                                                      │
│     └─────────┼──> Notification                                      │
│               └──> Bookmark                                          │
│                                                                      │
│  [Stripe 支付模块]                                                   │
│  StripeCustomer, StripeSubscription, StripeOrder                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 现有数据表清单

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| profiles | 用户资料 | id, email, full_name, avatar_url, subscription_status |
| projects | 项目 | id, name, description, slug, user_id |
| columns | 看板列 | id, name, project_id, position |
| tasks | 任务 | id, title, description, column_id, position, priority, due_date, is_done |
| task_comments | 任务评论 | id, task_id, user_id, content |
| project_members | 项目成员 | id, project_id, user_id, role |
| activity_logs | 活动日志 | id, project_id, user_id, action, entity_type |
| notifications | 通知 | id, user_id, title, message, type, read |
| bookmarks | 收藏 | id, user_id, project_id |
| stripe_* | Stripe 支付相关 | - |

---

## 二、功能差距分析

### 2.1 功能矩阵对比

| 功能领域 | 当前状态 | 行业标准 (Linear/Notion/Jira) | 差距等级 |
|----------|----------|-------------------------------|----------|
| **任务基础** | title, description, priority, due_date, is_done | 基本满足 | 低 |
| **子任务** | 不支持 | 必备 | **高** |
| **附件上传** | 不支持 | 必备 | **高** |
| **标签/分类** | 不支持 | 必备 | **高** |
| **时间追踪** | 不支持 | 常见 | 中 |
| **任务关联** | 不支持 | 常见 | 中 |
| **自定义字段** | 不支持 | 必备 (多维表格核心) | **高** |
| **工作流自动化** | 不支持 | 必备 | **高** |
| **里程碑/Sprint** | 不支持 | 必备 | **高** |
| **组织层级** | 无 (仅 Project) | Organization > Workspace > Project | **高** |
| **权限粒度** | owner/admin/member | 细粒度 RBAC | **高** |
| **多视图** | 仅看板 | 看板/列表/甘特图/日历/时间线 | **高** |
| **报表/统计** | 简单统计 | 高级报表 | 中 |
| **搜索/过滤** | 基础 | 全文搜索 + 高级过滤 | 中 |
| **API 开放** | 无 | RESTful/GraphQL API | 中 |
| **Webhook** | 无 | 事件驱动集成 | 中 |
| **国际化** | 不支持 | 多语言支持 | **高** |
| **数据库兼容** | 仅 PostgreSQL | MySQL/PostgreSQL 兼容 | **高** |
| **企业认证** | 仅 Supabase Auth | LDAP/LLDAP/SAML/SSO | **高** |

### 2.2 任务模型局限性分析

**当前 Task 模型问题：**

```
┌─────────────────────────────────┐
│           Task                  │
├─────────────────────────────────┤
│ - id                            │
│ - title                         │
│ - description                   │
│ - priority (low/medium/high)    │ ← 固定枚举，不可扩展
│ - due_date                      │
│ - is_done                       │
│ - assigned_to (单人)            │ ← 只能分配给一人
│ - column_id                     │ ← 强绑定到看板列
└─────────────────────────────────┘

问题清单：
1. 字段固定 - 无法根据项目需求自定义
2. 单一视图 - 仅支持看板视图，任务绑定到列
3. 无层级 - 不支持子任务/史诗/故事
4. 无关联 - 任务间无法建立依赖关系
5. 无多选 - 只能分配一人，无标签系统
6. 无附件 - 无法上传文件
7. 无时间追踪 - 无法记录工时
```

### 2.3 组织权限模型局限性分析

**当前权限模型问题：**

```
当前模型：
┌─────────────────┐
│    Profile      │
│  (用户账户)      │
└────────┬────────┘
         │ 直接关联
         ▼
┌─────────────────┐      ┌─────────────────┐
│    Project      │◄────►│ ProjectMember   │
│                 │      │ (owner/admin/   │
│                 │      │  member)        │
└─────────────────┘      └─────────────────┘

问题清单：
1. 无组织层级 - 无法支持企业级多团队协作
2. 权限粒度过粗 - 仅三种固定角色，无法细分操作权限
3. 无角色继承 - 每个项目需单独设置成员权限
4. 无权限审计 - 无法追踪权限变更历史
5. 无邀请机制 - 缺少正式的邀请流程
6. 无组映射 - 无法与 LDAP 组进行映射
```

---

## 三、改造目标

### 3.1 核心改造目标

1. **国际化支持** - 支持多语言切换，默认支持中文、英文
2. **数据库兼容** - 同时支持 MySQL 和 PostgreSQL
3. **企业认证** - 支持 LDAP/LLDAP 认证，保留原有认证方式
4. **组织架构** - 引入 Organization > Workspace > Project 三级结构
5. **细粒度权限** - 实现 RBAC 权限模型，支持自定义角色
6. **多维表格** - 实现自定义字段系统，支持多种视图
7. **任务增强** - 支持子任务、附件、关联、时间追踪

### 3.2 设计原则

1. **向后兼容** - 现有数据和功能不受影响，平滑迁移
2. **渐进增强** - 分阶段实施，每阶段可独立上线
3. **可配置性** - 功能可通过配置开关控制
4. **性能优先** - 避免 N+1 查询，合理使用索引
5. **安全第一** - 权限检查前置，数据隔离

---

## 四、技术选型

### 4.1 国际化方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **next-intl** | Next.js 原生支持、App Router 兼容、Server Components 支持 | 学习曲线中等 | **推荐** |
| react-i18next | 生态成熟、文档丰富 | 需要额外配置 SSR | 备选 |
| next-translate | 轻量级 | 功能相对有限 | 不推荐 |

**选定方案：next-intl**

### 4.2 数据库兼容方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **Prisma + 环境变量切换** | 已在使用、生态成熟、类型安全 | 部分 SQL 语法差异需处理 | **推荐** |
| Drizzle ORM | 更轻量、SQL-like 语法 | 需要重写所有数据访问层 | 不推荐 |
| TypeORM | 支持多数据库 | 性能较差、类型支持弱 | 不推荐 |

**选定方案：Prisma + 数据库适配层**

### 4.3 LDAP 认证方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **ldapjs** | Node.js 原生、文档完善 | 异步处理需封装 | **推荐** |
| passport-ldapauth | 与 Passport 集成 | 依赖 Passport 生态 | 备选 |
| ldapts | TypeScript 原生 | 社区较小 | 备选 |

**选定方案：ldapjs + 自定义封装**

### 4.4 自定义字段存储方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **EAV 模式** | 灵活性最高、易于扩展 | 查询稍复杂 | **推荐** |
| JSON 字段 | 实现简单 | 索引和查询困难 | 不推荐 |
| 动态表 | 性能最好 | 实现复杂、需 DDL 权限 | 不推荐 |

**选定方案：EAV (Entity-Attribute-Value) 模式**

---

## 附录

### A. 参考项目

- [Linear](https://linear.app/) - 任务管理和工作流
- [Notion](https://notion.so/) - 多维表格和自定义字段
- [Jira](https://jira.atlassian.com/) - 企业级项目管理
- [Plane](https://github.com/makeplane/plane) - 开源替代方案
- [Focalboard](https://github.com/mattermost/focalboard) - 开源看板工具

### B. 相关文档

- [01-architecture-design.md](./01-architecture-design.md) - 架构设计
- [02-database-migration.md](./02-database-migration.md) - 数据库迁移计划
- [03-api-specification.md](./03-api-specification.md) - API 接口规范
- [04-frontend-skeleton.md](./04-frontend-skeleton.md) - 前端骨架设计
- [05-testing-plan.md](./05-testing-plan.md) - 测试计划
- [06-implementation-roadmap.md](./06-implementation-roadmap.md) - 实施路线图
