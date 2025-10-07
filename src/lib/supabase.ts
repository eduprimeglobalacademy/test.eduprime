import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type UserRole = 'admin' | 'teacher'
export type TestStatus = 'draft' | 'live' | 'closed'

export interface AdminUser {
  id: string
  user_id: string
  email: string
  name: string
  created_at: string
}

export interface TeacherToken {
  id: string
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
  name: string
  email: string
  phone_number: string
  token_used: string
  created_at: string
}

export interface Test {
  id: string
  teacher_id: string
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