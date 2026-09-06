import { useNavigate } from 'react-router-dom'
import { HouseIcon } from './icons'
import { useAppDispatch } from '../context/AppContext'

const START_PATH = { buyer: '/buy/start', seller: '/sell/start' }

export default function RoleChooser() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  function choose(role) {
    dispatch({ type: 'SET_ROLE', role })
    navigate(START_PATH[role])
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center gap-2 px-6 py-5 text-navy-900 font-bold">
        <HouseIcon className="w-5 h-5 text-brand-green-600" />
        SellSmart Property
      </div>

      <div className="flex-1 grid md:grid-cols-2">
        <button
          type="button"
          onClick={() => choose('buyer')}
          className="group relative flex flex-col justify-end p-10 md:p-14 text-left text-white overflow-hidden min-h-[280px] bg-navy-950 bg-cover bg-center transition-transform duration-300"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(8,24,44,0.55) 0%, rgba(8,24,44,0.9) 100%), url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=70')",
          }}
        >
          <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors" />
          <span className="relative text-xs font-semibold tracking-[0.2em] uppercase text-navy-100/70 mb-4">
            For buyers
          </span>
          <h1 className="relative text-3xl md:text-4xl font-bold mb-3">Find a property</h1>
          <p className="relative text-navy-100/85 text-sm max-w-xs mb-6">
            Browse listings, contact sellers directly, and make an offer without an agent in the way.
          </p>
          <span className="relative inline-flex items-center gap-2 text-sm font-semibold border-b border-white/40 group-hover:border-white w-fit pb-0.5">
            Continue as a buyer
          </span>
        </button>

        <button
          type="button"
          onClick={() => choose('seller')}
          className="group relative flex flex-col justify-end p-10 md:p-14 text-left text-white overflow-hidden min-h-[280px] bg-brand-green-700 bg-cover bg-center transition-transform duration-300"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(20,122,61,0.5) 0%, rgba(13,39,67,0.92) 100%), url('https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&auto=format&fit=crop&q=70')",
          }}
        >
          <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/20 transition-colors" />
          <span className="relative text-xs font-semibold tracking-[0.2em] uppercase text-brand-green-100/80 mb-4">
            For sellers
          </span>
          <h1 className="relative text-3xl md:text-4xl font-bold mb-3">Sell a property</h1>
          <p className="relative text-brand-green-50/90 text-sm max-w-xs mb-6">
            List your home, manage enquiries and offers, and close the sale — without the commission.
          </p>
          <span className="relative inline-flex items-center gap-2 text-sm font-semibold border-b border-white/40 group-hover:border-white w-fit pb-0.5">
            Continue as a seller
          </span>
        </button>
      </div>

      <p className="text-center text-xs text-navy-500 py-4">
        You can switch between buying and selling anytime from your profile.
      </p>
    </div>
  )
}
