interface UsageMeterProps {
  label: string
  used: number
  limit: number | null // null = unlimited
  unit: string
}

export function UsageMeter({ label, used, limit, unit }: UsageMeterProps) {
  if (limit === null) {
    return (
      <div className="flex items-center justify-between text-xs text-ink-faint">
        <span>{label}</span>
        <span>{used} {unit} · unlimited on your plan</span>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((used / limit) * 100))
  const atLimit = used >= limit
  const near = !atLimit && pct >= 80
  const barColor = atLimit ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-[var(--brand-primary)]'
  const textColor = atLimit ? 'text-red-600' : near ? 'text-amber-600' : 'text-ink-faint'

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-ink-faint">{label}</span>
        <span className={`font-semibold ${textColor}`}>{used} / {limit} {unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {atLimit && (
        <p className="text-xs text-red-600 mt-1.5">
          You've reached your plan's {label.toLowerCase()} limit. Contact us to move to a higher tier.
        </p>
      )}
    </div>
  )
}
