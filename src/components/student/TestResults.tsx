import React from 'react'
import { CheckCircle, XCircle, Award, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'

interface TestResultsProps {
  results: {
    score: number
    maxScore: number
    showResults: boolean
    testTitle: string
    studentName: string
    studentEmail: string
    submittedAt: string
    gradingConfig?: {
      aGrade: number
      bGrade: number
      cGrade: number
      dGrade: number
      passingGrade: number
    }
    questions: Array<{
      id: string
      question_text: string
      points: number
      selectedAnswer?: string
      correctAnswer?: string
      options: Array<{
        id: string
        option_text: string
        is_correct: boolean
      }>
    }>
  }
}

export function TestResults({ results }: TestResultsProps) {
  const { score, maxScore, showResults, testTitle, studentName, studentEmail, submittedAt, questions } = results
  const percentage = Math.round((score / maxScore) * 100)
  
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' }
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const gradeInfo = getGrade(percentage)

  const downloadPDF = () => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text('Test Results', 20, 20)
    
    // Student Info
    doc.setFontSize(12)
    doc.text(`Test: ${testTitle}`, 20, 35)
    doc.text(`Student: ${studentName}`, 20, 45)
    doc.text(`Email: ${studentEmail}`, 20, 55)
    doc.text(`Submitted: ${new Date(submittedAt).toLocaleString()}`, 20, 65)
    
    // Score Summary
    doc.setFontSize(14)
    doc.text('Score Summary', 20, 85)
    doc.setFontSize(12)
    doc.text(`Score: ${score}/${maxScore} (${percentage}%)`, 20, 95)
    doc.text(`Grade: ${gradeInfo.grade}`, 20, 105)
    
    // Questions and Answers
    let yPosition = 125
    doc.setFontSize(14)
    doc.text('Detailed Results', 20, yPosition)
    yPosition += 15
    
    questions.forEach((question, index) => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }
      
      const isCorrect = question.selectedAnswer === question.correctAnswer
      const selectedOption = question.options.find(opt => opt.id === question.selectedAnswer)
      const correctOption = question.options.find(opt => opt.is_correct)
      
      doc.setFontSize(12)
      doc.text(`Q${index + 1}: ${question.question_text}`, 20, yPosition)
      yPosition += 10
      
      doc.setFontSize(10)
      doc.text(`Your Answer: ${selectedOption?.option_text || 'Not answered'}`, 25, yPosition)
      yPosition += 8
      doc.text(`Correct Answer: ${correctOption?.option_text}`, 25, yPosition)
      yPosition += 8
      doc.text(`Result: ${isCorrect ? 'Correct' : 'Incorrect'} (${isCorrect ? question.points : 0}/${question.points} points)`, 25, yPosition)
      yPosition += 15
    })
    
    doc.save(`${testTitle}_Results_${studentName}.pdf`)
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Results Summary */}
        <Card className="mb-8">
          <div className="p-8 text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${gradeInfo.bg} mb-6`}>
              <Award className={`w-10 h-10 ${gradeInfo.color}`} />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Completed!</h1>
            
            <div className="flex items-center justify-center space-x-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
              <div className="text-4xl text-gray-300">/</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{maxScore}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
            </div>

            <div className={`inline-flex items-center px-6 py-3 rounded-full ${gradeInfo.bg} mb-6`}>
              <span className={`text-2xl font-bold ${gradeInfo.color} mr-2`}>{gradeInfo.grade}</span>
              <span className={`text-lg font-semibold ${gradeInfo.color}`}>{percentage}%</span>
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                {questions.filter(q => q.selectedAnswer === q.correctAnswer).length} Correct
              </div>
              <div className="flex items-center">
                <XCircle className="w-4 h-4 text-red-500 mr-1" />
                {questions.filter(q => q.selectedAnswer && q.selectedAnswer !== q.correctAnswer).length} Incorrect
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-400 rounded-full mr-1" />
                {questions.filter(q => !q.selectedAnswer).length} Unanswered
              </div>
            </div>

            <Button onClick={downloadPDF} variant="outline" className="mt-6">
              <Download className="w-4 h-4 mr-2" />
              Download Results (PDF)
            </Button>
          </div>
        </Card>

        {/* Detailed Results */}
        {showResults && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
            
            {questions.map((question, index) => {
              const isCorrect = question.selectedAnswer === question.correctAnswer
              const wasAnswered = !!question.selectedAnswer
              const selectedOption = question.options.find(opt => opt.id === question.selectedAnswer)
              const correctOption = question.options.find(opt => opt.is_correct)

              return (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center">
                        <span className="mr-3">Question {index + 1}</span>
                        {wasAnswered ? (
                          isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )
                        ) : (
                          <div className="w-5 h-5 bg-gray-400 rounded-full" />
                        )}
                      </CardTitle>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {isCorrect ? question.points : 0} / {question.points} points
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <div className="px-6 pb-6">
                    <p className="text-gray-900 mb-4">{question.question_text}</p>
                    
                    <div className="space-y-2">
                      {question.options.map((option) => {
                        const isSelected = option.id === question.selectedAnswer
                        const isCorrectOption = option.is_correct
                        
                        let className = "flex items-center p-3 border rounded-lg "
                        
                        if (isCorrectOption) {
                          className += "border-green-500 bg-green-50"
                        } else if (isSelected && !isCorrectOption) {
                          className += "border-red-500 bg-red-50"
                        } else {
                          className += "border-gray-200"
                        }

                        return (
                          <div key={option.id} className={className}>
                            <div className="flex items-center flex-1">
                              <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                              </div>
                              <span className="text-gray-900">{option.option_text}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {isSelected && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  Your Answer
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {!wasAnswered && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Not answered.</strong> Correct answer: {correctOption?.option_text}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {!showResults && (
          <Card>
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment Submitted</h3>
              <p className="text-gray-600">
                Your assessment has been submitted successfully. Detailed results are not available for this assessment.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}