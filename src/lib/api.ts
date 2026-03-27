/**
 * CRO Audit Extension — API client
 */

import type { AuditResult } from "./messaging";

const API_BASE = "https://www.optimisedigital.online/ai-growth-tools";

export async function runAudit(
  extensionId: string,
  request: { websiteUrl: string; conversionGoal: string; businessType: string },
): Promise<{ result: AuditResult; remaining: number }> {
  const response = await fetch(`${API_BASE}/api/audits/extension`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Id": extensionId,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new Error(error.message || `Audit failed (${response.status})`);
  }

  const remaining = parseInt(response.headers.get("X-Extension-Remaining-Audits") || "0", 10);
  const result = await response.json();
  return { result, remaining };
}
