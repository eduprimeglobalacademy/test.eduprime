export function generateTestCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function formatDateTime(dateString: string): string {
  // Format datetime in local timezone with proper formatting
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function isTestActive(test: any): boolean {
  const now = new Date()
  const startTime = test.start_time ? new Date(test.start_time) : null
  const endTime = test.end_time ? new Date(test.end_time) : null

  if (startTime && now < startTime) return false
  if (endTime && now > endTime) return false
  return test.status === 'live'
}

export function getTestTimeStatus(test: any): 'not-started' | 'active' | 'ended' {
  const now = new Date()
  const startTime = test.start_time ? new Date(test.start_time) : null
  const endTime = test.end_time ? new Date(test.end_time) : null

  if (startTime && now < startTime) return 'not-started'
  if (endTime && now > endTime) return 'ended'
  return 'active'
}

export function calculateScore(answers: any[], questions: any[]): { score: number; maxScore: number } {
  let score = 0
  let maxScore = 0

  questions.forEach((question) => {
    maxScore += question.points
    const answer = answers.find((a) => a.question_id === question.id)
    if (answer && answer.is_correct) {
      score += question.points
    }
  })

  return { score, maxScore }
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}