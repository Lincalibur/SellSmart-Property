import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { Button, Card, Check, Tag, formatZAR, inputClass, Field } from '../components/ui'
import Modal from '../components/Modal'
import Stepper from '../components/Stepper'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { listings, role } = useAppState()
  const dispatch = useAppDispatch()
  const listing = listings.find((l) => l.id === id)

  const [activeImage, setActiveImage] = useState(0)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [viewingOpen, setViewingOpen] = useState(false)
  const [sent, setSent] = useState(null)

  if (!listing) {
    return <div className="container-page py-16 text-center text-navy-600">Listing not found.</div>
  }

  function submitEnquiry(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    dispatch({
      type: 'ADD_ENQUIRY',
      enquiry: {
        id: `enq-${Date.now()}`,
        listingId: listing.id,
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
        message: form.get('message'),
        createdAt: new Date().toISOString(),
      },
    })
    setEnquiryOpen(false)
    setSent('enquiry')
  }

  function submitViewing(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    dispatch({
      type: 'ADD_VIEWING',
      viewing: {
        id: `view-${Date.now()}`,
        listingId: listing.id,
        name: form.get('name'),
        date: form.get('date'),
        time: form.get('time'),
        status: 'pending',
      },
    })
    setViewingOpen(false)
    setSent('viewing')
  }

  return (
    <div className="container-page py-10">
      {role === 'buyer' && (
        <div className="max-w-md mb-6">
          <Stepper step={2} total={4} label="View property" />
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden aspect-[16/10] bg-navy-50 mb-3">
            <img
              src={listing.images[activeImage]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2 mb-6">
              {listing.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-14 rounded-lg overflow-hidden border-2 ${
                    i === activeImage ? 'border-brand-green-600' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <Tag>{listing.type}</Tag>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mt-3">{listing.title}</h1>
          <p className="text-navy-600/70 mb-3">{listing.location}</p>
          <p className="text-3xl font-extrabold text-navy-900 mb-6">{formatZAR(listing.price)}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-sm font-medium text-navy-800 divide-x divide-navy-200">
            <span>{listing.beds} Beds</span>
            <span className="pl-4">{listing.baths} Baths</span>
            <span className="pl-4">{listing.parking} Parking</span>
            <span className="pl-4">{listing.size} m²</span>
          </div>

          {listing.extras?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {listing.extras.map((e) => (
                <Tag key={e} tone="navy">{e}</Tag>
              ))}
            </div>
          )}

          <h2 className="font-semibold text-navy-900 mb-2">Description</h2>
          <p className="text-navy-700 leading-relaxed">{listing.description}</p>
        </div>

        <div>
          <Card className="p-5 sticky top-24">
            {sent && (
              <div className="mb-4 text-sm bg-brand-green-50 text-brand-green-700 rounded-lg px-3 py-2">
                <Check>
                  {sent === 'enquiry' ? 'Enquiry sent to the seller.' : 'Viewing request sent to the seller.'}
                </Check>
              </div>
            )}
            <h3 className="font-semibold text-navy-900 mb-1">Contact Seller</h3>
            <p className="text-sm text-navy-600/70 mb-4">{listing.seller?.name}</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => setEnquiryOpen(true)}>Send Enquiry</Button>
              <Button className="w-full" variant="secondary" onClick={() => setViewingOpen(true)}>
                Request Viewing
              </Button>
              <Button
                className="w-full"
                variant="navy"
                onClick={() => navigate(`/property/${listing.id}/offer`)}
              >
                Make an Offer (OTP)
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} title="Send Enquiry">
        <form onSubmit={submitEnquiry} className="space-y-4">
          <Field label="Name"><input required name="name" className={inputClass} /></Field>
          <Field label="Email"><input required type="email" name="email" className={inputClass} /></Field>
          <Field label="Phone (optional)"><input name="phone" className={inputClass} /></Field>
          <Field label="Message">
            <textarea name="message" rows={3} className={inputClass} defaultValue="Hi, I'm interested in this property." />
          </Field>
          <Button type="submit" className="w-full">Submit</Button>
        </form>
      </Modal>

      <Modal open={viewingOpen} onClose={() => setViewingOpen(false)} title="Request Viewing">
        <form onSubmit={submitViewing} className="space-y-4">
          <Field label="Name"><input required name="name" className={inputClass} /></Field>
          <Field label="Preferred Date"><input required type="date" name="date" className={inputClass} /></Field>
          <Field label="Preferred Time"><input required type="time" name="time" className={inputClass} /></Field>
          <Button type="submit" className="w-full">Send Request</Button>
        </form>
      </Modal>
    </div>
  )
}
