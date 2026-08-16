import { Link } from 'react-router-dom'
import { Card, formatZAR } from './ui'

export default function ListingCard({ listing }) {
  return (
    <Link to={`/property/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="aspect-[4/3] overflow-hidden bg-navy-50">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <p className="text-lg font-bold text-navy-900">{formatZAR(listing.price)}</p>
          <h3 className="font-semibold text-navy-900 truncate">{listing.title}</h3>
          <p className="text-sm text-navy-600/70 mb-3">{listing.location}</p>
          <div className="flex items-center gap-3 text-xs text-navy-700 font-medium">
            <span>{listing.beds} Beds</span>
            <span>·</span>
            <span>{listing.baths} Baths</span>
            <span>·</span>
            <span>{listing.parking} Parking</span>
            <span>·</span>
            <span>{listing.size} m²</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
