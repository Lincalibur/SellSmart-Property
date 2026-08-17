# SellSmart Property — Infrastructure & Hosting Plan

> Prepared 2026-08-16. Basis: `MVP-SPEC.md`, `docs/SellSmart-Property-MVP.md`. Also published as an artifact: https://claude.ai/code/artifact/7cc39fa0-8bca-4717-9b06-cb62eb2e0f4f
>
> Scope: hardware/hosting sizing staged against user growth, and the data-security posture required around POPIA, FICA, and ECTA given that the platform stores legal documents (OTPs, title deeds, ID/FICA docs) and touches payment flows.

---

## 1. Where this platform actually sits

SellSmart isn't a listings site — it's a system of record for property transactions. That changes the hosting calculus: the load profile is light, but the data at rest is sensitive and long-lived.

The app today is a static React/Vite front end with no backend yet built. Once real (non-mocked) accounts, offers, e-signatures, documents and payments exist, three categories of infrastructure are needed:

- **Application tier** — API + web serving. Traffic is bursty and low-volume even at scale (property transactions are infrequent, high-value events, not high-frequency ones).
- **Data tier** — relational database for listings/offers/users, plus a document store for FICA/ID/title-deed files that must be encrypted, access-controlled and retained for years.
- **Third-party integrations, not hosted by you** — e-signature (ECTA-compliant provider), payment gateway (PayFast/card), possibly bond-originator APIs. These remove the two highest-liability workloads — signing and card handling — from your own infrastructure entirely, which is the single biggest lever for reducing both hardware needs and compliance scope.

**Framing:** Because signing and payment capture should be delegated to certified third parties (per `MVP-SPEC.md` §8), SellSmart's own infrastructure never needs to be PCI-DSS-scoped or hold cryptographic signing state. It needs to be POPIA-compliant for personal and property data, and FICA-compliant for retention. That's a materially smaller, cheaper target than "build a secure signing/payments platform."

---

## 2. Growth-staged sizing

Don't provision for scale you don't have. Each stage below is a real, distinct infrastructure configuration — move to the next only when the trigger metric is hit, not preemptively.

| Stage | Users | Compute | Database | Documents | Monthly cost (ZAR) |
|---|---|---|---|---|---|
| **0 — Pilot** (soft launch) | ≤1,000 · ~50 concurrent | 1 shared vCPU, 1–2 GB RAM (single instance) | Managed Postgres, 1 vCPU / 1 GB, ~10 GB | Object storage, <20 GB | ~900 – 2,500 |
| **1 — Launch** (public launch) | 1,000–10,000 · ~300 concurrent | 2× instances, 2 vCPU / 4 GB each, autoscaled + load balanced | Managed Postgres, 2 vCPU / 4 GB, 50–100 GB, daily PITR backups | Object storage, ~200 GB, versioned + lifecycle rules | ~6,000 – 14,000 |
| **2 — Growth** (established traction) | 10,000–100,000 · ~2,000 concurrent | Autoscaling cluster, 4–8 vCPU aggregate, multi-AZ | 4 vCPU / 16 GB primary + read replica, 500 GB, point-in-time recovery | Object storage, 1–3 TB, CDN-fronted, WORM/legal-hold enabled | ~35,000 – 80,000 |
| **3 — Scale** (national scale) | 100,000+ · ~10,000+ concurrent | Multi-region autoscaling, containerised, 16+ vCPU aggregate | 8+ vCPU / 32 GB+, multi-AZ + cross-region replica, sharded document metadata | Object storage, 10 TB+, multi-region replication, dedicated KMS | 150,000+ (usage-scaled) |

Even at 100,000 registered users, concurrent *active* sessions on a low-frequency transactional product like this rarely exceed a few thousand — sizing against registered users alone would badly over-provision. Trigger the next stage on p95 response time and DB CPU, not user count.

**Why not raw servers:** There's no case here for owning physical hardware. Transaction volume is inherently spiky (weekday evenings, month-end), document storage needs to grow for years without a re-platform, and POPIA-grade encryption/backup/audit tooling is a checkbox on managed cloud services and a custom build otherwise. Treat "hardware requirements" as compute/storage/bandwidth *specifications* to buy as a managed service, not equipment to rack.

---

## 3. Recommended architecture

```
Buyers/Sellers → CDN/Edge (TLS) → App servers (autoscaled, RBAC, audit logging, rate limiting)
                                        ├── Postgres (encrypted at rest)
                                        ├── Document store (KMS + signed URLs)
                                        ├── E-signature provider (ECTA-compliant, external)
                                        └── Payment gateway (PCI-DSS, hosted checkout, external)
```

Users never touch the document store or database directly; signing and card data never touch SellSmart's own servers.

### Region & provider

Data residency isn't a hard POPIA requirement (cross-border processing is allowed with adequate safeguards), but for a platform holding South African title deeds, ID documents and OTPs, hosting in-country reduces latency, simplifies the POPIA "adequate protection" argument, and reads better to conveyancing attorneys and clients alike.

| Provider | SA region | Fit |
|---|---|---|
| AWS | af-south-1 (Cape Town) | Full managed stack (RDS, S3, KMS, CloudFront); most mature compliance tooling |
| Azure | South Africa North (Jhb) | Strong if already in a Microsoft/enterprise stack |
| Local SA hosts | In-country | Viable for Stage 0–1 only; re-evaluate managed-service depth before Stage 2 |

**Backend platform note:** the chosen Stage 0–1 accelerator, Supabase, does
not offer an `af-south-1` region (nearest is EU) and has no managed sharding
/ multi-region-write path for Stage 3. It's the right choice to move fast
through Stage 0–1, on the understanding that Stage 2 triggers a planned
migration to direct AWS-managed services (RDS/Aurora, S3, CloudFront, KMS,
WAF) in `af-south-1` to match this plan's later stages. See
`docs/BACKEND-STACK-RECOMMENDATION.md` addendum for detail.

---

## 4. Data security — the part that actually matters here

The documents this platform stores are title deeds, ID documents, signed OTPs and FICA files — the security posture has to be built for that from day one, not retrofitted.

| Category | Control | Why |
|---|---|---|
| Encryption | TLS 1.2+ in transit; AES-256 at rest for DB and document store; provider-managed KMS with key rotation | POPIA "appropriate technical measures"; baseline for any legal-document platform |
| Access control | Role-based access (Seller / Buyer / Provider / Admin, per `MVP-SPEC.md` §2); documents scoped to the specific transaction, not org-wide | A buyer must never be able to reach another buyer's FICA docs |
| Authentication | MFA for Admin and Service Provider roles; ID number + cellphone OTP + email verification before any OTP signing, per §8 | Signing-adjacent identity verification is a legal expectation under ECTA |
| Audit trail | Immutable log of every document view/download and every offer state change, with actor, timestamp, IP | Evidentiary trail if a transaction is disputed post-registration |
| Retention | Minimum 5-year retention for FICA/transaction records; legal-hold/WORM on signed OTPs and title documents | FICA record-keeping requirement |
| Backups | Daily automated backups, point-in-time recovery, tested restore quarterly | A lost signed OTP is a legal liability, not just downtime |
| Perimeter | WAF + managed DDoS protection at the CDN/edge; rate limiting on auth and document endpoints | Public-facing forms (enquiry, signup) are the most common attack surface |
| Payment scope | No card data ever touches SellSmart servers — hosted checkout only (PayFast/card gateway) | Keeps the platform out of PCI-DSS scope entirely |

**Compliance owner:** POPIA requires a designated **Information Officer** registered with the Information Regulator before processing personal information at any real scale — this is an organisational requirement, not an infrastructure one, but it gates production launch and should be assigned now.

**Open legal dependency:** Per `MVP-SPEC.md` §8, the OTP workflow should be reviewed by a South African conveyancing attorney, and the e-signature provider chosen must satisfy Alienation of Land Act + ECTA requirements, before any of the above is built against real transactions. This determines API/webhook shape, so it blocks backend architecture, not just legal sign-off.

---

## 5. Sequencing

| Order | Action | Depends on |
|---|---|---|
| 1 | Appoint Information Officer; register with Information Regulator | — |
| 2 | Attorney review of OTP flow; select ECTA-compliant e-signature provider | — |
| 3 | Stand up Stage 0 infra: managed Postgres + object storage + single app instance, af-south-1 | Provider account, DB schema |
| 4 | Wire up e-signature + payment gateway as external services (never self-hosted) | Step 2 |
| 5 | Implement RBAC, audit logging, MFA before first real document upload | Step 3 |
| 6 | Load-test and re-size only when p95 latency or DB CPU crosses threshold | Real traffic data |

---

*Sizing figures are planning estimates — confirm against the chosen provider's current pricing before budgeting.*
