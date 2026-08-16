import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Field, inputClass } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState('login')
  const navigate = useNavigate()

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <Card className="p-8">
        <div className="flex rounded-full bg-navy-50 p-1 mb-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-full ${mode === 'login' ? 'bg-navy-900 text-white' : 'text-navy-700'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-full ${mode === 'signup' ? 'bg-navy-900 text-white' : 'text-navy-700'}`}
          >
            Sign Up
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            navigate('/dashboard')
          }}
        >
          {mode === 'signup' && (
            <Field label="Full Name"><input required className={inputClass} /></Field>
          )}
          <Field label="Email"><input required type="email" className={inputClass} /></Field>
          <Field label="Password"><input required type="password" className={inputClass} /></Field>
          <Button type="submit" className="w-full">
            {mode === 'login' ? 'Log In' : 'Create My Account'}
          </Button>
        </form>
        <p className="text-xs text-navy-600/60 text-center mt-4">We&rsquo;ll never share your details.</p>
      </Card>
    </div>
  )
}
