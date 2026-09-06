import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, formatZAR } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { PACKAGES } from '../../data/seed'

const METHODS = ['Card', 'PayFast', 'EFT', 'PayPal']

export default function Payment() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { selectedPackageId } = useAppState()
  const [method, setMethod] = useState('Card')
  const [processing, setProcessing] = useState(false)

  const pkg = PACKAGES.find((p) => p.id === selectedPackageId) ?? PACKAGES[1]

  function payAndPublish() {
    setProcessing(true)
    setTimeout(() => {
      dispatch({ type: 'PUBLISH_LISTING' })
      navigate('/sell/success')
    }, 700)
  }

  return (
    <OnboardingLayout>
      <Stepper step={7} total={7} label="Payment" />
      <h1 className="text-xl font-bold text-navy-900 mb-1">Activate your listing</h1>
      <p className="text-navy-600/70 text-sm mb-6">Once-off fee. No commission.</p>

      <div className="bg-navy-50 rounded-xl p-4 flex items-center justify-between mb-6">
        <div>
          <p className="font-semibold text-navy-900">{pkg.name} Package</p>
          <p className="text-xs text-navy-600/70">{pkg.tagline}</p>
        </div>
        <p className="text-xl font-extrabold text-navy-900">{formatZAR(pkg.price)}</p>
      </div>

      <p className="text-sm font-medium text-navy-800 mb-2">Payment method</p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`py-2.5 rounded-lg border text-sm font-medium ${
              method === m ? 'border-brand-green-600 bg-brand-green-50 text-brand-green-700' : 'border-navy-200 text-navy-700'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Button className="w-full" onClick={payAndPublish} disabled={processing}>
        {processing ? 'Processing…' : `Pay & Publish — ${formatZAR(pkg.price)}`}
      </Button>
      <p className="text-xs text-navy-400 text-center mt-3">
        This is a mockup — no real payment is processed.
      </p>
    </OnboardingLayout>
  )
}
