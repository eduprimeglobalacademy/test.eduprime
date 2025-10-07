import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
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
    title: '',
    description: '',
    durationMinutes: '',
    startTime: '',
    endTime: '',
    showResults: true,
    allowNavigationBack: true,
    perQuestionTiming: false,
    timePerQuestion: '60',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (test) {
      // Convert UTC times back to local datetime-local format
      const formatDateTimeLocal = (utcString: string) => {
        const date = new Date(utcString)
        // Get local timezone offset and adjust
        const offset = date.getTimezoneOffset()
        const localDate = new Date(date.getTime() - (offset * 60 * 1000))
        return localDate.toISOString().slice(0, 16)
      }

      setFormData({
        title: test.title,
        description: test.description || '',
        durationMinutes: test.duration_minutes?.toString() || '',
        startTime: test.start_time ? formatDateTimeLocal(test.start_time) : '',
        endTime: test.end_time ? formatDateTimeLocal(test.end_time) : '',
        showResults: test.show_results,
        allowNavigationBack: test.allow_navigation_back,
        perQuestionTiming: test.per_question_timing,
        timePerQuestion: '60', // Default value since we can't easily get this from existing questions
      })
    }
  }, [test])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!formData.title.trim()) {
      setError('Test title is required')
      setLoading(false)
      return
    }

    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      setError('Start time must be before end time')
      setLoading(false)
      return
    }

    try {
      // Convert local datetime to UTC for database storage
      const startTimeUTC = formData.startTime ? new Date(formData.startTime).toISOString() : null
      const endTimeUTC = formData.endTime ? new Date(formData.endTime).toISOString() : null

      const { error: updateError } = await supabase
        .from('tests')
        .update({
          title: formData.title,
          description: formData.description || null,
          duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          show_results: formData.showResults,
          updated_at: new Date().toISOString(),
        })
        .eq('id', test.id)

      if (updateError) throw updateError

      onTestUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update test')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Assessment</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Assessment Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                placeholder="Leave empty for no time limit"
                value={formData.durationMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
              />
            </div>

            <Input
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Start Time (optional)"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
              <Input
                label="End Time (optional)"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showResults}
                  onChange={(e) => setFormData(prev => ({ ...prev, showResults: e.target.checked }))}
                  className="mr-2"
                />
                Show results to learners after completion
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Navigation & Timing Options</h3>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allowNavigationBack}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowNavigationBack: e.target.checked }))}
                    className="mr-2"
                  />
                  Allow students to navigate back to previous questions
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.perQuestionTiming}
                    onChange={(e) => setFormData(prev => ({ ...prev, perQuestionTiming: e.target.checked }))}
                    className="mr-2"
                  />
                  Use per-question timing instead of overall test timer
                </label>
              </div>

              {formData.perQuestionTiming && (
                <div className="ml-6">
                  <Input
                    label="Time per question (seconds)"
                    type="number"
                    min="10"
                    value={formData.timePerQuestion}
                    onChange={(e) => setFormData(prev => ({ ...prev, timePerQuestion: e.target.value }))}
                    helper="Each question will have this amount of time"
                    required
                  />
                </div>
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}