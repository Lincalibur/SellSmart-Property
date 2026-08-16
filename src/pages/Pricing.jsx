import { Link } from 'react-router-dom'
import { Button, Card, formatZAR } from '../components/ui'
import { PACKAGES } from '../data/seed'

export default function Pricing() {
  return (
    <div className="container-page py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">
        Simple, transparent pricing
      </h1>
      <p className="text-navy-600/70 text-center mb-12">Choose the level of support that suits you.</p>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PACKAGES.map((pkg) => (
          <Card
            key={pkg.id}
            className={`p-6 flex flex-col ${pkg.popular ? 'ring-2 ring-brand-green-600 relative' : ''}`}
          >
            {pkg.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                ⭐ Most Popular
              </span>
            )}
            <h3 className="font-bold text-navy-900 text-lg">{pkg.name}</h3>
            <p className="text-3xl font-extrabold text-navy-900 my-2">{formatZAR(pkg.price)}</p>
            <p className="text-sm text-navy-600/70 mb-4">{pkg.tagline}</p>
            <ul className="space-y-2 text-sm text-navy-700 flex-1 mb-6">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-green-600">✔</span> {f}
                </li>
              ))}
            </ul>
            <Button as={Link} to="/sell/start" variant={pkg.popular ? 'primary' : 'secondary'}>
              Select Plan
            </Button>
          </Card>
        ))}
      </div>

      <p className="text-center text-navy-600/70 mt-10 text-sm font-medium">
        No commission. No hidden fees. Ever.
      </p>
    </div>
  )
}
