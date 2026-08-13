// AUTO-GENERATED — do not hand-edit.
// Regenerate after any migration: npm run db:types
// (requires `npx supabase login` + a linked project; see supabase/config.toml)
//
// This is the schema ground truth, kept separate from the hand-written
// interfaces in ./supabase.ts. Those aren't generated FROM this file yet —
// that's a real refactor across every component that would need its own
// pass, not something to force through as a side effect of adding this
// file — but this gives a verifiable diff to check hand-written types
// against after a migration, and a real fix for the exact kind of schema
// drift that bit eduprime-admin's hand-duplicated types earlier.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          id: string
          joined_at: string | null
          org_id: string
          student_email: string
          student_name: string | null
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string | null
          org_id: string
          student_email: string
          student_name?: string | null
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string | null
          org_id?: string
          student_email?: string
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_term: string | null
          course_name: string | null
          created_at: string | null
          grade_level: string | null
          id: string
          name: string
          org_id: string
          teacher_id: string
        }
        Insert: {
          academic_term?: string | null
          course_name?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string
          name: string
          org_id: string
          teacher_id: string
        }
        Update: {
          academic_term?: string | null
          course_name?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string
          name?: string
          org_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_log: {
        Row: {
          id: string
          org_id: string
          platform_admin_id: string
          started_at: string | null
          target_email: string
        }
        Insert: {
          id?: string
          org_id: string
          platform_admin_id: string
          started_at?: string | null
          target_email: string
        }
        Update: {
          id?: string
          org_id?: string
          platform_admin_id?: string
          started_at?: string | null
          target_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impersonation_log_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      org_capacity_addons: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          kind: string
          mode: string
          org_id: string
          quantity: number
          razorpay_addon_subscription_id: string | null
          razorpay_order_id: string | null
          status: string
          unit_price_inr: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          kind: string
          mode: string
          org_id: string
          quantity: number
          razorpay_addon_subscription_id?: string | null
          razorpay_order_id?: string | null
          status?: string
          unit_price_inr: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          mode?: string
          org_id?: string
          quantity?: number
          razorpay_addon_subscription_id?: string | null
          razorpay_order_id?: string | null
          status?: string
          unit_price_inr?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_capacity_addons_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          custom_domain_status: string | null
          grace_ends_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan_id: string
          primary_color: string
          razorpay_customer_id: string | null
          secondary_color: string
          slug: string
          status: string
          student_billing_mode: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          grace_ends_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan_id?: string
          primary_color?: string
          razorpay_customer_id?: string | null
          secondary_color?: string
          slug: string
          status?: string
          student_billing_mode?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          grace_ends_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan_id?: string
          primary_color?: string
          razorpay_customer_id?: string | null
          secondary_color?: string
          slug?: string
          status?: string
          student_billing_mode?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          addon_student_price_inr: number | null
          addon_teacher_price_inr: number | null
          addon_test_price_inr: number | null
          id: string
          is_public: boolean
          max_active_tests: number | null
          max_students_per_test: number | null
          max_teachers: number | null
          name: string
          price_inr: number | null
          razorpay_addon_student_plan_id: string | null
          razorpay_addon_teacher_plan_id: string | null
          razorpay_addon_test_plan_id: string | null
          razorpay_plan_id: string | null
          sort_order: number
        }
        Insert: {
          addon_student_price_inr?: number | null
          addon_teacher_price_inr?: number | null
          addon_test_price_inr?: number | null
          id: string
          is_public?: boolean
          max_active_tests?: number | null
          max_students_per_test?: number | null
          max_teachers?: number | null
          name: string
          price_inr?: number | null
          razorpay_addon_student_plan_id?: string | null
          razorpay_addon_teacher_plan_id?: string | null
          razorpay_addon_test_plan_id?: string | null
          razorpay_plan_id?: string | null
          sort_order: number
        }
        Update: {
          addon_student_price_inr?: number | null
          addon_teacher_price_inr?: number | null
          addon_test_price_inr?: number | null
          id?: string
          is_public?: boolean
          max_active_tests?: number | null
          max_students_per_test?: number | null
          max_teachers?: number | null
          name?: string
          price_inr?: number | null
          razorpay_addon_student_plan_id?: string | null
          razorpay_addon_teacher_plan_id?: string | null
          razorpay_addon_test_plan_id?: string | null
          razorpay_plan_id?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_note: string | null
          ends_at: string | null
          id: string
          org_id: string | null
          razorpay_offer_id: string | null
          starts_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_note?: string | null
          ends_at?: string | null
          id?: string
          org_id?: string | null
          razorpay_offer_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_note?: string | null
          ends_at?: string | null
          id?: string
          org_id?: string | null
          razorpay_offer_id?: string | null
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_items: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          points: number | null
          question_text: string
          question_type: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          points?: number | null
          question_text: string
          question_type?: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          points?: number | null
          question_text?: string
          question_type?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_items_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_options: {
        Row: {
          bank_item_id: string | null
          id: string
          is_correct: boolean | null
          option_order: number
          option_text: string
        }
        Insert: {
          bank_item_id?: string | null
          id?: string
          is_correct?: boolean | null
          option_order: number
          option_text: string
        }
        Update: {
          bank_item_id?: string | null
          id?: string
          is_correct?: boolean | null
          option_order?: number
          option_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_options_bank_item_id_fkey"
            columns: ["bank_item_id"]
            isOneToOne: false
            referencedRelation: "question_bank_items"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          option_order: number
          option_text: string
          question_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_order: number
          option_text: string
          question_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_order?: number
          option_text?: string
          question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          question_order: number
          question_text: string
          question_type: string
          section_id: string | null
          test_id: string | null
          time_limit_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_order: number
          question_text: string
          question_type?: string
          section_id?: string | null
          test_id?: string | null
          time_limit_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_order?: number
          question_text?: string
          question_type?: string
          section_id?: string | null
          test_id?: string | null
          time_limit_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "test_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          answer_text: string | null
          attempt_id: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          selected_option_id: string | null
          selected_option_ids: string[] | null
        }
        Insert: {
          answer_text?: string | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          selected_option_ids?: string[] | null
        }
        Update: {
          answer_text?: string | null
          attempt_id?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          selected_option_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          org_id: string
          plan_id: string
          razorpay_subscription_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          org_id: string
          plan_id: string
          razorpay_subscription_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          org_id?: string
          plan_id?: string
          razorpay_subscription_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_focus: {
        Row: {
          class_id: string | null
          created_at: string | null
          id: string
          kind: string
          note: string | null
          org_id: string
          student_email: string | null
          student_name: string | null
          teacher_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          kind: string
          note?: string | null
          org_id: string
          student_email?: string | null
          student_name?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          org_id?: string
          student_email?: string | null
          student_name?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_focus_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_focus_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_focus_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          org_id: string
          phone_number: string
          status: Database["public"]["Enums"]["token_status"] | null
          teacher_name: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          phone_number: string
          status?: Database["public"]["Enums"]["token_status"] | null
          teacher_name: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          phone_number?: string
          status?: Database["public"]["Enums"]["token_status"] | null
          teacher_name?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_tokens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          org_id: string
          phone_number: string
          token_used: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          org_id: string
          phone_number: string
          token_used?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          org_id?: string
          phone_number?: string
          token_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_token_used_fkey"
            columns: ["token_used"]
            isOneToOne: false
            referencedRelation: "teacher_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          created_at: string | null
          id: string
          is_submitted: boolean | null
          max_score: number | null
          org_id: string
          phone_number: string | null
          started_at: string | null
          student_email: string | null
          student_name: string
          submitted_at: string | null
          test_id: string | null
          time_taken_seconds: number | null
          total_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_submitted?: boolean | null
          max_score?: number | null
          org_id: string
          phone_number?: string | null
          started_at?: string | null
          student_email?: string | null
          student_name: string
          submitted_at?: string | null
          test_id?: string | null
          time_taken_seconds?: number | null
          total_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_submitted?: boolean | null
          max_score?: number | null
          org_id?: string
          phone_number?: string | null
          started_at?: string | null
          student_email?: string | null
          student_name?: string
          submitted_at?: string | null
          test_id?: string | null
          time_taken_seconds?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_blocked_students: {
        Row: {
          blocked_at: string | null
          id: string
          org_id: string
          student_email: string
          test_id: string
        }
        Insert: {
          blocked_at?: string | null
          id?: string
          org_id: string
          student_email: string
          test_id: string
        }
        Update: {
          blocked_at?: string | null
          id?: string
          org_id?: string
          student_email?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_blocked_students_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_blocked_students_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_collaborators: {
        Row: {
          added_at: string | null
          id: string
          teacher_id: string
          test_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          teacher_id: string
          test_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          teacher_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_collaborators_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_collaborators_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sections: {
        Row: {
          allow_free_navigation: boolean
          created_at: string | null
          duration_minutes: number | null
          id: string
          section_order: number
          test_id: string
          timing_mode: string
          title: string
        }
        Insert: {
          allow_free_navigation?: boolean
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          section_order: number
          test_id: string
          timing_mode?: string
          title: string
        }
        Update: {
          allow_free_navigation?: boolean
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          section_order?: number
          test_id?: string
          timing_mode?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sections_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          allow_navigation_back: boolean | null
          approved_at: string | null
          approved_by: string | null
          class_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          grading_config: Json | null
          id: string
          is_public_exam: boolean
          org_id: string
          per_question_timing: boolean | null
          require_google_auth: boolean
          show_results: boolean | null
          start_time: string | null
          status: Database["public"]["Enums"]["test_status"] | null
          teacher_id: string | null
          test_code: string
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_navigation_back?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          grading_config?: Json | null
          id?: string
          is_public_exam?: boolean
          org_id: string
          per_question_timing?: boolean | null
          require_google_auth?: boolean
          show_results?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          teacher_id?: string | null
          test_code: string
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_navigation_back?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          class_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          grading_config?: Json | null
          id?: string
          is_public_exam?: boolean
          org_id?: string
          per_question_timing?: boolean | null
          require_google_auth?: boolean
          show_results?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          teacher_id?: string | null
          test_code?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_decide_pending_test: {
        Args: { p_approve: boolean; p_test_id: string }
        Returns: boolean
      }
      auth_admin_org_id: { Args: never; Returns: string }
      auth_teacher_org_id: { Args: never; Returns: string }
      find_teacher_in_org: {
        Args: { p_email: string }
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      get_platform_usage: { Args: never; Returns: Json }
      get_test_collaborators: {
        Args: { p_test_id: string }
        Returns: {
          added_at: string
          email: string
          id: string
          name: string
          teacher_id: string
        }[]
      }
      has_attempted: {
        Args: {
          p_phone_number: string
          p_student_email: string
          p_test_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_test_collaborator: {
        Args: { check_test_id: string }
        Returns: boolean
      }
      org_active_test_count: { Args: { p_org_id: string }; Returns: number }
      org_can_write: { Args: { check_org_id: string }; Returns: boolean }
      org_teacher_analytics: {
        Args: { p_org_id: string }
        Returns: {
          avg_score_pct: number
          closed_count: number
          draft_count: number
          last_activity_at: string
          live_count: number
          teacher_email: string
          teacher_id: string
          teacher_name: string
          total_attempts: number
          total_tests: number
        }[]
      }
      org_within_active_test_limit: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      org_within_teacher_limit: { Args: { p_org_id: string }; Returns: boolean }
      owns_test: { Args: { check_test_id: string }; Returns: boolean }
    }
    Enums: {
      test_status: "draft" | "live" | "closed" | "pending_approval"
      token_status: "active" | "used" | "expired"
      user_role: "admin" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      test_status: ["draft", "live", "closed", "pending_approval"],
      token_status: ["active", "used", "expired"],
      user_role: ["admin", "teacher"],
    },
  },
} as const
