import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/login", process.env["WEB_BASE_URL"] ?? "http://localhost:3000"));
  response.cookies.delete("access_token");
  return response;
}
