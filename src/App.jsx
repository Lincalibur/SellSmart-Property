import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'

import Home from './pages/Home'
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
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/property/:id/offer" element={<OTPBuilder />} />
          <Route path="/property/:id/sign" element={<Signing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal/:page" element={<LegalPage />} />

          <Route path="/sell/start" element={<StartSelling />} />
          <Route path="/sell/account" element={<AccountCreation />} />
          <Route path="/sell/package" element={<PackageSelection />} />
          <Route path="/sell/quick-setup" element={<QuickSetup />} />
          <Route path="/sell/listing" element={<ListingWizard />} />
          <Route path="/sell/review" element={<ReviewListing />} />
          <Route path="/sell/payment" element={<Payment />} />
          <Route path="/sell/success" element={<Success />} />

          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/enquiries" element={<Enquiries />} />
          <Route path="/dashboard/viewings" element={<Viewings />} />
          <Route path="/dashboard/offers" element={<Offers />} />
          <Route path="/dashboard/documents" element={<Documents />} />
          <Route path="/dashboard/conveyancer" element={<Conveyancer />} />
          <Route path="/dashboard/tracker" element={<Tracker />} />

          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
