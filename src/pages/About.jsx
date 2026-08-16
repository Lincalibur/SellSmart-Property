import { Card } from '../components/ui'

export default function About() {
  return (
    <div className="container-page py-16 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-4">About SellSmart Property</h1>
      <p className="text-navy-700 leading-relaxed mb-6">
        SellSmart Property was built for South African homeowners who want to sell privately — without
        losing the structure, guidance, and professionalism a traditional agent provides. We believe
        selling your own property shouldn&rsquo;t mean doing it alone.
      </p>
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-navy-900 mb-2">Our Mission</h2>
        <p className="text-navy-700 text-sm leading-relaxed">
          To give property owners full control of their sale, save them thousands in commission, and
          connect them with trusted professionals — conveyancers, bond originators, and more — exactly
          when they need them.
        </p>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold text-navy-900 mb-2">Why We Started</h2>
        <p className="text-navy-700 text-sm leading-relaxed">
          Backed by real experience in property management and administration, SellSmart Property exists
          to help sellers avoid unnecessary costs while still getting a guided, professional, and
          compliant transaction from listing to registration.
        </p>
      </Card>
    </div>
  )
}
