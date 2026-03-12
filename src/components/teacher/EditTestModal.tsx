import { useState, useEffect } from 'react'
import { X, Save, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { Test } from '../../lib/supabase'

interface EditTestModalProps {
  isOpen: boolean
  onClose: () => void
  test: Test
  onTestUpdated: () => void
}

export function EditTestModal({ isOpen, onClose, test, onTestUpdated }: EditTestModalProps) {
  const [formData, setFormData] = useState({
    title: '', description: '', durationMinutes: '', startTime: '', endTime: '',
    showResults: true, allowNavigationBack: true, perQuestionTiming: false, timePerQuestion: '60',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (test) {
      const fmt = (s: string) => {
        const d = new Date(s)
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }
      setFormData({
        title: test.title,
        description: test.description || '',
        durationMinutes: test.duration_minutes?.toString() || '',
        startTime: test.start_time ? fmt(test.start_time) : '',
        endTime: test.end_time ? fmt(test.end_time) : '',
        showResults: test.show_results,
        allowNavigationBack: test.allow_navigation_back,
        perQuestionTiming: test.per_question_timing,
        timePerQuestion: '60',
      })
    }
  }, [test])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) { setError('Assessment title is required'); return }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      setError('Start time must be before end time'); return
    }
    setLoading(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('tests').update({
        title: formData.title,
        description: formData.description || null,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        start_time: formData.startTime ? new Date(formData.startTime).toISOString() : null,
        end_time: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        show_results: formData.showResults,
        updated_at: new Date().toISOString(),
      }).eq('id', test.id)
      if (updateError) throw updateError
      onTestUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assessment')
    } finally {
      setLoading(false)
    }
  }

  const update = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Assessment</h2>
              <p className="text-sm text-gray-500 mt-1">Update assessment settings</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Assessment Title *"
                value={formData.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                placeholder="No limit"
                value={formData.durationMinutes}
                onChange={(e) => update('durationMinutes', e.target.value)}
              />
            </div>

            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Optional description"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => update('startTime', e.target.value)}
              />
              <Input
                label="End Time"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => update('endTime', e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-gray-100 p-4 space-y-3 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Settings className="w-4 h-4 text-indigo-600" />
                Settings
              </div>
              {[
                { key: 'showResults', label: 'Show results to learners after completion' },
                { key: 'allowNavigationBack', label: 'Allow students to go back to previous questions' },
                { key: 'perQuestionTiming', label: 'Use per-question timing instead of overall timer' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData as any)[key]}
                    onChange={(e) => update(key, e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              {formData.perQuestionTiming && (
                <div className="ml-7">
                  <Input
                    label="Time per question (seconds)"
                    type="number"
                    min="10"
                    value={formData.timePerQuestion}
                    onChange={(e) => update('timePerQuestion', e.target.value)}
                    helper="Each question will auto-advance when time expires"
                  />
                </div>
              )}
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl"><p className="text-sm text-red-600">{error}</p></div>}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" loading={loading} className="flex-1">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
