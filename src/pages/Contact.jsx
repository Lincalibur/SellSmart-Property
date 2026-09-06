import { useState } from 'react'
import { Button, Check, Field, inputClass } from '../components/ui'

export default function Contact() {
  const [sent, setSent] = useState(false)

  return (
    <div className="container-page py-16 max-w-lg mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">Contact &amp; Support</h1>
      <p className="text-navy-600/70 mb-8">We typically respond within one business day.</p>
      {sent ? (
        <div className="bg-brand-green-50 text-brand-green-700 rounded-lg px-4 py-3 text-sm">
          <Check>Thanks — your message has been sent to our support team.</Check>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setSent(true)
          }}
        >
          <Field label="Name"><input required className={inputClass} /></Field>
          <Field label="Email"><input required type="email" className={inputClass} /></Field>
          <Field label="Message"><textarea required rows={4} className={inputClass} /></Field>
          <Button type="submit" className="w-full">Send Message</Button>
        </form>
      )}
    </div>
  )
}
