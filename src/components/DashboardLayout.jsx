import { NavLink } from 'react-router-dom'
import { useAppState, useMyListing } from '../context/AppContext'

const TABS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/enquiries', label: 'Enquiries' },
  { to: '/dashboard/viewings', label: 'Viewings' },
  { to: '/dashboard/offers', label: 'Offers' },
  { to: '/dashboard/documents', label: 'Documents' },
  { to: '/dashboard/conveyancer', label: 'Conveyancer' },
  { to: '/dashboard/tracker', label: 'Tracker' },
]

export default function DashboardLayout({ children }) {
  const { account, enquiries, viewings } = useAppState()
  const listing = useMyListing()
  const name = account?.name?.split(' ')[0] ?? 'Seller'

  return (
    <div className="bg-navy-50 min-h-[calc(100vh-4rem)]">
      <div className="bg-white border-b border-navy-100">
        <div className="container-page py-6">
          <p className="text-sm text-navy-600/70">Welcome back,</p>
          <h1 className="text-2xl font-bold text-navy-900">{name}</h1>
          {listing && <p className="text-sm text-navy-600/70 mt-1">Managing: {listing.title}</p>}
        </div>
        <div className="container-page overflow-x-auto">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-brand-green-600 text-brand-green-700'
                      : 'border-transparent text-navy-600 hover:text-navy-900'
                  }`
                }
              >
                {tab.label}
                {tab.to === '/dashboard/enquiries' && enquiries.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-green-600 text-white text-[10px]">
                    {enquiries.length}
                  </span>
                )}
                {tab.to === '/dashboard/viewings' && viewings.filter((v) => v.status === 'pending').length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-green-600 text-white text-[10px]">
                    {viewings.filter((v) => v.status === 'pending').length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="container-page py-8">{children}</div>
    </div>
  )
}
