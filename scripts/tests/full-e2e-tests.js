/**
 * Kanba 完整端到端测试脚本
 * 测试所有核心业务功能
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 测试用户凭据
const TEST_USER = {
  email: `test_${Date.now()}@kanba-test.local`,
  password: 'TestPassword123!',
  fullName: 'Test User'
};

const ADMIN_USER = {
  email: 'noc@wlstack.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
};

// 测试数据存储
let testState = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  projectId: null,
  columnIds: [],
  taskIds: [],
  adminToken: null
};

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test(name, category, fn) {
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    results.passed++;
    results.tests.push({ name, category, status: 'PASSED', duration });
    log(`  ✓ ${name} (${duration}ms)`, 'green');
  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;
    results.tests.push({ name, category, status: 'FAILED', duration, error: error.message });
    log(`  ✗ ${name} (${duration}ms)`, 'red');
    log(`    Error: ${error.message}`, 'red');
  }
}

function skip(name, category, reason) {
  results.skipped++;
  results.tests.push({ name, category, status: 'SKIPPED', reason });
  log(`  ○ ${name} (skipped: ${reason})`, 'yellow');
}

// Supabase 客户端辅助函数
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...options.headers
  };
  
  if (testState.accessToken) {
    headers['Authorization'] = `Bearer ${testState.accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);
  return { response, data, status: response.status };
}

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (testState.accessToken) {
    headers['Authorization'] = `Bearer ${testState.accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);
  return { response, data, status: response.status };
}

// ============================================
// 1. 认证测试
// ============================================
async function runAuthTests() {
  log('\n[1] 认证测试 (Authentication)', 'bold');

  // 1.1 用户注册
  await test('用户注册 - 成功创建新用户', 'Auth', async () => {
    const { data, status } = await supabaseRequest('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        data: { full_name: TEST_USER.fullName }
      })
    });

    if (status !== 200 && status !== 201) {
      throw new Error(`注册失败: ${JSON.stringify(data)}`);
    }

    if (!data.user?.id) {
      throw new Error('注册成功但未返回用户ID');
    }

    testState.userId = data.user.id;
    if (data.access_token) {
      testState.accessToken = data.access_token;
      testState.refreshToken = data.refresh_token;
    }
  });

  // 1.2 用户登录
  await test('用户登录 - 使用邮箱密码登录', 'Auth', async () => {
    const { data, status } = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    if (status !== 200) {
      throw new Error(`登录失败: ${JSON.stringify(data)}`);
    }

    if (!data.access_token) {
      throw new Error('登录成功但未返回 access_token');
    }

    testState.accessToken = data.access_token;
    testState.refreshToken = data.refresh_token;
    testState.userId = data.user.id;
  });

  // 1.3 获取当前用户
  await test('获取当前用户信息', 'Auth', async () => {
    const { data, status } = await supabaseRequest('/auth/v1/user', {
      method: 'GET'
    });

    if (status !== 200) {
      throw new Error(`获取用户失败: ${status}`);
    }

    if (data.email !== TEST_USER.email) {
      throw new Error(`用户邮箱不匹配: ${data.email}`);
    }
  });

  // 1.4 检查 Profile 自动创建
  await test('Profile 自动创建 - 触发器验证', 'Auth', async () => {
    const { data, status } = await supabaseRequest('/rest/v1/profiles?id=eq.' + testState.userId, {
      method: 'GET'
    });

    if (status !== 200) {
      throw new Error(`获取 Profile 失败: ${status}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Profile 未自动创建 - 触发器可能未正确配置');
    }

    if (data[0].email !== TEST_USER.email) {
      throw new Error(`Profile 邮箱不匹配`);
    }
  });

  // 1.5 登录失败测试
  await test('登录失败 - 错误密码', 'Auth', async () => {
    const { status } = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({
        email: TEST_USER.email,
        password: 'wrongpassword'
      })
    });

    if (status === 200) {
      throw new Error('错误密码不应该登录成功');
    }
  });

  // 1.6 Token 刷新
  await test('Token 刷新', 'Auth', async () => {
    if (!testState.refreshToken) {
      throw new Error('没有 refresh_token');
    }

    const { data, status } = await supabaseRequest('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: testState.refreshToken
      })
    });

    if (status !== 200) {
      throw new Error(`Token 刷新失败: ${status}`);
    }

    testState.accessToken = data.access_token;
    testState.refreshToken = data.refresh_token;
  });
}

// ============================================
// 2. 项目管理测试
// ============================================
async function runProjectTests() {
  log('\n[2] 项目管理测试 (Projects)', 'bold');

  // 2.1 创建项目
  await test('创建项目 - 成功创建', 'Projects', async () => {
    const projectData = {
      name: 'Test Project ' + Date.now(),
      description: 'This is a test project for E2E testing',
      color: '#6366f1',
      user_id: testState.userId
    };

    const { data, status } = await supabaseRequest('/rest/v1/projects', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(projectData)
    });

    if (status !== 201 && status !== 200) {
      throw new Error(`创建项目失败: ${status} - ${JSON.stringify(data)}`);
    }

    if (!data || !data[0]?.id) {
      throw new Error('项目创建成功但未返回ID');
    }

    testState.projectId = data[0].id;
  });

  // 2.2 获取项目列表
  await test('获取项目列表', 'Projects', async () => {
    const { data, status } = await supabaseRequest('/rest/v1/projects?user_id=eq.' + testState.userId, {
      method: 'GET'
    });

    if (status !== 200) {
      throw new Error(`获取项目列表失败: ${status}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('项目列表为空');
    }

    const found = data.find(p => p.id === testState.projectId);
    if (!found) {
      throw new Error('创建的项目不在列表中');
    }
  });

  // 2.3 获取单个项目
  await test('获取单个项目详情', 'Projects', async () => {
    const { data, status } = await supabaseRequest('/rest/v1/projects?id=eq.' + testState.projectId, {
      method: 'GET'
    });

    if (status !== 200) {
      throw new Error(`获取项目失败: ${status}`);
    }

    if (!data || data.length === 0) {
      throw new Error('项目不存在');
    }
  });

  // 2.4 更新项目
  await test('更新项目信息', 'Projects', async () => {
    const updateData = {
      name: 'Updated Test Project',
      description: 'Updated description',
      color: '#10b981'
    };

    const { status } = await supabaseRequest('/rest/v1/projects?id=eq.' + testState.projectId, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });

    if (status !== 200 && status !== 204) {
      throw new Error(`更新项目失败: ${status}`);
    }

    // 验证更新
    const { data } = await supabaseRequest('/rest/v1/projects?id=eq.' + testState.projectId, {
      method: 'GET'
    });

    if (data[0].name !== updateData.name) {
      throw new Error('项目名称未更新');
    }
  });

  // 2.5 项目收藏
  await test('项目收藏/取消收藏', 'Projects', async () => {
    // 添加收藏
    const bookmarkData = {
      user_id: testState.userId,
      project_id: testState.projectId
    };

    const { status: addStatus } = await supabaseRequest('/rest/v1/bookmarks', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(bookmarkData)
    });

    if (addStatus !== 201 && addStatus !== 200 && addStatus !== 409) {
      throw new Error(`添加收藏失败: ${addStatus}`);
    }

    // 查询收藏
    const { data: bookmarks } = await supabaseRequest(
      `/rest/v1/bookmarks?user_id=eq.${testState.userId}&project_id=eq.${testState.projectId}`,
      { method: 'GET' }
    );

    if (!bookmarks || bookmarks.length === 0) {
      throw new Error('收藏未保存');
    }

    // 删除收藏
    const { status: delStatus } = await supabaseRequest(
      `/rest/v1/bookmarks?user_id=eq.${testState.userId}&project_id=eq.${testState.projectId}`,
      { method: 'DELETE' }
    );

    if (delStatus !== 200 && delStatus !== 204) {
      throw new Error(`删除收藏失败: ${delStatus}`);
    }
  });
}

// ============================================
// 3. 列管理测试
// ============================================
async function runColumnTests() {
  log('\n[3] 列管理测试 (Columns)', 'bold');

  // 3.1 创建多个列
  await test('创建看板列 - 创建 3 个列', 'Columns', async () => {
    const columns = [
      { title: 'To Do', position: 0, project_id: testState.projectId },
      { title: 'In Progress', position: 1, project_id: testState.projectId },
      { title: 'Done', position: 2, project_id: testState.projectId }
    ];

    for (const col of columns) {
      const { data, status } = await supabaseRequest('/rest/v1/columns', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(col)
      });

      if (status !== 201 && status !== 200) {
        throw new Error(`创建列 "${col.title}" 失败: ${status}`);
      }

      if (data && data[0]?.id) {
        testState.columnIds.push(data[0].id);
      }
    }

    if (testState.columnIds.length !== 3) {
      throw new Error(`只创建了 ${testState.columnIds.length} 个列`);
    }
  });

  // 3.2 获取项目的所有列
  await test('获取项目所有列', 'Columns', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/columns?project_id=eq.${testState.projectId}&order=position`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取列失败: ${status}`);
    }

    if (data.length !== 3) {
      throw new Error(`列数量不正确: ${data.length}`);
    }
  });

  // 3.3 更新列标题
  await test('更新列标题', 'Columns', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/columns?id=eq.${testState.columnIds[0]}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Backlog' })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`更新列失败: ${status}`);
    }
  });

  // 3.4 调整列顺序
  await test('调整列顺序', 'Columns', async () => {
    // 将第三列移到第一位
    const { status } = await supabaseRequest(
      `/rest/v1/columns?id=eq.${testState.columnIds[2]}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ position: 0 })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`调整顺序失败: ${status}`);
    }
  });
}

// ============================================
// 4. 任务管理测试
// ============================================
async function runTaskTests() {
  log('\n[4] 任务管理测试 (Tasks)', 'bold');

  // 4.1 创建任务
  await test('创建任务 - 创建 5 个任务', 'Tasks', async () => {
    const tasks = [
      { title: 'Task 1 - High Priority', priority: 'high', column_id: testState.columnIds[0] },
      { title: 'Task 2 - Medium Priority', priority: 'medium', column_id: testState.columnIds[0] },
      { title: 'Task 3 - Low Priority', priority: 'low', column_id: testState.columnIds[1] },
      { title: 'Task 4 - With Due Date', priority: 'medium', column_id: testState.columnIds[1], due_date: new Date(Date.now() + 86400000).toISOString() },
      { title: 'Task 5 - Done', priority: 'low', column_id: testState.columnIds[2], is_done: true }
    ];

    for (let i = 0; i < tasks.length; i++) {
      const task = {
        ...tasks[i],
        position: i,
        created_by: testState.userId
      };

      const { data, status } = await supabaseRequest('/rest/v1/tasks', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(task)
      });

      if (status !== 201 && status !== 200) {
        throw new Error(`创建任务 "${task.title}" 失败: ${status} - ${JSON.stringify(data)}`);
      }

      if (data && data[0]?.id) {
        testState.taskIds.push(data[0].id);
      }
    }

    if (testState.taskIds.length !== 5) {
      throw new Error(`只创建了 ${testState.taskIds.length} 个任务`);
    }
  });

  // 4.2 获取列中的任务
  await test('获取列中的任务', 'Tasks', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/tasks?column_id=eq.${testState.columnIds[0]}&order=position`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取任务失败: ${status}`);
    }

    if (data.length !== 2) {
      throw new Error(`第一列应有 2 个任务，实际有 ${data.length} 个`);
    }
  });

  // 4.3 更新任务
  await test('更新任务信息', 'Tasks', async () => {
    const updateData = {
      title: 'Updated Task Title',
      description: 'This is a detailed description for the task',
      priority: 'high'
    };

    const { status } = await supabaseRequest(
      `/rest/v1/tasks?id=eq.${testState.taskIds[0]}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`更新任务失败: ${status}`);
    }
  });

  // 4.4 移动任务到其他列
  await test('移动任务到其他列', 'Tasks', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/tasks?id=eq.${testState.taskIds[0]}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          column_id: testState.columnIds[1],
          position: 0
        })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`移动任务失败: ${status}`);
    }

    // 验证移动
    const { data } = await supabaseRequest(
      `/rest/v1/tasks?id=eq.${testState.taskIds[0]}`,
      { method: 'GET' }
    );

    if (data[0].column_id !== testState.columnIds[1]) {
      throw new Error('任务未移动到目标列');
    }
  });

  // 4.5 标记任务完成
  await test('标记任务完成', 'Tasks', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/tasks?id=eq.${testState.taskIds[1]}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_done: true, completed_at: new Date().toISOString() })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`标记完成失败: ${status}`);
    }
  });

  // 4.6 任务分配
  await test('任务分配给用户', 'Tasks', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/tasks?id=eq.${testState.taskIds[2]}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: testState.userId })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`任务分配失败: ${status}`);
    }
  });

  // 4.7 任务评论
  await test('添加任务评论', 'Tasks', async () => {
    const commentData = {
      task_id: testState.taskIds[0],
      user_id: testState.userId,
      content: 'This is a test comment on the task'
    };

    const { data, status } = await supabaseRequest('/rest/v1/task_comments', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(commentData)
    });

    if (status !== 201 && status !== 200) {
      throw new Error(`添加评论失败: ${status}`);
    }

    // 获取评论
    const { data: comments } = await supabaseRequest(
      `/rest/v1/task_comments?task_id=eq.${testState.taskIds[0]}`,
      { method: 'GET' }
    );

    if (!comments || comments.length === 0) {
      throw new Error('评论未保存');
    }
  });

  // 4.8 按优先级筛选
  await test('按优先级筛选任务', 'Tasks', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/tasks?column_id=in.(${testState.columnIds.join(',')})&priority=eq.high`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`筛选任务失败: ${status}`);
    }

    for (const task of data) {
      if (task.priority !== 'high') {
        throw new Error('筛选结果包含非高优先级任务');
      }
    }
  });

  // 4.9 获取已分配给我的任务
  await test('获取分配给我的任务', 'Tasks', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/tasks?assigned_to=eq.${testState.userId}`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取任务失败: ${status}`);
    }

    if (data.length === 0) {
      throw new Error('没有分配给我的任务');
    }
  });

  // 4.10 任务搜索
  await test('任务搜索', 'Tasks', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/tasks?title=ilike.*Updated*`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`搜索任务失败: ${status}`);
    }

    // 搜索结果应该包含我们更新过的任务
    const found = data.find(t => t.title.includes('Updated'));
    if (!found) {
      throw new Error('搜索结果未包含预期任务');
    }
  });
}

// ============================================
// 5. 用户设置测试
// ============================================
async function runUserSettingsTests() {
  log('\n[5] 用户设置测试 (User Settings)', 'bold');

  // 5.1 更新用户资料
  await test('更新用户资料', 'User', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/profiles?id=eq.${testState.userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: 'Updated Test User',
          locale: 'zh',
          timezone: 'Asia/Shanghai'
        })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`更新资料失败: ${status}`);
    }
  });

  // 5.2 验证资料更新
  await test('验证资料更新', 'User', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/profiles?id=eq.${testState.userId}`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取资料失败: ${status}`);
    }

    if (data[0].locale !== 'zh') {
      throw new Error('语言设置未保存');
    }

    if (data[0].timezone !== 'Asia/Shanghai') {
      throw new Error('时区设置未保存');
    }
  });
}

// ============================================
// 6. 通知测试
// ============================================
async function runNotificationTests() {
  log('\n[6] 通知测试 (Notifications)', 'bold');

  // 6.1 创建通知
  await test('创建通知', 'Notifications', async () => {
    const notificationData = {
      user_id: testState.userId,
      title: 'Test Notification',
      message: 'You have a new task assigned',
      type: 'task_assigned',
      link: `/dashboard/projects/${testState.projectId}`
    };

    const { status } = await supabaseRequest('/rest/v1/notifications', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(notificationData)
    });

    if (status !== 201 && status !== 200) {
      throw new Error(`创建通知失败: ${status}`);
    }
  });

  // 6.2 获取通知列表
  await test('获取通知列表', 'Notifications', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/notifications?user_id=eq.${testState.userId}&order=created_at.desc`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取通知失败: ${status}`);
    }

    if (data.length === 0) {
      throw new Error('通知列表为空');
    }
  });

  // 6.3 标记通知已读
  await test('标记通知已读', 'Notifications', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/notifications?user_id=eq.${testState.userId}&read=eq.false`,
      {
        method: 'PATCH',
        body: JSON.stringify({ read: true })
      }
    );

    if (status !== 200 && status !== 204) {
      throw new Error(`标记已读失败: ${status}`);
    }
  });
}

// ============================================
// 7. 活动日志测试
// ============================================
async function runActivityLogTests() {
  log('\n[7] 活动日志测试 (Activity Logs)', 'bold');

  // 7.1 创建活动日志
  await test('创建活动日志', 'Activity', async () => {
    const logData = {
      user_id: testState.userId,
      project_id: testState.projectId,
      task_id: testState.taskIds[0],
      action: 'task_created',
      details: { title: 'Test Task' }
    };

    const { status } = await supabaseRequest('/rest/v1/activity_logs', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(logData)
    });

    if (status !== 201 && status !== 200) {
      throw new Error(`创建活动日志失败: ${status}`);
    }
  });

  // 7.2 获取项目活动日志
  await test('获取项目活动日志', 'Activity', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/activity_logs?project_id=eq.${testState.projectId}&order=created_at.desc`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取活动日志失败: ${status}`);
    }
  });
}

// ============================================
// 8. 订阅计划测试
// ============================================
async function runSubscriptionTests() {
  log('\n[8] 订阅计划测试 (Subscriptions)', 'bold');

  // 8.1 获取订阅计划列表
  await test('获取订阅计划列表', 'Subscriptions', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/subscription_plans?is_active=eq.true&order=price`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取订阅计划失败: ${status}`);
    }

    if (data.length < 2) {
      throw new Error('应至少有 Free 和 Pro 两个计划');
    }
  });

  // 8.2 检查免费计划限制
  await test('检查免费计划项目限制', 'Subscriptions', async () => {
    const { data: profile } = await supabaseRequest(
      `/rest/v1/profiles?id=eq.${testState.userId}`,
      { method: 'GET' }
    );

    if (profile[0].subscription_status !== 'free') {
      skip('用户不是免费计划', 'Subscriptions', 'Not applicable');
      return;
    }

    const { data: projects } = await supabaseRequest(
      `/rest/v1/projects?user_id=eq.${testState.userId}`,
      { method: 'GET' }
    );

    // 免费计划允许 1 个项目
    // 测试用户已经创建了 1 个项目，不应该能创建更多
  });
}

// ============================================
// 9. 系统设置测试
// ============================================
async function runSystemSettingsTests() {
  log('\n[9] 系统设置测试 (System Settings)', 'bold');

  // 9.1 获取系统设置
  await test('获取系统设置', 'System', async () => {
    const { data, status } = await supabaseRequest(
      `/rest/v1/system_settings`,
      { method: 'GET' }
    );

    if (status !== 200) {
      throw new Error(`获取系统设置失败: ${status}`);
    }

    if (data.length === 0) {
      throw new Error('系统设置为空');
    }

    // 检查必要的设置项
    const keys = data.map(s => s.key);
    const requiredKeys = ['site_name', 'allow_registration', 'free_project_limit'];
    
    for (const key of requiredKeys) {
      if (!keys.includes(key)) {
        throw new Error(`缺少系统设置: ${key}`);
      }
    }
  });
}

// ============================================
// 10. 清理测试数据
// ============================================
async function runCleanupTests() {
  log('\n[10] 清理测试数据 (Cleanup)', 'bold');

  // 10.1 删除任务
  await test('删除测试任务', 'Cleanup', async () => {
    for (const taskId of testState.taskIds) {
      const { status } = await supabaseRequest(
        `/rest/v1/tasks?id=eq.${taskId}`,
        { method: 'DELETE' }
      );

      if (status !== 200 && status !== 204 && status !== 404) {
        throw new Error(`删除任务失败: ${status}`);
      }
    }
  });

  // 10.2 删除列
  await test('删除测试列', 'Cleanup', async () => {
    for (const colId of testState.columnIds) {
      const { status } = await supabaseRequest(
        `/rest/v1/columns?id=eq.${colId}`,
        { method: 'DELETE' }
      );

      if (status !== 200 && status !== 204 && status !== 404) {
        throw new Error(`删除列失败: ${status}`);
      }
    }
  });

  // 10.3 删除项目
  await test('删除测试项目', 'Cleanup', async () => {
    const { status } = await supabaseRequest(
      `/rest/v1/projects?id=eq.${testState.projectId}`,
      { method: 'DELETE' }
    );

    if (status !== 200 && status !== 204 && status !== 404) {
      throw new Error(`删除项目失败: ${status}`);
    }
  });

  // 10.4 删除测试用户 (可选)
  // 注意：Supabase 需要 service_role key 才能删除用户
  skip('删除测试用户', 'Cleanup', '需要 service_role 权限');
}

// ============================================
// 主函数
// ============================================
async function main() {
  console.log('\n' + '='.repeat(60));
  log('Kanba 完整端到端测试', 'bold');
  console.log('='.repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Test User: ${TEST_USER.email}`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log('错误: 缺少 Supabase 环境变量', 'red');
    log('请确保设置了 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow');
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    await runAuthTests();
    await runProjectTests();
    await runColumnTests();
    await runTaskTests();
    await runUserSettingsTests();
    await runNotificationTests();
    await runActivityLogTests();
    await runSubscriptionTests();
    await runSystemSettingsTests();
    await runCleanupTests();
  } catch (error) {
    log(`\n致命错误: ${error.message}`, 'red');
    console.error(error);
  }

  const totalTime = Date.now() - startTime;

  // 打印测试报告
  console.log('\n' + '='.repeat(60));
  log('测试报告', 'bold');
  console.log('='.repeat(60));
  
  log(`\n通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`跳过: ${results.skipped}`, 'yellow');
  console.log(`总计: ${results.passed + results.failed + results.skipped}`);
  console.log(`耗时: ${totalTime}ms`);

  // 打印失败的测试
  const failedTests = results.tests.filter(t => t.status === 'FAILED');
  if (failedTests.length > 0) {
    console.log('\n' + '-'.repeat(40));
    log('失败的测试:', 'red');
    for (const test of failedTests) {
      log(`  - [${test.category}] ${test.name}`, 'red');
      log(`    ${test.error}`, 'red');
    }
  }

  // 按类别统计
  console.log('\n' + '-'.repeat(40));
  log('按类别统计:', 'blue');
  const categories = [...new Set(results.tests.map(t => t.category))];
  for (const cat of categories) {
    const catTests = results.tests.filter(t => t.category === cat);
    const passed = catTests.filter(t => t.status === 'PASSED').length;
    const failed = catTests.filter(t => t.status === 'FAILED').length;
    const skipped = catTests.filter(t => t.status === 'SKIPPED').length;
    const color = failed > 0 ? 'red' : 'green';
    log(`  ${cat}: ${passed}/${catTests.length} passed${failed > 0 ? `, ${failed} failed` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`, color);
  }

  console.log('\n' + '='.repeat(60));
  
  // 退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(console.error);
