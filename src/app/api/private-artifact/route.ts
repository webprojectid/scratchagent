import { NextResponse } from "next/server";

function notFound() {
  return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}

export { notFound as GET, notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
