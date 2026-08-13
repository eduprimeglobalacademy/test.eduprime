// Small, fixed palette of extra student-detail fields a teacher can opt a
// public exam into collecting — not a generic custom-field builder. Each
// key maps 1:1 to a nullable column on test_attempts (see migration
// 20260813190000). Shared between the teacher-side picker (TestAuthoring)
// and the student-side form (TestInterface) so labels/order stay in sync.
export type StudentDetailField = 'college_name' | 'section' | 'course' | 'year_of_study' | 'semester'

export const STUDENT_DETAIL_FIELDS: { key: StudentDetailField; label: string; placeholder: string }[] = [
  { key: 'college_name', label: 'College Name', placeholder: 'Enter your college name' },
  { key: 'section', label: 'Section', placeholder: 'e.g. A' },
  { key: 'course', label: 'Course', placeholder: 'e.g. B.Tech Computer Science' },
  { key: 'year_of_study', label: 'Year', placeholder: 'e.g. 3rd Year' },
  { key: 'semester', label: 'Semester', placeholder: 'e.g. 6th Semester' },
]

export const ALL_STUDENT_DETAIL_FIELD_KEYS: StudentDetailField[] = STUDENT_DETAIL_FIELDS.map(f => f.key)

export function studentDetailFieldLabel(key: StudentDetailField): string {
  return STUDENT_DETAIL_FIELDS.find(f => f.key === key)?.label ?? key
}
