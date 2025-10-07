import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface TestInterfaceProps {
  testCode: string
  onComplete: (results: any) => void
}

interface TestQuestion extends Question {
  options: QuestionOption[]
}

type TestPhase = 'details' | 'instructions' | 'test' | 'submitting'

export function TestInterface({ testCode, onComplete }: TestInterfaceProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [phase, setPhase] = useState<TestPhase>('details')
  const [duplicateError, setDuplicateError] = useState('')
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    fetchTest()
  }, [testCode])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && phase === 'test') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && phase === 'test') {
      handleSubmit()
    }
  }, [timeLeft, phase])

  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && phase === 'test') {
      const timer = setTimeout(() => setQuestionTimeLeft(questionTimeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (questionTimeLeft === 0 && phase === 'test') {
      // Auto-advance to next question when time expires (only if still on the same question)
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1)
      } else {
        // Last question, submit test
        handleSubmit()
      }
    }
  }, [questionTimeLeft, questions.length, phase])

  useEffect(() => {
    // Set question timer when changing questions (if per-question timing is enabled)
    if (test?.per_question_timing && questions.length > 0 && phase === 'test') {
      const currentQ = questions[currentQuestion]
      // All questions should have the same time limit when per-question timing is enabled
      if (currentQ?.time_limit_seconds) {
        setQuestionTimeLeft(currentQ.time_limit_seconds)
      }
    }
  }, [currentQuestion, test?.per_question_timing, questions, phase])
  const fetchTest = async () => {
    try {
      // Fetch test by code
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('test_code', testCode.toUpperCase())
        .single()

      if (testError || !testData) {
        setError('Test not found or not available')
        setLoading(false)
        return
      }

      // Check if test is live
      if (testData.status !== 'live') {
        setError('Test is not currently active')
        setLoading(false)
        return
      }

      // Check if test is within time bounds
      const now = new Date()
      if (testData.start_time && new Date(testData.start_time) > now) {
        setError('Test has not started yet')
        setLoading(false)
        return
      }
      if (testData.end_time && new Date(testData.end_time) < now) {
        setError('Test has ended')
        setLoading(false)
        return
      }

      setTest(testData)

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_options (*)
        `)
        .eq('test_id', testData.id)
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

  const handleDetailsSubmit = () => {
    if (!studentName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!studentEmail.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!studentPhone.trim()) {
      setError('Please enter your phone number')
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(studentEmail)) {
      setError('Please enter a valid email address')
      return
    }
    
    // Validate phone format (basic validation)
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
    if (!phoneRegex.test(studentPhone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number')
      return
    }
    
    setError('')
    checkDuplicateAttempt()
  }

  const checkDuplicateAttempt = async () => {
    try {
      const { data: existingAttempt, error } = await supabase
        .from('test_attempts')
        .select('id')
        .eq('test_id', test!.id)
        .eq('student_email', studentEmail.trim())
        .eq('phone_number', studentPhone.trim())
        .eq('is_submitted', true)
        .maybeSingle()

      if (existingAttempt) {
        setDuplicateError('You have already taken this test. Each student can only take a test once.')
        return
      }
      
      setDuplicateError('')
      setPhase('instructions')
    } catch (err) {
      // No existing attempt found, proceed
      setDuplicateError('')
      setPhase('instructions')
    }
  }
  const handleStartTest = () => {
    setPhase('test')
    // Set timer based on timing mode
    if (test?.per_question_timing && questions.length > 0) {
      // Set timer for first question
      const firstQuestion = questions[0]
      if (firstQuestion?.time_limit_seconds) {
        setQuestionTimeLeft(firstQuestion.time_limit_seconds)
      }
      // Clear any overall test timer when using per-question timing
      setTimeLeft(null)
    } else if (test?.duration_minutes) {
      // Set overall test timer
      setTimeLeft(test.duration_minutes * 60)
      // Clear question timer when using overall timing
      setQuestionTimeLeft(null)
    }
  }

  const handleAnswerChange = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = async () => {
    setPhase('submitting')
    
    try {
      console.log('Starting test submission...')
      console.log('Test ID:', test!.id)
      console.log('Student Name:', studentName)
      console.log('Answers:', answers)
      
      // Calculate scores first
      let totalScore = 0
      let maxScore = 0

      for (const question of questions) {
        maxScore += question.points
        const selectedOptionId = answers[question.id]
        
        if (selectedOptionId) {
          const selectedOption = question.options.find(opt => opt.id === selectedOptionId)
          const isCorrect = selectedOption?.is_correct || false
          const pointsEarned = isCorrect ? question.points : 0
          
          if (isCorrect) totalScore += pointsEarned
        }
      }

      console.log('Calculated scores - Total:', totalScore, 'Max:', maxScore)

      // Create test attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert([{
          test_id: test!.id,
          student_name: studentName,
          student_email: studentEmail,
          phone_number: studentPhone,
          total_score: totalScore,
          max_score: maxScore,
          time_taken_seconds: test!.duration_minutes ? Math.max(0, (test!.duration_minutes * 60) - (timeLeft || 0)) : null,
          is_submitted: true,
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (attemptError) throw attemptError
      console.log('Test attempt created:', attemptData)

      // Save individual answers
      for (const question of questions) {
        const selectedOptionId = answers[question.id]
        console.log(`Question ${question.id}: Selected option ${selectedOptionId}`)
        
        if (selectedOptionId) {
          const selectedOption = question.options.find(opt => opt.id === selectedOptionId)
          const isCorrect = selectedOption?.is_correct || false
          const pointsEarned = isCorrect ? question.points : 0
          
          console.log(`Question ${question.id}: Correct=${isCorrect}, Points=${pointsEarned}`)

          // Save answer
          const { error: answerError } = await supabase
            .from('student_answers')
            .insert([{
              attempt_id: attemptData.id,
              question_id: question.id,
              selected_option_id: selectedOptionId,
              is_correct: isCorrect,
              points_earned: pointsEarned
            }])
          
          if (answerError) {
            console.error('Error saving answer:', answerError)
            throw answerError
          }
        }
      }

      console.log('Test submission completed successfully')

      onComplete({
        score: totalScore,
        maxScore,
        showResults: test!.show_results,
        testTitle: test!.title,
        studentName,
        studentEmail,
        submittedAt: new Date().toISOString(),
        gradingConfig: test!.grading_config,
        questions: questions.map(q => ({
          ...q,
          selectedAnswer: answers[q.id],
          correctAnswer: q.options.find(opt => opt.is_correct)?.id
        }))
      })
    } catch (err) {
      console.error('Test submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit test')
      setPhase('test')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Unavailable</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  // Student Details Form
  if (phase === 'details') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{test?.title}</CardTitle>
            {test?.description && (
              <p className="text-gray-600 text-center">{test.description}</p>
            )}
          </CardHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your phone number"
                required
              />
            </div>

            {(error || duplicateError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error || duplicateError}</p>
              </div>
            )}

            <Button onClick={handleDetailsSubmit} className="w-full" size="lg">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Instructions Page
  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl">{test?.title}</CardTitle>
            <p className="text-center text-gray-600">Test Instructions</p>
          </CardHeader>
          
          <div className="space-y-6">
            {/* Test Overview */}
            <div className="grid md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-sm text-blue-700">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {questions.reduce((sum, q) => sum + q.points, 0)}
                </div>
                <div className="text-sm text-blue-700">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {test?.per_question_timing && questions.length > 0 && questions[0]?.time_limit_seconds
                    ? `${questions[0].time_limit_seconds}s per question`
                    : test?.duration_minutes 
                    ? `${test.duration_minutes} min` 
                    : 'No Limit'}
                </div>
                <div className="text-sm text-blue-700">Time Limit</div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Important Instructions:</h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">1</div>
                  <p>Read each question carefully before selecting your answer.</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">2</div>
                  <p>
                    {test?.per_question_timing 
                      ? "You can move forward to the next question but cannot go back to previous questions once you've moved forward."
                      : test?.allow_navigation_back
                      ? "You can navigate between questions using the Previous/Next buttons or question numbers."
                      : "You can only move forward through questions - no going back to previous questions."
                    }
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">3</div>
                  <p>Your progress is automatically saved as you answer questions.</p>
                </div>
                {test?.per_question_timing && questions.length > 0 && questions[0]?.time_limit_seconds ? (
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">!</div>
                    <p className="text-orange-700">
                      <strong>Per-Question Timing:</strong> Each question has {questions[0].time_limit_seconds} seconds. 
                      Questions will automatically advance when time runs out, but you can move to the next question anytime.
                    </p>
                  </div>
                ) : test?.duration_minutes ? (
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">!</div>
                    <p className="text-red-700">
                      <strong>Time Limit:</strong> You have {test.duration_minutes} minutes to complete this test. 
                      The test will auto-submit when time runs out.
                    </p>
                  </div>
                ) : null}
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">✓</div>
                  <p>Make sure to click "Submit Test" when you're finished with all questions.</p>
                </div>
              </div>
            </div>

            {/* Student Info Confirmation */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Your Details:</h4>
              <p className="text-gray-700"><strong>Name:</strong> {studentName}</p>
              <p className="text-gray-700"><strong>Email:</strong> {studentEmail}</p>
              <p className="text-gray-700"><strong>Phone:</strong> {studentPhone}</p>
              <button
                onClick={() => setPhase('details')}
                className="text-blue-600 text-sm hover:underline mt-2"
              >
                Change details
              </button>
            </div>

            <div className="flex space-x-4">
              <Button
                variant="outline"
                onClick={() => setPhase('details')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStartTest}
                className="flex-1"
                size="lg"
              >
                Start Test
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Submitting State
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <div className="p-8">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitting Assessment</h2>
            <p className="text-gray-600">Please wait while we process your answers...</p>
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
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center flex-1 min-w-0">
              <img 
                src="/eduprimelogo.jpg" 
                alt="EduPrime Global Academy" 
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain mr-2 sm:mr-3 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  EduPrime Global Academy
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{test?.title}</p>
              </div>
            </div>
            
            {/* Mobile Submit Button */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                onClick={handleSubmit}
                loading={phase === 'submitting'}
                disabled={Object.keys(answers).length === 0}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">Submit</span>
              </Button>
              
              {test?.per_question_timing && questionTimeLeft !== null ? (
                <div className={`flex items-center px-3 py-1 rounded-lg ${
                  questionTimeLeft < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-mono text-sm">{formatTime(questionTimeLeft)}</span>
                  <span className="ml-1 text-xs hidden sm:inline">per question</span>
                </div>
              ) : timeLeft !== null ? (
                <div className={`flex items-center px-3 py-1 rounded-lg ${
                  timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
                </div>
              ) : null}
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Progress Bar */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Mobile Question Counter */}
          <div className="sm:hidden text-center mt-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
        </div>

       {/* Question */}
<Card className="mb-4 sm:mb-8">
  <div className="p-4 sm:p-6">
    <div className="flex items-start justify-between mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1 pr-2 whitespace-pre-wrap">
        {currentQ.question_text}
      </h2>
      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs sm:text-sm font-medium flex-shrink-0">
        {currentQ.points} {currentQ.points === 1 ? 'point' : 'points'}
      </span>
    </div>

    <div className="space-y-2 sm:space-y-3">
      {currentQ.options.map((option) => (
        <label
          key={option.id}
          className={`flex items-start p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
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
            className="mr-3 text-blue-600 mt-0.5 flex-shrink-0"
          />
          <span className="text-sm sm:text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
            {option.option_text}
          </span>
        </label>
      ))}
    </div>
  </div>
</Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4 sm:mb-0">
          <Button
            variant="outline"
            onClick={() => {
              const newIndex = Math.max(0, currentQuestion - 1)
              setCurrentQuestion(newIndex)
            }}
            disabled={currentQuestion === 0 || !test?.allow_navigation_back || test?.per_question_timing}
            size="sm"
          >
            Previous
          </Button>

          {/* Hide question numbers on mobile, show only if navigation is allowed */}
          

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              loading={phase === 'submitting'}
              disabled={Object.keys(answers).length === 0}
              size="sm"
              className="sm:hidden" // Hide on desktop since we have the header submit button
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit
            </Button>
          ) : (
            <Button
              onClick={() => {
                const newIndex = Math.min(questions.length - 1, currentQuestion + 1)
                setCurrentQuestion(newIndex)
              }}
              size="sm"
            >
              Next
            </Button>
          )}
        </div>

        {/* Answer Summary */}
        <Card className="mt-4 sm:mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Answer Summary</CardTitle>
          </CardHeader>
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 sm:gap-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Allow navigation only if back navigation is enabled and not per-question timing
                    if (test?.allow_navigation_back && !test?.per_question_timing) {
                      setCurrentQuestion(index)
                    } else if (index >= currentQuestion) {
                      // Always allow forward navigation
                      setCurrentQuestion(index)
                    }
                  }}
                  disabled={index < currentQuestion && (!test?.allow_navigation_back || test?.per_question_timing)}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                    answers[questions[index].id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  } ${
                    (test?.allow_navigation_back && !test?.per_question_timing) || index >= currentQuestion
                      ? 'cursor-pointer hover:bg-gray-200'
                      : 'cursor-not-allowed opacity-50'
                  } ${
                    index === currentQuestion ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 sm:mt-3">
              Answered: {Object.keys(answers).length} / {questions.length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}