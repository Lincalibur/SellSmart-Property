import { useParams } from 'react-router-dom'

const CONTENT = {
  terms: {
    title: 'Terms & Conditions',
    body: 'Placeholder terms of use for the SellSmart Property platform. Final copy to be drafted with legal counsel before launch.',
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'Placeholder privacy policy. The production platform will detail POPIA-compliant data handling, retention, and security practices for all personal information collected.',
  },
  disclaimer: {
    title: 'Disclaimer',
    body: 'Placeholder disclaimer. SellSmart Property facilitates private property transactions but does not replace independent legal advice from a conveyancing attorney.',
  },
}

export default function LegalPage() {
  const { page } = useParams()
  const content = CONTENT[page] ?? CONTENT.terms

  return (
    <div className="container-page py-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-navy-900 mb-4">{content.title}</h1>
      <p className="text-navy-700 leading-relaxed">{content.body}</p>
      <p className="text-xs text-navy-400 mt-8">
        This is placeholder content for the purposes of this mockup only.
      </p>
    </div>
  )
}
