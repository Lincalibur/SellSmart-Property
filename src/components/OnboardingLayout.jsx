export default function OnboardingLayout({ children, wide = false }) {
  return (
    <div className="bg-navy-50 min-h-[calc(100vh-4rem)] py-10 md:py-16">
      <div className={`mx-auto px-4 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
