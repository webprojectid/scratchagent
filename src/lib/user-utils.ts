/**
 * Utility untuk format nama tampilan user dari email / full name.
 */
export function formatDisplayName(email?: string | null, customName?: string | null): string {
  if (customName && customName.trim() && customName.trim().toLowerCase() !== "user" && customName.trim().toLowerCase() !== "admin") {
    return customName.trim();
  }
  if (!email) return "User";
  const lower = email.toLowerCase().trim();
  if (lower === "teguhends@gmail.com") {
    return "Teguh Ends";
  }
  const userPart = email.split("@")[0] || "user";
  const words = userPart.replace(/[._\-+]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return userPart;
}
