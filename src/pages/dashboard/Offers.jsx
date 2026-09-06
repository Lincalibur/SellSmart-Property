import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Button, Card, Check, Field, Tag, formatZAR, inputClass } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'

const STATUS_TONE = {
  submitted: 'amber',
  countered: 'amber',
  accepted: 'green',
  rejected: 'red',
}

export default function Offers() {
  const { otp } = useAppState()
  const dispatch = useAppDispatch()
  const [countering, setCountering] = useState(false)
  const [counterPrice, setCounterPrice] = useState('')

  return (
    <DashboardLayout>
      <h2 className="font-bold text-navy-900 text-lg mb-4">Offer Management</h2>

      {!otp ? (
        <Card className="p-8 text-center text-navy-500 text-sm">
          No offers received yet. When a buyer submits an Offer to Purchase, it&rsquo;ll appear here.
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy-900">Offer from {otp.buyer?.name}</h3>
              <Tag tone={STATUS_TONE[otp.status] ?? 'navy'}>{otp.status}</Tag>
            </div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
              <div><dt className="text-navy-500">Offer Amount</dt><dd className="font-semibold text-navy-900">{formatZAR(otp.offerPrice)}</dd></div>
              <div><dt className="text-navy-500">Deposit</dt><dd className="font-semibold text-navy-900">{formatZAR(otp.deposit)}</dd></div>
              <div><dt className="text-navy-500">Occupation Date</dt><dd className="font-semibold text-navy-900">{otp.occupationDate || '—'}</dd></div>
              <div><dt className="text-navy-500">Bond Amount</dt><dd className="font-semibold text-navy-900">{otp.bondAmount ? formatZAR(otp.bondAmount) : '—'}</dd></div>
            </dl>
            {otp.suspensiveConditions && (
              <div className="mb-4">
                <p className="text-navy-500 text-sm mb-1">Suspensive Conditions</p>
                <p className="text-sm text-navy-800">{otp.suspensiveConditions}</p>
              </div>
            )}

            {otp.status === 'submitted' && (
              <div className="flex flex-wrap gap-2 border-t border-navy-100 pt-4">
                <Button onClick={() => dispatch({ type: 'SELLER_RESPOND_OFFER', decision: 'accept' })}>
                  Accept
                </Button>
                <Button variant="secondary" onClick={() => setCountering((c) => !c)}>Counter</Button>
                <Button variant="danger" onClick={() => dispatch({ type: 'SELLER_RESPOND_OFFER', decision: 'reject' })}>
                  Reject
                </Button>
              </div>
            )}

            {countering && (
              <div className="border-t border-navy-100 pt-4 mt-4 grid sm:grid-cols-2 gap-3 items-end">
                <Field label="New Price">
                  <input
                    type="number"
                    className={inputClass}
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    placeholder={otp.offerPrice}
                  />
                </Field>
                <Button
                  disabled={!counterPrice}
                  onClick={() => {
                    dispatch({ type: 'SELLER_RESPOND_OFFER', decision: 'counter', counterPrice: Number(counterPrice) })
                    setCountering(false)
                  }}
                >
                  Send Counter Offer
                </Button>
              </div>
            )}

            {otp.status === 'countered' && (
              <p className="text-sm text-navy-600 border-t border-navy-100 pt-4 mt-4">
                Waiting on buyer to respond to your counter of {formatZAR(otp.counterPrice)}.
              </p>
            )}

            {otp.status === 'accepted' && !(otp.signedByBuyer && otp.signedBySeller) && (
              <div className="border-t border-navy-100 pt-4 mt-4">
                <p className="text-sm text-navy-700 mb-3">
                  Offer accepted — sign the Offer to Purchase to proceed.
                </p>
                <Button
                  disabled={otp.signedBySeller}
                  onClick={() => dispatch({ type: 'SIGN_OTP', party: 'seller' })}
                >
                  {otp.signedBySeller ? <Check>You have signed</Check> : 'Sign OTP as Seller'}
                </Button>
              </div>
            )}

            {otp.signedByBuyer && otp.signedBySeller && (
              <p className="text-sm font-semibold text-brand-green-700 border-t border-navy-100 pt-4 mt-4">
                <Check>OTP fully signed by both parties.</Check>
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-navy-900 mb-3">Version History</h3>
            <ul className="space-y-3">
              {otp.history.map((h, i) => (
                <li key={i} className="text-sm">
                  <p className="text-navy-900">{h.event}</p>
                  <p className="text-xs text-navy-500 capitalize">
                    by {h.by}{h.amount ? ` · ${formatZAR(h.amount)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
