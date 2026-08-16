import { useNavigate } from 'react-router-dom'
import OnboardingLayout from '../../components/OnboardingLayout'
import Stepper from '../../components/Stepper'
import { Button, Field, inputClass } from '../../components/ui'
import { useAppDispatch } from '../../context/AppContext'

export default function AccountCreation() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  function handleSubmit(e) {
    e.preventDefault()
    const form = new FormData(e.target)
    dispatch({
      type: 'CREATE_ACCOUNT',
      account: {
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
      },
    })
    navigate('/sell/package')
  }

  return (
    <OnboardingLayout>
      <Stepper step={1} total={2} label="Getting started" />
      <h1 className="text-xl font-bold text-navy-900 mb-1">Create your account</h1>
      <p className="text-navy-600/70 text-sm mb-6">Keep this simple — you can add more detail later.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name"><input required name="name" className={inputClass} /></Field>
        <Field label="Email"><input required type="email" name="email" className={inputClass} /></Field>
        <Field label="Phone Number"><input required name="phone" className={inputClass} /></Field>
        <Field label="Password"><input required type="password" name="password" className={inputClass} /></Field>
        <p className="text-xs text-navy-600/60">We&rsquo;ll never share your details.</p>
        <Button type="submit" className="w-full">Create My Account</Button>
      </form>
    </OnboardingLayout>
  )
}
