# Mobile-First Landing Page Plan — Boring Basics

Audit + redesign plan for the home page (`src/app/(site)/page.tsx` and the
components it composes) targeting iPhone and Android phones, with an emphasis
on large, thumb-friendly tap targets. Written after reading the current
implementation (Next.js App Router, Tailwind v4 tokens in
`src/app/globals.css`, dark-first theme, accent `#ff5a0a`, `Anton` display
font + `Inter` body font).

## 1. What's already good (keep it)

- Responsive grid/stacking is already in place across `page.tsx` sections
  (`lg:grid-cols-2`, `sm:grid-cols-2`, etc.) — nothing collapses badly on a
  narrow viewport today.
- [Header.tsx](../src/components/Header.tsx) already has a mobile hamburger
  menu with full-width links and a full-width CTA button.
- [StickyCTA.tsx](../src/components/StickyCTA.tsx) already gives a persistent
  booking button once the user scrolls past the hero.
- [Button.tsx](../src/components/Button.tsx) centralizes button styling, so
  raising tap-target sizes is a one-file change that propagates everywhere.
- Dark theme + accent orange is distinctive and reads well on small,
  sunlight-glare-prone phone screens.

## 2. Problems for mobile specifically

1. **Primary tap targets are under the accessibility minimum.**
   `Button.tsx`'s `md` size is `py-2.5` (~40px tall including line-height),
   and the header's hamburger button is `h-10 w-10` (40px). Apple's HIG and
   Google's Material guidance both recommend a **minimum 44–48px** hit area.
   Every primary action on a phone-first coaching site (Book Consultation,
   WhatsApp, program CTAs) should clear 48px.
2. **Two competing bottom-of-thumb CTAs.** `StickyCTA` floats bottom-right
   over content, `WhatsAppButton` (presumably) also floats — worth checking
   they don't overlap, and that the sticky CTA doesn't sit under the iPhone
   home-indicator safe area or get clipped by Android's gesture bar.
3. **Hero is desktop-composed, then shrunk.** The hero autoplays a background
   `<video>` full-bleed on every viewport (`Hero.tsx`). On mobile data this is
   the single biggest performance/cost problem on the page — Save-Data users
   and metered mobile connections shouldn't download an autoplaying video.
   Three floating credential badges (`animate-float`) are also mobile-hidden
   already (`hidden sm:block`) — good — but the headline + subhead + two
   buttons + rating row is a lot to fit above the fold on a 375–412px-wide,
   ~700–800px-tall viewport before any scrolling.
4. **Long single-column scroll with no way to jump to intent.** About →
   Programs → How it works → Testimonials → FAQ → Instagram → Final CTA is
   ~8 full sections. A mobile visitor deciding "is this coach right for me"
   has to scroll a long way to reach programs/pricing-adjacent info or to a
   second CTA.
5. **Forms and dense text blocks** (`LeadForm`, `PhoneField`, FAQ body copy)
   need mobile keyboard types (`inputmode`, `autocomplete`) and generous line
   length control — worth a pass, but out of scope for the landing page mockups
   below (covered separately if the plan is approved).
6. **Cards optimized for hover, not touch.** `hover:-translate-y-0.5` and
   `hover:border-accent` states on `Button`/`ProgramCard` do nothing on a
   touch device and can leave a "stuck hover" state on some Android browsers
   after a tap. Needs an explicit `:active` state instead/in addition.

## 3. Design principles for the redesign

1. **One obvious next action, always reachable by thumb.** A persistent
   bottom action bar (not a single floating pill) with two large buttons:
   *Book a Consultation* (primary, accent-filled) and *WhatsApp* (secondary,
   icon+label) — both ≥48px tall, sitting inside the safe area.
2. **48px minimum for every tappable element**, 8px minimum spacing between
   adjacent targets, on the whole site — not just the landing page.
3. **Above-the-fold hero answers 3 questions in <2s**: who this is for, what
   the outcome is, what to do next. No autoplay video on mobile — a single
   optimized static photo (already have `hero-body-poster.jpg` and
   `trainer.profileImage`) with the same scrim/gradient treatment.
4. **Shorten the scroll, add a mid-page jump.** Compress "About teaser" and
   "How it works" into tighter, swipeable/collapsed mobile layouts; add a
   lightweight in-page quick-nav chip row right under the hero (Programs ·
   Results · FAQ · Book) so a visitor can skip to what they care about
   instead of scrolling 8 sections.
5. **Cards become horizontal swipe carousels on mobile**, not shrunk desktop
   grids — Programs (3 cards) and Testimonials (already a carousel) both work
   better as `snap-x` swipe rows than as stacked full-width cards for
   comparison shopping.
6. **Respect device chrome**: `env(safe-area-inset-*)` padding around the
   bottom action bar so it's not obscured by the iPhone home indicator or
   an Android 3-button/gesture nav bar; content shouldn't sit under the
   Dynamic Island/notch.
7. **Motion stays subtle and cheap.** Keep `Reveal`/fade-ins; drop
   scroll-linked parallax or the Ken Burns video pan on mobile
   (`prefers-reduced-motion` already respected — extend the same restraint
   to "low-end/mobile" generally, since battery + jank matter more here).

## 4. Section-by-section plan

| Section | Current | Mobile-first change |
|---|---|---|
| Header | Hamburger + full-width links, 40px toggle | Bump toggle to 48×48px; nav links to 48px row height |
| Hero | Full-bleed autoplay video, 2-line headline, 2 buttons, rating row | Static image (poster), tighter copy, 2 stacked full-width 48px+ buttons, rating row condensed to one line |
| Quick-nav chips | *(new)* | Horizontal scroll chip row: Programs / Results / FAQ / Book |
| Stats bar | 2×2 grid, static | Keep 2×2, ensure counters don't reflow copy |
| About teaser | 2-photo grid + bullet list + secondary button | Single hero photo + 3 bullets max + "More about me" as text link, not a full section fight for space |
| Programs | 3 stacked cards | Horizontal snap-scroll carousel, 1.15 cards visible (peek) to hint scrollability, "Most Popular" badge kept |
| How it works | 4-card grid | 2×2 stays, or condensed numbered horizontal stepper |
| Testimonials | Carousel (already touch-friendly) | Keep; increase swipe target/quote text size |
| FAQ | Accordion | Keep; bump tap row to 48px min height |
| Instagram | Grid feed | Keep, lazy-load below the fold |
| Final CTA | Centered heading + 2 buttons | 2 stacked full-width 48px+ buttons |
| Bottom action bar | Single floating CTA pill (bottom-right) | Persistent full-width 2-button bar (Book · WhatsApp), safe-area padded, replaces the single pill on mobile only |

## 5. Concrete implementation notes (for when this moves to code)

- `Button.tsx`: raise `sizes.md` to `py-3` (~48px) and `sizes.lg` to `py-4`;
  audit every touch-only control site-wide against the 48px bar (header
  hamburger, theme toggle, accordion rows, program card CTAs).
- `Hero.tsx`: gate the `<video>` behind a `min-width` media query or a JS
  connection check (`navigator.connection.saveData` /
  `effectiveType`), falling back to the poster `<Image>` on mobile.
- New `MobileActionBar` component: `fixed bottom-0 inset-x-0`, two
  `ButtonLink`s side by side, `pb-[env(safe-area-inset-bottom)]`, `md:hidden`
  (desktop keeps the current `StickyCTA`). Add `padding-bottom` to `<body>`
  or the last section equal to the bar's height so it never covers the
  final CTA.
- Programs/Testimonials mobile carousels: `overflow-x-auto snap-x
  snap-mandatory` + `snap-center` cards, `scroll-padding-inline` to keep
  peeking edges consistent; no JS carousel library needed.
- Add `viewport-fit=cover` is already implied by Next's default viewport —
  confirm `env(safe-area-inset-*)` is usable (it is, once `viewport-fit=cover`
  is set in the metadata `viewport` export).

## 6. Mockups

Two static mockups were produced showing the redesigned mobile landing page
end-to-end (hero through footer CTA), using the site's real copy, colors,
fonts and imagery:

- **iPhone (390×844, notch + home indicator safe areas):**
  [`iphone-mockup.png`](mockups/iphone-mockup.png)
- **Android (412×915, punch-hole camera + gesture nav bar):**
  [`android-mockup.png`](mockups/android-mockup.png)
- Editable source (single HTML file, both frames): [`mockup.html`](mockups/mockup.html)

Open `mockup.html` directly in a browser to view/scroll it live, or inspect
the two PNGs for a quick look. The mockups render the full page tall (no
scrolling needed to see it all) so hero, programs, testimonials and the
persistent bottom action bar can be reviewed at once per device.

## 7. Suggested next step

Ship this in two passes once the direction is approved:
1. **Tap-target + hero pass** (Button sizes, hero video gating, new bottom
   action bar) — highest impact, lowest risk, no data-model changes.
2. **Carousel + quick-nav pass** (Programs/how-it-works layout, quick-nav
   chip row) — larger diff, worth a design check-in first since it changes
   how programs are browsed on mobile.
