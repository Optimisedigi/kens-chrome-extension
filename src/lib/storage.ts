/**
 * CRO Audit Extension — Chrome storage utilities
 */

export interface AuditHistoryEntry {
  url: string;
  overallScore: number;
  timestamp: string;
}

export interface DailyUsage {
  date: string;         // YYYY-MM-DD
  count: number;
  firstEverDate: string; // date of first-ever use
}

// ── Extension ID (sync storage — persists across devices) ──

export async function getExtensionId(): Promise<string> {
  const result = await chrome.storage.sync.get("extensionId");
  return result.extensionId || "";
}

export async function setExtensionId(id: string): Promise<void> {
  await chrome.storage.sync.set({ extensionId: id });
}

// ── Audit History (local storage) ──

export async function getAuditHistory(): Promise<AuditHistoryEntry[]> {
  const result = await chrome.storage.local.get("auditHistory");
  return result.auditHistory || [];
}

export async function addAuditToHistory(entry: AuditHistoryEntry): Promise<void> {
  const history = await getAuditHistory();
  history.unshift(entry);
  await chrome.storage.local.set({ auditHistory: history.slice(0, 10) });
}

// ── Daily Usage (local storage) ──

export async function getDailyUsage(): Promise<DailyUsage> {
  const result = await chrome.storage.local.get("dailyUsage");
  return result.dailyUsage || { date: "", count: 0, firstEverDate: "" };
}

export async function setDailyUsage(usage: DailyUsage): Promise<void> {
  await chrome.storage.local.set({ dailyUsage: usage });
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getRemainingAudits(): Promise<{ remaining: number; isFirstDay: boolean }> {
  const usage = await getDailyUsage();
  const today = todayStr();
  const dailyLimit = 2;

  if (!usage.firstEverDate) {
    return { remaining: dailyLimit, isFirstDay: true };
  }

  const isFirstDay = usage.firstEverDate === today;

  if (usage.date !== today) {
    return { remaining: dailyLimit, isFirstDay };
  }

  return { remaining: Math.max(0, dailyLimit - usage.count), isFirstDay };
}

export async function recordLocalUse(): Promise<void> {
  const usage = await getDailyUsage();
  const today = todayStr();

  if (usage.date !== today) {
    await setDailyUsage({
      date: today,
      count: 1,
      firstEverDate: usage.firstEverDate || today,
    });
  } else {
    await setDailyUsage({ ...usage, count: usage.count + 1 });
  }
}

// ── Initialize on install ──

export async function initializeStorage(): Promise<void> {
  const existing = await getExtensionId();
  if (!existing) {
    await setExtensionId(crypto.randomUUID());
  }
}
