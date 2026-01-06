/**
 * Panel Icon
 *
 * This file defines the custom icon displayed in the sidebar for this MCP App.
 *
 * REQUIREMENTS:
 * - Must be an SVG
 * - Must use `currentColor` for stroke and fill (single-color only)
 * - Must be under 10KB
 *
 * The host will style the icon color based on:
 * - Theme (light/dark mode)
 * - Panel visibility (active panels are brighter)
 *
 * HOW TO CUSTOMIZE:
 * 1. Find an SVG icon (e.g., from Phosphor Icons, Heroicons, Lucide)
 * 2. Ensure it uses `stroke="currentColor"` or `fill="currentColor"`
 * 3. Replace the SVG content below
 */

/**
 * The SVG icon content.
 * This is a "list-checks" icon from Phosphor Icons.
 *
 * @see https://phosphoricons.com/
 */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><line x1="128" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="128" y1="64" x2="216" y2="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="128" y1="192" x2="216" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="40 64 56 80 88 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="40 128 56 144 88 112" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="40 192 56 208 88 176" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>`;

/**
 * Alt text for accessibility.
 */
export const ICON_ALT = "Todo List";

/**
 * Converts the SVG to a base64 data URI for use in resource metadata.
 *
 * @returns Data URI string for the icon
 */
export const getIconDataUri = (): string => {
  const base64 = Buffer.from(ICON_SVG).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
};

