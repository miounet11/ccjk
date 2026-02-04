# Database Migration

Generate and manage database migrations with proper rollback support.

## Triggers

- **command**: `/migrate` - Trigger with slash command
- **pattern**: `create migration` - Natural language trigger
- **pattern**: `创建数据库迁移` - Chinese language trigger
- **pattern**: `database schema change` - Alternative trigger

## Actions

### Action 1: prompt

Analyze schema changes needed.

```
Analyze the database schema changes:

1. **Change Type**
   - Create new table
   - Alter existing table
   - Drop table
   - Add/modify/drop columns
   - Add/modify/drop indexes
   - Add/modify constraints

2. **Data Impact**
   - Data migration needed
   - Data transformation required
   - Potential data loss
   - Backward compatibility

3. **Dependencies**
   - Foreign key relationships
   - Dependent tables
   - Application code changes needed

4. **Performance Impact**
   - Index requirements
   - Query performance
   - Migration duration
   - Locking concerns
```

### Action 2: prompt

Generate migration files.

```
Generate database migration with:

1. **Up Migration**
   - SQL or ORM code to apply changes
   - Proper transaction handling
   - Index creation
   - Data migration if needed

2. **Down Migration**
   - Rollback SQL or ORM code
   - Restore previous state
   - Handle data rollback

3. **Safety Checks**
   - Validation before migration
   - Backup recommendations
   - Dry-run capability

Support formats:
- Prisma migrations
- Drizzle migrations
- TypeORM migrations
- Raw SQL migrations

Example (Prisma):
```sql
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
```
```

### Action 3: prompt

Generate migration testing strategy.

```
Create migration testing plan:

1. **Pre-Migration Tests**
   - Backup verification
   - Schema validation
   - Data integrity checks

2. **Migration Tests**
   - Test on staging environment
   - Verify data migration
   - Check application compatibility

3. **Post-Migration Tests**
   - Schema verification
   - Data integrity validation
   - Performance testing
   - Rollback testing

4. **Monitoring**
   - Query performance
   - Error rates
   - Application health
```

### Action 4: write

Write migration files.

```
Write migration to appropriate directory:
- Prisma: prisma/migrations/
- Drizzle: drizzle/migrations/
- TypeORM: src/migrations/
```

## Requirements

- **tool**: prisma|drizzle|typeorm - ORM must be installed
- **context**: database-project - Must have database configuration

---

**Category:** database
**Priority:** 8
**Tags:** database, migration, schema, sql, orm
**Source:** smart-analysis
