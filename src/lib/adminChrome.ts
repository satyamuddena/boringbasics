/**
 * Geometry shared between the admin layout (a server component) and the
 * sidebar (a client one).
 *
 * Deliberately not exported from AdminSidebar even though that is where it is
 * used: a plain constant exported from a `"use client"` module does not arrive
 * as a string on the server. Next replaces client exports with a reference
 * proxy, so interpolating one into a className silently stringifies a throwing
 * function into the markup — the classes vanish and the page slides under the
 * bar with no error anywhere.
 */

/**
 * Height of the mobile top bar, on top of the safe-area inset it also adds.
 * The bar is fixed, so the content column has to reserve exactly this much.
 */
export const MOBILE_BAR_HEIGHT = "h-[calc(3.5rem+env(safe-area-inset-top))]";

/**
 * The matching reservation for the content column. Desktop has no bar.
 *
 * The bar height plus the same 1rem the column uses on its other sides — this
 * overrides `p-4`'s top padding outright, so without adding it back the page
 * heading sits flush against the bar.
 *
 * The `md:` half must restore the column's own desktop padding, not zero it:
 * this class wins over the column's `md:p-10`, so `md:pt-0` left every admin
 * page with 40px on three sides and nothing on top, and the page title sat
 * hard against the top edge of the viewport.
 */
export const MOBILE_BAR_CLEARANCE = "pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-10";

/**
 * Where a `sticky` element has to park so it clears the mobile bar. Desktop has
 * no bar, so it sticks to the very top. Used by the settings section nav.
 */
export const MOBILE_BAR_OFFSET = "top-[calc(3.5rem+env(safe-area-inset-top))] md:top-0";

/**
 * Scroll offset for a jump-nav anchor target, so a jumped-to card lands just
 * below the sticky title bar instead of behind it.
 *
 * Per-element rather than raising the global `html { scroll-padding-top }` in
 * globals.css — that value is tuned for the public site's header and is shared
 * with every anchor on the marketing pages.
 *
 * These numbers are the *remainder* on top of that global 5rem, which the
 * browser adds to scroll-margin rather than taking the larger of the two.
 * Measured sticky-bar bottom edge: 90px on desktop, 150px on mobile (56px
 * mobile bar + a 94px title-and-nav bar), leaving a ~14px breath below.
 */
export const SECTION_ANCHOR_OFFSET =
  "scroll-mt-[calc(5rem+env(safe-area-inset-top))] md:scroll-mt-6";
