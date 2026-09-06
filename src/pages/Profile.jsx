import { useNavigate } from 'react-router-dom'
import { Button, Card, Tag } from '../components/ui'
import { useAppDispatch, useAppState } from '../context/AppContext'

const HOME_PATH = { seller: '/dashboard', buyer: '/buyer/dashboard' }

export default function Profile() {
  const { role, account } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  function switchTo(nextRole) {
    if (nextRole === role) return
    dispatch({ type: 'SET_ROLE', role: nextRole })
    navigate(HOME_PATH[nextRole])
  }

  return (
    <div className="container-page py-16 max-w-lg mx-auto">
      <Card className="p-8">
        <h1 className="text-xl font-bold text-navy-900 mb-1">Profile</h1>
        <p className="text-navy-600/70 text-sm mb-6">
          {account?.name ?? account?.email ?? 'Manage how you use SellSmart Property.'}
        </p>

        <p className="text-sm font-medium text-navy-800 mb-2">Current mode</p>
        <Tag tone="green">{role === 'seller' ? 'Selling' : 'Buying'}</Tag>

        <p className="text-sm font-medium text-navy-800 mt-6 mb-3">Switch mode</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => switchTo('buyer')}
            className={`text-left rounded-xl border p-4 transition-colors ${
              role === 'buyer' ? 'border-brand-green-600 bg-brand-green-50/40' : 'border-navy-200 hover:bg-navy-50'
            }`}
          >
            <p className="font-semibold text-navy-900">Buyer</p>
            <p className="text-xs text-navy-600/70 mt-1">Browse, offer, and track a purchase.</p>
          </button>
          <button
            type="button"
            onClick={() => switchTo('seller')}
            className={`text-left rounded-xl border p-4 transition-colors ${
              role === 'seller' ? 'border-brand-green-600 bg-brand-green-50/40' : 'border-navy-200 hover:bg-navy-50'
            }`}
          >
            <p className="font-semibold text-navy-900">Seller</p>
            <p className="text-xs text-navy-600/70 mt-1">List a property and manage the sale.</p>
          </button>
        </div>

        <Button variant="secondary" className="w-full mt-8" onClick={() => navigate(HOME_PATH[role])}>
          Back to my dashboard
        </Button>
      </Card>
    </div>
  )
}
