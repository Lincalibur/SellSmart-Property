import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button } from '../../components/ui'
import { HouseIcon } from '../../components/icons'

export default function BuyStart() {
  const navigate = useNavigate()
  return (
    <OnboardingLayout>
      <Stepper step={1} total={4} label="Get started" />
      <div className="text-center">
        <HouseIcon className="w-10 h-10 mx-auto mb-4 text-brand-green-600" />
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Let&rsquo;s find your next home</h1>
        <p className="text-navy-600/70 mb-8">
          Browse listings, contact sellers directly, and make an offer when you&rsquo;re ready.
        </p>
        <Button className="w-full" onClick={() => navigate('/browse')}>Continue</Button>
      </div>
    </OnboardingLayout>
  )
}
