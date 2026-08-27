# Brief — transcribed from the mind map

Source: `GCC Lansdscape.png` (a Whimsical export; the PDF of the same map has its text outlined and
is not machine-readable). Transcribed 2026-08-26 by reading the image in tiles. **This file is the
usable record — read it instead of the image.**

Legend for the original's own annotations: plain text = the metric; `monospace` = author's note to
the builder; highlighted "Blurred view (they have to connect with us)" = gated.

Almost every metric carries `Can be hardcoded and changed on intervals`. Taken as read below;
called out only where the note says something else.

## Inputs

Company Name · Industry · Sub-Industry · HQ Location · Global Headcount · Existing GCC Status.

Superseded: sub-industry is dropped and revenue band asked instead. See `project.md`.

## Screen 1 — Peer View

Peer rule as originally written: *fewer than 5 competitors; same industry, business, and roughly
the same revenue band; same country is the priority, and if the same country isn't available go to
other countries; if fewer than 5 companies, don't disclose that — just show those available; if no
company is found in the sub-industry, default to industry.*

**Part 1 — Peers having GCC in India.** Per peer:
- Where in India they have a GCC
- Total headcount of GCC
- Establishment year
- ~~India GCC as a % of global tech workforce~~ — **cut.** No global-workforce denominator exists,
  and the brief's own note flagged that it undermines companies with a low percentage.

**Part 2 — Common functions present in India, ranked by headcount.**
`But we won't show the headcount.` `Could be hardcoded as mostly all the functions are more or
less the same.`

**Part 3 — Count of Fortune 500 companies which have GCCs, and total professionals employed in
them, as a sum.** `Here show total Fortune 500 companies present in India, not just from their
peer set.`

**UI elements called for:**
- *India map* — heatmap of peer GCCs, by industry, by talent type, etc. **Kept.** Density comes from
  the city lists already in the company data, filtered to the visitor's industry.
- ~~*Editable peer set*~~ — **cut.** The brief wanted it as a trust valve and an intent signal.
  Dropped; the peer ladder plus a stated shortfall covers the trust problem.

**Added after the brief** (not in the mind map, decided later):
- A count of other companies in the visitor's industry with an India GCC.
- A panel of the largest companies in that industry with an India GCC, as an aspirational anchor.

## Screen 2 — Function View

Lens names (Supply / Speed / Place / Cost / Fit / Optional) are the author's internal filing
system. Not UI labels.

### Tech

**Supply**
- Bench strength (FTEs) / tech workforce — `Why: how many people with the skills I need are available today?`
- Graduate output by discipline — `Why: will this talent pool stay deep tomorrow as we grow?`
- Ecosystem size (developer, AI/ML, QA, etc.)
- Leadership depth: professionals / tech managers with 10+ years experience
- Count of GCCs that exceed 100+ FTEs
- Open-source and community signal: GitHub contributors, GitLab, Kaggle, conference and meetup
  density by stack

**Fit — capability matrix.** Comparators: Poland, Philippines, Vietnam. Rows: Product engineering,
Data & AI, Cloud & platform, Cybersecurity, Enterprise technology. The map embeds a worked example
as a shared visual:

| Capability | India | Poland | Philippines |
| --- | --- | --- | --- |
| Product engineering | Very strong | Strong | Developing |
| Data and AI | Very strong | Strong | Developing |
| Cloud and platform | Very strong | Strong | Moderate |
| Cybersecurity | Strong | Strong | Moderate |
| Enterprise technology | Very strong | Strong | Strong |

### Operations

**Supply** — bench strength (FTEs) · graduate output by discipline · backfill time in days
(as a range) · available Grade A office stock.

**Speed**
- Time to first hire — `Give a range: depending on the model, as low as 7 days (EOR + incubator space) vs 30 days for BOT.`
- Median time to reach 100 FTEs, then 500, then 1000 — `Idea is how quickly companies scale and ramp up: show they scale as the model proves out and they add functions as work is proven — but we don't want to say all this, figure out a way to do it.`

**Place** — infrastructure reliability: power and connectivity uptime, network latency to primary
cloud regions, disruption days per year (power, flooding, transit). `Can show some relative metrics
here to build trust in the major tech hubs in India.`

### HR

**Supply** — bench strength (FTEs) · graduate output by discipline · leadership depth:
professionals with 10+ years experience (`need to decide whether just tech or non-tech also`) ·
backfill time in days (as a range).

**Cost**
- Base salary growth YoY
- **GATED** — HR cost per employee served (HR FTE ratio, HRIS, payroll and vendor cost per head)
- **GATED** — fully loaded cost per FTE by role family and level (salary + statutory + facility +
  IT + HR support) vs. sending country

**Speed**
- Days to legal employer readiness — `entity incorporation plus PF, PT, ESI and Shops & Establishments registrations`
- Time to first hire — same range note as Operations
- Median time to reach 100 / 500 / 1000 FTEs — same note as Operations
- Offer acceptance rate

**Optional** — diversity: gender mix, socio-economic diversity, inclusion by city and role family,
return-to-work / caregiver support.

### Finance

Only the Cost lens.

- **Cost advantage durability** → historical movement in cost terms (growth YoY), split three ways:
  compensation, operating cost, workplace
- **Cost composition** → directional split between people, workplace, infrastructure, compliance
  and operating support — `what drives the cost advantage`
- **T1 vs T2 operating cost spread** — `indexed difference across compensation, office space,
  transport and local operating support.` `Scatterplot with all the city names, or some other graph
  which would complement better.`
- **India vs other hubs for comparable roles** — *no absolute per-head salary figures*
- **GATED** — cost vs ecosystem-depth trade-off. `Compare the city's relative cost position with
  relevant talent depth, peer presence, infrastructure and scalability.` `Prevents a lower-cost
  city from appearing attractive without considering execution risk.`
- **GATED** — workplace-cost gradient

## What the brief asks for that the database cannot yet answer

- **Functions per company** — no column. The brief's own note anticipates this and permits
  hardcoding a common function set.
- **Every Screen 2 metric** — all of it is the separate, not-yet-supplied dataset. It gets entered
  through the admin editing views rather than imported.
