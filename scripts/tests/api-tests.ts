/**
 * Kanba API Test Suite
 * 
 * Run with: npx tsx scripts/tests/api-tests.ts
 * 
 * Environment variables required:
 * - API_BASE_URL: Base URL of the API (default: http://localhost:3000)
 * - TEST_USER_EMAIL: Test user email
 * - TEST_USER_PASSWORD: Test user password
 */

interface TestResult {
  name: string;
  endpoint: string;
  method: string;
  passed: boolean;
  statusCode?: number;
  expectedStatus: number;
  duration: number;
  error?: string;
  response?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123456';

let authToken: string | null = null;
let testUserId: string | null = null;
let testProjectId: string | null = null;
let testColumnId: string | null = null;
let testTaskId: string | null = null;

// Test utilities
async function makeRequest(
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any; duration: number }> {
  const start = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json().catch(() => ({}));
    const duration = Date.now() - start;
    
    return { status: response.status, data, duration };
  } catch (error: any) {
    return { 
      status: 0, 
      data: { error: error.message }, 
      duration: Date.now() - start 
    };
  }
}

async function runTest(
  name: string,
  method: string,
  endpoint: string,
  expectedStatus: number,
  body?: any,
  validator?: (data: any) => boolean
): Promise<TestResult> {
  const { status, data, duration } = await makeRequest(method, endpoint, body);
  
  const passed = status === expectedStatus && (!validator || validator(data));
  
  return {
    name,
    endpoint,
    method,
    passed,
    statusCode: status,
    expectedStatus,
    duration,
    error: passed ? undefined : `Expected ${expectedStatus}, got ${status}`,
    response: passed ? undefined : data,
  };
}

// ============================================
// TEST SUITES
// ============================================

async function testAuthAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  // Test: Register new user
  tests.push(await runTest(
    'Register new user',
    'POST',
    '/api/auth/register',
    200,
    {
      email: `test-${Date.now()}@example.com`,
      password: 'test123456',
      fullName: 'Test User',
    },
    (data) => !!data.user
  ));
  
  // Test: Login with valid credentials
  tests.push(await runTest(
    'Login with valid credentials',
    'POST',
    '/api/auth/login',
    200,
    {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
    (data) => {
      if (data.token) {
        authToken = data.token;
        testUserId = data.user?.id;
        return true;
      }
      return false;
    }
  ));
  
  // Test: Login with invalid credentials
  tests.push(await runTest(
    'Login with invalid credentials',
    'POST',
    '/api/auth/login',
    401,
    {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    }
  ));
  
  // Test: Get current user
  tests.push(await runTest(
    'Get current user',
    'GET',
    '/api/auth/me',
    200,
    undefined,
    (data) => !!data.user
  ));
  
  // Test: Logout
  tests.push(await runTest(
    'Logout',
    'POST',
    '/api/auth/logout',
    200
  ));
  
  return {
    name: 'Authentication API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testProjectsAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  // Re-login for subsequent tests
  await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }).then(({ data }) => {
    authToken = data.token;
    testUserId = data.user?.id;
  });
  
  // Test: Create project
  tests.push(await runTest(
    'Create project',
    'POST',
    '/api/projects',
    200,
    {
      name: `Test Project ${Date.now()}`,
      description: 'A test project',
      color: '#6366f1',
    },
    (data) => {
      if (data.id) {
        testProjectId = data.id;
        return true;
      }
      return false;
    }
  ));
  
  // Test: Get all projects
  tests.push(await runTest(
    'Get all projects',
    'GET',
    '/api/projects',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.projects)
  ));
  
  // Test: Get single project
  if (testProjectId) {
    tests.push(await runTest(
      'Get single project',
      'GET',
      `/api/projects/${testProjectId}`,
      200,
      undefined,
      (data) => data.id === testProjectId
    ));
  }
  
  // Test: Update project
  if (testProjectId) {
    tests.push(await runTest(
      'Update project',
      'PATCH',
      `/api/projects/${testProjectId}`,
      200,
      {
        name: 'Updated Project Name',
        description: 'Updated description',
      },
      (data) => data.name === 'Updated Project Name'
    ));
  }
  
  // Test: Get project by slug
  if (testProjectId) {
    tests.push(await runTest(
      'Get project by slug',
      'GET',
      `/api/projects/slug/updated-project-name-${testProjectId?.substring(0, 8)}`,
      200
    ));
  }
  
  return {
    name: 'Projects API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testColumnsAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  if (!testProjectId) {
    return { name: 'Columns API', tests: [], passed: 0, failed: 0 };
  }
  
  // Test: Create column
  tests.push(await runTest(
    'Create column',
    'POST',
    `/api/projects/${testProjectId}/columns`,
    200,
    {
      title: 'To Do',
      position: 0,
    },
    (data) => {
      if (data.id) {
        testColumnId = data.id;
        return true;
      }
      return false;
    }
  ));
  
  // Test: Get all columns for project
  tests.push(await runTest(
    'Get all columns',
    'GET',
    `/api/projects/${testProjectId}/columns`,
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.columns)
  ));
  
  // Test: Update column
  if (testColumnId) {
    tests.push(await runTest(
      'Update column',
      'PATCH',
      `/api/projects/${testProjectId}/columns/${testColumnId}`,
      200,
      {
        title: 'In Progress',
        position: 1,
      },
      (data) => data.title === 'In Progress'
    ));
  }
  
  // Test: Reorder columns
  tests.push(await runTest(
    'Reorder columns',
    'POST',
    `/api/projects/${testProjectId}/columns/reorder`,
    200,
    {
      columnIds: [testColumnId],
    }
  ));
  
  return {
    name: 'Columns API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testTasksAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  if (!testProjectId || !testColumnId) {
    return { name: 'Tasks API', tests: [], passed: 0, failed: 0 };
  }
  
  // Test: Create task
  tests.push(await runTest(
    'Create task',
    'POST',
    `/api/projects/${testProjectId}/tasks`,
    200,
    {
      title: 'Test Task',
      description: 'A test task description',
      columnId: testColumnId,
      priority: 'medium',
    },
    (data) => {
      if (data.id) {
        testTaskId = data.id;
        return true;
      }
      return false;
    }
  ));
  
  // Test: Get all tasks for project
  tests.push(await runTest(
    'Get all tasks',
    'GET',
    `/api/projects/${testProjectId}/tasks`,
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.tasks)
  ));
  
  // Test: Get single task
  if (testTaskId) {
    tests.push(await runTest(
      'Get single task',
      'GET',
      `/api/tasks/${testTaskId}`,
      200,
      undefined,
      (data) => data.id === testTaskId
    ));
  }
  
  // Test: Update task
  if (testTaskId) {
    tests.push(await runTest(
      'Update task',
      'PATCH',
      `/api/tasks/${testTaskId}`,
      200,
      {
        title: 'Updated Task Title',
        priority: 'high',
        isDone: false,
      },
      (data) => data.title === 'Updated Task Title'
    ));
  }
  
  // Test: Move task to different column
  if (testTaskId && testColumnId) {
    tests.push(await runTest(
      'Move task',
      'POST',
      `/api/tasks/${testTaskId}/move`,
      200,
      {
        columnId: testColumnId,
        position: 0,
      }
    ));
  }
  
  // Test: Assign task
  if (testTaskId && testUserId) {
    tests.push(await runTest(
      'Assign task',
      'POST',
      `/api/tasks/${testTaskId}/assign`,
      200,
      {
        userId: testUserId,
      }
    ));
  }
  
  // Test: Add comment to task
  if (testTaskId) {
    tests.push(await runTest(
      'Add comment to task',
      'POST',
      `/api/tasks/${testTaskId}/comments`,
      200,
      {
        content: 'This is a test comment',
      },
      (data) => !!data.id
    ));
  }
  
  // Test: Get task comments
  if (testTaskId) {
    tests.push(await runTest(
      'Get task comments',
      'GET',
      `/api/tasks/${testTaskId}/comments`,
      200,
      undefined,
      (data) => Array.isArray(data) || Array.isArray(data.comments)
    ));
  }
  
  // Test: Mark task as done
  if (testTaskId) {
    tests.push(await runTest(
      'Mark task as done',
      'PATCH',
      `/api/tasks/${testTaskId}`,
      200,
      {
        isDone: true,
      },
      (data) => data.isDone === true || data.is_done === true
    ));
  }
  
  return {
    name: 'Tasks API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testUserAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  // Test: Get user profile
  tests.push(await runTest(
    'Get user profile',
    'GET',
    '/api/user/profile',
    200,
    undefined,
    (data) => !!data.email
  ));
  
  // Test: Update user profile
  tests.push(await runTest(
    'Update user profile',
    'PATCH',
    '/api/user/profile',
    200,
    {
      fullName: 'Updated Name',
      locale: 'en',
      timezone: 'UTC',
    }
  ));
  
  // Test: Get user notifications
  tests.push(await runTest(
    'Get user notifications',
    'GET',
    '/api/user/notifications',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.notifications)
  ));
  
  // Test: Get user bookmarks
  tests.push(await runTest(
    'Get user bookmarks',
    'GET',
    '/api/user/bookmarks',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.bookmarks)
  ));
  
  return {
    name: 'User API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testAdminAPI(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  // Test: Get admin stats (requires admin role)
  tests.push(await runTest(
    'Get admin stats',
    'GET',
    '/api/admin/stats',
    200,
    undefined,
    (data) => data.totalUsers !== undefined || data.error
  ));
  
  // Test: Get all users (requires admin role)
  tests.push(await runTest(
    'Get all users (admin)',
    'GET',
    '/api/admin/users',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.users) || data.error
  ));
  
  // Test: Get all projects (requires admin role)
  tests.push(await runTest(
    'Get all projects (admin)',
    'GET',
    '/api/admin/projects',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.projects) || data.error
  ));
  
  // Test: Get system settings
  tests.push(await runTest(
    'Get system settings',
    'GET',
    '/api/admin/settings',
    200,
    undefined,
    (data) => typeof data === 'object'
  ));
  
  // Test: Get subscription plans
  tests.push(await runTest(
    'Get subscription plans',
    'GET',
    '/api/admin/plans',
    200,
    undefined,
    (data) => Array.isArray(data) || Array.isArray(data.plans)
  ));
  
  return {
    name: 'Admin API',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

async function testCleanup(): Promise<TestSuite> {
  const tests: TestResult[] = [];
  
  // Test: Delete task
  if (testTaskId) {
    tests.push(await runTest(
      'Delete task',
      'DELETE',
      `/api/tasks/${testTaskId}`,
      200
    ));
  }
  
  // Test: Delete column
  if (testProjectId && testColumnId) {
    tests.push(await runTest(
      'Delete column',
      'DELETE',
      `/api/projects/${testProjectId}/columns/${testColumnId}`,
      200
    ));
  }
  
  // Test: Delete project
  if (testProjectId) {
    tests.push(await runTest(
      'Delete project',
      'DELETE',
      `/api/projects/${testProjectId}`,
      200
    ));
  }
  
  return {
    name: 'Cleanup',
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MAIN RUNNER
// ============================================

async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              KANBA API TEST SUITE                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nAPI Base URL: ${API_BASE_URL}`);
  console.log(`Test User: ${TEST_USER_EMAIL}`);
  console.log('');
  
  const suites: TestSuite[] = [];
  
  // Run all test suites
  console.log('Running Authentication tests...');
  suites.push(await testAuthAPI());
  
  console.log('Running Projects tests...');
  suites.push(await testProjectsAPI());
  
  console.log('Running Columns tests...');
  suites.push(await testColumnsAPI());
  
  console.log('Running Tasks tests...');
  suites.push(await testTasksAPI());
  
  console.log('Running User tests...');
  suites.push(await testUserAPI());
  
  console.log('Running Admin tests...');
  suites.push(await testAdminAPI());
  
  console.log('Running Cleanup tests...');
  suites.push(await testCleanup());
  
  // Print results
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                         TEST RESULTS                            ');
  console.log('════════════════════════════════════════════════════════════════');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const suite of suites) {
    console.log(`\n📋 ${suite.name}`);
    console.log('─'.repeat(60));
    
    for (const test of suite.tests) {
      const status = test.passed ? '✅' : '❌';
      const duration = `${test.duration}ms`;
      console.log(`  ${status} ${test.name}`);
      console.log(`     ${test.method} ${test.endpoint} → ${test.statusCode} (${duration})`);
      if (!test.passed && test.error) {
        console.log(`     Error: ${test.error}`);
        if (test.response) {
          console.log(`     Response: ${JSON.stringify(test.response).substring(0, 100)}...`);
        }
      }
    }
    
    totalPassed += suite.passed;
    totalFailed += suite.failed;
    
    console.log(`\n  Summary: ${suite.passed} passed, ${suite.failed} failed`);
  }
  
  // Final summary
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                       FINAL SUMMARY                             ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n  Total Tests: ${totalPassed + totalFailed}`);
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
  console.log('');
  
  // Exit with error code if any tests failed
  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
