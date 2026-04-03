# Kanba API Test Cases

## Overview

This document describes all API endpoints and their expected behaviors for testing.

## Test Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ or MySQL 8.0+
- Environment variables configured

### Environment Variables
```bash
# Required
DATABASE_PROVIDER=supabase|postgresql|mysql
DATABASE_URL=your_database_connection_string

# For Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For PostgreSQL/MySQL
DATABASE_URL=postgresql://user:pass@host:5432/db
# or
DATABASE_URL=mysql://user:pass@host:3306/db

# For testing
API_BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test123456
```

### Running Tests
```bash
# Install dependencies
npm install

# Run API tests
npx tsx scripts/tests/api-tests.ts

# Run with custom base URL
API_BASE_URL=https://your-app.vercel.app npx tsx scripts/tests/api-tests.ts
```

---

## API Endpoints

### 1. Authentication API

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "fullName": "John Doe"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "message": "Registration successful"
}
```

**Errors:**
- 400: Invalid email or password format
- 409: Email already exists

---

#### POST /api/auth/login
Authenticate user and receive token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "isAdmin": false
  }
}
```

**Errors:**
- 401: Invalid credentials
- 400: Missing email or password

---

#### GET /api/auth/me
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": null,
    "subscriptionStatus": "free",
    "isAdmin": false
  }
}
```

**Errors:**
- 401: Not authenticated

---

#### POST /api/auth/logout
Logout current user and invalidate token.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 2. Projects API

#### GET /api/projects
Get all projects for current user.

**Response (200):**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "My Project",
      "description": "Project description",
      "slug": "my-project-abc12345",
      "color": "#6366f1",
      "isFavorite": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST /api/projects
Create a new project.

**Request:**
```json
{
  "name": "New Project",
  "description": "Optional description",
  "color": "#6366f1"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "New Project",
  "slug": "new-project-abc12345",
  "description": "Optional description",
  "color": "#6366f1"
}
```

**Errors:**
- 400: Missing required fields
- 403: Project limit reached (free plan)

---

#### GET /api/projects/:id
Get single project by ID.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Project Name",
  "description": "Description",
  "slug": "project-slug",
  "columns": [...],
  "members": [...]
}
```

**Errors:**
- 404: Project not found
- 403: No access to project

---

#### PATCH /api/projects/:id
Update project.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#f43f5e"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  ...
}
```

---

#### DELETE /api/projects/:id
Delete project and all related data.

**Response (200):**
```json
{
  "message": "Project deleted successfully"
}
```

---

### 3. Columns API

#### GET /api/projects/:projectId/columns
Get all columns for a project.

**Response (200):**
```json
{
  "columns": [
    {
      "id": "uuid",
      "title": "To Do",
      "position": 0,
      "tasks": [...]
    }
  ]
}
```

---

#### POST /api/projects/:projectId/columns
Create a new column.

**Request:**
```json
{
  "title": "In Progress",
  "position": 1
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "In Progress",
  "position": 1
}
```

---

#### PATCH /api/projects/:projectId/columns/:columnId
Update column.

**Request:**
```json
{
  "title": "Done",
  "position": 2
}
```

---

#### DELETE /api/projects/:projectId/columns/:columnId
Delete column and all tasks in it.

---

#### POST /api/projects/:projectId/columns/reorder
Reorder columns.

**Request:**
```json
{
  "columnIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

### 4. Tasks API

#### GET /api/projects/:projectId/tasks
Get all tasks for a project.

**Query Parameters:**
- `columnId`: Filter by column
- `assignedTo`: Filter by assignee
- `priority`: Filter by priority (low, medium, high)
- `isDone`: Filter by completion status

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Task title",
      "description": "Description",
      "columnId": "uuid",
      "priority": "medium",
      "isDone": false,
      "assignedTo": {
        "id": "uuid",
        "fullName": "John Doe",
        "avatarUrl": null
      }
    }
  ]
}
```

---

#### POST /api/projects/:projectId/tasks
Create a new task.

**Request:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "columnId": "uuid",
  "priority": "high",
  "dueDate": "2024-12-31T23:59:59Z",
  "assignedTo": "user_uuid"
}
```

---

#### GET /api/tasks/:taskId
Get single task with details.

---

#### PATCH /api/tasks/:taskId
Update task.

**Request:**
```json
{
  "title": "Updated Title",
  "priority": "high",
  "isDone": true
}
```

---

#### DELETE /api/tasks/:taskId
Delete task.

---

#### POST /api/tasks/:taskId/move
Move task to different column or position.

**Request:**
```json
{
  "columnId": "target_column_uuid",
  "position": 0
}
```

---

#### POST /api/tasks/:taskId/assign
Assign task to user.

**Request:**
```json
{
  "userId": "user_uuid"
}
```

---

#### GET /api/tasks/:taskId/comments
Get task comments.

---

#### POST /api/tasks/:taskId/comments
Add comment to task.

**Request:**
```json
{
  "content": "This is a comment"
}
```

---

### 5. User API

#### GET /api/user/profile
Get current user profile.

---

#### PATCH /api/user/profile
Update user profile.

**Request:**
```json
{
  "fullName": "New Name",
  "avatarUrl": "https://...",
  "locale": "zh",
  "timezone": "Asia/Shanghai"
}
```

---

#### GET /api/user/notifications
Get user notifications.

**Query Parameters:**
- `read`: Filter by read status (true/false)
- `limit`: Number of notifications to return
- `offset`: Pagination offset

---

#### PATCH /api/user/notifications/:id
Mark notification as read.

---

#### GET /api/user/bookmarks
Get user bookmarks.

---

#### POST /api/user/bookmarks
Add bookmark.

**Request:**
```json
{
  "projectId": "uuid"
}
```
or
```json
{
  "taskId": "uuid"
}
```

---

### 6. Admin API

> Note: All admin endpoints require `is_admin = true` in user profile.

#### GET /api/admin/stats
Get system statistics.

**Response (200):**
```json
{
  "totalUsers": 100,
  "totalProjects": 50,
  "totalTasks": 500,
  "activeUsers": 25,
  "newUsersThisMonth": 10
}
```

---

#### GET /api/admin/users
Get all users with pagination.

**Query Parameters:**
- `page`: Page number
- `limit`: Users per page
- `search`: Search by email or name

---

#### PATCH /api/admin/users/:id
Update user (admin only).

**Request:**
```json
{
  "isAdmin": true,
  "subscriptionStatus": "pro"
}
```

---

#### DELETE /api/admin/users/:id
Delete user (admin only).

---

#### GET /api/admin/projects
Get all projects (admin only).

---

#### DELETE /api/admin/projects/:id
Delete any project (admin only).

---

#### GET /api/admin/settings
Get system settings.

---

#### PATCH /api/admin/settings
Update system settings.

**Request:**
```json
{
  "site_name": "My Kanba",
  "allow_registration": true,
  "free_project_limit": 3
}
```

---

#### GET /api/admin/plans
Get subscription plans.

---

#### POST /api/admin/plans
Create subscription plan.

---

#### PATCH /api/admin/plans/:id
Update subscription plan.

---

#### DELETE /api/admin/plans/:id
Delete subscription plan.

---

## Error Response Format

All API errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `LIMIT_REACHED` | 403 | Plan limit reached |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Test Checklist

### Authentication
- [ ] Register with valid email/password
- [ ] Register with existing email (should fail)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Get current user when authenticated
- [ ] Get current user when not authenticated (should fail)
- [ ] Logout

### Projects
- [ ] Create project
- [ ] Create project when limit reached (should fail for free)
- [ ] Get all projects
- [ ] Get single project
- [ ] Get project without access (should fail)
- [ ] Update project
- [ ] Delete project

### Columns
- [ ] Create column
- [ ] Get columns for project
- [ ] Update column
- [ ] Delete column
- [ ] Reorder columns

### Tasks
- [ ] Create task
- [ ] Get tasks for project
- [ ] Get single task
- [ ] Update task
- [ ] Move task between columns
- [ ] Assign task to user
- [ ] Add comment to task
- [ ] Get task comments
- [ ] Mark task as done
- [ ] Delete task

### User Profile
- [ ] Get profile
- [ ] Update profile
- [ ] Get notifications
- [ ] Mark notification as read
- [ ] Add/remove bookmarks

### Admin (requires admin user)
- [ ] Get system stats
- [ ] Get all users
- [ ] Update user role
- [ ] Delete user
- [ ] Get all projects
- [ ] Delete any project
- [ ] Get/update system settings
- [ ] Manage subscription plans
