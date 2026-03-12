# EduPrime Global Academy

## Overview

A React + Vite + Supabase MCQ/assessment management platform with three roles:
- **Admin** — manages educator access tokens and revokes accounts
- **Teacher/Educator** — creates and manages tests/assessments
- **Student** — takes assessments via a code-based join flow

Originally built in Bolt, migrated to Replit. Supabase is used directly from the frontend (no Express backend).

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Database**: Supabase (PostgreSQL) — accessed via `@supabase/supabase-js` directly from the browser
- **Auth**: Supabase Auth (email+password)
- **Styling**: Tailwind CSS + custom utility classes in `src/index.css`
- **Charts**: Recharts (for TestReports analytics)
- **PDF**: jspdf + jspdf-autotable (for results download)

## Design System

Defined in `src/index.css`:
- **Primary palette**: Indigo (#6366F1) / Violet (#8B5CF6)
- **Background**: White / Slate-50
- **Utility classes**: `.gradient-text`, `.btn-primary`, `.btn-outline`, `.input-base`, `.stat-card`, `.page-header`, `.badge`, `.card-glass`, `.animate-in`, `.scrollbar-thin`
- **Shapes**: `rounded-2xl` cards, `rounded-xl` inputs/buttons
- **Glassmorphism**: `backdrop-blur-sm` on headers

## Key Files

```
src/
  index.css                          # Global styles + design system utilities
  components/
    LandingPage.tsx                  # Public landing with hero, features, how-it-works
    auth/
      SignInModal.tsx                # Email/password sign-in modal
      RegisterModal.tsx              # Educator registration with token validation
    admin/
      AdminDashboard.tsx             # Token CRUD, educator management, stats
    teacher/
      TeacherDashboard.tsx           # Test list overview with stats
      TestDashboard.tsx              # Filter/search wrapper for test list
      TestList.tsx                   # Individual test cards with actions
      CreateTestWizard.tsx           # 3-step wizard: info → settings → grading
      CreateQuestionPage.tsx         # Add/edit/bulk-import questions
      EditTestModal.tsx              # Edit test metadata
      TestPreview.tsx                # Read-only preview of live test
      TestReports.tsx                # Analytics: pie chart, bar chart, table
    student/
      TestAccess.tsx                 # Code entry → test flow
      TestInterface.tsx              # Timed test taking UI with question nav
      TestResults.tsx                # Score + grade + question review + PDF
    ui/
      Button.tsx                     # Variants: primary, outline, ghost, danger, secondary
      Card.tsx                       # rounded-2xl card container
      Input.tsx                      # Labeled input with error/helper
      LoadingSpinner.tsx             # Indigo spinner
  lib/
    supabase.ts                      # Supabase client + type definitions
    auth.ts                          # signInWithEmail, signUpTeacher helpers
    utils.ts                         # formatDateTime, exportToCSV, etc.
  contexts/
    AuthContext.tsx                   # useAuth hook, user state, refreshUser
```

## Environment Secrets

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — Service role key (admin ops)

## Supabase Tables

- `teacher_tokens` — educator access tokens (created by admin)
- `teachers` — registered educator profiles
- `tests` — test/assessment records
- `questions` — MCQ questions per test
- `question_options` — options per question (one marked `is_correct`)
- `test_attempts` — student attempt records
- `student_answers` — individual answers per attempt

## Running

`npm run dev` starts Vite on port 5000 with host `0.0.0.0` and `allowedHosts: true` (required for Replit).

## Features

- Token-based educator onboarding (admin generates → educator registers with token)
- 3-step test creation wizard with grading config (A/B/C/D/F boundaries)
- Per-question or overall timer support
- Bulk question import via text format
- Auto-submit on timer expiry
- Student duplicate prevention (email + phone check)
- PDF result download for students
- CSV export for teacher analytics
- Pie + bar charts in test reports
