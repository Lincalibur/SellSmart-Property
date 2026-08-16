import { useState } from 'react'
import ProviderCard from '../components/ProviderCard'
import Modal from '../components/Modal'
import { Button, inputClass } from '../components/ui'
import { PROVIDERS, PROVIDER_CATEGORIES } from '../data/seed'

export default function Marketplace() {
  const [category, setCategory] = useState('')
  const [contacted, setContacted] = useState(null)

  const filtered = category ? PROVIDERS.filter((p) => p.category === category) : PROVIDERS

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-1">Service Provider Marketplace</h1>
      <p className="text-navy-600/70 mb-8">
        Trusted professionals to support your sale — conveyancers, bond originators, and more.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
            category === '' ? 'bg-navy-900 text-white border-navy-900' : 'border-navy-200 text-navy-700'
          }`}
        >
          All
        </button>
        {PROVIDER_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              category === c ? 'bg-navy-900 text-white border-navy-900' : 'border-navy-200 text-navy-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <ProviderCard key={p.id} provider={p} onContact={setContacted} />
        ))}
      </div>

      <Modal open={!!contacted} onClose={() => setContacted(null)} title="Contact Sent">
        <div className={inputClass + ' bg-navy-50 border-none'}>
          Your details have been shared with <strong>{contacted?.name}</strong>. They&rsquo;ll be in touch shortly.
        </div>
        <Button className="w-full mt-4" onClick={() => setContacted(null)}>Close</Button>
      </Modal>
    </div>
  )
}
