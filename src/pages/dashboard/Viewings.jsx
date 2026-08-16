import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { Button, Card, Field, Tag, inputClass } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'

export default function Viewings() {
  const { viewings } = useAppState()
  const dispatch = useAppDispatch()
  const [rescheduling, setRescheduling] = useState(null)

  function accept(id) {
    dispatch({ type: 'UPDATE_VIEWING_STATUS', id, status: 'accepted' })
  }

  function submitReschedule(e, id) {
    e.preventDefault()
    const form = new FormData(e.target)
    dispatch({
      type: 'UPDATE_VIEWING_STATUS',
      id,
      status: 'rescheduled',
      proposedDate: form.get('date'),
      proposedTime: form.get('time'),
    })
    setRescheduling(null)
  }

  return (
    <DashboardLayout>
      <h2 className="font-bold text-navy-900 text-lg mb-4">Viewing Requests</h2>
      {viewings.length === 0 ? (
        <Card className="p-8 text-center text-navy-500 text-sm">
          No viewing requests yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {viewings.map((v) => (
            <Card key={v.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-navy-900">{v.name}</p>
                <Tag tone={v.status === 'pending' ? 'amber' : v.status === 'accepted' ? 'green' : 'navy'}>
                  {v.status}
                </Tag>
              </div>
              <p className="text-sm text-navy-700 mb-3">
                Requested: {v.date} at {v.time}
                {v.status === 'rescheduled' && (
                  <span className="block text-navy-500">Proposed instead: {v.proposedDate} at {v.proposedTime}</span>
                )}
              </p>
              {v.status === 'pending' && (
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => accept(v.id)}>Accept</Button>
                  <Button variant="secondary" onClick={() => setRescheduling(rescheduling === v.id ? null : v.id)}>
                    Suggest New Time
                  </Button>
                </div>
              )}
              {rescheduling === v.id && (
                <form onSubmit={(e) => submitReschedule(e, v.id)} className="grid sm:grid-cols-3 gap-2 mt-3">
                  <Field label="New date"><input required type="date" name="date" className={inputClass} /></Field>
                  <Field label="New time"><input required type="time" name="time" className={inputClass} /></Field>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">Send</Button>
                  </div>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
