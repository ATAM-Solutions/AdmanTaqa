# Servexa — Platform Guide

*A plain-language explanation of what this platform is, how work flows through it, and who is allowed to do what. Written after reviewing the actual backend logic and the admin panel's code, not just the docs — so this reflects how the system really behaves today, including a few rough edges.*

---

## 1. What is this platform for?

Servexa (formerly called "TAQA") connects **gas stations** with **certified maintenance companies**, under the oversight of a **government regulator** (the "Authority"). When a gas station has something that needs fixing, it can either repair it with its own staff, or get an outside maintenance company to quote and do the job. Every approval, quote, payment confirmation, and sign-off along the way is permanently recorded, so the regulator can always see who did what and when — without ever seeing prices or payment details, which stay strictly between the station and the provider.

## 2. Who uses it — the three types of accounts

| Account type | Who this is | What they're here to do |
|---|---|---|
| **Fuel Station** | A gas station company (with one or more branches/sites) | Report problems, choose in-house repair or outside help, review and accept quotes, confirm payment sent, sign off on finished work |
| **Service Provider** | A certified maintenance company | Receive job requests, submit price quotes, assign a field worker (Operator), confirm payment received, carry out and report on the repair |
| **Authority** | The government regulator | Approve or reject new companies, oversee everything happening on the platform, and keep the permanent audit record — but never touch pricing or payments |

There's also an **Operator** — a specific field worker a Service Provider assigns to actually do the repair on-site. Operators aren't a separate login role; they're a name recorded against the visit so there's a clear record of who did the work.

Within a Fuel Station or Service Provider company, that company's own admin decides what each of *their* employees is allowed to do (e.g. "can this person approve a quote," "can this person only view branches"). The platform enforces the boundaries *between* companies and the Authority — it doesn't dictate internal job titles inside a company.

## 3. How a maintenance job actually flows through the system

1. **A problem is reported** — a station employee flags something that needs fixing at a branch.
2. **The station decides: fix it in-house, or send it out?** This decision is made *per problem*, not per station — the same station can fix one issue itself and send another one out, on the same day.
3. **If in-house:** an *Internal Work Order* is opened and stays entirely inside the station's own account — it goes: opened → in progress → under review → closed. No provider or Authority ever sees the details.
4. **If sent out:** an *External Request* is created and sent to one or more Service Providers.
5. **Providers submit quotes** — priced offers to do the job.
6. **The station picks a quote.** A job order is created, sitting in "awaiting payment."
7. **Payment happens outside the platform** (bank transfer, cash, etc.) — the platform only tracks the confirmation of it. The station marks "payment sent," then the provider confirms "payment received." Only once *both* sides confirm does the job actually start.
8. **The work happens.** The provider assigns a field worker, who visits the site, checks in, does the repair, and checks out. Bigger jobs can span several visits, and a job can be paused (e.g. waiting on a spare part) without losing its place.
9. **The provider submits the finished job for review.** The station either accepts it (job closes) or sends it back for rework.
10. **Everything above is permanently logged** — every approval, quote, payment confirmation, and sign-off is tied to the specific person and time it happened. This log cannot be edited or deleted by anyone, including the Authority.

## 4. Who can do what

| Action | Fuel Station | Service Provider | Authority |
|---|:---:|:---:|:---:|
| Approve a new company's registration | ❌ | ❌ | ✅ |
| Create a maintenance request | ✅ | ❌ | ❌ |
| Submit a price quote | ❌ | ✅ | ❌ |
| Accept/reject a quote | ✅ | ❌ | ❌ |
| See prices & payment amounts | ✅ | ✅ | ❌ (by design) |
| Confirm payment sent / received | ✅ (sent) | ✅ (received) | ❌ |
| Assign a field worker to a job | ❌ | ✅ | ❌ |
| Approve finished work | ✅ | ❌ | ❌ |
| View the full audit history | ❌ | ❌ | ✅ |
| Manage own company's branches/staff | ✅ | ✅ | — |

The Authority being completely blind to prices and payments isn't a missing feature — it's intentional, so the regulator stays out of commercial matters between stations and providers.

## 5. Getting a new company from sign-up to actually usable

1. A company registers as either a Service Provider or a Fuel Station, filling in details and uploading required documents.
2. **Login is blocked** for that account until the Authority reviews it.
3. The Authority reviews and approves or rejects it — this decision is permanently logged.
4. Once approved, the company can log in — but there's one more setup step before it's fully usable:
   - A **Service Provider** needs to add its services and staff before it can receive requests.
   - A **Fuel Station** needs to add at least one branch (which may itself need separate Authority approval) before it can submit any request.

**Where this currently feels confusing:** reviewing new companies is split across three different menu sections — a "Registrations" page (for Service Providers), a separate "Fuel Stations → Pending" tab (for stations), and a general "Organizations" page that overlaps both. There's no single "approve new companies" screen — you have to know which menu to check depending on the applicant's type.

## 6. Known rough edges (as of this audit)

These are real gaps found by reading the actual code — not guesses. None of them are things you're missing by not understanding the app; they're genuinely unfinished or leftover pieces.

- **The "Registrations" page opens the wrong screen.** Clicking "View" on a registration takes you to the company's general profile page, not the purpose-built approve/reject review screen (which does exist in the app, but isn't linked to from anywhere in normal use).
- **No way to send an existing request to providers later.** If a station creates an external request without picking providers at the moment of creation, there is currently no button to go back and send it out — it just sits stuck and invisible to every provider.
- **Site-visit tracking is half-built.** The intended flow is check-in → do the work → mark complete, with a visit type (repair / inspection / follow-up). Today there's only a single "check-in" button — no visit type, and no way to mark a visit finished.
- **Payment confirmation only works from one of the two screens it should.** A station can confirm "payment sent" from the request detail page, but that same action is missing from the job order detail page — so depending which screen someone is on, it can look like the option isn't there.
- **A handful of screens are dead ends.** A Dashboard overview, an Inspections screen, an old "Job Orders" screen, and an old "Work Orders" section all still exist in the app but aren't linked from any menu — leftovers from an earlier version of the process.
- **The app still contains an older, simpler version of the whole workflow** (plain "Service Request → Quotation → Job Order"), which has been superseded by the split process described above ("Registrations → Branch Requests → Internal Work Orders → Station Requests/Job Orders"). The old names still appear in menus in a few places, which is a likely source of confusion — they're mostly inactive leftovers, not a second working process.
- **A couple of small permission inconsistencies**: the Authority is currently blocked from a "Quotations" (read-only) page that the original spec says it should be able to view; and Fuel Stations are technically allowed to open the Locations and Quotations pages but the menu link is hidden, so nobody would normally find them.

## 7. Quick glossary

| Term | Meaning |
|---|---|
| **Internal Work Order** | A repair a station handles with its own staff — never leaves the station's account |
| **External Request / Job Order** | A repair sent out to a Service Provider, tracked from quote through completion |
| **Branch** | One physical gas station site belonging to a Fuel Station company |
| **Quote / Proposal** | A Service Provider's priced offer to do a specific job |
| **Operator** | The specific field worker who does the on-site repair |
| **Audit Log** | The permanent, unchangeable record of every approval, quote, payment, and sign-off |

---

*Scope note: this guide reflects what the code does today. The admin-panel-side findings (menus, screens, permission rules) were checked directly in the app's code; the workflow and role logic were checked directly against the backend's code. It does not reflect any changes made after this review.*
