export const PROCESS_STAGES = [
  'Listing Active',
  'Offer Submitted',
  'Offer Accepted',
  'Bond Application',
  'Documents Submitted',
  'Conveyancer Assigned',
  'Registration',
]

export const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    price: 699,
    tagline: 'Perfect for confident sellers',
    features: ['Property listing', 'Buyer enquiries', 'Basic dashboard'],
  },
  {
    id: 'smart',
    name: 'Smart',
    price: 1499,
    popular: true,
    tagline: 'Best balance of value and support',
    features: [
      'Featured listing',
      'Document toolkit',
      'Viewing scheduler',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2999,
    tagline: 'Maximum support and confidence',
    features: [
      'Pricing guidance',
      'Listing optimisation',
      'Priority support',
      'Negotiation assistance',
    ],
  },
]

export const PROPERTY_TYPES = ['House', 'Apartment', 'Townhouse', 'Vacant Land']

export const PROVIDER_CATEGORIES = [
  'Conveyancers',
  'Bond Originators',
  'Valuators',
  'Contractors',
  'Photographers',
  'Inspectors',
  'Moving Companies',
]

export const PROVIDERS = [
  { id: 'p1', name: 'Cape Attorneys Inc.', category: 'Conveyancers', location: 'Cape Town', blurb: 'Specialist residential conveyancing with 20+ years experience.' },
  { id: 'p2', name: 'Sandton Legal Transfers', category: 'Conveyancers', location: 'Johannesburg', blurb: 'Fast-turnaround transfer attorneys for the greater Gauteng area.' },
  { id: 'p3', name: 'BondLink Originators', category: 'Bond Originators', location: 'Nationwide', blurb: 'Compares offers across all major SA banks at no cost to you.' },
  { id: 'p4', name: 'HomeFinance Direct', category: 'Bond Originators', location: 'Nationwide', blurb: 'Pre-qualification in minutes, dedicated bond consultant.' },
  { id: 'p5', name: 'Coastal Valuations', category: 'Valuators', location: 'Durban', blurb: 'Registered property valuators for bank and private sale purposes.' },
  { id: 'p6', name: 'FixIt Property Services', category: 'Contractors', location: 'Pretoria', blurb: 'General maintenance, COC repairs, and pre-sale touch-ups.' },
  { id: 'p7', name: 'Lens & Light Studio', category: 'Photographers', location: 'Cape Town', blurb: 'Professional property photography and drone shots.' },
  { id: 'p8', name: 'ClearView Inspections', category: 'Inspectors', location: 'Johannesburg', blurb: 'Full pre-sale condition reports and beetle certificates.' },
  { id: 'p9', name: 'SwiftMove Relocations', category: 'Moving Companies', location: 'Nationwide', blurb: 'Door-to-door moving with insured handling.' },
]

export const LISTINGS = [
  {
    id: 'l1',
    title: 'Modern Family Home in Cape Town',
    type: 'House',
    location: 'Constantia, Cape Town',
    price: 1950000,
    beds: 3,
    baths: 2,
    parking: 2,
    size: 200,
    extras: ['Pool', 'Garden', 'Alarm system'],
    description:
      'A bright, beautifully maintained family home in a quiet Constantia cul-de-sac. Open-plan living leads onto a covered patio and pool area — perfect for entertaining. Walking distance to top schools.',
    images: [
      '/images/listings/modern-family-home-pool.jpg',
      '/images/listings/modern-family-home-patio.jpg',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=600&fit=crop&auto=format&q=80',
    ],
    views: 120,
    seller: { name: 'John Adams', email: 'john@example.com', phone: '082 555 0101' },
  },
  {
    id: 'l2',
    title: 'Secure Apartment near Sandton CBD',
    type: 'Apartment',
    location: 'Sandton, Johannesburg',
    price: 1450000,
    beds: 2,
    baths: 2,
    parking: 1,
    size: 95,
    extras: ['24hr security', 'Gym', 'Balcony'],
    description:
      'Modern 2-bedroom apartment in a secure complex, minutes from Sandton CBD. Ideal for professionals or as a rental investment.',
    images: [
      'https://images.unsplash.com/photo-1523192193543-6e7296d960e4?w=900&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=600&fit=crop&auto=format&q=80',
    ],
    views: 84,
    seller: { name: 'Priya Naidoo', email: 'priya@example.com', phone: '083 555 0102' },
  },
  {
    id: 'l3',
    title: 'Coastal Townhouse with Sea Glimpses',
    type: 'Townhouse',
    location: 'Umhlanga, Durban',
    price: 2650000,
    beds: 4,
    baths: 3,
    parking: 2,
    size: 240,
    extras: ['Sea view', 'Solar power', 'Fibre ready'],
    description:
      'Spacious townhouse in a sought-after Umhlanga estate with sea glimpses from the upper deck. Recently renovated kitchen and bathrooms.',
    images: [
      '/images/listings/coastal-townhouse-view.jpg',
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&h=600&fit=crop&auto=format&q=80',
    ],
    views: 156,
    seller: { name: 'Michael Botha', email: 'michael@example.com', phone: '084 555 0103' },
  },
  {
    id: 'l4',
    title: 'Charming Starter Home in Pretoria East',
    type: 'House',
    location: 'Faerie Glen, Pretoria',
    price: 1150000,
    beds: 3,
    baths: 1,
    parking: 1,
    size: 140,
    extras: ['Garden', 'Braai area'],
    description:
      'A well-priced entry into Faerie Glen. Neat 3-bedroom home with a big garden, close to schools and shops. Perfect first home.',
    images: [
      '/images/listings/starter-home-pretoria.jpg',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900&h=600&fit=crop&auto=format&q=80',
    ],
    views: 63,
    seller: { name: 'Anele Khumalo', email: 'anele@example.com', phone: '072 555 0104' },
  },
]

export const DOCUMENT_CHECKLIST = [
  { id: 'd1', name: 'Certified ID / Passport', owner: 'buyer' },
  { id: 'd2', name: 'Proof of Residential Address', owner: 'buyer' },
  { id: 'd3', name: 'Offer to Purchase (signed)', owner: 'shared' },
  { id: 'd4', name: 'Proof of Funds / Bond Approval', owner: 'buyer' },
  { id: 'd5', name: 'Original Title Deed', owner: 'seller' },
  { id: 'd6', name: 'Property Condition Disclosure Form', owner: 'seller' },
  { id: 'd7', name: 'Electrical Certificate of Compliance', owner: 'seller' },
  { id: 'd8', name: 'Municipal Rates Clearance Certificate', owner: 'seller' },
]
