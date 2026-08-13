# EduPrime — Product Documentation

EduPrime is a white-label, multi-tenant MCQ/assessment platform. Each customer ("organization") gets its own branded subdomain (`orgname.eduprime.app`, or a fully custom domain on higher plans) where their admins, teachers, and students all work — completely isolated from every other customer's data.

This `docs/` folder documents the product from a **user/flow perspective** — what each role can do, screen by screen, and how the cross-cutting features (billing, sections, question types, public exams…) actually work end to end. For implementation-level architecture (schema, RLS, edge functions, file layout), see the repository's `CLAUDE.md` instead — these two are meant to be read together, not as duplicates: `CLAUDE.md` is "how it's built," this folder is "what it does and how someone uses it."

The platform's own internal staff console (a separate deployment, separate repo) has its own docs — see `eduprime-admin/docs/`.

## Roles

Four roles, each scoped differently:

- [Org Admin](roles/org-admin.md) — runs one organization: billing, educator access, branding, public-exam approvals.
- [Teacher / Educator](roles/teacher.md) — builds and manages assessments within one organization.
- [Student](roles/student.md) — joins and takes assessments via a code; never creates an account.
- [Platform Staff](roles/platform-staff.md) — EduPrime's own team; not scoped to any org, and mostly lives in the separate admin console.

## Features

Grouped roughly by area — most features are used by more than one role, so read the role docs first for the "who does what when," then dive into a feature doc for the full mechanics.

**Getting an organization set up**
- [Tenancy, branding & custom domains](features/tenancy-and-branding.md)
- [Sign-up, sign-in & onboarding](features/authentication-and-onboarding.md)

**Building and running assessments**
- [Classes](features/classes.md)
- [Test authoring](features/test-authoring.md)
- [Question types](features/question-types.md)
- [Sections & timing](features/sections-and-timing.md)
- [Question bank](features/question-bank.md)
- [Collaborators & blocked students](features/collaborators-and-blocked-students.md)
- [Public exams & approval](features/public-exams.md)

**Taking a test and seeing results**
- [Taking a test (student flow)](features/test-taking.md)
- [Grading & results](features/grading-and-results.md)
- [Reports & analytics](features/reports-and-analytics.md)

**Running the business**
- [Plan limits](features/plan-limits.md)
- [Billing (Razorpay)](features/billing-and-plans.md)
- [Promotions & capacity add-ons](features/promotions-and-addons.md)
- [Impersonation ("View as")](features/impersonation.md)

## A note on accuracy

This documentation was written by reading the actual source code directly (every screen/component listed here was read in full, not inferred from comments or specs), current as of the question-types-and-sections feature. Anywhere the code's actual behavior looked surprising, inconsistent, or possibly unintentional (a few exist — e.g. a couple of unused settings fields), it's called out explicitly in the relevant feature doc rather than papered over, so this stays a reliable map of what the product **actually does**, not what it was intended to do.
