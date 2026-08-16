import DashboardLayout from '../../components/DashboardLayout'
import { Card } from '../../components/ui'
import { useAppState } from '../../context/AppContext'

export default function Enquiries() {
  const { enquiries } = useAppState()

  return (
    <DashboardLayout>
      <h2 className="font-bold text-navy-900 text-lg mb-4">Enquiries Inbox</h2>
      {enquiries.length === 0 ? (
        <Card className="p-8 text-center text-navy-500 text-sm">
          No enquiries yet. When a buyer contacts you about your listing, it&rsquo;ll show up here.
        </Card>
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-navy-900">{e.name}</p>
                <span className="text-xs text-navy-400">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-navy-600/70 mb-2">{e.email} · {e.phone || 'No phone provided'}</p>
              <p className="text-sm text-navy-700">{e.message}</p>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
