export const DEVELOPER_ADMIN_EMAIL = "teguhends@gmail.com";

export function isDeveloperAdmin(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEVELOPER_ADMIN_EMAIL;
}
