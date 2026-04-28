/**
 * SSE proxy — streams job events from FastAPI to the browser.
 * Attaches the httponly auth cookie server-side.
 */
import { type NextRequest } from "next/server";
import { cookies } from "next/headers";

function getApiBaseUrl(): string {
  const url = process.env["API_BASE_URL"];
  if (!url) throw new Error("API_BASE_URL environment variable is not set");
  return url;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const apiUrl = getApiBaseUrl();
  const upstreamUrl = `${apiUrl}/api/jobs/${id}/stream`;

  const headers: HeadersInit = {
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
  };
  if (token) {
    headers["Cookie"] = `access_token=${token}`;
  }

  const upstream = await fetch(upstreamUrl, {
    headers,
    // @ts-expect-error - Next.js extended fetch supports duplex
    duplex: "half",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
