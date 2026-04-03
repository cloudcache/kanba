#!/usr/bin/env node

/**
 * Kanba 完整端到端测试
 * 使用 service_role 绕过 RLS 进行数据操作测试
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 测试状态
const testResults = { passed: 0, failed: 0, skipped: 0, tests: [] };
const testData = {
  userId: null,
  userEmail: null,
  projectId: null,
  projectSlug: null,
  columnIds: [],
  taskIds: [],
  commentId: null,
  notificationId: null
};

// 颜色输出
const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', bold: '\x1b[1m'
};

function log(color, ...args) {
  console.log(colors[color] || '', ...args, colors.reset);
}

// Supabase Admin 请求 (service_role)
async function supabaseAdmin(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data, status: response.status };
}

// 匿名 Supabase 请求
async function supabaseAnon(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data, status: response.status };
}

// HTTP 请求
async function httpRequest(url, options = {}) {
  return await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: 'manual'
  });
}

// 测试运行器
async function runTest(category, name, testFn) {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    log('green', `  ✓ ${name} (${duration}ms)`);
    testResults.passed++;
    testResults.tests.push({ category, name, status: 'passed', duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    log('red', `  ✗ ${name} (${duration}ms)`);
    log('red', `    Error: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ category, name, status: 'failed', duration, error: error.message });
  }
}

function skipTest(category, name, reason) {
  log('yellow', `  ○ ${name} (skipped: ${reason})`);
  testResults.skipped++;
  testResults.tests.push({ category, name, status: 'skipped', reason });
}

// ============================================================
// 测试套件
// ============================================================
async function runAllTests() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  log('bold', 'Kanba 完整端到端测试');
  console.log('='.repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Service Role: ${SUPABASE_SERVICE_ROLE_KEY ? '已配置' : '未配置'}`);
  console.log(`\nStarted at: ${new Date().toISOString()}\n`);

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    log('red', '\n错误: SUPABASE_SERVICE_ROLE_KEY 未配置');
    log('yellow', '测试将使用有限的匿名访问模式\n');
  }

  // ==================== 1. 页面访问测试 ====================
  log('bold', '\n[1] 页面访问测试 (8 tests)\n');
  
  await runTest('Pages', '首页加载', async () => {
    const res = await httpRequest(`${BASE_URL}/`);
    if (res.status !== 200) throw new Error(`返回 ${res.status}`);
  });

  await runTest('Pages', '登录页面', async () => {
    const res = await httpRequest(`${BASE_URL}/login`);
    if (res.status !== 200) throw new Error(`返回 ${res.status}`);
  });

  await runTest('Pages', '注册页面', async () => {
    const res = await httpRequest(`${BASE_URL}/signup`);
    if (res.status !== 200) throw new Error(`返回 ${res.status}`);
  });

  await runTest('Pages', 'Dashboard 重定向', async () => {
    const res = await httpRequest(`${BASE_URL}/dashboard`);
    if (res.status !== 302 && res.status !== 307 && res.status !== 200) {
      throw new Error(`返回 ${res.status}`);
    }
  });

  await runTest('Pages', 'Admin 仪表盘', async () => {
    const res = await httpRequest(`${BASE_URL}/admin`);
    if (res.status === 404) throw new Error('404 Not Found');
  });

  await runTest('Pages', 'Admin 用户管理', async () => {
    const res = await httpRequest(`${BASE_URL}/admin/users`);
    if (res.status === 404) throw new Error('404 Not Found');
  });

  await runTest('Pages', 'Admin 项目管理', async () => {
    const res = await httpRequest(`${BASE_URL}/admin/projects`);
    if (res.status === 404) throw new Error('404 Not Found');
  });

  await runTest('Pages', 'Admin 系统设置', async () => {
    const res = await httpRequest(`${BASE_URL}/admin/settings`);
    if (res.status === 404) throw new Error('404 Not Found');
  });

  // ==================== 2. 数据库表测试 ====================
  log('bold', '\n[2] 数据库表测试 (10 tests)\n');

  await runTest('Database', 'profiles 表', async () => {
    const { status } = await supabaseAdmin('profiles?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'projects 表', async () => {
    const { status } = await supabaseAdmin('projects?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'columns 表', async () => {
    const { status } = await supabaseAdmin('columns?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'tasks 表', async () => {
    const { status } = await supabaseAdmin('tasks?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'task_comments 表', async () => {
    const { status } = await supabaseAdmin('task_comments?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'project_members 表', async () => {
    const { status } = await supabaseAdmin('project_members?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'notifications 表', async () => {
    const { status } = await supabaseAdmin('notifications?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'bookmarks 表', async () => {
    const { status } = await supabaseAdmin('bookmarks?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'subscription_plans 表', async () => {
    const { status } = await supabaseAdmin('subscription_plans?select=id&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Database', 'system_settings 表', async () => {
    const { status } = await supabaseAdmin('system_settings?select=key&limit=1');
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 3. 获取测试用户 ====================
  log('bold', '\n[3] 用户测试 (3 tests)\n');

  await runTest('User', '获取测试用户', async () => {
    const { status, data } = await supabaseAdmin('profiles?select=*&limit=1');
    if (status >= 400 || !data || data.length === 0) {
      throw new Error('没有可用的测试用户');
    }
    testData.userId = data[0].id;
    testData.userEmail = data[0].email;
  });

  await runTest('User', '更新用户资料', async () => {
    const { status } = await supabaseAdmin(`profiles?id=eq.${testData.userId}`, {
      method: 'PATCH',
      body: { full_name: 'Test User', locale: 'zh-CN', timezone: 'Asia/Shanghai' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('User', '验证资料更新', async () => {
    const { status, data } = await supabaseAdmin(`profiles?id=eq.${testData.userId}`);
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data[0].locale !== 'zh-CN') throw new Error('locale 未更新');
  });

  // ==================== 4. 项目管理测试 ====================
  log('bold', '\n[4] 项目管理测试 (7 tests)\n');

  const testProjectName = `E2E Test Project ${Date.now()}`;
  
  await runTest('Projects', '创建项目', async () => {
    const slug = `e2e-test-${Date.now()}`;
    const { status, data } = await supabaseAdmin('projects', {
      method: 'POST',
      body: {
        name: testProjectName,
        description: 'E2E 自动化测试项目',
        color: '#6366f1',
        slug: slug,
        user_id: testData.userId
      }
    });
    if (status >= 400) throw new Error(`状态码 ${status} - ${JSON.stringify(data)}`);
    if (!data || data.length === 0) throw new Error('无返回数据');
    testData.projectId = data[0].id;
    testData.projectSlug = data[0].slug;
  });

  await runTest('Projects', '获取项目列表', async () => {
    const { status, data } = await supabaseAdmin('projects?select=*');
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!Array.isArray(data)) throw new Error('返回数据格式错误');
  });

  await runTest('Projects', '通过 ID 获取项目', async () => {
    const { status, data } = await supabaseAdmin(`projects?id=eq.${testData.projectId}`);
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!data || data.length === 0) throw new Error('未找到项目');
    if (data[0].name !== testProjectName) throw new Error('名称不匹配');
  });

  await runTest('Projects', '通过 Slug 获取项目', async () => {
    const { status, data } = await supabaseAdmin(`projects?slug=eq.${testData.projectSlug}`);
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!data || data.length === 0) throw new Error('未找到项目');
  });

  await runTest('Projects', '更新项目', async () => {
    const { status } = await supabaseAdmin(`projects?id=eq.${testData.projectId}`, {
      method: 'PATCH',
      body: { name: `Updated ${testProjectName}`, description: '已更新' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Projects', '添加项目收藏', async () => {
    const { status } = await supabaseAdmin('bookmarks', {
      method: 'POST',
      body: { user_id: testData.userId, project_id: testData.projectId }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Projects', '取消项目收藏', async () => {
    const { status } = await supabaseAdmin(
      `bookmarks?user_id=eq.${testData.userId}&project_id=eq.${testData.projectId}`,
      { method: 'DELETE' }
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 5. 列管理测试 ====================
  log('bold', '\n[5] 列管理测试 (4 tests)\n');

  const columnNames = ['To Do', 'In Progress', 'Done'];

  await runTest('Columns', '创建看板列 (3列)', async () => {
    for (let i = 0; i < columnNames.length; i++) {
      const { status, data } = await supabaseAdmin('columns', {
        method: 'POST',
        body: {
          title: columnNames[i],
          name: columnNames[i],
          position: i,
          project_id: testData.projectId,
          created_by: testData.userId
        }
      });
      if (status >= 400) throw new Error(`创建 "${columnNames[i]}" 失败: ${status}`);
      if (data && data.length > 0) testData.columnIds.push(data[0].id);
    }
    if (testData.columnIds.length !== 3) throw new Error(`应创建3列，实际${testData.columnIds.length}`);
  });

  await runTest('Columns', '获取项目的列', async () => {
    const { status, data } = await supabaseAdmin(
      `columns?project_id=eq.${testData.projectId}&order=position.asc`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length !== 3) throw new Error(`应有3列，实际${data.length}`);
  });

  await runTest('Columns', '更新列标题', async () => {
    const { status } = await supabaseAdmin(`columns?id=eq.${testData.columnIds[0]}`, {
      method: 'PATCH',
      body: { title: 'Backlog', name: 'Backlog' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Columns', '调整列顺序', async () => {
    const { status } = await supabaseAdmin(`columns?id=eq.${testData.columnIds[2]}`, {
      method: 'PATCH',
      body: { position: 0 }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 6. 任务管理测试 ====================
  log('bold', '\n[6] 任务管理测试 (10 tests)\n');

  const taskDefs = [
    { title: '高优先级任务', priority: 'high' },
    { title: '中优先级任务', priority: 'medium' },
    { title: '低优先级任务', priority: 'low' },
    { title: '有截止日期的任务', priority: 'medium' },
    { title: '已分配的任务', priority: 'high' }
  ];

  await runTest('Tasks', '创建任务 (5个)', async () => {
    for (let i = 0; i < taskDefs.length; i++) {
      const columnIndex = i % testData.columnIds.length;
      const { status, data } = await supabaseAdmin('tasks', {
        method: 'POST',
        body: {
          title: taskDefs[i].title,
          description: `测试任务 ${i + 1} 的描述`,
          column_id: testData.columnIds[columnIndex],
          project_id: testData.projectId,
          position: i,
          priority: taskDefs[i].priority,
          created_by: testData.userId,
          due_date: i === 3 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          assigned_to: i === 4 ? testData.userId : null
        }
      });
      if (status >= 400) throw new Error(`创建 "${taskDefs[i].title}" 失败: ${status}`);
      if (data && data.length > 0) testData.taskIds.push(data[0].id);
    }
    if (testData.taskIds.length !== 5) throw new Error(`应创建5个任务，实际${testData.taskIds.length}`);
  });

  await runTest('Tasks', '获取列中的任务', async () => {
    const { status, data } = await supabaseAdmin(
      `tasks?column_id=eq.${testData.columnIds[0]}&order=position.asc`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!Array.isArray(data)) throw new Error('返回数据格式错误');
  });

  await runTest('Tasks', '更新任务信息', async () => {
    const { status } = await supabaseAdmin(`tasks?id=eq.${testData.taskIds[0]}`, {
      method: 'PATCH',
      body: { title: '已更新的高优先级任务', description: '更新后的描述' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Tasks', '移动任务到其他列', async () => {
    const targetColumnId = testData.columnIds[1];
    const { status } = await supabaseAdmin(`tasks?id=eq.${testData.taskIds[0]}`, {
      method: 'PATCH',
      body: { column_id: targetColumnId }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
    
    const { data } = await supabaseAdmin(`tasks?id=eq.${testData.taskIds[0]}`);
    if (data[0].column_id !== targetColumnId) throw new Error('任务未移动到目标列');
  });

  await runTest('Tasks', '标记任务完成', async () => {
    const { status } = await supabaseAdmin(`tasks?id=eq.${testData.taskIds[0]}`, {
      method: 'PATCH',
      body: { is_done: true, completed_at: new Date().toISOString() }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Tasks', '分配任务给用户', async () => {
    const { status } = await supabaseAdmin(`tasks?id=eq.${testData.taskIds[1]}`, {
      method: 'PATCH',
      body: { assigned_to: testData.userId }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Tasks', '按优先级筛选', async () => {
    const { status, data } = await supabaseAdmin(
      `tasks?project_id=eq.${testData.projectId}&priority=eq.high`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length < 1) throw new Error('应至少有1个高优先级任务');
  });

  await runTest('Tasks', '获取分配给用户的任务', async () => {
    const { status, data } = await supabaseAdmin(`tasks?assigned_to=eq.${testData.userId}`);
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length < 1) throw new Error('应至少有1个已分配任务');
  });

  await runTest('Tasks', '任务搜索 (标题模糊匹配)', async () => {
    const { status, data } = await supabaseAdmin(
      `tasks?project_id=eq.${testData.projectId}&title=ilike.*优先级*`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length < 1) throw new Error('搜索应返回结果');
  });

  await runTest('Tasks', '获取有截止日期的任务', async () => {
    const { status, data } = await supabaseAdmin(
      `tasks?project_id=eq.${testData.projectId}&due_date=not.is.null`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length < 1) throw new Error('应有截止日期任务');
  });

  // ==================== 7. 评论测试 ====================
  log('bold', '\n[7] 任务评论测试 (3 tests)\n');

  await runTest('Comments', '添加任务评论', async () => {
    const { status, data } = await supabaseAdmin('task_comments', {
      method: 'POST',
      body: {
        task_id: testData.taskIds[0],
        user_id: testData.userId,
        content: '这是一条测试评论'
      }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data && data.length > 0) testData.commentId = data[0].id;
  });

  await runTest('Comments', '获取任务评论', async () => {
    const { status, data } = await supabaseAdmin(`task_comments?task_id=eq.${testData.taskIds[0]}`);
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data.length < 1) throw new Error('应有至少1条评论');
  });

  await runTest('Comments', '更新评论', async () => {
    if (!testData.commentId) throw new Error('没有可更新的评论');
    const { status } = await supabaseAdmin(`task_comments?id=eq.${testData.commentId}`, {
      method: 'PATCH',
      body: { content: '更新后的评论内容' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 8. 通知测试 ====================
  log('bold', '\n[8] 通知测试 (3 tests)\n');

  await runTest('Notifications', '创建通知', async () => {
    const { status, data } = await supabaseAdmin('notifications', {
      method: 'POST',
      body: {
        user_id: testData.userId,
        title: '测试通知',
        message: '这是一条测试通知消息',
        type: 'info',
        link: `/dashboard/projects/${testData.projectId}`
      }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (data && data.length > 0) testData.notificationId = data[0].id;
  });

  await runTest('Notifications', '获取用户通知', async () => {
    const { status, data } = await supabaseAdmin(
      `notifications?user_id=eq.${testData.userId}&order=created_at.desc`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Notifications', '标记通知已读', async () => {
    if (!testData.notificationId) throw new Error('没有可标记的通知');
    const { status } = await supabaseAdmin(`notifications?id=eq.${testData.notificationId}`, {
      method: 'PATCH',
      body: { read: true }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 9. 活动日志测试 ====================
  log('bold', '\n[9] 活动日志测试 (2 tests)\n');

  await runTest('Activity', '创建活动日志', async () => {
    const { status } = await supabaseAdmin('activity_logs', {
      method: 'POST',
      body: {
        user_id: testData.userId,
        project_id: testData.projectId,
        task_id: testData.taskIds[0],
        action: 'task_created',
        details: { task_title: '测试任务' }
      }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  await runTest('Activity', '获取项目活动日志', async () => {
    const { status, data } = await supabaseAdmin(
      `activity_logs?project_id=eq.${testData.projectId}&order=created_at.desc`
    );
    if (status >= 400) throw new Error(`状态码 ${status}`);
  });

  // ==================== 10. 订阅计划测试 ====================
  log('bold', '\n[10] 订阅计划测试 (3 tests)\n');

  await runTest('Subscriptions', '获取订阅计划列表', async () => {
    const { status, data } = await supabaseAdmin('subscription_plans?is_active=eq.true');
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!Array.isArray(data) || data.length < 1) throw new Error('应至少有1个活跃计划');
  });

  await runTest('Subscriptions', 'Free 计划存在', async () => {
    const { status, data } = await supabaseAdmin('subscription_plans?name=eq.Free');
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!data || data.length === 0) throw new Error('Free 计划不存在');
  });

  await runTest('Subscriptions', 'Pro 计划存在', async () => {
    const { status, data } = await supabaseAdmin('subscription_plans?name=eq.Pro');
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!data || data.length === 0) throw new Error('Pro 计划不存在');
  });

  // ==================== 11. 系统设置测试 ====================
  log('bold', '\n[11] 系统设置测试 (2 tests)\n');

  await runTest('Settings', '获取系统设置', async () => {
    const { status, data } = await supabaseAdmin('system_settings');
    if (status >= 400) throw new Error(`状态码 ${status}`);
    if (!Array.isArray(data)) throw new Error('返回数据格式错误');
  });

  await runTest('Settings', '更新系统设置', async () => {
    const { status } = await supabaseAdmin('system_settings?key=eq.site_name', {
      method: 'PATCH',
      body: { value: '"Kanba Test"' }
    });
    if (status >= 400) throw new Error(`状态码 ${status}`);
    
    // 恢复
    await supabaseAdmin('system_settings?key=eq.site_name', {
      method: 'PATCH',
      body: { value: '"Kanba"' }
    });
  });

  // ==================== 12. RLS 安全策略测试 ====================
  log('bold', '\n[12] RLS 安全策略测试 (3 tests)\n');

  await runTest('RLS', '匿名用户无法创建项目', async () => {
    const { status } = await supabaseAnon('projects', {
      method: 'POST',
      body: { name: 'Unauthorized Project', user_id: testData.userId }
    });
    if (status < 400) throw new Error('RLS 未阻止匿名创建项目');
  });

  await runTest('RLS', '匿名用户无法创建任务', async () => {
    const { status } = await supabaseAnon('tasks', {
      method: 'POST',
      body: { title: 'Unauthorized Task', column_id: testData.columnIds[0] }
    });
    if (status < 400) throw new Error('RLS 未阻止匿名创建任务');
  });

  await runTest('RLS', '匿名用户无法删除项目', async () => {
    const { status } = await supabaseAnon(`projects?id=eq.${testData.projectId}`, {
      method: 'DELETE'
    });
    if (status < 400) throw new Error('RLS 未阻止匿名删除项目');
  });

  // ==================== 13. 清理测试数据 ====================
  log('bold', '\n[13] 清理测试数据 (6 tests)\n');

  await runTest('Cleanup', '删除测试评论', async () => {
    if (testData.commentId) {
      await supabaseAdmin(`task_comments?id=eq.${testData.commentId}`, { method: 'DELETE' });
    }
  });

  await runTest('Cleanup', '删除测试通知', async () => {
    if (testData.notificationId) {
      await supabaseAdmin(`notifications?id=eq.${testData.notificationId}`, { method: 'DELETE' });
    }
  });

  await runTest('Cleanup', '删除测试活动日志', async () => {
    if (testData.projectId) {
      await supabaseAdmin(`activity_logs?project_id=eq.${testData.projectId}`, { method: 'DELETE' });
    }
  });

  await runTest('Cleanup', '删除测试任务', async () => {
    for (const taskId of testData.taskIds) {
      await supabaseAdmin(`tasks?id=eq.${taskId}`, { method: 'DELETE' });
    }
  });

  await runTest('Cleanup', '删除测试列', async () => {
    for (const colId of testData.columnIds) {
      await supabaseAdmin(`columns?id=eq.${colId}`, { method: 'DELETE' });
    }
  });

  await runTest('Cleanup', '删除测试项目', async () => {
    if (testData.projectId) {
      const { status } = await supabaseAdmin(`projects?id=eq.${testData.projectId}`, { method: 'DELETE' });
      if (status >= 400) throw new Error(`状态码 ${status}`);
    }
  });

  // ==================== 测试报告 ====================
  const totalTime = Date.now() - startTime;
  const total = testResults.passed + testResults.failed + testResults.skipped;
  
  console.log('\n' + '='.repeat(60));
  log('bold', '测试报告');
  console.log('='.repeat(60));
  log('green', `\n通过: ${testResults.passed}`);
  log('red', `失败: ${testResults.failed}`);
  log('yellow', `跳过: ${testResults.skipped}`);
  console.log(`总计: ${total}`);
  console.log(`耗时: ${totalTime}ms`);
  console.log(`通过率: ${((testResults.passed / total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n' + '-'.repeat(40));
    log('red', '失败的测试:');
    testResults.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        log('red', `  - [${t.category}] ${t.name}`);
        log('red', `    ${t.error}`);
      });
  }

  console.log('\n' + '='.repeat(60) + '\n');
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  log('red', `测试运行错误: ${err.message}`);
  process.exit(1);
});
