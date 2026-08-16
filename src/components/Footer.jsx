import { Link } from 'react-router-dom'
import { HouseIcon } from './icons'

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-navy-100 mt-24">
      <div className="container-page py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <HouseIcon className="w-5 h-5 text-brand-green-500" />
            SellSmart Property
          </div>
          <p className="text-sm text-navy-100/70">
            Sell your property privately — and save thousands in commission.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-navy-100/70">
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/how-it-works" className="hover:text-white">How It Works</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-navy-100/70">
            <li><Link to="/browse" className="hover:text-white">Browse Properties</Link></li>
            <li><Link to="/marketplace" className="hover:text-white">Marketplace</Link></li>
            <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-navy-100/70">
            <li><Link to="/legal/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link to="/legal/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/legal/disclaimer" className="hover:text-white">Disclaimer</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-100/50">
        This is a clickable product mockup for internal review — no real payments, signatures, or documents are processed.
      </div>
    </footer>
  )
}
