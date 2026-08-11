interface TestWatermarkProps {
  text: string
}

/**
 * Tiled, rotated, low-opacity text over the exam screen — makes a screen
 * recording or photo traceable back to the student who took it without
 * being distracting or interfering with reading the questions. Deliberately
 * not a single centered mark (trivially cropped out of a photo); repeats
 * across the full viewport so cropping isn't enough to remove it.
 */
export function TestWatermark({ text }: TestWatermarkProps) {
  const rows = 6
  const cols = 4

  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 30 }} aria-hidden="true">
      <div
        className="absolute grid"
        style={{
          top: '-10%', left: '-10%', width: '120%', height: '120%',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          transform: 'rotate(-28deg)',
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--ink)', opacity: 0.05 }}>
              {text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
