/**
 * Next.js API route — proxies login to FastAPI and sets httponly cookie.
 * This keeps credentials server-side only.
 */
import { type NextRequest, NextResponse } from "next/server";

function getApiBaseUrl(): string {
  const url = process.env["API_BASE_URL"];
  if (!url) throw new Error("API_BASE_URL environment variable is not set");
  return url;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const apiUrl = getApiBaseUrl();

  let apiResponse: Response;
  try {
    apiResponse = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      { detail: "Failed to reach authentication service" },
      { status: 502 },
    );
  }

  if (!apiResponse.ok) {
    const data = (await apiResponse.json()) as { detail?: string };
    return NextResponse.json(
      { detail: data.detail ?? "Authentication failed" },
      { status: apiResponse.status },
    );
  }

  const data = (await apiResponse.json()) as Record<string, unknown>;

  // Forward the Set-Cookie header from the API
  const setCookie = apiResponse.headers.get("set-cookie");
  const nextResponse = NextResponse.json(data, { status: 200 });

  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }

  return nextResponse;
}
