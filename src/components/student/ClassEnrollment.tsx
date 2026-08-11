import { useState, useEffect } from 'react'
import { GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { classLabel } from '../../hooks/useClasses'
import type { Class } from '../../lib/supabase'

interface ClassEnrollmentProps {
  classId: string
  orgId?: string
}

type Phase = 'loading' | 'not-found' | 'sign-in' | 'enrolling' | 'done' | 'error'

export function ClassEnrollment({ classId, orgId }: ClassEnrollmentProps) {
  const { org } = useTenant()
  const orgName = org?.name || 'EduPrime Global Academy'
  const orgLogo = org?.logo_url || '/eduprimelogo.jpg'
  const [cls, setCls] = useState<Class | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState('')

  useEffect(() => { init() }, [classId])

  const init = async () => {
    let query = supabase.from('classes').select('*').eq('id', classId)
    if (orgId) query = query.eq('org_id', orgId)
    const { data } = await query.maybeSingle()
    if (!data) { setPhase('not-found'); return }
    setCls(data)

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      await enroll(data.id, user.email, user.user_metadata?.full_name || user.user_metadata?.name)
    } else {
      setPhase('sign-in')
    }
  }

  const enroll = async (resolvedClassId: string, email: string, name?: string) => {
    setPhase('enrolling')
    try {
      const { error: upsertError } = await supabase
        .from('class_students')
        .upsert([{ class_id: resolvedClassId, student_email: email, student_name: name || null }], { onConflict: 'class_id,student_email' })
      if (upsertError) throw upsertError
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll')
      setPhase('error')
    }
  }

  const handleSignIn = async () => {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    if (signInError) { setError(signInError.message); setPhase('error') }
  }

  return (
    <div className="theme-dark min-h-screen bg-app-outer flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={orgLogo} alt={orgName} className="w-16 h-16 object-contain rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-xl font-bold gradient-text mb-1">{orgName}</h1>
          <h2 className="text-2xl font-bold text-ink">Join a Class</h2>
        </div>

        <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 sm:p-8 text-center">
          {phase === 'loading' && <LoadingSpinner size="lg" />}

          {phase === 'not-found' && (
            <>
              <AlertCircle className="w-10 h-10 text-ink-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink mb-2">Link not found</h3>
              <p className="text-ink-faint text-sm">This enrollment link isn't valid for this site. Ask your teacher for the correct link.</p>
            </>
          )}

          {phase === 'sign-in' && cls && (
            <>
              <GraduationCap className="w-10 h-10 text-[var(--brand-primary)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink mb-1">{classLabel(cls)}</h3>
              <p className="text-ink-faint text-sm mb-6">Sign in with Google to join this class. Your teacher will share a test code when it's time.</p>
              <Button onClick={handleSignIn} className="w-full" size="lg">Continue with Google</Button>
            </>
          )}

          {phase === 'enrolling' && <LoadingSpinner size="lg" />}

          {phase === 'done' && cls && (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink mb-2">You're enrolled in {classLabel(cls)}</h3>
              <p className="text-ink-faint text-sm">Your teacher will share a test code when it's time to take an assessment.</p>
            </>
          )}

          {phase === 'error' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink mb-2">Something went wrong</h3>
              <p className="text-ink-faint text-sm">{error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
