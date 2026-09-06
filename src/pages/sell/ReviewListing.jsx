import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, Card, Tag, formatZAR } from '../../components/ui'
import { useAppState } from '../../context/AppContext'

export default function ReviewListing() {
  const navigate = useNavigate()
  const { draftListing } = useAppState()

  if (!draftListing) {
    return (
      <OnboardingLayout>
        <p className="text-navy-700 mb-4">Let&rsquo;s start your listing first.</p>
        <Button className="w-full" onClick={() => navigate('/sell/start')}>Start Selling</Button>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout wide>
      <Stepper step={6} total={7} label="Review" />
      <h1 className="text-xl font-bold text-navy-900 mb-1">Review your listing</h1>
      <p className="text-navy-600/70 text-sm mb-6">Make sure everything looks right before you publish.</p>

      <Card className="overflow-hidden">
        {draftListing.images?.[0] && (
          <img src={draftListing.images[0]} alt="" className="w-full aspect-[16/9] object-cover" />
        )}
        <div className="p-5">
          {draftListing.type && <Tag>{draftListing.type}</Tag>}
          <h2 className="text-lg font-bold text-navy-900 mt-2">{draftListing.title || 'Untitled listing'}</h2>
          <p className="text-navy-600/70 text-sm">{draftListing.location}</p>
          <p className="text-2xl font-extrabold text-navy-900 my-3">
            {draftListing.price ? formatZAR(draftListing.price) : '—'}
          </p>
          <div className="flex gap-4 text-sm text-navy-800 font-medium mb-3">
            <span>{draftListing.beds ?? '–'} Beds</span>
            <span>{draftListing.baths ?? '–'} Baths</span>
            <span>{draftListing.parking ?? '–'} Parking</span>
            <span>{draftListing.size ?? '–'} m²</span>
          </div>
          {draftListing.extras?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {draftListing.extras.map((e) => <Tag key={e} tone="navy">{e}</Tag>)}
            </div>
          )}
          <p className="text-sm text-navy-700">{draftListing.description}</p>
        </div>
      </Card>

      <div className="flex gap-3 mt-6">
        <Button variant="secondary" className="flex-1" onClick={() => navigate('/sell/listing')}>
          Edit
        </Button>
        <Button className="flex-1" onClick={() => navigate('/sell/payment')}>
          Looks Good — Continue
        </Button>
      </div>
    </OnboardingLayout>
  )
}
