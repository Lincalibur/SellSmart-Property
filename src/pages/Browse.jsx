import { useMemo, useState } from 'react'
import ListingCard from '../components/ListingCard'
import { inputClass } from '../components/ui'
import { useAppState } from '../context/AppContext'
import { PROPERTY_TYPES } from '../data/seed'

export default function Browse() {
  const { listings } = useAppState()
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (location && !l.location.toLowerCase().includes(location.toLowerCase())) return false
      if (type && l.type !== type) return false
      if (maxPrice && l.price > Number(maxPrice)) return false
      return true
    })
  }, [listings, location, type, maxPrice])

  return (
    <div className="container-page py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-1">Browse Properties</h1>
      <p className="text-navy-600/70 mb-8">Enquiries go directly to the seller — no middleman.</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <input
          className={inputClass}
          placeholder="Location (e.g. Cape Town)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All property types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          className={inputClass}
          type="number"
          placeholder="Max price (R)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-navy-600/70">No properties match your filters yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
