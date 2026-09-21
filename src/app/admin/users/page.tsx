import AdminUsersPage from "./users-client";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; demo?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const isPreview = sp?.preview === "1" || sp?.preview === "true" || sp?.demo === "1";
  return <AdminUsersPage preview={isPreview} />;
}
