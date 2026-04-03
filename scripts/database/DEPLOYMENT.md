# Kanba Database Deployment Guide

## Supported Databases

Kanba supports three database configurations:

1. **Supabase** (default, recommended for quick start)
2. **PostgreSQL** (self-hosted or cloud)
3. **MySQL** (self-hosted or cloud)

---

## Option 1: Supabase (Default)

### Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project credentials from Settings > API
3. Set environment variables:

```bash
DATABASE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Initialize Database
Run the SQL script in Supabase SQL Editor:
```sql
-- Copy contents of scripts/database/supabase/init.sql
```

Or use the v0 integration which handles this automatically.

---

## Option 2: PostgreSQL

### Requirements
- PostgreSQL 14 or higher
- UUID extension enabled

### Setup

1. Create a database:
```bash
createdb kanba
```

2. Set environment variables:
```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/kanba
```

3. Initialize the database:
```bash
psql -d kanba -f scripts/database/postgresql/init.sql
```

### Cloud PostgreSQL Providers
- **Neon**: `DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/kanba`
- **Supabase Postgres**: Use the direct connection string from project settings
- **AWS RDS**: `DATABASE_URL=postgresql://user:pass@xxx.rds.amazonaws.com:5432/kanba`
- **Railway**: Use the provided PostgreSQL connection string
- **PlanetScale** (PostgreSQL mode): Use the provided connection string

### Connection Pooling (Production)
For production, use connection pooling:

```bash
# Using pgBouncer
DATABASE_URL=postgresql://user:pass@localhost:6432/kanba?pgbouncer=true

# Neon with pooler
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/kanba?sslmode=require
```

---

## Option 3: MySQL

### Requirements
- MySQL 8.0 or higher
- UTF-8 mb4 character set

### Setup

1. Create a database:
```sql
CREATE DATABASE kanba CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Set environment variables:
```bash
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://user:password@localhost:3306/kanba
```

3. Initialize the database:
```bash
mysql -u user -p kanba < scripts/database/mysql/init.sql
```

### Cloud MySQL Providers
- **PlanetScale**: `DATABASE_URL=mysql://user:pass@xxx.connect.psdb.cloud/kanba?sslaccept=strict`
- **AWS RDS MySQL**: `DATABASE_URL=mysql://user:pass@xxx.rds.amazonaws.com:3306/kanba`
- **DigitalOcean**: Use the provided MySQL connection string

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_PROVIDER` | Database type | `supabase`, `postgresql`, `mysql` |
| `DATABASE_URL` | Connection string (PostgreSQL/MySQL) | `postgresql://...` |

### Supabase Specific

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_SSL` | Enable SSL | `true` for cloud |
| `DATABASE_POOL_MIN` | Min pool connections | `2` |
| `DATABASE_POOL_MAX` | Max pool connections | `10` |

---

## Default Admin Account

After initialization, a default admin account is created:

- **Email**: `admin@kanba.local`
- **Password**: `admin123`

**IMPORTANT**: Change this password immediately in production!

```sql
-- Update admin password (use bcrypt hash)
UPDATE profiles 
SET password_hash = '$2a$12$YOUR_NEW_HASH' 
WHERE email = 'admin@kanba.local';
```

---

## Database Migration

When upgrading Kanba, run migration scripts in order:

```bash
# PostgreSQL
psql -d kanba -f scripts/database/migrations/001_add_feature.sql
psql -d kanba -f scripts/database/migrations/002_add_another.sql

# MySQL
mysql -u user -p kanba < scripts/database/migrations/001_add_feature.sql
mysql -u user -p kanba < scripts/database/migrations/002_add_another.sql
```

---

## Backup & Restore

### PostgreSQL
```bash
# Backup
pg_dump kanba > backup.sql

# Restore
psql kanba < backup.sql
```

### MySQL
```bash
# Backup
mysqldump -u user -p kanba > backup.sql

# Restore
mysql -u user -p kanba < backup.sql
```

---

## Troubleshooting

### Connection Issues

1. **SSL required**: Add `?sslmode=require` to PostgreSQL URL
2. **Connection timeout**: Increase pool timeout or check firewall
3. **Too many connections**: Use connection pooling

### Common Errors

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Check database is running and accessible |
| `authentication failed` | Verify username/password |
| `database does not exist` | Create the database first |
| `SSL required` | Add SSL parameters to connection string |
| `relation does not exist` | Run init.sql script |

---

## Performance Tuning

### PostgreSQL
```sql
-- Add more indexes for large datasets
CREATE INDEX CONCURRENTLY idx_tasks_created_at ON tasks(created_at);
CREATE INDEX CONCURRENTLY idx_tasks_search ON tasks USING GIN (to_tsvector('english', title || ' ' || description));
```

### MySQL
```sql
-- Optimize for read-heavy workloads
SET GLOBAL innodb_buffer_pool_size = 1G;
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong database passwords
- [ ] Enable SSL for database connections
- [ ] Restrict database access to application servers only
- [ ] Enable Row Level Security (Supabase/PostgreSQL)
- [ ] Regular backups
- [ ] Keep database software updated
