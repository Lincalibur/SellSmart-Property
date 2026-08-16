# SellSmart Property — MVP Specification (for Client Mockup)

> Synthesized from: 6 Pager, Developer Brief, Developer Presentation, Homepage Wireframe, Website Structure, Website Screen Designs, Signing of OTP, Legal Document Requirements, and Website Images reference.
>
> Purpose of this doc: define a **coherent, buildable MVP** and a **screen/flow inventory** so a clickable mockup can be built to walk the client through how the site works. This is a prototype spec — no real payments, e-signatures, or backend integrations are required at this stage; they are *simulated* (see "Mocked vs Real" section).

---

## 1. Product Summary

**SellSmart Property** is a digital platform that lets South African property owners **sell privately, without an estate agent**, while still getting a guided, professional, end-to-end transaction experience — from listing to legal transfer.

It is **not a listings portal**. It is positioned as a **property transaction ecosystem**: listing, buyer communication, offers, e-signed Offer to Purchase (OTP), document management, and handoff to conveyancers/bond originators — all in one place.

**Core promise to sellers:** *"Sell your property privately — and save thousands in commission."*

**The 3 emotions the product must hit (from strategy notes):**
- 💸 Saving money (no 5–7.5% agent commission)
- 🧠 Feeling in control (full visibility, no middleman)
- 🤝 Not being alone (guided, step-by-step, expert help available)

---

## 2. User Roles

| Role | Summary |
|---|---|
| **Seller** | Creates/manages listings, receives enquiries, accepts/rejects/counters offers, uploads documents, selects a conveyancer. |
| **Buyer** | Browses/filters listings, sends enquiries, requests viewings, builds & submits an OTP, uploads documents (FICA), applies for a bond. |
| **Service Provider** | Conveyancers, bond originators, valuators, contractors, photographers, inspectors, moving companies. Have a marketplace profile; contactable by users. |
| **Admin** | Manages users, listings, payments, marketplace providers, and documents (back-office only — not part of the client-facing mockup). |

For the mockup: build **Seller** and **Buyer** experiences in full; **Service Provider** and **Admin** as light/optional screens (see §6).

---

## 3. MVP Feature Scope

### ✅ In scope (MVP)
1. **Property Listings** — create, edit, publish, photos, description, price, key details.
2. **Buyer Search & Browse** — filter by location, price, property type.
3. **Enquiry System** — buyer sends enquiry directly to seller (email + dashboard).
4. **Viewing Requests** — buyer requests, seller accepts/reschedules (kept simple).
5. **OTP (Offer to Purchase) Builder** — guided questionnaire (not raw document upload) that auto-generates a structured OTP: purchase price, deposit, occupation date, occupational rent, suspensive conditions, bond amount, fixtures, special conditions.
6. **E-Signature (via 3rd-party integration, not custom-built)** — buyer & seller sign OTP; signed copy stored automatically. *(See §8 — legal recommendation is to integrate an established e-signature provider, not build a "type your name" signer.)*
7. **Offer Management** — seller accepts / rejects / counters; status + version history tracked.
8. **Document Management** — secure upload/storage of ID, proof of address, FICA docs, bond docs; role-based access.
9. **Process Tracker** — visual stage tracker: Listing Active → Offer Submitted → Offer Accepted → Bond Application → Documents Submitted → Conveyancer Assigned → Registration.
10. **Service Provider Marketplace** — directory by category, profile view, contact button.
11. **Conveyancer Handoff** — seller selects a conveyancer; system sends OTP + documents + buyer/seller details (email automation is fine for MVP).
12. **Payments** — once-off listing package fee (Starter / Smart / Pro), no ongoing commission.

### ❌ Explicitly out of scope (future phases)
- Native mobile app
- AI-based pricing tools
- Advanced workflow automation
- Built-in real-time chat/messaging (email notifications only for MVP)
- Conveyancer-side status integration (their updates are manual/email-driven for now)

---

## 4. User Flows

### Seller Flow (primary revenue driver)
```
Landing Page → "Start Selling" → Account Creation → Package Selection
→ Quick Property Setup (light) → Full Listing Creation (details, price, description, photos)
→ Review Listing → Payment → Success → Seller Dashboard
→ Receive Enquiries → Accept Viewing → Receive Offer → Accept/Counter Offer
→ Sign OTP → Upload Documents → Select Conveyancer → Track Registration
```

### Buyer Flow (traffic + enquiries)
```
Homepage → Browse Properties → Filter → Property Detail Page
→ Send Enquiry OR Request Viewing → Build OTP (guided questionnaire)
→ Sign OTP → Upload Documents (FICA) → Apply for Bond (via marketplace)
→ Track Transaction Progress
```

**Golden path for the mockup demo:** Seller lists a property → Buyer enquires → Buyer requests viewing → Buyer submits OTP → Seller counters → Buyer accepts revised terms → both sign → documents uploaded → conveyancer selected → process tracker shows progress to "Registration."

---

## 5. Non-Negotiable UX Rules

From the design docs, these apply to every screen/flow in the mockup:

- **Step-by-step, never a long single-page form.** Progress bar on every multi-step flow ("Step 2 of 5").
- **Show pricing early** — don't hide it until the end of onboarding.
- **Light first, expand gradually** — quick property setup (4 fields) before the full listing form.
- **Guidance everywhere** — tooltips, tips, reassurance microcopy (e.g. *"We'll never share your details"*, *"You're in control at all times"*).
- **Mobile-first** layout for every screen.
- **No legal jargon upfront.**
- **Repeated CTAs** — every section should offer a path back into "Start Selling."

**Reusable microcopy bank:**
- "No commission — ever."
- "You're in control."
- "Simple, guided process."
- "Built for South African property sellers."
- "Expert help available when you need it."

---

## 6. Screen Inventory (build list for the mockup)

Use this as the literal page list for the prototype.

### Public / Marketing
1. **Homepage** — hero, trust bar, "How It Works" (4 steps), agent-vs-SellSmart comparison table, features grid, pricing preview, social proof, marketplace teaser, final CTA, footer.
2. **Browse Properties** — search + filters (location, price, type), listing cards grid.
3. **Property Detail Page (Buyer view)** — image gallery, price, details (beds/baths/parking/size), description, "Contact Seller" panel (Send Enquiry / Request Viewing).
4. **Pricing Page** — Starter / Smart⭐ / Pro package comparison.
5. **How It Works Page** (optional if homepage section suffices)
6. **About Page** — founder story/trust builder.
7. **Marketplace Page** — service provider directory by category, provider profile cards.

### Seller Onboarding
8. **Start Selling — Entry** ("Let's get your property listed")
9. **Account Creation** (Name, Email, Phone, Password)
10. **Package Selection** (Starter / Smart⭐ / Pro)
11. **Quick Property Setup** (type, location, bedrooms, bathrooms only)
12. **Full Listing Creation** — multi-step:
    - Step 1: Basic details
    - Step 2: Property details (size, parking, extras)
    - Step 3: Price (+ "Need help pricing?" prompt)
    - Step 4: Description (+ future "Generate description")
    - Step 5: Photos (drag & drop)
13. **Review Listing** (preview before payment)
14. **Payment Screen** (package + price, Card / PayFast / EFT / PayPal)
15. **Success Screen** ("Your property is now live!")

### Seller Dashboard (core product)
16. **Dashboard Home** — listing status card (views/enquiries), enquiries panel, offers panel, process tracker, quick actions.
17. **Enquiries Inbox** (list + detail)
18. **Viewing Requests** (accept / suggest new time)
19. **Offer Management** — offer detail, Accept / Counter / Reject, counter-offer sub-form.
20. **Document Hub** — upload/view documents, status per document (uploaded/pending).
21. **Conveyancer Handoff** — select provider from marketplace, "Send Documents" action.
22. **Process Tracker** (standalone/detail view — also embedded in dashboard).

### Buyer Experience
23. **Send Enquiry** modal/form (Name, Email, Phone, Message).
24. **Request Viewing** modal/form (preferred date/time).
25. **OTP Builder** — guided multi-step questionnaire (buyer details → offer details → conditions → review → submit).
26. **Signing Screen** — "opens" e-signature step, returns to "OTP Signed ✔" state (simulated in mockup).
27. **Buyer Dashboard** *(marked future phase in source docs — build only if time allows)*: saved properties, submitted offers, document uploads, bond status, process tracker.

### Shared
28. **Login / Sign Up**
29. **Legal pages** — Terms, Privacy Policy, Disclaimer (stub content acceptable for mockup).

---

## 7. Homepage Copy Reference (ready to drop into the mockup)

**Hero**
- Headline: *"Sell your property privately — and save thousands"*
- Subheadline: *"List, sell, and save — with expert support when you need it"*
- Bullets: No agent commission · Full control of your sale · Step-by-step guidance
- Primary CTA: **Start Selling** · Secondary CTA: Browse Properties
- Overlay stat: *"Save up to R200,000+ in commission"*

**Trust bar:** Save thousands in commission · Secure & user-friendly platform · Expert support available · Designed for South African sellers

**How it works (4 steps):** List your property → Connect with buyers → Manage offers → Close the deal

**Comparison table (Agent vs SellSmart):**

| Traditional Agent | SellSmart Property |
|---|---|
| 5–7.5% commission | Once-off low fee |
| Limited control | Full control |
| Agent as middleman | Direct buyer contact |
| Slow process | Faster decisions |
| Limited transparency | Full visibility |

**Cost example:** Selling a R2,000,000 property — Agent commission (6%) = R120,000 vs. SellSmart from R699 once-off → *"You save over R100,000."*

**Pricing preview:**
| Starter — R699 | Smart⭐ R1,499 (Most Popular) | Pro — R2,999 |
|---|---|---|
| Property listing, buyer enquiries, basic dashboard | Featured listing, document toolkit, viewing scheduler, email support | Pricing guidance, listing optimisation, priority support, negotiation assistance |

**Final CTA:** *"Ready to sell smarter?"* → **Start Selling Your Property**

---

## 8. Legal / Compliance Notes (inform design, don't block mockup)

These don't need to be *functional* in the mockup but should shape how flows are framed so the client sees the real product intent:

- **E-signature:** Do not build a custom "type your name" signer for the OTP — legal risk under the Alienation of Land Act & ECTA. Plan to integrate an established e-signature provider (e.g. DocuSign-style). In the mockup, simulate this as a distinct "signing" step/modal that returns an "✔ OTP Signed" state.
- **Identity verification:** Real product should capture ID number + OTP-to-cellphone + email verification before signing, for both buyer and seller. Can be a lightweight form in the mockup.
- **Document compliance:** FICA docs (ID, proof of address, tax number, marriage certificate if applicable), seller's Title Deed & Property Condition Disclosure, compliance certificates (Electrical COC, etc.), clearance certificates, Power of Attorney to Transfer — full checklist lives in `Legal document Requirements.docx`. Document Hub should reflect these categories even if upload is just simulated.
- **Data handling:** POPIA/PAIA/FICA compliance is a real production requirement (encryption, RBAC, MFA, audit trails, 5-year retention) — not needed for the mockup, but worth a line in the client-facing deck so expectations are set.
- **Recommendation on record:** Before real development spend, have the OTP workflow reviewed by a South African conveyancing attorney.

---

## 9. Mocked vs Real (what the prototype fakes)

| Feature | In the mockup |
|---|---|
| Payment (PayFast/Card/EFT) | UI only — no real transaction, "Pay & Publish" just advances to Success screen |
| E-signature | Simulated modal/step, no real DocuSign integration |
| Email notifications | Not sent — represented as dashboard state changes only |
| Document upload | Files can be accepted client-side but not persisted/scanned |
| Bond originator / conveyancer submission | "Send" button shows confirmation state, no real integration |
| Search/filter | Can run against static seed data |
| Admin panel | Out of mockup scope entirely |

---

## 10. Visual Direction (from reference screens)

- **Palette:** Navy blue (headers, primary text/nav), green (primary CTAs — "Start Selling," "Send Enquiry"), white backgrounds, light grey section dividers.
- **Logo:** House icon + "SellSmart Property" wordmark, navy/green.
- **Tone:** Clean, modern, trustworthy — light colours, generous white space, card-based layouts (listing cards, dashboard panels, provider cards).
- **Dashboard style:** Card-based panels (Listing Status, Enquiries, Offers, Process Tracker) in a grid, consistent across Seller Dashboard and sub-pages.
- **Process tracker:** Horizontal stepper with checkmarks for completed stages, highlighted current stage, greyed future stages — used consistently in dashboard, OTP flow, and standalone tracker view.

*(Reference: `Website Images.png` in this folder shows homepage, dashboard, create-listing wizard, property detail, and OTP/offer screens in this style — use as the visual baseline.)*

---

## 11. Suggested Build Order for the Mockup

1. Homepage (sets tone, copy, visual system)
2. Browse Properties + Property Detail (buyer entry point)
3. Seller onboarding flow (Start Selling → Payment → Success)
4. Seller Dashboard + Document Hub + Process Tracker
5. Enquiry + Viewing Request flows
6. OTP Builder + simulated signing + Offer Management (Accept/Counter/Reject)
7. Marketplace + Conveyancer Handoff
8. Pricing, About, Legal stub pages

This order front-loads the screens the client will judge first (homepage, listing browse, seller journey) and leaves back-office/lower-traffic screens for last.
