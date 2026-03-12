import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Plus, Settings, GraduationCap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface CreateTestWizardProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
  onTestCreated: () => void
}

type Step = 1 | 2 | 3

export function CreateTestWizard({ isOpen, onClose, teacherId, onTestCreated }: CreateTestWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    startTime: '',
    endTime: '',
    showResults: true,
    allowNavigationBack: true,
    perQuestionTiming: false,
    timePerQuestion: '60',
    aGrade: '90',
    bGrade: '80',
    cGrade: '70',
    dGrade: '60',
    passingGrade: '60',
  })

  const update = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }))

  const validateStep1 = () => {
    if (!formData.title.trim()) { setError('Assessment title is required'); return false }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      setError('Start time must be before end time'); return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    setStep((step + 1) as Step)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const testCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const gradingConfig = {
        aGrade: parseFloat(formData.aGrade),
        bGrade: parseFloat(formData.bGrade),
        cGrade: parseFloat(formData.cGrade),
        dGrade: parseFloat(formData.dGrade),
        passingGrade: parseFloat(formData.passingGrade),
      }
      const { error: createError } = await supabase.from('tests').insert([{
        teacher_id: teacherId,
        title: formData.title,
        description: formData.description || null,
        test_code: testCode,
        status: 'draft',
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        start_time: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        end_time: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        show_results: formData.showResults,
        allow_navigation_back: formData.allowNavigationBack,
        per_question_timing: formData.perQuestionTiming,
        grading_config: gradingConfig,
      }])
      if (createError) throw createError
      onTestCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Settings' },
    { num: 3, label: 'Grading' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Plus className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Assessment</h2>
                <p className="text-xs text-gray-500">{steps.find(s => s.num === step)?.label}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {steps.map(({ num, label }, i) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    num < step ? 'bg-emerald-500 text-white' :
                    num === step ? 'bg-indigo-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {num < step ? '✓' : num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${num === step ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded ${num < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <Input
                label="Assessment Title *"
                placeholder="e.g. Midterm Mathematics Exam"
                value={formData.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />
              <Input
                label="Description"
                placeholder="Brief description (optional)"
                value={formData.description}
                onChange={(e) => update('description', e.target.value)}
              />
              <Input
                label="Duration (minutes)"
                type="number"
                placeholder="Leave empty for no time limit"
                value={formData.durationMinutes}
                onChange={(e) => update('durationMinutes', e.target.value)}
                min="1"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                  helper="Optional: when test becomes available"
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                  helper="Optional: when test closes"
                />
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  Assessment Behavior
                </div>
                {[
                  { key: 'showResults', label: 'Show results to students after submission', desc: 'Students will see their score, grade, and question review' },
                  { key: 'allowNavigationBack', label: 'Allow backward navigation', desc: 'Students can go back to previous questions during the test' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={(formData as any)[key]}
                      onChange={(e) => update(key, e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Settings className="w-4 h-4 text-violet-600" />
                  Timing Mode
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.perQuestionTiming}
                    onChange={(e) => update('perQuestionTiming', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Per-question timing</p>
                    <p className="text-xs text-gray-500 mt-0.5">Each question has its own timer. Questions auto-advance when time expires.</p>
                  </div>
                </label>
                {formData.perQuestionTiming && (
                  <div className="ml-7">
                    <Input
                      label="Default time per question (seconds)"
                      type="number"
                      min="5"
                      value={formData.timePerQuestion}
                      onChange={(e) => update('timePerQuestion', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Grading */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Grade Boundaries (%)
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'aGrade', label: 'A Grade minimum (%)', bg: 'bg-emerald-50' },
                  { key: 'bGrade', label: 'B Grade minimum (%)', bg: 'bg-blue-50' },
                  { key: 'cGrade', label: 'C Grade minimum (%)', bg: 'bg-amber-50' },
                  { key: 'dGrade', label: 'D Grade minimum (%)', bg: 'bg-orange-50' },
                ].map(({ key, label, bg }) => (
                  <div key={key} className={`p-4 rounded-xl ${bg} border border-gray-100`}>
                    <Input
                      label={label}
                      type="number"
                      min="0"
                      max="100"
                      value={(formData as any)[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <Input
                label="Passing Grade minimum (%)"
                type="number"
                min="0"
                max="100"
                value={formData.passingGrade}
                onChange={(e) => update('passingGrade', e.target.value)}
                helper="Scores below this are considered failing (F)"
              />

              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <p className="text-sm font-semibold text-indigo-800 mb-3">Grade Preview:</p>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { grade: 'A', min: formData.aGrade, cls: 'bg-emerald-100 text-emerald-700' },
                    { grade: 'B', min: formData.bGrade, cls: 'bg-blue-100 text-blue-700' },
                    { grade: 'C', min: formData.cGrade, cls: 'bg-amber-100 text-amber-700' },
                    { grade: 'D', min: formData.dGrade, cls: 'bg-orange-100 text-orange-700' },
                    { grade: 'F', min: '0', cls: 'bg-red-100 text-red-700' },
                  ].map(({ grade, min, cls }) => (
                    <div key={grade} className={`p-2 rounded-lg ${cls}`}>
                      <p className="font-bold text-base">{grade}</p>
                      <p className="text-xs">≥{min}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <Button variant="outline" onClick={() => step > 1 ? setStep((step - 1) as Step) : onClose()} disabled={loading}>
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext}>
                Continue<ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={loading}>
                <Plus className="w-4 h-4" />
                Create Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
