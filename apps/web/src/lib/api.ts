/**
 * Typed server-side API client.
 * All fetches originate server-side — no credentials exposed to browser.
 */
import { cookies } from "next/headers";
import type {
  Asset,
  AuthResponse,
  ConfirmAssetRequest,
  CreateExportRequest,
  CreateJobRequest,
  CreateProjectRequest,
  Export,
  Job,
  PaginatedResponse,
  Project,
  QNEOControlSnapshot,
  UpdateProjectRequest,
  UploadUrlRequest,
  UploadUrlResponse,
  Version,
} from "@/types";

function getApiBaseUrl(): string {
  const url = process.env["API_BASE_URL"];
  if (!url) throw new Error("API_BASE_URL environment variable is not set");
  return url;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return {};
  return { Cookie: `access_token=${token}` };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const base = getApiBaseUrl();
  const authHeaders = init?.skipAuth ? {} : await getAuthHeaders();

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/auth/me");
}

// ── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Project>> {
  return apiFetch<PaginatedResponse<Project>>(
    `/api/projects?page=${page}&page_size=${pageSize}`,
  );
}

export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function createProject(body: CreateProjectRequest): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateProject(id: string, body: UpdateProjectRequest): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export async function listJobs(
  projectId?: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Job>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (projectId) params.set("project_id", projectId);
  return apiFetch<PaginatedResponse<Job>>(`/api/jobs?${params.toString()}`);
}

export async function getJob(id: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}`);
}

export async function submitJob(body: CreateJobRequest): Promise<Job> {
  return apiFetch<Job>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function cancelJob(id: string, reason?: string): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ── Assets ──────────────────────────────────────────────────────────────────

export async function getUploadUrl(body: UploadUrlRequest): Promise<UploadUrlResponse> {
  return apiFetch<UploadUrlResponse>("/api/assets/upload-url", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function confirmAsset(body: ConfirmAssetRequest): Promise<Asset> {
  return apiFetch<Asset>("/api/assets/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Versions ────────────────────────────────────────────────────────────────

export async function listVersions(projectId: string): Promise<Version[]> {
  return apiFetch<Version[]>(`/api/projects/${projectId}/versions`);
}

// ── Exports ─────────────────────────────────────────────────────────────────

export async function createExport(body: CreateExportRequest): Promise<Export> {
  return apiFetch<Export>("/api/exports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getExport(id: string): Promise<Export> {
  return apiFetch<Export>(`/api/exports/${id}`);
}

// ── QNEO Control ────────────────────────────────────────────────────────────

export async function getControlSnapshot(): Promise<QNEOControlSnapshot> {
  return apiFetch<QNEOControlSnapshot>("/api/control/snapshot");
}
