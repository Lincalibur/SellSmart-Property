import DashboardLayout from '../../components/DashboardLayout'
import ProcessTracker from '../../components/ProcessTracker'
import { Button, Card } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { PROCESS_STAGES } from '../../data/seed'

export default function Tracker() {
  const { processStageIndex } = useAppState()
  const dispatch = useAppDispatch()
  const atEnd = processStageIndex >= PROCESS_STAGES.length - 1

  return (
    <DashboardLayout>
      <h2 className="font-bold text-navy-900 text-lg mb-1">Transaction Progress</h2>
      <p className="text-navy-600/70 text-sm mb-8">
        Current stage: <strong className="text-navy-900">{PROCESS_STAGES[processStageIndex]}</strong>
      </p>

      <Card className="p-6 mb-6">
        <ProcessTracker stageIndex={processStageIndex} />
      </Card>

      <Button variant="secondary" disabled={atEnd} onClick={() => dispatch({ type: 'ADVANCE_STAGE' })}>
        {atEnd ? 'Registration Complete' : 'Advance to Next Stage (demo)'}
      </Button>
      <p className="text-xs text-navy-400 mt-2">
        In the real product, most stages advance automatically as offers are signed, documents are
        uploaded, and the conveyancer confirms progress.
      </p>
    </DashboardLayout>
  )
}
