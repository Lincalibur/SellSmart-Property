# SellSmart Property — Hosting Plan, Simple Summary

*Prepared for finance review. Plain-English version of `docs/Unified-Infrastructure-Architecture.md`.*

## What this covers

Once SellSmart Property is a real, working service (not just the current clickable
demo), it needs somewhere to run: a database to store listings and offers, a place
to store uploaded documents and photos, a system to handle sign-in, and so on.
This document explains where each of those pieces lives, what it costs in Rand at
each stage of growth, and compares our two hosting options.

---

## Where each part of the system lives

| Part of the system | What it actually does | Where it's hosted |
|---|---|---|
| The website and app itself | What buyers and sellers see and click on | Amazon Web Services (AWS) data centre in Cape Town |
| Sign-in and accounts | Checks who someone is when they log in, keeps seller/buyer/admin accounts separate | AWS, Cape Town |
| Property and offer records | The database — listings, offers, enquiries, signed contracts | AWS, Cape Town |
| Uploaded documents and photos | ID copies, proof of address, signed contracts, property photos | AWS, Cape Town — signed contracts are locked so they can't be edited or deleted once signed, which is a legal requirement for this kind of document |
| Security and speed layer | Filters malicious traffic and makes the site load quickly for users anywhere | AWS, with a global speed-up network |
| Taking payment | The once-off listing fee | PayFast (a specialist South African payment company — we never touch card details ourselves) |
| Signing contracts | Buyer and seller signing the Offer to Purchase | DocuSign (a specialist e-signature company — legally required to be a proper provider, not something we build ourselves) |

**In short:** everything we're responsible for building lives in one place —
Amazon's Cape Town data centre — and the two jobs that carry the most legal and
financial risk (taking payment, signing contracts) are handed to specialist
companies who already carry that responsibility for thousands of other
businesses.

---

## What it costs, as the business grows

The system is built so we never have to rebuild it or move data to a new system
as the business grows — we simply turn up capacity, in the same place, as more
people use it. Costs below are in Rand per month, and rise smoothly with usage.

| Stage | How many users | Monthly cost (ZAR) |
|---|---|---|
| Pilot — soft launch | Up to 1,000 | R2,200 – R2,600 |
| Launch — public launch | 1,000 – 10,000 | R10,000 – R11,100 |
| Growth — established | 10,000 – 100,000 | R79,500 – R101,700 |
| National scale | 100,000+ | R287,000 – R712,000 |

The wide range at the top end is normal — it depends on exactly how much
document traffic and how many concurrent signings are happening, and will be
narrowed down once we have real usage data from the Growth stage. These are
planning figures (based on R18.50 to the US Dollar); we'll confirm exact numbers
with AWS closer to each stage.

---

## Two ways to build this: Supabase vs. AWS

There were two realistic options for where to host this. Both were considered
seriously — here's the honest comparison.

| | **Supabase** | **AWS (recommended)** |
|---|---|---|
| Cost — Pilot stage | ~R460/month | ~R2,200–2,600/month |
| Cost — Launch stage | ~R1,850–2,775/month | ~R10,000–11,100/month |
| Cost — Growth stage | ~R16,650–27,750/month | ~R79,500–101,700/month |
| Cost — National scale | Not usable at this size (see below) | ~R287,000–712,000/month |
| Hosted in South Africa? | No — nearest available location is Europe | Yes — Cape Town, from day one |
| Can it grow to national scale without being rebuilt? | No — it hits a hard technical ceiling and would need to be replaced with something else | Yes — same system, just given more capacity |
| Time to build the first version | Faster — roughly 2–4 weeks less work | Slower — more setup work up front |
| Day-to-day running | Simpler, more things are handled automatically | Needs a bit more ongoing technical attention |

### Supabase

**Pros:** Cheaper at small scale. Faster to get the first working version built.
Simpler for a small team to run day-to-day.

**Cons:** Customer data (including ID documents and signed contracts) would be
stored in Europe, not South Africa. More importantly, it cannot grow past a
certain size — at some point, likely right in the middle of the business's
busiest growth period, we would be forced to move everything to a different
system. That kind of move is expensive, risky, and exactly the kind of
disruption we're trying to avoid.

### AWS

**Pros:** Data stored in South Africa from day one. The same system keeps
working, unchanged, from the very first pilot user through to national scale —
no forced rebuild, ever. We have full control over how security is set up,
which matters given the sensitive documents (ID copies, signed contracts) this
platform will hold.

**Cons:** Costs more from the start, and takes a few extra weeks to build the
first version, because less comes "ready-made."

### Recommendation

**AWS.** It costs more up front and monthly, but it directly satisfies two
things we said matter most: hosting in South Africa, and never having to move
customer data to a different system as the company grows. The extra cost buys
us out of a future migration project — one that would otherwise land exactly
when the business can least afford the disruption.
