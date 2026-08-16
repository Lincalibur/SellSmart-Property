export function Button({ as: As = 'button', variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-green-600 hover:bg-brand-green-700 text-white',
    secondary: 'bg-white border border-navy-200 text-navy-900 hover:bg-navy-50',
    outlineLight: 'bg-transparent border border-white/30 text-white hover:bg-white/10',
    navy: 'bg-navy-900 hover:bg-navy-800 text-white',
    ghost: 'text-navy-800 hover:bg-navy-50',
    danger: 'bg-white border border-red-300 text-red-600 hover:bg-red-50',
  }
  return <As className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ className = '', children }) {
  return (
    <div className={`bg-white rounded-2xl border border-navy-100 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-navy-800 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-navy-600/70 mt-1">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-lg border border-navy-200 px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-navy-600/40 focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:border-transparent'

export function Tag({ children, tone = 'green' }) {
  const tones = {
    green: 'bg-brand-green-50 text-brand-green-700',
    navy: 'bg-navy-50 text-navy-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Tip({ children }) {
  return (
    <div className="flex items-start gap-2 bg-brand-green-50 text-brand-green-800 text-sm rounded-lg px-3.5 py-2.5">
      <span aria-hidden="true">💡</span>
      <span>{children}</span>
    </div>
  )
}

export function formatZAR(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount)
}
