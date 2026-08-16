export default function Stepper({ step, total, label }) {
  const pct = (step / total) * 100
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-navy-700 uppercase tracking-wide">
          Step {step} of {total}
        </span>
        {label && <span className="text-xs text-navy-600/70">{label}</span>}
      </div>
      <div className="h-2 w-full bg-navy-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-green-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
