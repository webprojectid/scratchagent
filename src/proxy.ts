import { NextResponse, type NextRequest } from "next/server";
import { isPrivateArtifact, isPrivateResponse } from "./lib/public-request-policy";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = isPrivateArtifact(pathname)
    ? new NextResponse(null, { status: 404 })
    : NextResponse.next();
  if (isPrivateArtifact(pathname) || isPrivateResponse(pathname)) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Vercel-CDN-Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
