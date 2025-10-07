import React, { useState, useEffect } from 'react'
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface TestPreviewProps {
  testId: string
  onBack: () => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

export function TestPreview({ testId, onBack }: TestPreviewProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTestData()
  }, [testId])

  const fetchTestData = async () => {
    try {
      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError) throw testError
      setTest(testData)

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_options (*)
        `)
        .eq('test_id', testId)
        .order('question_order')

      if (questionsError) throw questionsError

      const formattedQuestions = questionsData.map(q => ({
        ...q,
        options: q.question_options.sort((a: any, b: any) => a.option_order - b.option_order)
      }))

      setQuestions(formattedQuestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <div className="p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Test</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={onBack}>Go Back</Button>
          </div>
        </Card>
      </div>
    )
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={onBack} className="mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{test?.title}</h1>
                <span className="text-sm text-blue-600 font-medium">PREVIEW MODE</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {test?.duration_minutes && (
                <div className="flex items-center px-3 py-1 rounded-lg bg-blue-100 text-blue-700">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-mono">{test.duration_minutes}:00</span>
                </div>
              )}
              <span className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Test Info */}
        {test?.description && (
          <Card className="mb-6">
            <div className="p-4">
              <p className="text-gray-700">{test.description}</p>
            </div>
          </Card>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex-1">
                {currentQ.question_text}
              </h2>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium ml-4">
                {currentQ.points} {currentQ.points === 1 ? 'point' : 'points'}
              </span>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQ.id] === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option.id}
                    checked={answers[currentQ.id] === option.id}
                    onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-gray-900">{option.option_text}</span>
                  {option.is_correct && (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentQuestion
                    ? 'bg-blue-600 text-white'
                    : answers[questions[index].id]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === questions.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Answer Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Preview Summary</CardTitle>
          </CardHeader>
          <div className="p-4">
            <div className="grid grid-cols-10 gap-2">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                    answers[questions[index].id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Questions:</span> {questions.length}
              </div>
              <div>
                <span className="font-medium">Total Points:</span> {questions.reduce((sum, q) => sum + q.points, 0)}
              </div>
              <div>
                <span className="font-medium">Preview Answers:</span> {Object.keys(answers).length}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}