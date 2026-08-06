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
 */
export const MOBILE_BAR_CLEARANCE = "pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-0";
