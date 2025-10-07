import React, { useState } from 'react'
import { X, ArrowLeft, ArrowRight, Upload, Download, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { generateTestCode } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardHeader, CardTitle } from '../ui/Card'

interface GradingSystem {
  aGrade: number
  bGrade: number
  cGrade: number
  dGrade: number
  passingGrade: number
}

interface CreateTestWizardProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
  onTestCreated: () => void
}

interface TestConfig {
  title: string
  description: string
  durationMinutes: string
  startTime: string
  endTime: string
  showResults: boolean
  allowNavigationBack: boolean
  perQuestionTiming: boolean
  timePerQuestion: string
  gradingSystem: GradingSystem
}

interface Question {
  text: string
  options: { text: string; isCorrect: boolean }[]
  points: number
}

type Step = 'config' | 'questions' | 'grading'

export function CreateTestWizard({ isOpen, onClose, teacherId, onTestCreated }: CreateTestWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('config')
  const [testConfig, setTestConfig] = useState<TestConfig>({
    title: '',
    description: '',
    durationMinutes: '',
    startTime: '',
    endTime: '',
    showResults: true,
    allowNavigationBack: true,
    perQuestionTiming: false,
    timePerQuestion: '60',
    gradingSystem: {
      aGrade: 90,
      bGrade: 80,
      cGrade: 70,
      dGrade: 60,
      passingGrade: 60
    }
  })
  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
      points: 1,
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [csvError, setCsvError] = useState('')

  const downloadCSVTemplate = () => {
    const csvContent = `Question,Option1,Option2,Option3,Option4,Option5,CorrectOption,Points
"What is 2+2?","3","4","5","6","","2","1"
"What is the capital of France?","London","Berlin","Paris","Madrid","","3","1"
"Which is a programming language?","HTML","CSS","JavaScript","XML","Python","5","2"
"True or False: Earth is round?","True","False","","","","1","1"`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'question_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.trim().split('\n').filter(line => line.trim())

        if (lines.length < 2) {
          setCsvError('CSV file must contain at least a header row and one data row')
          return
        }

        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false

          for (let i = 0; i < line.length; i++) {
            const char = line[i]

            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i++
              } else {
                inQuotes = !inQuotes
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }

          result.push(current.trim())
          return result
        }

        const headers = parseCSVLine(lines[0])

        if (!headers.includes('Question') || !headers.includes('CorrectOption')) {
          setCsvError('CSV must contain "Question" and "CorrectOption" columns')
          return
        }

        const optionColumns = headers
          .map((header, index) => ({ header, index }))
          .filter(({ header }) => header.startsWith('Option'))
          .sort((a, b) => {
            const aNum = parseInt(a.header.replace('Option', '')) || 0
            const bNum = parseInt(b.header.replace('Option', '')) || 0
            return aNum - bNum
          })

        if (optionColumns.length < 2) {
          setCsvError('CSV must contain at least 2 option columns (Option1, Option2, etc.)')
          return
        }

        const parsedQuestions: Question[] = []

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i])

          if (values.length < headers.length) continue

          const questionText = values[headers.indexOf('Question')]
          const correctOptionNumber = parseInt(values[headers.indexOf('CorrectOption')])
          const points = parseInt(values[headers.indexOf('Points')] || '1') || 1

          if (!questionText?.trim()) continue
          if (isNaN(correctOptionNumber) || correctOptionNumber < 1) {
            setCsvError(`Invalid correct option number for question: "${questionText}". Must be a number starting from 1.`)
            return
          }

          const options: { text: string; isCorrect: boolean }[] = []

          optionColumns.forEach(({ index }, optionIndex) => {
            const optionText = values[index]
            if (optionText?.trim()) {
              options.push({
                text: optionText.trim(),
                isCorrect: (optionIndex + 1) === correctOptionNumber
              })
            }
          })

          if (options.length < 2) {
            setCsvError(`Question "${questionText}" must have at least 2 non-empty options`)
            return
          }

          if (correctOptionNumber > options.length) {
            setCsvError(`Question "${questionText}": Correct option ${correctOptionNumber} is greater than available options (${options.length})`)
            return
          }

          if (!options.some(opt => opt.isCorrect)) {
            setCsvError(`Question "${questionText}": No correct answer found for option ${correctOptionNumber}`)
            return
          }

          parsedQuestions.push({
            text: questionText,
            options,
            points
          })
        }

        if (parsedQuestions.length === 0) {
          setCsvError('No valid questions found in CSV')
          return
        }

        setQuestions(parsedQuestions)
        setCsvError('')
        event.target.value = ''
      } catch (err) {
        console.error('CSV parsing error:', err)
        setCsvError('Error parsing CSV file. Please check the format and ensure proper quoting of text with commas.')
      }
    }
    reader.readAsText(file)
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        options: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
        points: 1,
      },
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const addOption = (questionIndex: number) => {
    const updated = [...questions]
    updated[questionIndex].options.push({ text: '', isCorrect: false })
    setQuestions(updated)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions]
    if (updated[questionIndex].options.length > 2) {
      updated[questionIndex].options.splice(optionIndex, 1)
      setQuestions(updated)
    }
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    const updated = [...questions]
    updated[questionIndex].options[optionIndex] = {
      ...updated[questionIndex].options[optionIndex],
      [field]: value
    }

    if (field === 'isCorrect' && value === true) {
      updated[questionIndex].options.forEach((opt, i) => {
        if (i !== optionIndex) opt.isCorrect = false
      })
    }

    setQuestions(updated)
  }

  const validateConfig = () => {
    if (!testConfig.title.trim()) return 'Test title is required'
    if (testConfig.startTime && testConfig.endTime && new Date(testConfig.startTime) >= new Date(testConfig.endTime)) {
      return 'Start time must be before end time'
    }
    return null
  }

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Question ${i + 1} must have text`
      if (q.options.some(opt => !opt.text.trim())) return `All options in Question ${i + 1} must have text`
      if (!q.options.some(opt => opt.isCorrect)) return `Question ${i + 1} must have a correct answer`
    }
    if (testConfig.perQuestionTiming && (!testConfig.timePerQuestion || parseInt(testConfig.timePerQuestion) < 10)) {
      return 'Time per question must be at least 10 seconds when per-question timing is enabled'
    }
    return null
  }

  const handleNext = () => {
    const configError = validateConfig()
    if (configError) {
      setError(configError)
      return
    }
    setError('')
    setCurrentStep('questions')
  }

  const handleNextToGrading = () => {
    const questionsError = validateQuestions()
    if (questionsError) {
      setError(questionsError)
      return
    }
    setError('')
    setCurrentStep('grading')
  }

  const getTotalPoints = () => questions.reduce((total, q) => total + q.points, 0)

  const handleSubmit = async (setLive = false) => {
    setLoading(true)
    setError('')

    const questionsError = validateQuestions()
    if (questionsError) {
      setError(questionsError)
      setLoading(false)
      return
    }

    try {
      const testCode = generateTestCode()
      const startTimeUTC = testConfig.startTime ? new Date(testConfig.startTime).toISOString() : null
      const endTimeUTC = testConfig.endTime ? new Date(testConfig.endTime).toISOString() : null

      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert([
          {
            teacher_id: teacherId,
            title: testConfig.title,
            description: testConfig.description || null,
            test_code: testCode,
            status: setLive ? 'live' : 'draft',
            duration_minutes: testConfig.durationMinutes ? parseInt(testConfig.durationMinutes) : null,
            start_time: startTimeUTC,
            end_time: endTimeUTC,
            show_results: testConfig.showResults,
            allow_navigation_back: testConfig.allowNavigationBack,
            per_question_timing: testConfig.perQuestionTiming,
            grading_config: testConfig.gradingSystem
          },
        ])
        .select()
        .single()

      if (testError) throw testError

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]

        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert([
            {
              test_id: testData.id,
              question_text: q.text,
              question_order: i + 1,
              points: q.points,
              time_limit_seconds: testConfig.perQuestionTiming ? parseInt(testConfig.timePerQuestion) : null,
            },
          ])
          .select()
          .single()

        if (questionError) throw questionError

        const optionsData = q.options.map((opt, j) => ({
          question_id: questionData.id,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          option_order: j + 1,
        }))

        const { error: optionsError } = await supabase.from('question_options').insert(optionsData)
        if (optionsError) throw optionsError
      }

      onTestCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // 🔻 Include your existing return JSX below exactly as you had it
  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            {currentStep !== 'config' && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(currentStep === 'grading' ? 'questions' : 'config')}
                className="mr-4"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStep === 'config'
                ? 'Test Configuration'
                : currentStep === 'questions'
                ? 'Add Questions'
                : 'Configure Grading'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center mb-8">
          {['Configuration', 'Questions', 'Grading'].map((label, index) => {
            const stepIndex = index + 1
            const isActive =
              (currentStep === 'config' && stepIndex === 1) ||
              (currentStep === 'questions' && stepIndex === 2) ||
              (currentStep === 'grading' && stepIndex === 3)
            return (
              <React.Fragment key={label}>
                <div className={`flex items-center ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      isActive ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    {stepIndex}
                  </div>
                  <span className="ml-2 font-medium">{label}</span>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      stepIndex < (currentStep === 'grading' ? 3 : stepIndex) ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Steps */}
        {currentStep === 'config' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Assessment Title"
                value={testConfig.title}
                onChange={(e) => setTestConfig(prev => ({ ...prev, title: e.target.value }))}
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                placeholder="Leave empty for no time limit"
                value={testConfig.durationMinutes}
                onChange={(e) => setTestConfig(prev => ({ ...prev, durationMinutes: e.target.value }))}
              />
            </div>
            <Input
              label="Description (optional)"
              value={testConfig.description}
              onChange={(e) => setTestConfig(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Start Time (optional)"
                type="datetime-local"
                value={testConfig.startTime}
                onChange={(e) => setTestConfig(prev => ({ ...prev, startTime: e.target.value }))}
              />
              <Input
                label="End Time (optional)"
                type="datetime-local"
                value={testConfig.endTime}
                onChange={(e) => setTestConfig(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={testConfig.showResults}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, showResults: e.target.checked }))}
                  className="mr-2"
                />
                Show results to students after completion
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Navigation & Timing Options</h3>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testConfig.allowNavigationBack}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, allowNavigationBack: e.target.checked }))}
                    className="mr-2"
                  />
                  Allow students to navigate back to previous questions
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-6">
                  When disabled, students can only move forward through questions
                </p>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={testConfig.perQuestionTiming}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, perQuestionTiming: e.target.checked }))}
                    className="mr-2"
                  />
                  Use per-question timing instead of overall test timer
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-6">
                  Each question will have its own time limit and auto-advance when time expires
                </p>
              </div>

              {testConfig.perQuestionTiming && (
                <div className="ml-6">
                  <Input
                    label="Time per question (seconds)"
                    type="number"
                    min="10"
                    value={testConfig.timePerQuestion}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, timePerQuestion: e.target.value }))}
                    helper="Each question will have this amount of time"
                    required
                  />
                </div>
              )}
              {testConfig.perQuestionTiming && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-2" />
                    <p className="text-sm text-amber-700">
                      <strong>Per-question timing enabled:</strong> Each question will have {testConfig.timePerQuestion} seconds. The overall test duration will be ignored.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleNext}>
                Next: Add Questions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Questions Step */}
        {currentStep === 'questions' && (
          <div className="space-y-6">
            {/* CSV Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Questions via CSV</CardTitle>
              </CardHeader>
              <div className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
                  <Button variant="outline" size="sm" onClick={downloadCSVTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => document.getElementById('csv-upload')?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CSV
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    id="csv-upload"
                    style={{ display: 'none' }}
                  />
                </div>
                {csvError && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <p className="text-sm text-red-600">{csvError}</p>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  <div className="space-y-1">
                    <div><strong>CSV Format:</strong> Question, Option1, Option2, Option3, ..., CorrectOption, Points</div>
                    <div><strong>CorrectOption:</strong> Number (1 for Option1, 2 for Option2, etc.)</div>
                    <div><strong>Dynamic Options:</strong> Add as many Option columns as needed</div>
                    <div><strong>Empty Options:</strong> Leave option cells empty if not needed</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Manual Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h3>
                <Button type="button" variant="outline" onClick={addQuestion}>
                  <FileText className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {questions.map((question, qIndex) => (
                <Card key={qIndex} className="mb-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Question {qIndex + 1}</CardTitle>
                      {questions.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <div className="p-4 space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="md:col-span-3">
                         <textarea
    placeholder="Enter question text"
    value={question.text}
    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
    required
    rows={3}
    className="w-full p-2 border rounded-md resize-none"
  />
                      </div>
                      <Input
                        label="Points"
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">Options:</label>
                        <Button variant="outline" size="sm" type="button" onClick={() => addOption(qIndex)}>
                          Add Option
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`question-${qIndex}`}
                              checked={option.isCorrect}
                              onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)}
                              className="text-blue-600"
                            />
                            <Input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option.text}
                              onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                              className="flex-1"
                              required
                            />
                            {question.options.length > 2 && (
                              <Button variant="ghost" size="sm" type="button" onClick={() => removeOption(qIndex, oIndex)}>
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                <Button type="button" variant="outline" onClick={() => handleSubmit(false)} loading={loading} className="flex-1">
                  Save as Draft
                </Button>
                <Button type="button" onClick={handleNextToGrading} className="flex-1">
                  Next: Configure Grading
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Grading Step */}
        {currentStep === 'grading' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Assessment Overview</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                  <div className="text-sm text-blue-700">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{getTotalPoints()}</div>
                  <div className="text-sm text-blue-700">Total Points</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{testConfig.durationMinutes || 'No Limit'}</div>
                  <div className="text-sm text-blue-700">Duration</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Configure Grading System</h3>
              <p className="text-gray-600">
                Set the percentage thresholds for each grade based on the total points ({getTotalPoints()} points).
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="A Grade Threshold (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={testConfig.gradingSystem.aGrade}
                    onChange={(e) =>
                      setTestConfig(prev => ({
                        ...prev,
                        gradingSystem: { ...prev.gradingSystem, aGrade: parseInt(e.target.value) || 90 }
                      }))
                    }
                    helper="Minimum percentage for A grade"
                  />
                  <Input
                    label="B Grade Threshold (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={testConfig.gradingSystem.bGrade}
                    onChange={(e) =>
                      setTestConfig(prev => ({
                        ...prev,
                        gradingSystem: { ...prev.gradingSystem, bGrade: parseInt(e.target.value) || 80 }
                      }))
                    }
                    helper="Minimum percentage for B grade"
                  />
                  <Input
                    label="C Grade Threshold (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={testConfig.gradingSystem.cGrade}
                    onChange={(e) =>
                      setTestConfig(prev => ({
                        ...prev,
                        gradingSystem: { ...prev.gradingSystem, cGrade: parseInt(e.target.value) || 70 }
                      }))
                    }
                    helper="Minimum percentage for C grade"
                  />
                  <Input
                    label="D Grade Threshold (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={testConfig.gradingSystem.dGrade}
                    onChange={(e) =>
                      setTestConfig(prev => ({
                        ...prev,
                        gradingSystem: { ...prev.gradingSystem, dGrade: parseInt(e.target.value) || 60 }
                      }))
                    }
                    helper="Minimum percentage for D grade"
                  />
                  <Input
                    label="Passing Grade (%)"
                    type="number"
                    min="0"
                    max="100"
                    value={testConfig.gradingSystem.passingGrade}
                    onChange={(e) =>
                      setTestConfig(prev => ({
                        ...prev,
                        gradingSystem: { ...prev.gradingSystem, passingGrade: parseInt(e.target.value) || 60 }
                      }))
                    }
                    helper="Minimum percentage to pass the assessment"
                  />
                </div>

                {/* Grade Preview */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Grade Preview</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>A Grade:</span><span className="font-medium">{testConfig.gradingSystem.aGrade}% - 100%</span></div>
                    <div className="flex justify-between"><span>B Grade:</span><span className="font-medium">{testConfig.gradingSystem.bGrade}% - {testConfig.gradingSystem.aGrade - 1}%</span></div>
                    <div className="flex justify-between"><span>C Grade:</span><span className="font-medium">{testConfig.gradingSystem.cGrade}% - {testConfig.gradingSystem.bGrade - 1}%</span></div>
                    <div className="flex justify-between"><span>D Grade:</span><span className="font-medium">{testConfig.gradingSystem.dGrade}% - {testConfig.gradingSystem.cGrade - 1}%</span></div>
                    <div className="flex justify-between"><span>F Grade:</span><span className="font-medium">0% - {testConfig.gradingSystem.dGrade - 1}%</span></div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span>Passing:</span>
                      <span>{testConfig.gradingSystem.passingGrade}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSubmit} loading={loading}>
                {loading ? 'Creating...' : ' Create & Activate Assessment'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)

}
