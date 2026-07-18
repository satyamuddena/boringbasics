# Boring Basics — Personal Trainer Website (self-hosted)

Marketing & lead-generation website for **Boring Basics** (online fitness trainer
**Satya Muddena**, Hyderabad) with a **built-in admin panel** — no external CMS
or third-party services required. Next.js (App Router) + Tailwind CSS + Framer
Motion + **SQLite**. Dark-first design with an electric-orange accent.

Everything the site shows — trainer profile, email & phone, social links,
programs, testimonials, FAQs, blog posts, prices — is editable at **`/admin`**
and reflects across the whole site immediately.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # set ADMIN_EMAIL + ADMIN_PASSWORD at minimum
npm run dev                  # http://localhost:3000  (admin at /admin)
```

On first boot the app creates `data/boring-basics.db`, applies migrations, seeds it
with the bundled default content (`src/content/site.ts`) and creates the admin
user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Seeding is idempotent — it never
overwrites your edits.

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
npx tsx scripts/seed.ts        # initialize the DB without starting the app
npx drizzle-kit generate       # regenerate SQL migrations after schema changes
```

---

## Architecture

```
src/
├─ app/
│  ├─ (site)/               # public pages (Home, About, Programs,
│  │                        #   Testimonials, Blog, Tools, Contact, Unsubscribe)
│  ├─ admin/                # built-in admin panel (login + CRUD + audit log)
│  ├─ api/
│  │  ├─ lead/              # consultation enquiries → DB + email
│  │  ├─ booking/booked     # confirmed bookings → Twilio WhatsApp notification
│  │  ├─ subscribe/         # newsletter signups (footer box + form opt-in)
│  │  └─ admin/upload       # image uploads (content-hashed, stored in DATA_DIR)
│  └─ uploads/[...path]/    # serves uploaded images
├─ components/              # public UI + components/admin/* primitives
├─ content/site.ts          # typed default content (used to seed + as fallback)
├─ db/                      # Drizzle schema, SQLite bootstrap, seeding
├─ lib/                     # content getters, auth, audit, mail, newsletter
└─ proxy.ts                 # /admin cookie redirect (auth enforced in-request)
drizzle/                    # generated SQL migrations (applied on boot)
data/                       # SQLite DB + uploads (gitignored; volume in Docker)
```

- **Database**: SQLite via better-sqlite3 + Drizzle ORM. Single file at
  `${DATA_DIR:-./data}/boring-basics.db` (WAL mode). No external database service.
- **Auth**: single admin user, scrypt-hashed password, DB-backed sessions with
  hashed tokens in an httpOnly cookie. Every admin action re-checks the session.
- **Audit**: append-only `audit_log` records every content change (with
  before/after), login attempt, enquiry, subscribe/unsubscribe and newsletter
  send — browsable at `/admin/audit`.
- **Newsletter**: visitors opt in on the consultation form or the footer
  subscribe box. Admin sends professional HTML newsletters from
  `/admin/newsletter` (ad-hoc) or by ticking "Email subscribers" when saving a
  blog post. Every email carries a per-subscriber unsubscribe link
  (`/unsubscribe?token=…`).
- **Blog**: markdown body, edited in `/admin/posts`, rendered with the same
  typography as before.
- **Graceful degradation**: without SMTP/Instagram keys the site runs fully —
  email logs to console, the Instagram section shows a follow card.
- **Booking notification**: when Twilio WhatsApp env vars are set, the
  trainer receives a WhatsApp template message after a paid Calendly slot is
  booked. Without them, booking still succeeds and the notification is skipped.
- **Booking verification**: `CALENDLY_ACCESS_TOKEN` is required in production
  so the server verifies Calendly event URIs before marking paid bookings as
  booked.

---

## Deploy (Render — chosen strategy)

The repo ships a [render.yaml](./render.yaml) blueprint: a Docker web service
with a 1 GB persistent disk mounted at `/data` (SQLite DB + uploaded images).

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select the repo. Render reads
   `render.yaml` and prompts for the secrets (`ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `NEXT_PUBLIC_SITE_URL`; SMTP whenever ready).
3. Deploy. First boot migrates + seeds the database and creates the admin
   user. Point the domain at the service (Render → Settings → Custom Domains).

Notes:
- The persistent disk requires a paid instance (Starter, ~$7/mo + disk).
- With a disk attached, Render runs a single instance — exactly right for
  SQLite. Back up the disk from the Render dashboard (Disks → Snapshots).

### Alternative: any Docker host

```bash
docker build -t boring-basics .
docker run -d --name boring-basics -p 3000:3000 \
  -v boring-basics-data:/data \
  -e ADMIN_EMAIL=you@example.com \
  -e ADMIN_PASSWORD=strong-password \
  -e NEXT_PUBLIC_SITE_URL=https://boringbasics.in \
  boring-basics
```

Put a reverse proxy (Caddy/Nginx/Traefik) with TLS in front, and back up the
`boring-basics-data` volume.

> ⚠️ **Serverless hosts (Netlify/Vercel) are not supported** by this build:
> SQLite and local uploads need a persistent disk and a long-lived Node
> process.

---

## Environment variables

See [.env.example](./.env.example). Only `ADMIN_EMAIL` / `ADMIN_PASSWORD` are
required to get a working site + admin. SMTP (enquiry + newsletter emails) and
analytics IDs can be added whenever the accounts are ready.

For trainer WhatsApp booking notifications, configure the Twilio variables in
`.env.example` and create an approved Content Template body with these five
variables: `Name: {{1}}`, `Phone: {{2}}`, `Date: {{3}}`, `Time: {{4}}`, and
`Email: {{5}}`. Set its Content SID as `TWILIO_WHATSAPP_CONTENT_SID`; admins
can send the dummy version from `/admin/whatsapp-test`.

For production booking integrity, set `CALENDLY_ACCESS_TOKEN`; without it, paid
bookings cannot be marked as booked. Test payment bypass is ignored in
production builds even if the admin setting is checked.

---

## Editing content

Everything is at **`/admin`**:

| Section | What it controls |
|---|---|
| Trainer | Name, tagline, bio, **email**, **WhatsApp number**, certifications, photos, stats bar |
| Programs | Coaching packages (cards, detail pages, prices) |
| Testimonials | Client quotes, ratings and before/after collages |
| FAQs | Q&A by category |
| Socials | **Instagram / YouTube / Facebook /…** links shown in the footer & JSON-LD |
| Blog Posts | Markdown articles (+ optional "email subscribers" on save) |
| Newsletter | Subscriber list + ad-hoc newsletter composer |
| Enquiries | Consultation requests from the contact form |
| Settings | Site URL, SEO keywords, headlines, consultation price |
| Audit Log | Who changed what, when, with before/after |

Design decision: **program prices are intentionally hidden** on the public site
(cards show "Enquire for pricing"); they're stored per program in the admin.
