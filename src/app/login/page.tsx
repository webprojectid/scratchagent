"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/ui/premium-auth";
import { Shell } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();

  return (
    <Shell back="/" sidebar={false}>
      <div className="mx-auto flex min-h-[100dvh] max-w-md items-center justify-center px-4 py-10">
        <div className="w-full rounded-[24px] border border-white/10 bg-[#101417] p-1 shadow-[0_28px_90px_#000A]">
          <div className="rounded-[calc(24px-4px)] border border-white/[.06] bg-[#141A22]">
            <AuthForm
              onSuccess={() => router.push("/new")}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
}