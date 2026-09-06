import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Button, Card, Check, Tag } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { PROVIDERS } from '../../data/seed'

export default function Conveyancer() {
  const { selectedConveyancerId, processStageIndex } = useAppState()
  const dispatch = useAppDispatch()
  const [sent, setSent] = useState(false)
  const conveyancers = PROVIDERS.filter((p) => p.category === 'Conveyancers')

  function sendDocuments() {
    dispatch({ type: 'SEND_TO_CONVEYANCER' })
    setSent(true)
  }

  return (
    <DashboardLayout>
      <h2 className="font-bold text-navy-900 text-lg mb-1">Conveyancer Handoff</h2>
      <p className="text-navy-600/70 text-sm mb-6">
        Select a conveyancer to receive the OTP, buyer &amp; seller details, and all uploaded documents.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {conveyancers.map((c) => (
          <Card
            key={c.id}
            className={`p-4 cursor-pointer transition-shadow ${
              selectedConveyancerId === c.id ? 'ring-2 ring-brand-green-600' : ''
            }`}
            onClick={() => dispatch({ type: 'SELECT_CONVEYANCER', providerId: c.id })}
          >
            <h3 className="font-semibold text-navy-900">{c.name}</h3>
            <p className="text-xs text-navy-500 mb-2">{c.location}</p>
            <p className="text-sm text-navy-700">{c.blurb}</p>
          </Card>
        ))}
      </div>

      <Button disabled={!selectedConveyancerId || processStageIndex >= 5} onClick={sendDocuments}>
        Send Documents
      </Button>

      {(sent || processStageIndex >= 5) && (
        <div className="mt-4 flex items-center gap-2">
          <Tag tone="green"><Check>Sent</Check></Tag>
          <p className="text-sm text-navy-700">
            OTP, buyer/seller details, and documents sent to{' '}
            {conveyancers.find((c) => c.id === selectedConveyancerId)?.name ?? 'your conveyancer'}.
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}
