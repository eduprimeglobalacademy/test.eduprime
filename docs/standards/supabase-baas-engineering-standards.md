# Supabase Backend-as-a-Service Engineering Standards

## Purpose

Standards for applications using Supabase as the backend platform.

Supabase should be treated as a real PostgreSQL backend plus managed
Auth, Data API, Storage, Realtime, Edge Functions, and related
PostgreSQL capabilities---not simply as a hosted database. PostgreSQL is
the core of the platform. [Supabase
architecture](https://supabase.com/docs/guides/getting-started/architecture)

------------------------------------------------------------------------

# 1. Core Principles

1.  PostgreSQL is the source of truth for relational business data.
2.  RLS is the primary authorization boundary for client-accessible
    data.
3.  Never expose privileged service credentials to browsers.
4.  Version-control database schema through migrations.
5.  Use database constraints in addition to application validation.
6.  Keep sensitive/server-only logic in Edge Functions or another
    trusted backend.
7.  Use Storage for files rather than large binary database fields.
8.  Use Realtime only when real-time behavior is actually required.
9.  Keep development, staging, and production projects separate.
10. Generate database types where practical.
11. Monitor database, Auth, Storage, Realtime, and Functions.
12. Prefer standard PostgreSQL patterns where practical for portability.

------------------------------------------------------------------------

# 2. Architecture

A typical architecture:

``` text
Frontend
   |
   +-- Supabase Auth
   |
   +-- Data API + RLS
   |
   +-- Storage
   |
   +-- Realtime
   |
   +-- Edge Functions
             |
             +-- Payments
             +-- Email
             +-- AI APIs
             +-- Webhooks
   |
 PostgreSQL
```

Supabase's platform integrates Auth, PostgREST/Data API, Realtime,
Storage, and Edge Functions around PostgreSQL.

------------------------------------------------------------------------

# 3. Direct Browser Access

Direct browser access is acceptable for simple operations when:

``` text
Authenticated user
+
Correct RLS policies
+
No privileged secret
+
Safe API surface
```

Example:

``` text
Browser
  ↓
Supabase client
  ↓
JWT
  ↓
RLS
  ↓
Postgres
```

Do not create a custom backend endpoint for every CRUD operation if RLS
already provides a correct security boundary.

------------------------------------------------------------------------

# 4. When to Use Edge Functions / Server Backend

Use server-side code for:

-   Secret API keys
-   Payments
-   Webhooks
-   Third-party integrations
-   Privileged operations
-   Complex business workflows
-   Sensitive business logic
-   AI provider calls
-   Multi-step orchestration

Example:

``` text
Browser
  ↓
Edge Function
  ↓
Stripe / OpenAI / other provider
  ↓
Postgres
```

Supabase Edge Functions are server-side TypeScript functions intended
for HTTP endpoints, webhooks, integrations and other server-side
workloads. [Edge Functions](https://supabase.com/docs/guides/functions)

------------------------------------------------------------------------

# 5. Service Role Key

Treat the service-role credential as a production secret.

Never expose it through:

``` text
NEXT_PUBLIC_*
VITE_*
browser code
client bundles
Git
logs
```

Use it only in trusted server-side environments.

The service role is privileged and can bypass normal RLS protections.

------------------------------------------------------------------------

# 6. Authentication vs Authorization

Authentication:

``` text
Who are you?
```

Authorization:

``` text
What are you allowed to access?
```

Supabase Auth provides authentication and integrates with PostgreSQL RLS
for authorization. [Supabase
Auth](https://supabase.com/docs/guides/auth)

Do not implement authorization only in the frontend.

------------------------------------------------------------------------

# 7. User Model

Keep application profile data separate from Supabase Auth.

Preferred model:

``` text
auth.users
     |
     | foreign key
     v
public.profiles
```

Use the Auth user's UUID consistently:

``` sql
user_id uuid references auth.users(id)
```

Do not duplicate passwords or authentication credentials in application
tables.

------------------------------------------------------------------------

# 8. Multi-Tenant Applications

For SaaS applications explicitly model tenancy:

``` text
organizations
    |
    +-- memberships
    +-- projects
    +-- orders
    +-- billing
```

Tenant-owned tables should normally have:

``` text
organization_id
```

RLS must enforce tenant isolation.

Never trust:

``` text
organization_id
```

sent by the frontend without authorization checks.

------------------------------------------------------------------------

# 9. Row Level Security

RLS is a fundamental Supabase security boundary.

Any table exposed to client access should have intentional RLS policies.
Supabase recommends enabling RLS on exposed tables.
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Example:

``` sql
alter table orders enable row level security;
```

Then define policies for the exact operations required.

------------------------------------------------------------------------

# 10. RLS Policy Standards

Treat these separately:

``` text
SELECT
INSERT
UPDATE
DELETE
```

Use:

``` text
USING
```

to control accessible existing rows.

Use:

``` text
WITH CHECK
```

to control rows that can be inserted/updated.

A user who can read a record should not automatically be able to modify
or delete it.

------------------------------------------------------------------------

# 11. Ownership

Do not trust client-supplied ownership.

Bad:

``` json
{
  "user_id": "another-user"
}
```

and then accepting it.

Prefer:

``` text
auth.uid()
```

or an RLS policy based on the authenticated identity.

------------------------------------------------------------------------

# 12. Authorization Data

Do not rely on user-editable metadata for authorization.

For example, do not trust:

``` text
user_metadata.role = "admin"
```

as a security boundary.

Authorization should be based on controlled application data,
memberships, RLS, and carefully managed claims where needed.

------------------------------------------------------------------------

# 13. Database Constraints

Use database constraints for integrity:

``` text
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
```

Examples:

``` text
email UNIQUE
quantity CHECK (quantity > 0)
organization_id NOT NULL
```

RLS protects access; constraints protect data integrity.

------------------------------------------------------------------------

# 14. Business Logic Placement

Use the right layer:

``` text
Frontend
→ UX validation

RLS
→ Authorization

Database constraints
→ Data integrity

Database functions / RPC
→ Atomic data-local operations

Edge Functions / server
→ Secrets, integrations, orchestration

Workers
→ Long-running asynchronous work
```

Do not put all business logic into RLS policies.

------------------------------------------------------------------------

# 15. Database Functions / RPC

Use database functions when logic:

-   Is strongly data-local
-   Needs database atomicity
-   Benefits from SQL
-   Represents a meaningful database operation

Good examples:

``` text
complete_order()
claim_job()
transfer_balance()
```

Do not turn every simple CRUD query into an RPC.

------------------------------------------------------------------------

# 16. Transactions

Use transactions for operations requiring atomicity.

Example:

``` text
Create order
+
Create order items
+
Reserve inventory
```

should have an explicit consistency boundary.

Do not coordinate critical multi-step writes from the browser and assume
network failures cannot occur.

------------------------------------------------------------------------

# 17. Database Migrations

Schema changes must be version-controlled.

Preferred flow:

``` text
Local
 ↓
Migration
 ↓
Git
 ↓
CI
 ↓
Staging
 ↓
Production
```

Use the Supabase CLI/local development workflow for reproducible
database changes. [Supabase CLI](https://supabase.com/docs)

Avoid important production schema changes existing only as manual
Dashboard actions.

------------------------------------------------------------------------

# 18. Migration Rules

Migrations should be:

``` text
Small
Ordered
Reviewable
Reproducible
Tested
```

After a migration is applied to shared environments:

``` text
Do not rewrite it.
```

Create a new migration instead.

------------------------------------------------------------------------

# 19. Local Development

Use local Supabase development where practical.

Develop against:

``` text
Local Postgres
Local Auth
Local Storage
Local Functions
```

rather than repeatedly modifying staging/production.

------------------------------------------------------------------------

# 20. Environment Separation

Use separate projects/environments where appropriate:

``` text
Development
Staging
Production
```

Do not use production credentials for local development.

Keep:

``` text
URLs
keys
secrets
database data
storage
```

separate between environments.

------------------------------------------------------------------------

# 21. Generated Database Types

Generate application types from the database schema where practical.

Preferred flow:

``` text
Postgres schema
 ↓
Generated types
 ↓
Application
```

This reduces:

``` text
Column name mistakes
Type mismatches
Schema drift
```

Regenerate types after migrations.

------------------------------------------------------------------------

# 22. ORM Usage

Before adding Prisma, Drizzle, or another ORM, ask:

``` text
What problem does it solve?
Who owns schema migrations?
How are RLS policies managed?
Does it duplicate Supabase functionality?
```

Avoid:

``` text
Supabase migrations
+
ORM migrations
+
manual Dashboard changes
```

all independently modifying the same schema.

There should be one clear source of truth for schema management.

------------------------------------------------------------------------

# 23. Query Standards

Prefer:

``` text
Select only needed columns
Filter in the database
Use indexes
Paginate large results
Avoid N+1 queries
Use deterministic ordering
```

Avoid uncontrolled:

``` sql
SELECT *
```

for large production queries.

------------------------------------------------------------------------

# 24. Pagination

Use offset pagination for simple/small datasets.

For large or frequently changing datasets, consider cursor/keyset
pagination.

Use stable ordering such as:

``` text
created_at + id
```

------------------------------------------------------------------------

# 25. Indexes

Create indexes based on real query patterns.

Common candidates:

``` text
Foreign keys
Frequently filtered fields
Unique lookups
Tenant + resource combinations
Frequently sorted fields
```

Do not index every column.

Indexes increase:

``` text
Storage
Write cost
Maintenance
```

------------------------------------------------------------------------

# 26. Query Performance

Use PostgreSQL tooling:

``` text
EXPLAIN
EXPLAIN ANALYZE
```

Investigate:

``` text
Sequential scans
Bad joins
Missing indexes
Large sorts
Unexpected row counts
Slow queries
```

Do not assume the BaaS layer is the bottleneck.

------------------------------------------------------------------------

# 27. Connection Management

Serverless/edge workloads can create many concurrent database
connections.

Use Supabase's documented pooling/connection strategies appropriately,
including Supavisor where suitable.

Avoid creating uncontrolled direct PostgreSQL connections from highly
concurrent serverless code.

------------------------------------------------------------------------

# 28. Storage

Use Supabase Storage for:

``` text
Images
PDFs
Documents
Videos
Large files
```

Store metadata in PostgreSQL:

``` text
owner_id
bucket
object_path
metadata
created_at
```

Supabase Storage integrates with PostgreSQL and supports policy-based
access control.

------------------------------------------------------------------------

# 29. Storage Buckets

Separate buckets by security/business purpose:

``` text
public-assets
user-avatars
private-documents
organization-files
```

Do not put sensitive files into public buckets for convenience.

------------------------------------------------------------------------

# 30. Storage Authorization

Authorization should consider:

``` text
User
Organization
Bucket
Object path
Operation
```

Do not treat knowledge of an object path as authorization.

Use Storage policies.

------------------------------------------------------------------------

# 31. Private Files

For private files, prefer controlled access such as short-lived signed
URLs.

Typical flow:

``` text
User requests file
 ↓
Authorization check
 ↓
Signed URL
 ↓
Download
```

Do not make sensitive files permanently public.

------------------------------------------------------------------------

# 32. File Uploads

Validate:

``` text
File size
MIME type
Extension
Ownership
Destination
```

For high-risk uploads consider:

``` text
Content inspection
Malware scanning
Rate limits
Quotas
```

Never trust only client-provided MIME type or filename.

------------------------------------------------------------------------

# 33. Realtime

Use Realtime when live synchronization provides real product value.

Possible uses:

``` text
Live dashboards
Chat
Presence
Collaborative state
Database change notifications
```

Do not enable Realtime for everything.

Supabase Realtime provides database change streaming plus broadcast and
presence capabilities.

------------------------------------------------------------------------

# 34. Realtime Security

Scope subscriptions by:

``` text
User
Organization
Resource
Channel
```

Do not expose an organization's entire event stream to every
authenticated user.

------------------------------------------------------------------------

# 35. Realtime Is Not the Source of Truth

A good pattern is:

``` text
Initial query
 ↓
Realtime subscription
 ↓
Change event
 ↓
Update/refetch local state
```

The database remains authoritative.

------------------------------------------------------------------------

# 36. Edge Functions

Use Edge Functions for:

``` text
Webhooks
Payments
Email
Third-party APIs
AI APIs
Privileged operations
Sensitive workflows
```

Keep functions:

``` text
Small
Stateless
Idempotent
Observable
Timeout-aware
```

Supabase notes that Edge Functions can have cold starts and are best
suited to short-lived server-side work; long-running jobs should move to
background workers. [Edge
Functions](https://supabase.com/docs/guides/functions)

------------------------------------------------------------------------

# 37. Edge Function Authentication

For authenticated functions:

``` text
Client
 ↓
JWT
 ↓
Function
 ↓
Validate caller
 ↓
RLS-scoped operation
```

Keep authentication/JWT verification enabled for authenticated user
functions where appropriate.

------------------------------------------------------------------------

# 38. Webhooks

Webhook handlers should:

``` text
Verify signature
Validate payload
Be idempotent
Respond quickly
Avoid long synchronous processing
```

Preferred:

``` text
Webhook
 ↓
Verify
 ↓
Persist event
 ↓
Return success
 ↓
Process asynchronously
```

------------------------------------------------------------------------

# 39. Secrets

Store server secrets using Supabase's secret mechanism or the hosting
platform's secret manager.

Examples:

``` text
OPENAI_API_KEY
STRIPE_SECRET_KEY
SERVICE_ROLE_KEY
```

Never commit them to Git or expose them through client bundles.

------------------------------------------------------------------------

# 40. AI Applications

Preferred:

``` text
Frontend
 ↓
Edge Function / trusted server
 ↓
AI Provider
 ↓
Supabase
```

Do not call privileged AI APIs directly from the browser.

Track where appropriate:

``` text
Model
Prompt version
Token usage
Cost
Latency
Result status
```

Apply privacy rules to prompts and outputs.

------------------------------------------------------------------------

# 41. Background Jobs

Do not use a synchronous HTTP request for long-running work.

Prefer:

``` text
Request
 ↓
Create job
 ↓
Queue
 ↓
Worker
 ↓
Update job status
```

Use Supabase/Postgres queue capabilities or external queue
infrastructure according to workload requirements.

------------------------------------------------------------------------

# 42. Long-Running Processing

Avoid:

``` text
POST /generate
 ↓
10-minute request
```

Prefer:

``` text
POST /jobs
 ↓
job_id
 ↓
background worker
 ↓
completed
```

The client can:

``` text
Poll
Realtime subscribe
Receive webhook
```

depending on the product.

------------------------------------------------------------------------

# 43. Database Triggers

Use triggers for small, predictable data-local behavior.

Good:

``` text
Maintain updated_at
Create audit row
Maintain simple derived state
```

Avoid deeply chained triggers:

``` text
INSERT
 ↓
Trigger A
 ↓
Trigger B
 ↓
Trigger C
 ↓
External side effect
```

These become difficult to debug.

------------------------------------------------------------------------

# 44. Security Definer Functions

Use `SECURITY DEFINER` only when required.

When used:

``` text
Set safe search_path
Restrict EXECUTE
Validate inputs
Review privilege escalation
```

Treat security-definer functions as security-sensitive code.

------------------------------------------------------------------------

# 45. Views

Review views for RLS behavior.

Do not assume a view automatically has the same security behavior as its
underlying tables.

Where supported and appropriate, use security-invoker behavior or
otherwise explicitly protect the view.

------------------------------------------------------------------------

# 46. Admin Operations

Admin operations should use trusted authorization.

Never trust:

``` text
role=admin
```

sent by the frontend.

Prefer:

``` text
Controlled membership/claims
+
RLS
+
Trusted server/Edge Function
```

for privileged workflows.

------------------------------------------------------------------------

# 47. Audit Logs

For sensitive systems record important actions:

``` text
Role changed
Payment refunded
Organization deleted
Data exported
Security setting changed
```

Example:

``` text
audit_logs
├── actor_id
├── action
├── resource_type
├── resource_id
└── created_at
```

------------------------------------------------------------------------

# 48. Backups and Recovery

Treat database and Storage recovery separately.

``` text
Postgres backup
≠
Storage object backup
```

Supabase provides database backups and, on supported plans,
point-in-time recovery, but database backups do not automatically
include Storage objects. [Database
backups](https://supabase.com/docs/guides/database/overview)

Define recovery procedures for:

``` text
Database
Storage
Configuration
Secrets
Application code
```

------------------------------------------------------------------------

# 49. Recovery Testing

A backup is not a recovery plan until tested.

Verify:

``` text
Database restoration
Storage recovery
Migration replay
Application reconnect
Authentication configuration
```

------------------------------------------------------------------------

# 50. Rate Limiting

Rate-limit sensitive/high-cost operations:

``` text
Login
OTP
Password reset
AI generation
File upload
Search
Public Edge Functions
Webhooks
```

Use server-side or centralized controls.

Never rely only on frontend throttling.

------------------------------------------------------------------------

# 51. Data API Exposure

Before exposing a table directly to clients, ask:

``` text
Should clients access it?
Which rows?
Which operations?
Which columns?
Can RLS enforce it completely?
```

If the answer is unclear:

``` text
Do not expose it directly.
```

Use an RPC or Edge Function instead.

------------------------------------------------------------------------

# 52. Next.js + Supabase

For SSR frameworks such as Next.js, maintain separate client/server
boundaries:

``` text
Browser
→ Browser Supabase client

Server component / route
→ Server Supabase client

Admin operation
→ Server-only privileged client
```

Never import the admin client into browser code.

------------------------------------------------------------------------

# 53. Session Handling

Use the official framework/Supabase integration for session management
where available.

Avoid manually storing tokens in arbitrary browser storage.

Session lifecycle:

``` text
Sign in
 ↓
Session
 ↓
Refresh
 ↓
Sign out
```

Keep authentication state consistent across server and browser
boundaries.

------------------------------------------------------------------------

# 54. Security Testing

Test RLS as security code.

For important tables test:

``` text
Anonymous user
Authenticated user
Correct owner
Wrong owner
Correct tenant
Wrong tenant
Admin
Non-admin
```

Also test:

``` text
INSERT ownership
UPDATE ownership changes
DELETE permissions
Storage access
Realtime subscriptions
```

------------------------------------------------------------------------

# 55. Migration Testing

Test migrations against:

``` text
Fresh database
Current staging schema
Production-like data
```

Check:

``` text
Locks
Performance
Indexes
Constraints
RLS
Backward compatibility
```

------------------------------------------------------------------------

# 56. Deployment Flow

Recommended:

``` text
Code
 ↓
Migration
 ↓
Local tests
 ↓
CI
 ↓
Staging
 ↓
Migration verification
 ↓
Application deployment
 ↓
Smoke tests
 ↓
Production
```

Coordinate application and schema compatibility.

------------------------------------------------------------------------

# 57. Expand-and-Contract

For risky schema changes:

``` text
Expand
 ↓
Support old + new
 ↓
Migrate data
 ↓
Switch application
 ↓
Remove old structure
```

Avoid dropping columns immediately when old application versions may
still require them.

------------------------------------------------------------------------

# 58. Dashboard Usage

The Supabase Dashboard is useful for:

``` text
Inspection
Monitoring
Diagnostics
Development
Ad-hoc queries
```

But important production schema/configuration changes should be encoded
in version-controlled code/migrations.

------------------------------------------------------------------------

# 59. Portability

Prefer standard PostgreSQL where practical:

``` text
SQL
Constraints
Indexes
Transactions
Functions
```

Use Supabase-specific features when they provide meaningful value.

Avoid unnecessary vendor lock-in.

Supabase explicitly emphasizes PostgreSQL compatibility and portability.

------------------------------------------------------------------------

# 60. Observability

Monitor:

``` text
Database latency
Slow queries
Connections
Storage usage
Auth failures
Function failures
Realtime connections
Queue depth
API errors
```

Correlate application telemetry with Supabase telemetry.

Track running versions and deployment markers.

------------------------------------------------------------------------

# 61. Production Readiness Checklist

``` text
[ ] RLS enabled on client-accessible tables
[ ] RLS policies reviewed
[ ] RLS security tests pass
[ ] Service-role key protected
[ ] Secrets protected
[ ] Production project isolated
[ ] Migrations version-controlled
[ ] Generated types updated
[ ] Storage policies reviewed
[ ] Private buckets protected
[ ] Edge Functions authenticated where needed
[ ] Webhooks verify signatures
[ ] Rate limits configured
[ ] Database indexes reviewed
[ ] Slow queries reviewed
[ ] Backups understood
[ ] Storage recovery understood
[ ] Monitoring configured
[ ] Error tracking configured
[ ] Admin paths protected
[ ] Recovery procedure documented
```

------------------------------------------------------------------------

# 62. Common Anti-Patterns

Avoid:

### Service Role in Browser

``` text
Frontend
 ↓
SERVICE_ROLE_KEY
```

Never.

### RLS Enabled but Too Broad

``` text
RLS = enabled
```

does not mean secure if policies allow everyone.

### Client Controls Ownership

Never trust user-supplied tenant/user ownership.

### Production Schema Changed Manually

Encode important changes as migrations.

### Public Storage for Private Data

Use protected buckets and policies.

### Giant Edge Function

Do not put the whole backend into one function.

### Giant RPC Layer

Do not move all application logic into PostgreSQL functions.

### Realtime Everywhere

Use only where live behavior is needed.

### Multiple Schema Owners

Avoid independent Supabase, ORM, and Dashboard migrations.

### No RLS Tests

Security policies must be tested like application code.

------------------------------------------------------------------------

# 63. Recommended Project Structure

``` text
project/
├── app/
├── components/
├── lib/
│   └── supabase/
│       ├── browser.ts
│       ├── server.ts
│       └── admin.ts
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── webhook/
│   │   └── process-job/
│   └── seed.sql
│
├── types/
│   └── database.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
│
└── .env.example
```

The exact framework structure can vary; the important thing is that
browser, server, admin, migrations, functions, types, and security tests
have clear boundaries.

------------------------------------------------------------------------

# 64. Final Decision Framework

For each feature ask:

``` text
Is it simple CRUD?
        ↓
Direct Supabase client + RLS

Is it a complex database operation?
        ↓
RPC / database function

Does it require secrets?
        ↓
Edge Function / trusted server

Does it call an external API?
        ↓
Edge Function / trusted server

Is it long-running?
        ↓
Queue + worker

Does it require live updates?
        ↓
Realtime

Is it a large file?
        ↓
Storage

Is it relational business data?
        ↓
PostgreSQL
```

------------------------------------------------------------------------

# 65. Final Mental Model

For every feature:

``` text
Where is the source of truth?
        ↓
Who owns the data?
        ↓
Who can access it?
        ↓
Can RLS enforce that?
        ↓
Does it require a secret?
        ↓
Does it need server-side logic?
        ↓
Does it need a transaction?
        ↓
Does it need async processing?
        ↓
How is the schema migrated?
        ↓
How is it tested?
        ↓
How is it monitored?
        ↓
How is it recovered?
```

The goal is not:

``` text
Use every Supabase feature.
```

The goal is:

``` text
Use PostgreSQL correctly
+
Use RLS correctly
+
Keep secrets server-side
+
Version the schema
+
Keep business boundaries clear
+
Use Storage appropriately
+
Use Realtime deliberately
+
Use Edge Functions for trusted server work
+
Design for failure
+
Maintain observability and recovery
```

That is the foundation of a production-grade application using Supabase
as its Backend-as-a-Service.
