/**
 * CRO Audit Extension — type-safe messaging between popup and background
 */

export interface AuditResult {
  id: string;
  websiteUrl: string;
  overallScore: number;
  firstImpressionScore: number;
  trustSocialProofScore: number;
  ctaScore: number;
  leadCaptureScore: number;
  contentReadabilityScore: number;
  navigationScore: number;
  findings: Array<{
    category: string;
    score: number;
    status: "good" | "warning" | "critical";
    message: string;
  }>;
  recommendations: Array<{
    priority: number;
    title: string;
    description: string;
    impact: string;
    estimatedLift: string;
  }>;
}

export interface MessageTypes {
  RUN_AUDIT: {
    request: {
      url: string;
      conversionGoal: string;
      businessType: string;
    };
    response: {
      result: AuditResult;
      remaining: number;
    };
  };

  GET_USAGE: {
    request: void;
    response: {
      remaining: number;
      isFirstDay: boolean;
    };
  };
}

export type MessageType = keyof MessageTypes;

export interface Message<T extends MessageType = MessageType> {
  type: T;
  payload: MessageTypes[T]["request"];
}

export interface MessageResponse<T extends MessageType = MessageType> {
  success: boolean;
  data?: MessageTypes[T]["response"];
  error?: string;
}

export async function sendToBackground<T extends MessageType>(
  type: T,
  payload: MessageTypes[T]["request"]
): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage<Message<T>, MessageResponse<T>>({
      type,
      payload,
    });

    if (response === undefined) {
      return { success: false, error: "No response from background script" };
    }

    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function createMessageHandler(
  handlers: Partial<{
    [K in MessageType]: (
      payload: MessageTypes[K]["request"],
      sender: chrome.runtime.MessageSender
    ) => Promise<MessageTypes[K]["response"]> | MessageTypes[K]["response"];
  }>
): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type, payload } = message as Message;
    const handler = handlers[type] as
      | ((payload: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown> | unknown)
      | undefined;

    if (handler) {
      Promise.resolve(handler(payload, sender))
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error) => {
          console.error(`[CRO] Handler error for ${type}:`, error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        });
      return true; // Keep channel open for async
    }

    return false;
  });
}
