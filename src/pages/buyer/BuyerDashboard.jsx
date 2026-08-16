import { Link } from 'react-router-dom'
import ProcessTracker from '../../components/ProcessTracker'
import { Button, Card, Tag, formatZAR } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { PROCESS_STAGES } from '../../data/seed'

export default function BuyerDashboard() {
  const { otp, listings, documents, processStageIndex } = useAppState()
  const dispatch = useAppDispatch()
  const listing = otp ? listings.find((l) => l.id === otp.listingId) : null
  const myDocs = documents.filter((d) => d.owner === 'buyer' || d.owner === 'shared')

  return (
    <div className="bg-navy-50 min-h-[calc(100vh-4rem)]">
      <div className="container-page py-8">
        <h1 className="text-2xl font-bold text-navy-900 mb-1">My Activity</h1>
        <p className="text-navy-600/70 mb-8">Track your saved searches, offers, and documents.</p>

        {!otp ? (
          <Card className="p-8 text-center">
            <p className="text-navy-700 mb-4">You haven&rsquo;t submitted an offer yet.</p>
            <Button as={Link} to="/browse">Browse Properties</Button>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-navy-500">Your offer on</p>
                  <h2 className="font-semibold text-navy-900">{listing?.title}</h2>
                </div>
                <Tag tone={otp.status === 'rejected' ? 'red' : otp.status === 'accepted' ? 'green' : 'amber'}>
                  {otp.status}
                </Tag>
              </div>
              <p className="text-lg font-bold text-navy-900">{formatZAR(otp.offerPrice)}</p>

              {otp.status === 'countered' && (
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-sm text-navy-800 mb-3">
                    The seller countered with <strong>{formatZAR(otp.counterPrice)}</strong>.
                  </p>
                  <Button onClick={() => dispatch({ type: 'BUYER_ACCEPT_COUNTER' })}>
                    Accept Counter Offer
                  </Button>
                </div>
              )}

              {otp.status === 'accepted' && (
                <div className="mt-4">
                  {!otp.signedByBuyer ? (
                    <Button as={Link} to={`/property/${otp.listingId}/sign`}>Sign OTP</Button>
                  ) : otp.signedBySeller ? (
                    <p className="text-sm font-semibold text-brand-green-700">✔ Fully signed by both parties</p>
                  ) : (
                    <p className="text-sm text-navy-600">✔ You&rsquo;ve signed — waiting on the seller.</p>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-navy-900 mb-3">Documents</h3>
              <ul className="divide-y divide-navy-100">
                {myDocs.map((d) => (
                  <li key={d.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-sm text-navy-800">{d.name}</span>
                    {d.status === 'uploaded' ? (
                      <Tag tone="green">✔ Uploaded</Tag>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-green-700 hover:underline"
                        onClick={() => dispatch({ type: 'UPLOAD_DOCUMENT', id: d.id })}
                      >
                        Upload
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-navy-900 mb-3">Bond Application</h3>
              <p className="text-sm text-navy-600/70 mb-3">
                Select a bond originator from the marketplace to apply.
              </p>
              <Button as={Link} to="/marketplace" variant="secondary">Browse Bond Originators</Button>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-navy-900 mb-3">Transaction Progress</h3>
              <ProcessTracker stageIndex={processStageIndex} />
              <p className="text-xs text-navy-500 mt-4">
                Current stage: <strong>{PROCESS_STAGES[processStageIndex]}</strong>
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
