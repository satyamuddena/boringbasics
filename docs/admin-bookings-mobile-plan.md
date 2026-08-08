# Admin Bookings Page — Mobile Plan

Audit + redesign plan for `/admin/leads` (labelled "Bookings" in the sidebar)
on iPhone and Android, focused on making it comfortable to run one-handed
during the day — this is the page a trainer checks between clients, on the
move, to see who needs a reply.

Read: [`page.tsx`](../src/app/admin/(panel)/leads/page.tsx),
[`BookingCard.tsx`](../src/components/admin/BookingCard.tsx),
[`BookingDetails.tsx`](../src/app/admin/(panel)/leads/BookingDetails.tsx),
[`LeadWhatsAppButton.tsx`](../src/app/admin/(panel)/leads/LeadWhatsAppButton.tsx),
[`AdminSidebar.tsx`](../src/app/admin/(panel)/AdminSidebar.tsx),
[`components/admin/ui.tsx`](../src/components/admin/ui.tsx).

## 1. What's already good (keep it)

This admin is unusually well-built for mobile already — worth naming so
nothing here gets accidentally undone:

- **Two real layouts, one data source.** `page.tsx` renders `BookingCard`
  on phones and `AdminTable` from `md:` up, both built from the same `rows`
  array — there's no risk of the two disagreeing.
- **Safe-area handling is already correct**: the mobile top bar
  (`AdminSidebar.tsx`) accounts for the iPhone notch/Dynamic Island via
  `env(safe-area-inset-top)`, and `adminChrome.ts` centralizes the geometry
  so every sticky element (page heading, section nav, save bar) lines up
  with it. Don't hand-roll a new offset — reuse `MOBILE_BAR_CLEARANCE` /
  `MOBILE_BAR_OFFSET`.
- **Filters collapse behind a one-line summary on phones**
  (`AdminListControls`'s `collapseOnMobile`) so the booking list is the
  first thing on screen, not three stacked form fields.
- **Tabs scroll horizontally** and carry live counts, with "Needs you"
  called out in warning color.

## 2. The real problem: tap targets, not layout

The layout is right. The controls inside it are sized for a mouse:

| Control | File | Current size | Feels like on a phone |
|---|---|---|---|
| WhatsApp button on a "needs follow-up" card | [`LeadWhatsAppButton.tsx:38`](../src/app/admin/(panel)/leads/LeadWhatsAppButton.tsx#L38) | `px-2 py-1 text-xs` (~28px tall) | The single most important action on the busiest tab is smaller than a thumb |
| "View" button that opens the full record | [`BookingDetails.tsx:145-151`](../src/app/admin/(panel)/leads/BookingDetails.tsx#L145) | `btnGhost` `px-2 py-1 text-xs` (~28px) | Easy to miss, easy to fat-finger the wrong card's button |
| "Close" button on a card | `page.tsx:317-323` | `btnGhost` `px-2 py-1 text-xs` (~28px) | Sits right next to View/WhatsApp — three ~28px targets crowded together |
| Modal close (X) | `BookingDetails.tsx:171-180` | `h-8 w-8` (32px) | Below the 44px minimum, though backdrop-tap and Escape are decent fallbacks on other devices |
| Mobile hamburger | `AdminSidebar.tsx:217-227` | `h-10 w-10` (40px) | Just under the 44px bar, and it's the only way into every other admin page |
| Modal action buttons (Message / I called / Close) | `BookingDetails.tsx:199-219` | `btnGhost` `px-3 py-1.5 text-sm` (~36px) | Below 44px for the actions a trainer taps most |

None of this needs a redesign — it needs the same controls, sized for a
thumb, and the three crowded actions on a card need to stop being three
equal-weight ~28px chips fighted for the same row.

## 3. Design changes

1. **Raise every control on this page to a 44px minimum** (48–52px for the
   one primary action per card/screen) — same bar as the public site plan.
   `btnGhost`'s callers on this page move off `px-2 py-1 text-xs` to a
   `px-3.5 py-2.5` variant; the hamburger goes to `h-11 w-11`.
2. **Make the whole card the "open details" tap target**, not a tiny "View"
   label. A trailing chevron (`›`) signals it's tappable. This removes one
   of the three crowded buttons entirely and gives the most common action
   ("see the full record") the largest possible hit area — the whole card.
3. **One clear primary action per card, sized to match its urgency.** On a
   card that `progress.needsFollowup` flags (today's warm `bg-warn/5` tint),
   promote WhatsApp to a full-width 48–52px button — that's the actual next
   action for that row. On a card that doesn't need follow-up, WhatsApp and
   Close stay as a secondary 44px row — present, not shouting.
4. **Turn the booking detail dialog into a bottom sheet on phones.** It's
   already a full-screen scroll container with a centered card
   (`BookingDetails.tsx:157-168`); on a narrow viewport that's visually just
   a slightly-inset full-screen panel already. Making it explicitly a
   bottom sheet — slides up, rounded top corners, drag handle, close button
   pinned top-right at 44×44 — matches the gesture a phone user already
   expects and keeps the close control in the same reachable spot every
   time. Desktop keeps the centered dialog (`sm:` breakpoint).
5. **Keep color-only cues backed by text/icon**, as the code already mostly
   does (`StatusPill` prints a word, not just a dot) — carry that into any
   new "needs a reply" treatment on the card (icon + label, not just a
   warm-tinted background).
6. **Make the tab row's horizontal scroll visible, not just possible.**
   `AdminTabs` (`components/admin/ui.tsx:467-529`) already scrolls
   (`overflow-x-auto`) but gives no visual hint that "Closed" and "All" exist
   off-screen — the row just stops at the viewport edge, which reads as the
   list ending rather than continuing. Two changes, both CSS-only:
   a trailing gradient fade over the last ~34px so a cut-off tab looks
   intentionally partial, and `scroll-snap-type: x proximity` +
   `scroll-snap-align: start` on the tabs so a swipe settles on a tab
   boundary instead of stopping mid-label. **Considered but not proposed
   here:** folding the two rarest tabs ("Never paid", "No time picked")
   into the existing status filter instead of keeping 6 top-level tabs,
   which would remove the need to scroll at all on most phones — that's an
   information-architecture change worth its own decision, not a pure
   styling fix, so it's flagged as a follow-up rather than bundled in.

## 4. Concrete implementation notes

- `components/admin/ui.tsx`: add a `btnGhostSm`/adjust `btnGhost` call sites
  used on touch surfaces (booking card, booking modal) to `px-3.5 py-2.5`
  (~44px with `text-sm`); leave desktop-only table-row usages of the
  original compact size alone if any remain purely mouse-driven.
- `BookingCard.tsx`: wrap the card body (not the action row) in a
  `<Link>`/`onClick` that opens `BookingDetails`, add a chevron, and only
  render the action row's remaining buttons (WhatsApp, Close) — drop the
  in-row "View" trigger since the card itself now does that job.
- `LeadWhatsAppButton.tsx`: accept a `size` prop (`"full" | "compact"`) so
  `page.tsx` can request the full-width 52px treatment on
  `progress.needsFollowup` cards and the compact 44px one elsewhere,
  instead of the current single `highlight` boolean controlling color only.
- `BookingDetails.tsx`: split the dialog's outer shell into a
  `sm:items-center` (desktop, centered) vs. default (mobile, bottom-anchored
  + `rounded-t-2xl` + slide-up transition) treatment; bump the close button
  to `h-11 w-11`; bump the three action buttons at line 199-219 off
  `px-3 py-1.5 text-sm`.
- `AdminSidebar.tsx:222`: `h-10 w-10` → `h-11 w-11` on the mobile menu
  button.

## 5. Mockups

Two static mockups of the redesigned mobile bookings page (list + detail
sheet, stacked so both are visible without scrolling the mockup itself),
using the real tab names, card fields and copy from the current code:

- **iPhone (390×844):** [`admin-iphone-mockup.png`](mockups/admin-iphone-mockup.png)
- **Android (412×915):** [`admin-android-mockup.png`](mockups/admin-android-mockup.png)
- Editable source: [`admin-mockup.html`](mockups/admin-mockup.html)

Each mockup is annotated 1–5, matched to the numbered points in section 3.

## 6. Suggested next step

This is a smaller, lower-risk change than the public landing page work:
almost everything is a size/grouping change to controls that already exist,
in three files (`ui.tsx`, `BookingCard.tsx`, `LeadWhatsAppButton.tsx`) plus
the bottom-sheet treatment in `BookingDetails.tsx`. No data model or route
changes. Worth shipping as its own pass independent of the landing page work.
