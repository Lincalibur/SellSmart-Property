import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, formatZAR } from '../../components/ui'
import Stepper from '../../components/Stepper'
import { PenIcon, CheckCircleIcon } from '../../components/icons'
import { useAppDispatch, useAppState } from '../../context/AppContext'

export default function Signing() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { otp } = useAppState()
  const [status, setStatus] = useState(otp?.signedByBuyer ? 'signed' : 'idle') // idle | opening | signed

  if (!otp || otp.listingId !== id) {
    return <div className="container-page py-16 text-center text-navy-600">No offer found for this property.</div>
  }

  function openSigningWindow() {
    setStatus('opening')
    setTimeout(() => {
      dispatch({ type: 'SIGN_OTP', party: 'buyer' })
      setStatus('signed')
    }, 1200)
  }

  return (
    <div className="bg-navy-50 min-h-[calc(100vh-4rem)] py-10">
      <div className="container-page max-w-lg">
        {status !== 'signed' && <Stepper step={4} total={4} label="Sign" />}
        <Card className="p-8 text-center">
          {status !== 'signed' ? (
            <>
              <PenIcon className="w-10 h-10 mx-auto mb-4 text-navy-700" />
              <h1 className="text-xl font-bold text-navy-900 mb-2">Sign your Offer to Purchase</h1>
              <p className="text-navy-600/70 text-sm mb-6">
                Offer amount {formatZAR(otp.offerPrice)}. You&rsquo;ll be securely verified and asked to
                sign — you never leave SellSmart Property.
              </p>
              <Button className="w-full" onClick={openSigningWindow} disabled={status === 'opening'}>
                {status === 'opening' ? 'Opening secure signing window…' : 'Open Signing Window'}
              </Button>
              <p className="text-xs text-navy-400 mt-3">
                Simulated for this mockup — a real e-signature provider would be integrated here.
              </p>
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-10 h-10 mx-auto mb-4 text-brand-green-600" />
              <h1 className="text-xl font-bold text-navy-900 mb-2">OTP Signed</h1>
              <p className="text-navy-600/70 text-sm mb-6">
                Your signed offer has been sent to the seller. You can track progress from your dashboard.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => navigate(`/property/${id}`)}>
                  Back to Listing
                </Button>
                <Button className="flex-1" onClick={() => navigate('/buyer/dashboard')}>
                  Go to My Dashboard
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
