import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { HouseIcon } from './icons'
import { useAppState } from '../context/AppContext'

const navLink = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-brand-green-600' : 'text-navy-800 hover:text-brand-green-600'
  }`

export default function Navbar() {
  const { role } = useAppState()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const isSeller = role === 'seller'
  const dashboardPath = isSeller ? '/dashboard' : '/buyer/dashboard'
  const dashboardLabel = isSeller ? 'Dashboard' : 'My Activity'

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-navy-100">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 text-navy-900 font-bold text-lg shrink-0">
          <HouseIcon className="w-6 h-6 text-brand-green-600" />
          SellSmart Property
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <NavLink to="/browse" className={navLink}>Browse Properties</NavLink>
          <NavLink to="/marketplace" className={navLink}>Marketplace</NavLink>
          <NavLink to="/pricing" className={navLink}>Pricing</NavLink>
          <NavLink to="/how-it-works" className={navLink}>How It Works</NavLink>
          <NavLink to={dashboardPath} className={navLink}>{dashboardLabel}</NavLink>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <NavLink to="/profile" className={navLink}>
            Profile
          </NavLink>
          <Link to="/login" className="text-sm font-medium text-navy-800 hover:text-brand-green-600">
            Login
          </Link>
          {isSeller ? (
            <button
              type="button"
              onClick={() => navigate('/sell/start')}
              className="bg-brand-green-600 hover:bg-brand-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start Selling
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="bg-brand-green-600 hover:bg-brand-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Browse Properties
            </button>
          )}
        </div>

        <button
          type="button"
          className="lg:hidden text-navy-900"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-navy-100 bg-white px-4 py-4 space-y-3">
          <NavLink onClick={() => setOpen(false)} to="/browse" className="block text-navy-800 font-medium">Browse Properties</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/marketplace" className="block text-navy-800 font-medium">Marketplace</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/pricing" className="block text-navy-800 font-medium">Pricing</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/how-it-works" className="block text-navy-800 font-medium">How It Works</NavLink>
          <NavLink onClick={() => setOpen(false)} to={dashboardPath} className="block text-navy-800 font-medium">{dashboardLabel}</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/profile" className="block text-navy-800 font-medium">Profile</NavLink>
          <NavLink onClick={() => setOpen(false)} to="/login" className="block text-navy-800 font-medium">Login</NavLink>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate(isSeller ? '/sell/start' : '/browse')
            }}
            className="w-full bg-brand-green-600 text-white font-semibold px-4 py-2.5 rounded-lg"
          >
            {isSeller ? 'Start Selling' : 'Browse Properties'}
          </button>
        </div>
      )}
    </header>
  )
}
