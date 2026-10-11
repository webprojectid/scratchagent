/** Resolve tokens for canvas/WebGL APIs, which cannot interpret CSS variables. */
export function themeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
