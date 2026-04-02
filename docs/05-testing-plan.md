# 测试计划与测试用例

> 文档版本：v1.0  
> 更新日期：2026-04-02  
> 状态：待审批

---

## 目录

1. [测试策略](#一测试策略)
2. [测试环境](#二测试环境)
3. [单元测试用例](#三单元测试用例)
4. [集成测试用例](#四集成测试用例)
5. [端到端测试用例](#五端到端测试用例)
6. [性能测试](#六性能测试)
7. [安全测试](#七安全测试)

---

## 一、测试策略

### 1.1 测试金字塔

```
                    ┌───────────┐
                    │   E2E     │  ~ 10%
                    │  Tests    │
                    ├───────────┤
                    │Integration│  ~ 30%
                    │   Tests   │
                    ├───────────┤
                    │   Unit    │  ~ 60%
                    │   Tests   │
                    └───────────┘
```

### 1.2 测试覆盖率目标

| 层级 | 覆盖率目标 | 工具 |
|------|------------|------|
| 单元测试 | 80%+ | Vitest |
| 集成测试 | 70%+ | Vitest + Testing Library |
| E2E 测试 | 关键路径 100% | Playwright |

### 1.3 测试分类

| 类型 | 范围 | 运行频率 |
|------|------|----------|
| 单元测试 | 函数、工具类、Hooks | 每次提交 |
| 组件测试 | React 组件 | 每次提交 |
| 集成测试 | API 路由、Server Actions | 每次 PR |
| E2E 测试 | 完整用户流程 | 每次部署 |
| 性能测试 | 关键页面加载、API 响应 | 每周 |
| 安全测试 | 认证、授权、数据安全 | 每个版本 |

---

## 二、测试环境

### 2.1 环境配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 2.2 测试工具配置

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }),
}));
```

### 2.3 测试数据工厂

```typescript
// tests/factories/index.ts
import { faker } from '@faker-js/faker';

export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  fullName: faker.person.fullName(),
  avatarUrl: faker.image.avatar(),
  authProvider: 'supabase',
  locale: 'en',
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  description: faker.company.catchPhrase(),
  logoUrl: faker.image.url(),
  billingPlan: 'free',
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(3),
  slug: faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
  description: faker.lorem.sentence(),
  visibility: 'private',
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  taskType: 'task',
  status: { id: 'todo', label: 'To Do', color: '#6b7280' },
  priority: { id: 'medium', label: 'Medium', color: '#eab308' },
  position: faker.number.int({ min: 1, max: 1000 }),
  createdAt: faker.date.past().toISOString(),
  ...overrides,
});

export const createMockField = (type: string, overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.lorem.word(),
  slug: faker.lorem.slug(),
  type,
  config: {},
  isRequired: false,
  isSystem: false,
  position: faker.number.int({ min: 1, max: 100 }),
  ...overrides,
});
```

---

## 三、单元测试用例

### 3.1 权限工具测试

```typescript
// tests/unit/lib/permissions.test.ts
import { describe, it, expect } from 'vitest';
import { 
  hasPermission, 
  checkResourceAccess,
  PERMISSIONS,
  PRESET_ROLES,
} from '@/lib/permissions';

describe('Permission Utils', () => {
  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      const userPermissions = ['task:create', 'task:read', 'task:update'];
      expect(hasPermission(userPermissions, 'task:create')).toBe(true);
    });

    it('should return false for missing permission', () => {
      const userPermissions = ['task:read'];
      expect(hasPermission(userPermissions, 'task:delete')).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const userPermissions = ['task:*'];
      expect(hasPermission(userPermissions, 'task:create')).toBe(true);
      expect(hasPermission(userPermissions, 'task:delete')).toBe(true);
      expect(hasPermission(userPermissions, 'project:read')).toBe(false);
    });

    it('should handle super admin wildcard', () => {
      const userPermissions = ['*'];
      expect(hasPermission(userPermissions, 'org:delete')).toBe(true);
      expect(hasPermission(userPermissions, 'any:permission')).toBe(true);
    });

    it('should handle empty permissions', () => {
      expect(hasPermission([], 'task:read')).toBe(false);
      expect(hasPermission(undefined as any, 'task:read')).toBe(false);
    });
  });

  describe('checkResourceAccess', () => {
    const mockUser = {
      id: 'user-1',
      organizationMemberships: [
        { organizationId: 'org-1', roleId: 'role_member', permissions: ['task:read', 'task:create'] },
      ],
    };

    it('should grant access for valid resource and permission', () => {
      const result = checkResourceAccess(mockUser, 'org-1', 'task:read');
      expect(result.allowed).toBe(true);
    });

    it('should deny access for invalid permission', () => {
      const result = checkResourceAccess(mockUser, 'org-1', 'org:delete');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('PERMISSION_DENIED');
    });

    it('should deny access for invalid organization', () => {
      const result = checkResourceAccess(mockUser, 'org-999', 'task:read');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NOT_MEMBER');
    });
  });

  describe('PRESET_ROLES', () => {
    it('should have org_owner with all permissions', () => {
      expect(PRESET_ROLES.org_owner.permissions).toContain('*');
    });

    it('should have member with limited permissions', () => {
      const memberPerms = PRESET_ROLES.member.permissions;
      expect(memberPerms).toContain('task:create');
      expect(memberPerms).toContain('task:read');
      expect(memberPerms).not.toContain('org:delete');
    });

    it('should have guest with read-only permissions', () => {
      const guestPerms = PRESET_ROLES.guest.permissions;
      expect(guestPerms).toContain('project:read');
      expect(guestPerms).toContain('task:read');
      expect(guestPerms).not.toContain('task:create');
    });
  });
});
```

### 3.2 字段验证测试

```typescript
// tests/unit/lib/field-validation.test.ts
import { describe, it, expect } from 'vitest';
import { 
  validateFieldValue,
  validateFieldConfig,
  FIELD_VALIDATORS,
} from '@/lib/field-validation';

describe('Field Validation', () => {
  describe('validateFieldValue', () => {
    describe('text field', () => {
      const textField = {
        id: 'f1',
        type: 'text',
        config: { maxLength: 100 },
        isRequired: true,
      };

      it('should pass for valid text', () => {
        const result = validateFieldValue(textField, 'Hello World');
        expect(result.valid).toBe(true);
      });

      it('should fail for empty required field', () => {
        const result = validateFieldValue(textField, '');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should fail for text exceeding maxLength', () => {
        const longText = 'a'.repeat(101);
        const result = validateFieldValue(textField, longText);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('100');
      });
    });

    describe('number field', () => {
      const numberField = {
        id: 'f2',
        type: 'number',
        config: { min: 0, max: 100, precision: 2 },
        isRequired: false,
      };

      it('should pass for valid number', () => {
        const result = validateFieldValue(numberField, 50);
        expect(result.valid).toBe(true);
      });

      it('should pass for empty optional field', () => {
        const result = validateFieldValue(numberField, null);
        expect(result.valid).toBe(true);
      });

      it('should fail for number below min', () => {
        const result = validateFieldValue(numberField, -1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('min');
      });

      it('should fail for number above max', () => {
        const result = validateFieldValue(numberField, 101);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('max');
      });

      it('should fail for non-numeric value', () => {
        const result = validateFieldValue(numberField, 'abc');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('number');
      });
    });

    describe('date field', () => {
      const dateField = {
        id: 'f3',
        type: 'date',
        config: { minDate: '2024-01-01', maxDate: '2024-12-31' },
        isRequired: true,
      };

      it('should pass for valid date string', () => {
        const result = validateFieldValue(dateField, '2024-06-15');
        expect(result.valid).toBe(true);
      });

      it('should pass for valid Date object', () => {
        const result = validateFieldValue(dateField, new Date('2024-06-15'));
        expect(result.valid).toBe(true);
      });

      it('should fail for date before minDate', () => {
        const result = validateFieldValue(dateField, '2023-12-31');
        expect(result.valid).toBe(false);
      });

      it('should fail for date after maxDate', () => {
        const result = validateFieldValue(dateField, '2025-01-01');
        expect(result.valid).toBe(false);
      });

      it('should fail for invalid date format', () => {
        const result = validateFieldValue(dateField, 'not-a-date');
        expect(result.valid).toBe(false);
      });
    });

    describe('select field', () => {
      const selectField = {
        id: 'f4',
        type: 'select',
        config: {
          options: [
            { id: 'opt1', label: 'Option 1' },
            { id: 'opt2', label: 'Option 2' },
          ],
        },
        isRequired: true,
      };

      it('should pass for valid option', () => {
        const result = validateFieldValue(selectField, 'opt1');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid option', () => {
        const result = validateFieldValue(selectField, 'opt999');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid');
      });
    });

    describe('multiselect field', () => {
      const multiselectField = {
        id: 'f5',
        type: 'multiselect',
        config: {
          options: [
            { id: 'opt1', label: 'Option 1' },
            { id: 'opt2', label: 'Option 2' },
            { id: 'opt3', label: 'Option 3' },
          ],
        },
        isRequired: false,
      };

      it('should pass for valid options array', () => {
        const result = validateFieldValue(multiselectField, ['opt1', 'opt2']);
        expect(result.valid).toBe(true);
      });

      it('should pass for empty array on optional field', () => {
        const result = validateFieldValue(multiselectField, []);
        expect(result.valid).toBe(true);
      });

      it('should fail if any option is invalid', () => {
        const result = validateFieldValue(multiselectField, ['opt1', 'invalid']);
        expect(result.valid).toBe(false);
      });
    });

    describe('email field', () => {
      const emailField = {
        id: 'f6',
        type: 'email',
        config: {},
        isRequired: true,
      };

      it('should pass for valid email', () => {
        const result = validateFieldValue(emailField, 'user@example.com');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid email format', () => {
        const result = validateFieldValue(emailField, 'not-an-email');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('email');
      });
    });

    describe('url field', () => {
      const urlField = {
        id: 'f7',
        type: 'url',
        config: {},
        isRequired: true,
      };

      it('should pass for valid URL', () => {
        const result = validateFieldValue(urlField, 'https://example.com');
        expect(result.valid).toBe(true);
      });

      it('should pass for URL without protocol', () => {
        const result = validateFieldValue(urlField, 'example.com');
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid URL', () => {
        const result = validateFieldValue(urlField, 'not a url');
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('validateFieldConfig', () => {
    it('should validate text field config', () => {
      const config = { maxLength: 100, placeholder: 'Enter text' };
      const result = validateFieldConfig('text', config);
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid maxLength', () => {
      const config = { maxLength: -1 };
      const result = validateFieldConfig('text', config);
      expect(result.valid).toBe(false);
    });

    it('should validate number field config', () => {
      const config = { min: 0, max: 100, precision: 2 };
      const result = validateFieldConfig('number', config);
      expect(result.valid).toBe(true);
    });

    it('should fail when min > max', () => {
      const config = { min: 100, max: 0 };
      const result = validateFieldConfig('number', config);
      expect(result.valid).toBe(false);
    });

    it('should validate select field config', () => {
      const config = {
        options: [
          { id: 'opt1', label: 'Option 1', color: '#ff0000' },
        ],
      };
      const result = validateFieldConfig('select', config);
      expect(result.valid).toBe(true);
    });

    it('should fail for select without options', () => {
      const config = { options: [] };
      const result = validateFieldConfig('select', config);
      expect(result.valid).toBe(false);
    });
  });
});
```

### 3.3 数据库适配器测试

```typescript
// tests/unit/lib/adapters/database.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createDatabaseAdapter } from '@/lib/adapters/database';

describe('Database Adapter', () => {
  describe('PostgreSQL adapter', () => {
    const adapter = createDatabaseAdapter('postgresql');

    it('should use ILIKE for case-insensitive search', () => {
      const result = adapter.sql.ilike('name', '%test%');
      expect(result).toContain('ILIKE');
    });

    it('should use jsonb_contains for JSON contains', () => {
      const result = adapter.sql.jsonContains('data', '{"key": "value"}');
      expect(result).toContain('@>');
    });

    it('should generate correct UUID function', () => {
      const result = adapter.sql.uuid();
      expect(result).toBe('gen_random_uuid()');
    });
  });

  describe('MySQL adapter', () => {
    const adapter = createDatabaseAdapter('mysql');

    it('should use LOWER + LIKE for case-insensitive search', () => {
      const result = adapter.sql.ilike('name', '%test%');
      expect(result).toContain('LOWER');
      expect(result).toContain('LIKE');
    });

    it('should use JSON_CONTAINS for JSON contains', () => {
      const result = adapter.sql.jsonContains('data', '{"key": "value"}');
      expect(result).toContain('JSON_CONTAINS');
    });

    it('should generate correct UUID function', () => {
      const result = adapter.sql.uuid();
      expect(result).toBe('UUID()');
    });
  });

  describe('Type mappings', () => {
    const pgAdapter = createDatabaseAdapter('postgresql');
    const mysqlAdapter = createDatabaseAdapter('mysql');

    it('should map UUID type correctly', () => {
      expect(pgAdapter.types.uuid).toBe('uuid');
      expect(mysqlAdapter.types.uuid).toBe('char(36)');
    });

    it('should map timestamp type correctly', () => {
      expect(pgAdapter.types.timestamp).toBe('timestamp');
      expect(mysqlAdapter.types.timestamp).toBe('datetime');
    });

    it('should map boolean type correctly', () => {
      expect(pgAdapter.types.boolean).toBe('boolean');
      expect(mysqlAdapter.types.boolean).toBe('tinyint(1)');
    });
  });
});
```

### 3.4 国际化工具测试

```typescript
// tests/unit/lib/i18n.test.ts
import { describe, it, expect } from 'vitest';
import { 
  formatDate, 
  formatNumber, 
  formatCurrency,
  formatRelativeTime,
} from '@/lib/i18n/formatters';

describe('I18n Formatters', () => {
  describe('formatDate', () => {
    const date = new Date('2024-06-15T10:30:00Z');

    it('should format date in English', () => {
      const result = formatDate(date, 'en', 'medium');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date in Chinese', () => {
      const result = formatDate(date, 'zh-CN', 'medium');
      expect(result).toContain('2024');
      expect(result).toContain('6');
      expect(result).toContain('15');
    });

    it('should handle different formats', () => {
      const short = formatDate(date, 'en', 'short');
      const long = formatDate(date, 'en', 'long');
      expect(short.length).toBeLessThan(long.length);
    });
  });

  describe('formatNumber', () => {
    it('should format number with locale-specific separators', () => {
      const result = formatNumber(1234567.89, 'en');
      expect(result).toContain(',');
    });

    it('should format number in Chinese locale', () => {
      const result = formatNumber(1234567.89, 'zh-CN');
      expect(result).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      const result = formatCurrency(1234.56, 'en', 'USD');
      expect(result).toContain('$');
      expect(result).toContain('1,234.56');
    });

    it('should format CNY currency', () => {
      const result = formatCurrency(1234.56, 'zh-CN', 'CNY');
      expect(result).toContain('¥');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format "just now"', () => {
      const date = new Date();
      const result = formatRelativeTime(date, 'en');
      expect(result).toMatch(/just now|seconds ago/i);
    });

    it('should format "yesterday"', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date, 'en');
      expect(result).toMatch(/yesterday|1 day/i);
    });

    it('should format in Chinese', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date, 'zh-CN');
      expect(result).toMatch(/昨天|1 天/);
    });
  });
});
```

---

## 四、集成测试用例

### 4.1 认证测试

```typescript
// tests/integration/auth/ldap.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/ldap/route';
import { LDAPAuthService } from '@/lib/adapters/auth/ldap';

vi.mock('@/lib/adapters/auth/ldap');

describe('LDAP Authentication API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should authenticate valid LDAP user', async () => {
    const mockUser = {
      id: 'ldap-user-1',
      email: 'john@example.com',
      fullName: 'John Doe',
      groups: ['cn=developers,ou=groups,dc=example,dc=com'],
    };

    vi.mocked(LDAPAuthService.prototype.authenticate).mockResolvedValue(mockUser);

    const request = new Request('http://localhost/api/auth/ldap', {
      method: 'POST',
      body: JSON.stringify({
        username: 'john.doe',
        password: 'valid-password',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe('john@example.com');
    expect(data.data.session).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    vi.mocked(LDAPAuthService.prototype.authenticate).mockResolvedValue(null);

    const request = new Request('http://localhost/api/auth/ldap', {
      method: 'POST',
      body: JSON.stringify({
        username: 'john.doe',
        password: 'wrong-password',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('LDAP_AUTH_FAILED');
  });

  it('should handle LDAP connection errors', async () => {
    vi.mocked(LDAPAuthService.prototype.authenticate).mockRejectedValue(
      new Error('Connection refused')
    );

    const request = new Request('http://localhost/api/auth/ldap', {
      method: 'POST',
      body: JSON.stringify({
        username: 'john.doe',
        password: 'password',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error.code).toBe('LDAP_CONNECTION_ERROR');
  });

  it('should validate request body', async () => {
    const request = new Request('http://localhost/api/auth/ldap', {
      method: 'POST',
      body: JSON.stringify({
        username: '',
        password: '',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### 4.2 组织管理测试

```typescript
// tests/integration/organization/crud.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createOrganization, 
  getOrganization, 
  updateOrganization,
  deleteOrganization,
} from '@/actions/organizations';
import { prisma } from '@/lib/prisma';
import { createMockUser, createMockOrganization } from '@/tests/factories';

vi.mock('@/lib/prisma');

describe('Organization CRUD Operations', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization with valid data', async () => {
      const input = {
        name: 'Test Organization',
        description: 'A test organization',
      };

      const mockOrg = createMockOrganization({ ...input, createdBy: mockUser.id });
      vi.mocked(prisma.organization.create).mockResolvedValue(mockOrg as any);
      vi.mocked(prisma.organizationMember.create).mockResolvedValue({} as any);

      const result = await createOrganization(input);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(input.name);
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(prisma.organizationMember.create).toHaveBeenCalled();
    });

    it('should auto-generate slug from name', async () => {
      const input = { name: 'My Awesome Organization' };

      vi.mocked(prisma.organization.create).mockImplementation(async (args: any) => {
        return { ...args.data, id: 'org-1' } as any;
      });
      vi.mocked(prisma.organizationMember.create).mockResolvedValue({} as any);

      const result = await createOrganization(input);

      expect(result.success).toBe(true);
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/my-awesome-organization/i),
          }),
        })
      );
    });

    it('should reject duplicate slug', async () => {
      vi.mocked(prisma.organization.create).mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug'] },
      });

      const result = await createOrganization({ name: 'Existing Org' });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SLUG_TAKEN');
    });

    it('should validate name length', async () => {
      const result = await createOrganization({ name: '' });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getOrganization', () => {
    it('should return organization with details', async () => {
      const mockOrg = createMockOrganization();
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any);

      const result = await getOrganization(mockOrg.id);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockOrg.id);
    });

    it('should return not found for invalid id', async () => {
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      const result = await getOrganization('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NOT_FOUND');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization name', async () => {
      const mockOrg = createMockOrganization();
      vi.mocked(prisma.organization.update).mockResolvedValue({
        ...mockOrg,
        name: 'Updated Name',
      } as any);

      const result = await updateOrganization(mockOrg.id, { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Name');
    });

    it('should require permission to update', async () => {
      // Mock permission check to fail
      vi.mocked(prisma.organizationMember.findUnique).mockResolvedValue(null);

      const result = await updateOrganization('org-1', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization with correct confirmation', async () => {
      const mockOrg = createMockOrganization({ name: 'Test Org' });
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any);
      vi.mocked(prisma.organization.delete).mockResolvedValue(mockOrg as any);

      const result = await deleteOrganization(mockOrg.id, 'Test Org');

      expect(result.success).toBe(true);
      expect(prisma.organization.delete).toHaveBeenCalledWith({
        where: { id: mockOrg.id },
      });
    });

    it('should reject incorrect confirmation phrase', async () => {
      const mockOrg = createMockOrganization({ name: 'Test Org' });
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any);

      const result = await deleteOrganization(mockOrg.id, 'Wrong Name');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(prisma.organization.delete).not.toHaveBeenCalled();
    });
  });
});
```

### 4.3 任务操作测试

```typescript
// tests/integration/task/crud.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createTask, 
  updateTask, 
  updateTaskFieldValue,
  moveTask,
  deleteTask,
  bulkUpdateTasks,
} from '@/actions/tasks';
import { prisma } from '@/lib/prisma';
import { createMockTask, createMockProject, createMockField } from '@/tests/factories';

vi.mock('@/lib/prisma');

describe('Task Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create task with required fields', async () => {
      const input = {
        projectId: 'proj-1',
        title: 'New Task',
      };

      const mockTask = createMockTask(input);
      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      const result = await createTask(input);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('New Task');
    });

    it('should create task with custom fields', async () => {
      const input = {
        projectId: 'proj-1',
        title: 'Task with Fields',
        fields: [
          { fieldId: 'priority-field', value: 'high' },
          { fieldId: 'due-date-field', value: '2024-12-31' },
        ],
      };

      const mockTask = createMockTask(input);
      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);
      vi.mocked(prisma.fieldValue.createMany).mockResolvedValue({ count: 2 });

      const result = await createTask(input);

      expect(result.success).toBe(true);
      expect(prisma.fieldValue.createMany).toHaveBeenCalled();
    });

    it('should create subtask under parent', async () => {
      const input = {
        projectId: 'proj-1',
        title: 'Subtask',
        parentId: 'parent-task-id',
        taskType: 'subtask',
      };

      const mockTask = createMockTask(input);
      vi.mocked(prisma.task.create).mockResolvedValue(mockTask as any);

      const result = await createTask(input);

      expect(result.success).toBe(true);
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentId: 'parent-task-id',
            taskType: 'subtask',
          }),
        })
      );
    });

    it('should validate title is not empty', async () => {
      const result = await createTask({
        projectId: 'proj-1',
        title: '',
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('updateTaskFieldValue', () => {
    it('should update existing field value', async () => {
      vi.mocked(prisma.fieldValue.upsert).mockResolvedValue({
        id: 'fv-1',
        taskId: 'task-1',
        fieldDefinitionId: 'field-1',
        textValue: 'high',
      } as any);

      const result = await updateTaskFieldValue('task-1', 'field-1', 'high');

      expect(result.success).toBe(true);
      expect(prisma.fieldValue.upsert).toHaveBeenCalled();
    });

    it('should validate field value', async () => {
      const mockField = createMockField('number', {
        config: { min: 0, max: 100 },
      });
      vi.mocked(prisma.fieldDefinition.findUnique).mockResolvedValue(mockField as any);

      const result = await updateTaskFieldValue('task-1', 'field-1', 150);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('moveTask', () => {
    it('should move task to different status', async () => {
      vi.mocked(prisma.task.update).mockResolvedValue({
        id: 'task-1',
        statusId: 'new-status',
        position: 1,
      } as any);

      const result = await moveTask({
        taskId: 'task-1',
        targetStatusId: 'new-status',
        position: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should update positions of other tasks', async () => {
      vi.mocked(prisma.task.update).mockResolvedValue({} as any);
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 3 });

      await moveTask({
        taskId: 'task-1',
        targetStatusId: 'status-1',
        position: 2,
      });

      expect(prisma.task.updateMany).toHaveBeenCalled();
    });

    it('should handle cross-project move', async () => {
      vi.mocked(prisma.task.update).mockResolvedValue({
        id: 'task-1',
        projectId: 'new-project',
      } as any);

      const result = await moveTask({
        taskId: 'task-1',
        targetProjectId: 'new-project',
      });

      expect(result.success).toBe(true);
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'new-project',
          }),
        })
      );
    });
  });

  describe('bulkUpdateTasks', () => {
    it('should update multiple tasks', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 3 });

      const result = await bulkUpdateTasks({
        taskIds: ['task-1', 'task-2', 'task-3'],
        updates: {
          statusId: 'done',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.updatedCount).toBe(3);
    });

    it('should handle partial failures', async () => {
      vi.mocked(prisma.task.update)
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce({} as any);

      const result = await bulkUpdateTasks({
        taskIds: ['task-1', 'task-2', 'task-3'],
        updates: {
          assigneeId: 'user-1',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.updatedCount).toBe(2);
      expect(result.data.failedCount).toBe(1);
    });
  });
});
```

---

## 五、端到端测试用例

### 5.1 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 认证流程测试

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('validpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show LDAP login option when enabled', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /enterprise/i })).toBeVisible();
    
    await page.getByRole('tab', { name: /enterprise/i }).click();
    
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/domain/i)).toBeVisible();
  });
});
```

### 5.3 任务管理流程测试

```typescript
// tests/e2e/task/task-crud.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to project
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
    
    // Navigate to a project
    await page.getByRole('link', { name: /test project/i }).click();
    await page.waitForURL(/\/projects\//);
  });

  test('should create a new task', async ({ page }) => {
    // Click add task button
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Fill task form
    await page.getByLabel(/title/i).fill('New E2E Test Task');
    await page.getByLabel(/description/i).fill('This is a test task');
    
    // Submit
    await page.getByRole('button', { name: /create/i }).click();
    
    // Verify task appears
    await expect(page.getByText('New E2E Test Task')).toBeVisible();
  });

  test('should edit task inline', async ({ page }) => {
    // Click on existing task
    await page.getByText('Existing Task').click();
    
    // Wait for detail panel
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Edit title
    await page.getByLabel(/title/i).fill('Updated Task Title');
    await page.keyboard.press('Tab');
    
    // Verify update
    await expect(page.getByText('Updated Task Title')).toBeVisible();
  });

  test('should drag task between columns', async ({ page }) => {
    const task = page.getByText('Task to Move');
    const targetColumn = page.getByTestId('column-in-progress');
    
    await task.dragTo(targetColumn);
    
    // Verify task is in new column
    await expect(targetColumn.getByText('Task to Move')).toBeVisible();
  });

  test('should filter tasks', async ({ page }) => {
    // Open filter
    await page.getByRole('button', { name: /filter/i }).click();
    
    // Add filter condition
    await page.getByRole('combobox', { name: /field/i }).click();
    await page.getByRole('option', { name: /priority/i }).click();
    await page.getByRole('combobox', { name: /operator/i }).click();
    await page.getByRole('option', { name: /equals/i }).click();
    await page.getByRole('combobox', { name: /value/i }).click();
    await page.getByRole('option', { name: /high/i }).click();
    
    // Apply filter
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Verify only high priority tasks shown
    const tasks = page.getByTestId('task-card');
    for (const task of await tasks.all()) {
      await expect(task.getByText(/high/i)).toBeVisible();
    }
  });

  test('should bulk select and update tasks', async ({ page }) => {
    // Select multiple tasks
    await page.keyboard.down('Shift');
    await page.getByTestId('task-card').first().click();
    await page.getByTestId('task-card').nth(2).click();
    await page.keyboard.up('Shift');
    
    // Verify selection count
    await expect(page.getByText(/3 selected/i)).toBeVisible();
    
    // Bulk update status
    await page.getByRole('button', { name: /change status/i }).click();
    await page.getByRole('option', { name: /done/i }).click();
    
    // Verify tasks moved
    const doneColumn = page.getByTestId('column-done');
    await expect(doneColumn.getByTestId('task-card')).toHaveCount(3);
  });
});
```

### 5.4 视图切换测试

```typescript
// tests/e2e/view/view-switching.spec.ts
import { test, expect } from '@playwright/test';

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to project
    await page.goto('/projects/test-project');
    // Auth handled by test setup
  });

  test('should switch between views', async ({ page }) => {
    // Default should be kanban
    await expect(page.getByTestId('kanban-board')).toBeVisible();
    
    // Switch to list view
    await page.getByRole('tab', { name: /list/i }).click();
    await expect(page.getByTestId('list-view')).toBeVisible();
    
    // Switch to table view
    await page.getByRole('tab', { name: /table/i }).click();
    await expect(page.getByTestId('table-view')).toBeVisible();
    
    // Switch to calendar view
    await page.getByRole('tab', { name: /calendar/i }).click();
    await expect(page.getByTestId('calendar-view')).toBeVisible();
  });

  test('should persist view configuration', async ({ page }) => {
    // Switch to table view
    await page.getByRole('tab', { name: /table/i }).click();
    
    // Resize a column
    const resizer = page.getByTestId('column-resizer-title');
    await resizer.dragTo(resizer, { targetPosition: { x: 100, y: 0 } });
    
    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/projects/test-project/table');
    
    // Verify column width persisted
    const titleColumn = page.getByTestId('column-header-title');
    const width = await titleColumn.evaluate(el => el.offsetWidth);
    expect(width).toBeGreaterThan(150);
  });

  test('should create custom view', async ({ page }) => {
    // Click add view
    await page.getByRole('button', { name: /add view/i }).click();
    
    // Fill view form
    await page.getByLabel(/name/i).fill('My Custom View');
    await page.getByLabel(/type/i).click();
    await page.getByRole('option', { name: /kanban/i }).click();
    
    // Configure view
    await page.getByLabel(/group by/i).click();
    await page.getByRole('option', { name: /assignee/i }).click();
    
    // Save
    await page.getByRole('button', { name: /create/i }).click();
    
    // Verify view appears in tabs
    await expect(page.getByRole('tab', { name: 'My Custom View' })).toBeVisible();
  });
});
```

---

## 六、性能测试

### 6.1 性能指标目标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| 首次内容绘制 (FCP) | < 1.5s | Lighthouse |
| 最大内容绘制 (LCP) | < 2.5s | Lighthouse |
| 首次输入延迟 (FID) | < 100ms | Lighthouse |
| 累积布局偏移 (CLS) | < 0.1 | Lighthouse |
| API 响应时间 (P95) | < 500ms | 自定义监控 |
| 任务列表加载 (1000条) | < 2s | 自定义测试 |

### 6.2 性能测试用例

```typescript
// tests/performance/api-response.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('API Performance', () => {
  const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';

  it('should load tasks under 500ms', async () => {
    const start = performance.now();
    
    const response = await fetch(`${API_BASE}/api/v1/projects/test/tasks?limit=100`);
    await response.json();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      fetch(`${API_BASE}/api/v1/projects/test/tasks`)
    );
    
    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;
    
    // All concurrent requests should complete within 2s
    expect(duration).toBeLessThan(2000);
  });

  it('should efficiently load large task lists', async () => {
    const start = performance.now();
    
    const response = await fetch(`${API_BASE}/api/v1/projects/large-project/tasks?limit=1000`);
    const data = await response.json();
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
    expect(data.data.length).toBe(1000);
  });
});
```

---

## 七、安全测试

### 7.1 安全测试清单

| 测试类型 | 测试项 | 验证方法 |
|----------|--------|----------|
| 认证 | 密码强度验证 | 单元测试 |
| 认证 | 暴力破解防护 | 集成测试 |
| 认证 | Session 过期 | E2E 测试 |
| 授权 | 权限检查 | 单元测试 + 集成测试 |
| 授权 | 资源隔离 | 集成测试 |
| 注入 | SQL 注入 | 自动化扫描 |
| 注入 | XSS 防护 | E2E 测试 |
| 数据 | 敏感数据加密 | 代码审查 |
| 数据 | 数据泄露防护 | 集成测试 |

### 7.2 安全测试用例

```typescript
// tests/security/authorization.test.ts
import { describe, it, expect } from 'vitest';
import { getTask, updateTask, deleteTask } from '@/actions/tasks';
import { setTestUser } from '@/tests/helpers';

describe('Authorization Security', () => {
  describe('Task Access Control', () => {
    it('should deny access to tasks in other organizations', async () => {
      setTestUser({ id: 'user-1', organizationIds: ['org-1'] });
      
      const result = await getTask('task-in-org-2');
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should deny update without permission', async () => {
      setTestUser({ 
        id: 'user-1', 
        organizationIds: ['org-1'],
        permissions: ['task:read'],
      });
      
      const result = await updateTask('task-1', { title: 'New Title' });
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should deny delete without permission', async () => {
      setTestUser({ 
        id: 'user-1', 
        permissions: ['task:read', 'task:update'],
      });
      
      const result = await deleteTask('task-1');
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Data Isolation', () => {
    it('should not leak data in error messages', async () => {
      setTestUser({ id: 'user-1', organizationIds: ['org-1'] });
      
      const result = await getTask('task-in-org-2');
      
      // Error should not contain task details
      expect(result.error.message).not.toContain('secret');
      expect(result.error.message).not.toContain('org-2');
      expect(JSON.stringify(result.error)).not.toMatch(/password|token|secret/i);
    });

    it('should filter sensitive fields from response', async () => {
      setTestUser({ id: 'admin', permissions: ['*'] });
      
      const result = await getTask('task-1');
      
      // Sensitive fields should not be exposed
      expect(result.data).not.toHaveProperty('internalNotes');
      expect(result.data).not.toHaveProperty('auditLog');
    });
  });
});

// tests/security/injection.test.ts
describe('Injection Prevention', () => {
  it('should sanitize search input', async () => {
    const maliciousInput = "'; DROP TABLE tasks; --";
    
    const result = await searchTasks({ query: maliciousInput });
    
    // Should not throw, should return empty results
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should escape HTML in task content', async () => {
    const xssPayload = '<script>alert("xss")</script>';
    
    const result = await createTask({
      projectId: 'proj-1',
      title: xssPayload,
    });
    
    expect(result.data.title).not.toContain('<script>');
  });

  it('should validate file upload types', async () => {
    const maliciousFile = new File(['malicious'], 'script.php', {
      type: 'application/x-php',
    });
    
    const result = await uploadTaskAttachment('task-1', maliciousFile);
    
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('INVALID_FILE_TYPE');
  });
});
```

---

## 附录

### A. 测试命令

```bash
# 运行所有单元测试
pnpm test

# 运行单元测试并生成覆盖率报告
pnpm test:coverage

# 运行集成测试
pnpm test:integration

# 运行 E2E 测试
pnpm test:e2e

# 运行 E2E 测试 (带 UI)
pnpm test:e2e:ui

# 运行性能测试
pnpm test:performance

# 运行安全测试
pnpm test:security
```

### B. CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### C. 相关文档

- [06-implementation-roadmap.md](./06-implementation-roadmap.md) - 实施路线图
