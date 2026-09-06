import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import { Button } from '../../components/ui'
import { CheckCircleIcon } from '../../components/icons'
import { useMyListing } from '../../context/AppContext'

export default function Success() {
  const navigate = useNavigate()
  const listing = useMyListing()

  return (
    <OnboardingLayout>
      <div className="text-center">
        <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-brand-green-600" />
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Your property is now live!</h1>
        <p className="text-navy-600/70 mb-8">
          Buyers can now view your listing and contact you directly.
        </p>
        <div className="text-left bg-navy-50 rounded-xl p-4 mb-8 text-sm text-navy-700 space-y-1">
          <p className="font-semibold text-navy-900">Here&rsquo;s what to do next:</p>
          <p>Share your listing</p>
          <p>Check your inbox for enquiries</p>
          <p>Upload more photos any time from your dashboard</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => listing && navigate(`/property/${listing.id}`)}
          >
            View My Listing
          </Button>
          <Button className="flex-1" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  )
}
