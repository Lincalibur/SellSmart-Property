import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../context/AppContext'
import Browse from './Browse'

vi.mock('../data/seed', () => ({
  PROCESS_STAGES: ['Listing Active'],
  DOCUMENT_CHECKLIST: [],
  PROPERTY_TYPES: ['House', 'Apartment', 'Townhouse', 'Vacant Land'],
  LISTINGS: [
    { id: 'a', title: 'Sandton Apartment', type: 'Apartment', location: 'Sandton, Johannesburg', price: 1450000, beds: 2, baths: 1, parking: 1, size: 85, images: ['/a.jpg'] },
    { id: 'b', title: 'Constantia House', type: 'House', location: 'Constantia, Cape Town', price: 1950000, beds: 4, baths: 3, parking: 2, size: 320, images: ['/b.jpg'] },
    { id: 'c', title: 'Cheap Constantia Land', type: 'Vacant Land', location: 'Constantia, Cape Town', price: 500000, beds: 0, baths: 0, parking: 0, size: 1000, images: ['/c.jpg'] },
  ],
}))

const STORAGE_KEY = 'sellsmart-mock-state-v1'

function renderBrowse() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Browse />
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('Browse', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('lists every listing by default', () => {
    renderBrowse()
    expect(screen.getByText('Sandton Apartment')).toBeInTheDocument()
    expect(screen.getByText('Constantia House')).toBeInTheDocument()
    expect(screen.getByText('Cheap Constantia Land')).toBeInTheDocument()
  })

  it('filters by location text, case-insensitively', async () => {
    renderBrowse()
    await userEvent.type(screen.getByPlaceholderText(/Location/i), 'sandton')
    expect(screen.getByText('Sandton Apartment')).toBeInTheDocument()
    expect(screen.queryByText('Constantia House')).not.toBeInTheDocument()
  })

  it('filters by property type', async () => {
    renderBrowse()
    await userEvent.selectOptions(screen.getByDisplayValue('All property types'), 'House')
    expect(screen.getByText('Constantia House')).toBeInTheDocument()
    expect(screen.queryByText('Sandton Apartment')).not.toBeInTheDocument()
    expect(screen.queryByText('Cheap Constantia Land')).not.toBeInTheDocument()
  })

  it('filters by max price', async () => {
    renderBrowse()
    await userEvent.type(screen.getByPlaceholderText(/Max price/i), '1000000')
    expect(screen.getByText('Cheap Constantia Land')).toBeInTheDocument()
    expect(screen.queryByText('Sandton Apartment')).not.toBeInTheDocument()
    expect(screen.queryByText('Constantia House')).not.toBeInTheDocument()
  })

  it('combines filters and shows an empty state when nothing matches', async () => {
    renderBrowse()
    await userEvent.type(screen.getByPlaceholderText(/Location/i), 'Constantia')
    await userEvent.selectOptions(screen.getByDisplayValue('All property types'), 'House')
    await userEvent.type(screen.getByPlaceholderText(/Max price/i), '1000000')
    expect(screen.getByText(/No properties match your filters yet/i)).toBeInTheDocument()
  })
})
