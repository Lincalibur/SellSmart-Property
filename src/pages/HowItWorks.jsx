import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'

const SELLER_STEPS = [
  'Create your account and choose a package',
  'List your property (guided, step-by-step)',
  'Receive enquiries and manage viewings',
  'Receive offers, negotiate or accept',
  'Sign the Offer to Purchase electronically',
  'Upload FICA and supporting documents',
  'Select a conveyancer and track the transfer',
]

const BUYER_STEPS = [
  'Browse and filter listings',
  'Contact the seller directly',
  'Request a viewing',
  'Build and submit an Offer to Purchase',
  'Sign electronically once terms are agreed',
  'Upload FICA documents and apply for a bond',
  'Track the transaction through to registration',
]

export default function HowItWorks() {
  return (
    <div className="container-page py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">How It Works</h1>
      <p className="text-navy-600/70 text-center mb-12 max-w-2xl mx-auto">
        SellSmart Property isn&rsquo;t just a listings site — it&rsquo;s a guided, end-to-end transaction
        platform from listing to legal transfer.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="font-bold text-navy-900 mb-4">For Sellers</h2>
          <ol className="space-y-3">
            {SELLER_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-navy-700">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-green-600 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Button as={Link} to="/sell/start" className="mt-6 w-full">Start Selling</Button>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-navy-900 mb-4">For Buyers</h2>
          <ol className="space-y-3">
            {BUYER_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-navy-700">
                <span className="shrink-0 w-6 h-6 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Button as={Link} to="/browse" variant="secondary" className="mt-6 w-full">Browse Properties</Button>
        </Card>
      </div>
    </div>
  )
}
