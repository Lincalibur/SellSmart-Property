import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, Field, Tip, inputClass } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'

const EXTRA_OPTIONS = ['Pool', 'Garden', 'Solar power', 'Alarm system', 'Fibre ready', 'Sea view', 'Braai area']

const STEP_IMAGES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=600&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&h=600&fit=crop&auto=format&q=80',
]

export default function ListingWizard() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { draftListing } = useAppState()
  const [step, setStep] = useState(2) // continues numbering from Quick Setup (step 1 of 5)

  const [size, setSize] = useState(draftListing?.size ?? '')
  const [parking, setParking] = useState(draftListing?.parking ?? '')
  const [extras, setExtras] = useState(draftListing?.extras ?? [])
  const [price, setPrice] = useState(draftListing?.price ?? '')
  const [title, setTitle] = useState(draftListing?.title ?? '')
  const [description, setDescription] = useState(draftListing?.description ?? '')
  const [photosAdded, setPhotosAdded] = useState(draftListing?.images?.length > 0)

  function toggleExtra(extra) {
    setExtras((prev) => (prev.includes(extra) ? prev.filter((e) => e !== extra) : [...prev, extra]))
  }

  function next(patch, goto) {
    dispatch({ type: 'SET_DRAFT_LISTING', patch })
    setStep(goto)
  }

  function finish() {
    dispatch({
      type: 'SET_DRAFT_LISTING',
      patch: { images: photosAdded ? STEP_IMAGES : [STEP_IMAGES[0]] },
    })
    navigate('/sell/review')
  }

  return (
    <OnboardingLayout wide>
      {step === 2 && (
        <>
          <Stepper step={2} total={5} label="Property details" />
          <h1 className="text-xl font-bold text-navy-900 mb-6">Add a few more details</h1>
          <div className="space-y-4">
            <Field label="Size (m²)">
              <input
                type="number"
                className={inputClass}
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </Field>
            <Field label="Parking Spaces">
              <input
                type="number"
                className={inputClass}
                value={parking}
                onChange={(e) => setParking(e.target.value)}
              />
            </Field>
            <Field label="Extras">
              <div className="flex flex-wrap gap-2">
                {EXTRA_OPTIONS.map((extra) => (
                  <button
                    key={extra}
                    type="button"
                    onClick={() => toggleExtra(extra)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      extras.includes(extra)
                        ? 'bg-brand-green-600 border-brand-green-600 text-white'
                        : 'border-navy-200 text-navy-700'
                    }`}
                  >
                    {extra}
                  </button>
                ))}
              </div>
            </Field>
            <Button
              className="w-full"
              onClick={() => next({ size: Number(size), parking: Number(parking), extras }, 3)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Stepper step={3} total={5} label="Price" />
          <h1 className="text-xl font-bold text-navy-900 mb-6">Set your asking price</h1>
          <div className="space-y-4">
            <Field label="Asking Price (ZAR)">
              <input
                type="number"
                required
                className={inputClass}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 1950000"
              />
            </Field>
            <Tip>Need help pricing? Our Pro package includes expert pricing guidance.</Tip>
            <Button className="w-full" onClick={() => next({ price: Number(price) }, 4)} disabled={!price}>
              Next
            </Button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <Stepper step={4} total={5} label="Description" />
          <h1 className="text-xl font-bold text-navy-900 mb-6">Describe your property</h1>
          <div className="space-y-4">
            <Field label="Listing Title">
              <input
                required
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Modern Family Home in Cape Town"
              />
            </Field>
            <Field label="Description">
              <textarea
                required
                rows={5}
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell buyers what makes this property special..."
              />
            </Field>
            <button type="button" className="text-xs font-semibold text-brand-green-700 hover:underline" disabled>
              ✨ Generate description (coming soon)
            </button>
            <Button
              className="w-full"
              onClick={() => next({ title, description }, 5)}
              disabled={!title || !description}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <Stepper step={5} total={5} label="Photos" />
          <h1 className="text-xl font-bold text-navy-900 mb-6">Add photos</h1>
          <button
            type="button"
            onClick={() => setPhotosAdded(true)}
            className={`w-full border-2 border-dashed rounded-xl py-12 text-center transition-colors ${
              photosAdded ? 'border-brand-green-500 bg-brand-green-50' : 'border-navy-200 hover:border-navy-400'
            }`}
          >
            {photosAdded ? (
              <div className="flex justify-center gap-3">
                {STEP_IMAGES.map((img) => (
                  <img key={img} src={img} alt="" className="w-24 h-16 object-cover rounded-lg" />
                ))}
              </div>
            ) : (
              <span className="text-navy-600 text-sm">📸 Drag &amp; drop images, or click to upload</span>
            )}
          </button>
          <Tip>Tip: Listings with photos get more enquiries.</Tip>
          <Button className="w-full mt-4" onClick={finish}>Continue</Button>
        </>
      )}
    </OnboardingLayout>
  )
}
