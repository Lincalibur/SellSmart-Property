import { Card, Button, Tag } from './ui'

export default function ProviderCard({ provider, onContact }) {
  return (
    <Card className="p-5 flex flex-col h-full">
      <Tag tone="navy">{provider.category}</Tag>
      <h3 className="font-semibold text-navy-900 mt-3">{provider.name}</h3>
      <p className="text-xs text-navy-600/70 mb-2">{provider.location}</p>
      <p className="text-sm text-navy-700 flex-1">{provider.blurb}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full"
        onClick={() => onContact?.(provider)}
      >
        Contact Provider
      </Button>
    </Card>
  )
}
