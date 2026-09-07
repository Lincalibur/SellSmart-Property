import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppProvider } from '../context/AppContext'
import RequireRole from './RequireRole'

const STORAGE_KEY = 'sellsmart-mock-state-v1'

function renderAsRole(role) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, roleChosen: true }))
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppProvider>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <RequireRole role="seller">
                <p>Seller dashboard</p>
              </RequireRole>
            }
          />
          <Route path="/" element={<p>Role chooser</p>} />
          <Route path="/buyer/dashboard" element={<p>Buyer dashboard</p>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('RequireRole', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('renders the protected content when the current role matches', () => {
    renderAsRole('seller')
    expect(screen.getByText('Seller dashboard')).toBeInTheDocument()
  })

  it('redirects a mismatched role to its own home instead of the requested route', () => {
    renderAsRole('buyer')
    expect(screen.getByText('Buyer dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Seller dashboard')).not.toBeInTheDocument()
  })

  it('redirects to the role chooser when no role has been picked yet', () => {
    renderAsRole(null)
    expect(screen.getByText('Role chooser')).toBeInTheDocument()
  })
})
