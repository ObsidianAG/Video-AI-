/**
 * Server-side auth helpers.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe } from "./api";
import type { AuthResponse } from "@/types";

export async function getCurrentUser(): Promise<AuthResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token");
    if (!token) return null;
    return await getMe();
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthResponse> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function getApiBaseUrl(): string {
  const url = process.env["API_BASE_URL"];
  if (!url) throw new Error("API_BASE_URL environment variable is not set");
  return url;
}
