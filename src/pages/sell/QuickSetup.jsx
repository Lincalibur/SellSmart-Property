import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, Field, inputClass } from '../../components/ui'
import { useAppDispatch } from '../../context/AppContext'
import { PROPERTY_TYPES } from '../../data/seed'

export default function QuickSetup() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  function handleSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    dispatch({
      type: 'SET_DRAFT_LISTING',
      patch: {
        type: form.get('type'),
        location: form.get('location'),
        beds: Number(form.get('beds')),
        baths: Number(form.get('baths')),
      },
    })
    navigate('/sell/listing')
  }

  return (
    <OnboardingLayout>
      <Stepper step={4} total={7} label="Property basics" />
      <h1 className="text-xl font-bold text-navy-900 mb-1">Tell us about your property</h1>
      <p className="text-navy-600/70 text-sm mb-6">Just the basics for now — you can add more next.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Property Type">
          <select required name="type" className={inputClass} defaultValue="">
            <option value="" disabled>Select a type</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Location (suburb / city)">
          <input required name="location" className={inputClass} placeholder="e.g. Constantia, Cape Town" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bedrooms">
            <select required name="beds" className={inputClass} defaultValue="">
              <option value="" disabled>Select</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Bathrooms">
            <select required name="baths" className={inputClass} defaultValue="">
              <option value="" disabled>Select</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <Button type="submit" className="w-full">Next</Button>
      </form>
    </OnboardingLayout>
  )
}
