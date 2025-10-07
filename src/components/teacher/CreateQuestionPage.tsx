import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save, Upload, Download, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import type { Test, Question, QuestionOption } from '../../lib/supabase'

interface CreateQuestionPageProps {
  testId: string
  onBack: () => void
  onQuestionsUpdated: () => void
}

interface QuestionData {
  id?: string
  text: string
  points: number
  options: { id?: string; text: string; isCorrect: boolean }[]
}

export function CreateQuestionPage({ testId, onBack, onQuestionsUpdated }: CreateQuestionPageProps) {
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [csvError, setCsvError] = useState('')

  useEffect(() => {
    fetchTestAndQuestions()
  }, [testId])

  const fetchTestAndQuestions = async () => {
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError) throw testError
      setTest(testData)

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`*, question_options (*)`)
        .eq('test_id', testId)
        .order('question_order')

      if (questionsError) throw questionsError

      const formattedQuestions = questionsData.map(q => ({
        id: q.id,
        text: q.question_text,
        points: q.points,
        options: q.question_options
          .sort((a: any, b: any) => a.option_order - b.option_order)
          .map((opt: any) => ({
            id: opt.id,
            text: opt.option_text,
            isCorrect: opt.is_correct
          }))
      }))

      setQuestions(formattedQuestions.length > 0 ? formattedQuestions : [createEmptyQuestion()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test data')
    } finally {
      setLoading(false)
    }
  }

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
          setCsvError('CSV must contain at least 2 option columns')
          return
        }

        const parsedQuestions: QuestionData[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i])
          if (values.length < headers.length) continue

          const questionText = values[headers.indexOf('Question')]
          const correctOptionNumber = parseInt(values[headers.indexOf('CorrectOption')])
          const points = parseInt(values[headers.indexOf('Points')] || '1') || 1

          if (!questionText || !questionText.trim()) continue
          if (isNaN(correctOptionNumber) || correctOptionNumber < 1) {
            setCsvError(`Invalid correct option number for question: "${questionText}"`)
            return
          }

          const options: { id?: string; text: string; isCorrect: boolean }[] = []
          optionColumns.forEach(({ index }, optionIndex) => {
            const optionText = values[index]
            if (optionText && optionText.trim()) {
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

          if (!options.some(opt => opt.isCorrect)) {
            setCsvError(`Question "${questionText}" has no correct option`)
            return
          }

          parsedQuestions.push({ text: questionText, options, points })
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
        setCsvError('Error parsing CSV file. Check formatting.')
      }
    }
    reader.readAsText(file)
  }

  const createEmptyQuestion = (): QuestionData => ({
    text: '',
    points: 1,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  })

  const addQuestion = () => setQuestions([...questions, createEmptyQuestion()])
  const removeQuestion = (index: number) => {
    if (questions.length > 1) setQuestions(questions.filter((_, i) => i !== index))
  }
  const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
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

  const validateQuestions = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Question ${i + 1} must have text`
      if (q.options.some(opt => !opt.text.trim())) return `All options in Question ${i + 1} must have text`
      if (!q.options.some(opt => opt.isCorrect)) return `Question ${i + 1} must have a correct answer`
    }
    return null
  }

  const saveQuestions = async () => {
    setSaving(true)
    setError('')
    const validationError = validateQuestions()
    if (validationError) { setError(validationError); setSaving(false); return }

    try {
      await supabase.from('questions').delete().eq('test_id', testId)
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .insert([{ test_id: testId, question_text: question.text, question_order: i + 1, points: question.points }])
          .select()
          .single()
        if (questionError) throw questionError

        const optionsData = question.options.map((opt, j) => ({
          question_id: questionData.id,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          option_order: j + 1
        }))
        const { error: optionsError } = await supabase.from('question_options').insert(optionsData)
        if (optionsError) throw optionsError
      }

      onQuestionsUpdated()
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save questions')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" onClick={onBack} className="mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Questions: {test?.title}
              </h1>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
              <Button onClick={saveQuestions} loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Questions
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Questions via CSV</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={downloadCSVTemplate} size="sm" type="button">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => document.getElementById('csv-upload-edit')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
              <input type="file" accept=".csv" onChange={handleCSVUpload} id="csv-upload-edit" style={{ display: 'none' }} />
            </div>
            {csvError && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <p className="text-sm text-red-600">{csvError}</p>
              </div>
            )}
            <div className="text-xs text-gray-500 space-y-1">
              <div><strong>CSV Format:</strong> Question, Option1, Option2, ..., CorrectOption, Points</div>
              <div><strong>CorrectOption:</strong> Number (1 for Option1, 2 for Option2, etc.)</div>
              <div><strong>Dynamic Options:</strong> Add as many Option columns as needed</div>
              <div><strong>Note:</strong> Uploading CSV will replace all existing questions</div>
            </div>
          </div>
        </Card>

        {questions.map((question, qIndex) => (
          <Card key={qIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Question {qIndex + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIndex)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <Input
                    as="textarea"
                    rows={4}
                    preserveWhitespace={true}
                    placeholder="Enter question text"
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                    className="whitespace-pre-wrap"
                  />
                </div>
                <Input
                  label="Points"
                  as="textarea"
                  rows={3}
                  type="number"
                  min="1"
                  value={question.points}
                  onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Options:</label>
                  <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Option
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
                      />
                      {question.options.length > 2 && (
                        <Button variant="ghost" size="sm" onClick={() => removeOption(qIndex, oIndex)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
