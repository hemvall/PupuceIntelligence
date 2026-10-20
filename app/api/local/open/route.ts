import { NextRequest, NextResponse } from "next/server";
import { equalSecret, localRequest } from "@/lib/local-access.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  if (
    !localRequest(request, process.env) ||
    !process.env.APP_ACCESS_KEY ||
    !equalSecret(request.nextUrl.searchParams.get("token"), process.env.PUPUCE_LAUNCH_TOKEN)
  ) return NextResponse.json({ error: "Accès local indisponible. Utilise le raccourci Pupuce du Bureau." }, { status: 403 });
  const response = NextResponse.redirect("http://127.0.0.1:3210/", 303);
  response.cookies.set("pupuce_local_access", process.env.APP_ACCESS_KEY, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
