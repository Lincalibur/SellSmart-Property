import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import RoleChooser from './components/RoleChooser'
import RequireRole from './components/RequireRole'
import { useAppState } from './context/AppContext'

import Home from './pages/Home'
import Profile from './pages/Profile'
import Browse from './pages/Browse'
import PropertyDetail from './pages/PropertyDetail'
import Pricing from './pages/Pricing'
import HowItWorks from './pages/HowItWorks'
import Marketplace from './pages/Marketplace'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import LegalPage from './pages/LegalPage'

import StartSelling from './pages/sell/StartSelling'
import AccountCreation from './pages/sell/AccountCreation'
import PackageSelection from './pages/sell/PackageSelection'
import QuickSetup from './pages/sell/QuickSetup'
import ListingWizard from './pages/sell/ListingWizard'
import ReviewListing from './pages/sell/ReviewListing'
import Payment from './pages/sell/Payment'
import Success from './pages/sell/Success'

import DashboardHome from './pages/dashboard/DashboardHome'
import Enquiries from './pages/dashboard/Enquiries'
import Viewings from './pages/dashboard/Viewings'
import Offers from './pages/dashboard/Offers'
import Documents from './pages/dashboard/Documents'
import Conveyancer from './pages/dashboard/Conveyancer'
import Tracker from './pages/dashboard/Tracker'

import BuyStart from './pages/buyer/BuyStart'
import OTPBuilder from './pages/buyer/OTPBuilder'
import Signing from './pages/buyer/Signing'
import BuyerDashboard from './pages/buyer/BuyerDashboard'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { roleChosen } = useAppState()

  if (!roleChosen) {
    return <RoleChooser />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route
            path="/property/:id/offer"
            element={
              <RequireRole role="buyer">
                <OTPBuilder />
              </RequireRole>
            }
          />
          <Route
            path="/property/:id/sign"
            element={
              <RequireRole role="buyer">
                <Signing />
              </RequireRole>
            }
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/legal/:page" element={<LegalPage />} />

          <Route path="/sell/start" element={<RequireRole role="seller"><StartSelling /></RequireRole>} />
          <Route path="/sell/account" element={<RequireRole role="seller"><AccountCreation /></RequireRole>} />
          <Route path="/sell/package" element={<RequireRole role="seller"><PackageSelection /></RequireRole>} />
          <Route path="/sell/quick-setup" element={<RequireRole role="seller"><QuickSetup /></RequireRole>} />
          <Route path="/sell/listing" element={<RequireRole role="seller"><ListingWizard /></RequireRole>} />
          <Route path="/sell/review" element={<RequireRole role="seller"><ReviewListing /></RequireRole>} />
          <Route path="/sell/payment" element={<RequireRole role="seller"><Payment /></RequireRole>} />
          <Route path="/sell/success" element={<RequireRole role="seller"><Success /></RequireRole>} />

          <Route path="/dashboard" element={<RequireRole role="seller"><DashboardHome /></RequireRole>} />
          <Route path="/dashboard/enquiries" element={<RequireRole role="seller"><Enquiries /></RequireRole>} />
          <Route path="/dashboard/viewings" element={<RequireRole role="seller"><Viewings /></RequireRole>} />
          <Route path="/dashboard/offers" element={<RequireRole role="seller"><Offers /></RequireRole>} />
          <Route path="/dashboard/documents" element={<RequireRole role="seller"><Documents /></RequireRole>} />
          <Route path="/dashboard/conveyancer" element={<RequireRole role="seller"><Conveyancer /></RequireRole>} />
          <Route path="/dashboard/tracker" element={<RequireRole role="seller"><Tracker /></RequireRole>} />

          <Route path="/buy/start" element={<RequireRole role="buyer"><BuyStart /></RequireRole>} />
          <Route path="/buyer/dashboard" element={<RequireRole role="buyer"><BuyerDashboard /></RequireRole>} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
