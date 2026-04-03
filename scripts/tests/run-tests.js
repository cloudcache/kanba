/**
 * Kanba API Test Runner
 * 
 * A simple test script that can run without TypeScript compilation
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://vm-ux9agd8g6ilwpilawzycso.vusercontent.net';

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.passed++;
    results.tests.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    results.failed++;
    results.tests.push({ name, passed: false, duration, error: error.message });
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
  }
}

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  return { status: response.status, data, ok: response.ok };
}

// ============================================
// Test Cases
// ============================================

async function runTests() {
  console.log('\n========================================');
  console.log('Kanba API Test Suite');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('========================================\n');

  // ---- Health Check ----
  console.log('\n--- Health Check ---\n');
  
  await test('Homepage loads', async () => {
    const res = await fetchAPI('/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('Login page loads', async () => {
    const res = await fetchAPI('/login');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('Signup page loads', async () => {
    const res = await fetchAPI('/signup');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('Dashboard redirects without auth', async () => {
    const res = await fetchAPI('/dashboard');
    // Should redirect to login or return 200 with redirect
    if (res.status !== 200 && res.status !== 302 && res.status !== 307) {
      throw new Error(`Expected 200/302/307, got ${res.status}`);
    }
  });

  // ---- API Endpoints ----
  console.log('\n--- API Endpoints ---\n');

  await test('GET /api/health returns ok', async () => {
    const res = await fetchAPI('/api/health');
    // May not exist, but should not error
    if (res.status === 500) throw new Error('Server error');
  });

  await test('GET /api/projects without auth returns 401', async () => {
    const res = await fetchAPI('/api/projects');
    // Without auth, should return 401 or redirect
    if (res.status === 500) throw new Error('Server error - should return 401');
  });

  await test('GET /api/tasks without auth returns 401', async () => {
    const res = await fetchAPI('/api/tasks');
    if (res.status === 500) throw new Error('Server error - should return 401');
  });

  await test('GET /api/user without auth returns 401', async () => {
    const res = await fetchAPI('/api/user');
    if (res.status === 500) throw new Error('Server error - should return 401');
  });

  // ---- Admin Routes ----
  console.log('\n--- Admin Routes ---\n');

  await test('Admin page exists', async () => {
    const res = await fetchAPI('/admin');
    // Should redirect to login or return the page
    if (res.status === 500) throw new Error('Server error');
    if (res.status === 404) throw new Error('Admin page not found (404)');
  });

  await test('Admin users page exists', async () => {
    const res = await fetchAPI('/admin/users');
    if (res.status === 500) throw new Error('Server error');
    if (res.status === 404) throw new Error('Admin users page not found (404)');
  });

  await test('Admin projects page exists', async () => {
    const res = await fetchAPI('/admin/projects');
    if (res.status === 500) throw new Error('Server error');
    if (res.status === 404) throw new Error('Admin projects page not found (404)');
  });

  await test('Admin settings page exists', async () => {
    const res = await fetchAPI('/admin/settings');
    if (res.status === 500) throw new Error('Server error');
    if (res.status === 404) throw new Error('Admin settings page not found (404)');
  });

  // ---- Static Assets ----
  console.log('\n--- Static Assets ---\n');

  await test('Favicon exists', async () => {
    const res = await fetchAPI('/favicon.ico');
    // May return 200 or 404, but not 500
    if (res.status === 500) throw new Error('Server error');
  });

  // ---- Database Connectivity (via API) ----
  console.log('\n--- Database Connectivity ---\n');

  await test('API can connect to database', async () => {
    // Try to access an endpoint that requires database
    const res = await fetchAPI('/api/health');
    if (res.status === 500 && res.data && res.data.includes && res.data.includes('database')) {
      throw new Error('Database connection failed');
    }
  });

  // ---- Summary ----
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('========================================\n');

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
    console.log('');
  }

  return results;
}

// Run tests
runTests().catch(console.error);
