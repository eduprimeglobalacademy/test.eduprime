import type { StudentDetailField } from './studentDetailFields'

// sessionStorage (not localStorage) is deliberate — a snapshot should
// survive a refresh but clear on tab close, and never leak across
// devices/sessions or need manual expiry.
export interface TestProgressSnapshot {
  phase: 'instructions' | 'test' | 'submitting'
  studentName: string
  studentEmail: string
  studentPhone: string
  googleEmailLocked: boolean
  answers: Record<string, string | string[]>
  // Public-exam-only extra fields (college/section/course/etc.) — empty
  // object for every other test.
  extraDetails: Partial<Record<StudentDetailField, string>>
  currentQuestion: number
  currentSectionIdx: number
  // Absolute epoch-ms deadlines, not remaining-seconds counters — a
  // remaining-seconds snapshot would let a student refresh repeatedly to
  // keep resetting their own clock.
  wholeTestDeadline: number | null
  questionDeadline: number | null
  sectionDeadline: number | null
}

const key = (testCode: string) => `eduprime-test-progress:${testCode.toUpperCase()}`

export function saveTestProgress(testCode: string, snapshot: TestProgressSnapshot) {
  try {
    sessionStorage.setItem(key(testCode), JSON.stringify(snapshot))
  } catch {
    // Storage unavailable (private browsing quirks, quota) — persistence is
    // a best-effort enhancement, not a requirement to take the test.
  }
}

export function loadTestProgress(testCode: string): TestProgressSnapshot | null {
  try {
    const raw = sessionStorage.getItem(key(testCode))
    return raw ? (JSON.parse(raw) as TestProgressSnapshot) : null
  } catch {
    return null
  }
}

export function clearTestProgress(testCode: string) {
  try {
    sessionStorage.removeItem(key(testCode))
  } catch {
    // Nothing to do — see saveTestProgress.
  }
}
