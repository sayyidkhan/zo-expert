import { demoSeed } from "../data/demoSeed";
import type {
  BriefRequest,
  BusinessProfile,
  ConsultRequest,
  ConsultationResult,
  DemoSeedResponse,
  OwnerBrief,
  OwnerProfileResponse
} from "../types/api";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const browserHost =
  typeof window === "undefined" ? "" : window.location.hostname;
const isLanBrowser =
  browserHost && browserHost !== "localhost" && browserHost !== "127.0.0.1";
const apiBaseUrl =
  isLanBrowser && configuredApiBaseUrl.includes("localhost")
    ? ""
    : configuredApiBaseUrl;

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getDemoSeed(): Promise<DemoSeedResponse> {
  try {
    return await requestJson<DemoSeedResponse>("/api/demo/seed");
  } catch {
    return demoSeed;
  }
}

export function buildOwnerProfile(business: BusinessProfile) {
  return requestJson<OwnerProfileResponse>("/api/owner-profile/build", {
    method: "POST",
    body: JSON.stringify(business)
  });
}

export function consultOwnerProxy(request: ConsultRequest) {
  return requestJson<ConsultationResult>("/api/consult", {
    method: "POST",
    body: JSON.stringify(request)
  });
}

export function generateBrief(request: BriefRequest) {
  return requestJson<OwnerBrief>("/api/brief/generate", {
    method: "POST",
    body: JSON.stringify(request)
  });
}
