import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import { Button } from '../../components/ui'

export default function StartSelling() {
  const navigate = useNavigate()
  return (
    <OnboardingLayout>
      <div className="text-center">
        <div className="text-4xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Let&rsquo;s get your property listed</h1>
        <p className="text-navy-600/70 mb-8">It only takes a few minutes to get started</p>
        <Button className="w-full" onClick={() => navigate('/sell/account')}>Continue</Button>
      </div>
    </OnboardingLayout>
  )
}
