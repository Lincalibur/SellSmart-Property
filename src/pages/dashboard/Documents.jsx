import DashboardLayout from '../../components/DashboardLayout'
import { Button, Card, Check, Tag } from '../../components/ui'
import { useAppDispatch, useAppState } from '../../context/AppContext'

const OWNER_LABEL = { buyer: 'Buyer', seller: 'Seller', shared: 'Both parties' }

export default function Documents() {
  const { documents } = useAppState()
  const dispatch = useAppDispatch()

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-navy-900 text-lg">Document Hub</h2>
        <p className="text-sm text-navy-600/70">
          {documents.filter((d) => d.status === 'uploaded').length}/{documents.length} uploaded
        </p>
      </div>

      <Card className="divide-y divide-navy-100">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-navy-900 text-sm">{doc.name}</p>
              <p className="text-xs text-navy-500">Provided by {OWNER_LABEL[doc.owner]}</p>
            </div>
            <div className="flex items-center gap-3">
              {doc.status === 'uploaded' ? (
                <Tag tone="green"><Check>Uploaded</Check></Tag>
              ) : (
                <Tag tone="amber">Pending</Tag>
              )}
              {doc.status !== 'uploaded' && (
                <Button variant="secondary" onClick={() => dispatch({ type: 'UPLOAD_DOCUMENT', id: doc.id })}>
                  Upload
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
      <p className="text-xs text-navy-400 mt-3">
        Uploads are simulated for this mockup — no files are actually stored.
      </p>
    </DashboardLayout>
  )
}
