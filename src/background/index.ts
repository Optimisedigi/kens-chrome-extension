/**
 * CRO Audit Extension — Background Service Worker
 */

import { createMessageHandler } from "@/lib/messaging";
import {
  initializeStorage,
  getExtensionId,
  getRemainingAudits,
  recordLocalUse,
  addAuditToHistory,
} from "@/lib/storage";
import { runAudit } from "@/lib/api";

console.log("[CRO] Service worker started");

// Generate UUID on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await initializeStorage();
    console.log("[CRO] Extension installed, ID generated");
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeStorage();
});

// Message handlers
createMessageHandler({
  RUN_AUDIT: async (payload) => {
    const extensionId = await getExtensionId();
    if (!extensionId) {
      throw new Error("Extension not initialized. Try reinstalling.");
    }

    // Client-side guard (server is the authority)
    const usage = await getRemainingAudits();
    if (usage.remaining <= 0) {
      throw new Error("You've used all your audits for today. Come back tomorrow!");
    }

    // Call the API
    const { result, remaining } = await runAudit(extensionId, {
      websiteUrl: payload.url,
      conversionGoal: payload.conversionGoal,
      businessType: payload.businessType,
    });

    // Record locally
    await recordLocalUse();
    await addAuditToHistory({
      url: payload.url,
      overallScore: result.overallScore,
      timestamp: new Date().toISOString(),
    });

    return { result, remaining };
  },

  GET_USAGE: async () => {
    return getRemainingAudits();
  },
});

export {};
