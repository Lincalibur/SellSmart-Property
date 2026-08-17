# Backend Stack Recommendation — MVP to Service

## Current state

`src/` is a Vite + React (React Router) single-page app. There is no backend:
`src/context/AppContext.jsx` and `src/data/seed.js` hold everything in memory,
and per `MVP-SPEC.md` §9, payments, e-signature, email, document upload,
search, and the admin panel are all simulated against static seed data.

Turning this into a real service requires adding, at minimum:

- A real database (users, listings, enquiries, viewings, offers, OTPs, documents, conveyancer handoffs)
- Authentication (seller / buyer / service provider / admin roles) + RBAC
- File storage (ID docs, proof of address, FICA docs, title deeds, photos)
- Payment processing (once-off listing package fee)
- E-signature integration for the OTP
- Transactional email (enquiry notifications, offer updates, status changes)
- An admin back-office
- POPIA-appropriate data handling (encryption at rest, audit trail, retention)

## Options considered

| | **Supabase** | **Node/Express + Postgres (self-hosted)** | **Next.js full-stack on Vercel** |
|---|---|---|---|
| Effort to stand up | Low — managed Postgres, Auth, Storage, Row-Level Security, and Edge Functions out of the box | High — build auth, RBAC, file storage, migrations, hosting yourself | Medium — migrate routing/build off Vite to Next.js App Router first |
| Keeps current frontend | Yes, unchanged — add `@supabase/supabase-js` client | Yes, unchanged — just add an API client | No — React Router pages, layouts, and build config all move to Next.js conventions |
| Auth + RBAC | Built-in (email/password, OTP, magic link) + Postgres RLS policies per role | Must implement (e.g. Passport/Lucia) + hand-roll role checks | Built-in-ish via NextAuth/Auth.js, still need RLS-equivalent logic yourself |
| File storage (FICA docs, photos) | Built-in Storage buckets with per-row access policies | Needs S3/R2 + your own signed-URL logic | Needs S3/R2 + your own signed-URL logic (or Vercel Blob) |
| Webhooks (PayFast ITN, e-sign callbacks) | Edge Functions | Any Express route | API routes / Route Handlers |
| Ops burden | Low — one managed platform, generous free tier | High — you own DB backups, scaling, patching | Medium — Vercel manages hosting, but you still wire a DB (e.g. Vercel Postgres/Neon) |
| Portability / vendor lock-in | Moderate (Postgres underneath, but Auth/Storage/RLS are Supabase-specific) | Highest — fully yours | Moderate (tied to Vercel conventions, though Next.js itself is portable) |
| Best fit when | You want the fastest path to a real, secure multi-tenant service without standing up infra yourself | You need full infra control or have existing ops practices | You want one deployable unit and already plan to host on Vercel |

## Recommendation: **Supabase**

Reasoning specific to this project:

1. **Speed to real service.** The existing mockup already models exactly the
   data Supabase is good at securing with Row-Level Security: rows owned by a
   seller, a buyer, or shared between the two once an offer exists. That maps
   directly onto Postgres RLS policies instead of hand-written middleware.
2. **No frontend rewrite.** The current Vite + React Router app stays as-is;
   we add a Supabase client and swap `AppContext`'s in-memory state for real
   queries incrementally, page by page — which fits the feature-branch,
   ship-in-slices workflow already set up in `CONTRIBUTING.md`.
3. **Storage + Auth are the two hardest pieces of this spec** (FICA docs,
   role-based document access, buyer/seller/provider/admin auth) and Supabase
   provides both natively, policy-gated by the same RLS rules as the data.
4. **Solo/small-team operational cost.** No servers to patch, free tier
   covers early development and likely early production traffic.
5. **Edge Functions** cover the two webhook integrations we need (payment
   gateway ITN callback, e-signature completion callback) without standing up
   a separate server.

Trade-off accepted: some vendor lock-in on Auth/Storage/RLS conventions if we
ever needed to leave Supabase. Given the project stage (MVP → first real
service), speed and reduced ops burden outweigh that risk.

**If this changes** (e.g. you get infra/ops help and want full control, or a
client/investor requires self-hosting), Node/Express + Postgres is the
fallback — the data model designed for Supabase's Postgres underneath
transfers directly.

## Third-party service defaults

Per your steer to "pick sensible SA defaults":

- **Payments — PayFast.** The standard South African payment gateway (EFT,
  card, popular local methods), used elsewhere in the SA proptech space.
  Integrates via a hosted checkout + server-side ITN (Instant Transaction
  Notification) webhook — a good fit for a Supabase Edge Function.
- **E-signature — DocuSign.** `MVP-SPEC.md` §8 explicitly calls for an
  established e-signature provider (not a custom "type your name" signer)
  for legal defensibility under ECTA/the Alienation of Land Act. DocuSign is
  the most established option with a solid REST API and webhook-based
  completion callbacks. (SignRequest/Xodo Sign are cheaper fallbacks if
  DocuSign pricing is a blocker later — same integration shape.)

No API keys or accounts are provisioned by this doc — these are
recommendations to build against once you're ready to create the actual
PayFast/DocuSign accounts.

## What this unlocks

With Supabase chosen, the feature-branch backlog (see follow-up plan) can
proceed in this order: **project foundation → auth → listings/search →
enquiries/viewings → OTP + offers → documents → payments → e-signature →
marketplace/conveyancer handoff → admin → notifications → compliance
hardening.**
