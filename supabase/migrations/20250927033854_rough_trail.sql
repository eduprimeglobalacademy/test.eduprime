/*
  # EduTest Database Schema

  1. New Tables
    - `admin_users` - Pre-seeded admin accounts
    - `teachers` - Teacher profiles and accounts
    - `teacher_tokens` - Registration tokens for teachers
    - `tests` - Test definitions and settings
    - `questions` - MCQ questions for tests
    - `question_options` - Answer options for questions
    - `test_attempts` - Student test attempts and results
    - `student_answers` - Individual answers from students

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each role
    - Secure token-based registration system

  3. Features
    - Role-based access control
    - Test scheduling and lifecycle management
    - Comprehensive analytics and reporting
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'teacher');
CREATE TYPE test_status AS ENUM ('draft', 'live', 'closed');

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Teacher tokens for registration
CREATE TABLE IF NOT EXISTS teacher_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  teacher_name text NOT NULL,
  phone_number text NOT NULL,
  created_by uuid REFERENCES admin_users(id),
  used_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone_number text NOT NULL,
  token_used uuid REFERENCES teacher_tokens(id),
  created_at timestamptz DEFAULT now()
);

-- Tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  test_code text UNIQUE NOT NULL,
  magic_link text UNIQUE NOT NULL,
  status test_status DEFAULT 'draft',
  duration_minutes integer, -- null means no time limit
  start_time timestamptz,
  end_time timestamptz,
  show_results boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_order integer NOT NULL,
  points integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Question options table
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  option_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Test attempts table
CREATE TABLE IF NOT EXISTS test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_email text,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  total_score integer DEFAULT 0,
  max_score integer DEFAULT 0,
  time_taken_seconds integer,
  is_submitted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Student answers table
CREATE TABLE IF NOT EXISTS student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES question_options(id),
  is_correct boolean DEFAULT false,
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insert default admin user
INSERT INTO admin_users (email, name) VALUES 
  ('admin@edutest.com', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage all admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = (auth.jwt() ->> 'email')
    )
  );

-- Teacher token policies
CREATE POLICY "Admins can manage teacher tokens"
  ON teacher_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Anyone can read valid tokens for registration"
  ON teacher_tokens FOR SELECT
  TO anon
  USING (expires_at > now() AND used_at IS NULL);

-- Teacher policies
CREATE POLICY "Teachers can read own profile"
  ON teachers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can update own profile"
  ON teachers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all teachers"
  ON teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.email = (auth.jwt() ->> 'email')
    )
  );

-- Test policies
CREATE POLICY "Teachers can manage own tests"
  ON tests FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read live tests"
  ON tests FOR SELECT
  TO anon
  USING (status = 'live');

-- Question policies
CREATE POLICY "Teachers can manage questions for own tests"
  ON questions FOR ALL
  TO authenticated
  USING (
    test_id IN (
      SELECT t.id FROM tests t
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read questions for live tests"
  ON questions FOR SELECT
  TO anon
  USING (
    test_id IN (
      SELECT id FROM tests WHERE status = 'live'
    )
  );

-- Question options policies
CREATE POLICY "Teachers can manage options for own questions"
  ON question_options FOR ALL
  TO authenticated
  USING (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN tests t ON q.test_id = t.id
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read options for live tests"
  ON question_options FOR SELECT
  TO anon
  USING (
    question_id IN (
      SELECT q.id FROM questions q
      JOIN tests t ON q.test_id = t.id
      WHERE t.status = 'live'
    )
  );

-- Test attempt policies
CREATE POLICY "Anyone can create test attempts"
  ON test_attempts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read own attempts"
  ON test_attempts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Teachers can view attempts for own tests"
  ON test_attempts FOR SELECT
  TO authenticated
  USING (
    test_id IN (
      SELECT t.id FROM tests t
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );

-- Student answers policies
CREATE POLICY "Anyone can create answers"
  ON student_answers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can read own answers"
  ON student_answers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Teachers can view answers for own tests"
  ON student_answers FOR SELECT
  TO authenticated
  USING (
    attempt_id IN (
      SELECT ta.id FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      JOIN teachers te ON t.teacher_id = te.id
      WHERE te.user_id = auth.uid()
    )
  );