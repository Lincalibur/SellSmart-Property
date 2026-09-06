import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, Card, Check, formatZAR } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { PACKAGES } from '../../data/seed'

export default function PackageSelection() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { selectedPackageId } = useAppState()

  function select(id) {
    dispatch({ type: 'SELECT_PACKAGE', packageId: id })
    navigate('/sell/quick-setup')
  }

  return (
    <OnboardingLayout wide>
      <Stepper step={3} total={7} label="Choose package" />
      <h1 className="text-xl font-bold text-navy-900 mb-1">Choose how you want to sell</h1>
      <p className="text-navy-600/70 text-sm mb-6">Once-off payment. No commission.</p>

      <div className="grid sm:grid-cols-3 gap-4">
        {PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`p-5 flex flex-col relative ${
              pkg.popular ? 'ring-2 ring-brand-green-600' : ''
            } ${selectedPackageId === pkg.id ? 'ring-2 ring-navy-900' : ''}`}
          >
            {pkg.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Popular
              </span>
            )}
            <h3 className="font-bold text-navy-900">{pkg.name}</h3>
            <p className="text-2xl font-extrabold text-navy-900 my-1">{formatZAR(pkg.price)}</p>
            <ul className="space-y-1.5 text-xs text-navy-700 flex-1 my-3">
              {pkg.features.map((f) => (
                <li key={f}><Check>{f}</Check></li>
              ))}
            </ul>
            <Button
              variant={pkg.popular ? 'primary' : 'secondary'}
              className="w-full"
              onClick={() => select(pkg.id)}
            >
              Select Plan
            </Button>
          </Card>
        ))}
      </div>
    </OnboardingLayout>
  )
}
