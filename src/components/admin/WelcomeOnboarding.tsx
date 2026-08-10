import { Key, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { ROOT_DOMAIN } from '../../lib/tenant'

interface WelcomeOnboardingProps {
  orgName: string
  slug?: string
  onDismiss: () => void
}

export function WelcomeOnboarding({ orgName, slug, onDismiss }: WelcomeOnboardingProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-app">
        <div className="p-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'var(--brand-primary-soft)' }}>
            <Key className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-1.5">Welcome to {orgName}</h2>
          <p className="text-sm text-ink-faint mb-6">
            {slug ? <>Your organization is live at <span className="font-mono">{slug}.{ROOT_DOMAIN}</span>. </> : null}
            Here's how to get your first educator in.
          </p>

          <ol className="space-y-4 mb-7">
            {[
              { n: 1, text: 'Generate an educator token below and share it with your first teacher.' },
              { n: 2, text: 'They register with that token and can start building assessments right away.' },
              { n: 3, text: "Invite more educators any time — check Billing for what your plan allows." },
            ].map(({ n, text }) => (
              <li key={n} className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary-dark)' }}
                >
                  {n}
                </span>
                <p className="text-sm text-ink-soft leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>

          <Button size="lg" className="w-full" onClick={onDismiss}>
            Let's go <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
