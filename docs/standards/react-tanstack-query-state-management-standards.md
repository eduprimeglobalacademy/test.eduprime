# React + TanStack Query State Management Standards

## Purpose

Standards for state management in React applications using **TanStack Query**.

Core rule:

> **TanStack Query owns server state. React owns local UI state.**

A frontend should distinguish:

```text
State
├── Server State        → TanStack Query
├── Local UI State      → useState / useReducer
├── URL State           → Router / search params
├── Form State          → Form library / local state
└── Global Client State → Zustand / Context when genuinely required
```

TanStack Query is designed around asynchronous server data, caching, refetching, mutations, and invalidation. Query keys identify cached data. citeturn0search1turn0search3

---

# 1. Core Principles

1. Use TanStack Query for server state.
2. Do not copy server state into `useState` without a real reason.
3. Query keys are the identity of cached server data.
4. Every variable that changes a query result belongs in its query key.
5. Use mutations for server-side writes.
6. Invalidate or update affected queries after mutations.
7. Use optimistic updates only when the UX benefit justifies the complexity.
8. Keep local UI state local.
9. Do not create a global store for data already owned by TanStack Query.
10. Configure freshness and refetching deliberately.
11. Keep query keys consistent across the application.
12. Treat the query cache as a cache, not the permanent source of truth.
13. Handle loading, error, empty, and background-fetch states separately.
14. Keep server authorization on the backend.
15. Make state ownership explicit.

---

# 2. State Classification

## Server State

Use TanStack Query for:

```text
Users
Projects
Orders
Products
Notifications
Messages
Dashboard data
API responses
Supabase rows
```

Characteristics:

```text
Asynchronous
Can become stale
Can change outside the current UI
Needs caching
Needs refetching
Can fail independently
```

## Local UI State

Use React state for:

```text
Modal open/closed
Selected tab
Sidebar state
Temporary wizard step
Hover state
Temporary UI preferences
```

## URL State

Use the URL for state that should be shareable/bookmarkable:

```text
?page=2
?search=react
?status=active
?sort=createdAt
/project/123
```

## Form State

Use a form library or local state for:

```text
Input values
Validation state
Dirty state
Touched fields
Draft values
```

## Global Client State

Use Zustand/Context only for genuine shared client-only state such as:

```text
Theme
Locale
UI preferences
Complex client workflows
```

Do not use it as a replacement for TanStack Query's server cache.

---

# 3. QueryClient

Create a single application-level `QueryClient` in normal application architecture.

```tsx
const queryClient = new QueryClient()

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

Do not instantiate a new QueryClient on every render.

Configure defaults intentionally:

```text
staleTime
gcTime
retry
refetchOnWindowFocus
refetchOnReconnect
```

Do not blindly disable these globally.

---

# 4. Query Keys

Query keys identify cached server data and control cache sharing/refetch behavior. citeturn0search0turn0search3

Prefer structured keys:

```ts
['users']
['users', userId]
['projects', projectId]
['projects', { status, page }]
```

If a variable changes the query result, it must be represented in the query key.

Bad:

```ts
useQuery({
  queryKey: ['users'],
  queryFn: () => getUsers(page),
})
```

Better:

```ts
useQuery({
  queryKey: ['users', { page }],
  queryFn: () => getUsers(page),
})
```

---

# 5. Query Key Factories

For larger applications, centralize query keys.

```ts
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) =>
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...projectKeys.details(), id] as const,
}
```

Benefits:

```text
Consistency
Type safety
Reliable invalidation
Easier refactoring
```

Each feature should own its query keys.

---

# 6. API / Query Layer Separation

Keep transport functions separate from React components.

Recommended feature structure:

```text
features/projects/
├── api/
│   ├── project.api.ts
│   ├── project.keys.ts
│   ├── project.queries.ts
│   └── project.mutations.ts
├── hooks/
│   └── use-project.ts
└── components/
```

Conceptually:

```text
Component
 ↓
useProject()
 ↓
Query options
 ↓
API function
 ↓
Backend / Supabase
```

Query functions should fetch/return data, throw meaningful errors, respect cancellation where possible, and avoid unrelated UI side effects.

---

# 7. Query Options

For reusable queries, define query options centrally.

```ts
const projectOptions = (projectId: string) =>
  queryOptions({
    queryKey: projectKeys.detail(projectId),
    queryFn: ({ signal }) => getProject(projectId, signal),
  })
```

This prevents query configuration from being duplicated across components.

---

# 8. Loading, Error and Empty States

Treat these as separate product states:

```text
Loading
Error
Empty
Success
Background fetching
```

Do not display a full-page spinner for every background refetch.

TanStack Query exposes fetching information separately from the initial query state. citeturn0search1

---

# 9. Stale Time

`staleTime` controls how long fetched data is considered fresh.

Choose based on data volatility:

```text
Static configuration → long
Normal business data → moderate
Highly dynamic data → short / realtime
```

Do not set every query to zero stale time without understanding the network and UX consequences.

---

# 10. Garbage Collection

`gcTime` controls how long inactive cached data is retained.

Do not confuse:

```text
staleTime → freshness
 gcTime   → inactive cache lifetime
```

Choose values based on memory, navigation patterns, and data sensitivity.

---

# 11. Refetching

Refetching may occur because of:

```text
Mounting
Window focus
Reconnect
Manual refetch
Invalidation
Polling
```

Configure these intentionally.

Avoid aggressive global polling.

---

# 12. Polling

Use polling for temporary asynchronous states such as:

```text
Import progress
Job status
External processing
```

Always define a stop condition:

```text
completed
failed
cancelled
expired
```

Never poll indefinitely without a deliberate reason.

---

# 13. Mutations

Use `useMutation` for server writes:

```text
Create
Update
Delete
Submit
```

Examples:

```text
createProject
updateProfile
deleteOrder
submitApplication
```

TanStack Query recommends mutations for operations that modify server data. citeturn0search11turn0search7

---

# 14. Mutation Lifecycle

Every important mutation should define:

```text
mutationFn
pending behavior
success behavior
error behavior
cache synchronization
```

Conceptually:

```ts
useMutation({
  mutationFn: updateProject,
  onSuccess: ...,
  onError: ...,
})
```

---

# 15. Mutation Invalidation

After a successful mutation, invalidate affected queries.

```ts
onSuccess: async () => {
  await queryClient.invalidateQueries({
    queryKey: projectKeys.lists(),
  })
}
```

TanStack Query supports targeted invalidation after mutations. citeturn0search7turn0search10

Prefer targeted invalidation over invalidating the entire cache.

---

# 16. Invalidate vs Set Query Data

Use invalidation when the server should provide the authoritative refreshed result.

Use `setQueryData` when you already have the authoritative result and can safely update the cache.

```ts
queryClient.setQueryData(
  projectKeys.detail(project.id),
  project,
)
```

Do not manually synchronize many related caches when a simple invalidation is safer.

---

# 17. Optimistic Updates

Optimistic updates:

```text
User action
 ↓
Update UI immediately
 ↓
Send mutation
 ↓
Rollback if failure
 ↓
Synchronize with server
```

Good candidates:

```text
Like/unlike
Toggle
Simple status changes
Simple reorder
```

Be cautious for:

```text
Payments
Inventory
Financial operations
Complex workflows
```

TanStack Query's optimistic-update pattern includes cancellation, snapshotting, optimistic cache updates, rollback, and invalidation. citeturn0search9

---

# 18. Optimistic Update Rules

Always:

```text
1. Cancel conflicting refetches
2. Snapshot previous state
3. Apply optimistic update
4. Roll back on failure
5. Invalidate/refetch after completion
```

Never implement optimistic UI without a failure strategy.

---

# 19. Idempotency

Frontend actions can be repeated because of:

```text
Double clicks
Retries
Refreshes
Network ambiguity
User behavior
```

For important operations, the backend should support idempotency where appropriate.

Especially:

```text
Payments
Orders
Bookings
External API actions
Job creation
```

Frontend button disabling is not sufficient protection.

---

# 20. Dependent Queries

When one query depends on another:

```text
User
 ↓
Organization
 ↓
Projects
```

make the dependency explicit.

```ts
enabled: Boolean(organizationId)
```

Do not send requests with invalid or undefined identifiers.

---

# 21. Parallel Queries

If queries are independent, allow them to execute in parallel.

```text
User
Projects
Notifications
```

should not be unnecessarily serialized.

Avoid request waterfalls.

---

# 22. Prefetching

Prefetch when the next user action is predictable.

Examples:

```text
Hover list item → prefetch detail
Page 1 → prefetch page 2
```

Use selectively. Do not prefetch everything.

---

# 23. Pagination

Include pagination variables in the query key:

```ts
['projects', {
  page,
  pageSize,
  filters,
}]
```

Use normal pagination for standard tables and infinite queries for feeds/activity streams where appropriate.

---

# 24. Search

Separate search input state from search results:

```text
Input
 ↓
Local/URL state
 ↓
Debounce
 ↓
TanStack Query
 ↓
Search results
```

Include search and filters in the query key.

---

# 25. Debouncing

For type-ahead search, debounce requests where appropriate:

```text
User types
 ↓
200–400ms wait
 ↓
Request
```

Do not send an API request for every keystroke unless the product requires it.

---

# 26. Forms

For editable forms:

```text
TanStack Query → server value
Form library   → temporary draft
Mutation       → submit
Query cache    → synchronize after success
```

Do not continuously mirror server data into local state.

---

# 27. Avoid Copying Query Data to State

Avoid:

```ts
const { data } = useQuery(...)
const [localData, setLocalData] = useState(data)
```

unless the local value intentionally represents a separate editable draft.

Otherwise this creates two sources of truth.

---

# 28. Derived State

Do not store values that can be derived reliably.

Avoid:

```text
users
activeUsers
```

when `activeUsers` can be derived from `users`.

Prefer deriving the value and memoize only when there is a measured performance reason.

---

# 29. Global Client Stores

Zustand/Context may manage:

```text
Theme
Locale
UI preferences
Cross-component client state
Complex local workflows
```

They should not duplicate server data already managed by TanStack Query.

Avoid:

```text
TanStack Query
+
Zustand products
+
Context products
+
component products
```

for the same server resource.

---

# 30. Authentication State

Keep authentication/session state conceptually separate from business data.

Do not maintain multiple independent copies of the auth session without a clear reason.

Frontend auth state controls UI behavior; backend authorization remains authoritative.

---

# 31. Permissions

Never use client state as the security boundary.

These are not authorization mechanisms:

```text
Zustand
Context
useState
TanStack Query
URL parameters
```

The backend must enforce authorization.

---

# 32. Logout and Tenant Switching

On logout:

```text
User A logs out
 ↓
User-specific cached data is cleared/removed appropriately
 ↓
User B logs in
 ↓
User A data cannot appear
```

For multi-tenant applications, include tenant context in keys where necessary:

```ts
['projects', { organizationId }]
```

Treat authentication/tenant boundaries as cache boundaries.

---

# 33. Realtime + TanStack Query

When using WebSockets or Supabase Realtime:

```text
Realtime event
 ↓
Identify affected resource
 ↓
setQueryData or invalidateQueries
 ↓
React UI
```

Do not create a second server-state store for realtime data.

The backend remains the source of truth; realtime is an event/update mechanism.

---

# 34. Retry Policy

Retries are appropriate for transient failures:

```text
Temporary network failure
Temporary server failure
Transient dependency failure
```

Be cautious retrying:

```text
Validation errors
401/403 errors
Non-idempotent mutations
```

Use bounded retries and appropriate backoff.

---

# 35. Cancellation

Query functions should respect `AbortSignal` where possible:

```ts
queryFn: ({ signal }) =>
  fetch('/api/projects', { signal })
```

This prevents obsolete requests from consuming resources.

---

# 36. Race Conditions

Be aware of:

```text
Request A starts
Request B starts
B finishes
A finishes later
```

Use proper query keys, cancellation, and server-side consistency rules. Do not manually overwrite current state with obsolete responses.

---

# 37. Cache Synchronization Map

For complex features, document which queries a mutation affects.

Example:

```text
updateProject
├── project detail → update
├── project lists  → invalidate
└── dashboard      → invalidate if affected
```

This makes cache behavior deliberate rather than accidental.

---

# 38. Feature-Based Organization

Recommended:

```text
src/
├── features/
│   ├── auth/
│   ├── projects/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── components/
│   │   └── keys/
│   └── orders/
├── lib/
│   └── query-client.ts
└── app/
```

Organize around business domains rather than one giant API/hooks folder.

---

# 39. Supabase + TanStack Query

For Supabase-backed React applications:

```text
TanStack Query
→ Server-state cache

Supabase
→ Backend/data source

RLS
→ Authorization

Realtime
→ Change notification

Edge Function
→ Trusted server-side logic
```

Typical flow:

```text
Component
 ↓
useProject()
 ↓
TanStack Query
 ↓
Supabase client
 ↓
RLS
 ↓
Postgres
```

Do not introduce another global server-state cache for the same data.

---

# 40. Error Handling

Centralize common mappings where appropriate:

```text
401 → session handling
403 → permission message
429 → rate-limit message
5xx → generic failure + logging
```

Never expose raw backend stack traces to users.

For unexpected React rendering failures, use React error boundaries separately from query error handling.

---

# 41. Performance Standards

Monitor:

```text
Query count
Request frequency
Refetch frequency
Cache size
Payload size
Component rerenders
Request waterfalls
```

Optimize based on measurements rather than assumptions.

---

# 42. Sensitive Data

Do not blindly cache:

```text
Secrets
Tokens
Highly sensitive personal data
Financial information
```

Apply appropriate cache and persistence rules for sensitive data.

---

# 43. Persistence / Offline

Persist query cache only when there is a real requirement such as offline support.

Before persistence define:

```text
What can be stored?
How long?
What happens on logout?
How is stale data handled?
How are conflicts resolved?
```

Offline writes require an explicit synchronization/conflict strategy.

---

# 44. Testing Standards

Test behavior such as:

```text
Query success
Query error
Loading state
Empty state
Mutation success
Mutation failure
Invalidation
Optimistic rollback
Pagination
Dependent queries
Authentication expiry
Permission failures
Duplicate mutation attempts
Network failure
```

Do not test TanStack Query internals.

---

# 45. Devtools

Use TanStack Query Devtools during development to inspect:

```text
Queries
Query keys
Cache state
Staleness
Fetching
Observers
```

Do not expose development-only tooling in production unintentionally.

---

# 46. Common Anti-Patterns

## Server Data in Zustand

```text
API → Zustand → Components
```

when TanStack Query is available.

## Query Data Copied to State

```text
useQuery → useState(data)
```

without a genuine draft requirement.

## Missing Query Variables

```text
queryKey: ['projects']
queryFn: () => getProjects(page)
```

when `page` changes the result.

## Invalidate Everything

```ts
queryClient.invalidateQueries()
```

after every mutation.

## Optimistic Update Without Rollback

Never assume a mutation cannot fail.

## Infinite Polling

Every polling loop needs a purpose, interval, stop condition, and failure behavior.

## Giant Global Store

Do not put users, orders, projects, and API caches into one client store.

## Manual Loading/Error State

Do not recreate TanStack Query's request lifecycle with `useState`.

## Frontend Authorization

Hiding an admin button does not enforce authorization.

---

# 47. Query Checklist

Before implementing a query:

- [ ] What server resource is being fetched?
- [ ] What is its unique query key?
- [ ] Does the key contain every result-changing variable?
- [ ] What should `staleTime` be?
- [ ] What should `gcTime` be?
- [ ] Should it refetch on focus/reconnect?
- [ ] Does it need polling?
- [ ] Does it need realtime?
- [ ] Can it be prefetched?
- [ ] Can the request be cancelled?
- [ ] What are loading/error/empty states?

---

# 48. Mutation Checklist

Before implementing a mutation:

- [ ] Is this a server-side write?
- [ ] Does it require idempotency?
- [ ] What queries become stale?
- [ ] Which queries can be updated directly?
- [ ] Is optimistic UI necessary?
- [ ] What is the rollback strategy?
- [ ] What happens on duplicate submission?
- [ ] Is backend authorization enforced?
- [ ] Is user feedback clear?

---

# 49. Production Readiness Checklist

- [ ] Central QueryClient
- [ ] Consistent query-key conventions
- [ ] Feature-level query key ownership
- [ ] Separate API/query/mutation layers
- [ ] Typed responses
- [ ] Deliberate staleTime/gcTime
- [ ] Deliberate retry policy
- [ ] Targeted mutation invalidation
- [ ] Loading/error/empty UX
- [ ] Cancellation where appropriate
- [ ] Optimistic updates have rollback
- [ ] Logout cache handling
- [ ] Tenant cache isolation
- [ ] Security enforced server-side
- [ ] Query performance monitored
- [ ] Tests cover important query/mutation behavior

---

# 50. Final Architecture

```text
                         React UI
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     Local State        URL State        Form State
   useState/reducer      Router          Form library
          │
          │
          ▼
    TanStack Query
    ┌────────────────┐
    │ Query Cache    │
    │ Queries        │
    │ Mutations      │
    │ Invalidation   │
    │ Prefetching    │
    └───────┬────────┘
            │
            ▼
       API / Supabase
            │
            ▼
         Backend
```

The important separation is:

```text
Server state
→ TanStack Query

Client state
→ React / Zustand / Context

Navigation state
→ URL

Form state
→ Form layer
```

---

# 51. Golden Rules

1. TanStack Query owns server state.
2. React owns local UI state.
3. URL owns navigational/shareable state.
4. Forms own temporary input state.
5. Do not duplicate server state unnecessarily.
6. Query keys are part of application architecture.
7. Every result-changing variable belongs in the query key.
8. Use mutations for server writes.
9. Invalidate affected queries after mutations.
10. Prefer targeted invalidation.
11. Use direct cache updates only when safe and authoritative.
12. Optimistic updates require rollback.
13. Backend authorization is the security boundary.
14. Do not use frontend state as permission enforcement.
15. Choose staleTime deliberately.
16. Do not aggressively refetch without a reason.
17. Do not poll indefinitely.
18. Respect request cancellation.
19. Avoid request waterfalls.
20. Avoid giant global stores.
21. Avoid copying query data into local state without a draft requirement.
22. Clear user-specific cache on logout.
23. Include tenant context in query keys where required.
24. Keep API functions separate from UI components.
25. Keep query keys owned by features.
26. Test query and mutation behavior.
27. Monitor query volume and refetch behavior.
28. Treat the cache as temporary, not the source of truth.
29. Make state ownership explicit.
30. Use the simplest state mechanism that correctly represents the state.

---

# 52. Final Mental Model

Before creating state:

```text
Who owns it?
      ↓
Server?
  → TanStack Query

Component?
  → useState

Complex local workflow?
  → useReducer / local store

Shared client state?
  → Zustand / Context

URL?
  → Router

Form?
  → Form state
```

Before creating a server query:

```text
What is the resource?
        ↓
What uniquely identifies it?
        ↓
What variables affect it?
        ↓
How stale can it be?
        ↓
When should it refetch?
        ↓
Which mutations invalidate it?
        ↓
Can it be updated optimistically?
        ↓
What happens on failure?
```

The objective is not to use TanStack Query everywhere.

The objective is to make **state ownership explicit**, maintain **one source of truth**, and let each state-management mechanism do the job it was designed for.

---

## Official References

- TanStack Query documentation: https://tanstack.com/query/latest/docs/framework/react/overview
- Query keys: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- Query invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- Mutations: https://tanstack.com/query/latest/docs/framework/react/guides/mutations
- Optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
