import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ListingCard from './ListingCard'

const listing = {
  id: 'l42',
  title: 'Seaside Cottage',
  location: 'Camps Bay, Cape Town',
  price: 3200000,
  beds: 3,
  baths: 2,
  parking: 1,
  size: 180,
  images: ['/cottage.jpg'],
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ListingCard listing={listing} />
    </MemoryRouter>,
  )
}

describe('ListingCard', () => {
  it('shows the listing title, location and formatted price', () => {
    renderCard()
    expect(screen.getByText('Seaside Cottage')).toBeInTheDocument()
    expect(screen.getByText('Camps Bay, Cape Town')).toBeInTheDocument()
    expect(screen.getByText(/3[\s,.]?200[\s,.]?000/)).toBeInTheDocument()
  })

  it('links to the property detail page for this listing', () => {
    renderCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/property/l42')
  })

  it('shows the beds/baths/parking/size summary', () => {
    renderCard()
    expect(screen.getByText('3 Beds')).toBeInTheDocument()
    expect(screen.getByText('2 Baths')).toBeInTheDocument()
    expect(screen.getByText('1 Parking')).toBeInTheDocument()
    expect(screen.getByText('180 m²')).toBeInTheDocument()
  })
})
