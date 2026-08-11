import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type UserRole = 'platform_admin' | 'admin' | 'teacher'
export type TestStatus = 'draft' | 'live' | 'closed'
export type OrgStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  status: OrgStatus
  plan_id: string
  trial_ends_at?: string
  grace_ends_at?: string
  razorpay_customer_id?: string
  custom_domain?: string
  custom_domain_status?: 'pending' | 'active'
  created_at: string
}

export interface Plan {
  id: string
  name: string
  max_teachers: number | null
  max_active_tests: number | null
  max_students_per_test: number | null
  razorpay_plan_id: string | null
  price_inr: number | null
  sort_order: number
}

export type SubscriptionStatus = 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed'

export interface Subscription {
  id: string
  org_id: string
  plan_id: string
  razorpay_subscription_id: string
  status: SubscriptionStatus
  current_period_end?: string
  created_at: string
  updated_at: string
}

export interface PlatformAdmin {
  id: string
  user_id: string
  email: string
  name: string
  created_at: string
}

export interface AdminUser {
  id: string
  user_id: string
  org_id: string
  email: string
  name: string
  created_at: string
}

export interface TeacherToken {
  id: string
  org_id: string
  token: string
  teacher_name: string
  phone_number: string
  created_by: string
  used_at?: string
  expires_at: string
  created_at: string
}

export interface Teacher {
  id: string
  user_id: string
  org_id: string
  name: string
  email: string
  phone_number: string
  token_used: string
  created_at: string
}

export interface Class {
  id: string
  org_id: string
  teacher_id: string
  name: string
  course_name?: string
  grade_level?: string
  academic_term?: string
  created_at: string
}

export interface ClassStudent {
  id: string
  org_id: string
  class_id: string
  student_email: string
  student_name?: string
  blocked: boolean
  joined_at: string
}

export interface TeacherFocusItem {
  id: string
  org_id: string
  teacher_id: string
  kind: 'student' | 'class'
  class_id?: string
  classes?: Pick<Class, 'id' | 'name' | 'course_name' | 'grade_level'> | null
  student_email?: string
  student_name?: string
  note?: string
  created_at: string
}

export interface QuestionBankOption {
  id: string
  bank_item_id: string
  option_text: string
  is_correct: boolean
  option_order: number
}

export interface QuestionBankItem {
  id: string
  org_id: string
  teacher_id: string
  question_text: string
  points: number
  created_at: string
  options?: QuestionBankOption[]
}

// Shape returned by the get_test_collaborators() RPC, not a raw table row —
// a plain embedded join can't see other teachers' name/email under RLS.
export interface TestCollaborator {
  id: string
  teacher_id: string
  name: string
  email: string
  added_at: string
}

export interface Test {
  id: string
  teacher_id: string
  org_id: string
  class_id?: string
  // Present only when fetched via `.select('*, classes(...)')` — a plain
  // `.select('*')` leaves this undefined, it is not always populated.
  classes?: Pick<Class, 'id' | 'name' | 'course_name' | 'grade_level'> | null
  title: string
  description?: string
  test_code: string
  status: TestStatus
  duration_minutes?: number
  start_time?: string
  end_time?: string
  show_results: boolean
  allow_navigation_back: boolean
  per_question_timing: boolean
  require_google_auth: boolean
  created_at: string
  updated_at: string
  grading_config?: {
    aGrade: number
    bGrade: number
    cGrade: number
    dGrade: number
    passingGrade: number
  }
}

export interface Question {
  id: string
  test_id: string
  question_text: string
  question_order: number
  points: number
  time_limit_seconds?: number
  options?: QuestionOption[]
}

export interface QuestionOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  option_order: number
}

export interface TestAttempt {
  id: string
  test_id: string
  org_id: string
  student_name: string
  student_email: string
  phone_number: string
  started_at: string
  submitted_at?: string
  total_score: number
  max_score: number
  time_taken_seconds?: number
  is_submitted: boolean
}

export interface StudentAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id?: string
  is_correct: boolean
  points_earned: number
}