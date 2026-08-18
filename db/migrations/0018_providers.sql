-- Epic #11: Marketplace service provider directory (MVP-SPEC.md #6
-- "Marketplace Page"), replacing src/data/seed.js's static PROVIDERS list.
CREATE TABLE providers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN (
                'Conveyancers', 'Bond Originators', 'Valuators', 'Contractors',
                'Photographers', 'Inspectors', 'Moving Companies'
              )),
  location    text NOT NULL,
  blurb       text NOT NULL DEFAULT '',
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX providers_category_idx ON providers (category);

-- Same catalog as seed.js's PROVIDERS, so the directory has real content
-- to show from day one instead of an empty table. Email addresses use the
-- .example TLD (reserved for documentation/testing, RFC 2606) -- these are
-- mockup businesses, not real companies, and must never actually be
-- emailable until real providers are onboarded (issue #12's admin panel).
INSERT INTO providers (name, category, location, blurb, email) VALUES
  ('Cape Attorneys Inc.', 'Conveyancers', 'Cape Town', 'Specialist residential conveyancing with 20+ years experience.', 'contact@capeattorneys.example'),
  ('Sandton Legal Transfers', 'Conveyancers', 'Johannesburg', 'Fast-turnaround transfer attorneys for the greater Gauteng area.', 'contact@sandtonlegal.example'),
  ('BondLink Originators', 'Bond Originators', 'Nationwide', 'Compares offers across all major SA banks at no cost to you.', 'contact@bondlink.example'),
  ('HomeFinance Direct', 'Bond Originators', 'Nationwide', 'Pre-qualification in minutes, dedicated bond consultant.', 'contact@homefinancedirect.example'),
  ('Coastal Valuations', 'Valuators', 'Durban', 'Registered property valuators for bank and private sale purposes.', 'contact@coastalvaluations.example'),
  ('FixIt Property Services', 'Contractors', 'Pretoria', 'General maintenance, COC repairs, and pre-sale touch-ups.', 'contact@fixitproperty.example'),
  ('Lens & Light Studio', 'Photographers', 'Cape Town', 'Professional property photography and drone shots.', 'contact@lensandlight.example'),
  ('ClearView Inspections', 'Inspectors', 'Johannesburg', 'Full pre-sale condition reports and beetle certificates.', 'contact@clearviewinspections.example'),
  ('SwiftMove Relocations', 'Moving Companies', 'Nationwide', 'Door-to-door moving with insured handling.', 'contact@swiftmove.example');
