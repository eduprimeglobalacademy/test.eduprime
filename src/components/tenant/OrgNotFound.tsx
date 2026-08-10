import { AlertTriangle } from 'lucide-react'

export function OrgNotFound() {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-ink-muted" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">No organization here</h1>
        <p className="text-ink-faint text-sm">
          This address doesn't match an active organization. Check the link your school or educator gave you, or contact them for the correct one.
        </p>
      </div>
    </div>
  )
}
