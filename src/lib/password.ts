// Password standard for this app — applied everywhere a password is created
// or changed (RegisterModal, CreateOrganizationModal, TeacherSettings).
// Deliberately not demanding special characters/uppercase — modern guidance
// (NIST 800-63B) favors length over composition rules; those mostly just
// frustrate users without a proportionate security gain. 8+ chars with a
// letter and a number is a reasonable floor for a school/coaching-center
// SaaS, not an enterprise security product.
export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_REQUIREMENTS = [
  `At least ${PASSWORD_MIN_LENGTH} characters`,
  'At least one letter',
  'At least one number',
]

/** Returns the first unmet requirement, or null if the password is valid. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Must be at least ${PASSWORD_MIN_LENGTH} characters`
  if (!/[a-zA-Z]/.test(password)) return 'Must include at least one letter'
  if (!/[0-9]/.test(password)) return 'Must include at least one number'
  return null
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null
}
