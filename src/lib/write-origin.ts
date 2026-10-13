import { NextResponse } from "next/server";
import { sameOrigin } from "./account-api";
export function writeOriginGate(request: Request): NextResponse | null {
  if (request.headers.get("authorization")?.startsWith("Bearer ") || sameOrigin(request)) return null;
  return NextResponse.json({ error: "Cross-origin changes are not allowed." }, { status: 403 });
}
