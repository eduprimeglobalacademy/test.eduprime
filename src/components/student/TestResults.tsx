import { CheckCircle, XCircle, Download, MinusCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Button } from '../ui/Button'
import { useTenant } from '../../contexts/TenantContext'
import { TestWatermark } from './TestWatermark'

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const num = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

interface TestResultsProps {
  results: {
    score: number
    maxScore: number
    showResults: boolean
    testTitle: string
    studentName: string
    studentEmail: string
    submittedAt: string
    gradingConfig?: { aGrade: number; bGrade: number; cGrade: number; dGrade: number; passingGrade: number }
    questions: Array<{
      id: string
      question_text: string
      points: number
      question_type: 'single_select' | 'multi_select' | 'true_false' | 'short_answer'
      selectedAnswer?: string | string[]
      correctAnswer?: string
      isCorrect: boolean
      options: Array<{ id: string; option_text: string; is_correct: boolean }>
    }>
  }
}

export function TestResults({ results }: TestResultsProps) {
  const { org } = useTenant()
  const { score, maxScore, showResults, testTitle, studentName, studentEmail, submittedAt, questions } = results
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  const getGrade = (pct: number) => {
    const g = results.gradingConfig
    if (g) {
      if (pct >= g.aGrade) return { grade: 'A', color: 'text-emerald-700', bg: 'bg-emerald-100', ring: 'ring-emerald-300' }
      if (pct >= g.bGrade) return { grade: 'B', color: 'text-blue-700', bg: 'bg-blue-100', ring: 'ring-blue-300' }
      if (pct >= g.cGrade) return { grade: 'C', color: 'text-amber-700', bg: 'bg-amber-100', ring: 'ring-amber-300' }
      if (pct >= g.dGrade) return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-100', ring: 'ring-orange-300' }
      return { grade: 'F', color: 'text-red-700', bg: 'bg-red-100', ring: 'ring-red-300' }
    }
    if (pct >= 90) return { grade: 'A', color: 'text-emerald-700', bg: 'bg-emerald-100', ring: 'ring-emerald-300' }
    if (pct >= 80) return { grade: 'B', color: 'text-blue-700', bg: 'bg-blue-100', ring: 'ring-blue-300' }
    if (pct >= 70) return { grade: 'C', color: 'text-amber-700', bg: 'bg-amber-100', ring: 'ring-amber-300' }
    if (pct >= 60) return { grade: 'D', color: 'text-orange-700', bg: 'bg-orange-100', ring: 'ring-orange-300' }
    return { grade: 'F', color: 'text-red-700', bg: 'bg-red-100', ring: 'ring-red-300' }
  }

  const hasAnswer = (q: TestResultsProps['results']['questions'][number]) =>
    Array.isArray(q.selectedAnswer) ? q.selectedAnswer.length > 0 : !!q.selectedAnswer?.trim()

  const gradeInfo = getGrade(percentage)
  const correct = questions.filter(q => hasAnswer(q) && q.isCorrect).length
  const incorrect = questions.filter(q => hasAnswer(q) && !q.isCorrect).length
  const unanswered = questions.filter(q => !hasAnswer(q)).length

  const downloadPDF = () => {
    const doc = new jsPDF()
    const [r, g, b] = hexToRgb(org?.primary_color || '#6366F1')

    doc.setFillColor(r, g, b)
    doc.rect(0, 0, 210, 12, 'F')

    doc.setFontSize(11)
    doc.setTextColor(org ? '#FFFFFF' : '#FFFFFF')
    doc.text(org?.name || 'EduPrime Global Academy', 20, 8)

    doc.setTextColor('#000000')
    doc.setFontSize(20)
    doc.text('Assessment Results', 20, 28)
    doc.setFontSize(12)
    doc.text(`Test: ${testTitle}`, 20, 43)
    doc.text(`Student: ${studentName}`, 20, 53)
    doc.text(`Email: ${studentEmail}`, 20, 63)
    doc.text(`Submitted: ${new Date(submittedAt).toLocaleString()}`, 20, 73)
    doc.setFontSize(14)
    doc.text('Score Summary', 20, 93)
    doc.setFontSize(12)
    doc.text(`Score: ${score}/${maxScore} (${percentage}%)`, 20, 103)
    doc.text(`Grade: ${gradeInfo.grade}`, 20, 113)
    doc.save(`${testTitle}_Results_${studentName}.pdf`)
  }

  return (
    <div className="min-h-screen bg-app py-8 px-4">
      <TestWatermark text={`${studentName} · ${studentEmail}`} />
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-8 text-center">
          <div
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: `conic-gradient(var(--brand-primary) ${percentage}%, var(--surface-2) 0)` }}
          >
            <div className="w-[76px] h-[76px] rounded-full bg-surface flex items-center justify-center">
              <span className="font-display font-bold text-xl text-ink">{percentage}%</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Assessment Complete!</h1>
          <p className="text-ink-faint text-sm mb-6">{testTitle}</p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold font-display text-ink">{score}</div>
              <div className="text-xs text-ink-faint mt-1">Points Earned</div>
            </div>
            <div className="text-3xl text-ink-muted font-light">/</div>
            <div className="text-center">
              <div className="text-4xl font-bold font-display text-ink">{maxScore}</div>
              <div className="text-xs text-ink-faint mt-1">Total Points</div>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl ${gradeInfo.bg} mb-6`}>
            <span className={`text-3xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
            <span className={`text-xl font-semibold ${gradeInfo.color}`}>{percentage}%</span>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">{correct}</span>
              <span className="text-ink-muted">correct</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">{incorrect}</span>
              <span className="text-ink-muted">incorrect</span>
            </div>
            {unanswered > 0 && (
              <div className="flex items-center gap-1.5 text-ink-muted">
                <MinusCircle className="w-4 h-4" />
                <span className="font-medium">{unanswered}</span>
                <span>unanswered</span>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={downloadPDF} className="mt-6">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>

        {/* Student info */}
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-5">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-ink-muted mb-1">Student</p><p className="font-medium text-ink">{studentName}</p></div>
            <div><p className="text-xs text-ink-muted mb-1">Email</p><p className="font-medium text-ink truncate">{studentEmail}</p></div>
            <div><p className="text-xs text-ink-muted mb-1">Submitted</p><p className="font-medium text-ink">{new Date(submittedAt).toLocaleString()}</p></div>
          </div>
        </div>

        {/* Detailed results */}
        {showResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-ink">Question Review</h2>
            {questions.map((question, index) => {
              const isCorrect = question.isCorrect
              const wasAnswered = hasAnswer(question)
              return (
                <div key={question.id} className="bg-surface rounded-2xl border border-app shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 flex items-start justify-between gap-4 border-b ${
                    !wasAnswered ? 'border-app bg-surface-2' :
                    isCorrect ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {!wasAnswered ? <MinusCircle className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" /> :
                       isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> :
                       <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <span className="text-xs font-semibold text-ink-faint uppercase tracking-wide">Question {index + 1}</span>
                        <p className="text-ink font-medium mt-1">{question.question_text}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-2 text-ink-soft'
                    }`}>
                      {isCorrect ? question.points : 0}/{question.points}
                    </span>
                  </div>

                  {question.question_type === 'short_answer' ? (
                    <div className="p-5 space-y-3">
                      <div>
                        <p className="text-xs text-ink-muted mb-1">Your answer</p>
                        <p className={`text-sm p-3 rounded-xl border ${
                          !wasAnswered ? 'border-app text-ink-muted italic' :
                          isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'
                        }`}>
                          {wasAnswered ? (question.selectedAnswer as string) : 'No answer'}
                        </p>
                      </div>
                      {!isCorrect && (
                        <div>
                          <p className="text-xs text-ink-muted mb-1">Acceptable answers</p>
                          <p className="text-sm p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800">
                            {question.options.map(o => o.option_text).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-5 space-y-2">
                      {question.options.map(option => {
                        const isSelected = question.question_type === 'multi_select'
                          ? Array.isArray(question.selectedAnswer) && question.selectedAnswer.includes(option.id)
                          : option.id === question.selectedAnswer
                        const isCorrectOpt = option.is_correct
                        return (
                          <div key={option.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isCorrectOpt ? 'border-emerald-300 bg-emerald-50' :
                            isSelected && !isCorrectOpt ? 'border-red-300 bg-red-50' :
                            'border-app'
                          }`}>
                            <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              isSelected ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]' : 'border-app-strong'
                            }`}>
                              {isSelected && <div className="w-2 h-2 bg-surface rounded-full" />}
                            </div>
                            <span className={`text-sm flex-1 ${isCorrectOpt ? 'text-emerald-800 font-medium' : isSelected ? 'text-red-800' : 'text-ink-soft'}`}>
                              {option.option_text}
                            </span>
                            <div className="flex gap-1.5">
                              {isSelected && <span className="badge bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)] text-xs">Your answer</span>}
                              {isCorrectOpt && <span className="badge bg-emerald-100 text-emerald-700 text-xs">Correct</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!showResults && (
          <div className="bg-surface rounded-2xl border border-app shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-ink mb-2">Assessment Submitted Successfully</h3>
            <p className="text-ink-faint text-sm">Detailed results are not available for this assessment. Thank you for participating!</p>
          </div>
        )}
      </div>
    </div>
  )
}
