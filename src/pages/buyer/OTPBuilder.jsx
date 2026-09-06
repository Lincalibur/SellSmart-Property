import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Stepper from '../../components/Stepper'
import { Button, Card, Field, Tip, formatZAR, inputClass } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'

export default function OTPBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { listings } = useAppState()
  const listing = listings.find((l) => l.id === id)
  const [step, setStep] = useState(1)

  const [buyer, setBuyer] = useState({ name: '', idNumber: '', contact: '' })
  const [offer, setOffer] = useState({
    offerPrice: listing?.price ?? '',
    deposit: '',
    occupationDate: '',
    occupationalRent: '',
    bondAmount: '',
    fixtures: '',
    suspensiveConditions: 'Subject to buyer obtaining bond approval within 30 days.',
    specialConditions: '',
  })

  if (!listing) {
    return <div className="container-page py-16 text-center text-navy-600">Listing not found.</div>
  }

  function submit() {
    dispatch({
      type: 'SUBMIT_OTP',
      otp: {
        id: `otp-${Date.now()}`,
        listingId: listing.id,
        buyer,
        offerPrice: Number(offer.offerPrice),
        deposit: Number(offer.deposit),
        occupationDate: offer.occupationDate,
        occupationalRent: offer.occupationalRent,
        bondAmount: offer.bondAmount ? Number(offer.bondAmount) : undefined,
        fixtures: offer.fixtures,
        suspensiveConditions: offer.suspensiveConditions,
        specialConditions: offer.specialConditions,
      },
    })
    navigate(`/property/${listing.id}/sign`)
  }

  return (
    <div className="bg-navy-50 min-h-[calc(100vh-4rem)] py-10">
      <div className="container-page max-w-2xl">
        <Card className="p-6 md:p-8">
          <h1 className="text-lg font-bold text-navy-900 mb-1">Offer to Purchase</h1>
          <p className="text-navy-600/70 text-sm mb-6">{listing.title} · {formatZAR(listing.price)}</p>

          {step === 1 && (
            <>
              <Stepper step={3} total={4} label="Make an offer — Buyer details" />
              <div className="space-y-4">
                <Field label="Full Name">
                  <input
                    required
                    className={inputClass}
                    value={buyer.name}
                    onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                  />
                </Field>
                <Field label="ID Number" hint="Used for identity verification before signing.">
                  <input
                    required
                    className={inputClass}
                    value={buyer.idNumber}
                    onChange={(e) => setBuyer({ ...buyer, idNumber: e.target.value })}
                  />
                </Field>
                <Field label="Contact Number">
                  <input
                    required
                    className={inputClass}
                    value={buyer.contact}
                    onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })}
                  />
                </Field>
                <Button className="w-full" onClick={() => setStep(2)} disabled={!buyer.name || !buyer.idNumber}>
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Stepper step={3} total={4} label="Make an offer — Offer details" />
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Offer Price (ZAR)">
                    <input
                      required
                      type="number"
                      className={inputClass}
                      value={offer.offerPrice}
                      onChange={(e) => setOffer({ ...offer, offerPrice: e.target.value })}
                    />
                  </Field>
                  <Field label="Deposit (ZAR)">
                    <input
                      required
                      type="number"
                      className={inputClass}
                      value={offer.deposit}
                      onChange={(e) => setOffer({ ...offer, deposit: e.target.value })}
                    />
                  </Field>
                  <Field label="Occupation Date">
                    <input
                      required
                      type="date"
                      className={inputClass}
                      value={offer.occupationDate}
                      onChange={(e) => setOffer({ ...offer, occupationDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Occupational Rent (ZAR/month)">
                    <input
                      type="number"
                      className={inputClass}
                      value={offer.occupationalRent}
                      onChange={(e) => setOffer({ ...offer, occupationalRent: e.target.value })}
                    />
                  </Field>
                  <Field label="Bond Amount Required (optional)">
                    <input
                      type="number"
                      className={inputClass}
                      value={offer.bondAmount}
                      onChange={(e) => setOffer({ ...offer, bondAmount: e.target.value })}
                    />
                  </Field>
                  <Field label="Fixtures Included">
                    <input
                      className={inputClass}
                      placeholder="e.g. curtains, light fittings"
                      value={offer.fixtures}
                      onChange={(e) => setOffer({ ...offer, fixtures: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Suspensive Conditions">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={offer.suspensiveConditions}
                    onChange={(e) => setOffer({ ...offer, suspensiveConditions: e.target.value })}
                  />
                </Field>
                <Field label="Special Conditions (optional)">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={offer.specialConditions}
                    onChange={(e) => setOffer({ ...offer, specialConditions: e.target.value })}
                  />
                </Field>
                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    className="flex-1"
                    onClick={() => setStep(3)}
                    disabled={!offer.offerPrice || !offer.deposit || !offer.occupationDate}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Stepper step={3} total={4} label="Make an offer — Review" />
              <div className="space-y-3 text-sm mb-4">
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-navy-500">Buyer</span><span className="text-navy-900 font-medium">{buyer.name}</span>
                  <span className="text-navy-500">Offer Price</span><span className="text-navy-900 font-medium">{formatZAR(Number(offer.offerPrice))}</span>
                  <span className="text-navy-500">Deposit</span><span className="text-navy-900 font-medium">{formatZAR(Number(offer.deposit))}</span>
                  <span className="text-navy-500">Occupation Date</span><span className="text-navy-900 font-medium">{offer.occupationDate}</span>
                  {offer.bondAmount && (
                    <>
                      <span className="text-navy-500">Bond Amount</span>
                      <span className="text-navy-900 font-medium">{formatZAR(Number(offer.bondAmount))}</span>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-navy-500 mb-1">Suspensive Conditions</p>
                  <p className="text-navy-800">{offer.suspensiveConditions || '—'}</p>
                </div>
              </div>
              <Tip>Your offer is generated automatically from an attorney-approved OTP template.</Tip>
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={submit}>Submit Offer</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
