import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout'
import ProcessTracker from '../../components/ProcessTracker'
import { Button, Card, Tag, formatZAR } from '../../components/ui'
import { useAppState, useMyListing } from '../../context/AppContext'
import { PROCESS_STAGES } from '../../data/seed'

export default function DashboardHome() {
  const { enquiries, viewings, otp, processStageIndex, documents } = useAppState()
  const listing = useMyListing()

  if (!listing) {
    return (
      <DashboardLayout>
        <Card className="p-8 text-center">
          <p className="text-navy-700 mb-4">You don&rsquo;t have an active listing yet.</p>
          <Button as={Link} to="/sell/start">Start Selling</Button>
        </Card>
      </DashboardLayout>
    )
  }

  const uploadedDocs = documents.filter((d) => d.status === 'uploaded').length

  return (
    <DashboardLayout>
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Tag>Active</Tag>
              <h2 className="font-bold text-navy-900 mt-2">{listing.title}</h2>
              <p className="text-sm text-navy-600/70">{listing.location}</p>
            </div>
            <p className="text-xl font-extrabold text-navy-900">{formatZAR(listing.price)}</p>
          </div>
          <div className="flex gap-6 text-sm text-navy-800 border-t border-navy-100 pt-3">
            <span><strong>{listing.views}</strong> Views</span>
            <span><strong>{enquiries.length}</strong> Enquiries</span>
            <span><strong>{viewings.length}</strong> Viewing requests</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-navy-900 mb-3 text-sm">Quick Actions</h3>
          <div className="space-y-2">
            <Button as={Link} to="/sell/listing" variant="secondary" className="w-full justify-start">
              + Add Photos
            </Button>
            <Button as={Link} to="/pricing" variant="secondary" className="w-full justify-start">
              + Boost Listing
            </Button>
            <Button as={Link} to="/dashboard/documents" variant="secondary" className="w-full justify-start">
              + Upload Documents
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy-900">Enquiries</h3>
            <Link to="/dashboard/enquiries" className="text-xs font-semibold text-brand-green-700 hover:underline">
              View All
            </Link>
          </div>
          {enquiries.length === 0 ? (
            <p className="text-sm text-navy-500">No enquiries yet — share your listing to get started.</p>
          ) : (
            <ul className="space-y-2">
              {enquiries.slice(0, 3).map((e) => (
                <li key={e.id} className="text-sm text-navy-700 flex justify-between">
                  <span>{e.name}</span>
                  <span className="text-navy-400">Interested buyer</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy-900">Offers</h3>
            <Link to="/dashboard/offers" className="text-xs font-semibold text-brand-green-700 hover:underline">
              View All
            </Link>
          </div>
          {!otp ? (
            <p className="text-sm text-navy-500">No offers submitted yet.</p>
          ) : (
            <div className="text-sm text-navy-700">
              <p>Offer {formatZAR(otp.offerPrice)}</p>
              <p className="text-navy-400 capitalize">{otp.status}</p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy-900">Process Tracker</h3>
          <Link to="/dashboard/tracker" className="text-xs font-semibold text-brand-green-700 hover:underline">
            Full view
          </Link>
        </div>
        <ProcessTracker stageIndex={processStageIndex} />
        <p className="text-xs text-navy-500 mt-4">
          Current stage: <strong>{PROCESS_STAGES[processStageIndex]}</strong> · {uploadedDocs}/{documents.length} documents uploaded
        </p>
      </Card>
    </DashboardLayout>
  )
}
