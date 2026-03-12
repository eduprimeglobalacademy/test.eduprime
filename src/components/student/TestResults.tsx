import { CheckCircle, XCircle, Award, Download, MinusCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Button } from '../ui/Button'

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
      selectedAnswer?: string
      correctAnswer?: string
      options: Array<{ id: string; option_text: string; is_correct: boolean }>
    }>
  }
}

export function TestResults({ results }: TestResultsProps) {
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

  const gradeInfo = getGrade(percentage)
  const correct = questions.filter(q => q.selectedAnswer === q.correctAnswer).length
  const incorrect = questions.filter(q => q.selectedAnswer && q.selectedAnswer !== q.correctAnswer).length
  const unanswered = questions.filter(q => !q.selectedAnswer).length

  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Assessment Results', 20, 20)
    doc.setFontSize(12)
    doc.text(`Test: ${testTitle}`, 20, 35)
    doc.text(`Student: ${studentName}`, 20, 45)
    doc.text(`Email: ${studentEmail}`, 20, 55)
    doc.text(`Submitted: ${new Date(submittedAt).toLocaleString()}`, 20, 65)
    doc.setFontSize(14)
    doc.text('Score Summary', 20, 85)
    doc.setFontSize(12)
    doc.text(`Score: ${score}/${maxScore} (${percentage}%)`, 20, 95)
    doc.text(`Grade: ${gradeInfo.grade}`, 20, 105)
    doc.save(`${testTitle}_Results_${studentName}.pdf`)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${gradeInfo.bg} ring-4 ${gradeInfo.ring} mb-6`}>
            <Award className={`w-10 h-10 ${gradeInfo.color}`} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Assessment Complete!</h1>
          <p className="text-gray-500 text-sm mb-6">{testTitle}</p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{score}</div>
              <div className="text-xs text-gray-500 mt-1">Points Earned</div>
            </div>
            <div className="text-3xl text-gray-200 font-light">/</div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{maxScore}</div>
              <div className="text-xs text-gray-500 mt-1">Total Points</div>
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
              <span className="text-gray-400">correct</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">{incorrect}</span>
              <span className="text-gray-400">incorrect</span>
            </div>
            {unanswered > 0 && (
              <div className="flex items-center gap-1.5 text-gray-400">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400 mb-1">Student</p><p className="font-medium text-gray-900">{studentName}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Email</p><p className="font-medium text-gray-900 truncate">{studentEmail}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">Submitted</p><p className="font-medium text-gray-900">{new Date(submittedAt).toLocaleString()}</p></div>
          </div>
        </div>

        {/* Detailed results */}
        {showResults && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Question Review</h2>
            {questions.map((question, index) => {
              const isCorrect = question.selectedAnswer === question.correctAnswer
              const wasAnswered = !!question.selectedAnswer
              return (
                <div key={question.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 flex items-start justify-between gap-4 border-b ${
                    !wasAnswered ? 'border-gray-100 bg-gray-50' :
                    isCorrect ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {!wasAnswered ? <MinusCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" /> :
                       isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> :
                       <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Question {index + 1}</span>
                        <p className="text-gray-900 font-medium mt-1">{question.question_text}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isCorrect ? question.points : 0}/{question.points}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    {question.options.map(option => {
                      const isSelected = option.id === question.selectedAnswer
                      const isCorrectOpt = option.is_correct
                      return (
                        <div key={option.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                          isCorrectOpt ? 'border-emerald-300 bg-emerald-50' :
                          isSelected && !isCorrectOpt ? 'border-red-300 bg-red-50' :
                          'border-gray-100'
                        }`}>
                          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className={`text-sm flex-1 ${isCorrectOpt ? 'text-emerald-800 font-medium' : isSelected ? 'text-red-800' : 'text-gray-700'}`}>
                            {option.option_text}
                          </span>
                          <div className="flex gap-1.5">
                            {isSelected && <span className="badge bg-indigo-100 text-indigo-700 text-xs">Your answer</span>}
                            {isCorrectOpt && <span className="badge bg-emerald-100 text-emerald-700 text-xs">Correct</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!showResults && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment Submitted Successfully</h3>
            <p className="text-gray-500 text-sm">Detailed results are not available for this assessment. Thank you for participating!</p>
          </div>
        )}
      </div>
    </div>
  )
}
