/** Server policy. Browser components use the role returned by /api/me. */
export function developerAdminEmails(): string[] {
  return [...new Set((process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(value => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)))];
}

export function isDeveloperAdmin(email: string | null | undefined): boolean {
  return !!email && developerAdminEmails().includes(email.trim().toLowerCase());
}
