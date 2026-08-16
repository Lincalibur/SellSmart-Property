import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, formatZAR } from '../components/ui'
import { PACKAGES } from '../data/seed'

const TRUST_ITEMS = [
  'Save thousands in commission',
  'Secure & user-friendly platform',
  'Expert support available',
  'Designed for South African sellers',
]

const HOW_IT_WORKS = [
  { icon: '🏠', title: 'List your property', body: 'Add your property details, photos, and price.' },
  { icon: '💬', title: 'Connect with buyers', body: 'Receive enquiries directly from interested buyers.' },
  { icon: '🤝', title: 'Manage offers', body: 'Negotiate and agree on the best deal.' },
  { icon: '📑', title: 'Close the deal', body: 'Use our tools and support to complete the process.' },
]

const COMPARISON = [
  ['5–7.5% commission', 'Once-off low fee'],
  ['Limited control', 'Full control'],
  ['Agent as middleman', 'Direct buyer contact'],
  ['Slow process', 'Faster decisions'],
  ['Limited transparency', 'Full visibility'],
]

const FEATURES = [
  { icon: '📊', title: 'Seller dashboard', body: 'Track listings, enquiries, offers and documents in one place.' },
  { icon: '📄', title: 'Legal documents & templates', body: 'Guided OTP builder and a document hub built for SA compliance.' },
  { icon: '💬', title: 'Direct buyer enquiries', body: 'No middleman — buyers reach you directly.' },
  { icon: '📅', title: 'Viewing scheduler', body: 'Accept or reschedule requests without back-and-forth calls.' },
  { icon: '📈', title: 'Listing exposure', body: 'Get your property in front of serious buyers.' },
  { icon: '🧠', title: 'Expert support (optional)', body: 'Get help when you want it, stay in control when you don’t.' },
]

const TESTIMONIALS = [
  { quote: 'Saved R120,000 selling privately.', name: 'J. Adams, Cape Town' },
  { quote: 'Easy to use and fully guided — I never felt lost.', name: 'P. Naidoo, Johannesburg' },
]

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="bg-navy-900 text-white">
        <div className="container-page grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              Sell your property privately — and save thousands
            </h1>
            <p className="text-navy-100/80 text-lg mb-6">
              List, sell, and save — with expert support when you need it
            </p>
            <ul className="space-y-2 mb-8 text-navy-100/90 text-sm">
              <li>✔ No agent commission</li>
              <li>✔ Full control of your sale</li>
              <li>✔ Step-by-step guidance</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button as={Link} to="/sell/start" variant="primary" className="px-6 py-3 text-base">
                Start Selling
              </Button>
              <Button as={Link} to="/browse" variant="outlineLight" className="px-6 py-3 text-base">
                Browse Properties
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop&auto=format&q=80"
              alt="Modern home"
              className="rounded-2xl shadow-2xl w-full object-cover aspect-[4/3]"
            />
            <div className="absolute -bottom-5 left-5 right-5 bg-white text-navy-900 rounded-xl shadow-lg px-4 py-3 text-sm font-semibold">
              Save up to R200,000+ in commission
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-navy-800 text-white">
        <div className="container-page py-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="text-brand-green-400">✔</span>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">How It Works</h2>
        <p className="text-navy-600/70 text-center mb-10">Four simple steps from listing to close.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <Card key={step.title} className="p-6 text-center">
              <div className="text-3xl mb-3">{step.icon}</div>
              <p className="text-xs font-bold text-brand-green-600 mb-1">STEP {i + 1}</p>
              <h3 className="font-semibold text-navy-900 mb-1">{step.title}</h3>
              <p className="text-sm text-navy-600/70">{step.body}</p>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button as={Link} to="/sell/start">Start Selling Now</Button>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="bg-navy-50 py-16 md:py-20">
        <div className="container-page">
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">
            Why pay agent commission?
          </h2>
          <p className="text-navy-600/70 text-center mb-10">
            Selling a R2,000,000 property: agent commission (6%) = {formatZAR(120000)} vs. SellSmart from{' '}
            {formatZAR(699)} once-off.
          </p>
          <Card className="overflow-hidden max-w-2xl mx-auto">
            <div className="grid grid-cols-2">
              <div className="bg-navy-900 text-white font-bold text-center py-3">Traditional Agent</div>
              <div className="bg-brand-green-600 text-white font-bold text-center py-3">SellSmart Property</div>
              {COMPARISON.map(([a, b]) => (
                <Fragment key={a}>
                  <div className="text-center py-3 text-sm text-navy-700 border-t border-navy-100">{a}</div>
                  <div className="text-center py-3 text-sm font-medium text-navy-900 border-t border-navy-100 bg-brand-green-50/40">{b}</div>
                </Fragment>
              ))}
            </div>
          </Card>
          <p className="text-center font-semibold text-brand-green-700 mt-6">
            You save over {formatZAR(100000)} on a typical sale.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container-page py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">
          Everything you need to sell — in one place
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-navy-900 mb-1">{f.title}</h3>
              <p className="text-sm text-navy-600/70">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="bg-navy-50 py-16 md:py-20">
        <div className="container-page">
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900 text-center mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-navy-600/70 text-center mb-10">No commission. No hidden fees.</p>
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
                <h3 className="font-bold text-navy-900">{pkg.name}</h3>
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
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-brand-green-700 font-semibold text-sm hover:underline">
              View Full Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="container-page py-16 md:py-20">
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6">
              <p className="text-navy-900 font-medium mb-3">&ldquo;{t.quote}&rdquo;</p>
              <p className="text-sm text-navy-600/70">{t.name}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* MARKETPLACE TEASER */}
      <section className="bg-navy-50 py-16 md:py-20">
        <div className="container-page text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-2">
            Need extra help? We&rsquo;ve got you covered
          </h2>
          <p className="text-navy-600/70 mb-8">Conveyancers · Bond originators · Photographers · Inspectors</p>
          <Button as={Link} to="/marketplace" variant="navy">Explore Services</Button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-brand-green-600 text-white py-16 md:py-20">
        <div className="container-page text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to sell smarter?</h2>
          <p className="mb-8 text-white/90">Join South Africans saving thousands in commission</p>
          <Button as={Link} to="/sell/start" variant="secondary" className="px-6 py-3 text-base">
            Start Selling Your Property
          </Button>
        </div>
      </section>
    </div>
  )
}
