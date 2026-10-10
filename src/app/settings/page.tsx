import { redirect } from "next/navigation";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string; demo?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const preview = sp?.preview === "1" || sp?.preview === "true" || sp?.demo === "1";
  redirect(`/profile?tab=preferences${preview ? "&preview=1" : ""}`);
}
